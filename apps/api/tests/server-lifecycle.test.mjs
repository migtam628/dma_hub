import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const script=new URL("../src/server.mjs",import.meta.url);
function launch(env){
 const child=spawn(process.execPath,[fileURLToPath(script)],{
  env:{...process.env,...env},stdio:["ignore","pipe","pipe"]
 });
 let output="";
 child.stdout.on("data",data=>{output+=data});
 child.stderr.on("data",data=>{output+=data});
 return {child,output:()=>output};
}
function finished(child,timeout=8000){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{child.kill("SIGKILL");reject(new Error("API process did not exit"))},timeout);
  child.once("error",error=>{clearTimeout(timer);reject(error)});
  child.once("exit",(code,signal)=>{clearTimeout(timer);resolve({code,signal})});
 });
}
test("API exits nonzero with an occupied loopback port",async()=>{
 const blocker=createServer();
 await new Promise(resolve=>blocker.listen(0,"127.0.0.1",resolve));
 const dir=mkdtempSync(join(tmpdir(),"dma-api-bind-"));
 try{
  const run=launch({HOST:"127.0.0.1",PORT:String(blocker.address().port),DB_PATH:join(dir,"api.sqlite")});
  const result=await finished(run.child);
  assert.notEqual(result.code,0);
  assert.match(run.output(),/failed to listen: EADDRINUSE/);
 }finally{
  await new Promise(resolve=>blocker.close(resolve));
  rmSync(dir,{recursive:true,force:true});
 }
});
test("API shuts down after SIGTERM and releases its listener",{skip:process.platform==="win32"},async()=>{
 const dir=mkdtempSync(join(tmpdir(),"dma-api-stop-"));
 const run=launch({HOST:"127.0.0.1",PORT:"0",DB_PATH:join(dir,"api.sqlite")});
 try{
  const port=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error("API did not start")),8000);
   run.child.stdout.on("data",data=>{
    const match=String(data).match(/127\.0\.0\.1:(\d+)/);
    if(match){clearTimeout(timer);resolve(Number(match[1]))}
   });
   run.child.once("exit",()=>{clearTimeout(timer);reject(new Error("API exited early"))});
  });
  assert.ok(port>0);
  const resultPromise=finished(run.child);
  run.child.kill("SIGTERM");
  const result=await resultPromise;
  assert.equal(result.code,0);
 }finally{
  if(run.child.exitCode===null)run.child.kill("SIGKILL");
  rmSync(dir,{recursive:true,force:true});
 }
});
