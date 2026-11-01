// Compare two manually reported Xbox QA sessions. This is change detection,
// not independent testing or compatibility certification.
export const QA_CHECK_LABELS=Object.freeze({
 edge_load:"Xbox Edge site loading",site_navigation:"Controller navigation",
 layout:"Display layout",wizard_input:"Questionnaire input",
 local_persistence:"Local storage persistence",text_export:"Text export/copy",
 print_pdf:"Browser print/PDF",remote_play:"Official Remote Play",
 hdmi_capture:"Authorized HDMI capture"
});
const BAD=new Set(["failed","blocked"]);
export function compareXboxQASessions(baseline,candidate){
 if(!baseline||!candidate||baseline.gameId!==candidate.gameId||
  baseline.consoleModel!==candidate.consoleModel)
  throw Error("Comparison requires the same game edition and console model");
 const changes=Object.entries(QA_CHECK_LABELS).map(([key,label])=>{
  const before=baseline.checks?.[key],after=candidate.checks?.[key];
  if(!before||!after)throw Error("Invalid Xbox QA checklist");
  const change=before===after?"unchanged":
   before==="passed"&&BAD.has(after)?"reported_regression":
   BAD.has(before)&&after==="passed"?"reported_improvement":
   "changed_or_unverified";
  return {id:key,label,baseline:before,candidate:after,change};
 });
 const regressions=changes.filter(row=>row.change==="reported_regression").length;
 const improvements=changes.filter(row=>row.change==="reported_improvement").length;
 const gameBuildChanged=baseline.installedBuild!==candidate.installedBuild;
 const consoleOSChanged=baseline.consoleOS!==candidate.consoleOS;
 return {gameId:baseline.gameId,consoleModel:baseline.consoleModel,
  baselineBuild:baseline.installedBuild,candidateBuild:candidate.installedBuild,
  baselineOS:baseline.consoleOS,candidateOS:candidate.consoleOS,
  gameBuildChanged,consoleOSChanged,regressions,improvements,
  changedChecks:changes.filter(row=>row.change!=="unchanged").length,
  requiresManualRetest:gameBuildChanged||consoleOSChanged||regressions>0,
  changes,operatorReportedOnly:true,independentlyVerified:false,
  gameCompatibilityVerified:false,downloadEnabled:false};
}
