import {DatabaseSync} from "node:sqlite";

export const SCHEMA_VERSION=6;

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
 requiredColumns(db,"sandbox_orders",["id","user_id","product_id","plan_id","idempotency_key","amount_minor","currency","billing_period","state","entitlement_id","fulfilled_by","created_at","updated_at","fulfilled_at"]);
 requiredColumns(db,"pricing_plans",["id","product_id","code","name","amount_minor","currency","billing_period","status","version","created_at","updated_at"]);
 requiredColumns(db,"entitlements",["id","user_id","product_id","plan_id","source","state","starts_at","expires_at","revoked_at","granted_by","revoked_by","created_at","updated_at"]);
 requiredColumns(db,"catalog_products",["id","slug","name","description","status","version","created_at","updated_at"]);
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
