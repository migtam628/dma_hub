import {randomUUID} from "node:crypto";

// This module is a documented operator-attestation workflow, not independent game
// compatibility certification and not a license/download/anti-cheat service.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GAME_IDS=new Set(["counter-strike-2","fortnite","rust","apex-legends","call-of-duty","valorant","escape-from-tarkov","rainbow-six-siege","pubg","arc-raiders"]);
const PLATFORMS=new Set(["Windows 10","Windows 11"]);
const TRANSITIONS={
 draft:new Set(["reviewed","withdrawn"]),
 reviewed:new Set(["draft","withdrawn"]),
 withdrawn:new Set(["draft"])
};
const result=(status,payload)=>({status,payload});
const isBuild=x=>typeof x==="string"&&/^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/.test(x);
const isHardware=x=>typeof x==="string"&&x.trim().length>=3&&x.trim().length<=200&&!/[\x00-\x1f\x7f]/.test(x);
const isEvidence=x=>typeof x==="string"&&x.length<=500&&(x===""||/^https:\/\/[^\s<>"]{5,}$/.test(x));
const versionHeader=req=>typeof req.headers["if-match"]==="string"&&/^[1-9][0-9]*$/.test(req.headers["if-match"])?
 Number(req.headers["if-match"]):null;
function transaction(db,work){
 db.exec("BEGIN IMMEDIATE");
 try{const output=work();db.exec("COMMIT");return output}
 catch(e){if(db.isTransaction)db.exec("ROLLBACK");throw e}
}
const publicRow=x=>({
 id:x.id,productId:x.product_id,productSlug:x.slug,productName:x.name,
 gameId:x.game_id,gameBuild:x.game_build,platform:x.platform,hardware:x.hardware,
 evidenceOnFile:!!x.evidence_ref,reviewedAt:x.reviewed_at,status:"operator_reviewed"
});
const adminRow=x=>({
 id:x.id,productId:x.product_id,productName:x.name,productSlug:x.slug,
 gameId:x.game_id,gameBuild:x.game_build,platform:x.platform,hardware:x.hardware,
 evidenceRef:x.evidence_ref,state:x.state,version:x.version,productVersion:x.product_version,
 currentProductVersion:x.current_product_version,stale:x.product_version!==x.current_product_version,
 reviewedAt:x.reviewed_at,createdAt:x.created_at,updatedAt:x.updated_at
});
export function createGameCompatibility({db,clock,audit,readBody}){
 const reviewJoin=`SELECT r.*,p.slug,p.name,p.version AS current_product_version
  FROM game_compatibility_reviews r JOIN catalog_products p ON p.id=r.product_id`;
 function publicRoute(path,req){
  const match=path.match(/^\/v1\/games\/([a-z0-9-]+)\/compatibility$/);
  if(!match||req.method!=="GET")return null;
  const gameId=match[1];
  if(!GAME_IDS.has(gameId))return result(404,{error:"unknown_game"});
  const rows=db.prepare(reviewJoin+`
   WHERE r.game_id=? AND r.state='reviewed' AND r.product_version=p.version
   AND p.status='published' AND p.category='software'
   ORDER BY r.reviewed_at DESC LIMIT 100`).all(gameId);
  // A stale game association must never be presented as compatibility, even if
  // a previously reviewed product later changed its declared game list.
  return result(200,{gameId,items:rows.filter(x=>{
   try{return JSON.parse(db.prepare("SELECT game_ids_json FROM catalog_products WHERE id=?").get(x.product_id).game_ids_json).includes(gameId)}
   catch{return false}
  }).map(publicRow),operatorAttestedOnly:true,noDownloads:true});
 }
 async function authenticatedRoute(path,req,user){
  if(path==="/v1/admin/game-compatibility"&&(req.method==="GET"||req.method==="POST")){
   if(user.role!=="admin")return result(403,{error:"forbidden"});
   if(req.method==="GET"){
    const rows=db.prepare(reviewJoin+" ORDER BY r.updated_at DESC LIMIT 200").all();
    return result(200,{items:rows.map(adminRow)});
   }
   const b=await readBody(req);
   if(typeof b.productId!=="string"||!UUID.test(b.productId)||!GAME_IDS.has(b.gameId)||
      !isBuild(b.gameBuild)||!PLATFORMS.has(b.platform)||!isHardware(b.hardware)||
      !isEvidence(b.evidenceRef??"")||b.state!==undefined&&b.state!=="draft")
    return result(422,{error:"invalid_compatibility_review"});
   const p=db.prepare("SELECT * FROM catalog_products WHERE id=?").get(b.productId);
   if(!p||p.category!=="software"||!JSON.parse(p.game_ids_json).includes(b.gameId))
    return result(422,{error:"product_game_association_required"});
   const id=randomUUID(),now=clock(),evidence=b.evidenceRef??"";
   try{
    transaction(db,()=>{
     db.prepare(`INSERT INTO game_compatibility_reviews
      (id,product_id,game_id,game_build,platform,hardware,evidence_ref,state,version,product_version,created_by,reviewed_by,reviewed_at,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id,b.productId,b.gameId,b.gameBuild,b.platform,b.hardware.trim(),evidence,"draft",1,p.version,user.id,null,null,now,now);
     db.prepare("INSERT INTO game_compatibility_events(id,review_id,version,from_state,to_state,actor_id,created_at) VALUES (?,?,?,?,?,?,?)")
      .run(randomUUID(),id,1,null,"draft",user.id,now);
     audit(user.id,"game_compatibility.created",id);
    });
   }catch(e){if(String(e).includes("UNIQUE"))return result(409,{error:"review_already_exists"});throw e}
   return result(201,{id,gameId:b.gameId,state:"draft",version:1,productVersion:p.version});
  }
  const change=path.match(/^\/v1\/admin\/game-compatibility\/([0-9a-f-]{36})$/i);
  if(change&&req.method==="PATCH"){
   if(user.role!=="admin")return result(403,{error:"forbidden"});
   const v=versionHeader(req);
   if(!v||!Number.isSafeInteger(v))return result(428,{error:"version_required"});
   const body=await readBody(req);
   if(!["draft","reviewed","withdrawn"].includes(body.state))return result(422,{error:"invalid_state"});
   return transaction(db,()=>{
    const id=change[1];
    const row=db.prepare(reviewJoin+" WHERE r.id=?").get(id);
    if(!row)return result(404,{error:"not_found"});
    if(row.version!==v)return result(409,{error:"version_conflict"});
    if(!TRANSITIONS[row.state].has(body.state))return result(409,{error:"invalid_transition"});
    const product=db.prepare("SELECT status,category,game_ids_json,version FROM catalog_products WHERE id=?").get(row.product_id);
    if(body.state==="reviewed"&&(
       product?.status!=="published"||product?.category!=="software"||
       !JSON.parse(product.game_ids_json).includes(row.game_id)||
       row.product_version!==product.version||!row.evidence_ref))
      return result(409,{error:"review_prerequisites_not_met"});
    const now=clock(),nextProductVersion=body.state==="draft"?product.version:row.product_version;
    const changed=db.prepare(`UPDATE game_compatibility_reviews SET
     state=?,version=version+1,product_version=?,reviewed_by=?,reviewed_at=?,updated_at=?
     WHERE id=? AND version=?`).run(body.state,nextProductVersion,body.state==="reviewed"?user.id:null,body.state==="reviewed"?now:null,now,id,v);
    if(!changed.changes)return result(409,{error:"version_conflict"});
    db.prepare("INSERT INTO game_compatibility_events(id,review_id,version,from_state,to_state,actor_id,created_at) VALUES (?,?,?,?,?,?,?)")
      .run(randomUUID(),id,v+1,row.state,body.state,user.id,now);
    audit(user.id,"game_compatibility."+body.state,id);
    return result(200,{id,state:body.state,version:v+1,productVersion:nextProductVersion,updatedAt:now});
   });
  }
  return null;
 }
 return {publicRoute,authenticatedRoute};
}
