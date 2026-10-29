import {useEffect,useState} from "react";
import {RefreshCcw,FlaskConical,ShieldAlert} from "lucide-react";
import {Button,Card,Empty,Pill} from "@dma-hub/ui";
import {api} from "./api";
import type {PublicPlan,SandboxOrder} from "./api";

const money=(cents:number)=>"USD "+(cents/100).toFixed(2);
export function SandboxCheckout({token}:{token:string}){
 const [plans,setPlans]=useState<PublicPlan[]>([]);
 const [orders,setOrders]=useState<SandboxOrder[]>([]);
 const [loading,setLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [info,setInfo]=useState("");
 const [retry,setRetry]=useState<{planId:string;key:string}|null>(null);
 async function refresh(){
  setLoading(true);setError("");
  try{
   const [p,o]=await Promise.all([api.publicPricing(),api.testOrders(token)]);
   setPlans(p.items);setOrders(o.items);
  }catch(e){setError(e instanceof Error?e.message:"The local API is unavailable")}
  finally{setLoading(false)}
 }
 useEffect(()=>{
  let active=true;setLoading(true);setError("");
  Promise.all([api.publicPricing(),api.testOrders(token)])
   .then(([p,o])=>{if(active){setPlans(p.items);setOrders(o.items)}})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:"The API is unavailable")})
   .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[token]);
 async function create(planId:string){
  if(!window.confirm("Create a TEST-ONLY order? No payment will occur and no entitlement is granted until an admin fulfills it."))return;
  setBusy(true);setError("");setInfo("");
  const key=retry?.planId===planId?retry.key:crypto.randomUUID().replaceAll("-","");
  setRetry({planId,key});
  try{
   const order=await api.createTestOrder(token,planId,key);
   setRetry(null);
   setInfo(order.replayed?"Existing test order returned. No duplicate created.":"Sandbox order recorded. No payment was collected or access granted.");
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to create test order")}
  finally{setBusy(false)}
 }
 return <div>
  <div className="page-head"><div><h1>Sandbox orders</h1><p>Internal checkout-flow QA. No billing, invoices or subscriptions are connected.</p></div>
   <Button variant="secondary" disabled={loading||busy} onClick={()=>void refresh()}><RefreshCcw size={15}/>Refresh</Button></div>
  <div className="callout"><FlaskConical size={18}/>DEVELOPMENT ONLY: prices shown are configuration snapshots; creating a test order never charges you or grants access.</div>
  {error&&<div className="inline-message" role="alert"><ShieldAlert size={15}/>{error}</div>}
  {info&&<div className="inline-message" role="status">{info}</div>}
  <div className="two-col"><Card title="Available test plans">
   {loading?<p className="muted">Loading sandbox plan data…</p>:plans.length===0?<Empty title="No active plans" description="An admin must publish a product and activate a plan in the local API."/>:
    <div className="rows">{plans.map(p=><div className="item-row" key={p.id}>
      <div className="row-grow"><strong>{p.productName} — {p.name}</strong><small>{money(p.amountMinor)} · {p.billingPeriod} (metadata only)</small></div>
      <Button variant="secondary" disabled={busy||loading} onClick={()=>void create(p.id)}>Create test order</Button>
    </div>)}</div>}
   </Card>
   <Card title="My sandbox order history">
    {loading?<p className="muted">Loading order records…</p>:orders.length===0?<Empty title="No sandbox orders" description="Test order records for this account will appear here."/>:
     <div className="rows">{orders.map(o=><div key={o.id} className="item-row">
      <div className="row-grow"><strong>Order {o.id.slice(0,8)} · {money(o.amountMinor)}</strong>
      <small>Created {new Date(o.createdAt).toLocaleString()} · {o.state==="pending"?"No access yet":o.state==="test_fulfilled"?"30-day test grant created":"Cancelled"}</small></div>
      <Pill tone={o.state==="test_fulfilled"?"positive":o.state==="pending"?"warning":"neutral"}>{o.state}</Pill>
     </div>)}</div>}
   </Card>
  </div>
 </div>;
}
