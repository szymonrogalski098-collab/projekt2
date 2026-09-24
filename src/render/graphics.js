// Renderer: scena, niebo, słońce i IBL, teren, las, woda, obiekty, śmigłowiec, znaczniki, efekty, post-processing, jakość.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const SANITIZE = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() {
      vec4 c = texture2D( tDiffuse, vUv );
      bool bad = any( isnan( c ) ) || any( isinf( c ) ) || !( c.r + c.g + c.b < 1e5 );
      gl_FragColor = bad ? vec4( 0.0, 0.0, 0.0, 1.0 ) : vec4( clamp( c.rgb, 0.0, 2000.0 ), 1.0 );
    }`,
};
import { ATMO, enhance } from './atmo.js';
import { makeSky, skyRadiance, sunTransmittance } from './sky.js';
import { generateLayerTextures } from './texgen.js';
import { TerrainMesh } from './terrainMesh.js';
import { TerrainShadow } from './terrainShadow.js';
import { Forest } from './trees.js';
import { makeWater } from './water.js';
import { buildObjectMeshes } from './objectsMesh.js';
import { HeliModel } from './heliModel.js';
import { AIRCRAFT } from '../sim/aircraft.js';

export const QUALITY = {
  low: { shadow: 1024, pr: 0.7, bloom: false, msaa: 0, ao: false, trees: 0.5 },
  medium: { shadow: 2048, pr: 0.85, bloom: true, msaa: 0, ao: false, trees: 0.75 },
  high: { shadow: 2048, pr: 1, bloom: true, msaa: 2, ao: false, trees: 1 },
  ultra: { shadow: 4096, pr: 1.25, bloom: true, msaa: 4, ao: true, trees: 1 },
};

export function sunDirection(hour, lat = 49.3, decl = 14) {
  const d2r = Math.PI / 180, H = (hour - 12) * 15 * d2r, L = lat * d2r, D = decl * d2r;
  const el = Math.asin(Math.sin(L) * Math.sin(D) + Math.cos(L) * Math.cos(D) * Math.cos(H));
  let az = Math.atan2(-Math.sin(H), Math.tan(D) * Math.cos(L) - Math.sin(L) * Math.cos(H)); // od północy, na wschód
  // wektor: x = wschód, z = południe
  const x = Math.sin(az) * Math.cos(el), z = -Math.cos(az) * Math.cos(el), y = Math.sin(el);
  return new THREE.Vector3(x, y, z).normalize();
}

export class Graphics {
  constructor(canvas, ctx, quality = 'high') {
    this.ctx = ctx;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', reversedDepthBuffer: true, preserveDrawingBuffer: false });
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.2;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.15, 45000);
    this.scene.add(this.camera);
    // niebo i słońce
    this.sky = makeSky(); this.scene.add(this.sky);
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera; sc.left = -150; sc.right = 150; sc.top = 150; sc.bottom = -150; sc.near = 10; sc.far = 4000;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.05;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.pmrem = new THREE.PMREMGenerator(r);
    this.skyScene = new THREE.Scene();
    // teren
    this.layers = generateLayerTextures(r);
    this.terrain = new TerrainMesh(r, ctx.terrain, this.layers);
    this.scene.add(this.terrain.mesh);
    this.tShadow = new TerrainShadow(r, this.terrain.hTex, ctx.terrain);
    ATMO.tShadow.value = this.tShadow.texture; ATMO.tShadowOn.value = 1;
    // las, woda, obiekty
    this.forest = new Forest(r, ctx.trees); this.scene.add(this.forest.group);
    this.water = makeWater(ctx.terrain); this.scene.add(this.water);
    this.objects = buildObjectMeshes(ctx.objects, ctx.terrain); this.scene.add(this.objects);
    this.windsocks = this.makeWindsocks(ctx.objects);
    // dynamiczne
    this.heli = null;
    this.markers = new THREE.Group(); this.scene.add(this.markers);
    this.rope = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x151515 }));
    this.rope.frustumCulled = false; this.scene.add(this.rope);
    this.loadMeshes = new Map();
    this.dust = this.makeDust(); this.scene.add(this.dust.points);
    this.setQuality(quality);
    this._v = new THREE.Vector3();
  }

  setQuality(q) {
    this.quality = q; const Q = QUALITY[q] || QUALITY.high;
    // rozdzielczość renderu niezależna od skalowania ekranu (DPI) – stały koszt na piksel
    this.renderer.setPixelRatio(Q.pr);
    this.sun.shadow.mapSize.set(Q.shadow, Q.shadow);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    const size = this.renderer.getSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), { type: THREE.HalfFloatType, samples: Q.msaa });
    if (this.composer) { for (const p of this.composer.passes) p.dispose?.(); this.composer.dispose(); }
    this.bloom = null;
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // usuwa NaN/Inf z bufora HDR (inaczej bloom rozlewa je na cały ekran -> czarny obraz)
    this.composer.addPass(new ShaderPass(SANITIZE));
    if (Q.ao) { try { const ao = new GTAOPass(this.scene, this.camera, size.x, size.y); ao.blendIntensity = 0.7; this.composer.addPass(ao); } catch (e) { /* brak AO */ } }
    if (Q.bloom) { this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.18, 0.5, 0.92); this.composer.addPass(this.bloom); }
    this.composer.addPass(new OutputPass());
    this.forest.setDensity(Q.trees);
    this.resize(size.x, size.y);
  }

  resize(w, h) {
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  // pogoda i pora dnia
  setEnvironment(env) {
    const hour = env.hour ?? 11, clouds = env.clouds ?? 0.3, fog = env.fog ?? 0.1;
    const sd = sunDirection(hour);
    this.sunDir = sd;
    const p = { rayleigh: 1.4 + fog * 1.2, turbidity: 4 + fog * 8 + clouds * 2, mieCoefficient: 0.004 + fog * 0.006, mieDirectionalG: 0.82 };
    const U = this.sky.material.uniforms;
    U.sunPosition.value.copy(sd); U.rayleigh.value = p.rayleigh; U.turbidity.value = p.turbidity; U.mieCoefficient.value = p.mieCoefficient;
    U.cloudCover.value = clouds; U.night.value = Math.max(0, -sd.y * 8);
    const gray = clouds > 0.7 ? (clouds - 0.7) / 0.3 : 0;
    U.cloudTint.value.setRGB(1 - gray * 0.45, 1 - gray * 0.43, 1 - gray * 0.4);
    // kolor i natężenie słońca
    const tr = sunTransmittance([sd.x, sd.y, sd.z], p);
    const dim = (1 - clouds * 0.55) * Math.max(0, Math.min(1, sd.y * 6));
    this.sun.color.setRGB(tr[0], tr[1], tr[2]);
    this.sun.intensity = 26 * dim;
    ATMO.sunDir.value.copy(sd); ATMO.sunColor.value.setRGB(tr[0] * dim * 3, tr[1] * dim * 3, tr[2] * dim * 3);
    // kolor mgły = średnia jasność horyzontu (ten sam model nieba)
    const acc = [0, 0, 0];
    for (let a = 0; a < 8; a++) { const ang = a / 8 * Math.PI * 2; const c = skyRadiance([Math.cos(ang), 0.03, Math.sin(ang)], [sd.x, sd.y, sd.z], p); for (let i = 0; i < 3; i++) acc[i] += c[i] / 8; }
    const cloudDim = 1 - clouds * 0.35;
    ATMO.fogColor.value.setRGB(acc[0] * cloudDim, acc[1] * cloudDim, acc[2] * cloudDim);
    ATMO.fogDensity.value = 0.000022 + fog * 0.00032;
    ATMO.fogBase.value = env.fogBase ?? 900;
    ATMO.fogFalloff.value = 1 / (500 + (1 - fog) * 900);
    this.terrain.uniforms.snowLine.value = env.snowLine ?? 2750;
    // mapa otoczenia (IBL) z nieba
    this.sky.material.uniforms.showSunDisc.value = 0;
    this.skyScene.add(this.sky);
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromScene(this.skyScene, 0, 0.1, 50000);
    this.scene.add(this.sky);
    this.sky.material.uniforms.showSunDisc.value = 1;
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.75;
    // cień terenu
    this.tShadow.update(sd);
    this.env = env;
  }

  setHeli(spec) {
    if (this.heli) this.scene.remove(this.heli.group);
    this.heli = new HeliModel(spec);
    this.scene.add(this.heli.group);
  }

  makeWindsocks(O) {
    const list = [];
    for (const s of O.special) if (s.kind === 'windsock') {
      const g = new THREE.Group(); g.position.set(s.x, s.y, s.z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, s.h, 8), enhance(new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.6, roughness: 0.4 })));
      pole.position.y = s.h / 2; pole.castShadow = true; g.add(pole);
      const sockG = new THREE.CylinderGeometry(0.35, 0.15, 2.4, 12, 4, true); sockG.rotateZ(Math.PI / 2); sockG.translate(1.2, 0, 0);
      const colors = []; const pa = sockG.attributes.position;
      for (let i = 0; i < pa.count; i++) { const band = Math.floor((pa.getX(i) / 2.4) * 5 + 0.001) % 2; colors.push(1, band ? 1 : 0.35, band ? 1 : 0.05); }
      sockG.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      const sock = new THREE.Mesh(sockG, enhance(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide })));
      sock.position.y = s.h - 0.3; g.add(sock);
      this.scene.add(g); list.push({ g, sock });
    }
    return list;
  }

  makeDust() {
    const N = 600;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), age = new Float32Array(N), vel = new Float32Array(N * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('age', new THREE.BufferAttribute(age, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { col: { value: new THREE.Color(0.55, 0.5, 0.42) }, scale: { value: 600 } }, transparent: true, depthWrite: false,
      vertexShader: 'attribute float age; varying float vA; uniform float scale; void main(){ vA = age; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = scale * (1.0 + age * 3.0) / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; uniform vec3 col; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; float a = (1.0 - r * 2.0) * (1.0 - vA) * 0.22; if (vA <= 0.0) discard; gl_FragColor = vec4(col, a); }',
    });
    const points = new THREE.Points(geo, mat); points.frustumCulled = false;
    return { points, pos, age, vel, N, next: 0 };
  }

  updateDust(dt, heli, groundY, isWater, strength) {
    const D = this.dust;
    const spawn = Math.floor(strength * 260 * dt + Math.random());
    for (let s = 0; s < spawn; s++) {
      const i = D.next; D.next = (D.next + 1) % D.N;
      const a = Math.random() * Math.PI * 2, r = heli.spec.rotor.R * (0.4 + Math.random() * 0.9);
      D.pos[i * 3] = heli.pos.x + Math.cos(a) * r; D.pos[i * 3 + 1] = groundY + 0.3; D.pos[i * 3 + 2] = heli.pos.z + Math.sin(a) * r;
      const sp = 6 + Math.random() * 8;
      D.vel[i * 3] = Math.cos(a) * sp; D.vel[i * 3 + 1] = 0.5 + Math.random() * 1.5; D.vel[i * 3 + 2] = Math.sin(a) * sp;
      D.age[i] = 0.001;
    }
    for (let i = 0; i < D.N; i++) {
      if (D.age[i] <= 0) continue;
      D.age[i] += dt / 2.2; if (D.age[i] >= 1) { D.age[i] = 0; continue; }
      D.pos[i * 3] += D.vel[i * 3] * dt; D.pos[i * 3 + 1] += D.vel[i * 3 + 1] * dt; D.pos[i * 3 + 2] += D.vel[i * 3 + 2] * dt;
      D.vel[i * 3] *= 0.97; D.vel[i * 3 + 2] *= 0.97; D.vel[i * 3 + 1] *= 0.98;
    }
    D.points.material.uniforms.col.value.setRGB(isWater ? 0.8 : 0.55, isWater ? 0.85 : 0.5, isWater ? 0.9 : 0.42);
    D.points.geometry.attributes.position.needsUpdate = true; D.points.geometry.attributes.age.needsUpdate = true;
  }

  // Znaczniki celów (pierścienie, bramki, słupy świetlne, flagi)
  setMarkers(list) {
    const M = this.markers;
    while (M.children.length) M.remove(M.children[0]);
    for (const m of list) M.add(this.makeMarker(m));
  }
  makeMarker(m) {
    const g = new THREE.Group(); g.position.set(m.x, m.y, m.z);
    const glow = (color, op = 0.5) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });
    if (m.kind === 'gate') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(m.r, 0.35, 8, 48), glow(0xffb020, 0.85));
      ring.rotation.y = -m.dir; g.add(ring);
      const fill = new THREE.Mesh(new THREE.CircleGeometry(m.r, 48), glow(0xffd070, 0.06)); fill.rotation.y = -m.dir; g.add(fill);
    } else if (m.kind === 'hover' || m.kind === 'land' || m.kind === 'drop' || m.kind === 'load') {
      const col = m.kind === 'land' ? 0x40e0a0 : m.kind === 'drop' ? 0x40a0ff : m.kind === 'load' ? 0xffe040 : 0xffd000;
      const ring = new THREE.Mesh(new THREE.RingGeometry(Math.max(0.5, m.r - 0.35), m.r, 48), glow(col, 0.8)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; g.add(ring);
      if (m.kind === 'hover') {
        const col2 = new THREE.Mesh(new THREE.CylinderGeometry(m.r, m.r, m.agl[1] - m.agl[0], 40, 1, true), glow(0xffd000, 0.05));
        col2.position.y = (m.agl[0] + m.agl[1]) / 2; g.add(col2);
        for (const hh of m.agl) { const rr = new THREE.Mesh(new THREE.TorusGeometry(m.r, 0.035, 5, 64), glow(0xffe060, 0.35)); rr.rotation.x = Math.PI / 2; rr.position.y = hh; g.add(rr); }
      }
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 300, 6, 1, true), glow(col, 0.1)); beacon.position.y = 150; beacon.userData.farOnly = true; g.add(beacon);
    } else if (m.kind === 'waypoint') {
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 400, 8, 1, true), glow(0x60d0ff, 0.08)); beacon.position.y = 200; g.add(beacon);
    } else if (m.kind === 'flag') {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), new THREE.MeshStandardMaterial({ color: 0xffffff })); pole.position.y = 1.5; g.add(pole);
    }
    return g;
  }

  setRope(nodes, extra) {
    if (!nodes) { this.rope.visible = false; return; }
    const pts = nodes.map(n => new THREE.Vector3(n[0], n[1], n[2]));
    if (extra) pts.push(new THREE.Vector3(extra[0], extra[1], extra[2]));
    this.rope.geometry.setFromPoints(pts); this.rope.visible = true;
  }
  setLoads(loads) {
    for (const l of loads) {
      let m = this.loadMeshes.get(l.id);
      if (!m) {
        const mat = enhance(new THREE.MeshStandardMaterial({ color: l.kind === 'crate' ? 0x8a6a3a : 0x777777, roughness: 0.8 }));
        m = new THREE.Mesh(new THREE.BoxGeometry(...l.size), mat); m.castShadow = true; m.receiveShadow = true;
        const band = new THREE.Mesh(new THREE.BoxGeometry(l.size[0] * 1.01, 0.1, l.size[2] * 1.01), enhance(new THREE.MeshStandardMaterial({ color: 0xd8c020 }))); m.add(band);
        this.scene.add(m); this.loadMeshes.set(l.id, m);
      }
      m.position.set(l.pos[0], l.pos[1], l.pos[2]); m.rotation.y = l.yaw;
    }
  }

  // aktualizacja klatki: heli (stan interpolowany), kamera już ustawiona
  frame(dt, v) {
    const cam = this.camera;
    this.terrain.update(cam);
    const hp = v.heli.pos;
    this.forest.update(cam.position, dt, v.wind, v.downwash ? { x: hp.x, y: hp.y, z: hp.z, w: v.downwash } : null);
    if (this.heli) this.heli.update(v.heliState, dt, v.cockpit);
    // cień: kamera cienia wokół punktu między kamerą a śmigłowcem, przyciągana do siatki tekseli
    const focus = this._v.copy(hp).lerp(cam.position, v.cockpit ? 0 : 0.3);
    const ext = 150, texel = (ext * 2) / this.sun.shadow.mapSize.x;
    const sd = this.sunDir || ATMO.sunDir.value;
    focus.x = Math.round(focus.x / texel) * texel; focus.z = Math.round(focus.z / texel) * texel; focus.y = Math.round(focus.y / texel) * texel;
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).addScaledVector(sd, 1500);
    this.sun.target.updateMatrixWorld();
    // woda, wiatrowskazy
    this.water.userData.u.wTime.value += dt;
    this.sky.material.uniforms.cloudTime.value += dt;
    this.sky.position.copy(cam.position);
    for (const w of this.windsocks) {
      const wv = v.windAt ? v.windAt(w.g.position.x, w.g.position.y + 6, w.g.position.z) : [0, 0, 0];
      const sp = Math.hypot(wv[0], wv[2]);
      w.sock.rotation.y = Math.atan2(-wv[2], wv[0]);
      w.sock.rotation.z = -Math.PI / 2 * (1 - Math.min(1, sp / 8)) * 0.85 + Math.sin(performance.now() / 300) * 0.03 * sp / 8;
    }
    for (const mk of this.markers.children) for (const c of mk.children) if (c.userData.farOnly) c.visible = cam.position.distanceTo(mk.position) > 250;
    if (v.dust) this.updateDust(dt, v.heli, v.dust.groundY, v.dust.water, v.dust.strength);
    else this.updateDust(dt, v.heli, 0, false, 0);
    this.renderer.info.autoReset = false; this.renderer.info.reset();
    this.composer.render(dt);
  }
}
