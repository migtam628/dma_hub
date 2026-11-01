import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";

test("game release provenance: digest comparison, RBAC, privacy, staleness and immutable log",async()=>{
 const sha="a".repeat(64),secondSha="b".repeat(64);
 let lookups=0;
 const app=createApp({releaseLookup:async({tag,assetName})=>{
  lookups++;
  if(tag!=="v0.2.0-alpha.21")return null;
  return {id:2468,name:assetName,size:4096,state:"uploaded",digest:"sha256:"+sha};
 }});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 const call=async(path,method="GET",body,token,version)=>{
  const headers={"Content-Type":"application/json"};
  if(token)headers.Authorization="Bearer "+token;
  if(version)headers["If-Match"]=String(version);
  const res=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:res.status,data:await res.json()};
 };
 try{
  const password="long-password-2026";
  for(const email of ["assetadmin@example.test","assetcustomer@example.test"])
   assert.equal((await call("/v1/auth/register","POST",{email,password})).status,201);
  const admin=(await call("/v1/auth/login","POST",{email:"assetadmin@example.test",password})).data.token;
  const customer=(await call("/v1/auth/login","POST",{email:"assetcustomer@example.test",password})).data.token;
  app.db.prepare("UPDATE users SET role='admin' WHERE email=?").run("assetadmin@example.test");
  const product={slug:"asset-game-test",name:"Asset QA product",description:"No executable delivery",category:"software",status:"published",gameIds:["rust"],features:[],requirements:[]};
  const p=await call("/v1/admin/products","POST",product,admin);
  assert.equal(p.status,201);
  const reviewBody={productId:p.data.id,gameId:"rust",gameBuild:"2026.10.31",platform:"Windows 11",hardware:"Documented QA system",evidenceRef:"https://example.test/report"};
  const review=await call("/v1/admin/game-compatibility","POST",reviewBody,admin);
  assert.equal(review.status,201);
  assert.equal((await call("/v1/admin/game-compatibility/"+review.data.id,"PATCH",{state:"reviewed"},admin,1)).status,200);
  const assetPayload={reviewId:review.data.id,releaseTag:"v0.2.0-alpha.21",assetName:"example-release.zip",expectedSha256:sha};
  const publicPath="/v1/games/rust/release-records",adminPath="/v1/admin/game-release-assets";
  assert.deepEqual((await call(publicPath)).data.items,[]);
  assert.equal((await call(adminPath,"POST",assetPayload,customer)).status,403);
  for(const bad of [
   {...assetPayload,releaseTag:"../../../private"},
   {...assetPayload,assetName:"../private.exe"},
   {...assetPayload,assetName:"https://example.org/file.exe"},
   {...assetPayload,expectedSha256:"not-a-hash"},
   {...assetPayload,reviewId:"no-id"}
  ])assert.equal((await call(adminPath,"POST",bad,admin)).status,422);
  const created=await call(adminPath,"POST",assetPayload,admin);
  assert.equal(created.status,201);
  assert.equal((await call(adminPath,"POST",assetPayload,admin)).status,409);
  assert.equal((await call(adminPath,"GET",undefined,customer)).status,403);
  const url=adminPath+"/"+created.data.id;
  assert.equal((await call(url+"/match","POST",{},customer,1)).status,403);
  assert.equal((await call(url+"/match","POST",{},admin)).status,428);
  assert.equal(lookups,0);
  assert.deepEqual((await call(publicPath)).data.items,[]);
  const matched=await call(url+"/match","POST",{},admin,1);
  assert.equal(matched.status,200);
  assert.equal(matched.data.state,"metadata_matched");
  assert.equal(matched.data.notBinaryVerified,true);
  assert.equal(lookups,1);
  const pub=(await call(publicPath)).data;
  assert.equal(pub.metadataOnly,true);
  assert.equal(pub.noDownloadLinks,true);
  assert.equal(pub.items.length,1);
  assert.equal(pub.items[0].sha256,sha);
  assert.equal(pub.items[0].downloadEnabled,false);
  assert.equal(pub.items[0].metadataSource,"github_release_asset_digest");
  assert.equal(pub.items[0].expectedSha256,undefined);
  assert.equal(pub.items[0].evidenceRef,undefined);
  assert.equal(pub.items[0].downloadUrl,undefined);
  assert.equal((await call(url+"/match","POST",{},admin,1)).status,409);
  const fail=await call(adminPath,"POST",{...assetPayload,assetName:"different.zip",expectedSha256:secondSha},admin);
  assert.equal(fail.status,201);
  assert.equal((await call(adminPath+"/"+fail.data.id+"/match","POST",{},admin,1)).status,409);
  assert.deepEqual((await call(publicPath)).data.items.map(x=>x.assetName),["example-release.zip"]);
  const updated=await call("/v1/admin/products/"+p.data.id,"PATCH",{...product,name:"Changed product"},admin,1);
  assert.equal(updated.status,200);
  assert.deepEqual((await call(publicPath)).data.items,[],"product version change invalidates metadata display");
  assert.equal((await call(adminPath+"/"+fail.data.id+"/match","POST",{},admin,1)).status,409);
  const withdrawal=await call(url+"/withdraw","POST",{},admin,2);
  assert.equal(withdrawal.status,200);
  assert.equal((await call(url+"/withdraw","POST",{},admin,2)).status,409);
  assert.deepEqual((await call(publicPath)).data.items,[]);
  assert.deepEqual(app.db.prepare("SELECT to_state FROM game_release_artifact_events WHERE artifact_id=? ORDER BY version").all(created.data.id).map(x=>x.to_state),["draft","metadata_matched","withdrawn"]);
  assert.throws(()=>app.db.prepare("DELETE FROM game_release_artifact_events WHERE artifact_id=?").run(created.data.id),/immutable release event/);
  assert.throws(()=>app.db.prepare("UPDATE game_release_artifact_events SET to_state='draft' WHERE artifact_id=?").run(created.data.id),/immutable release event/);
 }finally{await app.close()}
});
