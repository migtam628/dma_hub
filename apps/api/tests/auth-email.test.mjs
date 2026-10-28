import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";
import {createResendTransport} from "../src/mailer.mjs";

async function setup(fn,options={}){
 const outgoing=[];
 const sendEmail=options.sendEmail===false?null:async mail=>{outgoing.push(mail);return true};
 const app=createApp({sendEmail,requireEmailVerification:options.requireEmailVerification??true,clock:options.clock||(()=>Date.now())});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 const call=async(path,body,method="POST",auth)=>{
  const r=await fetch(base+path,{method,headers:{"Content-Type":"application/json",...(auth?{Authorization:"Bearer "+auth}:{})},body:method==="GET"?undefined:JSON.stringify(body)});
  return {status:r.status,body:await r.json()};
 };
 try{await fn({app,call,outgoing})}finally{await app.close()}
}
test("email verification requires a configured transport",()=>{
 assert.throws(()=>createApp({requireEmailVerification:true}),/requires a configured mail transport/);
});
test("verification tokens are hashed, expire, cannot be reused, and gate login",async()=>setup(async({app,call,outgoing})=>{
 const email="verify@example.test",password="long-password-123";
 const reg=await call("/v1/auth/register",{email,password});
 assert.equal(reg.status,201);assert.equal(reg.body.verificationRequired,true);assert.equal(reg.body.mailAccepted,true);
 assert.equal(outgoing.length,1);assert.equal(outgoing[0].kind,"verify_email");
 const raw=outgoing[0].token;
 assert.equal(raw.length,43);
 const row=app.db.prepare("SELECT token_hash FROM auth_tokens").get();
 assert.notEqual(row.token_hash,raw);
 assert.equal((await call("/v1/auth/login",{email,password})).status,403);
 assert.equal((await call("/v1/auth/verify-email",{token:raw+"x"})).status,400);
 assert.equal((await call("/v1/auth/verify-email",{token:raw})).status,200);
 assert.equal((await call("/v1/auth/verify-email",{token:raw})).status,400);
 const login=await call("/v1/auth/login",{email,password});
 assert.equal(login.status,200);
 assert.equal(login.body.user.emailVerified,true);
}));
test("verification resend invalidates the old token and is enumeration-safe",async()=>setup(async({call,outgoing})=>{
 const email="resend@example.test",password="long-password-123";
 await call("/v1/auth/register",{email,password});
 const original=outgoing.at(-1).token;
 const unknown=await call("/v1/auth/request-verification",{email:"unknown@example.test"});
 const known=await call("/v1/auth/request-verification",{email});
 assert.equal(unknown.status,202);assert.equal(known.status,202);
 assert.deepEqual(unknown.body,known.body);
 assert.equal((await call("/v1/auth/verify-email",{token:original})).status,400);
 assert.equal((await call("/v1/auth/verify-email",{token:outgoing.at(-1).token})).status,200);
}));
test("password reset revokes old sessions, rejects replay, and hides account existence",async()=>setup(async({app,call,outgoing})=>{
 const email="reset@example.test",password="long-password-123",next="different-password-456";
 await call("/v1/auth/register",{email,password});
 await call("/v1/auth/verify-email",{token:outgoing.at(-1).token});
 const login=await call("/v1/auth/login",{email,password}),session=login.body.token;
 const unknown=await call("/v1/auth/forgot-password",{email:"unknown@example.test"});
 const known=await call("/v1/auth/forgot-password",{email});
 assert.deepEqual(known,unknown);
 const token=outgoing.at(-1).token;
 assert.equal((await call("/v1/auth/reset-password",{token,newPassword:"short"})).status,422);
 assert.equal((await call("/v1/auth/reset-password",{token,newPassword:next})).status,200);
 assert.equal((await call("/v1/auth/reset-password",{token,newPassword:next})).status,400);
 assert.equal((await call("/v1/me",undefined,"GET",session)).status,401);
 assert.equal((await call("/v1/auth/login",{email,password})).status,401);
 assert.equal((await call("/v1/auth/login",{email,password:next})).status,200);
 assert.equal(app.db.prepare("SELECT count(*) n FROM auth_tokens").get().n,0);
}));
test("expired recovery token fails and bad-purpose token cannot cross over",async()=>{
 let now=1000;
 await setup(async({call,outgoing})=>{
  await call("/v1/auth/register",{email:"expire@example.test",password:"long-password-123"});
  const verify=outgoing.at(-1).token;
  assert.equal((await call("/v1/auth/reset-password",{token:verify,newPassword:"new-long-password"})).status,400);
  await call("/v1/auth/verify-email",{token:verify});
  await call("/v1/auth/forgot-password",{email:"expire@example.test"});
  const reset=outgoing.at(-1).token;
  now+=60*60*1000+1;
  assert.equal((await call("/v1/auth/reset-password",{token:reset,newPassword:"another-long-password"})).status,400);
 },{clock:()=>now});
});
test("mail is fail-closed and provider failure cannot leak a code in HTTP response",async()=>{
 const sent=[];
 const app=createApp({sendEmail:async mail=>{sent.push(mail);throw new Error("provider secret or token="+mail.token)},requireEmailVerification:true});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 try{
  const r=await fetch("http://127.0.0.1:"+app.server.address().port+"/v1/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"delivery@example.test",password:"long-password-123"})});
  const value=await r.json();
  assert.equal(r.status,201);assert.equal(value.mailAccepted,false);
  assert.ok(!JSON.stringify(value).includes(sent[0].token));
  assert.equal(app.db.prepare("SELECT count(*) n FROM auth_tokens").get().n,0);
 }finally{await app.close()}
});
test("disabled email service returns explicit unavailable status",async()=>setup(async({call})=>{
 assert.equal((await call("/v1/auth/forgot-password",{email:"a@example.test"})).status,503);
 assert.equal((await call("/v1/auth/request-verification",{email:"a@example.test"})).status,503);
},{sendEmail:false,requireEmailVerification:false}));
test("Resend transport uses server-only headers and plain-text payload",async()=>{
 let target,options;
 const send=createResendTransport({apiKey:"test-api-key-123",from:"security@example.test",fetchImpl:async(u,o)=>{target=u;options=o;return {ok:true}}});
 await send({kind:"verify_email",to:"somebody@example.test",token:"abcdef",expiresAt:10000});
 assert.equal(target,"https://api.resend.com/emails");
 assert.equal(options.headers.Authorization,"Bearer test-api-key-123");
 const payload=JSON.parse(options.body);
 assert.equal(payload.from,"security@example.test");assert.deepEqual(payload.to,["somebody@example.test"]);
 assert.ok(payload.text.includes("abcdef"));
 assert.equal(createResendTransport({}),null);
 assert.throws(()=>createResendTransport({apiKey:"secret-only-key"}),/Configure both/);
});
