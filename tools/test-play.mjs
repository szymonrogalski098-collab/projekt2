// Test gry „ręcznej”: prawdziwe zdarzenia klawiatury w Playwright -> Input -> symulacja (misja 1, asysta Częściowa).
// Start (W), zawis, zejście (S) i lądowanie – bez katastrofy i twardego przyziemienia.
// + zapis/wczytanie + kod zapisu + symulowany pad (Gamepad API).
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const srv = createServer((q, r) => { let p = q.url.split('?')[0]; if (p === '/') p = '/index.html'; const f = join('dist', p); if (!existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': 'text/html' }); r.end(readFileSync(f)); }).listen(0);
const b = await chromium.launch({ executablePath: existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
// symulowany pad
await p.addInitScript(() => {
  window.__pad = { axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })), index: 0, connected: true, id: 'Symulowany pad', mapping: 'standard', timestamp: 0 };
  window.__padOn = false;
  navigator.getGamepads = () => (window.__padOn ? [window.__pad] : [null]);
});
await p.goto(`http://localhost:${srv.address().port}/index.html?debug`);
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
await p.evaluate(() => window.__game.stopLoop(true));
let fails = 0; const check = (n, ok, info = '') => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${n} ${info}`); };
const G = (fn, a) => p.evaluate(fn, a);
const step = s => G(s => window.__game.stepInput(s), s);

await G(() => { window.__game.setLevel('c1m1'); window.__game.app.input.enabled = true; });
// 1. start: przytrzymaj W
await p.keyboard.down('KeyW');
let st;
for (let i = 0; i < 40; i++) { st = await step(0.1); if (st.agl > 1.5) break; }
await p.keyboard.up('KeyW');
check('Start klawiszem W (oderwanie)', st.agl > 1 && !st.crashed, `agl=${st.agl.toFixed(1)} skok=${st.col.toFixed(2)}`);
// ustabilizuj: krótkie korekty skoku, aż prędkość pionowa ~0
for (let i = 0; i < 60; i++) {
  st = await step(0.1);
  if (st.vs > 0.4) { await p.keyboard.down('KeyS'); await step(0.05); await p.keyboard.up('KeyS'); }
  else if (st.vs < -0.4) { await p.keyboard.down('KeyW'); await step(0.05); await p.keyboard.up('KeyW'); }
}
check('Zawis na asyście Częściowej (postawa stabilna)', !st.crashed && Math.abs(st.roll) < 15 && Math.abs(st.pitch) < 15 && st.agl > 1, `agl=${st.agl.toFixed(1)} vs=${st.vs.toFixed(2)} roll=${st.roll.toFixed(1)} pitch=${st.pitch.toFixed(1)} gs=${st.gs.toFixed(1)}`);
// 2. zejście: stuknięcia S z kontrolą prędkości pionowej
for (let i = 0; i < 300 && !st.onGround; i++) {
  st = await step(0.1);
  const want = st.agl > 3 ? -0.8 : -0.35;
  if (st.vs > want + 0.15) { await p.keyboard.down('KeyS'); await step(0.04); await p.keyboard.up('KeyS'); }
  else if (st.vs < want - 0.15) { await p.keyboard.down('KeyW'); await step(0.04); await p.keyboard.up('KeyW'); }
}
await p.keyboard.down('KeyS'); st = await step(3); await p.keyboard.up('KeyS');
check('Lądowanie bez katastrofy', st.onGround && !st.crashed, `impact=${st.maxImpact.toFixed(2)} m/s`);
check('Lądowanie miękkie (< 1,5 m/s)', st.maxImpact < 1.5 && st.hard === 0);
// 3. restart < 1 s
const rs = await G(() => { const t = performance.now(); window.__game.app.startMission('c1m1'); return performance.now() - t; });
check('Szybki restart < 1 s', rs < 1000, `${rs.toFixed(0)} ms`);
// 4. zapis i kod zapisu
const sv = await G(() => {
  const a = window.__game.app;
  const r = window.__game.runBot('c1m1'); a.finish();
  const code = (a.menus.savecode(() => {}), document.querySelector('#code').value);
  const before = JSON.stringify(a.save.missions);
  a.resetSave(); const cleared = Object.keys(a.save.missions).length;
  const { importCode } = window.__saveApi || {};
  document.querySelector('#code').value = code; document.querySelector('#load').click();
  const after = JSON.stringify(a.save.missions);
  let stored = null; try { stored = JSON.parse(localStorage.getItem('przelecz.save.v1')); } catch { }
  return { medal: r.result?.medal, before, after, cleared, stored: !!stored && JSON.stringify(stored.missions) === after, bad: (() => { try { document.querySelector('#code').value = 'P2-zzz-abc'; document.querySelector('#load').click(); return document.querySelector('.toast:last-of-type')?.textContent; } catch (e) { return e.message; } })() };
});
check('Zapis wyniku misji', sv.before.includes('c1m1'), sv.before);
check('Kod zapisu: eksport -> reset -> import', sv.cleared === 0 && sv.after === sv.before, sv.after);
check('Zapis w localStorage po imporcie', sv.stored);
check('Błędny kod odrzucony', /Błąd/.test(sv.bad || ''), sv.bad);
// 5. pad: prawa gałka do przodu -> pochylenie nosa w dół; lewa gałka w górę -> skok rośnie
await G(() => { window.__game.setLevel('c1m1'); window.__game.app.input.enabled = true; window.__padOn = true; window.__pad.axes = [0, -1, 0, 0]; });
st = await step(0.8);
const col = await G(() => window.__game.app.input.collective);
await G(() => { window.__pad.axes = [0, 0, 0, 0]; });
st = await step(4);
await G(() => { window.__pad.axes = [0, 0, 0, -0.8]; });
st = await step(1.2);
check('Pad: lewa gałka podnosi skok', col > 0.45, `skok=${col.toFixed(2)}`);
check('Pad: prawa gałka pochyla do przodu', st.pitch < -4, `pochylenie=${st.pitch.toFixed(1)}°`);
await G(() => { window.__pad.buttons[0].pressed = true; }); await step(0.05); await G(() => { window.__pad.buttons[0].pressed = false; window.__padOn = false; });
check('Konsola bez błędów', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(fails ? `${fails} FAIL` : 'wszystko OK');
await b.close(); srv.close(); process.exitCode = fails ? 1 : 0;
