import {DatabaseSync} from "node:sqlite";

export const SCHEMA_VERSION=2;

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
  }catch(error){if(db.isTransaction)db.exec("ROLLBACK");throw error}
 }
 requiredColumns(db,"users",["id","email","password_hash","role","created_at","disabled_at"]);
 requiredColumns(db,"sessions",["token_hash","user_id","expires_at","created_at"]);
 requiredColumns(db,"profiles",["id","user_id","name","data_json","version","created_at","updated_at"]);
 requiredColumns(db,"audit",["id","actor","action","target","created_at"]);
 if(db.prepare("PRAGMA foreign_key_check").all().length){
  throw new Error("Database foreign-key validation failed");
 }
 return SCHEMA_VERSION;
}
