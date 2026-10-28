import {backup,DatabaseSync} from "node:sqlite";
import {chmod,link,mkdtemp,rm} from "node:fs/promises";
import {existsSync} from "node:fs";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {SCHEMA_VERSION} from "./migrations.mjs";

export function verifyBackup(path){
 const file=resolve(path);
 if(!existsSync(file))throw new Error("Database backup does not exist");
 const db=new DatabaseSync(file,{readOnly:true});
 try{
  const check=db.prepare("PRAGMA quick_check").get();
  if(check?.quick_check!=="ok")throw new Error("SQLite integrity check failed");
  const version=db.prepare("PRAGMA user_version").get().user_version;
  if(version!==SCHEMA_VERSION)throw new Error(`Unsupported backup schema version ${version}`);
  for(const table of ["users","sessions","profiles","audit","auth_tokens","catalog_products","pricing_plans","entitlements"]){
   const found=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
   if(!found)throw new Error(`Required table missing in backup: ${table}`);
  }
  return {ok:true,schemaVersion:version};
 }finally{db.close()}
}

export async function backupDatabase(sourcePath,destinationPath){
 const source=resolve(sourcePath),destination=resolve(destinationPath);
 if(source===destination)throw new Error("Backup must not replace the active database");
 if(!existsSync(source))throw new Error("Source database does not exist");
 if(existsSync(destination))throw new Error("Backup destination already exists; refusing overwrite");
 const sourceDb=new DatabaseSync(source,{readOnly:true});
 let tempDir;
 try{
  tempDir=await mkdtemp(join(dirname(destination),".dma-hub-backup-"));
  const staged=join(tempDir,"snapshot.sqlite");
  await backup(sourceDb,staged);
  verifyBackup(staged);
  await chmod(staged,0o600);
  await link(staged,destination); // Atomic create-if-absent, never overwrite a previous backup.
  return {path:destination,verified:true,schemaVersion:SCHEMA_VERSION};
 }finally{
  sourceDb.close();
  if(tempDir)await rm(tempDir,{force:true,recursive:true});
 }
}

const isDirect=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isDirect){
 const [action,source,destination]=process.argv.slice(2);
 try{
  if(action==="backup"&&source&&destination){
   const result=await backupDatabase(source,destination);
   process.stdout.write(JSON.stringify(result)+"\n");
  }else if(action==="verify"&&source&&!destination){
   process.stdout.write(JSON.stringify(verifyBackup(source))+"\n");
  }else{
   process.stderr.write("Usage: node apps/api/src/maintenance.mjs backup SOURCE.sqlite DEST.sqlite | verify BACKUP.sqlite\n");
   process.exitCode=2;
  }
 }catch(error){
  process.stderr.write("Maintenance operation failed: "+error.message+"\n");
  process.exitCode=1;
 }
}
