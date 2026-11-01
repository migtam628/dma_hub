import {useEffect,useMemo,useState} from "react";
import type {ChangeEvent} from "react";
import {ArrowLeft,ClipboardCheck,Download,Gamepad2,RefreshCcw,ShieldAlert,Trash2} from "lucide-react";
import {Button,Pill} from "@dma-hub/ui";
import {COD_TITLE_PLATFORMS,resolveCODTitlePlatform} from "./cod-platform-matrix.mjs";
import {XBOX_MODELS,XBOX_QA_CHECKS,emptyXboxQASession,sanitizeXboxQASession,evaluateXboxQASession,xboxQAMarkdown} from "./xbox-qa-core.mjs";
import type {XboxQASession,XboxQAOutcome,XboxModel} from "./xbox-qa-core.mjs";

const DRAFT_KEY="dma-hub-xbox-qa-draft-v1";
const RECORDS_KEY="dma-hub-xbox-qa-observations-v1";
type Observation={id:string;savedAt:string;session:XboxQASession};
const choices:[XboxQAOutcome,string][]=[
 ["untested","Not tested"],["passed","Observed pass"],["failed","Observed failure"],
 ["blocked","Blocked"],["not_applicable","Not applicable"]
];
function readDraft(){
 try{const raw=localStorage.getItem(DRAFT_KEY);return raw?sanitizeXboxQASession(JSON.parse(raw)):emptyXboxQASession()}
 catch{return emptyXboxQASession()}
}
function readRecords():Observation[]{
 try{
  const raw=JSON.parse(localStorage.getItem(RECORDS_KEY)||"[]");
  if(!Array.isArray(raw))return [];
  return raw.slice(0,25).flatMap((item:unknown)=>{
   if(!item||typeof item!=="object")return [];
   const record=item as Record<string,unknown>;
   if(typeof record.id!=="string"||!/^[a-f0-9-]{20,40}$/i.test(record.id)||
      typeof record.savedAt!=="string")return [];
   try{
    const session=sanitizeXboxQASession(record.session);
    if(!evaluateXboxQASession(session).readyForLocalRecord)return [];
    return [{id:record.id,savedAt:record.savedAt,session}];
   }catch{return []}
  });
 }catch{return []}
}
function exportFile(text:string,filename:string,type:string){
 const url=URL.createObjectURL(new Blob([text],{type}));
 const a=document.createElement("a");
 a.href=url;a.download=filename;a.click();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function XboxQALab(){
 const [draft,setDraft]=useState<XboxQASession>(readDraft);
 const [records,setRecords]=useState<Observation[]>(readRecords);
 const [message,setMessage]=useState("");
 const assessment=useMemo(()=>evaluateXboxQASession(draft),[draft]);
 const model=XBOX_MODELS.find(x=>x.id===draft.consoleModel);
 const title=COD_TITLE_PLATFORMS.find(x=>x.id===draft.gameId);
 const observedPlatform=title&&model?.family?resolveCODTitlePlatform(title.id,model.family):null;
 const patch=(part:Partial<XboxQASession>)=>setDraft(old=>({...old,...part}));
 useEffect(()=>{
  try{localStorage.setItem(DRAFT_KEY,JSON.stringify(draft))}
  catch{setMessage("Browser storage unavailable. Use Export TXT or JSON to keep this work.")}
 },[draft]);
 function selectResult(id:string,outcome:XboxQAOutcome){
  patch({checks:{...draft.checks,[id]:outcome}});
 }
 function save(){
  if(!assessment.readyForLocalRecord){setMessage("Complete the required physical testing details before saving an observation.");return}
  if(!window.confirm("Save this self-reported observation on THIS browser only? It is not reviewed or uploaded to DMA Hub."))return;
  const observation:Observation={id:crypto.randomUUID(),savedAt:new Date().toISOString(),session:sanitizeXboxQASession(draft)};
  const next=[observation,...records].slice(0,25);
  try{localStorage.setItem(RECORDS_KEY,JSON.stringify(next));setRecords(next);setMessage("Observation saved locally. No company, Xbox or publisher has verified it.")}
  catch{setMessage("Local storage failed; export a report instead. No observation was saved.")}
 }
 function removeRecord(id:string){
  if(!window.confirm("Delete this local observation?"))return;
  const next=records.filter(item=>item.id!==id);
  try{localStorage.setItem(RECORDS_KEY,JSON.stringify(next));setRecords(next);setMessage("Local observation deleted.")}
  catch{setMessage("Could not update browser storage.")}
 }
 function resetDraft(){
  if(!window.confirm("Clear current unsaved QA answers? Saved local observations remain."))return;
  setDraft(emptyXboxQASession());setMessage("Draft cleared.");
 }
 async function copyReport(data:XboxQASession){
  try{await navigator.clipboard.writeText(xboxQAMarkdown(data));setMessage("QA report copied.")}
  catch{setMessage("Clipboard access unavailable. Export a text file instead.")}
 }
 function importDraft(event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0];
  event.target.value="";
  if(!file)return;
  if(file.size>20_000){setMessage("Invalid import: file is too large.");return}
  file.text().then(raw=>{
   const parsed:unknown=JSON.parse(raw);
   const item=(parsed&&typeof parsed==="object"&&"session" in parsed)?(parsed as {session:unknown}).session:parsed;
   setDraft(sanitizeXboxQASession(item));
   setMessage("Versioned QA draft imported locally. No recorded evidence was verified.");
  }).catch(()=>setMessage("Import failed: only valid v1 Xbox QA JSON is accepted."));
 }
 return <main className="container page-pad xbox-qa-page">
  <a href="#/games/call-of-duty/platforms" className="text-link"><ArrowLeft size={15}/>Xbox / PC platform matrix</a>
  <section className="xbox-qa-hero">
   <div className="eyebrow"><Gamepad2 size={17}/> DMA HUB / XBOX FIELD QA</div>
   <h1>Test the real console. Record the evidence.</h1>
   <p>Use this manual worksheet on a console or companion PC to document what actually worked. It never scans the Xbox, connects to a game process, uploads credentials, or certifies a game or accessory.</p>
   <div className="xbox-qa-disclaimer"><ShieldAlert size={17}/>Browser-local draft and observations only. This is not an authenticated audit log, official Xbox certification, or proof of game-modification compatibility.</div>
  </section>
  <div className="xbox-qa-layout">
   <div className="xbox-qa-main">
    <section className="xbox-qa-panel">
     <h2>1. Console and game identity</h2>
     <p>Choose your actual model; no default model is assumed.</p>
     <div className="xbox-qa-fields">
      <label>Physical Xbox model<select value={draft.consoleModel} onChange={e=>patch({consoleModel:e.target.value as XboxModel})}>
       {XBOX_MODELS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
      </select></label>
      <label>Call of Duty edition<select value={draft.gameId} onChange={e=>patch({gameId:e.target.value})}>
       <option value="">Not selected</option>{COD_TITLE_PLATFORMS.map(x=><option value={x.id} key={x.id}>{x.title}</option>)}
      </select></label>
      <label>Actual installed game version/build<input value={draft.installedBuild} maxLength={80}
       onChange={e=>patch({installedBuild:e.target.value})} placeholder="Read from installed game; do not invent"/></label>
      <label>Console OS build<input value={draft.consoleOS} maxLength={120}
       onChange={e=>patch({consoleOS:e.target.value})} placeholder="From Xbox Settings, if available"/></label>
      <label>Test date<input type="date" value={draft.testDate} onChange={e=>patch({testDate:e.target.value})}/></label>
      <label>TV / display<input value={draft.display} maxLength={120} onChange={e=>patch({display:e.target.value})} placeholder="Display / resolution"/></label>
      <label className="full">Controller / allowed peripherals<input value={draft.controller} maxLength={120}
       onChange={e=>patch({controller:e.target.value})} placeholder="Standard Xbox controller, other allowed accessories"/></label>
     </div>
     {observedPlatform?<p className="xbox-qa-platform">
      Publisher listing: <strong>{observedPlatform.description}</strong> This listing is not proof of your actual installation or a DMA Hub compatibility result.
     </p>:null}
    </section>
    <section className="xbox-qa-panel">
     <h2>2. Perform manual checks</h2>
     <p>Mark only outcomes you personally observed on real hardware. Use Not applicable for optional features without equipment.</p>
     <div className="xbox-qa-checks">{XBOX_QA_CHECKS.map(c=><div className="xbox-qa-check" key={c.id}>
      <div><strong>{c.label}</strong><small>{c.detail}</small></div>
      <select value={draft.checks[c.id]} aria-label={c.label+" result"} onChange={e=>selectResult(c.id,e.target.value as XboxQAOutcome)}>
       {choices.map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select>
     </div>)}</div>
    </section>
    <section className="xbox-qa-panel">
     <h2>3. Evidence and local observation</h2>
     <p>No files are uploaded. Evidence URLs and notes are stored in this browser only; avoid personal account data, passwords or identifiable screenshots.</p>
     <div className="xbox-qa-fields">
      <label className="full">Optional HTTPS evidence reference<input type="url" value={draft.evidenceUrl} maxLength={500} onChange={e=>patch({evidenceUrl:e.target.value})}
       placeholder="https://your-authorized-qa-system/example"/></label>
      <label className="full">Observed behavior and test environment<textarea rows={4} value={draft.notes} maxLength={1200}
       onChange={e=>patch({notes:e.target.value})} placeholder="Describe what worked or failed; do not paste credentials or private tokens."/></label>
     </div>
     <label className="xbox-qa-attest"><input type="checkbox" checked={draft.physicalTestConfirmed} onChange={e=>patch({physicalTestConfirmed:e.target.checked})}/>
      I personally tested these results on the specified physical Xbox. This is an operator report, not publisher or independent certification.
     </label>
     <div className="xbox-qa-actions">
      <Button disabled={!assessment.readyForLocalRecord} onClick={save}><ClipboardCheck size={15}/>Save local observation</Button>
      <Button variant="secondary" onClick={()=>exportFile(JSON.stringify({kind:"dma-hub-xbox-qa-v1",session:draft},null,2)+"\n","dma-hub-xbox-qa.json","application/json")}><Download size={15}/>Export JSON</Button>
      <Button variant="secondary" onClick={()=>exportFile(xboxQAMarkdown(draft)+"\n","dma-hub-xbox-qa.txt","text/plain")}><Download size={15}/>Export TXT</Button>
      <Button variant="secondary" onClick={()=>void copyReport(draft)}>Copy</Button>
      <Button variant="secondary" onClick={()=>window.print()}>Print / PDF</Button>
      <Button variant="secondary" onClick={resetDraft}><RefreshCcw size={14}/>Reset draft</Button>
     </div>
     <label className="xbox-qa-import">Import an existing v1 QA JSON draft <input type="file" accept=".json,application/json" onChange={importDraft}/></label>
     {message?<p role="status" className="xbox-qa-notice">{message}</p>:null}
    </section>
    <section className="xbox-qa-panel">
     <h2>4. Saved local observations</h2>
     <p>Last {25} manually saved records on this browser only. Other devices and administrators cannot see them. Export before clearing browser storage.</p>
     {records.length===0?<p className="muted">No real-hardware observations have been saved. Demo results are not generated.</p>:
      <div className="xbox-qa-records">{records.map(item=><article key={item.id}>
       <div><strong>{XBOX_MODELS.find(x=>x.id===item.session.consoleModel)?.label} · {COD_TITLE_PLATFORMS.find(x=>x.id===item.session.gameId)?.title}</strong>
        <small>{item.session.installedBuild} · Tested {item.session.testDate} · Saved {new Date(item.savedAt).toLocaleString()}</small></div>
       <div className="xbox-qa-actions">
        <Button variant="secondary" onClick={()=>exportFile(xboxQAMarkdown(item.session)+"\n","xbox-qa-"+item.id.slice(0,8)+".txt","text/plain")}>Export</Button>
        <Button variant="secondary" onClick={()=>removeRecord(item.id)}><Trash2 size={14}/>Delete</Button>
       </div>
      </article>)}</div>}
    </section>
   </div>
   <aside className="xbox-qa-side">
    <section className="xbox-qa-panel">
     <div className="eyebrow">LIVE WORKSHEET STATUS</div>
     <h2>{assessment.state==="draft"?"Draft — not yet recorded":assessment.state==="operator_reported_issues"?"Issues observed":"Observations reported"}</h2>
     <Pill tone={assessment.readyForLocalRecord?"neutral":"warning"}>{assessment.observed} of {assessment.total} checked</Pill>
     <p>{assessment.passing} reported passed · {assessment.failures} failed/blocked. These counts are self-reported, not verified.</p>
     {assessment.blockers.length>0?<><h3>Required before local save</h3><ul>{assessment.blockers.map(x=><li key={x}>{x}</li>)}</ul></>:<p>Required fields complete. An observation can be saved locally; independent review remains outstanding.</p>}
     {assessment.gameAvailabilityCaveat?<p className="xbox-qa-warning">{assessment.gameAvailabilityCaveat}</p>:null}
    </section>
    <section className="xbox-qa-panel">
     <h3>What this does NOT establish</h3>
     <ul><li>Publisher-verified game compatibility</li><li>Xbox retail app availability or console certification</li>
      <li>A live DMA Hub customer support/backend connection</li><li>Permission to modify game inputs or read game memory</li><li>Software licensing or executable download rights</li></ul>
     <a href="#/games/call-of-duty/platforms" className="text-link">Read Xbox/PC availability boundaries</a>
    </section>
   </aside>
  </div>
 </main>;
}
