import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.ASSISTANCE_BROWSER_URL;
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("assistance tours preserve TEST archives and independent progress", {
  skip: !baseUrl || !existsSync(chrome) || typeof WebSocket !== "function",
}, async () => {
  const profile = await mkdtemp(join(tmpdir(), "semprini-assistenza-test-"));
  const browser = spawn(chrome, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--disable-extensions",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
  ], { windowsHide: true, stdio: "ignore" });
  let socket;
  try {
    let port;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); break; }
      catch { if (browser.exitCode !== null) throw new Error("Chrome closed before DevTools started"); await delay(100); }
    }
    assert.ok(port, "Chrome DevTools port");
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(pages.find((item) => item.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });

    let id = 0;
    const pending = new Map();
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id || !pending.has(message.id)) return;
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const commandId = ++id;
      pending.set(commandId, { resolve, reject });
      socket.send(JSON.stringify({ id: commandId, method, params }));
    });
    async function evaluate(expression) {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    async function until(expression) {
      for (let attempt = 0; attempt < 100; attempt++) {
        try { if (await evaluate(expression)) return; } catch { /* Navigation replaces the JS context. */ }
        await delay(150);
      }
      throw new Error(`Timed out: ${expression}`);
    }
    async function navigate(path) {
      await send("Page.navigate", { url: new URL(path, baseUrl).href });
      await until(`location.pathname === ${JSON.stringify(path)} && !!document.querySelector('main')`);
    }
    async function clickButton(label, scope = "body") {
      const expression = `(() => {
        const root = document.querySelector(${JSON.stringify(scope)});
        const button = [...root.querySelectorAll('button')].find((item) => item.textContent.trim() === ${JSON.stringify(label)});
        if (!button) return false;
        button.click(); return true;
      })()`;
      assert.equal(await evaluate(expression), true, `button ${label} in ${scope}`);
    }
    async function launch(title, label) {
      await navigate("/impostazioni/guida");
      await until(`!![...document.querySelectorAll('article')].find(x =>
        x.querySelector('h3')?.textContent === ${JSON.stringify(title)} &&
        [...x.querySelectorAll('button')].some(button => button.textContent.trim() === ${JSON.stringify(label)}))`);
      await delay(250);
      const expression = `(() => {
        const article = [...document.querySelectorAll('article')].find(x => x.querySelector('h3')?.textContent === ${JSON.stringify(title)});
        const button = [...article.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(label)});
        if (!button) return false;
        button.click(); return true;
      })()`;
      assert.equal(await evaluate(expression), true, `${title}: ${label}`);
    }
    const panel = (title, number) => `aside[aria-label="${title}, passo ${number}"]`;
    async function at(title, number, path) {
      try { await until(`location.pathname === ${JSON.stringify(path)} && (() => {
        const node=document.querySelector(${JSON.stringify(panel(title, number))});
        if (!node) return false;
        const r=node.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1;
      })()`); } catch (error) {
        const state = await evaluate(`(() => { const node=document.querySelector(${JSON.stringify(panel(title, number))});
          const r=node?.getBoundingClientRect(); return {path:location.pathname,scrollY,innerHeight,
            scrollHeight:document.documentElement.scrollHeight,rect:r && {top:r.top,bottom:r.bottom},
            bodyClass:document.body.className}; })()`);
        throw new Error(`${error.message}; state=${JSON.stringify(state)}`);
      }
    }
    async function archives() {
      return evaluate(`(() => {
        const collect = (storage) => Object.fromEntries(Array.from({length:storage.length}, (_, index) => storage.key(index))
          .filter((key) => !key.startsWith('semprini:assistenza:')).sort().map((key) => [key, storage.getItem(key)]));
        return {local:collect(localStorage), session:collect(sessionStorage)};
      })()`);
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await navigate("/impostazioni/guida");
    await evaluate(`(() => {
      localStorage.setItem('semprini:students', JSON.stringify([{id:'test-browser',firstName:'Prova',lastName:'Isolata',status:'active',subjects:['Matematica']}]));
      localStorage.setItem('semprini:student-narrative:v1:test-browser', JSON.stringify({version:1,studentId:'test-browser',interests:'test legacy'}));
      localStorage.setItem('semprini:tariffs:v1', JSON.stringify([{id:'t-test',code:'T1',subject:'Matematica',schoolBand:'Liceo',mode:'studio',hourlyRateCents:2500}]));
      localStorage.setItem('semprini:calendar:appointments:v1', JSON.stringify([{id:'l-test',studentId:'test-browser',studentNameSnapshot:'Prova Isolata',subject:'Matematica',mode:'casa',status:'confermata',paymentStatus:'non_pagata',date:'2026-11-02',startTime:'15:00',source:'manuale'}]));
      localStorage.setItem('semprini:preferences:v1', JSON.stringify({lessonLocation:{street:'Via TEST',streetNumber:'1',city:'Rimini',province:'RN',country:'Italia'}}));
      sessionStorage.setItem('test:existing-draft', 'preserve me');
    })()`);
    await navigate("/impostazioni/guida");
    await until(`document.querySelector('#setup-title') && document.body.textContent.includes('5 di 5 passaggi completati')`);
    const before = await archives();

    await launch("Primi passi", "Inizia");
    const paths = ["/menu", "/impostazioni", "/studenti", "/lezioni", "/calendario/mese", "/lezioni/storico", "/pagamenti/tariffario"];
    for (let step = 0; step < paths.length; step++) {
      await at("Primi passi", step + 1, paths[step]);
      await clickButton(step === paths.length - 1 ? "Termina" : "Passo successivo", panel("Primi passi", step + 1));
    }
    await until(`!document.querySelector('aside[aria-label^="Primi passi, passo"]')`);
    assert.deepEqual(await archives(), before, "the complete tour must preserve every existing non-assistance key and value");

    await launch("Primi passi", "Ricomincia");
    await at("Primi passi", 1, "/menu");
    await clickButton("Passo successivo", panel("Primi passi", 1));
    await at("Primi passi", 2, "/impostazioni");
    await clickButton("Interrompi", panel("Primi passi", 2));
    await launch("Primi passi", "Riprendi");
    await at("Primi passi", 2, "/impostazioni");
    await launch("Primi passi", "Ricomincia");
    await at("Primi passi", 1, "/menu");

    await launch("Tour Studenti", "Inizia");
    await at("Tour Studenti", 1, "/studenti");
    await clickButton("Passo successivo", panel("Tour Studenti", 1));
    await at("Tour Studenti", 2, "/studenti");
    await launch("Tour Materie", "Inizia");
    await at("Tour Materie", 1, "/materie");
    await clickButton("Passo successivo", panel("Tour Materie", 1));
    await at("Tour Materie", 2, "/materie/argomenti");
    await clickButton("Interrompi", panel("Tour Materie", 2));
    await launch("Tour Studenti", "Riprendi");
    await at("Tour Studenti", 2, "/studenti");
    await launch("Tour Materie", "Riprendi");
    await at("Tour Materie", 2, "/materie/argomenti");
    await clickButton("Interrompi", panel("Tour Materie", 2));
    await until(`!!document.querySelector('button[aria-controls="context-help"]')`);
    await clickButton("Aiuto");
    await until(`!!document.querySelector('#context-help')`);
    await evaluate(`document.querySelector('a[href="/materie"]').click()`);
    await until(`location.pathname === '/materie' && !document.querySelector('#context-help')`);
    assert.deepEqual(await archives(), before, "thematic tours must also preserve archives");

    for (const [width, height] of [[390, 844], [430, 764], [360, 800]]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
      await navigate("/impostazioni/guida");
      await until(`!!document.querySelector('#manual-search')`);
      const guide = await evaluate(`(() => {
        const search = document.querySelector('#manual-search');
        const r = search.getBoundingClientRect();
        return { scrollWidth:document.documentElement.scrollWidth, width:innerWidth,
          top:r.top, bottom:r.bottom, font:parseFloat(getComputedStyle(search).fontSize),
          order:['manual-title','tour-title','setup-title'].map(id => document.getElementById(id).getBoundingClientRect().top) };
      })()`);
      assert.equal(guide.scrollWidth, width, JSON.stringify(guide));
      assert.ok(guide.top >= 0 && guide.bottom <= height && guide.font >= 16, JSON.stringify(guide));
      assert.ok(guide.order[0] < guide.order[1] && guide.order[1] < guide.order[2]);
      await evaluate(`document.querySelector('#manual-search').focus()`);
      await send("Input.insertText", { text: "ricorrenza" });
      await until(`document.querySelector('#manual-topics article')?.querySelector('h3')?.textContent === 'Nuova lezione'`);
      await send("Emulation.setDeviceMetricsOverride", { width, height: 480, deviceScaleFactor: 1, mobile: true });
      await evaluate(`document.querySelector('#manual-search').scrollIntoView({block:'center'})`);
      await delay(100);
      const keyboard = await evaluate(`(() => { const r=document.querySelector('#manual-search').getBoundingClientRect();
        return {focused:document.activeElement.id === 'manual-search',bottom:r.bottom,scrollWidth:document.documentElement.scrollWidth}; })()`);
      assert.ok(keyboard.focused && keyboard.bottom <= 480 && keyboard.scrollWidth === width, JSON.stringify(keyboard));
      if (process.env.ASSISTANCE_SCREENSHOT_DIR) {
        const shot = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(join(process.env.ASSISTANCE_SCREENSHOT_DIR, `guide-search-${width}.png`), Buffer.from(shot.data, "base64"));
      }
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
      await launch("Primi passi", "Ricomincia");
      await at("Primi passi", 1, "/menu");
      const tour = await evaluate(`(() => {
        const node=document.querySelector(${JSON.stringify(panel("Primi passi", 1))});
        const r=node.getBoundingClientRect();
        const buttons=[...node.querySelectorAll('button')].map(button => {
          const b=button.getBoundingClientRect(), x=b.left+b.width/2, y=b.top+b.height/2;
          return {label:button.textContent.trim(),within:y >= r.top && y <= r.bottom && x >= r.left && x <= r.right,
            visible:y >= 0 && y <= innerHeight, hit:button.contains(document.elementFromPoint(x,y))};
        });
        return {scrollWidth:document.documentElement.scrollWidth,top:r.top,bottom:r.bottom,
          mainBottom:document.querySelector('main').getBoundingClientRect().bottom,buttons};
      })()`);
      assert.ok(tour.scrollWidth === width && tour.top >= tour.mainBottom && tour.bottom <= height, JSON.stringify(tour));
      assert.ok(tour.buttons.every((button) => button.within && button.visible && button.hit), JSON.stringify(tour));
      if (process.env.ASSISTANCE_SCREENSHOT_DIR) {
        const shot = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(join(process.env.ASSISTANCE_SCREENSHOT_DIR, `tour-${width}.png`), Buffer.from(shot.data, "base64"));
      }
      await clickButton("Interrompi", panel("Primi passi", 1));

      await navigate("/calendario/nuova");
      await until(`!!document.querySelector('button[aria-controls="context-help"]')`);
      const tab = await evaluate(`(() => {
        const r=document.querySelector('button[aria-controls="context-help"]').getBoundingClientRect();
        const intersects=(a,b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const overlap=[...document.querySelectorAll('main input, main button, main a, main select, main textarea')]
          .some(node => intersects(r,node.getBoundingClientRect()));
        return {top:r.top,bottom:r.bottom,width:r.width,height:r.height,overlap,
          scrollWidth:document.documentElement.scrollWidth};
      })()`);
      assert.ok(tab.top >= 0 && tab.bottom <= height && tab.width >= 44 && tab.height >= 44 && !tab.overlap && tab.scrollWidth === width, JSON.stringify(tab));
      await clickButton("Aiuto");
      await until(`document.querySelector('#context-help h2')?.textContent === 'Nuova lezione'`);
      const help = await evaluate(`(() => { const node=document.querySelector('#context-help'), r=node.getBoundingClientRect();
        return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,
          href:node.querySelector('a')?.getAttribute('href'),scrollWidth:document.documentElement.scrollWidth}; })()`);
      assert.ok(help.top >= 0 && help.bottom <= height && help.left >= 0 && help.right <= width && help.scrollWidth === width, JSON.stringify(help));
      assert.equal(help.href, "/impostazioni/guida#nuova-lezione");
      if (process.env.ASSISTANCE_SCREENSHOT_DIR) {
        const shot = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(join(process.env.ASSISTANCE_SCREENSHOT_DIR, `help-${width}.png`), Buffer.from(shot.data, "base64"));
      }
    }
  } finally {
    socket?.close();
    browser.kill();
    if (browser.exitCode === null && browser.signalCode === null) await new Promise((resolve) => browser.once("exit", resolve));
    assert.ok(profile.startsWith(tmpdir() + sep));
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
