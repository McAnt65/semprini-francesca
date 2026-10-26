// Checks the /studenti/nuovo photo menu and the local vintage preview in Chrome.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = mkdtempSync(join(tmpdir(), "semprini-photo-menu-"));
const child = spawn(chrome, ["--headless=new", "--no-first-run", "--no-sandbox", "--disable-gpu-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-extensions", "--disable-background-networking", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "http://localhost:3000/studenti/nuovo"], { windowsHide: true });
let socket;
let nextId = 1;
const pending = new Map();
try {
  const portFile = join(profile, "DevToolsActivePort");
  for (let attempt = 0; attempt < 150 && !existsSync(portFile); attempt++) await delay(100);
  if (!existsSync(portFile)) throw new Error("Chrome non avviato");
  const port = readFileSync(portFile, "utf8").split(/\r?\n/)[0];
  let target;
  for (let attempt = 0; attempt < 100; attempt++) {
    target = (await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())).find((item) => item.type === "page" && item.url.includes("/studenti/nuovo"));
    if (target) break;
    await delay(100);
  }
  if (!target) throw new Error("Pagina non aperta");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + " " + result.exceptionDetails.exception?.description);
    return result.result.value;
  };
  const until = async (expression, label) => {
    for (let attempt = 0; attempt < 150; attempt++) {
      const value = await evaluate(expression);
      if (value) return value;
      await delay(100);
    }
    throw new Error(`Tempo scaduto: ${label}`);
  };
  await until("Boolean(document.querySelector('input[type=file]'))", "pagina pronta");
  await evaluate(`(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 320;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 240, 320); gradient.addColorStop(0, '#8b9bac'); gradient.addColorStop(1, '#dfc9b4');
    context.fillStyle = gradient; context.fillRect(0, 0, 240, 320);
    context.fillStyle = '#382a26'; context.beginPath(); context.ellipse(120, 138, 71, 101, 0, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#e8b596'; context.beginPath(); context.ellipse(120, 159, 55, 78, 0, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#4b302a'; context.fillRect(87, 135, 17, 5); context.fillRect(137, 135, 17, 5);
    context.fillStyle = '#a35358'; context.fillRect(106, 200, 30, 4);
    window.__originalPhoto = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const input = document.querySelector('input[type=file]'); const transfer = new DataTransfer();
    transfer.items.add(new File([window.__originalPhoto], 'prova.png', {type:'image/png'})); input.files = transfer.files;
    input.dispatchEvent(new Event('change', {bubbles:true}));
  })()`);
  await until("Boolean(document.querySelector('button[aria-label=\"Apri il menu fotografico\"] img'))", "foto caricata");
  const getPhoto = () => "document.querySelector('button[aria-label=\"Apri il menu fotografico\"] img')";
  const photoPoint = await evaluate(`(() => { const r=${getPhoto()}.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: photoPoint.x, y: photoPoint.y });
  await until("document.querySelector('[role=group][aria-label=\"Menu fotografico\"]') && getComputedStyle(document.querySelector('[role=group][aria-label=\"Menu fotografico\"]')).visibility === 'visible'", "menu aperto");
  const initialCommands = await evaluate("[...document.querySelectorAll('#menu-fotografico button')].map(button => button.textContent.trim())");
  if (!initialCommands.includes("VINTAGE") || initialCommands.includes("RITRATTO") || initialCommands.includes("DISEGNO")) throw new Error(`Comandi iniziali inattesi: ${initialCommands.join(", ")}`);
  await evaluate("[...document.querySelectorAll('#menu-fotografico button')].find(button => button.textContent.trim() === 'VINTAGE').click()");
  const preview = await until(`(() => { const img=${getPhoto()}; return img?.src.startsWith('blob:') && img.complete && img.naturalWidth ? img.src : ''; })()`, "anteprima vintage");
  await until("document.body.textContent.includes('Anteprima vintage pronta.')", "elaborazione vintage completata");
  const difference = await evaluate(`(async () => {
    const original = await createImageBitmap(window.__originalPhoto);
    const vintage = await createImageBitmap(await fetch(${JSON.stringify(preview)}).then(response => response.blob()));
    const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 160;
    const context = canvas.getContext('2d'); context.drawImage(original, 0, 0, 120, 160); const a = context.getImageData(0,0,120,160).data;
    context.clearRect(0,0,120,160); context.drawImage(vintage, 0, 0, 120, 160); const b = context.getImageData(0,0,120,160).data;
    let sum=0; for(let i=0;i<a.length;i+=4) sum+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
    original.close(); vintage.close(); return sum/(120*160*3);
  })()`);
  if (difference < 2) throw new Error(`Anteprima vintage uguale all'originale: ${difference.toFixed(2)}`);
  const previewCommands = await evaluate("[...document.querySelectorAll('#menu-fotografico button')].map(button => button.textContent.trim())");
  if (!previewCommands.includes("ORIGINALE") || !previewCommands.includes("VINTAGE ANTEPRIMA") || !previewCommands.includes("CONFERMA") || !previewCommands.includes("RIPRISTINA ORIGINALE") || previewCommands.includes("RIPROVA") || previewCommands.includes("DISEGNO")) throw new Error(`Comandi anteprima inattesi: ${previewCommands.join(", ")}`);
  await evaluate("[...document.querySelectorAll('#menu-fotografico button')].find(button => button.textContent.trim() === 'ORIGINALE').click()");
  await until(`${getPhoto()}.src.startsWith('data:image/png')`, "visualizzazione originale");
  await evaluate("[...document.querySelectorAll('#menu-fotografico button')].find(button => button.textContent.trim() === 'VINTAGE ANTEPRIMA').click()");
  await until(`${getPhoto()}.src === ${JSON.stringify(preview)}`, "ripristino anteprima vintage");
  await evaluate("[...document.querySelectorAll('#menu-fotografico button')].find(button => button.textContent.trim() === 'CONFERMA').click()");
  await until("document.body.textContent.includes('Filtro vintage pronto: completa i dati')", "conferma vintage");
  await evaluate("[...document.querySelectorAll('#menu-fotografico button')].find(button => button.textContent.trim() === 'RIPRISTINA ORIGINALE').click()");
  await until(`${getPhoto()}.src.startsWith('data:image/png')`, "ripristino originale");
  for (const [width, height] of [[1280, 900], [390, 844]]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 500 });
    await delay(150);
    const layout = await evaluate(`(() => { const root=document.querySelector('main > div').getBoundingClientRect(); const photo=${getPhoto()}.getBoundingClientRect(); const menu=document.querySelector('#menu-fotografico'); const panel=menu.getBoundingClientRect(); const buttons=[...menu.querySelectorAll('button')].filter(button=>getComputedStyle(button).display!=='none'); return {root:{x:root.x,y:root.y,width:root.width,height:root.height},photo:{x:photo.x,right:photo.right,bottom:photo.bottom},panel:{x:panel.x,y:panel.y,right:panel.right,bottom:panel.bottom},chapterTop:document.querySelector('#nuovo-allievo').getBoundingClientRect().top,columns:getComputedStyle(menu).flexDirection,overlap:buttons.some((button,index)=>index>0 && button.getBoundingClientRect().top<buttons[index-1].getBoundingClientRect().bottom)}; })()`);
    if (layout.columns !== "column" || layout.overlap || layout.panel.right > width || layout.panel.x < 0) throw new Error(`Menu ${width}px: ${JSON.stringify(layout)}`);
    if (width < 500 ? layout.panel.y < layout.photo.bottom : layout.panel.x < layout.photo.right) throw new Error(`Posizione menu ${width}px: ${JSON.stringify(layout)}`);
    if (layout.panel.y < layout.root.y + layout.root.height * .31 || layout.panel.bottom + 4 > layout.chapterTop) throw new Error(`Sovrapposizione navigazione/capitolo ${width}px: ${JSON.stringify(layout)}`);
    console.log(`PASS Menu ${width}×${height}: ${JSON.stringify(layout)}`);
  }
  console.log(`PASS Anteprima, confronto originale/Vintage, conferma e ripristino; differenza media RGB ${difference.toFixed(2)}`);
} finally {
  socket?.close();
  child.kill();
}
