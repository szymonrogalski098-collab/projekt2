// Dane maszyn. Jednostki SI; kąty w radianach. Osie ciała: x w prawo, y w górę, -z do przodu.
const deg = Math.PI / 180;

export const AIRCRAFT = {
  wrobel: {
    id: 'wrobel', name: 'Wróbel', desc: 'Stary lekki tłokowiec. Mała bezwładność wirnika, słaby na wysokości.',
    price: 0,
    mass: { empty: 430, max: 690, pilot: 80 },
    fuel: { cap: 72, sfc: 0.30 / 3.6e6 }, // kg/J (0,30 kg/kWh)
    inertia: [720, 680, 260], // [pochylenie x, odchylenie y, przechylenie z]
    rotor: { R: 3.9, blades: 2, chord: 0.19, omega: 55.5, a: 5.7, cd0: 0.0082, thMin: -0.02, thMax: 0.265, J: 330, hubH: 1.55, hubK: 1500, lock: 4.6 },
    cyclic: { long: 8.5 * deg, lat: 7 * deg, tau: 0.05 },
    tail: { arm: 4.65, h: 0.55, R: 0.53, kT: 900, bias: 0.34, range: 0.62, kv: 55 },
    engine: { type: 'piston', P: 96e3, tau: 0.22, lapse: 1.2 },
    drag: [3.6, 5.5, 0.72], // CdA [bok x, pion y, przód z] m²
    fin: { area: 0.45, arm: 4.4, hs: 0.5, hsArm: 3.9 },
    skids: { x: 0.98, y: -1.22, zf: -1.15, zr: 1.05 },
    hook: [0, -0.95, 0.05],
    gear: { soft: 1.0, hard: 2.0, damage: 3.0, crash: 4.6 },
    rpm: { low: 0.95, stall: 0.82, over: 1.10 },
    vne: 52, // m/s (~101 kt)
    line: 12, lineMaxLoad: 250,
    stab: { kp: 2.2, kd: 0.75, ki: 0.35 },
    fuselage: [[0, -0.05, -1.55, 0.72], [0, 0.15, 3.2, 0.35], [0, 0.4, 4.9, 0.45]], // punkty zderzeniowe [x,y,z,r]
    cockpit: { eye: [-0.3, 0.55, -0.95] },
  },
  kos: {
    id: 'kos', name: 'Kos', desc: 'Lekki turbinowiec. Więcej mocy, większa bezwładność wirnika.',
    price: 180000,
    mass: { empty: 800, max: 1450, pilot: 80 },
    fuel: { cap: 280, sfc: 0.42 / 3.6e6 },
    inertia: [1900, 1750, 700],
    rotor: { R: 5.1, blades: 2, chord: 0.33, omega: 41.5, a: 5.7, cd0: 0.0095, thMin: -0.02, thMax: 0.27, J: 980, hubH: 1.75, hubK: 4000, lock: 5.2 },
    cyclic: { long: 9 * deg, lat: 7.5 * deg, tau: 0.06 },
    tail: { arm: 5.9, h: 0.75, R: 0.8, kT: 2200, bias: 0.33, range: 0.62, kv: 120 },
    engine: { type: 'turbine', P: 250e3, flat: 235e3, tau: 0.75, lapse: 0.8 },
    drag: [6.5, 9, 1.4],
    fin: { area: 0.8, arm: 5.6, hs: 0.9, hsArm: 5 },
    skids: { x: 1.15, y: -1.45, zf: -1.5, zr: 1.3 },
    hook: [0, -1.2, 0.1],
    gear: { soft: 1.0, hard: 2.0, damage: 3.0, crash: 4.8 },
    rpm: { low: 0.95, stall: 0.84, over: 1.08 },
    vne: 64,
    line: 18, lineMaxLoad: 600,
    stab: { kp: 2.4, kd: 0.8, ki: 0.35 },
    fuselage: [[0, -0.1, -2.0, 0.9], [0, 0.2, 3.8, 0.4], [0, 0.5, 6.2, 0.5]],
    cockpit: { eye: [-0.35, 0.65, -1.3] },
  },
};

export function derived(spec) {
  const r = spec.rotor;
  return {
    A: Math.PI * r.R * r.R,
    sigma: (r.blades * r.chord) / (Math.PI * r.R),
    tip: r.omega * r.R,
    Atr: Math.PI * spec.tail.R * spec.tail.R,
  };
}
