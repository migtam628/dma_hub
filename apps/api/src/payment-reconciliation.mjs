/**
 * Validate a read-only, authoritative Stripe TEST Checkout Session lookup.
 * A matching provider response is an observation, never a settlement ledger or access grant.
 */
export function verifyStripeTestCheckoutRead(session, checkout) {
  if (!session || typeof session !== "object" || Array.isArray(session) ||
      !checkout || typeof checkout !== "object") return null;
  const validStatus = ["open", "complete", "expired"].includes(session.status);
  const validPayment = ["paid", "unpaid", "no_payment_required"].includes(session.payment_status);
  if (session.object !== "checkout.session" || session.id !== checkout.provider_session_id ||
      !/^cs_test_[A-Za-z0-9_]{8,200}$/.test(session.id || "") ||
      session.livemode !== false || session.mode !== "payment" ||
      session.currency !== "usd" || !Number.isSafeInteger(session.amount_total) ||
      session.amount_total !== checkout.amount_minor ||
      session.client_reference_id !== checkout.order_id ||
      session.metadata?.order_id !== checkout.order_id ||
      session.metadata?.user_id !== checkout.user_id ||
      !validStatus || !validPayment ||
      (session.payment_status === "paid" && session.status !== "complete")) return null;
  return {
    providerSessionStatus: session.status,
    providerPaymentStatus: session.payment_status,
    testPaymentObserved: session.status === "complete" && session.payment_status === "paid",
    settlementVerified: false,
    accessGranted: false,
    testModeOnly: true
  };
}
