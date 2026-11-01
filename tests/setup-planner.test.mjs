import test from "node:test";
import assert from "node:assert/strict";
import {createEmptySetupPlan,evaluateSetupPlan,sanitizeSetupPlan,setupPlanMarkdown,SETUP_ITEMS} from "../apps/web/src/setup-planner-core.mjs";

test("new setup plan does not claim hardware or game compatibility",()=>{
 const p=createEmptySetupPlan(),r=evaluateSetupPlan(p);
 assert.equal(p.schemaVersion,1);
 assert.equal(r.status,"needs_review");
 assert.equal(r.confirmed,0);
 assert.equal(r.total,SETUP_ITEMS.length);
 assert.equal(r.compatibilityVerified,false);
 assert.equal(r.productAvailable,false);
 assert.equal(r.downloadAuthorized,false);
 assert.equal(r.manualInventoryOnly,true);
 assert.ok(r.externalGates.some(x=>/provenance/i.test(x)));
});
test("self-reported full inventory only means inventory documented, never compatibility verified",()=>{
 const p=createEmptySetupPlan();
 p.gameId="rust";p.gameBuild="2026.11.01";
 p.primaryOS="Windows 11";p.secondaryOS="Windows 10";
 for(const item of SETUP_ITEMS)p.checks[item.id]="yes";
 const r=evaluateSetupPlan(p);
 assert.equal(r.status,"inventory_documented");
 assert.equal(r.confirmed,r.total);
 assert.equal(r.compatibilityVerified,false);
 assert.equal(r.downloadAuthorized,false);
 assert.match(setupPlanMarkdown(p),/compatibility unverified/i);
});
test("a single missing item blocks readiness even with otherwise complete inventory",()=>{
 const p=createEmptySetupPlan();p.primaryOS="Windows 11";p.secondaryOS="Windows 11";
 for(const item of SETUP_ITEMS)p.checks[item.id]="yes";
 p.checks["trusted_source"]="no";
 const r=evaluateSetupPlan(p);
 assert.equal(r.status,"needs_setup");
 assert.ok(r.blockers.some(b=>b.includes("Official software source")));
});
test("unsupported or unknown OS is a manual review flag, not an automated denial or approval",()=>{
 const p=createEmptySetupPlan();
 for(const item of SETUP_ITEMS)p.checks[item.id]="yes";
 p.primaryOS="Other";p.secondaryOS="Windows 11";
 assert.equal(evaluateSetupPlan(p).status,"needs_review");
});
test("checklist import sanitizes fields and drops unrecognized keys",()=>{
 const p=createEmptySetupPlan();
 p.gameId="rust";p.notes="Local inventory notes";
 const parsed=sanitizeSetupPlan({...p,secretToken:"never carry through",checks:{...p.checks,unauthorized:"yes"}});
 assert.equal(parsed.gameId,"rust");assert.equal(parsed.notes,"Local inventory notes");
 assert.equal(Object.hasOwn(parsed,"secretToken"),false);
 assert.equal(Object.hasOwn(parsed.checks,"unauthorized"),false);
});
test("invalid checklist values, invalid OS and future schema reject imported content",()=>{
 const p=createEmptySetupPlan();
 assert.throws(()=>sanitizeSetupPlan({...p,schemaVersion:99}),/schema/i);
 assert.throws(()=>sanitizeSetupPlan({...p,primaryOS:"hacked"}),/operating system/i);
 assert.throws(()=>sanitizeSetupPlan({...p,checks:{...p.checks,primary_pc:"trusted"}}),/checklist choice/i);
 assert.throws(()=>sanitizeSetupPlan({...p,gameId:"../../secrets"}),/game category/i);
 assert.throws(()=>sanitizeSetupPlan({...p,notes:"x".repeat(1001)}),/field/i);
});
test("portable text export remains truthful and includes no network or execution operations",()=>{
 const p=createEmptySetupPlan();p.primaryOS="Windows 11";p.hardwareModel="Example hardware revision 1";
 const text=setupPlanMarkdown(p);
 assert.match(text,/Example hardware revision 1/);
 assert.match(text,/External approval gates — NOT satisfied/i);
 assert.match(text,/software license/i);
 assert.match(text,/download\/execute/i);
});
