import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";
import {signSandboxEvent} from "../src/sandbox-webhook.mjs";

const SECRET="local-only-test-secret-with-32-plus-random-characters";
const NOW=1_800_000_000_000;

async function withServer(fn,secret=SECRET){
 let now=NOW;
 const app=createApp({clock:()=>now,sandboxWebhookSecret:secret});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 async function call(path,method="GET",body,token,headers={}){
  const res=await fetch(base+path,{method,headers:{"Content-Type":"application/json",...headers,...(token?{Authorization:"Bearer "+token}:{})},
   body:body===undefined?undefined:typeof body==="string"?body:JSON.stringify(body)});
  return {status:res.status,body:await res.json()};
 }
 async function send(payload,{stamp=now,secretKey=SECRET,sign=true,customHeaders={}}={}){
  const body=typeof payload==="string"?payload:JSON.stringify(payload);
  return call("/v1/test-webhooks/payments","POST",body,undefined,{
   "x-dma-timestamp":String(stamp),
   "x-dma-signature":"sha256="+(sign?signSandboxEvent(secretKey,stamp,Buffer.from(body)):"0".repeat(64)),
   ...customHeaders
  });
 }
 try{await fn({app,call,send,now:()=>now,advance:x=>now+=x})}
 finally{await app.close()}
}
async function newOrder(call,app){
 const password="test-sandbox-password";
 const email="webhook-test@example.test";
 const registered=await call("/v1/auth/register","POST",{email,password});
 assert.equal(registered.status,201);
 const auth=(await call("/v1/auth/login","POST",{email,password})).body;
 const token=auth.token;
 app.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(auth.user.id);
 const prod=await call("/v1/admin/products","POST",{slug:"webhook-fixture",name:"Webhook fixture",status:"published"},token);
 assert.equal(prod.status,201);
 const price=await call("/v1/admin/products/"+prod.body.id+"/plans","POST",
  {code:"monthly",name:"Monthly",amountMinor:999,currency:"USD",billingPeriod:"monthly",status:"active"},token);
 assert.equal(price.status,201);
 const order=await call("/v1/me/test-orders","POST",{planId:price.body.id,idempotencyKey:"webhook_fixture_123"},token);
 assert.equal(order.status,201);
 return {orderId:order.body.id,token,productId:prod.body.id};
}

test("signed sandbox events are deduplicated but never grant access or fulfill an order",()=>withServer(async({app,call,send})=>{
 const {orderId,token,productId}=await newOrder(call,app);
 const payload={eventId:"evt_demo_signed_0001",orderId,kind:"sandbox.payment_observed"};
 const first=await send(payload);
 assert.equal(first.status,202);
 assert.deepEqual(first.body,{accepted:true,replayed:false,sandboxOnly:true,accessGranted:false});
 assert.equal((await send(payload)).body.replayed,true);
 assert.equal((await send({...payload,kind:"sandbox.payment_failed"})).status,409);
 assert.equal(app.db.prepare("SELECT count(*) n FROM sandbox_webhook_events").get().n,1);
 assert.equal(app.db.prepare("SELECT state FROM sandbox_orders WHERE id=?").get(orderId).state,"pending");
 assert.equal(app.db.prepare("SELECT count(*) n FROM entitlements").get().n,0);
 assert.equal((await call("/v1/me/access/"+productId,"GET",undefined,token)).body.allowed,false);
 assert.equal((await call("/v1/admin/test-webhooks","GET",undefined,token)).body.items.length,1);
 assert.equal((await call("/v1/admin/test-webhooks","GET")).status,401);
 assert.equal(app.db.prepare("SELECT count(*) n FROM audit WHERE action='sandbox_webhook.received'").get().n,1);
}));

test("unsigned, tampered, stale, malformed and oversized messages fail without database mutation",()=>withServer(async({app,send,call,now,advance})=>{
 const {orderId}=await newOrder(call,app);
 const p={eventId:"evt_bad_signature_001",orderId,kind:"sandbox.payment_observed"};
 assert.equal((await send(p,{sign:false})).status,401);
 assert.equal((await send(p,{secretKey:"incorrect-test-secret-of-adequate-length"})).status,401);
 assert.equal((await send(p,{stamp:now()-5*60*1000-1})).status,401);
 assert.equal((await send(p,{stamp:now()+5*60*1000+1})).status,401);
 assert.equal((await send(p,{customHeaders:{"x-dma-signature":"broken"}})).status,401);
 assert.equal((await send("not-json")).status,400);
 assert.equal((await send({...p,eventId:"bad"})).status,422);
 assert.equal((await send({...p,extra:"secret"})).status,422);
 assert.equal((await send({...p,kind:"payment.succeeded"})).status,422);
 assert.equal((await send({...p,orderId:"00000000-0000-0000-0000-000000000001"})).status,422);
 const oversized=JSON.stringify({...p,extra:"x".repeat(17_000)});
 assert.equal((await send(oversized)).status,413);
 assert.equal(app.db.prepare("SELECT count(*) n FROM sandbox_webhook_events").get().n,0);
}));

test("disabled webhook secret fails closed; weak test secret cannot be configured",async()=>{
 assert.throws(()=>createApp({sandboxWebhookSecret:"short"}),/must be at least 32/);
 await withServer(async({call})=>{
  assert.equal((await call("/v1/test-webhooks/payments","POST",{foo:"bar"})).status,503);
 },null);
});

test("customer cannot access sandbox event inbox; only metadata is exposed to admin",()=>withServer(async({app,call,send})=>{
 const {orderId,token}=await newOrder(call,app);
 const created=await call("/v1/auth/register","POST",{email:"customer-event@example.test",password:"different-test-password"});
 assert.equal(created.status,201);
 const other=(await call("/v1/auth/login","POST",{email:"customer-event@example.test",password:"different-test-password"})).body.token;
 assert.equal((await call("/v1/admin/test-webhooks","GET",undefined,other)).status,403);
 assert.equal((await send({eventId:"evt_inbox_test_12345",orderId,kind:"sandbox.payment_failed"})).status,202);
 const inbox=await call("/v1/admin/test-webhooks","GET",undefined,token);
 assert.equal(inbox.status,200);
 assert.equal(inbox.body.sandboxOnly,true);
 assert.equal(inbox.body.items[0].kind,"sandbox.payment_failed");
 assert.equal(Object.keys(inbox.body.items[0]).sort().join(","),"eventId,kind,orderId,receivedAt,sentAt");
 assert.equal(JSON.stringify(inbox.body).includes(SECRET),false);
}));
