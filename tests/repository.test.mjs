import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
const root=process.cwd();
test("monorepo paths exist",()=>{
  for(const p of ["apps/web/src/App.tsx","apps/web/src/data.ts","apps/web/src/main.tsx","packages/ui/src/index.tsx","apps/web/src/styles.css"]){
    assert.ok(existsSync(join(root,p)),p);
  }
});
test("design colors follow approved Concept 3",()=>{
  const source=readFileSync(join(root,"packages/ui/src/index.tsx"),"utf8");
  assert.ok(source.includes("#25c2d7"));
  assert.ok(source.includes("#07121e"));
});
test("prototype explicitly identifies non-production data",()=>{
 const source=readFileSync(join(root,"apps/web/src/App.tsx"),"utf8");
 assert.ok(source.includes("Demo workspace"));
 assert.ok(source.includes("not connected"));
});

test("public Windows downloads use official GitHub Releases",()=>{
  const releases=readFileSync(join(root,"apps/web/src/Releases.tsx"),"utf8");
  const app=readFileSync(join(root,"apps/web/src/App.tsx"),"utf8");
  assert.ok(releases.includes("api.github.com/repos/"));
  assert.ok(releases.includes("Unsigned alpha software"));
  assert.ok(app.includes('if(path==="/releases")return <ReleasesPage/>'));
});
test("Pages auto-deploy is enabled for every main push",()=>{
  const workflow=readFileSync(join(root,".github/workflows/pages.yml"),"utf8");
  assert.ok(workflow.includes("branches: [main]"));
  assert.ok(!workflow.split("workflow_dispatch:")[0].includes("paths:"));
  assert.ok(workflow.includes("apps/web/dist"));
});

test("native device discovery is explicit and read-only",()=>{
  const bridge=readFileSync(join(root,"apps/desktop/src-tauri/src/lib.rs"),"utf8");
  const ui=readFileSync(join(root,"apps/web/src/NativeDeviceCenter.tsx"),"utf8");
  assert.ok(bridge.includes("available_ports()"));
  assert.ok(bridge.includes("#[tauri::command]"));
  assert.ok(!bridge.includes("serialport::new("));
  assert.ok(ui.includes('invoke<SerialDevice[]>("list_serial_ports")'));
  assert.ok(ui.includes('if(!native)return'));
  assert.ok(ui.includes('stage==="idle"'));
});

test("release integrity gates are present",()=>{
  assert.ok(existsSync(join(root,"scripts/verify-windows-installer.ps1")));
  assert.doesNotThrow(()=>execFileSync(process.execPath,[join(root,"scripts/check-release-metadata.mjs")],{cwd:root,stdio:"pipe"}));
  const workflow=readFileSync(join(root,".github/workflows/release.yml"),"utf8");
  assert.ok(workflow.includes("Confirm downloaded GitHub asset hashes match local installer"));
  assert.ok(workflow.includes("verify-windows-installer.ps1"));
});

test("installer filename validation accepts the Tauri artifact naming convention",()=>{
 const script=readFileSync(join(root,"scripts/verify-windows-installer.ps1"),"utf8");
 assert.ok(script.includes("DMA[ .]Hub_"),"Must accept Tauri's space-separated product name");
 assert.ok(script.includes("Get-AuthenticodeSignature"),"Signature status must be examined");
});
