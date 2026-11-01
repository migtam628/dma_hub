// Official Warzone *game* PC baseline, NOT compatibility with DMA Hub,
// external gaming tools, devices, drivers, or unauthorized game modifications.
// Checked 2026-11-01. Customer inputs are never read from the system.
export const COD_PILOT=Object.freeze({
 schemaVersion:1,
 gameId:"call-of-duty",
 edition:"Call of Duty: Warzone (PC)",
 target:"PC game requirements and manual QA evidence only",
 requirementsReviewedOn:"2026-11-01",
 knownPatchReference:"Warzone Season 06 notes, October 14, 2026",
 scheduledUpdate:"2026-11-06T05:00:00.000Z",
 scheduledUpdateLabel:"November 6, 2026 — announced Warzone / MW4 Season 1 integration",
 sourceUrls:Object.freeze({
 requirements:"https://support.activision.com/warzone-2/articles/pc-system-requirements-for-warzone-2",
 secureBoot:"https://support.activision.com/articles/trusted-platform-module-and-secure-boot",
 patchNotes:"https://www.callofduty.com/patchnotes/2026/09/call-of-duty-bo7-warzone-season-06-patch-notes",
 updateAnnouncement:"https://www.callofduty.com/uk/en/blog/2026/10/call-of-duty-modern-warfare-4-warzone-season-1-announcement",
 enforcement:"https://support.activision.com/articles/call-of-duty-security-and-enforcement-policy"
 }),
 specs:Object.freeze({
 minimum:Object.freeze({ramGB:8,vramGB:3,ssdFreeGB:116,
  cpuExamples:"AMD Ryzen 5 1400 / Intel Core i5-6600",
  gpuExamples:"AMD Radeon RX 470 / NVIDIA GTX 970 or 1060 / Intel Arc A580",
  operatingSystem:"Windows 10 64-bit (current updates), Windows 11"}),
 recommended:Object.freeze({ramGB:12,vramGB:8,ssdFreeGB:116,
  cpuExamples:"AMD Ryzen 5 1600X / Intel Core i7-6700K",
  gpuExamples:"AMD Radeon RX 6600 XT / NVIDIA RTX 3060 / Intel Arc B580",
  operatingSystem:"Windows 11 64-bit (current updates)"})
 })
});
const FLAGS=["tpm2","secureBoot","directX12","cpuAvx","broadband"];
const YES_NO_UNKNOWN=new Set(["yes","no","unknown"]);
const OS=new Set(["unknown","windows_10_22h2","windows_11","other"]);
const CLIENT=new Set(["unknown","steam","battle_net","xbox_pc"]);
const text=(value,max)=>{
 if(typeof value!=="string"||value.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value))
  throw Error("Invalid pilot text field");
 return value.trim();
};
const measurement=(v,name)=>{
 if(v===null)return null;
 if(typeof v!=="number"||!Number.isFinite(v)||v<0||v>2048||Math.round(v*10)!==v*10)
  throw Error("Invalid "+name+" measurement");
 return v;
};
export function blankCODPilot(){
 return {schemaVersion:1,gameId:COD_PILOT.gameId,client:"unknown",installedBuild:"",
  os:"unknown",cpuModel:"",gpuModel:"",ramGB:null,vramGB:null,ssdFreeGB:null,
  tpm2:"unknown",secureBoot:"unknown",directX12:"unknown",cpuAvx:"unknown",
  broadband:"unknown",notes:""};
}
export function validateCODPilot(source){
 if(!source||typeof source!=="object"||Array.isArray(source)||source.schemaVersion!==1||
  source.gameId!==COD_PILOT.gameId||!CLIENT.has(source.client)||!OS.has(source.os))
  throw Error("Unsupported Call of Duty pilot schema, edition or platform");
 const out=blankCODPilot();
 out.client=source.client;out.os=source.os;
 for(const key of ["installedBuild","cpuModel","gpuModel","notes"])
  out[key]=text(source[key],key==="notes"?1000:key==="installedBuild"?80:120);
 for(const key of ["ramGB","vramGB","ssdFreeGB"])out[key]=measurement(source[key],key);
 for(const key of FLAGS){
  if(!YES_NO_UNKNOWN.has(source[key]))throw Error("Invalid prerequisite: "+key);
  out[key]=source[key];
 }
 return out;
}
const flagName={tpm2:"TPM 2.0 enabled",secureBoot:"Secure Boot enabled",
 directX12:"DirectX 12 available",cpuAvx:"Intel/AMD CPU with AVX support",
 broadband:"Broadband internet connection"};
export function assessCODPilot(input,now=new Date()){
 const p=validateCODPilot(input);
 const reference=COD_PILOT.specs.minimum;
 const measurements=[
  {key:"ramGB",label:"System memory (RAM)",unit:"GB",minimum:reference.ramGB,value:p.ramGB},
  {key:"vramGB",label:"Graphics memory (VRAM)",unit:"GB",minimum:reference.vramGB,value:p.vramGB},
  {key:"ssdFreeGB",label:"Free SSD storage",unit:"GB",minimum:reference.ssdFreeGB,value:p.ssdFreeGB}
 ].map(m=>({...m,status:m.value===null?"unknown":m.value<m.minimum?"below":"self_reported_at_least_minimum"}));
 const prerequisites=FLAGS.map(key=>({key,label:flagName[key],value:p[key],
  status:p[key]==="yes"?"self_reported_enabled":p[key]==="no"?"reported_missing":"unknown"}));
 const blockers=[
  ...measurements.filter(m=>m.status==="below").map(m=>m.label+" below published minimum ("+m.minimum+" "+m.unit+")"),
  ...prerequisites.filter(q=>q.status==="reported_missing").map(q=>q.label+" reported missing"),
  ...(p.os==="other"?["Operating system is not the listed Windows PC platform"]:[])
 ];
 const unknowns=[
  ...measurements.filter(m=>m.status==="unknown").map(m=>m.label+" not provided"),
  ...prerequisites.filter(q=>q.status==="unknown").map(q=>q.label+" not checked"),
  ...(p.os==="unknown"?["Windows version not recorded"]:[]),
  ...(!p.cpuModel?["CPU model not recorded; no CPU benchmark/feature evaluation performed"]:[]),
  ...(!p.gpuModel?["GPU model not recorded; no GPU equivalence evaluation performed"]:[]),
  ...(!p.installedBuild?["Exact installed game build not recorded"]:[]),
  ...(p.client==="unknown"?["Game launcher/store not selected"]:[])
 ];
 const date=now instanceof Date?now:new Date(now);
 if(!Number.isFinite(date.valueOf()))throw Error("Invalid evaluation time");
 const updateReviewDue=date.valueOf()>=Date.parse(COD_PILOT.scheduledUpdate);
 const status=blockers.length?"below_official_prerequisites":unknowns.length?"manual_review_required":"self_reported_baseline";
 return {status,measurements,prerequisites,blockers,unknowns,
  updateReviewDue,knownUpcomingUpdate:COD_PILOT.scheduledUpdateLabel,
  cpuGpuEquivalenceVerified:false,exactBuildVerified:false,hardwareTestPerformed:false,
  publisherAuthorizationVerified:false,gameCompatibilityVerified:false,
  dmaSoftwareSupported:false,downloadEnabled:false,
  caution:"Self-reported data and official game requirements only. No hardware scan, game test, software compatibility verification or download approval."};
}
export function codPilotText(input,now=new Date()){
 const p=validateCODPilot(input),r=assessCODPilot(p,now);
 return [
 "# DMA Hub — Call of Duty: Warzone PC pilot",
 "",
 "Status: "+r.status.replaceAll("_"," "),
 "Requirements checked: "+COD_PILOT.requirementsReviewedOn,
 "Known patch reference: "+COD_PILOT.knownPatchReference,
 "Announced future update: "+COD_PILOT.scheduledUpdateLabel,
 "Recheck exact game build: "+(r.updateReviewDue?"DUE (announced release window reached)":"Scheduled after the announced update; independently confirm what shipped"),
 "",
 "## User-supplied system inventory",
 "Edition: "+COD_PILOT.edition,
 "Game build (unverified): "+(p.installedBuild||"Unknown"),
 "Client: "+p.client,
 "OS: "+p.os,
 "CPU: "+(p.cpuModel||"Unknown"),
 "GPU: "+(p.gpuModel||"Unknown"),
 ...r.measurements.map(m=>m.label+": "+(m.value===null?"Unknown":m.value+" "+m.unit)+" (published minimum "+m.minimum+" "+m.unit+")"),
 ...r.prerequisites.map(q=>q.label+": "+q.value),
 "",
 "## Reported blockers",
 ...(r.blockers.length?r.blockers.map(b=>"- "+b):["- None reported; this does NOT verify compatibility"]),
 "## Unverified checks",
 ...(r.unknowns.length?r.unknowns.map(u=>"- "+u):["- No unanswered checklist fields; CPU/GPU suitability and game build remain unverified"]),
 "",
 "## Release gates",
 "- Confirm exact installed Warzone build after future game updates",
 "- Verify CPU/GPU equivalence using official requirements and a real authorized PC",
 "- Obtain rights/permissions for any related DMA Hub software before testing/distributing it",
 "- Record independent test evidence; do not infer compatibility from this questionnaire",
 "- No game software or cheat download is enabled",
 "",
 "Notes: "+(p.notes||"None"),
 "",
 "Official PC requirements: "+COD_PILOT.sourceUrls.requirements,
 "Official TPM/Secure Boot guidance: "+COD_PILOT.sourceUrls.secureBoot,
 "Official security and enforcement policy: "+COD_PILOT.sourceUrls.enforcement,
 "",
 r.caution
 ].join("\n");
}
