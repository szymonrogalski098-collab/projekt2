// Tablica przyrządów kokpitu rysowana na płótnie (tekstura w 3D): prędkościomierz, horyzont, wysokościomierz,
// wariometr, obrotomierz (wirnik/silnik), moc, paliwo, temperatura, kompas.
const TAU = Math.PI * 2;

function dial(g, x, y, r, label) {
  const grd = g.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
  grd.addColorStop(0, '#1d2226'); grd.addColorStop(1, '#0b0d0f');
  g.fillStyle = '#2c3136'; g.beginPath(); g.arc(x, y, r + 6, 0, TAU); g.fill();
  g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.fillStyle = '#9aa3a8'; g.font = `600 ${Math.round(r * 0.15)}px system-ui`; g.textAlign = 'center'; g.fillText(label, x, y + r * 0.42);
}
function ticks(g, x, y, r, a0, a1, n, major, col = '#e8ecee') {
  g.strokeStyle = col;
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n, M = i % major === 0;
    g.lineWidth = M ? 3 : 1.5;
    g.beginPath(); g.moveTo(x + Math.cos(a) * r * (M ? 0.78 : 0.86), y + Math.sin(a) * r * (M ? 0.78 : 0.86)); g.lineTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95); g.stroke();
  }
}
function arc(g, x, y, r, a0, a1, col, w = 6) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(x, y, r * 0.9, a0, a1); g.stroke(); }
function needle(g, x, y, r, a, col = '#f4f6f7', w = 4, len = 0.8) {
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - Math.cos(a) * r * 0.12, y - Math.sin(a) * r * 0.12); g.lineTo(x + Math.cos(a) * r * len, y + Math.sin(a) * r * len); g.stroke();
  g.fillStyle = '#555'; g.beginPath(); g.arc(x, y, r * 0.07, 0, TAU); g.fill();
}
function nums(g, x, y, r, a0, a1, vals) {
  g.fillStyle = '#e8ecee'; g.font = `600 ${Math.round(r * 0.17)}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
  vals.forEach((v, i) => { const a = a0 + (a1 - a0) * i / (vals.length - 1); g.fillText(v, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62); });
  g.textBaseline = 'alphabetic';
}

export function drawPanel(canvas, h, att, units) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height, tel = h.tel;
  g.fillStyle = '#16191c'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#1e2226'; g.fillRect(8, 8, W - 16, H - 16);
  const r = 78, y1 = 100, y2 = 280;
  const xs = [110, 300, 490, 680, 880];
  // prędkościomierz (węzły)
  const kt = tel.ias * 1.94384;
  dial(g, xs[0], y1, r, 'KNOTS');
  const aS = -Math.PI * 0.75, aE = Math.PI * 1.1;
  ticks(g, xs[0], y1, r, aS, aE, 24, 4);
  arc(g, xs[0], y1, r, aS + (aE - aS) * (55 / 120), aS + (aE - aS) * (h.spec.vne * 1.94 / 120) * 0.97, '#39b54a');
  nums(g, xs[0], y1, r, aS, aE, ['0', '20', '40', '60', '80', '100', '120']);
  needle(g, xs[0], y1, r, aS + (aE - aS) * Math.min(1, kt / 120));
  // sztuczny horyzont
  {
    const x = xs[1], y = y1;
    g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
    g.translate(x, y); g.rotate(-att.roll);
    const off = att.pitch * 180 / Math.PI * 3.2;
    g.fillStyle = '#2f79c2'; g.fillRect(-r * 2, -r * 3 + off, r * 4, r * 3);
    g.fillStyle = '#7a4b25'; g.fillRect(-r * 2, off, r * 4, r * 3);
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-r * 2, off); g.lineTo(r * 2, off); g.stroke();
    for (const p of [-20, -10, 10, 20]) { const yy = off - p * 3.2; g.beginPath(); g.moveTo(-18 - Math.abs(p) * 0.6, yy); g.lineTo(18 + Math.abs(p) * 0.6, yy); g.stroke(); }
    g.restore();
    g.strokeStyle = '#ffcf4a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 40, y); g.lineTo(x - 12, y); g.lineTo(x, y + 8); g.lineTo(x + 12, y); g.lineTo(x + 40, y); g.stroke();
    g.strokeStyle = '#2c3136'; g.lineWidth = 8; g.beginPath(); g.arc(x, y, r + 2, 0, TAU); g.stroke();
  }
  // wysokościomierz (stopy)
  const ft = h.pos.y * 3.28084;
  dial(g, xs[2], y1, r, 'ALT ft');
  ticks(g, xs[2], y1, r, -Math.PI / 2, Math.PI * 1.5, 50, 5);
  nums(g, xs[2], y1, r, -Math.PI / 2, Math.PI * 1.5 - TAU / 10, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  needle(g, xs[2], y1, r, -Math.PI / 2 + (ft % 1000) / 1000 * TAU);
  needle(g, xs[2], y1, r, -Math.PI / 2 + (ft % 10000) / 10000 * TAU, '#cfd6da', 6, 0.5);
  g.fillStyle = '#e8ecee'; g.font = '600 15px system-ui'; g.textAlign = 'center'; g.fillText(Math.round(ft).toString(), xs[2], y1 - 22);
  // wariometr (ft/min)
  const fpm = tel.vs * 196.85;
  dial(g, xs[3], y1, r, 'VS ×100');
  ticks(g, xs[3], y1, r, Math.PI * 0.25 - Math.PI, Math.PI * 0.75, 20, 5);
  nums(g, xs[3], y1, r, -Math.PI * 0.75, Math.PI * 0.75, ['-20', '-10', '0', '10', '20']);
  needle(g, xs[3], y1, r, Math.PI + Math.max(-1, Math.min(1, fpm / 2000)) * Math.PI * 0.75 - Math.PI);
  // obrotomierz podwójny (wirnik/silnik)
  dial(g, xs[4], y1, r, 'RPM %');
  const rA = -Math.PI * 0.9, rB = Math.PI * 0.1;
  ticks(g, xs[4], y1, r, rA, rB, 12, 2);
  arc(g, xs[4], y1, r, rA + (rB - rA) * (0.95 - 0.5) / 0.7, rA + (rB - rA) * (1.04 - 0.5) / 0.7, '#39b54a');
  arc(g, xs[4], y1, r, rA, rA + (rB - rA) * (0.9 - 0.5) / 0.7, '#d23a2f');
  const rp = x => rA + (rB - rA) * Math.max(0, Math.min(1, (x - 0.5) / 0.7));
  needle(g, xs[4], y1, r, rp(h.rpm), '#f4f6f7', 4);
  needle(g, xs[4], y1, r, rp(h.engineOn && !h.engineFailed && h.fuel > 0 ? Math.max(h.rpm, 0.6) : h.rpm * 0.2), '#ffcf4a', 3, 0.7);
  // dolny rząd: moc, paliwo, temperatura, kompas
  const small = 58;
  const bar = (x, y, label, v, max, col, text) => {
    dial(g, x, y, small, label);
    const a0 = -Math.PI * 0.8, a1 = -Math.PI * 0.2;
    ticks(g, x, y, small, a0, a1, 10, 5);
    needle(g, x, y, small, a0 + (a1 - a0) * Math.max(0, Math.min(1, v / max)), col, 3);
    g.fillStyle = '#e8ecee'; g.font = '600 15px system-ui'; g.textAlign = 'center'; g.fillText(text, x, y + 22);
  };
  bar(170, y2, h.spec.engine.type === 'piston' ? 'MOC' : 'MOMENT', tel.torque * 100, 110, tel.Peng > tel.Pav * 0.98 ? '#ffb23e' : '#f4f6f7', `${Math.round(tel.torque * 100)}%`);
  bar(330, y2, 'PALIWO kg', h.fuel, h.spec.fuel.cap, h.fuel < 8 ? '#ff4b3e' : '#f4f6f7', `${Math.round(h.fuel)}`);
  bar(490, y2, 'TEMP', h.engineTemp * 100, 110, h.engineTemp > 0.9 ? '#ff4b3e' : '#f4f6f7', `${Math.round(h.engineTemp * 100)}`);
  // kompas (taśma)
  {
    const x = 720, y = y2, w = 250, hh = 46;
    g.fillStyle = '#0b0d0f'; g.fillRect(x - w / 2, y - hh / 2, w, hh);
    const hd = ((att.heading * 180 / Math.PI) + 360) % 360;
    g.save(); g.beginPath(); g.rect(x - w / 2, y - hh / 2, w, hh); g.clip();
    g.fillStyle = '#e8ecee'; g.strokeStyle = '#e8ecee'; g.font = '600 16px system-ui'; g.textAlign = 'center';
    for (let d = Math.floor(hd / 10) * 10 - 60; d <= hd + 60; d += 10) {
      const px = x + (d - hd) * 2.4, dd = (d + 360) % 360;
      g.lineWidth = 2; g.beginPath(); g.moveTo(px, y + hh / 2); g.lineTo(px, y + hh / 2 - (dd % 30 === 0 ? 14 : 8)); g.stroke();
      if (dd % 30 === 0) g.fillText({ 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[dd] ?? String(dd / 10), px, y);
    }
    g.restore();
    g.fillStyle = '#ffcf4a'; g.beginPath(); g.moveTo(x, y + hh / 2 - 2); g.lineTo(x - 7, y + hh / 2 + 10); g.lineTo(x + 7, y + hh / 2 + 10); g.fill();
  }
  // lampki ostrzegawcze
  const lamp = (x, y, txt, on, col) => { g.fillStyle = on ? col : '#2a2e32'; g.fillRect(x, y, 96, 28); g.fillStyle = on ? '#111' : '#555'; g.font = '700 13px system-ui'; g.textAlign = 'center'; g.fillText(txt, x + 48, y + 19); };
  lamp(880, y2 - 50, 'LOW RPM', h.rpm < h.spec.rpm.low, '#ff4b3e');
  lamp(880, y2 - 14, 'FUEL', h.fuel < 6, '#ffb23e');
  lamp(880, y2 + 22, 'ENGINE', h.engineFailed || h.fuel <= 0, '#ff4b3e');
}
