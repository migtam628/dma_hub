import {useCallback,useEffect,useState} from "react";
import {RefreshCcw,ShieldCheck,Clock,AlertCircle} from "lucide-react";
import {Button,Card,Empty,Pill} from "@dma-hub/ui";
import {api} from "./api";
import type {Entitlement} from "./api";

const labels:Record<Entitlement["accessStatus"],string>={
 active:"Active test grant",
 scheduled:"Scheduled",
 expired:"Expired",
 revoked:"Revoked",
 product_unavailable:"Product unavailable"
};
export function EntitlementLibrary({token}:{token:string}){
 const [items,setItems]=useState<Entitlement[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [revision,setRevision]=useState(0);
 const refresh=useCallback(()=>setRevision(x=>x+1),[]);
 useEffect(()=>{
  let current=true;
  setLoading(true);setError("");
  api.entitlements(token).then(data=>{if(current)setItems(data.items)}).catch(err=>{
   if(current){setItems([]);setError(err instanceof Error?err.message:"Cannot load entitlements")}
  }).finally(()=>{if(current)setLoading(false)});
  return()=>{current=false};
 },[token,revision]);
 return <div className="entitlement-library">
  <div className="page-head"><div><h1>My Software</h1><p>Access assigned to your signed-in local-development account.</p></div>
   <Button variant="secondary" onClick={refresh} disabled={loading}><RefreshCcw size={16}/>Refresh</Button></div>
  <div className="callout"><ShieldCheck size={18}/>This list shows real records from the local API, but only <strong>manual test grants</strong>. No payment, installer activation or commercial license is issued.</div>
  <Card title="My test entitlements">
   {loading?<p className="muted">Checking account access with the local API...</p>:
    error?<div className="callout"><AlertCircle size={18}/>Unable to retrieve account access: {error}. No entitlement status was verified.</div>:
    items.length===0?<Empty title="No test grants assigned" description="Your account has no API-backed test entitlements. Demo catalog entries do not grant access."/>:
    <div className="rows">{items.map(item=><div className="item-row" key={item.id}>
      <div className="item-symbol"><Clock size={18}/></div>
      <div className="row-grow"><strong>Product {item.productId.slice(0,8)}</strong>
      <small>Manual test grant · Expires {new Date(item.expiresAt).toLocaleString()}</small></div>
      <Pill tone={item.accessAllowed?"positive":item.accessStatus==="scheduled"?"cyan":"warning"}>{labels[item.accessStatus]}</Pill>
    </div>)}</div>
   }
  </Card>
 </div>
}
