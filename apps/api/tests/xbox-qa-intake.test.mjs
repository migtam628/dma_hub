import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/app.mjs";
import {normalizeXboxQAInput} from "../src/xbox-qa-intake.mjs";

const survey=()=>({
 schemaVersion:1,consoleModel:"series_x",gameId:"bo7",installedBuild:"1.23.456",
 consoleOS:"10.0.26100.1000",testDate:"2026-11-01",
 display:"Synthetic 4K fixture",controller:"Standard Xbox controller",
 evidenceUrl:"https://example.test/private-fixture",
 notes:"Synthetic test fixture only. Not physical console QA proof.",
 physicalTestConfirmed:true,checks:{
  edge_load:"failed",site_navigation:"untested",layout:"untested",
  wizard_input:"not_applicable",local_persistence:"untested",
  text_export:"untested",print_pdf:"untested",
  remote_play:"untested",hdmi_capture:"untested"
 }
});
test("private Xbox report validator accepts v1 exports but not invented empty approvals",()=>{
 assert.equal(normalizeXboxQAInput({session:survey()}).gameId,"bo7");
 assert.equal(normalizeXboxQAInput({...survey(),secret:"unexpected"}).secret,undefined);
 assert.equal(normalizeXboxQAInput({...survey(),checks:{...survey().checks,edge_load:"verified"}}),null);
 assert.equal(normalizeXboxQAInput({...survey(),physicalTestConfirmed:false}),null);
 assert.equal(normalizeXboxQAInput({...survey(),evidenceUrl:"http://example.test"}),null);
 assert.equal(normalizeXboxQAInput({...survey(),testDate:"2026-02-31"}),null);
 assert.equal(normalizeXboxQAInput({...survey(),notes:"short"}),null);
 assert.equal(normalizeXboxQAInput({...survey(),consoleModel:"unknown"}),null);
 const blank=survey();
 blank.checks.edge_load="untested";
 assert.equal(normalizeXboxQAInput(blank),null);
});
test("Xbox QA intake and triage are admin-only, private, immutable and versioned",async()=>{
 let now=100_000;
 const app=createApp({clock:()=>++now});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 async function request(path,method="GET",body,token,version){
  const headers={"Content-Type":"application/json"};
  if(token)headers.Authorization="Bearer "+token;
  if(version)headers["If-Match"]=String(version);
  const result=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:result.status,data:await result.json()};
 }
 const password="long-xbox-admin-test-password";
 const path="/v1/admin/xbox-qa";
 try{
  for(const email of ["xbox-admin@test.invalid","xbox-customer@test.invalid"])
   assert.equal((await request("/v1/auth/register","POST",{email,password})).status,201);
  const admin=(await request("/v1/auth/login","POST",{email:"xbox-admin@test.invalid",password})).data.token;
  const customer=(await request("/v1/auth/login","POST",{email:"xbox-customer@test.invalid",password})).data.token;
  app.db.prepare("UPDATE users SET role='admin' WHERE email='xbox-admin@test.invalid'").run();
  assert.equal((await request(path)).status,401);
  assert.equal((await request(path,"GET",undefined,customer)).status,403);
  assert.equal((await request(path,"POST",{session:survey()},customer)).status,403);
  assert.equal((await request(path,"POST",{session:{...survey(),checks:{...survey().checks,edge_load:"yes"}}},admin)).status,422);
  const created=await request(path,"POST",{kind:"dma-hub-xbox-qa-v1",session:survey()},admin);
  assert.equal(created.status,201);
  assert.equal(created.data.state,"submitted");
  assert.equal(created.data.independentlyCertified,false);
  assert.equal(created.data.downloadEnabled,false);
  const id=created.data.id,detail=path+"/"+id;
  assert.equal((await request(path,"POST",{session:survey()},admin)).status,409,"exact repeated submission is deduplicated");
  const list=await request(path,"GET",undefined,admin);
  assert.equal(list.status,200);
  assert.equal(list.data.publicResults,false);
  assert.equal(list.data.items.length,1);
  assert.equal(list.data.items[0].gameBuild,"1.23.456");
  assert.equal(list.data.items[0].evidenceUrl,undefined,"list excludes private evidence");
  assert.equal(list.data.items[0].notes,undefined,"list excludes private operator notes");
  assert.equal((await request(detail,"GET",undefined,customer)).status,403);
  assert.equal((await request(detail,"GET")).status,401);
  const initial=(await request(detail,"GET",undefined,admin)).data;
  assert.equal(initial.session.notes,survey().notes);
  assert.equal(initial.triageHistory.length,1);
  assert.equal(initial.triageHistory[0].state,"submitted");
  assert.equal((await request(detail,"PATCH",{state:"triaged",note:"Record received in review queue"},customer,1)).status,403);
  assert.equal((await request(detail,"PATCH",{state:"triaged",note:"Record received in review queue"},admin)).status,428);
  assert.equal((await request(detail,"PATCH",{state:"triaged",note:"short"},admin,1)).status,422);
  assert.equal((await request(detail,"PATCH",{state:"approved",note:"No such approval exists"},admin,1)).status,422);
  const triage=await request(detail,"PATCH",{state:"triaged",note:"Operator report reviewed but evidence not independently confirmed"},admin,1);
  assert.equal(triage.status,200);
  assert.equal(triage.data.version,2);
  assert.equal(triage.data.downloadEnabled,false);
  assert.equal((await request(detail,"PATCH",{state:"retest_required",note:"Stale version is rejected"},admin,1)).status,409);
  const retest=await request(detail,"PATCH",{state:"retest_required",note:"Request real Xbox console screenshots for this version"},admin,2);
  assert.equal(retest.status,200);
  assert.equal(retest.data.version,3);
  const final=(await request(detail,"GET",undefined,admin)).data;
  assert.deepEqual(final.triageHistory.map(e=>e.state),["submitted","triaged","retest_required"]);
  assert.equal(final.independentlyCertified,false);
  assert.equal((await request("/v1/admin/audit","GET",undefined,admin)).status,200);
  assert.equal((await request("/v1/games/call-of-duty/qa-status")).data.items.length,0,
    "Xbox intake must never publish game compatibility");
  assert.throws(()=>app.db.prepare("DELETE FROM xbox_qa_submissions WHERE id=?").run(id),/immutable xbox QA submission/);
  assert.throws(()=>app.db.prepare("UPDATE xbox_qa_triage_events SET state='triaged' WHERE submission_id=?").run(id),/immutable xbox QA triage event/);
 }finally{await app.close()}
});
