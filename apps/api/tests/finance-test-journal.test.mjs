import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";

test("finance TEST events enforce admin RBAC, tenant isolation, idempotency, immutability and no access",async()=>{
 const app=createApp({clock:()=>1_800_000_000_000});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 const call=async(path,method="GET",body,token)=>{
  const headers={"Content-Type":"application/json"};
  if(token)headers.Authorization="Bearer "+token;
  const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:r.status,body:await r.json()};
 };
 try{
  for(const email of ["staff@finance.test","alice@finance.test","bob@finance.test"])
   assert.equal((await call("/v1/auth/register","POST",{email,password:"long-password-12345"})).status,201);
  const login=async email=>(await call("/v1/auth/login","POST",{email,password:"long-password-12345"})).body;
  const staff=await login("staff@finance.test"),alice=await login("alice@finance.test"),bob=await login("bob@finance.test");
  app.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(staff.user.id);
  const admin=staff.token,route="/v1/admin/finance-test-events";
  const product=await call("/v1/admin/products","POST",{slug:"finance-journal-test",name:"Finance Test Product",description:"test",status:"published"},admin);
  assert.equal(product.status,201);
  const plan=await call("/v1/admin/products/"+product.body.id+"/plans","POST",
   {code:"finance-test",name:"Finance Test Plan",amountMinor:1500,currency:"USD",billingPeriod:"one_time",status:"active"},admin);
  assert.equal(plan.status,201);
  const order=await call("/v1/me/test-orders","POST",{planId:plan.body.id,idempotencyKey:"finance_order_01"},alice.token);
  assert.equal(order.status,201);
  const v={orderId:order.body.id,provider:"sandbox",eventKey:"sandbox_event_001",kind:"test_charge_reported",amountMinor:1500};
  assert.equal((await call(route,"GET",undefined,alice.token)).status,403);
  assert.equal((await call(route,"POST",v,alice.token)).status,403);
  assert.equal((await call(route,"POST",{...v,provider:"stripe_live"},admin)).status,422);
  assert.equal((await call(route,"POST",{...v,provider:"stripe_test"},admin)).status,422);
  assert.equal((await call(route,"POST",{...v,secret:"not-allowed"},admin)).status,422);
  assert.equal((await call(route,"POST",{...v,amountMinor:1499},admin)).status,422);
  assert.equal((await call(route,"POST",{...v,eventKey:"short"},admin)).status,422);
  const created=await call(route,"POST",v,admin);
  assert.equal(created.status,201,JSON.stringify({error:created.body,order:order.body,plan:plan.body}));
  assert.equal(created.body.providerVerified,false);
  assert.equal(created.body.settlementVerified,false);
  assert.equal(created.body.accessGranted,false);
  assert.equal((await call(route,"POST",v,admin)).body.replayed,true);
  assert.equal((await call(route,"POST",{...v,kind:"test_refund_reported"},admin)).status,409);
  assert.equal((await call(route,"POST",{...v,orderId:staff.user.id},admin)).status,409);
  assert.equal((await call(route,"POST",{...v,eventKey:"refund_event_01",kind:"test_refund_reported",amountMinor:300},admin)).status,201);
  assert.equal((await call(route,"POST",{...v,eventKey:"dispute_event_01",kind:"test_dispute_reported",amountMinor:0},admin)).status,201);
  assert.equal((await call(route,"POST",{...v,eventKey:"invalid_refund_01",kind:"test_refund_reported",amountMinor:1501},admin)).status,422);
  assert.equal((await call(route,"POST",{...v,eventKey:"refund_event_02",kind:"test_refund_reported",amountMinor:1200},admin)).status,201);
  assert.equal((await call(route,"POST",{...v,eventKey:"refund_event_03",kind:"test_refund_reported",amountMinor:1},admin)).status,422);
  assert.equal((await call(route,"POST",{...v,eventKey:"refund_event_02",kind:"test_refund_reported",amountMinor:1200},admin)).body.replayed,true);
  assert.equal((await call("/v1/me/finance-test-events","GET",undefined,alice.token)).body.items.length,4);
  assert.equal((await call("/v1/me/finance-test-events","GET",undefined,bob.token)).body.items.length,0);
  const customer=(await call("/v1/me/finance-test-events","GET",undefined,alice.token)).body;
  assert.equal(JSON.stringify(customer).includes("sandbox_event_001"),false);
  assert.equal(JSON.stringify(customer).includes(staff.user.id),false);
  assert.equal((await call(route+"/"+created.body.id,"GET",undefined,alice.token)).status,403);
  assert.equal((await call(route+"/"+created.body.id,"GET",undefined,admin)).status,200);
  assert.equal((await call(route,"GET",undefined,admin)).body.items.length,4);
  assert.equal(app.db.prepare("SELECT count(*) n FROM finance_test_events").get().n,4);
  assert.equal(app.db.prepare("SELECT count(*) n FROM entitlements").get().n,0);
  assert.equal(app.db.prepare("SELECT state FROM sandbox_orders WHERE id=?").get(order.body.id).state,"pending");
  assert.throws(()=>app.db.prepare("DELETE FROM finance_test_events WHERE id=?").run(created.body.id),/immutable test finance event/);
  assert.throws(()=>app.db.prepare("UPDATE finance_test_events SET amount_minor=0 WHERE id=?").run(created.body.id),/immutable test finance event/);
  assert.equal(app.db.prepare("SELECT count(*) n FROM audit WHERE action='finance_test.event_recorded'").get().n,4);
 }finally{await app.close()}
});
