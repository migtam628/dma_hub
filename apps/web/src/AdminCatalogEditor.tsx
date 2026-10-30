import {useEffect,useState} from "react";
import type {FormEvent} from "react";
import {ArrowUpRight,RefreshCcw,Plus,Save,ShieldCheck} from "lucide-react";
import {Button,Card,Empty,Pill} from "@dma-hub/ui";
import {api,ApiError} from "./api";
import type {CatalogCategory,CatalogItem,Session} from "./api";

type EditorFields=Pick<CatalogItem,"slug"|"name"|"description"|"category">&{featuresText:string;requirementsText:string};
const empty:EditorFields={slug:"",name:"",description:"",category:"unspecified",featuresText:"",requirementsText:""};
const fields=(p:CatalogItem):EditorFields=>({slug:p.slug,name:p.name,description:p.description,category:p.category,featuresText:p.features.join("\n"),requirementsText:p.requirements.join("\n")});
function entries(text:string){return text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}
function validEntries(text:string){
 const items=entries(text);
 return items.length<=10&&items.every(x=>x.length<=140&&!Array.from(x).some(ch=>ch.charCodeAt(0)<32||ch.charCodeAt(0)===127))&&new Set(items).size===items.length;
}
function payload(v:EditorFields){return {slug:v.slug,name:v.name.trim(),description:v.description.trim(),category:v.category,features:entries(v.featuresText),requirements:entries(v.requirementsText)}}
function friendly(error:unknown){
 if(error instanceof ApiError){
  if(error.status===409)return "Catalog version conflict or duplicate slug. Refresh records before trying again.";
  if(error.status===403)return "The API denied this operation; a server-issued admin role is required.";
  if(error.status===0)return "Local catalog API is unreachable. No changes were saved.";
 }
 return error instanceof Error?error.message:"Catalog operation failed.";
}
function valid(v:EditorFields){
 return /^[a-z0-9][a-z0-9-]{2,59}$/.test(v.slug)&&
        v.name.trim().length>=2&&v.name.trim().length<=100&&
        v.description.length<=2000&&
        ["unspecified","software","hardware","cloud"].includes(v.category)&&
        validEntries(v.featuresText)&&validEntries(v.requirementsText);
}
export function AdminCatalogEditor({session}:{session:Session|null}){
 const token=session?.token??"";
 const authorized=session?.user.role==="admin";
 const [items,setItems]=useState<CatalogItem[]>([]);
 const [selectedId,setSelectedId]=useState("");
 const [editing,setEditing]=useState<EditorFields>(empty);
 const [creating,setCreating]=useState<EditorFields>(empty);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false);
 const [notice,setNotice]=useState("");
 const selected=items.find(p=>p.id===selectedId)??null;
 function adopt(list:CatalogItem[],prefer?:string){
  setItems(list);
  const id=list.find(x=>x.id===(prefer??selectedId))?.id??list[0]?.id??"";
  setSelectedId(id);
  const p=list.find(x=>x.id===id);
  setEditing(p?fields(p):empty);
 }
 async function refresh(prefer?:string){
  if(!authorized)return;
  setLoading(true);
  try{
   const result=await api.adminProducts(token);
   adopt(result.items,prefer);
   setNotice("");
  }catch(e){
   setItems([]);setSelectedId("");setEditing(empty);
   setNotice(friendly(e));
  }finally{setLoading(false)}
 }
 useEffect(()=>{
  if(!authorized){setItems([]);setSelectedId("");setEditing(empty);setNotice("");return}
  void refresh();
 },[token,authorized]);
 function choose(id:string){
  const product=items.find(p=>p.id===id);
  setSelectedId(id);
  setEditing(product?fields(product):empty);
  setNotice("");
 }
 async function create(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!authorized||!valid(creating))return;
  setBusy(true);setNotice("");
  try{
   const created=await api.createCatalogDraft(token,payload(creating));
   setCreating(empty);
   await refresh(created.id);
   setNotice("Draft created. Review and publish explicitly when ready.");
  }catch(e){setNotice(friendly(e))}
  finally{setBusy(false)}
 }
 async function mutate(status:CatalogItem["status"],event?:FormEvent<HTMLFormElement>){
  event?.preventDefault();
  if(!selected||!authorized||!valid(editing))return;
  if(status==="published"&&!editing.description.trim()){
   setNotice("Add a public description before publishing.");return;
  }
  if(status!==selected.status&&
      !window.confirm(status==="published"?"Publish this product to the local API catalog? No sales or licenses will be enabled.":status==="archived"?"Archive this product? Its public detail page will become unavailable.":"Move this product back to draft? It will not appear in the public catalog."))return;
  setBusy(true);setNotice("");
  try{
   const saved=await api.saveAdminProduct(token,selected,{...payload(editing),status});
   await refresh(saved.id);
   setNotice("Saved as "+status+" (version "+saved.version+"). Changes are audit-recorded by the API.");
  }catch(e){setNotice(friendly(e))}
  finally{setBusy(false)}
 }
 return <div className="admin-catalog-editor">
  <div className="page-head"><div><h1>Product Management</h1>
   <p>Database-backed catalog editor for authorized local API administrators. This does not issue licenses or accept payments.</p></div>
   <Button variant="secondary" disabled={!authorized||loading||busy} onClick={()=>void refresh()}><RefreshCcw size={15}/>Refresh</Button>
  </div>
  <div className="callout"><ShieldCheck size={17}/>Every change requires the local API's admin role and an optimistic version check. Public listings display published records only.</div>
  {!session?<Card title="Sign-in required"><Empty title="No admin session" description="Sign in through Account with an administrator-provisioned local API account."/></Card>:
   !authorized?<Card title="Access restricted"><Empty title="Administrator role required" description="Public registration cannot grant administrator permissions."/></Card>:
   <>
    {notice?<div className="inline-message" role="status">{notice}</div>:null}
    <div className="two-col">
     <Card title="Saved products">
      {loading?<p role="status">Loading catalog…</p>:items.length===0?<Empty title="No API records" description="Create a draft to populate the local database. Sample storefront modules are separate."/>:
       <div className="catalog-record-list" aria-label="Catalog records">
        {items.map(p=><button type="button" key={p.id} onClick={()=>choose(p.id)} className={p.id===selectedId?"catalog-record active":"catalog-record"} aria-pressed={p.id===selectedId}>
         <span><strong>{p.name}</strong><small>/{p.slug} · {p.category} · v{p.version} · Updated {new Date(p.updatedAt).toLocaleString()}</small></span>
         <Pill tone={p.status==="published"?"positive":"warning"}>{p.status}</Pill>
        </button>)}
       </div>}
     </Card>
     <Card title="Create draft product">
      <form className="form-stack" onSubmit={e=>void create(e)}>
       <label className="field">URL slug<input required pattern="[a-z0-9][a-z0-9-]{2,59}" minLength={3} maxLength={60} value={creating.slug} onChange={e=>setCreating(v=>({...v,slug:e.target.value}))} placeholder="product-slug" /></label>
       <label className="field">Name<input required minLength={2} maxLength={100} value={creating.name} onChange={e=>setCreating(v=>({...v,name:e.target.value}))} /></label>
       <label className="field">Description<textarea maxLength={2000} rows={4} value={creating.description} onChange={e=>setCreating(v=>({...v,description:e.target.value}))} /></label>
       <label className="field">Category<select value={creating.category} onChange={e=>setCreating(v=>({...v,category:e.target.value as CatalogCategory}))}>
         <option value="unspecified">Not specified</option><option value="software">Software</option><option value="hardware">Hardware</option><option value="cloud">Cloud</option>
        </select></label>
        <label className="field">Documented features (one per line, maximum 10)<textarea rows={3} value={creating.featuresText} onChange={e=>setCreating(v=>({...v,featuresText:e.target.value}))} placeholder="Feature description"/></label>
        <label className="field">Requirements (one per line, maximum 10)<textarea rows={3} value={creating.requirementsText} onChange={e=>setCreating(v=>({...v,requirementsText:e.target.value}))} placeholder="Operating system or documented requirement"/></label>
       <Button type="submit" disabled={busy||loading||!valid(creating)}><Plus size={15}/>Create draft</Button>
      </form>
     </Card>
    </div>
    <div className="spacer-top">
     <Card title="Product editor">
      {!selected?<Empty title="Select a product" description="Choose a record from the API catalog above."/>:
       <form className="form-stack" key={selected.id} onSubmit={e=>void mutate(selected.status,e)}>
        <div className="catalog-editor-meta">
         <Pill tone={selected.status==="published"?"positive":"warning"}>{selected.status}</Pill>
         <span>Version {selected.version} · Audit-enabled changes</span>
         {selected.status==="published"?<a href={"#/catalog/"+selected.slug} className="text-link">View public detail <ArrowUpRight size={14}/></a>:null}
        </div>
        <label className="field">Slug<input required pattern="[a-z0-9][a-z0-9-]{2,59}" minLength={3} maxLength={60} value={editing.slug} onChange={e=>setEditing(v=>({...v,slug:e.target.value}))}/></label>
        <label className="field">Product name<input required minLength={2} maxLength={100} value={editing.name} onChange={e=>setEditing(v=>({...v,name:e.target.value}))}/></label>
        <label className="field">Public description<textarea rows={6} maxLength={2000} value={editing.description} onChange={e=>setEditing(v=>({...v,description:e.target.value}))}/></label>
        <label className="field">Category<select value={editing.category} onChange={e=>setEditing(v=>({...v,category:e.target.value as CatalogCategory}))}>
         <option value="unspecified">Not specified</option><option value="software">Software</option><option value="hardware">Hardware</option><option value="cloud">Cloud</option>
        </select></label>
        <label className="field">Documented features (one per line, maximum 10)<textarea rows={3} value={editing.featuresText} onChange={e=>setEditing(v=>({...v,featuresText:e.target.value}))} placeholder="Feature description"/></label>
        <label className="field">Requirements (one per line, maximum 10)<textarea rows={3} value={editing.requirementsText} onChange={e=>setEditing(v=>({...v,requirementsText:e.target.value}))} placeholder="Operating system or documented requirement"/></label>
        <div className="form-actions">
         <Button type="submit" disabled={busy||loading||!valid(editing)}><Save size={15}/>Save details</Button>
         {selected.status!=="published"?<Button type="button" variant="secondary" disabled={busy||loading||!valid(editing)} onClick={()=>void mutate("published")}>Publish</Button>:<Button type="button" variant="secondary" disabled={busy||loading} onClick={()=>void mutate("draft")}>Unpublish to draft</Button>}
         {selected.status!=="archived"?<Button type="button" variant="secondary" disabled={busy||loading} onClick={()=>void mutate("archived")}>Archive</Button>:<Button type="button" variant="secondary" disabled={busy||loading} onClick={()=>void mutate("draft")}>Restore draft</Button>}
        </div>
        <small className="muted">Saving uses version {selected.version}. If another admin changes the record, refresh before retrying. Publishing never enables checkout, downloads, payments or entitlements.</small>
       </form>}
     </Card>
    </div>
   </>}
 </div>
}
