import {randomUUID} from "node:crypto";
// Local API only. No automatic delivery, promised response time or email support.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATEGORIES=new Set(["setup","hardware","account","orders","other"]);
const STATES=new Set(["open","awaiting_staff","awaiting_customer","resolved","closed"]);
const safeText=(x,min,max)=>typeof x==="string"&&x.trim().length>=min&&x.trim().length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(x);
const matchVersion=req=>{const x=req.headers["if-match"];return typeof x==="string"&&/^[1-9][0-9]*$/.test(x)&&Number.isSafeInteger(Number(x))?Number(x):null};
const result=(status,payload)=>({status,payload});
function tx(db,work){db.exec("BEGIN IMMEDIATE");try{const v=work();db.exec("COMMIT");return v}catch(e){if(db.isTransaction)db.exec("ROLLBACK");throw e}}
const row=r=>({id:r.id,category:r.category,subject:r.subject,state:r.state,version:r.version,createdAt:r.created_at,updatedAt:r.updated_at,customerId:r.customer_id,...(r.email?{customerEmail:r.email}:{})});
export function createSupportTickets({db,clock,audit,readBody}){
 const get=id=>db.prepare("SELECT * FROM support_tickets WHERE id=?").get(id);
 const access=(ticket,user)=>ticket&&(ticket.customer_id===user.id||user.role==="admin");
 function history(id){return db.prepare(`SELECT m.id,m.body,m.created_at,m.author_id,u.role AS author_role FROM support_messages m JOIN users u ON u.id=m.author_id WHERE m.ticket_id=? ORDER BY m.created_at ASC,m.rowid ASC LIMIT 200`).all(id).map(x=>({id:x.id,body:x.body,createdAt:x.created_at,authorRole:x.author_role,authorId:x.author_id}))}
 function log(id,version,from,to,actor,at){db.prepare("INSERT INTO support_events(id,ticket_id,version,from_state,to_state,actor_id,created_at) VALUES(?,?,?,?,?,?,?)").run(randomUUID(),id,version,from,to,actor,at)}
 async function route(path,req,user){
  if(path==="/v1/support/tickets"&&(req.method==="GET"||req.method==="POST")){
   if(req.method==="GET")return result(200,{items:db.prepare("SELECT * FROM support_tickets WHERE customer_id=? ORDER BY updated_at DESC,id DESC LIMIT 100").all(user.id).map(row),backend:"local",notificationsConfigured:false});
   const b=await readBody(req);
   if(!CATEGORIES.has(b.category)||!safeText(b.subject,5,140)||!safeText(b.message,10,4000))return result(422,{error:"invalid_support_ticket"});
   return tx(db,()=>{
    const active=db.prepare("SELECT COUNT(*) AS count FROM support_tickets WHERE customer_id=? AND state NOT IN ('closed','resolved')").get(user.id).count;
    if(active>=10)return result(429,{error:"active_ticket_limit"});
    const id=randomUUID(),at=clock();
    db.prepare("INSERT INTO support_tickets(id,customer_id,category,subject,state,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").run(id,user.id,b.category,b.subject.trim(),"open",1,at,at);
    db.prepare("INSERT INTO support_messages(id,ticket_id,author_id,body,created_at) VALUES(?,?,?,?,?)").run(randomUUID(),id,user.id,b.message.trim(),at);
    log(id,1,null,"open",user.id,at);audit(user.id,"support.created",id);
    return result(201,{id,state:"open",version:1,createdAt:at,notificationsConfigured:false});
   });
  }
  if(path==="/v1/admin/support/tickets"&&req.method==="GET"){
   if(user.role!=="admin")return result(403,{error:"forbidden"});
   return result(200,{items:db.prepare("SELECT t.*,u.email FROM support_tickets t JOIN users u ON u.id=t.customer_id ORDER BY t.updated_at DESC,t.id DESC LIMIT 200").all().map(row)});
  }
  const idMatch=path.match(/^\/v1\/support\/tickets\/([0-9a-f-]{36})$/i);
  if(idMatch&&req.method==="GET"){
   const ticket=get(idMatch[1]);
   if(!access(ticket,user))return result(404,{error:"not_found"});
   return result(200,{...row(ticket),messages:history(ticket.id),notificationsConfigured:false});
  }
  const reply=path.match(/^\/v1\/support\/tickets\/([0-9a-f-]{36})\/replies$/i);
  if(reply&&req.method==="POST"){
   const version=matchVersion(req);if(!version)return result(428,{error:"ticket_version_required"});
   const b=await readBody(req);if(!safeText(b.message,5,4000))return result(422,{error:"invalid_support_message"});
   return tx(db,()=>{
    const ticket=get(reply[1]);if(!access(ticket,user))return result(404,{error:"not_found"});
    if(ticket.version!==version)return result(409,{error:"version_conflict"});
    if(ticket.state==="closed")return result(409,{error:"closed_ticket"});
    if(db.prepare("SELECT COUNT(*) AS count FROM support_messages WHERE ticket_id=?").get(ticket.id).count>=200)return result(429,{error:"message_limit"});
    const state=user.role==="admin"?"awaiting_customer":"awaiting_staff",at=clock();
    const changed=db.prepare("UPDATE support_tickets SET state=?,version=version+1,updated_at=? WHERE id=? AND version=?").run(state,at,ticket.id,version);
    if(!changed.changes)return result(409,{error:"version_conflict"});
    db.prepare("INSERT INTO support_messages(id,ticket_id,author_id,body,created_at) VALUES(?,?,?,?,?)").run(randomUUID(),ticket.id,user.id,b.message.trim(),at);
    log(ticket.id,version+1,ticket.state,state,user.id,at);audit(user.id,"support.replied",ticket.id);
    return result(201,{id:ticket.id,state,version:version+1,updatedAt:at,notificationsConfigured:false});
   });
  }
  const setState=path.match(/^\/v1\/admin\/support\/tickets\/([0-9a-f-]{36})$/i);
  if(setState&&req.method==="PATCH"){
   if(user.role!=="admin")return result(403,{error:"forbidden"});
   const version=matchVersion(req);if(!version)return result(428,{error:"ticket_version_required"});
   const b=await readBody(req);if(!STATES.has(b.state)||b.state==="open")return result(422,{error:"invalid_ticket_state"});
   return tx(db,()=>{
    const ticket=get(setState[1]);if(!ticket)return result(404,{error:"not_found"});
    if(ticket.version!==version)return result(409,{error:"version_conflict"});
    if(ticket.state===b.state)return result(409,{error:"already_in_state"});
    const at=clock();
    const changed=db.prepare("UPDATE support_tickets SET state=?,version=version+1,updated_at=? WHERE id=? AND version=?").run(b.state,at,ticket.id,version);
    if(!changed.changes)return result(409,{error:"version_conflict"});
    log(ticket.id,version+1,ticket.state,b.state,user.id,at);audit(user.id,"support.state."+b.state,ticket.id);
    return result(200,{id:ticket.id,state:b.state,version:version+1,updatedAt:at});
   });
  }
  return null;
 }
 return {route};
}
