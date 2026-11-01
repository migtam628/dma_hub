import {useEffect,useMemo,useState} from "react";
import {ArrowLeft,ClipboardCheck,Download,ExternalLink,Monitor,RefreshCcw,ShieldAlert,ShieldCheck} from "lucide-react";
import {Button,Pill} from "@dma-hub/ui";
import {COD_PILOT,assessCODPilot,blankCODPilot,codPilotText,validateCODPilot} from "./cod-pilot-core.mjs";
import type {CODFlag,CODOS,CODClient,CODPilotSurvey} from "./cod-pilot-core.mjs";

const KEY="dma-hub-cod-warzone-pilot-v1";
const friendly={below_official_prerequisites:"Reported requirements not met",manual_review_required:"Manual review required",self_reported_baseline:"Self-reported checklist complete (not tested)"} as const;
const sources=[
 ["Warzone official PC requirements",COD_PILOT.sourceUrls.requirements],
 ["TPM 2.0 and Secure Boot guidance",COD_PILOT.sourceUrls.secureBoot],
 ["Warzone official patch notes",COD_PILOT.sourceUrls.patchNotes],
 ["November 6 integration announcement",COD_PILOT.sourceUrls.updateAnnouncement],
 ["Security and enforcement policy",COD_PILOT.sourceUrls.enforcement]
] as const;
const flags=[
 ["tpm2","TPM 2.0 enabled"],["secureBoot","Secure Boot enabled"],["directX12","DirectX 12 available"],
 ["cpuAvx","Intel/AMD CPU with AVX"],["broadband","Broadband internet available"]
] as const;
function load():CODPilotSurvey{
 try{const raw=localStorage.getItem(KEY);return raw?validateCODPilot(JSON.parse(raw)):blankCODPilot()}
 catch{return blankCODPilot()}
}
function exportFile(content:string,name:string,type:string){
 const url=URL.createObjectURL(new Blob([content],{type}));
 const anchor=document.createElement("a");anchor.href=url;anchor.download=name;anchor.click();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function CODPilot(){
 const [survey,setSurvey]=useState<CODPilotSurvey>(load);
 const [notice,setNotice]=useState("");
 const evaluation=useMemo(()=>assessCODPilot(survey),[survey]);
 const patch=(values:Partial<CODPilotSurvey>)=>setSurvey(prev=>({...prev,...values}));
 useEffect(()=>{
  try{localStorage.setItem(KEY,JSON.stringify(survey))}
  catch{setNotice("Local storage is unavailable. Export your questionnaire to preserve it.")}
 },[survey]);
 function reset(){
  if(!window.confirm("Reset the local Warzone pilot questionnaire?"))return;
  setSurvey(blankCODPilot());setNotice("Local pilot questionnaire cleared.");
 }
 function numberValue(raw:string):number|null{
  if(raw.trim()==="")return null;
  const num=Number(raw);
  return Number.isFinite(num)?Math.min(2048,Math.max(0,Math.round(num*10)/10)):null;
 }
 async function copy(){
  try{await navigator.clipboard.writeText(codPilotText(survey));setNotice("Warzone readiness notes copied.")}
  catch{setNotice("Clipboard blocked. Use Export TXT instead.")}
 }
 return <main className="container page-pad cod-pilot-page">
  <a href="#/games/call-of-duty" className="text-link"><ArrowLeft size={15}/>Back to Call of Duty</a>
  <section className="cod-pilot-hero">
   <div className="eyebrow"><Monitor size={16}/> DMA HUB / FIRST GAME PILOT</div>
   <h1>Call of Duty: Warzone <span>PC readiness lab</span></h1>
   <p>A source-backed inventory and manual QA preparation workspace. Enter your actual PC information, identify official game requirements, and export a build-specific test handoff. No game process, device, driver or account is accessed.</p>
   <div className="cod-pilot-tags"><span>Edition: Warzone (PC)</span><span>Review: {COD_PILOT.requirementsReviewedOn}</span><span>Game build: not independently verified</span></div>
  </section>
  <div className="cod-pilot-grid">
   <div className="cod-pilot-main">
    <section className="cod-pilot-panel">
     <div className="cod-pilot-panel-head"><Monitor size={18}/><div><h2>1. Identify your installation</h2><p>These details come from you, not from automated game detection.</p></div></div>
     <div className="cod-pilot-fields">
      <label>PC game client<select value={survey.client} onChange={e=>patch({client:e.target.value as CODClient})}>
       <option value="unknown">Unknown</option><option value="steam">Steam</option><option value="battle_net">Battle.net</option><option value="xbox_pc">Xbox app on PC</option>
      </select></label>
      <label>Windows operating system<select value={survey.os} onChange={e=>patch({os:e.target.value as CODOS})}>
       <option value="unknown">Not checked</option><option value="windows_11">Windows 11</option><option value="windows_10_22h2">Windows 10 (22H2 or later)</option><option value="other">Other / unsupported / unknown version</option>
      </select></label>
      <label className="cod-pilot-wide">Installed game build / version<input maxLength={80} value={survey.installedBuild} onChange={e=>patch({installedBuild:e.target.value})} placeholder="Record exact build from the game client; leave blank if unknown"/></label>
      <label>Processor model<input maxLength={120} value={survey.cpuModel} onChange={e=>patch({cpuModel:e.target.value})} placeholder="Exact CPU name; human verification required"/></label>
      <label>Graphics card model<input maxLength={120} value={survey.gpuModel} onChange={e=>patch({gpuModel:e.target.value})} placeholder="Exact GPU model; human verification required"/></label>
     </div>
    </section>
    <section className="cod-pilot-panel">
     <div className="cod-pilot-panel-head"><ClipboardCheck size={18}/><div><h2>2. Compare official published minimums</h2><p>Numbers are self-reported; CPU and GPU performance are never inferred from their names.</p></div></div>
     <div className="cod-pilot-fields">{([
      ["ramGB","Installed RAM",COD_PILOT.specs.minimum.ramGB],
      ["vramGB","Dedicated graphics memory",COD_PILOT.specs.minimum.vramGB],
      ["ssdFreeGB","Available SSD storage",COD_PILOT.specs.minimum.ssdFreeGB]
     ] as const).map(([key,label,min])=><label key={key}>{label} (GB)
      <input type="number" min={0} max={2048} step="0.1" value={survey[key]??""} onChange={e=>patch({[key]:numberValue(e.target.value)})}/>
      <small>Official minimum: {min} GB</small>
     </label>)}</div>
     <div className="cod-pilot-spec-comparison">
      <div><strong>Official minimum</strong><p>RAM 8 GB · VRAM 3 GB · 116 GB SSD</p><small>CPU: {COD_PILOT.specs.minimum.cpuExamples}</small><small>GPU: {COD_PILOT.specs.minimum.gpuExamples}</small></div>
      <div><strong>Official recommended</strong><p>RAM 12 GB · VRAM 8 GB · 116 GB SSD</p><small>CPU: {COD_PILOT.specs.recommended.cpuExamples}</small><small>GPU: {COD_PILOT.specs.recommended.gpuExamples}</small></div>
     </div>
    </section>
    <section className="cod-pilot-panel">
     <div className="cod-pilot-panel-head"><ShieldCheck size={18}/><div><h2>3. Security and platform prerequisites</h2><p>Do not disable security features. Use Activision's official attestation guidance for any needed remediation.</p></div></div>
     <div className="cod-pilot-checks">{flags.map(([key,label])=><div className="cod-pilot-check" key={key}>
      <strong>{label}</strong><div role="group" aria-label={label}>
       {(["yes","no","unknown"] as CODFlag[]).map(value=><button key={value} type="button" className={survey[key]===value?"selected":""} aria-pressed={survey[key]===value} onClick={()=>patch({[key]:value})}>{value==="yes"?"Reported yes":value==="no"?"No":"Unknown"}</button>)}
      </div>
     </div>)}</div>
     <label className="cod-pilot-notes">Test preparation notes<textarea maxLength={1000} rows={4} value={survey.notes} onChange={e=>patch({notes:e.target.value})} placeholder="Non-sensitive installation details, firmware build, QA notes. Do not include credentials."/></label>
    </section>
    <section className="cod-pilot-panel">
     <div className="cod-pilot-panel-head"><Download size={18}/><div><h2>4. Export your test handoff</h2><p>This file documents what you entered; it does not grant rights, prove game compatibility, or enable software downloads.</p></div></div>
     <div className="cod-pilot-actions">
      <Button onClick={()=>exportFile(codPilotText(survey)+"\n","dma-hub-warzone-qa-handoff.txt","text/plain")}><Download size={14}/>Export TXT</Button>
      <Button variant="secondary" onClick={()=>exportFile(JSON.stringify({kind:"dma-hub-cod-warzone-pilot",survey},null,2)+"\n","dma-hub-warzone-qa-handoff.json","application/json")}><Download size={14}/>Export JSON</Button>
      <Button variant="secondary" onClick={()=>void copy()}>Copy report</Button>
      <Button variant="secondary" onClick={()=>window.print()}>Print / PDF</Button>
      <Button variant="secondary" onClick={reset}><RefreshCcw size={14}/>Reset locally</Button>
     </div>
     {notice?<p role="status" className="cod-pilot-notice">{notice}</p>:null}
    </section>
   </div>
   <aside className="cod-pilot-side">
    <section className="cod-pilot-panel cod-pilot-status">
     <div className="eyebrow">CURRENT SURVEY STATUS</div>
     <h2>{friendly[evaluation.status]}</h2>
     <Pill tone="warning">Game compatibility unverified</Pill>
     <p>{evaluation.caution}</p>
     {evaluation.blockers.length>0?<><h3>Reported blockers</h3><ul>{evaluation.blockers.map(x=><li key={x}>{x}</li>)}</ul></>:null}
     <h3>Manual checks outstanding</h3><ul>{evaluation.unknowns.slice(0,10).map(x=><li key={x}>{x}</li>)}</ul>
     {evaluation.unknowns.length===0?<p>All questionnaire fields are filled. CPU/GPU equivalence, exact build and actual test evidence are still unverified.</p>:null}
     <div className="cod-pilot-lock"><ShieldAlert size={15}/>No authorization, download, cheat compatibility, or QA certification issued</div>
    </section>
    <section className="cod-pilot-panel">
     <div className="eyebrow">PATCH / BUILD WATCH</div>
     <h3>{COD_PILOT.scheduledUpdateLabel}</h3>
     <p>{evaluation.updateReviewDue?"The announced update window has arrived or passed. Recheck the official release notes and exact installed build; this does not establish that a particular patch shipped.":"Scheduled game integration may invalidate previous testing. A new exact-build review is required once the update arrives."}</p>
     <small>Latest reviewed source: {COD_PILOT.knownPatchReference}. Exact internal game build has not been verified.</small>
    </section>
    <section className="cod-pilot-panel cod-pilot-resources">
     <div className="eyebrow">PUBLISHER SOURCES</div>
     {sources.map(([label,url])=><a key={url} href={url} target="_blank" rel="noopener noreferrer">{label}<ExternalLink size={13}/></a>)}
     <p>Activision prohibits unauthorized cheating/modding and security circumvention. This pilot covers documentation and legitimate platform readiness, not game manipulation.</p>
    </section>
   </aside>
  </div>
 </main>;
}
