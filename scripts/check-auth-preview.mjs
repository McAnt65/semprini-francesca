// Read-only verification against the SEPARATE preview, never the official site.
import assert from "node:assert/strict";
const input = process.env.AUTH_PREVIEW_URL;
if (!input) throw new Error("Imposta AUTH_PREVIEW_URL sull'anteprima separata.");
const base = new URL(input);
const forbidden = new Set(["il-registro-di-francesca.netlify.app", "francesca-pwa-test-android.netlify.app"]);
assert.equal(base.protocol, "https:", "Il collaudo online richiede HTTPS");
assert.ok(!forbidden.has(base.hostname), "Non eseguire sul Registro o sulla harness diagnostica");
assert.ok(!base.username && !base.password && !base.search && !base.hash && base.pathname === "/", "Usa solo l'origine dell'anteprima, senza credenziali o parametri");
const get = (path, headers = {}) => fetch(new URL(path, base), {
  redirect: "manual", cache: "no-store", headers, signal: AbortSignal.timeout(15000),
});
const root = await get("/");
assert.equal(root.status, 200, "Copertina non pubblicamente accessibile");
const manifest = await get("/manifest.webmanifest");
assert.equal(manifest.status, 200);
const data = await manifest.json();
assert.equal(data.display, "standalone");
for (const icon of data.icons) {
  const url = new URL(icon.src, base);
  assert.equal(url.origin, base.origin);
  const response = await get(url.pathname);
  assert.equal(response.status, 200, url.pathname);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], "Risorsa icona diversa da PNG: possibile pagina login Netlify");
}
let checks = 0;
for (const path of ["/benvenuto", "/oggi", "/menu", "/studenti", "/studenti/test-fittizio", "/studenti/test-fittizio.png", "/calendario", "/calendario/nuova", "/lezioni", "/pagamenti", "/impostazioni/salvataggio"]) {
  for (const headers of [{}, { Cookie: "nf_jwt=token-inventato" }, { RSC: "1", "Next-Router-Prefetch": "1" }]) {
    const response = await get(path, headers);
    assert.equal(response.status, 303, `${path}: accesso anonimo non bloccato come previsto`);
    assert.equal(new URL(response.headers.get("location"), base).pathname, "/accesso");
    assert.match(response.headers.get("cache-control") || "", /no-store/);
    checks++;
  }
}
assert.equal((await get("/api/auth/session")).status, 401);
console.log(`PASS: copertina, manifest, icone e ${checks + 1} richieste anonime negate. Login e logout reali restano da verificare con un account invitato.`);
