// Ustawienia gracza (localStorage z try/catch).
const KEY = 'przelecz.settings.v1';
export const DEFAULT_KEYS = {
  collUp: 'KeyW', collDown: 'KeyS', pedLeft: 'KeyA', pedRight: 'KeyD', precise: 'ShiftLeft', action: 'Space',
  camera: 'KeyC', restart: 'KeyR', center: 'KeyX', hud: 'KeyH', pause: 'Escape',
  cyclicFwd: 'ArrowUp', cyclicBack: 'ArrowDown', cyclicLeft: 'ArrowLeft', cyclicRight: 'ArrowRight',
};
export const KEY_LABELS = {
  collUp: 'Skok w górę', collDown: 'Skok w dół', pedLeft: 'Pedał lewy', pedRight: 'Pedał prawy', precise: 'Tryb precyzyjny', action: 'Hak / akcja',
  camera: 'Kamera', restart: 'Restart misji', center: 'Centrowanie drążka', hud: 'HUD wł./wył.', pause: 'Pauza',
  cyclicFwd: 'Drążek do przodu (klaw.)', cyclicBack: 'Drążek do tyłu (klaw.)', cyclicLeft: 'Drążek w lewo (klaw.)', cyclicRight: 'Drążek w prawo (klaw.)',
};
export const DEFAULTS = {
  quality: 'auto', fov: 62, reduceMotion: false,
  mouseSens: 1.0, invertY: false, expo: 0.25, stickSpring: false, keyCyclicRate: 1.2,
  padDeadzone: 0.12, padExpo: 0.3,
  assist: 'partial', units: 'metric', volume: 0.8,
  hud: true, hudVsBar: true, hudWind: true, hudHook: true, hudTarget: true, hudArrow: true, hudStick: true,
  keys: { ...DEFAULT_KEYS },
};
export function loadSettings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { s = {}; }
  return { ...DEFAULTS, ...s, keys: { ...DEFAULT_KEYS, ...(s.keys || {}) } };
}
export function saveSettings(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* brak dostępu */ } }
