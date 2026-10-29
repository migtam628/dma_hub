# Administrative audit log

The local API records structured audit events (actor UUID, action, target UUID, timestamp) when accounts, profiles, products, pricing plans, manual grants and sandbox orders change.

`GET /v1/admin/audit?offset=0&limit=50` requires a valid **admin session**. Ordinary customers receive HTTP 403. Limit is 1–100 and offset 0–10,000. The API returns recent events ordered by timestamp and SQLite row order, plus `nextOffset` when more records may be available.

The Admin → Audit Log page is a **read-only** interface with pagination and visible error/loading states. Responses omit passwords, session tokens, email bodies and credential secrets. Events only contain IDs and names of actions; changes still require separate authorization.

**Limitations:** Offset pagination is not snapshot-consistent while new events are being appended. Retention controls, indexed history, security alerts, signed log export, centralized monitoring, redaction review, and durable audit integrity are still required before production.
