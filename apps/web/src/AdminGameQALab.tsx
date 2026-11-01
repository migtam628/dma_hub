import {useEffect,useState} from "react";
import type {FormEvent} from "react";
import {ClipboardList,RefreshCcw,ShieldAlert} from "lucide-react";
import {Button,Card,Empty,Pill} from "@dma-hub/ui";
import {api,ApiError} from "./api";
import type {AdminGameCompatibilityRecord,AdminQAResult,QADraft,QAScope,QAOutcome,Session} from "./api";
import {GAME_CATALOG} from "./gameCatalog";

const initial:QADraft={reviewId:"",scope:"hardware_setup",outcome:"retest_required",osBuild:"",
 firmware:"",evidenceRef:"",notes:"",rightsConfirmed:false};
const labelScope=(scope:QAScope)=>({hardware_setup:"Hardware setup",install_validation:"Installation validation",functional_smoke:"Functional smoke test"}[scope]);
const labelOutcome=(outcome:QAOutcome)=>({passed:"Passed (operator-reported)",failed:"Failed",retest_required:"Retest required"}[outcome]);
function errorMessage(error:unknown){
 if(error instanceof ApiError){
  if(error.status===0)return "Local API unavailable. No QA record was saved.";
  if(error.status===403)return "Administrator access is required.";
  if(error.status===409)return "The review or product version changed. Refresh the queue before reporting results.";
 }
 return error instanceof Error?error.message:"Unable to record QA result";
}
export function AdminGameQALab({session}:{session:Session|null}){
 const token=session?.token??"",admin=session?.user.role==="admin";
 const [reviews,setReviews]=useState<AdminGameCompatibilityRecord[]>([]);
 const [results,setResults]=useState<AdminQAResult[]>([]);
 const [form,setForm]=useState<QADraft>(initial);
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const eligible=reviews.filter(r=>r.state==="reviewed"&&!r.stale);
 const chosen=eligible.find(r=>r.id===form.reviewId);
 async function refresh(){
  if(!admin)return;
  setLoading(true);
  try{
   const [r,q]=await Promise.all([api.adminGameCompatibility(token),api.adminGameQAResults(token)]);
   setReviews(r.items);setResults(q.items);setNotice("");
  }catch(e){setReviews([]);setResults([]);setNotice(errorMessage(e))}
  finally{setLoading(false)}
 }
 useEffect(()=>{if(!admin){setReviews([]);setResults([]);setForm(initial);return}void refresh()},[token,admin]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!admin||!chosen||busy)return;
  if(form.outcome==="passed"&&!form.rightsConfirmed)return;
  if(form.outcome!=="retest_required"&&(!form.evidenceRef.trim()||form.notes.trim().length<10))return;
  if(!window.confirm("Record this MANUAL operator-reported QA observation? It does not independently certify compatibility or enable any download."))return;
  setBusy(true);setNotice("");
  try{
   await api.createGameQAResult(token,{...form,osBuild:form.osBuild.trim(),firmware:form.firmware.trim(),
    evidenceRef:form.evidenceRef.trim(),notes:form.notes.trim()},chosen.version);
   setForm(initial);await refresh();
   setNotice("Manual QA observation recorded. Previous observations remain immutable and no software is approved for download.");
  }catch(error){setNotice(errorMessage(error))}
  finally{setBusy(false)}
 }
 const activeLatest=new Map<string,AdminQAResult>();
 for(const item of results)if(!activeLatest.has(item.reviewId+":"+item.scope))activeLatest.set(item.reviewId+":"+item.scope,item);
 return <div className="admin-game-qa-lab">
  <div className="page-head"><div><h1>Game & Hardware QA Lab</h1>
   <p>Record manual test evidence for an exact game build and reviewed product. Results are reported by an operator, not independently certified.</p></div>
   <Button variant="secondary" disabled={!admin||loading||busy} onClick={()=>void refresh()}><RefreshCcw size={15}/>Refresh</Button>
  </div>
  <div className="callout"><ShieldAlert size={17}/>This workspace logs reported test outcomes only. A past pass never overrides a later failure, patch/retest requirement, withdrawn review or changed product. Downloads and licenses remain disabled.</div>
  {!session?<Card title="Sign in"><Empty title="Administrator session required" description="Connect to the local development API."/></Card>:
   !admin?<Card title="Restricted"><Empty title="Administrator permission required" description="Customer accounts cannot record hardware or game test results."/></Card>:
   <>
    {notice?<p role="status" className="inline-message">{notice}</p>:null}
    <Card title="Record manual QA observation">
     {eligible.length===0?<p className="muted">No current reviewed game/build records exist. Create and review one in Admin → Game QA first. No test results are fabricated.</p>:null}
     <form className="form-stack game-qa-form" onSubmit={event=>void submit(event)}>
      <label className="field">Current reviewed game build
       <select required value={form.reviewId} onChange={e=>setForm(v=>({...v,reviewId:e.target.value}))}>
        <option value="">Select a current review</option>
        {eligible.map(r=><option key={r.id} value={r.id}>{r.productName} — {GAME_CATALOG.find(g=>g.id===r.gameId)?.name||r.gameId} · {r.gameBuild} · {r.platform}</option>)}
       </select>
      </label>
      <label className="field">Test scope<select value={form.scope} onChange={e=>setForm(v=>({...v,scope:e.target.value as QAScope}))}>
       <option value="hardware_setup">Hardware setup</option><option value="install_validation">Installation validation</option><option value="functional_smoke">Functional smoke test</option>
      </select></label>
      <label className="field">Reported outcome<select value={form.outcome} onChange={e=>setForm(v=>({...v,outcome:e.target.value as QAOutcome}))}>
       <option value="retest_required">Retest required</option><option value="failed">Failed</option><option value="passed">Passed (operator reported)</option>
      </select></label>
      <label className="field">Exact Windows build<input required minLength={3} maxLength={120} value={form.osBuild} onChange={e=>setForm(v=>({...v,osBuild:e.target.value}))} placeholder="Windows 11 24H2 build…"/></label>
      <label className="field">Hardware / firmware revision<input required minLength={3} maxLength={200} value={form.firmware} onChange={e=>setForm(v=>({...v,firmware:e.target.value}))} placeholder="Board model and firmware build"/></label>
      <label className="field">Private evidence URL (HTTPS for pass/fail)<input type="url" maxLength={500} value={form.evidenceRef} onChange={e=>setForm(v=>({...v,evidenceRef:e.target.value}))} placeholder="https://approved-qa-system/report"/></label>
      <label className="field">Test notes<textarea maxLength={1000} rows={3} value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))} placeholder="Document observed behavior and reason for pass, fail, or retest"/></label>
      <label className="game-qa-checkbox"><input type="checkbox" checked={form.rightsConfirmed} onChange={e=>setForm(v=>({...v,rightsConfirmed:e.target.checked}))}/>I confirm this test was authorized by the relevant owner/publisher (required to report a pass).</label>
      <Button type="submit" disabled={!chosen||busy||loading||form.osBuild.trim().length<3||form.firmware.trim().length<3||(form.outcome==="passed"&&!form.rightsConfirmed)||(form.outcome!=="retest_required"&&(!form.evidenceRef.startsWith("https://")||form.notes.trim().length<10))}><ClipboardList size={15}/>Record QA observation</Button>
     </form>
    </Card>
    <div className="spacer-top"><Card title="Most recent QA observations by review and test scope">
     {loading?<p role="status">Loading QA records…</p>:results.length===0?<Empty title="No QA observations recorded" description="No game or hardware build has a manually recorded test outcome yet."/>:
      <div className="game-review-list">{[...activeLatest.values()].map(r=><article className="game-review-item" key={r.id}>
       <div className="game-review-heading"><strong>{r.productName}</strong><Pill tone={r.outcome==="passed"&&!r.stale?"positive":"warning"}>{r.stale?"Stale — review changed":labelOutcome(r.outcome)}</Pill></div>
       <p>{GAME_CATALOG.find(g=>g.id===r.gameId)?.name||r.gameId} · build {r.gameBuild} · {r.platform} · {labelScope(r.scope)}</p>
       <small>OS: {r.osBuild}; Hardware/firmware: {r.firmware}</small>
       <small>Evidence: {r.evidenceRef||"Not supplied"} · Recorded {new Date(r.recordedAt).toLocaleString()}</small>
       <small>Review v{r.reviewVersion} (current v{r.currentReviewVersion}), Product v{r.productVersion} (current v{r.currentProductVersion})</small>
       <small>Operator-reported only; no independent certification or download approval.</small>
      </article>)}</div>}
    </Card></div>
   </>}
 </div>
}
