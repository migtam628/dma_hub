import {useEffect,useState} from "react";
import type {FormEvent} from "react";
import {RefreshCcw,FileCheck2,ShieldCheck,Plus} from "lucide-react";
import {Button,Card,Empty,Pill} from "@dma-hub/ui";
import {api,ApiError} from "./api";
import type {AdminGameCompatibilityRecord,GameReleaseAsset,GameReleaseAssetDraft,Session} from "./api";
import {GAME_CATALOG} from "./gameCatalog";

const blank:GameReleaseAssetDraft={reviewId:"",releaseTag:"",assetName:"",expectedSha256:""};
function errorText(err:unknown){
 if(err instanceof ApiError){
  if(err.status===0)return "Local development API is unreachable. No changes were made.";
  if(err.status===403)return "Only server-authorized administrators can edit release metadata.";
  if(err.status===409)return "The record changed, is stale, or GitHub's digest did not match the expected SHA-256. Refresh before retrying.";
  if(err.status===503)return "GitHub release metadata could not be retrieved; no match was recorded.";
 }
 return err instanceof Error?err.message:"Asset request failed.";
}
export function AdminGameReleaseAssets({session}:{session:Session|null}){
 const admin=session?.user.role==="admin",token=session?.token??"";
 const [reviews,setReviews]=useState<AdminGameCompatibilityRecord[]>([]);
 const [assets,setAssets]=useState<GameReleaseAsset[]>([]);
 const [form,setForm]=useState<GameReleaseAssetDraft>(blank);
 const [notice,setNotice]=useState("");
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const eligible=reviews.filter(r=>r.state==="reviewed"&&!r.stale);
 async function refresh(){
  if(!admin)return;
  setLoading(true);
  try{
   const [a,r]=await Promise.all([api.adminGameReleaseAssets(token),api.adminGameCompatibility(token)]);
   setAssets(a.items);setReviews(r.items);setNotice("");
  }catch(e){setAssets([]);setReviews([]);setNotice(errorText(e))}
  finally{setLoading(false)}
 }
 useEffect(()=>{if(!admin){setAssets([]);setReviews([]);setForm(blank);setNotice("");return}void refresh()},[token,admin]);
 async function create(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!admin||!eligible.some(x=>x.id===form.reviewId))return;
  setBusy(true);setNotice("");
  try{
   await api.createGameReleaseAsset(token,{...form,expectedSha256:form.expectedSha256.trim().toLowerCase(),releaseTag:form.releaseTag.trim(),assetName:form.assetName.trim()});
   setForm(blank);await refresh();setNotice("Release metadata draft created. No source digest has been compared yet.");
  }catch(e){setNotice(errorText(e))}
  finally{setBusy(false)}
 }
 async function change(item:GameReleaseAsset,action:"match"|"withdraw"){
  if(!admin)return;
  if(action==="match"&&!window.confirm("Compare the expected SHA-256 with GitHub's published asset digest? This does not hash the downloaded binary, approve downloads, or establish compatibility."))return;
  if(action==="withdraw"&&!window.confirm("Withdraw this release record from public metadata?"))return;
  setBusy(true);setNotice("");
  try{
   if(action==="match")await api.matchGameReleaseAsset(token,item);
   else await api.withdrawGameReleaseAsset(token,item);
   await refresh();
   setNotice(action==="match"?"GitHub release asset metadata digest matched. No download or execution is enabled.":"Release metadata record withdrawn.");
  }catch(e){setNotice(errorText(e))}
  finally{setBusy(false)}
 }
 return <div className="admin-release-assets">
  <div className="page-head"><div><h1>Game Release Provenance</h1><p>Associate reviewed products with exact DMA Hub GitHub Release assets, then compare metadata SHA-256 values. This is not a signed software distribution or license system.</p></div>
   <Button variant="secondary" disabled={!admin||loading||busy} onClick={()=>void refresh()}><RefreshCcw size={15}/>Refresh</Button>
  </div>
  <div className="callout"><ShieldCheck size={16}/>Source repository is pinned to <strong>migtam628/dma_hub</strong>. No arbitrary download URLs, cheat execution, binary installation, or paid access is provided.</div>
  {!session?<Card title="Sign-in required"><Empty title="Administrator session required" description="Connect to the local API using a server-issued account."/></Card>:
   !admin?<Card title="Restricted"><Empty title="Administrator role required" description="Public accounts cannot register or verify game release assets."/></Card>:
   <>
    {notice?<p role="status" className="inline-message">{notice}</p>:null}
    <Card title="Register exact release metadata">
     {eligible.length===0?<p className="muted">Create a currently reviewed game compatibility record in Admin → Game QA first.</p>:null}
     <form className="form-stack game-asset-form" onSubmit={e=>void create(e)}>
      <label className="field">Reviewed game/build<select required value={form.reviewId} onChange={e=>setForm(v=>({...v,reviewId:e.target.value}))}>
       <option value="">Select a current review</option>{eligible.map(r=><option key={r.id} value={r.id}>{r.productName} — {GAME_CATALOG.find(g=>g.id===r.gameId)?.name||r.gameId}, build {r.gameBuild}</option>)}
      </select></label>
      <label className="field">GitHub release tag<input required maxLength={70} value={form.releaseTag} onChange={e=>setForm(v=>({...v,releaseTag:e.target.value}))} placeholder="v0.2.0-alpha.21"/></label>
      <label className="field">Exact asset filename<input required maxLength={120} value={form.assetName} onChange={e=>setForm(v=>({...v,assetName:e.target.value}))} placeholder="product-build.zip"/></label>
      <label className="field">Expected SHA-256 (64 hexadecimal characters)<input required maxLength={64} minLength={64} value={form.expectedSha256} onChange={e=>setForm(v=>({...v,expectedSha256:e.target.value}))} placeholder="Paste expected digest from a trusted build manifest"/></label>
      <Button disabled={busy||loading||!eligible.some(r=>r.id===form.reviewId)||!/^[a-fA-F0-9]{64}$/.test(form.expectedSha256)} type="submit"><Plus size={15}/>Create draft</Button>
     </form>
    </Card>
    <div className="spacer-top"><Card title="Asset metadata review queue">
     {loading?<p role="status">Loading release metadata records…</p>:assets.length===0?<Empty title="No release records" description="No sample records are fabricated. Create a draft when a reviewed, publisher-owned artifact exists."/>:
      <div className="game-asset-list">{assets.map(item=><article className="game-asset-item" key={item.id}>
       <div className="game-review-heading"><strong>{item.productName} · {item.assetName}</strong><Pill tone={item.state==="metadata_matched"&&!item.stale?"positive":"warning"}>{item.stale?"Stale":item.state.replace("_"," ")}</Pill></div>
       <p>Release {item.releaseTag} · {item.gameId} · {item.gameBuild}</p>
       <small>Expected SHA-256: <code>{item.expectedSha256}</code></small>
       <small>Review v{item.reviewVersion} (current v{item.currentReviewVersion}); record v{item.version}</small>
       {item.matchedAt?<small>GitHub metadata matched at {new Date(item.matchedAt).toLocaleString()} · {item.assetBytes} bytes. This does not verify local binary bytes or approval.</small>:null}
       <div className="form-actions">
        {item.state==="draft"?<Button variant="secondary" disabled={busy||loading||item.stale} onClick={()=>void change(item,"match")}><FileCheck2 size={15}/>Compare GitHub digest</Button>:null}
        {item.state!=="withdrawn"?<Button variant="secondary" disabled={busy||loading} onClick={()=>void change(item,"withdraw")}>Withdraw</Button>:null}
       </div>
      </article>)}</div>}
    </Card></div>
   </>}
 </div>
}
