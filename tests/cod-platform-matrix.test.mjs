import test from "node:test";
import assert from "node:assert/strict";
import {
 COD_TITLE_PLATFORMS,COD_CONSOLE_CAPABILITIES,resolveCODTitlePlatform,evaluateXboxDMAHubCapabilities
} from "../apps/web/src/cod-platform-matrix.mjs";
const BEFORE="2026-11-01T13:00:00.000Z",AFTER="2026-11-07T13:00:00.000Z";
test("official game listing data is separate from DMA Hub software support",()=>{
 assert.equal(COD_TITLE_PLATFORMS.length,6);
 assert.equal(COD_TITLE_PLATFORMS.some(x=>x.id==="mw4"&&x.one===false&&x.series===true),true);
 assert.equal(COD_TITLE_PLATFORMS.some(x=>x.id==="bo7"&&x.one===true),true);
 assert.equal(COD_TITLE_PLATFORMS.every(x=>x.source.startsWith("https://")),true);
 for(const x of COD_TITLE_PLATFORMS){
  const r=resolveCODTitlePlatform(x.id,"series",BEFORE);
  assert.equal(r.gameSupportedVerified,false);
  assert.equal(r.serviceReachabilityVerified,false);
 }
});
test("Xbox One Warzone sunsetting is not mistaken for current-gen support",()=>{
 const prior=resolveCODTitlePlatform("warzone","one",BEFORE);
 assert.equal(prior.state,"end_of_service_announced");
 const next=resolveCODTitlePlatform("warzone","one",AFTER);
 assert.equal(next.state,"announced_ended_recheck");
 assert.equal(next.serviceReachabilityVerified,false);
 assert.equal(resolveCODTitlePlatform("warzone","series",AFTER).state,"officially_listed");
});
test("Modern Warfare 4 is not listed on Xbox One even though its PC version is Xbox Play Anywhere",()=>{
 assert.equal(resolveCODTitlePlatform("mw4","one",BEFORE).state,"not_listed");
 assert.equal(resolveCODTitlePlatform("mw4","pc",BEFORE).state,"officially_listed");
 assert.equal(COD_TITLE_PLATFORMS.find(x=>x.id==="mw4").playAnywhere,"yes");
});
test("all Xbox companion capabilities fail closed for direct cheats, memory or unsigned Windows installer",()=>{
 assert.ok(COD_CONSOLE_CAPABILITIES.some(x=>x.id==="browser"));
 for(const family of ["series","one"]){
  const r=evaluateXboxDMAHubCapabilities(family);
  for(const field of ["directCheatSupport","dmaMemoryAccess","approvedInputModification","windowsInstallerRunsOnConsole","consoleAppPublished","gameCompatibilityTested","accountBackendOnline"])
   assert.equal(r[field],false);
  assert.equal(r.items.find(x=>x.id==="dma").status,"not_supported");
  assert.equal(r.items.find(x=>x.id==="launcher").status,"unsupported");
  assert.equal(r.items.find(x=>x.id==="support").status,"backend_required");
 }
});
test("Xbox platform resolution validates exact game and platform keys",()=>{
 assert.throws(()=>resolveCODTitlePlatform("all-games","series"),/Unknown Call of Duty/);
 assert.throws(()=>resolveCODTitlePlatform("mw4","playstation"),/Invalid platform/);
 assert.throws(()=>resolveCODTitlePlatform("mw4","series","not-a-date"),/Invalid evaluation time/);
 assert.throws(()=>evaluateXboxDMAHubCapabilities("pc"),/Invalid console family/);
});
