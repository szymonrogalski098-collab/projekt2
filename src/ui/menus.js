// Ekrany: start, mapa regionu (wybór misji), odprawa, pauza, podsumowanie (z wykresem), ustawienia, kod zapisu, sterowanie.
import { CHAPTERS, MISSIONS } from '../game/missions.js';
import { medalThresholds } from '../game/mission.js';
import { AIRCRAFT } from '../sim/aircraft.js';
import { KEY_LABELS, DEFAULT_KEYS } from '../core/settings.js';
import { exportCode, importCode } from '../core/save.js';
import { resolvePoint } from '../game/objectives.js';

const $ = (s, r = document) => r.querySelector(s);
const KEYN = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ShiftLeft: 'Shift', ShiftRight: 'Shift', Space: 'Spacja', Escape: 'Esc', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', Tab: 'Tab', Enter: 'Enter' };
export const keyName = c => KEYN[c] || String(c).replace(/^Key/, '').replace(/^Digit/, '');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f1 = v => (Math.round(v * 10) / 10).toString().replace('.', ',');
const time = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const MEDAL = ['', 'b', 's', 'g'], MEDAL_NAME = ['', 'Brąz', 'Srebro', 'Złoto'];
const windDir = d => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((d % 360) + 360) % 360 / 45) % 8];
const WIND_PL = { N: 'północny', NE: 'płn.-wsch.', E: 'wschodni', SE: 'płd.-wsch.', S: 'południowy', SW: 'płd.-zach.', W: 'zachodni', NW: 'płn.-zach.' };

export function missionUnlocked(save, m) {
  const list = MISSIONS.filter(x => x.chapter === m.chapter);
  const i = list.indexOf(m);
  if (m.chapter > 1) {
    const prevExam = MISSIONS.find(x => x.chapter === m.chapter - 1 && x.exam);
    if (!prevExam || !(save.missions[prevExam.id]?.medal > 0)) return false;
  }
  if (m.exam) return list.filter(x => !x.exam).every(x => save.missions[x.id]?.medal > 0);
  return i === 0 || save.missions[list[i - 1].id]?.medal > 0;
}

export class Menus {
  constructor(app) {
    this.app = app;
    this.root = document.body;
    this.screens = {};
    for (const id of ['loading', 'start', 'map', 'brief', 'pause', 'debrief', 'settings', 'savecode', 'controls']) {
      const d = document.createElement('div'); d.className = 'screen'; d.id = id; this.root.appendChild(d); this.screens[id] = d;
    }
    this.screens.pause.classList.add('glass'); this.screens.debrief.classList.add('glass'); this.screens.settings.classList.add('glass');
    this.screens.savecode.classList.add('glass'); this.screens.controls.classList.add('glass');
    this.sel = null;
  }
  show(id) { for (const [k, s] of Object.entries(this.screens)) s.classList.toggle('on', k === id); this.current = id; }
  hideAll() { this.show(null); }
  toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }

  loading(text) {
    const s = this.screens.loading;
    s.innerHTML = `<div class="center" style="text-align:center"><h1 class="title">PRZEŁĘCZ</h1><div class="subtitle">${esc(text)}</div><div class="bar" style="margin:20px auto 0"><i></i></div></div>`;
    this.show('loading');
  }

  start() {
    const s = this.screens.start, save = this.app.save;
    const done = Object.values(save.missions).filter(m => m.medal > 0).length;
    s.innerHTML = `<div class="center" style="display:flex;gap:60px;align-items:center">
      <div><h1 class="title">PRZEŁĘCZ</h1><div class="subtitle">SYMULATOR PILOTA ŚMIGŁOWCA · GÓRY</div>
      <div class="menu">
        <button class="btn primary" data-a="map">${done ? 'Kontynuuj kampanię' : 'Nowa kampania'}</button>
        <button class="btn" data-a="controls">Sterowanie</button>
        <button class="btn" data-a="settings">Ustawienia</button>
        <button class="btn" data-a="savecode">Kod zapisu</button>
      </div>
      <p class="muted small" style="margin-top:28px">Ukończone misje: ${done} · lotów: ${save.flights} · wypadków: ${save.crashes}</p></div></div>`;
    s.querySelectorAll('[data-a]').forEach(b => b.onclick = () => this.app.ui(b.dataset.a));
    this.show('start');
  }

  // --- mapa regionu ---
  mapCanvas() {
    if (this._mapCanvas) return this._mapCanvas;
    const T = this.app.ctx.terrain, W = 900, c = document.createElement('canvas'); c.width = c.height = W;
    const g = c.getContext('2d'), img = g.createImageData(W, W), d = img.data, half = 4096;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const x = -half + (i + 0.5) / W * half * 2, z = -half + (j + 0.5) / W * half * 2, e = half * 2 / W;
      const h = T.height(x, z), hx = T.height(x + e, z) - T.height(x - e, z), hz = T.height(x, z + e) - T.height(x, z - e);
      const nx = -hx, ny = 2 * e, nz = -hz, l = Math.hypot(nx, ny, nz);
      const sh = Math.max(0.25, (nx * -0.55 + ny * 0.7 + nz * -0.45) / l);
      const f = T.forestAt(x, z);
      let r = 0.52 + (h - 900) / 2600 * 0.3, gg = 0.58 + (h - 900) / 2600 * 0.2, b = 0.42 + (h - 900) / 2600 * 0.35;
      if (h > 2650) { const k = Math.min(1, (h - 2650) / 250); r += (0.95 - r) * k; gg += (0.96 - gg) * k; b += (0.98 - b) * k; }
      r = r * (1 - f * 0.6) + 0.12 * f * 0.6; gg = gg * (1 - f * 0.6) + 0.26 * f * 0.6; b = b * (1 - f * 0.6) + 0.14 * f * 0.6;
      const wtr = this.app.ctx.world.water.test(x, z) && h < this.app.ctx.world.water.level;
      const k = (j * W + i) * 4;
      if (wtr) { d[k] = 40; d[k + 1] = 80; d[k + 2] = 110; }
      else { d[k] = Math.min(255, r * sh * 300); d[k + 1] = Math.min(255, gg * sh * 300); d[k + 2] = Math.min(255, b * sh * 300); }
      d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // drogi
    g.strokeStyle = 'rgba(250,240,220,0.6)'; g.lineWidth = 1.2; g.beginPath();
    T.road.forEach(([x, z], i) => { const px = (x + half) / (half * 2) * W, pz = (z + half) / (half * 2) * W; if (i % 3) return; i ? g.lineTo(px, pz) : g.moveTo(px, pz); }); g.stroke();
    // przewody
    g.strokeStyle = 'rgba(255,90,60,0.8)'; g.lineWidth = 1.5;
    for (const w of this.app.ctx.objects.wires) { g.beginPath(); w.pts.forEach(([x, , z], i) => { const px = (x + half) / (half * 2) * W, pz = (z + half) / (half * 2) * W; i ? g.lineTo(px, pz) : g.moveTo(px, pz); }); g.stroke(); }
    this._mapCanvas = c;
    return c;
  }
  missionPoint(m) {
    const ctx = { ctx: this.app.ctx, session: { loads: [] } };
    const objs = [...m.objectives].reverse();
    for (const o of objs) {
      const at = o.at || o.toward;
      if (at && !(typeof at === 'string' && at.startsWith('pad:base')) && !(typeof at === 'string' && at.startsWith('load:'))) { try { return resolvePoint(ctx, at); } catch { /* */ } }
    }
    return resolvePoint(ctx, 'pad:base1');
  }
  map() {
    const s = this.screens.map, save = this.app.save;
    s.innerHTML = `<div class="mapwrap"></div><div class="side"><div class="row" style="justify-content:space-between;align-items:center"><h2>Region</h2><button class="btn small" data-a="start">Menu</button></div><div id="mdetail"></div><div id="chapters"></div></div>`;
    const wrap = $('.mapwrap', s); const cv = this.mapCanvas(); wrap.appendChild(cv);
    const place = () => {
      wrap.querySelectorAll('.pin').forEach(p => p.remove());
      const rect = cv.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      for (const m of MISSIONS) {
        const p = this.missionPoint(m); const unl = missionUnlocked(save, m); const done = save.missions[m.id]?.medal > 0;
        const pin = document.createElement('div');
        pin.className = 'pin' + (m.exam ? ' exam' : '') + (done ? ' done' : '') + (unl ? '' : ' locked') + (this.sel === m.id ? ' sel' : '');
        pin.style.left = (rect.left - wr.left + (p.x + 4096) / 8192 * rect.width) + 'px'; pin.style.top = (rect.top - wr.top + (p.z + 4096) / 8192 * rect.height) + 'px';
        pin.textContent = m.exam ? 'E' : m.id.slice(-1); pin.title = m.title;
        pin.onclick = () => { if (unl) this.selectMission(m.id); };
        wrap.appendChild(pin);
      }
      // baza
      const b = resolvePoint({ ctx: this.app.ctx, session: { loads: [] } }, 'pad:base1');
      const bp = document.createElement('div'); bp.className = 'pin'; bp.style.background = '#fff'; bp.style.borderRadius = '3px'; bp.textContent = 'H'; bp.title = 'Baza';
      bp.style.left = (rect.left - wr.left + (b.x + 4096) / 8192 * rect.width + 16) + 'px'; bp.style.top = (rect.top - wr.top + (b.z + 4096) / 8192 * rect.height + 14) + 'px'; bp.style.width = bp.style.height = '18px'; wrap.appendChild(bp);
    };
    requestAnimationFrame(place); this._place = place; onresize = () => this.current === 'map' && place();
    const ch = $('#chapters', s);
    ch.innerHTML = CHAPTERS.map(c => {
      const ms = MISSIONS.filter(m => m.chapter === c.n);
      return `<h3>Rozdział ${c.n} · ${esc(c.title)}</h3><div class="muted small" style="margin:-4px 0 8px">${esc(c.desc)}</div>
        <div class="mlist">${ms.length ? ms.map(m => { const r = save.missions[m.id] || { medal: 0 }; const u = missionUnlocked(save, m);
          return `<div class="mitem ${u ? '' : 'locked'} ${this.sel === m.id ? 'sel' : ''}" data-id="${m.id}"><span>${esc(m.title)}</span><span class="medals">${[1, 2, 3].map(k => `<span class="medal ${r.medal >= k ? MEDAL[k] : ''}"></span>`).join('')}</span></div>`; }).join('')
          : '<div class="muted small">Zlecenia w przygotowaniu.</div>'}</div>`;
    }).join('');
    ch.querySelectorAll('.mitem').forEach(el => el.onclick = () => { const m = MISSIONS.find(x => x.id === el.dataset.id); if (missionUnlocked(save, m)) this.selectMission(m.id); });
    s.querySelector('[data-a=start]').onclick = () => this.app.ui('start');
    if (!this.sel) { const first = MISSIONS.find(m => missionUnlocked(save, m) && !(save.missions[m.id]?.medal > 0)) || MISSIONS[0]; this.sel = first.id; }
    this.show('map');
    this.selectMission(this.sel);
  }
  selectMission(id) {
    this.sel = id;
    const m = MISSIONS.find(x => x.id === id), s = this.screens.map, save = this.app.save;
    s.querySelectorAll('.mitem').forEach(el => el.classList.toggle('sel', el.dataset.id === id));
    if (this._place) this._place();
    const th = medalThresholds(m), w = m.weather?.wind || {}, spec = AIRCRAFT[m.aircraft];
    const r = save.missions[m.id];
    const assist = this.app.settings.assist;
    const vis = (m.weather?.fog || 0) > 0.5 ? 'słaba' : (m.weather?.fog || 0) > 0.25 ? 'umiarkowana' : 'dobra';
    const loads = (m.loads || []).map(l => `${l.name} ${l.mass} kg`).join(', ');
    $('#mdetail', s).innerHTML = `<div class="card"><h2>${esc(m.title)}</h2><div class="muted" style="margin:6px 0 12px">${esc(m.brief)}</div>
      <div class="kv">
        <span>Maszyna</span><b>${esc(spec.name)}</b>
        <span>Wiatr</span><b>${WIND_PL[windDir(w.dir || 0)]} ${f1(w.speed || 0)} m/s${w.gust ? `, porywy +${f1(w.gust)}` : ''}</b>
        <span>Widzialność</span><b>${vis}</b>
        <span>Paliwo</span><b>${m.fuel} kg</b>
        ${m.cargo ? `<span>Ładunek w kabinie</span><b>${m.cargo} kg</b>` : ''}
        ${loads ? `<span>Ładunek na linie</span><b>${esc(loads)}</b>` : ''}
        ${m.limits?.time ? `<span>Limit czasu</span><b>${time(m.limits.time)}</b>` : ''}
      </div>
      <h3>Medale</h3>
      <div class="small" style="line-height:1.7"><span class="medal b" style="display:inline-block;vertical-align:-1px"></span> ukończenie
        <br><span class="medal s" style="display:inline-block;vertical-align:-1px"></span> czas ≤ ${time(th.silver.time)}${th.silver.impact != null ? `, przyziemienie ≤ ${f1(th.silver.impact)} m/s` : ''}${th.silver.dist != null ? `, precyzja ≤ ${f1(th.silver.dist)} m` : ''}
        <br><span class="medal g" style="display:inline-block;vertical-align:-1px"></span> czas ≤ ${time(th.gold.time)}${th.gold.impact != null ? `, przyziemienie ≤ ${f1(th.gold.impact)} m/s` : ''}${th.gold.dist != null ? `, precyzja ≤ ${f1(th.gold.dist)} m` : ''}, bez uszkodzeń, asysta ≠ Pełna</div>
      ${r ? `<div class="muted small" style="margin-top:8px">Najlepszy: ${r.medal ? MEDAL_NAME[r.medal] : '—'}${r.best ? ', ' + time(r.best) : ''} · prób: ${r.attempts}</div>` : ''}
      <h3>Asysta</h3>
      <div class="seg" id="assistSeg">${[['full', 'Pełna'], ['partial', 'Częściowa'], ['none', 'Brak']].map(([k, l]) => `<button data-k="${k}" class="${assist === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="muted small" style="margin-top:6px" id="assistInfo"></div>
      <div style="margin-top:18px"><button class="btn primary" id="go" style="width:100%">Start</button></div></div>`;
    const info = { full: 'Stabilizacja pozycji i wysokości, auto-pedały. Bez złotych medali.', partial: 'Stabilizacja postawy: drążek ustawia pochylenie i przechylenie. Zalecana na początek.', none: 'Pełny realizm: drążek przechyla tarczę wirnika. Dla wytrwałych.' };
    const seg = $('#assistSeg', s);
    const upd = () => { $('#assistInfo', s).textContent = info[this.app.settings.assist]; seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === this.app.settings.assist)); };
    seg.querySelectorAll('button').forEach(b => b.onclick = () => { this.app.settings.assist = b.dataset.k; this.app.saveSettings(); upd(); });
    upd();
    $('#go', s).onclick = () => this.app.startMission(m.id);
  }

  pause() {
    const s = this.screens.pause;
    s.innerHTML = `<div class="center card" style="width:340px"><h2>Pauza</h2><div class="menu" style="width:100%;margin-top:18px">
      <button class="btn primary" data-a="resume">Wróć do lotu</button><button class="btn" data-a="restart">Restart misji (R)</button>
      <button class="btn" data-a="controls">Sterowanie</button><button class="btn" data-a="settings">Ustawienia</button><button class="btn" data-a="quit">Zakończ i wróć do mapy</button></div></div>`;
    s.querySelectorAll('[data-a]').forEach(b => b.onclick = () => this.app.ui(b.dataset.a));
    this.show('pause');
  }

  debrief(res, def, session) {
    const s = this.screens.debrief;
    const ok = res.success;
    const th = res.thresholds;
    const row = (label, val, need, good) => `<span>${label}</span><b style="color:${good === false ? 'var(--amber)' : 'inherit'}">${val}${need ? ` <span class="muted small">(${need})</span>` : ''}</b>`;
    const land = res.maxImpact;
    s.innerHTML = `<div class="center card"><div class="row" style="justify-content:space-between;align-items:flex-start">
      <div><div class="muted small">${def.exam ? 'EGZAMIN' : 'MISJA'} · ROZDZIAŁ ${def.chapter}</div><h2>${esc(def.title)}</h2></div>
      <div>${[1, 2, 3].map(k => `<span class="bigmedal ${res.medal >= k ? '' : 'off'}" style="${res.medal >= k ? `background:${['', '#b07a45', '#c9d0d6', '#f2c230'][k]}` : ''}">${['', 'B', 'S', 'Z'][k]}</span>`).join('')}</div></div>
      <div class="reason ${ok ? 'ok' : ''}">${ok ? (def.exam ? 'Egzamin zaliczony.' : 'Zadanie wykonane.') : esc(res.reason || 'Misja przerwana')}</div>
      <div class="kv">
        ${row('Czas', time(res.time), ok ? `srebro ≤ ${time(th.silver.time)}, złoto ≤ ${time(th.gold.time)}` : '')}
        ${ok ? row('Najtwardsze przyziemienie', `${f1(land)} m/s`, `złoto ≤ ${f1(th.gold.impact)}`, land <= th.gold.impact) : ''}
        ${ok && (th.gold.dist != null) ? row('Precyzja', `${f1(res.maxDist)} m`, `złoto ≤ ${f1(th.gold.dist)}`, res.maxDist <= th.gold.dist) : ''}
        ${ok && res.loadImpact ? row('Odstawienie ładunku', `${f1(res.loadImpact)} m/s`, th.gold.loadImpact ? `złoto ≤ ${f1(th.gold.loadImpact)}` : '') : ''}
        ${row('Uszkodzenia', res.damage > 0.001 ? `${Math.round(Math.min(1, res.damage) * 100)}%` : 'brak', '', res.damage <= 0.001)}
        ${row('Paliwo zużyte', `${f1(res.fuelUsed)} kg`)}
        ${row('Asysta', { full: 'Pełna', partial: 'Częściowa', none: 'Brak' }[res.assist])}
      </div>
      ${ok && res.medal < 3 && res.why?.length ? `<div class="muted small" style="margin-top:10px">Do następnego medalu brakuje: ${esc(res.why.join('; '))}</div>` : ''}
      <h3>Przebieg lotu</h3><canvas id="chart" width="1540" height="320"></canvas>
      <div class="muted small" style="margin-top:4px"><span style="color:#6fd0ff">■</span> wysokość nad ziemią &nbsp; <span style="color:#ffcf4a">■</span> prędkość &nbsp; <span style="color:#ff7a6a">■</span> prędkość pionowa</div>
      <div class="row" style="margin-top:18px"><button class="btn primary" data-a="retry" style="flex:1">Spróbuj ponownie (R)</button><button class="btn" data-a="map" style="flex:1">Mapa</button></div></div>`;
    s.querySelectorAll('[data-a]').forEach(b => b.onclick = () => this.app.ui(b.dataset.a));
    this.drawChart($('#chart', s), session.chart);
    this.show('debrief');
  }
  drawChart(c, data) {
    const g = c.getContext('2d'), W = c.width, H = c.height;
    g.clearRect(0, 0, W, H);
    if (!data || data.length < 2) return;
    const T = data[data.length - 1][0], maxA = Math.max(20, ...data.map(d => d[1])), maxV = Math.max(10, ...data.map(d => d[2]));
    g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 1;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, H * i / 4); g.lineTo(W, H * i / 4); g.stroke(); }
    const line = (idx, max, col, off = 0) => { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); data.forEach((d, i) => { const x = d[0] / T * W, y = H - 10 - (d[idx] / max + off) * (H - 20); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); };
    line(1, maxA, '#6fd0ff'); line(2, maxV, '#ffcf4a');
    g.strokeStyle = 'rgba(255,122,106,0.8)'; g.lineWidth = 2; g.beginPath();
    data.forEach((d, i) => { const x = d[0] / T * W, y = H / 2 - d[3] / 10 * H / 2; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    g.fillStyle = '#9aa6ae'; g.font = '22px system-ui'; g.fillText(`${Math.round(maxA)} m`, 8, 26); g.fillText(`${Math.round(T)} s`, W - 80, H - 10);
  }

  settings(back) {
    const s = this.screens.settings, S = this.app.settings;
    const sel = (k, opts) => `<select data-k="${k}">${opts.map(([v, l]) => `<option value="${v}" ${String(S[k]) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const rng = (k, a, b, st) => `<input type="range" data-k="${k}" min="${a}" max="${b}" step="${st}" value="${S[k]}"> <span class="num" data-v="${k}">${S[k]}</span>`;
    const chk = k => `<input type="checkbox" data-k="${k}" ${S[k] ? 'checked' : ''}>`;
    s.innerHTML = `<div class="center card"><div class="row" style="justify-content:space-between"><h2>Ustawienia</h2><button class="btn small" data-a="back">Gotowe</button></div>
      <h3>Grafika</h3>
      <div class="set">Jakość ${sel('quality', [['auto', 'Automatyczna'], ['low', 'Niska'], ['medium', 'Średnia'], ['high', 'Wysoka'], ['ultra', 'Ultra']])}</div>
      <div class="set">Pole widzenia (FOV) <span>${rng('fov', 45, 90, 1)}</span></div>
      <div class="set">Ograniczenie ruchu kamery (bez drgań) ${chk('reduceMotion')}</div>
      <h3>Sterowanie</h3>
      <div class="set">Czułość myszy <span>${rng('mouseSens', 0.3, 3, 0.05)}</span></div>
      <div class="set">Odwróć oś pionową ${chk('invertY')}</div>
      <div class="set">Krzywa ekspo drążka <span>${rng('expo', 0, 0.8, 0.05)}</span></div>
      <div class="set">Sprężyna drążka (powrót do środka) ${chk('stickSpring')}</div>
      <div class="set">Pad: martwa strefa <span>${rng('padDeadzone', 0, 0.35, 0.01)}</span></div>
      <div class="set">Pad: ekspo <span>${rng('padExpo', 0, 0.8, 0.05)}</span></div>
      <div id="keys"></div>
      <h3>Asysty i jednostki</h3>
      <div class="set">Asysta domyślna ${sel('assist', [['full', 'Pełna'], ['partial', 'Częściowa'], ['none', 'Brak']])}</div>
      <div class="set">Jednostki ${sel('units', [['metric', 'Metryczne (m, km/h, m/s)'], ['aviation', 'Lotnicze (ft, kt, ft/min)']])}</div>
      <h3>HUD</h3>
      <div class="set">Pasek prędkości pionowej przy ziemi ${chk('hudVsBar')}</div>
      <div class="set">Wektor wiatru ${chk('hudWind')}</div>
      <div class="set">Informacja o haku ${chk('hudHook')}</div>
      <div class="set">Strzałka kierunku do celu ${chk('hudArrow')}</div>
      <div class="set">Wskaźnik drążka/skoku ${chk('hudStick')}</div>
      <h3>Dźwięk</h3>
      <div class="set">Głośność <span>${rng('volume', 0, 1, 0.05)}</span></div></div>`;
    const keys = $('#keys', s);
    const drawKeys = () => { keys.innerHTML = `<h3>Klawisze</h3>` + Object.keys(DEFAULT_KEYS).map(k => `<div class="set">${KEY_LABELS[k]} <button class="btn small keybtn" data-key="${k}">${keyName(S.keys[k])}</button></div>`).join('') + `<div class="set"><span class="muted">Mysz: drążek cykliczny · środkowy przycisk: centrowanie · prawy + ruch: rozglądanie</span><button class="btn small" id="kreset">Domyślne</button></div>`;
      keys.querySelectorAll('[data-key]').forEach(b => b.onclick = () => { b.textContent = '…naciśnij klawisz'; this.app.input.onKeyCapture = code => { S.keys[b.dataset.key] = code; this.app.input.onKeyCapture = null; this.app.saveSettings(); drawKeys(); }; });
      $('#kreset', keys).onclick = () => { S.keys = { ...DEFAULT_KEYS }; this.app.saveSettings(); drawKeys(); }; };
    drawKeys();
    s.querySelectorAll('[data-k]').forEach(el => {
      el.oninput = el.onchange = () => {
        const k = el.dataset.k; let v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
        S[k] = v; const lab = s.querySelector(`[data-v="${k}"]`); if (lab) lab.textContent = v;
        this.app.saveSettings(); this.app.applySettings(k);
      };
    });
    s.querySelector('[data-a=back]').onclick = () => back();
    this.show('settings');
  }

  savecode(back) {
    const s = this.screens.savecode;
    s.innerHTML = `<div class="center card" style="width:min(640px,94vw)"><h2>Kod zapisu</h2><p class="muted small">Skopiuj kod, żeby przenieść postęp na inny komputer. Wklej kod i wczytaj, żeby go przywrócić.</p>
      <textarea id="code" spellcheck="false">${exportCode(this.app.save)}</textarea>
      <div class="row" style="margin-top:12px"><button class="btn" id="copy">Kopiuj</button><button class="btn" id="load">Wczytaj z pola</button><button class="btn" id="reset">Zacznij od nowa</button><button class="btn" data-a="back" style="margin-left:auto">Zamknij</button></div></div>`;
    $('#copy', s).onclick = () => { const t = $('#code', s); t.select(); try { navigator.clipboard?.writeText(t.value); } catch { /* */ } this.toast('Skopiowano'); };
    $('#load', s).onclick = () => { try { const sv = importCode($('#code', s).value); this.app.setSave(sv); this.toast('Wczytano zapis'); } catch (e) { this.toast('Błąd: ' + e.message); } };
    $('#reset', s).onclick = () => { if (confirm('Usunąć cały postęp?')) { this.app.resetSave(); this.toast('Postęp wyzerowany'); back(); } };
    s.querySelector('[data-a=back]').onclick = () => back();
    this.show('savecode');
  }

  controls(back) {
    const s = this.screens.controls, K = this.app.settings.keys, k = c => `<kbd>${esc(keyName(c))}</kbd>`;
    s.innerHTML = `<div class="center card" style="width:min(720px,94vw)"><h2>Sterowanie</h2>
      <div class="kv" style="margin-top:14px;grid-template-columns:220px 1fr;line-height:1.9">
      <span>Drążek cykliczny</span><b>mysz (kliknij w obraz, aby przechwycić kursor) · strzałki</b>
      <span>Centrowanie drążka</span><b>${k(K.center)} lub środkowy przycisk myszy</b>
      <span>Skok ogólny (góra/dół)</span><b>${k(K.collUp)} / ${k(K.collDown)} – dźwignia zostaje w ustawionej pozycji</b>
      <span>Pedały (obrót)</span><b>${k(K.pedLeft)} / ${k(K.pedRight)}</b>
      <span>Tryb precyzyjny</span><b>przytrzymaj ${k(K.precise)}</b>
      <span>Hak / wciągarka</span><b>${k(K.action)}</b>
      <span>Kamera</span><b>${k(K.camera)} · prawy przycisk + ruch: rozglądanie · kółko: odległość</b>
      <span>Restart misji</span><b>${k(K.restart)}</b>
      <span>HUD</span><b>${k(K.hud)}</b>
      <span>Pauza</span><b>${k(K.pause)}</b>
      <span>Pad</span><b>lewa gałka: skok + pedały · prawa: drążek · A: hak · Y: kamera</b></div>
      <p class="muted small" style="margin-top:14px">Asysta Częściowa: wychylenie drążka = zadane pochylenie śmigłowca. Puść drążek do środka, żeby się wypoziomować.</p>
      <button class="btn" data-a="back" style="margin-top:8px">Zamknij</button></div>`;
    s.querySelector('[data-a=back]').onclick = () => back();
    this.show('controls');
  }
}
