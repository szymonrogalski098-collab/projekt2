// Bot na symulacji bez renderu: autopilot referencyjny i kontroler naiwny.
// Użycie: node tools/bot.mjs [--mission c1m1] [--runs 20] [--naive] [--calibrate] [--trace]
import { writeFileSync } from 'node:fs';
import { loadTerrain } from './lib/world-node.mjs';
import { buildContext } from '../src/game/worldctx.js';
import { MISSIONS } from '../src/game/missions.js';
import { Session } from '../src/game/session.js';
import { Autopilot } from '../src/game/autopilot.js';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const runs = +(opt('runs') || 5);
const only = opt('mission');
const naive = !!opt('naive');
const trace = !!opt('trace');
const calibrate = !!opt('calibrate');
const chapterFilter = opt('chapter');

const t0 = Date.now();
const terrain = loadTerrain();
const ctx = buildContext(terrain);
console.log(`świat gotowy w ${Date.now() - t0} ms, drzew: ${ctx.trees.count}`);

export function runMission(def, seed, opts = {}) {
  const s = new Session(ctx, def, { seed, assist: opts.assist || 'partial', record: false });
  const ap = new Autopilot(s, { naive: opts.naive });
  const maxT = (def.limits?.time || 900) + 5;
  let last = -1;
  while (s.mission.status === 'running' && s.t < maxT) {
    s.step(ap.step());
    if (opts.trace && Math.floor(s.t) !== last && Math.floor(s.t) % (opts.every || 5) === 0) {
      last = Math.floor(s.t);
      const h = s.heli, d = ap.dbg || {};
      console.log(`t=${s.t.toFixed(0)} obj=${s.mission.idx} ${d.mode}/${d.phase} pos=(${h.pos.x.toFixed(0)},${h.pos.y.toFixed(0)},${h.pos.z.toFixed(0)}) agl=${h.tel.agl.toFixed(1)} v=${h.tel.gs.toFixed(1)} vs=${h.vel.y.toFixed(1)} col=${s.controls.collective.toFixed(2)} rpm=${h.rpm.toFixed(2)} ty=${(d.ty ?? 0).toFixed(0)} tgt=(${(d.tx ?? 0).toFixed(0)},${(d.tz ?? 0).toFixed(0)}) fuel=${h.fuel.toFixed(1)} ${s.sling?.load ? 'LOAD' : ''}`);
    }
  }
  if (s.mission.status === 'running') s.mission.fail('Bot: przekroczony czas symulacji');
  return s.mission.result();
}

const list = MISSIONS.filter(m => (!only || m.id === only) && (!chapterFilter || m.chapter === +chapterFilter));
const refs = {};
let allOk = true;
for (const def of list) {
  const res = [];
  const tm = Date.now();
  const seed0 = +(opt('seed') || 1);
  for (let i = 0; i < runs; i++) res.push(runMission(def, seed0 + i, { naive, trace: trace && i === 0, every: +(opt('every') || 5) }));
  const ok = res.filter(r => r.success);
  const times = ok.map(r => r.time).sort((a, b) => a - b);
  const med = times.length ? times[Math.floor(times.length / 2)] : NaN;
  const medals = [0, 0, 0, 0]; for (const r of res) medals[r.medal]++;
  const fails = {}; for (const r of res) if (!r.success) fails[r.reason] = (fails[r.reason] || 0) + 1;
  const imp = ok.map(r => r.maxImpact); const dist = ok.map(r => r.maxDist);
  console.log(`${def.id.padEnd(6)} ${naive ? 'NAIWNY ' : ''}ok ${ok.length}/${runs}  czas med ${med.toFixed(1)} s (min ${times[0]?.toFixed(1)}, max ${times[times.length - 1]?.toFixed(1)})  medale b/s/z ${medals[1]}/${medals[2]}/${medals[3]}  przyz. max ${Math.max(0, ...imp).toFixed(2)}  prec. max ${Math.max(0, ...dist).toFixed(2)}  [${((Date.now() - tm) / 1000).toFixed(1)} s]`);
  if (Object.keys(fails).length) console.log('   porażki:', fails);
  const w = ok.find(r => r.medal < 3); if (w) console.log('   brak medalu wyżej:', w.why.join('; '));
  if (ok.length < runs) allOk = false;
  if (calibrate && ok.length) refs[def.id] = Math.round(med * 10) / 10;
  if (naive && def.chapter >= 2 && medals[2] + medals[3] > 0) { console.log('   !!! naiwny kontroler zdobył srebro – misja za łatwa'); allOk = false; }
}
if (calibrate) {
  const file = 'src/game/medals-ref.js';
  const cur = (await import('../' + file)).default;
  const merged = { ...cur, ...refs };
  writeFileSync(file, '// Czasy referencyjne autopilota [s] – generowane przez tools/bot.mjs (--calibrate).\nexport default ' + JSON.stringify(merged, null, 2) + ';\n');
  console.log('zapisano', file, merged);
}
process.exitCode = allOk || naive ? 0 : 1;
