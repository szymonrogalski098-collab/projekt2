// Punkt wejścia: ładowanie terenu (cache/worker), budowa świata, grafika, aplikacja, API debug.
import './ui/style.css';
import { loadTerrain } from './world/terrainLoader.js';
import { buildContext } from './game/worldctx.js';
import { Graphics } from './render/graphics.js';
import { App } from './app.js';
import { Menus } from './ui/menus.js';

async function boot() {
  const canvas = document.getElementById('view');
  const loader = { screens: {} };
  const tmp = document.createElement('div'); tmp.className = 'screen on'; tmp.id = 'boot';
  tmp.innerHTML = '<div class="center" style="text-align:center"><h1 class="title">PRZEŁĘCZ</h1><div class="subtitle" id="bootmsg">Wczytywanie regionu…</div><div class="bar" style="width:320px;height:4px;background:rgba(255,255,255,.12);border-radius:2px;margin:20px auto 0;overflow:hidden"><i style="display:block;height:100%;width:30%;background:#ffcf4a;animation:load 1.3s ease-in-out infinite"></i></div></div>';
  document.body.appendChild(tmp);
  const msg = t => { const m = document.getElementById('bootmsg'); if (m) m.textContent = t; };
  try {
    const terrain = await loadTerrain(st => { if (st === 'gen') msg('Pierwsze uruchomienie: generowanie gór i erozja (kilka sekund)…'); if (st === 'gen-main') msg('Generowanie gór i erozja (ok. 10–20 s, strona może chwilę nie reagować)…'); });
    msg('Budowanie świata…');
    await new Promise(r => setTimeout(r, 30));
    const ctx = buildContext(terrain);
    const gfx = new Graphics(canvas, ctx, 'high');
    const app = new App(ctx, gfx, canvas);
    tmp.remove();
    const params = new URLSearchParams(location.search);
    if (params.has('debug')) { const { installDebug } = await import('./debug/debug.js'); installDebug(app); }
    app.menus.start();
    window.__ready = true;
  } catch (e) {
    console.error(e);
    msg('Błąd uruchomienia: ' + (e && e.message ? e.message : e));
  }
}
boot();
