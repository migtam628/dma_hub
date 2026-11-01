import test from "node:test";
import assert from "node:assert/strict";
import {compareXboxQASessions} from "../src/xbox-qa-compare.mjs";
import {createApp} from "../src/app.mjs";

const sample=(gameBuild="1.0",consoleOS="10.0",edge="passed")=>({
 schemaVersion:1,consoleModel:"series_s",gameId:"bo7",
 installedBuild:gameBuild,consoleOS,testDate:"2026-11-01",
 display:"QA monitor",controller:"Standard Xbox controller",evidenceUrl:"",
 notes:"Synthetic report for automated tests; not actual Xbox evidence.",
 physicalTestConfirmed:true,checks:{
  edge_load:edge,site_navigation:"passed",layout:"untested",
  wizard_input:"not_applicable",local_persistence:"untested",
  text_export:"untested",print_pdf:"untested",
  remote_play:"untested",hdmi_capture:"untested"
 }
});
test("reported pass-to-fail counts as regression without game certification",()=>{
 const output=compareXboxQASessions(sample(),sample("2.0","11.0","failed"));
 assert.equal(output.regressions,1);
 assert.equal(output.improvements,0);
 assert.equal(output.requiresManualRetest,true);
 assert.equal(output.gameBuildChanged,true);
 assert.equal(output.consoleOSChanged,true);
 assert.equal(output.changes.find(x=>x.id==="edge_load").change,"reported_regression");
 assert.equal(output.independentlyVerified,false);
 assert.equal(output.gameCompatibilityVerified,false);
 assert.equal(output.downloadEnabled,false);
});
test("unknown-to-pass is not automatically a regression or independent improvement",()=>{
 const earlier=sample();earlier.checks.edge_load="untested";
 const later=sample();later.checks.edge_load="passed";
 const r=compareXboxQASessions(earlier,later);
 assert.equal(r.regressions,0);
 assert.equal(r.improvements,0);
 assert.equal(r.changes.find(x=>x.id==="edge_load").change,"changed_or_unverified");
 assert.equal(r.requiresManualRetest,false);
});
test("compare refuses different model or title",()=>{
 assert.throws(()=>compareXboxQASessions(sample(),{...sample(),consoleModel:"series_x"}),/same game/);
 assert.throws(()=>compareXboxQASessions(sample(),{...sample(),gameId:"mw4"}),/same game/);
});
test("comparison API stays private, rejects cross-model results and records a changed build",async()=>{
 let now=100_000;
 const app=createApp({clock:()=>++now});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 const request=async(path,method="GET",body,token)=>{
  const headers={"Content-Type":"application/json"};
  if(token)headers.Authorization="Bearer "+token;
  const res=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:res.status,data:await res.json()};
 };
 try{
  const password="very-long-xbox-comparison-password";
  for(const email of ["xbox-compare-admin@test.invalid","xbox-compare-user@test.invalid"])
   assert.equal((await request("/v1/auth/register","POST",{email,password})).status,201);
  const admin=(await request("/v1/auth/login","POST",{email:"xbox-compare-admin@test.invalid",password})).data.token;
  const customer=(await request("/v1/auth/login","POST",{email:"xbox-compare-user@test.invalid",password})).data.token;
  app.db.prepare("UPDATE users SET role='admin' WHERE email='xbox-compare-admin@test.invalid'").run();
  const path="/v1/admin/xbox-qa";
  const first=await request(path,"POST",{session:sample("1.0","10.0","passed")},admin);
  const second=await request(path,"POST",{session:sample("2.0","10.0","failed")},admin);
  const other=await request(path,"POST",{session:{...sample("1.0"),consoleModel:"series_x"}},admin);
  assert.equal(first.status,201);assert.equal(second.status,201);assert.equal(other.status,201);
  const url=path+"/"+first.data.id+"/compare?with="+second.data.id;
  assert.equal((await request(url)).status,401);
  assert.equal((await request(url,"GET",undefined,customer)).status,403);
  const output=await request(url,"GET",undefined,admin);
  assert.equal(output.status,200);
  assert.equal(output.data.gameBuildChanged,true);
  assert.equal(output.data.regressions,1);
  assert.equal(output.data.downloadEnabled,false);
  assert.equal(output.data.baselineId,first.data.id);
  assert.equal(output.data.candidateId,second.data.id);
  assert.equal(output.data.notes,undefined);
  assert.equal(output.data.session,undefined);
  assert.equal((await request(path+"/"+first.data.id+"/compare?with="+other.data.id,"GET",undefined,admin)).status,422);
  assert.equal((await request(path+"/"+first.data.id+"/compare?with="+first.data.id,"GET",undefined,admin)).status,422);
  assert.equal((await request(path+"/"+first.data.id+"/compare?with=not-uuid","GET",undefined,admin)).status,422);
  assert.equal((await request("/v1/games/call-of-duty/qa-status")).data.items.length,0);
 }finally{await app.close()}
});
