import {createServer} from "node:http";
import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash} from "node:crypto";
import {mkdirSync} from "node:fs";
import {dirname} from "node:path";
import {DatabaseSync} from "node:sqlite";
import {migrateDatabase} from "./migrations.mjs";
const MAX_BODY=64*1024,SESSION_MS=12*60*60*1000,VERIFY_MS=24*60*60*1000,RESET_MS=60*60*1000;
const hashToken=t=>createHash("sha256").update(t).digest("hex");
function response(res,status,payload,headers={}){res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer",...headers});res.end(JSON.stringify(payload))}
function jsonBody(req){return new Promise((resolve,reject)=>{let chunks=[],size=0,tooLarge=false;
 if(Number(req.headers["content-length"]||0)>MAX_BODY){req.resume();reject(Object.assign(new Error("Body too large"),{status:413}));return}
 req.on("data",b=>{size+=b.length;if(size>MAX_BODY){tooLarge=true;chunks=[];return}if(!tooLarge)chunks.push(b)});
 req.on("end",()=>{if(tooLarge){reject(Object.assign(new Error("Body too large"),{status:413}));return}
  try{const value=JSON.parse(Buffer.concat(chunks).toString("utf8"));if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Expected JSON object");resolve(value)}catch{reject(Object.assign(new Error("Invalid JSON object"),{status:400}))}});
 req.on("error",reject)
})}
function passwordHash(pass){const salt=randomBytes(16).toString("hex");return salt+":"+scryptSync(pass,salt,64).toString("hex")}
function verifyPassword(pass,encoded){if(typeof encoded!=="string"||!encoded.includes(":"))return false;const [salt,stored]=encoded.split(":");const actual=scryptSync(pass,salt,64);const expected=Buffer.from(stored,"hex");return expected.length===actual.length&&timingSafeEqual(actual,expected)}
function publicUser(u){return {id:u.id,email:u.email,role:u.role,createdAt:u.created_at,emailVerified:u.email_verified_at!=null}}
function validEmail(v){return typeof v==="string"&&v.length<255&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function validPassword(v){return typeof v==="string"&&v.length>=12&&v.length<=128}
function normalizedProduct(v){
 if(!v||typeof v!=="object"||Array.isArray(v))return null;
 const slug=typeof v.slug==="string"?v.slug.trim().toLowerCase():"";
 const name=typeof v.name==="string"?v.name.trim():"";
 const description=typeof v.description==="string"?v.description.trim():"";
 const status=v.status===undefined?"draft":v.status;
 if(!/^[a-z0-9][a-z0-9-]{2,59}$/.test(slug)||name.length<2||name.length>100||description.length>2000||!["draft","published","archived"].includes(status))return null;
 return {slug,name,description,status};
}
function normalizedProfile(v){if(!v||typeof v!=="object"||Array.isArray(v))return null;const name=typeof v.name==="string"?v.name.trim():"";if(name.length<1||name.length>80)return null;const data=v.data;if(!data||typeof data!=="object"||Array.isArray(data))return null;const serialized=JSON.stringify(data);if(serialized.length>16000)return null;return {name,data:serialized}}
export function createApp({dbPath=":memory:",allowedOrigin="http://localhost:5173",clock=()=>Date.now(),sendEmail=null,requireEmailVerification=false}={}){
 if(requireEmailVerification&&typeof sendEmail!=="function")throw new Error("Email verification requires a configured mail transport");
 if(dbPath!==":memory:")mkdirSync(dirname(dbPath),{recursive:true});
 const db=new DatabaseSync(dbPath);
 try{migrateDatabase(db)}catch(error){db.close();throw error}
 const loginLimits=new Map(),registerLimits=new Map(),passwordChangeLimits=new Map(),verificationLimits=new Map(),recoveryLimits=new Map();
 function checkLimit(buckets,key,limit,windowMs){const now=clock();const prior=(buckets.get(key)||[]).filter(t=>now-t<windowMs);if(prior.length>=limit){buckets.set(key,prior);return false}prior.push(now);buckets.set(key,prior);if(buckets.size>1000){for(const [k,list] of buckets){const alive=list.filter(t=>now-t<windowMs);if(alive.length)buckets.set(k,alive);else buckets.delete(k)}}return true}
 const audit=(actor,action,target)=>db.prepare("INSERT INTO audit VALUES(?,?,?,?,?)").run(randomUUID(),actor,action,target,clock());
 function issueToken(userId,purpose,ttl){
  const token=randomBytes(32).toString("base64url");
  db.prepare("DELETE FROM auth_tokens WHERE user_id=? AND purpose=?").run(userId,purpose);
  db.prepare("INSERT INTO auth_tokens(token_hash,user_id,purpose,created_at,expires_at) VALUES(?,?,?,?,?)")
    .run(hashToken(token),userId,purpose,clock(),clock()+ttl);
  return token;
 }
 function findToken(token,purpose){
  if(typeof token!=="string"||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
  return db.prepare("SELECT t.token_hash,t.user_id FROM auth_tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=? AND t.purpose=? AND t.expires_at>? AND u.disabled_at IS NULL")
    .get(hashToken(token),purpose,clock())||null;
 }
 const EMAIL_ACK={ok:true,message:"If an eligible account exists, instructions will be sent."};
 async function sendToken(account,purpose,ttl){
  const token=issueToken(account.id,purpose,ttl);
  try{await sendEmail({kind:purpose,to:account.email,token,expiresAt:clock()+ttl});return true}
  catch{
   db.prepare("DELETE FROM auth_tokens WHERE token_hash=?").run(hashToken(token));
   return false;
  }
 }
 function requireUser(req){const auth=req.headers.authorization||"";if(!auth.startsWith("Bearer "))return null;const token=auth.slice(7).trim();if(token.length<30||token.length>128)return null;return db.prepare("SELECT u.id,u.email,u.role,u.created_at,u.email_verified_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.disabled_at IS NULL").get(hashToken(token),clock())||null}
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
   if(pathname==="/v1/catalog/live"&&req.method==="GET"){
     const rows=db.prepare("SELECT id,slug,name,description,updated_at FROM catalog_products WHERE status='published' ORDER BY name ASC LIMIT 200").all();
     response(res,200,{items:rows.map(x=>({id:x.id,slug:x.slug,name:x.name,description:x.description,updatedAt:x.updated_at}))});return
   }
   if(pathname==="/v1/auth/capabilities"&&req.method==="GET"){
     response(res,200,{emailVerificationRequired:requireEmailVerification,passwordRecoveryAvailable:typeof sendEmail==="function"});return
   }
   if(pathname==="/v1/auth/verify-email"&&req.method==="POST"){
     const v=await jsonBody(req),found=findToken(v.token,"verify_email");
     if(!found){response(res,400,{error:"invalid_or_expired_token"});return}
     db.exec("BEGIN IMMEDIATE");
     try{
       db.prepare("UPDATE users SET email_verified_at=? WHERE id=?").run(clock(),found.user_id);
       db.prepare("DELETE FROM auth_tokens WHERE user_id=? AND purpose='verify_email'").run(found.user_id);
       audit(found.user_id,"account.email_verified",found.user_id);
       db.exec("COMMIT");
     }catch(e){if(db.isTransaction)db.exec("ROLLBACK");throw e}
     response(res,200,{ok:true});return
   }
   if(pathname==="/v1/auth/request-verification"&&req.method==="POST"){
     if(typeof sendEmail!=="function"){response(res,503,{error:"mail_not_configured"});return}
     const v=await jsonBody(req),email=typeof v.email==="string"?v.email.trim().toLowerCase():"";
     if(!validEmail(email)){response(res,422,{error:"invalid_email"});return}
     const key=req.socket.remoteAddress||"unknown";
     if(!checkLimit(verificationLimits,"ip:"+key,5,15*60*1000)||!checkLimit(verificationLimits,"email:"+hashToken(email),3,60*60*1000)){
       response(res,429,{error:"rate_limited"});return
     }
     const account=db.prepare("SELECT id,email FROM users WHERE email=? AND disabled_at IS NULL AND email_verified_at IS NULL").get(email);
     if(account)await sendToken(account,"verify_email",VERIFY_MS);
     response(res,202,EMAIL_ACK);return
   }
   if(pathname==="/v1/auth/forgot-password"&&req.method==="POST"){
     if(typeof sendEmail!=="function"){response(res,503,{error:"mail_not_configured"});return}
     const v=await jsonBody(req),email=typeof v.email==="string"?v.email.trim().toLowerCase():"";
     if(!validEmail(email)){response(res,422,{error:"invalid_email"});return}
     const key=req.socket.remoteAddress||"unknown";
     if(!checkLimit(recoveryLimits,"ip:"+key,5,15*60*1000)||!checkLimit(recoveryLimits,"email:"+hashToken(email),3,60*60*1000)){
       response(res,429,{error:"rate_limited"});return
     }
     const account=db.prepare("SELECT id,email FROM users WHERE email=? AND disabled_at IS NULL AND email_verified_at IS NOT NULL").get(email);
     if(account)await sendToken(account,"reset_password",RESET_MS);
     response(res,202,EMAIL_ACK);return
   }
   if(pathname==="/v1/auth/reset-password"&&req.method==="POST"){
     const v=await jsonBody(req);
     if(!validPassword(v.newPassword)){response(res,422,{error:"invalid_new_password"});return}
     const found=findToken(v.token,"reset_password");
     if(!found){response(res,400,{error:"invalid_or_expired_token"});return}
     db.exec("BEGIN IMMEDIATE");
     try{
       db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(passwordHash(v.newPassword),found.user_id);
       db.prepare("DELETE FROM sessions WHERE user_id=?").run(found.user_id);
       db.prepare("DELETE FROM auth_tokens WHERE user_id=?").run(found.user_id);
       audit(found.user_id,"account.password_recovered",found.user_id);
       db.exec("COMMIT");
     }catch(e){if(db.isTransaction)db.exec("ROLLBACK");throw e}
     response(res,200,{ok:true,sessionsRevoked:true});return
   }
   if(pathname==="/v1/auth/register"&&req.method==="POST"){
    if(!checkLimit(registerLimits,req.socket.remoteAddress||"unknown",5,15*60*1000)){response(res,429,{error:"rate_limited"});return}
    const v=await jsonBody(req);const email=typeof v.email==="string"?v.email.trim().toLowerCase():"";
    if(!validEmail(email)||!validPassword(v.password)){response(res,422,{error:"invalid_registration",message:"Use a valid email and a password of 12–128 characters."});return}
    const id=randomUUID();try{db.prepare("INSERT INTO users(id,email,password_hash,role,created_at) VALUES(?,?,?,?,?)").run(id,email,passwordHash(v.password),"customer",clock())}catch(e){if(String(e).includes("UNIQUE")){response(res,409,{error:"email_unavailable"});return}throw e}
    audit(id,"user.register",id);
    let mailAccepted=null;
    if(requireEmailVerification)mailAccepted=await sendToken({id,email},"verify_email",VERIFY_MS);
    response(res,201,{user:{id,email,role:"customer",emailVerified:false},verificationRequired:requireEmailVerification,mailAccepted});return
   }
   if(pathname==="/v1/auth/login"&&req.method==="POST"){
    const client=req.socket.remoteAddress||"unknown",now=clock();
    if(!checkLimit(loginLimits,client,10,60*1000)){response(res,429,{error:"rate_limited"});return}
    const v=await jsonBody(req),email=typeof v.email==="string"?v.email.trim().toLowerCase():"";
    if(!validEmail(email)||typeof v.password!=="string"||v.password.length>128){response(res,401,{error:"invalid_credentials"});return}
    const u=db.prepare("SELECT * FROM users WHERE email=?").get(email);
    if(!u||u.disabled_at!==null||!verifyPassword(v.password,u.password_hash)){response(res,401,{error:"invalid_credentials"});return}
    if(requireEmailVerification&&u.email_verified_at==null){response(res,403,{error:"email_verification_required"});return}
    db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(now);
    const token=randomBytes(32).toString("base64url");db.prepare("INSERT INTO sessions VALUES(?,?,?,?)").run(hashToken(token),u.id,now+SESSION_MS,now);
    db.prepare("DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM sessions WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT -1 OFFSET 5)").run(u.id);
    audit(u.id,"session.login",u.id);
    response(res,200,{token,expiresAt:now+SESSION_MS,user:publicUser(u)});return
   }
   if(pathname.startsWith("/v1/")){
    const u=requireUser(req);if(!u){response(res,401,{error:"authentication_required"});return}
    if(pathname==="/v1/me"&&req.method==="GET"){response(res,200,{user:publicUser(u)});return}
    if(pathname==="/v1/auth/logout"&&req.method==="POST"){const token=req.headers.authorization.slice(7).trim();db.prepare("DELETE FROM sessions WHERE token_hash=? AND user_id=?").run(hashToken(token),u.id);audit(u.id,"session.logout",u.id);response(res,200,{ok:true});return}
    if(pathname==="/v1/auth/sessions"&&req.method==="GET"){
      const tokenHash=hashToken(req.headers.authorization.slice(7).trim());
      const sessions=db.prepare("SELECT token_hash,created_at,expires_at FROM sessions WHERE user_id=? AND expires_at>? ORDER BY created_at DESC,rowid DESC").all(u.id,clock());
      response(res,200,{items:sessions.map(s=>({createdAt:s.created_at,expiresAt:s.expires_at,current:s.token_hash===tokenHash}))});return
    }
    if(pathname==="/v1/auth/logout-all"&&req.method==="POST"){
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(u.id);audit(u.id,"session.logout_all",u.id);
      response(res,200,{ok:true});return
    }
    if(pathname==="/v1/auth/change-password"&&req.method==="POST"){
      if(!checkLimit(passwordChangeLimits,u.id,5,15*60*1000)){response(res,429,{error:"rate_limited"});return}
      const v=await jsonBody(req);
      if(!validPassword(v.newPassword)||v.currentPassword===v.newPassword){
        response(res,422,{error:"invalid_new_password",message:"Use a different password containing 12–128 characters."});return
      }
      const account=db.prepare("SELECT password_hash FROM users WHERE id=? AND disabled_at IS NULL").get(u.id);
      if(!account||typeof v.currentPassword!=="string"||v.currentPassword.length>128||!verifyPassword(v.currentPassword,account.password_hash)){
        response(res,401,{error:"invalid_credentials"});return
      }
      db.exec("BEGIN IMMEDIATE");
      try{
        db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(passwordHash(v.newPassword),u.id);
        db.prepare("DELETE FROM sessions WHERE user_id=?").run(u.id);
        audit(u.id,"account.password_changed",u.id);
        db.exec("COMMIT");
      }catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
      response(res,200,{ok:true,sessionsRevoked:true});return
    }
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
    if(pathname==="/v1/admin/products"&&(req.method==="GET"||req.method==="POST")){
      if(u.role!=="admin"){response(res,403,{error:"forbidden"});return}
      if(req.method==="GET"){
        const products=db.prepare("SELECT id,slug,name,description,status,version,created_at,updated_at FROM catalog_products ORDER BY updated_at DESC LIMIT 200").all();
        response(res,200,{items:products.map(p=>({id:p.id,slug:p.slug,name:p.name,description:p.description,status:p.status,version:p.version,createdAt:p.created_at,updatedAt:p.updated_at}))});return
      }
      const product=normalizedProduct(await jsonBody(req));
      if(!product){response(res,422,{error:"invalid_product"});return}
      const id=randomUUID(),now=clock();
      try{
        db.exec("BEGIN IMMEDIATE");
        db.prepare("INSERT INTO catalog_products(id,slug,name,description,status,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)")
          .run(id,product.slug,product.name,product.description,product.status,1,now,now);
        audit(u.id,"catalog.product_created",id);db.exec("COMMIT");
      }catch(error){
        if(db.isTransaction)db.exec("ROLLBACK");
        if(String(error).includes("UNIQUE")){response(res,409,{error:"slug_already_exists"});return}
        throw error
      }
      response(res,201,{id,...product,version:1,createdAt:now,updatedAt:now});return
    }
    const adminProductPath=pathname.match(/^\/v1\/admin\/products\/([0-9a-f-]{36})$/i);
    if(adminProductPath&&(req.method==="GET"||req.method==="PATCH")){
      if(u.role!=="admin"){response(res,403,{error:"forbidden"});return}
      const id=adminProductPath[1];
      const existing=db.prepare("SELECT * FROM catalog_products WHERE id=?").get(id);
      if(!existing){response(res,404,{error:"not_found"});return}
      if(req.method==="GET"){response(res,200,{id,slug:existing.slug,name:existing.name,description:existing.description,status:existing.status,version:existing.version,createdAt:existing.created_at,updatedAt:existing.updated_at});return}
      const version=Number(req.headers["if-match"]);
      if(!Number.isInteger(version)||version<1){response(res,428,{error:"version_required"});return}
      const product=normalizedProduct(await jsonBody(req));
      if(!product){response(res,422,{error:"invalid_product"});return}
      const now=clock();
      try{
        db.exec("BEGIN IMMEDIATE");
        const updated=db.prepare("UPDATE catalog_products SET slug=?,name=?,description=?,status=?,version=version+1,updated_at=? WHERE id=? AND version=?")
          .run(product.slug,product.name,product.description,product.status,now,id,version);
        if(!updated.changes){db.exec("ROLLBACK");response(res,409,{error:"version_conflict"});return}
        audit(u.id,"catalog.product_updated",id);
        db.exec("COMMIT");
      }catch(error){
        if(db.isTransaction)db.exec("ROLLBACK");
        if(String(error).includes("UNIQUE")){response(res,409,{error:"slug_already_exists"});return}
        throw error
      }
      response(res,200,{id,...product,version:version+1,updatedAt:now});return
    }

    response(res,404,{error:"not_found"});return
   }
   response(res,404,{error:"not_found"});
  }catch(e){if(!res.headersSent)response(res,e.status||500,{error:e.status?"request_failed":"internal_error"});}
 };
 const server=createServer((req,res)=>{handler(req,res).catch(()=>{if(!res.headersSent)response(res,500,{error:"internal_error"})})});
 return {server,db,close:()=>new Promise(resolve=>server.close(()=>{db.close();resolve()}))};
}
