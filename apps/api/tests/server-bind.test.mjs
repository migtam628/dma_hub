import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

test("local API entrypoint refuses public or ambiguous HOST values",()=>{
 for(const host of ["0.0.0.0","::","localhost","192.168.1.2","example.com","127.0.0.2"]){
  const result=spawnSync(process.execPath,["src/server.mjs"],{
   cwd:fileURLToPath(new URL("../",import.meta.url)),
   env:{...process.env,HOST:host,PORT:"0"},encoding:"utf8",timeout:10000
  });
  assert.equal(result.status,1,"HOST="+host+" "+result.stderr);
  assert.match(result.stderr,/refuses non-loopback HOST/);
 }
});

test("Docker bind opt-in never permits public IPs or wildcard IPv6",()=>{
 for(const host of ["::","192.168.1.2","localhost"]){
  const result=spawnSync(process.execPath,["src/server.mjs"],{
   cwd:fileURLToPath(new URL("../",import.meta.url)),
   env:{...process.env,HOST:host,DMA_CONTAINER_BIND:"1",PORT:"0"},encoding:"utf8",timeout:10000
  });
  assert.equal(result.status,1,"HOST="+host+" "+result.stderr);
 }
});
