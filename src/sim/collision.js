// Świat kolizji: teren + prostopadłościany (budynki, lądowiska), walce (maszty, słupy), przewody, drzewa.
import { forTreesNear } from '../world/trees.js';

export class CollisionWorld {
  constructor(terrain, trees = null) {
    this.terrain = terrain; this.trees = trees;
    this.boxes = []; this.cyls = []; this.wires = [];
    this.B = 64; this.grid = new Map();
    this._n = [0, 1, 0];
    this.water = null; // {level, test(x,z)}
  }
  _key(i, j) { return i * 100003 + j; }
  _insert(obj, x0, z0, x1, z1) {
    for (let i = Math.floor(x0 / this.B); i <= Math.floor(x1 / this.B); i++)
      for (let j = Math.floor(z0 / this.B); j <= Math.floor(z1 / this.B); j++) {
        const k = this._key(i, j); let a = this.grid.get(k); if (!a) this.grid.set(k, a = []); a.push(obj);
      }
  }
  // Prostopadłościan: środek (x,y,z), półwymiary, obrót wokół Y. top = powierzchnia do lądowania.
  addBox(b) {
    b.type = 'box'; b.yaw = b.yaw || 0; b.c = Math.cos(b.yaw); b.s = Math.sin(b.yaw);
    const r = Math.hypot(b.hx, b.hz); this.boxes.push(b); this._insert(b, b.x - r, b.z - r, b.x + r, b.z + r); return b;
  }
  addCyl(c) { c.type = 'cyl'; this.cyls.push(c); this._insert(c, c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r); return c; }
  // Przewód: lista punktów [x,y,z] (odcinki), promień
  addWire(w) {
    w.type = 'wire'; this.wires.push(w);
    for (let i = 0; i < w.pts.length - 1; i++) {
      const a = w.pts[i], b = w.pts[i + 1];
      const seg = { type: 'seg', a, b, r: w.r, tag: w.tag, wire: w };
      this._insert(seg, Math.min(a[0], b[0]) - 2, Math.min(a[2], b[2]) - 2, Math.max(a[0], b[0]) + 2, Math.max(a[2], b[2]) + 2);
    }
    return w;
  }
  near(x, z) { return this.grid.get(this._key(Math.floor(x / this.B), Math.floor(z / this.B))); }

  _inBoxXZ(b, x, z, pad = 0) {
    const dx = x - b.x, dz = z - b.z;
    const lx = dx * b.c + dz * b.s, lz = -dx * b.s + dz * b.c;
    return Math.abs(lx) <= b.hx + pad && Math.abs(lz) <= b.hz + pad;
  }
  // Wysokość podłoża pod punktem (teren lub dach/platforma poniżej yRef+0.5). Zwraca obiekt {h, n, obj}
  ground(x, z, yRef = 1e9, out = { h: 0, n: [0, 1, 0], obj: null, water: false }) {
    let h = this.terrain.height(x, z); out.obj = null; out.water = false;
    this.terrain.normal(x, z, out.n);
    if (this.water && this.water.test(x, z) && this.water.level > h) { h = this.water.level; out.water = true; out.n[0] = 0; out.n[1] = 1; out.n[2] = 0; }
    const list = this.near(x, z);
    if (list) for (const b of list) {
      if (b.type !== 'box') continue;
      const top = b.y + b.hy;
      if (top > h && top <= yRef + 0.6 && this._inBoxXZ(b, x, z)) { h = top; out.obj = b; out.n[0] = 0; out.n[1] = 1; out.n[2] = 0; out.water = false; }
    }
    out.h = h; return out;
  }
  // Wypchnięcie punktu (promień r) poza prostopadłościany (bez dachów – tylko ściany boczne). Zwraca [x,y,z,tag] lub null.
  pushOut(x, y, z, r) {
    const list = this.near(x, z); if (!list) return null;
    for (const b of list) {
      if (b.type !== 'box' || !b.wall) continue;
      if (y < b.y - b.hy || y > b.y + b.hy - 0.3) continue;
      const dx = x - b.x, dz = z - b.z;
      const lx = dx * b.c + dz * b.s, lz = -dx * b.s + dz * b.c;
      const ex = b.hx + r - Math.abs(lx), ez = b.hz + r - Math.abs(lz);
      if (ex <= 0 || ez <= 0) continue;
      let nlx = lx, nlz = lz;
      if (ex < ez) nlx = Math.sign(lx || 1) * (b.hx + r); else nlz = Math.sign(lz || 1) * (b.hz + r);
      return [b.x + nlx * b.c - nlz * b.s, y, b.z + nlx * b.s + nlz * b.c, b.tag];
    }
    return null;
  }
  // Najwyższy punkt przeszkód (budynki, słupy, przewody, drzewa) w promieniu r – dla autopilota
  obstacleTop(x, z, r = 30) {
    let top = this.terrain.height(x, z);
    const seen = new Set();
    for (let i = Math.floor((x - r) / this.B); i <= Math.floor((x + r) / this.B); i++)
      for (let j = Math.floor((z - r) / this.B); j <= Math.floor((z + r) / this.B); j++) {
        const list = this.grid.get(this._key(i, j)); if (!list) continue;
        for (const o of list) {
          if (seen.has(o)) continue; seen.add(o);
          if (o.type === 'box') { if (Math.hypot(o.x - x, o.z - z) < r + Math.hypot(o.hx, o.hz)) top = Math.max(top, o.y + o.hy); }
          else if (o.type === 'cyl') { if (Math.hypot(o.x - x, o.z - z) < r + o.r) top = Math.max(top, o.y1); }
          else if (o.type === 'seg') {
            const d = distPointSeg(x, 0, z, [o.a[0], 0, o.a[2]], [o.b[0], 0, o.b[2]]);
            if (d < r) top = Math.max(top, Math.max(o.a[1], o.b[1]));
          }
        }
      }
    if (this.trees) {
      const T = this.trees;
      forTreesNear(T, x, z, r, k => { const tt = T.y[k] + T.h[k]; if (tt > top) top = tt; });
    }
    return top;
  }
  // Czy punkt (z promieniem r) koliduje z przeszkodą (nie z terenem). Zwraca tag lub null.
  hit(x, y, z, r = 0, trees = true) {
    const list = this.near(x, z);
    if (list) for (const o of list) {
      if (o.type === 'box') {
        if (y > o.y - o.hy - r && y < o.y + o.hy + r && this._inBoxXZ(o, x, z, r)) return o.tag || 'budynek';
      } else if (o.type === 'cyl') {
        if (y > o.y0 - r && y < o.y1 + r && Math.hypot(x - o.x, z - o.z) < o.r + r) return o.tag || 'słup';
      } else if (o.type === 'seg') {
        if (distPointSeg(x, y, z, o.a, o.b) < o.r + r) return o.tag || 'przewody';
      }
    }
    if (trees && this.trees) {
      const T = this.trees; let res = null;
      forTreesNear(T, x, z, 8, k => {
        const top = T.y[k] + T.h[k];
        if (y > top + r || y < T.y[k]) return;
        const cr = T.h[k] * (T.kind[k] ? 0.2 : 0.16) * (1 - (y - T.y[k]) / T.h[k]) + 0.3; // stożek korony
        if (Math.hypot(x - T.x[k], z - T.z[k]) < cr + r) { res = 'drzewo'; return true; }
      });
      if (res) return res;
    }
    return null;
  }
  // Przecięcie dysku wirnika (środek c, normalna n, promień R) z przewodami
  diskHitsWire(c, n, R) {
    const list = this.near(c[0], c[2]);
    if (!list) return null;
    for (const o of list) {
      if (o.type !== 'seg') continue;
      const a = o.a, b = o.b;
      const da = (a[0] - c[0]) * n[0] + (a[1] - c[1]) * n[1] + (a[2] - c[2]) * n[2];
      const db = (b[0] - c[0]) * n[0] + (b[1] - c[1]) * n[1] + (b[2] - c[2]) * n[2];
      if (da * db > 0) {
        if (Math.min(Math.abs(da), Math.abs(db)) > 0.35) continue;
      }
      const t = da * db > 0 ? (Math.abs(da) < Math.abs(db) ? 0 : 1) : da / (da - db);
      const px = a[0] + (b[0] - a[0]) * t - c[0], py = a[1] + (b[1] - a[1]) * t - c[1], pz = a[2] + (b[2] - a[2]) * t - c[2];
      if (px * px + py * py + pz * pz < R * R) return o.tag || 'przewody';
    }
    return null;
  }
}

export function distPointSeg(x, y, z, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1], vz = b[2] - a[2];
  const wx = x - a[0], wy = y - a[1], wz = z - a[2];
  const L = vx * vx + vy * vy + vz * vz;
  let t = L > 0 ? (wx * vx + wy * vy + wz * vz) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = wx - vx * t, dy = wy - vy * t, dz = wz - vz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
