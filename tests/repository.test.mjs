import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {join} from "node:path";
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
