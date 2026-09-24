// Przebieg misji: sekwencja celów, warunki porażki, podpowiedzi kontekstowe, wynik i medale.
import { makeObjective } from './objectives.js';
import REF from './medals-ref.js';

const fmt1 = v => v.toFixed(1).replace('.', ',');

export function medalThresholds(def) {
  const ref = REF[def.id] || def.refTime || 300;
  const m = def.medals || {};
  const silver = { time: Math.ceil(ref * 1.6), impact: 1.0, ...(m.silver || {}) };
  const gold = { time: Math.ceil(ref * 1.15), impact: 0.6, noDamage: true, ...(m.gold || {}) };
  if (silver.time === 'ref') silver.time = Math.ceil(ref * 1.6);
  if (gold.time === 'ref') gold.time = Math.ceil(ref * 1.15);
  return { silver, gold, ref };
}

export class MissionRun {
  constructor(def, session) {
    this.def = def; this.session = session; this.ctx = session.ctx; this.heli = session.heli;
    this.objs = def.objectives.map(makeObjective);
    this.idx = 0; this.time = 0; this.status = 'running'; this.failReason = null;
    this.landings = []; this.deliveries = []; this.penalties = {}; this.notes = [];
    this.radio = []; this.hintsGiven = new Set();
    this.controls = { collective: 0 }; this.assistLevel = session.assistLevel;
    this.counters = { hard: 0, lowRpm: 0, idleGround: 0, vrs: 0, drift: 0 };
    this.objs[0]?.init(this);
    if (def.radio?.start) this.say(def.radio.start, 'instr');
    const f = this.objs[0]; if (f?.def.radio) this.say(f.def.radio, 'instr');
  }
  get current() { return this.objs[this.idx] || null; }
  say(text, who = 'baza') { this.radio.push({ text, who, t: this.time }); }
  note(t) { this.notes.push(t); this.say(t, 'sys'); }
  penalty(k) { this.penalties[k] = (this.penalties[k] || 0) + 1; }
  fail(reason) { if (this.status !== 'running') return; this.status = 'failed'; this.failReason = reason; }
  recordLanding(l) { this.landings.push(l); }
  recordDelivery(d) { this.deliveries.push(d); }

  update(dt, controls) {
    if (this.status !== 'running') return;
    this.controls = controls;
    this.time += dt;
    const h = this.heli, d = this.def;
    if (h.crashed) return this.fail(this.crashText());
    if (d.limits?.time && this.time > d.limits.time) return this.fail('Przekroczony limit czasu');
    if (h.fuel <= 0 && !h.onGround) this.hint('fuel', 'Brak paliwa! Silnik staje – autorotacja: skok w dół, utrzymaj prędkość.');
    if (Math.max(Math.abs(h.pos.x), Math.abs(h.pos.z)) > 4300) return this.fail('Opuszczono rejon lotów');
    if (this.session.sling?.load?.broken) return this.fail('Ładunek uszkodzony');
    const o = this.current;
    if (o && o.update(this, dt)) {
      this.idx++;
      const n = this.current;
      if (n) { n.init(this); if (n.def.radio) this.say(n.def.radio, 'instr'); }
      else { this.status = 'success'; if (d.radio?.success) this.say(d.radio.success, 'instr'); }
    }
    this.contextHints(dt);
  }

  hint(key, text, once = true) {
    if (once && this.hintsGiven.has(key)) return;
    this.hintsGiven.add(key); this.say(text, 'hint');
  }
  contextHints(dt) {
    const h = this.heli, c = this.counters;
    if (h.stats.hardLandings >= 3) this.hint('hard', 'Trzy twarde przyziemienia. Przy ziemi opadaj wolniej niż 0,5 m/s – patrz pasek prędkości pionowej po prawej.');
    if (h.onGround && this.controls.collective < 0.3 && this.idx === 0 && this.objs[0]?.def.type !== 'land') {
      c.idleGround += dt; if (c.idleGround > 7) this.hint('lift', 'Przytrzymaj W, żeby płynnie podnieść skok ogólny. Śmigłowiec oderwie się przy ok. połowie skali.');
    }
    if (h.rpm < h.spec.rpm.low && !h.onGround) { c.lowRpm += dt; if (c.lowRpm > 1.2) this.hint('rpm', 'Spadają obroty wirnika – żądasz więcej mocy, niż ma silnik. Opuść skok (S).'); }
    if (h.vrs > 0.5) { c.vrs += dt; if (c.vrs > 1) this.hint('vrs', 'Wir pierścieniowy! Więcej skoku nie pomoże – daj drążek do przodu, nabierz prędkości.'); }
    if (!h.onGround && h.tel.agl < 20 && Math.hypot(h.vel.x, h.vel.z) > 3 && this.objs[this.idx]?.def.type === 'hover') {
      c.drift += dt; if (c.drift > 8) this.hint('drift', 'Dryfujesz. Drążek (mysz) ustawia pochylenie – małe ruchy i cierpliwość. Środkowy przycisk / X centruje drążek.');
    } else c.drift = 0;
  }

  crashText() {
    const h = this.heli, i = h.crashInfo || {};
    let s = h.crashed;
    if (i.vs) s += ` (${fmt1(i.vs)} m/s)`;
    if (i.wind > 3) s += ` przy ${fmt1(i.wind)} m/s wiatru bocznego`;
    if (i.v) s += ` przy ${fmt1(i.v)} m/s`;
    if (i.g) s += ` (${fmt1(i.g)} g)`;
    if (h.stats.vrsTime > 0.5 && /teren|Twarde|kadłuba/.test(s)) s += ' — wir pierścieniowy';
    return s;
  }

  result() {
    const h = this.heli, th = medalThresholds(this.def);
    const maxImpact = Math.max(0, ...this.landings.map(l => l.impact || 0));
    const dmg = h.damage.gear + h.damage.rotor + h.damage.tail + h.damage.engine + h.damage.structure;
    const maxDist = Math.max(0, ...this.landings.map(l => l.dist), ...this.deliveries.map(d => d.dist));
    const loadImpact = Math.max(0, ...this.deliveries.map(d => d.impact || 0));
    const r = {
      id: this.def.id, success: this.status === 'success', reason: this.failReason, time: this.time,
      maxImpact, damage: dmg, maxDist, loadImpact, hardLandings: h.stats.hardLandings, penalties: this.penalties,
      assist: this.assistLevel, fuelUsed: this.session.fuel0 - h.fuel, thresholds: th, medal: 0, why: [],
    };
    if (!r.success) return r;
    r.medal = 1;
    const chk = (m, name) => {
      const why = [];
      if (r.time > m.time) why.push(`czas ${Math.round(r.time)} s > ${m.time} s`);
      if (m.impact != null && r.maxImpact > m.impact) why.push(`przyziemienie ${fmt1(r.maxImpact)} > ${fmt1(m.impact)} m/s`);
      if (m.dist != null && r.maxDist > m.dist) why.push(`precyzja ${fmt1(r.maxDist)} > ${fmt1(m.dist)} m`);
      if (m.loadImpact != null && r.loadImpact > m.loadImpact) why.push(`odstawienie ładunku ${fmt1(r.loadImpact)} > ${fmt1(m.loadImpact)} m/s`);
      if (m.noDamage && dmg > 0.001) why.push('uszkodzenia');
      if (Object.keys(this.penalties).length && m.noPenalty !== false && name === 'złoto') why.push('ominięte bramki');
      return why;
    };
    const ws = chk(th.silver, 'srebro');
    if (!ws.length) {
      r.medal = 2;
      const wg = chk(th.gold, 'złoto');
      if (this.assistLevel === 'full') wg.push('asysta Pełna');
      if (!wg.length) r.medal = 3; else r.why = wg;
    } else r.why = ws;
    return r;
  }
}
