// Siatki obiektów statycznych (budynki, lądowiska, słupy, przewody, tama...) – scalone według materiału.
import * as THREE from 'three';
import { enhance } from './atmo.js';
import { Rng } from '../core/rng.js';

// ---------- tekstury z płótna ----------
function canvasTex(w, h, draw, repeat = true) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
function noiseFill(g, w, h, base, amp, seed = 1, cell = 2) {
  const r = new Rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += cell) for (let x = 0; x < w; x += cell) { const v = r.float(-amp, amp); g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(x, y, cell, cell); }
}
const TEX = {};
function textures() {
  if (TEX.facade) return TEX;
  // elewacja: segment 3x3 m z oknem
  TEX.facade = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#e9e4da', 0.05, 3);
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, h - 10, w, 10);
    g.fillStyle = '#5b4a3a'; g.fillRect(78, 70, 100, 118);
    g.fillStyle = '#26303a'; g.fillRect(86, 78, 40, 48); g.fillRect(130, 78, 40, 48); g.fillRect(86, 132, 40, 48); g.fillRect(130, 132, 40, 48);
    g.fillStyle = 'rgba(160,190,220,0.25)'; g.fillRect(88, 80, 18, 20); g.fillRect(132, 80, 18, 20);
    g.fillStyle = '#d9d2c4'; g.fillRect(72, 188, 112, 8);
  });
  TEX.roof = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#7a3a2a', 0.08, 5, 4);
    for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y, w, 3); for (let x = (y / 16 % 2) * 16; x < w; x += 32) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, y, 2, 16); } }
  });
  TEX.wood = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#5a3f28', 0.06, 7, 2);
    for (let y = 0; y < h; y += 24) { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, y, w, 3); g.fillStyle = 'rgba(255,220,180,0.06)'; g.fillRect(0, y + 4, w, 6); }
    g.fillStyle = '#2a2f36'; g.fillRect(90, 80, 70, 70); g.fillStyle = '#e8e2d0'; g.fillRect(86, 76, 78, 6); g.fillRect(86, 150, 78, 6); g.fillRect(122, 80, 5, 70);
  });
  TEX.concrete = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#9b9a95', 0.07, 9, 2);
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 2; for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); }
  });
  TEX.metal = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#8d9196', 0.05, 11, 2);
    for (let x = 0; x < w; x += 12) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, 0, 3, h); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x + 6, 0, 3, h); }
  });
  TEX.pad = canvasTex(512, 512, (g, w, h) => {
    noiseFill(g, w, h, '#8a8986', 0.06, 13, 2);
    g.strokeStyle = '#f2f2ee'; g.lineWidth = 14; g.beginPath(); g.arc(256, 256, 190, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#e8c33a'; g.lineWidth = 10; g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = '#f2f2ee'; g.fillRect(170, 150, 40, 212); g.fillRect(302, 150, 40, 212); g.fillRect(170, 236, 172, 40);
  }, false);
  return TEX;
}

// ---------- budowanie geometrii ----------
class Builder {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; }
  quad(a, b, c, d, n, uvs, col = [1, 1, 1]) {
    for (const [v, t] of [[a, uvs[0]], [b, uvs[1]], [c, uvs[2]], [a, uvs[0]], [c, uvs[2]], [d, uvs[3]]]) { this.p.push(...v); this.n.push(...n); this.uv.push(...t); this.c.push(...col); }
  }
  tri(a, b, c, n, uvs, col = [1, 1, 1]) { for (const [v, t] of [[a, uvs[0]], [b, uvs[1]], [c, uvs[2]]]) { this.p.push(...v); this.n.push(...n); this.uv.push(...t); this.c.push(...col); } }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    return g;
  }
}
// ściany prostopadłościanu (x,z środek, y0 dół, w,d,h, yaw) z UV w metrach/skala
function boxWalls(B, o, y0, h, scale, col, top = false, bottom = false) {
  const c = Math.cos(o.yaw), s = Math.sin(o.yaw);
  const P = (lx, y, lz) => [o.x + lx * c + lz * s, y, o.z - lx * s + lz * c];
  const hw = o.w / 2, hd = o.d / 2;
  const faces = [[[-hw, hd], [hw, hd], [0, 0, 1], o.w], [[hw, hd], [hw, -hd], [1, 0, 0], o.d], [[hw, -hd], [-hw, -hd], [0, 0, -1], o.w], [[-hw, -hd], [-hw, hd], [-1, 0, 0], o.d]];
  for (const [a, b, nl, len] of faces) {
    const n = [nl[0] * c + nl[2] * s, 0, -nl[0] * s + nl[2] * c];
    const u1 = len / scale, v1 = h / scale;
    B.quad(P(a[0], y0, a[1]), P(b[0], y0, b[1]), P(b[0], y0 + h, b[1]), P(a[0], y0 + h, a[1]), n, [[0, 0], [u1, 0], [u1, v1], [0, v1]], col);
  }
  if (top) B.quad(P(-hw, y0 + h, hd), P(hw, y0 + h, hd), P(hw, y0 + h, -hd), P(-hw, y0 + h, -hd), [0, 1, 0], [[0, 0], [o.w / scale, 0], [o.w / scale, o.d / scale], [0, o.d / scale]], col);
}
function gableRoof(Broof, Bwall, o, y0, pitch, over, col, wcol) {
  const c = Math.cos(o.yaw), s = Math.sin(o.yaw);
  const P = (lx, y, lz) => [o.x + lx * c + lz * s, y, o.z - lx * s + lz * c];
  const hw = o.w / 2 + over, hd = o.d / 2 + over, rh = (o.w / 2) * pitch;
  const L = Math.hypot(hw, rh);
  for (const sd of [-1, 1]) {
    const nl = [sd * rh / L, hw / L, 0], n = [nl[0] * c, nl[1], -nl[0] * s];
    const a = P(sd * hw, y0 - over * pitch, hd), b = P(sd * hw, y0 - over * pitch, -hd), cc = P(0, y0 + rh, -hd), d = P(0, y0 + rh, hd);
    if (sd > 0) Broof.quad(a, b, cc, d, n, [[0, 0], [hd * 2 / 3, 0], [hd * 2 / 3, L / 3], [0, L / 3]], col);
    else Broof.quad(b, a, d, cc, n, [[0, 0], [hd * 2 / 3, 0], [hd * 2 / 3, L / 3], [0, L / 3]], col);
  }
  for (const sd of [-1, 1]) {
    const n = [s * sd, 0, c * sd];
    const a = P(-o.w / 2, y0, sd * o.d / 2), b = P(o.w / 2, y0, sd * o.d / 2), t = P(0, y0 + o.w / 2 * pitch, sd * o.d / 2);
    if (sd > 0) Bwall.tri(a, b, t, n, [[0, 0.1], [o.w / 3, 0.1], [o.w / 6, 0.1]], wcol); else Bwall.tri(b, a, t, n, [[0, 0.1], [o.w / 3, 0.1], [o.w / 6, 0.1]], wcol);
  }
}
function cylinder(B, x, y0, z, r, h, seg, col, cap = true, scale = 3) {
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
    const p0 = [x + Math.cos(a0) * r, z + Math.sin(a0) * r], p1 = [x + Math.cos(a1) * r, z + Math.sin(a1) * r];
    const n = [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)];
    B.quad([p1[0], y0, p1[1]], [p0[0], y0, p0[1]], [p0[0], y0 + h, p0[1]], [p1[0], y0 + h, p1[1]], n, [[0, 0], [1, 0], [1, h / scale], [0, h / scale]], col);
    if (cap) B.tri([x, y0 + h, z], [p1[0], y0 + h, p1[1]], [p0[0], y0 + h, p0[1]], [0, 1, 0], [[0.5, 0.5], [1, 0], [0, 0]], col);
  }
}
// kratownica słupa: 4 nogi zbiegające się + poprzeczki
function lattice(B, x, z, y0, y1, baseW, topW, yaw, col) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (lx, y, lz) => [x + lx * c + lz * s, y, z - lx * s + lz * c];
  const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const beam = (a, b, t) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const px = -dz, pz = dx, pl = Math.hypot(px, pz) || 1;
    const o = [px / pl * t, 0, pz / pl * t];
    const n = [px / pl, 0, pz / pl];
    B.quad([a[0] - o[0], a[1], a[2] - o[2]], [a[0] + o[0], a[1], a[2] + o[2]], [b[0] + o[0], b[1], b[2] + o[2]], [b[0] - o[0], b[1], b[2] - o[2]], n, [[0, 0], [1, 0], [1, 1], [0, 1]], col);
    B.quad([a[0] + o[0], a[1], a[2] + o[2]], [a[0] - o[0], a[1], a[2] - o[2]], [b[0] - o[0], b[1], b[2] - o[2]], [b[0] + o[0], b[1], b[2] + o[2]], [-n[0], 0, -n[2]], [[0, 0], [1, 0], [1, 1], [0, 1]], col);
  };
  const H = y1 - y0, lv = 6;
  for (let k = 0; k < 4; k++) {
    const [a, b] = legs[k], [a2, b2] = legs[(k + 1) % 4];
    beam(P(a * baseW, y0, b * baseW), P(a * topW, y1, b * topW), 0.18);
    for (let l = 0; l < lv; l++) {
      const t0 = l / lv, t1 = (l + 1) / lv, w0 = baseW + (topW - baseW) * t0, w1 = baseW + (topW - baseW) * t1;
      beam(P(a * w0, y0 + H * t0, b * w0), P(a2 * w1, y0 + H * t1, b2 * w1), 0.07);
    }
  }
}

export function buildObjectMeshes(O, terrain) {
  const T = textures();
  const B = { wall: new Builder(), roof: new Builder(), wood: new Builder(), concrete: new Builder(), metal: new Builder(), pad: new Builder(), steel: new Builder() };
  const rng = new Rng(99);
  const wallTints = [[1, 1, 1], [1, 0.95, 0.85], [0.95, 0.92, 0.8], [0.9, 0.93, 0.95], [1, 0.9, 0.82], [0.92, 0.96, 0.88]];
  for (const b of O.boxes) {
    if (b.hidden) continue;
    const y0 = b.y - b.h / 2;
    const o = { x: b.x, z: b.z, w: b.w, d: b.d, yaw: b.yaw };
    switch (b.kind) {
      case 'house': case 'church': {
        const tint = b.kind === 'church' ? [1, 0.98, 0.92] : wallTints[Math.floor((b.hue || 0) * wallTints.length)];
        boxWalls(B.wall, o, y0 - 1.5, b.h + 1.5, 3, tint);
        const rt = rng.float(0.8, 1.1);
        gableRoof(B.roof, B.wall, o, y0 + b.h, b.kind === 'church' ? 0.9 : 0.75, 0.6, [rt, rt * rng.float(0.85, 1), rt * rng.float(0.8, 1)], tint);
        break;
      }
      case 'tower': {
        boxWalls(B.wall, o, y0, b.h, 3, [1, 0.98, 0.92], true);
        // hełm wieży
        const c = [0.35, 0.4, 0.38];
        const top = y0 + b.h, r = b.w * 0.62;
        for (let i = 0; i < 8; i++) { const a0 = i / 8 * 6.283, a1 = (i + 1) / 8 * 6.283; B.metal.tri([b.x + Math.cos(a1) * r, top, b.z + Math.sin(a1) * r], [b.x + Math.cos(a0) * r, top, b.z + Math.sin(a0) * r], [b.x, top + 12, b.z], [Math.cos((a0 + a1) / 2), 0.4, Math.sin((a0 + a1) / 2)], [[0, 0], [1, 0], [0.5, 3]], c); }
        break;
      }
      case 'hut': case 'shed': case 'barn': {
        boxWalls(B.concrete, o, y0 - 2, 2.6, 3, [0.8, 0.78, 0.74]);
        boxWalls(B.wood, o, y0 + 0.6, b.h - 0.6, 3.2, [1, 1, 1]);
        gableRoof(B.roof, B.wood, o, y0 + b.h, 0.95, 0.7, [0.5, 0.45, 0.42], [1, 1, 1]);
        break;
      }
      case 'hangar': {
        boxWalls(B.metal, o, y0, b.h * 0.55, 4, [0.85, 0.87, 0.9]);
        // dach łukowy
        const seg = 12, R = b.w / 2, c = Math.cos(o.yaw), s = Math.sin(o.yaw);
        const P = (lx, y, lz) => [o.x + lx * c + lz * s, y, o.z - lx * s + lz * c];
        for (let i = 0; i < seg; i++) {
          const a0 = Math.PI * i / seg, a1 = Math.PI * (i + 1) / seg;
          const x0 = -Math.cos(a0) * R, y00 = y0 + b.h * 0.55 + Math.sin(a0) * R * 0.5, x1 = -Math.cos(a1) * R, y1 = y0 + b.h * 0.55 + Math.sin(a1) * R * 0.5;
          const n = [-Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0];
          B.metal.quad(P(x0, y00, b.d / 2), P(x1, y1, b.d / 2), P(x1, y1, -b.d / 2), P(x0, y00, -b.d / 2), [n[0] * c, n[1], -n[0] * s], [[0, 0], [0, 1], [b.d / 4, 1], [b.d / 4, 0]], [0.7, 0.72, 0.76]);
          for (const sd of [1, -1]) B.metal.tri(P(x0, y0 + b.h * 0.55, sd * b.d / 2), P(x0, y00, sd * b.d / 2), P(x1, y1, sd * b.d / 2), [s * sd, 0, c * sd], [[0, 0], [0, 1], [1, 1]], [0.85, 0.87, 0.9]);
        }
        break;
      }
      case 'office': case 'station': case 'damhouse': {
        boxWalls(B.wall, o, y0 - 1, b.h + 1, 3, b.kind === 'station' ? [0.85, 0.85, 0.82] : [0.95, 0.96, 0.98], true);
        break;
      }
      case 'dam': case 'foundation': {
        boxWalls(B.concrete, o, y0, b.h, 6, [0.9, 0.89, 0.86], true);
        break;
      }
      case 'fuel': boxWalls(B.metal, o, y0, b.h, 2, [0.85, 0.2, 0.15], true); break;
      case 'tank': cylinder(B.metal, b.x, y0, b.z, b.h / 2, 3.2, 12, [0.9, 0.9, 0.88]); break;
      case 'pad': {
        const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
        const P = (lx, y, lz) => [b.x + lx * c + lz * s, y, b.z - lx * s + lz * c];
        const hw = b.w / 2, top = b.y + b.h / 2;
        B.pad.quad(P(-hw, top, hw), P(hw, top, hw), P(hw, top, -hw), P(-hw, top, -hw), [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
        boxWalls(B.concrete, o, y0 - 0.8, b.h + 0.8, 3, [0.7, 0.7, 0.68]);
        break;
      }
      default: boxWalls(B.wall, o, y0, b.h, 3, [0.9, 0.9, 0.9], true);
    }
  }
  // płyta postojowa bazy (beton) – lekko nad terenem
  for (const s of O.special) {
    if (s.kind === 'apron') {
      const n = 12, dx = s.w / n, dz = s.d / n;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const x0 = s.x - s.w / 2 + i * dx, z0 = s.z - s.d / 2 + j * dz;
        const h = (x, z) => terrain.height(x, z) + 0.06;
        B.concrete.quad([x0, h(x0, z0 + dz), z0 + dz], [x0 + dx, h(x0 + dx, z0 + dz), z0 + dz], [x0 + dx, h(x0 + dx, z0), z0], [x0, h(x0, z0), z0], [0, 1, 0], [[0, 0], [dx / 8, 0], [dx / 8, dz / 8], [0, dz / 8]], [0.95, 0.95, 0.93]);
      }
    }
    if (s.kind === 'crane') lattice(B.steel, s.x, s.z, s.y, s.y + s.h, 1.1, 1.0, 0.2, [0.95, 0.75, 0.1]);
  }
  for (const p of O.pylons) {
    if (p.kind === 'powerPylon') lattice(B.steel, p.x, p.z, p.y0, p.y1, 2.4, 0.7, p.yaw, [0.55, 0.57, 0.58]);
    else lattice(B.steel, p.x, p.z, p.y0, p.y1, 1.8, 0.9, p.yaw, [0.45, 0.47, 0.5]);
    // poprzecznica
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    const w = p.kind === 'powerPylon' ? 5 : 3;
    boxWalls(B.steel, { x: p.x, z: p.z, w: w * 2, d: 0.5, yaw: p.yaw }, p.y1 - 0.5, 0.6, 2, [0.5, 0.52, 0.55], true);
  }
  const group = new THREE.Group();
  const mk = (b, tex, extra = {}) => {
    if (!b.p.length) return;
    const m = new THREE.MeshStandardMaterial({ map: tex || null, vertexColors: true, roughness: extra.rough ?? 0.85, metalness: extra.metal ?? 0 });
    enhance(m);
    const mesh = new THREE.Mesh(b.geometry(), m);
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
  };
  mk(B.wall, T.facade); mk(B.roof, T.roof, { rough: 0.75 }); mk(B.wood, T.wood); mk(B.concrete, T.concrete); mk(B.metal, T.metal, { rough: 0.5, metal: 0.5 });
  mk(B.pad, T.pad, { rough: 0.9 }); mk(B.steel, null, { rough: 0.6, metal: 0.6 });
  // przewody (linie)
  const wp = [];
  for (const w of O.wires) for (let i = 0; i < w.pts.length - 1; i++) wp.push(...w.pts[i], ...w.pts[i + 1]);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  // przewody: zanikają z odległością (w rzeczywistości są słabo widoczne – to zabójcza przeszkoda)
  const lm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: 'varying float vD; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying float vD; void main(){ float a = clamp(1.0 - (vD - 60.0) / 520.0, 0.0, 0.85); if (a <= 0.01) discard; gl_FragColor = vec4(0.09, 0.09, 0.1, a); }',
  });
  const lines = new THREE.LineSegments(lg, lm); lines.frustumCulled = false;
  group.add(lines);
  return group;
}
