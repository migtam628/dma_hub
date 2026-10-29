import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createApp} from "../src/app.mjs";
import {createRateLimiter} from "../src/rate-limiter.mjs";

async function tempDb(fn){
 const dir=await mkdtemp(join(tmpdir(),"dma-auth-limits-"));
 try{return await fn(join(dir,"auth.sqlite"))}
 finally{await rm(dir,{recursive:true,force:true})}
}
async function listening(app,fn){
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 const post=async(path,body)=>{
  const r=await fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  return {status:r.status,body:await r.json()};
 };
 try{return await fn(post)}finally{await app.close()}
}

test("persistent fixed windows survive restart, hash identifiers, expire and prune",()=>tempDb(async(file)=>{
 let now=100_000;
 const first=createApp({dbPath:file,clock:()=>now});
 const a=createRateLimiter({db:first.db,clock:()=>now});
 assert.equal(a.allow("login_ip","192.0.2.100",2,60000),true);
 assert.equal(a.allow("login_ip","192.0.2.100",2,60000),true);
 assert.equal(a.allow("login_ip","192.0.2.100",2,60000),false);
 assert.equal(a.allow("login_ip","192.0.2.101",2,60000),true);
 assert.equal(a.allow("login_email","someone@example.test",2,60000),true);
 const persisted=first.db.prepare("SELECT scope,key_hash,attempt_count,expires_at FROM auth_rate_limits WHERE scope='login_ip'").all();
 assert.equal(persisted.length,2);
 assert.ok(persisted.every(x=>/^[0-9a-f]{64}$/.test(x.key_hash)));
 assert.equal(JSON.stringify(persisted).includes("192.0.2.100"),false);
 assert.equal(JSON.stringify(first.db.prepare("SELECT * FROM auth_rate_limits").all()).includes("someone@example.test"),false);
 first.db.close();
 const second=createApp({dbPath:file,clock:()=>now});
 const b=createRateLimiter({db:second.db,clock:()=>now});
 assert.equal(b.allow("login_ip","192.0.2.100",2,60000),false);
 assert.equal(b.allow("login_ip","192.0.2.101",2,60000),true);
 now+=60001;
 assert.equal(b.allow("login_ip","192.0.2.100",2,60000),true);
 assert.equal(second.db.prepare("SELECT attempt_count FROM auth_rate_limits WHERE scope='login_ip' ORDER BY attempt_count LIMIT 1").get().attempt_count,1);
 for(let i=0;i<64;i++)b.allow("register_ip","192.0.2."+i,1,60000);
 assert.equal(second.db.prepare("SELECT COUNT(*) n FROM auth_rate_limits WHERE expires_at<=?").get(now).n,0);
 second.db.close();
}));

test("HTTP registration and login throttles persist across an API restart",()=>tempDb(async(file)=>{
 let now=2_000_000;
 const reg={password:"this-is-a-valid-test-password"};
 const first=createApp({dbPath:file,clock:()=>now});
 await listening(first,async(post)=>{
  for(let i=0;i<5;i++){
   const r=await post("/v1/auth/register",{...reg,email:"person"+i+"@example.test"});
   assert.equal(r.status,201);
  }
  assert.equal((await post("/v1/auth/register",{...reg,email:"sixth@example.test"})).status,429);
 });
 const second=createApp({dbPath:file,clock:()=>now});
 await listening(second,async(post)=>{
  assert.equal((await post("/v1/auth/register",{...reg,email:"sixth@example.test"})).status,429);
  for(let i=0;i<10;i++)
   assert.equal((await post("/v1/auth/login",{email:"person0@example.test",password:"incorrect-password-long"})).status,401);
  assert.equal((await post("/v1/auth/login",{email:"person0@example.test",password:reg.password})).status,429);
 });
 const third=createApp({dbPath:file,clock:()=>now});
 await listening(third,async(post)=>{
  assert.equal((await post("/v1/auth/login",{email:"person0@example.test",password:reg.password})).status,429);
  now+=60_001;
  const login=await post("/v1/auth/login",{email:"person0@example.test",password:reg.password});
  assert.equal(login.status,200);
  now+=15*60*1000+1;
  assert.equal((await post("/v1/auth/register",{...reg,email:"new@example.test"})).status,201);
 });
}));

test("throttling is keyed by scope and an email bucket cannot bypass other controls",()=>tempDb(async(file)=>{
 let now=500_000;
 const app=createApp({dbPath:file,clock:()=>now});
 const limit=createRateLimiter({db:app.db,clock:()=>now});
 for(let i=0;i<20;i++)assert.equal(limit.allow("login_email","target@example.test",20,900000),true);
 assert.equal(limit.allow("login_email","target@example.test",20,900000),false);
 assert.equal(limit.allow("verify_email","target@example.test",3,3600000),true);
 assert.equal(limit.allow("login_email","another@example.test",20,900000),true);
 assert.throws(()=>limit.allow("Invalid Scope","x",2,60000),/Invalid rate limiter parameters/);
 assert.throws(()=>limit.allow("login_ip","x",0,60000),/Invalid rate limiter parameters/);
 app.db.close();
}));
