// Szum gradientowy 2D/3D (deterministyczny, bez tablic permutacji) + fBm / ridged.
import { hash2, hash3 } from './rng.js';

const fade = t => t * t * t * (t * (t * 6 - 15) + 10);

const GX = new Float32Array(256), GY = new Float32Array(256);
for (let i = 0; i < 256; i++) { const a = (i + 0.5) / 256 * 6.283185307179586; GX[i] = Math.cos(a); GY[i] = Math.sin(a); }
function grad2(ix, iy, s, dx, dy) {
  const k = (hash2(ix, iy, s) * 256) | 0;
  return GX[k] * dx + GY[k] * dy;
}

// Szum simplex 2D, zwraca ~[-1,1]
const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
export function noise2(x, y, s = 0) {
  const t = (x + y) * F2;
  const i = Math.floor(x + t), j = Math.floor(y + t);
  const t0 = (i + j) * G2;
  const x0 = x - (i - t0), y0 = y - (j - t0);
  const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
  let n = 0, q;
  q = 0.5 - x0 * x0 - y0 * y0; if (q > 0) { q *= q; n += q * q * grad2(i, j, s, x0, y0); }
  q = 0.5 - x1 * x1 - y1 * y1; if (q > 0) { q *= q; n += q * q * grad2(i + i1, j + j1, s, x1, y1); }
  q = 0.5 - x2 * x2 - y2 * y2; if (q > 0) { q *= q; n += q * q * grad2(i + 1, j + 1, s, x2, y2); }
  return 70 * n;
}

// Szum wartości 3D ~[-1,1] (do turbulencji w czasie)
export function vnoise3(x, y, z, s = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fade(fx), v = fade(fy), w = fade(fz);
  const h = (a, b, c) => hash3(ix + a, iy + b, iz + c, s) * 2 - 1;
  const x00 = h(0, 0, 0) + u * (h(1, 0, 0) - h(0, 0, 0));
  const x10 = h(0, 1, 0) + u * (h(1, 1, 0) - h(0, 1, 0));
  const x01 = h(0, 0, 1) + u * (h(1, 0, 1) - h(0, 0, 1));
  const x11 = h(0, 1, 1) + u * (h(1, 1, 1) - h(0, 1, 1));
  const y0 = x00 + v * (x10 - x00), y1 = x01 + v * (x11 - x01);
  return y0 + w * (y1 - y0);
}

export function fbm2(x, y, oct, s = 0, lac = 2.0, gain = 0.5) {
  let sum = 0, amp = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * noise2(x, y, s + i * 101);
    norm += amp; amp *= gain;
    const nx = (0.8 * x - 0.6 * y) * lac, ny = (0.6 * x + 0.8 * y) * lac; x = nx + 17.1; y = ny - 9.3;
  }
  return sum / norm;
}

// Ridged multifractal ~[0,1]
export function ridged2(x, y, oct, s = 0, gain = 0.52) {
  let sum = 0, amp = 0.5, w = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    let n = 1 - Math.abs(noise2(x, y, s + i * 131));
    n *= n;
    n *= w;
    w = Math.min(1, Math.max(0, n * 1.6));
    sum += n * amp; norm += amp;
    amp *= gain;
    const nx = (0.8 * x - 0.6 * y) * 2.03, ny = (0.6 * x + 0.8 * y) * 2.03; x = nx + 5.7; y = ny + 13.9;
  }
  return sum / norm;
}

export const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
