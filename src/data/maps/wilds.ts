import { Rng } from '../../engine/rng';
import type { Dir } from '../../config';
import type { MapDef } from '../types';
import { MapBuilder } from './builder';
import { scatter } from './towns';

const VEC: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/** Place a trainer `dist` tiles away from a path tile, looking at it, clearing decoration around them. */
function trainerAt(b: MapBuilder, id: string, look: string, px: number, py: number, facing: Dir, dist: number, floor: string): void {
  const [dx, dy] = VEC[facing];
  const x = px - dx * dist, y = py - dy * dist;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { b.d(x + i, y + j, null); if (b.in(x + i, y + j) && b.ground[y + j][x + i] === 'tall_grass') b.g(x + i, y + j, floor); }
  // also clear the line of sight so nothing blocks the view
  for (let k = 1; k <= dist; k++) b.d(x + dx * k, y + dy * k, null);
  b.npc({ id, x, y, look, dir: facing, move: 'idle', trainer: { id, sight: dist + 1 } });
}

// ======================================================================================= ROUTE 1
export function route1(): MapDef {
  const rng = new Rng(31);
  const b = new MapBuilder('route1', 'Route 1', 22, 36, 'grass');
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if ((x * 5 + y * 11) % 6 === 0) b.g(x, y, 'grass2');
  b.treeBorder();
  b.fillDeco(10, 34, 2, 2, null); b.fillDeco(10, 0, 2, 2, null);
  b.carve([[10, 35], [10, 28], [11, 22], [10, 16], [11, 9], [10, 0]], 2, 'path');
  b.fill(3, 22, 5, 8, 'tall_grass'); b.fill(14, 8, 6, 8, 'tall_grass'); b.fill(3, 6, 5, 6, 'tall_grass'); b.fill(13, 24, 6, 6, 'tall_grass');
  b.carve([[9, 30], [4, 30]], 1, 'path');
  b.fill(3, 30, 3, 2, 'grass');
  scatter(b, rng, 'flowers_y', 8); scatter(b, rng, 'flowers_p', 6); scatter(b, rng, 'bush', 5); scatter(b, rng, 'rock', 3);
  for (let y = 3; y < 33; y += 7) { b.tree(1 + (y % 3), y); b.tree(18 - (y % 3), y + 1); }
  b.d(5, 30, null); b.d(4, 30, null);
  b.pickup({ x: 4, y: 30, item: 'recipe_book', flag: 'item.recipe_book', text: "Found Gran's Recipe Book!" });
  b.pickup({ x: 18, y: 14, item: 'potion', qty: 2, flag: 'item.r1_potion' });
  b.sign(9, 33, ['ROUTE 1', 'Emberwick <- -> Brindlemoor', 'Watch for tall grass!']);
  b.warp(10, 35, 'emberwick', 15, 1, 'down').warp(11, 35, 'emberwick', 16, 1, 'down');
  b.warp(10, 0, 'brindlemoor', 16, 28, 'up').warp(11, 0, 'brindlemoor', 17, 28, 'up');
  trainerAt(b, 'timo', 'kid', 10, 26, 'left', 3, 'grass');
  trainerAt(b, 'pip', 'lass', 10, 14, 'right', 3, 'grass');
  trainerAt(b, 'dov', 'scout', 11, 6, 'left', 3, 'grass');
  b.npc({ id: 'hiker', x: 13, y: 20, look: 'hiker', dir: 'left', move: 'wander', radius: 2, lines: ['Tall grass hides creatures. Walk through it a lot, and something will jump out.', 'Low on HP? The Care Hut in Emberwick heals for free.'] });
  b.spawn = { x: 10, y: 33, dir: 'up' };
  return b.build();
}

// ======================================================================================= ROUTE 2
export function route2(): MapDef {
  const rng = new Rng(41);
  const b = new MapBuilder('route2', 'Route 2', 40, 20, 'grass');
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if ((x * 3 + y * 7) % 5 === 0) b.g(x, y, 'grass2');
  b.treeBorder();
  b.fillDeco(0, 9, 2, 2, null); b.fillDeco(38, 9, 2, 2, null);
  // cliff band to the north with a ramp at x=20..21 leading to a ledge
  for (let x = 2; x < 38; x++) { b.g(x, 5, 'cliff'); b.g(x, 4, 'cliff_top'); }
  b.fill(20, 4, 2, 2, 'path');
  b.fill(10, 2, 20, 2, 'grass'); b.fill(9, 1, 1, 4, 'grass'); b.fill(30, 1, 1, 4, 'grass');
  b.carve([[1, 9], [12, 9], [16, 11], [26, 11], [30, 8], [38, 9]], 2, 'path');
  b.carve([[20, 6], [20, 9]], 2, 'path');
  b.fill(4, 13, 8, 4, 'tall_grass'); b.fill(28, 13, 8, 4, 'tall_grass'); b.fill(3, 6, 6, 3, 'tall_grass'); b.fill(31, 6, 6, 2, 'tall_grass');
  scatter(b, rng, 'flowers_y', 6); scatter(b, rng, 'bush', 5); scatter(b, rng, 'rock', 6);
  for (const x of [12, 14, 16, 18, 24, 26, 28]) b.d(x, 3, 'fence');
  b.pickup({ x: 25, y: 2, item: 'lucky_band', flag: 'item.lucky_band', text: 'Found a faded blue wristband!' });
  b.pickup({ x: 14, y: 2, item: 'super_potion', flag: 'item.r2_super' });
  b.sign(3, 10, ['ROUTE 2', '<- Brindlemoor   Mistwood ->', 'Cliff paths ahead.']);
  b.warp(0, 9, 'brindlemoor', 34, 14, 'left').warp(0, 10, 'brindlemoor', 34, 15, 'left');
  b.warp(39, 9, 'mistwood', 1, 20, 'right').warp(39, 10, 'mistwood', 1, 21, 'right');
  trainerAt(b, 'hana', 'hiker', 12, 9, 'down', 3, 'grass');
  trainerAt(b, 'bo', 'hiker', 22, 11, 'up', 3, 'grass');
  trainerAt(b, 'nell', 'lass', 33, 9, 'down', 3, 'grass');
  b.npc({ id: 'r2hiker', x: 7, y: 11, look: 'villager_m', dir: 'right', move: 'wander', radius: 2, lines: ['A faded band? Sounds like something one would lose on the ridge path. Try the ledge north of the ramp.'] });
  b.spawn = { x: 3, y: 9, dir: 'right' };
  return b.build();
}

// ======================================================================================= MISTWOOD
export function mistwood(): MapDef {
  const rng = new Rng(51);
  const b = new MapBuilder('mistwood', 'Mistwood', 44, 40, 'forest_floor');
  b.terrain = 'forest';
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if ((x * 7 + y * 3) % 5 === 0) b.g(x, y, 'forest_floor2');
  const route: Array<[number, number]> = [[1, 20], [8, 20], [12, 24], [18, 26], [22, 22], [26, 18], [32, 18], [36, 22], [40, 28], [42, 30]];
  b.carve(route, 2, 'leaf_path');
  b.fill(0, 20, 2, 2, 'leaf_path'); b.fill(42, 30, 2, 2, 'leaf_path');
  // dense dark forest everywhere the path and clearings aren't
  const clear = (x: number, y: number) => b.near(x, y, 'leaf_path', 2) || (x > 24 && x < 34 && y > 13 && y < 21) || b.near(x, y, 'tall_grass', 1);
  // dark grass patches hugging the path
  for (let i = 0; i < 14; i++) {
    const [px, py] = route[rng.int(0, route.length - 2)];
    const cx = px + rng.int(-4, 4), cy = py + rng.int(-4, 4), r = rng.int(1, 2);
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r - 1; x <= cx + r + 1; x++) if (b.in(x, y) && b.ground[y][x].startsWith('forest_floor') && !b.near(x, y, 'leaf_path', 0) && x > 1 && y > 1 && x < b.w - 2 && y < b.h - 2) b.g(x, y, 'dark_grass');
  }
  for (let y = 0; y < b.h; y += 2) for (let x = 0; x < b.w; x += 2) {
    const edge = x === 0 || y === 0 || x >= b.w - 2 || y >= b.h - 2;
    const free = [0, 1].every((j) => [0, 1].every((i) => !clear(x + i, y + j)));
    if ((edge || (free && rng.chance(0.8))) && !(b.ground[y][x] === 'dark_grass')) {
      if (edge && ((x === 0 && (y === 20 || y === 21)) || (x >= b.w - 2 && (y === 30 || y === 31)))) continue;
      b.dtree(x, y);
    }
  }
  // open the west/east gates in the border
  b.fillDeco(0, 19, 2, 4, null); b.fillDeco(42, 29, 2, 4, null);
  for (let y = 19; y <= 22; y++) for (let x = 0; x < 2; x++) if (b.ground[y][x] !== 'leaf_path') b.g(x, y, 'forest_floor');
  for (let y = 29; y <= 32; y++) for (let x = 42; x < 44; x++) if (b.ground[y][x] !== 'leaf_path') b.g(x, y, 'forest_floor');
  scatter(b, rng, 'mushroom', 14, ['forest_floor', 'forest_floor2']); scatter(b, rng, 'fern', 30, ['forest_floor', 'forest_floor2']); scatter(b, rng, 'log', 6, ['forest_floor', 'forest_floor2']);
  scatter(b, rng, 'glow_flower', 16, ['forest_floor', 'forest_floor2']);
  // Ilsa's camp clearing
  b.fill(28, 14, 6, 5, 'forest_floor2'); for (let y = 14; y < 19; y++) for (let x = 28; x < 34; x++) b.d(x, y, null);
  b.d(28, 14, 'lab_bench'); b.d(29, 14, 'machine'); b.d(33, 14, 'telescope');
  b.carve([[36, 22], [40, 12]], 2, 'leaf_path').clearLine([[36, 22], [40, 12]], 3);
  for (let y = 11; y < 14; y++) for (let x = 39; x < 42; x++) { b.d(x, y, null); if (b.ground[y][x] !== 'leaf_path') b.g(x, y, 'forest_floor2'); }
  b.d(40, 12, null); b.pickup({ x: 40, y: 12, item: 'tea_leaves', flag: 'item.tea_leaves', text: 'Found shimmering Glowcap leaves!' });
  b.sign(3, 22, ['MISTWOOD', 'Stay on the leaf path.', 'Fog gathers after dusk.']);
  b.sign(41, 28, ['HOLLOWDEEP ->', 'Cave mouth ahead. Bring light.']);
  b.warp(0, 20, 'route2', 38, 9, 'left').warp(0, 21, 'route2', 38, 10, 'left');
  b.warp(43, 30, 'hollowdeep', 1, 30, 'right').warp(43, 31, 'hollowdeep', 1, 31, 'right');
  b.triggerLine('col', 5, { cond: { all: [{ flag: 'badge.cinder' }, { notFlag: 'quest.rival2' }] }, dialogue: 'rival2' });
  b.triggerLine('col', 2, { cond: { notFlag: 'badge.cinder' }, dialogue: 'need_badge', push: 'left' });
  b.npc({ id: 'jace_mw', x: 6, y: 19, look: 'jace', dir: 'down', move: 'idle', cond: { all: [{ flag: 'badge.cinder' }, { notFlag: 'quest.rival2' }] }, dialogue: 'rival2' });
  b.npc({ id: 'ilsa_mw', x: 31, y: 16, look: 'ilsa', dir: 'down', move: 'look', cond: { all: [{ flag: 'quest.mistwood_open' }, { notFlag: 'quest.rival2' }] }, dialogue: 'ilsa' });
  trainerAt(b, 'fen', 'mystic', 16, 26, 'up', 3, 'forest_floor');
  trainerAt(b, 'lark', 'scout', 24, 20, 'down', 3, 'forest_floor');
  trainerAt(b, 'wick', 'mystic', 38, 25, 'left', 3, 'forest_floor');
  b.spawn = { x: 3, y: 20, dir: 'right' };
  return b.build();
}
