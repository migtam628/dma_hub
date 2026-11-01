import {useEffect,useState} from "react";
import type {ChangeEvent} from "react";
import {ClipboardCheck,FileUp,RefreshCcw,ShieldAlert} from "lucide-react";
import {Button,Card,Empty,Pill} from "@dma-hub/ui";
import {api,ApiError} from "./api";
import type {Session,XboxQAIntakeItem,XboxQAIntakeDetail} from "./api";
import {sanitizeXboxQASession,evaluateXboxQASession,xboxQAMarkdown,XBOX_MODELS} from "./xbox-qa-core.mjs";
import type {XboxQASession} from "./xbox-qa-core.mjs";
import {COD_TITLE_PLATFORMS} from "./cod-platform-matrix.mjs";

function errorMessage(error:unknown){
 if(error instanceof ApiError){
  if(error.status===0)return "Local API is unavailable. Nothing was uploaded.";
  if(error.status===403)return "Only authenticated administrators can access private Xbox QA records.";
  if(error.status===409)return "Duplicate report or stale review version. Refresh before proceeding.";
  if(error.status===422)return "Invalid Xbox QA report or review note.";
  if(error.status===428)return "Review version is missing. Refresh the report.";
 }
 return error instanceof Error?error.message:"Xbox QA operation failed.";
}
export function AdminXboxQAIntake({session}:{session:Session|null}){
 const token=session?.token??"",isAdmin=session?.user.role==="admin";
 const [items,setItems]=useState<XboxQAIntakeItem[]>([]);
 const [preview,setPreview]=useState<XboxQASession|null>(null);
 const [detail,setDetail]=useState<XboxQAIntakeDetail|null>(null);
 const [reviewNote,setReviewNote]=useState("");
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const previewAssessment=preview?evaluateXboxQASession(preview):null;
 async function refresh(id=detail?.id){
  if(!isAdmin)return;
  setLoading(true);
  try{
   const response=await api.adminXboxQAReports(token);
   setItems(response.items);
   if(id&&response.items.some(item=>item.id===id))setDetail(await api.adminXboxQAReport(token,id));
   else setDetail(null);
   setMessage("");
  }catch(error){setItems([]);setDetail(null);setMessage(errorMessage(error))}
  finally{setLoading(false)}
 }
 useEffect(()=>{if(!isAdmin){setItems([]);setDetail(null);setPreview(null);return}void refresh("")},[token,isAdmin]);
 async function importFile(event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0];event.target.value="";
  if(!file)return;
  setPreview(null);setMessage("");
  if(file.size>20_000){setMessage("The report is larger than the maximum 20 KB import size.");return}
  try{
   const json:unknown=JSON.parse(await file.text());
   const raw=json&&typeof json==="object"&&"session" in json?(json as {session:unknown}).session:json;
   const p=sanitizeXboxQASession(raw);
   if(!evaluateXboxQASession(p).readyForLocalRecord)throw Error("Report does not meet the physical testing worksheet requirements.");
   setPreview(p);setMessage("File parsed locally. Review its contents, then explicitly import into the private local API.");
  }catch(error){setMessage("Import rejected: "+(error instanceof Error?error.message:"invalid JSON"))}
 }
 async function submit(){
  if(!preview||!isAdmin||busy)return;
  if(!window.confirm("Send this operator-reported Xbox QA file to the configured local API? It will contain field notes and any evidence URL. This is not independent certification."))return;
  setBusy(true);
  try{
   const report=await api.submitXboxQAReport(token,preview);
   setPreview(null);
   await refresh(report.id);
   setMessage("Report received in the private review queue. No public compatibility or download was enabled.");
  }catch(error){setMessage(errorMessage(error))}
  finally{setBusy(false)}
 }
 async function select(id:string){
  setLoading(true);setMessage("");
  try{setDetail(await api.adminXboxQAReport(token,id))}
  catch(error){setDetail(null);setMessage(errorMessage(error))}
  finally{setLoading(false)}
 }
 async function triage(state:"triaged"|"retest_required"){
  if(!detail||!isAdmin||busy||reviewNote.trim().length<10)return;
  if(!window.confirm("Save an append-only triage event? This does not certify game compatibility."))return;
  setBusy(true);
  try{
   await api.triageXboxQAReport(token,detail,state,reviewNote.trim());
   setReviewNote("");
   await refresh(detail.id);
   setMessage("Operator triage event recorded. No software access or compatibility approval granted.");
  }catch(error){setMessage(errorMessage(error))}
  finally{setBusy(false)}
 }
 const modelName=(id:string)=>XBOX_MODELS.find(m=>m.id===id)?.label||id;
 const gameName=(id:string)=>COD_TITLE_PLATFORMS.find(g=>g.id===id)?.title||id;
 return <div className="admin-xbox-qa">
  <div className="page-head"><div><h1>Xbox QA Intake & Triage</h1>
   <p>Import the v1 field-test JSON exported from the Xbox workbook; review operator observations inside the authenticated local API.</p></div>
   <Button variant="secondary" disabled={!isAdmin||loading||busy} onClick={()=>void refresh()}><RefreshCcw size={15}/>Refresh</Button>
  </div>
  <div className="callout"><ShieldAlert size={16}/>All evidence is operator-reported. Reports are private to local API administrators; no Xbox tests, binary signing, publisher certification, game compatibility, public downloads or access grants result from triage.</div>
  {!session?<Card title="Sign in required"><Empty title="Local API authentication required" description="Open the local API account before reviewing Xbox reports."/></Card>:
   !isAdmin?<Card title="Restricted"><Empty title="Administrator role required" description="Customer accounts cannot import or view other users' Xbox field reports."/></Card>:
   <>
    {message?<p role="status" className="inline-message">{message}</p>:null}
    <Card title="1. Import exported Xbox QA field report">
     <p className="muted">Use an exported JSON file from <a href="#/games/call-of-duty/xbox-qa">the public Xbox QA workbook</a>. No data is uploaded until you confirm Import to local API.</p>
     <label className="admin-xbox-file"><FileUp size={18}/>Choose v1 QA JSON file<input type="file" accept=".json,application/json" onChange={event=>void importFile(event)}/></label>
     {preview?<div className="admin-xbox-preview">
      <strong>{modelName(preview.consoleModel)} · {gameName(preview.gameId)}</strong>
      <p>Game build: {preview.installedBuild} · Console OS: {preview.consoleOS} · Tested: {preview.testDate}</p>
      <p>Reported: {previewAssessment?.passing} passed, {previewAssessment?.failures} failed/blocked. Evidence: {preview.evidenceUrl?"HTTPS reference included":"No URL"}.</p>
      <p className="muted">Notes: {preview.notes}</p>
      <Button disabled={busy} onClick={()=>void submit()}><ClipboardCheck size={15}/>Import to private API</Button>
     </div>:null}
    </Card>
    <div className="admin-xbox-grid">
     <Card title="2. Private operator queue">
      {loading&&items.length===0?<p role="status">Loading QA reports…</p>:
       items.length===0?<Empty title="No Xbox QA records" description="No test evidence has been imported. There are no generated sample results."/>:
       <div className="admin-xbox-list">{items.map(item=><button type="button" className={detail?.id===item.id?"active":""} key={item.id} onClick={()=>void select(item.id)}>
        <strong>{modelName(item.consoleModel)} · {gameName(item.gameId)}</strong>
        <small>{item.gameBuild} · {item.testDate}</small>
        <span>{item.state.replaceAll("_"," ")} · v{item.version}</span>
       </button>)}</div>}
     </Card>
     <Card title="3. Review and triage">
      {!detail?<Empty title="Select an imported report" description="The private thread contains only manually uploaded reports and recorded triage events."/>:
       <div className="admin-xbox-detail">
        <h3>{modelName(detail.consoleModel)} · {gameName(detail.gameId)}</h3>
        <Pill tone="warning">{detail.state.replaceAll("_"," ")}</Pill>
        <p>Build: {detail.gameBuild} · OS: {detail.consoleOS} · Tested {detail.testDate}</p>
        <p>Reporter notes: {detail.session.notes}</p>
        {detail.session.evidenceUrl?<p>Private evidence reference: <code>{detail.session.evidenceUrl}</code> (not independently checked)</p>:null}
        <details><summary>Full reported checklist</summary>
         <pre className="admin-xbox-report">{xboxQAMarkdown(detail.session)}</pre>
        </details>
        <h4>Triage history</h4>
        <div className="admin-xbox-history">{detail.triageHistory.map(event=><div key={event.version}>
         <strong>v{event.version} · {event.state.replaceAll("_"," ")}</strong>
         <small>{event.note||"Imported, awaiting staff triage"}</small>
        </div>)}</div>
        <label className="field">Triage note<textarea rows={3} maxLength={1000} minLength={10} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="Document review context or why a new physical test is necessary."/></label>
        <div className="admin-xbox-actions">
         <Button disabled={busy||reviewNote.trim().length<10||detail.state==="triaged"} onClick={()=>void triage("triaged")}>Mark operator-triaged</Button>
         <Button variant="secondary" disabled={busy||reviewNote.trim().length<10||detail.state==="retest_required"} onClick={()=>void triage("retest_required")}>Require retest</Button>
        </div>
       </div>}
     </Card>
    </div>
   </>}
 </div>;
}
