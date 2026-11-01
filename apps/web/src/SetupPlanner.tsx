import {useEffect,useMemo,useState} from "react";
import {ArrowRight,CheckCircle2,ClipboardCheck,Download,HardDrive,Monitor,Printer,RefreshCcw,ShieldAlert,Usb} from "lucide-react";
import {Button,Pill} from "@dma-hub/ui";
import {GAME_CATALOG} from "./gameCatalog";
import {
 SETUP_ITEMS,createEmptySetupPlan,evaluateSetupPlan,sanitizeSetupPlan,setupPlanMarkdown
} from "./setup-planner-core.mjs";
import type {SetupCheckValue,SetupOS,SetupPlan} from "./setup-planner-core.mjs";

const KEY="dma-hub-setup-planner-v1";
const tabs=[{key:"inventory",label:"01 · Your environment"},{key:"hardware",label:"02 · Hardware checklist"},{key:"summary",label:"03 · Review & export"}] as const;
type Tab=typeof tabs[number]["key"];
const statusText={needs_setup:"Setup needs attention",needs_review:"Needs manual review",inventory_documented:"Hardware inventory documented — not certified"} as const;
function savedPlan():SetupPlan{
 try{
  const raw=localStorage.getItem(KEY);
  return raw?sanitizeSetupPlan(JSON.parse(raw)):createEmptySetupPlan();
 }catch{return createEmptySetupPlan()}
}
function downloadFile(text:string,filename:string,type:string){
 const blob=new Blob([text],{type});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=filename;
 a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function SetupPlanner(){
 const [plan,setPlan]=useState<SetupPlan>(savedPlan);
 const [tab,setTab]=useState<Tab>("inventory");
 const [notice,setNotice]=useState("");
 const assessment=useMemo(()=>evaluateSetupPlan(plan),[plan]);
 useEffect(()=>{
  try{localStorage.setItem(KEY,JSON.stringify(plan))}
  catch{setNotice("Browser storage unavailable; export a copy if you want to keep this plan.")}
 },[plan]);
 const patch=(values:Partial<SetupPlan>)=>setPlan(old=>({...old,...values}));
 const answer=(id:string,value:SetupCheckValue)=>setPlan(old=>({...old,checks:{...old.checks,[id]:value}}));
 const reset=()=>{
  if(!window.confirm("Clear your locally saved setup inventory? This cannot be undone unless you exported it."))return;
  setPlan(createEmptySetupPlan());setTab("inventory");setNotice("Local setup plan reset.");
 };
 async function copy(){
  try{await navigator.clipboard.writeText(setupPlanMarkdown(plan));setNotice("Readiness plan copied as plain text.")}
  catch{setNotice("Clipboard permission unavailable; use Export .txt instead.")}
 }
 const selectedGame=GAME_CATALOG.find(g=>g.id===plan.gameId);
 return <main className="container page-pad setup-page">
  <div className="setup-hero">
   <div className="eyebrow"><ClipboardCheck size={16}/> DMA HUB / SETUP PLANNER</div>
   <h1>Plan your hardware setup with clarity.</h1>
   <p>Build a personal inventory, document your exact Windows and hardware versions, and export a practical checklist before contacting support. This tool is local to this browser and never connects to or alters devices.</p>
   <div className="setup-hero-points"><span><ShieldAlert size={16}/> No compatibility claims</span><span><HardDrive size={16}/> Local-only answers</span><span><Download size={16}/> Portable JSON + text plan</span></div>
  </div>
  <div className="setup-layout">
   <div className="setup-left">
    <div className="setup-tabs" role="tablist" aria-label="Setup planning stages">
     {tabs.map(t=><button type="button" role="tab" aria-selected={tab===t.key} className={tab===t.key?"active":""} key={t.key} onClick={()=>{setTab(t.key);setNotice("")}}>{t.label}</button>)}
    </div>
    {tab==="inventory"?<section className="setup-panel" aria-label="Environment inventory">
     <div className="setup-section-title"><Monitor size={19}/><div><h2>Your environment</h2><p>Identify the machines and configuration you have—not what a website says is supported.</p></div></div>
     <div className="setup-fields">
      <label>Planning game category<select value={plan.gameId} onChange={e=>patch({gameId:e.target.value})}>
       <option value="">Not selected / general hardware</option>{GAME_CATALOG.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}
      </select></label>
      <label>Exact game version/build (optional)<input maxLength={80} value={plan.gameBuild} onChange={e=>patch({gameBuild:e.target.value})} placeholder="Only if known from an authorized source"/></label>
      <label>Primary computer OS<select value={plan.primaryOS} onChange={e=>patch({primaryOS:e.target.value as SetupOS})}>
       {(["Unknown","Windows 11","Windows 10","Other"] as SetupOS[]).map(o=><option key={o}>{o}</option>)}
      </select></label>
      <label>Companion computer OS<select value={plan.secondaryOS} onChange={e=>patch({secondaryOS:e.target.value as SetupOS})}>
       {(["Unknown","Windows 11","Windows 10","Other"] as SetupOS[]).map(o=><option key={o}>{o}</option>)}
      </select></label>
      <label className="setup-full">Device model / firmware identification<input maxLength={160} value={plan.hardwareModel} onChange={e=>patch({hardwareModel:e.target.value})} placeholder="Manufacturer, model, revision — never enter credentials"/></label>
      <label className="setup-full">Purpose<select value={plan.purpose} onChange={e=>patch({purpose:e.target.value as SetupPlan["purpose"]})}>
       <option value="evaluation">Research and evaluation</option><option value="personal_inventory">Personal hardware inventory</option><option value="authorized_lab">Authorized laboratory testing</option>
      </select></label>
     </div>
     {selectedGame?.id==="call-of-duty"?<p className="setup-context"><a className="text-link" href="#/games/call-of-duty/pilot">Call of Duty: open the Warzone PC pilot requirements and build-check worksheet <ArrowRight size={13}/></a></p>:null}
     {selectedGame?<p className="setup-context">Selected: <strong>{selectedGame.name}</strong> is a catalog planning category. No software support or compatibility is implied.</p>:null}
     <div className="setup-actions"><Button onClick={()=>setTab("hardware")}>Continue to checklist <ArrowRight size={15}/></Button></div>
    </section>:null}
    {tab==="hardware"?<section className="setup-panel" aria-label="Hardware checklist">
     <div className="setup-section-title"><Usb size={19}/><div><h2>Inventory checklist</h2><p>Select Confirmed, Missing, or Unknown for each item. These are your answers, not device diagnostics.</p></div></div>
     <div className="setup-check-list">{SETUP_ITEMS.map(c=><div className="setup-check" key={c.id}>
      <div><strong>{c.label}</strong><p>{c.detail}</p></div>
      <div role="group" aria-label={c.label}>{(["yes","no","unknown"] as SetupCheckValue[]).map(v=><button type="button" key={v} className={plan.checks[c.id]===v?"selected":""} aria-pressed={plan.checks[c.id]===v} onClick={()=>answer(c.id,v)}>{v==="yes"?"Confirmed":v==="no"?"Missing":"Unknown"}</button>)}</div>
     </div>)}</div>
     <div className="setup-actions"><Button variant="secondary" onClick={()=>setTab("inventory")}>Back</Button><Button onClick={()=>setTab("summary")}>Review plan <ArrowRight size={15}/></Button></div>
    </section>:null}
    {tab==="summary"?<section className="setup-panel" aria-label="Export readiness assessment">
     <div className="setup-section-title"><ClipboardCheck size={19}/><div><h2>Review and export</h2><p>This assessment cannot certify a game build or grant download access.</p></div></div>
     <label className="setup-notes">Support and installation notes<textarea value={plan.notes} maxLength={1000} rows={4} onChange={e=>patch({notes:e.target.value})} placeholder="Record symptoms or questions. Do not include API keys, passwords, personal identifiers or private links."/></label>
     <div className="setup-summary">
      <div><strong>{assessment.confirmed} / {assessment.total}</strong><span>Items self-reported as confirmed</span></div>
      <div><strong>{assessment.blockers.length}</strong><span>Inventory follow-ups</span></div>
      <div><strong>0</strong><span>Games independently verified by this planner</span></div>
     </div>
     <div className="setup-actions setup-export-actions">
      <Button onClick={()=>downloadFile(JSON.stringify({kind:"dma-hub-setup-plan",plan},null,2)+"\n","dma-hub-setup-plan.json","application/json")}><Download size={15}/>Export JSON</Button>
      <Button variant="secondary" onClick={()=>downloadFile(setupPlanMarkdown(plan)+"\n","dma-hub-setup-plan.txt","text/plain")}><Download size={15}/>Export text</Button>
      <Button variant="secondary" onClick={()=>void copy()}><ClipboardCheck size={15}/>Copy</Button>
      <Button variant="secondary" onClick={()=>window.print()}><Printer size={15}/>Print / PDF</Button>
     </div>
     <p className="setup-disclaimer">Exports contain the information you entered. Review the file before sharing it; this planner sends no data to DMA Hub or external websites.</p>
     <div className="setup-actions"><Button variant="secondary" onClick={()=>setTab("hardware")}>Back to checklist</Button><Button variant="secondary" onClick={reset}><RefreshCcw size={14}/>Clear local plan</Button></div>
    </section>:null}
    {notice?<p role="status" className="setup-notice">{notice}</p>:null}
   </div>
   <aside className="setup-right">
    <div className="setup-status-card">
     <span className="eyebrow">READINESS ASSESSMENT</span>
     <h2>{statusText[assessment.status]}</h2>
     <Pill tone={assessment.status==="inventory_documented"?"positive":"warning"}>{assessment.confirmed} of {assessment.total} confirmed</Pill>
     <p>All entries are self-reported. Even a complete inventory is not validated device connectivity or game compatibility.</p>
     <div className="setup-status-line"><CheckCircle2 size={16}/>Inventory assessment active</div>
     <div className="setup-status-line warning"><ShieldAlert size={16}/>Software approval: not verified</div>
     <div className="setup-status-line warning"><ShieldAlert size={16}/>Downloads/activation: unavailable</div>
    </div>
    <div className="setup-status-card">
     <span className="eyebrow">NEXT ACTIONS</span>
     <h3>Open follow-ups</h3>
     {assessment.blockers.length?<ul>{assessment.blockers.slice(0,6).map(x=><li key={x}>{x}</li>)}</ul>:<p>Your inventory is documented. Independent approvals remain outstanding.</p>}
     <h3>External verification gates</h3>
     <ul>{assessment.externalGates.map(x=><li key={x}>{x}</li>)}</ul>
    </div>
    <a className="setup-help-link" href="#/docs">Explore setup documentation <ArrowRight size={15}/></a>
   </aside>
  </div>
 </main>;
}
