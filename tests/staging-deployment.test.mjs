import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
const root=process.cwd();
const load=p=>readFileSync(join(root,p),"utf8");

test("private staging Compose binds only to localhost with persistent data and no extra capabilities",()=>{
 const compose=load("deployment/staging/compose.yaml");
 assert.match(compose,/127\.0\.0\.1:8787:8787/);
 assert.doesNotMatch(compose,/^\s+-\s*["']?(0\.0\.0\.0:)?8787:8787["']?$/m);
 assert.match(compose,/read_only: true/);
 assert.match(compose,/no-new-privileges:true/);
 assert.match(compose,/cap_drop:/);
 assert.match(compose,/\b- ALL/);
 assert.match(compose,/volumes:/);
 assert.match(compose,/api_data:\s*\/var\/lib\/dmahub/);
 assert.match(compose,/healthcheck:/);
});
test("staging scripts never set up public TLS or open firewall ports",()=>{
 const start=load("deployment/staging/deploy.sh");
 const verify=load("deployment/staging/verify.sh");
 const backup=load("deployment/staging/backup.sh");
 assert.match(start,/docker compose/);
 assert.match(start,/config --quiet/);
 assert.match(verify,/http:\/\/127\.0\.0\.1:8787\/healthz/);
 assert.match(backup,/maintenance\.mjs backup/);
 assert.match(backup,/maintenance\.mjs verify/);
 for(const s of [start,verify,backup]){
  assert.doesNotMatch(s,/ufw allow|iptables -A|docker run.*-p 0\.0\.0\.0|ngrok http/);
 }
});
test("staging environment and database backups are explicitly git-ignored",()=>{
 const ignore=load(".gitignore");
 assert.match(ignore,/deployment\/staging\/staging\.env/);
 assert.match(ignore,/deployment\/staging\/backups\//);
 const sample=load("deployment/staging/staging.env.example");
 assert.match(sample,/WEB_ORIGIN=http:\/\/localhost:5173/);
 assert.match(sample,/REQUIRE_EMAIL_VERIFICATION=0/);
 assert.doesNotMatch(sample,/\bsk_live_[A-Za-z0-9]/);
});
