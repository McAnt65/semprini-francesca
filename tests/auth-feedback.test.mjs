import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { authenticationFailure } = require("../app/accesso/auth-feedback.ts");
test("invite feedback identifies HTTP status without exposing server messages or tokens", () => {
  const message = authenticationFailure({ status: 422, message: "secret-token-and-email" }, true);
  assert.match(message, /422/); assert.doesNotMatch(message, /secret-token-and-email/);
});
test("used invite and network failures have separate actionable feedback", () => {
  assert.match(authenticationFailure({ status: 401 }, true), /già utilizzato/);
  assert.match(authenticationFailure(new TypeError("Failed to fetch"), true), /connessione/);
  assert.match(authenticationFailure({ status: 400 }, false), /credenziali/);
});
