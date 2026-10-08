/* Content validator: run with `node tools/validate.js`.
   Checks structure, recomputes every numeric answer, runs every coding solution against its tests,
   rejects emojis, and makes sure plots and math strings compile. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = global;
global.self = global;
const root = path.join(__dirname, '..');
for (const f of ['js/core.js', 'js/widgets.js', 'js/content/u1.js', 'js/content/u2.js', 'js/content/u3.js', 'js/content/u4.js', 'js/content/u5.js', 'js/content/cpp.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
}
vm.runInThisContext(fs.readFileSync(path.join(root, 'js/vendor/jscpp.js'), 'utf8'), { filename: 'jscpp.js' });
const ML = global.ML;
let errors = 0, warnings = 0, nums = 0, codes = 0, items = 0, words = 0;
const err = (where, msg) => { errors++; console.log('ERROR  ' + where + ': ' + msg); };
const warn = (where, msg) => { warnings++; console.log('warn   ' + where + ': ' + msg); };

const EMOJI = /\p{Extended_Pictographic}/u;
const CONTROL = /[\u0000-\u0008\u000b-\u001f]/;

function scanStrings(obj, where) {
  if (typeof obj === 'string') {
    if (EMOJI.test(obj)) err(where, 'emoji found in: ' + obj.slice(0, 60));
    if (CONTROL.test(obj)) err(where, 'control character (bad escape?) in: ' + JSON.stringify(obj.slice(0, 60)));
    if ((obj.match(/\$/g) || []).length % 2) err(where, 'odd number of $ in: ' + obj.slice(0, 60));
    words += obj.split(/\s+/).length;
    try { ML.fmt(obj); } catch (e) { err(where, 'fmt failed: ' + e.message); }
    const html = ML.fmt(obj);
    if (/[@\\][a-zA-Z]+\{?/.test(html.replace(/<[^>]+>/g, '')) && /\$/.test(obj)) err(where, 'unrendered math command in: ' + obj.slice(0, 60));
    return;
  }
  if (Array.isArray(obj)) return obj.forEach((x, i) => scanStrings(x, where));
  if (obj && typeof obj === 'object') for (const k in obj) if (k !== 'verify' && k !== 'unit') scanStrings(obj[k], where);
}

function checkMath(tex, where) {
  const html = ML.mathHTML(tex);
  const text = html.replace(/<[^>]+>/g, '');
  if (/[@\\]/.test(text)) err(where, 'unrendered math command in formula: ' + tex);
  if ((tex.match(/\{/g) || []).length !== (tex.match(/\}/g) || []).length && !/^[^]*\{\([^]*\}/.test(tex)) {
    // braces can legitimately appear as set braces; only warn
    warn(where, 'unbalanced braces in formula: ' + tex);
  }
}

function checkPlot(b, where) {
  try {
    const p = {};
    (b.params || []).forEach((q) => (p[q.n] = q.v));
    const pts = b.points || [];
    let finite = 0;
    (b.fns || []).forEach((f) => {
      const fn = new Function('x', 'p', 'pts', 'return (' + f.f + ');');
      for (let i = 0; i <= 20; i++) { const x = b.xr[0] + ((b.xr[1] - b.xr[0]) * i) / 20; if (isFinite(fn(x, p, pts))) finite++; }
    });
    if ((b.fns || []).length && !finite) err(where, 'plot function never finite');
    if (b.trail) { const t = new Function('p', 'pts', 'return (' + b.trail + ');')(p, pts); if (!Array.isArray(t) || !t.length) err(where, 'trail empty'); }
    (b.arrows || []).forEach((a) => { const r = new Function('p', 'return (' + a.to + ');')(p); if (!Array.isArray(r) || r.length !== 2) err(where, 'arrow target invalid'); });
    (b.readout || []).forEach((r) => { const v = new Function('p', 'pts', 'return (' + r.f + ');')(p, pts); if (typeof v === 'number' && !isFinite(v)) err(where, 'readout not finite: ' + r.label); });
  } catch (e) { err(where, 'plot failed: ' + e.message); }
}

function checkItem(it, where) {
  items++;
  if (!it.type) return err(where, 'missing type');
  switch (it.type) {
    case 'mc': case 'fill':
      if (!Array.isArray(it.options) || it.options.length < 2) err(where, 'needs >= 2 options');
      else if (!(Number.isInteger(it.answer) && it.answer >= 0 && it.answer < it.options.length)) err(where, 'answer index out of range');
      else if (new Set(it.options).size !== it.options.length) err(where, 'duplicate options');
      if (!it.why) warn(where, 'no explanation (why)');
      break;
    case 'multi':
      if (!Array.isArray(it.answer) || !it.answer.length || it.answer.some((a) => !(a >= 0 && a < it.options.length))) err(where, 'bad multi answer');
      if (it.answer.length === it.options.length) warn(where, 'all options correct');
      break;
    case 'order': if (!it.items || it.items.length < 2) err(where, 'order needs >= 2 items'); break;
    case 'match':
      if (!it.pairs || it.pairs.length < 2) err(where, 'match needs >= 2 pairs');
      else { const r = it.pairs.map((p) => p[1]); if (new Set(r).size !== r.length) err(where, 'duplicate match targets'); }
      break;
    case 'num': {
      nums++;
      if (typeof it.ans !== 'number') return err(where, 'ans must be a number');
      if (!it.verify) return err(where, 'num without verify expression');
      let v;
      try { v = eval(it.verify); } catch (e) { return err(where, 'verify failed: ' + e.message); }
      const dp = it.dp == null ? 2 : it.dp;
      const tol = it.tol != null ? it.tol : Number.isInteger(it.ans) ? 1e-6 : 0.5 * Math.pow(10, -dp) + 1e-9;
      if (Math.abs(v - it.ans) > tol) err(where, `stored ans ${it.ans} differs from computed ${v} (tol ${tol})`);
      const shown = Number(v.toFixed(dp));
      if (Math.abs(shown - v) > tol) err(where, `rounded value ${shown} would be rejected for computed ${v}`);
      if (Number.isInteger(it.ans) && !Number.isInteger(v)) err(where, 'integer ans but verify is not an integer: ' + v);
      if (!Number.isInteger(it.ans) && Math.abs(v * Math.pow(10, dp) % 1 - 0.5) < 1e-6) warn(where, 'answer sits exactly on a rounding boundary: ' + v);
      if (!it.steps || !it.steps.length) warn(where, 'no worked solution');
      if (!it.given || !it.given.length) warn(where, 'no given block');
      break;
    }
    default: err(where, 'unknown type ' + it.type);
  }
}

async function main() {
  const ids = new Set();
  const lessons = ML.allLessons();
  for (const L of lessons) {
    const w = L.id;
    if (ids.has(L.id)) err(w, 'duplicate lesson id');
    ids.add(L.id);
    ['title', 'blurb', 'icon', 'minutes'].forEach((k) => { if (!L[k]) err(w, 'missing ' + k); });
    if (L.theory.length < 5) warn(w, 'only ' + L.theory.length + ' theory pages');
    if (L.practice.length < 5) warn(w, 'only ' + L.practice.length + ' practice items');
    if (L.quiz.length < 6) warn(w, 'only ' + L.quiz.length + ' quiz items');
    if (!L.quiz.some((q) => q.type === 'num')) warn(w, 'quiz has no calculation question');
    scanStrings(L, w);
    L.theory.forEach((pg, i) => {
      if (!pg.title || !pg.blocks.length) err(w + ' theory ' + i, 'empty page');
      pg.blocks.forEach((b) => {
        if (b.k === 'formula') { [].concat(b.tex).forEach((t) => checkMath(t, w + ' formula')); (b.legend || []).forEach(([s]) => checkMath(s, w + ' legend')); }
        if (b.k === 'plot') checkPlot(b, w + ' plot "' + (b.title || '') + '"');
      });
    });
    L.practice.forEach((it, i) => checkItem(it, `${w} practice ${i + 1}`));
    L.quiz.forEach((it, i) => checkItem(it, `${w} quiz ${i + 1}`));
    for (const [ci, c] of (L.code || []).entries()) {
      codes++;
      const wc = `${w} code ${ci + 1} (${c.fn})`;
      const good = await ML.runCode(c.solution, c.fn, c.tests);
      if (good.error) { err(wc, 'solution error: ' + good.error); continue; }
      good.results.forEach((r, i) => { if (!r.ok) err(wc, `solution fails test ${i + 1}: expected ${JSON.stringify(c.tests[i].expect)} got ${r.err || JSON.stringify(r.got)}`); });
      const sp = ML.cpp[L.id + '/' + c.fn];
      if (!sp) { err(wc, 'no C++ version in js/content/cpp.js'); continue; }
      const t0 = Date.now();
      const cg = await ML.runCpp(sp, sp.solution, c.tests);
      if (cg.error) err(wc + ' [C++]', 'solution error: ' + cg.error);
      else cg.results.forEach((r, i) => { if (!r.ok) err(wc + ' [C++]', `solution fails test ${i + 1}: expected ${JSON.stringify(c.tests[i].expect)} got ${r.err || JSON.stringify(r.got)}`); });
      if (Date.now() - t0 > 4000) warn(wc + ' [C++]', 'slow: ' + (Date.now() - t0) + ' ms');
      if (!sp.hints || sp.hints.length < 2 || !sp.starter) err(wc + ' [C++]', 'missing hints or starter');
      if (EMOJI.test(sp.starter + sp.solution + sp.hints.join(''))) err(wc + ' [C++]', 'emoji');
      const bad = await ML.runCode(c.starter, c.fn, c.tests);
      if (!bad.error && bad.results.every((r) => r.ok)) err(wc, 'STARTER already passes all tests');
      if (!c.hints || c.hints.length < 2) warn(wc, 'fewer than 2 hints');
      if (c.tests.length < 3) warn(wc, 'fewer than 3 tests');
    }
  }
  console.log(`\nLessons: ${lessons.length}, practice+quiz items: ${items}, calculations: ${nums}, coding tasks: ${codes}, ~words: ${words}`);
  console.log(`Errors: ${errors}, warnings: ${warnings}`);
  process.exit(errors ? 1 : 0);
}
main();
