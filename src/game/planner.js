// Planer trasy autopilota: A* na siatce 96 m z kosztem wysokości (doliny zamiast grani), wygładzanie linią widoczności.
const CELL = 96, HALF = 4096, NG = Math.ceil(2 * HALF / CELL);

export function obstacleGrid(ctx) {
  if (ctx._obsGrid) return ctx._obsGrid;
  const T = ctx.terrain, top = new Float32Array(NG * NG);
  for (let j = 0; j < NG; j++) for (let i = 0; i < NG; i++) {
    let m = -1e9;
    for (let b = 0; b <= 6; b++) for (let a = 0; a <= 6; a++) {
      const x = -HALF + i * CELL + a * CELL / 6, z = -HALF + j * CELL + b * CELL / 6;
      m = Math.max(m, T.height(x, z) + T.forestAt(x, z) * 26);
    }
    top[j * NG + i] = m;
  }
  // przeszkody statyczne (budynki, słupy, przewody)
  for (const b of ctx.world.boxes) { const c = cellOf(b.x, b.z); if (c >= 0) top[c] = Math.max(top[c], b.y + b.hy); }
  for (const c of ctx.world.cyls) { const k = cellOf(c.x, c.z); if (k >= 0) top[k] = Math.max(top[k], c.y1); }
  for (const w of ctx.world.wires) for (const p of w.pts) { const k = cellOf(p[0], p[2]); if (k >= 0) top[k] = Math.max(top[k], p[1]); }
  ctx._obsGrid = top;
  return top;
}
function cellOf(x, z) {
  const i = Math.floor((x + HALF) / CELL), j = Math.floor((z + HALF) / CELL);
  return i < 0 || j < 0 || i >= NG || j >= NG ? -1 : j * NG + i;
}
const cx = i => -HALF + (i + 0.5) * CELL;

// Zwraca listę punktów [{x,z,alt}] od startu do celu; alt = wymagana wysokość bezwzględna przelotu.
export function planRoute(ctx, from, to, opts = {}) {
  const top = obstacleGrid(ctx);
  const clear = opts.clear ?? 45, ceiling = opts.ceiling ?? 2400, climbW = opts.climbW ?? 4;
  const A = k => top[k] + clear;
  const s = cellOf(from.x, from.z), g = cellOf(to.x, to.z);
  if (s < 0 || g < 0) return [{ x: to.x, z: to.z, alt: to.y + clear }];
  const gs = new Float64Array(NG * NG).fill(Infinity), came = new Int32Array(NG * NG).fill(-1), closed = new Uint8Array(NG * NG);
  const heap = [];
  const push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const r = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { const a = 2 * i + 1, b = a + 1; let m = i; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return r; };
  const gi = g % NG, gj = (g / NG) | 0;
  const hfun = k => Math.hypot((k % NG) - gi, ((k / NG) | 0) - gj) * CELL;
  const startAlt = Math.max(from.y, A(s));
  gs[s] = 0; push(s, hfun(s));
  const alt = new Float32Array(NG * NG); alt[s] = startAlt;
  while (heap.length) {
    const [, k] = pop();
    if (closed[k]) continue; closed[k] = 1;
    if (k === g) break;
    const i = k % NG, j = (k / NG) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= NG || nj >= NG) continue;
      const n = nj * NG + ni; if (closed[n]) continue;
      const d = Math.hypot(di, dj) * CELL;
      const need = A(n);
      const up = Math.max(0, need - alt[k]);
      const c = gs[k] + d + up * climbW + Math.max(0, need - ceiling) * 40;
      if (c < gs[n]) { gs[n] = c; came[n] = k; alt[n] = Math.max(need, alt[k] - d * 0.25); push(n, c + hfun(n)); }
    }
  }
  if (came[g] < 0 && g !== s) return [{ x: to.x, z: to.z, alt: Math.max(to.y + clear, startAlt) }];
  const cells = []; for (let k = g; k >= 0; k = came[k]) { cells.push(k); if (k === s) break; }
  cells.reverse();
  // wygładzanie: pomiń punkty, jeśli odcinek nie wymaga wyższego przelotu
  const segMax = (ax, az, bx, bz) => { let m = -1e9; const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / (CELL / 2))); for (let q = 0; q <= n; q++) { const k = cellOf(ax + (bx - ax) * q / n, az + (bz - az) * q / n); if (k >= 0) m = Math.max(m, A(k)); } return m; };
  const pts = cells.map(k => ({ x: cx(k % NG), z: cx((k / NG) | 0) }));
  pts[0] = { x: from.x, z: from.z }; pts[pts.length - 1] = { x: to.x, z: to.z };
  const out = [pts[0]];
  let a = 0;
  while (a < pts.length - 1) {
    let b = pts.length - 1;
    const base = Math.max(segMax(pts[a].x, pts[a].z, pts[a + 1].x, pts[a + 1].z), 0);
    while (b > a + 1) {
      const m = segMax(pts[a].x, pts[a].z, pts[b].x, pts[b].z);
      let ok = true; for (let q = a + 1; q < b; q++) if (m > Math.max(A(cellOf(pts[q].x, pts[q].z)), base) + 25) { ok = false; break; }
      if (ok && m <= Math.max(base, ...pts.slice(a + 1, b + 1).map(p => A(cellOf(p.x, p.z)))) + 25) break;
      b--;
    }
    out.push(pts[b]); a = b;
  }
  for (let q = 0; q < out.length - 1; q++) out[q + 1].alt = segMax(out[q].x, out[q].z, out[q + 1].x, out[q + 1].z);
  out[0].alt = out[1]?.alt ?? startAlt;
  return out;
}
