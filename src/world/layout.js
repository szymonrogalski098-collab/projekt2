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
// miejsca misji rozdziałów 2–4
export const RIDGE_SITE = { x: 700, z: -2750, y: 2414, dir: 0 };        // wąska grań (lądowanie jedną płozą)
export const SUMMIT = { x: 2640, z: -2440, y: 3255, r: 9 };             // lądowisko przy szczycie
export const NORTH_MEADOW = { x: -485, z: -3400, y: 1733, r: 38 };      // łąka za przełęczą
export const GULLY = { x: 2375, z: -1300 };                              // żleb
export const LEDGE = { x: 2093, z: 1500, wallX: 2100 };                  // półka na ścianie (ściana na wschód od półki)
export const SERACS = { x: 2150, z: -2950, gap: 4.2, yaw: 0.5 };         // szczelina między serakami
export const LAKE_RESCUE = { x: -2300 };                                 // poszkodowany w jeziorze
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
    { id: 'mast', x: MAST.x, z: MAST.z, r: MAST.r + 10, blend: 90, ref: MAST },
    { id: 'summit', x: SUMMIT.x, z: SUMMIT.z, r: SUMMIT.r, blend: 40, ref: SUMMIT },
    { id: 'north', x: NORTH_MEADOW.x, z: NORTH_MEADOW.z, r: NORTH_MEADOW.r, blend: 80, ref: NORTH_MEADOW },
    { id: 'ridge', x: RIDGE_SITE.x, z: RIDGE_SITE.z, r: 0, blend: 0, ref: RIDGE_SITE, crest: { len: 16, w: 3.2, drop: 1.7, raise: 7 } },
    { id: 'seracs', x: SERACS.x, z: SERACS.z, r: 30, blend: 60, ref: SERACS },
    { id: 'cableA', x: CABLE.a.x, z: CABLE.a.z, r: 30, blend: 60, ref: CABLE.a },
    { id: 'cableB', x: CABLE.b.x, z: CABLE.b.z, r: 28, blend: 80, ref: CABLE.b },
  ];
}
