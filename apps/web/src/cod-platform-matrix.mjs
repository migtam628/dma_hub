// Official game-platform availability vs. DMA Hub support are separate facts.
// Do not imply console software installation, anti-cheat approval, or DMA access.
// Information reviewed 2026-11-01; operator must verify current store availability.
export const COD_PLATFORMS_REVIEWED="2026-11-01";
export const WARZONE_XBOX_ONE_END_ANNOUNCED="2026-11-06T05:00:00.000Z";
const unsupported=false, supported=true;
export const COD_TITLE_PLATFORMS=Object.freeze([
 {id:"warzone",title:"Call of Duty: Warzone",releaseYear:2020,series:supported,one:"sunsetting",
  pc:supported,playAnywhere:"not_verified",
  source:"https://support.activision.com/warzone-2/articles/warzone-platform-update",
  detail:"Activision announced Xbox One Warzone service ending with MW4 Season 1, with new downloads removed June 4, 2026."},
 {id:"mw4",title:"Call of Duty: Modern Warfare 4",releaseYear:2026,series:supported,one:unsupported,
  pc:supported,playAnywhere:"yes",
  source:"https://www.xbox.com/en-US/games/call-of-duty-modern-warfare-4",
  detail:"Xbox Series X|S and Windows PC; Xbox One not supported. Xbox Play Anywhere designation is confirmed."},
 {id:"bo7",title:"Call of Duty: Black Ops 7",releaseYear:2025,series:supported,one:supported,
  pc:supported,playAnywhere:"not_verified",
  source:"https://www.xbox.com/en-US/games/call-of-duty-black-ops-7",
  detail:"Xbox lists Xbox Series X|S, Xbox One, and Windows 10/11."},
 {id:"bo6",title:"Call of Duty: Black Ops 6",releaseYear:2024,series:supported,one:supported,
  pc:supported,playAnywhere:"not_verified",
  source:"https://www.xbox.com/en-US/games/call-of-duty-black-ops-6",
  detail:"Xbox lists Xbox Series X|S, Xbox One, and Windows 10/11."},
 {id:"mw3",title:"Call of Duty: Modern Warfare III",releaseYear:2023,series:supported,one:supported,
  pc:supported,playAnywhere:"not_verified",
  source:"https://www.xbox.com/en-US/games/call-of-duty-modern-warfare-iii",
  detail:"Xbox lists Xbox Series X|S, Xbox One, and Windows 10/11."},
 {id:"mw2",title:"Call of Duty: Modern Warfare II",releaseYear:2022,series:supported,one:supported,
  pc:supported,playAnywhere:"not_verified",
  source:"https://www.xbox.com/en-US/games/call-of-duty-modern-warfare-ii",
  detail:"Xbox lists Xbox Series X|S, Xbox One, and Windows 10/11."}
]);
export const COD_CONSOLE_CAPABILITIES=Object.freeze([
 {id:"browser",label:"DMA Hub web guides and local questionnaires",series:"browser_possible",one:"not_device_tested",
  notes:"Use Microsoft Edge on Xbox Series X|S; browser behavior requires actual testing. No public account backend is running."},
 {id:"support",label:"Accounts, support tickets and customer portal",series:"backend_required",one:"backend_required",
  notes:"Browser workflows can be supported after secure hosting. Current GitHub Pages has no live customer API."},
 {id:"launcher",label:"Windows desktop launcher and PC diagnostics",series:"unsupported",one:"unsupported",
  notes:"Windows Tauri/NSIS preview is not an Xbox console app. Console developer mode is not retail app approval."},
 {id:"streaming",label:"Xbox Remote Play on an optional companion PC",series:"supported_platform",one:"supported_platform",
  notes:"The game runs on the Xbox console, not as a Windows game process. This is not DMA game access."},
 {id:"capture",label:"External video capture to a companion PC",series:"conditional",one:"conditional",
  notes:"Standard authorized HDMI capture may serve recording/streaming; no game control, automated assistance or bypass is included."},
 {id:"dma",label:"Direct DMA game-memory interaction or unapproved input tools",series:"not_supported",one:"not_supported",
  notes:"Not a supported DMA Hub feature on Xbox. Activision prohibits cheating, unauthorized input manipulation and device spoofing."}
]);
export function resolveCODTitlePlatform(id,platform,now=new Date()){
 const game=COD_TITLE_PLATFORMS.find(item=>item.id===id);
 if(!game)throw Error("Unknown Call of Duty edition");
 if(!["series","one","pc"].includes(platform))throw Error("Invalid platform");
 const date=now instanceof Date?now:new Date(now);
 if(!Number.isFinite(date.getTime()))throw Error("Invalid evaluation time");
 const value=game[platform];
 if(value==="sunsetting"){
  const after=date.getTime()>=Date.parse(WARZONE_XBOX_ONE_END_ANNOUNCED);
  return {state:after?"announced_ended_recheck":"end_of_service_announced",gameId:id,platform,
   description:after?"Activision announced the end of Xbox One Warzone play at MW4 Season 1. Reconfirm live service status before claiming availability.":"Xbox One Warzone service is scheduled to end at MW4 Season 1; new downloads were removed June 4, 2026.",
   gameSupportedVerified:false,serviceReachabilityVerified:false};
 }
 return {state:value===true?"officially_listed":"not_listed",gameId:id,platform,
  description:value===true?"Listed by the official Xbox/Activision source; live availability and local installation untested.":"Not a supported edition on this platform according to the official listing.",
  gameSupportedVerified:false,serviceReachabilityVerified:false};
}
export function evaluateXboxDMAHubCapabilities(platform){
 if(!["series","one"].includes(platform))throw Error("Invalid console family");
 return {
  platform,items:COD_CONSOLE_CAPABILITIES.map(item=>({id:item.id,label:item.label,status:item[platform],notes:item.notes})),
  directCheatSupport:false,dmaMemoryAccess:false,approvedInputModification:false,
  windowsInstallerRunsOnConsole:false,consoleAppPublished:false,gameCompatibilityTested:false,
  accountBackendOnline:false
 };
}
