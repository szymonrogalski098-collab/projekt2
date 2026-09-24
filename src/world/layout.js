// Układ regionu: stałe miejsc i funkcje osi doliny. Współdzielone przez generator terenu, symulację, misje i render.
// Układ współrzędnych: x = wschód, z = południe, y = wysokość n.p.m. [m].
export const WORLD_SEED = 20260924;
export const MAP = { size: 12288, n: 3072, play: 4096 }; // teren 12,3 km (4 m/px), obszar lotów ±4096 m

export const valleyX = z => -150 + 380 * Math.sin((z + 600) / 1900);
export function valleyFloor(z) {
  if (z > -1200) return 860 + (4096 - Math.min(z, 6200)) * 0.027;
  if (z > -2650) {
    const t = (-1200 - z) / 1450;
    const s = t * t * (3 - 2 * t);
    return 1003.6 + (2050 - 1003.6) * s;
  }
  return Math.max(1250, 2050 - (-2650 - z) * 0.42);
}
export const valleyHalfWidth = z => 420 + 260 * Math.min(1, Math.max(0, (z + 1500) / 4000));

export const PASS = { x: -485, z: -2650, y: 2050 };

export const BASE = { x: 470, z: 2480, y: 0, heading: 0 }; // y ustalane z terenu
export const TOWN = { x: 120, z: 2230, r: 330 };
export const RESERVOIR = { level: 1040, damX: -880, damZ: 860, damHalfLen: 190, crest: 1050 };
export const MEADOW = { x: -440, z: -1020, y: 999, r: 42 };             // polana w lesie
export const HALA = { x: 1900, z: 700, y: 1590, r: 420 };                // hala (łąki alpejskie)
export const HUT = { x: 2230, z: -650, y: 1764, r: 55 };                // schronisko
export const SLOPE_SITE = { x: -1650, z: 1900, y: 1330, r: 55, slopeDeg: 10, dir: 0.3 }; // lądowisko na zboczu
export const MAST = { x: 2750, z: 1290, y: 2015, r: 24 };
export const CABLE = { a: { x: 700, z: 1520 }, b: { x: 2350, z: -150, y: 1905 }, pylons: 3 };
export const GLACIER = { x: 2300, z: -3200, r: 950, y: 2320 };
export const RIDGE_Z = -2650;

// Płaskie „stemple” (lądowiska) nakładane na końcu generacji – w tych miejscach teren jest idealnie płaski.
// y: 'auto' = średnia wysokość terenu w promieniu r (po erozji).
export function stamps() {
  return [
    { id: 'base', x: BASE.x, z: BASE.z, r: 150, blend: 120, ref: BASE },
    { id: 'town', x: TOWN.x, z: TOWN.z, r: TOWN.r, blend: 200, soft: true },
    { id: 'meadow', x: MEADOW.x, z: MEADOW.z, r: MEADOW.r, blend: 60, ref: MEADOW },
    { id: 'hut', x: HUT.x, z: HUT.z, r: HUT.r, blend: 220, ref: HUT },
    { id: 'slope', x: SLOPE_SITE.x, z: SLOPE_SITE.z, r: SLOPE_SITE.r, blend: 70, ref: SLOPE_SITE, plane: { deg: SLOPE_SITE.slopeDeg, dir: SLOPE_SITE.dir } },
    { id: 'mast', x: MAST.x, z: MAST.z, r: MAST.r, blend: 90, ref: MAST },
    { id: 'cableA', x: CABLE.a.x, z: CABLE.a.z, r: 30, blend: 60, ref: CABLE.a },
    { id: 'cableB', x: CABLE.b.x, z: CABLE.b.z, r: 28, blend: 80, ref: CABLE.b },
  ];
}
