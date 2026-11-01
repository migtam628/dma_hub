import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";

test("support tickets enforce owner privacy, optimistic versions and immutable replies",async()=>{
 let now=123000;const app=createApp({clock:()=>++now});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 const request=async(path,method="GET",body,token,version)=>{
  const headers={"Content-Type":"application/json"};
  if(token)headers.Authorization="Bearer "+token;
  if(version)headers["If-Match"]=String(version);
  const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:r.status,data:await r.json()};
 };
 try{
  const password="long-support-password-2026";
  for(const email of ["support-admin@test.invalid","one@test.invalid","two@test.invalid"])
   assert.equal((await request("/v1/auth/register","POST",{email,password})).status,201);
  const login=async email=>(await request("/v1/auth/login","POST",{email,password})).data.token;
  const admin=await login("support-admin@test.invalid"),one=await login("one@test.invalid"),two=await login("two@test.invalid");
  app.db.prepare("UPDATE users SET role='admin' WHERE email='support-admin@test.invalid'").run();
  const path="/v1/support/tickets";
  assert.equal((await request(path,"GET")).status,401);
  assert.equal((await request(path,"POST",{category:"setup",subject:"abc",message:"too short"},one)).status,422);
  assert.equal((await request(path,"POST",{category:"fake",subject:"Help with setup",message:"Please help with installation"},one)).status,422);
  const created=await request(path,"POST",{category:"hardware",subject:"Device setup question",message:"I need help documenting an approved test system."},one);
  assert.equal(created.status,201);assert.equal(created.data.notificationsConfigured,false);
  const id=created.data.id,url=path+"/"+id;
  assert.equal((await request(url,"GET",undefined,two)).status,404);
  assert.equal((await request(url,"GET",undefined,admin)).status,200);
  assert.equal((await request("/v1/admin/support/tickets","GET",undefined,one)).status,403);
  assert.equal((await request(path,"GET",undefined,two)).data.items.length,0);
  assert.equal((await request(path,"GET",undefined,one)).data.items.length,1);
  assert.equal((await request("/v1/admin/support/tickets","GET",undefined,admin)).data.items.length,1);
  assert.equal((await request(url+"/replies","POST",{message:"Please disclose other user tickets"},two,1)).status,404);
  assert.equal((await request(url+"/replies","POST",{message:"Adding a new detail"},one)).status,428);
  assert.equal((await request(url+"/replies","POST",{message:"ok"},one,1)).status,422);
  const reply=await request(url+"/replies","POST",{message:"Here is the approved hardware model."},one,1);
  assert.equal(reply.status,201);assert.equal(reply.data.state,"awaiting_staff");
  assert.equal((await request(url+"/replies","POST",{message:"Outdated response"},one,1)).status,409);
  const staff=await request(url+"/replies","POST",{message:"Please attach no secrets; what is the operating system?"},admin,2);
  assert.equal(staff.status,201);assert.equal(staff.data.state,"awaiting_customer");
  const ticket=(await request(url,"GET",undefined,one)).data;
  assert.equal(ticket.messages.length,3);
  assert.equal(ticket.messages[2].authorRole,"admin");
  assert.equal(ticket.messages[2].body.includes("operating system"),true);
  assert.equal((await request("/v1/admin/support/tickets/"+id,"PATCH",{state:"closed"},one,3)).status,403);
  const closed=await request("/v1/admin/support/tickets/"+id,"PATCH",{state:"closed"},admin,3);
  assert.equal(closed.status,200);assert.equal(closed.data.state,"closed");
  assert.equal((await request(url+"/replies","POST",{message:"I have more information"},one,4)).status,409);
  assert.equal((await request("/v1/admin/support/tickets/"+id,"PATCH",{state:"awaiting_staff"},admin,3)).status,409);
  assert.equal((await request("/v1/admin/support/tickets/"+id,"PATCH",{state:"awaiting_staff"},admin,4)).status,200);
  assert.equal((await request(url+"/replies","POST",{message:"Thank you for reopening this ticket"},one,5)).status,201);
  const events=app.db.prepare("SELECT to_state FROM support_events WHERE ticket_id=? ORDER BY version").all(id);
  assert.deepEqual(events.map(x=>x.to_state),["open","awaiting_staff","awaiting_customer","closed","awaiting_staff","awaiting_staff"]);
  assert.throws(()=>app.db.prepare("DELETE FROM support_messages WHERE ticket_id=?").run(id),/immutable support message/);
  assert.throws(()=>app.db.prepare("UPDATE support_events SET to_state='closed' WHERE ticket_id=?").run(id),/immutable support event/);
 }finally{await app.close()}
});
