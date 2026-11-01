import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,createHash,sign} from "node:crypto";
import {mkdtemp,rm,writeFile,readFile,symlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {verifyGameArtifact} from "../scripts/game-artifact-verification.mjs";
import {inspectPublisherPublicKey,validatePublisherTrustRegistry} from "../scripts/publisher-trust.mjs";

const sha=data=>createHash("sha256").update(data).digest("hex");
async function withFixture(fn){
 const folder=await mkdtemp(join(tmpdir(),"dma-artifact-"));
 const {privateKey,publicKey}=generateKeyPairSync("ed25519");
 const other=generateKeyPairSync("ed25519");
 const artifactPath=join(folder,"software-review.zip");
 const manifestPath=join(folder,"software-review.json");
 const signaturePath=join(folder,"software-review.sig");
 const trustStorePath=join(folder,"trusted-publishers.json");
 const bytes=Buffer.from("Offline QA artifact fixture only; no game software.");
 const manifest={schemaVersion:1,repository:"migtam628/dma_hub",publisherId:"dma-publisher",
  releaseTag:"v0.2.0-alpha.23",assetName:"software-review.zip",sizeBytes:bytes.length,sha256:sha(bytes)};
 const trust=(key=publicKey,status="trusted")=>({
  schemaVersion:2,publishers:[{id:"dma-publisher",status,
   publicKeyPem:key.export({format:"pem",type:"spki"}).toString(),
   fingerprintSha256:sha(key.export({format:"der",type:"spki"}))}]
 });
 const setManifest=async(value,key=privateKey)=>{
  const content=Buffer.from(JSON.stringify(value,null,2)+"\n");
  await writeFile(manifestPath,content);
  await writeFile(signaturePath,sign(null,content,key).toString("base64")+"\n");
 };
 try{
  await writeFile(artifactPath,bytes);
  await writeFile(trustStorePath,JSON.stringify(trust(),null,2));
  await setManifest(manifest);
  await fn({artifactPath,manifestPath,signaturePath,trustStorePath,bytes,manifest,trust,setManifest,other});
 }finally{await rm(folder,{recursive:true,force:true})}
}
const verify=p=>verifyGameArtifact(p);

test("signed local artifact passes independent byte hash with pinned publisher key",async()=>withFixture(async f=>{
 const result=await verify(f);
 assert.equal(result.verified,true);
 assert.equal(result.checks.actualFileSha256,true);
 assert.equal(result.checks.pinnedPublisherEd25519,true);
 assert.equal(result.sha256,sha(f.bytes));
 assert.equal(result.downloadEnabled,false);
 assert.equal(result.assetName,"software-review.zip");
 assert.equal(result.publisherKeyFingerprintSha256,f.trust().publishers[0].fingerprintSha256);
}));
test("modified binary bytes fail even with a correct signed manifest and trusted publisher",async()=>withFixture(async f=>{
 await writeFile(f.artifactPath,Buffer.from(f.bytes.toString().replace("only","0nly")));
 await assert.rejects(verify(f),/actual artifact bytes fail/i);
}));
test("mutated signed manifest is rejected before scanning artifact",async()=>withFixture(async f=>{
 const m=JSON.parse(await readFile(f.manifestPath,"utf8"));
 m.releaseTag="v0.2.0-alpha.99";
 await writeFile(f.manifestPath,JSON.stringify(m,null,2)+"\n");
 await assert.rejects(verify(f),/publisher signature failed/i);
}));
test("signature from another key fails even when manifest fields remain the same",async()=>withFixture(async f=>{
 await f.setManifest(f.manifest,f.other.privateKey);
 await assert.rejects(verify(f),/publisher signature failed/i);
}));
test("no trusted key and revoked keys fail closed",async()=>withFixture(async f=>{
 await writeFile(f.trustStorePath,JSON.stringify({schemaVersion:2,publishers:[]}));
 await assert.rejects(verify(f),/not independently trusted/i);
 await writeFile(f.trustStorePath,JSON.stringify(f.trust(undefined,"revoked")));
 await assert.rejects(verify(f),/not independently trusted/i);
}));
test("trusted key must be Ed25519, not a random key embedded in the manifest",async()=>withFixture(async f=>{
 const other=generateKeyPairSync("rsa",{modulusLength:2048});
 await writeFile(f.trustStorePath,JSON.stringify(f.trust(other.publicKey)));
 await assert.rejects(verify(f),/Only Ed25519 SPKI public keys/i);
}));
test("file name, declared size, schema, repository and extra fields are enforced",async()=>withFixture(async f=>{
 await f.setManifest({...f.manifest,assetName:"another.zip"});
 await assert.rejects(verify(f),/filename differs/i);
 await f.setManifest({...f.manifest,sizeBytes:f.bytes.length+1});
 await assert.rejects(verify(f),/byte count differs/i);
 await f.setManifest({...f.manifest,repository:"attacker/repo"});
 await assert.rejects(verify(f),/Unsupported manifest schema\/repository/i);
 await f.setManifest({...f.manifest,downloadApproved:true});
 await assert.rejects(verify(f),/Unexpected manifest fields/i);
}));
test("checked-in publisher registry starts empty; test-only keys never become production keys",async()=>{
 const registry=JSON.parse(await readFile(new URL("../release/trusted-game-publishers.json",import.meta.url),"utf8"));
 assert.equal(registry.schemaVersion,2);
 assert.deepEqual(registry.publishers,[]);
});

test("fingerprints bind real DER bytes and detect silent public-key replacement",async()=>withFixture(async f=>{
 const good=f.trust();
 const oldFingerprint=good.publishers[0].fingerprintSha256;
 assert.equal(inspectPublisherPublicKey(good.publishers[0].publicKeyPem).fingerprintSha256,oldFingerprint);
 good.publishers[0].publicKeyPem=f.other.publicKey.export({format:"pem",type:"spki"}).toString();
 await writeFile(f.trustStorePath,JSON.stringify(good));
 await assert.rejects(verify(f),/fingerprint does not match key/i);
}));
test("duplicate key fingerprints and unknown registry schema are rejected",async()=>withFixture(async f=>{
 const first=f.trust();
 const second={...first.publishers[0],id:"other-publisher"};
 first.publishers.push(second);
 await writeFile(f.trustStorePath,JSON.stringify(first));
 await assert.rejects(verify(f),/Duplicate publisher public key fingerprint/i);
 const legacy={...f.trust(),schemaVersion:1};
 await writeFile(f.trustStorePath,JSON.stringify(legacy));
 await assert.rejects(verify(f),/registry v2/i);
}));
test("private keys are never accepted as trust anchors or inspected as public keys",async()=>withFixture(async f=>{
 const secret=generateKeyPairSync("ed25519").privateKey.export({format:"pem",type:"pkcs8"}).toString();
 assert.throws(()=>inspectPublisherPublicKey(secret),/not private material/i);
 const swapped=f.trust();
 swapped.publishers[0].publicKeyPem=secret;
 await writeFile(f.trustStorePath,JSON.stringify(swapped));
 await assert.rejects(verify(f),/not private material/i);
}));
test("symlinked artifacts and manifest files fail before verification",async()=>withFixture(async f=>{
 const linked=join(f.artifactPath+"-link");
 await symlink(f.artifactPath,linked);
 await assert.rejects(verify({...f,artifactPath:linked}),/filename differs|regular file/i);
 const manifestLink=f.manifestPath+"-link";
 await symlink(f.manifestPath,manifestLink);
 await assert.rejects(verify({...f,manifestPath:manifestLink}),/regular file/i);
}));
test("trust validator rejects unexpected fields and non-public keys",async()=>withFixture(async f=>{
 assert.equal(validatePublisherTrustRegistry(f.trust()).get("dma-publisher").status,"trusted");
 const extra=f.trust();extra.publishers[0].approvedBy="self";
 assert.throws(()=>validatePublisherTrustRegistry(extra),/invalid trusted publisher/i);
}));
