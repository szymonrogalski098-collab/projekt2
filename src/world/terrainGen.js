// Proceduralny generator terenu (czysty JS – działa w przeglądarce i w Node dla testów symulacji).
import { noise2, fbm2, ridged2, smoothstep, clamp, lerp } from '../core/noise.js';
import { Rng } from '../core/rng.js';
import {
  MAP, WORLD_SEED, valleyX, valleyFloor, valleyHalfWidth, PASS, RESERVOIR, HALA, SLOPE_SITE,
  GLACIER, RIDGE_Z, TOWN, BASE, HUT, CABLE, MEADOW, stamps,
} from './layout.js';

const HALF = MAP.size / 2;

// ---------- makrorelief (siatka zgrubna) ----------
function carve(h, floor, d, W, sharp = 1.35) {
  if (h <= floor) return h;
  const t = clamp(d / (W * 3.4), 0, 1);
  const u = smoothstep(0.1, 1.0, t);
  return floor + (h - floor) * Math.pow(u, sharp);
}

export function sideValley(x) { // oś bocznej doliny ze zbiornikiem (na zachód od tamy)
  return RESERVOIR.damZ + (x - RESERVOIR.damX) * 0.16 + 110 * Math.sin((x + 880) / 650);
}

function macro(x, z) {
  const wx = x + 420 * fbm2(x / 2700, z / 2700, 3, 11);
  const wz = z + 420 * fbm2(x / 2700 + 7.3, z / 2700 - 2.1, 3, 12);
  const r = ridged2(wx / 4300, wz / 4300, 5, 21, 0.4);
  const hills = fbm2(wx / 5600, wz / 5600, 3, 31) * 0.5 + 0.5;
  const dV = Math.abs(x - valleyX(z));
  const Fref = Math.min(valleyFloor(z), 1500);
  const rise = 720 * Math.pow(smoothstep(0, 3000, dV), 0.9);
  const mount = 900 * Math.pow(r, 1.35) * (0.3 + 0.7 * smoothstep(300, 2000, dV)) * (0.65 + 0.5 * hills);
  let E = Fref + 60 + rise + mount;
  // główna grań na północy
  const rz = z - RIDGE_Z - 140 * Math.sin(x / 950);
  const ridge = Math.exp(-(rz * rz) / (2 * 700 * 700));
  E += 520 * ridge * (0.8 + 0.4 * noise2(x / 1300, 0.5, 41));

  // góry graniczne poza obszarem lotów (zamknięcie widnokręgu), z wylotem doliny na południu
  const o = Math.max(Math.abs(x), Math.abs(z)) - 3800;
  if (o > 0) {
    const exit = z > 0 ? Math.exp(-Math.pow((x - valleyX(z)) / 900, 2)) * smoothstep(3000, 4200, z) : 0;
    E += Math.min(o, 1800) * 0.3 * (1 - exit);
  }

  // cyrk lodowcowy
  const gdx = x - GLACIER.x, gdz = z - GLACIER.z, gd = Math.sqrt(gdx * gdx + gdz * gdz);
  const gm = 1 - smoothstep(GLACIER.r * 0.55, GLACIER.r * 1.25, gd);
  E = lerp(E, Math.max(GLACIER.y + Math.pow(gd / GLACIER.r, 2) * 420, Math.min(E, GLACIER.y + 900)), gm * 0.85);

  // hala – łagodne wypłaszczenie
  const hdx = x - HALA.x, hdz = z - HALA.z, hd = Math.sqrt(hdx * hdx + hdz * hdz);
  const hm = 1 - smoothstep(HALA.r * 0.55, HALA.r * 1.7, hd);
  E = lerp(E, HALA.y + hdx * 0.06 - hdz * 0.04 + 25 * noise2(x / 300, z / 300, 45), hm);

  // dolina główna (U-kształt)
  const d = Math.abs(x - valleyX(z) + 70 * noise2(z / 800, 3.3, 51));
  let h = carve(E, valleyFloor(z), d, valleyHalfWidth(z));

  // boczna dolina ze zbiornikiem
  if (x < -300 && x > -4800) {
    const sd = Math.abs(z - sideValley(x));
    const behind = x < RESERVOIR.damX;
    const floor = behind ? 985 + (RESERVOIR.damX - x) * 0.012 : lerp(990, 946, clamp((x - RESERVOIR.damX) / 500, 0, 1));
    const W = behind ? 170 + clamp((RESERVOIR.damX - x) / 1500, 0, 1) * 120 : 60;
    const fade = smoothstep(-4800, -4200, x);
    h = lerp(h, carve(h, floor, sd, W, 1.2), fade);
  }

  // stok pod lądowanie na pochyłości (płaszczyzna)
  const sdx = x - SLOPE_SITE.x, sdz = z - SLOPE_SITE.z, sdd = Math.sqrt(sdx * sdx + sdz * sdz);
  const sm = 1 - smoothstep(SLOPE_SITE.r * 1.6, SLOPE_SITE.r * 4.5, sdd);
  const tan = Math.tan(SLOPE_SITE.slopeDeg * Math.PI / 180);
  const plane = SLOPE_SITE.y + tan * (sdx * Math.cos(SLOPE_SITE.dir) + sdz * Math.sin(SLOPE_SITE.dir));
  h = lerp(h, plane, sm);
  return h;
}

// ---------- erozja termiczna (osypywanie: ogranicza kąt stoku, zmienny próg = ściany skalne w miejscach) ----------
function thermal(H, M, cell, iters) {
  const tal = new Float32Array(M * M);
  for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
    const x = -HALF + i * cell, z = -HALF + j * cell;
    const n = noise2(x / 900, z / 900, 61) * 0.6 + noise2(x / 250, z / 250, 62) * 0.4;
    const deg = 31 + 15 * smoothstep(0.15, 0.75, n);     // 31°..46°
    tal[j * M + i] = Math.tan(deg * Math.PI / 180) * cell;
  }
  const D = new Float32Array(M * M);
  const nb = [1, -1, M, -M, M + 1, M - 1, -M + 1, -M - 1], nd = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];
  for (let it = 0; it < iters; it++) {
    D.fill(0);
    for (let j = 1; j < M - 1; j++) for (let i = 1; i < M - 1; i++) {
      const k = j * M + i, h = H[k], T = tal[k];
      let tot = 0, mx = 0;
      for (let q = 0; q < 8; q++) { const d = h - H[k + nb[q]] - T * nd[q]; if (d > 0) { tot += d; if (d > mx) mx = d; } }
      if (tot <= 0) continue;
      const move = mx * 0.45;
      for (let q = 0; q < 8; q++) { const d = h - H[k + nb[q]] - T * nd[q]; if (d > 0) { const m = move * d / tot; D[k] -= m; D[k + nb[q]] += m; } }
    }
    for (let k = 0; k < M * M; k++) H[k] += D[k];
  }
}

// ---------- erozja hydrauliczna (kropelkowa) ----------
function erode(H, M, cell, drops, rng, depo, flow) {
  const inertia = 0.06, capK = 5, minCap = 0.01, erodeK = 0.35, depK = 0.3, evap = 0.015, grav = 5, life = 45, rad = 3;
  const hn = new Float32Array(H.length);
  for (let i = 0; i < H.length; i++) hn[i] = H[i] / cell;
  // pędzel erozji
  const bi = [], bw = [];
  let wsum = 0;
  for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
    const d = Math.sqrt(x * x + y * y);
    if (d <= rad) { bi.push(y * M + x); const w = 1 - d / rad; bw.push(w); wsum += w; }
  }
  for (let i = 0; i < bw.length; i++) bw[i] /= wsum;
  const gradH = (px, py) => {
    const ix = px | 0, iy = py | 0, fx = px - ix, fy = py - iy, k = iy * M + ix;
    const a = hn[k], b = hn[k + 1], c = hn[k + M], d = hn[k + M + 1];
    return [(b - a) * (1 - fy) + (d - c) * fy, (c - a) * (1 - fx) + (d - b) * fx, a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy];
  };
  for (let n = 0; n < drops; n++) {
    let px = rng.float(rad + 1, M - rad - 2), py = rng.float(rad + 1, M - rad - 2);
    let dx = 0, dy = 0, speed = 1, water = 1, sed = 0;
    for (let l = 0; l < life; l++) {
      const ix = px | 0, iy = py | 0, fx = px - ix, fy = py - iy, k = iy * M + ix;
      const g = gradH(px, py);
      dx = dx * inertia - g[0] * (1 - inertia);
      dy = dy * inertia - g[1] * (1 - inertia);
      const len = Math.hypot(dx, dy);
      if (len < 1e-9) break;
      dx /= len; dy /= len;
      px += dx; py += dy;
      if (px < rad + 1 || px >= M - rad - 2 || py < rad + 1 || py >= M - rad - 2) break;
      const hNew = gradH(px, py)[2];
      const dh = hNew - g[2];
      const cap = Math.max(-dh * speed * water * capK, minCap);
      if (sed > cap || dh > 0) {
        const amt = dh > 0 ? Math.min(dh, sed) : (sed - cap) * depK;
        sed -= amt;
        hn[k] += amt * (1 - fx) * (1 - fy); hn[k + 1] += amt * fx * (1 - fy);
        hn[k + M] += amt * (1 - fx) * fy; hn[k + M + 1] += amt * fx * fy;
        depo[k] += amt;
      } else {
        const amt = Math.min((cap - sed) * erodeK, -dh);
        for (let b = 0; b < bi.length; b++) {
          const kk = k + bi[b];
          const e = Math.min(hn[kk], amt * bw[b]);
          hn[kk] -= e; sed += e;
        }
        flow[k] += amt;
      }
      speed = Math.sqrt(Math.max(0, speed * speed + dh * grav));
      water *= 1 - evap;
    }
  }
  for (let i = 0; i < H.length; i++) H[i] = hn[i] * cell;
}

// ---------- droga (serpentyny) ----------
export function roadPath() {
  const pts = [];
  const push = (x, z) => pts.push([x, z]);
  for (let z = 6000; z > -250; z -= 60) push(valleyX(z) + 190 + 30 * Math.sin(z / 400), z);
  // serpentyny na wschodnim stoku w stronę schroniska
  const Sx = valleyX(-250) + 230, Sz = -250, Hx = HUT.x - 70, Hz = HUT.z + 20;
  const L = Math.hypot(Hx - Sx, Hz - Sz), dx = (Hx - Sx) / L, dz = (Hz - Sz) / L, px = -dz, pz = dx;
  const legs = 10, A = 260;
  for (let i = 1; i <= legs; i++) {
    const side = i === legs ? 0 : (i % 2 ? 1 : -1) * A * (0.8 + 0.2 * Math.sin(i * 1.7));
    const t = i / legs, cx = Sx + dx * L * t + px * side, cz = Sz + dz * L * t + pz * side;
    const [lx, lz] = pts[pts.length - 1];
    for (let s = 1; s <= 10; s++) { const u = s / 10; push(lerp(lx, cx, u), lerp(lz, cz, u)); }
  }
  push(HUT.x - 20, HUT.z + 10);
  // zagęszczenie co ~4 m
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 4));
    for (let k = 0; k < n; k++) out.push([lerp(ax, bx, k / n), lerp(az, bz, k / n)]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// Separowalny upsampling ×4 (Catmull-Rom)
function upsample4(A, M) {
  const N = M * 4, W = [];
  for (let p = 0; p < 4; p++) { const t = p / 4, t2 = t * t, t3 = t2 * t; W.push([-0.5 * t3 + t2 - 0.5 * t, 1.5 * t3 - 2.5 * t2 + 1, -1.5 * t3 + 2 * t2 + 0.5 * t, 0.5 * t3 - 0.5 * t2]); }
  const R = new Float32Array(M * N);
  for (let j = 0; j < M; j++) {
    const o = j * M;
    for (let i = 0; i < N; i++) {
      const c = i >> 2, w = W[i & 3];
      const a = A[o + Math.max(0, c - 1)], b = A[o + c], d = A[o + Math.min(M - 1, c + 1)], e = A[o + Math.min(M - 1, c + 2)];
      R[j * N + i] = w[0] * a + w[1] * b + w[2] * d + w[3] * e;
    }
  }
  const O = new Float32Array(N * N);
  for (let j = 0; j < N; j++) {
    const c = j >> 2, w = W[j & 3];
    const r0 = Math.max(0, c - 1) * N, r1 = c * N, r2 = Math.min(M - 1, c + 1) * N, r3 = Math.min(M - 1, c + 2) * N, o = j * N;
    for (let i = 0; i < N; i++) O[o + i] = w[0] * R[r0 + i] + w[1] * R[r1 + i] + w[2] * R[r2 + i] + w[3] * R[r3 + i];
  }
  return O;
}

// ---------- główna funkcja ----------
export function generateTerrain(opts = {}) {
  const t0 = Date.now();
  const N = MAP.n, S = MAP.size, cellF = S / N;           // 4 m
  const M = N / 4, cellC = S / M;                         // 16 m
  const rng = new Rng(WORLD_SEED);

  // 1. makro na siatce zgrubnej
  const Hc = new Float32Array(M * M);
  for (let j = 0; j < M; j++) {
    const z = -HALF + j * cellC;
    for (let i = 0; i < M; i++) Hc[j * M + i] = macro(-HALF + i * cellC, z);
  }
  const tA = Date.now();
  // 2. erozja
  thermal(Hc, M, cellC, opts.thermal ?? 90);
  // wygładzenie tarasów po erozji termicznej (2x rozmycie 5x5)
  for (let pass = 0; pass < 2; pass++) {
    const tmp = new Float32Array(Hc);
    for (let j = 2; j < M - 2; j++) for (let i = 2; i < M - 2; i++) {
      let s2 = 0, w2 = 0;
      for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const w = (3 - Math.abs(a)) * (3 - Math.abs(b)); s2 += tmp[(j + b) * M + i + a] * w; w2 += w; }
      Hc[j * M + i] = s2 / w2;
    }
  }
  const depoC = new Float32Array(M * M), flowC = new Float32Array(M * M);
  erode(Hc, M, cellC, opts.drops ?? 420000, rng, depoC, flowC);

  const tB = Date.now();
  // 3. upsampling (Catmull-Rom) + detal
  const H = upsample4(Hc, M), depo = upsample4(depoC, M), flow = upsample4(flowC, M);
  const d1c = new Float32Array(M * M);
  for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) d1c[j * M + i] = noise2((-HALF + i * cellC) / 150, (-HALF + j * cellC) / 150, 71);
  const d1f = upsample4(d1c, M);
  const tC = Date.now();
  // detal zależny od nachylenia i wysokości
  for (let j = 1; j < N - 1; j++) {
    const z = -HALF + j * cellF;
    for (let i = 1; i < N - 1; i++) {
      const idx = j * N + i, x = -HALF + i * cellF;
      const h = H[idx];
      const sx = (H[idx + 1] - H[idx - 1]) / (2 * cellF), sz = (H[idx + N] - H[idx - N]) / (2 * cellF);
      const slope = Math.sqrt(sx * sx + sz * sz);
      const rock = smoothstep(0.45, 1.0, slope) * (0.4 + 0.6 * smoothstep(1300, 2100, h));
      const d1 = d1f[idx], d2 = noise2(x / 55, z / 55, 72), d3 = rock > 0.05 ? noise2(x / 21, z / 21, 73) : 0;
      H[idx] = h + (1.0 + 5 * rock) * d1 + (0.25 + 2 * rock) * d2 + (0.08 + 0.7 * rock) * d3;
    }
  }

  const tD = Date.now();
  const heightAtRaw = (x, z) => sampleTri(H, N, cellF, x, z);
  // 4. droga
  const road = roadPath();
  const roadH = road.map(([x, z]) => heightAtRaw(x, z));
  const sm = roadH.slice();
  for (let pass = 0; pass < 3; pass++) for (let k = 0; k < sm.length; k++) {
    let s = 0, c = 0; for (let q = -8; q <= 8; q++) { const v = roadH[clamp(k + q, 0, sm.length - 1)]; s += v; c++; } sm[k] = s / c;
  }
  const roadDist = new Float32Array(N * N).fill(1e9), roadTarget = new Float32Array(N * N);
  for (let k = 0; k < road.length; k++) {
    const [x, z] = road[k];
    const ci = Math.round((x + HALF) / cellF), cj = Math.round((z + HALF) / cellF);
    for (let dj = -5; dj <= 5; dj++) for (let di = -5; di <= 5; di++) {
      const ii = ci + di, jj = cj + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
      const dx = -HALF + ii * cellF - x, dz = -HALF + jj * cellF - z, d = Math.sqrt(dx * dx + dz * dz), idx = jj * N + ii;
      if (d < roadDist[idx]) { roadDist[idx] = d; roadTarget[idx] = sm[k]; }
    }
  }
  for (let i = 0; i < N * N; i++) if (roadDist[i] < 20) {
    const w = 1 - smoothstep(4.5, 14, roadDist[i]);
    H[i] = lerp(H[i], roadTarget[i] - 0.15, w);
  }

  // 5. stemple (płaskie lądowiska)
  const st = stamps();
  for (let k = st.length - 1; k >= 0; k--) {
    const sp = st[k];
    let sum = 0, c = 0;
    for (let a = 0; a < 24; a++) for (const rr of [0, 0.5, 1]) { sum += heightAtRaw(sp.x + Math.cos(a / 24 * 6.283) * sp.r * rr, sp.z + Math.sin(a / 24 * 6.283) * sp.r * rr); c++; }
    sp.y = Math.round(sum / c * 10) / 10;
    if (sp.ref) sp.ref.y = sp.y;
    applyStamp(H, N, cellF, sp);
  }

  const tE = Date.now();
  // 6. mapa pokrycia (splat): R las, G piarg/osady, B nawierzchnia, A lód
  const splat = new Uint8Array(N * N * 4);
  const forest = new Float32Array(N * N);
  // pola szumu na siatce zgrubnej (16 m) – interpolowane
  const n1c = new Float32Array(M * M), n2c = new Float32Array(M * M), n3c = new Float32Array(M * M);
  for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
    const x = -HALF + i * cellC, z = -HALF + j * cellC, k = j * M + i;
    n1c[k] = fbm2(x / 420, z / 420, 4, 91); n2c[k] = noise2(x / 90, z / 90, 92); n3c[k] = noise2(x / 300, z / 300, 95);
  }
  const clears = [
    [TOWN.x, TOWN.z, TOWN.r + 80, 140], [BASE.x, BASE.z, 230, 120], [MEADOW.x, MEADOW.z, MEADOW.r + 6, 14],
    [HUT.x, HUT.z, 140, 80], [HALA.x, HALA.z, HALA.r * 0.9, 250], [SLOPE_SITE.x, SLOPE_SITE.z, 130, 60],
  ];
  const cabDx = CABLE.b.x - CABLE.a.x, cabDz = CABLE.b.z - CABLE.a.z, cabL2 = cabDx * cabDx + cabDz * cabDz;
  for (let j = 1; j < N - 1; j++) {
    const z = -HALF + j * cellF;
    const cy = j / 4, cj = Math.min(M - 2, cy | 0), ty = cy - cj;
    const vx = valleyX(z), vw = valleyHalfWidth(z) * 0.75;
    for (let i = 1; i < N - 1; i++) {
      const idx = j * N + i, x = -HALF + i * cellF, h = H[idx];
      const cx = i / 4, ci = Math.min(M - 2, cx | 0), tx = cx - ci, kc = cj * M + ci;
      const bil = A => { const a = A[kc] + (A[kc + 1] - A[kc]) * tx, b = A[kc + M] + (A[kc + M + 1] - A[kc + M]) * tx; return a + (b - a) * ty; };
      const sx = (H[idx + 1] - H[idx - 1]) / (2 * cellF), sz = (H[idx + N] - H[idx - N]) / (2 * cellF);
      const slope = Math.sqrt(sx * sx + sz * sz);
      const n1 = bil(n1c);
      let f = 0;
      if (h < 1800 && slope < 0.95) {
        const tree = 1580 + 90 * n1 + 60 * bil(n2c);
        f = smoothstep(tree, tree - 120, h) * smoothstep(0.95, 0.6, slope) * smoothstep(-0.25, 0.1, n1 + 0.15);
        if (x <= RESERVOIR.damX + 60 && Math.abs(z - sideValley(x)) < 700) f *= smoothstep(RESERVOIR.level + 2, RESERVOIR.level + 10, h);
        f *= 1 - 0.88 * smoothstep(-1500, -800, z) * (1 - smoothstep(vw * 0.8, vw * 1.25, Math.abs(x - vx) + 140 * bil(n2c) + 90 * n1));
        for (let c = 0; c < clears.length && f > 0; c++) {
          const cl = clears[c], dx = x - cl[0], dz = z - cl[1], R = cl[2] + cl[3];
          if (dx > R || dx < -R || dz > R || dz < -R) continue;
          f *= smoothstep(cl[2], R, Math.sqrt(dx * dx + dz * dz));
        }
        if (f > 0) {
          f *= smoothstep(9, 16, roadDist[idx]);
          const wx = x - CABLE.a.x, wz = z - CABLE.a.z, t = clamp((wx * cabDx + wz * cabDz) / cabL2, 0, 1);
          f *= smoothstep(14, 26, Math.hypot(wx - cabDx * t, wz - cabDz * t));
        }
      }
      forest[idx] = f;
      const scree = clamp(depo[idx] * 0.9, 0, 1) * smoothstep(1250, 1700, h) + smoothstep(0.75, 1.1, slope) * 0.25 * smoothstep(1500, 1900, h);
      const paved = roadDist[idx] < 6 ? 1 - smoothstep(3.5, 6, roadDist[idx]) : 0;
      let ice = 0;
      if (h > 2100) {
        const gdx = x - GLACIER.x, gdz = z - GLACIER.z;
        ice = (1 - smoothstep(GLACIER.r * 0.55, GLACIER.r * 0.95, Math.sqrt(gdx * gdx + gdz * gdz) + 120 * bil(n3c))) * smoothstep(2250, 2400, h + 80 * n1) * smoothstep(0.9, 0.5, slope);
      }
      splat[idx * 4] = f * 255; splat[idx * 4 + 1] = clamp(scree, 0, 1) * 255; splat[idx * 4 + 2] = paved * 255; splat[idx * 4 + 3] = clamp(ice, 0, 1) * 255;
    }
  }
  const t1 = Date.now();
  return new Terrain(H, N, cellF, splat, forest, road, { genMs: t1 - t0, phases: [tA - t0, tB - tA, tC - tB, tD - tC, tE - tD, t1 - tE] });
}

function clear(x, z, cx, cz, r, blend) { const d = Math.hypot(x - cx, z - cz); return smoothstep(r, r + blend, d); }
export function distSeg(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az, wx = px - ax, wz = pz - az;
  const t = clamp((wx * vx + wz * vz) / (vx * vx + vz * vz), 0, 1);
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

function applyStamp(H, N, cell, s) {
  const R = s.r + s.blend;
  const i0 = Math.max(0, Math.floor((s.x - R + HALF) / cell)), i1 = Math.min(N - 1, Math.ceil((s.x + R + HALF) / cell));
  const j0 = Math.max(0, Math.floor((s.z - R + HALF) / cell)), j1 = Math.min(N - 1, Math.ceil((s.z + R + HALF) / cell));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const x = -HALF + i * cell, z = -HALF + j * cell, d = Math.hypot(x - s.x, z - s.z);
    if (d > R) continue;
    const w = 1 - smoothstep(s.r, R, d);
    const idx = j * N + i;
    let ty = s.y;
    if (s.plane) ty += Math.tan(s.plane.deg * Math.PI / 180) * ((x - s.x) * Math.cos(s.plane.dir) + (z - s.z) * Math.sin(s.plane.dir));
    H[idx] = s.soft ? lerp(H[idx], ty + (H[idx] - ty) * 0.08, w) : lerp(H[idx], ty, w);
  }
}

// Interpolacja trójkątna zgodna z siatką renderu (przekątna (i,j)-(i+1,j+1)).
export function sampleTri(H, N, cell, x, z) {
  let u = (x + HALF) / cell, v = (z + HALF) / cell;
  if (u < 0) u = 0; else if (u > N - 1.001) u = N - 1.001;
  if (v < 0) v = 0; else if (v > N - 1.001) v = N - 1.001;
  const i = u | 0, j = v | 0, fx = u - i, fz = v - j, k = j * N + i;
  const h00 = H[k], h10 = H[k + 1], h01 = H[k + N], h11 = H[k + N + 1];
  return fx >= fz ? h00 + fx * (h10 - h00) + fz * (h11 - h10) : h00 + fz * (h01 - h00) + fx * (h11 - h01);
}

export class Terrain {
  constructor(H, N, cell, splat, forest, road, info) {
    this.H = H; this.N = N; this.cell = cell; this.splat = splat; this.forest = forest; this.road = road; this.info = info;
    this.half = HALF;
  }
  height(x, z) { return sampleTri(this.H, this.N, this.cell, x, z); }
  normal(x, z, out = [0, 1, 0]) {
    const e = this.cell;
    const hx = this.height(x + e, z) - this.height(x - e, z), hz = this.height(x, z + e) - this.height(x, z - e);
    const nx = -hx, ny = 2 * e, nz = -hz, l = Math.hypot(nx, ny, nz);
    out[0] = nx / l; out[1] = ny / l; out[2] = nz / l; return out;
  }
  forestAt(x, z) {
    const i = Math.round((x + HALF) / this.cell), j = Math.round((z + HALF) / this.cell);
    if (i < 0 || j < 0 || i >= this.N || j >= this.N) return 0;
    return this.forest[j * this.N + i];
  }
  // Maksymalna wysokość terenu w kole (do szukania przeszkód dla autopilota)
  maxHeightNear(x, z, r) {
    let m = -1e9; const st = Math.max(this.cell, r / 4);
    for (let dz = -r; dz <= r; dz += st) for (let dx = -r; dx <= r; dx += st) m = Math.max(m, this.height(x + dx, z + dz));
    return m;
  }
}
