import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Module = require("node:module");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);

test("simultaneous mounts share one refresh, read user afterwards, and can retry a failed refresh", async () => {
  const events = [];
  let finish;
  let fail = false;
  let wait = true;
  const identity = {
    refreshSession: async () => {
      events.push("refresh");
      if (fail) throw Error("TEST offline");
      if (wait) await new Promise(resolve => { finish = resolve; });
    },
    getUser: async () => { events.push("user"); return { id: "TEST-owner" }; },
  };
  const original = Module._load;
  let resumeSession;
  try {
    Module._load = function(name, ...rest) { return name === "@netlify/identity" ? identity : original.call(this, name, ...rest); };
    ({ resumeSession } = require("../app/accesso/resume-session.ts"));
  } finally { Module._load = original; }
  const first = resumeSession();
  const second = resumeSession();
  assert.equal(first, second);
  assert.deepEqual(events, ["refresh"]);
  finish();
  assert.deepEqual(await first, { id: "TEST-owner" });
  assert.deepEqual(events, ["refresh", "user"]);
  fail = true; wait = false;
  await assert.rejects(resumeSession(), /TEST offline/);
  assert.deepEqual(events, ["refresh", "user", "refresh"]);
  fail = false;
  assert.deepEqual(await resumeSession(), { id: "TEST-owner" });
  assert.deepEqual(events, ["refresh", "user", "refresh", "refresh", "user"]);
});
