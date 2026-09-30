import { Rng } from '../../engine/rng';
import type { MapDef } from '../types';
import { MapBuilder, room } from './builder';

/** Scatter a decorative tile on free grass tiles. */
export function scatter(b: MapBuilder, rng: Rng, tile: string, count: number, ground: string[] = ['grass', 'grass2']): void {
  for (let n = 0, tries = 0; n < count && tries < count * 40; tries++) {
    const x = rng.int(1, b.w - 2), y = rng.int(1, b.h - 2);
    if (!ground.includes(b.ground[y][x]) || b.deco[y][x] || b.near(x, y, ['path', 'cobble', 'cobble2'], 1)) continue;
    b.d(x, y, tile); n++;
  }
}

// ======================================================================================= EMBERWICK
export function emberwick(): MapDef {
  const rng = new Rng(11);
  const b = new MapBuilder('emberwick', 'Emberwick', 32, 26, 'grass');
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if ((x * 7 + y * 13) % 5 === 0) b.g(x, y, 'grass2');
  b.treeBorder();
  b.fillDeco(14, 0, 4, 2, null); b.fill(15, 0, 2, 2, 'path');
  // streets: north road, main street, lower street and connectors
  b.pathV(15, 2, 14, 2).pathH(4, 15, 24, 2).pathH(4, 21, 24, 2).pathV(12, 17, 4, 2);
  b.pathV(7, 11, 4).pathV(23, 11, 4);
  // pond
  b.fill(25, 3, 4, 5, 'water'); b.fill(24, 4, 1, 3, 'water'); b.fill(29, 4, 1, 3, 'water');
  // buildings
  const home = b.house(5, 8, 5, 'r', 2);
  const shop = b.house(21, 8, 5, 'r', 2);
  const care = b.house(5, 18, 5, 'b', 2);
  const elder = b.house(21, 18, 5, 'b', 2);
  b.warp(home.x, home.y, 'house_player', 5, 6, 'up');
  b.warp(shop.x, shop.y, 'house_neighbor', 4, 5, 'up');
  b.warp(care.x, care.y, 'care_center', 5, 6, 'up');
  b.warp(elder.x, elder.y, 'elder_house', 5, 6, 'up');
  // decor
  b.sign(9, 13, ['EMBERWICK', 'A quiet town where', 'every journey begins.']);
  b.sign(13, 4, ['ROUTE 1 -> north', 'Brindlemoor lies beyond.']);
  b.sign(9, 20, ['CARE HUT', 'Free healing for travellers.']);
  b.sign(19, 20, ["ELDER'S LAB", 'Visitors welcome. Knock first.']);
  b.d(12, 13, 'lamp_top'); b.d(12, 14, 'lamp_base'); b.d(19, 13, 'lamp_top'); b.d(19, 14, 'lamp_base');
  b.fill(26, 12, 4, 3, 'tall_grass');
  b.d(10, 24, 'bush'); b.d(28, 19, 'rock'); b.d(2, 19, 'rock'); b.d(29, 22, 'bush');
  scatter(b, rng, 'flowers_y', 6); scatter(b, rng, 'flowers_p', 6); scatter(b, rng, 'bush', 3);
  // story gates
  b.trigger({ x: 15, y: 2, cond: { notFlag: 'starter.chosen' }, dialogue: 'need_starter', push: 'down' });
  b.trigger({ x: 16, y: 2, cond: { notFlag: 'starter.chosen' }, dialogue: 'need_starter', push: 'down' });
  b.trigger({ x: 15, y: 2, cond: { all: [{ flag: 'starter.chosen' }, { notFlag: 'quest.rival1' }] }, dialogue: 'need_starter', push: 'down' });
  b.trigger({ x: 16, y: 2, cond: { all: [{ flag: 'starter.chosen' }, { notFlag: 'quest.rival1' }] }, dialogue: 'need_starter', push: 'down' });
  b.warp(15, 0, 'route1', 10, 34, 'up').warp(16, 0, 'route1', 11, 34, 'up');
  // people
  b.npc({ id: 'kid1', x: 12, y: 12, look: 'kid', dir: 'down', move: 'wander', radius: 3, dialogue: 'kid' });
  b.npc({ id: 'vf1', x: 19, y: 17, look: 'villager_f', dir: 'up', move: 'wander', radius: 2, lines: ['The pond glitters so nicely in the sun.', 'Fireflies come out in the evening. Dreamy.'] });
  b.npc({ id: 'vm1', x: 26, y: 17, look: 'villager_m', dir: 'left', move: 'idle', lines: ['Hold SHIFT to run. Your legs will thank you for the exercise!', 'Press M for the menu. Save often!'] });
  b.spawn = { x: 7, y: 12, dir: 'down' };
  return b.build();
}

// ======================================================================================= BRINDLEMOOR
export function brindlemoor(): MapDef {
  const rng = new Rng(22);
  const b = new MapBuilder('brindlemoor', 'Brindlemoor', 36, 30, 'grass');
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if ((x * 5 + y * 9) % 7 === 0) b.g(x, y, 'grass2');
  b.treeBorder();
  b.fillDeco(16, 28, 2, 2, null); b.fillDeco(34, 14, 2, 2, null);
  // avenue, plaza streets, connectors
  b.fill(16, 6, 2, 24, 'cobble'); b.fill(4, 14, 30, 2, 'cobble2'); b.fill(4, 22, 28, 2, 'cobble2');
  b.fill(7, 10, 1, 4, 'cobble'); b.fill(26, 10, 1, 4, 'cobble');
  b.fill(34, 14, 2, 2, 'cobble2');
  // gym (big, blue roof)
  const gym = b.house(13, 3, 8, 'b', 4);
  b.warp(gym.x, gym.y, 'brindle_gym', 7, 15, 'up');
  const mart = b.house(5, 7, 5, 'g', 2);
  b.warp(mart.x, mart.y, 'brindle_mart', 4, 6, 'up');
  const lab = b.house(24, 7, 6, 'g', 2);
  b.warp(lab.x, lab.y, 'brindle_lab', 5, 6, 'up');
  const care = b.house(5, 19, 5, 'b', 2);
  b.warp(care.x, care.y, 'brindle_care', 5, 6, 'up');
  const cafe = b.house(24, 19, 6, 'r', 2);
  b.warp(cafe.x, cafe.y, 'brindle_cafe', 5, 6, 'up');
  // decorative homes with no doors, plus a fountain
  const cozy = b.house(31, 7, 3, 'g', 1);
  b.warp(cozy.x, cozy.y, 'brindle_house', 4, 5, 'up');
  b.fill(32, 10, 1, 4, 'cobble');
  b.d(9, 26, 'bush');
  b.fill(10, 10, 3, 2, 'water'); b.d(9, 12, 'bench'); b.d(13, 12, 'bench');
  b.fill(20, 10, 3, 2, 'water'); b.d(19, 12, 'bench'); b.d(23, 12, 'bench');
  for (const y of [8, 12, 18, 26]) { b.d(15, y, 'lantern'); b.d(18, y, 'lantern'); }
  b.sign(14, 6, ['BRINDLEMOOR GYM', 'Leader: Rhea', 'Fist-type specialist. No quitters.']);
  b.sign(9, 10, ['BRINDLEMOOR MART', 'Supplies for the road.']);
  b.sign(30, 10, ["DR. VARGA'S LAB", 'Field research. Please do not tap the glass.']);
  b.sign(9, 22, ['CARE HUT', 'Rest your partners.']);
  b.sign(31, 22, ['MOTH & MUG CAFE', 'Leave a story on the wall.']);
  b.warp(16, 29, 'route1', 10, 1, 'down').warp(17, 29, 'route1', 11, 1, 'down');
  b.warp(35, 14, 'route2', 1, 9, 'right').warp(35, 15, 'route2', 1, 10, 'right');
  b.trigger({ x: 33, y: 14, cond: { notFlag: 'badge.cinder' }, dialogue: 'need_badge', push: 'left' });
  b.trigger({ x: 33, y: 15, cond: { notFlag: 'badge.cinder' }, dialogue: 'need_badge', push: 'left' });
  b.npc({ id: 'guard_e', x: 32, y: 13, look: 'scout', dir: 'down', move: 'idle', lines: ['East of here, the road climbs toward Mistwood. The gym leader asks that only badge holders pass.'] });
  b.npc({ id: 'bm1', x: 19, y: 18, look: 'villager_f', dir: 'left', move: 'wander', radius: 2, lines: ['Odette\'s lemon cake is worth the walk from anywhere in the region.', 'Rhea buys three slices, then pretends they are for the trainers.'] });
  b.npc({ id: 'bm2', x: 12, y: 17, look: 'villager_m', dir: 'right', move: 'wander', radius: 2, lines: ['The glow has been weaker this season. Even the fountain dims at night.'] });
  b.npc({ id: 'bm3', x: 28, y: 16, look: 'kid', dir: 'up', move: 'wander', radius: 2, lines: ["I'm going to beat the gym someday! Right after lunch."] });
  scatter(b, rng, 'flowers_y', 5); scatter(b, rng, 'flowers_p', 5);
  b.spawn = { x: 16, y: 27, dir: 'up' };
  return b.build();
}

// ======================================================================================= INTERIORS
export function elderHouse(): MapDef {
  const b = room('elder_house', "Elder's Lab", 11, 8);
  b.d(1, 0, 'in_shelf'); b.d(9, 0, 'in_shelf');
  for (const x of [3, 4, 6, 7]) b.d(x, 2, 'lab_bench');
  b.fill(3, 4, 5, 2, 'rug'); b.d(1, 2, 'plant'); b.d(9, 4, 'plant');
  b.warp(5, 7, 'emberwick', 23, 21, 'down');
  b.npc({ id: 'elder', x: 5, y: 2, look: 'elder', dir: 'down', move: 'idle', dialogue: 'elder_after' });
  b.npc({ id: 'jace', x: 7, y: 4, look: 'jace', dir: 'left', move: 'idle', cond: { notFlag: 'quest.rival1' }, lines: ["Go on, talk to the Elder first! I'm waiting my turn. Mostly."] });
  b.trigger({ x: 5, y: 4, cond: { notFlag: 'quest.rival1' }, dialogue: 'lab_intro' });
  return b.build();
}

export function careCenter(id: string, name: string, exit: [string, number, number]): MapDef {
  const b = room(id, name, 11, 8);
  b.d(1, 0, 'in_shelf'); b.d(9, 1, 'pc'); b.talk(9, 1, 'pc'); b.d(1, 1, 'plant');
  for (const x of [3, 4, 6, 7]) b.d(x, 3, 'counter');
  b.fill(3, 4, 5, 2, 'rug');
  b.warp(5, 7, exit[0], exit[1], exit[2], 'down');
  b.npc({ id: 'nurse', x: 5, y: 3, look: 'nurse', dir: 'down', move: 'idle', dialogue: 'nurse' });
  return b.build();
}

export function brindleMart(): MapDef {
  const b = room('brindle_mart', 'Brindlemoor Mart', 9, 7);
  b.d(1, 0, 'in_shelf'); b.d(7, 0, 'in_shelf');
  for (const x of [2, 3, 5, 6]) b.d(x, 2, 'counter');
  b.d(1, 4, 'table'); b.d(7, 4, 'plant');
  b.warp(4, 6, 'brindlemoor', 7, 10, 'down');
  b.npc({ id: 'clerk', x: 4, y: 2, look: 'scout', dir: 'down', move: 'idle', dialogue: 'mart' });
  b.npc({ id: 'shopper', x: 6, y: 4, look: 'lass', dir: 'left', move: 'look', lines: ['The Great Orbs are a bargain. Just saying.'] });
  return b.build();
}

export function brindleCafe(): MapDef {
  const b = room('brindle_cafe', 'Moth & Mug', 11, 8);
  for (let y = 0; y < b.h - 1; y++) for (let x = 1; x < b.w - 1; x++) b.g(x, y, 'cafe_floor');
  b.d(1, 0, 'in_shelf'); b.d(9, 0, 'in_shelf');
  for (const x of [3, 4, 6, 7]) b.d(x, 2, 'counter');
  b.d(2, 2, 'coffee'); b.d(8, 2, 'cake_case');
  b.d(2, 5, 'cafe_table'); b.d(8, 5, 'cafe_table'); b.d(5, 5, 'cafe_table');
  b.note(3, 0, ['Chalkboard wall:', '"Found a Dreamoth in Mistwood. It found me back." - Tam', '"Best cocoa I never expected." - S.']);
  b.note(6, 0, ['Chalkboard wall:', '"Lost a battle. Won a friend." - Kiri', '"Stay awhile." - Odette']);
  b.warp(5, 7, 'brindlemoor', 26, 22, 'down');
  b.npc({ id: 'odette', x: 5, y: 2, look: 'odette', dir: 'down', move: 'idle', dialogue: 'odette' });
  b.npc({ id: 'patron1', x: 3, y: 5, look: 'hiker', dir: 'right', move: 'idle', lines: ['Best spot in town. Sit by the window.'] });
  b.npc({ id: 'patron2', x: 7, y: 4, look: 'villager_f', dir: 'down', move: 'look', lines: ['I come every day for the cake and the eavesdropping.'] });
  return b.build();
}

export function brindleLab(): MapDef {
  const b = room('brindle_lab', "Dr. Varga's Lab", 11, 8);
  for (let y = 0; y < b.h - 1; y++) for (let x = 1; x < b.w - 1; x++) b.g(x, y, 'lab_floor');
  b.d(1, 0, 'in_shelf'); b.d(9, 0, 'in_shelf');
  b.d(2, 2, 'lab_bench'); b.d(3, 2, 'lab_bench'); b.d(7, 2, 'machine'); b.d(8, 2, 'machine');
  b.d(2, 5, 'lab_bench'); b.d(8, 5, 'telescope');
  b.fill(4, 4, 3, 2, 'rug');
  b.warp(5, 7, 'brindlemoor', 26, 10, 'down');
  b.npc({ id: 'ilsa_lab', x: 5, y: 3, look: 'ilsa', dir: 'down', move: 'look', cond: { any: [{ notFlag: 'quest.mistwood_open' }, { flag: 'quest.done' }] }, dialogue: 'ilsa' });
  b.npc({ id: 'assistant', x: 3, y: 4, look: 'scout', dir: 'right', move: 'idle', lines: ['Dr. Varga talks to her notebooks. They do not argue back. Mostly.'] });
  return b.build();
}

export function brindleGym(): MapDef {
  const b = new MapBuilder('brindle_gym', 'Brindlemoor Gym', 14, 17, 'gym_floor', true);
  b.terrain = 'gym';
  for (let x = 0; x < b.w; x++) { b.g(x, 0, 'gym_wall'); b.g(x, 1, 'gym_wall'); b.d(x, 0, x % 4 === 2 ? 'banner' : null); }
  for (let y = 0; y < b.h; y++) { b.g(0, y, 'gym_wall'); b.g(b.w - 1, y, 'gym_wall'); }
  b.fill(0, b.h - 1, b.w, 1, 'gym_wall'); b.g(7, 16, 'mat'); b.g(6, 16, 'mat');
  for (const [x, y] of [[3, 4], [10, 4], [3, 9], [10, 9], [3, 13], [10, 13]]) b.d(x, y, 'gym_pillar');
  b.fill(5, 2, 4, 2, 'rug');
  b.warp(6, 16, 'brindlemoor', 17, 6, 'down').warp(7, 16, 'brindlemoor', 17, 6, 'down');
  b.npc({ id: 'rhea', x: 7, y: 2, look: 'rhea', dir: 'down', move: 'idle', dialogue: 'rhea' });
  b.npc({ id: 'tamsin', x: 4, y: 11, look: 'brawler', dir: 'right', move: 'idle', trainer: { id: 'tamsin', sight: 4 } });
  b.npc({ id: 'hugo', x: 9, y: 7, look: 'brawler', dir: 'left', move: 'idle', trainer: { id: 'hugo', sight: 4 } });
  return b.build();
}

export function brindleHouse(): MapDef {
  const b = room('brindle_house', 'Cozy House', 9, 7);
  b.d(1, 0, 'in_shelf'); b.d(7, 1, 'plant'); b.d(3, 3, 'table'); b.fill(3, 4, 3, 2, 'rug');
  b.warp(4, 6, 'brindlemoor', 32, 10, 'down');
  b.npc({ id: 'gran', x: 6, y: 3, look: 'elder', dir: 'left', move: 'idle', lines: ['The gym leader practically grew up in my garden. A dear girl. Terribly competitive.'] });
  return b.build();
}
