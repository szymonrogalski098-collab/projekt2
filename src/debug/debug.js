// API debug (tylko ?debug): sterowanie misją, kamera, zrzuty, bot w czasie rzeczywistym, statystyki renderu.
import * as THREE from 'three';
import { Autopilot } from '../game/autopilot.js';
import { MISSIONS } from '../game/missions.js';
import { DT } from '../game/session.js';

export function installDebug(app) {
  const g = app.gfx;
  const api = {
    missions: () => MISSIONS.map(m => m.id),
    setLevel(id, opts = {}) { app.startMission(id); app.input.unlock(); if (opts.cam) app.camMode = opts.cam; return app.session.def.title; },
    teleport(x, y, z, heading = 0, speed = 0) {
      const h = app.session.heli; h.pos.set(x, y ?? app.ctx.terrain.height(x, z) + 30, z); h.quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -heading * Math.PI / 180);
      h.vel.set(Math.sin(heading * Math.PI / 180) * speed, 0, -Math.cos(heading * Math.PI / 180) * speed); h.omega.set(0, 0, 0); h.onGround = false; h.vi = 6;
      app.prev.pos.copy(h.pos); app.prev.quat.copy(h.quat); app.view.pos.copy(h.pos); app.view.quat.copy(h.quat); app.camPos.set(1e9, 0, 0);
    },
    setFog(v) { const d = app.session?.def; g.setEnvironment({ hour: d?.time ?? 11, clouds: d?.weather?.clouds ?? 0.3, fog: v }); },
    setTime(h) { const d = app.session?.def; g.setEnvironment({ hour: h, clouds: d?.weather?.clouds ?? 0.3, fog: d?.weather?.fog ?? 0.1 }); },
    hold(v = true) { app.debugHold = v; },
    // presety kamer do zrzutów: gracz | mgla-off | z-gory | koniec | kokpit | hak
    capture(preset) {
      const s = app.session, h = s.heli;
      app.debugHold = true; app.camMode = 'chase'; app.input.look.x = app.input.look.y = 0;
      if (preset === 'mgla-off') { const f = g.env; g.setEnvironment({ ...f, fog: 0 }); }
      if (preset === 'kokpit') app.camMode = 'cockpit';
      if (preset === 'hak') app.camMode = 'hook';
      if (preset === 'z-gory' || preset === 'koniec') {
        const objs = s.mission.objs, o = preset === 'koniec' ? objs[objs.length - 1] : s.mission.current;
        o.init(s.mission);
        const m = o.marker() || { x: h.pos.x, y: h.pos.y, z: h.pos.z };
        if (preset === 'koniec') { api.teleport(m.x + 30, m.y + 25, m.z + 40, 200, 0); }
        else { api.freeCam([m.x, m.y + 380, m.z + 160], [m.x, m.y, m.z]); return; }
      }
      app.freeCam = null;
      app.view.pos.copy(h.pos); app.view.quat.copy(h.quat); app.prev.pos.copy(h.pos); app.prev.quat.copy(h.quat); app.camPos.set(1e9, 0, 0);
      for (let i = 0; i < (api.frames || 3); i++) app.render(1 / 60);
    },
    freeCam(pos, look) {
      app.freeCam = { pos, look };
      const cam = g.camera; cam.position.set(...pos); cam.lookAt(...look); cam.updateProjectionMatrix();
      g.frame(1 / 60, { heli: app.session.heli, heliState: { pos: app.session.heli.pos, quat: app.session.heli.quat, rpm: app.session.heli.rpm, a1: 0, b1: 0 }, wind: [0, 0, 0] });
    },
    renderOnce() { const t = performance.now(); if (app.session) app.render(1 / 60); else app.renderIdle(1 / 60); return performance.now() - t; },
    stopLoop(v = true) { app.loopStopped = v; },
    fly(seconds, raw) { const s = app.session; for (let i = 0; i < seconds / DT; i++) s.step({ collective: 0, cx: 0, cy: 0, pedal: 0, ...raw }); app.prev.pos.copy(s.heli.pos); app.prev.quat.copy(s.heli.quat); app.view.pos.copy(s.heli.pos); app.view.quat.copy(s.heli.quat); },
    // autopilot w tej samej sesji (wejścia wirtualne); fast = bez renderu
    runBot(id, { seconds = 900, fast = true, until = null } = {}) {
      if (id) app.startMission(id); app.input.unlock();
      const s = app.session, ap = new Autopilot(s);
      const n = seconds / DT;
      for (let i = 0; i < n && s.mission.status === 'running'; i++) { s.step(ap.step()); if (until && until(s)) break; }
      app.prev.pos.copy(s.heli.pos); app.prev.quat.copy(s.heli.quat);
      return { status: s.mission.status, t: s.t, reason: s.mission.failReason, result: s.mission.status !== 'running' ? s.mission.result() : null };
    },
    stats() {
      const i = g.renderer.info;
      return { fps: app.fps, calls: i.render.calls, triangles: i.render.triangles, lines: i.render.lines, points: i.render.points, textures: i.memory.textures, geometries: i.memory.geometries,
        patches: g.terrain.patchCount, farTrees: g.forest.farCount, nearTrees: g.forest.near.map(m => m.count), quality: g.quality, restartMs: app.restartMs };
    },
    state() { const h = app.session?.heli; return h ? { pos: h.pos.toArray(), vel: h.vel.toArray(), rpm: h.rpm, agl: h.tel.agl, mission: app.session.mission.status, idx: app.session.mission.idx, time: app.session.mission.time, crashed: h.crashed } : null; },
    app,
  };
  // w trybie swobodnej kamery nie nadpisuj jej w render()
  const orig = app.render.bind(app);
  app.render = dt => { if (app.freeCam) { const c = g.camera; c.position.set(...app.freeCam.pos); c.lookAt(...app.freeCam.look); c.updateProjectionMatrix(); g.frame(dt, { heli: app.session.heli, heliState: { pos: app.view.pos, quat: app.view.quat, rpm: app.session.heli.rpm, a1: 0, b1: 0 }, wind: [0, 0, 0] }); return; } orig(dt); };
  window.__game = api;
}
