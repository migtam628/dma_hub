import {DatabaseSync} from "node:sqlite";

export const SCHEMA_VERSION=11;

const BASE_SCHEMA=`CREATE TABLE IF NOT EXISTS users(
 id TEXT PRIMARY KEY,
 email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'customer',
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions(
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS profiles(
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 data_json TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS profiles_user ON profiles(user_id);
CREATE TABLE IF NOT EXISTS audit(
 id TEXT PRIMARY KEY,
 actor TEXT,
 action TEXT NOT NULL,
 target TEXT,
 created_at INTEGER NOT NULL
);`;

function requiredColumns(db,table,names){
 const columns=new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name));
 for(const name of names){
  if(!columns.has(name))throw new Error(`Unsupported ${table} schema: missing ${name}`);
 }
}

export function migrateDatabase(db){
 if(!(db instanceof DatabaseSync))throw new TypeError("Expected an open DatabaseSync");
 db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;");
 let version=db.prepare("PRAGMA user_version").get().user_version;
 if(!Number.isInteger(version)||version<0||version>SCHEMA_VERSION){
  throw new Error(`Unsupported database schema version ${version}; refusing to modify data`);
 }
 if(version===0){
  db.exec("BEGIN IMMEDIATE");
  try{
   db.exec(BASE_SCHEMA);
   requiredColumns(db,"users",["id","email","password_hash","role","created_at"]);
   requiredColumns(db,"sessions",["token_hash","user_id","expires_at","created_at"]);
   requiredColumns(db,"profiles",["id","user_id","name","data_json","version","created_at","updated_at"]);
   requiredColumns(db,"audit",["id","actor","action","target","created_at"]);
   db.exec("PRAGMA user_version=1; COMMIT;");
   version=1;
  }catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
 }
 if(version===1){
  db.exec("BEGIN IMMEDIATE");
  try{
   const columns=new Set(db.prepare("PRAGMA table_info(users)").all().map(c=>c.name));
   if(!columns.has("disabled_at")){
    db.exec("ALTER TABLE users ADD COLUMN disabled_at INTEGER");
   }
   db.exec("PRAGMA user_version=2; COMMIT;");
   version=2;
  }catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
 }
 if(version===2){
  db.exec("BEGIN IMMEDIATE");
  try{
   const fields=new Set(db.prepare("PRAGMA table_info(users)").all().map(c=>c.name));
   if(!fields.has("email_verified_at"))db.exec("ALTER TABLE users ADD COLUMN email_verified_at INTEGER");
   db.exec(`CREATE TABLE IF NOT EXISTS auth_tokens(
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose IN ('verify_email','reset_password')),
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
   );
   CREATE INDEX IF NOT EXISTS auth_tokens_user_purpose ON auth_tokens(user_id,purpose);`);
   db.exec("PRAGMA user_version=3; COMMIT;");
   version=3;
  }catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
 }
 if(version===3){
  db.exec("BEGIN IMMEDIATE");
  try{
   db.exec(`CREATE TABLE IF NOT EXISTS catalog_products(
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
    version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
   );
   CREATE INDEX IF NOT EXISTS catalog_products_status ON catalog_products(status,updated_at);`);
   db.exec("PRAGMA user_version=4; COMMIT;");
   version=4;
  }catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
 }
 if(version===4){
  db.exec("BEGIN IMMEDIATE");
  try{
   db.exec(`CREATE TABLE IF NOT EXISTS pricing_plans(
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES catalog_products(id) ON DELETE RESTRICT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    amount_minor INTEGER NOT NULL CHECK(amount_minor>=0 AND amount_minor<=100000000),
    currency TEXT NOT NULL CHECK(currency='USD'),
    billing_period TEXT NOT NULL CHECK(billing_period IN ('one_time','monthly','yearly')),
    status TEXT NOT NULL CHECK(status IN ('draft','active','archived')),
    version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(product_id,code)
   );
   CREATE INDEX IF NOT EXISTS pricing_plans_product ON pricing_plans(product_id,status);
   CREATE TABLE IF NOT EXISTS entitlements(
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    product_id TEXT NOT NULL REFERENCES catalog_products(id) ON DELETE RESTRICT,
    plan_id TEXT NOT NULL REFERENCES pricing_plans(id) ON DELETE RESTRICT,
    source TEXT NOT NULL DEFAULT 'admin_test_grant' CHECK(source='admin_test_grant'),
    state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','revoked')),
    starts_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL CHECK(expires_at>starts_at),
    revoked_at INTEGER,
    granted_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    revoked_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
   );
   CREATE INDEX IF NOT EXISTS entitlements_user_active ON entitlements(user_id,product_id,state,starts_at,expires_at);
   CREATE INDEX IF NOT EXISTS entitlements_product ON entitlements(product_id);
   `);
   db.exec("PRAGMA user_version=5; COMMIT;");
   version=5;
  }catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
 }

 if(version===5){
  db.exec("BEGIN IMMEDIATE");
  try{
   // Rebuild existing entitlement constraint to distinguish test-order fulfillment.
   db.exec(`CREATE TABLE entitlements_v6(
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    product_id TEXT NOT NULL REFERENCES catalog_products(id) ON DELETE RESTRICT,
    plan_id TEXT NOT NULL REFERENCES pricing_plans(id) ON DELETE RESTRICT,
    source TEXT NOT NULL CHECK(source IN ('admin_test_grant','sandbox_order')),
    state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','revoked')),
    starts_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL CHECK(expires_at>starts_at),
    revoked_at INTEGER,
    granted_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    revoked_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
   );
   INSERT INTO entitlements_v6 SELECT * FROM entitlements;
   DROP TABLE entitlements;
   ALTER TABLE entitlements_v6 RENAME TO entitlements;
   CREATE INDEX entitlements_user_active ON entitlements(user_id,product_id,state,starts_at,expires_at);
   CREATE INDEX entitlements_product ON entitlements(product_id);
   CREATE TABLE sandbox_orders(
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    product_id TEXT NOT NULL REFERENCES catalog_products(id) ON DELETE RESTRICT,
    plan_id TEXT NOT NULL REFERENCES pricing_plans(id) ON DELETE RESTRICT,
    idempotency_key TEXT NOT NULL,
    amount_minor INTEGER NOT NULL CHECK(amount_minor>=0),
    currency TEXT NOT NULL CHECK(currency='USD'),
    billing_period TEXT NOT NULL CHECK(billing_period IN ('one_time','monthly','yearly')),
    state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','test_fulfilled','cancelled')),
    entitlement_id TEXT REFERENCES entitlements(id) ON DELETE RESTRICT,
    fulfilled_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    fulfilled_at INTEGER,
    UNIQUE(user_id,idempotency_key),
    CHECK((state='test_fulfilled' AND entitlement_id IS NOT NULL AND fulfilled_by IS NOT NULL AND fulfilled_at IS NOT NULL) OR
          (state!='test_fulfilled' AND entitlement_id IS NULL AND fulfilled_at IS NULL))
   );
   CREATE INDEX sandbox_orders_user ON sandbox_orders(user_id,created_at);
   CREATE INDEX sandbox_orders_pending ON sandbox_orders(state,created_at);`);
   db.exec("PRAGMA user_version=6; COMMIT;");
   version=6;
  }catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
 }
 if(version===6){
  db.exec("BEGIN IMMEDIATE");
  try{
   db.exec(`CREATE TABLE sandbox_webhook_events(
    event_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES sandbox_orders(id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL CHECK(event_type IN ('sandbox.payment_observed','sandbox.payment_failed')),
    content_sha256 TEXT NOT NULL,
    sent_at INTEGER NOT NULL,
    received_at INTEGER NOT NULL
   );
   CREATE INDEX sandbox_webhook_order ON sandbox_webhook_events(order_id,received_at);`);
   db.exec("PRAGMA user_version=7; COMMIT;");
   version=7;
  }catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
 }
 if(version===7){
  db.exec("BEGIN IMMEDIATE");
  try{
   db.exec(`CREATE TABLE stripe_test_checkouts(
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE REFERENCES sandbox_orders(id) ON DELETE RESTRICT,
    provider_session_id TEXT UNIQUE,
    checkout_url TEXT,
    state TEXT NOT NULL CHECK(state IN ('creating','open','test_paid_observed','expired')),
    amount_minor INTEGER NOT NULL CHECK(amount_minor>0),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
   );
   CREATE INDEX stripe_test_checkouts_state ON stripe_test_checkouts(state,updated_at);
   CREATE TABLE stripe_test_events(
    event_id TEXT PRIMARY KEY,
    checkout_id TEXT NOT NULL REFERENCES stripe_test_checkouts(id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL,
    body_sha256 TEXT NOT NULL,
    received_at INTEGER NOT NULL
   );
   CREATE INDEX stripe_test_events_checkout ON stripe_test_events(checkout_id,received_at);`);
   db.exec("PRAGMA user_version=8; COMMIT;");
   version=8;
  }catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
 }
 if(version===8){
  db.exec("BEGIN IMMEDIATE");
  try{
   db.exec(`CREATE TABLE stripe_test_reconciliation_checks(
    id TEXT PRIMARY KEY,
    checkout_id TEXT NOT NULL REFERENCES stripe_test_checkouts(id) ON DELETE RESTRICT,
    fingerprint TEXT NOT NULL,
    provider_session_status TEXT NOT NULL CHECK(provider_session_status IN ('open','complete','expired')),
    provider_payment_status TEXT NOT NULL CHECK(provider_payment_status IN ('paid','unpaid','no_payment_required')),
    test_payment_observed INTEGER NOT NULL CHECK(test_payment_observed IN (0,1)),
    checked_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    checked_at INTEGER NOT NULL,
    UNIQUE(checkout_id,fingerprint)
   );
   CREATE INDEX stripe_test_reconciliation_history
    ON stripe_test_reconciliation_checks(checkout_id,checked_at DESC);`);
   db.exec("PRAGMA user_version=9; COMMIT;");
   version=9;
  }catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
 }
 if(version===9){
  db.exec("BEGIN IMMEDIATE");
  try{
   db.exec(`CREATE TABLE auth_rate_limits(
    scope TEXT NOT NULL,
    key_hash TEXT NOT NULL CHECK(length(key_hash)=64),
    window_start INTEGER NOT NULL,
    attempt_count INTEGER NOT NULL CHECK(attempt_count>=1),
    expires_at INTEGER NOT NULL CHECK(expires_at>window_start),
    PRIMARY KEY(scope,key_hash)
   );
   CREATE INDEX auth_rate_limits_expiry ON auth_rate_limits(expires_at);`);
   db.exec("PRAGMA user_version=10; COMMIT;");
   version=10;
  }catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
 }
 if(version===10){
  db.exec("BEGIN IMMEDIATE");
  try{
   // Additive migration also tolerates older test fixtures rebuilt from a newer file.
   const existing=new Set(db.prepare("PRAGMA table_info(catalog_products)").all().map(c=>c.name));
   if(!existing.has("category"))db.exec("ALTER TABLE catalog_products ADD COLUMN category TEXT NOT NULL DEFAULT 'unspecified' CHECK(category IN ('unspecified','software','hardware','cloud'))");
   if(!existing.has("features_json"))db.exec("ALTER TABLE catalog_products ADD COLUMN features_json TEXT NOT NULL DEFAULT '[]'");
   if(!existing.has("requirements_json"))db.exec("ALTER TABLE catalog_products ADD COLUMN requirements_json TEXT NOT NULL DEFAULT '[]'");
   db.exec("PRAGMA user_version=11; COMMIT;");
   version=11;
  }catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
 }
 requiredColumns(db,"auth_rate_limits",["scope","key_hash","window_start","attempt_count","expires_at"]);
 requiredColumns(db,"stripe_test_reconciliation_checks",
  ["id","checkout_id","fingerprint","provider_session_status","provider_payment_status",
   "test_payment_observed","checked_by","checked_at"]);
 requiredColumns(db,"stripe_test_checkouts",["id","order_id","provider_session_id","checkout_url","state","amount_minor","created_at","updated_at"]);
 requiredColumns(db,"stripe_test_events",["event_id","checkout_id","event_type","body_sha256","received_at"]);
 requiredColumns(db,"sandbox_webhook_events",["event_id","order_id","event_type","content_sha256","sent_at","received_at"]);
 requiredColumns(db,"sandbox_orders",["id","user_id","product_id","plan_id","idempotency_key","amount_minor","currency","billing_period","state","entitlement_id","fulfilled_by","created_at","updated_at","fulfilled_at"]);
 requiredColumns(db,"pricing_plans",["id","product_id","code","name","amount_minor","currency","billing_period","status","version","created_at","updated_at"]);
 requiredColumns(db,"entitlements",["id","user_id","product_id","plan_id","source","state","starts_at","expires_at","revoked_at","granted_by","revoked_by","created_at","updated_at"]);
 requiredColumns(db,"catalog_products",["id","slug","name","description","status","version","created_at","updated_at","category","features_json","requirements_json"]);
 requiredColumns(db,"users",["id","email","password_hash","role","created_at","disabled_at","email_verified_at"]);
 requiredColumns(db,"auth_tokens",["token_hash","user_id","purpose","created_at","expires_at"]);
 requiredColumns(db,"sessions",["token_hash","user_id","expires_at","created_at"]);
 requiredColumns(db,"profiles",["id","user_id","name","data_json","version","created_at","updated_at"]);
 requiredColumns(db,"audit",["id","actor","action","target","created_at"]);
 if(db.prepare("PRAGMA foreign_key_check").all().length){
  throw new Error("Database foreign-key validation failed");
 }
 return SCHEMA_VERSION;
}
