// Deterministyczny generator liczb losowych (mulberry32) + hashe całkowitoliczbowe.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed = 1) { this.next = mulberry32(seed); }
  float(a = 0, b = 1) { return a + (b - a) * this.next(); }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  gauss() { const u = Math.max(1e-9, this.next()), v = this.next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307 * v); }
}

function fmix(h) {
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return h ^ (h >>> 16);
}

export function hash2(x, y, s) {
  let h = fmix(Math.imul(s | 0, 0x9e3779b9) ^ Math.imul(x | 0, 0x27d4eb2d));
  h = fmix(h ^ Math.imul(y | 0, 0x165667b1));
  return (h >>> 0) / 4294967296;
}

export function hash3(x, y, z, s) {
  let h = fmix(Math.imul(s | 0, 0x9e3779b9) ^ Math.imul(x | 0, 0x27d4eb2d));
  h = fmix(h ^ Math.imul(y | 0, 0x165667b1));
  h = fmix(h ^ Math.imul(z | 0, 0x1b873593));
  return (h >>> 0) / 4294967296;
}
