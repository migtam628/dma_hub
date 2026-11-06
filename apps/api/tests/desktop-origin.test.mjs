import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";

test("Windows desktop origin can reach local API while unauthorized origins are blocked",async()=>{
 const app=createApp({allowedOrigin:"http://localhost:5173",desktopOrigin:"http://tauri.localhost"});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const endpoint="http://127.0.0.1:"+app.server.address().port+"/healthz";
 try{
  for(const origin of ["http://localhost:5173","http://tauri.localhost"]){
   const result=await fetch(endpoint,{headers:{Origin:origin}});
   assert.equal(result.status,200);
   assert.equal(result.headers.get("access-control-allow-origin"),origin);
   assert.equal(result.headers.get("vary"),"Origin");
  }
  for(const origin of ["https://attacker.example","http://tauri.localhost.evil.example","null"]){
   const result=await fetch(endpoint,{headers:{Origin:origin}});
   assert.equal(result.status,403);
   assert.equal(result.headers.get("access-control-allow-origin"),null);
  }
  for(const origin of ["http://tauri.localhost","https://attacker.example"]){
   const preflight=await fetch(endpoint,{method:"OPTIONS",headers:{Origin:origin,"Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"Authorization"}});
   assert.equal(preflight.status,origin==="http://tauri.localhost"?204:403);
   assert.equal(preflight.headers.get("access-control-allow-origin"),origin==="http://tauri.localhost"?origin:null);
  }
  const noOrigin=await fetch(endpoint);
  assert.equal(noOrigin.status,200);
  assert.equal(noOrigin.headers.get("access-control-allow-origin"),null);
 }finally{await app.close()}
});
