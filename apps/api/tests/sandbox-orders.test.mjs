import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";

async function scenario(fn){
 let now=1_800_000_000_000;
 const app=createApp({clock:()=>now});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 const call=async(path,method="GET",data,token,version)=>{
  const headers={"Content-Type":"application/json"};
  if(token)headers.Authorization="Bearer "+token;
  if(version!==undefined)headers["If-Match"]=String(version);
  const response=await fetch(base+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});
  return {status:response.status,body:await response.json()};
 };
 try{await fn({app,call,now:()=>now,advance:ms=>{now+=ms}})}
 finally{await app.close()}
}

async function fixture(call,app){
 const password="secure-testing-password";
 for(const email of ["admin@fixture.test","alice@fixture.test","bob@fixture.test"]){
  assert.equal((await call("/v1/auth/register","POST",{email,password})).status,201);
 }
 const admin=(await call("/v1/auth/login","POST",{email:"admin@fixture.test",password})).body;
 const alice=(await call("/v1/auth/login","POST",{email:"alice@fixture.test",password})).body;
 const bob=(await call("/v1/auth/login","POST",{email:"bob@fixture.test",password})).body;
 app.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(admin.user.id);
 const product=await call("/v1/admin/products","POST",{slug:"test-orders",name:"Test orders",status:"published"},admin.token);
 assert.equal(product.status,201);
 const plan=await call("/v1/admin/products/"+product.body.id+"/plans","POST",
  {code:"standard",name:"Standard",currency:"USD",amountMinor:2500,billingPeriod:"monthly",status:"active"},admin.token);
 assert.equal(plan.status,201);
 return {admin,alice,bob,product:product.body,plan:plan.body};
}
test("sandbox order creation snapshots price, replays safely and isolates customer accounts",()=>scenario(async({app,call})=>{
 const {admin,alice,bob,product,plan}=await fixture(call,app);
 const create={planId:plan.id,idempotencyKey:"first_attempt_123"};
 const unauthorized=await call("/v1/me/test-orders","POST",create);
 assert.equal(unauthorized.status,401);
 const result=await call("/v1/me/test-orders","POST",create,alice.token);
 assert.equal(result.status,201);
 assert.equal(result.body.sandboxOnly,true);
 assert.equal(result.body.amountMinor,2500);
 assert.equal(result.body.state,"pending");
 const replay=await call("/v1/me/test-orders","POST",create,alice.token);
 assert.equal(replay.status,200);
 assert.equal(replay.body.replayed,true);
 assert.equal(replay.body.id,result.body.id);
 assert.equal((await call("/v1/me/test-orders","POST",{planId:product.id,idempotencyKey:"first_attempt_123"},alice.token)).status,409);
 assert.equal((await call("/v1/me/test-orders","POST",{...create,amountMinor:0},alice.token)).status,422);
 assert.equal((await call("/v1/me/test-orders","POST",{...create,idempotencyKey:"bad"},alice.token)).status,422);
 assert.equal((await call("/v1/me/test-orders","GET",undefined,alice.token)).body.items.length,1);
 assert.equal((await call("/v1/me/test-orders","GET",undefined,bob.token)).body.items.length,0);
 assert.equal((await call("/v1/admin/test-orders","GET",undefined,alice.token)).status,403);
 assert.equal((await call("/v1/admin/test-orders","GET",undefined,admin.token)).body.items.length,1);
 assert.equal((await call("/v1/me/access/"+product.id,"GET",undefined,alice.token)).body.allowed,false);
 assert.equal(app.db.prepare("SELECT count(*) AS n FROM entitlements").get().n,0);
 assert.equal(app.db.prepare("SELECT count(*) AS n FROM sandbox_orders").get().n,1);
}));
test("only admin may explicitly fulfill pending order, with idempotent entitlement and expiry",()=>scenario(async({app,call,now,advance})=>{
 const {admin,alice,bob,product,plan}=await fixture(call,app);
 const created=await call("/v1/me/test-orders","POST",{planId:plan.id,idempotencyKey:"fulfill_test_123"},alice.token);
 const id=created.body.id;
 assert.equal((await call("/v1/admin/test-orders/"+id+"/fulfill","POST",{},alice.token)).status,403);
 assert.equal((await call("/v1/admin/test-orders/"+id+"/fulfill","POST",{},bob.token)).status,403);
 assert.equal((await call("/v1/me/access/"+product.id,"GET",undefined,alice.token)).body.allowed,false);
 const settled=await call("/v1/admin/test-orders/"+id+"/fulfill","POST",{},admin.token);
 assert.equal(settled.status,200);
 assert.equal(settled.body.state,"test_fulfilled");
 assert.equal(settled.body.sandboxOnly,true);
 const entitlementId=settled.body.entitlementId;
 assert.ok(entitlementId);
 const record=app.db.prepare("SELECT source,starts_at,expires_at FROM entitlements WHERE id=?").get(entitlementId);
 assert.equal(record.source,"sandbox_order");
 assert.equal(record.starts_at,now());
 assert.equal(record.expires_at,now()+30*86400000);
 assert.equal((await call("/v1/me/access/"+product.id,"GET",undefined,alice.token)).body.allowed,true);
 assert.equal((await call("/v1/me/access/"+product.id,"GET",undefined,bob.token)).body.allowed,false);
 const replay=await call("/v1/admin/test-orders/"+id+"/fulfill","POST",{},admin.token);
 assert.equal(replay.status,200);
 assert.equal(replay.body.replayed,true);
 assert.equal(replay.body.entitlementId,entitlementId);
 assert.equal(app.db.prepare("SELECT count(*) AS n FROM entitlements").get().n,1);
 assert.equal(app.db.prepare("SELECT count(*) AS n FROM audit WHERE action='sandbox_order.fulfilled'").get().n,1);
 assert.equal((await call("/v1/admin/test-orders/"+id+"/cancel","POST",{},admin.token)).status,409);
 advance(30*86400000);
 const renewed=(await call("/v1/auth/login","POST",{email:"alice@fixture.test",password:"secure-testing-password"})).body.token;
 assert.equal((await call("/v1/me/access/"+product.id,"GET",undefined,renewed)).body.allowed,false);
 assert.equal((await call("/v1/me/entitlements","GET",undefined,renewed)).body.items[0].accessStatus,"expired");
}));
test("sandbox cancellation blocks fulfillment; archive and overlapping grants prevent unsafe issuance",()=>scenario(async({app,call,now})=>{
 const {admin,alice,product,plan}=await fixture(call,app);
 const first=await call("/v1/me/test-orders","POST",{planId:plan.id,idempotencyKey:"cancel_test_234"},alice.token);
 const id=first.body.id;
 assert.equal((await call("/v1/admin/test-orders/"+id+"/cancel","POST",{},alice.token)).status,403);
 const canceled=await call("/v1/admin/test-orders/"+id+"/cancel","POST",{},admin.token);
 assert.equal(canceled.status,200);
 assert.equal(canceled.body.state,"cancelled");
 assert.equal((await call("/v1/admin/test-orders/"+id+"/cancel","POST",{},admin.token)).body.replayed,true);
 assert.equal((await call("/v1/admin/test-orders/"+id+"/fulfill","POST",{},admin.token)).status,409);
 const second=await call("/v1/me/test-orders","POST",{planId:plan.id,idempotencyKey:"archive_test_345"},alice.token);
 assert.equal((await call("/v1/admin/products/"+product.id,"PATCH",{slug:product.slug,name:product.name,description:product.description,status:"archived"},admin.token,product.version)).status,200);
 assert.equal((await call("/v1/admin/test-orders/"+second.body.id+"/fulfill","POST",{},admin.token)).status,422);
 assert.equal(app.db.prepare("SELECT state FROM sandbox_orders WHERE id=?").get(second.body.id).state,"pending");
 assert.equal((await call("/v1/admin/products/"+product.id,"PATCH",{slug:product.slug,name:product.name,description:product.description,status:"published"},admin.token,product.version+1)).status,200);
 const third=await call("/v1/admin/entitlements","POST",{userId:alice.user.id,productId:product.id,planId:plan.id,expiresAt:now()+86400000},admin.token);
 assert.equal(third.status,201);
 assert.equal((await call("/v1/admin/test-orders/"+second.body.id+"/fulfill","POST",{},admin.token)).body.error,"entitlement_overlap");
 assert.equal(app.db.prepare("SELECT count(*) AS n FROM entitlements").get().n,1);
}));
