import {useEffect,useState} from "react";
import {RefreshCcw,ShieldCheck} from "lucide-react";
import {Button,Card,Empty,Pill} from "@dma-hub/ui";
import {api} from "./api";
import type {AuditEvent,Session} from "./api";

export function AdminAuditLog({session}:{session:Session|null}){
 const admin=session?.user.role==="admin",token=session?.token||"";
 const [items,setItems]=useState<AuditEvent[]>([]);
 const [next,setNext]=useState<number|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!admin){setItems([]);setNext(null);return}
  let current=true;
  setLoading(true);setError("");
  api.auditLog(token).then(result=>{
   if(current){setItems(result.items);setNext(result.nextOffset)}
  }).catch(e=>{if(current){setItems([]);setNext(null);setError(e instanceof Error?e.message:"Unable to retrieve audit records")}})
   .finally(()=>{if(current)setLoading(false)});
  return()=>{current=false}
 },[token,admin,revision]);
 async function more(){
  if(!admin||next===null)return;
  setLoading(true);setError("");
  try{const r=await api.auditLog(token,next);
   setItems(old=>[...old,...r.items]);setNext(r.nextOffset);
  }catch(e){setError(e instanceof Error?e.message:"Audit log request failed")}
  finally{setLoading(false)}
 }
 return <div className="admin-audit-log">
  <div className="page-head"><div><h1>Audit Log</h1><p>Read-only history of local API account, catalog and test-order actions.</p></div>
  <Button variant="secondary" disabled={!admin||loading} onClick={()=>setRevision(x=>x+1)}><RefreshCcw size={15}/>Refresh</Button></div>
  <div className="callout"><ShieldCheck size={18}/>Audit records show action metadata and internal identifiers. This view cannot change any records. The local API is not production-hosted.</div>
  {!session?<Card title="Sign-in required"><Empty title="Sign in through Account" description="A server-issued admin session is required for audit access."/></Card>:
   !admin?<Card title="Forbidden"><Empty title="Administrator access required" description="Only authorized staff can inspect the audit trail."/></Card>:
   <Card title="Recent events" action={<Pill tone="neutral">{items.length} loaded</Pill>}>
    {error&&<div className="inline-message" role="alert">{error}</div>}
    {loading&&!items.length?<p className="muted">Loading audit events…</p>:
     !items.length?<Empty title="No audit records" description="API actions will appear here when recorded. This is a local-only system."/>:
     <div className="table-scroll"><table><thead><tr><th>Timestamp</th><th>Action</th><th>Actor</th><th>Target</th></tr></thead>
      <tbody>{items.map(event=><tr key={event.id}>
       <td>{new Date(event.createdAt).toLocaleString()}</td>
       <td><strong>{event.action}</strong></td><td><small>{event.actorId?event.actorId.slice(0,12):"system"}</small></td>
       <td><small>{event.targetId?event.targetId.slice(0,12):"—"}</small></td>
      </tr>)}</tbody></table></div>}
    {next!==null&&<div className="form-actions"><Button variant="secondary" disabled={loading} onClick={()=>void more()}>Load older events</Button></div>}
   </Card>}
 </div>;
}
