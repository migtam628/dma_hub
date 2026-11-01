export type CODFlag="yes"|"no"|"unknown";
export type CODOS="unknown"|"windows_10_22h2"|"windows_11"|"other";
export type CODClient="unknown"|"steam"|"battle_net"|"xbox_pc";
export type CODPilotSurvey={
 schemaVersion:1;gameId:"call-of-duty";client:CODClient;installedBuild:string;
 os:CODOS;cpuModel:string;gpuModel:string;ramGB:number|null;vramGB:number|null;ssdFreeGB:number|null;
 tpm2:CODFlag;secureBoot:CODFlag;directX12:CODFlag;cpuAvx:CODFlag;broadband:CODFlag;notes:string;
};
export type CODStatus="below_official_prerequisites"|"manual_review_required"|"self_reported_baseline";
export type CODPilotAssessment={
 status:CODStatus;
 measurements:Array<{key:string;label:string;unit:string;minimum:number;value:number|null;status:"unknown"|"below"|"self_reported_at_least_minimum"}>;
 prerequisites:Array<{key:string;label:string;value:CODFlag;status:"unknown"|"reported_missing"|"self_reported_enabled"}>;
 blockers:string[];unknowns:string[];updateReviewDue:boolean;knownUpcomingUpdate:string;
 cpuGpuEquivalenceVerified:false;exactBuildVerified:false;hardwareTestPerformed:false;
 publisherAuthorizationVerified:false;gameCompatibilityVerified:false;dmaSoftwareSupported:false;downloadEnabled:false;caution:string;
};
export const COD_PILOT:Readonly<{
 schemaVersion:1;gameId:string;edition:string;target:string;requirementsReviewedOn:string;
 knownPatchReference:string;scheduledUpdate:string;scheduledUpdateLabel:string;
 sourceUrls:Readonly<{requirements:string;secureBoot:string;patchNotes:string;updateAnnouncement:string;enforcement:string}>;
 specs:Readonly<{minimum:Readonly<{ramGB:number;vramGB:number;ssdFreeGB:number;cpuExamples:string;gpuExamples:string;operatingSystem:string}>;recommended:Readonly<{ramGB:number;vramGB:number;ssdFreeGB:number;cpuExamples:string;gpuExamples:string;operatingSystem:string}>}>;
}>;
export function blankCODPilot():CODPilotSurvey;
export function validateCODPilot(source:unknown):CODPilotSurvey;
export function assessCODPilot(source:CODPilotSurvey,now?:Date|string):CODPilotAssessment;
export function codPilotText(source:CODPilotSurvey,now?:Date|string):string;
