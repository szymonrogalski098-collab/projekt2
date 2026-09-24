// Web Worker: generacja terenu poza wątkiem głównym + mapa normalnych (RGBA8: normalna + wklęsłość).
import { generateTerrain } from './terrainGen.js';
import * as L from './layout.js';

self.onmessage = () => {
  const t = generateTerrain();
  const N = t.N, H = t.H, c = t.cell;
  const nrm = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) {
    const j0 = Math.max(0, j - 1), j1 = Math.min(N - 1, j + 1);
    for (let i = 0; i < N; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(N - 1, i + 1), k = j * N + i;
      const hx = H[j * N + i1] - H[j * N + i0], hz = H[j1 * N + i] - H[j0 * N + i];
      let nx = -hx, ny = 2 * c * ((i1 - i0) + (j1 - j0)) / 4, nz = -hz;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      // wklęsłość (krzywizna) z sąsiedztwa 2 px
      const a = Math.max(0, i - 3), b = Math.min(N - 1, i + 3), d = Math.max(0, j - 3), e = Math.min(N - 1, j + 3);
      const lap = (H[j * N + a] + H[j * N + b] + H[d * N + i] + H[e * N + i]) * 0.25 - H[k];
      const cav = Math.max(0, Math.min(1, 0.5 + lap * 0.08));
      nrm[k * 4] = (nx * 0.5 + 0.5) * 255; nrm[k * 4 + 1] = (ny * 0.5 + 0.5) * 255; nrm[k * 4 + 2] = (nz * 0.5 + 0.5) * 255; nrm[k * 4 + 3] = cav * 255;
    }
  }
  const layoutY = { BASE: L.BASE.y, MEADOW: L.MEADOW.y, HUT: L.HUT.y, MAST: L.MAST.y, SLOPE_SITE: L.SLOPE_SITE.y, A: L.CABLE.a.y, B: L.CABLE.b.y };
  self.postMessage({ N, cell: c, H, splat: t.splat, forest: t.forest, normal: nrm, road: t.road, info: t.info, layoutY }, [H.buffer, t.splat.buffer, t.forest.buffer, nrm.buffer]);
};
