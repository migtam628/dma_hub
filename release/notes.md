# DMA Hub v0.2.0-alpha.18

**Catalog UI development alpha. Local API only; no live commerce or production backend. Windows installer remains unsigned.**

## New in alpha.18

- **Admin → Products** now operates on persistent catalog data for authorized local API administrators, replacing the synthetic product table.
- Create draft products, edit names/slugs/descriptions, and publish, unpublish or archive records using optimistic version checks and explicit confirmations.
- Published-only API details at `GET /v1/catalog/live/:slug`; draft, archived, nonexistent and invalid slugs return 404 and expose no internal product status or version.
- Public Products screen links API-backed published records to `#/catalog/:slug` detail views with loading, unavailable and 404 states.
- API regression coverage for published/detail agreement, draft/archive exclusion and read-only behavior; updated catalog documentation, README and engineering roadmap.

## Existing foundation

Previously released **v0.2.0-alpha.17**: privacy-preserving local admin Security Monitoring dashboard and persistent SQLite rate-limit controls. Also includes Concept 3 website, account/session API, pricing and manual test-access foundation, Stripe TEST Checkout/reconciliation observations, cloud profile API, GitHub Pages site and an unsigned Tauri Windows companion.

## Distribution

GitHub Releases provides a tested static web preview ZIP and SHA-256 manifest. An **unsigned** Windows NSIS preview installer with checksum is uploaded only after Windows build and verification pass. Always verify checksums and treat these artifacts as development previews.

## Incomplete production gates

No hosted production API, signed installer, verified paid license, actual financial settlement or subscription flow, secure updater, tested device adapter, independent security assessment, cross-host abuse detection, or commercial support guarantees.

**Do not expose the SQLite development API to the public internet. Publishing catalog metadata does not make software purchasable or activate any license.**
