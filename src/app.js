// Kontroler gry: stany ekranów, pętla stałokrokowa symulacji (120 Hz) z interpolacją renderu, kamera, HUD, dźwięk.
import * as THREE from 'three';
import { Session, DT } from './game/session.js';
import { missionById, MISSIONS } from './game/missions.js';
import { Hud } from './ui/hud.js';
import { Menus, missionUnlocked } from './ui/menus.js';
import { drawPanel } from './ui/instruments.js';
import { Input } from './core/input.js';
import { loadSettings, saveSettings } from './core/settings.js';
import { loadSave, storeSave, recordResult, newSave } from './core/save.js';
import { Audio } from './audio/audio.js';
import { AIRCRAFT } from './sim/aircraft.js';

const CAMS = ['chase', 'cockpit', 'hook'];
const CAM_LABEL = { chase: 'Kamera: zewnętrzna', cockpit: 'Kamera: kabina', hook: 'Kamera: widok haka', free: 'Kamera: swobodna' };

export class App {
  constructor(ctx, gfx, canvas) {
    this.ctx = ctx; this.gfx = gfx; this.canvas = canvas;
    this.settings = loadSettings(); this.save = loadSave();
    this.input = new Input(canvas, this.settings);
    this.hud = new Hud(document.getElementById('hud'), this.settings);
    this.menus = new Menus(this);
    this.audio = new Audio(); this.audio.setVolume(this.settings.volume);
    this.state = 'menu'; this.session = null; this.camMode = 'chase';
    this.acc = 0; this.last = performance.now();
    this.prev = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
    this.view = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
    this.camPos = new THREE.Vector3(); this.camLook = new THREE.Vector3(); this.camDist = 1;
    this.fps = 0; this._fa = 0; this._fn = 0;
    this.input.onKey = code => this.onKey(code);
    addEventListener('resize', () => this.resize()); this.resize();
    document.addEventListener('pointerdown', () => this.audio.init(), { once: false });
    this.applySettings('quality');
    this.gfx.hudVisible = true; this.hud.root.style.display = 'none';
    requestAnimationFrame(t => this.loop(t));
  }
  resize() { this.gfx.resize(innerWidth, innerHeight); }
  saveSettings() { saveSettings(this.settings); }
  applySettings(k) {
    const S = this.settings;
    if (k === 'quality') {
      let q = S.quality;
      if (q === 'auto') q = this.autoQuality();
      if (q !== this.gfx.quality) this.gfx.setQuality(q);
      this.resize();
    }
    if (k === 'fov') { this.gfx.camera.fov = S.fov; this.gfx.camera.updateProjectionMatrix(); }
    if (k === 'volume') this.audio.setVolume(S.volume);
  }
  autoQuality() {
    const gl = this.gfx.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    if (/SwiftShader|llvmpipe|Software/i.test(r)) return 'low';
    if (/RTX|RX 6[7-9]|RX 7|Radeon Pro|GTX 1080|GTX 1070|Arc A7/i.test(r)) return 'high';
    if (/Intel|Iris|UHD|Apple M1/i.test(r)) return 'medium';
    return 'high';
  }
  setSave(s) { this.save = s; storeSave(s); }
  resetSave() { this.save = newSave(); storeSave(this.save); }

  // --- akcje UI ---
  ui(a) {
    const back = () => (this.state === 'pause' ? this.menus.pause() : this.state === 'debrief' ? this.menus.debrief(this.result, this.session.def, this.session) : this.menus.start());
    switch (a) {
      case 'start': this.state = 'menu'; this.menus.start(); break;
      case 'map': this.endFlight(); this.state = 'menu'; this.menus.map(); break;
      case 'settings': this.menus.settings(back); break;
      case 'savecode': this.menus.savecode(back); break;
      case 'controls': this.menus.controls(back); break;
      case 'resume': this.resume(); break;
      case 'restart': case 'retry': this.startMission(this.session.def.id); break;
      case 'quit': this.endFlight(); this.state = 'menu'; this.menus.map(); break;
    }
  }

  startMission(id) {
    const def = missionById(id);
    this.audio.init();
    const t0 = performance.now();
    this.session = new Session(this.ctx, def, { assist: this.settings.assist, seed: (Date.now() & 0xffff) + 1 });
    const envKey = JSON.stringify([def.time, def.weather]);
    if (this._envKey !== envKey) { this.gfx.setEnvironment({ hour: def.time, clouds: def.weather?.clouds, fog: def.weather?.fog }); this._envKey = envKey; }
    if (!this.gfx.heli || this.gfx.heli.spec.id !== this.session.heli.spec.id) this.gfx.setHeli(this.session.heli.spec);
    this.input.reset(0);
    this.state = 'flight'; this.paused = false; this.endTimer = null; this.result = null;
    this.menus.hideAll(); this.hud.root.style.display = '';
    this.radioSeen = 0; this.hud.msgs = []; this.hud.renderRadio();
    this.prev.pos.copy(this.session.heli.pos); this.prev.quat.copy(this.session.heli.quat);
    this.camPos.set(1e9, 0, 0);
    this.input.enabled = true; this.input.lock();
    this.markerKey = null;
    this.gfx.loadMeshes.forEach(m => this.gfx.scene.remove(m)); this.gfx.loadMeshes.clear();
    this.restartMs = performance.now() - t0;
  }
  endFlight() { this.input.enabled = false; this.input.unlock(); this.state = 'menu'; this.hud.root.style.display = 'none'; }
  pause() { if (this.state !== 'flight') return; this.state = 'pause'; this.input.unlock(); this.menus.pause(); }
  resume() { this.state = 'flight'; this.menus.hideAll(); this.input.lock(); this.last = performance.now(); }

  onKey(code) {
    const K = this.settings.keys;
    if (this.state === 'flight') {
      if (code === K.pause) this.pause();
      else if (code === K.restart) this.startMission(this.session.def.id);
      else if (code === K.camera) { this.camMode = CAMS[(CAMS.indexOf(this.camMode) + 1) % CAMS.length]; this.input.look.x = this.input.look.y = 0; }
      else if (code === K.hud) { this.gfx.hudVisible = !this.gfx.hudVisible; this.hud.setVisible(this.gfx.hudVisible); }
    } else if (this.state === 'pause' && code === K.pause) this.resume();
    else if (this.state === 'debrief' && code === K.restart) this.startMission(this.session.def.id);
  }

  finish() {
    const res = this.session.mission.result();
    this.result = res;
    recordResult(this.save, res); storeSave(this.save);
    this.state = 'debrief'; this.input.enabled = false; this.input.unlock();
    this.menus.debrief(res, this.session.def, this.session);
  }

  // --- pętla ---
  loop(now) {
    requestAnimationFrame(t => this.loop(t));
    if (this.loopStopped) { this.last = now; return; }
    let dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    this._fa += dt; this._fn++; if (this._fa > 0.5) { this.fps = this._fn / this._fa; this._fa = 0; this._fn = 0; }
    if (!this.session) { this.renderIdle(dt); return; }
    const s = this.session, h = s.heli;
    if (this.state === 'flight' && !this.debugHold) {
      this.acc += dt;
      let n = 0;
      while (this.acc >= DT && n < 30) {
        this.prev.pos.copy(h.pos); this.prev.quat.copy(h.quat);
        const raw = this.input.poll(DT);
        this.lastRaw = raw;
        const wasCrash = h.crashed, touch = h.stats.touchdowns;
        s.step(raw);
        if (!wasCrash && h.crashed) this.audio.crash();
        if (h.stats.touchdowns > touch) this.audio.thump(h.stats.lastImpact);
        this.acc -= DT; n++;
      }
      if (n >= 30) this.acc = 0;
      // wiadomości radiowe
      const R = s.mission.radio;
      while (this.radioSeen < R.length) this.hud.radio(R[this.radioSeen++], this.audio);
      // koniec misji: krótka chwila na zobaczenie efektu
      if (s.mission.status !== 'running' && !this.endTimer) this.endTimer = s.mission.status === 'success' ? 2.5 : 2.2;
      if (this.endTimer) { this.endTimer -= dt; if (this.endTimer <= 0) this.finish(); }
    } else this.acc = 0;
    const alpha = this.state === 'flight' ? this.acc / DT : 1;
    this.view.pos.copy(this.prev.pos).lerp(h.pos, alpha);
    this.view.quat.copy(this.prev.quat).slerp(h.quat, alpha);
    this.render(dt);
  }

  renderIdle(dt) {
    // tło menu: powolny przelot kamery nad doliną
    const t = performance.now() / 1000;
    const cam = this.gfx.camera;
    if (!this._idleEnv) { this.gfx.setEnvironment({ hour: 10.5, clouds: 0.35, fog: 0.12 }); this._idleEnv = true; }
    const x = 300 + Math.sin(t * 0.02) * 900, z = 1800 - t * 6 % 3000;
    const g = this.ctx.terrain.height(x, z);
    cam.position.set(x, Math.max(g + 180, 1150), z); cam.lookAt(x - 600, 1500, z - 1400);
    this.gfx.frame(dt, { heli: { pos: cam.position }, heliState: null, wind: [2, 0, 1] });
  }

  render(dt) {
    const s = this.session, h = s.heli, gfx = this.gfx, cam = gfx.camera, S = this.settings;
    const pos = this.view.pos, quat = this.view.quat;
    const att = h.attitude();
    // --- kamera ---
    const look = this.input.look;
    if (this.input.wheel) { this.camDist = Math.max(0.5, Math.min(3, this.camDist * (1 + this.input.wheel * 0.08))); this.input.wheel = 0; }
    const shake = S.reduceMotion ? 0 : (h.tel.etl * 0.015 + h.vrs * 0.03 + (h.crashed ? 0.05 : 0));
    const sh = () => (Math.random() - 0.5) * shake;
    if (this.camMode === 'cockpit') {
      const eye = new THREE.Vector3(...h.spec.cockpit.eye).applyQuaternion(quat).add(pos);
      cam.position.copy(eye);
      cam.quaternion.copy(quat);
      cam.rotateY(-look.x); cam.rotateX(-look.y - 0.14);
      cam.rotateX(sh()); cam.rotateZ(sh());
      cam.fov = S.fov + 6;
    } else if (this.camMode === 'hook') {
      const p = new THREE.Vector3(0, h.spec.skids.y + (h.onGround ? 0.6 : 0.05), 0.2).applyQuaternion(quat).add(pos);
      cam.position.copy(p);
      const f = new THREE.Vector3(Math.sin(att.heading), 0, -Math.cos(att.heading));
      cam.up.copy(f); cam.lookAt(p.x, p.y - 10, p.z); cam.up.set(0, 1, 0);
      cam.fov = 78;
    } else {
      const R = h.spec.rotor.R;
      const dist = (10 + R * 1.3) * this.camDist, hgt = 2.2 + R * 0.4;
      const yaw = att.heading + look.x, pitch = Math.max(-0.3, Math.min(1.2, 0.12 + look.y));
      const want = new THREE.Vector3(pos.x - Math.sin(yaw) * Math.cos(pitch) * dist, pos.y + hgt + Math.sin(pitch) * dist, pos.z + Math.cos(yaw) * Math.cos(pitch) * dist);
      if (this.camPos.x > 1e8) this.camPos.copy(want);
      this.camPos.lerp(want, 1 - Math.exp(-dt * 5));
      const g = this.ctx.world.ground(this.camPos.x, this.camPos.z, this.camPos.y + 2).h;
      if (this.camPos.y < g + 1.2) this.camPos.y = g + 1.2;
      cam.position.copy(this.camPos);
      cam.position.x += sh() * 3; cam.position.y += sh() * 3;
      cam.lookAt(pos.x + Math.sin(att.heading) * 3, pos.y + 1.2, pos.z - Math.cos(att.heading) * 3);
      cam.fov = S.fov;
    }
    cam.updateProjectionMatrix();
    // --- znaczniki celu ---
    const o = s.mission.current;
    const mk = o ? o.marker() : null;
    const key = s.mission.idx + ':' + (mk ? mk.kind : '');
    if (key !== this.markerKey) {
      this.markerKey = key;
      const list = [];
      if (mk) list.push(mk);
      // kolejne bramki widoczne z wyprzedzeniem
      for (let i = s.mission.idx + 1; i < s.mission.objs.length && i < s.mission.idx + 3; i++) { const oo = s.mission.objs[i]; if (oo.def.type === 'gate') { oo.init(s.mission); list.push({ ...oo.marker(), next: true }); } }
      gfx.setMarkers(list);
    }
    if (mk && (mk.kind === 'load')) gfx.markers.children[0]?.position.set(mk.x, mk.y - 0.5, mk.z);
    // --- lina i ładunki ---
    if (s.sling) { gfx.setRope(s.sling.nodes, s.sling.load ? [s.sling.load.pos[0], s.sling.load.pos[1] + s.sling.load.half, s.sling.load.pos[2]] : null); }
    else gfx.setRope(null);
    gfx.setLoads(s.loads);
    // --- tablica przyrządów w kokpicie ---
    if (this.camMode === 'cockpit' && gfx.heli) {
      this._panelT = (this._panelT || 0) + dt;
      if (this._panelT > 1 / 30) { this._panelT = 0; drawPanel(gfx.heli.panelCanvas, h, att, S.units); gfx.heli.panelTex.needsUpdate = true; }
    }
    // --- kurz od podmuchu wirnika ---
    const gUnder = this.ctx.world.ground(h.pos.x, h.pos.z, h.pos.y);
    const hubAgl = h.pos.y + h.spec.rotor.hubH - gUnder.h;
    const dustStr = h.rpm > 0.5 && hubAgl < h.spec.rotor.R * 3 ? (1 - hubAgl / (h.spec.rotor.R * 3)) * Math.min(1, h.tel.T / (h.mass * 9.81)) : 0;
    // --- klatka ---
    const heliState = { pos, quat, rpm: h.rpm, a1: h.a1, b1: h.b1, T: h.tel.T, cx: s.controls.cx, cy: s.controls.cy };
    const W = s.wind;
    gfx.frame(dt, {
      heli: h, heliState, cockpit: this.camMode === 'cockpit', wind: h.tel.wind,
      downwash: h.rpm > 0.5 ? Math.min(1.5, h.tel.T / (h.mass * 9.81)) : 0,
      dust: dustStr > 0.02 ? { groundY: gUnder.h, water: gUnder.water, strength: dustStr } : null,
      windAt: (x, y, z) => W.sample(x, y, z, s.t, [0, 0, 0]),
    });
    // --- HUD ---
    let targetScreen = null;
    if (mk && S.hudArrow) {
      const tp = new THREE.Vector3(mk.x, mk.y + (mk.kind === 'hover' ? (mk.agl[0] + mk.agl[1]) / 2 : mk.kind === 'gate' ? 0 : 1), mk.z);
      const dist = Math.hypot(tp.x - h.pos.x, tp.z - h.pos.z);
      const p = tp.clone().project(cam);
      const W2 = innerWidth / 2, H2 = innerHeight / 2;
      const behind = p.z > 1 || tp.clone().sub(cam.position).dot(cam.getWorldDirection(new THREE.Vector3())) < 0;
      let x = p.x, y = p.y; if (behind) { x = -x; y = -y; }
      if (!behind && Math.abs(x) < 0.92 && Math.abs(y) < 0.88) targetScreen = { x: W2 + x * W2, y: H2 - y * H2, dist };
      else { const a = Math.atan2(y, x), m = Math.max(Math.abs(x) / 0.9, Math.abs(y) / 0.82, 1e-3); targetScreen = { x: W2 + x / m * W2, y: H2 - y / m * H2, dist, edge: true, angle: Math.PI / 2 - a }; }
    }
    const sl = s.sling;
    let hookDist = null, hookAgl = null, loadAgl = 0;
    if (sl) {
      const hk = sl.hookPos, g = this.ctx.world.ground(hk[0], hk[2], hk[1]).h;
      hookAgl = hk[1] - g;
      const t = mk ? mk : null;
      if (t) hookDist = Math.hypot(hk[0] - t.x, hk[2] - t.z);
      if (sl.load) loadAgl = sl.load.pos[1] - sl.load.half - this.ctx.world.ground(sl.load.pos[0], sl.load.pos[2], sl.load.pos[1]).h;
    }
    this.hud.root.classList.toggle('cockpit', this.camMode === 'cockpit');
    this.hud.update(dt, { heli: h, att, raw: this.lastRaw || { cx: 0, cy: 0, collective: 0, pedal: 0 }, objective: o, flash: s.mission.flash, time: s.mission.time, limit: s.def.limits?.time, targetScreen, sling: sl, hookDist, hookAgl, loadAgl, camLabel: CAM_LABEL[this.camMode] });
    // --- dźwięk ---
    const E = h.spec.engine;
    this.audio.update({ rpm: h.rpm, blades: h.spec.rotor.blades, omega: h.spec.rotor.omega, load: Math.max(0, h.tel.T / (h.mass * 9.81) - 0.3), vrs: h.vrs, etl: h.tel.etl, ias: h.tel.ias,
      engine: E.type, engRpm: h.engineOn && !h.engineFailed && h.fuel > 0 ? Math.max(0.6, h.rpm) : h.rpm * 0.3, engRun: h.engineOn && !h.engineFailed && h.fuel > 0 ? 1 : 0,
      power: h.tel.Peng / Math.max(1, E.type === 'piston' ? E.P : E.flat), lowRpm: h.rpm < h.spec.rpm.low && h.rpm > 0.2 && !h.crashed, inside: this.camMode === 'cockpit', paused: this.state !== 'flight' });
  }
}
