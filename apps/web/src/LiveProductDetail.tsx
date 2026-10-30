import {useEffect,useState} from "react";
import {ArrowLeft,ShieldCheck} from "lucide-react";
import {Button,Card,Pill} from "@dma-hub/ui";
import {api,ApiError} from "./api";
import type {PublishedCatalogItem} from "./api";

type Result="loading"|"ready"|"not_found"|"unavailable";
export function LiveProductDetail({slug}:{slug:string}){
 const [item,setItem]=useState<PublishedCatalogItem|null>(null);
 const [state,setState]=useState<Result>("loading");
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let active=true;
  setItem(null);setState("loading");
  if(!/^[a-z0-9][a-z0-9-]{2,59}$/.test(slug)){setState("not_found");return}
  api.liveProduct(slug).then(product=>{
   if(!active)return;
   if(product.slug!==slug||typeof product.name!=="string"||typeof product.description!=="string"||
      typeof product.updatedAt!=="number")throw new Error("Invalid product response");
   setItem(product);setState("ready");
  }).catch(e=>{
   if(!active)return;
   setItem(null);
   setState(e instanceof ApiError&&e.status===404?"not_found":"unavailable");
  });
  return ()=>{active=false};
 },[slug,attempt]);
 return <main className="container page-pad">
  <div className="breadcrumb"><a href="#/products">Products</a><span>/</span>Published catalog</div>
  {state==="loading"?<div className="inline-message" role="status">Loading published product details from the local API…</div>:null}
  {state==="not_found"?<Card title="Product unavailable">
   <p role="status">This product is not currently published, or the catalog record does not exist.</p>
   <Button variant="secondary" onClick={()=>{window.location.hash="/products"}}><ArrowLeft size={15}/>Back to products</Button>
  </Card>:null}
  {state==="unavailable"?<Card title="Catalog API unavailable">
   <p role="status">The backend is not reachable. GitHub Pages is a static demo and does not host product records.</p>
   <div className="form-actions">
    <Button variant="secondary" onClick={()=>setAttempt(n=>n+1)}>Retry</Button>
    <Button variant="secondary" onClick={()=>{window.location.hash="/products"}}>Back to products</Button>
   </div>
  </Card>:null}
  {state==="ready"&&item?<div className="detail-grid">
   <Card title="Published product overview" className="detail-desc">
    <div className="catalog-detail-visual" aria-hidden="true">◇</div>
    <h1>{item.name}</h1>
    <p className="catalog-detail-description">{item.description||"No description has been supplied for this product."}</p>
    <small className="muted">Record updated {new Date(item.updatedAt).toLocaleString()}</small>
   </Card>
   <div className="purchase-panel">
    <span className="eyebrow">API-BACKED PRODUCT</span>
    <h2>{item.name}</h2>
    <Pill tone="positive">Published</Pill>
    <div className="detail-divider"/>
    <div className="callout"><ShieldCheck size={16}/>Read-only product information from the local development API.</div>
    <p className="muted">There is no live purchase, download, activation, verified hardware compatibility or commercial license for this record.</p>
    <Button variant="secondary" onClick={()=>{window.location.hash="/products"}}><ArrowLeft size={15}/>Back to catalog</Button>
   </div>
  </div>:null}
 </main>
}
