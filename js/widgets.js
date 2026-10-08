/* MLingo widgets: interactive plots, diagrams, content block renderer */
(function () {
  'use strict';
  const ML = window.ML;
  const { h, fmt, esc } = ML;

  /* ---------- tiny syntax highlighter ---------- */
  const KW = 'function|const|let|var|return|for|while|if|else|new|class|def|import|from|in|range|True|False|None|public|static|double|int|float|void|foreach|using|string|bool|List|Math|math|np|true|false|null|self|print|Console|WriteLine|Length|len|lambda|and|or|not';
  const HL = new RegExp('(\\/\\/.*|#.*)|("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\')|\\b(\\d+\\.?\\d*(?:e-?\\d+)?)\\b|\\b(' + KW + ')\\b', 'g');
  ML.highlight = function (code) {
    let out = '', last = 0, m;
    HL.lastIndex = 0;
    while ((m = HL.exec(code))) {
      out += esc(code.slice(last, m.index));
      const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : 'k';
      out += `<span class="tk-${cls}">${esc(m[0])}</span>`;
      last = m.index + m[0].length;
    }
    return out + esc(code.slice(last));
  };

  /* ---------- interactive plot ---------- */
  let plotId = 0;
  const NICE = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100];
  const niceStep = (range) => NICE.find((s) => range / s <= 8) || 100;
  const COLORS = ['var(--accent)', 'var(--pink)', 'var(--teal)', 'var(--amber)'];

  ML.plot = function (cfg) {
    const id = 'pl' + ++plotId;
    const p = {};
    (cfg.params || []).forEach((q) => (p[q.n] = q.v));
    const pts = cfg.points || [];
    const W = 560, H = cfg.h || 300, L = 40, R = 14, T = 14, B = 30;
    const [x0, x1] = cfg.xr, [y0, y1] = cfg.yr;
    const sx = (x) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
    const sy = (y) => H - B - ((y - y0) / (y1 - y0)) * (H - T - B);
    const fns = (cfg.fns || []).map((f, i) => Object.assign({ c: COLORS[i % 4] }, f, { fn: new Function('x', 'p', 'pts', 'return (' + f.f + ');') }));
    const trail = cfg.trail ? new Function('p', 'pts', 'return (' + cfg.trail + ');') : null;
    const arrows = (cfg.arrows || []).map((a, i) => Object.assign({ c: COLORS[i % 4] }, a, { fn: new Function('p', 'return (' + a.to + ');') }));
    const reads = (cfg.readout || []).map((r) => Object.assign({}, r, { fn: new Function('p', 'pts', 'return (' + r.f + ');') }));

    const host = h('div', { class: 'plot-svg' });
    const readEl = h('div', { class: 'readout' });
    const ctrl = h('div', { class: 'sliders' });
    const legend = fns.some((f) => f.label)
      ? h('div', { class: 'legend' }, fns.filter((f) => f.label).map((f) => h('span', {}, h('i', { style: 'background:' + f.c }), f.label)))
      : null;

    const valEls = {};
    (cfg.params || []).forEach((q) => {
      const val = h('output', {}, String(q.v));
      valEls[q.n] = val;
      const inp = h('input', { type: 'range', min: q.min, max: q.max, step: q.step || 0.1, value: q.v, 'aria-label': q.label || q.n });
      inp.addEventListener('input', () => { p[q.n] = +inp.value; val.textContent = (+inp.value).toFixed(q.digits == null ? 2 : q.digits).replace(/\.?0+$/, '') || '0'; draw(); });
      ctrl.append(h('label', {}, h('span', { class: 'sl-name' }, q.label || q.n), inp, val));
    });

    function draw() {
      const xs = niceStep(x1 - x0), ys = niceStep(y1 - y0);
      let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(cfg.title || 'plot')}"><defs><clipPath id="${id}"><rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"/></clipPath></defs>`;
      for (let x = Math.ceil(x0 / xs) * xs; x <= x1 + 1e-9; x += xs) {
        const X = sx(x);
        s += `<line class="gl" x1="${X}" y1="${T}" x2="${X}" y2="${H - B}"/><text class="tl" x="${X}" y="${H - B + 16}" text-anchor="middle">${+x.toFixed(4)}</text>`;
      }
      for (let y = Math.ceil(y0 / ys) * ys; y <= y1 + 1e-9; y += ys) {
        const Y = sy(y);
        s += `<line class="gl" x1="${L}" y1="${Y}" x2="${W - R}" y2="${Y}"/><text class="tl" x="${L - 6}" y="${Y + 4}" text-anchor="end">${+y.toFixed(4)}</text>`;
      }
      if (x0 < 0 && x1 > 0) s += `<line class="ax" x1="${sx(0)}" y1="${T}" x2="${sx(0)}" y2="${H - B}"/>`;
      if (y0 < 0 && y1 > 0) s += `<line class="ax" x1="${L}" y1="${sy(0)}" x2="${W - R}" y2="${sy(0)}"/>`;
      s += `<g clip-path="url(#${id})">`;
      fns.forEach((f) => {
        let d = '', pen = false;
        for (let i = 0; i <= 240; i++) {
          const x = x0 + ((x1 - x0) * i) / 240;
          let y; try { y = f.fn(x, p, pts); } catch (e) { y = NaN; }
          if (!isFinite(y)) { pen = false; continue; }
          d += (pen ? 'L' : 'M') + sx(x).toFixed(1) + ' ' + sy(y).toFixed(1);
          pen = true;
        }
        s += `<path d="${d}" fill="none" stroke="${f.c}" stroke-width="3" stroke-linecap="round" ${f.dash ? 'stroke-dasharray="6 6"' : ''}/>`;
      });
      if (cfg.residuals && fns[0]) {
        pts.forEach(([x, y]) => { const yy = fns[0].fn(x, p, pts); s += `<line x1="${sx(x)}" y1="${sy(y)}" x2="${sx(x)}" y2="${sy(yy)}" stroke="var(--wrong)" stroke-width="2" stroke-dasharray="3 3"/>`; });
      }
      pts.forEach(([x, y, c]) => { s += `<circle cx="${sx(x)}" cy="${sy(y)}" r="5" fill="${c === 1 ? 'var(--pink)' : c === 0 ? 'var(--accent)' : 'var(--ink)'}" stroke="var(--surface)" stroke-width="2"/>`; });
      if (trail) {
        let t = []; try { t = trail(p, pts); } catch (e) {}
        s += `<polyline points="${t.map(([x, y]) => sx(x).toFixed(1) + ',' + sy(y).toFixed(1)).join(' ')}" fill="none" stroke="var(--pink)" stroke-width="2" stroke-dasharray="4 4"/>`;
        t.forEach(([x, y], i) => { s += `<circle cx="${sx(x)}" cy="${sy(y)}" r="${i === t.length - 1 ? 7 : 4}" fill="${i === t.length - 1 ? 'var(--pink)' : 'var(--surface)'}" stroke="var(--pink)" stroke-width="2"/>`; });
      }
      arrows.forEach((a) => {
        const [tx, ty] = a.fn(p), X = sx(tx), Y = sy(ty), O = [sx(0), sy(0)];
        const ang = Math.atan2(Y - O[1], X - O[0]), hl = 12;
        s += `<line x1="${O[0]}" y1="${O[1]}" x2="${X}" y2="${Y}" stroke="${a.c}" stroke-width="3.5" stroke-linecap="round"/>`;
        s += `<path d="M${X} ${Y} L${X - hl * Math.cos(ang - 0.45)} ${Y - hl * Math.sin(ang - 0.45)} L${X - hl * Math.cos(ang + 0.45)} ${Y - hl * Math.sin(ang + 0.45)}z" fill="${a.c}"/>`;
        if (a.label) s += `<text class="al" x="${X + 8}" y="${Y - 8}" fill="${a.c}">${esc(a.label)}</text>`;
      });
      s += '</g></svg>';
      host.innerHTML = s;
      readEl.innerHTML = '';
      reads.forEach((r) => {
        let v; try { v = r.fn(p, pts); } catch (e) { v = NaN; }
        readEl.append(h('span', { class: 'rd' }, h('em', {}, r.label), h('b', {}, typeof v === 'number' ? (+v.toFixed(r.digits == null ? 3 : r.digits)).toString() : String(v))));
      });
    }
    draw();
    return h('figure', { class: 'plot' }, cfg.title ? h('figcaption', {}, cfg.title) : null, host, legend, readEl.childNodes.length || reads.length ? readEl : null, ctrl.childNodes.length ? ctrl : null, cfg.caption ? h('p', { class: 'cap', html: fmt(cfg.caption) }) : null);
  };

  /* ---------- diagrams ---------- */
  const box = (x, y, w, hh, t1, t2, cls) =>
    `<rect class="dg-box ${cls || ''}" x="${x}" y="${y}" width="${w}" height="${hh}" rx="14"/><text class="dg-t" x="${x + w / 2}" y="${y + hh / 2 + (t2 ? -3 : 5)}" text-anchor="middle">${t1}</text>${t2 ? `<text class="dg-s" x="${x + w / 2}" y="${y + hh / 2 + 15}" text-anchor="middle">${t2}</text>` : ''}`;
  const arrow = (x1, y1, x2, y2) => {
    const a = Math.atan2(y2 - y1, x2 - x1);
    return `<line class="dg-l" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><path class="dg-h" d="M${x2} ${y2} L${x2 - 9 * Math.cos(a - 0.5)} ${y2 - 9 * Math.sin(a - 0.5)} L${x2 - 9 * Math.cos(a + 0.5)} ${y2 - 9 * Math.sin(a + 0.5)}z"/>`;
  };
  const DIAGRAMS = {
    loop: () => `<svg viewBox="0 0 520 250">${box(20, 20, 200, 64, '1. Predict', 'run inputs through the model')}${box(300, 20, 200, 64, '2. Measure error', 'compare with the true label', 'hl')}${box(300, 160, 200, 64, '3. Find direction', 'gradient of the loss')}${box(20, 160, 200, 64, '4. Update weights', 'small step downhill')}${arrow(220, 52, 298, 52)}${arrow(400, 84, 400, 158)}${arrow(300, 192, 222, 192)}${arrow(120, 160, 120, 86)}</svg>`,
    neuron: () => `<svg viewBox="0 0 520 250">${[0, 1, 2].map((i) => `<circle class="dg-n" cx="50" cy="${55 + i * 70}" r="20"/><text class="dg-t" x="50" y="${60 + i * 70}" text-anchor="middle">x${i + 1}</text>${arrow(72, 55 + i * 70, 196, 125 + (i - 1) * 8)}<text class="dg-s" x="${128}" y="${72 + i * 38 - 4 * i}" >w${i + 1}</text>`).join('')}<circle class="dg-n hl" cx="225" cy="125" r="32"/><text class="dg-t" x="225" y="121" text-anchor="middle">Σ + b</text><text class="dg-s" x="225" y="139" text-anchor="middle">z</text>${arrow(258, 125, 318, 125)}${box(320, 95, 80, 60, 'f(z)', 'activation')}${arrow(402, 125, 452, 125)}<circle class="dg-n" cx="475" cy="125" r="20"/><text class="dg-t" x="475" y="130" text-anchor="middle">y</text></svg>`,
    network: () => {
      const L = [3, 4, 4, 2], xs = [60, 190, 330, 460];
      const ys = (n, i) => 125 + (i - (n - 1) / 2) * 52;
      let s = '<svg viewBox="0 0 520 250">';
      for (let l = 0; l < L.length - 1; l++) for (let i = 0; i < L[l]; i++) for (let j = 0; j < L[l + 1]; j++) s += `<line class="dg-w" x1="${xs[l]}" y1="${ys(L[l], i)}" x2="${xs[l + 1]}" y2="${ys(L[l + 1], j)}"/>`;
      L.forEach((n, l) => { for (let i = 0; i < n; i++) s += `<circle class="dg-n ${l === 0 ? '' : l === L.length - 1 ? 'hl' : 'mid'}" cx="${xs[l]}" cy="${ys(n, i)}" r="15"/>`; });
      s += ['input', 'hidden 1', 'hidden 2', 'output'].map((t, l) => `<text class="dg-s" x="${xs[l]}" y="244" text-anchor="middle">${t}</text>`).join('');
      return s + '</svg>';
    },
    split: () => `<svg viewBox="0 0 520 130"><rect class="dg-box" x="20" y="30" width="350" height="56" rx="12" style="fill:var(--accent-soft)"/><rect class="dg-box" x="374" y="30" width="62" height="56" rx="12" style="fill:var(--amber-soft)"/><rect class="dg-box" x="440" y="30" width="62" height="56" rx="12" style="fill:var(--pink-soft)"/><text class="dg-t" x="195" y="63" text-anchor="middle">Train 70%</text><text class="dg-t" x="405" y="63" text-anchor="middle">15%</text><text class="dg-t" x="471" y="63" text-anchor="middle">15%</text><text class="dg-s" x="195" y="108" text-anchor="middle">the model learns here</text><text class="dg-s" x="405" y="108" text-anchor="middle">validation</text><text class="dg-s" x="471" y="108" text-anchor="middle">test</text></svg>`,
    attention: () => `<svg viewBox="0 0 520 250">${box(20, 20, 130, 52, 'Query', 'what am I looking for?')}${box(20, 100, 130, 52, 'Keys', 'what does each word offer?')}${box(20, 180, 130, 52, 'Values', 'the content to pass on')}${arrow(150, 46, 220, 100)}${arrow(150, 126, 218, 112)}${box(222, 80, 120, 64, 'q · k', 'scores', 'hl')}${arrow(342, 112, 372, 112)}${box(374, 80, 126, 64, 'softmax', 'weights sum to 1')}${arrow(437, 144, 437, 176)}${box(374, 178, 126, 56, 'weights × V', 'weighted mix')}${arrow(150, 206, 372, 206)}</svg>`,
  };
  ML.diagram = (name, caption) => h('figure', { class: 'diagram' }, h('div', { html: (DIAGRAMS[name] || DIAGRAMS.loop)() }), caption ? h('p', { class: 'cap', html: fmt(caption) }) : null);

  /* ---------- block renderer ---------- */
  function codeBlock(lang, code) {
    const names = { cs: 'C#', py: 'Python', js: 'JavaScript' };
    return h('div', { class: 'codeblk' }, h('div', { class: 'cb-lang' }, names[lang] || lang), h('pre', { html: ML.highlight(code) }));
  }
  function block(b) {
    switch (b.k) {
      case 'p': return h('p', { class: 'blk-p', html: fmt(b.t) });
      case 'h': return h('h3', { class: 'blk-h' }, b.t);
      case 'list': return h('ul', { class: 'blk-list' }, b.items.map((t) => h('li', { html: fmt(t) })));
      case 'steps': return h('ol', { class: 'blk-steps' }, b.items.map(([t, d]) => h('li', {}, h('b', { html: fmt(t) }), h('span', { html: fmt(d) }))));
      case 'formula':
        return h('div', { class: 'formula' }, h('div', { class: 'f-main' }, [].concat(b.tex).map((t) => h('div', { class: 'math', html: ML.mathHTML(t) }))),
          b.legend ? h('dl', {}, b.legend.map(([s, m]) => [h('dt', { class: 'math', html: ML.mathHTML(s) }), h('dd', { html: fmt(m) })])) : null);
      case 'code': return codeBlock(b.lang, b.code);
      case 'cmp': return h('div', { class: 'cmp' }, codeBlock('cs', b.cs), codeBlock('py', b.py));
      case 'note': return h('div', { class: 'note ' + (b.tone || 'tip') }, h('span', { class: 'note-t' }, { tip: 'Intuition', warn: 'Watch out', cs: 'Coming from C#', info: 'Note' }[b.tone || 'tip']), h('span', { html: fmt(b.t) }));
      case 'table': return h('div', { class: 'tblw' }, h('table', {}, h('thead', {}, h('tr', {}, b.head.map((c) => h('th', { html: fmt(c) })))), h('tbody', {}, b.rows.map((r) => h('tr', {}, r.map((c) => h('td', { html: fmt(String(c)) })))))));
      case 'plot': return ML.plot(b);
      case 'diagram': return ML.diagram(b.name, b.caption);
      default: return h('div');
    }
  }
  ML.renderBlocks = (blocks) => { const f = document.createDocumentFragment(); blocks.forEach((b) => f.append(block(b))); return f; };

  /* ---------- content authoring helpers ---------- */
  ML.d = {
    p: (t) => ({ k: 'p', t }),
    h: (t) => ({ k: 'h', t }),
    list: (...items) => ({ k: 'list', items }),
    steps: (...items) => ({ k: 'steps', items }),
    formula: (tex, legend) => ({ k: 'formula', tex, legend }),
    note: (tone, t) => ({ k: 'note', tone, t }),
    code: (lang, code) => ({ k: 'code', lang, code }),
    cmp: (cs, py) => ({ k: 'cmp', cs, py }),
    table: (head, rows) => ({ k: 'table', head, rows }),
    plot: (cfg) => Object.assign({ k: 'plot' }, cfg),
    diagram: (name, caption) => ({ k: 'diagram', name, caption }),
    page: (title, ...blocks) => ({ title, blocks }),
    mc: (q, options, answer, why, extra) => Object.assign({ type: 'mc', q, options, answer, why }, extra),
    multi: (q, options, answer, why) => ({ type: 'multi', q, options, answer, why }),
    order: (q, items, why) => ({ type: 'order', q, items, why }),
    match: (q, pairs, why) => ({ type: 'match', q, pairs, why }),
    num: (q, given, ans, steps, extra) => Object.assign({ type: 'num', q, given, ans, steps }, extra),
  };
})();
