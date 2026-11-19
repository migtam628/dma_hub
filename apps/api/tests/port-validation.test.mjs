import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const server=fileURLToPath(new URL("../src/server.mjs",import.meta.url));
for(const value of ["0","65536","-1","abc","1.5"," 8787","8787 ","","999999999999999999999999"]){
 test("rejects invalid API PORT "+JSON.stringify(value)+" before startup",()=>{
  const run=spawnSync(process.execPath,[server],{
   env:{...process.env,PORT:value,HOST:"127.0.0.1",DB_PATH:"/invalid/path/should-not-be-created.sqlite"},
   encoding:"utf8",timeout:5000
  });
  assert.equal(run.status,1,run.stderr);
  assert.match(run.stderr,/refuses invalid PORT/);
  assert.doesNotMatch(run.stderr,/ENOENT|EACCES|SQLITE/);
 });
}
