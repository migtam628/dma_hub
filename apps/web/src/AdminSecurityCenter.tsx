import {useEffect,useState} from "react";
import {RefreshCcw,ShieldAlert} from "lucide-react";
import {Button,Card,Empty,Pill} from "@dma-hub/ui";
import {api} from "./api";
import type {SecurityOverview,Session} from "./api";

const niceScope=(value:string)=>value.replaceAll("_"," ");
const count=(value:number)=>value.toLocaleString();
export function AdminSecurityCenter({session}:{session:Session|null}){
 const admin=session?.user.role==="admin",token=session?.token||"";
 const [overview,setOverview]=useState<SecurityOverview|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!admin){setOverview(null);setError("");return}
  let current=true;setError("");setLoading(true);
  api.securityOverview(token)
   .then(result=>{if(current)setOverview(result)})
   .catch(e=>{if(current){setOverview(null);setError(e instanceof Error?e.message:"Unable to fetch security metrics")}})
   .finally(()=>{if(current)setLoading(false)});
  return()=>{current=false};
 },[admin,token,revision]);
 return <div className="admin-security">
  <div className="page-head"><div><h1>Security Monitoring</h1>
   <p>Aggregate authentication rate-limit activity from the connected local API.</p></div>
   <Button variant="secondary" disabled={!admin||loading} onClick={()=>setRevision(n=>n+1)}>
    <RefreshCcw size={15}/>Refresh</Button></div>
  <div className="callout"><ShieldAlert size={18}/>
   Local SQLite monitoring only. This is not a security clearance, intrusion-detection service or distributed protection.
   Counts represent active limiter windows, not lifetime traffic or unique people.</div>
  {!session?<Card title="Sign in required"><Empty title="Authenticate first" description="The local API requires a server-issued administrator session."/></Card>:
   !admin?<Card title="Access denied"><Empty title="Admin role required" description="Customer accounts cannot view authentication monitoring."/></Card>:
   <>
    {error&&<div role="alert" className="inline-message">{error}. Metrics were not verified.</div>}
    {loading&&!overview?<p className="muted">Loading rate-limit observations…</p>:
     overview?<><div className="two-col">
      <Card title="Requests rejected"><div className="stat-value">{count(overview.totalRejectedAttempts)}</div>
       <p className="muted">Attempts above policy thresholds in current SQLite rate windows</p></Card>
      <Card title="Blocked rate-limit buckets"><div className="stat-value">{count(overview.totalBlockedKeys)}</div>
       <p className="muted">Blocked identifier buckets; not distinct customers or devices</p></Card>
     </div>
     <Card title="Active protection by scope">
      <div className="table-scroll"><table><thead><tr><th>Protection scope</th><th>Limit</th><th>Active buckets</th><th>Requests</th><th>Rejected</th></tr></thead>
       <tbody>{overview.scopes.map(s=><tr key={s.scope}>
        <td><strong>{niceScope(s.scope)}</strong></td>
        <td>{s.limit} / {Math.round(s.windowMs/60000)} min</td>
        <td>{count(s.activeKeys)}</td><td>{count(s.attemptsInActiveWindows)}</td>
        <td><Pill tone={s.rejectedAttemptsInActiveWindows>0?"warning":"neutral"}>{count(s.rejectedAttemptsInActiveWindows)}</Pill></td>
       </tr>)}</tbody></table></div>
     </Card>
     <Card title="Authentication activity (last 24 hours)">
      <div className="rows">{overview.authAuditLast24Hours.map(a=><div key={a.action} className="item-row">
       <div className="row-grow"><strong>{a.action}</strong></div><Pill tone="neutral">{count(a.count)}</Pill>
      </div>)}</div>
      <p className="muted">Successful audited actions only; failed sign-in attempts are reflected in limiter buckets, not the audit list.</p>
     </Card>
     <p className="muted">Snapshot: {new Date(overview.generatedAt).toLocaleString()} · Per-database metrics only · Cross-host protection: unavailable</p>
     </>:!error?<Card title="No metrics"><Empty title="Nothing retrieved" description="The connected local API did not return monitoring data."/></Card>:null}
   </>
  }
 </div>;
}
