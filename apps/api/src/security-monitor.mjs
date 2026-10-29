import {RATE_LIMIT_POLICIES} from "./rate-limiter.mjs";

const AUTH_AUDIT_ACTIONS=Object.freeze([
 "user.register","session.login","session.logout","session.logout_all",
 "account.email_verified","account.password_changed","account.password_recovered"
]);

/**
 * Aggregates persistent local auth-rate metrics, without exposing bucket identifiers.
 * Only use from a server-authorized admin endpoint.
 */
export function createSecurityMonitor({db,clock=()=>Date.now()}){
 const aggregate=db.prepare(`SELECT
    COUNT(*) AS active_keys,
    COALESCE(SUM(attempt_count),0) AS attempts,
    COALESCE(SUM(CASE WHEN attempt_count>? THEN 1 ELSE 0 END),0) AS blocked_keys,
    COALESCE(SUM(CASE WHEN attempt_count>? THEN attempt_count-? ELSE 0 END),0) AS rejected_attempts
   FROM auth_rate_limits WHERE scope=? AND expires_at>?`);
 const auditCount=db.prepare(`SELECT COUNT(*) AS n FROM audit
    WHERE action=? AND created_at>=? AND created_at<=?`);
 function overview(){
  const now=clock();
  const scopes=Object.entries(RATE_LIMIT_POLICIES).map(([scope,p])=>{
   const data=aggregate.get(p.limit,p.limit,p.limit,scope,now);
   return {scope,windowMs:p.windowMs,limit:p.limit,
    activeKeys:data.active_keys,attemptsInActiveWindows:data.attempts,
    blockedKeys:data.blocked_keys,rejectedAttemptsInActiveWindows:data.rejected_attempts};
  });
  const actions=AUTH_AUDIT_ACTIONS.map(action=>({
   action,count:auditCount.get(action,now-24*60*60_000,now).n
  }));
  const totalRejectedAttempts=scopes.reduce((sum,s)=>sum+s.rejectedAttemptsInActiveWindows,0);
  const totalBlockedKeys=scopes.reduce((sum,s)=>sum+s.blockedKeys,0);
  return {
   generatedAt:now,scope:"local_sqlite_database",
   activeWindowsOnly:true,distributedAcrossHosts:false,
   productionSecurityApproved:false,
   totalRejectedAttempts,totalBlockedKeys,
   scopes,authAuditLast24Hours:actions
  };
 }
 return {overview};
}
