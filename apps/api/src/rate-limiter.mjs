import {createHash} from "node:crypto";

/**
 * Atomic fixed-window rate limiting for one shared SQLite database.
 * Keys are SHA-256 hashes of the scope and identifier: never store raw emails, IPs or passwords.
 * This survives API restarts and works with multiple processes sharing the same SQLite file.
 * It does not synchronize between different database copies, hosts, or regions.
 */
export function createRateLimiter({db,clock=()=>Date.now()}){
 const statement=db.prepare(`INSERT INTO auth_rate_limits(scope,key_hash,window_start,attempt_count,expires_at)
   VALUES(?,?,?,1,?)
   ON CONFLICT(scope,key_hash) DO UPDATE SET
    window_start=CASE WHEN auth_rate_limits.expires_at<=excluded.window_start
     THEN excluded.window_start ELSE auth_rate_limits.window_start END,
    attempt_count=CASE WHEN auth_rate_limits.expires_at<=excluded.window_start
     THEN 1 ELSE auth_rate_limits.attempt_count+1 END,
    expires_at=CASE WHEN auth_rate_limits.expires_at<=excluded.window_start
     THEN excluded.expires_at ELSE auth_rate_limits.expires_at END
   RETURNING attempt_count`);
 let checks=0;
 function allow(scope,identifier,limit,windowMs){
  if(typeof scope!=="string"||!/^[a-z_]{2,32}$/.test(scope)||
     typeof identifier!=="string"||identifier.length>512||
     !Number.isSafeInteger(limit)||limit<1||limit>1000||
     !Number.isSafeInteger(windowMs)||windowMs<1000||windowMs>86_400_000){
   throw new Error("Invalid rate limiter parameters");
  }
  const now=clock();
  if(!Number.isSafeInteger(now)||now<0)throw new Error("Invalid rate limiter clock");
  // Atomic UPSERT avoids race conditions between API processes sharing this database.
  const digest=createHash("sha256").update(scope).update("\0").update(identifier).digest("hex");
  const row=statement.get(scope,digest,now,now+windowMs);
  checks++;
  // Opportunistic pruning keeps the persistent key table bounded over time.
  if(checks%64===0)db.prepare("DELETE FROM auth_rate_limits WHERE expires_at<=?").run(now);
  return row.attempt_count<=limit;
 }
 return {allow};
}
