import {createHash,randomUUID} from "node:crypto";

/**
 * Durable, deduplicated snapshots of explicitly checked Stripe TEST Checkout Sessions.
 * This is NOT a payment ledger, settlement verification, order fulfillment or license grant.
 */
export function createStripeTestObservationStore({db,clock,audit}){
 function normalized(row){
  return {id:row.id,checkoutId:row.checkout_id,
   providerSessionStatus:row.provider_session_status,
   providerPaymentStatus:row.provider_payment_status,
   testPaymentObserved:row.test_payment_observed===1,
   checkedAt:row.checked_at,checkedBy:row.checked_by,
   settlementVerified:false,accessGranted:false,testModeOnly:true};
 }
 function record(checkout,observation,adminId){
  // Only normalized, previously validated provider fields enter the snapshot.
  const fingerprint=createHash("sha256").update(JSON.stringify([
   observation.providerSessionStatus,observation.providerPaymentStatus,
   observation.testPaymentObserved===true
  ])).digest("hex");
  db.exec("BEGIN IMMEDIATE");
  try{
   const created=db.prepare(`INSERT OR IGNORE INTO stripe_test_reconciliation_checks
    (id,checkout_id,fingerprint,provider_session_status,provider_payment_status,
     test_payment_observed,checked_by,checked_at)
    VALUES(?,?,?,?,?,?,?,?)`)
    .run(randomUUID(),checkout.id,fingerprint,observation.providerSessionStatus,
     observation.providerPaymentStatus,observation.testPaymentObserved?1:0,adminId,clock());
   const saved=db.prepare("SELECT * FROM stripe_test_reconciliation_checks WHERE checkout_id=? AND fingerprint=?")
    .get(checkout.id,fingerprint);
   if(!saved)throw new Error("Failed to persist Stripe test observation");
   if(created.changes)audit(adminId,"stripe_test.observation_recorded",checkout.order_id);
   db.exec("COMMIT");
   return {...normalized(saved),replayed:!Boolean(created.changes)};
  }catch(error){
   if(db.isTransaction)db.exec("ROLLBACK");
   throw error;
  }
 }
 function list(checkoutId,limit){
  return db.prepare(`SELECT * FROM stripe_test_reconciliation_checks WHERE checkout_id=?
   ORDER BY checked_at DESC,rowid DESC LIMIT ?`).all(checkoutId,limit).map(normalized);
 }
 return {record,list};
}
