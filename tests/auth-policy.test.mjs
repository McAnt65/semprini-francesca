import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { protectRequest, isPublicPath } = require("../netlify/auth-policy.ts");
const request = (path, method = "GET") => new Request("https://prototype.example" + path, { method });
const next = async () => new Response("PRIVATE CONTENT");

test("installation assets remain public without calling Identity", async () => {
  for (const path of ["/", "/accesso", "/manifest.webmanifest", "/Homepage.png", "/icona-app-192.png", "/icona-app-512.png", "/icona-app-maskable-512.png", "/_next/static/chunk.js", "/.netlify/identity/token"]) {
    const result = await protectRequest(request(path), undefined, () => { throw new Error("must not verify"); }, next);
    assert.equal(result.status, 200, path);
  }
});
test("every operational section and direct nested address denies anonymous access", async () => {
  const roots = readdirSync(new URL("../app/", import.meta.url), { withFileTypes: true }).filter(e => e.isDirectory() && !["assets", "components", "data", "api", "accesso"].includes(e.name)).map(e => e.name);
  for (const root of roots) for (const suffix of ["", "/123", "/123/modifica", "/private.png", "/private.js"]) {
    const path = "/" + root + suffix;
    assert.equal(isPublicPath(path), false, path);
    let reached = false;
    const result = await protectRequest(request(path), "owner", async () => null, async () => { reached = true; return next(); });
    assert.equal(result.status, 303, path);
    assert.equal(result.headers.get("location"), "/accesso");
    assert.equal(reached, false);
  }
});
test("missing configuration and Identity errors fail closed", async () => {
  assert.equal((await protectRequest(request("/oggi"), "", async () => ({ id: "owner" }), next)).status, 503);
  assert.equal((await protectRequest(request("/oggi"), "owner", async () => { throw Error("offline"); }, next)).status, 303);
});
test("authenticated but different user is denied", async () => {
  const result = await protectRequest(request("/studenti"), "owner", async () => ({ id: "other" }), next);
  assert.equal(result.status, 403);
});
test("only verified owner reaches content; protected responses must not be cached", async () => {
  const result = await protectRequest(request("/oggi"), "owner", async () => ({ id: "owner" }), next);
  assert.equal(result.status, 200);
  assert.equal(await result.text(), "PRIVATE CONTENT");
  assert.match(result.headers.get("cache-control"), /no-store/);
  assert.equal(result.headers.get("netlify-cdn-cache-control"), "no-store");
});
test("API and mutations return 401, not HTML redirects", async () => {
  for (const [path, method] of [["/api/auth/session", "GET"], ["/studenti", "POST"]]) {
    assert.equal((await protectRequest(request(path, method), "owner", async () => null, next)).status, 401);
  }
});
test("server session endpoint never trusts a browser assertion", async () => {
  const result = await protectRequest(request("/api/auth/session"), "owner", async () => ({ id: "owner" }), () => { throw Error("must not render Next fallback"); });
  assert.deepEqual(await result.json(), { authorized: true });
});
