// Shared browser/Node pure logic. Setup assessments are self-reported only.
// No game support, commercial eligibility or software execution is inferred.
export const SETUP_PLAN_SCHEMA=1;
export const SETUP_ITEMS=Object.freeze([
 {id:"primary_pc",label:"Primary Windows PC",detail:"Identify the computer and its supported operating system."},
 {id:"secondary_pc",label:"Separate companion PC",detail:"Identify the second machine and its operating system, when your authorized workflow calls for one."},
 {id:"hardware_documentation",label:"Hardware model and vendor documentation",detail:"Record device make/model and confirm approved usage."},
 {id:"physical_connections",label:"Approved connections and power",detail:"Check visible physical condition without opening, flashing, or probing any device."},
 {id:"trusted_source",label:"Official software source and checksums",detail:"Use only publisher-authorized release information and independently verified provenance."},
 {id:"support_contact",label:"Support and recovery information",detail:"Know where to obtain official documentation and how to report a failed setup."}
]);
const CHOICES=new Set(["yes","no","unknown"]);
const OS=new Set(["Windows 10","Windows 11","Other","Unknown"]);
const token=x=>typeof x==="string"?x.trim():"";
export function createEmptySetupPlan(){
 return {schemaVersion:SETUP_PLAN_SCHEMA,gameId:"",gameBuild:"",primaryOS:"Unknown",secondaryOS:"Unknown",
  hardwareModel:"",purpose:"evaluation",checks:Object.fromEntries(SETUP_ITEMS.map(c=>[c.id,"unknown"])),notes:""};
}
export function sanitizeSetupPlan(value){
 if(!value||typeof value!=="object"||Array.isArray(value)||value.schemaVersion!==SETUP_PLAN_SCHEMA)
  throw Error("Unsupported setup-plan schema");
 const out=createEmptySetupPlan();
 const str=(name,max)=>{const val=value[name];if(typeof val!=="string"||val.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(val))throw Error("Invalid setup-plan field: "+name);return val.trim()};
 out.gameId=str("gameId",64);
 if(out.gameId&&!/^[a-z0-9-]{3,64}$/.test(out.gameId))throw Error("Invalid game category");
 out.gameBuild=str("gameBuild",80);
 out.hardwareModel=str("hardwareModel",160);
 out.notes=str("notes",1000);
 out.purpose=str("purpose",40);
 if(!["evaluation","authorized_lab","personal_inventory"].includes(out.purpose))throw Error("Invalid plan purpose");
 if(!OS.has(value.primaryOS)||!OS.has(value.secondaryOS))throw Error("Invalid operating system");
 out.primaryOS=value.primaryOS;out.secondaryOS=value.secondaryOS;
 if(!value.checks||typeof value.checks!=="object"||Array.isArray(value.checks))throw Error("Invalid checklist");
 for(const check of SETUP_ITEMS){
  if(!CHOICES.has(value.checks[check.id]))throw Error("Invalid checklist choice: "+check.id);
  out.checks[check.id]=value.checks[check.id];
 }
 return out;
}
export function evaluateSetupPlan(raw){
 const p=sanitizeSetupPlan(raw);
 const missing=SETUP_ITEMS.filter(x=>p.checks[x.id]==="no");
 const unknown=SETUP_ITEMS.filter(x=>p.checks[x.id]==="unknown");
 const observed=SETUP_ITEMS.filter(x=>p.checks[x.id]==="yes");
 const osNeedsReview=!["Windows 10","Windows 11"].includes(p.primaryOS)||!["Windows 10","Windows 11"].includes(p.secondaryOS);
 const status=missing.length>0?"needs_setup":(unknown.length>0||osNeedsReview?"needs_review":"inventory_documented");
 const blockers=[
  ...missing.map(c=>c.label+" is marked missing"),
  ...unknown.map(c=>c.label+" has not been confirmed"),
  ...(osNeedsReview?["Windows platform suitability must be checked against an authorized product's actual requirements"]:[]),
  ...(!p.gameId||!p.gameBuild?["Game category/build has not been fully identified; no compatibility can be inferred"]:[])
 ];
 const externalGates=[
  "Current publisher-authorized software build and documented usage rights",
  "Independent game/build compatibility and hardware QA evidence",
  "Trusted software provenance and publisher signature checks",
  "Production distribution, support, entitlement and rollback controls"
 ];
 return {status,confirmed:observed.length,total:SETUP_ITEMS.length,blockers,externalGates,
  compatibilityVerified:false,downloadAuthorized:false,productAvailable:false,manualInventoryOnly:true};
}
export function setupPlanMarkdown(raw){
 const p=sanitizeSetupPlan(raw),r=evaluateSetupPlan(p);
 const status=r.status==="inventory_documented"?"Inventory documented — compatibility unverified":
  r.status==="needs_setup"?"Setup inventory incomplete":"Requires manual review";
 const checkLine=c=>"- ["+(p.checks[c.id]==="yes"?"x":" ")+"] "+c.label+" — "+p.checks[c.id].toUpperCase();
 return [
 "# DMA Hub — Personal Setup Plan",
 "",
 "Status: "+status,
 "Game planning category: "+(p.gameId||"Not selected"),
 "Exact game build (self reported): "+(p.gameBuild||"Not entered"),
 "Primary PC operating system: "+p.primaryOS,
 "Companion PC operating system: "+p.secondaryOS,
 "Hardware model: "+(p.hardwareModel||"Not entered"),
 "Purpose: "+p.purpose.replaceAll("_"," "),
 "",
 "## Self-reported inventory",
 ...SETUP_ITEMS.map(checkLine),
 "",
 "## Follow-up checks",
 ...(r.blockers.length?r.blockers.map(x=>"- "+x):["- No inventory blockers reported. Verify every answer independently."]),
 "",
 "## External approval gates — NOT satisfied by this planner",
 ...r.externalGates.map(x=>"- "+x),
 "",
 "Notes: "+(p.notes||"None"),
 "",
 "This is an offline self-reported checklist, not certified game compatibility, a device test, a software license, or permission to download/execute any software."
 ].join("\n");
}
