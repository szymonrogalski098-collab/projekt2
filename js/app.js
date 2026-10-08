/* MLingo app shell: router, Learn / Shop / Profile views, PWA glue */
(function () {
  'use strict';
  const ML = window.ML;
  const { h, store, fmt } = ML;
  const S = () => store.s;
  const app = document.getElementById('app');
  let chips = {};

  /* ---------- theme ---------- */
  const ACCENTS = {
    default: { name: 'Signal', price: 0, c: '#2f5bff' },
    ember: { name: 'Ember', price: 80, c: '#e8590c' },
    forest: { name: 'Forest', price: 80, c: '#12805c' },
    orchid: { name: 'Orchid', price: 80, c: '#9333ea' },
  };
  function applyTheme() {
    const r = document.documentElement, st = S().settings;
    if (st.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', st.theme);
    r.setAttribute('data-accent', st.accent);
    const dark = st.theme === 'dark' || (st.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    const m = document.querySelector('meta[name=theme-color]');
    if (m) m.setAttribute('content', dark ? '#0b1020' : '#f2f5fa');
  }

  /* ---------- chrome ---------- */
  function topbar() {
    chips.streak = h('span', { class: 'chip streak' });
    chips.coins = h('span', { class: 'chip coin' });
    const bar = h('header', { class: 'topbar' },
      h('a', { class: 'brand', href: '#/learn', 'aria-label': 'MLingo home' }, h('span', { html: ML.icon('learn') }), h('b', {}, 'MLingo')),
      h('div', { class: 'chips' }, chips.streak, chips.coins));
    updateChips();
    return bar;
  }
  function updateChips() {
    if (chips.streak) chips.streak.innerHTML = ML.icon('flame', '', true) + store.effStreak();
    if (chips.coins) chips.coins.innerHTML = ML.icon('coin', '', true) + S().coins;
  }
  store.on(updateChips);

  function nav(active) {
    const items = [['learn', 'Learn', 'learn'], ['shop', 'Shop', 'shop'], ['profile', 'Profile', 'user']];
    return h('nav', { class: 'tabs', 'aria-label': 'Main' }, items.map(([k, t, ic]) =>
      h('a', { href: '#/' + k, class: k === active ? 'on' : '', 'aria-current': k === active ? 'page' : null }, h('span', { html: ML.icon(ic) }), h('span', {}, t))));
  }

  /* ---------- Learn ---------- */
  const ROW = 128, XS = [50, 27, 50, 73];
  function viewLearn() {
    const root = h('div', { class: 'view learn' });
    const goal = S().settings.goal, today = store.xpToday();
    root.append(h('section', { class: 'goal' },
      h('div', {}, h('b', {}, today >= goal ? 'Daily goal reached' : 'Daily goal'), h('span', {}, `${Math.min(today, goal)} / ${goal} XP`)),
      h('div', { class: 'gbar' }, h('i', { style: 'width:' + Math.min(100, (today / goal) * 100) + '%' }))));

    const all = ML.allLessons();
    const curId = (all.find((l) => ML.isUnlocked(l) && !S().done[l.id]) || {}).id;
    const ses = S().session;
    if (ses) {
      const l = ML.lessonById(ses.id);
      if (l) root.append(h('button', { class: 'resume', onclick: () => openSheet(l) }, h('span', { html: ML.icon('play', '', true) }), h('span', {}, h('b', {}, 'Resume: ' + l.title), h('small', {}, `Step ${Math.min(ses.pos + 1, ses.queue.length)} of ${ses.queue.length}`))));
    }

    ML.units.forEach((u, ui) => {
      const done = u.lessons.filter((l) => S().done[l.id]).length;
      const sec = h('section', { class: 'unit', style: `--u:${u.color}` });
      sec.append(h('div', { class: 'ubanner' },
        h('div', {}, h('span', { class: 'ucount' }, `Unit ${ui + 1}`), h('h2', {}, u.title), h('p', {}, u.blurb)),
        h('div', { class: 'uprog' }, h('b', {}, `${done}/${u.lessons.length}`), h('small', {}, 'lessons'))));
      const n = u.lessons.length, Hh = n * ROW + 10;
      const path = h('div', { class: 'path', style: `height:${Hh}px` });
      const cx = (i) => XS[i % 4], cy = (i) => i * ROW + 10 + 38;
      let svg = `<svg class="wires" viewBox="0 0 100 ${Hh}" preserveAspectRatio="none" aria-hidden="true">`;
      const curve = (i, j, cls) => {
        const ym = (cy(i) + cy(j)) / 2;
        return `<path class="${cls}" vector-effect="non-scaling-stroke" d="M${cx(i)} ${cy(i)} C${cx(i)} ${ym} ${cx(j)} ${ym} ${cx(j)} ${cy(j)}"/>`;
      };
      for (let i = 0; i < n; i++) {
        if (i + 2 < n) svg += curve(i, i + 2, 'w faint' + (S().done[u.lessons[i].id] && S().done[u.lessons[i + 1].id] ? ' lit' : ''));
        if (i + 1 < n) svg += curve(i, i + 1, 'w main ' + (S().done[u.lessons[i].id] ? 'done' : ML.isUnlocked(u.lessons[i + 1]) ? 'open' : ''));
      }
      path.insertAdjacentHTML('beforeend', svg + '</svg>');
      u.lessons.forEach((l, i) => {
        const lk = !ML.isUnlocked(l), dn = S().done[l.id], cur = l.id === curId;
        const node = h('button', { class: 'node ' + (dn ? 'done' : lk ? 'lock' : cur ? 'cur' : 'open'), style: `left:${cx(i)}%;top:${i * ROW + 10}px`, 'aria-label': l.title + (dn ? ', completed' : lk ? ', locked' : ''), onclick: () => (lk ? ML.toast('Finish the previous lesson to unlock this one.') : openSheet(l)) },
          h('span', { class: 'disc', html: ML.icon(lk ? 'lock' : l.icon) }),
          dn ? h('span', { class: 'badge', html: ML.icon('check') }) : null,
          cur ? h('span', { class: 'start' }, 'Start') : null,
          h('span', { class: 'nlabel' }, l.title));
        path.append(node);
      });
      sec.append(path);
      root.append(sec);
    });
    root.append(h('p', { class: 'endnote' }, 'More units are on the way. Replay any lesson to sharpen it.'));
    return root;
  }

  function openSheet(l) {
    const d = S().done[l.id], ses = S().session && S().session.id === l.id ? S().session : null;
    const close = () => { back.remove(); sheet.remove(); };
    const back = h('div', { class: 'scrim', onclick: close });
    const parts = [['book', l.theory.length + ' theory pages'], ['pencil', l.practice.length + ' practice tasks']];
    if (l.code && l.code.length && S().settings.coding !== false) parts.push(['code', l.code.length + ' optional coding task' + (l.code.length > 1 ? 's' : '')]);
    parts.push(['quiz', l.quiz.length + ' quiz questions']);
    const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-label': l.title, style: `--u:${l.unit.color}` },
      h('div', { class: 'sh-head' }, h('span', { class: 'disc', html: ML.icon(l.icon) }), h('div', {}, h('small', {}, `Unit ${l.ui + 1}, lesson ${l.li + 1}`), h('h3', {}, l.title))),
      h('p', { class: 'sh-blurb', html: fmt(l.blurb) }),
      h('ul', { class: 'parts' }, parts.map(([ic, t]) => h('li', {}, h('span', { html: ML.icon(ic) }), t))),
      h('p', { class: 'sh-meta' }, `About ${l.minutes} . Reward up to ${d ? 'a few coins on replay' : '28 coins'}`.replace(' . ', ', ')),
      d ? h('p', { class: 'sh-meta' }, `Best quiz score ${d.best}%, played ${d.plays} time${d.plays > 1 ? 's' : ''}.`) : null,
      h('div', { class: 'btnrow' },
        ses ? h('button', { class: 'btn ghost', onclick: () => { close(); ML.openLesson(l.id, { fresh: true }); } }, 'Start over') : null,
        h('button', { class: 'btn', onclick: () => { close(); ML.openLesson(l.id); } }, ses ? 'Resume' : d ? 'Replay lesson' : 'Start lesson')));
    document.body.append(back, sheet);
  }

  /* ---------- Shop ---------- */
  function buy(cost, fn, msg) {
    if (S().coins < cost) return ML.toast('Not enough coins. Finish a lesson to earn more.');
    store.addCoins(-cost); fn(); store.save(); ML.toast(msg); render();
  }
  function viewShop() {
    const root = h('div', { class: 'view shop' });
    root.append(h('div', { class: 'balance' }, h('span', { html: ML.icon('coin', '', true) }), h('b', {}, S().coins), h('small', {}, 'coins')));
    const item = (ic, title, desc, price, btn, state) => h('div', { class: 'shopitem' }, h('span', { class: 'si', html: ML.icon(ic) }), h('div', { class: 'sd' }, h('b', {}, title), h('small', {}, desc), state ? h('small', { class: 'own' }, state) : null), btn);
    const priceBtn = (cost, fn, msg, disabled) => h('button', { class: 'btn small', disabled: disabled || null, onclick: () => buy(cost, fn, msg) }, h('span', { class: 'coinic', html: ML.icon('coin', '', true) }), String(cost));
    root.append(h('h2', { class: 'sec' }, 'Boosts'));
    root.append(item('bulb', 'Hint token', 'Reveals the next hint in a coding task.', 5, priceBtn(5, () => (S().hints += 1), 'Hint token added.'), `You have ${S().hints}`));
    root.append(item('bulb', 'Hint pack x5', 'Five hint tokens at a discount.', 20, priceBtn(20, () => (S().hints += 5), 'Five hint tokens added.')));
    root.append(item('flame', 'Streak freeze', 'Protects your streak for one missed day. Holds up to 2.', 40, priceBtn(40, () => (S().freezes += 1), 'Streak freeze added.', S().freezes >= 2), `You have ${S().freezes}`));
    root.append(h('h2', { class: 'sec' }, 'Colour themes'));
    Object.entries(ACCENTS).forEach(([id, a]) => {
      if (id === 'default') return;
      const owned = S().owned.includes(id), on = S().settings.accent === id;
      root.append(h('div', { class: 'shopitem' }, h('span', { class: 'swatch', style: 'background:' + a.c }), h('div', { class: 'sd' }, h('b', {}, a.name), h('small', {}, 'Changes the accent colour across the app.')),
        owned ? h('button', { class: 'btn small ' + (on ? '' : 'ghost'), onclick: () => { S().settings.accent = id; store.save(); applyTheme(); render(); } }, on ? 'Equipped' : 'Equip')
          : priceBtn(a.price, () => { S().owned.push(id); S().settings.accent = id; applyTheme(); }, a.name + ' unlocked.')));
    });
    root.append(h('p', { class: 'endnote' }, 'Earn coins by finishing lessons. There is no limit on how many you can do.'));
    return root;
  }

  /* ---------- Profile ---------- */
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; if (location.hash.startsWith('#/profile')) render(); });
  window.addEventListener('appinstalled', () => { deferredInstall = null; render(); });

  function seg(options, value, onPick) {
    return h('div', { class: 'seg', role: 'group' }, options.map(([v, t]) => h('button', { type: 'button', class: v === value ? 'on' : '', 'aria-pressed': v === value ? 'true' : 'false', onclick: () => onPick(v) }, t)));
  }
  function toggle(on, onClick, label) {
    return h('button', { type: 'button', class: 'switch' + (on ? ' on' : ''), role: 'switch', 'aria-checked': on ? 'true' : 'false', 'aria-label': label, onclick: onClick }, h('i'));
  }
  function viewProfile() {
    const root = h('div', { class: 'view profile' });
    const st = S(), all = ML.allLessons(), doneN = all.filter((l) => st.done[l.id]).length;
    const scores = Object.values(st.done).map((d) => d.best), avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    root.append(h('div', { class: 'phead' }, h('div', { html: ML.mascot('happy', 84) }), h('div', {}, h('h2', {}, 'Your progress'), h('p', {}, `${doneN} of ${all.length} lessons completed`))));
    root.append(h('div', { class: 'stats' },
      [['bolt', st.xp, 'Total XP', 'var(--accent)'], ['flame', store.effStreak(), 'Day streak', 'var(--streak)'], ['star', st.best, 'Best streak', 'var(--amber)'], ['target', avg + '%', 'Avg. quiz score', 'var(--ok)']].map(([ic, v, t, col]) => h('div', { class: 'stat' }, h('span', { class: 'sic', style: 'color:' + col, html: ML.icon(ic, '', ic !== 'target') }), h('div', {}, h('b', {}, String(v)), h('small', {}, t))))));

    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push([ML.dayKey(d), d.toLocaleDateString('en', { weekday: 'short' })]); }
    const max = Math.max(st.settings.goal, ...days.map(([k]) => st.days[k] || 0));
    root.append(h('h2', { class: 'sec' }, 'Last 7 days'));
    root.append(h('div', { class: 'week' }, days.map(([k, t]) => { const v = st.days[k] || 0; return h('div', { class: 'wd' }, h('small', {}, String(v)), h('div', { class: 'wb' }, h('i', { class: v >= st.settings.goal ? 'hit' : '', style: `height:${Math.max(4, (v / max) * 100)}%` })), h('small', {}, t)); })));

    root.append(h('h2', { class: 'sec' }, 'Settings'));
    const row = (t, d, ctl) => h('div', { class: 'setrow' }, h('div', {}, h('b', {}, t), d ? h('small', {}, d) : null), ctl);
    root.append(h('div', { class: 'settings' },
      row('Appearance', null, seg([['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']], st.settings.theme, (v) => { st.settings.theme = v; store.save(); applyTheme(); render(); })),
      row('Daily XP goal', null, seg([[20, '20'], [40, '40'], [80, '80']], st.settings.goal, (v) => { st.settings.goal = v; store.save(); render(); })),
      row('Coding tasks', 'Turn off to skip the coding step in every lesson.', toggle(st.settings.coding !== false, () => { st.settings.coding = st.settings.coding === false; store.save(); render(); }, 'Coding tasks')),
      row('Coding language', null, seg([['js', 'JavaScript'], ['cpp', 'C++']], st.settings.codeLang, (v) => { st.settings.codeLang = v; store.save(); render(); })),
      row('Sound effects', 'Short tones on answers and lesson end.', toggle(st.settings.sound, () => { st.settings.sound = !st.settings.sound; store.save(); render(); }, 'Sound effects')),
      row('Unlock all lessons', 'Jump to any lesson, in any order.', toggle(st.settings.unlockAll, () => { st.settings.unlockAll = !st.settings.unlockAll; store.save(); render(); }, 'Unlock all lessons'))));

    root.append(h('h2', { class: 'sec' }, 'App and data'));
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    root.append(h('div', { class: 'settings' },
      standalone ? row('Installed', 'MLingo is running as an app.', null)
        : deferredInstall ? row('Install MLingo', 'Add it to your home screen and use it offline.', h('button', { class: 'btn small', onclick: async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; render(); } }, 'Install'))
          : row('Install MLingo', isIOS ? 'In Safari tap Share, then Add to Home Screen.' : 'Use your browser menu: Install app or Add to Home Screen. Needs https or localhost.', null),
      row('Export progress', 'Saves a JSON backup file.', h('button', { class: 'btn small ghost', onclick: exportData }, h('span', { html: ML.icon('download') }), 'Export')),
      row('Import progress', 'Restore from a backup file.', h('label', { class: 'btn small ghost filebtn' }, h('span', { html: ML.icon('upload') }), 'Import', h('input', { type: 'file', accept: 'application/json', onchange: importData }))),
      row('Reset everything', 'Deletes all progress and coins.', h('button', { class: 'btn small danger', onclick: () => { if (confirm('Delete all progress? This cannot be undone.')) { store.reset(); applyTheme(); render(); ML.toast('Progress reset.'); } } }, 'Reset'))));
    root.append(h('p', { class: 'endnote' }, 'Progress is stored on this device only. Coding tasks run in JavaScript or C++, entirely offline.'));
    return root;
  }
  function exportData() {
    const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(S(), null, 2)], { type: 'application/json' })), download: 'mlingo-progress-' + store.today() + '.json' });
    document.body.append(a); a.click(); a.remove();
  }
  function importData(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { store.replace(JSON.parse(r.result)); applyTheme(); render(); ML.toast('Progress imported.'); } catch (err) { ML.toast('That file is not a valid backup.'); } };
    r.readAsText(f);
  }

  /* ---------- router ---------- */
  function render() {
    if (document.body.classList.contains('in-player')) return;
    const route = (location.hash.replace('#/', '') || 'learn').split('/')[0];
    const view = { learn: viewLearn, shop: viewShop, profile: viewProfile }[route] ? route : 'learn';
    const scroll = window.scrollY;
    app.innerHTML = '';
    app.append(topbar(), h('main', { class: 'main' }, { learn: viewLearn, shop: viewShop, profile: viewProfile }[view]()), nav(view));
    document.title = 'MLingo';
    window.scrollTo(0, view === (render.last || view) ? scroll : 0);
    render.last = view;
  }
  ML.afterPlayer = render;
  window.addEventListener('hashchange', render);
  matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  applyTheme();
  render();
  ML.render = render;

  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
