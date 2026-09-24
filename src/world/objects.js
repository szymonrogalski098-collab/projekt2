// Obiekty statyczne świata (czysty opis) – z tego samego opisu powstają kolizje (sim) i siatki (render).
import { Rng } from '../core/rng.js';
import { BASE, TOWN, HUT, MEADOW, CABLE, RESERVOIR, MAST, SLOPE_SITE, valleyX, valleyHalfWidth } from './layout.js';
import { distSeg } from './terrainGen.js';

// Wszystkie obiekty: {kind, x,y,z, w,h,d (wymiary), yaw, tag, pad?:true}
export function buildObjects(terrain) {
  const O = { boxes: [], pads: {}, wires: [], pylons: [], houses: [], special: [] };
  const H = (x, z) => terrain.height(x, z);
  const box = (kind, x, z, w, h, d, yaw = 0, extra = {}) => {
    const y0 = extra.y0 ?? minUnder(terrain, x, z, w, d, yaw);
    const b = { kind, x, y: y0 + h / 2, z, w, h, d, yaw, tag: extra.tag, roof: extra.roof, color: extra.color, ...extra };
    O.boxes.push(b); return b;
  };
  const pad = (id, x, z, size = 12, y0 = null, extra = {}) => {
    const y = y0 ?? H(x, z);
    const b = box('pad', x, z, size, 0.3, size, extra.yaw || 0, { y0: y, tag: 'lądowisko', ...extra });
    O.pads[id] = { id, x, z, y: y + 0.3, size, box: b };
    return O.pads[id];
  };

  // --- baza ---
  const by = BASE.y;
  pad('base1', BASE.x, BASE.z + 20, 14, by);
  pad('base2', BASE.x + 34, BASE.z + 30, 12, by);
  pad('base3', BASE.x - 34, BASE.z + 30, 12, by);
  box('hangar', BASE.x - 40, BASE.z - 40, 34, 11, 26, 0, { y0: by, tag: 'hangar', roofType: 'arch' });
  const office = box('office', BASE.x + 30, BASE.z - 36, 20, 8.5, 14, 0, { y0: by, tag: 'budynek bazy' });
  pad('roof', office.x, office.z, 11, by + 8.5, { roofPad: true });
  box('fuel', BASE.x + 62, BASE.z + 2, 6, 3, 4, 0, { y0: by, tag: 'dystrybutor' });
  box('tank', BASE.x + 70, BASE.z - 6, 10, 3.2, 3.2, 0, { y0: by, tag: 'zbiornik paliwa', shape: 'tank' });
  O.special.push({ kind: 'windsock', x: BASE.x - 45, z: BASE.z + 55, y: by, h: 6 });
  O.special.push({ kind: 'apron', x: BASE.x, z: BASE.z + 12, y: by, w: 110, d: 56 });
  O.special.push({ kind: 'marker', id: 'train1', x: BASE.x, z: BASE.z - 45 + 110, y: H(BASE.x, BASE.z + 65) });

  // --- miasteczko ---
  const rng = new Rng(4242);
  const roadClear = (x, z) => {
    for (let k = 0; k < terrain.road.length; k += 3) { const p = terrain.road[k]; if (Math.abs(p[0] - x) < 18 && Math.abs(p[1] - z) < 18) return false; }
    return true;
  };
  const tries = 900;
  for (let i = 0; i < tries && O.houses.length < 95; i++) {
    const a = rng.float(0, Math.PI * 2), r = Math.sqrt(rng.next()) * TOWN.r * 1.05;
    const x = TOWN.x + Math.cos(a) * r, z = TOWN.z + Math.sin(a) * r;
    if (Math.hypot(x - BASE.x, z - BASE.z) < 190) continue;
    if (!roadClear(x, z)) continue;
    const w = rng.float(8, 13), d = rng.float(9, 15), h = rng.float(5.5, 9);
    const yaw = Math.round(rng.float(0, 4)) * Math.PI / 2 + rng.float(-0.15, 0.15);
    let ok = true;
    for (const o of O.houses) if (Math.hypot(o.x - x, o.z - z) < Math.max(o.w, o.d) / 2 + Math.max(w, d) / 2 + 5) { ok = false; break; }
    if (!ok) continue;
    const b = box('house', x, z, w, h, d, yaw, { tag: 'budynek', roofType: 'gable', hue: rng.next() });
    O.houses.push(b);
  }
  const ch = box('church', TOWN.x - 30, TOWN.z - 20, 14, 12, 26, 0.1, { tag: 'kościół', roofType: 'gable' });
  box('tower', TOWN.x - 30 + Math.sin(0.1) * 15, TOWN.z - 20 - Math.cos(0.1) * 15, 6, 34, 6, 0.1, { tag: 'wieża kościoła', roofType: 'spire', y0: ch.y - ch.h / 2 });

  // --- schronisko ---
  box('hut', HUT.x + 16, HUT.z - 12, 18, 9, 11, 0.35, { y0: HUT.y, tag: 'schronisko', roofType: 'gable' });
  box('shed', HUT.x + 2, HUT.z - 28, 6, 3.5, 5, 0.35, { y0: HUT.y, tag: 'szopa', roofType: 'gable' });
  pad('hut', HUT.x - 12, HUT.z + 10, 9, HUT.y, { yaw: 0.35 });

  // --- polana: szałas ---
  box('barn', MEADOW.x + 26, MEADOW.z - 24, 6, 3.6, 5, 0.8, { tag: 'szałas', roofType: 'gable' });
  O.special.push({ kind: 'ring', id: 'meadow', x: MEADOW.x, z: MEADOW.z, y: MEADOW.y, r: 8 });

  // --- stok do lądowania na pochyłości ---
  O.special.push({ kind: 'flags', id: 'slope', x: SLOPE_SITE.x, z: SLOPE_SITE.z, y: SLOPE_SITE.y, r: 7 });

  // --- kolejka linowa ---
  const A = { x: CABLE.a.x, z: CABLE.a.z, y: CABLE.a.y }, B = { x: CABLE.b.x, z: CABLE.b.z, y: CABLE.b.y };
  const yawC = Math.atan2(B.x - A.x, B.z - A.z);
  box('station', A.x, A.z, 12, 10, 16, yawC, { y0: A.y, tag: 'stacja kolejki' });
  box('station', B.x, B.z, 12, 9, 16, yawC, { y0: B.y, tag: 'stacja kolejki' });
  const nP = CABLE.pylons, supports = [{ x: A.x, z: A.z, y: A.y + 9 }];
  for (let i = 1; i <= nP; i++) {
    const t = i / (nP + 1), x = A.x + (B.x - A.x) * t, z = A.z + (B.z - A.z) * t, g = H(x, z);
    const lin = A.y + 9 + (B.y + 8 - A.y - 9) * t;
    const top = Math.max(g + 22, lin - 30 + 12 * Math.sin(t * 7));
    O.pylons.push({ kind: 'cablePylon', x, z, y0: g, y1: top, yaw: yawC });
    supports.push({ x, z, y: top });
  }
  supports.push({ x: B.x, z: B.z, y: B.y + 8 });
  const px = Math.cos(yawC), pz = -Math.sin(yawC);
  for (const off of [-2.2, 2.2]) {
    const pts = [];
    for (let s = 0; s < supports.length - 1; s++) {
      const a = supports[s], b = supports[s + 1], L = Math.hypot(b.x - a.x, b.z - a.z), sag = L * 0.035;
      const n = Math.ceil(L / 25);
      for (let k = 0; k < n; k++) { const t = k / n; pts.push([a.x + (b.x - a.x) * t + px * off, a.y + (b.y - a.y) * t - 4 * sag * t * (1 - t), a.z + (b.z - a.z) * t + pz * off]); }
    }
    const e = supports[supports.length - 1]; pts.push([e.x + px * off, e.y, e.z + pz * off]);
    O.wires.push({ pts, r: 0.35, tag: 'liny kolejki', kind: 'cable', thick: 0.045 });
  }

  // --- linia energetyczna wzdłuż doliny (od południa do tamy) ---
  const plPts = [];
  for (let z = 5200; z > 700; z -= 230) {
    let x = valleyX(z) - valleyHalfWidth(z) * 0.45;
    if (Math.hypot(x - TOWN.x, z - TOWN.z) < TOWN.r + 40) x = TOWN.x - TOWN.r - 60;
    plPts.push({ x, z });
  }
  plPts.push({ x: RESERVOIR.damX + 120, z: RESERVOIR.damZ + 40 });
  const tops = plPts.map(p => ({ x: p.x, z: p.z, y: H(p.x, p.z) + 21 }));
  for (let i = 0; i < tops.length; i++) {
    const n = i < tops.length - 1 ? i + 1 : i - 1;
    O.pylons.push({ kind: 'powerPylon', x: tops[i].x, z: tops[i].z, y0: tops[i].y - 21, y1: tops[i].y + 2, yaw: Math.atan2(tops[n].x - tops[i].x, tops[n].z - tops[i].z) });
  }
  for (const off of [-4, 0, 4]) {
    const pts = [];
    for (let s = 0; s < tops.length - 1; s++) {
      const a = tops[s], b = tops[s + 1], L = Math.hypot(b.x - a.x, b.z - a.z);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z), ox = Math.cos(yaw) * off, oz = -Math.sin(yaw) * off;
      const yo = off === 0 ? 2 : 0;
      for (let k = 0; k < 8; k++) { const t = k / 8; pts.push([a.x + (b.x - a.x) * t + ox, a.y + yo + (b.y - a.y) * t - 4 * L * 0.03 * t * (1 - t), a.z + (b.z - a.z) * t + oz]); }
    }
    const e = tops[tops.length - 1]; pts.push([e.x, e.y, e.z]);
    O.wires.push({ pts, r: 0.3, tag: 'linia energetyczna', kind: 'power', thick: 0.03 });
  }

  // --- tama ---
  const dz0 = RESERVOIR.damZ;
  box('dam', RESERVOIR.damX, dz0, 14, RESERVOIR.crest - 975, 380, 0.16, { y0: 975, tag: 'tama', roofType: 'flat' });
  box('damhouse', RESERVOIR.damX + 16, dz0 - 170, 10, 6, 8, 0.16, { y0: RESERVOIR.crest, tag: 'budynek tamy' });

  // --- budowa masztu (fundament) ---
  box('foundation', MAST.x, MAST.z, 10, 1.2, 10, 0.2, { y0: MAST.y - 0.2, tag: 'fundament masztu', roofType: 'flat' });
  O.special.push({ kind: 'crane', x: MAST.x + 16, z: MAST.z - 10, y: MAST.y, h: 32 });
  box('crane', MAST.x + 16, MAST.z - 10, 2.2, 32, 2.2, 0.2, { y0: MAST.y, tag: 'żuraw', hidden: true });

  return O;
}

function minUnder(terrain, x, z, w, d, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  let m = 1e9;
  for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0, 0]]) {
    const lx = a * w, lz = b * d;
    m = Math.min(m, terrain.height(x + lx * c + lz * s, z - lx * s + lz * c));
  }
  return m;
}

// Rejestracja kolizji
export function addObjectColliders(world, O) {
  for (const b of O.boxes) {
    // yaw w three.js (obrót wokół Y) -> w kolizji używamy tej samej konwencji: lokalne x = dx*c - dz*s ...
    world.addBox({ x: b.x, y: b.y, z: b.z, hx: b.w / 2, hy: b.h / 2, hz: b.d / 2, yaw: -b.yaw, tag: b.tag, wall: b.wall !== false });
    if (b.roofType === 'gable') world.addBox({ x: b.x, y: b.y + b.h / 2 + b.w * 0.18, z: b.z, hx: b.w * 0.3, hy: b.w * 0.18, hz: b.d / 2, yaw: -b.yaw, tag: b.tag });
    if (b.roofType === 'spire') world.addCyl({ x: b.x, z: b.z, y0: b.y + b.h / 2, y1: b.y + b.h / 2 + 12, r: 1.2, tag: b.tag });
  }
  for (const p of O.pylons) world.addCyl({ x: p.x, z: p.z, y0: p.y0, y1: p.y1 + 1, r: p.kind === 'powerPylon' ? 2.5 : 1.6, tag: p.kind === 'powerPylon' ? 'słup energetyczny' : 'podpora kolejki' });
  for (const w of O.wires) world.addWire({ pts: w.pts, r: w.r, tag: w.tag });
  for (const s of O.special) if (s.kind === 'windsock') world.addCyl({ x: s.x, z: s.z, y0: s.y, y1: s.y + s.h, r: 0.3, tag: 'rękaw wiatrowy' });
}
