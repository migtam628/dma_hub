import {COD_TITLE_PLATFORMS} from "./cod-platform-matrix.mjs";

// A voluntary, browser-local field QA notebook. Nothing is scanned, transmitted,
// attested by Microsoft/Activision or approved for third-party game software.
export const XBOX_QA_SCHEMA_VERSION=1;
export const XBOX_MODELS=Object.freeze([
 {id:"unknown",label:"Not selected",family:null},
 {id:"series_x",label:"Xbox Series X",family:"series"},
 {id:"series_s",label:"Xbox Series S",family:"series"},
 {id:"one",label:"Xbox One",family:"one"},
 {id:"one_s",label:"Xbox One S",family:"one"},
 {id:"one_x",label:"Xbox One X",family:"one"}
]);
export const XBOX_QA_CHECKS=Object.freeze([
 {id:"edge_load",label:"Microsoft Edge loads the DMA Hub website",detail:"Navigate to the public DMA Hub URL and record whether the page opens."},
 {id:"site_navigation",label:"Website navigation with Xbox controller",detail:"Check menus and on-screen focus with the Xbox controller; avoid alternate input automation."},
 {id:"layout",label:"Readable layout on the connected display",detail:"Review text wrapping and responsive layout on the actual TV/monitor."},
 {id:"wizard_input",label:"Setup questionnaire input",detail:"Try forms and dropdowns with normal Xbox browser controls."},
 {id:"local_persistence",label:"Survey persists after reopening the tab",detail:"Manually save a test answer, revisit the page, and check browser storage."},
 {id:"text_export",label:"Export or copy a plain-text QA report",detail:"Check file download/clipboard behavior without assuming Xbox browser support."},
 {id:"print_pdf",label:"Print/PDF workflow",detail:"Try only where the browser exposes printing; mark not applicable otherwise."},
 {id:"remote_play",label:"Optional official Xbox Remote Play",detail:"Test authorized remote viewing only; games still run on Xbox."},
 {id:"hdmi_capture",label:"Optional ordinary HDMI capture",detail:"Only capture normal audiovisual output with appropriate equipment and permission."}
]);
const OUTCOMES=new Set(["untested","passed","failed","blocked","not_applicable"]);
const MODELS=new Map(XBOX_MODELS.map(model=>[model.id,model]));
const GAMES=new Set(COD_TITLE_PLATFORMS.map(game=>game.id));
const KEY=/^[A-Za-z0-9][A-Za-z0-9._ -]{0,79}$/;
const TEXT_SAFE=/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;
function stringField(value,name,max){
 if(typeof value!=="string"||value.length>max||TEXT_SAFE.test(value))throw Error("Invalid "+name);
 return value.trim();
}
function validDate(value){
 if(value==="")return true;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const actual=new Date(value+"T00:00:00Z");
 return Number.isFinite(actual.getTime())&&actual.toISOString().slice(0,10)===value&&
  value>="2020-01-01"&&value<="2100-12-31";
}
export function emptyXboxQASession(){
 return {schemaVersion:XBOX_QA_SCHEMA_VERSION,consoleModel:"unknown",
  gameId:"",installedBuild:"",consoleOS:"",testDate:"",display:"",controller:"",evidenceUrl:"",
  notes:"",physicalTestConfirmed:false,
  checks:Object.fromEntries(XBOX_QA_CHECKS.map(c=>[c.id,"untested"]))};
}
export function sanitizeXboxQASession(raw){
 if(!raw||typeof raw!=="object"||Array.isArray(raw)||raw.schemaVersion!==XBOX_QA_SCHEMA_VERSION)
  throw Error("Unsupported Xbox QA schema");
 const p=emptyXboxQASession();
 if(!MODELS.has(raw.consoleModel))throw Error("Unknown Xbox model");
 p.consoleModel=raw.consoleModel;
 if(raw.gameId!==""&&!GAMES.has(raw.gameId))throw Error("Unknown Call of Duty game");
 p.gameId=raw.gameId;
 p.installedBuild=stringField(raw.installedBuild,"installed build",80);
 p.consoleOS=stringField(raw.consoleOS,"console OS",120);
 p.testDate=stringField(raw.testDate,"test date",10);
 p.display=stringField(raw.display,"display",120);
 p.controller=stringField(raw.controller,"controller",120);
 p.evidenceUrl=stringField(raw.evidenceUrl,"evidence reference",500);
 p.notes=stringField(raw.notes,"notes",1200);
 if(p.installedBuild&&!KEY.test(p.installedBuild))throw Error("Invalid installed build identifier");
 if(!validDate(p.testDate))throw Error("Invalid test date");
 if(p.evidenceUrl){
  let parsed;
  try{parsed=new URL(p.evidenceUrl)}catch{throw Error("Invalid evidence URL")}
  if(parsed.protocol!=="https:"||parsed.username||parsed.password||!parsed.hostname||p.evidenceUrl.includes(" "))
   throw Error("Evidence URL must be a safe HTTPS link without credentials");
 }
 if(typeof raw.physicalTestConfirmed!=="boolean")throw Error("Test declaration must be a boolean");
 p.physicalTestConfirmed=raw.physicalTestConfirmed;
 if(!raw.checks||typeof raw.checks!=="object"||Array.isArray(raw.checks))throw Error("Invalid QA checklist");
 for(const check of XBOX_QA_CHECKS){
  if(!OUTCOMES.has(raw.checks[check.id]))throw Error("Invalid QA outcome: "+check.id);
  p.checks[check.id]=raw.checks[check.id];
 }
 return p;
}
export function evaluateXboxQASession(input){
 const p=sanitizeXboxQASession(input);
 const model=MODELS.get(p.consoleModel);
 const game=COD_TITLE_PLATFORMS.find(g=>g.id===p.gameId);
 const results=Object.values(p.checks);
 const observed=results.filter(x=>x==="passed"||x==="failed"||x==="blocked").length;
 const failures=results.filter(x=>x==="failed"||x==="blocked").length;
 const passing=results.filter(x=>x==="passed").length;
 const blockers=[];
 if(!model.family)blockers.push("Choose your actual Xbox model");
 if(!game)blockers.push("Choose the installed Call of Duty edition");
 if(!p.installedBuild)blockers.push("Record the exact installed game build or version");
 if(!p.testDate)blockers.push("Record the date the hardware was physically tested");
 if(!p.consoleOS)blockers.push("Record the Xbox OS version/build");
 if(!p.physicalTestConfirmed)blockers.push("Confirm that the observations were made on physical Xbox hardware");
 if(!observed)blockers.push("Record at least one actual pass, fail or blocked observation");
 if(p.notes.length<10)blockers.push("Describe the observation and test context in at least 10 characters");
 const gamePlatformListed=game&&model.family?game[model.family]===true:false;
 const gameAvailabilityCaveat=game&&model.family&&game[model.family]!==true?
  "Selected title has no confirmed current Xbox support on this console; check the publisher listing and live service status.":null;
 const state=blockers.length?"draft":failures?"operator_reported_issues":"operator_reported_observations";
 return {state,readyForLocalRecord:blockers.length===0,blockers,
  total:XBOX_QA_CHECKS.length,observed,passing,failures,
  gamePlatformListedFromReference:gamePlatformListed,gameAvailabilityCaveat,
  testEvidenceIndependentlyVerified:false,consoleCertification:false,
  downloadEnabled:false,consoleAppAvailable:false,dmaGameMemorySupported:false,
  userReportedOnly:true};
}
export function xboxQAMarkdown(input){
 const p=sanitizeXboxQASession(input),r=evaluateXboxQASession(p);
 const model=MODELS.get(p.consoleModel);
 const game=COD_TITLE_PLATFORMS.find(x=>x.id===p.gameId);
 return [
 "# DMA Hub — Xbox console QA field report",
 "",
 "Scope: Browser/site functionality and lawful companion features only",
 "Record state: "+r.state.replaceAll("_"," "),
 "Console: "+model.label,
 "Call of Duty edition: "+(game?.title||"Not selected"),
 "Installed game build (self reported): "+(p.installedBuild||"Not entered"),
 "Xbox OS build: "+(p.consoleOS||"Not entered"),
 "Test date: "+(p.testDate||"Not entered"),
 "Display: "+(p.display||"Not entered"),
 "Controller: "+(p.controller||"Not entered"),
 "Physical-console test attested by operator: "+(p.physicalTestConfirmed?"Yes":"No"),
 "Game platform officially listed in reviewed reference: "+(r.gamePlatformListedFromReference?"Listed":"Not established"),
 "",
 "## Manual QA checks",
 ...XBOX_QA_CHECKS.map(c=>"- "+c.label+": "+p.checks[c.id].replaceAll("_"," ")),
 "",
 "## Missing evidence to save a local observation",
 ...(r.blockers.length?r.blockers.map(x=>"- "+x):["- No required worksheet fields missing (still not independently certified)"]),
 ...(r.gameAvailabilityCaveat?["","Platform caution: "+r.gameAvailabilityCaveat]:[]),
 "",
 "Evidence link: "+(p.evidenceUrl||"None supplied"),
 "Operator notes: "+(p.notes||"None supplied"),
 "",
 "This report is self-reported and stored in the browser. It is not independently certified, verified by Xbox/Activision, a proof of game compatibility, an authorization for third-party software, or permission to run cheats, DMA memory tools or input automation."
 ].join("\n");
}
