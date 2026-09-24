// Las: bliskie drzewa jako pełne siatki (instancje, cienie, kołysanie od wiatru i podmuchu wirnika),
// dalekie jako impostory (billboardy z atlasu renderowanego z tych samych siatek).
import * as THREE from 'three';
import { enhance } from './atmo.js';
import { Rng } from '../core/rng.js';

const NEAR_R = 420, SHADOW_R = 170, FAR_R = 5200, NEAR_MAX = 9000, FAR_MAX = 160000;

function spruceGeo(rng) {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.018, 0.03, 0.35, 5, 1); trunk.translate(0, 0.175, 0);
  paint(trunk, [0.06, 0.04, 0.025]); parts.push(trunk);
  const tiers = 6;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const r = 0.23 * (1 - t * 0.85) + 0.02, hgt = 0.3 - t * 0.12;
    const y = 0.12 + t * 0.78;
    const c = new THREE.ConeGeometry(r, hgt, 8, 1, true);
    const p = c.attributes.position;
    for (let k = 0; k < p.count; k++) {
      if (p.getY(k) < hgt / 2 - 1e-3) { p.setX(k, p.getX(k) * (0.85 + rng.float(0, 0.3))); p.setZ(k, p.getZ(k) * (0.85 + rng.float(0, 0.3))); p.setY(k, p.getY(k) - rng.float(0, 0.03)); }
    }
    c.translate(0, y + hgt / 2, 0);
    const g = 0.75 + 0.25 * t;
    paint(c, [0.028 * g, 0.062 * g, 0.034 * g], [0.012, 0.028, 0.012]);
    parts.push(c);
  }
  return merge(parts);
}
function larchGeo(rng) {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.02, 0.035, 0.5, 5, 1); trunk.translate(0, 0.25, 0); paint(trunk, [0.1, 0.08, 0.06]); parts.push(trunk);
  for (let i = 0; i < 4; i++) {
    const s = new THREE.IcosahedronGeometry(0.2 - i * 0.03, 0);
    const p = s.attributes.position;
    for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * (0.9 + rng.float(0, 0.25)), p.getY(k) * 1.2, p.getZ(k) * (0.9 + rng.float(0, 0.25)));
    s.translate(rng.float(-0.04, 0.04), 0.35 + i * 0.17, rng.float(-0.04, 0.04));
    paint(s, [0.07, 0.11, 0.04], [0.03, 0.04, 0.015]); parts.push(s);
  }
  return merge(parts);
}
function paint(g, base, tip = [0, 0, 0]) {
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let k = 0; k < p.count; k++) {
    const r = Math.hypot(p.getX(k), p.getZ(k));
    const t = Math.min(1, r * 4);
    for (let c = 0; c < 3; c++) col[k * 3 + c] = base[c] + tip[c] * t;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
function merge(parts) {
  const geos = parts.map(g => g.index ? g.toNonIndexed() : g);
  let n = 0; for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) { g.computeVertexNormals(); pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('color', new THREE.BufferAttribute(col, 3));
  // normalne „zaokrąglone” (korona jak kula) – miękkie światło
  for (let k = 0; k < n; k++) {
    const x = pos[k * 3], y = pos[k * 3 + 1] - 0.55, z = pos[k * 3 + 2], l = Math.hypot(x, y * 0.6, z) || 1;
    nor[k * 3] = nor[k * 3] * 0.4 + x / l * 0.6; nor[k * 3 + 1] = nor[k * 3 + 1] * 0.4 + y * 0.6 / l * 0.6; nor[k * 3 + 2] = nor[k * 3 + 2] * 0.4 + z / l * 0.6;
  }
  return m;
}

const SWAY = /* glsl */`
uniform float uTime; uniform vec3 uWind; uniform vec4 uHeli; // xyz pozycja, w = siła podmuchu
`;
const SWAY_MAIN = /* glsl */`
{
  vec3 ip = vec3( instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2] );
  float hsc = length( instanceMatrix[1].xyz );
  float k = position.y * position.y;
  float ph = ip.x * 0.071 + ip.z * 0.053;
  vec2 sw = uWind.xz * 0.012 * ( 0.6 + 0.4 * sin( uTime * 1.3 + ph ) ) + vec2( sin( uTime * 2.1 + ph ), cos( uTime * 1.7 + ph * 1.3 ) ) * 0.004 * length( uWind );
  vec2 dh = ip.xz - uHeli.xz; float dd = length( dh );
  float above = uHeli.y - ( ip.y + hsc );
  float dw = uHeli.w * smoothstep( 40.0, 6.0, dd ) * smoothstep( 45.0, 5.0, above ) * ( 0.8 + 0.2 * sin( uTime * 9.0 + ph ) );
  sw += normalize( dh + 1e-3 ) * dw * 0.06;
  transformed.xz += sw * k / max( hsc, 1.0 ) * 12.0;
}
`;

export class Forest {
  constructor(renderer, trees) {
    this.trees = trees;
    this.group = new THREE.Group();
    const rng = new Rng(77);
    this.u = { uTime: { value: 0 }, uWind: { value: new THREE.Vector3() }, uHeli: { value: new THREE.Vector4(0, -1e4, 0, 0) } };
    const U = this.u;
    const mkMat = () => {
      const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, envMapIntensity: 0.7 });
      enhance(m, { matte: true, onShader: sh => { Object.assign(sh.uniforms, U); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + SWAY).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + SWAY_MAIN); } });
      return m;
    };
    this.geos = [spruceGeo(rng), larchGeo(rng)];
    // 0..1: bliskie z cieniem (≤ SHADOW_R), 2..3: średnie bez cienia
    this.near = [0, 1, 0, 1].map((k, i) => {
      const im = new THREE.InstancedMesh(this.geos[k], mkMat(), NEAR_MAX);
      im.count = 0; im.castShadow = i < 2; im.receiveShadow = true; im.frustumCulled = false;
      this.group.add(im); return im;
    });
    this.atlas = this.makeAtlas(renderer);
    this.far = this.makeFar();
    this.group.add(this.far);
    this._lastNear = new THREE.Vector3(1e9, 0, 0); this._lastFar = new THREE.Vector3(1e9, 0, 0);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3();
  }

  makeAtlas(renderer) {
    const W = 512, H = 512;
    const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
    rt.texture.generateMipmaps = true; rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(0.4, 1, 0.8); scene.add(dl);
    const cam = new THREE.OrthographicCamera(-0.5, 0.5, 1.0, 0, -5, 5);
    const prev = renderer.getRenderTarget();
    const pc = new THREE.Color(); renderer.getClearColor(pc); const pa = renderer.getClearAlpha();
    const ac = renderer.autoClear; renderer.autoClear = false;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear();
    this.geos.forEach((g, i) => {
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true }));
      scene.add(m);
      rt.viewport.set(i * W / 2, 0, W / 2, H); renderer.setRenderTarget(rt);
      cam.position.set(0, 0, 2); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
      renderer.render(scene, cam);
      scene.remove(m);
    });
    rt.viewport.set(0, 0, W, H);
    renderer.setRenderTarget(prev); renderer.setClearColor(pc, pa); renderer.autoClear = ac;
    this.atlasRT = rt;
    return rt.texture;
  }

  makeFar() {
    // billboard (obrót wokół pionu do kamery), 2 rodzaje w atlasie
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.farAttr = new THREE.InstancedBufferAttribute(new Float32Array(FAR_MAX * 4), 4); // x, y, z, h*sign(kind)
    this.farAttr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('tree', this.farAttr);
    g.instanceCount = 0;
    const mat = new THREE.MeshStandardMaterial({ map: this.atlas, alphaTest: 0.45, roughness: 1, metalness: 0, color: 0xb8b8b8, envMapIntensity: 0.6 });
    enhance(mat, {
      matte: true,
      onShader: sh => {
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nattribute vec4 tree;\nvarying float vKind;')
          .replace('#include <uv_vertex>', '#include <uv_vertex>\nvKind = tree.w < 0.0 ? 1.0 : 0.0;\n#ifdef USE_MAP\nvMapUv = vec2( ( uv.x + vKind ) * 0.5, uv.y );\n#endif')
          .replace('#include <begin_vertex>', `
            float th = abs( tree.w );
            vec3 toC = cameraPosition - tree.xyz; toC.y = 0.0; toC = normalize( toC + 1e-4 );
            vec3 rgt = vec3( toC.z, 0.0, -toC.x );
            vec3 transformed = tree.xyz + rgt * position.x * th * ( vKind > 0.5 ? 1.0 : 0.95 ) + vec3( 0.0, position.y * th, 0.0 );`)
          .replace('#include <beginnormal_vertex>', 'vec3 tc = cameraPosition - tree.xyz; tc.y = 0.0; vec3 objectNormal = normalize( vec3( 0.0, 0.35, 0.0 ) + normalize( tc + 1e-3 ) );');
      },
    });
    const mesh = new THREE.Mesh(g, mat);
    mesh.frustumCulled = false; mesh.receiveShadow = false;
    return mesh;
  }

  update(camPos, dt, wind, heli) {
    this.u.uTime.value += dt;
    if (wind) this.u.uWind.value.set(wind[0], wind[1], wind[2]);
    if (heli) this.u.uHeli.value.set(heli.x, heli.y, heli.z, heli.w);
    const T = this.trees;
    if (camPos.distanceToSquared(this._lastNear) > 30 * 30) {
      this._lastNear.copy(camPos);
      const cnt = [0, 0, 0, 0];
      const g = T.grid, r = NEAR_R;
      const i0 = Math.max(0, Math.floor((camPos.x - r + g.half) / g.B)), i1 = Math.min(g.nb - 1, Math.floor((camPos.x + r + g.half) / g.B));
      const j0 = Math.max(0, Math.floor((camPos.z - r + g.half) / g.B)), j1 = Math.min(g.nb - 1, Math.floor((camPos.z + r + g.half) / g.B));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const c = j * g.nb + i;
        for (let q = g.start[c]; q < g.start[c + 1]; q++) {
          const k = g.idx[q];
          const dx = T.x[k] - camPos.x, dz = T.z[k] - camPos.z;
          if (dx * dx + dz * dz > r * r) continue;
          const kind = T.kind[k] + (dx * dx + dz * dz > SHADOW_R * SHADOW_R ? 2 : 0), im = this.near[kind];
          if (cnt[kind] >= NEAR_MAX) continue;
          const h = T.h[k];
          this._q.setFromAxisAngle(this._p.set(0, 1, 0), (k * 2.399) % 6.283);
          const lk = T.kind[k];
          this._m.compose(this._p.set(T.x[k], T.y[k] - 0.3, T.z[k]), this._q, this._s.set(h * (lk ? 1.1 : 1), h, h * (lk ? 1.1 : 1)));
          im.setMatrixAt(cnt[kind]++, this._m);
        }
      }
      this.near.forEach((im, i) => { im.count = cnt[i]; im.instanceMatrix.needsUpdate = true; });
    }
    if (camPos.distanceToSquared(this._lastFar) > 120 * 120) {
      this._lastFar.copy(camPos);
      const a = this.farAttr.array; let n = 0;
      const r2 = FAR_R * FAR_R, rn = (NEAR_R - 30) * (NEAR_R - 30);
      for (let k = 0; k < T.count && n < FAR_MAX; k++) {
        const dx = T.x[k] - camPos.x, dz = T.z[k] - camPos.z, d2 = dx * dx + dz * dz;
        if (d2 > r2 || d2 < rn) continue;
        if (d2 > 2500 * 2500 && (k & 1)) continue; // przerzedzenie daleko
        const h = T.h[k] * (d2 > 2500 * 2500 ? 1.15 : 1);
        a[n * 4] = T.x[k]; a[n * 4 + 1] = T.y[k] - 0.3; a[n * 4 + 2] = T.z[k]; a[n * 4 + 3] = T.kind[k] ? -h * 1.1 : h; n++;
      }
      this.far.geometry.instanceCount = n; this.farAttr.needsUpdate = true;
      this.farCount = n;
    }
  }
}
