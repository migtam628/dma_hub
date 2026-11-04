import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";

test("read-only TEST reconciliation detects missing charges, duplicate reports and disputes without entitlements",async()=>{
 const app=createApp({clock:()=>1_800_000_000_000});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 const call=async(path,method="GET",body,token)=>{
  const headers={"Content-Type":"application/json"};
  if(token)headers.Authorization="Bearer "+token;
  const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,body:await response.json()};
 };
 try{
  for(const email of ["finance-admin@example.test","finance-owner@example.test","finance-other@example.test"])
   assert.equal((await call("/v1/auth/register","POST",{email,password:"long-password-12345"})).status,201);
  const login=async email=>(await call("/v1/auth/login","POST",{email,password:"long-password-12345"})).body;
  const staff=await login("finance-admin@example.test"),owner=await login("finance-owner@example.test"),other=await login("finance-other@example.test");
  app.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(staff.user.id);
  const product=await call("/v1/admin/products","POST",
   {slug:"reconciliation-test",name:"Finance Reconciliation",description:"test",status:"published"},staff.token);
  assert.equal(product.status,201);
  const plan=await call("/v1/admin/products/"+product.body.id+"/plans","POST",
   {code:"reconcile-test",name:"Reconciliation",amountMinor:1500,currency:"USD",billingPeriod:"one_time",status:"active"},staff.token);
  assert.equal(plan.status,201);
  const order=await call("/v1/me/test-orders","POST",{planId:plan.body.id,idempotencyKey:"reconciliation_order_01"},owner.token);
  assert.equal(order.status,201);
  const id=order.body.id;
  const mine="/v1/me/finance-test-reconciliation/"+id;
  const admin="/v1/admin/finance-test-reconciliation/"+id;
  const journal="/v1/admin/finance-test-events";
  assert.equal((await call(mine)).status,401);
  assert.equal((await call(admin,"GET",undefined,owner.token)).status,403);
  assert.equal((await call(mine,"GET",undefined,other.token)).status,404);
  assert.equal((await call("/v1/me/finance-test-reconciliation/not-a-uuid","GET",undefined,owner.token)).status,404);
  const empty=await call(mine,"GET",undefined,owner.token);
  assert.equal(empty.status,200);
  assert.equal(empty.body.observationStatus,"MANUAL_UNVERIFIED_TEST");
  assert.deepEqual(empty.body.issues,[{provider:null,code:"no_test_observations"}]);
  assert.equal(empty.body.accessGranted,false);
  const event=(eventKey,kind,amountMinor)=>({orderId:id,provider:"sandbox",eventKey,kind,amountMinor});
  assert.equal((await call(journal,"POST",event("refund_first_001","test_refund_reported",200),staff.token)).status,201);
  let summary=(await call(mine,"GET",undefined,owner.token)).body;
  assert(summary.issues.some(issue=>issue.code==="missing_test_charge_report"));
  assert(summary.issues.some(issue=>issue.code==="test_refunds_exceed_reported_charges"));
  assert.equal(summary.providers[0].reportedNetMinor,-200);
  assert.equal((await call(journal,"POST",event("charge_first_001","test_charge_reported",1500),staff.token)).status,201);
  summary=(await call(mine,"GET",undefined,owner.token)).body;
  assert.equal(summary.reviewRequired,false);
  assert.equal(summary.providers[0].reportedNetMinor,1300);
  assert.equal(summary.providers[0].chargeCount,1);
  assert.equal((await call(journal,"POST",event("charge_second_01","test_charge_reported",1500),staff.token)).status,201);
  assert.equal((await call(journal,"POST",event("dispute_test_001","test_dispute_reported",0),staff.token)).status,201);
  summary=(await call(admin,"GET",undefined,staff.token)).body;
  assert(summary.issues.some(issue=>issue.code==="multiple_test_charge_reports"));
  assert(summary.issues.some(issue=>issue.code==="test_dispute_reported"));
  assert.equal(summary.providers[0].chargeCount,2);
  assert.equal(summary.providers[0].disputeCount,1);
  assert.equal(summary.providerVerified,false);
  assert.equal(summary.settlementVerified,false);
  assert.equal(summary.accessGranted,false);
  assert.equal(JSON.stringify(summary).includes("charge_first_001"),false);
  assert.equal(JSON.stringify(summary).includes(owner.user.id),false);
  assert.equal(app.db.prepare("SELECT COUNT(*) n FROM entitlements").get().n,0);
  assert.equal(app.db.prepare("SELECT state FROM sandbox_orders WHERE id=?").get(id).state,"pending");
  assert.equal((await call(admin,"POST",undefined,staff.token)).status!==200,true);
 }finally{await app.close()}
});
