import { Rng } from '../../engine/rng';
import type { Dir } from '../../config';
import type { MapDef } from '../types';
import { MapBuilder } from './builder';

const VEC: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function cavePlace(b: MapBuilder, id: string, look: string, px: number, py: number, facing: Dir, dist: number): void {
  const [dx, dy] = VEC[facing];
  const x = px - dx * dist, y = py - dy * dist;
  b.carve([[x, y], [px, py]], 2, 'cave_floor');
  b.d(x, y, null);
  for (let k = 0; k <= dist; k++) b.d(x + dx * k, y + dy * k, null);
  b.npc({ id, x, y, look, dir: facing, move: 'idle', trainer: { id, sight: dist + 1 } });
}

// ======================================================================================= HOLLOWDEEP (cave)
export function hollowdeep(): MapDef {
  const rng = new Rng(61);
  const b = new MapBuilder('hollowdeep', 'Hollowdeep', 44, 40, 'cave_wall');
  b.terrain = 'cave';
  const route: Array<[number, number]> = [[1, 30], [10, 30], [14, 26], [12, 20], [16, 14], [22, 10], [22, 1]];
  b.carve(route, 4, 'cave_floor');
  // side chambers for wild creatures and atmosphere
  const chamber = (cx: number, cy: number, rx: number, ry: number) => {
    for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) if (b.in(x, y) && ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && x > 0 && y > 0 && x < b.w - 1 && y < b.h - 1) b.g(x, y, 'cave_floor');
  };
  chamber(30, 28, 7, 5); chamber(34, 14, 6, 5); chamber(6, 12, 5, 5); chamber(28, 6, 5, 3); chamber(8, 36, 5, 2);
  b.carve([[14, 26], [23, 28], [30, 28]], 3, 'cave_floor'); b.carve([[22, 10], [30, 8], [34, 14]], 3, 'cave_floor'); b.carve([[12, 20], [8, 16], [6, 12]], 3, 'cave_floor'); b.carve([[10, 30], [8, 36]], 3, 'cave_floor');
  for (let y = 1; y < b.h - 1; y++) for (let x = 1; x < b.w - 1; x++) if (b.ground[y][x] === 'cave_floor' && (x * 3 + y * 5) % 7 === 0) b.g(x, y, 'cave_floor2');
  // decoration: rubble (encounters), puddles, stalagmites, crystals embedded in walls
  const floorNear = (x: number, y: number) => b.near(x, y, ['cave_floor', 'cave_floor2'], 1);
  for (let i = 0, n = 0; n < 28 && i < 600; i++) {
    const x = rng.int(2, b.w - 3), y = rng.int(2, b.h - 3);
    if (b.ground[y][x].startsWith('cave_floor') && !b.near(x, y, ['cave_wall'], 0)) { b.g(x, y, rng.chance(0.75) ? 'rubble' : 'puddle'); n++; }
  }
  // wide rubble bands (wild encounters) inside chambers
  for (const [cx, cy] of [[30, 28], [34, 14], [6, 12], [28, 6]] as const) for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 3; x <= cx + 3; x++) if (b.ground[y]?.[x]?.startsWith('cave_floor')) b.g(x, y, 'rubble');
  for (let i = 0, n = 0; n < 24 && i < 800; i++) {
    const x = rng.int(2, b.w - 3), y = rng.int(2, b.h - 3);
    if (b.ground[y][x] === 'cave_wall' && floorNear(x, y) && !b.deco[y][x]) { b.d(x, y, 'crystal'); n++; }
  }
  for (let i = 0, n = 0; n < 16 && i < 600; i++) {
    const x = rng.int(3, b.w - 4), y = rng.int(3, b.h - 4);
    if (b.ground[y][x] === 'cave_floor2' && !b.near(x, y, ['leaf_path'], 0) && !b.near(x, y, route.length ? ['cave_wall'] : [], 1)) { b.d(x, y, 'stalagmite'); n++; }
  }
  // keep the main route clear of obstacles
  b.carve(route, 2, 'cave_floor', 'g');
  for (const [x, y] of route) b.fillDeco(x - 1, y - 1, 3, 3, null);
  b.sign(3, 29, ['HOLLOWDEEP', 'Crystals light the way.', 'Orrin keeps the hall at the far end.']);
  b.warp(0, 30, 'mistwood', 42, 30, 'left').warp(0, 31, 'mistwood', 42, 31, 'left');
  b.warp(22, 0, 'hollow_hall', 11, 18, 'up').warp(23, 0, 'hollow_hall', 12, 18, 'up');
  b.g(1, 30, 'cave_floor'); b.g(1, 31, 'cave_floor'); b.g(0, 30, 'cave_floor'); b.g(0, 31, 'cave_floor');
  b.g(22, 0, 'cave_floor'); b.g(23, 0, 'cave_floor');
  b.d(0, 30, null); b.d(0, 31, null);
  cavePlace(b, 'ash', 'hiker', 14, 27, 'left', 3);
  cavePlace(b, 'jun', 'scout', 12, 19, 'right', 3);
  cavePlace(b, 'rue', 'mystic', 20, 11, 'down', 3);
  b.npc({ id: 'ilsa_hd', x: 4, y: 28, look: 'ilsa', dir: 'right', move: 'look', cond: { all: [{ flag: 'quest.rival2' }, { notFlag: 'quest.done' }] }, dialogue: 'ilsa' });
  b.spawn = { x: 3, y: 30, dir: 'right' };
  return b.build();
}

// ======================================================================================= HOLLOWDEEP HALL (gym 2)
export function hollowHall(): MapDef {
  const b = new MapBuilder('hollow_hall', 'Hollowdeep Hall', 24, 20, 'gym_floor', true);
  b.terrain = 'gym';
  for (let x = 0; x < b.w; x++) { b.g(x, 0, 'gym_wall'); b.g(x, 1, 'gym_wall'); b.g(x, b.h - 1, 'gym_wall'); }
  for (let y = 0; y < b.h; y++) { b.g(0, y, 'gym_wall'); b.g(b.w - 1, y, 'gym_wall'); }
  for (let x = 2; x < b.w - 2; x += 4) b.d(x, 1, 'banner');
  b.g(11, 0, 'gym_floor'); b.g(12, 0, 'gym_floor'); b.g(11, 1, 'gym_floor'); b.g(12, 1, 'gym_floor');
  b.g(11, 19, 'mat'); b.g(12, 19, 'mat');
  for (const [x, y] of [[4, 5], [19, 5], [4, 10], [19, 10], [4, 15], [19, 15], [8, 12], [15, 12]]) b.d(x, y, 'gym_pillar');
  for (const [x, y] of [[2, 3], [21, 3], [2, 17], [21, 17]]) b.d(x, y, 'crystal');
  b.fill(9, 3, 6, 3, 'rug');
  b.warp(11, 19, 'hollowdeep', 22, 1, 'down').warp(12, 19, 'hollowdeep', 23, 1, 'down');
  b.warp(11, 0, 'lumen_chamber', 7, 12, 'up').warp(12, 0, 'lumen_chamber', 8, 12, 'up');
  b.trigger({ x: 11, y: 1, cond: { notFlag: 'quest.lumen_open' }, dialogue: 'need_lumen', push: 'down' });
  b.trigger({ x: 12, y: 1, cond: { notFlag: 'quest.lumen_open' }, dialogue: 'need_lumen', push: 'down' });
  b.npc({ id: 'orrin', x: 11, y: 3, look: 'orrin', dir: 'down', move: 'idle', dialogue: 'orrin' });
  b.npc({ id: 'kade', x: 7, y: 14, look: 'mystic', dir: 'right', move: 'idle', trainer: { id: 'kade', sight: 5 } });
  b.npc({ id: 'lyra', x: 17, y: 8, look: 'scout', dir: 'left', move: 'idle', trainer: { id: 'lyra', sight: 5 } });
  b.spawn = { x: 11, y: 17, dir: 'up' };
  return b.build();
}

// ======================================================================================= LUMEN CHAMBER
export function lumenChamber(): MapDef {
  const b = new MapBuilder('lumen_chamber', 'Lumen Chamber', 16, 14, 'cave_floor');
  b.terrain = 'cave';
  for (let x = 0; x < b.w; x++) { b.g(x, 0, 'cave_wall'); b.g(x, b.h - 1, 'cave_wall'); }
  for (let y = 0; y < b.h; y++) { b.g(0, y, 'cave_wall'); b.g(b.w - 1, y, 'cave_wall'); }
  for (const [x, y] of [[1, 1], [14, 1], [1, 12], [14, 12], [2, 6], [13, 6]]) b.d(x, y, 'crystal');
  for (const [x, y] of [[7, 4], [8, 4], [7, 5], [8, 5], [6, 5], [9, 5]]) b.d(x, y, 'crystal');
  b.g(7, 13, 'cave_floor'); b.g(8, 13, 'cave_floor');
  b.warp(7, 13, 'hollow_hall', 11, 2, 'down').warp(8, 13, 'hollow_hall', 12, 2, 'down');
  b.npc({ id: 'jace_lc', x: 5, y: 9, look: 'jace', dir: 'right', move: 'idle', cond: { notFlag: 'quest.done' }, lines: ['...'] });
  b.trigger({ x: 7, y: 10, cond: { notFlag: 'quest.done' }, dialogue: 'lumen' });
  b.trigger({ x: 8, y: 10, cond: { notFlag: 'quest.done' }, dialogue: 'lumen' });
  b.spawn = { x: 7, y: 11, dir: 'up' };
  return b.build();
}

// ======================================================================================= DATE SCENES
function dateBase(id: string, name: string, w: number, h: number, base: string, indoor = false): MapBuilder {
  const b = new MapBuilder(id, name, w, h, base, indoor);
  b.autorun = id;
  return b;
}
export function dateMira(): MapDef {
  const b = dateBase('date_mira', 'Emberwick Pond', 14, 10, 'grass');
  b.treeBorder();
  b.fill(3, 2, 7, 4, 'water');
  b.d(2, 6, 'bench'); b.d(10, 6, 'lantern'); b.d(3, 1, 'flowers_p'); b.d(11, 4, 'flowers_y');
  b.fill(4, 6, 5, 2, 'path');
  b.npc({ id: 'mira', x: 7, y: 7, look: 'shopkeeper', dir: 'left', move: 'idle', lines: [] });
  b.spawn = { x: 6, y: 7, dir: 'right' };
  return b.build();
}
export function dateRhea(): MapDef {
  const b = dateBase('date_rhea', 'East Cliffs', 14, 10, 'grass');
  b.treeBorder();
  for (let x = 2; x < 12; x++) { b.g(x, 1, 'cliff_top'); b.g(x, 2, 'cliff'); }
  b.fill(4, 4, 6, 3, 'grass2'); b.d(10, 6, 'bench'); b.d(3, 5, 'flowers_y');
  b.npc({ id: 'rhea', x: 7, y: 5, look: 'rhea', dir: 'left', move: 'idle', lines: [] });
  b.spawn = { x: 6, y: 5, dir: 'right' };
  return b.build();
}
export function dateIlsa(): MapDef {
  const b = dateBase('date_ilsa', 'Starlit Clearing', 14, 10, 'forest_floor');
  b.terrain = 'forest';
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (x === 0 || y === 0 || x === b.w - 1 || y === b.h - 1) b.d(x, y, 'mushroom');
  for (const [x, y] of [[2, 2], [11, 3], [3, 7], [10, 7], [6, 2], [8, 8]]) b.d(x, y, 'glow_flower');
  b.d(9, 4, 'telescope'); b.d(3, 4, 'log');
  b.npc({ id: 'ilsa', x: 7, y: 5, look: 'ilsa', dir: 'left', move: 'idle', lines: [] });
  b.spawn = { x: 6, y: 5, dir: 'right' };
  return b.build();
}
export function dateOdette(): MapDef {
  const b = dateBase('date_odette', 'Moth & Mug (After Hours)', 11, 8, 'cafe_floor', true);
  for (let x = 0; x < b.w; x++) { b.g(x, 0, 'in_wall'); b.d(x, 0, x === 2 || x === 8 ? 'in_window' : 'in_wall'); }
  for (let y = 0; y < b.h; y++) { b.g(0, y, 'void'); b.g(b.w - 1, y, 'void'); }
  b.fill(0, b.h - 1, b.w, 1, 'void');
  for (const x of [3, 4, 6, 7]) b.d(x, 2, 'counter');
  b.d(2, 2, 'coffee'); b.d(8, 2, 'cake_case'); b.d(2, 5, 'cafe_table'); b.d(8, 5, 'cafe_table'); b.d(9, 1, 'plant');
  b.npc({ id: 'odette', x: 5, y: 3, look: 'odette', dir: 'down', move: 'idle', lines: [] });
  b.spawn = { x: 5, y: 4, dir: 'up' };
  return b.build();
}
