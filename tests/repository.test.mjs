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
