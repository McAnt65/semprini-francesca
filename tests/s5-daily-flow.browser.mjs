// Run with `npm.cmd run dev -- -p 3015` in a separate terminal.
// Uses a fresh Chrome profile and only isolated [TEST] records.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const base = 'http://localhost:3015';
const profile = mkdtempSync(join(tmpdir(), 'semprini-s5-chrome-'));
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const child = spawn(chrome, ['--headless=new', '--no-first-run', '--no-sandbox', '--disable-extensions',
  '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, base + '/menu'],
  { windowsHide: true });
let socket;
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const key = ++id;
  pending.set(key, { resolve, reject });
  socket.send(JSON.stringify({ id: key, method, params }));
});
const evaluate = async (expression) => {
  const reply = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (reply.exceptionDetails) throw Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text);
  return reply.result.value;
};
const until = async (expression, label) => {
  for (let n = 0; n < 240; n++) {
    let value;
    try { value = await evaluate(`Boolean(${expression})`); } catch { await delay(125); continue; }
    if (value) return value;
    await delay(125);
  }
  throw Error('Timeout: ' + label + ' at ' + await evaluate('location.href + " | " + document.body.innerText.slice(0,700)'));
};
const go = async (path, marker) => {
  await evaluate(`location.href=${JSON.stringify(base + path)}`);
  await until(`location.pathname===${JSON.stringify(path.split('?')[0])} && document.body?.innerText.toLocaleLowerCase().includes(${JSON.stringify(marker.toLocaleLowerCase())})`, path);
  await delay(300);
};
const clickText = async (selector, label) => {
  const found = await evaluate(`(() => { const item=[...document.querySelectorAll(${JSON.stringify(selector)})].find(el=>el.textContent.trim().includes(${JSON.stringify(label)})); if(item) item.click(); return !!item; })()`);
  assert.ok(found, `Missing ${selector}: ${label}`);
};
const setField = async (selector, value) => {
  const found = await evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el)return false; const setter=Object.getOwnPropertyDescriptor(el.tagName==='SELECT'?HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set; setter.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
  assert.ok(found, `Missing field ${selector}`);
  await delay(100);
};
const setByIndex = async (tag, index, value) => {
  const selector = `form ${tag}`;
  const found = await evaluate(`(() => {const el=document.querySelectorAll(${JSON.stringify(selector)})[${index}]; if(!el)return false;
    const setter=Object.getOwnPropertyDescriptor(el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set;
    setter.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true})); return true;})()`);
  assert.ok(found, `Missing ${selector}[${index}]`);
  await delay(120);
};
const data = async (key) => JSON.parse(await evaluate(`localStorage.getItem(${JSON.stringify(key)})`));
const shot = async (name, width, height) => {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
  if (name.startsWith('summary')) {
    await go('/oggi','[TEST] Ada Flusso');
    await evaluate(`[...document.querySelectorAll('button[aria-label^="Concludi lezione"]')].find(x=>x.ariaLabel.includes('15:00')).click()`);
    await until("document.querySelector('#summary-title')",'summary at viewport');
    await evaluate(`(() => {const main=document.querySelector('main'),sheet=main.firstElementChild;
      main.style.height=${JSON.stringify(height+'px')}; sheet.style.width=${JSON.stringify(width<500?'100%':'506px')};
      sheet.style.height=${JSON.stringify(height+'px')}; sheet.querySelector('img').style.objectFit='cover';})()`);
  }
  await delay(200);
  const layout = await evaluate(`(() => ({width:innerWidth, viewport:document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth, sheet:document.querySelector('main > div')?.getBoundingClientRect().toJSON(),
    focused:document.activeElement?.textContent?.slice(0,40),
    back:document.querySelector('button')?.textContent?.includes('TORNA A OGGI') ? null :
      (()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('TORNA A OGGI'))?.getBoundingClientRect();
      const s=document.querySelector('#daily-program')?.getBoundingClientRect();return b&&s?{top:b.top,bottom:b.bottom,scrollTop:s.top,scrollBottom:s.bottom}:null})()}))()`);
  assert.ok(layout.scrollWidth <= width + 1, `${name}: horizontal overflow ${JSON.stringify(layout)}`);
  if(name.startsWith('summary')) assert.ok(layout.back?.top>=layout.back?.scrollTop &&
    layout.back?.bottom<=layout.back?.scrollBottom,`${name}: back hidden ${JSON.stringify(layout)}`);
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const path = join(profile, name + '.png');
  writeFileSync(path, Buffer.from(screenshot.data, 'base64'));
  if(name.startsWith('summary') && width<500) {
    const scrolled = await evaluate(`(() => {const pane=document.querySelector('#daily-program');
      pane.scrollTop=pane.scrollHeight; const detail=[...pane.querySelectorAll('a')].find(x=>x.textContent.includes('APRI DETTAGLIO'));
      const p=pane.getBoundingClientRect(),d=detail?.getBoundingClientRect();
      const result={scrollTop:pane.scrollTop,detailVisible:!!d&&d.top>=p.top&&d.bottom<=p.bottom};
      pane.scrollTop=0;return result;})()`);
    assert.ok(scrolled.scrollTop>0 && scrolled.detailVisible,`${name} scroll: ${JSON.stringify(scrolled)}`);
  }
  console.log('VISUAL', name, path, JSON.stringify(layout));
};
try {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let n = 0; n < 150 && !existsSync(portFile); n++) await delay(100);
  assert.ok(existsSync(portFile), 'Chrome did not start');
  const port = readFileSync(portFile, 'utf8').split(/\r?\n/)[0];
  let target;
  for (let n = 0; n < 100; n++) {
    target = (await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json())).find(x => x.type === 'page');
    if (target) break;
    await delay(100);
  }
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, {once:true}); socket.addEventListener('error', reject, {once:true}); });
  socket.addEventListener('message', e => {
    const message = JSON.parse(e.data);
    if (!pending.has(message.id)) return;
    const task = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) task.reject(Error(message.error.message));
    else task.resolve(message.result);
  });
  await until('document.body?.innerText.includes("Nuova lezione")', 'initial page');
  const today = await evaluate('new Date().toLocaleDateString("sv-SE")');
  const nextWeek = await evaluate('(() => { const d=new Date(); d.setDate(d.getDate()+14); return d.toLocaleDateString("sv-SE") })()');
  const student = { id:'test-s5-1', status:'active', enrollmentDate:today, firstName:'[TEST] Ada', lastName:'Flusso',
    birthDate:'', school:'', gradeClass:'', phone:'', whatsapp:'', email:'', address:'', city:'',
    primaryParent:'', primaryParentPhone:'', primaryParentWhatsapp:'', primaryParentEmail:'', subjects:['Fisica'],
    textbooks:{}, lessonMode:'online', lessonDurationMinutes:90, lessonRateCents:2600, tariffId:'test-s5-tariff' };
  const tariff = { id:'test-s5-tariff', code:'T1', subject:'Fisica', schoolBand:'Secondaria', mode:'online',
    format:'singola', hourlyRateCents:2400, active:false, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
  await evaluate(`localStorage.setItem('semprini:students',${JSON.stringify(JSON.stringify([student]))}); localStorage.setItem('semprini:tariffs:v1',${JSON.stringify(JSON.stringify([tariff]))})`);
  const beforeStudent = await evaluate("localStorage.getItem('semprini:students')");
  // A: normal lesson, preferred inactive tariff, completion, dated settlement.
  await go('/calendario/nuova?origine=oggi', 'Studente');
  await until("location.search.includes('bozza=')",'new lesson draft ready');
  await delay(400);
  await setField('form select[required]', student.id);
  await until("document.querySelectorAll('form select')[1]?.value==='Fisica'", 'student preferences');
  await clickText('button','DATA E ORA');
  await until("location.pathname==='/calendario/settimana' && document.body.innerText.includes('TORNA ALLA LEZIONE')",'week selection');
  await evaluate(`document.querySelector('a[aria-current=date]').click()`);
  await until("location.pathname==='/calendario/giorno' && document.querySelector('button[aria-label*=\"fascia libera\"]')",'day selection');
  await evaluate(`[...document.querySelectorAll('button[aria-label*=\"fascia libera\"]')].find(x=>x.textContent.trim()==='15:00').click()`);
  await until("location.pathname==='/calendario/nuova' && document.querySelector('form')",'return with selection');
  assert.ok(await evaluate("document.querySelector('.calendarChoice output')?.textContent.includes('15:00') || document.body.innerText.includes('15:00')"));
  const proposal = await evaluate(`(() => {const f=document.querySelector('form'); return {student:f.querySelectorAll('select')[0].value,
    subject:f.querySelectorAll('select')[1].value, duration:f.querySelectorAll('select')[2].value,
    mode:f.querySelectorAll('select')[3].value, tariff:f.querySelectorAll('select')[4].value,
    rate:f.querySelector('input[inputmode=decimal]').value, amount:document.querySelector('output[aria-live=polite]')?.textContent};})()`);
  assert.deepEqual({subject:proposal.subject,duration:proposal.duration,mode:proposal.mode,tariff:proposal.tariff,rate:proposal.rate},
    {subject:'Fisica',duration:'90',mode:'online',tariff:'test-s5-tariff',rate:'24.00'});
  assert.match(proposal.amount, /36,00/);
  console.log('A proposal', JSON.stringify(proposal));
  await shot('new-360',360,800); await shot('new-390',390,844); await shot('new-desktop',1280,900);
  await clickText('button', 'SALVA');
  await until("location.pathname==='/oggi' && document.body.innerText.includes('[TEST] Ada Flusso')", 'A saved');
  const afterA = await data('semprini:calendar:appointments:v1');
  const a = afterA.find(x=>x.startTime==='15:00');
  assert.equal(a.lessonAmountCents,3600); assert.equal(a.tariffId,tariff.id);
  await clickText('button[aria-label^="Concludi lezione"]','');
  await until("document.querySelector('#summary-title')", 'summary open');
  await shot('summary-360',360,800); await shot('summary-390',390,844); await shot('summary-desktop',1280,900);
  assert.equal(await evaluate("document.activeElement?.id"),'summary-title');
  await evaluate("document.querySelector('details summary').focus()");
  await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
  await send('Input.dispatchKeyEvent',{type:'char',text:'\r',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
  assert.equal(await evaluate("document.querySelector('details').open"),true);
  await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
  await send('Input.dispatchKeyEvent',{type:'char',text:'\r',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
  assert.equal(await evaluate("document.querySelector('details').open"),false);
  await evaluate("document.querySelector('button[aria-controls=teaching-fields]').focus()");
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  assert.equal(await evaluate("document.querySelector('button[aria-controls=teaching-fields]').getAttribute('aria-expanded')"),'true');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  assert.equal(await evaluate("document.querySelector('button[aria-controls=teaching-fields]').getAttribute('aria-expanded')"),'false');
  console.log('KEYBOARD summary focus, details Enter, teaching Space: PASS');
  await clickText('button','SEGNA SVOLTA');
  await until("document.querySelector('.positiveStatus') || document.body.innerText.includes('Lezione segnata come SVOLTA')",'A completed');
  await clickText('button','SEGNA SALDATA');
  await until("document.querySelector('#today-payment-date')",'A payment confirmation');
  assert.equal(await evaluate("document.querySelector('#today-payment-date').value"),today);
  await clickText('button','CONFERMA PAGAMENTO');
  await until("document.body.innerText.includes('Pagamento registrato per questa lezione')",'A payment saved');
  await clickText('button','TORNA A OGGI');
  console.log('A saved/completed/paid',JSON.stringify((await data('semprini:calendar:appointments:v1')).find(x=>x.id===a.id)));
  // B: manual exception, covered topic and notes, partial then residual.
  await go(`/calendario/nuova?data=${today}&ora=17%3A00&origine=oggi`,'Studente');
  await setField('form select[required]',student.id);
  await until("document.querySelectorAll('form select')[3]?.value==='online'",'B preference');
  await setByIndex('select',2,'60');
  await setField('form input[inputmode=decimal]','30');
  await setByIndex('select',3,'casa');
  const manual = await evaluate(`(() => ({ duration:document.querySelectorAll('form select')[2].value,
    mode:document.querySelectorAll('form select')[3].value, tariff:document.querySelectorAll('form select')[4].value,
    rate:document.querySelector('form input[inputmode=decimal]').value,
    amount:document.querySelector('output[aria-live=polite]').textContent }))()`);
  assert.deepEqual({duration:manual.duration,mode:manual.mode,tariff:manual.tariff,rate:manual.rate},
    {duration:'60',mode:'casa',tariff:'',rate:'30'});
  assert.match(manual.amount,/30,00/);
  await clickText('summary','ARGOMENTO E ALTRE OPZIONI');
  await setField('form input:not([inputmode]):not([type=date]):not([type=checkbox])','Moto rettilineo');
  await clickText('button','SALVA');
  await until("location.pathname==='/oggi' && document.body.innerText.includes('17:00')",'B saved');
  const b = (await data('semprini:calendar:appointments:v1')).find(x=>x.startTime==='17:00');
  assert.equal(b.durationMinutes,60); assert.equal(b.mode,'casa'); assert.equal(b.hourlyRateCents,3000);
  assert.equal(b.lessonAmountCents,3000); assert.equal(b.topic,'Moto rettilineo');
  await evaluate(`[...document.querySelectorAll('button[aria-label^="Concludi lezione"]')].find(x=>x.ariaLabel.includes('17:00')).click()`);
  await until("document.querySelector('#summary-title')",'B summary');
  await clickText('button','ARGOMENTO E APPUNTI');
  await until("document.querySelector('#covered-topic')",'B teaching open');
  await setField('#covered-topic','Velocità e accelerazione');
  await setField('#teaching-notes','Esercizi svolti con sicurezza');
  await clickText('button','SALVA ARGOMENTO E APPUNTI');
  await until("document.body.innerText.includes('Argomento e appunti salvati')",'B teaching saved');
  await clickText('button','SEGNA SVOLTA');
  await until("document.body.innerText.includes('Lezione segnata come SVOLTA')",'B completed');
  await go('/pagamenti/riepilogo','Versamento parziale');
  const partialRow = await evaluate(`(() => {const rows=[...document.querySelectorAll('article')]; const row=rows.find(x=>x.textContent.includes('17:00')&&x.textContent.includes('[TEST] Ada Flusso')); return row?.outerHTML.slice(0,2000)})()`);
  assert.ok(partialRow,'B payment row missing');
  const partialSet = await evaluate(`(() => {const row=[...document.querySelectorAll('article')].find(x=>x.textContent.includes('17:00')&&x.textContent.includes('[TEST] Ada Flusso'));
    const input=row?.querySelector('input[inputmode=decimal]'); if(!input)return false;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'10'); input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true})); return true;})()`);
  assert.ok(partialSet);
  await delay(100);
  await evaluate(`[...document.querySelectorAll('article')].find(x=>x.textContent.includes('17:00')&&x.textContent.includes('[TEST] Ada Flusso'))
    .querySelectorAll('button')[1].click()`);
  await until("document.querySelector('[role=dialog]')",'partial confirmation');
  await clickText('[role=dialog] button','Conferma');
  await until("document.body.innerText.includes('Pagamento registrato e verificato')",'partial saved');
  await go('/oggi','17:00');
  await evaluate(`[...document.querySelectorAll('button[aria-label^="Concludi lezione"]')].find(x=>x.ariaLabel.includes('17:00')).click()`);
  await until("document.body.innerText.includes('SALDA RESIDUO')",'B residual');
  await clickText('button','SALDA RESIDUO');
  await until("document.querySelector('#today-payment-date')",'B residual confirmation');
  await clickText('button','CONFERMA PAGAMENTO');
  await until("document.body.innerText.includes('Pagamento registrato per questa lezione')",'B settled');
  const paidB = (await data('semprini:calendar:appointments:v1')).find(x=>x.id===b.id);
  assert.equal(paidB.paidAmountCents,3000); assert.equal(paidB.paymentMovements.length,2);
  assert.equal(paidB.coveredTopic,'Velocità e accelerazione');
  assert.equal(paidB.notes,'Esercizi svolti con sicurezza');
  console.log('B manual/partial/residual',JSON.stringify(manual), JSON.stringify(paidB));
  // One recurring occurrence is completed and paid, while the later weeks remain untouched.
  await go(`/calendario/nuova?data=${today}&ora=19%3A00&origine=oggi`,'Studente');
  await setField('form select[required]',student.id);
  await until("document.querySelectorAll('form select')[4]?.value==='test-s5-tariff'",'series preferences');
  await clickText('summary','ARGOMENTO E ALTRE OPZIONI');
  await evaluate(`(() => {const el=document.querySelector('form input[type=checkbox]'); el.click()})()`);
  await until("document.querySelector('form input[type=date]')",'series end date');
  await setField('form input[type=date]',nextWeek);
  await clickText('button','SALVA');
  await until("location.pathname==='/oggi' && document.body.innerText.includes('19:00')",'series saved');
  const series = await data('semprini:calendar:series:v1');
  assert.equal(series.length,1);
  await evaluate(`[...document.querySelectorAll('button[aria-label^="Concludi lezione"]')].find(x=>x.ariaLabel.includes('19:00')).click()`);
  await until("document.querySelector('#summary-title')",'series summary');
  await clickText('button','SEGNA SVOLTA');
  await until("document.body.innerText.includes('Lezione segnata come SVOLTA')",'series completed');
  await clickText('button','SEGNA SALDATA');
  await until("document.querySelector('#today-payment-date')",'series payment confirmation');
  await clickText('button','CONFERMA PAGAMENTO');
  await until("document.body.innerText.includes('Pagamento registrato per questa lezione')",'series paid');
  const exceptions = (await data('semprini:calendar:appointments:v1')).filter(x=>x.seriesId===series[0].id);
  assert.equal(exceptions.length,1); assert.equal(exceptions[0].originalOccurrenceDate,today);
  assert.equal(exceptions[0].status,'svolta'); assert.equal(exceptions[0].paymentStatus,'pagata');
  assert.equal(series[0].status,'confermata'); assert.equal(series[0].paymentStatus,'non_pagata');
  assert.equal(await evaluate("localStorage.getItem('semprini:students')"),beforeStudent);
  console.log('Series one exception',JSON.stringify({series:series[0].id,exception:exceptions[0].id,original:exceptions[0].originalOccurrenceDate}));
  // Read actual downstream pages using the same isolated TEST profile.
  for (const [path,marker,expected] of [
    ['/calendario/giorno?data='+today,'CALENDARIO','[TEST] Ada Flusso'],
    ['/lezioni/storico','Storico','[TEST] Ada Flusso'],
    ['/lezioni/diario','Diario','Velocità e accelerazione'],
    ['/studenti/diario','Diario','[TEST] Ada Flusso'],
    ['/materie/argomenti','Argomenti','Velocità e accelerazione'],
    ['/pagamenti/riepilogo','Riepilogo','[TEST] Ada Flusso'],
    ['/pagamenti/statistiche','Statistiche',''],
    ['/pagamenti/previsioni','Previsioni',''],
  ]) {
    await go(path,marker);
    if(path==='/studenti/diario') {
      await setField('#diary-student',student.id);
      await until("document.body.innerText.includes('Velocità e accelerazione')",'student diary lessons');
    }
    if(path==='/materie/argomenti') {
      await clickText('button','FISICA');
      await until("document.body.innerText.includes('Velocità e accelerazione')",'subject covered topic');
    }
    if(expected) assert.ok(await evaluate(`document.body.innerText.includes(${JSON.stringify(expected)})`),`Downstream ${path}: ${expected}`);
    console.log('DOWNSTREAM',path,JSON.stringify((await evaluate('document.body.innerText')).slice(0,400)));
  }
  await evaluate(`(() => {const tariffs=JSON.parse(localStorage.getItem('semprini:tariffs:v1')); tariffs[0].hourlyRateCents=5000;
    tariffs[0].updatedAt=new Date().toISOString(); localStorage.setItem('semprini:tariffs:v1',JSON.stringify(tariffs))})()`);
  await go('/oggi','[TEST] Ada Flusso');
  const afterTariffEdit = await data('semprini:calendar:appointments:v1');
  assert.equal(afterTariffEdit.find(x=>x.id===a.id).lessonAmountCents,3600);
  assert.equal(afterTariffEdit.find(x=>x.id===b.id).lessonAmountCents,3000);
  assert.equal((await data('semprini:calendar:series:v1'))[0].lessonAmountCents,3600);
  console.log('Historical amounts after TEST tariff edit: PASS');
  console.log('PASS S5 Chrome scenarios A, B, series and downstream');
} finally {
  socket?.close(); child.kill();
  await delay(500);
  const root = realpathSync(tmpdir());
  const target = realpathSync(profile);
  if (target.startsWith(root + sep) && basename(target).startsWith('semprini-s5-chrome-')) {
    try { rmSync(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
    catch (error) { console.warn('Temporary Chrome profile could not be removed:', error.message); }
  }
}
