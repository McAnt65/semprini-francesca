import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.OGGI_BROWSER_URL;
const chrome = process.env.CHROME_PATH || (process.platform === "win32"
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" : "google-chrome");

test("OGGI remains visible on a clean mobile viewport and after navigation", {
  skip: !baseUrl || !existsSync(chrome) || typeof WebSocket !== "function",
}, async () => {
  const profile = await mkdtemp(join(tmpdir(), "semprini-oggi-browser-"));
  const browser = spawn(chrome, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-gpu-sandbox",
    "--use-gl=swiftshader", "--no-first-run", "--disable-extensions",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
  ], { windowsHide: true, stdio: "ignore" });
  let socket;
  try {
    let port;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]);
        break;
      } catch {
        if (browser.exitCode !== null) throw new Error("Chrome exited before DevTools started");
        await delay(100);
      }
    }
    assert.ok(port, "Chrome DevTools did not start");
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = pages.find((item) => item.type === "page");
    assert.ok(page, "Chrome has no test tab");
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });

    let nextId = 0;
    const pending = new Map();
    const errors = [];
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
      if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
        errors.push(message.params.args.map((arg) => arg.value || arg.description || "error").join(" "));
      }
      if (message.method === "Network.responseReceived" && message.params.response.status >= 400) {
        errors.push(`${message.params.response.status} ${message.params.response.url}`);
      }
      if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      }
    };
    function send(method, params = {}) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    }
    async function evaluate(expression) {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    }
    async function waitFor(expression) {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        try { if (await evaluate(expression)) return; } catch { /* Navigation replaces the execution context. */ }
        await delay(200);
      }
      const state = await evaluate(`JSON.stringify({url:location.href,program:document.querySelector('#daily-program')?.textContent?.slice(0,120),ready:document.readyState})`);
      throw new Error(`Timed out waiting for ${expression}; state=${state}; errors=${JSON.stringify(errors)}`);
    }
    async function navigate(path) {
      await send("Page.navigate", { url: new URL(path, baseUrl).href });
      await waitFor(`location.pathname === ${JSON.stringify(path)} && document.readyState === "complete"`);
    }
    async function assertTodayVisible(width) {
      await waitFor("document.querySelector('#daily-program') && !document.querySelector('#daily-program').textContent.includes('Caricamento della giornata...')");
      const state = await evaluate(`(() => {
        const page = document.querySelector('main');
        const sheet = page.firstElementChild;
        const program = document.querySelector('#daily-program');
        const image = page.querySelector('img');
        return {
          viewport: innerWidth,
          pageHeight: page.getBoundingClientRect().height,
          sheetHeight: sheet.getBoundingClientRect().height,
          programHeight: program.getBoundingClientRect().height,
          pageDisplay: getComputedStyle(page).display,
          imageLoaded: image.complete && image.naturalWidth > 0,
          menuVisible: !!document.querySelector('nav[aria-label="Giornata e menu"] a[href="/menu"]'),
        };
      })()`);
      assert.equal(state.viewport, width);
      assert.equal(state.pageDisplay, "flex");
      assert.ok(state.pageHeight > 300, JSON.stringify(state));
      assert.ok(state.sheetHeight > 300, JSON.stringify(state));
      assert.ok(state.programHeight > 0, JSON.stringify(state));
      assert.ok(state.imageLoaded, JSON.stringify(state));
      assert.ok(state.menuVisible, JSON.stringify(state));
    }
    async function assertTodayStyle(day) {
      const state = await evaluate(`(() => {
        const nav = document.querySelector('nav[aria-label="Giornata e menu"]');
        const today = [...nav.querySelectorAll('button')].find(node => node.textContent === 'OGGI');
        const tomorrow = [...nav.querySelectorAll('button')].find(node => node.textContent === 'DOMANI');
        const menu = nav.querySelector('a[href="/menu"]');
        const heading = document.querySelector('#program-title');
        const date = heading.nextElementSibling;
        const agenda = document.querySelector('a[href^="/calendario/giorno"]');
        const newLesson = document.querySelector('a[href^="/calendario/nuova"]');
        const color = node => getComputedStyle(node).color;
        return { day: heading.textContent, todayColor: color(today), tomorrowColor: color(tomorrow),
          menuColor: color(menu), menuRatio: parseFloat(getComputedStyle(menu).fontSize) / parseFloat(getComputedStyle(today).fontSize),
          navHeights: [today, tomorrow, menu].map(node => node.getBoundingClientRect().height),
          headingColor: color(heading), headingVisible: heading.getBoundingClientRect().width > 0,
          dateColor: color(date), agendaColor: color(agenda), newLessonColor: color(newLesson),
          agendaUnderline: getComputedStyle(agenda).textDecorationLine,
          newLessonUnderline: getComputedStyle(newLesson).textDecorationLine,
          actionHeights: [agenda, newLesson].map(node => node.getBoundingClientRect().height),
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth };
      })()`);
      assert.ok(state.day.includes(day), JSON.stringify(state));
      assert.equal(state.todayColor, "rgb(141, 36, 66)");
      assert.equal(state.tomorrowColor, "rgb(141, 36, 66)");
      assert.equal(state.menuColor, "rgb(116, 29, 50)");
      assert.ok(state.menuRatio >= .86 && state.menuRatio <= .9, JSON.stringify(state));
      assert.ok(state.navHeights.every(height => height >= 44), JSON.stringify(state));
      assert.equal(state.headingColor, "rgb(133, 33, 62)");
      assert.equal(state.headingVisible, true);
      assert.equal(state.dateColor, "rgb(112, 81, 62)");
      assert.equal(state.agendaColor, "rgb(141, 36, 66)");
      assert.equal(state.newLessonColor, "rgb(141, 36, 66)");
      assert.equal(state.agendaUnderline, "underline");
      assert.equal(state.newLessonUnderline, "underline");
      assert.ok(state.actionHeights.every(height => height >= 44), JSON.stringify(state));
      assert.equal(state.horizontalOverflow, false);
    }
    async function screenshot(name) {
      if (!process.env.OGGI_SCREENSHOT_DIR) return;
      const shot = await send("Page.captureScreenshot", { format: "png" });
      await writeFile(join(process.env.OGGI_SCREENSHOT_DIR, `${name}.png`), Buffer.from(shot.data, "base64"));
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    for (const width of [360, 390, 1280]) {
      await send("Emulation.setDeviceMetricsOverride", {
        width, height: width === 1280 ? 900 : 800, deviceScaleFactor: 1, mobile: width < 500,
      });
      await navigate("/oggi");
      await assertTodayVisible(width);
      await assertTodayStyle("oggi");
      await screenshot(`oggi-vuoto-${width}`);
      await evaluate(`Array.from(document.querySelectorAll('nav button')).find(button => button.textContent === 'DOMANI').click()`);
      await waitFor("document.querySelector('#program-title')?.textContent.includes('domani')");
      await assertTodayStyle("domani");
      await screenshot(`domani-vuoto-${width}`);
    }
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 800, deviceScaleFactor: 1, mobile: true });
    await evaluate(`Array.from(document.querySelectorAll('nav button')).find((button) => button.textContent === 'OGGI').click()`);
    await waitFor("document.querySelector('#program-title')?.textContent.includes('oggi')");
    await evaluate(`(() => {
      const day = new URL(document.querySelector('a[href^="/calendario/giorno"]').href).searchParams.get('data');
      const next = new Date(day + 'T12:00:00'); next.setDate(next.getDate() + 1);
      const tomorrow = [next.getFullYear(), String(next.getMonth() + 1).padStart(2, '0'), String(next.getDate()).padStart(2, '0')].join('-');
      const now = new Date().toISOString();
      const lesson = (id, date) => ({ id, date, startTime:'15:00', source:'manuale', studentId:'test',
        studentNameSnapshot:'Studente prova', subject:'Matematica', durationMinutes:60, mode:'online',
        status:'confermata', topic:'Algebra', notes:'', hourlyRateCents:2000, lessonAmountCents:2000,
        paymentStatus:'non_pagata', createdAt:now, updatedAt:now });
      localStorage.setItem('semprini:calendar:appointments:v1', JSON.stringify([lesson('today', day), lesson('tomorrow', tomorrow)]));
    })()`);
    await navigate("/oggi");
    await waitFor("!!document.querySelector('#daily-program article')");
    await assertTodayStyle("oggi");
    await screenshot("oggi-con-lezione-390");
    await evaluate(`Array.from(document.querySelectorAll('nav button')).find(button => button.textContent === 'DOMANI').click()`);
    await waitFor("document.querySelector('#program-title')?.textContent.includes('domani') && !!document.querySelector('#daily-program article')");
    await assertTodayStyle("domani");
    await screenshot("domani-con-lezione-390");
    await evaluate(`localStorage.setItem('semprini:students', '{broken');
      localStorage.setItem('semprini:calendar:appointments:v1', '{broken');
      localStorage.setItem('semprini:calendar:series:v1', '{broken')`);
    await navigate("/oggi");
    await assertTodayVisible(390);
    await navigate("/");
    assert.equal(await evaluate(`document.querySelector('a[aria-label="Entra nel registro"]')?.getAttribute('href')`), "/benvenuto");
    await evaluate(`document.querySelector('a[aria-label="Entra nel registro"]').click()`);
    await waitFor("location.pathname === '/benvenuto' && !!document.querySelector('nav a[href=\"/oggi\"]')");
    await evaluate(`document.querySelector('nav a[href="/oggi"]').click()`);
    await waitFor("location.pathname === '/oggi'");
    await assertTodayVisible(390);
    await navigate("/menu");
    await evaluate(`document.querySelector('a[aria-label="Oggi"]').click()`);
    await waitFor("location.pathname === '/oggi'");
    await assertTodayVisible(390);
    assert.deepEqual(errors, []);
  } finally {
    socket?.close();
    browser.kill();
    if (browser.exitCode === null && browser.signalCode === null) {
      await new Promise((resolve) => browser.once("exit", resolve));
    }
    const tempRoot = tmpdir();
    assert.ok(profile.startsWith(tempRoot + sep), "Chrome profile must stay in the temp directory");
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
