import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";
async function apiTest(fn,options={}){const app=createApp(options);await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));const base="http://127.0.0.1:"+app.server.address().port;const call=async(path,method="GET",body,token,version)=>{const headers={"content-type":"application/json"};if(token)headers.authorization="Bearer "+token;if(version)headers["if-match"]=String(version);const response=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined});return {status:response.status,body:await response.json(),headers:response.headers}};try{await fn(call)}finally{await app.close()}}
test("health and public catalog are available",async()=>apiTest(async(call)=>{assert.equal((await call("/healthz")).status,200);assert.equal((await call("/v1/catalog")).body.items.length,3)}));
test("registration requires strong password and login provides opaque session",async()=>apiTest(async(call)=>{assert.equal((await call("/v1/auth/register","POST",{email:"a@example.test",password:"short"})).status,422);assert.equal((await call("/v1/auth/register","POST",{email:"a@example.test",password:"valid-password-123"})).status,201);assert.equal((await call("/v1/auth/login","POST",{email:"a@example.test",password:"invalid-12345"})).status,401);const r=await call("/v1/auth/login","POST",{email:"a@example.test",password:"valid-password-123"});assert.equal(r.status,200);assert.ok(r.body.token.length>30);assert.equal((await call("/v1/me","GET",null,r.body.token)).body.user.email,"a@example.test");assert.equal((await call("/v1/auth/logout","POST",{},r.body.token)).status,200);assert.equal((await call("/v1/me","GET",null,r.body.token)).status,401)}));
test("profiles are tenant-isolated and version-conflict protected",async()=>apiTest(async(call)=>{const reg=async(email)=>{await call("/v1/auth/register","POST",{email,password:"long-test-password"});return (await call("/v1/auth/login","POST",{email,password:"long-test-password"})).body.token};const t1=await reg("one@example.test"),t2=await reg("two@example.test");const created=await call("/v1/profiles","POST",{name:"Main",data:{density:20}},t1);assert.equal(created.status,201);const id=created.body.id;assert.equal((await call("/v1/profiles","GET",null,t2)).body.items.length,0);assert.equal((await call("/v1/profiles/"+id,"GET",null,t2)).status,404);assert.equal((await call("/v1/profiles/"+id,"PATCH",{name:"Edit",data:{}},t1)).status,428);assert.equal((await call("/v1/profiles/"+id,"PATCH",{name:"Edit",data:{density:40}},t1,1)).status,200);assert.equal((await call("/v1/profiles/"+id,"PATCH",{name:"Old",data:{}},t1,1)).status,409);assert.equal((await call("/v1/profiles/"+id,"DELETE",null,t1,2)).status,200);assert.equal((await call("/v1/profiles/"+id,"GET",null,t1)).status,404)}));
test("unprivileged accounts cannot access admin metrics",async()=>apiTest(async(call)=>{await call("/v1/auth/register","POST",{email:"test@example.test",password:"valid-password-123"});const t=(await call("/v1/auth/login","POST",{email:"test@example.test",password:"valid-password-123"})).body.token;assert.equal((await call("/v1/admin/metrics","GET",null,t)).status,403)}));
test("CORS blocks foreign origins",async()=>{const app=createApp();await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));try{const r=await fetch("http://127.0.0.1:"+app.server.address().port+"/healthz",{headers:{Origin:"https://evil.example"}});assert.equal(r.status,403)}finally{await app.close()}});

test("oversized payload receives HTTP 413 without resetting the connection",async()=>apiTest(async(call)=>{
 const huge="X".repeat(70*1024);
 const r=await call("/v1/auth/register","POST",{email:"big@example.test",password:huge});
 assert.equal(r.status,413);
}));
test("registration throttles repeated requests without disclosing password details",async()=>apiTest(async(call)=>{
 for(let i=0;i<5;i++){const r=await call("/v1/auth/register","POST",{email:"user"+i+"@example.test",password:"long-enough-password"});assert.equal(r.status,201)}
 const blocked=await call("/v1/auth/register","POST",{email:"blocked@example.test",password:"long-enough-password"});
 assert.equal(blocked.status,429);assert.equal(blocked.body.error,"rate_limited");
}));
test("session inventory, revoke-all and a maximum of five active sessions",async()=>apiTest(async(call)=>{
 await call("/v1/auth/register","POST",{email:"sessions@example.test",password:"long-enough-password"});
 let tokens=[];
 for(let i=0;i<6;i++){
   const result=await call("/v1/auth/login","POST",{email:"sessions@example.test",password:"long-enough-password"});
   assert.equal(result.status,200);tokens.push(result.body.token)
 }
 assert.equal((await call("/v1/me","GET",undefined,tokens[0])).status,401);
 const r=await call("/v1/auth/sessions","GET",undefined,tokens[5]);
 assert.equal(r.status,200);assert.equal(r.body.items.length,5);
 assert.equal(r.body.items.filter(s=>s.current).length,1);
 const done=await call("/v1/auth/logout-all","POST",{},tokens[5]);
 assert.equal(done.status,200);
 assert.equal((await call("/v1/me","GET",undefined,tokens[4])).status,401);
 assert.equal((await call("/v1/me","GET",undefined,tokens[5])).status,401);
}));
test("expired sessions cannot access protected resources",async()=>{
 let now=100000;await apiTest(async(call)=>{
  await call("/v1/auth/register","POST",{email:"expires@example.test",password:"long-enough-password"});
  const login=await call("/v1/auth/login","POST",{email:"expires@example.test",password:"long-enough-password"});
  const token=login.body.token;
  assert.equal((await call("/v1/me","GET",undefined,token)).status,200);
  now+=12*60*60*1000+1;
  assert.equal((await call("/v1/me","GET",undefined,token)).status,401);
 },{clock:()=>now});
});

test("changing a password requires the current password and revokes all sessions",async()=>apiTest(async(call)=>{
 const email="rotate@example.test",oldPassword="original-password-123",newPassword="new-password-456";
 assert.equal((await call("/v1/auth/register","POST",{email,password:oldPassword})).status,201);
 const first=(await call("/v1/auth/login","POST",{email,password:oldPassword})).body.token;
 const second=(await call("/v1/auth/login","POST",{email,password:oldPassword})).body.token;
 assert.equal((await call("/v1/auth/change-password","POST",{currentPassword:"incorrect",newPassword},first)).status,401);
 assert.equal((await call("/v1/auth/change-password","POST",{currentPassword:oldPassword,newPassword:"short"},first)).status,422);
 assert.equal((await call("/v1/me","GET",undefined,second)).status,200);
 const rotated=await call("/v1/auth/change-password","POST",{currentPassword:oldPassword,newPassword},first);
 assert.equal(rotated.status,200);
 assert.equal(rotated.body.sessionsRevoked,true);
 assert.equal((await call("/v1/me","GET",undefined,first)).status,401);
 assert.equal((await call("/v1/me","GET",undefined,second)).status,401);
 assert.equal((await call("/v1/auth/login","POST",{email,password:oldPassword})).status,401);
 assert.equal((await call("/v1/auth/login","POST",{email,password:newPassword})).status,200);
}));
