// Dźwięk proceduralny (WebAudio): łopotanie wirnika zależne od obrotów i obciążenia, silnik tłokowy/turbina,
// wiatr, alarm niskich obrotów, uderzenia, szum radia.
export class Audio {
  constructor() { this.ctx = null; this.vol = 0.8; this.on = false; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    let C;
    try { C = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    this.ctx = C;
    const master = this.master = C.createGain(); master.gain.value = this.vol; master.connect(C.destination);
    const comp = C.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.connect(master);
    this.out = C.createGain(); this.out.gain.value = 0; this.out.connect(comp);
    // szum
    const nb = C.createBuffer(1, C.sampleRate * 2, C.sampleRate), d = nb.getChannelData(0);
    let b0 = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = 0.97 * b0 + 0.03 * w; d[i] = w * 0.3 + b0 * 2; }
    this.noiseBuf = nb;
    const noise = () => { const s = C.createBufferSource(); s.buffer = nb; s.loop = true; s.start(); return s; };
    // łopotanie: impuls „łop” w buforze jednego obrotu łopaty, prędkość odtwarzania = częstotliwość przejść łopat
    const sr = C.sampleRate, L = Math.floor(sr / 20), wb = C.createBuffer(1, L, sr), wd = wb.getChannelData(0);
    for (let i = 0; i < L; i++) { const t = i / sr; wd[i] = Math.exp(-t * 90) * Math.sin(t * 2 * Math.PI * 70) * 0.9 + Math.exp(-t * 400) * (Math.random() * 2 - 1) * 0.6; }
    this.slap = C.createBufferSource(); this.slap.buffer = wb; this.slap.loop = true;
    this.slapGain = C.createGain(); this.slapGain.gain.value = 0;
    const slapLP = C.createBiquadFilter(); slapLP.type = 'lowpass'; slapLP.frequency.value = 900;
    this.slap.connect(slapLP).connect(this.slapGain).connect(this.out); this.slap.start();
    this.slapLP = slapLP;
    // szum wirnika (pasmo)
    this.rotN = noise(); this.rotBP = C.createBiquadFilter(); this.rotBP.type = 'bandpass'; this.rotBP.frequency.value = 400; this.rotBP.Q.value = 0.7;
    this.rotG = C.createGain(); this.rotG.gain.value = 0; this.rotN.connect(this.rotBP).connect(this.rotG).connect(this.out);
    // silnik
    this.eng = C.createOscillator(); this.eng.type = 'sawtooth'; this.eng.frequency.value = 90;
    this.eng2 = C.createOscillator(); this.eng2.type = 'square'; this.eng2.frequency.value = 45;
    this.engLP = C.createBiquadFilter(); this.engLP.type = 'lowpass'; this.engLP.frequency.value = 600;
    this.engG = C.createGain(); this.engG.gain.value = 0;
    this.eng.connect(this.engLP); this.eng2.connect(this.engLP); this.engLP.connect(this.engG).connect(this.out);
    this.eng.start(); this.eng2.start();
    // turbina
    this.turb = C.createOscillator(); this.turb.type = 'sine'; this.turb.frequency.value = 5200;
    this.turbG = C.createGain(); this.turbG.gain.value = 0; this.turb.connect(this.turbG).connect(this.out); this.turb.start();
    // wiatr
    this.wind = noise(); this.windHP = C.createBiquadFilter(); this.windHP.type = 'bandpass'; this.windHP.frequency.value = 800; this.windHP.Q.value = 0.4;
    this.windG = C.createGain(); this.windG.gain.value = 0; this.wind.connect(this.windHP).connect(this.windG).connect(this.out);
    // alarm niskich obrotów
    this.horn = C.createOscillator(); this.horn.type = 'square'; this.horn.frequency.value = 620;
    this.hornLP = C.createBiquadFilter(); this.hornLP.type = 'lowpass'; this.hornLP.frequency.value = 2000;
    this.hornG = C.createGain(); this.hornG.gain.value = 0; this.horn.connect(this.hornLP).connect(this.hornG).connect(this.master); this.horn.start();
    this.on = true;
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  // st: {rpm, blades, omega, load(0..1+), thrust ratio, ias, engine type, power frac, lowRpm, vrs, inside(cockpit), paused}
  update(st) {
    if (!this.ctx || !this.on) return;
    for (const k in st) if (typeof st[k] === 'number' && !isFinite(st[k])) st[k] = 0;
    const C = this.ctx, t = C.currentTime, k = 0.08;
    const run = st.paused ? 0 : 1;
    this.out.gain.setTargetAtTime(run * (st.inside ? 0.8 : 1), t, 0.1);
    const bpf = st.omega * st.rpm * st.blades / (2 * Math.PI);
    this.slap.playbackRate.setTargetAtTime(Math.max(0.01, bpf / 20), t, k);
    const slapAmt = Math.min(1.2, 0.25 + st.load * 0.55 + st.vrs * 0.8 + st.etl * 0.25) * Math.min(1, st.rpm * 1.4);
    this.slapGain.gain.setTargetAtTime(slapAmt * 0.5, t, k);
    this.slapLP.frequency.setTargetAtTime(500 + st.load * 900 + st.vrs * 600, t, k);
    this.rotG.gain.setTargetAtTime(0.12 * st.rpm, t, k);
    this.rotBP.frequency.setTargetAtTime(250 + st.rpm * 300, t, k);
    if (st.engine === 'piston') {
      this.eng.frequency.setTargetAtTime(40 + st.engRpm * 70 * (0.95 + st.power * 0.1), t, k);
      this.eng2.frequency.setTargetAtTime(20 + st.engRpm * 35, t, k);
      this.engG.gain.setTargetAtTime(st.engRun * (0.06 + st.power * 0.1), t, k);
      this.engLP.frequency.setTargetAtTime(300 + st.power * 900, t, k);
      this.turbG.gain.setTargetAtTime(0, t, k);
    } else {
      this.engG.gain.setTargetAtTime(st.engRun * 0.02, t, k);
      this.turb.frequency.setTargetAtTime(3000 + st.engRpm * 2800, t, 0.3);
      this.turbG.gain.setTargetAtTime(st.engRun * (0.015 + st.power * 0.02), t, k);
    }
    this.windG.gain.setTargetAtTime(Math.min(0.35, st.ias * st.ias * 0.00012) * (st.inside ? 0.5 : 1), t, k);
    this.windHP.frequency.setTargetAtTime(500 + st.ias * 25, t, k);
    const hornOn = st.lowRpm && !st.paused ? (Math.floor(t * 4) % 2 ? 0.12 : 0.02) : 0;
    this.hornG.gain.setTargetAtTime(hornOn, t, 0.01);
  }
  thump(v) { this.burst(0.25 + Math.min(1, v / 3), 120, 0.25); }
  crash() { this.burst(1.4, 300, 1.4); }
  radio() { this.burst(0.25, 2500, 0.25, 'bandpass'); }
  burst(gain, freq, dur, type = 'lowpass') {
    if (!this.ctx) return;
    const C = this.ctx, s = C.createBufferSource(); s.buffer = this.noiseBuf;
    const f = C.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = C.createGain(); g.gain.value = gain; g.gain.setTargetAtTime(0, C.currentTime + dur * 0.3, dur * 0.3);
    s.connect(f).connect(g).connect(this.master); s.start(); s.stop(C.currentTime + dur * 2);
  }
}
