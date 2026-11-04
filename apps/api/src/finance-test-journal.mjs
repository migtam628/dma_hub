import {randomUUID} from "node:crypto";

// Manual, local TEST observations. Never payment settlement, refunds, or access grants.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY=/^[A-Za-z0-9_-]{8,80}$/;
const PROVIDERS=new Set(["sandbox","stripe_test"]);
const KINDS=new Set(["test_charge_reported","test_refund_reported","test_dispute_reported"]);
const flags={testOnly:true,providerVerified:false,settlementVerified:false,accessGranted:false};
const reply=(status,payload)=>({status,payload});
const output=e=>({id:e.id,orderId:e.order_id,provider:e.provider,kind:e.kind,
 amountMinor:e.amount_minor,currency:e.currency,recordedAt:e.recorded_at,...flags});
function transaction(db,fn){
 db.exec("BEGIN IMMEDIATE");
 try{const v=fn();db.exec("COMMIT");return v}
 catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
}
function valid(v){
 if(!v||typeof v!=="object"||Array.isArray(v)||
  Object.keys(v).some(k=>!["orderId","provider","eventKey","kind","amountMinor"].includes(k))||
  !UUID.test(v.orderId||"")||!PROVIDERS.has(v.provider)||
  !KEY.test(v.eventKey||"")||!KINDS.has(v.kind)||
  !Number.isSafeInteger(v.amountMinor)||v.amountMinor<0||v.amountMinor>100000000)return false;
 return v.kind==="test_dispute_reported"?v.amountMinor===0:v.amountMinor>0;
}
export function createFinanceTestJournal({db,clock,audit,readBody}){
 async function authenticatedRoute(path,req,user){
  const method=req.method;
  if(path==="/v1/me/finance-test-events"&&method==="GET"){
   const rows=db.prepare("SELECT e.* FROM finance_test_events e JOIN sandbox_orders o ON o.id=e.order_id WHERE o.user_id=? ORDER BY e.recorded_at DESC,e.rowid DESC LIMIT 100").all(user.id);
   return reply(200,{items:rows.map(e=>({id:e.id,orderId:e.order_id,kind:e.kind,
    amountMinor:e.amount_minor,currency:e.currency,recordedAt:e.recorded_at,...flags})),...flags});
  }
  // Read-only, provider-separated manual TEST observations. No payment verification.
  const customerSummary=path.match(/^\\/v1\\/me\\/finance-test-reconciliation\\/([0-9a-f-]{36})$/i);
  const adminSummary=path.match(/^\\/v1\\/admin\\/finance-test-reconciliation\\/([0-9a-f-]{36})$/i);
  if(method==="GET"&&(customerSummary||adminSummary)){
   if(adminSummary&&user.role!=="admin")return reply(403,{error:"forbidden"});
   const orderId=(customerSummary||adminSummary)[1];
   if(!UUID.test(orderId))return reply(404,{error:"not_found"});
   const order=db.prepare("SELECT id,user_id,amount_minor,currency,state FROM sandbox_orders WHERE id=?").get(orderId);
   if(!order||customerSummary&&order.user_id!==user.id)return reply(404,{error:"not_found"});
   const grouped=db.prepare("SELECT provider,kind,COUNT(*) AS event_count,COALESCE(SUM(amount_minor),0) AS total_minor FROM finance_test_events WHERE order_id=? GROUP BY provider,kind").all(orderId);
   const providers=[...new Set(grouped.map(row=>row.provider))].sort();
   const observations=providers.map(provider=>{
    const metric=kind=>grouped.find(row=>row.provider===provider&&row.kind===kind);
    const charges=metric("test_charge_reported"),refunds=metric("test_refund_reported"),disputes=metric("test_dispute_reported");
    const chargeCount=charges?.event_count??0,refundCount=refunds?.event_count??0,disputeCount=disputes?.event_count??0;
    const reportedChargeMinor=charges?.total_minor??0,reportedRefundMinor=refunds?.total_minor??0;
    const issues=[];
    if(chargeCount===0)issues.push("missing_test_charge_report");
    if(chargeCount>1)issues.push("multiple_test_charge_reports");
    if(chargeCount===1&&reportedChargeMinor!==order.amount_minor)issues.push("test_charge_amount_mismatch");
    if(reportedRefundMinor>reportedChargeMinor)issues.push("test_refunds_exceed_reported_charges");
    if(reportedRefundMinor>order.amount_minor)issues.push("test_refunds_exceed_order");
    if(disputeCount>0)issues.push("test_dispute_reported");
    return {provider,chargeCount,refundCount,disputeCount,reportedChargeMinor,reportedRefundMinor,
     reportedNetMinor:reportedChargeMinor-reportedRefundMinor,issues,
     reviewRequired:issues.length>0,...flags};
   });
   const issues=observations.flatMap(item=>item.issues.map(code=>({provider:item.provider,code})));
   if(providers.length===0)issues.push({provider:null,code:"no_test_observations"});
   return reply(200,{orderId:order.id,orderAmountMinor:order.amount_minor,currency:order.currency,
    orderState:order.state,providers:observations,issues,reviewRequired:issues.length>0,
    observationStatus:"MANUAL_UNVERIFIED_TEST",...flags});
  }
  if(!path.startsWith("/v1/admin/finance-test-events"))return null;
  if(user.role!=="admin")return reply(403,{error:"forbidden"});
  if(path==="/v1/admin/finance-test-events"&&method==="GET"){
   const rows=db.prepare("SELECT * FROM finance_test_events ORDER BY recorded_at DESC,rowid DESC LIMIT 100").all();
   return reply(200,{items:rows.map(output),...flags});
  }
  if(path==="/v1/admin/finance-test-events"&&method==="POST"){
   const v=await readBody(req);
   if(!valid(v))return reply(422,{error:"invalid_test_finance_event"});
   return transaction(db,()=>{
    const prior=db.prepare("SELECT * FROM finance_test_events WHERE provider=? AND event_key=?").get(v.provider,v.eventKey);
    if(prior){
     if(prior.order_id===v.orderId&&prior.kind===v.kind&&prior.amount_minor===v.amountMinor)
      return reply(200,{...output(prior),replayed:true});
     return reply(409,{error:"test_event_key_conflict"});
    }
    const order=db.prepare("SELECT id,amount_minor,currency FROM sandbox_orders WHERE id=?").get(v.orderId);
    if(!order)return reply(404,{error:"not_found"});
    if(order.currency!=="USD"||v.amountMinor>order.amount_minor||
      (v.kind==="test_charge_reported"&&v.amountMinor!==order.amount_minor))
     return reply(422,{error:"test_amount_mismatch"});
    // A manual TEST journal must not report a larger cumulative refund than
    // the order amount. Serialize this check with the insert transaction.
    if(v.kind==="test_refund_reported"){
     const totals=db.prepare("SELECT COALESCE(SUM(amount_minor),0) AS refunded FROM finance_test_events WHERE order_id=? AND provider=? AND kind='test_refund_reported'").get(v.orderId,v.provider);
     if(totals.refunded+v.amountMinor>order.amount_minor)
      return reply(422,{error:"test_cumulative_refund_exceeded"});
    }
    if(v.provider==="stripe_test"&&!db.prepare("SELECT id FROM stripe_test_checkouts WHERE order_id=?").get(v.orderId))
     return reply(422,{error:"stripe_test_checkout_missing"});
    const id=randomUUID(),now=clock();
    db.prepare("INSERT INTO finance_test_events(id,order_id,provider,event_key,kind,amount_minor,currency,recorded_by,recorded_at) VALUES(?,?,?,?,?,?,?,?,?)")
     .run(id,v.orderId,v.provider,v.eventKey,v.kind,v.amountMinor,order.currency,user.id,now);
    audit(user.id,"finance_test.event_recorded",id);
    return reply(201,{id,orderId:v.orderId,provider:v.provider,kind:v.kind,
     amountMinor:v.amountMinor,currency:order.currency,recordedAt:now,...flags,replayed:false});
   });
  }
  const match=path.match(/^\/v1\/admin\/finance-test-events\/([0-9a-f-]{36})$/i);
  if(match&&method==="GET"&&UUID.test(match[1])){
   const e=db.prepare("SELECT * FROM finance_test_events WHERE id=?").get(match[1]);
   return e?reply(200,output(e)):reply(404,{error:"not_found"});
  }
  return null;
 }
 return {authenticatedRoute};
}
