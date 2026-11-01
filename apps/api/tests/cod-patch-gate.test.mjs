import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";
import {COD_ANNOUNCED_RECHECK_MS,codReviewCurrentForPublic} from "../src/cod-patch-gate.mjs";

test("the announced Warzone update gate applies only to old Call of Duty reviews",()=>{
 const time=COD_ANNOUNCED_RECHECK_MS;
 assert.equal(codReviewCurrentForPublic("call-of-duty",time-1,time-1),true);
 assert.equal(codReviewCurrentForPublic("call-of-duty",time-1,time),false);
 assert.equal(codReviewCurrentForPublic("call-of-duty",time,time),true);
 assert.equal(codReviewCurrentForPublic("call-of-duty",null,time),false);
 assert.equal(codReviewCurrentForPublic("rust",1,time),true);
});
test("after Nov 6, old CoD compatibility, QA and matched metadata disappear from public endpoints",async()=>{
 let now=Date.parse("2026-11-05T12:00:00Z");
 const sha="a".repeat(64);
 const app=createApp({clock:()=>now,releaseLookup:async({tag,assetName})=>
  tag==="v0.2.0-alpha.28"?{id:247,name:assetName,size:4096,state:"uploaded",digest:"sha256:"+sha}:null});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 async function call(path,method="GET",body,token,version){
  const headers={"Content-Type":"application/json"};
  if(token)headers.Authorization="Bearer "+token;
  if(version)headers["If-Match"]=String(version);
  const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,data:await response.json()};
 }
 const password="long-cod-pilot-test-2026";
 try{
  assert.equal((await call("/v1/auth/register","POST",{email:"codreview@test.invalid",password})).status,201);
  const token=(await call("/v1/auth/login","POST",{email:"codreview@test.invalid",password})).data.token;
  app.db.prepare("UPDATE users SET role='admin' WHERE email='codreview@test.invalid'").run();
  const product={slug:"cod-authorized-qa-placeholder",name:"COD QA synthetic",description:"Synthetic QA only; no functional software",category:"software",status:"published",gameIds:["call-of-duty"],features:[],requirements:[]};
  const p=await call("/v1/admin/products","POST",product,token);
  assert.equal(p.status,201);
  const r=await call("/v1/admin/game-compatibility","POST",{productId:p.data.id,gameId:"call-of-duty",gameBuild:"unverified-demo",platform:"Windows 11",hardware:"Synthetic test fixture not real hardware",evidenceRef:"https://example.test/cod-fixture"},token);
  assert.equal(r.status,201);
  const path="/v1/admin/game-compatibility/"+r.data.id;
  assert.equal((await call(path,"PATCH",{state:"reviewed"},token,1)).status,200);
  const qa=await call("/v1/admin/game-qa-results","POST",{reviewId:r.data.id,scope:"hardware_setup",outcome:"retest_required",osBuild:"Windows 11 test fixture",firmware:"Test fixture only",evidenceRef:"",notes:"Do not assert hardware support",rightsConfirmed:false},token,2);
  assert.equal(qa.status,201);
  const asset=await call("/v1/admin/game-release-assets","POST",{reviewId:r.data.id,releaseTag:"v0.2.0-alpha.28",assetName:"synthetic-check.zip",expectedSha256:sha},token);
  assert.equal(asset.status,201);
  assert.equal((await call("/v1/admin/game-release-assets/"+asset.data.id+"/match","POST",{},token,1)).status,200);
  const checks=["compatibility","qa-status","release-records"];
  for(const suffix of checks){
   const result=await call("/v1/games/call-of-duty/"+suffix);
   assert.equal(result.status,200);
   assert.equal(result.data.items.length,1,"fixture visible before update: "+suffix);
  }
  now=COD_ANNOUNCED_RECHECK_MS;
  for(const suffix of checks){
   const result=await call("/v1/games/call-of-duty/"+suffix);
   assert.equal(result.status,200);
   assert.deepEqual(result.data.items,[],"old review must not remain public after announced patch window: "+suffix);
  }
  assert.equal((await call(path,"PATCH",{state:"draft"},token,2)).status,200);
  now+=1000;
  assert.equal((await call(path,"PATCH",{state:"reviewed"},token,3)).status,200);
  assert.equal((await call("/v1/games/call-of-duty/compatibility")).data.items.length,1,"manual re-review can restore operator-only compatibility report");
  assert.deepEqual((await call("/v1/games/call-of-duty/qa-status")).data.items,[],"old QA observation not resurrected");
  assert.deepEqual((await call("/v1/games/call-of-duty/release-records")).data.items,[],"old metadata match not resurrected");
 }finally{await app.close()}
});
