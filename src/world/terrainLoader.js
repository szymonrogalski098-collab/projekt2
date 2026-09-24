// Ładowanie terenu w przeglądarce: IndexedDB (cache) lub Web Worker.
import { Terrain } from './terrainGen.js';
import * as L from './layout.js';
import TerrainWorker from './terrainWorker.js?worker&inline';

const DB = 'przelecz', STORE = 'terrain';
const VER = typeof __TERRAIN_VER__ !== 'undefined' ? __TERRAIN_VER__ : 'dev';

function idb() {
  return new Promise((res, rej) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
}
async function cacheGet() {
  try {
    const db = await idb();
    return await new Promise(res => { const tx = db.transaction(STORE, 'readonly'); const q = tx.objectStore(STORE).get(VER); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); });
  } catch { return null; }
}
async function cachePut(d) {
  try {
    const db = await idb();
    await new Promise(res => { const tx = db.transaction(STORE, 'readwrite'); const st = tx.objectStore(STORE); st.clear(); st.put(d, VER); tx.oncomplete = res; tx.onerror = res; });
  } catch { /* brak cache – trudno */ }
}

export function applyLayoutY(y) { L.BASE.y = y.BASE; L.MEADOW.y = y.MEADOW; L.HUT.y = y.HUT; L.MAST.y = y.MAST; L.SLOPE_SITE.y = y.SLOPE_SITE; L.CABLE.a.y = y.A; L.CABLE.b.y = y.B; }

export async function loadTerrain(onStatus = () => {}) {
  let d = await cacheGet();
  if (!d) {
    onStatus('gen');
    d = await new Promise((res, rej) => { const w = new TerrainWorker(); w.onmessage = e => { res(e.data); w.terminate(); }; w.onerror = rej; w.postMessage(1); });
    cachePut(d);
  }
  applyLayoutY(d.layoutY);
  const t = new Terrain(d.H, d.N, d.cell, d.splat, d.forest, d.road, d.info);
  t.normalMap = d.normal;
  return t;
}
