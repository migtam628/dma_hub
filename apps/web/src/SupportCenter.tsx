import {useEffect,useState} from "react";
import type {FormEvent} from "react";
import {ArrowRight,HelpCircle,MessageSquare,RefreshCcw,Send,ShieldCheck} from "lucide-react";
import {Button,Card,Empty,Pill} from "@dma-hub/ui";
import {api,ApiError} from "./api";
import type {Session,SupportCategory,SupportState,SupportTicket,SupportThread} from "./api";

const categories:[SupportCategory,string][]=[
 ["setup","Setup guidance"],["hardware","Hardware questions"],["account","Account access"],
 ["orders","Orders and billing"],["other","Other"]
];
function failure(error:unknown){
 if(error instanceof ApiError){
  if(error.status===0)return "The local API is not connected. Nothing was saved.";
  if(error.status===401)return "Your local API session expired. Please sign in again.";
  if(error.status===409)return "Ticket changed or closed. Refresh before submitting.";
  if(error.status===403)return "The server does not allow this action.";
  if(error.status===429)return "This account or ticket has reached the current rate or activity limit.";
  return error.message.replaceAll("_"," ");
 }
 return "Support action failed; please refresh and check before retrying.";
}
export function SupportCenter({session,admin=false}:{session:Session|null;admin?:boolean}){
 const token=session?.token??"";
 const canAdmin=admin&&session?.user.role==="admin";
 const [tickets,setTickets]=useState<SupportTicket[]>([]);
 const [selected,setSelected]=useState<string>("");
 const [thread,setThread]=useState<SupportThread|null>(null);
 const [category,setCategory]=useState<SupportCategory>("setup");
 const [subject,setSubject]=useState(""),[message,setMessage]=useState(""),[reply,setReply]=useState("");
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 async function refresh(id=selected){
  if(!token)return;
  setLoading(true);
  try{
   const collection=canAdmin?await api.adminSupportTickets(token):await api.supportTickets(token);
   setTickets(collection.items);
   const target=id&&collection.items.some(t=>t.id===id)?id:"";
   setSelected(target);setThread(target?await api.supportThread(token,target):null);
   setNotice("");
  }catch(e){setNotice(failure(e));setTickets([]);setThread(null)}
  finally{setLoading(false)}
 }
 useEffect(()=>{
  if(!token){setTickets([]);setThread(null);setSelected("");return}
  void refresh("");
 },[token,canAdmin]);
 async function openTicket(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy||!token)return;
  setBusy(true);setNotice("");
  try{
   const created=await api.createSupportTicket(token,{category,subject:subject.trim(),message:message.trim()});
   setSubject("");setMessage("");await refresh(created.id);setNotice("Ticket created in the local API. No email or external notification was sent.");
  }catch(error){setNotice(failure(error))}
  finally{setBusy(false)}
 }
 async function choose(ticket:SupportTicket){
  setSelected(ticket.id);setLoading(true);setNotice("");
  try{setThread(await api.supportThread(token,ticket.id))}
  catch(error){setThread(null);setNotice(failure(error))}
  finally{setLoading(false)}
 }
 async function send(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!thread||!token||busy)return;
  setBusy(true);setNotice("");
  try{await api.replySupportTicket(token,thread,reply.trim());setReply("");await refresh(thread.id);
   setNotice("Reply saved in the local API. Notifications are not configured.")}
  catch(error){setNotice(failure(error))}
  finally{setBusy(false)}
 }
 async function change(status:SupportState){
  if(!thread||!canAdmin||busy)return;
  if(!window.confirm("Change ticket status to "+status.replaceAll("_"," ")+"? The event is audit logged."))return;
  setBusy(true);setNotice("");
  try{await api.setSupportStatus(token,thread,status);await refresh(thread.id);setNotice("Status updated and recorded in the audit history.")}
  catch(error){setNotice(failure(error))}
  finally{setBusy(false)}
 }
 return <div className="support-center">
  <div className="page-head"><div><h1>{admin?"Support Operations":"Support Center"}</h1>
   <p>{admin?"Administer real customer tickets from the authenticated local API.":"Create and follow a private support ticket in the connected development API."}</p></div>
   <Button variant="secondary" disabled={!token||loading||busy} onClick={()=>void refresh()}><RefreshCcw size={15}/>Refresh</Button>
  </div>
  <div className="callout"><ShieldCheck size={16}/>Tickets are stored in the local API database. GitHub Pages does not host a support backend; no email, Discord ticket sync, 24/7 staffing or response-time guarantee is configured. Never submit passwords or secret keys.</div>
  {!session?<Card title="Sign in required"><Empty title="Local API account required" description="Open Account in the customer workspace and connect to the local API before opening tickets."/><a className="text-link" href="#/account">Go to Account <ArrowRight size={13}/></a></Card>:
   admin&&!canAdmin?<Card title="Restricted"><Empty title="Admin role required" description="Only authorized support operators may view customer support queues."/></Card>:
   <>
    {notice?<p role="status" className="inline-message">{notice}</p>:null}
    {!admin?<Card title="Open a support ticket">
     <form className="form-stack support-form" onSubmit={event=>void openTicket(event)}>
      <label className="field">Topic<select value={category} onChange={e=>setCategory(e.target.value as SupportCategory)}>
       {categories.map(([value,label])=><option value={value} key={value}>{label}</option>)}
      </select></label>
      <label className="field">Subject<input required minLength={5} maxLength={140} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Brief description of the issue"/></label>
      <label className="field">What happened?<textarea required minLength={10} maxLength={4000} rows={4} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Explain the issue, app version, and non-sensitive troubleshooting details."/></label>
      <Button type="submit" disabled={busy||loading||subject.trim().length<5||message.trim().length<10}><MessageSquare size={15}/>Create ticket</Button>
     </form>
    </Card>:null}
    <div className="support-grid">
     <Card title={admin?"Customer ticket queue":"Your tickets"}>
      {loading&&tickets.length===0?<p role="status">Loading tickets…</p>:tickets.length===0?<Empty title="No tickets recorded" description="The API currently contains no relevant tickets; demo tickets are not substituted."/>:
       <div className="support-ticket-list">{tickets.map(t=><button type="button" className={selected===t.id?"support-ticket active":"support-ticket"} key={t.id} onClick={()=>void choose(t)}>
        <span><strong>{t.subject}</strong><small>{categories.find(c=>c[0]===t.category)?.[1]} · Updated {new Date(t.updatedAt).toLocaleString()}</small>
         {canAdmin&&t.customerEmail?<small>{t.customerEmail}</small>:null}</span>
        <Pill tone={t.state==="resolved"||t.state==="closed"?"neutral":"warning"}>{t.state.replaceAll("_"," ")}</Pill>
       </button>)}</div>}
     </Card>
     <Card title="Private conversation">
      {!thread?<Empty title="Select a ticket" description="Choose a ticket to view the conversation and its current server state."/>:
       <div className="support-thread">
        <div className="support-thread-head"><h3>{thread.subject}</h3><Pill tone="neutral">{thread.state.replaceAll("_"," ")}</Pill></div>
        <small>Ticket {thread.id.slice(0,8)} · v{thread.version} · No notifications configured</small>
        <div className="support-messages">{thread.messages.map(m=><div className={m.authorRole==="admin"?"support-message staff":"support-message"} key={m.id}>
         <div><strong>{m.authorRole==="admin"?"Support operator":"Customer"}</strong><time>{new Date(m.createdAt).toLocaleString()}</time></div>
         <p>{m.body}</p>
        </div>)}</div>
        {canAdmin?<div className="support-state-actions">{(["awaiting_staff","awaiting_customer","resolved","closed"] as SupportState[]).filter(s=>s!==thread.state).map(st=><Button key={st} variant="secondary" disabled={busy||loading} onClick={()=>void change(st)}>{st.replaceAll("_"," ")}</Button>)}</div>:null}
        {thread.state==="closed"?<p className="muted">Ticket is closed. An administrator must reopen it before new messages can be added.</p>:
         <form className="form-stack support-reply" onSubmit={event=>void send(event)}>
          <label className="field">Reply<textarea required minLength={5} maxLength={4000} rows={3} value={reply} onChange={e=>setReply(e.target.value)} placeholder="Write your response without passwords or private credentials."/></label>
          <Button type="submit" disabled={busy||loading||reply.trim().length<5}><Send size={14}/>Save reply</Button>
         </form>}
       </div>}
     </Card>
    </div>
   </>}
 </div>;
}
