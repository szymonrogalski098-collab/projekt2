// Lina zewnętrzna (long line): łańcuch mas połączonych sprężystymi odcinkami (całkowanie Verleta, podkroki),
// hak na końcu, ładunek jako bryła (masa + obrót wokół pionu, opór, kontakt z ziemią).
import { vnoise3 } from '../core/noise.js';
import { G } from './atmosphere.js';

const SUB = 6;

export class Load {
  constructor(o) {
    this.kind = o.kind || 'crate';
    this.name = o.name || 'Skrzynia';
    this.mass = o.mass ?? 100;
    this.size = o.size || [1.2, 1.0, 1.2];            // szer., wys., głęb.
    this.cda = o.cda ?? 1.2;                           // opór m²
    this.broadside = o.broadside ?? 0;                 // skłonność do obracania w poprzek strumienia (belki)
    this.fragile = o.fragile ?? null;                  // maks. prędkość uderzenia
    this.spill = o.spill ?? null;                      // wrażliwość na przyspieszenia (szklanka)
    this.pos = o.pos ? [...o.pos] : [0, 0, 0]; this.prev = [...this.pos];
    this.vel = [0, 0, 0];
    this.yaw = o.yaw ?? 0; this.yawRate = 0;
    this.onGround = true; this.impactMax = 0; this.lastImpact = 0; this.airborne = false;
    this.spilled = 0; this.acc = [0, 0, 0];
    this.id = o.id || 'load';
    this.broken = false;
  }
  get half() { return this.size[1] / 2; }
}

export class Sling {
  constructor(length = 12, maxLoad = 300, n = 8) {
    this.length = length; this.maxLoad = maxLoad; this.n = n;
    this.seg = length / n;
    this.nodeMass = 2.0; this.hookMass = 8;
    this.kSeg = 200000;   // N/m na odcinek (limit stabilności: 2*sqrt(k/m)*h < 2)
    this.cSeg = 260;
    this.strap = 2.0; this.kStrap = 150000; this.cStrap = 2500; this.cRope = 1100;
    this.nodes = []; this.prev = [];
    this.load = null;
    this.force = [0, 0, 0];
    this.tension = 0; this.maxTension = 0;
    this._w = [0, 0, 0]; this._g = { h: 0, n: [0, 1, 0], obj: null, water: false };
    this.hookContact = false;
  }
  reset(hook) {
    this.nodes = []; this.prev = [];
    for (let i = 0; i <= this.n; i++) { const p = [hook[0], hook[1] - i * this.seg, hook[2]]; this.nodes.push(p); this.prev.push([...p]); }
    this.load = null;
  }
  get hookPos() { return this.nodes[this.n]; }
  hookVel(dt) { const a = this.nodes[this.n], b = this.prev[this.n]; return [(a[0] - b[0]) / dt, (a[1] - b[1]) / dt, (a[2] - b[2]) / dt]; }

  canAttach(load) {
    const h = this.hookPos, top = [load.pos[0], load.pos[1] + load.half, load.pos[2]];
    return Math.hypot(h[0] - top[0], h[1] - top[1], h[2] - top[2]) < 1.6;
  }
  attach(load) { this.load = load; load.prev = [...load.pos]; load.airborne = false; load.impactMax = 0; }
  release() { const l = this.load; this.load = null; return l; }

  // Krok: hookA/hookB – pozycja zaczepu na śmigłowcu na początku/końcu kroku
  step(dt, hookA, hookB, env, t, rotor) {
    const h = dt / SUB, h2 = h * h;
    const f = this.force; f[0] = f[1] = f[2] = 0;
    const N = this.nodes, P = this.prev, n = this.n;
    const acc = []; for (let i = 0; i <= n; i++) acc.push([0, -G, 0]);
    const L = this.load;
    let tMax = 0;
    for (let s = 1; s <= SUB; s++) {
      const u = s / SUB;
      // węzeł 0 – kinematyczny (na haku śmigłowca)
      P[0][0] = N[0][0]; P[0][1] = N[0][1]; P[0][2] = N[0][2];
      N[0][0] = hookA[0] + (hookB[0] - hookA[0]) * u; N[0][1] = hookA[1] + (hookB[1] - hookA[1]) * u; N[0][2] = hookA[2] + (hookB[2] - hookA[2]) * u;
      for (let i = 1; i <= n; i++) { acc[i][0] = 0; acc[i][1] = -G; acc[i][2] = 0; }
      const loadF = [0, 0, 0];
      // sprężyny odcinków (tylko rozciąganie)
      for (let i = 0; i < n; i++) {
        const a = N[i], b = N[i + 1], pa = P[i], pb = P[i + 1];
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const st = d - this.seg;
        if (st <= 0) continue;
        const ux = dx / d, uy = dy / d, uz = dz / d;
        const rv = ((b[0] - pb[0]) - (a[0] - pa[0])) * ux + ((b[1] - pb[1]) - (a[1] - pa[1])) * uy + ((b[2] - pb[2]) - (a[2] - pa[2])) * uz;
        let F = this.kSeg * st + this.cSeg * rv / h;
        if (F < 0) F = 0;
        const mb = i + 1 === n ? this.hookMass : this.nodeMass;
        acc[i + 1][0] -= F * ux / mb; acc[i + 1][1] -= F * uy / mb; acc[i + 1][2] -= F * uz / mb;
        if (i > 0) { acc[i][0] += F * ux / this.nodeMass; acc[i][1] += F * uy / this.nodeMass; acc[i][2] += F * uz / this.nodeMass; }
        else { f[0] += F * ux / SUB; f[1] += F * uy / SUB; f[2] += F * uz / SUB; if (F > tMax) tMax = F; }
      }
      // tłumik całej liny (histereza materiału): tłumi „odbijanie” ładunku na sprężystej linie
      {
        const a = N[0], b = N[n];
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        if (d > this.length * 0.97) {
          const ux = dx / d, uy = dy / d, uz = dz / d;
          const rv = ((b[0] - P[n][0]) - (a[0] - P[0][0])) * ux + ((b[1] - P[n][1]) - (a[1] - P[0][1])) * uy + ((b[2] - P[n][2]) - (a[2] - P[0][2])) * uz;
          const F = this.cRope * rv / h;
          acc[n][0] -= F * ux / this.hookMass; acc[n][1] -= F * uy / this.hookMass; acc[n][2] -= F * uz / this.hookMass;
          f[0] += F * ux / SUB; f[1] += F * uy / SUB; f[2] += F * uz / SUB;
        }
      }
      // pas ładunku
      if (L) {
        const a = N[n], top = [L.pos[0], L.pos[1] + L.half, L.pos[2]];
        const dx = top[0] - a[0], dy = top[1] - a[1], dz = top[2] - a[2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const st = d - this.strap;
        if (st > 0) {
          const ux = dx / d, uy = dy / d, uz = dz / d;
          const rv = ((L.pos[0] - L.prev[0]) - (a[0] - P[n][0])) * ux + ((L.pos[1] - L.prev[1]) - (a[1] - P[n][1])) * uy + ((L.pos[2] - L.prev[2]) - (a[2] - P[n][2])) * uz;
          const F = Math.max(0, this.kStrap * st + this.cStrap * rv / h);
          acc[n][0] += F * ux / this.hookMass; acc[n][1] += F * uy / this.hookMass; acc[n][2] += F * uz / this.hookMass;
          loadF[0] -= F * ux; loadF[1] -= F * uy; loadF[2] -= F * uz;
        }
      }
      // opór liny i wiatr (co podkrok tani przybliżony)
      if (s === 1) env.wind.sample(N[n][0], N[n][1], N[n][2], t, this._w);
      const w = this._w;
      for (let i = 1; i <= n; i++) {
        const vx = (N[i][0] - P[i][0]) / h - w[0], vy = (N[i][1] - P[i][1]) / h - w[1], vz = (N[i][2] - P[i][2]) / h - w[2];
        const vm = Math.sqrt(vx * vx + vy * vy + vz * vz);
        const m = i === n ? this.hookMass : this.nodeMass, cd = (i === n ? 0.05 : 0.02) * 0.6 * vm / m;
        acc[i][0] -= cd * vx; acc[i][1] -= cd * vy; acc[i][2] -= cd * vz;
      }
      // całkowanie Verleta węzłów
      for (let i = 1; i <= n; i++) {
        const p = N[i], q = P[i], a = acc[i];
        const nx = p[0] + (p[0] - q[0]) * 0.9995 + a[0] * h2, ny = p[1] + (p[1] - q[1]) * 0.9995 + a[1] * h2, nz = p[2] + (p[2] - q[2]) * 0.9995 + a[2] * h2;
        q[0] = p[0]; q[1] = p[1]; q[2] = p[2]; p[0] = nx; p[1] = ny; p[2] = nz;
        // kontakt z ziemią
        const g = env.world.ground(p[0], p[2], p[1] + 0.5, this._g);
        if (p[1] < g.h + 0.05) {
          p[1] = g.h + 0.05;
          q[0] = p[0] - (p[0] - q[0]) * 0.6; q[2] = p[2] - (p[2] - q[2]) * 0.6; q[1] = p[1];
          if (i === n) this.hookContact = true;
        } else if (i === n) this.hookContact = false;
      }
      if (L) this._stepLoad(L, loadF, w, h, env, t, rotor);
    }
    this.tension = Math.hypot(f[0], f[1], f[2]);
    this.maxTension = Math.max(this.maxTension, tMax);
    return f;
  }

  _stepLoad(L, F, w, h, env, t, rotor) {
    const m = L.mass;
    const vx = (L.pos[0] - L.prev[0]) / h, vy = (L.pos[1] - L.prev[1]) / h, vz = (L.pos[2] - L.prev[2]) / h;
    let ax = F[0] / m, ay = F[1] / m - G, az = F[2] / m;
    // opór aerodynamiczny
    const rx = vx - w[0], ry = vy - w[1], rz = vz - w[2];
    const rm = Math.sqrt(rx * rx + ry * ry + rz * rz);
    const k = 0.5 * 1.1 * L.cda * rm / m;
    ax -= k * rx; ay -= k * ry; az -= k * rz;
    // strumień wirnika
    if (rotor && rotor.rpm > 0.3) {
      const dx = L.pos[0] - rotor.hub[0], dz = L.pos[2] - rotor.hub[2], below = rotor.hub[1] - L.pos[1];
      if (below > 0 && below < rotor.R * 6 && dx * dx + dz * dz < rotor.R * rotor.R * 1.5) {
        const vw = 2 * rotor.vi;
        ay -= 0.5 * 1.1 * L.cda * 0.6 * vw * vw / m * (1 - below / (rotor.R * 6));
        L.yawRate += vnoise3(t * 1.3, 0, 0, 91) * 0.8 * h;
      }
    }
    // obrót wokół pionu: belki ustawiają się w poprzek strumienia, tłumienie skrętne liny
    if (L.broadside > 0 && rm > 2) {
      const beta = Math.atan2(rx, rz) - L.yaw;
      L.yawRate += L.broadside * rm * rm * Math.sin(2 * beta) * 0.004 * h;
      L.yawRate += vnoise3(t * 0.7, 3, 0, 92) * L.broadside * rm * 0.01 * h;
    }
    L.yawRate *= L.onGround ? 0.9 : 0.9996;
    L.yaw += L.yawRate * h;
    L.acc[0] = ax; L.acc[1] = ay + G; L.acc[2] = az;
    let nx = L.pos[0] + vx * h + ax * h * h, ny = L.pos[1] + vy * h + ay * h * h, nz = L.pos[2] + vz * h + az * h * h;
    L.prev[0] = L.pos[0]; L.prev[1] = L.pos[1]; L.prev[2] = L.pos[2];
    const g = env.world.ground(nx, nz, ny, this._g);
    const bottom = ny - L.half;
    if (bottom < g.h) {
      const vImp = -vy;
      if (!L.onGround && L.airborne && vImp > 0.05) {
        L.lastImpact = vImp; L.impactMax = Math.max(L.impactMax, vImp);
        if (L.fragile && vImp > L.fragile) L.broken = true;
      }
      ny = g.h + L.half;
      L.prev[1] = ny;
      // tarcie
      L.prev[0] = nx - (nx - L.prev[0]) * 0.3 ; L.prev[2] = nz - (nz - L.prev[2]) * 0.3;
      L.onGround = true;
      if (g.water) L.inWater = true;
    } else if (bottom > g.h + 0.05) { L.onGround = false; L.airborne = true; }
    L.pos[0] = nx; L.pos[1] = ny; L.pos[2] = nz;
    L.vel[0] = vx; L.vel[1] = vy; L.vel[2] = vz;
  }
}

// Swobodny ładunek (po odczepieniu / leżący) – prosta fizyka punktu
export function stepFreeLoad(L, dt, env) {
  const g = env.world.ground(L.pos[0], L.pos[2], L.pos[1], { h: 0, n: [0, 1, 0] });
  if (L.onGround && L.pos[1] - L.half <= g.h + 0.02) { L.vel = [0, 0, 0]; L.prev = [...L.pos]; return; }
  L.vel[1] -= G * dt;
  const vy = L.vel[1];
  for (let i = 0; i < 3; i++) L.pos[i] += L.vel[i] * dt;
  const g2 = env.world.ground(L.pos[0], L.pos[2], L.pos[1], { h: 0, n: [0, 1, 0] });
  if (L.pos[1] - L.half < g2.h) {
    const v = -vy; L.lastImpact = v; L.impactMax = Math.max(L.impactMax, v);
    if (L.fragile && v > L.fragile) L.broken = true;
    L.pos[1] = g2.h + L.half; L.vel = [0, 0, 0]; L.onGround = true;
  }
  L.prev = [...L.pos];
}
