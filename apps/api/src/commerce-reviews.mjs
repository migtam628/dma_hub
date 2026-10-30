import {randomUUID} from "node:crypto";

// Operator review workflow for sandbox commerce only. It is not a financial ledger,
// settlement decision, payment adapter, or license/entitlement issuance path.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY=/^[A-Za-z0-9_-]{8,80}$/;
const PROVIDERS=new Set(["sandbox","stripe_test"]);
const REASONS=new Set(["payment_question","test_checkout_mismatch","test_event_disagreement","other"]);
const STATES=new Set(["open","investigating","closed_unverified","closed_test_only"]);
const TRANSITIONS={
 open:new Set(["investigating","closed_unverified","closed_test_only"]),
 investigating:new Set(["open","closed_unverified","closed_test_only"]),
 closed_unverified:new Set(["open"]),
 closed_test_only:new Set(["open"])
};
const result=(status,payload)=>({status,payload});
const safeCase=c=>({id:c.id,orderId:c.order_id,provider:c.provider,reason:c.reason,
 state:c.state,version:c.version,createdAt:c.created_at,updatedAt:c.updated_at,
 testOnly:true,settlementVerified:false,accessGranted:false});
const customerCase=c=>({id:c.id,orderId:c.order_id,state:c.state,updatedAt:c.updated_at,
 testOnly:true,settlementVerified:false,accessGranted:false});
const safeEvent=e=>({id:e.id,version:e.version,fromState:e.from_state,toState:e.to_state,
 actorId:e.actor_id,createdAt:e.created_at});
function transaction(db,fn){
 db.exec("BEGIN IMMEDIATE");
 try{const value=fn();db.exec("COMMIT");return value}
 catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
}
function versionHeader(req){
 const value=req.headers["if-match"];
 if(typeof value!=="string"||!/^[1-9][0-9]*$/.test(value))return null;
 const version=Number(value);
 return Number.isSafeInteger(version)?version:null;
}
export function createCommerceReviews({db,clock,audit,readBody}){
 async function authenticatedRoute(path,req,user){
  const method=req.method;
  if(path==="/v1/me/commerce-reviews"&&method==="GET"){
   const rows=db.prepare(`SELECT c.* FROM commerce_review_cases c
    JOIN sandbox_orders o ON o.id=c.order_id WHERE o.user_id=?
    ORDER BY c.updated_at DESC,c.rowid DESC LIMIT 100`).all(user.id);
   return result(200,{items:rows.map(customerCase),testOnly:true});
  }
  if(!path.startsWith("/v1/admin/commerce-reviews"))return null;
  if(user.role!=="admin")return result(403,{error:"forbidden"});
  if(path==="/v1/admin/commerce-reviews"&&method==="GET"){
   const rows=db.prepare(`SELECT c.*,o.user_id FROM commerce_review_cases c
    JOIN sandbox_orders o ON o.id=c.order_id
    ORDER BY c.updated_at DESC,c.rowid DESC LIMIT 100`).all();
   return result(200,{items:rows.map(c=>({...safeCase(c),userId:c.user_id})),testOnly:true});
  }
  if(path==="/v1/admin/commerce-reviews"&&method==="POST"){
   const v=await readBody(req);
   if(!v||!UUID.test(v.orderId||"")||!KEY.test(v.idempotencyKey||"")||
      !PROVIDERS.has(v.provider)||!REASONS.has(v.reason)||
      Object.keys(v).some(k=>!["orderId","idempotencyKey","provider","reason"].includes(k)))
    return result(422,{error:"invalid_review_case"});
   return transaction(db,()=>{
    const order=db.prepare("SELECT id FROM sandbox_orders WHERE id=?").get(v.orderId);
    if(!order)return result(404,{error:"not_found"});
    if(v.provider==="stripe_test"&&!db.prepare("SELECT id FROM stripe_test_checkouts WHERE order_id=?").get(v.orderId))
     return result(422,{error:"stripe_test_checkout_missing"});
    const previous=db.prepare("SELECT * FROM commerce_review_cases WHERE order_id=?").get(v.orderId);
    if(previous){
     if(previous.idempotency_key===v.idempotencyKey&&previous.provider===v.provider&&previous.reason===v.reason)
      return result(200,{...safeCase(previous),replayed:true});
     return result(409,{error:"review_case_already_exists"});
    }
    const now=clock(),id=randomUUID();
    db.prepare(`INSERT INTO commerce_review_cases
     (id,order_id,idempotency_key,provider,reason,state,version,opened_by,created_at,updated_at)
     VALUES(?,?,?,?,?,'open',1,?,?,?)`)
     .run(id,v.orderId,v.idempotencyKey,v.provider,v.reason,user.id,now,now);
    db.prepare(`INSERT INTO commerce_review_events
     (id,case_id,version,from_state,to_state,actor_id,created_at) VALUES(?,?,1,NULL,'open',?,?)`)
     .run(randomUUID(),id,user.id,now);
    audit(user.id,"commerce_review.opened",id);
    return result(201,{id,orderId:v.orderId,provider:v.provider,reason:v.reason,
     state:"open",version:1,createdAt:now,updatedAt:now,
     testOnly:true,settlementVerified:false,accessGranted:false,replayed:false});
   });
  }
  const match=path.match(/^\/v1\/admin\/commerce-reviews\/([0-9a-f-]{36})$/i);
  if(!match||!UUID.test(match[1])||!["GET","PATCH"].includes(method))return null;
  if(method==="GET"){
   const c=db.prepare("SELECT * FROM commerce_review_cases WHERE id=?").get(match[1]);
   if(!c)return result(404,{error:"not_found"});
   const events=db.prepare("SELECT * FROM commerce_review_events WHERE case_id=? ORDER BY version DESC LIMIT 100").all(c.id);
   return result(200,{...safeCase(c),events:events.map(safeEvent)});
  }
  const version=versionHeader(req);
  if(!version)return result(428,{error:"version_required"});
  const v=await readBody(req);
  if(!v||Object.keys(v).length!==1||!STATES.has(v.state))
   return result(422,{error:"invalid_review_transition"});
  return transaction(db,()=>{
   const c=db.prepare("SELECT * FROM commerce_review_cases WHERE id=?").get(match[1]);
   if(!c)return result(404,{error:"not_found"});
   if(c.version!==version)return result(409,{error:"version_conflict",serverVersion:c.version});
   if(c.state===v.state)return result(200,{...safeCase(c),replayed:true});
   if(!TRANSITIONS[c.state]?.has(v.state))return result(409,{error:"invalid_review_transition"});
   const now=clock(),nextVersion=version+1;
   db.prepare("UPDATE commerce_review_cases SET state=?,version=?,updated_at=? WHERE id=? AND version=?")
    .run(v.state,nextVersion,now,c.id,version);
   db.prepare(`INSERT INTO commerce_review_events
    (id,case_id,version,from_state,to_state,actor_id,created_at) VALUES(?,?,?,?,?,?,?)`)
    .run(randomUUID(),c.id,nextVersion,c.state,v.state,user.id,now);
   audit(user.id,"commerce_review.transitioned",c.id);
   return result(200,{...safeCase(c),state:v.state,version:nextVersion,updatedAt:now,replayed:false});
  });
 }
 return {authenticatedRoute};
}
