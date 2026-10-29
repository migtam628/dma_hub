import {verifyStripeTestCheckoutRead} from "./payment-reconciliation.mjs";
import {createHmac,createHash,randomUUID,timingSafeEqual} from "node:crypto";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT=/^evt_[A-Za-z0-9]{8,100}$/;
const SESSION=/^cs_test_[A-Za-z0-9_]{8,200}$/;
const SIGNATURE=/^[0-9a-f]{64}$/;
const FIVE_MIN=300000,MAX_BODY=64*1024;
const TYPES=new Set(["checkout.session.completed","checkout.session.async_payment_succeeded","checkout.session.expired","checkout.session.async_payment_failed"]);
const ok=(status,payload)=>({status,payload});

function acceptableRedirect(value){
 if(typeof value!=="string"||value.length>500)return false;
 try{
  const u=new URL(value);
  if(u.username||u.password)return false;
  return u.protocol==="https:"||(u.protocol==="http:"&&["localhost","127.0.0.1","[::1]"].includes(u.hostname));
 }catch{return false}
}
function rawBody(req){
 return new Promise((resolve,reject)=>{
  let size=0,tooBig=false;const parts=[];
  if(Number(req.headers["content-length"]||0)>MAX_BODY){req.resume();reject(Object.assign(new Error("Too large"),{status:413}));return}
  req.on("data",buf=>{size+=buf.length;if(size>MAX_BODY){tooBig=true;parts.length=0}else if(!tooBig)parts.push(buf)});
  req.on("end",()=>tooBig?reject(Object.assign(new Error("Too large"),{status:413})):resolve(Buffer.concat(parts)));
  req.on("error",reject);
 });
}
function validateStripeSignature(header,body,secret,now){
 if(typeof header!=="string"||header.length>2000)return false;
 const parts=header.split(",").map(x=>x.trim().split("="));
 const stamps=parts.filter(x=>x.length===2&&x[0]==="t").map(x=>x[1]);
 if(stamps.length!==1||!/^[1-9][0-9]{8,11}$/.test(stamps[0]))return false;
 const stamp=Number(stamps[0]);
 if(!Number.isSafeInteger(stamp)||Math.abs(now-stamp*1000)>FIVE_MIN)return false;
 const expected=createHmac("sha256",secret).update(stamps[0]+".").update(body).digest();
 return parts.some(x=>x.length===2&&x[0]==="v1"&&SIGNATURE.test(x[1])&&timingSafeEqual(expected,Buffer.from(x[1],"hex")));
}
export function stripeTestSignature(secret,timestampSeconds,body){
 return createHmac("sha256",secret).update(String(timestampSeconds)+".").update(body).digest("hex");
}
export function createStripeTestGateway({db,clock,audit,secretKey,webhookSecret,successUrl,cancelUrl,fetchImpl=fetch}){
 const settings=[secretKey,webhookSecret,successUrl,cancelUrl];
 const configured=settings.some(x=>x!==undefined&&x!==null&&x!=="");
 if(configured){
  if(typeof secretKey!=="string"||!/^sk_test_[A-Za-z0-9_]{10,}$/.test(secretKey)||
     typeof webhookSecret!=="string"||!/^whsec_[A-Za-z0-9_]{10,}$/.test(webhookSecret)||
     !acceptableRedirect(successUrl)||!acceptableRedirect(cancelUrl)){
   throw new Error("Stripe test gateway requires sk_test_ key, whsec_ endpoint secret and trusted return URLs");
  }
 }
 const active=configured;
 function sessionOut(x,includeUrl=false){
  return {id:x.id,orderId:x.order_id,state:x.state,amountMinor:x.amount_minor,
   providerSessionId:x.provider_session_id,createdAt:x.created_at,updatedAt:x.updated_at,
   ...(includeUrl&&x.state==="open"?{checkoutUrl:x.checkout_url}:{})};
 }
 function publicRoute(path,req){
  if(path==="/v1/stripe-test/capabilities"&&req.method==="GET")return Promise.resolve(ok(200,{available:active,testModeOnly:true,automatedFulfillment:false}));
  if(path!=="/v1/stripe-test/webhook"||req.method!=="POST")return Promise.resolve(null);
  return receiveWebhook(req);
 }
 async function authenticatedRoute(path,req,user){
  if(path==="/v1/me/stripe-test-checkouts"&&req.method==="GET"){
   const items=db.prepare(`SELECT s.* FROM stripe_test_checkouts s
    JOIN sandbox_orders o ON o.id=s.order_id WHERE o.user_id=?
    ORDER BY s.created_at DESC LIMIT 100`).all(user.id);
   return ok(200,{items:items.map(x=>sessionOut(x,true)),testModeOnly:true});
  }
  if(path==="/v1/me/stripe-test-checkouts"&&req.method==="POST"){
   if(!active)return ok(503,{error:"stripe_test_not_configured"});
   const body=await new Promise((resolve,reject)=>{
    const chunks=[];let n=0,large=false;
    req.on("data",x=>{n+=x.length;if(n>4096){large=true;chunks.length=0}else if(!large)chunks.push(x)});
    req.on("end",()=>{if(large)return reject(Object.assign(Error("Too large"),{status:413}));
     try{resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")))}catch{reject(Object.assign(Error("Invalid JSON"),{status:400}))}});
    req.on("error",reject);
   });
   if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).join(",")!=="orderId"||!UUID.test(body.orderId||""))
    return ok(422,{error:"invalid_checkout_request"});
   const order=db.prepare(`SELECT so.*,p.status AS product_status,p.name AS product_name,
     pl.status AS plan_status,pl.name AS plan_name,u.disabled_at
     FROM sandbox_orders so JOIN catalog_products p ON p.id=so.product_id
     JOIN pricing_plans pl ON pl.id=so.plan_id JOIN users u ON u.id=so.user_id
     WHERE so.id=? AND so.user_id=?`).get(body.orderId,user.id);
   if(!order)return ok(404,{error:"not_found"});
   if(order.state!=="pending"||order.product_status!=="published"||order.plan_status!=="active"||
      order.disabled_at!==null||order.billing_period!=="one_time"||order.currency!=="USD"||
      order.amount_minor<50||order.amount_minor>100000000){
    return ok(422,{error:"stripe_test_order_ineligible",message:"Only eligible one-time sandbox orders may open Stripe test Checkout."});
   }
   let saved=db.prepare("SELECT * FROM stripe_test_checkouts WHERE order_id=?").get(order.id);
   if(saved&&saved.state!=="creating")return ok(200,{...sessionOut(saved,true),testModeOnly:true,replayed:true});
   const now=clock(),checkoutId=saved?.id||randomUUID();
   if(!saved){
    db.prepare(`INSERT OR IGNORE INTO stripe_test_checkouts
     (id,order_id,provider_session_id,checkout_url,state,amount_minor,created_at,updated_at)
     VALUES(?,?,NULL,NULL,'creating',?,?,?)`).run(checkoutId,order.id,order.amount_minor,now,now);
   }
   saved=db.prepare("SELECT * FROM stripe_test_checkouts WHERE order_id=?").get(order.id);
   if(saved.state!=="creating")return ok(200,{...sessionOut(saved,true),testModeOnly:true,replayed:true});
   const form=new URLSearchParams({
    mode:"payment","payment_method_types[0]":"card",
    "line_items[0][price_data][currency]":"usd",
    "line_items[0][price_data][unit_amount]":String(order.amount_minor),
    "line_items[0][price_data][product_data][name]":order.product_name+" — "+order.plan_name+" (Stripe test)",
    "line_items[0][quantity]":"1",
    client_reference_id:order.id,
    "metadata[order_id]":order.id,
    "metadata[user_id]":user.id,
    customer_email:user.email,
    success_url:successUrl,cancel_url:cancelUrl
   });
   let session;
   try{
    const response=await fetchImpl("https://api.stripe.com/v1/checkout/sessions",{
     method:"POST",
     headers:{"Authorization":"Bearer "+secretKey,"Content-Type":"application/x-www-form-urlencoded",
      "Idempotency-Key":"dma-hub-stripe-test-"+order.id},
     body:form.toString(),
     signal:AbortSignal.timeout(10000)
    });
    if(!response.ok)return ok(502,{error:"stripe_test_unavailable"});
    session=await response.json();
   }catch{return ok(502,{error:"stripe_test_unavailable"})}
   let url;
   try{url=new URL(session?.url)}catch{return ok(502,{error:"invalid_stripe_test_session"})}
   if(!SESSION.test(session?.id||"")||session.livemode!==false||session.object!=="checkout.session"||
     session.mode!=="payment"||session.currency!=="usd"||session.amount_total!==order.amount_minor||
     session.client_reference_id!==order.id||session.metadata?.order_id!==order.id||
     session.metadata?.user_id!==user.id||session.payment_status!=="unpaid"||
     url.protocol!=="https:"||url.hostname!=="checkout.stripe.com"){
      return ok(502,{error:"invalid_stripe_test_session"});
   }
   db.prepare(`UPDATE stripe_test_checkouts SET provider_session_id=?,checkout_url=?,state='open',updated_at=?
    WHERE order_id=? AND state='creating'`).run(session.id,url.toString(),clock(),order.id);
   audit(user.id,"stripe_test.checkout_created",order.id);
   const result=db.prepare("SELECT * FROM stripe_test_checkouts WHERE order_id=?").get(order.id);
   return ok(201,{...sessionOut(result,true),testModeOnly:true,replayed:false});
  }
  const reconcile=path.match(/^\/v1\/admin\/stripe-test-checkouts\/([0-9a-f-]{36})\/reconcile$/i);
  if(reconcile&&req.method==="POST"){
   if(user.role!=="admin")return ok(403,{error:"forbidden"});
   if(!active)return ok(503,{error:"stripe_test_not_configured"});
   const checkout=db.prepare(`SELECT s.*,o.user_id FROM stripe_test_checkouts s
    JOIN sandbox_orders o ON o.id=s.order_id WHERE s.id=?`).get(reconcile[1]);
   if(!checkout)return ok(404,{error:"not_found"});
   if(!checkout.provider_session_id)return ok(409,{error:"stripe_test_session_not_created"});
   let provider;
   try{
    const response=await fetchImpl("https://api.stripe.com/v1/checkout/sessions/"+encodeURIComponent(checkout.provider_session_id),{
     method:"GET",headers:{"Authorization":"Bearer "+secretKey},signal:AbortSignal.timeout(10000)
    });
    if(!response.ok)return ok(502,{error:"stripe_test_reconciliation_unavailable"});
    provider=await response.json();
   }catch{return ok(502,{error:"stripe_test_reconciliation_unavailable"})}
   const observation=verifyStripeTestCheckoutRead(provider,checkout);
   if(!observation)return ok(502,{error:"stripe_test_reconciliation_mismatch"});
   audit(user.id,"stripe_test.reconciliation_checked",checkout.order_id);
   return ok(200,{checkoutId:checkout.id,orderId:checkout.order_id,
    providerSessionId:checkout.provider_session_id,...observation});
  }
  if(path==="/v1/admin/stripe-test-checkouts"&&req.method==="GET"){
   if(user.role!=="admin")return ok(403,{error:"forbidden"});
   const rows=db.prepare(`SELECT s.*,o.user_id FROM stripe_test_checkouts s
    JOIN sandbox_orders o ON o.id=s.order_id ORDER BY s.updated_at DESC LIMIT 100`).all();
   return ok(200,{items:rows.map(x=>({...sessionOut(x),userId:x.user_id})),testModeOnly:true});
  }
  if(path==="/v1/admin/stripe-test-events"&&req.method==="GET"){
   if(user.role!=="admin")return ok(403,{error:"forbidden"});
   const rows=db.prepare("SELECT event_id,checkout_id,event_type,received_at FROM stripe_test_events ORDER BY received_at DESC LIMIT 100").all();
   return ok(200,{items:rows.map(x=>({eventId:x.event_id,checkoutId:x.checkout_id,eventType:x.event_type,receivedAt:x.received_at})),testModeOnly:true});
  }
  return null;
 }
 async function receiveWebhook(req){
  if(!active)return ok(503,{error:"stripe_test_not_configured"});
  const body=await rawBody(req);
  if(!validateStripeSignature(req.headers["stripe-signature"],body,webhookSecret,clock()))return ok(401,{error:"invalid_stripe_signature"});
  let event;
  try{event=JSON.parse(body.toString("utf8"))}catch{return ok(400,{error:"invalid_stripe_event"})}
  if(!event||typeof event!=="object"||!EVENT.test(event.id||"")||event.object!=="event"||event.livemode!==false||
     typeof event.type!=="string"||!event.data||typeof event.data!=="object")return ok(422,{error:"invalid_stripe_event"});
  if(!TYPES.has(event.type))return ok(200,{accepted:false,ignored:true,testModeOnly:true});
  const session=event.data.object;
  if(!session||session.object!=="checkout.session"||!SESSION.test(session.id||"")||session.livemode!==false||
    session.mode!=="payment"||session.currency!=="usd"||!Number.isSafeInteger(session.amount_total))return ok(422,{error:"invalid_stripe_session"});
  const checkout=db.prepare(`SELECT s.*,o.user_id FROM stripe_test_checkouts s JOIN sandbox_orders o ON o.id=s.order_id
   WHERE s.provider_session_id=?`).get(session.id);
  if(!checkout)return ok(422,{error:"unmatched_stripe_session"});
  if(session.amount_total!==checkout.amount_minor||session.client_reference_id!==checkout.order_id||
     session.metadata?.order_id!==checkout.order_id||session.metadata?.user_id!==checkout.user_id)return ok(422,{error:"stripe_checkout_mismatch"});
  const digest=createHash("sha256").update(body).digest("hex");
  db.exec("BEGIN IMMEDIATE");
  try{
   const previous=db.prepare("SELECT body_sha256 FROM stripe_test_events WHERE event_id=?").get(event.id);
   if(previous){
    db.exec("COMMIT");
    return previous.body_sha256===digest?ok(200,{accepted:true,replayed:true,testModeOnly:true,accessGranted:false}):
     ok(409,{error:"stripe_event_id_conflict"});
   }
   db.prepare("INSERT INTO stripe_test_events(event_id,checkout_id,event_type,body_sha256,received_at) VALUES(?,?,?,?,?)")
    .run(event.id,checkout.id,event.type,digest,clock());
   // Stripe events are test observations, not a reconciled payment ledger.
   if(["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type)&&session.payment_status==="paid"&&checkout.state==="open"){
    db.prepare("UPDATE stripe_test_checkouts SET state='test_paid_observed',updated_at=? WHERE id=?").run(clock(),checkout.id);
   }else if(event.type==="checkout.session.expired"&&checkout.state==="open"){
    db.prepare("UPDATE stripe_test_checkouts SET state='expired',updated_at=? WHERE id=?").run(clock(),checkout.id);
   }
   audit(null,"stripe_test.event_observed",checkout.order_id);
   db.exec("COMMIT");
  }catch(err){if(db.isTransaction)db.exec("ROLLBACK");throw err}
  return ok(202,{accepted:true,replayed:false,testModeOnly:true,accessGranted:false});
 }
 return {publicRoute,authenticatedRoute,enabled:active};
}
