#!/usr/bin/env node
// Fail early if source and release versions disagree.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(fileURLToPath(new URL("..", import.meta.url)));
function json(path){return JSON.parse(readFileSync(resolve(root,path),"utf8"))}
const release=json("release/version.json");
const desktop=json("apps/desktop/src-tauri/tauri.conf.json");
const desktopPkg=json("apps/desktop/package.json");
const rootPkg=json("package.json");
const notes=readFileSync(resolve(root,"release/notes.md"),"utf8");
assert.match(release.version,/^v\d+\.\d+\.\d+-alpha\.\d+$/,"Alpha tag format");
assert.equal(release.channel,"alpha","Release manifest channel");
assert.equal(release.desktopExecutable,true,"Windows installer is expected");
assert.equal(typeof release.installerSigned,"boolean","Explicit signing status required");
const semver=release.version.slice(1).split("-")[0];
assert.equal(desktop.version,semver,"Tauri desktop version must match release");
assert.equal(desktopPkg.version,semver,"Desktop package version must match release");
assert.equal(rootPkg.version,semver,"Root package version must match release");
assert.ok(notes.includes(release.version),"Release notes must identify the release version");
if(release.installerSigned){
  throw new Error("Signing is not configured for this release pipeline; never label an unsigned build as signed.");
}
process.stdout.write("Release metadata OK: "+release.version+" (unsigned Windows alpha)\n");
