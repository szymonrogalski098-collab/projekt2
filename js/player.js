/* MLingo lesson player: theory -> practice -> code -> quiz */
(function () {
  'use strict';
  const ML = window.ML;
  const { h, fmt, store } = ML;
  const S = () => store.s;
  const PRAISE = ['Correct', 'Exactly', 'Right', 'Nice work', 'Solid', 'Precisely'];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /* ---------- question builders ---------- */
  function parseNum(str) {
    let s = String(str).trim().replace(/\s+/g, '').replace(',', '.');
    if (!s) return NaN;
    if (/^-?\d*\.?\d+\/-?\d*\.?\d+$/.test(s)) { const [a, b] = s.split('/').map(Number); return a / b; }
    return /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(s) ? Number(s) : NaN;
  }
  ML.parseNum = parseNum;

  const BUILD = {
    mc(item) {
      const order = item.noShuffle ? item.options.map((_, i) => i) : ML.shuffle(item.options.map((_, i) => i));
      let sel = null, locked = false;
      const q = { onChange() {} };
      const btns = order.map((oi, k) => h('button', { class: 'opt', type: 'button', onclick: () => { if (locked) return; sel = oi; btns.forEach((b, j) => b.classList.toggle('sel', order[j] === sel)); q.onChange(); } },
        h('span', { class: 'key' }, String(k + 1)), h('span', { html: fmt(item.options[oi]) })));
      q.node = h('div', {}, h('div', { class: 'q-text', html: fmt(item.q) }), item.sub ? h('p', { class: 'q-sub', html: fmt(item.sub) }) : null, h('div', { class: 'opts' }, btns));
      q.keys = (n) => { if (btns[n - 1]) btns[n - 1].click(); };
      q.ready = () => sel !== null;
      q.check = () => sel === item.answer;
      q.reveal = () => { locked = true; btns.forEach((b, k) => { const oi = order[k]; b.disabled = true; if (oi === item.answer) b.classList.add('right'); else if (oi === sel) b.classList.add('wrong'); }); };
      q.explain = () => h('div', { html: fmt(item.why || '') });
      return q;
    },
    multi(item) {
      const order = ML.shuffle(item.options.map((_, i) => i));
      const sel = new Set();
      let locked = false;
      const q = { onChange() {} };
      const btns = order.map((oi, k) => h('button', { class: 'opt multi', type: 'button', onclick: () => { if (locked) return; sel.has(oi) ? sel.delete(oi) : sel.add(oi); btns.forEach((b, j) => b.classList.toggle('sel', sel.has(order[j]))); q.onChange(); } },
        h('span', { class: 'key sq' }), h('span', { html: fmt(item.options[oi]) })));
      q.node = h('div', {}, h('div', { class: 'q-text', html: fmt(item.q) }), h('p', { class: 'q-sub' }, 'Select all that apply.'), h('div', { class: 'opts' }, btns));
      q.keys = (n) => { if (btns[n - 1]) btns[n - 1].click(); };
      q.ready = () => sel.size > 0;
      q.check = () => sel.size === item.answer.length && item.answer.every((a) => sel.has(a));
      q.reveal = () => { locked = true; btns.forEach((b, k) => { const oi = order[k]; b.disabled = true; const should = item.answer.includes(oi); if (should) b.classList.add('right'); else if (sel.has(oi)) b.classList.add('wrong'); }); };
      q.explain = () => h('div', { html: fmt(item.why || '') });
      return q;
    },
    order(item) {
      const n = item.items.length;
      let pool = ML.shuffle([...Array(n).keys()]);
      if (pool.every((v, i) => v === i)) pool.reverse();
      let chosen = [], locked = false;
      const q = { onChange() {} };
      const lane = h('div', { class: 'lane' }), poolEl = h('div', { class: 'pool' });
      function draw() {
        lane.innerHTML = ''; poolEl.innerHTML = '';
        chosen.forEach((v, pos) => lane.append(h('button', { type: 'button', class: 'chipw', onclick: () => { if (locked) return; chosen.splice(pos, 1); pool.push(v); draw(); q.onChange(); } }, h('span', { class: 'num' }, String(pos + 1)), h('span', { html: fmt(item.items[v]) }))));
        if (!chosen.length) lane.append(h('span', { class: 'ph' }, 'Tap the steps below in the correct order'));
        pool.forEach((v) => poolEl.append(h('button', { type: 'button', class: 'chipw', onclick: () => { if (locked) return; pool = pool.filter((x) => x !== v); chosen.push(v); draw(); q.onChange(); } }, h('span', { html: fmt(item.items[v]) }))));
      }
      draw();
      q.node = h('div', {}, h('div', { class: 'q-text', html: fmt(item.q) }), lane, poolEl);
      q.ready = () => pool.length === 0;
      q.check = () => chosen.every((v, i) => v === i);
      q.reveal = (ok) => { locked = true; [...lane.children].forEach((c, i) => c.classList.add(chosen[i] === i ? 'right' : 'wrong')); };
      q.explain = (ok) => h('div', {}, ok ? null : h('p', {}, 'Correct order:'), ok ? null : h('ol', { class: 'ans-list' }, item.items.map((t) => h('li', { html: fmt(t) }))), item.why ? h('p', { html: fmt(item.why) }) : null);
      return q;
    },
    match(item) {
      const n = item.pairs.length;
      const rightOrder = ML.shuffle([...Array(n).keys()]);
      const map = {};
      let selL = null, locked = false;
      const q = { onChange() {} };
      const L = h('div', { class: 'col' }), R = h('div', { class: 'col' });
      const hue = (l) => 'p' + (l % 5);
      function draw() {
        L.innerHTML = ''; R.innerHTML = '';
        const rightTaken = {};
        Object.keys(map).forEach((l) => (rightTaken[map[l]] = +l));
        for (let l = 0; l < n; l++) {
          L.append(h('button', { type: 'button', class: 'mt ' + (map[l] != null ? 'paired ' + hue(l) : '') + (selL === l ? ' sel' : ''), onclick: () => {
            if (locked) return;
            if (map[l] != null) { delete map[l]; selL = l; } else selL = selL === l ? null : l;
            draw(); q.onChange();
          } }, h('span', { html: fmt(item.pairs[l][0]) })));
        }
        rightOrder.forEach((r) => {
          const owner = rightTaken[r];
          R.append(h('button', { type: 'button', class: 'mt ' + (owner != null ? 'paired ' + hue(owner) : ''), onclick: () => {
            if (locked) return;
            if (owner != null) { delete map[owner]; draw(); q.onChange(); return; }
            if (selL == null) return;
            map[selL] = r; selL = null; draw(); q.onChange();
          } }, h('span', { html: fmt(item.pairs[r][1]) })));
        });
      }
      draw();
      q.node = h('div', {}, h('div', { class: 'q-text', html: fmt(item.q || 'Match each item with its partner.') }), h('p', { class: 'q-sub' }, 'Tap an item on the left, then its partner on the right.'), h('div', { class: 'match' }, L, R));
      q.ready = () => Object.keys(map).length === n;
      q.check = () => Object.keys(map).every((l) => map[l] === +l);
      q.reveal = () => {
        locked = true;
        [...L.children].forEach((b, l) => b.classList.add(map[l] === l ? 'right' : 'wrong'));
        [...R.children].forEach((b, i) => { const r = rightOrder[i]; const owner = Object.keys(map).find((l) => map[l] === r); b.classList.add(owner != null && +owner === r ? 'right' : 'wrong'); });
      };
      q.explain = (ok) => h('div', {}, ok ? null : h('ul', { class: 'ans-list' }, item.pairs.map(([a, b]) => h('li', { html: fmt(a) + ' → ' + fmt(b) }))), item.why ? h('p', { html: fmt(item.why) }) : null);
      return q;
    },
    num(item) {
      const q = { onChange() {} };
      const dp = item.dp == null ? 2 : item.dp;
      const tol = item.tol != null ? item.tol : Number.isInteger(item.ans) ? 1e-6 : 0.5 * Math.pow(10, -dp) + 1e-9;
      const inp = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Type your answer', 'aria-label': 'Your answer' });
      inp.addEventListener('input', () => q.onChange());
      q.node = h('div', { class: 'calc' },
        h('div', { class: 'calc-h' }, ML.ic('sigma'), h('span', {}, 'Calculation')),
        h('div', { class: 'calc-q', html: fmt(item.q) }),
        item.given && item.given.length ? h('div', { class: 'calc-given' }, h('div', { class: 'calc-gt' }, 'Given'), h('dl', {}, item.given.map(([k, v]) => [h('dt', { html: fmt(k) }), h('dd', { html: fmt(v) })]))) : null,
        h('div', { class: 'calc-in' }, h('label', {}, 'Your answer'), h('div', { class: 'calc-row' }, inp, item.unit ? h('span', { class: 'unit', html: fmt(item.unit) }) : null)),
        h('p', { class: 'calc-note' }, Number.isInteger(item.ans) ? 'Enter an exact number.' : `Round to ${dp} decimal place${dp === 1 ? '' : 's'}. You can use a dot or a comma.`));
      q.focus = () => setTimeout(() => inp.focus(), 50);
      q.ready = () => !isNaN(parseNum(inp.value));
      q.check = () => Math.abs(parseNum(inp.value) - item.ans) <= tol;
      q.reveal = (ok) => { inp.disabled = true; inp.classList.add(ok ? 'right' : 'wrong'); };
      q.explain = (ok) => {
        const shown = Number.isInteger(item.ans) ? String(item.ans) : item.ans.toFixed(dp);
        return h('div', {}, ok ? null : h('p', {}, 'Correct answer: ', h('b', {}, shown + (item.unit ? ' ' + item.unit.replace(/\$/g, '') : ''))),
          item.steps ? h('div', { class: 'solution' }, h('div', { class: 'calc-gt' }, 'Worked solution'), h('ol', {}, item.steps.map((t) => h('li', { html: fmt(t) })))) : null,
          item.why ? h('p', { html: fmt(item.why) }) : null);
      };
      return q;
    },
  };
  BUILD.fill = BUILD.mc;

  /* ---------- player ---------- */
  let P = null, el = null;

  ML.openLesson = function (id, opts = {}) {
    const lesson = ML.lessonById(id);
    if (!lesson) return;
    const steps = [];
    lesson.theory.forEach((d) => steps.push({ kind: 'theory', d }));
    lesson.practice.forEach((d) => steps.push({ kind: 'practice', d }));
    const coding = S().settings.coding !== false;
    (coding ? lesson.code || [] : []).forEach((d) => steps.push({ kind: 'code', d }));
    lesson.quiz.forEach((d) => steps.push({ kind: 'quiz', d }));
    const ses = S().session;
    if (!opts.fresh && ses && ses.id === id && ses.coding === coding && ses.queue.every((i) => i < steps.length)) {
      P = { lesson, steps, coding, queue: ses.queue.slice(), pos: Math.min(ses.pos, ses.queue.length), st: Object.assign({ qc: 0, qt: 0, pm: 0, sol: false, hu: 0, skip: 0 }, ses.st), repeated: new Set(ses.repeated || []) };
    } else {
      P = { lesson, steps, coding, queue: steps.map((_, i) => i), pos: 0, st: { qc: 0, qt: 0, pm: 0, sol: false, hu: 0, skip: 0 }, repeated: new Set() };
    }
    mountShell();
    show();
  };

  function persist() {
    S().session = { id: P.lesson.id, coding: P.coding, queue: P.queue, pos: P.pos, st: P.st, repeated: [...P.repeated] };
    store.save();
  }

  function mountShell() {
    closePlayer(true);
    const stages = [['theory', 'Theory'], ['practice', 'Practice']];
    if (P.steps.some((s) => s.kind === 'code')) stages.push(['code', 'Code']);
    stages.push(['quiz', 'Quiz']);
    P.stages = stages;
    el = {
      root: h('div', { class: 'player', role: 'dialog', 'aria-label': 'Lesson: ' + P.lesson.title }),
      bar: h('i'), body: h('main', { class: 'pbody' }), foot: h('footer', { class: 'pfoot' }),
      coins: h('span', { class: 'chip coin' }),
    };
    el.stagesEl = h('nav', { class: 'stages' }, stages.map(([k, t]) => h('span', { 'data-k': k }, t)));
    el.root.append(
      h('header', { class: 'ptop' },
        h('button', { class: 'xbtn', 'aria-label': 'Leave lesson', onclick: confirmLeave, html: ML.icon('x') }),
        h('div', { class: 'pbar' }, el.bar), el.coins),
      el.stagesEl, el.body, el.foot);
    document.body.append(el.root);
    document.body.classList.add('in-player');
    document.addEventListener('keydown', onKey);
    el.coins.innerHTML = ML.icon('coin', '', true) + S().coins;
  }

  function closePlayer(silent) {
    document.removeEventListener('keydown', onKey);
    if (el && el.root) el.root.remove();
    el = null;
    document.body.classList.remove('in-player');
    if (!silent && ML.afterPlayer) ML.afterPlayer();
  }

  let curQ = null;
  function onKey(e) {
    if (!el) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (e.key === 'Enter' && tag !== 'textarea' && tag !== 'button') {
      const b = el.foot.querySelector('.go:not([disabled])');
      if (b) { e.preventDefault(); b.click(); }
    } else if (/^[1-9]$/.test(e.key) && curQ && curQ.keys && tag !== 'input' && tag !== 'textarea') curQ.keys(+e.key);
  }

  function confirmLeave() {
    const back = h('div', { class: 'scrim' });
    const sheet = h('div', { class: 'sheet small' },
      h('h3', {}, 'Leave this lesson?'),
      h('p', {}, 'Your place is saved. You can resume from the Learn tab.'),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn ghost', onclick: () => { back.remove(); sheet.remove(); closePlayer(); } }, 'Leave'),
        h('button', { class: 'btn', onclick: () => { back.remove(); sheet.remove(); } }, 'Keep learning')));
    back.onclick = () => { back.remove(); sheet.remove(); };
    document.body.append(back, sheet);
  }

  function api() {
    const a = {
      primary(label, fn, enabled = true) {
        let b = el.foot.querySelector('.go');
        if (!b) { b = h('button', { class: 'btn go', type: 'button' }); el.btns.append(b); }
        b.textContent = label; b.disabled = !enabled;
        b.onclick = fn;
      },
      enable(v) { const b = el.foot.querySelector('.go'); if (b) b.disabled = !v; },
      feedback(ok, title, node) {
        el.foot.className = 'pfoot ' + (ok ? 'ok' : 'bad');
        el.fb.innerHTML = '';
        el.fb.append(h('div', { class: 'fb-t' }, h('span', { class: 'fb-i', html: ML.icon(ok ? 'check' : 'x') }), title), node || '');
        el.fb.hidden = false;
        el.fb.scrollTop = 0;
      },
    };
    return a;
  }

  function show() {
    if (P.pos >= P.queue.length) return finish();
    const idx = P.queue[P.pos], step = P.steps[idx];
    curQ = null;
    el.bar.style.width = Math.round((P.pos / P.queue.length) * 100) + '%';
    const ki = P.stages.findIndex((s) => s[0] === step.kind);
    [...el.stagesEl.children].forEach((c, i) => { c.className = i < ki ? 'done' : i === ki ? 'cur' : ''; });
    el.body.innerHTML = '';
    el.body.scrollTop = 0;
    el.foot.className = 'pfoot';
    el.foot.innerHTML = '';
    el.fb = h('div', { class: 'fb' }); el.fb.hidden = true;
    el.btns = h('div', { class: 'pbtns' });
    el.foot.append(el.fb, el.btns);
    const A = api();
    ({ theory: mountTheory, practice: mountQuestion, quiz: mountQuestion, code: mountCode })[step.kind](step, A, idx);
  }

  function advance() { P.pos++; persist(); show(); }

  function mountTheory(step, A) {
    const d = step.d;
    el.body.append(h('div', { class: 'theory' }, h('h2', { class: 'th-title' }, d.title), ML.renderBlocks(d.blocks)));
    A.primary('Continue', advance);
  }

  function mountQuestion(step, A, idx) {
    const item = step.d, isQuiz = step.kind === 'quiz';
    const q = BUILD[item.type](item);
    curQ = q;
    el.body.append(h('div', { class: 'question' }, h('div', { class: 'q-tag' }, isQuiz ? 'Quiz question' : 'Practice'), q.node));
    A.primary('Check', () => {
      const ok = q.check();
      q.reveal(ok);
      ML.beep(ok ? 'ok' : 'bad');
      if (isQuiz) { P.st.qt++; if (ok) P.st.qc++; }
      else if (!ok) {
        P.st.pm++;
        if (!P.repeated.has(idx)) {
          P.repeated.add(idx);
          let at = P.pos + 1;
          for (let j = P.queue.length - 1; j > P.pos; j--) if (P.steps[P.queue[j]].kind === 'practice') { at = j + 1; break; }
          P.queue.splice(at, 0, idx);
        }
      }
      A.feedback(ok, ok ? pick(PRAISE) : 'Not quite', q.explain(ok));
      A.primary('Continue', advance);
    }, false);
    q.onChange = () => A.enable(q.ready());
    if (q.focus) q.focus();
  }

  function mountCode(step, A) {
    const it = step.d;
    const spec = ML.cpp && ML.cpp[P.lesson.id + '/' + it.fn];
    let lang = spec && S().settings.codeLang === 'cpp' ? 'cpp' : 'js';
    let fails = 0, busy = false;
    const shown = { js: 0, cpp: 0 };
    const buf = { js: it.starter, cpp: spec ? spec.starter : '' };
    const hintsOf = () => (lang === 'cpp' ? spec.hints : it.hints) || [];
    const starterOf = () => (lang === 'cpp' ? spec.starter : it.starter);
    const solutionOf = () => (lang === 'cpp' ? spec.solution : it.solution);
    const ta = h('textarea', { class: 'editor', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', 'aria-label': 'Code editor', rows: Math.max(8, Math.max(it.starter.split('\n').length, spec ? spec.starter.split('\n').length : 0) + 1) });
    ta.value = buf[lang];
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText(lang === 'cpp' ? '    ' : '  ', s, ta.selectionEnd, 'end'); }
      else if (e.key === 'Enter') {
        const s = ta.selectionStart, line = ta.value.slice(0, s).split('\n').pop(), unit = lang === 'cpp' ? '    ' : '  ', ind = (/^\s*/.exec(line) || [''])[0] + (/[{(\[]\s*$/.test(line) ? unit : '');
        e.preventDefault(); ta.setRangeText('\n' + ind, s, ta.selectionEnd, 'end');
      }
    });
    const hintBox = h('div', { class: 'hints' });
    const out = h('div', { class: 'tests' });
    const note = h('p', { class: 'cppnote' });
    const hintBtn = h('button', { class: 'btn small ghost', type: 'button' }), solBtn = h('button', { class: 'btn small ghost', type: 'button', disabled: true }, 'Show solution');
    const resetBtn = h('button', { class: 'btn small ghost', type: 'button', onclick: () => { ta.value = starterOf(); buf[lang] = ta.value; } }, 'Reset');
    const skipBtn = h('button', { class: 'btn small ghost', type: 'button', onclick: () => { P.st.skip = (P.st.skip || 0) + 1; ML.toast('Skipped. You can come back to it when you replay this lesson.'); advance(); } }, 'Skip task');
    const hintLabel = () => { hintBtn.innerHTML = ML.icon('bulb') + ` Hint <small>${S().hints > 0 ? S().hints + ' left' : '3 coins'}</small>`; };
    const renderHints = () => {
      hintBox.innerHTML = '';
      hintsOf().slice(0, shown[lang]).forEach((t, i) => hintBox.append(h('div', { class: 'hint' }, h('b', {}, 'Hint ' + (i + 1) + '. '), h('span', { html: fmt(t) }))));
    };
    hintLabel();
    hintBtn.onclick = () => {
      if (shown[lang] >= hintsOf().length) return ML.toast('No more hints for this task.');
      if (S().hints > 0) S().hints--; else if (S().coins >= 3) S().coins -= 3; else return ML.toast('You need a hint token or 3 coins.');
      P.st.hu++; store.save(); el.coins.innerHTML = ML.icon('coin', '', true) + S().coins;
      shown[lang]++; renderHints(); hintLabel();
    };
    let solArmed = false;
    solBtn.onclick = () => {
      if (!solArmed) { solArmed = true; solBtn.textContent = 'Tap again to reveal'; return; }
      ta.value = solutionOf(); buf[lang] = ta.value; P.st.sol = true; solBtn.disabled = true; solBtn.textContent = 'Solution shown'; ML.toast('Solution inserted. Run it to continue.');
    };
    const segBtns = {};
    const bar = h('div', { class: 'ed-bar' });
    if (spec) {
      [['js', 'JavaScript'], ['cpp', 'C++']].forEach(([k, t]) => {
        segBtns[k] = h('button', { type: 'button', class: 'lang' + (k === lang ? ' on' : ''), onclick: () => setLang(k) }, t);
        bar.append(segBtns[k]);
      });
    } else bar.append(h('span', {}, 'JavaScript'));
    bar.append(h('span', { class: 'sp' }), resetBtn);
    function paintNote() {
      note.hidden = lang !== 'cpp';
      note.textContent = lang === 'cpp' ? 'C++ runs in a built-in interpreter: iostream and cmath are preloaded, there is no vector or string, so arrays come with their length. ' + (spec.note || '') : '';
    }
    function setLang(k) {
      if (k === lang || !spec) return;
      buf[lang] = ta.value; lang = k; ta.value = buf[lang];
      S().settings.codeLang = k; store.save();
      Object.keys(segBtns).forEach((x) => segBtns[x].classList.toggle('on', x === lang));
      out.innerHTML = ''; renderHints(); paintNote();
      if (spec && lang === 'cpp') sigBox.textContent = spec.sig; 
      sigBox.hidden = lang !== 'cpp';
    }
    const sigBox = h('code', { class: 'sigbox' }, spec ? spec.sig : '');
    sigBox.hidden = lang !== 'cpp';
    paintNote(); renderHints();
    el.body.append(h('div', { class: 'codestep' },
      h('div', { class: 'code-head' }, h('div', { class: 'q-tag' }, 'Coding task, optional'), skipBtn),
      h('h2', { class: 'th-title' }, it.title),
      ML.renderBlocks(it.task),
      spec ? sigBox : null,
      h('div', { class: 'ed-wrap' }, bar, ta), note,
      h('div', { class: 'ed-tools' }, hintBtn, solBtn), hintBox, out));

    async function run() {
      if (busy) return; busy = true;
      buf[lang] = ta.value;
      A.primary('Running...', () => {}, false);
      let res;
      if (lang === 'cpp') {
        res = await ML.runCpp(spec, ta.value, it.tests);
      } else res = await ML.runCode(ta.value, it.fn, it.tests);
      busy = false;
      out.innerHTML = '';
      if (res.error) {
        out.append(h('div', { class: 'terr' }, h('b', {}, 'Error'), h('pre', {}, res.error)));
        fails++;
      } else {
        const all = res.results.every((r) => r.ok);
        res.results.forEach((r, i) => {
          const t = it.tests[i];
          const call = t.hidden ? 'Hidden test' : `${it.fn}(${t.args.map((a) => JSON.stringify(a)).join(', ')})`;
          out.append(h('div', { class: 'trow ' + (r.ok ? 'ok' : 'bad') },
            h('span', { class: 'ti', html: ML.icon(r.ok ? 'check' : 'x') }),
            h('div', {}, h('code', {}, call),
              t.hidden ? null : h('div', { class: 'tdet' }, 'expected ', h('code', {}, JSON.stringify(t.expect)), r.ok ? '' : [' got ', h('code', {}, r.err ? r.err : JSON.stringify(r.got))]))));
        });
        if (res.logs && res.logs.length) out.append(h('pre', { class: 'tlog' }, res.logs.slice(0, 20).join('\n')));
        if (all) {
          ML.beep('ok');
          A.feedback(true, 'All tests passed', h('div', { html: fmt(it.explain || '') }));
          A.primary('Continue', advance);
          return;
        }
        fails++;
      }
      if (fails >= 3 && !P.st.sol) solBtn.disabled = false;
      ML.beep('bad');
      A.primary('Run tests', run);
    }
    A.primary('Run tests', run);
  }

  /* ---------- completion ---------- */
  function finish() {
    const L = P.lesson, st = P.st;
    const first = !S().done[L.id];
    const acc = st.qt ? st.qc / st.qt : 1;
    const hasCode = P.steps.some((s) => s.kind === 'code');
    let coins = 10 + Math.round(acc * 10) + (acc === 1 ? 5 : 0) + (hasCode && !st.sol && !st.skip ? 3 : 0);
    let xp = 20 + Math.round(acc * 20);
    if (!first) { coins = Math.round(coins * 0.3); xp = Math.round(xp * 0.5); }
    const beforeGoal = store.xpToday();
    store.addCoins(coins); store.addXp(xp);
    el.coins.innerHTML = ML.icon('coin', '', true) + S().coins;
    const d = S().done[L.id] || { plays: 0, best: 0 };
    d.plays++; d.best = Math.max(d.best, Math.round(acc * 100)); d.last = store.today();
    S().done[L.id] = d;
    S().session = null;
    store.save();
    ML.beep('win');
    el.bar.style.width = '100%';
    el.foot.className = 'pfoot'; el.foot.innerHTML = '';
    el.fb = h('div', { class: 'fb' }); el.fb.hidden = true;
    el.btns = h('div', { class: 'pbtns' });
    el.foot.append(el.fb, el.btns);
    el.stagesEl.hidden = true;
    const goalHit = beforeGoal < S().settings.goal && store.xpToday() >= S().settings.goal;
    const next = ML.allLessons().find((l, i, arr) => i > 0 && arr[i - 1].id === L.id);
    el.body.innerHTML = '';
    el.body.append(h('div', { class: 'done-screen' },
      h('div', { class: 'mascot-wrap', html: ML.mascot(acc >= 0.6 ? 'happy' : 'wow', 120) }),
      h('h1', {}, acc === 1 ? 'Perfect lesson' : 'Lesson complete'),
      h('p', { class: 'sub' }, L.title),
      h('div', { class: 'tiles' },
        h('div', { class: 'tile xp' }, h('span', { html: ML.icon('bolt', '', true) }), h('b', {}, '+' + xp), h('em', {}, 'XP')),
        h('div', { class: 'tile cn' }, h('span', { html: ML.icon('coin', '', true) }), h('b', {}, '+' + coins), h('em', {}, 'Coins')),
        h('div', { class: 'tile ac' }, h('span', { html: ML.icon('target') }), h('b', {}, Math.round(acc * 100) + '%'), h('em', {}, 'Quiz accuracy'))),
      h('ul', { class: 'done-notes' },
        first ? null : h('li', {}, 'Replay: rewards are reduced, mastery is what counts.'),
        acc === 1 ? h('li', {}, 'Perfect quiz bonus: +5 coins.') : null,
        hasCode && !st.sol && !st.skip ? h('li', {}, 'Solved the coding tasks without the solution: +3 coins.') : null,
        st.skip ? h('li', {}, 'Coding task skipped. It is optional and waits for you when you replay the lesson.') : null,
        st.pm ? h('li', {}, `${st.pm} practice mistake${st.pm > 1 ? 's' : ''}, repeated until correct.`) : null,
        goalHit ? h('li', {}, 'Daily goal reached.') : null,
        h('li', {}, `Streak: ${store.effStreak()} day${store.effStreak() === 1 ? '' : 's'}.`),
        first && next ? h('li', {}, `Unlocked: ${next.title}.`) : null)));
    const A = api();
    A.primary('Continue', () => closePlayer());
    confetti();
  }

  function confetti() {
    const wrap = h('div', { class: 'confetti', 'aria-hidden': 'true' });
    for (let i = 0; i < 46; i++) {
      wrap.append(h('i', { style: `left:${Math.random() * 100}%;background:var(--c${i % 5});animation-delay:${Math.random() * 0.4}s;animation-duration:${1.1 + Math.random() * 0.9}s;transform:rotate(${Math.random() * 360}deg)` }));
    }
    el.root.append(wrap);
    setTimeout(() => wrap.remove(), 2400);
  }
})();
