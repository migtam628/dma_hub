import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";

test("game compatibility review stays private until explicitly reviewed and becomes stale after product change",async()=>{
 let now=100_000;
 const app=createApp({clock:()=>now});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 const request=async(path,method="GET",body,token,version)=>{
  const headers={"Content-Type":"application/json"};
  if(token)headers.Authorization="Bearer "+token;
  if(version)headers["If-Match"]=String(version);
  const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,data:await response.json()};
 };
 const email="reviewadmin@test.invalid",password="long-qa-password-2026";
 try{
  await request("/v1/auth/register","POST",{email,password});
  await request("/v1/auth/register","POST",{email:"reviewcustomer@test.invalid",password});
  const admin=(await request("/v1/auth/login","POST",{email,password})).data.token;
  const customer=(await request("/v1/auth/login","POST",{email:"reviewcustomer@test.invalid",password})).data.token;
  app.db.prepare("UPDATE users SET role='admin' WHERE email=?").run(email);
  const product={slug:"qa-only-game",name:"QA game entry",description:"No binary or download",category:"software",status:"published",gameIds:["rust"],features:[],requirements:[]};
  const created=await request("/v1/admin/products","POST",product,admin);
  assert.equal(created.status,201);
  const id=created.data.id;
  const reviewed=()=>request("/v1/games/rust/compatibility");
  assert.deepEqual((await reviewed()).data.items,[]);
  assert.equal((await request("/v1/games/not-real/compatibility")).status,404);
  const payload={productId:id,gameId:"rust",gameBuild:"2026.10.31",platform:"Windows 11",hardware:"Documented authorized test system",evidenceRef:"https://example.test/evidence/rust-review"};
  for(const p of [
   {...payload,gameId:"unknown"}, {...payload,gameBuild:""}, {...payload,platform:"Any"},
   {...payload,hardware:"x"}, {...payload,evidenceRef:"http://insecure.example.test"}
  ])assert.equal((await request("/v1/admin/game-compatibility","POST",p,admin)).status,422);
  assert.equal((await request("/v1/admin/game-compatibility","POST",payload,customer)).status,403);
  const draft=await request("/v1/admin/game-compatibility","POST",payload,admin);
  assert.equal(draft.status,201);
  assert.equal(draft.data.state,"draft");
  assert.equal((await request("/v1/admin/game-compatibility","POST",payload,admin)).status,409);
  assert.deepEqual((await reviewed()).data.items,[]);
  assert.equal((await request("/v1/admin/game-compatibility","GET",undefined,customer)).status,403);
  assert.equal((await request("/v1/admin/game-compatibility/"+draft.data.id,"PATCH",{state:"reviewed"},customer,1)).status,403);
  assert.equal((await request("/v1/admin/game-compatibility/"+draft.data.id,"PATCH",{state:"reviewed"},admin)).status,428);
  now+=100;
  const approved=await request("/v1/admin/game-compatibility/"+draft.data.id,"PATCH",{state:"reviewed"},admin,1);
  assert.equal(approved.status,200);
  assert.equal(approved.data.state,"reviewed");
  const publicResult=await reviewed();
  assert.equal(publicResult.status,200);
  assert.equal(publicResult.data.items.length,1);
  assert.equal(publicResult.data.items[0].gameBuild,payload.gameBuild);
  assert.equal(publicResult.data.items[0].status,"operator_reviewed");
  assert.equal(publicResult.data.items[0].reviewedAt,now);
  assert.equal(publicResult.data.items[0].reviewedBy,undefined);
  assert.equal(publicResult.data.items[0].version,undefined);
  assert.equal((await request("/v1/admin/game-compatibility/"+draft.data.id,"PATCH",{state:"withdrawn"},admin,1)).status,409);
  const productUpdate=await request("/v1/admin/products/"+id,"PATCH",{...product,name:"Updated QA entry"},admin,1);
  assert.equal(productUpdate.status,200);
  assert.deepEqual((await reviewed()).data.items,[],"old reviewed build must become stale after product mutation");
  const withdraw=await request("/v1/admin/game-compatibility/"+draft.data.id,"PATCH",{state:"withdrawn"},admin,2);
  assert.equal(withdraw.status,200);
  assert.deepEqual((await reviewed()).data.items,[]);
  const reset=await request("/v1/admin/game-compatibility/"+draft.data.id,"PATCH",{state:"draft"},admin,3);
  assert.equal(reset.status,200);
  assert.equal(reset.data.productVersion,2);
  const reapprove=await request("/v1/admin/game-compatibility/"+draft.data.id,"PATCH",{state:"reviewed"},admin,4);
  assert.equal(reapprove.status,200);
  assert.equal((await reviewed()).data.items.length,1);
  const unpublish=await request("/v1/admin/products/"+id,"PATCH",{...product,status:"archived"},admin,2);
  assert.equal(unpublish.status,200);
  assert.deepEqual((await reviewed()).data.items,[]);
  const attempts=app.db.prepare("SELECT to_state,version FROM game_compatibility_events WHERE review_id=? ORDER BY version").all(draft.data.id);
  assert.deepEqual(attempts.map(x=>x.to_state),["draft","reviewed","withdrawn","draft","reviewed"]);
  assert.throws(()=>app.db.prepare("DELETE FROM game_compatibility_events WHERE review_id=?").run(draft.data.id),/immutable compatibility event/);
  assert.throws(()=>app.db.prepare("UPDATE game_compatibility_events SET to_state='draft' WHERE review_id=?").run(draft.data.id),/immutable compatibility event/);
 }finally{await app.close()}
});
