import type { MapDef } from '../types';
import { MapBuilder, room } from './builder';

// ---------- Emberwick (starting town) ----------
function emberwick(): MapDef {
  const b = new MapBuilder('emberwick', 'Emberwick', 32, 26, 'grass');
  // grass variety
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if ((x * 7 + y * 13) % 5 === 0) b.g(x, y, 'grass2');
  b.treeBorder([[14, 0, 4]]); // north gap onto Route 1
  b.fillDeco(14, 0, 4, 2, null); b.fill(15, 0, 2, 2, 'path');
  // main paths
  b.pathH(4, 15, 24).pathH(4, 16, 24); // east-west street
  b.pathV(15, 2, 14, 2); // north road to gap
  b.pathV(7, 10, 5); b.pathV(23, 10, 5); b.pathV(7, 17, 3); b.pathV(23, 17, 3); b.pathV(15, 17, 5, 2);
  // pond (east)
  b.fill(25, 3, 4, 5, 'water'); b.fill(24, 4, 1, 3, 'water'); b.fill(29, 4, 1, 3, 'water');
  // houses
  const home = b.house(5, 8, 5, 'r', 2);
  const nb = b.house(21, 8, 5, 'r', 2);
  const shop = b.house(5, 19, 5, 'b', 2);
  // player home & neighbour
  b.warp(home.x, home.y, 'house_player', 5, 6, 'up');
  b.warp(nb.x, nb.y, 'house_neighbor', 4, 5, 'up');
  b.warp(shop.x, shop.y, 'house_neighbor', 4, 5, 'up'); // placeholder until Shop interior (M4/M5)
  // decoration
  b.sign(8, 15 - 1 + 0, ['EMBERWICK', 'A quiet town where', 'every journey begins.']);
  b.sign(13, 4, ['ROUTE 1 -> north', 'Tall grass ahead!', 'Wild creatures live there.']);
  for (const [x, y] of [[3, 12], [3, 13], [12, 12], [18, 12], [12, 22], [28, 21]]) b.d(x, y, 'flowers_y');
  for (const [x, y] of [[4, 22], [19, 21], [27, 12], [11, 18]]) b.d(x, y, 'flowers_p');
  b.d(12, 14, 'lamp_top'); b.d(12, 15, 'lamp_base'); b.d(19, 14, 'lamp_top'); b.d(19, 15, 'lamp_base');
  // lamp base sits on path row, keep walkable neighbours
  b.d(4, 18, 'bush'); b.d(10, 18, 'bush'); b.d(20, 18, 'rock'); b.d(27, 18, 'rock');
  // tall grass patch (teaser inside town, south-east)
  b.fill(22, 20, 6, 3, 'tall_grass');
  b.fill(4, 12, 1, 1, 'path');
  b.warp(15, 0, 'route1', 8, 23, 'up'); b.warp(16, 0, 'route1', 9, 23, 'up');
  b.npc({ id: 'kid1', x: 12, y: 17, look: 'kid', dir: 'down', move: 'wander', radius: 3, lines: ['I want to catch a', 'creature just like the', 'ones in the stories!'] });
  b.npc({ id: 'elder1', x: 17, y: 12, look: 'elder', dir: 'left', move: 'look', lines: ['Ah, a new traveller.', 'The world is wide.', 'Walk with care, and', 'run only with purpose.'] });
  b.npc({ id: 'vf1', x: 20, y: 17, look: 'villager_f', dir: 'up', move: 'wander', radius: 2, lines: ['The pond glitters so', 'nicely in the sun.'] });
  b.npc({ id: 'vm1', x: 26, y: 15, look: 'villager_m', dir: 'left', move: 'idle', lines: ['Hold SHIFT to run.', 'Your legs will thank', 'you for the exercise!'] });
  b.spawn = { x: 5, y: 12, dir: 'down' };
  return b.build();
}

function housePlayer(): MapDef {
  const b = room('house_player', "Your House", 11, 8);
  b.d(1, 0, 'in_shelf'); b.d(8, 0, 'in_shelf');
  b.d(1, 1, 'bed_top'); b.d(1, 2, 'bed_bot');
  b.d(6, 3, 'table'); b.d(9, 1, 'plant');
  b.fill(4, 3, 4, 3, 'rug'); // fine: rug is walkable ground, table sits on it
  b.d(6, 3, 'table');
  b.warp(5, 7, 'emberwick', 7, 11, 'down');
  b.npc({ id: 'mom', x: 8, y: 4, look: 'villager_f', dir: 'left', move: 'look', lines: ['Good morning, sweetheart!', 'Be careful out there.', 'Come home any time.'] });
  return b.build();
}
function houseNeighbor(): MapDef {
  const b = room('house_neighbor', 'Neighbour House', 9, 7);
  b.d(1, 0, 'in_shelf'); b.d(7, 1, 'plant'); b.d(3, 3, 'table'); b.fill(3, 4, 3, 2, 'rug');
  b.warp(4, 6, 'emberwick', 23, 11, 'down');
  b.npc({ id: 'nb', x: 6, y: 3, look: 'shopkeeper', dir: 'left', move: 'idle', lines: ['Welcome! Sorry about', 'the mess. I have been', 'reading all day.'] });
  return b.build();
}

function route1(): MapDef {
  const b = new MapBuilder('route1', 'Route 1', 20, 26, 'grass');
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if ((x * 5 + y * 11) % 6 === 0) b.g(x, y, 'grass2');
  b.treeBorder();
  b.fillDeco(8, 24, 2, 2, null); b.fill(8, 24, 2, 2, 'path');
  b.pathV(8, 14, 12, 2);
  b.fill(4, 6, 12, 7, 'tall_grass');
  b.pathV(8, 2, 5, 2);
  b.fill(8, 7, 2, 4, 'path');
    b.warp(8, 25, 'emberwick', 15, 1, 'down'); b.warp(9, 25, 'emberwick', 16, 1, 'down');
  b.sign(7, 22, ['ROUTE 1', 'More to come...']);
  b.npc({ id: 'hiker', x: 12, y: 18, look: 'villager_m', dir: 'left', move: 'wander', radius: 2, lines: ['This route is only a', 'sample for now.', 'Great things ahead!'] });
  return b.build();
}

export const MAPS: Record<string, MapDef> = Object.fromEntries([emberwick(), housePlayer(), houseNeighbor(), route1()].map((m) => [m.id, m]));
export const START = { map: 'house_player', x: 5, y: 5, dir: 'down' as const };
