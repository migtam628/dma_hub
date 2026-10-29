import {randomUUID} from "node:crypto";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY=/^[A-Za-z0-9_-]{8,80}$/;
const MONTH=30*24*60*60*1000;

function inTransaction(db,fn){
 db.exec("BEGIN IMMEDIATE");
 try{const v=fn();db.exec("COMMIT");return v}
 catch(err){if(db.isTransaction)db.exec("ROLLBACK");throw err}
}
function reply(status,payload){return {status,payload}}
function expose(o){
 return {id:o.id,productId:o.product_id,planId:o.plan_id,amountMinor:o.amount_minor,currency:o.currency,
  billingPeriod:o.billing_period,state:o.state,createdAt:o.created_at,updatedAt:o.updated_at,
  entitlementId:o.entitlement_id,fulfilledAt:o.fulfilled_at};
}

/**
 * Internal-only QA order engine. This NEVER handles external payments or creates purchased access.
 * Fulfillment requires an authenticated admin and creates a 30-day sandbox entitlement.
 */
export function createSandboxOrderRoutes({db,clock,audit,readBody}){
 async function authenticatedRoute(path,req,user){
  const method=req.method;
  if(path==="/v1/me/test-orders"&&method==="GET"){
   const items=db.prepare("SELECT * FROM sandbox_orders WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 100").all(user.id);
   return reply(200,{items:items.map(expose),sandboxOnly:true});
  }
  if(path==="/v1/me/test-orders"&&method==="POST"){
   const v=await readBody(req);
   if(typeof v.planId!=="string"||!UUID.test(v.planId)||typeof v.idempotencyKey!=="string"||!KEY.test(v.idempotencyKey)||
    Object.keys(v).some(k=>!["planId","idempotencyKey"].includes(k)))return reply(422,{error:"invalid_test_order"});
   const now=clock(),id=randomUUID();
   const data=inTransaction(db,()=>{
    const previous=db.prepare("SELECT * FROM sandbox_orders WHERE user_id=? AND idempotency_key=?").get(user.id,v.idempotencyKey);
    if(previous)return {status:previous.plan_id===v.planId?200:409,payload:previous.plan_id===v.planId?
     {...expose(previous),sandboxOnly:true,replayed:true}:{error:"idempotency_key_reused"}};
    const p=db.prepare(`SELECT pl.*,cp.status AS product_status FROM pricing_plans pl
      JOIN catalog_products cp ON cp.id=pl.product_id WHERE pl.id=?`).get(v.planId);
    if(!p||p.status!=="active"||p.product_status!=="published")return {status:422,payload:{error:"plan_unavailable"}};
    db.prepare(`INSERT INTO sandbox_orders
     (id,user_id,product_id,plan_id,idempotency_key,amount_minor,currency,billing_period,state,entitlement_id,fulfilled_by,created_at,updated_at,fulfilled_at)
     VALUES(?,?,?,?,?,?,?,?,'pending',NULL,NULL,?,?,NULL)`)
     .run(id,user.id,p.product_id,p.id,v.idempotencyKey,p.amount_minor,p.currency,p.billing_period,now,now);
    audit(user.id,"sandbox_order.created",id);
    return {status:201,payload:{id,productId:p.product_id,planId:p.id,amountMinor:p.amount_minor,currency:p.currency,billingPeriod:p.billing_period,
      state:"pending",createdAt:now,updatedAt:now,entitlementId:null,fulfilledAt:null,sandboxOnly:true,replayed:false}};
   });
   return reply(data.status,data.payload);
  }
  if(!path.startsWith("/v1/admin/test-orders"))return null;
  if(user.role!=="admin")return reply(403,{error:"forbidden"});
  if(path==="/v1/admin/test-orders"&&method==="GET"){
   const items=db.prepare("SELECT * FROM sandbox_orders ORDER BY created_at DESC,rowid DESC LIMIT 200").all();
   return reply(200,{items:items.map(o=>({...expose(o),userId:o.user_id})),sandboxOnly:true});
  }
  const action=path.match(/^\/v1\/admin\/test-orders\/([0-9a-f-]{36})\/(fulfill|cancel)$/i);
  if(!action||method!=="POST"||!UUID.test(action[1]))return null;
  const [_,orderId,operation]=action,now=clock();
  const decision=inTransaction(db,()=>{
   const o=db.prepare("SELECT * FROM sandbox_orders WHERE id=?").get(orderId);
   if(!o)return reply(404,{error:"not_found"});
   if(operation==="cancel"){
    if(o.state==="cancelled")return reply(200,{...expose(o),sandboxOnly:true,replayed:true});
    if(o.state==="test_fulfilled")return reply(409,{error:"fulfilled_order_cannot_cancel"});
    db.prepare("UPDATE sandbox_orders SET state='cancelled',updated_at=? WHERE id=?").run(now,orderId);
    audit(user.id,"sandbox_order.cancelled",orderId);
    return reply(200,{...expose(o),state:"cancelled",updatedAt:now,sandboxOnly:true,replayed:false});
   }
   if(o.state==="test_fulfilled")return reply(200,{...expose(o),sandboxOnly:true,replayed:true});
   if(o.state==="cancelled")return reply(409,{error:"order_cancelled"});
   const valid=db.prepare(`SELECT cp.status AS product_status,pl.status AS plan_status,u.disabled_at
     FROM sandbox_orders so JOIN catalog_products cp ON cp.id=so.product_id
     JOIN pricing_plans pl ON pl.id=so.plan_id
     JOIN users u ON u.id=so.user_id WHERE so.id=?`).get(orderId);
   if(!valid||valid.product_status!=="published"||valid.plan_status!=="active"||valid.disabled_at!==null)
    return reply(422,{error:"order_not_fulfillable"});
   const end=now+MONTH;
   const overlapping=db.prepare(`SELECT id FROM entitlements WHERE user_id=? AND product_id=? AND state='active'
     AND starts_at<? AND expires_at>? LIMIT 1`).get(o.user_id,o.product_id,end,now);
   if(overlapping)return reply(409,{error:"entitlement_overlap"});
   const grantId=randomUUID();
   db.prepare(`INSERT INTO entitlements
    (id,user_id,product_id,plan_id,source,state,starts_at,expires_at,revoked_at,granted_by,revoked_by,created_at,updated_at)
    VALUES(?,?,?,?,'sandbox_order','active',?,?,NULL,?,NULL,?,?)`)
    .run(grantId,o.user_id,o.product_id,o.plan_id,now,end,user.id,now,now);
   db.prepare("UPDATE sandbox_orders SET state='test_fulfilled',entitlement_id=?,fulfilled_by=?,fulfilled_at=?,updated_at=? WHERE id=?")
    .run(grantId,user.id,now,now,orderId);
   audit(user.id,"sandbox_order.fulfilled",orderId);
   audit(user.id,"entitlement.sandbox_issued",grantId);
   return reply(200,{...expose(o),state:"test_fulfilled",entitlementId:grantId,fulfilledAt:now,updatedAt:now,sandboxOnly:true,replayed:false});
  });
  return decision;
 }
 return {authenticatedRoute};
}
