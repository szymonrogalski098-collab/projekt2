// Budowa świata symulacji w Node (z cache terenu na dysku).
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { generateTerrain, Terrain } from '../../src/world/terrainGen.js';
import { placeTrees } from '../../src/world/trees.js';

const SRC = ['src/world/terrainGen.js', 'src/world/layout.js', 'src/core/noise.js', 'src/core/rng.js'];

export function loadTerrain() {
  const h = createHash('md5');
  for (const f of SRC) h.update(readFileSync(f));
  const key = h.digest('hex').slice(0, 12);
  const dir = 'shots/.cache', file = `${dir}/terrain-${key}.bin`, meta = `${dir}/terrain-${key}.json`;
  if (existsSync(file) && existsSync(meta)) {
    const buf = readFileSync(file);
    const m = JSON.parse(readFileSync(meta, 'utf8'));
    const N = m.N;
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const H = new Float32Array(ab, 0, N * N);
    const forest = new Float32Array(ab, N * N * 4, N * N);
    const splat = new Uint8Array(ab, N * N * 8, N * N * 4);
    const t = new Terrain(H, N, m.cell, splat, forest, m.road, m.info);
    applyLayoutY(m.layoutY);
    return t;
  }
  const t = generateTerrain();
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, Buffer.concat([Buffer.from(t.H.buffer), Buffer.from(t.forest.buffer), Buffer.from(t.splat.buffer)]));
  writeFileSync(meta, JSON.stringify({ N: t.N, cell: t.cell, road: t.road, info: t.info, layoutY: layoutY() }));
  return t;
}

import * as L from '../../src/world/layout.js';
function layoutY() { return { BASE: L.BASE.y, MEADOW: L.MEADOW.y, HUT: L.HUT.y, MAST: L.MAST.y, SLOPE_SITE: L.SLOPE_SITE.y, A: L.CABLE.a.y, B: L.CABLE.b.y, RIDGE: L.RIDGE_SITE.y, SUMMIT: L.SUMMIT.y, NORTH: L.NORTH_MEADOW.y, SERACS: L.SERACS.y }; }
function applyLayoutY(y) { L.BASE.y = y.BASE; L.MEADOW.y = y.MEADOW; L.HUT.y = y.HUT; L.MAST.y = y.MAST; L.SLOPE_SITE.y = y.SLOPE_SITE; L.CABLE.a.y = y.A; L.CABLE.b.y = y.B; L.RIDGE_SITE.y = y.RIDGE; L.SUMMIT.y = y.SUMMIT; L.NORTH_MEADOW.y = y.NORTH; L.SERACS.y = y.SERACS; }

export function loadTrees(terrain) { return placeTrees(terrain); }
