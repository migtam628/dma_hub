import {randomUUID} from "node:crypto";
import {codReviewCurrentForPublic} from "./cod-patch-gate.mjs";

// Only DMA Hub's GitHub repository is supported. An operator-supplied URL is
// NEVER fetched. Matching a GitHub API digest is metadata provenance, NOT a
// local binary hash, publisher signature, compatibility or malware verdict.
const REPOSITORY="migtam628/dma_hub";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TAG=/^v[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9][a-z0-9.-]{0,45})?$/;
const ASSET=/^[A-Za-z0-9][A-Za-z0-9._-]{2,119}$/;
const SHA=/^[a-f0-9]{64}$/;
const result=(status,payload)=>({status,payload});
const versionHeader=req=>{
 const v=req.headers["if-match"];
 if(typeof v!=="string"||!/^[1-9][0-9]*$/.test(v))return null;
 const n=Number(v);return Number.isSafeInteger(n)?n:null;
};
function tx(db,fn){
 db.exec("BEGIN IMMEDIATE");
 try{const value=fn();db.exec("COMMIT");return value}
 catch(e){if(db.isTransaction)db.exec("ROLLBACK");throw e}
}
export async function githubReleaseAssetLookup({tag,assetName}){
 // This endpoint and repository are fixed, preventing user-driven SSRF.
 const url="https://api.github.com/repos/"+REPOSITORY+"/releases/tags/"+encodeURIComponent(tag);
 let response;
 try{
  response=await fetch(url,{headers:{"Accept":"application/vnd.github+json","User-Agent":"DMA-Hub-release-metadata-check"},signal:AbortSignal.timeout(8000),redirect:"error"});
 }catch{return null}
 if(!response.ok)return null;
 let release;
 try{release=await response.json()}catch{return null}
 if(release.tag_name!==tag||release.draft===true||!Array.isArray(release.assets))return null;
 const asset=release.assets.find(x=>x.name===assetName);
 if(!asset)return null;
 return {id:asset.id,name:asset.name,size:asset.size,state:asset.state,digest:asset.digest};
}
const reviewQuery=`SELECT r.*,p.status AS product_status,p.category,p.version AS current_product_version,p.game_ids_json
 FROM game_compatibility_reviews r JOIN catalog_products p ON p.id=r.product_id`;
const assetQuery=`SELECT a.*,r.product_id,r.game_id,r.game_build,r.platform,r.reviewed_at AS review_approved_at,r.state AS review_state,
 r.version AS current_review_version,r.product_version,p.status AS product_status,p.category,
 p.version AS current_product_version,p.game_ids_json,p.name AS product_name
 FROM game_release_artifacts a
 JOIN game_compatibility_reviews r ON r.id=a.review_id
 JOIN catalog_products p ON p.id=r.product_id`;
function currentlyReviewed(row){
 try{return row.review_state==="reviewed"&&row.product_status==="published"&&row.category==="software"&&
  row.product_version===row.current_product_version&&JSON.parse(row.game_ids_json).includes(row.game_id)}
 catch{return false}
}
function currentAsset(row){return currentlyReviewed(row)&&row.review_version===row.current_review_version}
function adminRow(row){
 return {id:row.id,reviewId:row.review_id,productId:row.product_id,productName:row.product_name,gameId:row.game_id,
  gameBuild:row.game_build,platform:row.platform,releaseTag:row.release_tag,assetName:row.asset_name,
  expectedSha256:row.expected_sha256,state:row.state,version:row.version,reviewVersion:row.review_version,
  currentReviewVersion:row.current_review_version,stale:!currentAsset(row),
  githubAssetId:row.github_asset_id,assetBytes:row.asset_bytes,matchedAt:row.matched_at,createdAt:row.created_at,updatedAt:row.updated_at};
}
function publicRow(row){
 return {id:row.id,reviewId:row.review_id,productId:row.product_id,gameId:row.game_id,gameBuild:row.game_build,
  releaseTag:row.release_tag,assetName:row.asset_name,sha256:row.expected_sha256,
  assetBytes:row.asset_bytes,metadataMatchedAt:row.matched_at,metadataSource:"github_release_asset_digest",
  executableApproved:false,downloadEnabled:false};
}
export function createGameReleaseAssets({db,clock,audit,readBody,releaseLookup=githubReleaseAssetLookup}){
 function find(id){return db.prepare(assetQuery+" WHERE a.id=?").get(id)}
 function event(id,version,from,to,actor,now){
  db.prepare("INSERT INTO game_release_artifact_events(id,artifact_id,version,from_state,to_state,actor_id,created_at) VALUES(?,?,?,?,?,?,?)")
   .run(randomUUID(),id,version,from,to,actor,now);
 }
 function publicRoute(path,req){
  const match=path.match(/^\/v1\/games\/([a-z0-9-]+)\/release-records$/);
  if(!match||req.method!=="GET")return null;
  const gameId=match[1];
  const rows=db.prepare(assetQuery+" WHERE r.game_id=? AND a.state='metadata_matched' ORDER BY a.matched_at DESC LIMIT 100").all(gameId);
  return result(200,{gameId,items:rows.filter(row=>currentAsset(row)&&codReviewCurrentForPublic(gameId,row.review_approved_at,clock())).map(publicRow),
   metadataOnly:true,noDownloadLinks:true,notBinaryVerified:true});
 }
 async function authenticatedRoute(path,req,user){
  if(path==="/v1/admin/game-release-assets"&&(req.method==="GET"||req.method==="POST")){
   if(user.role!=="admin")return result(403,{error:"forbidden"});
   if(req.method==="GET")return result(200,{items:db.prepare(assetQuery+" ORDER BY a.updated_at DESC LIMIT 200").all().map(adminRow),repository:REPOSITORY});
   const b=await readBody(req);
   if(!UUID.test(b.reviewId??"")||!TAG.test(b.releaseTag??"")||!ASSET.test(b.assetName??"")||!SHA.test(b.expectedSha256??""))
    return result(422,{error:"invalid_release_asset"});
   const r=db.prepare(reviewQuery+" WHERE r.id=?").get(b.reviewId);
   if(!r||!currentlyReviewed({...r,review_state:r.state}) )return result(409,{error:"current_review_required"});
   const now=clock(),id=randomUUID();
   try{
    tx(db,()=>{
     db.prepare(`INSERT INTO game_release_artifacts(
      id,review_id,release_tag,asset_name,expected_sha256,state,version,review_version,
      github_asset_id,asset_bytes,matched_at,created_by,matched_by,created_at,updated_at)
      VALUES(?,?,?,?,?,'draft',1,?,NULL,NULL,NULL,?,NULL,?,?)`)
      .run(id,b.reviewId,b.releaseTag,b.assetName,b.expectedSha256,r.version,user.id,now,now);
     event(id,1,null,"draft",user.id,now);
     audit(user.id,"game_release_asset.created",id);
    });
   }catch(error){if(String(error).includes("UNIQUE"))return result(409,{error:"asset_record_exists"});throw error}
   return result(201,{id,state:"draft",version:1,repository:REPOSITORY});
  }
  const m=path.match(/^\/v1\/admin\/game-release-assets\/([0-9a-f-]{36})\/(match|withdraw)$/i);
  if(!m||req.method!=="POST")return null;
  if(user.role!=="admin")return result(403,{error:"forbidden"});
  const version=versionHeader(req);
  if(!version)return result(428,{error:"version_required"});
  const id=m[1],action=m[2],row=find(id);
  if(!row)return result(404,{error:"not_found"});
  if(row.version!==version)return result(409,{error:"version_conflict"});
  if(action==="withdraw"){
   if(row.state==="withdrawn")return result(409,{error:"already_withdrawn"});
   const now=clock();
   return tx(db,()=>{
    const n=db.prepare("UPDATE game_release_artifacts SET state='withdrawn',version=version+1,updated_at=? WHERE id=? AND version=?").run(now,id,version);
    if(!n.changes)return result(409,{error:"version_conflict"});
    event(id,version+1,row.state,"withdrawn",user.id,now);
    audit(user.id,"game_release_asset.withdrawn",id);
    return result(200,{id,state:"withdrawn",version:version+1,noDownloadLinks:true});
   });
  }
  if(row.state!=="draft")return result(409,{error:"draft_required"});
  if(!currentAsset(row))return result(409,{error:"stale_or_unreviewed"});
  // No database lock is held during external metadata lookup.
  const remote=await releaseLookup({tag:row.release_tag,assetName:row.asset_name});
  if(!remote)return result(503,{error:"github_metadata_unavailable"});
  if(remote.name!==row.asset_name||remote.state!=="uploaded"||!Number.isSafeInteger(remote.id)||remote.id<=0||
     !Number.isSafeInteger(remote.size)||remote.size<=0||remote.digest!=="sha256:"+row.expected_sha256)
   return result(409,{error:"github_digest_mismatch"});
  return tx(db,()=>{
   const current=find(id);
   if(!current||current.version!==version)return result(409,{error:"version_conflict"});
   if(!currentAsset(current)||current.state!=="draft")return result(409,{error:"stale_or_unreviewed"});
   const now=clock();
   const changed=db.prepare(`UPDATE game_release_artifacts SET
    state='metadata_matched',version=version+1,github_asset_id=?,asset_bytes=?,matched_at=?,matched_by=?,updated_at=?
    WHERE id=? AND version=?`).run(remote.id,remote.size,now,user.id,now,id,version);
   if(!changed.changes)return result(409,{error:"version_conflict"});
   event(id,version+1,"draft","metadata_matched",user.id,now);
   audit(user.id,"game_release_asset.metadata_matched",id);
   return result(200,{id,state:"metadata_matched",version:version+1,
    metadataMatchedAt:now,sha256:row.expected_sha256,noDownloadLinks:true,notBinaryVerified:true});
  });
 }
 return {publicRoute,authenticatedRoute};
}
