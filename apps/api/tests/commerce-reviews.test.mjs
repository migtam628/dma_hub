import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";

test("admin-only provider-neutral sandbox review lifecycle is durable, versioned and inert",async()=>{
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
  for(const email of ["staff@review.test","alice@review.test","bob@review.test"]){
   assert.equal((await call("/v1/auth/register","POST",{email,password:pwd})).status,201);
  }
  const login=async email=>(await call("/v1/auth/login","POST",{email,password:pwd})).body;
  const staff=await login("staff@review.test"),alice=await login("alice@review.test"),bob=await login("bob@review.test");
  app.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(staff.user.id);
  const admin=staff.token;
  const p=await call("/v1/admin/products","POST",{slug:"review-tool",name:"Review Tool",description:"QA",status:"published"},admin);
  assert.equal(p.status,201);
  const plan=await call("/v1/admin/products/"+p.body.id+"/plans","POST",
   {code:"review-plan",name:"Review Plan",amountMinor:900,currency:"USD",billingPeriod:"one_time",status:"active"},admin);
  assert.equal(plan.status,201);
  const order=await call("/v1/me/test-orders","POST",{planId:plan.body.id,idempotencyKey:"review_order_1234"},alice.token);
  assert.equal(order.status,201);
  const reviewPath="/v1/admin/commerce-reviews",input={
   orderId:order.body.id,idempotencyKey:"review_case_1234",provider:"sandbox",reason:"payment_question"};
  assert.equal((await call(reviewPath,"GET",undefined,alice.token)).status,403);
  assert.equal((await call(reviewPath,"POST",input,alice.token)).status,403);
  assert.equal((await call(reviewPath,"POST",{...input,provider:"stripe_live"},admin)).status,422);
  assert.equal((await call(reviewPath,"POST",{...input,provider:"stripe_test"},admin)).status,422);
  assert.equal((await call(reviewPath,"POST",{...input,secret:"never"},admin)).status,422);
  const created=await call(reviewPath,"POST",input,admin);
  assert.equal(created.status,201);
  assert.equal(created.body.state,"open");
  assert.equal(created.body.settlementVerified,false);
  assert.equal(created.body.accessGranted,false);
  const id=created.body.id;
  assert.equal((await call(reviewPath,"POST",input,admin)).body.replayed,true);
  assert.equal((await call(reviewPath,"POST",{...input,idempotencyKey:"different_key_99"},admin)).status,409);
  assert.equal((await call("/v1/me/commerce-reviews","GET",undefined,alice.token)).body.items.length,1);
  assert.equal((await call("/v1/me/commerce-reviews","GET",undefined,bob.token)).body.items.length,0);
  const customer=await call("/v1/me/commerce-reviews","GET",undefined,alice.token);
  assert.equal(JSON.stringify(customer.body).includes("payment_question"),false);
  assert.equal(JSON.stringify(customer.body).includes(staff.user.id),false);
  assert.equal((await call(reviewPath+"/"+id,"GET",undefined,alice.token)).status,403);
  assert.equal((await call(reviewPath+"/"+id,"PATCH",{state:"investigating"},admin)).status,428);
  assert.equal((await call(reviewPath+"/"+id,"PATCH",{state:"paid"},admin,1)).status,422);
  now+=1000;
  const moved=await call(reviewPath+"/"+id,"PATCH",{state:"investigating"},admin,1);
  assert.equal(moved.status,200);
  assert.equal(moved.body.version,2);
  assert.equal((await call(reviewPath+"/"+id,"PATCH",{state:"closed_unverified"},admin,1)).status,409);
  assert.equal((await call(reviewPath+"/"+id,"PATCH",{state:"investigating"},admin,2)).body.replayed,true);
  const closed=await call(reviewPath+"/"+id,"PATCH",{state:"closed_unverified"},admin,2);
  assert.equal(closed.status,200);
  assert.equal(closed.body.version,3);
  assert.equal((await call(reviewPath+"/"+id,"PATCH",{state:"investigating"},admin,3)).status,409);
  assert.equal((await call(reviewPath+"/"+id,"PATCH",{state:"open"},admin,3)).status,200);
  const detail=await call(reviewPath+"/"+id,"GET",undefined,admin);
  assert.equal(detail.body.events.length,4);
  assert.deepEqual(detail.body.events.map(e=>e.version),[4,3,2,1]);
  assert.equal((await call(reviewPath,"GET",undefined,admin)).body.items.length,1);
  assert.equal(app.db.prepare("SELECT count(*) n FROM entitlements").get().n,0);
  assert.equal(app.db.prepare("SELECT state FROM sandbox_orders WHERE id=?").get(order.body.id).state,"pending");
  assert.throws(()=>app.db.prepare("DELETE FROM commerce_review_events WHERE case_id=?").run(id),/immutable review event/);
  assert.throws(()=>app.db.prepare("UPDATE commerce_review_events SET to_state='open' WHERE case_id=?").run(id),/immutable review event/);
  const audit=app.db.prepare("SELECT action FROM audit WHERE action LIKE 'commerce_review.%'").all().map(x=>x.action);
  assert.equal(audit.filter(x=>x==="commerce_review.opened").length,1);
  assert.equal(audit.filter(x=>x==="commerce_review.transitioned").length,3);
 }finally{await app.close()}
});
