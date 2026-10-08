/* MLingo core: helpers, icons, math renderer, store, code runner */
(function () {
  'use strict';
  const ML = (window.ML = window.ML || {});
  ML.units = ML.units || [];

  /* ---------- DOM helper ---------- */
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      e.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return e;
  }
  ML.h = h;
  ML.$ = (s, r = document) => r.querySelector(s);
  ML.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const esc = ML.esc;

  /* ---------- Icons (stroke, 24x24) ---------- */
  const I = {
    flame: '<path d="M12 3c.6 3.6 4.6 5.4 4.6 10a4.6 4.6 0 0 1-9.2 0c0-1.8.8-3 1.8-4 .2 1.6 1 2.4 2 2.6C10.9 9 10.5 6 12 3z"/>',
    coin: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/>',
    bolt: '<path d="M13 2.5 5.5 13.5H11L10 21.5l7.5-11H12z"/>',
    learn: '<circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="9" r="2.4"/><circle cx="8" cy="18" r="2.4"/><path d="M8 7l8 1.2M7.4 8.2 7.9 15.6M16.6 11l-6.5 5.6"/>',
    shop: '<path d="M5 8h14l-1 12H6zM9 8V6.5a3 3 0 0 1 6 0V8"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.7.6 1 1.3 1 2.1h5c0-.8.3-1.5 1-2.1A6 6 0 0 0 12 3z"/>',
    code: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
    book: '<path d="M4 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4zM20 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"/>',
    pencil: '<path d="M4 20l1-5L16 4l4 4L9 19zM14 6l4 4"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    reset: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    /* lesson icons */
    nodes: '<circle cx="5" cy="12" r="2.4"/><circle cx="19" cy="6" r="2.4"/><circle cx="19" cy="18" r="2.4"/><path d="M7.2 11l9.6-4M7.2 13l9.6 4"/>',
    chart: '<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>',
    vector: '<path d="M5 19 19 5M19 5h-7M19 5v7"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    slope: '<path d="M3 19c4 0 6-12 9-12s5 12 9 12M6 15l12-6"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 8.5h.01M15.5 15.5h.01M12 12h.01M15.5 8.5h.01M8.5 15.5h.01"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    down: '<path d="M3 5c3 0 5 14 9 14s6-14 9-14"/><path d="M12 19v-0.01"/>',
    sigma: '<path d="M18 5H6l6 7-6 7h12"/>',
    neuron: '<circle cx="12" cy="12" r="4"/><path d="M3 6l5 4M3 18l5-4M16 12h5M12 3v5M12 16v5"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>',
    backprop: '<path d="M20 12H5M10 7l-5 5 5 5M20 6v12"/>',
    shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.500 7-4.500 7-9V6z"/>',
    embed: '<circle cx="6" cy="17" r="1.800"/><circle cx="10" cy="13" r="1.800"/><circle cx="17" cy="7" r="1.800"/><circle cx="15" cy="16" r="1.800"/><circle cx="7" cy="7" r="1.800"/>',
    focus: '<circle cx="12" cy="12" r="3"/><path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    bag: '<path d="M5 8h14l-1 12H6zM9 8V6.500a3 3 0 0 1 6 0V8"/>',
    moon: '<path d="M20 14.500A8 8 0 0 1 9.500 4a8 8 0 1 0 10.500 10.500z"/>',
  };
  ML.icon = function (name, cls, fill) {
    return `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || I.nodes}</svg>`;
  };
  ML.ic = (name, cls, fill) => h('span', { class: 'icw', html: ML.icon(name, cls, fill) });

  /* Mascot "Neo": a node with eyes */
  ML.mascot = function (mood = 'happy', size = 96) {
    const mouth = {
      happy: '<path d="M38 60q12 11 24 0" />',
      wow: '<ellipse cx="50" cy="63" rx="5" ry="6" fill="#16203a" stroke="none"/>',
      sad: '<path d="M38 66q12-10 24 0" />',
    }[mood];
    return `<svg class="mascot" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
      <g stroke="var(--ink)" stroke-width="3" stroke-linecap="round" fill="none">
        <path d="M50 18V8" /><circle cx="50" cy="6" r="4" fill="var(--amber)" />
      </g>
      <circle cx="50" cy="54" r="38" fill="var(--accent)"/>
      <circle cx="50" cy="54" r="38" fill="none" stroke="var(--accent-d)" stroke-width="4"/>
      <circle cx="36" cy="46" r="8" fill="#fff"/><circle cx="64" cy="46" r="8" fill="#fff"/>
      <circle cx="38" cy="47" r="4" fill="#16203a"/><circle cx="62" cy="47" r="4" fill="#16203a"/>
      <g stroke="#16203a" stroke-width="3.500" stroke-linecap="round" fill="none">${mouth}</g>
    </svg>`;
  };

  /* ---------- Math / text formatting ---------- */
  function mathHTML(s) {
    let i = 0;
    function arg() {
      if (s[i] !== '{') return s[i++] || '';
      let d = 0;
      const st = i + 1;
      for (; i < s.length; i++) {
        if (s[i] === '{') d++;
        else if (s[i] === '}') {
          d--;
          if (d === 0) { i++; return s.slice(st, i - 1); }
        }
      }
      return s.slice(st);
    }
    let out = '';
    while (i < s.length) {
      const c = s[i];
      if (c === '\\' || c === '@') {
        const m = /^[\\@]([a-zA-Z]+)/.exec(s.slice(i));
        if (m) {
          i += m[0].length;
          const cmd = m[1];
          if (cmd === 'f') { const a = arg(), b = arg(); out += `<span class="frac"><span>${mathHTML(a)}</span><span>${mathHTML(b)}</span></span>`; continue; }
          if (cmd === 'sqrt') { const a = arg(); out += `<span class="rad">&radic;<span class="radx">${mathHTML(a)}</span></span>`; continue; }
          if (cmd === 'bar') { const a = arg(); out += `<span class="bar">${mathHTML(a)}</span>`; continue; }
          if (cmd === 'hat') { const a = arg(); out += `<span class="hat">${mathHTML(a)}</span>`; continue; }
          const map = { sum: '∑', cdot: '·', times: '×', approx: '≈', le: '≤', ge: '≥', ne: '≠', pm: '±', partial: '∂', nabla: '∇', infty: '∞', to: '→', in: '∈', quad: ' ', theta: 'θ', sigma: 'σ', alpha: 'α', lambda: 'λ', mu: 'μ', eta: 'η', epsilon: 'ε', pi: 'π', Delta: 'Δ', delta: 'δ', beta: 'β' };
          out += map[cmd] || esc(m[0]);
          continue;
        }
      }
      if (c === '^' || c === '_') {
        i++;
        const a = arg();
        const t = c === '^' ? 'sup' : 'sub';
        out += `<${t}>${mathHTML(a)}</${t}>`;
        continue;
      }
      out += esc(c);
      i++;
    }
    return out;
  }
  ML.mathHTML = mathHTML;
  ML.math = (tex) => h('span', { class: 'math', html: mathHTML(tex) });

  /* inline formatting: $math$, `code`, **bold**, loose @commands and x^2 powers in plain text */
  const CMD = /(@[a-zA-Z]+(?:\{[^{}]*\})*(?:[_^](?:\{[^{}]*\}|[a-zA-Z0-9]))*)/;
  const supify = (s) => s.replace(/\^\(([^()]*)\)/g, '<sup>$1</sup>').replace(/\^(-?\d+(?:\.\d+)?|[a-zA-Z])(?![a-zA-Z])/g, '<sup>$1</sup>');
  const plain = (p) => p.split(CMD).map((q, i) => (i % 2 ? `<span class="math">${mathHTML(q)}</span>` : supify(esc(q)))).join('');
  ML.fmt = function (text) {
    return String(text)
      .split(/(\$[^$]+\$|`[^`]+`|\*\*[^*]+\*\*)/)
      .map((p) => {
        if (!p) return '';
        if (p[0] === '$' && p.length > 2) return `<span class="math">${mathHTML(p.slice(1, -1))}</span>`;
        if (p[0] === '`' && p.length > 2) return `<code>${esc(p.slice(1, -1))}</code>`;
        if (p.startsWith('**') && p.length > 4) return `<b>${plain(p.slice(2, -2))}</b>`;
        return plain(p);
      })
      .join('');
  };

  /* ---------- Store ---------- */
  const KEY = 'mlingo.v1';
  const defaults = () => ({
    coins: 20, xp: 0, streak: 0, best: 0, last: null, days: {}, freezes: 0, hints: 2,
    done: {}, session: null, owned: ['default'],
    settings: { theme: 'auto', accent: 'default', sound: false, unlockAll: false, goal: 40, coding: true, codeLang: 'js' },
  });
  let S = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      S = Object.assign(defaults(), p, { settings: Object.assign(defaults().settings, p.settings || {}) });
    }
  } catch (e) { /* storage blocked: run in memory */ }
  const listeners = [];
  const store = (ML.store = {
    get s() { return S; },
    save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} listeners.forEach((f) => f()); },
    on(f) { listeners.push(f); },
    replace(obj) { S = Object.assign(defaults(), obj, { settings: Object.assign(defaults().settings, obj.settings || {}) }); store.save(); },
    reset() { S = defaults(); store.save(); },
    today() { return dayKey(new Date()); },
    effStreak() {
      if (!S.last) return 0;
      const gap = dayDiff(S.last, store.today());
      return gap <= 1 ? S.streak : (gap - 1 <= S.freezes ? S.streak : 0);
    },
    xpToday() { return S.days[store.today()] || 0; },
    addXp(n) {
      const t = store.today();
      if (S.last !== t) {
        const gap = S.last ? dayDiff(S.last, t) : 99;
        if (gap === 1) S.streak += 1;
        else if (gap > 1 && gap - 1 <= S.freezes) { S.freezes -= gap - 1; S.streak += 1; }
        else S.streak = 1;
        S.last = t;
        S.best = Math.max(S.best, S.streak);
      }
      S.xp += n;
      S.days[t] = (S.days[t] || 0) + n;
    },
    addCoins(n) { S.coins += n; },
  });
  function dayKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dayDiff(a, b) {
    const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
    return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 864e5);
  }
  ML.dayKey = dayKey;

  /* ---------- Sound ---------- */
  let actx;
  ML.beep = function (kind) {
    if (!S.settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const seq = kind === 'ok' ? [[660, 0], [880, 0.09]] : kind === 'bad' ? [[220, 0], [165, 0.1]] : [[523, 0], [659, 0.08], [784, 0.16]];
      seq.forEach(([f, t]) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, actx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.12, actx.currentTime + t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + t + 0.16);
        o.connect(g).connect(actx.destination);
        o.start(actx.currentTime + t); o.stop(actx.currentTime + t + 0.18);
      });
    } catch (e) {}
  };

  /* ---------- Toast ---------- */
  ML.toast = function (msg) {
    const t = h('div', { class: 'toast', role: 'status' }, msg);
    document.body.append(t);
    setTimeout(() => t.classList.add('out'), 2200);
    setTimeout(() => t.remove(), 2700);
  };

  /* ---------- Code runner (shared by Worker, fallback, and Node validation) ---------- */
  ML.runnerSrc = `
function __eq(a, b, tol) {
  if (typeof b === 'number') return typeof a === 'number' && (a === b || Math.abs(a - b) <= tol || (isNaN(a) && isNaN(b)));
  if (Array.isArray(b)) return Array.isArray(a) && a.length === b.length && b.every((x, i) => __eq(a[i], x, tol));
  return JSON.stringify(a) === JSON.stringify(b);
}
function __runAll(code, fn, tests) {
  const logs = [];
  const con = { log: function () { logs.push(Array.prototype.map.call(arguments, function (x) { return typeof x === 'object' ? JSON.stringify(x) : String(x); }).join(' ')); } };
  let f;
  try { f = new Function('console', code + '\\n;return typeof ' + fn + ' === "function" ? ' + fn + ' : undefined;')(con); }
  catch (err) { return { error: String(err) }; }
  if (!f) return { error: 'Function "' + fn + '" was not found. Keep its name unchanged.' };
  const results = tests.map(function (t) {
    try {
      const got = f.apply(null, JSON.parse(JSON.stringify(t.args)));
      return { ok: __eq(got, t.expect, t.tol == null ? 0.001 : t.tol), got: got };
    } catch (err) { return { ok: false, err: String(err) }; }
  });
  return { results: results, logs: logs };
}
`;
  let workerURL;
  ML.runCode = function (code, fn, tests, timeout = 3000) {
    return new Promise((resolve) => {
      let w;
      try {
        workerURL = workerURL || URL.createObjectURL(new Blob([ML.runnerSrc + 'onmessage=function(e){var d=e.data;postMessage(__runAll(d.code,d.fn,d.tests));};'], { type: 'text/javascript' }));
        w = new Worker(workerURL);
      } catch (e) {
        try { resolve(new Function(ML.runnerSrc + ';return __runAll;')()(code, fn, tests)); } catch (err) { resolve({ error: String(err) }); }
        return;
      }
      const timer = setTimeout(() => { w.terminate(); resolve({ error: 'Timed out after 3 s. Is there an infinite loop?' }); }, timeout);
      w.onmessage = (e) => { clearTimeout(timer); w.terminate(); resolve(e.data); };
      w.onerror = (e) => { clearTimeout(timer); w.terminate(); resolve({ error: e.message || 'Script error' }); };
      w.postMessage({ code, fn, tests });
    });
  };

  /* ---------- C++ runner (JSCPP interpreter, see js/content/cpp.js) ---------- */
  function cppRunAll(spec, code, tests, JSCPP) {
    const PRE = '#include <iostream>\n#include <cmath>\n#include <iomanip>\nusing namespace std;\n', PRE_LINES = 4;
    const flat = (v) => (Array.isArray(v) ? v.reduce((a, x) => a.concat(flat(x)), []) : [v]);
    const lit = (n) => String(n);
    function program(t) {
      const lines = [];
      for (let i = 0; i < spec.args.length; i++) {
        const k = spec.args[i], v = t.args[i];
        if (k === 'd') lines.push('double x' + i + ' = ' + lit(v) + ';');
        else if (k === 'i') lines.push('int x' + i + ' = ' + lit(v) + ';');
        else if (k === 'c') lines.push("char x" + i + " = '" + String(v).charAt(0) + "';");
        else if (k === 'v') lines.push('double a' + i + '[] = {' + v.map(lit).join(', ') + '};', 'int n' + i + ' = ' + v.length + ';');
        else lines.push('double a' + i + '[] = {' + flat(v).map(lit).join(', ') + '};', 'int r' + i + ' = ' + v.length + ';', 'int c' + i + ' = ' + v[0].length + ';');
      }
      const name = spec.sig.replace(/^\w+\s+(\w+)\s*\(.*$/, '$1');
      lines.push('cout << setprecision(12) << "\\n@@RESULT ";');
      if (spec.ret === 'd' || spec.ret === 'i') {
        lines.push((spec.ret === 'd' ? 'double' : 'int') + ' res = ' + name + '(' + spec.pass + ');', 'cout << res << " ";');
      } else {
        const L = flat(t.expect).length;
        lines.push('double out[' + L + '];', 'for (int k = 0; k < ' + L + '; k++) out[k] = 0;', name + '(' + spec.pass + ', out);', 'for (int k = 0; k < ' + L + '; k++) cout << out[k] << " ";');
      }
      return PRE + code + '\n\nint main() {\n' + lines.join('\n') + '\ncout << endl;\nreturn 0;\n}\n';
    }
    function clean(msg) {
      msg = String(msg);
      const m = /Parsing Failure:\s*line (\d+) \(column (\d+)\)/.exec(msg);
      if (m) return 'Syntax error at line ' + Math.max(1, +m[1] - PRE_LINES) + ', column ' + m[2] + '. Check brackets, semicolons and spelling near there.';
      return msg.split('\n').slice(0, 3).join('\n').replace(/^ERROR: /, '').replace(/(\d+):(\d+)/, function (x, l, c) { return 'line ' + Math.max(1, +l - PRE_LINES) + ':' + c; });
    }
    function close(a, b, tol) { return a === b || Math.abs(a - b) <= tol || (isNaN(a) && isNaN(b)); }
    const results = [], logs = [];
    for (let ti = 0; ti < tests.length; ti++) {
      const t = tests[ti];
      let out = '';
      try {
        JSCPP.run(program(t), '', { stdio: { write: function (s) { out += s; } }, maxTimeout: 6000 });
      } catch (err) {
        if (ti === 0) return { error: clean(err && err.message ? err.message : err) };
        results.push({ ok: false, err: clean(err && err.message ? err.message : err) });
        continue;
      }
      const at = out.lastIndexOf('@@RESULT');
      if (at < 0) { results.push({ ok: false, err: 'The program did not finish.' }); continue; }
      if (ti === 0 && out.slice(0, at).trim()) logs.push(out.slice(0, at).trim());
      const vals = out.slice(at + 8).trim().split(/\s+/).filter(Boolean).map(parseFloat);
      const want = flat(t.expect), tol = t.tol == null ? 0.001 : t.tol;
      const ok = vals.length === want.length && want.every(function (x, i) { return close(vals[i], x, tol); });
      let got = vals;
      if (spec.ret === 'd' || spec.ret === 'i') got = vals[0];
      else if (spec.ret === 'm' && Array.isArray(t.expect[0])) { const w = t.expect[0].length; got = []; for (let i = 0; i < vals.length; i += w) got.push(vals.slice(i, i + w)); }
      results.push({ ok: ok, got: got });
    }
    return { results: results, logs: logs };
  }
  ML.cppRunAll = cppRunAll;
  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load the C++ interpreter. Open the app once while online.')); document.head.append(s); });
  let cppURL;
  ML.runCpp = function (spec, code, tests, timeout = 25000) {
    if (spec.adapt) tests = tests.map(spec.adapt);
    spec = { sig: spec.sig, args: spec.args, pass: spec.pass, ret: spec.ret };
    return new Promise((resolve) => {
      const fallback = async () => {
        try {
          if (!window.JSCPP) await loadScript('js/vendor/jscpp.js');
          resolve(cppRunAll(spec, code, tests, window.JSCPP));
        } catch (err) { resolve({ error: String(err.message || err) }); }
      };
      let w;
      try {
        const src = new URL('js/vendor/jscpp.js', document.baseURI).href;
        cppURL = cppURL || URL.createObjectURL(new Blob(['importScripts(' + JSON.stringify(src) + ');var __run=' + cppRunAll.toString() + ';onmessage=function(e){var d=e.data;try{postMessage(__run(d.spec,d.code,d.tests,self.JSCPP));}catch(err){postMessage({error:String(err)});}};'], { type: 'text/javascript' }));
        w = new Worker(cppURL);
      } catch (e) { fallback(); return; }
      let settled = false;
      const timer = setTimeout(() => { settled = true; w.terminate(); resolve({ error: 'Timed out. Is there an infinite loop?' }); }, timeout);
      w.onmessage = (e) => { if (settled) return; settled = true; clearTimeout(timer); w.terminate(); resolve(e.data); };
      w.onerror = () => { if (settled) return; settled = true; clearTimeout(timer); w.terminate(); fallback(); };
      w.postMessage({ spec, code, tests });
    });
  };

  /* ---------- Curriculum helpers ---------- */
  ML.allLessons = () => {
    const out = [];
    ML.units.forEach((u, ui) => u.lessons.forEach((l, li) => out.push(Object.assign(l, { unit: u, ui, li }))));
    return out;
  };
  ML.lessonById = (id) => ML.allLessons().find((l) => l.id === id);
  ML.isUnlocked = (lesson) => {
    if (store.s.settings.unlockAll) return true;
    const all = ML.allLessons();
    const i = all.findIndex((l) => l.id === lesson.id);
    return i <= 0 || !!store.s.done[all[i - 1].id];
  };
  ML.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
})();
