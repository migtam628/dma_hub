import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";
import {stripeTestSignature} from "../src/stripe-test.mjs";

const NOW=1_800_000_000_000;
const STRIPE_KEY="sk_test_local_mock_key_123456789";
const WEBHOOK_KEY="whsec_local_mock_endpoint_123456789";
const SESSION_ID="cs_test_mock_checkout_123456789";
const REDIRECT="https://checkout.stripe.com/c/pay/"+SESSION_ID;
function setupStripe(fetchImpl){
 return {secretKey:STRIPE_KEY,webhookSecret:WEBHOOK_KEY,
  successUrl:"http://localhost:5173/#/billing",cancelUrl:"http://localhost:5173/#/billing",fetchImpl};
}
async function run(fn,settings){
 const app=createApp({clock:()=>NOW,...settings});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 const call=async(path,method="GET",data,token,headers={})=>{
  const response=await fetch(base+path,{method,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{}),...headers},
   body:data===undefined?undefined:typeof data==="string"?data:JSON.stringify(data)});
  return {status:response.status,body:await response.json()};
 };
 const webhook=async(event,{timestamp=Math.floor(NOW/1000),secret=WEBHOOK_KEY,header=null}={})=>{
  const raw=typeof event==="string"?event:JSON.stringify(event);
  const sig=header??("t="+timestamp+",v1="+stripeTestSignature(secret,timestamp,Buffer.from(raw)));
  return call("/v1/stripe-test/webhook","POST",raw,undefined,{"Stripe-Signature":sig});
 };
 try{await fn({app,call,webhook})}finally{await app.close()}
}
async function fixture(app,call,period="one_time"){
 const password="long-test-only-password";
 for(const email of ["owner@stripe.test","admin@stripe.test","stranger@stripe.test"]){
  assert.equal((await call("/v1/auth/register","POST",{email,password})).status,201);
 }
 const login=async email=>(await call("/v1/auth/login","POST",{email,password})).body;
 const owner=await login("owner@stripe.test"),admin=await login("admin@stripe.test"),stranger=await login("stranger@stripe.test");
 app.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(admin.user.id);
 const product=await call("/v1/admin/products","POST",{slug:"stripe-test-product",name:"Stripe Test Product",status:"published"},admin.token);
 assert.equal(product.status,201);
 const plan=await call("/v1/admin/products/"+product.body.id+"/plans","POST",
  {code:"one-price",name:"One-Time Test",amountMinor:1250,currency:"USD",billingPeriod:period,status:"active"},admin.token);
 assert.equal(plan.status,201);
 const order=await call("/v1/me/test-orders","POST",{planId:plan.body.id,idempotencyKey:"stripe_test_checkout_0001"},owner.token);
 assert.equal(order.status,201);
 return {owner,admin,stranger,orderId:order.body.id,productId:product.body.id};
}
function makeSession(orderId,userId,{amount=1250,livemode=false,mode="payment"}={}){
 return {id:SESSION_ID,object:"checkout.session",livemode,mode,
  amount_total:amount,currency:"usd",client_reference_id:orderId,metadata:{order_id:orderId,user_id:userId},
  payment_status:"unpaid",url:REDIRECT};
}
function makeEvent(checkout,orderId,userId,{id="evt_localcheckout12345678",type="checkout.session.completed",status="paid",amount=1250}={}){
 return {id,object:"event",type,livemode:false,data:{object:{...makeSession(orderId,userId,{amount}),payment_status:status}}};
}

test("Stripe test-mode checkout uses server price, authenticates ownership and replays safely",async()=>{
 let count=0,last;
 const fetchImpl=async(url,opts)=>{
  count++;last={url,opts};
  const p=new URLSearchParams(opts.body);
  return {ok:true,json:async()=>makeSession(p.get("client_reference_id"),p.get("metadata[user_id]"))};
 };
 await run(async({app,call})=>{
  const {owner,admin,stranger,orderId}=await fixture(app,call);
  assert.equal((await call("/v1/stripe-test/capabilities")).body.available,true);
  assert.equal((await call("/v1/me/stripe-test-checkouts","POST",{orderId})).status,401);
  assert.equal((await call("/v1/me/stripe-test-checkouts","POST",{orderId},stranger.token)).status,404);
  assert.equal((await call("/v1/me/stripe-test-checkouts","POST",{orderId,amountMinor:0},owner.token)).status,422);
  const created=await call("/v1/me/stripe-test-checkouts","POST",{orderId},owner.token);
  assert.equal(created.status,201);
  assert.equal(created.body.state,"open");
  assert.equal(created.body.checkoutUrl,REDIRECT);
  assert.equal(created.body.testModeOnly,true);
  assert.equal((await call("/v1/me/stripe-test-checkouts","POST",{orderId},owner.token)).body.replayed,true);
  assert.equal(count,1);
  assert.equal(last.url,"https://api.stripe.com/v1/checkout/sessions");
  const p=new URLSearchParams(last.opts.body);
  assert.equal(p.get("line_items[0][price_data][unit_amount]"),"1250");
  assert.equal(p.get("mode"),"payment");
  assert.equal(p.get("line_items[0][price_data][currency]"),"usd");
  assert.equal(p.get("client_reference_id"),orderId);
  assert.equal(p.get("metadata[user_id]"),owner.user.id);
  assert.equal(last.opts.headers.Authorization,"Bearer "+STRIPE_KEY);
  assert.equal(last.opts.headers["Idempotency-Key"],"dma-hub-stripe-test-"+orderId);
  assert.equal((await call("/v1/me/stripe-test-checkouts","GET",undefined,owner.token)).body.items.length,1);
  assert.equal((await call("/v1/me/stripe-test-checkouts","GET",undefined,stranger.token)).body.items.length,0);
  assert.equal((await call("/v1/admin/stripe-test-checkouts","GET",undefined,owner.token)).status,403);
  assert.equal((await call("/v1/admin/stripe-test-checkouts","GET",undefined,admin.token)).body.items.length,1);
  assert.equal(app.db.prepare("SELECT count(*) AS n FROM entitlements").get().n,0);
 },{stripeTest:setupStripe(fetchImpl)});
});

test("verified Stripe test webhook records observed payment only and rejects invalid, replay-conflicting events",async()=>{
 const fetchImpl=async(url,opts)=>{
  const p=new URLSearchParams(opts.body);
  return {ok:true,json:async()=>makeSession(p.get("client_reference_id"),p.get("metadata[user_id]"))};
 };
 await run(async({app,call,webhook})=>{
  const {owner,admin,orderId,productId}=await fixture(app,call);
  assert.equal((await call("/v1/me/stripe-test-checkouts","POST",{orderId},owner.token)).status,201);
  const event=makeEvent(null,orderId,owner.user.id);
  assert.equal((await webhook(event,{secret:"whsec_incorrect_test_secret_123456789"})).status,401);
  assert.equal((await webhook(event,{timestamp:Math.floor(NOW/1000)-301})).status,401);
  assert.equal((await webhook(event,{header:"broken"})).status,401);
  assert.equal((await webhook({...event,livemode:true})).status,422);
  assert.equal((await webhook({...event,data:{object:{...event.data.object,amount_total:999}}})).status,422);
  assert.equal((await webhook({...event,data:{object:{...event.data.object,livemode:true}}})).status,422);
  assert.equal((await webhook({...event,data:{object:{...event.data.object,client_reference_id:"different"}}})).status,422);
  const accepted=await webhook(event);
  assert.equal(accepted.status,202);
  assert.equal(accepted.body.accessGranted,false);
  assert.equal((await webhook(event)).body.replayed,true);
  assert.equal((await webhook({...event,type:"checkout.session.expired"})).status,409);
  assert.equal(app.db.prepare("SELECT state FROM stripe_test_checkouts WHERE order_id=?").get(orderId).state,"test_paid_observed");
  assert.equal(app.db.prepare("SELECT state FROM sandbox_orders WHERE id=?").get(orderId).state,"pending");
  assert.equal(app.db.prepare("SELECT count(*) AS n FROM entitlements").get().n,0);
  assert.equal((await call("/v1/me/access/"+productId,"GET",undefined,owner.token)).body.allowed,false);
  assert.equal((await call("/v1/admin/stripe-test-events","GET",undefined,owner.token)).status,403);
  const inbox=await call("/v1/admin/stripe-test-events","GET",undefined,admin.token);
  assert.equal(inbox.body.items.length,1);
  assert.equal(JSON.stringify(inbox.body).includes(STRIPE_KEY),false);
  assert.equal(app.db.prepare("SELECT count(*) AS n FROM audit WHERE action='stripe_test.event_observed'").get().n,1);
 },{stripeTest:setupStripe(fetchImpl)});
});

test("partial, live and invalid provider configuration fails closed, while unconfigured gateway has no network access",async()=>{
 for(const bad of [{secretKey:"sk_live_how_not_to_use_this"},{secretKey:STRIPE_KEY},{...setupStripe(async()=>{}),cancelUrl:"https://user:password@example.com"}]){
  assert.throws(()=>createApp({stripeTest:bad}),/Stripe test gateway requires/);
 }
 await run(async({call})=>{
  assert.deepEqual((await call("/v1/stripe-test/capabilities")).body,{available:false,testModeOnly:true,automatedFulfillment:false});
  assert.equal((await call("/v1/stripe-test/webhook","POST","{}",undefined,{})).status,503);
 },{});
});

test("Stripe test creation fails closed on suspicious provider metadata and restricts recurring plans",async()=>{
 let attempts=0;
 const badStripe=async(url,opts)=>{
  attempts++;
  const p=new URLSearchParams(opts.body);
  return {ok:true,json:async()=>makeSession(p.get("client_reference_id"),p.get("metadata[user_id]"),{livemode:true})};
 };
 await run(async({app,call})=>{
  const {owner,orderId}=await fixture(app,call);
  assert.equal((await call("/v1/me/stripe-test-checkouts","POST",{orderId},owner.token)).status,502);
  assert.equal(attempts,1);
  assert.equal(app.db.prepare("SELECT state FROM stripe_test_checkouts WHERE order_id=?").get(orderId).state,"creating");
  assert.equal(app.db.prepare("SELECT count(*) n FROM entitlements").get().n,0);
 },{stripeTest:setupStripe(badStripe)});
 await run(async({app,call})=>{
  const {owner,orderId}=await fixture(app,call,"monthly");
  assert.equal((await call("/v1/me/stripe-test-checkouts","POST",{orderId},owner.token)).status,422);
  assert.equal(app.db.prepare("SELECT count(*) n FROM stripe_test_checkouts").get().n,0);
 },{stripeTest:setupStripe(async()=>{throw Error("should never call Stripe")})});
});

test("admin-only authoritative Stripe TEST read verifies session but never grants access",async()=>{
 let checkoutOrder,checkoutUser,providerInvalid=false,providerDown=false;
 const calls=[];
 const fetchImpl=async(url,opts)=>{
  calls.push({url,method:opts.method,authorization:opts.headers.Authorization});
  if(opts.method==="POST"){
   const p=new URLSearchParams(opts.body);
   checkoutOrder=p.get("client_reference_id");checkoutUser=p.get("metadata[user_id]");
   return {ok:true,json:async()=>makeSession(checkoutOrder,checkoutUser)};
  }
  if(providerDown)return {ok:false,status:503};
  const session={...makeSession(checkoutOrder,checkoutUser),status:"complete",payment_status:"paid"};
  if(providerInvalid)session.amount_total=999;
  return {ok:true,json:async()=>session};
 };
 await run(async({app,call})=>{
  const {owner,admin,stranger,orderId,productId}=await fixture(app,call);
  const created=await call("/v1/me/stripe-test-checkouts","POST",{orderId},owner.token);
  assert.equal(created.status,201);
  const path="/v1/admin/stripe-test-checkouts/"+created.body.id+"/reconcile";
  const before=calls.length;
  assert.equal((await call(path,"POST",undefined,owner.token)).status,403);
  assert.equal((await call(path,"POST",undefined,stranger.token)).status,403);
  assert.equal((await call(path,"POST")).status,401);
  assert.equal(calls.length,before,"unauthorized users cannot query provider");
  const good=await call(path,"POST",undefined,admin.token);
  assert.equal(good.status,200);
  assert.equal(good.body.providerSessionId,SESSION_ID);
  assert.equal(good.body.providerSessionStatus,"complete");
  assert.equal(good.body.providerPaymentStatus,"paid");
  assert.equal(good.body.testPaymentObserved,true);
  assert.equal(good.body.settlementVerified,false);
  assert.equal(good.body.accessGranted,false);
  assert.equal(good.body.testModeOnly,true);
  assert.equal(calls.at(-1).url,"https://api.stripe.com/v1/checkout/sessions/"+SESSION_ID);
  assert.equal(calls.at(-1).method,"GET");
  assert.equal(calls.at(-1).authorization,"Bearer "+STRIPE_KEY);
  assert.equal(JSON.stringify(good.body).includes(STRIPE_KEY),false);
  providerInvalid=true;
  assert.equal((await call(path,"POST",undefined,admin.token)).status,502);
  providerInvalid=false;providerDown=true;
  assert.equal((await call(path,"POST",undefined,admin.token)).status,502);
  assert.equal((await call("/v1/admin/stripe-test-checkouts/00000000-0000-0000-0000-000000000000/reconcile","POST",undefined,admin.token)).status,404);
  assert.equal(app.db.prepare("SELECT count(*) n FROM audit WHERE action='stripe_test.reconciliation_checked'").get().n,1);
  assert.equal(app.db.prepare("SELECT state FROM sandbox_orders WHERE id=?").get(orderId).state,"pending");
  assert.equal(app.db.prepare("SELECT count(*) n FROM entitlements").get().n,0);
  assert.equal((await call("/v1/me/access/"+productId,"GET",undefined,owner.token)).body.allowed,false);
 },{stripeTest:setupStripe(fetchImpl)});
});
