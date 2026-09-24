// Testy jednostkowe fizyki (bez renderu). Użycie: node tools/test-physics.mjs
import { Vector3 } from 'three';
import { Heli } from '../src/sim/heli.js';
import { AIRCRAFT } from '../src/sim/aircraft.js';
import { Wind } from '../src/sim/wind.js';
import { Assist } from '../src/sim/assist.js';
import { Sling, Load } from '../src/sim/sling.js';

const dt = 1 / 120;
let fails = 0, passes = 0;
const check = (name, ok, info = '') => { if (ok) passes++; else fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} ${info}`); };
const flatEnv = (gh, wind = null) => ({
  wind: wind || new Wind({ speed: 0, turb: 0 }, null),
  world: { terrain: { height: () => gh }, ground: (x, z, y, o = {}) => { o.h = gh; o.n = [0, 1, 0]; o.water = false; o.obj = null; return o; }, hit: () => null, diskHitsWire: () => null },
});
const hdgHold = h => Math.max(-1, Math.min(1, -h.attitude().heading * 2 + h.omega.y * 1.2));
function fly(h, env, secs, ctl, tr) {
  const as = new Assist(), out = {};
  for (let k = 0; k < secs / dt; k++) {
    const c = ctl(h, k * dt);
    as.attitudeHold(h, dt, c.pitch ?? 0, c.roll ?? 0, out);
    out.collective = c.collective; out.pedal = c.pedal ?? hdgHold(h);
    h.step(dt, out, env);
    if (tr && k % 12 === 0) tr(h, k * dt);
    if (h.crashed) break;
  }
}
const vsHold = target => { let ic = 0.5; return h => { const e = target(h) - h.vel.y; ic = Math.min(1, Math.max(0, ic + e * 0.25 * dt)); return Math.min(1, Math.max(0, ic + e * 0.08)); }; };

// 1. Pułap zawisu OGE: czy utrzymuje wysokość przy pełnej mocy (rpm >= 97%)
function canHover(spec, alt, extra) {
  const h = new Heli(spec), env = flatEnv(alt - 400);
  h.reset(new Vector3(0, alt, 0), 0, false, { fuel: spec.fuel.cap * 0.5, cargo: extra });
  const vs = vsHold(() => 0);
  let minVs = 0;
  fly(h, env, 25, (hh, t) => { if (t > 12) minVs = Math.min(minVs, hh.vel.y); return { collective: vs(hh) }; });
  return h.rpm > 0.955 && minVs > -0.5 && !h.crashed;
}
function ceiling(spec, extra) { let lo = 0, hi = 5000; for (let i = 0; i < 9; i++) { const m = (lo + hi) / 2; if (canHover(spec, m, extra)) lo = m; else hi = m; } return lo; }
const W = AIRCRAFT.wrobel;
const light = W.mass.empty + W.mass.pilot + W.fuel.cap * 0.5;
const cLight = ceiling(W, 0), cHeavy = ceiling(W, W.mass.max - light);
check('Wróbel: pułap zawisu OGE (lekki) 2400–3800 m', cLight > 2400 && cLight < 3800, `= ${cLight.toFixed(0)} m`);
check('Wróbel: pułap zawisu OGE (maks. masa) 900–2000 m', cHeavy > 900 && cHeavy < 2000, `= ${cHeavy.toFixed(0)} m`);
check('Wróbel: cięższy = niższy pułap', cHeavy < cLight - 600);

// 2. Efekt przypowierzchniowy
function hoverAt(aglSkid) {
  const spec = W, h = new Heli(spec), env = flatEnv(1000 + spec.skids.y - aglSkid);
  h.reset(new Vector3(0, 1000, 0), 0, false, { fuel: 36 });
  const vs = vsHold(() => 0); let c = 0, p = 0, n = 0;
  fly(h, env, 15, (hh, t) => { const cc = vs(hh); if (t > 8) { c += cc; p += hh.tel.Preq; n++; } return { collective: cc }; });
  return { c: c / n, p: p / n };
}
const ige = hoverAt(0.8), oge = hoverAt(40);
check('Efekt przypowierzchniowy: mniejszy skok w zawisie przy ziemi', ige.c < oge.c - 0.005, `${ige.c.toFixed(3)} vs ${oge.c.toFixed(3)}`);
check('Efekt przypowierzchniowy: moc niższa o ≥4%', ige.p < oge.p * 0.96, `${(ige.p / 1000).toFixed(1)} vs ${(oge.p / 1000).toFixed(1)} kW`);

// 3. Siła nośna translacyjna: mniej mocy przy 20 m/s niż w zawisie
{
  const h = new Heli(W), env = flatEnv(0); h.reset(new Vector3(0, 1000, 0), 0, false, { fuel: 36 }); h.vel.set(0, 0, -20);
  const vs = vsHold(() => 0); let ip = 0, p = 0, n = 0;
  fly(h, env, 30, (hh, t) => { const e = 20 + hh.vel.z; ip += e * dt * 0.01; if (t > 20) { p += hh.tel.Preq; n++; } return { collective: vs(hh), pitch: Math.max(-0.4, Math.min(0.3, -(e * 0.03 + ip))) }; });
  check('Siła nośna translacyjna: moc przy 20 m/s < zawis', p / n < oge.p * 0.85, `${(p / n / 1000).toFixed(1)} vs ${(oge.p / 1000).toFixed(1)} kW`);
}

// 4. Wir pierścieniowy: opadanie pionowe ~5 m/s -> VRS; z prędkością poziomą -> brak
function vrsTest(fwd) {
  const h = new Heli(W), env = flatEnv(-5000); h.reset(new Vector3(0, 2000, 0), 0, false, { fuel: 36 }); h.vel.set(0, 0, -fwd);
  const vs = vsHold(() => -5.5); let mx = 0, ip = 0;
  fly(h, env, 14, (hh, t) => { mx = Math.max(mx, hh.vrs); const e = fwd + hh.vel.z; ip += e * dt * 0.01; return { collective: vs(hh), pitch: fwd ? Math.max(-0.4, Math.min(0.3, -(e * 0.03 + ip))) : 0 }; });
  return { mx, vs: h.vel.y };
}
const v0 = vrsTest(0), v1 = vrsTest(16);
check('VRS występuje przy opadaniu pionowym ~5 m/s', v0.mx > 0.5, `vrs=${v0.mx.toFixed(2)}`);
check('VRS nie występuje przy 16 m/s do przodu', v1.mx < 0.1, `vrs=${v1.mx.toFixed(2)}`);
{
  // więcej skoku w VRS nie zatrzymuje opadania
  const h = new Heli(W), env = flatEnv(-5000); h.reset(new Vector3(0, 2000, 0), 0, false, { fuel: 36 });
  const vs = vsHold(() => -5.5);
  fly(h, env, 12, hh => ({ collective: vs(hh) }));
  const v0s = h.vel.y;
  fly(h, env, 2.5, () => ({ collective: 0.95 }));
  check('VRS: pełny skok nie wyprowadza w 2,5 s', h.vel.y < -3 || h.vrs > 0.3, `vs ${v0s.toFixed(1)} -> ${h.vel.y.toFixed(1)}, vrs=${h.vrs.toFixed(2)}`);
}

// 5. Autorotacja: awaria przy 30 m/s i 300 m AGL -> da się wylądować
{
  const gh = 1000, h = new Heli(W), env = flatEnv(gh);
  h.reset(new Vector3(0, gh + 300, 0), 0, false, { fuel: 36 }); h.vel.set(0, 0, -30); h.vi = 5;
  const vsc = vsHold(() => 0);
  fly(h, env, 4, hh => ({ collective: vsc(hh), pitch: -0.06 }));
  h.engineFailed = true;
  let minRpm = 2, maxRpm = 0, ip = 0;
  const rpmCol = (hh, target) => Math.max(0, Math.min(1, 0.15 + (hh.rpm - target) * 4));
  let col = 0.15, phase = 'glide';
  fly(h, env, 60, (hh, t) => {
    const agl = hh.tel.agl, vF = -hh.vel.z;
    if (!hh.onGround && t > 2.5 && agl > 28) { minRpm = Math.min(minRpm, hh.rpm); maxRpm = Math.max(maxRpm, hh.rpm); }
    if (hh.onGround || phase === 'ground') { phase = 'ground'; return { collective: Math.max(0, col -= dt * 0.3), pitch: 0.05 }; }
    if (t < 1.0) return { collective: (col = 0.45 - t * 0.35), pitch: 0 };
    if (phase === 'glide' && agl < 17) phase = 'flare';
    if (phase === 'flare' && (hh.vel.y > -1.5 || vF < 9)) phase = 'level';
    if ((phase === 'level' || phase === 'flare') && agl < 3.5) phase = 'cushion';
    if (phase === 'glide') { const e = 27 - vF; ip += e * dt * 0.01; col = rpmCol(hh, 1.03); return { collective: col, pitch: Math.max(-0.3, Math.min(0.25, -(e * 0.03 + ip))) }; }
    if (phase === 'flare') { col = rpmCol(hh, 1.07); return { collective: col, pitch: Math.min(0.42, 0.1 + (17 - agl) * 0.04) }; }
    if (phase === 'level') { col = Math.max(col, rpmCol(hh, 1.05)); return { collective: col, pitch: 0.08 }; }
    // wybranie skokiem: zadana prędkość pionowa, ograniczone narastanie, ochrona obrotów
    const vsT = -Math.max(0.5, agl * 0.3);
    let want = col + (vsT - hh.vel.y) * 0.15;
    if (hh.rpm < 0.84) want = Math.min(want, col - dt * 0.5);
    col += Math.max(-dt * 1.5, Math.min(dt * 1.5, want - col));
    return { collective: Math.max(0, Math.min(1, col)), pitch: 0.04 };
  }, (hh, t) => process.env.TRACE && Math.round(t * 10) % 3 === 0 && hh.tel.agl < 40 && console.log(`  t=${t.toFixed(1)} agl=${hh.tel.agl.toFixed(1)} vs=${hh.vel.y.toFixed(1)} vF=${(-hh.vel.z).toFixed(1)} rpm=${hh.rpm.toFixed(2)} col=${col.toFixed(2)} pitch=${(hh.attitude().pitch*57.3).toFixed(0)} ${phase}`));
  check('Autorotacja: lądowanie bez katastrofy', !h.crashed && h.onGround, `impact=${h.stats.maxImpact.toFixed(2)} m/s ${h.crashed || ''}`);
  check('Autorotacja: obroty w zakresie 90–112% w ślizgu', minRpm > 0.9 && maxRpm < 1.12, `min ${minRpm.toFixed(3)} max ${maxRpm.toFixed(3)}`);
}

// 6. Wahadło ładunku: energia maleje z tłumieniem
{
  const env = flatEnv(-100);
  const s = new Sling(12, 300); const hook = [0, 100, 0]; s.reset(hook);
  const L = new Load({ mass: 150, size: [1, 1, 1], cda: 1.0 }); L.pos = [0, 100 - 12 - 2 - 0.5, 0]; L.prev = [...L.pos];
  s.attach(L);
  for (let i = 0; i < 120 * 3; i++) s.step(dt, hook, hook, env, i * dt, null);
  L.prev[0] = L.pos[0] - 3 * dt / 6; // pchnięcie 3 m/s (krok podkroku = dt/6)
  let a0 = 0, a1 = 0;
  for (let i = 0; i < 120 * 90; i++) { s.step(dt, hook, hook, env, i * dt, null); const d = Math.abs(L.pos[0]); if (i < 120 * 12) a0 = Math.max(a0, d); if (i > 120 * 78) a1 = Math.max(a1, d); }
  check('Wahadło: amplituda maleje (tłumienie)', a1 < a0 * 0.7, `${a0.toFixed(2)} -> ${a1.toFixed(2)} m`);
  const T = 2 * Math.PI * Math.sqrt(14.5 / 9.81);
  check('Wahadło: stabilne numerycznie', isFinite(L.pos[1]) && Math.abs(L.pos[1] - (100 - 14.5)) < 1.5, `y=${L.pos[1].toFixed(2)} (okres teor. ${T.toFixed(1)} s)`);
}

// 7. Determinizm
{
  const run = () => { const h = new Heli(W), env = flatEnv(900, new Wind({ speed: 6, gust: 2, turb: 0.5, seed: 5 }, null)); h.reset(new Vector3(0, 950, 0), 0, false, { fuel: 30 }); const vs = vsHold(() => 1); fly(h, env, 20, (hh, t) => ({ collective: vs(hh), pitch: -0.05 + Math.sin(t) * 0.05, roll: 0.03 })); return h.pos.toArray().concat(h.quat.toArray()).map(v => v.toFixed(9)).join(','); };
  check('Determinizm: te same wejścia = ten sam stan', run() === run());
}

// 8. Twarde przyziemienie: progi
{
  const drop = v => { const h = new Heli(W), env = flatEnv(1000); h.reset(new Vector3(0, 1000 - W.skids.y + 0.02, 0), 0, false, { fuel: 30 }); h.vel.set(0, -v, 0); h.rpm = 1; fly(h, env, 2, () => ({ collective: 0.2 })); return h; };
  check('Przyziemienie 0,5 m/s bez uszkodzeń', drop(0.5).damage.gear === 0);
  check('Przyziemienie 3,5 m/s = uszkodzenie podwozia', drop(3.5).damage.gear > 0 && !drop(3.5).crashed);
  check('Przyziemienie 6 m/s = katastrofa', !!drop(6).crashed);
}

console.log(`\n${passes} OK, ${fails} FAIL`);
process.exitCode = fails ? 1 : 0;
