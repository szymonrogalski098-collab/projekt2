// Postęp kariery: localStorage (try/catch) + kod zapisu (base64 z sumą kontrolną).
const KEY = 'przelecz.save.v1';
export function newSave() {
  return { v: 1, missions: {}, money: 0, licence: 0, owned: ['wrobel'], hardcore: false, created: Date.now(), flights: 0, crashes: 0, flightTime: 0 };
}
export function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === 1) return { ...newSave(), ...s }; } catch { /* uszkodzony */ }
  return newSave();
}
export function storeSave(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; } }
function sum(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
export function exportCode(s) {
  const json = JSON.stringify(s);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return 'P2-' + sum(json) + '-' + b64;
}
export function importCode(code) {
  const m = /^P2-([a-z0-9]+)-(.+)$/.exec((code || '').trim().replace(/\s+/g, ''));
  if (!m) throw new Error('Nieprawidłowy format kodu');
  const json = decodeURIComponent(escape(atob(m[2])));
  if (sum(json) !== m[1]) throw new Error('Suma kontrolna się nie zgadza');
  const s = JSON.parse(json);
  if (!s || s.v !== 1) throw new Error('Nieznana wersja zapisu');
  return { ...newSave(), ...s };
}
// wynik misji -> zapis (najlepszy medal/czas)
export function recordResult(save, res) {
  save.flights++;
  if (!res.success && /Uderzenie|Zderzenie|Twarde przyziemienie|Wodowanie|Utrata/.test(res.reason || '')) save.crashes++;
  save.flightTime += res.time || 0;
  const m = save.missions[res.id] || { medal: 0, best: null, attempts: 0 };
  m.attempts++;
  if (res.success) {
    if (res.medal > m.medal) m.medal = res.medal;
    if (m.best === null || res.time < m.best) m.best = Math.round(res.time * 10) / 10;
  }
  save.missions[res.id] = m;
  return save;
}
