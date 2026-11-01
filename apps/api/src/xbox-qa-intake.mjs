import {createHash,randomUUID} from "node:crypto";
import {compareXboxQASessions} from "./xbox-qa-compare.mjs";

// Admin-only intake of self-reported Xbox QA export files, NOT certification.
// No public endpoint, remote URL fetching, console interaction or entitlement.
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const MODELS=new Set(["series_x","series_s","one","one_s","one_x"]);
const GAMES=new Set(["warzone","mw4","bo7","bo6","mw3","mw2"]);
const CHECKS=["edge_load","site_navigation","layout","wizard_input","local_persistence","text_export","print_pdf","remote_play","hdmi_capture"];
const OUTCOMES=new Set(["untested","passed","failed","blocked","not_applicable"]);
const TEXT_BAD=/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;
const BUILD=/^[A-Za-z0-9][A-Za-z0-9._ -]{0,79}$/;
const STATES=new Set(["triaged","retest_required"]);
const result=(status,payload)=>({status,payload});
const field=(value,min,max)=>typeof value==="string"&&value.trim().length>=min&&value.trim().length<=max&&
 value.length<=max&&!TEXT_BAD.test(value);
function validDate(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 const when=new Date(date+"T00:00:00Z");
 return Number.isFinite(when.getTime())&&when.toISOString().slice(0,10)===date&&
 date>="2020-01-01"&&date<="2100-12-31";
}
function strictHTTPS(value){
 if(value==="")return true;
 if(!field(value,8,500)||/\s/.test(value))return false;
 try{
  const url=new URL(value);
  return url.protocol==="https:"&&!url.username&&!url.password&&!!url.hostname;
 }catch{return false}
}
export function normalizeXboxQAInput(source){
 const value=source&&typeof source==="object"&&!Array.isArray(source)&&
   Object.hasOwn(source,"session")?source.session:source;
 if(!value||typeof value!=="object"||Array.isArray(value)||value.schemaVersion!==1||
  !MODELS.has(value.consoleModel)||!GAMES.has(value.gameId)||
  !field(value.installedBuild,1,80)||!BUILD.test(value.installedBuild)||
  !field(value.consoleOS,1,120)||!field(value.testDate,10,10)||!validDate(value.testDate)||
  !field(value.display,0,120)||!field(value.controller,0,120)||
  !field(value.notes,10,1200)||!field(value.evidenceUrl,0,500)||
  !strictHTTPS(value.evidenceUrl)||value.physicalTestConfirmed!==true||
  !value.checks||typeof value.checks!=="object"||Array.isArray(value.checks))
  return null;
 const checks={};
 for(const key of CHECKS){
  if(!OUTCOMES.has(value.checks[key]))return null;
  checks[key]=value.checks[key];
 }
 const counts={passed:0,failed:0,blocked:0};
 for(const outcome of Object.values(checks))if(Object.hasOwn(counts,outcome))counts[outcome]++;
 if(counts.passed+counts.failed+counts.blocked===0)return null;
 return {schemaVersion:1,consoleModel:value.consoleModel,gameId:value.gameId,
  installedBuild:value.installedBuild.trim(),consoleOS:value.consoleOS.trim(),
  testDate:value.testDate,display:value.display.trim(),controller:value.controller.trim(),
  evidenceUrl:value.evidenceUrl,notes:value.notes.trim(),physicalTestConfirmed:true,checks};
}
function transaction(db,work){
 db.exec("BEGIN IMMEDIATE");
 try{const value=work();db.exec("COMMIT");return value}
 catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
}
const query="SELECT s.*,e.version,e.state,e.note AS triage_note,e.created_at AS reviewed_at"+
 " FROM xbox_qa_submissions s JOIN xbox_qa_triage_events e ON e.submission_id=s.id"+
 " AND e.version=(SELECT MAX(v.version) FROM xbox_qa_triage_events v WHERE v.submission_id=s.id)";
const listed=row=>({id:row.id,gameId:row.game_id,consoleModel:row.console_model,
 gameBuild:row.game_build,consoleOS:row.console_os,testDate:row.test_date,
 fingerprint:row.fingerprint,version:row.version,state:row.state,
 triageNote:row.triage_note,submittedAt:row.submitted_at,reviewedAt:row.reviewed_at,
 operatorReportedOnly:true,independentlyCertified:false,downloadEnabled:false});
export function createXboxQAIntake({db,clock,audit,readBody}){
 const get=id=>db.prepare(query+" WHERE s.id=?").get(id);
 function event(id,version,state,note,actor,now){
  db.prepare("INSERT INTO xbox_qa_triage_events(id,submission_id,version,state,note,actor_id,created_at) VALUES(?,?,?,?,?,?,?)")
   .run(randomUUID(),id,version,state,note,actor,now);
 }
 async function route(path,req,user){
  if(!path.startsWith("/v1/admin/xbox-qa"))return null;
  if(user.role!=="admin")return result(403,{error:"forbidden"});
  if(path==="/v1/admin/xbox-qa"&&req.method==="GET"){
   return result(200,{items:db.prepare(query+" ORDER BY s.submitted_at DESC,s.id DESC LIMIT 200").all().map(listed),
    operatorReportedOnly:true,publicResults:false,downloadEnabled:false});
  }
  if(path==="/v1/admin/xbox-qa"&&req.method==="POST"){
   const body=await readBody(req);
   const normalized=normalizeXboxQAInput(body);
   if(!normalized)return result(422,{error:"invalid_xbox_qa_report"});
   const json=JSON.stringify(normalized),fingerprint=createHash("sha256").update(json).digest("hex");
   return transaction(db,()=>{
    const previous=db.prepare("SELECT id FROM xbox_qa_submissions WHERE fingerprint=?").get(fingerprint);
    if(previous)return result(409,{error:"duplicate_xbox_qa_report",id:previous.id});
    const id=randomUUID(),now=clock();
    db.prepare("INSERT INTO xbox_qa_submissions(id,fingerprint,submitted_by,console_model,game_id,game_build,console_os,test_date,payload_json,submitted_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
      .run(id,fingerprint,user.id,normalized.consoleModel,normalized.gameId,normalized.installedBuild,normalized.consoleOS,normalized.testDate,json,now);
    event(id,1,"submitted","",user.id,now);
    audit(user.id,"xbox_qa.submitted",id);
    return result(201,{id,fingerprint,state:"submitted",version:1,
      operatorReportedOnly:true,independentlyCertified:false,downloadEnabled:false});
   });
  }
  const comparison=path.match(/^\/v1\/admin\/xbox-qa\/([a-f0-9-]{36})\/compare$/i);
  if(comparison&&req.method==="GET"){
   const parameters=new URL(req.url||"/","http://localhost").searchParams;
   const withId=parameters.get("with");
   if(!withId||!UUID.test(withId)||withId===comparison[1])
    return result(422,{error:"invalid_comparison_pair"});
   const baseline=get(comparison[1]),candidate=get(withId);
   if(!baseline||!candidate)return result(404,{error:"not_found"});
   let comparisonResult;
   try{
    comparisonResult=compareXboxQASessions(JSON.parse(baseline.payload_json),JSON.parse(candidate.payload_json));
   }catch{return result(422,{error:"incompatible_xbox_qa_reports"})}
   return result(200,{baselineId:baseline.id,candidateId:candidate.id,
    baselineTestDate:baseline.test_date,candidateTestDate:candidate.test_date,
    ...comparisonResult});
  }
  const match=path.match(/^\/v1\/admin\/xbox-qa\/([a-f0-9-]{36})$/i);
  if(!match)return null;
  if(req.method==="GET"){
   const item=get(match[1]);
   if(!item)return result(404,{error:"not_found"});
   return result(200,{...listed(item),session:JSON.parse(item.payload_json),
    triageHistory:db.prepare("SELECT version,state,note,created_at FROM xbox_qa_triage_events WHERE submission_id=? ORDER BY version ASC")
      .all(item.id).map(e=>({version:e.version,state:e.state,note:e.note,at:e.created_at}))});
  }
  if(req.method!=="PATCH")return null;
  const v=req.headers["if-match"];
  if(typeof v!=="string"||!/^[1-9][0-9]*$/.test(v)||!Number.isSafeInteger(Number(v)))
   return result(428,{error:"report_version_required"});
  const body=await readBody(req);
  if(!STATES.has(body.state)||!field(body.note,10,1000))
   return result(422,{error:"invalid_xbox_qa_triage"});
  return transaction(db,()=>{
   const item=get(match[1]);
   if(!item)return result(404,{error:"not_found"});
   if(item.version!==Number(v))return result(409,{error:"version_conflict"});
   if(item.state===body.state)return result(409,{error:"already_in_state"});
   const next=item.version+1,now=clock();
   event(item.id,next,body.state,body.note.trim(),user.id,now);
   audit(user.id,"xbox_qa."+body.state,item.id);
   return result(200,{id:item.id,version:next,state:body.state,
    operatorReportedOnly:true,independentlyCertified:false,downloadEnabled:false});
  });
 }
 return {route};
}
