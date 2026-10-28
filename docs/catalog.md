# Persistent Catalog API — backend milestone

The public storefront still uses sample data. A separate persistent API begins the production catalog transition.

## Endpoints
- `GET /v1/catalog`: existing labeled **demo** products.
- `GET /v1/catalog/live`: **only** published records from SQLite, no auth required. Empty until an admin publishes an item.
- `GET /v1/admin/products`: full list, authorized admin only.
- `POST /v1/admin/products`: create with `{slug,name,description,status}` (status defaults to draft).
- `GET /v1/admin/products/:uuid`: retrieve as admin.
- `PATCH /v1/admin/products/:uuid`: replace editable fields; require numeric `If-Match: <version>`.

Allowed statuses: `draft`, `published`, `archived`. An archived product never appears in the live public listing. Slugs are unique and lower-case. Every create/update is audit-recorded with actor ID. No public endpoint can change user roles or create an admin.

This is a server-side core only, without plan prices, payments, licenses, purchases or merchant CMS bindings. Admin role must be provisioned through a controlled offline operator workflow; do not expose a self-registration admin role.

## Production gates
Catalog review/approval, account role provisioning, field-level permissions, audit consumption, server backup, and a real customer UX must be completed before commercial use.


## Plan/entitlement milestone

Pricing and manual test entitlements have been added in a separate API module. See [Pricing and test entitlements](commerce-foundation.md). These definitions are not checkout prices charged to customers and do not constitute commercial licenses.
