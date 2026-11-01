export type XboxModel="unknown"|"series_x"|"series_s"|"one"|"one_s"|"one_x";
export type XboxQAOutcome="untested"|"passed"|"failed"|"blocked"|"not_applicable";
export type XboxQASession={
 schemaVersion:1;consoleModel:XboxModel;gameId:string;installedBuild:string;consoleOS:string;
 testDate:string;display:string;controller:string;evidenceUrl:string;notes:string;
 physicalTestConfirmed:boolean;checks:Record<string,XboxQAOutcome>;
};
export type XboxQAEvaluation={
 state:"draft"|"operator_reported_issues"|"operator_reported_observations";
 readyForLocalRecord:boolean;blockers:string[];total:number;observed:number;passing:number;failures:number;
 gamePlatformListedFromReference:boolean;gameAvailabilityCaveat:string|null;
 testEvidenceIndependentlyVerified:false;consoleCertification:false;
 downloadEnabled:false;consoleAppAvailable:false;dmaGameMemorySupported:false;userReportedOnly:true;
};
export const XBOX_QA_SCHEMA_VERSION:1;
export const XBOX_MODELS:ReadonlyArray<{id:XboxModel;label:string;family:null|"series"|"one"}>;
export const XBOX_QA_CHECKS:ReadonlyArray<{id:string;label:string;detail:string}>;
export function emptyXboxQASession():XboxQASession;
export function sanitizeXboxQASession(value:unknown):XboxQASession;
export function evaluateXboxQASession(value:XboxQASession):XboxQAEvaluation;
export function xboxQAMarkdown(value:XboxQASession):string;
