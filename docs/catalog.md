# Persistent Catalog API — backend milestone

The public storefront contains labeled sample concept products **alongside** separately displayed API-published catalog records. The local API maintains the authoritative published records; GitHub Pages itself remains static.

## Endpoints
- `GET /v1/catalog`: existing labeled **demo** products.
- `GET /v1/catalog/live`: **only** published records from SQLite, no auth required. Empty until an admin publishes an item.
- `GET /v1/catalog/live/:slug`: public read-only product details, published records only; `404` for draft, archived, or missing slug. No prices, internal status, version or credentials in the response.
- `GET /v1/admin/products`: full list, authorized admin only.
- `POST /v1/admin/products`: create with `{slug,name,description,status}` (status defaults to draft).
- `GET /v1/admin/products/:uuid`: retrieve as admin.
- `PATCH /v1/admin/products/:uuid`: replace editable fields; require numeric `If-Match: <version>`.

Allowed statuses: `draft`, `published`, `archived`. An archived product never appears in the live public listing. Slugs are unique and lower-case. Every create/update is audit-recorded with actor ID. No public endpoint can change user roles or create an admin.

This is a server-side core only, without plan prices, payments, licenses, purchases or merchant CMS bindings. Admin role must be provisioned through a controlled offline operator workflow; do not expose a self-registration admin role.


## Local web integration — catalog editor and details

- **Admin → Products** now uses the authenticated local API to list, create and update catalog records. A server-issued `admin` session is required. Status transitions are explicit, and updates send `If-Match` version metadata to prevent silently overwriting competing admin edits.
- The editor supports slug, name and public description, draft creation, publication, unpublishing and archiving, with an explicit confirmation before visibility changes. Conflicts require reloading fresh data; audit events remain server-owned.
- **Products** on the public website distinguishes actual API-published records from the existing labeled demonstration concepts. Published API cards link to `#/catalog/:slug`, which retrieves details from the published-only endpoint and handles unavailable, nonexistent and unpublished records explicitly.
- A published record is **not** a paid listing: there is no verified download, device compatibility, checkout, settlement or commercial license.
- The static GitHub Pages site does not host the local backend. Without a separately deployed authorized API, the real-catalog section shows an offline state.

## Production gates
Catalog review/approval, account role provisioning, field-level permissions, audit consumption, server backup, and a real customer UX must be completed before commercial use.


## Plan/entitlement milestone

Pricing and manual test entitlements have been added in a separate API module. See [Pricing and test entitlements](commerce-foundation.md). These definitions are not checkout prices charged to customers and do not constitute commercial licenses.
