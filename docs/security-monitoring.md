# Local authentication security monitoring

This is a **read-only, administrator-only operations view** for the existing persisted SQLite authentication throttle. It does **not** make DMA Hub safe for public API exposure.

## Endpoint and interface

`GET /v1/admin/security` requires an active authenticated session with the server-assigned `admin` role. Anonymous requests receive 401 and ordinary customers 403.

The Admin → **Security Monitoring** page shows:

- Number of rejected attempts above configured rate thresholds, aggregated over active fixed-window buckets
- Number of blocked limiter buckets (not unique people or IPs)
- Per-scope attempts, active buckets, policy limits and current rejected-attempt counts
- Counts of successful authentication events from the audit log for the preceding 24 hours
- Snapshot timestamp and explicit `distributedAcrossHosts:false`, `productionSecurityApproved:false` markers

No raw, plaintext or hashed email/IP identifiers, bearer tokens, credentials or payment details are returned by this endpoint. The dashboard never modifies counters, unblocks users or changes session state.

## Policy consistency

The API now sources its authentication throttle limits from one code-owned `RATE_LIMIT_POLICIES` map in `apps/api/src/rate-limiter.mjs`. Both the request limiter and the administrator aggregates use this same map, preventing their limits from drifting apart.

These metrics count *requests exceeding the fixed-window limit*, not confirmed attacks. Legitimate users may experience transient lockouts, and one person may occupy several buckets. Counters from expired windows do not appear. The successful-action audit counts do not cover unsuccessful sign-ins.

## Production gaps

This is **one-SQLite-database visibility**, not a security information and event management (SIEM) service. It has no cross-host/edge visibility, IP reputation, distributed WAF/Redis limits, security event alert delivery, targeted lockout case management, multi-node telemetry or independently validated incident response. Do not expose the local API publicly as a result of this milestone.
