// Zbiornik wodny: siatka tylko nad obszarem jeziora, materiał fizyczny z animowaną normalną (odbicie nieba z IBL).
import * as THREE from 'three';
import { enhance } from './atmo.js';
import { RESERVOIR } from '../world/layout.js';
import { waterTest } from '../game/worldctx.js';

function waveNormalTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const waves = [];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 24; i++) waves.push({ kx: Math.round((rnd() - 0.5) * 24), kz: Math.round((rnd() - 0.5) * 24), a: 1 / (1 + i * 0.35), p: rnd() * 6.283 });
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let dx = 0, dz = 0;
    for (const w of waves) { const ph = 6.2832 * (w.kx * i + w.kz * j) / size + w.p; const c = Math.cos(ph) * w.a; dx += c * w.kx; dz += c * w.kz; }
    const nx = -dx * 0.012, nz = -dz * 0.012, l = Math.hypot(nx, 1, nz);
    const k = (j * size + i) * 4; data[k] = (nx / l * 0.5 + 0.5) * 255; data[k + 1] = (nz / l * 0.5 + 0.5) * 255; data[k + 2] = (1 / l * 0.5 + 0.5) * 255; data[k + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
  return t;
}

export function makeWater(terrain) {
  const step = 16, x0 = -5200, x1 = RESERVOIR.damX + 8, z0 = -1400, z1 = 2200;
  const pos = [], idx = []; const map = new Map();
  const vid = (i, j) => { const k = i * 10000 + j; if (!map.has(k)) { map.set(k, pos.length / 3); pos.push(x0 + i * step, RESERVOIR.level, z0 + j * step); } return map.get(k); };
  for (let j = 0; j < (z1 - z0) / step; j++) for (let i = 0; i < (x1 - x0) / step; i++) {
    const x = x0 + (i + 0.5) * step, z = z0 + (j + 0.5) * step;
    if (!waterTest(x, z)) continue;
    let under = false;
    for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]]) if (terrain.height(x0 + (i + a) * step, z0 + (j + b) * step) < RESERVOIR.level + 1) under = true;
    if (!under) continue;
    const a = vid(i, j), b = vid(i + 1, j), c = vid(i, j + 1), d = vid(i + 1, j + 1);
    idx.push(a, c, d, a, d, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, k) => (k % 3 === 1 ? 1 : 0)), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(pos.flatMap((v, k) => (k % 3 === 0 ? [v / 40] : k % 3 === 2 ? [v / 40] : [])), 2));
  const nt = waveNormalTexture();
  const mat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.02, 0.07, 0.08), roughness: 0.06, metalness: 0, normalMap: nt, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.0, specularIntensity: 1, ior: 1.33 });
  const u = { wTime: { value: 0 } };
  enhance(mat, {
    onShader: sh => {
      Object.assign(sh.uniforms, u);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float wTime;')
        .replace('#include <normal_fragment_maps>', `
          vec3 n1 = texture2D( normalMap, vNormalMapUv + vec2( wTime * 0.011, wTime * 0.006 ) ).xyz * 2.0 - 1.0;
          vec3 n2 = texture2D( normalMap, vNormalMapUv * 2.7 - vec2( wTime * 0.009, -wTime * 0.013 ) ).xyz * 2.0 - 1.0;
          vec3 mapN = normalize( vec3( ( n1.xy + n2.xy ) * normalScale, 1.0 ) );
          normal = normalize( tbn * mapN );`);
    },
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  mesh.userData.u = u;
  return mesh;
}
