// Proceduralny model śmigłowca (kadłub, owiewka, belka, płozy, wirniki z tarczą rozmycia) + wnętrze kokpitu.
import * as THREE from 'three';
import { enhance } from './atmo.js';

const LIVERY = {
  wrobel: { body: 0xb3261e, stripe: 0xf2f0ea, dark: 0x2a2c30 },
  kos: { body: 0x1f4f8f, stripe: 0xf2f0ea, dark: 0x25282c },
};

function std(color, rough = 0.5, metal = 0.1, extra = {}) { return enhance(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra })); }

export class HeliModel {
  constructor(spec) {
    this.spec = spec;
    const L = LIVERY[spec.id] || LIVERY.wrobel;
    const g = this.group = new THREE.Group();
    const S = spec, sk = S.skids, R = S.rotor;
    const body = std(L.body, 0.35, 0.2), white = std(L.stripe, 0.4, 0.1), dark = std(L.dark, 0.6, 0.3), metal = std(0x9aa0a6, 0.35, 0.8);
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x9fb4c4, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.22, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
    enhance(glass);
    this.mats = { body, white, dark, metal, glass };
    const scale = S.rotor.R / 3.9;
    const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz);
      m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
    };
    // kabina: dolna skorupa + owiewka
    const cab = new THREE.SphereGeometry(1, 28, 20, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58);
    add(cab, body, 0, 0.05, -0.55 * scale, 0, 0, 0, 0.72 * scale, 0.95 * scale, 1.18 * scale);
    const canopy = new THREE.SphereGeometry(1, 28, 16, Math.PI * 0.08, Math.PI * 0.84 * 2, 0, Math.PI * 0.44);
    this.canopy = add(canopy, glass, 0, 0.05, -0.55 * scale, 0, Math.PI * 1.0, 0, 0.72 * scale, 0.95 * scale, 1.18 * scale);
    this.canopy.castShadow = false;
    // pas dekoracyjny
    add(new THREE.TorusGeometry(1, 0.03, 6, 40), white, 0, -0.18 * scale, -0.55 * scale, Math.PI / 2, 0, 0, 0.73 * scale, 1.19 * scale, 1);
    // tylna część (silnik, zbiornik)
    add(new THREE.CylinderGeometry(0.55 * scale, 0.62 * scale, 1.3 * scale, 16), body, 0, 0.1 * scale, 0.55 * scale, Math.PI / 2, 0, 0, 1, 1, 0.85);
    add(new THREE.BoxGeometry(0.9 * scale, 0.5 * scale, 1.1 * scale), dark, 0, 0.55 * scale, 0.45 * scale);
    // belka ogonowa
    const boomLen = S.tail.arm - 0.9 * scale;
    const boom = new THREE.CylinderGeometry(0.09 * scale, 0.2 * scale, boomLen, 10);
    add(boom, body, 0, 0.28 * scale, 0.9 * scale + boomLen / 2, Math.PI / 2 - 0.04, 0, 0);
    // statecznik pionowy i poziomy
    const fin = new THREE.BoxGeometry(0.05, 0.9 * scale, 0.55 * scale);
    add(fin, white, 0, S.tail.h + 0.05, S.tail.arm - 0.15, 0.35, 0, 0);
    add(new THREE.BoxGeometry(1.2 * scale, 0.04, 0.35 * scale), body, 0, 0.22 * scale, S.fin.hsArm);
    // maszt i piasta
    add(new THREE.CylinderGeometry(0.06, 0.09, R.hubH - 0.5, 8), metal, 0, 0.5 + (R.hubH - 0.5) / 2, 0.05);
    add(new THREE.BoxGeometry(0.5, 0.3, 0.6), dark, 0, 0.62 * scale, 0.1);
    // płozy
    for (const sx of [-sk.x, sk.x]) {
      const tube = new THREE.CylinderGeometry(0.04, 0.04, sk.zr - sk.zf + 0.6, 8);
      add(tube, metal, sx, sk.y + 0.04, (sk.zf + sk.zr) / 2, Math.PI / 2, 0, 0);
      const tip = new THREE.TorusGeometry(0.2, 0.04, 6, 10, Math.PI / 2);
      add(tip, metal, sx, sk.y + 0.24, sk.zf - 0.3, 0, Math.PI / 2, Math.PI, 1, 1, 1);
      for (const z of [sk.zf + 0.35, sk.zr - 0.25]) {
        const strut = new THREE.CylinderGeometry(0.035, 0.035, Math.hypot(sk.x * 0.55, -sk.y - 0.1), 6);
        add(strut, metal, sx * 0.72, (sk.y - 0.1) / 2, z, 0, 0, sx * 0.62);
      }
    }
    // hak
    add(new THREE.ConeGeometry(0.06, 0.15, 6), dark, S.hook[0], S.hook[1] + 0.1, S.hook[2], Math.PI);
    // --- wirnik nośny ---
    this.rotor = new THREE.Group(); this.rotor.position.set(0, R.hubH, 0); g.add(this.rotor);
    this.rotorSpin = new THREE.Group(); this.rotor.add(this.rotorSpin);
    const bladeMat = std(0x1c1d20, 0.5, 0.2);
    for (let b = 0; b < R.blades; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(R.R - 0.25, 0.035, R.chord), bladeMat);
      blade.position.set((R.R + 0.25) / 2, 0, 0); blade.castShadow = true;
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.037, R.chord + 0.005), white); tip.position.set(R.R / 2 - 0.12, 0, 0); blade.add(tip);
      const holder = new THREE.Group(); holder.rotation.y = b / R.blades * Math.PI * 2; holder.add(blade);
      this.rotorSpin.add(holder);
    }
    this.blades = this.rotorSpin.children;
    // tarcza rozmycia
    this.discU = { angle: { value: 0 }, amt: { value: 0 }, nb: { value: R.blades } };
    const discMat = new THREE.ShaderMaterial({
      uniforms: this.discU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec2 vP; uniform float angle, amt, nb;
        void main(){ float r = length(vP); if (r < 0.06 || r > 1.0) discard;
          float a = atan(vP.y, vP.x) - angle; float s = fract(a * nb / 6.2831853);
          float streak = exp(-s * 7.0) * 0.55 + 0.1;
          float edge = smoothstep(1.0, 0.93, r) * smoothstep(0.06, 0.2, r);
          vec3 c = mix(vec3(0.07), vec3(0.85), smoothstep(0.93, 0.97, r));
          gl_FragColor = vec4(c, streak * edge * amt * 0.55); }`,
    });
    this.disc = new THREE.Mesh(new THREE.CircleGeometry(R.R, 64), discMat);
    this.disc.rotation.x = -Math.PI / 2; this.disc.renderOrder = 10;
    this.rotor.add(this.disc);
    // śmigło ogonowe
    this.tailRotor = new THREE.Group(); this.tailRotor.position.set(0.18 * scale, S.tail.h, S.tail.arm); g.add(this.tailRotor);
    for (let b = 0; b < 2; b++) { const tb = new THREE.Mesh(new THREE.BoxGeometry(0.02, S.tail.R * 2, 0.08), bladeMat); tb.rotation.x = b * Math.PI / 2; this.tailRotor.add(tb); }
    const tdisc = new THREE.Mesh(new THREE.CircleGeometry(S.tail.R, 24), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
    tdisc.rotation.y = Math.PI / 2; this.tailDisc = tdisc; this.tailRotor.add(tdisc);
    // --- kokpit (wnętrze, widoczne w widoku z kabiny) ---
    this.cockpit = this.buildCockpit(scale);
    g.add(this.cockpit);
    this.rotAngle = 0; this.trAngle = 0;
  }

  buildCockpit(scale) {
    const c = new THREE.Group();
    const S = this.spec, eye = S.cockpit.eye;
    const dark = std(0x1e2024, 0.8, 0.1), seat = std(0x3a2f28, 0.9, 0);
    // tablica przyrządów (tekstura z płótna rysowana na bieżąco)
    this.panelCanvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1024, 384) : Object.assign(document.createElement('canvas'), { width: 1024, height: 384 });
    this.panelTex = new THREE.CanvasTexture(this.panelCanvas); this.panelTex.colorSpace = THREE.SRGBColorSpace; this.panelTex.anisotropy = 8;
    const panelMat = enhance(new THREE.MeshStandardMaterial({ map: this.panelTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: this.panelTex, emissiveIntensity: 0.12 }), { noFog: true });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.36), panelMat);
    panel.position.set(0, eye[1] - 0.36, eye[2] - 0.6); panel.rotation.x = -0.42;
    c.add(panel);
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.03), dark); bezel.position.set(0, -0.001, -0.02); panel.add(bezel);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.025, 0.2), dark); hood.position.set(0, eye[1] - 0.19, eye[2] - 0.68); c.add(hood);
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.35), dark); pedestal.position.set(0, eye[1] - 0.8, eye[2] - 0.5); c.add(pedestal);
    for (const x of [-0.32, 0.32]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.5), seat); s.position.set(x, eye[1] - 0.85, eye[2] + 0.35); c.add(s); const b = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.7, 0.1), seat); b.position.set(x, eye[1] - 0.45, eye[2] + 0.62); c.add(b); }
    // drążek cykliczny
    this.stick = new THREE.Group(); this.stick.position.set(eye[0], eye[1] - 0.95, eye[2] - 0.05);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.55, 8), dark); st.position.y = 0.27; this.stick.add(st);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 8), seat); grip.position.y = 0.58; this.stick.add(grip);
    c.add(this.stick);
    // ramy owiewki (cienkie belki między punktami)
    const frameMat = std(this.mats.body.color.getHex(), 0.5, 0.2);
    const beam = (a, b, t) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B); const m = new THREE.Mesh(new THREE.BoxGeometry(t, L, t), frameMat); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); c.add(m); };
    const zf = eye[2] - 0.72, zt = eye[2] + 0.1, yb = eye[1] - 0.35, yt = eye[1] + 0.42;
    for (const sx of [-1, 1]) { beam([sx * 0.74 * scale, yb - 0.15, zf + 0.35], [sx * 0.5 * scale, yt, zt], 0.028); }
    beam([-0.42 * scale, yt, zt], [0.42 * scale, yt, zt], 0.035);
    c.visible = false;
    return c;
  }

  // stan: {pos, quat, rpm, a1, b1, cx, cy, collective, t}
  update(st, dt, cockpitView) {
    const g = this.group;
    g.position.copy(st.pos); g.quaternion.copy(st.quat);
    const om = this.spec.rotor.omega * st.rpm;
    this.rotAngle = (this.rotAngle + om * dt) % (Math.PI * 2);
    this.rotorSpin.rotation.y = this.rotAngle;
    this.discU.angle.value = -this.rotAngle;
    const blur = Math.min(1, Math.max(0, (st.rpm - 0.15) / 0.5));
    this.discU.amt.value = blur;
    for (const b of this.blades) b.visible = blur < 0.85;
    // przechylenie tarczy + stożkowanie
    this.rotor.rotation.set(-st.a1, 0, -st.b1);
    const cone = Math.min(0.06, Math.max(-0.01, (st.T || 0) / (this.spec.mass.max * 9.81) * 0.035));
    for (const h of this.blades) h.children[0].rotation.z = cone;
    this.trAngle = (this.trAngle + om * 5.5 * dt) % (Math.PI * 2);
    this.tailRotor.rotation.x = this.trAngle;
    this.tailRotor.children.forEach((c, i) => { if (i < 2) c.visible = blur < 0.85; });
    this.cockpit.visible = !!cockpitView;
    this.canopy.visible = true;
    if (this.stick) this.stick.rotation.set(-(st.cy || 0) * 0.25, 0, -(st.cx || 0) * 0.25);
  }
}
