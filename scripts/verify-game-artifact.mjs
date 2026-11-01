#!/usr/bin/env node
import {fileURLToPath} from "node:url";
import {verifyGameArtifact} from "./game-artifact-verification.mjs";

const help="Usage: node scripts/verify-game-artifact.mjs --artifact <local-file> --manifest <signed.json> --signature <signed.json.sig>\nThe trusted publisher keys are pinned in release/trusted-game-publishers.json. This command never downloads or executes an artifact.\n";
const trustStorePath=fileURLToPath(new URL("../release/trusted-game-publishers.json",import.meta.url));
async function main(args){
 if(args.length===1&&(args[0]==="--help"||args[0]==="-h")){process.stdout.write(help);return}
 const options={};const allowed=new Set(["--artifact","--manifest","--signature"]);
 if(args.length!==6)throw Error("Exactly three path arguments are required");
 for(let i=0;i<args.length;i+=2){
  if(!allowed.has(args[i])||options[args[i]]||!args[i+1]||args[i+1].startsWith("--"))
   throw Error("Invalid or repeated path argument");
  options[args[i]]=args[i+1];
 }
 if(Object.keys(options).length!==3)throw Error("Missing artifact/manifest/signature path");
 const result=await verifyGameArtifact({
  artifactPath:options["--artifact"],manifestPath:options["--manifest"],
  signaturePath:options["--signature"],trustStorePath
 });
 process.stdout.write(JSON.stringify(result,null,2)+"\n");
}
main(process.argv.slice(2)).catch(e=>{
 process.stderr.write("Artifact verification FAILED: "+(e instanceof Error?e.message:"unknown verification error")+"\n");
 process.stderr.write("A failure MUST NOT be treated as a software release approval.\n");
 process.exitCode=1;
});
