import type { MapDef } from '../types';
import { room } from './builder';
import { hollowHall, hollowdeep, lumenChamber, dateIlsa, dateMira, dateOdette, dateRhea } from './cave';
import { brindleCafe, brindleGym, brindleHouse, brindleLab, brindleMart, brindlemoor, careCenter, elderHouse, emberwick } from './towns';
import { mistwood, route1, route2 } from './wilds';

function housePlayer(): MapDef {
  const b = room('house_player', 'Your House', 11, 8);
  b.d(1, 0, 'in_shelf'); b.d(8, 0, 'in_shelf');
  b.d(1, 2, 'bed_top'); b.d(1, 3, 'bed_bot'); b.talk(1, 2, 'bed'); b.talk(1, 3, 'bed'); b.talk(1, 0, 'shelf'); b.talk(8, 0, 'shelf');
  b.d(9, 1, 'plant');
  b.fill(4, 3, 4, 3, 'rug');
  b.d(6, 3, 'table');
  b.warp(5, 7, 'emberwick', 7, 11, 'down');
  b.npc({ id: 'mom', x: 8, y: 4, look: 'villager_f', dir: 'left', move: 'look', dialogue: 'mom' });
  return b.build();
}

function miraShop(): MapDef {
  const b = room('house_neighbor', "Mira's Shop", 9, 7);
  b.d(1, 0, 'in_shelf'); b.d(7, 1, 'plant'); b.d(3, 3, 'table'); b.fill(3, 4, 3, 2, 'rug');
  b.warp(4, 6, 'emberwick', 23, 11, 'down');
  b.npc({ id: 'mira', x: 6, y: 3, look: 'shopkeeper', dir: 'left', move: 'idle', dialogue: 'mira' });
  return b.build();
}

const all: MapDef[] = [
  emberwick(), housePlayer(), miraShop(), careCenter('care_center', 'Care Hut', ['emberwick', 7, 21]), elderHouse(),
  route1(), brindlemoor(), careCenter('brindle_care', 'Care Hut', ['brindlemoor', 7, 22]), brindleMart(), brindleCafe(), brindleLab(), brindleGym(), brindleHouse(),
  route2(), mistwood(), hollowdeep(), hollowHall(), lumenChamber(),
  dateMira(), dateRhea(), dateIlsa(), dateOdette(),
];

export const MAPS: Record<string, MapDef> = Object.fromEntries(all.map((m) => [m.id, m]));
export const START = { map: 'house_player', x: 5, y: 5, dir: 'down' as const };
