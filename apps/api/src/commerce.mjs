import {randomUUID} from "node:crypto";

const ID=/^[0-9a-f-]{36}$/i;
const CODE=/^[a-z0-9][a-z0-9-]{1,39}$/;
const DAY=24*60*60*1000;

function planOutput(p){
 return {id:p.id,productId:p.product_id,code:p.code,name:p.name,amountMinor:p.amount_minor,currency:p.currency,
  billingPeriod:p.billing_period,status:p.status,version:p.version,createdAt:p.created_at,updatedAt:p.updated_at};
}
function grantOutput(e,now,productStatus){
 const accessStatus=e.state==="revoked"?"revoked":e.starts_at>now?"scheduled":e.expires_at<=now?"expired":productStatus!=="published"?"product_unavailable":"active";
 return {id:e.id,userId:e.user_id,productId:e.product_id,planId:e.plan_id,source:e.source,
  state:e.state,startsAt:e.starts_at,expiresAt:e.expires_at,revokedAt:e.revoked_at,createdAt:e.created_at,
  accessStatus,accessAllowed:accessStatus==="active"};
}
function validPlan(v){
 if(!v||typeof v!=="object"||Array.isArray(v))return null;
 const code=typeof v.code==="string"?v.code.trim().toLowerCase():"";
 const name=typeof v.name==="string"?v.name.trim():"";
 const amountMinor=v.amountMinor;
 const currency=v.currency??"USD";
 const billingPeriod=v.billingPeriod;
 const status=v.status??"draft";
 if(!CODE.test(code)||name.length<2||name.length>80||!Number.isSafeInteger(amountMinor)||amountMinor<0||amountMinor>100000000||
    currency!=="USD"||!["one_time","monthly","yearly"].includes(billingPeriod)||!["draft","active","archived"].includes(status))return null;
 return {code,name,amountMinor,currency,billingPeriod,status};
}
function validPlanPatch(v){
 if(!v||typeof v!=="object"||Array.isArray(v)||Object.keys(v).some(k=>!["name","status"].includes(k)))return null;
 const name=typeof v.name==="string"?v.name.trim():"";
 if(name.length<2||name.length>80||!["draft","active","archived"].includes(v.status))return null;
 return {name,status:v.status};
}
function expectedVersion(req){
 const value=req.headers["if-match"];
 if(typeof value!=="string"||!/^[1-9][0-9]*$/.test(value))return null;
 const n=Number(value);return Number.isSafeInteger(n)?n:null;
}
function transact(db,fn){
 db.exec("BEGIN IMMEDIATE");
 try{const out=fn();db.exec("COMMIT");return out}
 catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
}
const result=(status,payload)=>({status,payload});

export function createCommerce({db,clock,audit,readBody}){
 function publicRoute(path,method){
  if(path!=="/v1/catalog/pricing"||method!=="GET")return null;
  const items=db.prepare(`SELECT pl.*,p.slug AS product_slug,p.name AS product_name
   FROM pricing_plans pl JOIN catalog_products p ON p.id=pl.product_id
   WHERE pl.status='active' AND p.status='published'
   ORDER BY p.name,pl.amount_minor LIMIT 200`).all();
  return result(200,{items:items.map(p=>({...planOutput(p),productSlug:p.product_slug,productName:p.product_name}))});
 }
 async function authenticatedRoute(path,req,u){
  const method=req.method,now=clock();
  if(path==="/v1/me/entitlements"&&method==="GET"){
   const items=db.prepare(`SELECT e.*,p.status AS product_status
    FROM entitlements e JOIN catalog_products p ON p.id=e.product_id
    WHERE e.user_id=? ORDER BY e.created_at DESC LIMIT 200`).all(u.id);
   return result(200,{items:items.map(e=>grantOutput(e,now,e.product_status))});
  }
  const access=path.match(/^\/v1\/me\/access\/([0-9a-f-]{36})$/i);
  if(access&&method==="GET"){
   const product=db.prepare("SELECT status FROM catalog_products WHERE id=?").get(access[1]);
   if(!product||product.status!=="published")return result(200,{productId:access[1],allowed:false,reason:"unavailable"});
   const grant=db.prepare(`SELECT id,expires_at FROM entitlements WHERE user_id=? AND product_id=?
    AND state='active' AND starts_at<=? AND expires_at>? ORDER BY expires_at DESC LIMIT 1`)
    .get(u.id,access[1],now,now);
   return result(200,{productId:access[1],allowed:!!grant,reason:grant?"active":"not_entitled",expiresAt:grant?.expires_at??null});
  }
  if(!path.startsWith("/v1/admin/"))return null;
  if(u.role!=="admin")return result(403,{error:"forbidden"});

  const products=path.match(/^\/v1\/admin\/products\/([0-9a-f-]{36})\/plans$/i);
  if(products&&(method==="GET"||method==="POST")){
   const productId=products[1];
   const p=db.prepare("SELECT id FROM catalog_products WHERE id=?").get(productId);
   if(!p)return result(404,{error:"not_found"});
   if(method==="GET"){
    const items=db.prepare("SELECT * FROM pricing_plans WHERE product_id=? ORDER BY created_at DESC LIMIT 100").all(productId);
    return result(200,{items:items.map(planOutput)});
   }
   const form=validPlan(await readBody(req));
   if(!form)return result(422,{error:"invalid_plan"});
   const id=randomUUID();
   try{
    transact(db,()=>{
     db.prepare(`INSERT INTO pricing_plans(id,product_id,code,name,amount_minor,currency,billing_period,status,version,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id,productId,form.code,form.name,form.amountMinor,form.currency,form.billingPeriod,form.status,1,now,now);
     audit(u.id,"pricing.plan_created",id);
    });
   }catch(e){if(String(e).includes("UNIQUE"))return result(409,{error:"plan_code_exists"});throw e}
   return result(201,{id,productId,...form,version:1,createdAt:now,updatedAt:now});
  }
  const planPath=path.match(/^\/v1\/admin\/plans\/([0-9a-f-]{36})$/i);
  if(planPath&&(method==="GET"||method==="PATCH")){
   const p=db.prepare("SELECT * FROM pricing_plans WHERE id=?").get(planPath[1]);
   if(!p)return result(404,{error:"not_found"});
   if(method==="GET")return result(200,planOutput(p));
   const version=expectedVersion(req);
   if(!version)return result(428,{error:"version_required"});
   const form=validPlanPatch(await readBody(req));
   if(!form)return result(422,{error:"invalid_plan_update",message:"Price, currency and billing period cannot be changed after creation."});
   const updated=transact(db,()=>{
    const changes=db.prepare("UPDATE pricing_plans SET name=?,status=?,version=version+1,updated_at=? WHERE id=? AND version=?")
     .run(form.name,form.status,now,p.id,version).changes;
    if(changes)audit(u.id,"pricing.plan_updated",p.id);
    return changes;
   });
   if(!updated)return result(409,{error:"version_conflict",serverVersion:p.version});
   return result(200,{...planOutput(p),...form,version:version+1,updatedAt:now});
  }
  if(path==="/v1/admin/entitlements"&&(method==="GET"||method==="POST")){
   if(method==="GET"){
    const items=db.prepare(`SELECT e.*,p.status AS product_status FROM entitlements e
     JOIN catalog_products p ON p.id=e.product_id ORDER BY e.created_at DESC LIMIT 200`).all();
    return result(200,{items:items.map(e=>grantOutput(e,now,e.product_status))});
   }
   const v=await readBody(req);
   const startsAt=v.startsAt??now,expiresAt=v.expiresAt;
   if(!ID.test(v.userId||"")||!ID.test(v.productId||"")||!ID.test(v.planId||"")||
      !Number.isSafeInteger(startsAt)||!Number.isSafeInteger(expiresAt)||
      startsAt<now-DAY||startsAt>now+30*DAY||expiresAt<=startsAt||expiresAt>startsAt+366*DAY||expiresAt<=now||
      v.source!==undefined)return result(422,{error:"invalid_grant"});
   const account=db.prepare("SELECT id FROM users WHERE id=? AND disabled_at IS NULL").get(v.userId);
   const item=db.prepare("SELECT id,status FROM catalog_products WHERE id=?").get(v.productId);
   const plan=db.prepare("SELECT id FROM pricing_plans WHERE id=? AND product_id=? AND status='active'").get(v.planId,v.productId);
   if(!account||!item||item.status!=="published"||!plan)return result(422,{error:"grant_target_unavailable"});
   const id=randomUUID();
   const created=transact(db,()=>{
    const overlap=db.prepare(`SELECT id FROM entitlements WHERE user_id=? AND product_id=? AND state='active'
     AND starts_at<? AND expires_at>? LIMIT 1`).get(v.userId,v.productId,expiresAt,startsAt);
    if(overlap)return false;
    db.prepare(`INSERT INTO entitlements
     (id,user_id,product_id,plan_id,source,state,starts_at,expires_at,revoked_at,granted_by,revoked_by,created_at,updated_at)
     VALUES(?,?,?,?,'admin_test_grant','active',?,?,NULL,?,NULL,?,?)`)
     .run(id,v.userId,v.productId,v.planId,startsAt,expiresAt,u.id,now,now);
    audit(u.id,"entitlement.test_granted",id);
    return true;
   });
   if(!created)return result(409,{error:"entitlement_overlap"});
   return result(201,{id,userId:v.userId,productId:v.productId,planId:v.planId,source:"admin_test_grant",state:"active",startsAt,expiresAt,accessAllowed:startsAt<=now,accessStatus:startsAt<=now?"active":"scheduled"});
  }
  const revoke=path.match(/^\/v1\/admin\/entitlements\/([0-9a-f-]{36})\/revoke$/i);
  if(revoke&&method==="POST"){
   const id=revoke[1];
   const e=db.prepare("SELECT id,state FROM entitlements WHERE id=?").get(id);
   if(!e)return result(404,{error:"not_found"});
   if(e.state==="revoked")return result(200,{ok:true,alreadyRevoked:true});
   transact(db,()=>{
    db.prepare("UPDATE entitlements SET state='revoked',revoked_at=?,revoked_by=?,updated_at=? WHERE id=?")
     .run(now,u.id,now,id);
    audit(u.id,"entitlement.test_revoked",id);
   });
   return result(200,{ok:true,alreadyRevoked:false});
  }
  return null;
 }
 return {publicRoute,authenticatedRoute};
}
