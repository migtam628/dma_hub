import {useEffect,useState} from "react";
import {Button,Pill} from "@dma-hub/ui";
import {api} from "./api";
import type {CatalogCategory,PublishedCatalogItem} from "./api";

/**
 * Shows published records from the local API without inventing prices,
 * compatible hardware, licenses or product-detail routes.
 * GitHub Pages has no API backend, so its failure state is explicit.
 */
export function LiveCatalog(){
 const [items,setItems]=useState<PublishedCatalogItem[]>([]);
 const [state,setState]=useState<"loading"|"ready"|"unavailable">("loading");
 const [revision,setRevision]=useState(0);
 const [search,setSearch]=useState("");
 const [category,setCategory]=useState<CatalogCategory|"all">("all");
 const visible=items.filter(item=>(category==="all"||item.category===category)&&
  [item.name,item.description,item.slug,...item.features,...item.requirements].join(" ").toLowerCase().includes(search.trim().toLowerCase()));

 useEffect(()=>{
  let mounted=true;
  setState("loading");
  api.liveCatalog().then(result=>{
   if(!mounted)return;
   if(!Array.isArray(result.items)||result.items.some(item=>
    typeof item?.id!=="string"||
    typeof item?.slug!=="string"||
    typeof item?.name!=="string"||
    typeof item?.description!=="string"||
    typeof item?.updatedAt!=="number"||
    !["unspecified","software","hardware","cloud"].includes(item?.category)||
    !Array.isArray(item?.features)||
    !Array.isArray(item?.requirements)
   ))throw new Error("Invalid catalog response");
   setItems(result.items);
   setState("ready");
  }).catch(()=>{
   if(!mounted)return;
   setItems([]);
   setState("unavailable");
  });
  return ()=>{mounted=false};
 },[revision]);

 return <section className="live-catalog-section" aria-labelledby="live-catalog-title">
  <div className="live-catalog-heading">
   <div><span className="eyebrow">LOCAL API / PUBLISHED RECORDS</span><h2 id="live-catalog-title">Published catalog</h2>
    <p className="muted">Read-only records from the development API. Publishing a record does not make it purchasable or licensed.</p></div>
   {state==="ready"?<Pill tone="neutral">{items.length} published</Pill>:null}
  </div>
  {state==="loading"?<p role="status" className="muted">Checking for published catalog records…</p>:null}
  {state==="unavailable"?<div className="callout" role="status">
   The catalog API is unavailable. GitHub Pages hosts a static preview only; the concept products below are sample data.
   <Button variant="secondary" onClick={()=>setRevision(value=>value+1)}>Retry API</Button>
  </div>:null}
  {state==="ready"&&items.length===0?<p role="status" className="muted">The API is connected, but no products are published yet.</p>:null}
  {state==="ready"&&items.length>0?<>
   <div className="filter-row">
    <label className="field catalog-filter-label">Search published records<input aria-label="Search published catalog" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, feature or requirement"/></label>
    <label className="field catalog-filter-label">Category<select value={category} onChange={e=>setCategory(e.target.value as CatalogCategory|"all")}>
     <option value="all">All categories</option>
     <option value="software">Software</option><option value="hardware">Hardware</option><option value="cloud">Cloud</option><option value="unspecified">Unspecified</option>
    </select></label>
   </div>
   {visible.length===0?<p role="status" className="muted">No published records match these filters.</p>:
    <div className="product-grid">{visible.map(item=><article className="product-card" key={item.id}>
     <div className="product-copy">
      <div className="product-meta"><span>{item.category==="unspecified"?"Uncategorized":item.category}</span><Pill tone="positive">Published</Pill></div>
      <h3>{item.name}</h3>
      <p>{item.description||"No public description has been provided."}</p>
      {item.features.length>0?<ul className="catalog-feature-list">{item.features.slice(0,3).map(f=><li key={f}>{f}</li>)}</ul>:null}
      {item.requirements.length>0?<small className="muted">{item.requirements.length} documented requirement(s)</small>:null}
      <div className="product-footer">
       <a className="text-link" href={"#/catalog/"+item.slug}>View details</a>
       <span className="muted">No checkout or activation</span>
      </div>
     </div>
    </article>)}</div>}
  </>:null}
 </section>
}
