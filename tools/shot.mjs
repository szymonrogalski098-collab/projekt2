// Zrzuty Playwright: serwuje dist/, otwiera grę z ?debug i wykonuje scenariusz.
// Użycie: node tools/shot.mjs [scenariusz] [--gpu] [--w 1600 --h 900]
//   scenariusze: menu | missions | mission:<id> | perf | eval:<kod JS>
// Zrzuty trafiają do shots/ (w .gitignore).
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const scenario = args.find(a => !a.startsWith('--') && !/^\d+$/.test(a)) || 'menu';
const gpu = args.includes('--gpu');
const W = +opt('w', 1600), H = +opt('h', 900);
mkdirSync('shots', { recursive: true });

const srv = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join('dist', p);
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(0);
const port = srv.address().port;

const flags = gpu ? ['--ignore-gpu-blocklist', '--enable-gpu', '--enable-webgl', '--use-angle=default']
  : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const b = await chromium.launch({ executablePath: exe, headless: !gpu || process.env.HEADFUL !== '1', args: flags });
const p = await b.newPage({ viewport: { width: W, height: H } });
const logs = [];
p.on('console', m => { const t = `[${m.type()}] ${m.text()}`; logs.push(t); if (m.type() === 'error' || m.type() === 'warning' || process.env.VERBOSE) console.log(t); });
p.on('pageerror', e => { logs.push('[pageerror] ' + e.message); console.log('[pageerror]', e.message); });
const t0 = Date.now();
await p.goto(`http://localhost:${port}/index.html?debug`);
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
console.log(`gotowe po ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (!gpu) await p.evaluate(() => window.__game.stopLoop(true));
const G = (fn, arg) => p.evaluate(fn, arg);
const shot = async name => { await p.waitForTimeout(150); await p.screenshot({ path: `shots/${name}.png` }); console.log('zrzut', `shots/${name}.png`); };

if (scenario === 'menu') {
  const ms = await G(() => window.__game.renderOnce()); console.log('czas klatki (ms):', ms.toFixed(0));
  await shot('menu');
  await G(() => window.__game.app.ui('map')); await p.waitForTimeout(800); await shot('map');
} else if (scenario === 'missions' || scenario.startsWith('mission:')) {
  const ids = scenario === 'missions' ? await G(() => window.__game.missions()) : [scenario.split(':')[1]];
  for (const id of ids) {
    for (const preset of (opt('presets', 'gracz,mgla-off,z-gory,koniec')).split(',')) {
      await G(([id]) => window.__game.setLevel(id), [id]);
      if (preset === 'gracz') await G(() => window.__game.fly(2.5, { collective: 0.55 }));
      await G(([pr]) => window.__game.capture(pr), [preset]);
      await shot(`${id}-${preset}`);
    }
  }
} else if (scenario === 'ui') {
  // odprawa, lot, podsumowanie, pauza, ustawienia
  await G(() => { window.__game.app.ui('map'); window.__game.app.menus.selectMission('c1m1'); }); await p.waitForTimeout(500); await shot('ui-brief');
  const r = await G(() => window.__game.runBot('c1m1')); console.log(JSON.stringify(r.result && { medal: r.result.medal, time: r.result.time }));
  await G(() => { window.__game.app.finish(); }); await p.waitForTimeout(400); await shot('ui-debrief');
  await G(() => { window.__game.setLevel('c1m1'); window.__game.capture('gracz'); window.__game.app.pause(); }); await p.waitForTimeout(300); await shot('ui-pause');
  await G(() => window.__game.app.ui('settings')); await p.waitForTimeout(300); await shot('ui-settings');
  await G(() => window.__game.app.ui('controls')); await p.waitForTimeout(300); await shot('ui-controls');
} else if (scenario === 'perf') {
  await G(() => window.__game.setLevel('c1m2'));
  await G(() => window.__game.teleport(0, null, 1500, 0, 30));
  await G(() => { window.__game.hold(false); });
  await p.waitForTimeout(6000);
  console.log(JSON.stringify(await G(() => window.__game.stats())));
  await shot('perf');
} else if (scenario.startsWith('eval:')) {
  const r = await G(code => eval(code), scenario.slice(5));
  console.log(JSON.stringify(r));
  await shot(opt('name', 'eval'));
}
const errs = logs.filter(l => /\[error\]|\[pageerror\]|WebGL|GL_INVALID/.test(l));
console.log(errs.length ? `BŁĘDY/OSTRZEŻENIA KONSOLI: ${errs.length}` : 'konsola czysta');
await b.close(); srv.close();
