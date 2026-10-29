# Stripe TEST reconciliation history — schema v9

This feature extends the existing **admin-only read of a Stripe test Checkout Session**. It is deliberately not a payment-settlement ledger, not a charge, and not a production entitlement system.

## Operations

`POST /v1/admin/stripe-test-checkouts/:checkoutUuid/reconcile` requires an authenticated administrator, a configured Stripe `sk_test_` key and a persisted test Checkout Session. The server reads Stripe directly and validates mode, identity, owner metadata, matching order, USD amount, `livemode:false`, and session/payment state.

Once a response passes all checks, the server stores one normalized test snapshot per distinct state combination in `stripe_test_reconciliation_checks`. It does **not** persist Stripe payloads, credentials, customer details or payment-method data. Rechecking an identical state returns the same observation ID and `observationReplay:true`; a new state creates another history entry. The snapshot and audit record are written atomically.

The response explicitly returns `settlementVerified:false` and `accessGranted:false`. A test payment marked `paid` is only a **provider test-state observation**. It is not a financial ledger, a cleared settlement or approval to activate software.

`GET /v1/admin/stripe-test-checkouts/:checkoutUuid/observations?limit=30` lists up to 50 of those snapshots, most recent first. It is admin-only; unknown checkouts return 404, invalid limits return 422. Errors, invalid provider responses and denied requests never create observations.

## Safety and next steps

- No webhooks or observations can change `sandbox_orders`, `entitlements`, or production license state.
- Real payments, refunds, disputes, invoicing and subscriptions are **not implemented**.
- No Stripe account is connected by default; this can be tested with mocked provider responses without a financial transaction.
- Before a real launch, implement verified webhooks and reconciliation against PaymentIntent/Charge state, a durable finance ledger, safe retries, no duplicate paid entitlement issuance, refunds/disputes and independent security assessment.

See [Stripe test adapter](stripe-test.md), [API reference](api.md) and the production-commerce tracking issue.
