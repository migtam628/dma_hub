import {createHash,createPublicKey} from "node:crypto";

const HEX64=/^[a-f0-9]{64}$/;
const ID=/^[a-z][a-z0-9-]{2,63}$/;
const PUBLIC_BEGIN="-----BEGIN PUBLIC KEY-----";
const PUBLIC_END="-----END PUBLIC KEY-----";
const expectedKeys=(value,keys)=>value&&typeof value==="object"&&!Array.isArray(value)&&
 Object.keys(value).sort().join(",")===keys.slice().sort().join(",");

/**
 * Parse an Ed25519 SPKI public key. Reject private keys even when Node could
 * derive a public key from them; never persist or echo secret input.
 * Fingerprints cover canonical DER SPKI bytes, not PEM whitespace.
 */
export function inspectPublisherPublicKey(pem){
 if(typeof pem!=="string"||pem.length>2048||
    !pem.trim().startsWith(PUBLIC_BEGIN)||!pem.trim().endsWith(PUBLIC_END)||
    pem.includes("PRIVATE KEY"))throw Error("Expected an Ed25519 PUBLIC KEY (SPKI PEM), not private material");
 let key;
 try{key=createPublicKey(pem)}catch{throw Error("Invalid publisher SPKI public key")}
 if(key.type!=="public"||key.asymmetricKeyType!=="ed25519")throw Error("Only Ed25519 SPKI public keys are accepted");
 const der=key.export({format:"der",type:"spki"});
 return {fingerprintSha256:createHash("sha256").update(der).digest("hex"),key};
}

/**
 * The trust registry must be reviewed separately from release assets.
 * A supplied fingerprint is checked against the actual key, so a swapped PEM
 * without a matching fingerprint is rejected. Matching both is necessary but
 * not sufficient for identity verification; human out-of-band checks remain.
 */
export function validatePublisherTrustRegistry(store){
 if(!expectedKeys(store,["schemaVersion","publishers"])||store.schemaVersion!==2||
    !Array.isArray(store.publishers)||store.publishers.length>50)
  throw Error("Invalid trusted publisher registry v2");
 const byId=new Map(),fingerprints=new Set();
 for(const entry of store.publishers){
  if(!expectedKeys(entry,["id","status","publicKeyPem","fingerprintSha256"])||
     typeof entry.id!=="string"||!ID.test(entry.id)||byId.has(entry.id))
   throw Error("Duplicate or invalid trusted publisher");
  if(entry.status!=="trusted"&&entry.status!=="revoked")throw Error("Invalid publisher trust status");
  if(typeof entry.fingerprintSha256!=="string"||!HEX64.test(entry.fingerprintSha256))
   throw Error("Missing SHA-256 SPKI fingerprint");
  const {fingerprintSha256,key}=inspectPublisherPublicKey(entry.publicKeyPem);
  if(fingerprintSha256!==entry.fingerprintSha256)throw Error("Trusted publisher fingerprint does not match key");
  if(fingerprints.has(fingerprintSha256))throw Error("Duplicate publisher public key fingerprint");
  fingerprints.add(fingerprintSha256);
  byId.set(entry.id,{id:entry.id,status:entry.status,fingerprintSha256,key});
 }
 return byId;
}
