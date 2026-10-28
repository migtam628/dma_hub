import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {mkdtemp,copyFile,rm,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createApp} from "../src/app.mjs";
import {backupDatabase,verifyBackup} from "../src/maintenance.mjs";

async function withTempDir(fn){
 const folder=await mkdtemp(join(tmpdir(),"dma-hub-db-test-"));
 try{return await fn(folder)}finally{await rm(folder,{force:true,recursive:true})}
}
test("fresh database receives tracked schema migrations",()=>withTempDir(async(folder)=>{
 const app=createApp({dbPath:join(folder,"new.sqlite")});
 assert.equal(app.db.prepare("PRAGMA user_version").get().user_version,4);
 assert.ok(app.db.prepare("PRAGMA table_info(users)").all().some(row=>row.name==="disabled_at"));
 app.db.close();
}));
test("legacy pre-migration database retains users and profiles",()=>withTempDir(async(folder)=>{
 const path=join(folder,"legacy.sqlite");
 const legacy=new DatabaseSync(path);
 legacy.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'customer',created_at INTEGER NOT NULL);
 CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE profiles(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,data_json TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
 CREATE TABLE audit(id TEXT PRIMARY KEY,actor TEXT,action TEXT NOT NULL,target TEXT,created_at INTEGER NOT NULL);
 INSERT INTO users VALUES ('u1','legacy@example.test','hash-value','customer',1);
 INSERT INTO profiles VALUES ('p1','u1','Existing settings','{"density":41}',3,1,2);`);
 legacy.close();
 const upgraded=createApp({dbPath:path});
 assert.equal(upgraded.db.prepare("PRAGMA user_version").get().user_version,4);
 assert.equal(upgraded.db.prepare("SELECT email FROM users WHERE id='u1'").get().email,"legacy@example.test");
 assert.equal(upgraded.db.prepare("SELECT version FROM profiles WHERE id='p1'").get().version,3);
 upgraded.db.close();
 const reopened=createApp({dbPath:path});
 assert.equal(reopened.db.prepare("PRAGMA user_version").get().user_version,4);
 assert.equal(reopened.db.prepare("SELECT count(*) AS n FROM profiles").get().n,1);
 reopened.db.close();
}));
test("unknown future schema fails closed without changing version",()=>withTempDir(async(folder)=>{
 const path=join(folder,"future.sqlite");
 const db=new DatabaseSync(path);db.exec("PRAGMA user_version=99");db.close();
 assert.throws(()=>createApp({dbPath:path}),/Unsupported database schema version 99/);
 const check=new DatabaseSync(path);assert.equal(check.prepare("PRAGMA user_version").get().user_version,99);check.close();
}));
test("SQLite backup is verified, non-overwriting, and restore preserves user data",()=>withTempDir(async(folder)=>{
 const original=join(folder,"app.sqlite"),snapshot=join(folder,"backups.sqlite"),restored=join(folder,"restored.sqlite");
 const app=createApp({dbPath:original});
 app.db.prepare("INSERT INTO users(id,email,password_hash,role,created_at) VALUES(?,?,?,?,?)").run("u1","saved@example.test","test-hash","customer",10);
 app.db.prepare("INSERT INTO profiles(id,user_id,name,data_json,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").run("p1","u1","Original preset",'{"density":76}',2,10,11);
 app.db.close();
 const created=await backupDatabase(original,snapshot);
 assert.equal(created.verified,true);
 assert.equal(verifyBackup(snapshot).schemaVersion,4);
 if(process.platform!=="win32")assert.equal((await stat(snapshot)).mode&0o777,0o600);
 await assert.rejects(backupDatabase(original,snapshot),/already exists/);
 await copyFile(snapshot,restored); // isolated restore drill; production restore must stop the service
 const restoredApp=createApp({dbPath:restored});
 assert.equal(restoredApp.db.prepare("SELECT name FROM profiles WHERE id='p1'").get().name,"Original preset");
 assert.equal(restoredApp.db.prepare("SELECT email FROM users WHERE id='u1'").get().email,"saved@example.test");
 restoredApp.db.close();
}));
test("disabled account cannot log in or keep using its previous session",()=>withTempDir(async(folder)=>{
 const app=createApp({dbPath:join(folder,"accounts.sqlite")});
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port;
 const post=async(path,body,token)=>{const r=await fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()}};
 try{
  assert.equal((await post("/v1/auth/register",{email:"blocked@example.test",password:"long-password-12345"})).status,201);
  const login=await post("/v1/auth/login",{email:"blocked@example.test",password:"long-password-12345"});
  assert.equal(login.status,200);
  app.db.prepare("UPDATE users SET disabled_at=? WHERE email=?").run(23,"blocked@example.test");
  const r=await fetch(base+"/v1/me",{headers:{Authorization:"Bearer "+login.body.token}});
  assert.equal(r.status,401);
  assert.equal((await post("/v1/auth/login",{email:"blocked@example.test",password:"long-password-12345"})).status,401);
 }finally{await app.close()}
}));

test("schema v2 upgrades to v3 without losing existing user sessions or profiles",()=>withTempDir(async(folder)=>{
 const path=join(folder,"v2.sqlite");
 const db=new DatabaseSync(path);
 db.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'customer',created_at INTEGER NOT NULL,disabled_at INTEGER);
 CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE profiles(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,data_json TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
 CREATE TABLE audit(id TEXT PRIMARY KEY,actor TEXT,action TEXT NOT NULL,target TEXT,created_at INTEGER NOT NULL);
 INSERT INTO users VALUES ('existing','kept@example.test','password-hash','customer',1,NULL);
 INSERT INTO sessions VALUES ('opaque-hash','existing',9999999999999,1);
 INSERT INTO profiles VALUES ('profile','existing','Kept','{}',1,1,1);
 PRAGMA user_version=2;`);
 db.close();
 const app=createApp({dbPath:path});
 assert.equal(app.db.prepare("PRAGMA user_version").get().user_version,4);
 assert.equal(app.db.prepare("SELECT email FROM users WHERE id='existing'").get().email,"kept@example.test");
 assert.equal(app.db.prepare("SELECT count(*) n FROM sessions").get().n,1);
 assert.equal(app.db.prepare("SELECT count(*) n FROM profiles").get().n,1);
 assert.equal(app.db.prepare("SELECT email_verified_at FROM users WHERE id='existing'").get().email_verified_at,null);
 assert.ok(app.db.prepare("SELECT name FROM sqlite_master WHERE name='auth_tokens'").get());
 app.db.close();
}));
