// Wejście: klawiatura, mysz (drążek przez Pointer Lock), pad (Gamepad API). Zwraca surowe sterowanie dla sesji.
export class Input {
  constructor(el, settings) {
    this.el = el; this.s = settings;
    this.down = new Set(); this.edges = new Set();
    this.stick = { x: 0, y: 0 }; this.collective = 0; this.pedal = 0;
    this.locked = false; this.enabled = false;
    this.padIndex = null; this.padActive = false;
    this.onKey = null;
    addEventListener('keydown', e => {
      if (this.onKeyCapture) { e.preventDefault(); this.onKeyCapture(e.code); return; }
      if (!this.down.has(e.code)) this.edges.add(e.code);
      this.down.add(e.code);
      if (this.enabled && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (this.onKey) this.onKey(e.code);
    });
    addEventListener('keyup', e => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
    el.addEventListener('mousemove', e => this.mouse(e));
    document.addEventListener('mousemove', e => { if (this.locked) this.mouse(e); });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === this.el; });
    el.addEventListener('mousedown', e => {
      if (!this.enabled) return;
      if (e.button === 1) { this.center(); e.preventDefault(); }
      if (e.button === 0 && !this.locked) this.lock();
      if (e.button === 2) this.rightDrag = true;
    });
    addEventListener('mouseup', e => { if (e.button === 2) this.rightDrag = false; });
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('wheel', e => { this.wheel = (this.wheel || 0) + Math.sign(e.deltaY); }, { passive: true });
    addEventListener('gamepadconnected', e => { this.padIndex = e.gamepad.index; });
    addEventListener('gamepaddisconnected', () => { this.padIndex = null; this.padActive = false; });
    this.look = { x: 0, y: 0 };
  }
  lock() {
    if (!navigator.userActivation || navigator.userActivation.isActive) {
      try { const p = this.el.requestPointerLock({ unadjustedMovement: true }); if (p && p.catch) p.catch(() => { try { const q = this.el.requestPointerLock(); if (q && q.catch) q.catch(() => {}); } catch { /* */ } }); } catch { /* bez blokady */ }
    }
  }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
  mouse(e) {
    if (!this.enabled || !this.locked) return;
    if (this.rightDrag) { this.look.x += e.movementX * 0.004; this.look.y += e.movementY * 0.004; return; }
    const prec = this.isDown('precise') ? 0.35 : 1;
    const k = 0.0022 * this.s.mouseSens * prec;
    this.stick.x = Math.max(-1, Math.min(1, this.stick.x + e.movementX * k));
    this.stick.y = Math.max(-1, Math.min(1, this.stick.y + (this.s.invertY ? 1 : -1) * e.movementY * k));
  }
  center() { this.stick.x = 0; this.stick.y = 0; }
  isDown(a) { return this.down.has(this.s.keys[a]) || (a === 'precise' && this.down.has('ShiftRight')); }
  pressed(a) { const c = this.s.keys[a]; if (this.edges.has(c)) { this.edges.delete(c); return true; } return false; }
  reset(collective = 0) { this.stick.x = 0; this.stick.y = 0; this.collective = collective; this.pedal = 0; this.edges.clear(); }
  expo(v, e) { return Math.sign(v) * (Math.abs(v) * (1 - e) + Math.pow(Math.abs(v), 3) * e); }
  poll(dt) {
    const prec = this.isDown('precise');
    let axis = 0;
    if (this.isDown('collUp')) axis += 1;
    if (this.isDown('collDown')) axis -= 1;
    const rate = prec ? 0.12 : 0.42;
    // pad
    let padC = null;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = this.padIndex !== null ? pads[this.padIndex] : [...pads].find(p => p);
    if (gp) {
      const dz = this.s.padDeadzone, ex = this.s.padExpo;
      const ax = i => { const v = gp.axes[i] || 0; return Math.abs(v) < dz ? 0 : Math.sign(v) * (Math.abs(v) - dz) / (1 - dz); };
      const lx = ax(0), ly = ax(1), rx = ax(2), ry = ax(3);
      if (Math.abs(rx) + Math.abs(ry) + Math.abs(lx) + Math.abs(ly) > 0.05) this.padActive = true;
      if (this.padActive) {
        padC = { cx: this.expo(rx, ex) * (prec ? 0.4 : 1), cy: this.expo(-ry, ex) * (prec ? 0.4 : 1), ped: this.expo(lx, ex) };
        if (Math.abs(ly) > 0) axis = -ly;
        const btn = i => gp.buttons[i] && gp.buttons[i].pressed;
        if (btn(0) && !this._padA) this.edges.add(this.s.keys.action); this._padA = btn(0);
        if (btn(3) && !this._padY) this.edges.add(this.s.keys.camera); this._padY = btn(3);
        if (btn(9) && !this._padS) this.edges.add(this.s.keys.pause); this._padS = btn(9);
      }
    }
    this.collective = Math.max(0, Math.min(1, this.collective + axis * (padC ? 0.7 : rate) * dt * (padC && prec ? 0.3 : 1)));
    // pedały z klawiatury: narastanie i powrót
    let pt = 0;
    if (this.isDown('pedLeft')) pt -= 1;
    if (this.isDown('pedRight')) pt += 1;
    pt *= prec ? 0.35 : 1;
    const pr = pt === 0 ? 5 : 2.2;
    this.pedal += Math.max(-pr * dt, Math.min(pr * dt, pt - this.pedal));
    // drążek z klawiatury (strzałki)
    const kr = this.s.keyCyclicRate * dt * (prec ? 0.35 : 1);
    if (this.isDown('cyclicFwd')) this.stick.y = Math.min(1, this.stick.y + kr);
    if (this.isDown('cyclicBack')) this.stick.y = Math.max(-1, this.stick.y - kr);
    if (this.isDown('cyclicLeft')) this.stick.x = Math.max(-1, this.stick.x - kr);
    if (this.isDown('cyclicRight')) this.stick.x = Math.min(1, this.stick.x + kr);
    if (this.s.stickSpring && !padC) { this.stick.x *= Math.exp(-dt * 0.8); this.stick.y *= Math.exp(-dt * 0.8); }
    if (this.pressed('center')) this.center();
    const e = this.s.expo;
    const cx = padC ? padC.cx : this.expo(this.stick.x, e), cy = padC ? padC.cy : this.expo(this.stick.y, e);
    const ped = padC && Math.abs(padC.ped) > 0.01 ? padC.ped : this.pedal;
    let winch = (this.isDown('winchDown') ? 1 : 0) - (this.isDown('winchUp') ? 1 : 0);
    if (gp && this.padActive) { if (gp.buttons[5]?.pressed) winch = 1; if (gp.buttons[4]?.pressed) winch = -1; }
    return { collective: this.collective, collectiveAxis: axis, cx, cy, pedal: ped, action: this.pressed('action'), winch: winch * (prec ? 0.3 : 1) };
  }
}
