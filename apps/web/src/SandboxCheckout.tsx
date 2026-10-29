import {useEffect,useState} from "react";
import {RefreshCcw,FlaskConical,ShieldAlert} from "lucide-react";
import {Button,Card,Empty,Pill} from "@dma-hub/ui";
import {api} from "./api";
import type {PublicPlan,SandboxOrder,StripeTestCheckout} from "./api";

const money=(cents:number)=>"USD "+(cents/100).toFixed(2);
export function SandboxCheckout({token}:{token:string}){
 const [plans,setPlans]=useState<PublicPlan[]>([]);
 const [orders,setOrders]=useState<SandboxOrder[]>([]);
 const [stripeReady,setStripeReady]=useState(false);
 const [stripeSessions,setStripeSessions]=useState<StripeTestCheckout[]>([]);
 const [loading,setLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [info,setInfo]=useState("");
 const [retry,setRetry]=useState<{planId:string;key:string}|null>(null);
 async function refresh(){
  setLoading(true);setError("");
  try{
   const [p,o,c,s]=await Promise.all([api.publicPricing(),api.testOrders(token),api.stripeTestCapabilities(),api.stripeTestCheckouts(token)]);
   setPlans(p.items);setOrders(o.items);setStripeReady(c.available);setStripeSessions(s.items);
  }catch(e){setError(e instanceof Error?e.message:"The local API is unavailable")}
  finally{setLoading(false)}
 }
 useEffect(()=>{
  let active=true;setLoading(true);setError("");
  Promise.all([api.publicPricing(),api.testOrders(token),api.stripeTestCapabilities(),api.stripeTestCheckouts(token)])
   .then(([p,o,c,s])=>{if(active){setPlans(p.items);setOrders(o.items);setStripeReady(c.available);setStripeSessions(s.items)}})
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
 async function startStripe(orderId:string){
  if(!stripeReady||!window.confirm("Open Stripe TEST Checkout for this one-time sandbox order? Only Stripe test payment methods may be used, and no software access will be granted automatically."))return;
  setBusy(true);setError("");setInfo("");
  try{
   const result=await api.startStripeTestCheckout(token,orderId);
   setInfo(result.replayed?"Existing Stripe test Checkout returned.":"Stripe test Checkout is ready. Open the link shown under the order. This does not issue a license.");
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Stripe test Checkout unavailable")}
  finally{setBusy(false)}
 }
 return <div>
  <div className="page-head"><div><h1>Sandbox orders</h1><p>Internal checkout-flow QA. No billing, invoices or subscriptions are connected.</p></div>
   <Button variant="secondary" disabled={loading||busy} onClick={()=>void refresh()}><RefreshCcw size={15}/>Refresh</Button></div>
  <div className="callout"><FlaskConical size={18}/>DEVELOPMENT ONLY: creating a sandbox order never charges you or grants access. {stripeReady?"Stripe TEST-mode Checkout is available for eligible one-time sandbox orders; successful tests cannot issue commercial licenses.":"Stripe Checkout is disabled until test-only server credentials are configured."}</div>
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
      <small>Created {new Date(o.createdAt).toLocaleString()} · {o.state==="pending"?"No access yet":o.state==="test_fulfilled"?"30-day test grant created":"Cancelled"}</small>
      {stripeSessions.filter(s=>s.orderId===o.id).map(s=><small key={s.id}>Stripe TEST: {s.state} {s.checkoutUrl&&<a href={s.checkoutUrl} target="_blank" rel="noopener noreferrer">Open Stripe test Checkout</a>}</small>)}
      </div>
      {stripeReady&&o.state==="pending"&&o.billingPeriod==="one_time"&&!stripeSessions.some(s=>s.orderId===o.id&&s.state==="test_paid_observed")&&
       <Button variant="secondary" disabled={busy||loading} onClick={()=>void startStripe(o.id)}>Prepare Stripe TEST Checkout</Button>}
      <Pill tone={o.state==="test_fulfilled"?"positive":o.state==="pending"?"warning":"neutral"}>{o.state}</Pill>
     </div>)}</div>}
   </Card>
  </div>
 </div>;
}
