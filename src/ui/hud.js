// HUD lotu (DOM): cel, przyrządy, ostrzeżenia, radio, pasek prędkości pionowej, drążek, wiatr, strzałka celu.
const fmt = (v, d = 0) => (v < 0 && v > -Math.pow(10, -d) / 2 ? 0 : v).toFixed(d).replace('.', ',');

export class Hud {
  constructor(root, settings) {
    this.s = settings;
    root.innerHTML = `
      <div id="camlabel"></div>
      <div id="obj"><div class="t"></div><div class="s"></div><div class="bar"><i></i></div></div>
      <div id="timer" class="num"></div>
      <div id="wind"><div class="ar"><i></i></div><b></b><div class="lbl">WIATR</div></div>
      <div id="inst"></div>
      <div id="warn"></div>
      <div id="vsbar"><div class="z"></div><i></i><b></b><div class="lbl">PIONOWA</div></div><div id="flash"></div>
      <div id="tgt"><div class="d"></div><div class="l num"></div></div>
      <div id="hookinfo"></div>
      <div id="stickbox"><div><div class="pad"><i></i></div><div class="ped"><i></i></div><div class="lbl">DRĄŻEK · PEDAŁY</div></div><div><div class="col"><i></i><b title="zawis"></b></div><div class="lbl">SKOK</div></div></div>
      <div id="radio"></div>`;
    this.root = root;
    const q = s => root.querySelector(s);
    this.el = { obj: q('#obj'), objT: q('#obj .t'), objS: q('#obj .s'), objBar: q('#obj .bar i'), timer: q('#timer'), inst: q('#inst'), warn: q('#warn'), vs: q('#vsbar'), vsI: q('#vsbar i'), vsB: q('#vsbar b'),
      tgt: q('#tgt'), flash: q('#flash'), tgtL: q('#tgt .l'), hook: q('#hookinfo'), stick: q('#stickbox .pad i'), col: q('#stickbox .col i'), ped: q('#stickbox .ped i'), wind: q('#wind'), windI: q('#wind i'), windB: q('#wind b'), radio: q('#radio'), cam: q('#camlabel') };
    this.el.inst.innerHTML = ['spd', 'alt', 'agl', 'vs', 'rpm', 'pwr', 'fuel', 'hdg'].map(k => `<div class="r" data-k="${k}"><span></span><b></b></div>${k === 'rpm' || k === 'pwr' ? `<div class="g" data-g="${k}"><i></i><u></u></div>` : ''}`).join('');
    this.rows = {}; for (const r of this.el.inst.querySelectorAll('.r')) this.rows[r.dataset.k] = { r, l: r.querySelector('span'), v: r.querySelector('b') };
    this.gauges = {}; for (const g of this.el.inst.querySelectorAll('.g')) this.gauges[g.dataset.g] = { i: g.querySelector('i'), u: g.querySelector('u') };
    this.msgs = []; this.lastRadio = 0; this.t = 0; this._acc = 1;
  }
  setVisible(v) { this.root.classList.toggle('off', !v); }
  units() {
    const av = this.s.units === 'aviation';
    return { spd: av ? ['kt', 1.94384] : ['km/h', 3.6], alt: av ? ['ft', 3.28084] : ['m', 1], vs: av ? ['ft/min', 196.85] : ['m/s', 1] };
  }
  radio(msg, audio) {
    const who = { instr: 'instruktor', hint: 'podpowiedź', sys: 'uwaga', baza: 'radio' }[msg.who] || 'radio';
    const [name, rest] = /^(\S+): (.*)$/.test(msg.text) ? msg.text.split(/: (.*)/s) : [null, msg.text];
    this.msgs.push({ html: `<div class="m ${msg.who}"><span class="who">${name || who}</span>${rest}</div>`, t: this.t, dur: 7 + rest.length * 0.045 });
    if (this.msgs.length > 2) this.msgs.shift();
    this.renderRadio();
    if (audio) audio.radio();
  }
  renderRadio() { this.el.radio.innerHTML = this.msgs.map(m => m.html).join('<br>'); }

  // v: widok danych (tel, attitude, mission, target, raw, camera, etc.)
  update(dt, v) {
    this.t += dt;
    // wygaszanie radia
    const before = this.msgs.length; this.msgs = this.msgs.filter(m => this.t - m.t < m.dur); if (this.msgs.length !== before) this.renderRadio();
    this._acc += dt;
    const S = this.s, U = this.units(), h = v.heli, tel = h.tel;
    // drążek (co klatkę)
    if (S.hudStick) {
      this.el.stick.style.left = (50 + v.raw.cx * 46) + '%'; this.el.stick.style.top = (50 - v.raw.cy * 46) + '%';
      this.el.col.style.height = ((v.col ?? v.raw.collective) * 100) + '%';
      const hm = this.el.col.parentElement.querySelector('b');
      if (v.hoverCol == null) hm.style.display = 'none'; else { hm.style.display = ''; hm.style.bottom = (Math.max(0, Math.min(1, v.hoverCol)) * 100) + '%'; }
      this.el.ped.style.left = (50 + v.raw.pedal * 48) + '%';
    }
    this.el.stick.parentElement.parentElement.parentElement.style.display = S.hudStick ? '' : 'none';
    if (this._acc < 1 / 15) return this.updateTarget(v);
    this._acc = 0;
    const set = (k, label, val, cls = '') => { const r = this.rows[k]; r.l.textContent = label; r.v.textContent = val; r.r.className = 'r ' + cls; };
    set('spd', 'Prędkość', `${fmt(tel.ias * U.spd[1])} ${U.spd[0]}`, tel.ias > h.spec.vne ? 'bad' : tel.ias > h.spec.vne * 0.9 ? 'warn' : '');
    set('alt', 'Wysokość', `${fmt(h.pos.y * U.alt[1])} ${U.alt[0]}`);
    set('agl', 'Nad ziemią', `${fmt(Math.max(0, tel.agl) * U.alt[1], tel.agl < 10 ? 1 : 0)} ${U.alt[0]}`);
    set('vs', 'Pionowa', `${fmt(tel.vs * U.vs[1], S.units === 'aviation' ? 0 : 1)} ${U.vs[0]}`);
    const rpm = h.rpm * 100;
    set('rpm', 'Obroty wirnika', `${fmt(rpm)} %`, rpm < 90 || rpm > 110 ? 'bad' : rpm < h.spec.rpm.low * 100 ? 'warn' : '');
    this.gauges.rpm.i.style.width = Math.min(100, Math.max(0, (rpm - 70) / 45 * 100)) + '%'; this.gauges.rpm.u.style.left = ((h.spec.rpm.low * 100 - 70) / 45 * 100) + '%';
    this.gauges.rpm.i.style.background = rpm < h.spec.rpm.low * 100 ? 'var(--red)' : 'var(--green)';
    const pw = tel.Peng / Math.max(1, tel.Pav) * 100, pwAbs = (tel.torque || 0) * 100;
    set('pwr', h.spec.engine.type === 'piston' ? 'Moc' : 'Moment', `${fmt(pwAbs)} %`, pw > 98 ? 'warn' : '');
    this.gauges.pwr.i.style.width = Math.min(100, pwAbs) + '%'; this.gauges.pwr.u.style.left = Math.min(100, tel.Pav / (h.spec.engine.type === 'piston' ? h.spec.engine.P : h.spec.engine.flat) * 100) + '%';
    this.gauges.pwr.i.style.background = pw > 98 ? 'var(--amber)' : 'var(--green)';
    const burn = h.Peng * h.spec.fuel.sfc * 60;
    set('fuel', 'Paliwo', `${fmt(h.fuel)} kg`, h.fuel < 5 ? 'bad' : h.fuel < 10 ? 'warn' : '');
    const hd = ((v.att.heading * 180 / Math.PI) + 360) % 360;
    set('hdg', 'Kurs', `${String(Math.round(hd) % 360).padStart(3, '0')}°`);
    // cel
    const o = v.objective;
    if (o) {
      this.el.obj.style.display = '';
      this.el.objT.textContent = o.text;
      let sub = '';
      const st = o.status || {};
      if (st.dist != null) sub += `${st.dist > 1000 ? fmt(st.dist / 1000, 1) + ' km' : fmt(st.dist) + ' m'}`;
      if (st.agl != null) sub += ` · wys. ${fmt(st.agl, 1)} m`;
      if (st.err != null) sub += ` · odchyłka ${fmt(st.err)}°`;
      this.el.objS.textContent = sub;
      const prog = st.need ? st.hold / st.need : 0;
      this.el.objBar.parentElement.style.display = st.need ? '' : 'none';
      this.el.objBar.style.width = Math.min(100, prog * 100) + '%';
    } else this.el.obj.style.display = 'none';
    this.el.timer.textContent = v.time != null ? `${Math.floor(v.time / 60)}:${String(Math.floor(v.time % 60)).padStart(2, '0')}${v.limit ? ' / ' + Math.floor(v.limit / 60) + ':' + String(v.limit % 60).padStart(2, '0') : ''}` : '';
    // wiatr względem kursu
    const w = tel.wind, ws = Math.hypot(w[0], w[2]);
    this.el.wind.style.display = S.hudWind ? '' : 'none';
    const from = Math.atan2(-w[0], w[2]); // skąd wieje (kierunek świata)
    this.el.windI.style.transform = `rotate(${(from - v.att.heading) * 180 / Math.PI + 180}deg)`;
    this.el.windB.textContent = `${fmt(ws, 0)} m/s`;
    // ostrzeżenia
    const warns = [];
    if (h.crashed) warns.push(h.crashed.toUpperCase());
    else {
      if (h.rpm < h.spec.rpm.low && !h.onGround) warns.push('NISKIE OBROTY WIRNIKA');
      if (h.rpm > h.spec.rpm.over) warns.push('<span class="a">NADMIERNE OBROTY</span>');
      if (h.fuel < 4 && h.fuel > 0) warns.push('<span class="a">REZERWA PALIWA</span>');
      if (h.fuel <= 0) warns.push('BRAK PALIWA');
      if (tel.ias > h.spec.vne) warns.push('<span class="a">VNE</span>');
    }
    this.el.warn.innerHTML = warns.join('<br>'); this.el.warn.className = warns.length && !h.crashed ? 'blink' : '';
    // pasek prędkości pionowej przy ziemi
    const showVs = S.hudVsBar && tel.agl < 25 && !h.onGround;
    this.el.vs.style.display = showVs ? 'block' : 'none';
    if (showVs) {
      const vs = tel.vs, f = Math.max(-1, Math.min(1, vs / 3));
      const col = vs > -0.5 ? 'var(--green)' : vs > -1.5 ? 'var(--amber)' : 'var(--red)';
      this.el.vsI.style.background = col;
      if (f < 0) { this.el.vsI.style.top = '50%'; this.el.vsI.style.height = (-f * 50) + '%'; } else { this.el.vsI.style.top = (50 - f * 50) + '%'; this.el.vsI.style.height = (f * 50) + '%'; }
      this.el.vsB.textContent = `${fmt(vs, 1)} m/s`; this.el.vsB.style.color = col;
    }
    // hak
    if (v.sling && S.hudHook) {
      this.el.hook.style.display = 'block';
      const L = v.sling.load;
      this.el.hook.innerHTML = L ? `Ładunek: <b>${L.name}</b> ${L.mass} kg · nad ziemią <b>${fmt(Math.max(0, v.loadAgl), 1)} m</b>` : `Hak nad celem: <b>${fmt(v.hookDist ?? 0, 1)} m</b> · wys. <b>${fmt(v.hookAgl ?? 0, 1)} m</b>`;
    } else this.el.hook.style.display = 'none';
    if (v.camLabel !== this._camL) { this._camL = v.camLabel; this._camT = this.t; }
    this.el.cam.textContent = this.t - (this._camT || 0) < 3 ? (v.camLabel || '') : '';
    const fl = v.flash; this.el.flash.textContent = fl && v.time - fl.t < 1.6 ? fl.text : '';
    this.updateTarget(v);
  }
  updateTarget(v) {
    const t = v.targetScreen;
    if (!t || !this.s.hudArrow) { this.el.tgt.style.display = 'none'; return; }
    this.el.tgt.style.display = 'block';
    this.el.tgt.style.left = t.x + 'px'; this.el.tgt.style.top = t.y + 'px';
    this.el.tgt.classList.toggle('edge', !!t.edge);
    this.el.tgt.querySelector('.d').style.transform = t.edge ? `rotate(${t.angle}rad)` : 'rotate(45deg)';
    this.el.tgtL.textContent = t.dist > 1000 ? fmt(t.dist / 1000, 1) + ' km' : fmt(t.dist) + ' m';
  }
}
