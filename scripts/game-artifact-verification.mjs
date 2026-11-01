import {createHash,createPublicKey,verify as verifySignature} from "node:crypto";
import {createReadStream} from "node:fs";
import {readFile,lstat} from "node:fs/promises";
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
async function boundedFile(path,max){
 const file=await lstat(path);
 ensure(file.isFile()&&!file.isSymbolicLink()&&file.size>0&&file.size<=max,"File is not a permitted regular file");
 return readFile(path);
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
 ensure(store&&store.schemaVersion===1&&Array.isArray(store.publishers)&&store.publishers.length<=50,
  "Invalid trusted publisher registry");
 const seen=new Set();
 for(const entry of store.publishers){
  ensure(entry&&typeof entry.id==="string"&&ID.test(entry.id)&&!seen.has(entry.id),
   "Duplicate or invalid trusted publisher");
  seen.add(entry.id);
  ensure(entry.status==="trusted"||entry.status==="revoked","Invalid publisher trust status");
  ensure(typeof entry.publicKeyPem==="string"&&entry.publicKeyPem.length<4096,"Missing trusted public key");
 }
 const publisher=store.publishers.find(item=>item.id===publisherId);
 ensure(publisher&&publisher.status==="trusted","Publisher key is not independently trusted");
 const publicKey=createPublicKey(publisher.publicKeyPem);
 ensure(publicKey.asymmetricKeyType==="ed25519"&&publicKey.type==="public","Only pinned Ed25519 public keys are accepted");
 return publicKey;
}
export async function verifyGameArtifact({artifactPath,manifestPath,signaturePath,trustStorePath}){
 ensure([artifactPath,manifestPath,signaturePath,trustStorePath].every(x=>typeof x==="string"&&x.length>0),
  "Artifact, manifest, signature and pinned trust registry are required");
 const [manifestBytes,signatureBytes,trustBytes]=await Promise.all([
  boundedFile(manifestPath,MAX_MANIFEST),boundedFile(signaturePath,MAX_SIGNATURE),boundedFile(trustStorePath,MAX_TRUST)
 ]);
 const manifest=validatedManifest(JSON.parse(manifestBytes.toString("utf8")));
 const store=JSON.parse(trustBytes.toString("utf8"));
 const key=getPublisher(store,manifest.publisherId);
 const sigText=signatureBytes.toString("ascii").trim();
 ensure(/^[A-Za-z0-9+/]{86}==$/.test(sigText),"Detached signature must be canonical base64 Ed25519");
 const signature=Buffer.from(sigText,"base64");
 ensure(signature.length===64&&verifySignature(null,manifestBytes,key,signature),
  "Detached publisher signature failed");
 const info=await lstat(artifactPath);
 ensure(info.isFile()&&!info.isSymbolicLink(),"Artifact must be a regular file, not a symlink");
 ensure(basename(artifactPath)===manifest.assetName,"Artifact filename differs from signed manifest");
 ensure(info.size===manifest.sizeBytes,"Artifact byte count differs from signed manifest");
 const sha=createHash("sha256");
 for await(const chunk of createReadStream(artifactPath,{highWaterMark:1024*1024}))sha.update(chunk);
 const digest=sha.digest("hex");
 ensure(digest===manifest.sha256,"Actual artifact bytes fail signed SHA-256 comparison");
 return {verified:true,checks:{pinnedPublisherEd25519:true,actualFileSha256:true,exactAssetName:true,exactByteCount:true},
  publisherId:manifest.publisherId,releaseTag:manifest.releaseTag,assetName:manifest.assetName,
  sha256:digest,sizeBytes:manifest.sizeBytes,downloadEnabled:false,
  note:"Offline byte/signature integrity only; not game compatibility, malware screening, authorization or software signing certification"};
}
