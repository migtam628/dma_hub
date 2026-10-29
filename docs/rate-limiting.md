# Persistent local authentication throttling (SQLite schema v10)

The API uses a **shared SQLite, atomic fixed-window limiter** for registration, sign-in, email verification requests, password recovery requests, and authenticated password-change attempts. Rate-limit counters survive API process restarts and are shared by processes that point to the **same SQLite database file**.

## Implementation

The `auth_rate_limits` table uses a scoped SHA-256 hash for identifiers such as remote socket IP, normalized email address, or account ID. Raw email addresses, IP addresses, passwords and bearer tokens are **not stored in the limiter table**. SQLite `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` atomically increments attempts. Window expiry resets counters. Every 64 rate-limit checks, expired rows are pruned; service startup does not reset counters.

The API does **not** trust `X-Forwarded-For` for rate limits. That header is user-controlled unless a separately verified reverse-proxy configuration and trust policy exist.

| Scope | Rule |
| --- | --- |
| Registration | 5 requests per remote IP / 15 minutes |
| Login | 10 attempts per remote IP / 1 minute; 20 attempts per normalized account email / 15 minutes |
| Verification email | 5 requests per IP / 15 minutes; 3 per email / 1 hour |
| Password recovery | 5 requests per IP / 15 minutes; 3 per email / 1 hour |
| Password change | 5 attempts per authenticated account / 15 minutes |

Exceeding a limit returns HTTP 429. Rate limits apply to attempts; even a successful login consumes a slot. The fixed window is measured from the first attempt in that scope, not aligned to the clock hour.

## Non-production limitations

This protects **only processes sharing one SQLite database**; multiple replicas with separate database files do not share counters. It is not a distributed Redis/service-edge limiter, bot-defense system, IP reputation system, MFA, account abuse response, WAF, or a solution for denial-of-service attacks. Email-keyed rate limiting can create temporary targeted account lockouts; final settings require monitored production testing and operational recovery procedures.

Production reverse-proxy TLS, trusted origin configuration, cross-host abuse controls, email delivery monitoring, encrypted backups and independent security review remain required.
