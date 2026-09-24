// Asysty sterowania – jedna ścieżka dla gracza i autopilota.
// Wejście „surowe” (drążek/skok/pedały z urządzenia) -> sterowanie efektywne podawane do modelu lotu.
//  none    – bez asysty: drążek = przechylenie tarczy wirnika
//  partial – stabilizacja postawy: drążek = zadane pochylenie/przechylenie, tłumik odchylania
//  full    – stabilizacja pozycji: drążek = zadana prędkość, auto-pedały (utrzymanie kursu), utrzymanie wysokości
import { clamp } from '../core/noise.js';

const deg = Math.PI / 180;
export const ASSIST = { none: 'Brak', partial: 'Częściowa', full: 'Pełna' };
export const ATT_MAX = { pitch: 22 * deg, roll: 28 * deg };

const wrapPi = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export class Assist {
  constructor() { this.reset(); }
  reset() {
    this.iP = 0; this.iR = 0; this.holdPos = null; this.holdHdg = null; this.holdAlt = null;
    this.iVx = 0; this.iVz = 0; this.iAlt = 0; this.colHover = 0.5;
    this._att = {};
  }

  // Regulator postawy: zadane pochylenie/przechylenie -> cykliczny (używa go też autopilot)
  attitudeHold(heli, dt, desPitch, desRoll, out) {
    const a = heli.attitude(this._att), w = heli.omega, k = heli.spec.stab;
    const eP = a.pitch - desPitch, eR = desRoll - a.roll;
    const rollRate = -w.z;
    this.iP = clamp(this.iP + eP * dt * k.ki, -0.5, 0.5);
    this.iR = clamp(this.iR + eR * dt * k.ki, -0.5, 0.5);
    out.cy = clamp(k.kp * eP + k.kd * w.x + this.iP, -1, 1);
    out.cx = clamp(k.kp * eR - k.kd * rollRate + this.iR, -1, 1);
    return out;
  }

  apply(level, heli, raw, dt, out) {
    out.collective = raw.collective; out.pedal = raw.pedal; out.cx = raw.cx; out.cy = raw.cy;
    if (level === 'none') { this.iP = this.iR = 0; return out; }
    const a = heli.attitude(this._att);
    if (level === 'partial') {
      this.attitudeHold(heli, dt, -raw.cy * ATT_MAX.pitch, raw.cx * ATT_MAX.roll, out);
      out.pedal = clamp(raw.pedal + heli.omega.y * 0.9, -1, 1); // tłumik odchylania
      return out;
    }
    // --- pełna ---
    const ch = Math.cos(a.heading), sh = Math.sin(a.heading);
    const vF = heli.vel.x * sh - heli.vel.z * ch, vR = heli.vel.x * ch + heli.vel.z * sh;
    const stickActive = Math.abs(raw.cx) > 0.04 || Math.abs(raw.cy) > 0.04;
    let dF, dR;
    if (stickActive || heli.onGround) { this.holdPos = null; dF = raw.cy * 22; dR = raw.cx * 10; }
    if (!stickActive && !heli.onGround) {
      if (!this.holdPos && Math.hypot(vF, vR) < 3) this.holdPos = { x: heli.pos.x, z: heli.pos.z };
      if (this.holdPos) {
        const ex = this.holdPos.x - heli.pos.x, ez = this.holdPos.z - heli.pos.z;
        const eF = ex * sh - ez * ch, eR = ex * ch + ez * sh;
        dF = clamp(eF * 0.35, -4, 4); dR = clamp(eR * 0.35, -4, 4);
      } else { dF = 0; dR = 0; }
    }
    this.iVx = clamp(this.iVx + (dF - vF) * dt * 0.02, -0.12, 0.12);
    this.iVz = clamp(this.iVz + (dR - vR) * dt * 0.02, -0.12, 0.12);
    const desPitch = clamp(-(dF - vF) * 0.06 - this.iVx, -ATT_MAX.pitch, ATT_MAX.pitch);
    const desRoll = clamp((dR - vR) * 0.06 + this.iVz, -ATT_MAX.roll, ATT_MAX.roll);
    this.attitudeHold(heli, dt, desPitch, desRoll, out);
    // auto-pedały: pedały = zadana prędkość zakrętu, puszczone = utrzymanie kursu
    if (Math.abs(raw.pedal) > 0.05 || this.holdHdg === null || heli.onGround) this.holdHdg = a.heading;
    const rateCmd = -raw.pedal * 0.6 + (Math.abs(raw.pedal) > 0.05 ? 0 : wrapPi(a.heading - this.holdHdg) * 1.2);
    out.pedal = clamp((heli.omega.y - rateCmd) * 1.4 + this.pedTrim(heli), -1, 1);
    // skok: oś (W/S) = zadana prędkość pionowa, puszczona = utrzymanie wysokości
    const axis = raw.collectiveAxis || 0;
    if (heli.onGround && axis <= 0) { out.collective = raw.collective; this.holdAlt = null; this.colHover = Math.max(this.colHover, 0.3); return out; }
    let vsCmd;
    if (Math.abs(axis) > 0.05 || this.holdAlt === null) { vsCmd = axis * 4; this.holdAlt = heli.pos.y; }
    else vsCmd = clamp((this.holdAlt - heli.pos.y) * 0.6, -2, 2);
    this.colHover = clamp(this.colHover + (vsCmd - heli.vel.y) * dt * 0.04, 0.1, 0.95);
    out.collective = clamp(this.colHover + (vsCmd - heli.vel.y) * 0.06, 0, 1);
    return out;
  }
  pedTrim(heli) { // przybliżony trym pedałów z momentu obrotowego
    const tl = heli.spec.tail, S = heli.spec;
    const Q = heli.tel.Peng / (S.rotor.omega * Math.max(0.3, heli.rpm));
    const need = Q / tl.arm / (tl.kT * (heli.tel.rho / 1.225) * Math.max(0.3, heli.rpm * heli.rpm));
    return clamp((tl.bias - need) / tl.range, -1, 1);
  }
}
