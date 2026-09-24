// Model lotu śmigłowca: bryła sztywna 6DOF, wirnik z teorią elementu łopaty + pędu (dynamiczny napływ),
// efekt przypowierzchniowy, siła nośna translacyjna, stan pierścienia wirowego, silnik z regulatorem obrotów,
// śmigło ogonowe, kadłub, podwozie płozowe z tarciem, kolizje łopat i kadłuba.
import { Vector3, Quaternion } from 'three';
import { atmosphere, G } from './atmosphere.js';
import { derived } from './aircraft.js';
import { smoothstep, clamp, vnoise3 } from '../core/noise.js';

const _v1 = new Vector3(), _v2 = new Vector3(), _v3 = new Vector3(), _v4 = new Vector3();
const _qi = new Quaternion();
const _wind = [0, 0, 0];

// indukowana prędkość w locie osiowym (empiryczna krzywa w zakresie pierścienia wirowego)
function viAxial(x) {
  if (x >= 0) return -x / 2 + Math.sqrt(x * x / 4 + 1);
  if (x >= -2) return 1 - 1.125 * x - 1.372 * x * x - 1.718 * x * x * x - 0.655 * x * x * x * x;
  return -x / 2 - Math.sqrt(x * x / 4 - 1);
}
// teoria pędu z prędkością w płaszczyźnie wirnika u (bisekcja, znormalizowane przez vh)
function viMomentum(x, y) {
  let lo = 0, hi = 4;
  for (let k = 0; k < 22; k++) {
    const m = (lo + hi) / 2, s = x + m;
    if (m * Math.sqrt(y * y + s * s) > 1) hi = m; else lo = m;
  }
  return (lo + hi) / 2;
}

export class Heli {
  constructor(spec) {
    this.spec = spec; this.d = derived(spec);
    this.pos = new Vector3(); this.vel = new Vector3(); this.quat = new Quaternion(); this.omega = new Vector3();
    this.acc = new Vector3();
    const s = spec.skids;
    this.skidPts = [];
    for (const x of [-s.x, s.x]) for (const z of [s.zf, (s.zf + s.zr) / 2, s.zr]) this.skidPts.push({ r: new Vector3(x, s.y, z), anchor: null, contact: false });
    this.rim = [];
    for (let i = 0; i < 12; i++) this.rim.push(i / 12 * Math.PI * 2);
    this.external = new Vector3(); this.externalAt = new Vector3(...spec.hook);
    this.reset(new Vector3(0, 1000, 0), 0, false);
  }

  get mass() { return this.spec.mass.empty + this.spec.mass.pilot + this.fuel + this.cargo; }

  reset(pos, heading = 0, onGround = true, opts = {}) {
    this.pos.copy(pos); this.vel.set(0, 0, 0); this.omega.set(0, 0, 0);
    this.quat.setFromAxisAngle(_v1.set(0, 1, 0), -heading);
    this.rpm = 1; this.vi = 0; this.vrs = 0; this.a1 = 0; this.b1 = 0;
    this.engineOn = opts.engineOn ?? true; this.engineFailed = false; this.Peng = 0;
    this.fuel = opts.fuel ?? this.spec.fuel.cap * 0.6;
    this.cargo = opts.cargo ?? 0;
    this.t = 0;
    this.damage = { gear: 0, rotor: 0, tail: 0, engine: 0, structure: 0 };
    this.crashed = null; this.crashInfo = null;
    this.engineTemp = 0.55;
    this.stats = { maxImpact: 0, lastImpact: 0, hardLandings: 0, touchdowns: 0, maxG: 1, vrsTime: 0, lowRpmTime: 0, overspeed: 0, maxVs: 0 };
    this.onGround = onGround; this.groundContacts = 0; this._impactNow = 0; this._wasContact = false;
    for (const p of this.skidPts) { p.anchor = null; p.contact = false; }
    this.tel = { T: 0, Preq: 0, Pav: 1, Q: 0, ias: 0, gs: 0, vs: 0, agl: 0, rho: 1.2, vh: 7, ge: 1, etl: 0, lee: 0, wind: [0, 0, 0], torque: 0, trMargin: 1, g: 1 };
    this.external.set(0, 0, 0);
    if (onGround) this.vi = 0;
  }

  // Orientacja: kurs (0 = północ, rośnie w prawo), pochylenie (+ nos w górę), przechylenie (+ w prawo)
  attitude(out = {}) {
    const f = _v1.set(0, 0, -1).applyQuaternion(this.quat);
    const r = _v2.set(1, 0, 0).applyQuaternion(this.quat);
    const u = _v3.set(0, 1, 0).applyQuaternion(this.quat);
    out.heading = Math.atan2(f.x, -f.z);
    out.pitch = Math.asin(clamp(f.y, -1, 1));
    out.roll = Math.atan2(-r.y, u.y);
    out.upY = u.y;
    return out;
  }
  worldPoint(rb, out) { return out.copy(rb).applyQuaternion(this.quat).add(this.pos); }
  pointVel(rb, out) { // prędkość punktu w świecie
    _v4.copy(this.omega).cross(rb).applyQuaternion(this.quat);
    return out.copy(this.vel).add(_v4);
  }

  crash(reason, info = {}) {
    if (this.crashed) return;
    this.crashed = reason; this.crashInfo = info;
  }

  // c: {collective 0..1, cx -1..1 (w prawo), cy -1..1 (do przodu), pedal -1..1 (w prawo)}
  step(dt, c, env) {
    const S = this.spec, D = this.d, R = S.rotor;
    this.t += dt;
    if (this.crashed) { this.vel.multiplyScalar(0.9); this.omega.multiplyScalar(0.9); this.rpm = Math.max(0, this.rpm - dt * 0.5); return; }
    const m = this.mass;
    const atm = atmosphere(this.pos.y, env.dT || 0);
    const rho = atm.rho;
    const qInv = _qi.copy(this.quat).invert();

    // --- wiatr i prędkość względem powietrza (w układzie ciała) ---
    const hub = this.worldPoint(_v1.set(0, R.hubH, 0), new Vector3());
    env.wind.sample(hub.x, hub.y, hub.z, this.t, _wind);
    const vaW = new Vector3(this.vel.x - _wind[0], this.vel.y - _wind[1], this.vel.z - _wind[2]);
    const vaB = vaW.clone().applyQuaternion(qInv);

    // --- podłoże pod piastą ---
    const gHub = env.world.ground(hub.x, hub.z, hub.y);
    const aglHub = hub.y - gHub.h;

    // --- obroty wirnika ---
    const Om = R.omega * this.rpm, tip = Math.max(1, Om * R.R);

    // --- przechylenie tarczy (cykliczny + odchylanie wsteczne + tłumienie od prędkości kątowych) ---
    const kQ = 16 / (R.lock * R.omega);
    const muF = -vaB.z / tip, muX = vaB.x / tip;
    const kBlow = 0.3;
    const rpmAuth = clamp(this.rpm * this.rpm, 0, 1.2);
    const a1t = c.cy * S.cyclic.long * rpmAuth - kBlow * muF + kQ * this.omega.x * this.rpm;
    const b1t = c.cx * S.cyclic.lat * rpmAuth - kBlow * muX + 0.06 * muF - kQ * -this.omega.z * this.rpm;
    const kf = Math.min(1, dt / S.cyclic.tau);
    this.a1 += (a1t - this.a1) * kf; this.b1 += (b1t - this.b1) * kf;
    const nB = new Vector3(Math.sin(this.b1), Math.cos(this.a1) * Math.cos(this.b1), -Math.sin(this.a1)).normalize();

    // --- aerodynamika wirnika ---
    const Vc = vaB.dot(nB);                                  // wznoszenie wzdłuż osi (+ w górę)
    const uIp = Math.sqrt(Math.max(0, vaB.lengthSq() - Vc * Vc));
    const mu = uIp / tip;
    const theta = R.thMin + (R.thMax - R.thMin) * clamp(c.collective, 0, 1);
    const lam = (Vc + this.vi) / tip;
    let CT = D.sigma * R.a / 2 * (theta / 3 * (1 + 1.5 * mu * mu) - lam / 2);
    // przeciągnięcie łopat przy niskich obrotach – gwałtowna utrata ciągu poniżej ~82%
    const rpmStall = 0.45 + 0.55 * smoothstep(S.rpm.stall - 0.12, S.rpm.stall + 0.03, this.rpm);
    const CTmax = D.sigma * 0.125 * (1 - 0.8 * mu * mu) * (1 - this.damage.rotor * 0.3) * rpmStall;
    let stall = 0;
    if (CT > 0.85 * CTmax) { const e = CT - 0.85 * CTmax; stall = e / CTmax; CT = 0.85 * CTmax + 0.15 * CTmax * Math.tanh(e / (0.15 * CTmax)); }
    if (CT < -0.3 * CTmax) CT = -0.3 * CTmax;
    let T = rho * D.A * tip * tip * CT;
    // efekt przypowierzchniowy (model Haydena: redukcja prędkości indukowanej), zanika z prędkością
    const vhPrev = Math.max(2, this.tel.vh);
    const zR = Math.max(0.7, aglHub / R.R);
    let ge = 0.9926 + 0.03794 * Math.pow(2 / zR, 2);
    ge = 1 + (ge - 1) / (1 + Math.pow(uIp / (1.3 * vhPrev), 2)) * (0.5 + 0.5 * gHub.n[1]);
    if (aglHub > 3 * R.R) ge = 1;
    // pierścień wirowy
    const vh = Math.sqrt(Math.max(50, Math.abs(T)) / (2 * rho * D.A));
    const xN = Vc / vh, yN = uIp / vh;
    const bell = clamp(1 - Math.pow((xN + 1.0) / 0.62, 2), 0, 1);
    const vrsT = bell * (1 - smoothstep(0.35, 0.95, yN)) * (T > 0 ? 1 : 0);
    this.vrs += (vrsT - this.vrs) * Math.min(1, dt / (vrsT > this.vrs ? 0.9 : 0.6));
    if (this.vrs > 0.02) {
      const fl = vnoise3(this.t * 2.3, 1.7, 0, 77);
      T *= 1 - this.vrs * (0.2 + 0.4 * clamp(c.collective, 0, 1)) + this.vrs * 0.14 * fl;
      if (this.vrs > 0.4) this.stats.vrsTime += dt;
    }
    // dynamiczny napływ
    const viT = vh / ge * (yN < 0.02 ? viAxial(xN) : (1 - smoothstep(0.2, 1.0, yN)) * viAxial(xN) + smoothstep(0.2, 1.0, yN) * viMomentum(xN, yN));
    this.vi += (viT - this.vi) * Math.min(1, dt / 0.11);
    const etl = smoothstep(4, 9, uIp) * (1 - smoothstep(9, 13, uIp)); // wibracje przejścia

    // --- moc ---
    const inflow = Vc + this.vi;
    const Pind = T * inflow * (inflow > 0 ? 1.1 : 1.0);
    const P0 = D.sigma * R.cd0 / 8 * rho * D.A * tip * tip * tip * (1 + 4.65 * mu * mu) * (1 + 6 * stall);
    // śmigło ogonowe
    const tl = S.tail;
    const rTr = _v2.set(0, tl.h, tl.arm);
    const vTr = _v3.copy(this.omega).cross(rTr).add(vaB);  // powietrze względem śmigła ogonowego
    const trPitch = tl.bias - c.pedal * tl.range;
    let Ttr = tl.kT * (rho / 1.225) * this.rpm * this.rpm * trPitch - tl.kv * (rho / 1.225) * this.rpm * vTr.x;
    Ttr *= 1 - this.damage.tail * 0.7;
    const Ptr = Math.pow(Math.abs(Ttr), 1.5) / Math.sqrt(2 * rho * D.Atr) * 1.25 + 0.012 * S.engine.P * this.rpm;
    const Preq = Pind + P0 + Ptr + 1500;

    // --- silnik i regulator obrotów ---
    const E = S.engine;
    let Pav;
    if (E.type === 'piston') Pav = E.P * clamp(E.lapse * atm.sigma - (E.lapse - 1), 0, 1.1);
    else Pav = Math.min(E.flat, E.P * Math.pow(atm.sigma, E.lapse) * clamp(1 - ((env.dT || 0) * 0.006), 0.8, 1.05));
    Pav *= 1 - this.damage.engine * 0.6;
    if (!this.engineOn || this.engineFailed || this.fuel <= 0) Pav = 0;
    const J = R.J;
    const Pcmd = clamp(Preq + J * R.omega * R.omega * (1 - this.rpm) * (0.7 / E.tau), 0, Pav);
    this.Peng += (Pcmd - this.Peng) * Math.min(1, dt / E.tau);
    if (this.Peng > Pav) this.Peng = Pav;
    const OmR = Math.max(1, Om);
    this.rpm += (this.Peng - Preq) / (J * OmR * R.omega) * dt;
    this.rpm = clamp(this.rpm, 0, 1.3);
    this.fuel = Math.max(0, this.fuel - this.Peng * S.fuel.sfc * dt);
    const load = this.Peng / Math.max(1, Pav);
    this.engineTemp += ((0.55 + 0.5 * Math.max(0, load - 0.6)) - this.engineTemp) * dt / 25;
    if (this.engineTemp > 0.95) this.damage.engine = Math.min(1, this.damage.engine + dt * 0.01);
    if (this.rpm < S.rpm.low && this.rpm > 0.3) this.stats.lowRpmTime += dt;
    if (this.rpm > S.rpm.over + 0.05) { this.damage.rotor = Math.min(1, this.damage.rotor + dt * 0.05); this.stats.overspeed += dt; }
    if (this.rpm < 0.62 && this.t > 0.5 && !this.onGround && this.tel.agl > 2.5) this.crash('Utrata obrotów wirnika', { rpm: this.rpm });

    // --- siły i momenty ---
    const Fw = new Vector3(0, -m * G, 0);       // świat
    const Mb = new Vector3();                   // ciało
    const addForceBody = (fb, rb) => { Mb.add(_v4.copy(rb).cross(fb)); Fw.add(fb.clone().applyQuaternion(this.quat)); };
    // ciąg wirnika na piaście + sztywność piasty
    const Tvec = nB.clone().multiplyScalar(T);
    addForceBody(Tvec, _v1.set(0, R.hubH, 0));
    Mb.add(_v4.set(0, 1, 0).cross(nB).multiplyScalar(R.hubK * this.rpm * this.rpm));
    // reakcja momentu obrotowego
    const Qm = Math.max(0, this.Peng - Ptr - 1500) / OmR;
    Mb.y -= Qm;
    // śmigło ogonowe
    addForceBody(new Vector3(Ttr, 0, 0), new Vector3(0, tl.h, tl.arm));
    // zakłócenia w pierścieniu wirowym
    if (this.vrs > 0.05) {
      Mb.x += this.vrs * T * 0.05 * vnoise3(this.t * 1.7, 3.3, 0, 78);
      Mb.z += this.vrs * T * 0.06 * vnoise3(this.t * 1.5, 5.1, 0, 79);
    }
    // opór kadłuba
    const vm = vaB.length();
    const dr = S.drag;
    const Fd = new Vector3(-0.5 * rho * vm * dr[0] * vaB.x, -0.5 * rho * vm * dr[1] * vaB.y, -0.5 * rho * vm * dr[2] * vaB.z);
    addForceBody(Fd, _v1.set(0, -0.2, 0.3));
    // statecznik pionowy i poziomy (stateczność kierunkowa i podłużna, tłumienie)
    const fin = S.fin;
    const rFin = new Vector3(0, 0.6, fin.arm);
    const vFin = _v3.copy(this.omega).cross(rFin).add(vaB);
    const vfm = Math.min(vFin.length(), 70);
    addForceBody(new Vector3(-0.5 * rho * fin.area * 2.4 * vFin.x * vfm, 0, 0), rFin);
    const rHs = new Vector3(0, 0.1, fin.hsArm);
    const vHs = _v3.copy(this.omega).cross(rHs).add(vaB);
    // strumień zaśmigłowy wirnika na stateczniku przy małych prędkościach
    const vHsY = vHs.y + this.vi * (1 - smoothstep(6, 16, uIp)) * 0.5;
    addForceBody(new Vector3(0, -0.5 * rho * fin.hs * 2.2 * vHsY * Math.min(70, Math.hypot(vHs.z, vHsY)), 0), rHs);
    // obciążenie zewnętrzne (lina)
    if (this.external.lengthSq() > 0) {
      Fw.add(this.external);
      Mb.add(_v4.copy(this.externalAt).cross(_v1.copy(this.external).applyQuaternion(qInv)));
    }

    // --- podwozie ---
    let contacts = 0, impact = 0;
    const g = { h: 0, n: [0, 1, 0], obj: null, water: false };
    const pw = new Vector3(), pv = new Vector3();
    for (const sp of this.skidPts) {
      this.worldPoint(sp.r, pw);
      env.world.ground(pw.x, pw.z, pw.y + 0.3, g);
      const n = g.n;
      const pen = (g.h - pw.y) * n[1];
      if (pen > -0.002 && !g.water) {
        this.pointVel(sp.r, pv);
        const vn = pv.x * n[0] + pv.y * n[1] + pv.z * n[2];
        if (!sp.contact) { impact = Math.max(impact, -vn); }
        sp.contact = true; contacts++;
        const k = m * G * 14, cd = 2 * 0.55 * Math.sqrt(k * m / 6);
        let Fn = Math.max(0, k * Math.max(0, pen) - cd * vn * (pen > 0 ? 1 : 0.2));
        if (pen > 0.25) Fn += (pen - 0.25) * k * 10;
        const F = new Vector3(n[0] * Fn, n[1] * Fn, n[2] * Fn);
        // tarcie z kotwicą (statyczne) – kierunek wzdłuż płozy łatwiejszy
        if (!sp.anchor) sp.anchor = pw.clone();
        const dx = pw.clone().sub(sp.anchor);
        const dn = dx.x * n[0] + dx.y * n[1] + dx.z * n[2];
        dx.x -= n[0] * dn; dx.y -= n[1] * dn; dx.z -= n[2] * dn;
        const vt = pv.clone(); vt.x -= n[0] * vn; vt.y -= n[1] * vn; vt.z -= n[2] * vn;
        const kt = k * 1.2, ct = cd * 1.2;
        const Ft = dx.multiplyScalar(-kt).addScaledVector(vt, -ct);
        const fwdW = _v3.set(0, 0, -1).applyQuaternion(this.quat);
        const along = Ft.dot(fwdW);
        const muA = 0.3, muS = 0.7;
        const fA = fwdW.clone().multiplyScalar(along), fS = Ft.clone().sub(fA);
        const limA = muA * Fn, limS = muS * Fn;
        let slip = false;
        if (Math.abs(along) > limA) { fA.multiplyScalar(limA / Math.abs(along)); slip = true; }
        const fsm = fS.length(); if (fsm > limS) { fS.multiplyScalar(limS / fsm); slip = true; }
        if (slip) sp.anchor.copy(pw).addScaledVector(fA.clone().add(fS), 1 / kt); // przesuń kotwicę (poślizg)
        F.add(fA).add(fS);
        Fw.add(F);
        Mb.add(_v4.copy(sp.r).cross(F.clone().applyQuaternion(qInv)));
      } else if (g.water && pen > 0) {
        this.crash('Wodowanie', {});
      } else { sp.contact = false; sp.anchor = null; }
    }
    if (impact > 0.05) {
      if (!this._wasContact) this.stats.touchdowns++;
      this.stats.lastImpact = impact;
      this.stats.maxImpact = Math.max(this.stats.maxImpact, impact);
      const gr = S.gear;
      if (impact > gr.crash) this.crash('Twarde przyziemienie', { vs: impact });
      else if (impact > gr.damage) { this.damage.gear = Math.min(1, this.damage.gear + 0.5); this.damage.structure += 0.2; this.stats.hardLandings++; }
      else if (impact > gr.hard) { this.damage.gear = Math.min(1, this.damage.gear + 0.15); this.stats.hardLandings++; }
      this.lastTouch = { impact, t: this.t, obj: g.obj ? g.obj.tag : null };
    }
    this._wasContact = contacts > 0;
    this.groundContacts = contacts;
    this.onGround = contacts >= 3;

    // --- integracja ---
    this.acc.copy(Fw).multiplyScalar(1 / m);
    this.vel.addScaledVector(this.acc, dt);
    this.pos.addScaledVector(this.vel, dt);
    const I = S.inertia;
    const w = this.omega;
    // tłumienie aerodynamiczne kadłuba + żyroskopowe
    Mb.x -= w.x * 40; Mb.y -= w.y * 60; Mb.z -= w.z * 25;
    const gx = (I[1] - I[2]) * w.y * w.z, gy = (I[2] - I[0]) * w.z * w.x, gz = (I[0] - I[1]) * w.x * w.y;
    w.x += (Mb.x + gx) / I[0] * dt; w.y += (Mb.y + gy) / I[1] * dt; w.z += (Mb.z + gz) / I[2] * dt;
    const q = this.quat;
    const hw = 0.5 * dt;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    q.x += hw * (qw * w.x + qy * w.z - qz * w.y);
    q.y += hw * (qw * w.y + qz * w.x - qx * w.z);
    q.z += hw * (qw * w.z + qx * w.y - qy * w.x);
    q.w += hw * (-qx * w.x - qy * w.y - qz * w.z);
    q.normalize();

    // przeciążenie
    const nLoad = (Fw.y + m * G) / (m * G) ;
    const gl = _v1.copy(Fw).addScaledVector(_v2.set(0, -1, 0), -m * G).applyQuaternion(qInv).y / (m * G);
    this.stats.maxG = Math.max(this.stats.maxG, gl);
    if (gl > 3.6 || gl < -1.2) { this.damage.structure += dt * 0.5; if (this.damage.structure > 1) this.crash('Przeciążenie konstrukcji', { g: gl }); }
    const ias = vaB.length();
    if (ias > S.vne) { this.damage.rotor = Math.min(1, this.damage.rotor + dt * 0.03 * (ias - S.vne)); this.damage.structure += dt * 0.01 * (ias - S.vne); }

    if (!isFinite(this.pos.x + this.pos.y + this.pos.z + this.vel.x + this.vel.y + this.vel.z + q.w)) {
      this.pos.set(0, 2000, 0); this.vel.set(0, 0, 0); this.quat.set(0, 0, 0, 1); this.omega.set(0, 0, 0);
      return this.crash('Błąd symulacji', {});
    }
    // --- kolizje: łopaty, śmigło ogonowe, kadłub ---
    this._collisions(env, nB, hub, ias);

    // --- telemetria ---
    const tel = this.tel;
    tel.T = T; tel.Preq = Preq; tel.Pav = Pav; tel.Peng = this.Peng; tel.torque = this.Peng / Math.max(1, E.type === 'piston' ? E.P : E.flat);
    tel.ias = ias; tel.gs = Math.hypot(this.vel.x, this.vel.z); tel.vs = this.vel.y;
    tel.rho = rho; tel.vh = vh; tel.ge = ge; tel.etl = etl; tel.lee = env.wind.lastLee || 0; tel.wind = [_wind[0], _wind[1], _wind[2]];
    tel.trMargin = 1 - clamp((trPitch + 0.3) / 1.3, 0, 1); tel.g = gl; tel.mu = mu; tel.Vc = Vc; tel.vi = this.vi;
    tel.aglHub = aglHub; tel.vrs = this.vrs; tel.stall = stall; tel.ctRatio = CT / CTmax;
    const gp = env.world.ground(this.pos.x, this.pos.z, this.pos.y);
    tel.agl = this.pos.y + S.skids.y - gp.h;
    tel.nLoad = nLoad;
  }

  _collisions(env, nB, hub, ias) {
    const S = this.spec, R = S.rotor, W = env.world;
    const nW = nB.clone().applyQuaternion(this.quat);
    const windSide = Math.abs(this.tel.wind[0] * Math.cos(this.attitude().heading) + this.tel.wind[2] * Math.sin(this.attitude().heading));
    if (this.rpm > 0.15) {
      // obręcz wirnika
      const e1 = new Vector3(1, 0, 0).applyQuaternion(this.quat); e1.addScaledVector(nW, -e1.dot(nW)).normalize();
      const e2 = nW.clone().cross(e1);
      const p = new Vector3();
      for (const a of this.rim) {
        const rr = R.R * 0.97;
        p.copy(hub).addScaledVector(e1, Math.cos(a) * rr).addScaledVector(e2, Math.sin(a) * rr);
        const gh = env.world.terrain.height(p.x, p.z);
        if (p.y < gh) return this.crash('Uderzenie łopat o teren', { wind: windSide });
        const tag = W.hit(p.x, p.y, p.z, 0.08);
        if (tag) return this.crash('Uderzenie łopat: ' + tag, { wind: windSide });
      }
      const wt = W.diskHitsWire([hub.x, hub.y, hub.z], [nW.x, nW.y, nW.z], R.R);
      if (wt) return this.crash('Wirnik zahaczył o ' + wt, { wind: windSide });
      // śmigło ogonowe
      const tp = this.worldPoint(new Vector3(0, S.tail.h, S.tail.arm + 0.1), new Vector3());
      const tg = env.world.ground(tp.x, tp.z, tp.y + 0.2);
      if (tp.y - S.tail.R < tg.h) {
        if (!tg.water) return this.crash('Uderzenie śmigła ogonowego o ziemię', { wind: windSide });
      }
      const tt = W.hit(tp.x, tp.y, tp.z, S.tail.R);
      if (tt) return this.crash('Uderzenie śmigła ogonowego: ' + tt, { wind: windSide });
    }
    // kadłub
    const pv = new Vector3(), pw = new Vector3();
    for (const f of S.fuselage) {
      const rb = new Vector3(f[0], f[1], f[2]);
      this.worldPoint(rb, pw);
      const g = W.ground(pw.x, pw.z, pw.y + 0.5);
      if (pw.y - f[3] < g.h - 0.05) {
        this.pointVel(rb, pv);
        const vn = -(pv.x * g.n[0] + pv.y * g.n[1] + pv.z * g.n[2]);
        if (vn > 2.5 || pv.length() > 12 || g.water) return this.crash(g.water ? 'Wodowanie' : 'Zderzenie kadłuba z ziemią', { v: Math.max(vn, 0) });
        // miękki kontakt – wypchnij
        this.pos.y += (g.h - (pw.y - f[3])) * 0.5; if (this.vel.y < 0) this.vel.y *= 0.5;
      }
      const tag = W.hit(pw.x, pw.y, pw.z, f[3], ias > 1);
      if (tag) { this.pointVel(rb, pv); if (pv.length() > 1.5) return this.crash('Zderzenie: ' + tag, { v: pv.length() }); }
    }
  }
}
