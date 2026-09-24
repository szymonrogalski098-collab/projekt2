// Kontekst świata dla symulacji (wspólny dla gry i testów): teren, drzewa, obiekty, kolizje, woda.
import { placeTrees } from '../world/trees.js';
import { buildObjects, addObjectColliders } from '../world/objects.js';
import { CollisionWorld } from '../sim/collision.js';
import { RESERVOIR } from '../world/layout.js';
import { sideValley } from '../world/terrainGen.js';

export function waterTest(x, z) { return x < RESERVOIR.damX - 4 && x > -5200 && Math.abs(z - sideValley(x)) < 520; }

export function buildContext(terrain) {
  const trees = placeTrees(terrain);
  const objects = buildObjects(terrain);
  const world = new CollisionWorld(terrain, trees);
  addObjectColliders(world, objects);
  world.water = { level: RESERVOIR.level, test: waterTest };
  return { terrain, trees, objects, world };
}
