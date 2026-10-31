import {useEffect,useState} from "react";
import type {FormEvent} from "react";
import {ClipboardCheck,RefreshCcw,ShieldCheck,Plus} from "lucide-react";
import {Button,Card,Empty,Pill} from "@dma-hub/ui";
import {api,ApiError} from "./api";
import type {AdminGameCompatibilityRecord,CatalogItem,GameCompatibilityDraft,Session} from "./api";
import {GAME_CATALOG} from "./gameCatalog";

const initial:GameCompatibilityDraft={productId:"",gameId:"",gameBuild:"",platform:"Windows 11",hardware:"",evidenceRef:""};
function failure(error:unknown){
 if(error instanceof ApiError){
  if(error.status===409)return "Version conflict, duplicate review or changed product. Reload the queue and check its product version.";
  if(error.status===403)return "The local API requires a verified administrator role.";
  if(error.status===0)return "The local API is not reachable. No compatibility changes were saved.";
 }
 return error instanceof Error?error.message:"The review request could not be completed.";
}
export function AdminGameCompatibility({session}:{session:Session|null}){
 const token=session?.token??"";
 const admin=session?.user.role==="admin";
 const [products,setProducts]=useState<CatalogItem[]>([]);
 const [reviews,setReviews]=useState<AdminGameCompatibilityRecord[]>([]);
 const [form,setForm]=useState<GameCompatibilityDraft>(initial);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false);
 const [notice,setNotice]=useState("");
 const choices=products.filter(p=>p.category==="software"&&p.gameIds.length>0);
 const chosen=choices.find(p=>p.id===form.productId);
 async function refresh(){
  if(!admin)return;
  setLoading(true);
  try{
   const [p,r]=await Promise.all([api.adminProducts(token),api.adminGameCompatibility(token)]);
   setProducts(p.items);setReviews(r.items);setNotice("");
  }catch(e){setProducts([]);setReviews([]);setNotice(failure(e))}
  finally{setLoading(false)}
 }
 useEffect(()=>{
  if(!admin){setProducts([]);setReviews([]);setForm(initial);setNotice("");return}
  void refresh();
 },[token,admin]);
 async function create(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!admin||!chosen||!chosen.gameIds.includes(form.gameId)||!form.gameBuild.trim()||!form.hardware.trim())return;
  setBusy(true);setNotice("");
  try{
   await api.createGameCompatibility(token,{...form,gameBuild:form.gameBuild.trim(),hardware:form.hardware.trim(),evidenceRef:form.evidenceRef.trim()});
   setForm(initial);await refresh();setNotice("Draft created. It is not public. Review the evidence before attesting.");
  }catch(e){setNotice(failure(e))}
  finally{setBusy(false)}
 }
 async function transition(record:AdminGameCompatibilityRecord,state:AdminGameCompatibilityRecord["state"]){
  if(!admin)return;
  if(state==="reviewed"&&!window.confirm("Attest that this exact game build/platform/hardware has supporting evidence and should be shown as OPERATOR-REVIEWED? This is not independent certification."))return;
  if(state==="withdrawn"&&!window.confirm("Withdraw this compatibility attestation from public view?"))return;
  setBusy(true);setNotice("");
  try{
   await api.transitionGameCompatibility(token,record,state);
   await refresh();setNotice("Review state updated. Public read access remains restricted to current, operator-reviewed records.");
  }catch(e){setNotice(failure(e))}
  finally{setBusy(false)}
 }
 return <div className="admin-game-review">
   <div className="page-head"><div><h1>Game Compatibility Reviews</h1>
    <p>Document game build, OS, hardware and evidence. Only operator-reviewed records for an unchanged, published product are public.</p></div>
    <Button variant="secondary" onClick={()=>void refresh()} disabled={!admin||busy||loading}><RefreshCcw size={15}/>Refresh</Button>
   </div>
   <div className="callout"><ShieldCheck size={17}/>A catalog association alone never establishes compatibility. Reviews are operator attestations, not independent certification or anti-cheat guarantees. No game software is executed here.</div>
   {!session?<Card title="Sign in to review"><Empty title="Administrator session required" description="Use a server-issued local API account."/></Card>:
   !admin?<Card title="Restricted"><Empty title="Admin permission required" description="Game compatibility reviews cannot be created by customer accounts."/></Card>:
   <>
    {notice?<p role="status" className="inline-message">{notice}</p>:null}
    <Card title="Create review draft">
     {choices.length===0?<p className="muted">Create and game-associate a software product in Admin → Products first. No demo data is substituted.</p>:null}
     <form className="form-stack game-review-form" onSubmit={e=>void create(e)}>
      <label className="field">Software product<select required value={form.productId} onChange={e=>setForm(v=>({...v,productId:e.target.value,gameId:""}))}>
       <option value="">Select a real API product</option>{choices.map(p=><option key={p.id} value={p.id}>{p.name} — {p.status}, version {p.version}</option>)}
      </select></label>
      <label className="field">Game<select required value={form.gameId} disabled={!chosen} onChange={e=>setForm(v=>({...v,gameId:e.target.value}))}>
       <option value="">Select associated game</option>{GAME_CATALOG.filter(g=>chosen?.gameIds.includes(g.id)).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
      </select></label>
      <label className="field">Exact game build<input required minLength={3} maxLength={64} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,63}" value={form.gameBuild} onChange={e=>setForm(v=>({...v,gameBuild:e.target.value}))} placeholder="2026.10.31"/></label>
      <label className="field">Tested OS<select value={form.platform} onChange={e=>setForm(v=>({...v,platform:e.target.value as GameCompatibilityDraft["platform"]}))}>
       <option>Windows 11</option><option>Windows 10</option>
      </select></label>
      <label className="field">Hardware used<input required minLength={3} maxLength={200} value={form.hardware} onChange={e=>setForm(v=>({...v,hardware:e.target.value}))} placeholder="Document exact hardware and firmware"/></label>
      <label className="field">Evidence URL (HTTPS; required to attest)<input maxLength={500} value={form.evidenceRef} onChange={e=>setForm(v=>({...v,evidenceRef:e.target.value}))} placeholder="https://example.com/qa-report"/></label>
      <Button type="submit" disabled={busy||loading||!chosen||!chosen.gameIds.includes(form.gameId)||form.gameBuild.trim().length<3||form.hardware.trim().length<3}><Plus size={15}/>Create private draft</Button>
     </form>
    </Card>
    <div className="spacer-top"><Card title="Compatibility review queue">
     {loading?<p role="status">Loading QA records…</p>:reviews.length===0?<Empty title="No compatibility reviews" description="New game associations do not automatically publish compatibility claims."/>:
      <div className="game-review-list">{reviews.map(review=><div className="game-review-item" key={review.id}>
       <div className="game-review-heading"><strong>{review.productName}</strong><Pill tone={review.state==="reviewed"&&!review.stale?"positive":"warning"}>{review.stale?"stale":review.state}</Pill></div>
       <p>{GAME_CATALOG.find(g=>g.id===review.gameId)?.name??review.gameId} · build {review.gameBuild} · {review.platform}</p>
       <small>Hardware: {review.hardware}</small>
       <small>Evidence: {review.evidenceRef||"Not supplied"}</small>
       <small>Review v{review.version} · Product v{review.productVersion} (current v{review.currentProductVersion})</small>
       <div className="form-actions">
        {review.state==="draft"?<Button variant="secondary" disabled={busy||loading||review.stale||!review.evidenceRef} onClick={()=>void transition(review,"reviewed")}><ClipboardCheck size={15}/>Attest reviewed</Button>:null}
        {review.state!=="withdrawn"?<Button variant="secondary" disabled={busy||loading} onClick={()=>void transition(review,"withdrawn")}>Withdraw</Button>:null}
        {review.state!=="draft"?<Button variant="secondary" disabled={busy||loading} onClick={()=>void transition(review,"draft")}>Reset to draft</Button>:null}
       </div>
      </div>)}</div>}
    </Card></div>
   </>}
  </div>
}
