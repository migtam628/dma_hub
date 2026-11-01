import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";

test("game QA journal is admin-only, version-bound, append-only and fail-closed",async()=>{
 let now=10000;
 const app=createApp({clock:()=>now});
 await new Promise(r=>app.server.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+app.server.address().port;
 const request=async(path,method="GET",body,token,version)=>{
  const headers={"Content-Type":"application/json"};
  if(token)headers.Authorization="Bearer "+token;
  if(version)headers["If-Match"]=String(version);
  const res=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:res.status,data:await res.json()};
 };
 const password="long-qa-test-password-26";
 try{
  for(const email of ["qa-admin@test.invalid","qa-customer@test.invalid"])
   assert.equal((await request("/v1/auth/register","POST",{email,password})).status,201);
  const admin=(await request("/v1/auth/login","POST",{email:"qa-admin@test.invalid",password})).data.token;
  const customer=(await request("/v1/auth/login","POST",{email:"qa-customer@test.invalid",password})).data.token;
  app.db.prepare("UPDATE users SET role='admin' WHERE email='qa-admin@test.invalid'").run();
  const product={slug:"qa-hardware-demo",name:"Authorized QA placeholder",description:"No executable included",
   status:"published",category:"software",gameIds:["rust"],features:[],requirements:[]};
  const p=await request("/v1/admin/products","POST",product,admin);
  assert.equal(p.status,201);
  const review=await request("/v1/admin/game-compatibility","POST",{
   productId:p.data.id,gameId:"rust",gameBuild:"2026.11.01",platform:"Windows 11",hardware:"Authorized bench hardware",evidenceRef:"https://example.test/bench"
  },admin);
  assert.equal(review.status,201);
  const qa="/v1/admin/game-qa-results",publicPath="/v1/games/rust/qa-status";
  const sample={reviewId:review.data.id,scope:"hardware_setup",outcome:"passed",osBuild:"Windows 11 24H2",
   firmware:"QA board rev 2.3",evidenceRef:"https://example.test/qa/results",notes:"Manual bench diagnostics passed under authorization",rightsConfirmed:true};
  assert.equal((await request(qa,"POST",sample,admin,1)).status,409,"draft review cannot receive pass");
  assert.deepEqual((await request(publicPath)).data.items,[]);
  assert.equal((await request("/v1/admin/game-compatibility/"+review.data.id,"PATCH",{state:"reviewed"},admin,1)).status,200);
  assert.equal((await request(qa,"GET",undefined,customer)).status,403);
  assert.equal((await request(qa,"POST",sample,customer,2)).status,403);
  assert.equal((await request(qa,"POST",sample,admin)).status,428);
  for(const data of [
   {...sample,scope:"unknown"},
   {...sample,outcome:"unsupported"},
   {...sample,evidenceRef:"http://insecure.test"},
   {...sample,rightsConfirmed:false},
   {...sample,notes:"short"},
   {...sample,reviewId:"not-uuid"}
  ])assert.equal((await request(qa,"POST",data,admin,2)).status,422);
  const posted=await request(qa,"POST",sample,admin,2);
  assert.equal(posted.status,201);
  assert.equal(posted.data.downloadEnabled,false);
  const first=(await request(publicPath)).data;
  assert.equal(first.items.length,1);
  assert.equal(first.items[0].outcome,"passed");
  assert.equal(first.items[0].operatorReported,true);
  assert.equal(first.items[0].independentlyCertified,false);
  assert.equal(first.items[0].notes,undefined);
  assert.equal(first.items[0].evidenceRef,undefined);
  assert.equal(first.items[0].actorId,undefined);
  now+=10;
  assert.equal((await request(qa,"POST",{...sample,outcome:"failed",rightsConfirmed:false,
   notes:"Validation re-test did not pass for the system"},admin,2)).status,201);
  const failed=(await request(publicPath)).data.items;
  assert.equal(failed.length,1);
  assert.equal(failed[0].outcome,"failed","new negative result must supersede old pass");
  now+=10;
  assert.equal((await request(qa,"POST",{...sample,outcome:"retest_required",rightsConfirmed:false,
   notes:"Game patched. Manual retest required.",evidenceRef:""},admin,2)).status,201);
  assert.equal((await request(publicPath)).data.items[0].outcome,"retest_required");
  const rows=app.db.prepare("SELECT outcome FROM game_qa_results WHERE review_id=? ORDER BY rowid").all(review.data.id);
  assert.deepEqual(rows.map(x=>x.outcome),["passed","failed","retest_required"]);
  assert.throws(()=>app.db.prepare("DELETE FROM game_qa_results WHERE review_id=?").run(review.data.id),/immutable game QA result/);
  assert.throws(()=>app.db.prepare("UPDATE game_qa_results SET outcome='passed' WHERE review_id=?").run(review.data.id),/immutable game QA result/);
  assert.equal((await request("/v1/admin/products/"+p.data.id,"PATCH",{...product,name:"Product updated"},admin,1)).status,200);
  assert.deepEqual((await request(publicPath)).data.items,[],"updated product version invalidates old QA");
  assert.equal((await request(qa,"POST",sample,admin,2)).status,409);
  assert.equal((await request("/v1/admin/game-compatibility/"+review.data.id,"PATCH",{state:"draft"},admin,2)).status,200);
  assert.equal((await request("/v1/admin/game-compatibility/"+review.data.id,"PATCH",{state:"reviewed"},admin,3)).status,200);
  assert.deepEqual((await request(publicPath)).data.items,[],"re-review does not revive old QA");
  assert.equal((await request(qa,"POST",sample,admin,2)).status,409,"stale review version fails");
  const fresh=await request(qa,"POST",{...sample,scope:"functional_smoke",notes:"Authorized new-build software test was recorded"},admin,4);
  assert.equal(fresh.status,201);
  const current=(await request(publicPath)).data.items;
  assert.equal(current.length,1);
  assert.equal(current[0].scope,"functional_smoke");
  assert.equal((await request("/v1/admin/game-compatibility/"+review.data.id,"PATCH",{state:"withdrawn"},admin,4)).status,200);
  assert.deepEqual((await request(publicPath)).data.items,[]);
 }finally{await app.close()}
});
