import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";

test("manual plans and entitlements enforce admin RBAC, customer isolation and expiry",async()=>{
 let now=1_800_000_000_000;
 const app=createApp({clock:()=>now});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 const call=async(path,method="GET",body,token,version)=>{
  const headers={"Content-Type":"application/json"};
  if(token)headers.Authorization="Bearer "+token;
  if(version!==undefined)headers["If-Match"]=String(version);
  const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:r.status,body:await r.json()};
 };
 const pwd="long-password-12345";
 try{
  for(const email of ["admin@example.test","user-a@example.test","user-b@example.test"]){
   assert.equal((await call("/v1/auth/register","POST",{email,password:pwd})).status,201);
  }
  const login=async email=>(await call("/v1/auth/login","POST",{email,password:pwd})).body;
  const adminSession=await login("admin@example.test"),a=await login("user-a@example.test"),b=await login("user-b@example.test");
  app.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(adminSession.user.id);
  const admin=adminSession.token;
  const rawProduct={slug:"original-tool",name:"Original Tool",description:"Test product",status:"draft"};
  const product=await call("/v1/admin/products","POST",rawProduct,admin);
  assert.equal(product.status,201);
  const pid=product.body.id;
  const createPlan={code:"monthly-basic",name:"Basic",amountMinor:1299,currency:"USD",billingPeriod:"monthly",status:"draft"};
  assert.equal((await call("/v1/admin/products/"+pid+"/plans","POST",createPlan,a.token)).status,403);
  const plan=await call("/v1/admin/products/"+pid+"/plans","POST",createPlan,admin);
  assert.equal(plan.status,201);const planId=plan.body.id;
  assert.equal((await call("/v1/catalog/pricing")).body.items.length,0);
  assert.equal((await call("/v1/admin/products/"+pid+"/plans","POST",createPlan,admin)).status,409);
  assert.equal((await call("/v1/admin/plans/"+planId,"PATCH",{name:"Mutated",status:"active",amountMinor:1},admin,1)).status,422);
  assert.equal((await call("/v1/admin/plans/"+planId,"PATCH",{name:"Basic active",status:"active"},admin,1)).status,200);
  assert.equal((await call("/v1/admin/plans/"+planId,"PATCH",{name:"Stale",status:"active"},admin,1)).status,409);
  assert.equal((await call("/v1/catalog/pricing")).body.items.length,0); // product still draft
  assert.equal((await call("/v1/admin/entitlements","POST",{userId:a.user.id,productId:pid,planId,expiresAt:now+86400000},admin)).status,422);
  assert.equal((await call("/v1/admin/products/"+pid,"PATCH",{...rawProduct,status:"published"},admin,1)).status,200);
  const publicPricing=await call("/v1/catalog/pricing");
  assert.equal(publicPricing.status,200);
  assert.equal(publicPricing.body.items.length,1);
  assert.equal(publicPricing.body.items[0].amountMinor,1299);
  assert.equal(publicPricing.body.items[0].currency,"USD");
  assert.equal(JSON.stringify(publicPricing.body).includes(a.user.id),false);
  assert.equal((await call("/v1/admin/entitlements","POST",{userId:a.user.id,productId:pid,planId,expiresAt:now+86400000},a.token)).status,403);
  const grant=await call("/v1/admin/entitlements","POST",{userId:a.user.id,productId:pid,planId,expiresAt:now+86400000},admin);
  assert.equal(grant.status,201);
  assert.equal(grant.body.source,"admin_test_grant");
  assert.equal((await call("/v1/admin/entitlements","POST",{userId:a.user.id,productId:pid,planId,expiresAt:now+86400000},admin)).status,409);
  const own=await call("/v1/me/entitlements","GET",undefined,a.token);
  assert.equal(own.body.items.length,1);
  assert.equal(own.body.items[0].accessAllowed,true);
  assert.equal((await call("/v1/me/entitlements","GET",undefined,b.token)).body.items.length,0);
  assert.equal((await call("/v1/me/access/"+pid,"GET",undefined,a.token)).body.allowed,true);
  assert.equal((await call("/v1/me/access/"+pid,"GET",undefined,b.token)).body.allowed,false);
  assert.equal((await call("/v1/admin/entitlements","GET",undefined,a.token)).status,403);
  const adminList=await call("/v1/admin/entitlements","GET",undefined,admin);
  assert.equal(adminList.body.items.length,1);
  const revoke=await call("/v1/admin/entitlements/"+grant.body.id+"/revoke","POST",{},admin);
  assert.equal(revoke.status,200);
  assert.equal(revoke.body.alreadyRevoked,false);
  assert.equal((await call("/v1/admin/entitlements/"+grant.body.id+"/revoke","POST",{},admin)).body.alreadyRevoked,true);
  assert.equal((await call("/v1/me/access/"+pid,"GET",undefined,a.token)).body.allowed,false);
  const grant2=await call("/v1/admin/entitlements","POST",{userId:a.user.id,productId:pid,planId,expiresAt:now+4000},admin);
  assert.equal(grant2.status,201);
  now+=4000;
  assert.equal((await call("/v1/me/access/"+pid,"GET",undefined,a.token)).body.allowed,false);
  assert.equal((await call("/v1/me/entitlements","GET",undefined,a.token)).body.items[0].accessStatus,"expired");
  assert.equal((await call("/v1/admin/plans/"+planId,"GET",undefined,admin)).body.amountMinor,1299);
  assert.equal((await call("/v1/admin/plans/"+planId,"PATCH",{name:"Archived",status:"archived"},admin,2)).status,200);
  assert.equal((await call("/v1/catalog/pricing")).body.items.length,0);
  const auditActions=app.db.prepare("SELECT action FROM audit WHERE action LIKE 'pricing.%' OR action LIKE 'entitlement.%' ORDER BY created_at,rowid").all().map(x=>x.action);
  assert.ok(auditActions.includes("pricing.plan_created"));
  assert.equal(auditActions.filter(a=>a==="entitlement.test_granted").length,2);
  assert.equal(auditActions.filter(a=>a==="entitlement.test_revoked").length,1);
 }finally{await app.close()}
});

test("entitlement is never activated by price alone and cannot outlive product publication",async()=>{
 const app=createApp();
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const url="http://127.0.0.1:"+app.server.address().port;
 const call=async(path,opts={})=>{const r=await fetch(url+path,opts);return {status:r.status,body:await r.json()}};
 try{
  const password="long-password-12345";
  const reg=await call("/v1/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"person@example.test",password})});
  const userId=reg.body.user.id;
  const login=await call("/v1/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"person@example.test",password})});
  const token=login.body.token;
  const deny=await call("/v1/me/access/00000000-0000-0000-0000-000000000001",{headers:{Authorization:"Bearer "+token}});
  assert.equal(deny.body.allowed,false);
  assert.equal((await call("/v1/me/entitlements",{headers:{Authorization:"Bearer "+token}})).body.items.length,0);
  assert.equal(app.db.prepare("SELECT count(*) AS n FROM entitlements WHERE user_id=?").get(userId).n,0);
 }finally{await app.close()}
});
