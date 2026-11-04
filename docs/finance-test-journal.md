# Provider-neutral finance TEST observation journal (SQLite v19)

This local-only journal records **manual TEST reports** against sandbox orders. It is not a financial ledger, evidence of settlement, payment-provider confirmation, refund execution or license issuance. No external provider is contacted.

## Invariants

- Administrator-only manual ingestion; only sandbox and stripe_test provider labels are accepted. A stripe_test label requires a local test Checkout record, not proof of payment.
- Report kinds: test_charge_reported, test_refund_reported, test_dispute_reported. Reports do not claim verified outcomes.
- Test charge reports must equal the sandbox order amount in USD; test refund reports must be positive and not exceed the order amount; dispute reports must use zero. These checks do not reconcile cumulative refunds.
- Provider plus event key is unique. Exact retries return replayed:true; conflicting retries return HTTP 409, including cross-order collisions.
- Immutable SQLite journal with UPDATE/DELETE-blocking triggers and atomic administrator audit entries. No endpoint can change an order, create entitlements, refund, or grant access.
- Responses always include testOnly:true, providerVerified:false, settlementVerified:false, accessGranted:false.
- Customer history is owner-scoped and omits provider event keys and operator IDs. Admin and customer lists return at most 100 records.

## API (authenticated, local only)

GET /v1/me/finance-test-events — sanitized owner-scoped history.

GET /v1/admin/finance-test-events — admin-only recent entries.

GET /v1/admin/finance-test-events/:uuid — admin-only detail.

POST /v1/admin/finance-test-events — admin-only append, accepting exactly orderId, provider, eventKey, kind, amountMinor.

Example POST body:

{"orderId":"<sandbox-order-uuid>","provider":"sandbox","eventKey":"qa_event_0001","kind":"test_charge_reported","amountMinor":1500}

## Outstanding production gates

Real processor TEST-account validation; independently verified financial ledger, reconciliation, charge/refund/dispute and cumulative controls; webhook integrity; tax and currency; business/legal/compliance review; secure deployment; and independently approved payment-to-license activation. None are satisfied by manual observations.

## Cumulative refund reporting guard (November 3, 2026)

Manual TEST refunds are now capped cumulatively per order and provider, with atomic idempotent retries. These are unverified observations, not actual refund execution or settlement. The check runs inside the same SQLite immediate transaction as event insertion. Different providers are kept separate; no customer funds move. Refund events must be positive and cannot exceed the original order amount in aggregate per provider.

## Read-only reconciliation summary (Windows PC local API, November 3, 2026)

- `GET /v1/me/finance-test-reconciliation/:orderId` — authenticated owner only; unknown or unowned orders return 404.
- `GET /v1/admin/finance-test-reconciliation/:orderId` — administrators only (403 otherwise).
- Returns per-provider manual TEST counts and integer-minor-unit sums of charge/refund/dispute reports, reported net, and review flags. Missing reports, duplicate reported charges, reported refunds larger than reported charges, and disputes are marked for review. A provider with no reports is not assumed to have charged anything.
- Providers are never combined into a settlement figure. No provider API is queried, and this summary does not verify money movement. Every response says `observationStatus: MANUAL_UNVERIFIED_TEST`, `providerVerified: false`, `settlementVerified: false`, and `accessGranted: false`.
- This feature is read-only; it cannot change an order, refund, grant entitlement, or activate a license. Numerical aggregates describe **reported observations**, never a real account balance.
