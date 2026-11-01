import test from "node:test";
import assert from "node:assert/strict";
import {COD_PILOT,blankCODPilot,validateCODPilot,assessCODPilot,codPilotText} from "../apps/web/src/cod-pilot-core.mjs";

const BEFORE="2026-11-01T12:00:00.000Z";
const AFTER="2026-11-06T05:00:00.000Z";
function completed(){
 const p=blankCODPilot();
 p.client="steam";p.installedBuild="unverified-example-build";p.os="windows_11";
 p.cpuModel="Vendor CPU — model declared";p.gpuModel="Vendor GPU — model declared";
 p.ramGB=16;p.vramGB=12;p.ssdFreeGB=250;
 for(const field of ["tpm2","secureBoot","directX12","cpuAvx","broadband"])p[field]="yes";
 return p;
}
test("Call of Duty pilot has official source links, no fictitious internal game build",()=>{
 assert.equal(COD_PILOT.edition,"Call of Duty: Warzone (PC)");
 assert.equal(COD_PILOT.specs.minimum.ramGB,8);
 assert.equal(COD_PILOT.specs.minimum.vramGB,3);
 assert.equal(COD_PILOT.specs.minimum.ssdFreeGB,116);
 assert.match(COD_PILOT.sourceUrls.requirements,/support\.activision\.com/);
 assert.match(COD_PILOT.sourceUrls.enforcement,/support\.activision\.com/);
 assert.equal(blankCODPilot().installedBuild,"");
});
test("blank survey fails closed and never claims game support or activation",()=>{
 const result=assessCODPilot(blankCODPilot(),BEFORE);
 assert.equal(result.status,"manual_review_required");
 assert.ok(result.unknowns.length>=8);
 for(const key of ["cpuGpuEquivalenceVerified","exactBuildVerified","hardwareTestPerformed","publisherAuthorizationVerified","gameCompatibilityVerified","dmaSoftwareSupported","downloadEnabled"])
  assert.equal(result[key],false,key);
 assert.equal(result.updateReviewDue,false);
});
test("reported incomplete RAM and storage are below official prerequisites",()=>{
 const p=completed();p.ramGB=7.9;p.ssdFreeGB=115.9;
 const r=assessCODPilot(p,BEFORE);
 assert.equal(r.status,"below_official_prerequisites");
 assert.ok(r.blockers.some(s=>s.includes("System memory")));
 assert.ok(r.blockers.some(s=>s.includes("Free SSD")));
 assert.equal(r.downloadEnabled,false);
});
test("disabled TPM or Secure Boot report a problem instead of bypassing safeguards",()=>{
 const p=completed();p.tpm2="no";p.secureBoot="no";
 const r=assessCODPilot(p,BEFORE);
 assert.equal(r.status,"below_official_prerequisites");
 assert.ok(r.blockers.some(s=>s.includes("TPM")));
 assert.ok(r.blockers.some(s=>s.includes("Secure Boot")));
 assert.equal(r.dmaSoftwareSupported,false);
});
test("full manually reported baseline is NOT product verification",()=>{
 const r=assessCODPilot(completed(),BEFORE);
 assert.equal(r.status,"self_reported_baseline");
 assert.equal(r.blockers.length,0);
 assert.equal(r.unknowns.length,0);
 assert.equal(r.cpuGpuEquivalenceVerified,false);
 assert.equal(r.exactBuildVerified,false);
 assert.equal(r.hardwareTestPerformed,false);
 assert.equal(r.gameCompatibilityVerified,false);
 assert.equal(r.downloadEnabled,false);
});
test("unknown platform, launcher, game build or security prerequisite requires manual review",()=>{
 const p=completed();p.client="unknown";p.installedBuild="";p.secureBoot="unknown";
 const r=assessCODPilot(p,BEFORE);
 assert.equal(r.status,"manual_review_required");
 assert.ok(r.unknowns.some(x=>x.includes("Exact installed game build")));
 assert.equal(r.downloadEnabled,false);
});
test("announced Nov 6 update window triggers re-evaluation without inventing patch deployment",()=>{
 const p=completed();
 const before=assessCODPilot(p,"2026-11-06T04:59:59.000Z");
 const on=assessCODPilot(p,AFTER);
 assert.equal(before.updateReviewDue,false);
 assert.equal(on.updateReviewDue,true);
 assert.equal(on.exactBuildVerified,false);
 assert.match(codPilotText(p,AFTER),/DUE \(announced release window reached\)/);
 assert.match(codPilotText(p,BEFORE),/independently confirm what shipped/i);
});
test("malformed survey inputs are rejected, unknown extra fields are not carried into exports",()=>{
 const p=completed();
 assert.throws(()=>validateCODPilot({...p,schemaVersion:2}),/Unsupported/);
 assert.throws(()=>validateCODPilot({...p,gameId:"fortnite"}),/Unsupported/);
 assert.throws(()=>validateCODPilot({...p,client:"bad-client"}),/Unsupported/);
 assert.throws(()=>validateCODPilot({...p,ramGB:NaN}),/measurement/);
 assert.throws(()=>validateCODPilot({...p,ramGB:-1}),/measurement/);
 assert.throws(()=>validateCODPilot({...p,ramGB:2.35}),/measurement/);
 assert.throws(()=>validateCODPilot({...p,tpm2:"bypassed"}),/prerequisite/);
 const sanitized=validateCODPilot({...p,adminApproved:true,secretToken:"not copied"});
 assert.equal(Object.hasOwn(sanitized,"adminApproved"),false);
 assert.equal(Object.hasOwn(sanitized,"secretToken"),false);
});
test("review report documents policy and operator verification gates, not cheat compatibility",()=>{
 const txt=codPilotText(completed(),BEFORE);
 assert.match(txt,/Call of Duty: Warzone PC pilot/);
 assert.match(txt,/Official PC requirements/);
 assert.match(txt,/rights\/permissions/);
 assert.match(txt,/No game software or cheat download is enabled/);
 assert.match(txt,/Game build \(unverified\)/);
});
