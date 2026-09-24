// Autopilot referencyjny: kaskada PID (pozycja -> prędkość -> postawa -> sterowanie) + tłumienie wahadła ładunku.
// Steruje WYŁĄCZNIE przez wirtualne wejścia gracza (drążek/skok/pedały/Spacja) z asystą Częściową.
// Tryb naive: bez kompensacji wiatru (brak całkowania) i bez tłumienia wahadła – test "zbyt łatwe".
import { clamp } from '../core/noise.js';
import { ATT_MAX } from '../sim/assist.js';
import { G } from '../sim/atmosphere.js';
import { planRoute } from './planner.js';
import { atmosphere } from '../sim/atmosphere.js';

const wrapPi = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

// Przybliżony pułap zawisu poza wpływem ziemi dla bieżącej masy (+ ładunek zewnętrzny)
export function hoverCeiling(h, extra = 0) {
  const S = h.spec, D = h.d, T = (h.mass + extra + 15) * G;
  for (let alt = 500; alt < 5000; alt += 50) {
    const at = atmosphere(alt);
    const Pind = 1.12 * T * Math.sqrt(T / (2 * at.rho * D.A));
    const P0 = D.sigma * S.rotor.cd0 / 8 * at.rho * D.A * D.tip ** 3;
    const Preq = (Pind + P0) * 1.07 + 1500;
    const E = S.engine;
    const Pav = E.type === 'piston' ? E.P * (E.lapse * at.sigma - (E.lapse - 1)) : Math.min(E.flat, E.P * Math.pow(at.sigma, E.lapse));
    if (Pav < Preq * 1.04) return alt;
  }
  return 5000;
}

export class Autopilot {
  constructor(session, opts = {}) {
    this.s = session; this.naive = !!opts.naive;
    this.lever = session.controls?.collective || 0; this.colI = Math.max(0.45, this.lever); this.ivx = 0; this.ivz = 0;
    this.rate = opts.leverRate ?? 0.8;
    this.phase = ''; this.wait = 0; this.lastObj = -1; this.hdgDes = null;
    this.raw = { collective: 0, collectiveAxis: 0, cx: 0, cy: 0, pedal: 0, action: false };
    this.cruise = opts.cruise ?? 30;
    this._att = {};
    this.ceiling = hoverCeiling(session.heli, (session.loads[0]?.mass || 0)) + 100;
  }

  step() {
    const s = this.s, h = s.heli, run = s.mission, raw = this.raw;
    raw.action = false;
    const o = run.current;
    if (!o || run.status !== 'running') { this._holdGround(); return raw; }
    if (run.idx !== this.lastObj) { this.lastObj = run.idx; this.phase = ''; this.wait = 0; this.route = null; }
    const tg = o.botTarget(run);
    const dt = 1 / 120;
    const a = h.attitude(this._att);
    const pos = h.pos, vel = h.vel;
    const sl = s.sling, load = sl?.load || null;
    const carrying = !!load;
    const lineLen = sl ? sl.length + (carrying ? sl.strap + load.size[1] : 0) : 0;

    // ---------- wybór celu (xz, wysokość bezwzględna y, prędkość maks.) ----------
    let tx = tg.x, tz = tg.z, ty = tg.y, vmax = carrying ? 13 : this.cruise, adec = carrying ? 0.45 : 1.6, pass = !!tg.pass;
    let vsDownMax = 3, faceTarget = true, wantHeading = null;
    const skid = h.spec.skids.y;
    const dx0 = tg.x - pos.x, dz0 = tg.z - pos.z, dist0 = Math.hypot(dx0, dz0);

    if (tg.mode === 'hover') { ty = tg.y - skid; if (dist0 < 30) faceTarget = false; }
    if (tg.mode === 'turn') { tx = pos.x; tz = pos.z; ty = Math.max(pos.y, s.ctx.world.ground(pos.x, pos.z, pos.y).h - skid + 4); faceTarget = false; wantHeading = Math.atan2(tg.face.x - pos.x, -(tg.face.z - pos.z)); }
    if (tg.mode === 'fly') { pass = true; }
    if (tg.mode === 'gate') {
      const nx = Math.sin(tg.dir), nz = -Math.cos(tg.dir);
      const rx = pos.x - tg.x, rz = pos.z - tg.z;
      const along = rx * nx + rz * nz;
      if (along > 15 || this.phase === 'reset') {
        // przeleciany obok – zawróć na podejście
        this.phase = along < -160 ? '' : 'reset';
        tx = tg.x - nx * 220; tz = tg.z - nz * 220; ty = tg.y + 10;
      } else {
        const L = 90;
        const a2 = Math.max(along, -400);
        tx = tg.x + nx * (a2 + L); tz = tg.z + nz * (a2 + L);
        if (along < -250) { tx = tg.x - nx * 150; tz = tg.z - nz * 150; }
        ty = tg.y; vmax = along > -300 ? 20 : vmax;
      }
      pass = true;
    }
    let landing = false, hooking = false, delivering = false;
    if (tg.mode === 'land') {
      landing = true;
      const hAbove = pos.y + skid - tg.y;
      const d = dist0;
      if (d > 30) {
        // ścieżka podejścia ~8°, prędkość malejąca z odległością
        ty = tg.y + 6 + (d - 30) * 0.14 - skid;
        vmax = Math.min(vmax, Math.sqrt(2 * 0.9 * (d - 20)) + 1.5); adec = 0.9; pass = true;
        // za wysoko nad ścieżką: zniżanie po okręgu wokół celu
        const tooHigh = hAbove - ((Math.min(d, 600) - 30) * 0.14 + 6);
        if (this.phase === 'orbit' ? tooHigh > 15 : (tooHigh > 90 && d < 900)) {
          this.phase = 'orbit';
          const R0 = 320, ang = Math.atan2(pos.z - tg.z, pos.x - tg.x) + 0.55;
          tx = tg.x + Math.cos(ang) * R0; tz = tg.z + Math.sin(ang) * R0;
          ty = pos.y - 60; vmax = 24; pass = true; vsDownMax = 5.5;
        } else if (this.phase === 'orbit') this.phase = '';
      } else {
        ty = tg.y + Math.max(1.5, Math.min(8, (d - 3) * 0.5)) - skid;
        faceTarget = false;
        if (d < 1.5 && Math.hypot(vel.x, vel.z) < 0.8) this.phase = 'descend';
        if (this.phase === 'descend' && d > 3.5) this.phase = '';
        if (this.phase === 'descend') ty = tg.y - skid - 1.5;
        vsDownMax = hAbove > 15 ? 2.0 : hAbove > 6 ? 1.4 : hAbove > 1.5 ? 0.7 : 0.35;
      }
    }
    if (tg.mode === 'hook' && sl) {
      hooking = true;
      const hk = sl.hookPos;
      const top = tg.y;
      const ex = tg.x - hk[0], ez = tg.z - hk[2];
      const he = Math.hypot(ex, ez);
      if (dist0 > 40) { ty = Math.max(top + sl.length + 12, pos.y); }
      else {
        const hkA = sl.nodes[0];
        this.hookOff = this.hookOff || [0, 0];
        this.hookOff[0] += ((hk[0] - hkA[0]) - this.hookOff[0]) * 0.01; this.hookOff[1] += ((hk[2] - hkA[2]) - this.hookOff[1]) * 0.01;
        tx = tg.x - this.hookOff[0]; tz = tg.z - this.hookOff[1]; faceTarget = false;
        const hv = sl.hookVel(1 / 120);
        const settle = he < 1.0 && Math.hypot(hv[0], hv[2]) < 1.2 && Math.hypot(vel.x, vel.z) < 0.6;
        ty = pos.y + (top + (settle ? 0.2 : 2.5) - hk[1]);
        vsDownMax = 0.8;
        if (s.sling.canAttach(tg.load) && Math.hypot(hv[0], hv[2]) < 1.5) raw.action = true;
      }
      adec = 0.8; vmax = 14;
    }
    if (tg.mode === 'deliver' && sl && load) {
      delivering = true;
      const ex = tg.x - load.pos[0], ez = tg.z - load.pos[2];
      const le = Math.hypot(ex, ez);
      const loadAgl = load.pos[1] - load.half - s.ctx.world.ground(load.pos[0], load.pos[2], load.pos[1]).h;
      if (dist0 > 60) { ty = tg.y + lineLen + 22; }
      else {
        faceTarget = false;
        tx = pos.x + ex; tz = pos.z + ez;
        const lv = Math.hypot(load.vel[0], load.vel[2]);
        if (this.phase === '' && le < 1.6 && lv < 0.7 && Math.hypot(vel.x, vel.z) < 0.8) this.phase = 'lower';
        if (this.phase === 'lower' && le > 3) this.phase = '';
        if (this.phase === 'lower') {
          ty = pos.y - (loadAgl + 0.3) - 1.5; vsDownMax = loadAgl > 6 ? 1.0 : loadAgl > 2 ? 0.5 : 0.25;
          if (load.onGround && sl.tension < load.mass * G * 0.35) { this.wait += dt; if (this.wait > 0.4) raw.action = true; }
          else this.wait = 0;
        } else ty = pos.y - loadAgl + Math.max(3, Math.min(20, le * 0.3 + 3));
      }
    }

    // ---------- trasa (A*) dla dalekich celów ----------
    let routing = false;
    if (dist0 > 450 && tg.mode !== 'turn' && tg.mode !== 'gate' && this.phase !== 'orbit') {
      if (!this.route || this.routeFor !== run.idx || this.routeReplan-- <= 0) {
        const clearR = carrying ? lineLen + 30 : 45;
        this.route = planRoute(s.ctx, { x: pos.x, z: pos.z, y: pos.y }, { x: tg.x, z: tg.z, y: tg.y }, { clear: clearR, ceiling: this.ceiling || 2300 });
        this.routeFor = run.idx; this.routeI = 1; this.routeReplan = 120 * 20;
      }
      const R = this.route;
      while (this.routeI < R.length - 1 && Math.hypot(R[this.routeI].x - pos.x, R[this.routeI].z - pos.z) < 160) this.routeI++;
      if (this.routeI < R.length - 1) {
        const wp = R[this.routeI];
        // wysokość: wymagana na bieżącym i następnym odcinku, ale nie wyżej niż ścieżka schodzenia do celu
        let rem = Math.hypot(wp.x - pos.x, wp.z - pos.z);
        for (let q = this.routeI; q < R.length - 1; q++) rem += Math.hypot(R[q + 1].x - R[q].x, R[q + 1].z - R[q].z);
        const glide = tg.y + 30 + rem * 0.22;
        const need = Math.max(wp.alt, Math.hypot(wp.x - pos.x, wp.z - pos.z) < 400 ? (R[this.routeI + 1]?.alt ?? 0) : 0);
        tx = wp.x; tz = wp.z; ty = Math.max(need, Math.min(glide, Math.max(need, pos.y))) - skid; pass = true; faceTarget = true; routing = true;
      }
    }
    // ---------- teren i przeszkody po drodze ----------
    const dxT = tx - pos.x, dzT = tz - pos.z, distT = Math.hypot(dxT, dzT);
    const W = s.ctx.world;
    if (!isFinite(distT)) return raw;
    const ahead = Math.min(distT, landing || hooking || delivering ? Math.max(0, distT - 60) : 700);
    const clear = (carrying ? lineLen + 20 : 28) - (landing && dist0 < 400 ? 14 : 0);
    if (!this._scanT || this._scanT-- <= 0) {
      this._scanT = 15; let minY = -1e9, spLim = 99;
      const vsClimb = carrying ? 2.2 : 3.2;
      for (let d = 0; d <= ahead + 1; d += 30) {
        const px = pos.x + dxT / (distT || 1) * d, pz = pos.z + dzT / (distT || 1) * d;
        const top = W.obstacleTop(px, pz, 25) + clear - skid;
        minY = Math.max(minY, top);
        const rise = top - 16 - pos.y;
        if (rise > 0) spLim = Math.min(spLim, d < 150 ? Math.max(0, (d - 50) / rise * vsClimb) : Math.max(10, (d - 50) / rise * vsClimb));
      }
      this._here = W.obstacleTop(pos.x, pos.z, 20);
      this._minY = minY; this._spLim = spLim;
    }
    let minY = this._minY;
    const precise = ((tg.mode === 'hover' || tg.mode === 'turn' || landing || hooking || delivering) && distT < 90) || (tg.mode === 'gate' && dist0 < 450);
    if (tg.mode === 'gate' && dist0 < 450) ty = Math.max(ty, this._here + 8);
    if (!precise) minY = Math.max(minY, this._here + (carrying ? lineLen + 8 : 10));
    if (!precise) ty = Math.max(ty, minY);
    // przelot: nie zwalniaj, utrzymuj wysokość przelotową
    const gHere = s.ctx.terrain.height(pos.x, pos.z);

    // ---------- prędkość zadana ----------
    let vdx = 0, vdz = 0;
    if (distT > 0.05) {
      let sp = pass ? vmax : Math.min(vmax, Math.sqrt(2 * adec * Math.max(0, distT - 0.3)) + 0.02, distT * 0.6);
      // teren przed nami: ogranicz prędkość tak, by zdążyć nabrać wysokości
      if (!precise) sp = Math.min(sp, this._spLim ?? 99);
      vdx = dxT / distT * sp; vdz = dzT / distT * sp;
    }
    // ---------- regulator prędkości -> przyspieszenie -> postawa ----------
    const kv = carrying ? 0.35 : 0.45, ki = this.naive ? 0 : (carrying ? 0.03 : 0.06);
    let ax = (vdx - vel.x) * kv, az = (vdz - vel.z) * kv;
    this.ivx = clamp(this.ivx + (vdx - vel.x) * ki * dt, -2.5, 2.5);
    this.ivz = clamp(this.ivz + (vdz - vel.z) * ki * dt, -2.5, 2.5);
    ax += this.ivx; az += this.ivz;
    // kompensacja wiatru (znana prędkość powietrza) – tylko autopilot referencyjny
    if (!this.naive) {
      const wv = h.tel.wind; const dragK = 0.012;
      ax -= (wv[0] - 0) * dragK * Math.hypot(wv[0], wv[2]) * 0.5; az -= wv[2] * dragK * Math.hypot(wv[0], wv[2]) * 0.5;
    }
    // tłumienie wahadła (ładunek lub pusty hak)
    if (sl && !this.naive && !(h.onGround)) {
      const hk = sl.nodes[0], e = carrying ? load.pos : sl.hookPos;
      const ev = carrying ? load.vel : sl.hookVel(1 / 120);
      const hang = e[1] < hk[1] - 2 && !(carrying && load.onGround) && !(!carrying && sl.hookContact);
      if (hang) {
        const g1 = carrying ? 0.35 : 0.25, g2 = carrying ? 0.5 : 0.4;
        ax += (e[0] - hk[0]) * g1 + (ev[0] - vel.x) * g2; az += (e[2] - hk[2]) * g1 + (ev[2] - vel.z) * g2;
      }
    }
    const amax = carrying ? 2.2 : 4;
    const am = Math.hypot(ax, az); if (am > amax) { ax *= amax / am; az *= amax / am; }
    // kurs
    let hd = a.heading;
    if (wantHeading !== null) hd = wantHeading;
    else if (faceTarget && distT > 60) hd = Math.atan2(dxT, -dzT);
    else if (this.hdgDes !== null) hd = this.hdgDes;
    if (tg.mode !== 'turn' && !faceTarget) {
      // w zawisie: nosem pod wiatr (jeśli wieje)
      const wv = h.tel.wind; if (Math.hypot(wv[0], wv[2]) > 2.5 && !h.onGround) hd = Math.atan2(-wv[0], wv[2]);
    }
    if (h.onGround && !(landing && this.phase === 'descend')) hd = a.heading;
    this.hdgDes = hd;
    const aglNow = pos.y + skid - gHere;
    const ch = Math.cos(a.heading), sh = Math.sin(a.heading);
    const aF = ax * sh - az * ch, aR = ax * ch + az * sh;
    let desPitch = -Math.atan2(aF, G), desRoll = Math.atan2(aR, G);
    const tiltMax = (4 + Math.max(0, aglNow) * 2.5) * Math.PI / 180;
    desPitch = clamp(desPitch, -tiltMax, tiltMax); desRoll = clamp(desRoll, -tiltMax, tiltMax);
    if (h.onGround) { desPitch = 0; desRoll = 0; }
    raw.cy = clamp(-desPitch / ATT_MAX.pitch, -1, 1);
    raw.cx = clamp(desRoll / ATT_MAX.roll, -1, 1);
    // pedały
    const he = wrapPi(hd - a.heading);
    const rateCmd = aglNow < 2.5 ? 0 : clamp(he * 1.3, -0.45, 0.45);   // kurs rośnie w prawo, omega.y = -tempo zmiany kursu
    raw.pedal = clamp((rateCmd + h.omega.y) * 1.5 + this._pedTrim(h), -1, 1);
    if (h.onGround && landing && this.phase === 'descend') raw.pedal = clamp(this._pedTrim(h) + h.omega.y * 0.5, -1, 1);

    // ---------- pion ----------
    const gsNow = Math.hypot(vel.x, vel.z);
    if (!landing || dist0 > 60) vsDownMax = Math.max(vsDownMax, gsNow > 16 ? 6.5 : gsNow > 11 ? 3.5 : vsDownMax);
    let vsCmd = clamp((ty - pos.y) * 0.45, -vsDownMax, aglNow < 3 ? 1.2 : gsNow > 12 ? 7 : 5);
    const gs = Math.hypot(vel.x, vel.z);
    if (gs < 10 && vsCmd < -2.2) vsCmd = -2.2; // ochrona przed wirem pierścieniowym
    let target;
    if (landing && this.phase === 'descend' && h.onGround) {
      target = 0; this.colI = Math.max(0.3, this.colI - dt * 0.4);
    } else {
      // z ładunkiem na linie: filtrowana prędkość pionowa i mniejsze wzmocnienie (bez pobudzania „bungee”)
      this.vsF = this.vsF === undefined ? vel.y : this.vsF + (vel.y - this.vsF) * Math.min(1, dt / (sl ? 0.25 : 0.05));
      const kP = sl ? 0.06 : 0.09, kI = sl ? 0.1 : 0.12;
      this.colI = clamp(this.colI + (vsCmd - this.vsF) * kI * dt, 0.15, 0.95);
      target = clamp(this.colI + (vsCmd - this.vsF) * kP, 0, 1);
      if (h.onGround && vsCmd > 0) { target = Math.max(target, this.lever + 0.004); this.colI = Math.max(this.colI, this.lever); }
      if (h.rpm < 0.975) { target = Math.min(target, this.lever - (0.975 - h.rpm) * 8 * dt); this.colI = Math.min(this.colI, this.lever); }
    }
    const dl = clamp(target - this.lever, -this.rate * dt, this.rate * dt);
    this.lever = clamp(this.lever + dl, 0, 1);
    raw.collective = this.lever;
    this.dbg = { tx, tz, ty, vsCmd, phase: this.phase, mode: tg.mode, hd, aglNow };
    return raw;
  }
  _holdGround() {
    const h = this.s.heli, raw = this.raw;
    raw.cx = 0; raw.cy = 0; raw.pedal = clamp(this._pedTrim(h) + h.omega.y * 0.5, -1, 1);
    if (h.onGround) this.lever = Math.max(0, this.lever - 0.8 / 120);
    raw.collective = this.lever;
  }
  _pedTrim(h) {
    const tl = h.spec.tail, S = h.spec;
    const Q = Math.max(0, h.tel.Peng || 0) / (S.rotor.omega * Math.max(0.3, h.rpm));
    const need = Q / tl.arm / (tl.kT * (h.tel.rho / 1.225) * Math.max(0.3, h.rpm * h.rpm));
    return clamp((tl.bias - need) / tl.range, -1, 1);
  }
}
