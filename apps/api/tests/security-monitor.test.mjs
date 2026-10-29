import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";
import {createRateLimiter,RATE_LIMIT_POLICIES} from "../src/rate-limiter.mjs";

test("security monitoring is admin-only and exposes aggregates without identifiers",async()=>{
 let now=1_800_000_000_000;
 const app=createApp({clock:()=>now});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const origin="http://127.0.0.1:"+app.server.address().port;
 const call=async(path,method="GET",data,token)=>{
  const response=await fetch(origin+path,{method,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},
   body:data===undefined?undefined:JSON.stringify(data)});
  return {status:response.status,data:await response.json()};
 };
 try{
  for(const email of ["security-admin@example.test","security-customer@example.test"]){
   assert.equal((await call("/v1/auth/register","POST",{email,password:"valid-test-password-123"})).status,201);
  }
  const adminId=app.db.prepare("SELECT id FROM users WHERE email='security-admin@example.test'").get().id;
  app.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(adminId);
  const admin=(await call("/v1/auth/login","POST",{email:"security-admin@example.test",password:"valid-test-password-123"})).data;
  const customer=(await call("/v1/auth/login","POST",{email:"security-customer@example.test",password:"valid-test-password-123"})).data;
  assert.equal((await call("/v1/admin/security")).status,401);
  assert.equal((await call("/v1/admin/security","GET",undefined,customer.token)).status,403);
  const limiter=createRateLimiter({db:app.db,clock:()=>now});
  for(let i=0;i<10;i++)assert.equal(limiter.check("login_ip","198.51.100.1"),true);
  assert.equal(limiter.check("login_ip","198.51.100.1"),false);
  assert.equal(limiter.check("login_ip","198.51.100.1"),false);
  for(let i=0;i<3;i++)assert.equal(limiter.check("recover_email","hidden-user@example.test"),true);
  assert.equal(limiter.check("recover_email","hidden-user@example.test"),false);
  const first=await call("/v1/admin/security","GET",undefined,admin.token);
  assert.equal(first.status,200);
  const data=first.data;
  assert.equal(data.scope,"local_sqlite_database");
  assert.equal(data.productionSecurityApproved,false);
  assert.equal(data.distributedAcrossHosts,false);
  assert.equal(data.activeWindowsOnly,true);
  assert.equal(data.totalRejectedAttempts,3);
  assert.equal(data.totalBlockedKeys,2);
  assert.equal(data.generatedAt,now);
  const ip=data.scopes.find(s=>s.scope==="login_ip");
  assert.equal(ip.limit,RATE_LIMIT_POLICIES.login_ip.limit);
  assert.equal(ip.windowMs,RATE_LIMIT_POLICIES.login_ip.windowMs);
  assert.equal(ip.rejectedAttemptsInActiveWindows,2);
  const recover=data.scopes.find(s=>s.scope==="recover_email");
  assert.equal(recover.rejectedAttemptsInActiveWindows,1);
  assert.equal(data.authAuditLast24Hours.find(x=>x.action==="session.login").count,2);
  const wire=JSON.stringify(data);
  for(const secret of ["198.51.100.1","hidden-user@example.test","security-admin@example.test",
   admin.token,customer.token,"key_hash","password_hash"])
   assert.equal(wire.includes(secret),false);
  const oldRows=app.db.prepare("SELECT COUNT(*) n FROM auth_rate_limits").get().n;
  assert.equal(oldRows>=4,true);
  now+=61_000;
  const second=(await call("/v1/admin/security","GET",undefined,admin.token)).data;
  assert.equal(second.scopes.find(s=>s.scope==="login_ip").rejectedAttemptsInActiveWindows,0);
  assert.equal(second.totalRejectedAttempts,1);
  assert.equal(app.db.prepare("SELECT COUNT(*) n FROM auth_rate_limits").get().n,oldRows);
 }finally{await app.close()}
});

test("policy checks cannot silently diverge from the monitored scopes",async()=>{
 const app=createApp();
 try{
  const limiter=createRateLimiter({db:app.db});
  assert.equal(Object.keys(RATE_LIMIT_POLICIES).length,8);
  for(const policy of Object.values(RATE_LIMIT_POLICIES)){
   assert.ok(policy.limit>0&&policy.windowMs>=1000);
  }
  assert.throws(()=>limiter.check("nonexistent_scope","x"),/Unknown authentication rate-limit scope/);
  assert.equal(limiter.check("register_ip","192.0.2.15"),true);
  const row=app.db.prepare("SELECT scope,attempt_count FROM auth_rate_limits WHERE scope='register_ip'").get();
  assert.equal(row.attempt_count,1);
 }finally{app.db.close()}
});
