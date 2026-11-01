import {randomUUID} from "node:crypto";

// Operator-declared manual QA only: not independent lab certification and
// never a source of download, anti-cheat, or license approval.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCOPES=new Set(["hardware_setup","install_validation","functional_smoke"]);
const OUTCOMES=new Set(["passed","failed","retest_required"]);
const textField=(v,min,max)=>typeof v==="string"&&v.trim().length>=min&&v.trim().length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v);
const evidence=v=>typeof v==="string"&&v.length<=500&&(v===""||/^https:\/\/[^\s<>"]{5,}$/.test(v));
const versionHeader=req=>{
 const v=req.headers["if-match"];
 return typeof v==="string"&&/^[1-9][0-9]*$/.test(v)&&Number.isSafeInteger(Number(v))?Number(v):null;
};
const result=(status,payload)=>({status,payload});
function transaction(db,fn){
 db.exec("BEGIN IMMEDIATE");
 try{const value=fn();db.exec("COMMIT");return value}
 catch(e){if(db.isTransaction)db.exec("ROLLBACK");throw e}
}
const join=`SELECT q.*,r.game_id,r.game_build,r.platform,r.hardware,r.state AS review_state,
 r.version AS current_review_version,r.product_version AS review_product_version,
 p.status AS product_status,p.category,p.version AS current_product_version,p.game_ids_json,p.name AS product_name
 FROM game_qa_results q JOIN game_compatibility_reviews r ON r.id=q.review_id
 JOIN catalog_products p ON p.id=r.product_id`;
const reviewJoin=`SELECT r.*,p.version AS current_product_version,p.category,p.status AS product_status,
 p.game_ids_json FROM game_compatibility_reviews r
 JOIN catalog_products p ON p.id=r.product_id`;
function currentReview(row){
 try{return row.review_state==="reviewed"&&row.product_status==="published"&&row.category==="software"&&
  row.review_product_version===row.current_product_version&&
  JSON.parse(row.game_ids_json).includes(row.game_id)}
 catch{return false}
}
const currentResult=row=>currentReview(row)&&row.review_version===row.current_review_version&&row.product_version===row.current_product_version;
const adminRow=row=>({id:row.id,reviewId:row.review_id,gameId:row.game_id,gameBuild:row.game_build,platform:row.platform,
 productName:row.product_name,scope:row.test_scope,outcome:row.outcome,osBuild:row.os_build,firmware:row.firmware,
 evidenceRef:row.evidence_ref,notes:row.notes,rightsConfirmed:!!row.rights_confirmed,
 reviewVersion:row.review_version,currentReviewVersion:row.current_review_version,
 productVersion:row.product_version,currentProductVersion:row.current_product_version,
 stale:!currentResult(row),recordedAt:row.recorded_at});
const publicRow=row=>({reviewId:row.review_id,gameId:row.game_id,gameBuild:row.game_build,scope:row.test_scope,
 outcome:row.outcome,recordedAt:row.recorded_at,operatorReported:true,
 independentlyCertified:false,downloadEnabled:false});
export function createGameQA({db,clock,audit,readBody}){
 function publicRoute(path,req){
  const match=path.match(/^\/v1\/games\/([a-z0-9-]+)\/qa-status$/);
  if(!match||req.method!=="GET")return null;
  const gameId=match[1];
  // Show one latest result per review and test scope. A later failed or
  // retest-required result takes precedence over an earlier reported pass.
  const rows=db.prepare(join+` WHERE r.game_id=? AND q.rowid=(
   SELECT MAX(inner_q.rowid) FROM game_qa_results inner_q
   WHERE inner_q.review_id=q.review_id AND inner_q.test_scope=q.test_scope)
   ORDER BY q.recorded_at DESC LIMIT 200`).all(gameId);
  return result(200,{gameId,items:rows.filter(currentResult).map(publicRow),
   operatorReportedOnly:true,independentlyCertified:false,downloadEnabled:false});
 }
 async function authenticatedRoute(path,req,user){
  if(path!=="/v1/admin/game-qa-results"||!["GET","POST"].includes(req.method))return null;
  if(user.role!=="admin")return result(403,{error:"forbidden"});
  if(req.method==="GET"){
   return result(200,{items:db.prepare(join+" ORDER BY q.rowid DESC LIMIT 250").all().map(adminRow),
    operatorReportedOnly:true});
  }
  const expected=versionHeader(req);
  if(!expected)return result(428,{error:"review_version_required"});
  const b=await readBody(req);
  if(!b||!UUID.test(b.reviewId??"")||!SCOPES.has(b.scope)||!OUTCOMES.has(b.outcome)||
     !textField(b.osBuild,3,120)||!textField(b.firmware,3,200)||
     typeof b.notes!=="string"||b.notes.trim().length>1000||
     !evidence(b.evidenceRef)||typeof b.rightsConfirmed!=="boolean"||
     (b.outcome!=="retest_required"&&(!b.evidenceRef||!textField(b.notes,10,1000)))||
     (b.outcome==="passed"&&!b.rightsConfirmed))
   return result(422,{error:"invalid_game_qa_result"});
  return transaction(db,()=>{
   const r=db.prepare(reviewJoin+" WHERE r.id=?").get(b.reviewId);
   if(!r)return result(404,{error:"review_not_found"});
   if(r.version!==expected)return result(409,{error:"review_version_conflict"});
   if(!currentReview({...r,review_state:r.state,review_product_version:r.product_version}))
    return result(409,{error:"current_review_required"});
   const id=randomUUID(),now=clock();
   db.prepare(`INSERT INTO game_qa_results(
    id,review_id,review_version,product_version,test_scope,outcome,os_build,firmware,evidence_ref,notes,
    rights_confirmed,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id,r.id,r.version,r.current_product_version,b.scope,b.outcome,b.osBuild.trim(),b.firmware.trim(),
     b.evidenceRef,b.notes.trim(),b.rightsConfirmed?1:0,user.id,now);
   audit(user.id,"game_qa."+b.outcome,id);
   return result(201,{id,reviewId:r.id,outcome:b.outcome,scope:b.scope,reviewVersion:r.version,
    recordedAt:now,operatorReported:true,independentlyCertified:false,downloadEnabled:false});
  });
 }
 return {publicRoute,authenticatedRoute};
}
