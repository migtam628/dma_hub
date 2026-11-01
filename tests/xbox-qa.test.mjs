import test from "node:test";
import assert from "node:assert/strict";
import {
 XBOX_MODELS,XBOX_QA_CHECKS,emptyXboxQASession,sanitizeXboxQASession,
 evaluateXboxQASession,xboxQAMarkdown
} from "../apps/web/src/xbox-qa-core.mjs";

const fixture=()=>{
 const s=emptyXboxQASession();
 s.consoleModel="series_x";s.gameId="bo7";s.installedBuild="1.23.456";
 s.consoleOS="10.0.26100.1000";s.testDate="2026-11-01";
 s.notes="Observed navigation worked on the physical console";
 s.physicalTestConfirmed=true;s.checks.edge_load="passed";
 return s;
};
test("Xbox questionnaire does not invent a hardware model or QA evidence",()=>{
 const blank=emptyXboxQASession();
 assert.equal(blank.consoleModel,"unknown");
 assert.equal(blank.gameId,"");
 assert.ok(XBOX_QA_CHECKS.length>=8);
 assert.ok(XBOX_MODELS.some(m=>m.id==="series_s"));
 const assessment=evaluateXboxQASession(blank);
 assert.equal(assessment.state,"draft");
 assert.equal(assessment.readyForLocalRecord,false);
 assert.equal(assessment.observed,0);
 assert.equal(assessment.testEvidenceIndependentlyVerified,false);
 assert.equal(assessment.downloadEnabled,false);
 assert.equal(assessment.consoleAppAvailable,false);
 assert.equal(assessment.dmaGameMemorySupported,false);
});
test("completed physical test has a recordable operator observation, never certification",()=>{
 const result=evaluateXboxQASession(fixture());
 assert.equal(result.state,"operator_reported_observations");
 assert.equal(result.readyForLocalRecord,true);
 assert.equal(result.passing,1);
 assert.equal(result.failures,0);
 assert.equal(result.testEvidenceIndependentlyVerified,false);
 assert.equal(result.consoleCertification,false);
 assert.equal(result.downloadEnabled,false);
});
test("failed browser checks remain visible as operator-reported issues",()=>{
 const f=fixture();
 f.checks.site_navigation="failed";
 f.checks.print_pdf="blocked";
 const result=evaluateXboxQASession(f);
 assert.equal(result.state,"operator_reported_issues");
 assert.equal(result.failures,2);
 assert.equal(result.readyForLocalRecord,true);
});
test("a checkbox alone cannot manufacture a physical test record",()=>{
 for(const key of ["consoleModel","gameId","installedBuild","consoleOS","testDate","notes"]){
  const f=fixture();
  f[key]=key==="consoleModel"?"unknown":"";
  const result=evaluateXboxQASession(f);
  assert.equal(result.readyForLocalRecord,false,key);
 }
 const f=fixture();
 f.checks.edge_load="untested";
 assert.equal(evaluateXboxQASession(f).readyForLocalRecord,false);
 f.checks.edge_load="not_applicable";
 assert.equal(evaluateXboxQASession(f).readyForLocalRecord,false);
 f.checks.edge_load="passed";f.physicalTestConfirmed=false;
 assert.equal(evaluateXboxQASession(f).readyForLocalRecord,false);
});
test("Xbox One and incompatible game listing never become DMA Hub game compatibility",()=>{
 const f=fixture();
 f.consoleModel="one";f.gameId="mw4";
 const result=evaluateXboxQASession(f);
 assert.equal(result.readyForLocalRecord,true);
 assert.equal(result.gamePlatformListedFromReference,false);
 assert.ok(result.gameAvailabilityCaveat.includes("no confirmed current Xbox support"));
 assert.equal(result.dmaGameMemorySupported,false);
});
test("versioned import drops unknown keys and rejects invalid fields",()=>{
 const good=fixture();
 const clean=sanitizeXboxQASession({...good,adminApproved:true,token:"not copied",
  checks:{...good.checks,untrustedCheck:"passed"}});
 assert.equal(Object.hasOwn(clean,"adminApproved"),false);
 assert.equal(Object.hasOwn(clean,"token"),false);
 assert.equal(Object.hasOwn(clean.checks,"untrustedCheck"),false);
 assert.throws(()=>sanitizeXboxQASession({...good,schemaVersion:2}),/Unsupported Xbox QA/);
 assert.throws(()=>sanitizeXboxQASession({...good,consoleModel:"fake_xbox"}),/Unknown Xbox/);
 assert.throws(()=>sanitizeXboxQASession({...good,gameId:"fortnite"}),/Unknown Call/);
 assert.throws(()=>sanitizeXboxQASession({...good,testDate:"2026-02-30"}),/Invalid test date/);
 assert.throws(()=>sanitizeXboxQASession({...good,physicalTestConfirmed:"yes"}),/boolean/);
 assert.throws(()=>sanitizeXboxQASession({...good,notes:"x".repeat(1201)}),/Invalid notes/);
 assert.throws(()=>sanitizeXboxQASession({...good,checks:{...good.checks,edge_load:"verified_by_microsoft"}}),/Invalid QA outcome/);
});
test("evidence URLs must use HTTPS without secrets or credentials",()=>{
 const good=fixture();
 assert.equal(sanitizeXboxQASession({...good,evidenceUrl:"https://example.org/qa/report"}).evidenceUrl,"https://example.org/qa/report");
 for(const invalid of [
  "http://example.org/report","file:///etc/passwd","https://user:pass@example.org/report",
  "javascript:alert(1)","https://example.org/report with spaces"
 ]){
  assert.throws(()=>sanitizeXboxQASession({...good,evidenceUrl:invalid}),/Evidence URL/);
 }
});
test("export labels self-reported data and includes every test outcome",()=>{
 const f=fixture();
 const report=xboxQAMarkdown(f);
 assert.match(report,/Operator notes/);
 assert.match(report,/not independently certified/i);
 assert.match(report,/No/);
 assert.match(report,/Microsoft Edge loads the DMA Hub website: passed/);
 assert.match(report,/Xbox Series X/);
 assert.match(report,/1.23.456/);
});
