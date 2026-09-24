import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Wersja terenu = hash źródeł generatora (klucz cache w IndexedDB)
const h = createHash('md5');
for (const f of ['src/world/terrainGen.js', 'src/world/layout.js', 'src/core/noise.js', 'src/core/rng.js', 'src/world/terrainWorker.js']) h.update(readFileSync(f));

export default defineConfig({
  plugins: [viteSingleFile()],
  define: { __TERRAIN_VER__: JSON.stringify(h.digest('hex').slice(0, 10)) },
  build: { outDir: 'dist', assetsInlineLimit: 1e9, chunkSizeWarningLimit: 5000 },
  worker: { format: 'iife' },
});
