import {createServer} from "node:http";
import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash} from "node:crypto";
import {mkdirSync} from "node:fs";
import {dirname} from "node:path";
import {DatabaseSync} from "node:sqlite";
const MAX_BODY=64*1024,SESSION_MS=12*60*60*1000;
const hashToken=t=>createHash("sha256").update(t).digest("hex");
function response(res,status,payload,headers={}){res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer",...headers});res.end(JSON.stringify(payload))}
function jsonBody(req){return new Promise((resolve,reject)=>{let chunks=[],size=0;req.on("data",b=>{size+=b.length;if(size>MAX_BODY){reject(Object.assign(new Error("Body too large"),{status:413}));req.destroy();return}chunks.push(b)});req.on("end",()=>{try{const value=JSON.parse(Buffer.concat(chunks).toString("utf8"));if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Expected JSON object");resolve(value)}catch{reject(Object.assign(new Error("Invalid JSON object"),{status:400}))}});req.on("error",reject)})}
function passwordHash(pass){const salt=randomBytes(16).toString("hex");return salt+":"+scryptSync(pass,salt,64).toString("hex")}
function verifyPassword(pass,encoded){if(typeof encoded!=="string"||!encoded.includes(":"))return false;const [salt,stored]=encoded.split(":");const actual=scryptSync(pass,salt,64);const expected=Buffer.from(stored,"hex");return expected.length===actual.length&&timingSafeEqual(actual,expected)}
function publicUser(u){return {id:u.id,email:u.email,role:u.role,createdAt:u.created_at}}
function validEmail(v){return typeof v==="string"&&v.length<255&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function validPassword(v){return typeof v==="string"&&v.length>=12&&v.length<=128}
function normalizedProfile(v){if(!v||typeof v!=="object"||Array.isArray(v))return null;const name=typeof v.name==="string"?v.name.trim():"";if(name.length<1||name.length>80)return null;const data=v.data;if(!data||typeof data!=="object"||Array.isArray(data))return null;const serialized=JSON.stringify(data);if(serialized.length>16000)return null;return {name,data:serialized}}
export function createApp({dbPath=":memory:",allowedOrigin="http://localhost:5173",clock=()=>Date.now()}={}){
 if(dbPath!==":memory:")mkdirSync(dirname(dbPath),{recursive:true});
 const db=new DatabaseSync(dbPath);
 db.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'customer',created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
 CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,data_json TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS profiles_user ON profiles(user_id);
 CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,actor TEXT,action TEXT NOT NULL,target TEXT,created_at INTEGER NOT NULL);
 `);
 const loginLimits=new Map();
 const audit=(actor,action,target)=>db.prepare("INSERT INTO audit VALUES(?,?,?,?,?)").run(randomUUID(),actor,action,target,clock());
 function requireUser(req){const auth=req.headers.authorization||"";if(!auth.startsWith("Bearer "))return null;const token=auth.slice(7).trim();if(token.length<30||token.length>128)return null;return db.prepare("SELECT u.id,u.email,u.role,u.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?").get(hashToken(token),clock())||null}
 function allowed(req){const origin=req.headers.origin;return !origin||origin===allowedOrigin}
 const handler=async(req,res)=>{
  res.setHeader("Vary","Origin");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Content-Security-Policy","default-src 'none'; frame-ancestors 'none'");
  if(!allowed(req)){response(res,403,{error:"origin_not_allowed"});return}
  if(req.headers.origin)res.setHeader("Access-Control-Allow-Origin",allowedOrigin);
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization, If-Match");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,PATCH,DELETE,OPTIONS");
  if(req.method==="OPTIONS"){res.writeHead(204);res.end();return}
  const pathname=new URL(req.url||"/","http://localhost").pathname;
  try{
   if(pathname==="/healthz"&&req.method==="GET"){response(res,200,{status:"ok",service:"dma-hub-api",database:"ready"});return}
   if(pathname==="/v1/catalog"&&req.method==="GET"){response(res,200,{items:[{id:"device-studio",name:"Device Studio",status:"preview"},{id:"profile-cloud",name:"Profile Cloud",status:"preview"},{id:"release-center",name:"Release Center",status:"preview"}]});return}
   if(pathname==="/v1/auth/register"&&req.method==="POST"){
    const v=await jsonBody(req);const email=typeof v.email==="string"?v.email.trim().toLowerCase():"";
    if(!validEmail(email)||!validPassword(v.password)){response(res,422,{error:"invalid_registration",message:"Use a valid email and a password of 12–128 characters."});return}
    const id=randomUUID();try{db.prepare("INSERT INTO users VALUES(?,?,?,?,?)").run(id,email,passwordHash(v.password),"customer",clock())}catch(e){if(String(e).includes("UNIQUE")){response(res,409,{error:"email_unavailable"});return}throw e}
    audit(id,"user.register",id);response(res,201,{user:{id,email,role:"customer"}});return
   }
   if(pathname==="/v1/auth/login"&&req.method==="POST"){
    const client=req.socket.remoteAddress||"unknown",now=clock();const attempts=(loginLimits.get(client)||[]).filter(t=>now-t<60000);
    if(attempts.length>=10){response(res,429,{error:"rate_limited"});return}
    attempts.push(now);loginLimits.set(client,attempts);
    const v=await jsonBody(req),email=typeof v.email==="string"?v.email.trim().toLowerCase():"";
    if(typeof v.password!=="string"||v.password.length>128){response(res,401,{error:"invalid_credentials"});return}
    const u=db.prepare("SELECT * FROM users WHERE email=?").get(email);
    if(!u||!verifyPassword(v.password,u.password_hash)){response(res,401,{error:"invalid_credentials"});return}
    const token=randomBytes(32).toString("base64url");db.prepare("INSERT INTO sessions VALUES(?,?,?,?)").run(hashToken(token),u.id,now+SESSION_MS,now);
    audit(u.id,"session.login",u.id);
    response(res,200,{token,expiresAt:now+SESSION_MS,user:publicUser(u)});return
   }
   if(pathname.startsWith("/v1/")){
    const u=requireUser(req);if(!u){response(res,401,{error:"authentication_required"});return}
    if(pathname==="/v1/me"&&req.method==="GET"){response(res,200,{user:publicUser(u)});return}
    if(pathname==="/v1/auth/logout"&&req.method==="POST"){const token=req.headers.authorization.slice(7).trim();db.prepare("DELETE FROM sessions WHERE token_hash=? AND user_id=?").run(hashToken(token),u.id);audit(u.id,"session.logout",u.id);response(res,200,{ok:true});return}
    if(pathname==="/v1/profiles"&&req.method==="GET"){const rows=db.prepare("SELECT id,name,data_json,version,created_at,updated_at FROM profiles WHERE user_id=? ORDER BY updated_at DESC LIMIT 100").all(u.id);response(res,200,{items:rows.map(row=>({id:row.id,name:row.name,data:JSON.parse(row.data_json),version:row.version,createdAt:row.created_at,updatedAt:row.updated_at}))});return}
    if(pathname==="/v1/profiles"&&req.method==="POST"){
      const v=normalizedProfile(await jsonBody(req));if(!v){response(res,422,{error:"invalid_profile"});return}
      const count=db.prepare("SELECT COUNT(*) AS n FROM profiles WHERE user_id=?").get(u.id).n;if(count>=100){response(res,409,{error:"profile_limit_reached"});return}
      const id=randomUUID(),now=clock();db.prepare("INSERT INTO profiles VALUES(?,?,?,?,?,?,?)").run(id,u.id,v.name,v.data,1,now,now);audit(u.id,"profile.create",id);response(res,201,{id,name:v.name,data:JSON.parse(v.data),version:1,createdAt:now,updatedAt:now});return
    }
    const match=pathname.match(/^\/v1\/profiles\/([0-9a-f-]{36})$/i);
    if(match){
      const id=match[1];const p=db.prepare("SELECT * FROM profiles WHERE id=? AND user_id=?").get(id,u.id);
      if(!p){response(res,404,{error:"not_found"});return}
      if(req.method==="GET"){response(res,200,{id,name:p.name,data:JSON.parse(p.data_json),version:p.version,updatedAt:p.updated_at});return}
      if(req.method==="PATCH"){
        const version=Number(req.headers["if-match"]);if(!Number.isInteger(version)||version<1){response(res,428,{error:"version_required",message:"If-Match must contain the expected version number."});return}
        const v=normalizedProfile(await jsonBody(req));if(!v){response(res,422,{error:"invalid_profile"});return}
        const run=db.prepare("UPDATE profiles SET name=?,data_json=?,version=version+1,updated_at=? WHERE id=? AND user_id=? AND version=?").run(v.name,v.data,clock(),id,u.id,version);
        if(!run.changes){response(res,409,{error:"version_conflict",serverVersion:p.version});return}
        audit(u.id,"profile.update",id);response(res,200,{id,name:v.name,data:JSON.parse(v.data),version:version+1});return
      }
      if(req.method==="DELETE"){const version=Number(req.headers["if-match"]);if(!Number.isInteger(version)||version<1){response(res,428,{error:"version_required"});return}const run=db.prepare("DELETE FROM profiles WHERE id=? AND user_id=? AND version=?").run(id,u.id,version);if(!run.changes){response(res,409,{error:"version_conflict"});return}audit(u.id,"profile.delete",id);response(res,200,{ok:true});return}
    }
    if(pathname==="/v1/admin/metrics"&&req.method==="GET"){if(u.role!=="admin"){response(res,403,{error:"forbidden"});return}response(res,200,{users:db.prepare("SELECT COUNT(*) n FROM users").get().n,profiles:db.prepare("SELECT COUNT(*) n FROM profiles").get().n});return}
    response(res,404,{error:"not_found"});return
   }
   response(res,404,{error:"not_found"});
  }catch(e){if(!res.headersSent)response(res,e.status||500,{error:e.status?"request_failed":"internal_error"});}
 };
 const server=createServer((req,res)=>{handler(req,res).catch(()=>{if(!res.headersSent)response(res,500,{error:"internal_error"})})});
 return {server,db,close:()=>new Promise(resolve=>server.close(()=>{db.close();resolve()}))};
}
