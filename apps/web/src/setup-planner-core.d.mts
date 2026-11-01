export type SetupCheckValue="yes"|"no"|"unknown";
export type SetupOS="Windows 10"|"Windows 11"|"Other"|"Unknown";
export type SetupPlan={
 schemaVersion:1;gameId:string;gameBuild:string;primaryOS:SetupOS;secondaryOS:SetupOS;
 hardwareModel:string;purpose:"evaluation"|"authorized_lab"|"personal_inventory";
 checks:Record<string,SetupCheckValue>;notes:string;
};
export type SetupItem={readonly id:string;readonly label:string;readonly detail:string};
export type SetupEvaluation={
 status:"needs_setup"|"needs_review"|"inventory_documented";confirmed:number;total:number;
 blockers:string[];externalGates:string[];compatibilityVerified:false;downloadAuthorized:false;
 productAvailable:false;manualInventoryOnly:true;
};
export const SETUP_PLAN_SCHEMA:1;
export const SETUP_ITEMS:ReadonlyArray<SetupItem>;
export function createEmptySetupPlan():SetupPlan;
export function sanitizeSetupPlan(value:unknown):SetupPlan;
export function evaluateSetupPlan(value:SetupPlan):SetupEvaluation;
export function setupPlanMarkdown(value:SetupPlan):string;
