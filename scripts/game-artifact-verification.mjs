import {createHash,verify as verifySignature} from "node:crypto";
import {constants} from "node:fs";
import {open,lstat} from "node:fs/promises";
import {validatePublisherTrustRegistry} from "./publisher-trust.mjs";
import {basename} from "node:path";

// Deliberately offline: this module never downloads, opens, or executes the
// checked artifact. Publisher keys are operator-pinned independently of assets.
const MAX_MANIFEST=8192,MAX_SIGNATURE=512,MAX_TRUST=65536;
const HEX64=/^[a-f0-9]{64}$/;
const ID=/^[a-z][a-z0-9-]{2,63}$/;
const ASSET=/^[A-Za-z0-9][A-Za-z0-9._-]{2,119}$/;
const TAG=/^v[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9][a-z0-9.-]{0,45})?$/;
const REPO="migtam628/dma_hub";
function ensure(condition,why){if(!condition)throw new Error(why)}
async function openRegularFile(path){
 // O_NOFOLLOW prevents path symlink redirection on supported platforms.
 // The before/after inode and metadata checks detect path replacement and
 // in-place writes observed during this verification pass.
 const before=await lstat(path);
 ensure(before.isFile()&&!before.isSymbolicLink(),"File is not a permitted regular file");
 const handle=await open(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
 try{
  const info=await handle.stat();
  ensure(info.isFile()&&info.ino===before.ino&&info.dev===before.dev,
   "File changed between path inspection and opening");
  return {handle,info};
 }catch(e){await handle.close();throw e}
}
function unchanged(before,after){
 return before.dev===after.dev&&before.ino===after.ino&&before.size===after.size&&
  before.mtimeMs===after.mtimeMs&&before.ctimeMs===after.ctimeMs;
}
async function boundedFile(path,max){
 const {handle,info}=await openRegularFile(path);
 try{
  ensure(info.size>0&&info.size<=max,"File is not a permitted regular file");
  const bytes=await handle.readFile();
  ensure(bytes.length===info.size&&unchanged(info,await handle.stat()),
   "File changed during verification");
  return bytes;
 }finally{await handle.close()}
}
function validatedManifest(value){
 ensure(value&&typeof value==="object"&&!Array.isArray(value),"Invalid artifact manifest");
 const keys=["schemaVersion","repository","publisherId","releaseTag","assetName","sizeBytes","sha256"];
 ensure(Object.keys(value).sort().join(",")===keys.sort().join(","),"Unexpected manifest fields");
 ensure(value.schemaVersion===1&&value.repository===REPO,"Unsupported manifest schema/repository");
 ensure(typeof value.publisherId==="string"&&ID.test(value.publisherId),"Invalid publisher ID");
 ensure(typeof value.releaseTag==="string"&&TAG.test(value.releaseTag),"Invalid release tag");
 ensure(typeof value.assetName==="string"&&ASSET.test(value.assetName),"Invalid asset name");
 ensure(Number.isSafeInteger(value.sizeBytes)&&value.sizeBytes>0,"Invalid artifact byte count");
 ensure(typeof value.sha256==="string"&&HEX64.test(value.sha256),"Invalid SHA-256 digest");
 return value;
}
function getPublisher(store,publisherId){
 const approved=validatePublisherTrustRegistry(store);
 const publisher=approved.get(publisherId);
 ensure(publisher&&publisher.status==="trusted","Publisher key is not independently trusted");
 return publisher;
}
export async function verifyGameArtifact({artifactPath,manifestPath,signaturePath,trustStorePath}){
 ensure([artifactPath,manifestPath,signaturePath,trustStorePath].every(x=>typeof x==="string"&&x.length>0),
  "Artifact, manifest, signature and pinned trust registry are required");
 const [manifestBytes,signatureBytes,trustBytes]=await Promise.all([
  boundedFile(manifestPath,MAX_MANIFEST),boundedFile(signaturePath,MAX_SIGNATURE),boundedFile(trustStorePath,MAX_TRUST)
 ]);
 const manifest=validatedManifest(JSON.parse(manifestBytes.toString("utf8")));
 const store=JSON.parse(trustBytes.toString("utf8"));
 const publisher=getPublisher(store,manifest.publisherId);
 const sigText=signatureBytes.toString("ascii").trim();
 ensure(/^[A-Za-z0-9+/]{86}==$/.test(sigText),"Detached signature must be canonical base64 Ed25519");
 const signature=Buffer.from(sigText,"base64");
 ensure(signature.length===64&&verifySignature(null,manifestBytes,publisher.key,signature),
  "Detached publisher signature failed");
 ensure(basename(artifactPath)===manifest.assetName,"Artifact filename differs from signed manifest");
 const {handle,info}=await openRegularFile(artifactPath);
 let digest;
 try{
  ensure(info.size===manifest.sizeBytes,"Artifact byte count differs from signed manifest");
  const sha=createHash("sha256");
  let count=0;
  for await(const chunk of handle.createReadStream({autoClose:false,highWaterMark:1024*1024})){
   count+=chunk.length;
   ensure(count<=manifest.sizeBytes,"Artifact size changed during hashing");
   sha.update(chunk);
  }
  ensure(count===manifest.sizeBytes&&unchanged(info,await handle.stat()),
   "Artifact changed during verification");
  digest=sha.digest("hex");
 }finally{await handle.close()}
 ensure(digest===manifest.sha256,"Actual artifact bytes fail signed SHA-256 comparison");
 return {verified:true,checks:{pinnedPublisherEd25519:true,actualFileSha256:true,exactAssetName:true,exactByteCount:true},
  publisherId:manifest.publisherId,publisherKeyFingerprintSha256:publisher.fingerprintSha256,releaseTag:manifest.releaseTag,assetName:manifest.assetName,
  sha256:digest,sizeBytes:manifest.sizeBytes,downloadEnabled:false,
  note:"Offline byte/signature integrity only; not game compatibility, malware screening, authorization or software signing certification"};
}
