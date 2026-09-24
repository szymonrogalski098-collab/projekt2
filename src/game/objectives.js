// Cele misji. Każdy cel: update(run, dt) -> true gdy zaliczony; marker() dla HUD; bot – wskazówki dla autopilota.
const deg = Math.PI / 180;
const wrapPi = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export function resolvePoint(run, at) {
  if (typeof at === 'string') {
    if (at.startsWith('pad:')) { const p = run.ctx.objects.pads[at.slice(4)]; return { x: p.x, z: p.z, y: p.y, r: p.size / 2, pad: p }; }
    if (at.startsWith('load:')) { const l = run.session.loads.find(l => l.id === at.slice(5)); return { x: l.pos[0], z: l.pos[2], y: l.pos[1] - l.half }; }
  }
  const y = at.y ?? run.ctx.world.ground(at.x, at.z, 1e9).h;
  return { x: at.x, z: at.z, y, r: at.r };
}

class Obj {
  constructor(def) { this.def = def; this.text = def.text || ''; this.t = 0; this.hold = 0; this.done = false; }
  init(run) { }
  marker() { return null; }
}

// Zawis nad punktem w zakresie wysokości przez czas hold
class Hover extends Obj {
  init(run) { this.p = resolvePoint(run, this.def.at); }
  update(run, dt) {
    const h = run.heli, d = this.def, p = this.p;
    const dist = Math.hypot(h.pos.x - p.x, h.pos.z - p.z);
    const agl = h.pos.y + h.spec.skids.y - p.y;
    const [a0, a1] = d.agl || [2, 8];
    const spd = Math.hypot(h.vel.x, h.vel.z);
    const ok = dist <= (d.r || 6) && agl >= a0 && agl <= a1 && !h.onGround && spd < (d.maxSpeed || 3) && Math.abs(h.vel.y) < 1.5;
    this.hold = ok ? this.hold + dt : Math.max(0, this.hold - dt * 2);
    this.status = { dist, agl, ok, hold: this.hold, need: d.hold || 3 };
    return this.hold >= (d.hold || 3);
  }
  marker() { return { kind: 'hover', x: this.p.x, y: this.p.y, z: this.p.z, r: this.def.r || 6, agl: this.def.agl || [2, 8], progress: this.hold / (this.def.hold || 3) }; }
  botTarget() { const a = this.def.agl || [2, 8]; return { mode: 'hover', x: this.p.x, z: this.p.z, y: this.p.y + (a[0] + a[1]) / 2, r: this.def.r || 6 }; }
}

class Heading extends Obj {
  init(run) { this.p = resolvePoint(run, this.def.toward); }
  update(run, dt) {
    const h = run.heli, a = h.attitude();
    const want = Math.atan2(this.p.x - h.pos.x, -(this.p.z - h.pos.z));
    const err = Math.abs(wrapPi(a.heading - want));
    const agl = h.tel.agl;
    const ok = err < (this.def.tol || 12) * deg && (this.def.inAir ? agl > 1 : true);
    this.hold = ok ? this.hold + dt : 0;
    this.status = { err: err / deg, ok };
    return this.hold >= (this.def.hold || 2);
  }
  marker() { return { kind: 'flag', x: this.p.x, y: this.p.y, z: this.p.z }; }
  botTarget(run) { const h = run.heli; return { mode: 'turn', x: h.pos.x, z: h.pos.z, y: h.pos.y, face: this.p }; }
}

class Takeoff extends Obj {
  update(run, dt) {
    const h = run.heli;
    const ok = h.tel.agl > (this.def.agl || 5);
    this.hold = ok ? this.hold + dt : 0;
    return this.hold > (this.def.hold || 1);
  }
  botTarget(run) { const h = run.heli; if (!this.x0) { this.x0 = h.pos.x; this.z0 = h.pos.z; this.y0 = h.pos.y; } return { mode: 'hover', x: this.x0, z: this.z0, y: this.y0 + (this.def.agl || 5) + 4, r: 5 }; }
}

class Waypoint extends Obj {
  init(run) { this.p = resolvePoint(run, this.def.at); }
  update(run, dt) {
    const h = run.heli;
    const dist = Math.hypot(h.pos.x - this.p.x, h.pos.z - this.p.z);
    this.status = { dist };
    return dist < (this.def.r || 80);
  }
  marker() { return { kind: 'waypoint', x: this.p.x, y: this.p.y, z: this.p.z, r: this.def.r || 80 }; }
  botTarget() { return { mode: 'fly', x: this.p.x, z: this.p.z, y: this.p.y + (this.def.botAgl || 60), pass: true, speed: this.def.botSpeed }; }
}

// Bramka: przelot przez okrąg (środek y = wysokość bezwzględna), kierunek przelotu = heading
class Gate extends Obj {
  init(run) { this.p = { ...this.def.at }; this.p.y = this.def.at.y ?? (run.ctx.world.ground(this.p.x, this.p.z, 1e9).h + (this.def.agl || 30)); this.dir = (this.def.dir || 0) * deg; this.prevSide = null; }
  update(run, dt) {
    const h = run.heli, nx = Math.sin(this.dir), nz = -Math.cos(this.dir);
    const side = (h.pos.x - this.p.x) * nx + (h.pos.z - this.p.z) * nz;
    let done = false;
    if (this.prevSide !== null && this.prevSide < 0 && side >= 0) {
      const lat = Math.hypot(h.pos.x - this.p.x - nx * side, h.pos.z - this.p.z - nz * side);
      const dy = h.pos.y - this.p.y;
      if (Math.hypot(lat, dy) <= (this.def.r || 12)) done = true;
      else run.note(`Minięto bramkę ${this.def.label || ''} (${Math.hypot(lat, dy).toFixed(0)} m od środka)`), run.penalty('gate');
    }
    this.prevSide = side;
    this.status = { dist: Math.hypot(h.pos.x - this.p.x, h.pos.z - this.p.z) };
    return done;
  }
  marker() { return { kind: 'gate', x: this.p.x, y: this.p.y, z: this.p.z, r: this.def.r || 12, dir: this.dir }; }
  botTarget() { return { mode: 'gate', x: this.p.x, z: this.p.z, y: this.p.y, dir: this.dir, r: this.def.r || 12 }; }
}

// Lądowanie: wszystkie płozy na ziemi w strefie, prędkość ~0, skok nisko przez hold s
class Land extends Obj {
  init(run) { this.p = resolvePoint(run, this.def.at); this.r = this.def.r || this.p.r || 5; this.touchImpact = null; }
  update(run, dt) {
    const h = run.heli;
    const dist = Math.hypot(h.pos.x - this.p.x, h.pos.z - this.p.z);
    const onPad = h.onGround && dist <= this.r;
    if (h.onGround && this.touchImpact === null && dist <= this.r + 3) {
      this.touchImpact = h.stats.lastImpact;
      if (this.def.maxImpact && this.touchImpact > this.def.maxImpact) run.fail(`Twarde lądowanie: ${this.touchImpact.toFixed(1).replace('.', ',')} m/s (limit ${String(this.def.maxImpact).replace('.', ',')})`);
    }
    if (!h.onGround) this.touchImpact = null;
    const still = h.vel.length() < 0.4;
    const low = run.controls.collective < (this.def.maxCollective ?? 0.35) || run.assistLevel === 'full';
    const ok = onPad && still && low;
    this.hold = ok ? this.hold + dt : 0;
    this.status = { dist, onPad, ok, hold: this.hold, need: this.def.hold || 2 };
    if (this.hold >= (this.def.hold || 2)) {
      run.recordLanding({ impact: this.touchImpact ?? h.stats.lastImpact, dist, target: this.def.label || 'lądowisko' });
      return true;
    }
    return false;
  }
  marker() { return { kind: 'land', x: this.p.x, y: this.p.y, z: this.p.z, r: this.r, progress: this.hold / (this.def.hold || 2) }; }
  botTarget() { return { mode: 'land', x: this.p.x, z: this.p.z, y: this.p.y, r: this.r, slope: this.def.slope }; }
}

// Podczepienie ładunku
class Hook extends Obj {
  init(run) { this.load = run.session.loads.find(l => l.id === this.def.load); }
  update(run) { return run.session.sling && run.session.sling.load === this.load; }
  marker() { const l = this.load; return { kind: 'load', x: l.pos[0], y: l.pos[1] + l.half, z: l.pos[2], r: 1.6 }; }
  botTarget() { const l = this.load; return { mode: 'hook', x: l.pos[0], z: l.pos[2], y: l.pos[1] + l.half, load: l }; }
}

// Dostarczenie ładunku: odczepiony, leży w strefie
class Deliver extends Obj {
  init(run) { this.load = run.session.loads.find(l => l.id === this.def.load); this.p = resolvePoint(run, this.def.at); }
  update(run, dt) {
    const l = this.load, s = run.session;
    const dist = Math.hypot(l.pos[0] - this.p.x, l.pos[2] - this.p.z);
    this.status = { dist, attached: s.sling && s.sling.load === l };
    if (s.sling && s.sling.load === l) return false;
    if (!l.onGround) return false;
    if (dist > (this.def.r || 6)) {
      if (!this._warned) { run.fail(`Ładunek odczepiony poza strefą (${dist.toFixed(1)} m od celu)`); this._warned = true; }
      return false;
    }
    if (l.broken) { run.fail('Ładunek uszkodzony przy odstawieniu'); return false; }
    run.recordDelivery({ dist, impact: l.impactMax, name: l.name });
    return true;
  }
  marker() { return { kind: 'drop', x: this.p.x, y: this.p.y, z: this.p.z, r: this.def.r || 6 }; }
  botTarget() { return { mode: 'deliver', x: this.p.x, z: this.p.z, y: this.p.y, r: this.def.r || 6, load: this.load }; }
}

export const OBJECTIVES = { hover: Hover, heading: Heading, takeoff: Takeoff, waypoint: Waypoint, gate: Gate, land: Land, hook: Hook, deliver: Deliver };
export function makeObjective(def) { const C = OBJECTIVES[def.type]; if (!C) throw new Error('Nieznany cel ' + def.type); return new C(def); }
