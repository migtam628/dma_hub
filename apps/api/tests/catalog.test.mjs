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
  assert.equal((await call("/v1/catalog/live/first-product")).status,404);
  const draft=await call("/v1/admin/products","POST",{slug:"first-product",name:"First product",description:"Original",status:"draft"},admin);
  assert.equal(draft.status,201);
  assert.equal((await call("/v1/catalog/live")).body.items.length,0);
  assert.equal((await call("/v1/catalog/live/first-product")).status,404,"draft detail is inaccessible");
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
  const publicDetail=await call("/v1/catalog/live/first-product");
  assert.equal(publicDetail.status,200);
  assert.deepEqual(publicDetail.body,publicListing.body.items[0],"public details match listing fields");
  assert.equal("status" in publicDetail.body,false);
  assert.equal("version" in publicDetail.body,false);
  assert.equal((await call("/v1/catalog/live/not-a-product")).status,404);
  assert.equal((await call("/v1/catalog/live/INVALID-SLUG")).status,404);
  assert.equal((await call("/v1/catalog/live/first-product","PATCH",{},customer)).status,404);

  assert.equal((await call("/v1/admin/products/"+draft.body.id,"PATCH",{slug:"first-product",name:"Old"},admin,1)).status,409);
  const archived=await call("/v1/admin/products/"+draft.body.id,"PATCH",{slug:"first-product",name:"First product",description:"",status:"archived"},admin,2);
  assert.equal(archived.status,200);
  assert.equal((await call("/v1/catalog/live")).body.items.length,0);
  assert.equal((await call("/v1/catalog/live/first-product")).status,404,"archived detail must not be visible");
  const audits=app.db.prepare("SELECT action FROM audit WHERE action LIKE 'catalog.%'").all().map(x=>x.action);
  assert.deepEqual(audits,["catalog.product_created","catalog.product_updated","catalog.product_updated"]);
 }finally{await app.close()}
});

test("catalog metadata is validated, versioned, published-only and preserved on legacy updates",async()=>{
 const app=createApp();
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 const call=async(path,method="GET",body,token,version)=>{
  const h={"Content-Type":"application/json"};
  if(token)h.Authorization="Bearer "+token;
  if(version)h["If-Match"]=String(version);
  const res=await fetch(base+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:res.status,body:await res.json()};
 };
 const baseProduct={slug:"documented-device",name:"Documented Device",description:"Explicit compatibility documentation",status:"draft",category:"hardware",features:["Read-only device inspection","Diagnostic snapshot"],requirements:["Windows 11","Manufacturer approval"]};
 try{
  await call("/v1/auth/register","POST",{email:"catalog-admin@example.test",password:"very-long-password-123"});
  await call("/v1/auth/register","POST",{email:"catalog-customer@example.test",password:"very-long-password-123"});
  const admin=(await call("/v1/auth/login","POST",{email:"catalog-admin@example.test",password:"very-long-password-123"})).body.token;
  const user=(await call("/v1/auth/login","POST",{email:"catalog-customer@example.test",password:"very-long-password-123"})).body.token;
  app.db.prepare("UPDATE users SET role='admin' WHERE email='catalog-admin@example.test'").run();
  assert.equal((await call("/v1/admin/products","POST",baseProduct,user)).status,403);
  for(const bad of [
   {...baseProduct,category:"unknown"},
   {...baseProduct,features:[""]},
   {...baseProduct,features:["duplicate","duplicate"]},
   {...baseProduct,features:["a".repeat(141)]},
   {...baseProduct,features:Array(11).fill("ok")},
   {...baseProduct,requirements:[9]},
   {...baseProduct,requirements:"test"},
   {...baseProduct,features:["contains\nnewline"]}
  ]){
   assert.equal((await call("/v1/admin/products","POST",bad,admin)).status,422);
  }
  const created=await call("/v1/admin/products","POST",baseProduct,admin);
  assert.equal(created.status,201);
  assert.equal(created.body.category,"hardware");
  assert.deepEqual(created.body.features,baseProduct.features);
  assert.deepEqual(created.body.requirements,baseProduct.requirements);
  assert.equal((await call("/v1/catalog/live/documented-device")).status,404);
  const publish=await call("/v1/admin/products/"+created.body.id,"PATCH",{...baseProduct,status:"published"},admin,1);
  assert.equal(publish.status,200);
  const detail=await call("/v1/catalog/live/documented-device");
  assert.equal(detail.status,200);
  assert.equal(detail.body.category,"hardware");
  assert.deepEqual(detail.body.features,baseProduct.features);
  assert.deepEqual(detail.body.requirements,baseProduct.requirements);
  assert.equal(detail.body.status,undefined);
  assert.equal(detail.body.version,undefined);
  const list=await call("/v1/catalog/live");
  assert.deepEqual(list.body.items[0],detail.body);
  const oldClient=await call("/v1/admin/products/"+created.body.id,"PATCH",{slug:baseProduct.slug,name:"Renamed Device",description:baseProduct.description,status:"published"},admin,2);
  assert.equal(oldClient.status,200);
  assert.deepEqual(oldClient.body.features,baseProduct.features,"older update clients must not erase metadata");
  const stale=await call("/v1/admin/products/"+created.body.id,"PATCH",{...baseProduct,status:"archived"},admin,2);
  assert.equal(stale.status,409);
  const archive=await call("/v1/admin/products/"+created.body.id,"PATCH",{...baseProduct,status:"archived"},admin,3);
  assert.equal(archive.status,200);
  assert.equal((await call("/v1/catalog/live/documented-device")).status,404);
  assert.equal((await call("/v1/catalog/live")).body.items.length,0);
  const row=app.db.prepare("SELECT category,features_json,requirements_json FROM catalog_products WHERE id=?").get(created.body.id);
  assert.equal(row.category,"hardware");
  assert.deepEqual(JSON.parse(row.features_json),baseProduct.features);
  assert.deepEqual(JSON.parse(row.requirements_json),baseProduct.requirements);
 }finally{await app.close()}
});
