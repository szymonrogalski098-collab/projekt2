// Sesja lotu: śmigłowiec + wiatr + lina + ładunki + misja + asysta. Jedna ścieżka dla gracza, bota i replayu.
import { Vector3 } from 'three';
import { Heli } from '../sim/heli.js';
import { AIRCRAFT } from '../sim/aircraft.js';
import { Wind } from '../sim/wind.js';
import { Assist } from '../sim/assist.js';
import { Sling, Load, stepFreeLoad } from '../sim/sling.js';
import { MissionRun } from './mission.js';
import { resolvePoint } from './objectives.js';

export const DT = 1 / 120;

export class Session {
  constructor(ctx, def, opts = {}) {
    this.ctx = ctx; this.def = def;
    this.assistLevel = opts.assist || def.assist || 'partial';
    this.seed = opts.seed ?? 1;
    const spec = AIRCRAFT[opts.aircraft || def.aircraft || 'wrobel'];
    this.heli = new Heli(spec);
    const w = def.weather?.wind || {};
    this.wind = new Wind({ ...w, seed: (w.seed ?? 3) + this.seed * 7919 }, ctx.terrain);
    this.env = { wind: this.wind, world: ctx.world, dT: def.weather?.dT || 0 };
    this.assist = new Assist();
    this.tick = 0; this.t = 0;
    this.loads = (def.loads || []).map(o => {
      const p = resolvePoint({ ctx, session: this }, o.at);
      const l = new Load({ ...o });
      l.pos = [p.x, p.y + l.half + 0.01, p.z]; l.prev = [...l.pos]; l.onGround = true;
      return l;
    });
    // start
    const st = def.start || { at: 'pad:base1' };
    const p = resolvePoint({ ctx, session: this }, st.at);
    const heading = (st.heading || 0) * Math.PI / 180;
    const air = !!st.air;
    const y = air ? p.y + (st.agl || 50) : p.y - spec.skids.y + 0.02;
    this.heli.reset(new Vector3(p.x, y, p.z), heading, !air, { fuel: def.fuel ?? spec.fuel.cap * 0.6, cargo: def.cargo || 0 });
    if (air) { const v = st.speed || 0; this.heli.vel.set(Math.sin(heading) * v, 0, -Math.cos(heading) * v); this.heli.vi = 6; }
    this.fuel0 = this.heli.fuel;
    this.sling = null;
    if (def.line) {
      this.sling = new Sling(spec.line, spec.lineMaxLoad);
      const hk = this.heli.worldPoint(this.heli.externalAt, new Vector3());
      this.sling.reset([hk.x, hk.y, hk.z]);
      // lina leży na ziemi obok
      const g = ctx.world.ground(hk.x, hk.z, hk.y);
      for (let i = 1; i <= this.sling.n; i++) { const q = this.sling.nodes[i]; q[1] = Math.max(g.h + 0.05, hk.y - i * this.sling.seg); q[2] = hk.z + Math.max(0, i * this.sling.seg - (hk.y - g.h)); this.sling.prev[i] = [...q]; }
    }
    this.hookA = new Vector3(); this.hookB = new Vector3();
    this.controls = { collective: 0, cx: 0, cy: 0, pedal: 0 };
    this.mission = new MissionRun(def, this);
    this.events = [];
    this.record = opts.record !== false;
    this.frames = [];     // replay (co 2 ticki)
    this.chart = [];      // wykres (co 0,5 s)
    this.inputs = opts.logInputs ? [] : null;
  }

  // raw: {collective, collectiveAxis, cx, cy, pedal, action}
  step(raw) {
    const h = this.heli;
    if (this.inputs) this.inputs.push([raw.collective, raw.cx, raw.cy, raw.pedal, raw.action ? 1 : 0, raw.collectiveAxis || 0]);
    const c = this.assist.apply(this.assistLevel, h, raw, DT, this.controls);
    if (raw.action) this.action();
    if (this.sling) h.worldPoint(h.externalAt, this.hookA);
    const f = this.sling ? this.sling.force : null;
    if (f) h.external.set(f[0], f[1], f[2]); else h.external.set(0, 0, 0);
    h.step(DT, c, this.env);
    if (this.sling) {
      h.worldPoint(h.externalAt, this.hookB);
      const hub = h.worldPoint(new Vector3(0, h.spec.rotor.hubH, 0), new Vector3());
      this.sling.step(DT, [this.hookA.x, this.hookA.y, this.hookA.z], [this.hookB.x, this.hookB.y, this.hookB.z], this.env, this.t, { hub: [hub.x, hub.y, hub.z], R: h.spec.rotor.R, vi: h.tel.vi, rpm: h.rpm });
      if (this.sling.load && this.sling.load.mass > this.sling.maxLoad * 1.6 && this.sling.tension > this.sling.maxLoad * 9.81 * 2.5) { this.sling.release(); this.mission.fail('Zerwany hak – przeciążenie liny'); }
    }
    for (const l of this.loads) if (!this.sling || this.sling.load !== l) stepFreeLoad(l, DT, this.env);
    this.mission.update(DT, c);
    this.tick++; this.t += DT;
    if (this.record && (this.tick & 1) === 0) this._rec();
    if (this.tick % 60 === 0) this.chart.push([this.t, h.tel.agl, h.tel.ias, h.vel.y, h.rpm]);
  }

  action() {
    const s = this.sling; if (!s) return;
    if (s.load) { s.release(); this.events.push({ t: this.t, e: 'release' }); return; }
    for (const l of this.loads) if (s.canAttach(l)) {
      if (l.mass > s.maxLoad * 1.6) { this.mission.say(`Ładunek ${l.name} (${l.mass} kg) przekracza udźwig haka.`, 'sys'); return; }
      s.attach(l); this.events.push({ t: this.t, e: 'attach', id: l.id }); return;
    }
  }

  _rec() {
    const h = this.heli, s = this.sling, L = s?.load || this.loads[0];
    const hk = s ? s.hookPos : [0, 0, 0];
    this.frames.push([h.pos.x, h.pos.y, h.pos.z, h.quat.x, h.quat.y, h.quat.z, h.quat.w, h.rpm, this.controls.collective,
      hk[0], hk[1], hk[2], L ? L.pos[0] : 0, L ? L.pos[1] : 0, L ? L.pos[2] : 0, L ? L.yaw : 0]);
  }
}
