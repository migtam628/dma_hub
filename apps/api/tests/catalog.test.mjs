import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";

test("admin catalog is versioned and audit-tracked, public listing excludes drafts",async()=>{
 const app=createApp();
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 const call=async(path,method="GET",body,token,version)=>{
  const h={"Content-Type":"application/json"};
  if(token)h.Authorization="Bearer "+token;
  if(version)h["If-Match"]=String(version);
  const r=await fetch(base+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:r.status,body:await r.json()};
 };
 try{
  const pwd="long-password-12345";
  await call("/v1/auth/register","POST",{email:"customer@example.test",password:pwd});
  await call("/v1/auth/register","POST",{email:"admin@example.test",password:pwd});
  const customer=(await call("/v1/auth/login","POST",{email:"customer@example.test",password:pwd})).body.token;
  const admin=(await call("/v1/auth/login","POST",{email:"admin@example.test",password:pwd})).body.token;
  app.db.prepare("UPDATE users SET role='admin' WHERE email=?").run("admin@example.test");
  assert.equal((await call("/v1/admin/products","GET",undefined,customer)).status,403);
  assert.equal((await call("/v1/admin/products","POST",{slug:"test-product",name:"Test product"},customer)).status,403);
  assert.equal((await call("/v1/catalog/live")).body.items.length,0);
  const draft=await call("/v1/admin/products","POST",{slug:"first-product",name:"First product",description:"Original",status:"draft"},admin);
  assert.equal(draft.status,201);
  assert.equal((await call("/v1/catalog/live")).body.items.length,0);
  assert.equal((await call("/v1/admin/products","GET",undefined,admin)).body.items.length,1);
  assert.equal((await call("/v1/admin/products","POST",{slug:"first-product",name:"Duplicate"},admin)).status,409);
  assert.equal((await call("/v1/admin/products","POST",{slug:"INVALID URL!",name:"Wrong"},admin)).status,422);
  assert.equal((await call("/v1/admin/products/"+draft.body.id,"PATCH",{...draft.body,status:"published"},admin)).status,428);
  const published=await call("/v1/admin/products/"+draft.body.id,"PATCH",{slug:"first-product",name:"First product",description:"Public",status:"published"},admin,1);
  assert.equal(published.status,200);
  assert.equal(published.body.version,2);
  const publicListing=await call("/v1/catalog/live");
  assert.equal(publicListing.status,200);
  assert.deepEqual(publicListing.body.items.map(({slug,name,description})=>({slug,name,description})),[
   {slug:"first-product",name:"First product",description:"Public"}
  ]);
  assert.equal("status" in publicListing.body.items[0],false,"public listing omits internal product status");
  assert.equal((await call("/v1/admin/products/"+draft.body.id,"PATCH",{slug:"first-product",name:"Old"},admin,1)).status,409);
  const archived=await call("/v1/admin/products/"+draft.body.id,"PATCH",{slug:"first-product",name:"First product",description:"",status:"archived"},admin,2);
  assert.equal(archived.status,200);
  assert.equal((await call("/v1/catalog/live")).body.items.length,0);
  const audits=app.db.prepare("SELECT action FROM audit WHERE action LIKE 'catalog.%'").all().map(x=>x.action);
  assert.deepEqual(audits,["catalog.product_created","catalog.product_updated","catalog.product_updated"]);
 }finally{await app.close()}
});
