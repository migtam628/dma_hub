export type CODConsoleFamily="series"|"one";
export type CODPlatform=CODConsoleFamily|"pc";
export type CODGameState="officially_listed"|"not_listed"|"end_of_service_announced"|"announced_ended_recheck";
export type CODTitle={readonly id:string;readonly title:string;readonly releaseYear:number;
 readonly series:boolean;readonly one:boolean|"sunsetting";readonly pc:boolean;
 readonly playAnywhere:"yes"|"not_verified";readonly source:string;readonly detail:string};
export type CODCapability={readonly id:string;readonly label:string;readonly series:string;readonly one:string;readonly notes:string};
export const COD_PLATFORMS_REVIEWED:string;
export const WARZONE_XBOX_ONE_END_ANNOUNCED:string;
export const COD_TITLE_PLATFORMS:ReadonlyArray<CODTitle>;
export const COD_CONSOLE_CAPABILITIES:ReadonlyArray<CODCapability>;
export function resolveCODTitlePlatform(id:string,platform:CODPlatform,now?:Date|string):{
 state:CODGameState;gameId:string;platform:CODPlatform;description:string;gameSupportedVerified:false;serviceReachabilityVerified:false
};
export function evaluateXboxDMAHubCapabilities(platform:CODConsoleFamily):{
 platform:CODConsoleFamily;items:Array<{id:string;label:string;status:string;notes:string}>;
 directCheatSupport:false;dmaMemoryAccess:false;approvedInputModification:false;
 windowsInstallerRunsOnConsole:false;consoleAppPublished:false;gameCompatibilityTested:false;accountBackendOnline:false
};
