import {useEffect,useState} from "react";
import {FlaskConical,RefreshCcw,ShieldCheck} from "lucide-react";
import {Button,Card,Empty,Pill} from "@dma-hub/ui";
import {api} from "./api";
import type {SandboxOrder,SandboxWebhookEvent,Session} from "./api";

export function AdminSandboxOrders({session}:{session:Session|null}){
 const [orders,setOrders]=useState<SandboxOrder[]>([]);
 const [webhooks,setWebhooks]=useState<SandboxWebhookEvent[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const token=session?.token||"";
 const admin=session?.user.role==="admin";
 async function load(){
  if(!admin)return;
  setBusy(true);setError("");
  try{const [orders,events]=await Promise.all([api.adminTestOrders(token),api.sandboxWebhookEvents(token)]);setOrders(orders.items);setWebhooks(events.items)}
  catch(e){setError(e instanceof Error?e.message:"Cannot retrieve test orders")}
  finally{setBusy(false)}
 }
 useEffect(()=>{
  if(!admin){setOrders([]);setWebhooks([]);return}
  let active=true;
  setBusy(true);setError("");
  Promise.all([api.adminTestOrders(token),api.sandboxWebhookEvents(token)]).then(([r,w])=>{if(active){setOrders(r.items);setWebhooks(w.items)}})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:"Cannot retrieve sandbox orders")})
   .finally(()=>{if(active)setBusy(false)});
  return()=>{active=false};
 },[admin,token]);
 async function act(order:SandboxOrder,action:"fulfill"|"cancel"){
  const explanation=action==="fulfill"?
   "Create an expiring 30-day SANDBOX entitlement? This does NOT verify payment or issue a commercial license.":
   "Cancel this pending TEST order? This action does not refund or charge anything.";
  if(!window.confirm(explanation))return;
  setBusy(true);setError("");setNotice("");
  try{
   const r=action==="fulfill"?await api.fulfillTestOrder(token,order.id):await api.cancelTestOrder(token,order.id);
   setNotice(r.replayed?"Order was already in that state; no duplicate action occurred.":action==="fulfill"?"Sandbox test entitlement created, audited and linked to the order.":"Pending sandbox order cancelled.");
   const [orders,events]=await Promise.all([api.adminTestOrders(token),api.sandboxWebhookEvents(token)]);setOrders(orders.items);setWebhooks(events.items);
  }catch(e){setError(e instanceof Error?e.message:"Operation failed")}
  finally{setBusy(false)}
 }
 return <div>
  <div className="page-head"><div><h1>Test Order Operations</h1><p>Explicit internal order review and sandbox fulfillment. No live payment processing.</p></div>
   <Button variant="secondary" onClick={()=>void load()} disabled={!admin||busy}><RefreshCcw size={15}/>Refresh</Button></div>
  <div className="callout"><FlaskConical size={18}/>Sandbox test queue — never use these records as proof of payment. The backend alone performs authorized, auditable fulfillment.</div>
  {!session?<Card title="Authentication required"><Empty title="Sign in to the local API" description="Admin sessions are required to inspect the test order queue."/></Card>:
   !admin?<Card title="Access denied"><Empty title="Administrator role required" description="Customer accounts cannot inspect or fulfill another user's test orders."/></Card>:
   <>
    {error&&<div className="inline-message" role="alert">{error}</div>}
    {notice&&<div className="inline-message" role="status">{notice}</div>}
    <Card title="Sandbox order queue">
     {busy&&!orders.length?<p className="muted">Loading…</p>:orders.length===0?<Empty title="No test orders" description="Created sandbox orders will appear here."/>:
      <div className="rows">{orders.map(o=><div key={o.id} className="item-row">
       <div className="row-grow"><strong>{o.id.slice(0,8)} · Customer {o.userId?.slice(0,8)||"unknown"}</strong>
        <small>USD {(o.amountMinor/100).toFixed(2)} · {o.billingPeriod} · {new Date(o.createdAt).toLocaleString()}</small></div>
       <Pill tone={o.state==="test_fulfilled"?"positive":o.state==="pending"?"warning":"neutral"}>{o.state}</Pill>
       {o.state==="pending"&&<><Button variant="secondary" disabled={busy} onClick={()=>void act(o,"fulfill")}><ShieldCheck size={14}/>Fulfill test</Button>
        <Button variant="secondary" disabled={busy} onClick={()=>void act(o,"cancel")}>Cancel</Button></>}
      </div>)}</div>}
    </Card>
    <Card title="Signed sandbox event inbox">
      <p className="muted">HMAC-authenticated test notifications only. These records do not establish payment, settle orders or issue licenses.</p>
      {webhooks.length===0?<Empty title="No signed test events" description="Received events will appear when the local API has a configured sandbox signing secret."/>:
       <div className="rows">{webhooks.map(event=><div key={event.eventId} className="item-row">
        <div className="row-grow"><strong>{event.kind.replace("sandbox.","")}</strong>
         <small>Test order {event.orderId.slice(0,8)} · Received {new Date(event.receivedAt).toLocaleString()}</small></div>
        <Pill tone="neutral">Recorded only</Pill>
       </div>)}</div>}
    </Card>
   </>
  }
 </div>;
}
