// Pole wiatru: wiatr bazowy + porywy + turbulencja + efekty terenu (opływ zboczy, rotor za granią, termika).
import { vnoise3, smoothstep, clamp } from '../core/noise.js';

export class Wind {
  constructor(cfg = {}, terrain = null) {
    this.set(cfg);
    this.terrain = terrain;
    this._n = [0, 1, 0];
  }
  set(cfg) {
    this.dir = (cfg.dir ?? 270) * Math.PI / 180;       // skąd wieje (0 = z północy)
    this.speed = cfg.speed ?? 0;                          // m/s na wysokości ~50 m AGL
    this.gust = cfg.gust ?? 0;                            // amplituda porywów m/s
    this.turb = cfg.turb ?? 0.2;                          // 0..1
    this.thermal = cfg.thermal ?? 0;                      // m/s maks. prąd wstępujący
    this.seed = cfg.seed ?? 7;
    this.dx = -Math.sin(this.dir); this.dz = Math.cos(this.dir);
  }
  // Zwraca wektor wiatru [x,y,z] w m/s oraz info (lee, agl)
  sample(x, y, z, t, out = [0, 0, 0]) {
    const T = this.terrain;
    const g = T ? T.height(x, z) : 0;
    const agl = Math.max(0, y - g);
    const s0 = this.speed;
    const prof = (0.3 + 0.7 * smoothstep(0, 70, agl)) * clamp(1 + (y - 1200) / 2600, 0.75, 1.5);
    const gust = this.gust * Math.max(0, vnoise3(t * 0.22, 3.1, 0, this.seed) * 1.2 + vnoise3(t * 0.9, 7.7, 1, this.seed) * 0.4);
    let U = s0 * prof + gust;
    let wx = this.dx * U, wz = this.dz * U, wy = 0;
    let lee = 0;
    if (T && s0 > 0.5) {
      // opływ zbocza: składowa pionowa wzdłuż gradientu
      const n = T.normal(x, z, this._n);
      const slopeX = -n[0] / n[1], slopeZ = -n[2] / n[1];
      wy += (wx * slopeX + wz * slopeZ) * Math.exp(-agl / 110) * 0.85;
      // rotor za granią: teren nawietrzny wyższy od nas
      let up = -1e9;
      for (const d of [50, 110, 190, 300]) up = Math.max(up, T.height(x - this.dx * d, z - this.dz * d));
      lee = smoothstep(15, 90, up - g) * (1 - smoothstep(-20, 110, y - up));
      if (lee > 0) {
        wx *= 1 - 0.9 * lee; wz *= 1 - 0.9 * lee;
        wy -= 0.3 * s0 * lee;
      }
    }
    // turbulencja (skala ~30-60 m, ewoluuje w czasie)
    const ti = (this.turb * (0.4 + 0.25 * s0) + lee * s0 * 0.55) * (0.5 + 0.5 * smoothstep(0, 40, agl));
    if (ti > 0) {
      const sx = x / 38 + t * 0.35 * (this.dx), sz = z / 38 + t * 0.35 * this.dz, sy = y / 30 + t * 0.2;
      wx += ti * vnoise3(sx, sy, sz, this.seed + 11);
      wy += ti * 0.7 * vnoise3(sx + 19.3, sy, sz, this.seed + 12);
      wz += ti * vnoise3(sx, sy + 5.1, sz + 31.7, this.seed + 13);
    }
    if (this.thermal > 0 && T) {
      const n = T.normal(x, z, this._n);
      const sunny = clamp(n[0] * 0.5 - n[2] * 0.3 + 0.2, 0, 1); // stoki południowo-wschodnie
      wy += this.thermal * sunny * Math.exp(-agl / 250) * (0.6 + 0.4 * vnoise3(x / 180, t * 0.05, z / 180, this.seed + 21));
    }
    out[0] = wx; out[1] = wy; out[2] = wz;
    this.lastLee = lee;
    return out;
  }
}
