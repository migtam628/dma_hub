import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";

test("audit log is read-only, admin-scoped, paginated and excludes account secrets",async()=>{
 let now=1_800_000_000_000;
 const app=createApp({clock:()=>now});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 async function call(path,method="GET",data,token){
  const res=await fetch(base+path,{method,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:data===undefined?undefined:JSON.stringify(data)});
  return {status:res.status,body:await res.json()};
 }
 try{
  for(const email of ["admin@audit.test","user@audit.test"]){
   assert.equal((await call("/v1/auth/register","POST",{email,password:"long-password-123"})).status,201);
  }
  const a=(await call("/v1/auth/login","POST",{email:"admin@audit.test",password:"long-password-123"})).body;
  const b=(await call("/v1/auth/login","POST",{email:"user@audit.test",password:"long-password-123"})).body;
  app.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(a.user.id);
  assert.equal((await call("/v1/admin/audit")).status,401);
  assert.equal((await call("/v1/admin/audit","GET",undefined,b.token)).status,403);
  for(const bad of ["?limit=0","?limit=101","?offset=-1","?offset=10001","?limit=5%20OR%201=1"]){
   assert.equal((await call("/v1/admin/audit"+bad,"GET",undefined,a.token)).status,422);
  }
  const first=await call("/v1/admin/audit?limit=2","GET",undefined,a.token);
  assert.equal(first.status,200);
  assert.equal(first.body.items.length,2);
  assert.equal(first.body.nextOffset,2);
  const second=await call("/v1/admin/audit?limit=2&offset=2","GET",undefined,a.token);
  assert.equal(second.status,200);
  assert.ok(second.body.items.length>=1);
  const ids=first.body.items.concat(second.body.items).map(x=>x.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(first.body.items.every(e=>e.action&&e.createdAt===now));
  assert.equal(JSON.stringify(first.body).includes(a.token),false);
  assert.equal(JSON.stringify(first.body).includes("long-password-123"),false);
  assert.equal(Object.keys(first.body.items[0]).sort().join(","),"action,actorId,createdAt,id,targetId");
  assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM audit").get().n,4);
 }finally{await app.close()}
});
