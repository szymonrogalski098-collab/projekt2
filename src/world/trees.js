// Rozmieszczenie drzew (deterministyczne) – wspólne dla renderu i kolizji.
import { hash2 } from '../core/rng.js';
import { MAP } from './layout.js';

export const TREE_CELL = 6.5;

export function placeTrees(terrain) {
  const half = MAP.size / 2, n = Math.floor(MAP.size / TREE_CELL);
  const xs = [], zs = [], ys = [], hs = [], ks = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const r = hash2(i, j, 501);
    const x = -half + (i + 0.15 + 0.7 * hash2(i, j, 502)) * TREE_CELL;
    const z = -half + (j + 0.15 + 0.7 * hash2(i, j, 503)) * TREE_CELL;
    const f = terrain.forestAt(x, z);
    if (f <= 0.02 || r > f * 0.92) continue;
    const y = terrain.height(x, z);
    const alt = Math.min(1, Math.max(0, (y - 1000) / 600));
    const h = (13 + 15 * hash2(i, j, 504)) * (1 - 0.45 * alt) * (0.75 + 0.25 * f);
    xs.push(x); zs.push(z); ys.push(y); hs.push(h);
    ks.push(hash2(i, j, 505) < 0.12 + 0.25 * (1 - alt) ? 1 : 0); // 1 = liściaste/modrzew, 0 = świerk
  }
  const N = xs.length;
  const out = { count: N, x: new Float32Array(xs), z: new Float32Array(zs), y: new Float32Array(ys), h: new Float32Array(hs), kind: new Uint8Array(ks) };
  // siatka kubełków do zapytań przestrzennych
  const B = 48, nb = Math.ceil(MAP.size / B);
  const counts = new Uint32Array(nb * nb + 1);
  const cellOf = k => Math.min(nb - 1, Math.max(0, Math.floor((out.z[k] + half) / B))) * nb + Math.min(nb - 1, Math.max(0, Math.floor((out.x[k] + half) / B)));
  for (let k = 0; k < N; k++) counts[cellOf(k) + 1]++;
  for (let i = 1; i <= nb * nb; i++) counts[i] += counts[i - 1];
  const idx = new Uint32Array(N), fill = counts.slice();
  for (let k = 0; k < N; k++) idx[fill[cellOf(k)]++] = k;
  out.grid = { B, nb, start: counts, idx, half };
  return out;
}

// Wywołuje fn(k) dla drzew w promieniu r od (x,z)
export function forTreesNear(trees, x, z, r, fn) {
  const g = trees.grid;
  const i0 = Math.max(0, Math.floor((x - r + g.half) / g.B)), i1 = Math.min(g.nb - 1, Math.floor((x + r + g.half) / g.B));
  const j0 = Math.max(0, Math.floor((z - r + g.half) / g.B)), j1 = Math.min(g.nb - 1, Math.floor((z + r + g.half) / g.B));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const c = j * g.nb + i;
    for (let q = g.start[c]; q < g.start[c + 1]; q++) if (fn(g.idx[q]) === true) return true;
  }
  return false;
}
