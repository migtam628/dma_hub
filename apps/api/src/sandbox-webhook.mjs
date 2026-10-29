import {createHmac,createHash,timingSafeEqual} from "node:crypto";

const MAX_BODY=16*1024;
const WINDOW_MS=5*60*1000;
const EVENT=/^evt_[A-Za-z0-9_-]{8,60}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS=new Set(["sandbox.payment_observed","sandbox.payment_failed"]);

function readRawBody(req){
 return new Promise((resolve,reject)=>{
  const chunks=[];
  let bytes=0,over=false;
  if(Number(req.headers["content-length"]||0)>MAX_BODY){
   req.resume();reject(Object.assign(new Error("Payload exceeds sandbox event limit"),{status:413}));return
  }
  req.on("data",chunk=>{bytes+=chunk.length;if(bytes>MAX_BODY){over=true;chunks.length=0}else if(!over)chunks.push(chunk)});
  req.on("end",()=>over?reject(Object.assign(new Error("Payload exceeds sandbox event limit"),{status:413})):resolve(Buffer.concat(chunks)));
  req.on("error",reject);
 });
}
export function signSandboxEvent(secret,timestamp,rawBody){
 return createHmac("sha256",secret).update(String(timestamp)+".").update(rawBody).digest("hex");
}
export function createSandboxWebhook({db,clock,audit,secret}){
 if(secret!==null&&secret!==undefined&&(typeof secret!=="string"||secret.length<32||secret.length>1024)){
  throw new Error("DMA_SANDBOX_WEBHOOK_SECRET must be at least 32 characters (or unset)");
 }
 const enabled=typeof secret==="string";
 async function receive(req){
  if(!enabled)return {status:503,payload:{error:"sandbox_webhooks_disabled"}};
  const stamp=req.headers["x-dma-timestamp"],signature=req.headers["x-dma-signature"];
  if(typeof stamp!=="string"||!/^[1-9][0-9]{11,14}$/.test(stamp)||
     typeof signature!=="string"||!/^sha256=[0-9a-f]{64}$/.test(signature)){
   return {status:401,payload:{error:"invalid_signature"}};
  }
  const timestamp=Number(stamp);
  if(!Number.isSafeInteger(timestamp)||Math.abs(clock()-timestamp)>WINDOW_MS){
   return {status:401,payload:{error:"expired_signature"}};
  }
  const body=await readRawBody(req);
  const expected=Buffer.from(signSandboxEvent(secret,stamp,body),"hex");
  const actual=Buffer.from(signature.slice(7),"hex");
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))
   return {status:401,payload:{error:"invalid_signature"}};
  let event;
  try{event=JSON.parse(body.toString("utf8"))}catch{return {status:400,payload:{error:"invalid_event"}}}
  if(!event||typeof event!=="object"||Array.isArray(event)||Object.keys(event).sort().join(",")!=="eventId,kind,orderId"||
     typeof event.eventId!=="string"||!EVENT.test(event.eventId)||typeof event.orderId!=="string"||!UUID.test(event.orderId)||
     !KINDS.has(event.kind))return {status:422,payload:{error:"invalid_event"}};
  const digest=createHash("sha256").update(body).digest("hex");
  db.exec("BEGIN IMMEDIATE");
  try{
   const previous=db.prepare("SELECT content_sha256 FROM sandbox_webhook_events WHERE event_id=?").get(event.eventId);
   if(previous){
    db.exec("COMMIT");
    return previous.content_sha256===digest?
     {status:200,payload:{accepted:true,replayed:true,sandboxOnly:true}}:
     {status:409,payload:{error:"event_id_conflict"}};
   }
   const order=db.prepare("SELECT id FROM sandbox_orders WHERE id=?").get(event.orderId);
   if(!order){db.exec("ROLLBACK");return {status:422,payload:{error:"unknown_sandbox_order"}}}
   db.prepare("INSERT INTO sandbox_webhook_events(event_id,order_id,event_type,content_sha256,sent_at,received_at) VALUES(?,?,?,?,?,?)")
     .run(event.eventId,event.orderId,event.kind,digest,timestamp,clock());
   audit(null,"sandbox_webhook.received",event.orderId);
   db.exec("COMMIT");
   return {status:202,payload:{accepted:true,replayed:false,sandboxOnly:true,accessGranted:false}};
  }catch(error){
   if(db.isTransaction)db.exec("ROLLBACK");
   throw error
  }
 }
 return {receive,enabled};
}
