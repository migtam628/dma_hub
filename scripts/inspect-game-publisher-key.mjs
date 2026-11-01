#!/usr/bin/env node
import {readFile,lstat} from "node:fs/promises";
import {inspectPublisherPublicKey} from "./publisher-trust.mjs";

// Inspection only. It never edits the trust registry, imports credentials,
// contacts a server, or declares a publisher identity to be authenticated.
async function main(args){
 if(args.length===1&&(args[0]==="--help"||args[0]==="-h")){
  process.stdout.write("Usage: npm run inspect:publisher-key -- --key /path/to/publisher-public.pem\nIndependent out-of-band identity verification and a reviewed trust-registry change are still required.\n");return
 }
 if(args.length!==2||args[0]!=="--key"||!args[1]||args[1].startsWith("--"))throw Error("Expected exactly --key <publisher-public.pem>");
 const stat=await lstat(args[1]);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<50||stat.size>2048)throw Error("Expected a regular Ed25519 public-key PEM file");
 const pem=await readFile(args[1],"utf8");
 const {fingerprintSha256}=inspectPublisherPublicKey(pem);
 process.stdout.write(JSON.stringify({
  keyAlgorithm:"Ed25519",keyFormat:"SPKI DER",fingerprintSha256,
  publisherAuthenticated:false,trustRegistryModified:false,
  nextStep:"Compare this fingerprint with the verified publisher through an independent channel, then submit a reviewed registry change."
 },null,2)+"\n");
}
main(process.argv.slice(2)).catch(error=>{
 process.stderr.write("Publisher public-key inspection FAILED: "+(error instanceof Error?error.message:"invalid key")+"\n");
 process.exitCode=1;
});
