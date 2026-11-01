// Conservative fail-closed release gate for the first Call of Duty pilot.
// Official MW4 / Warzone Season 1 integration was announced for 2026-11-06
// 00:00 ET. This date is a recheck trigger, NOT proof a patch shipped.
export const COD_ANNOUNCED_RECHECK_MS=Date.parse("2026-11-06T05:00:00.000Z");
export function codReviewCurrentForPublic(gameId,reviewedAt,now){
 if(gameId!=="call-of-duty")return true;
 if(now<COD_ANNOUNCED_RECHECK_MS)return true;
 return typeof reviewedAt==="number"&&Number.isFinite(reviewedAt)&&reviewedAt>=COD_ANNOUNCED_RECHECK_MS;
}
