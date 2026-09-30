import type { MonType } from './types';

export const TYPES: MonType[] = ['normal', 'flame', 'tide', 'leaf', 'volt', 'frost', 'stone', 'gale', 'venom', 'mind', 'shade', 'fist'];

export const TYPE_COLOR: Record<MonType, string> = {
  normal: '#a8a090', flame: '#e8623a', tide: '#4a8fe0', leaf: '#5cb84a', volt: '#f2c94c', frost: '#8ad4e8',
  stone: '#a88a58', gale: '#a8b8f0', venom: '#a05ac0', mind: '#e878a8', shade: '#6a5a8a', fist: '#c8503a',
};

// attacker -> defender multipliers; anything not listed is 1x
const CHART: Record<MonType, Partial<Record<MonType, number>>> = {
  normal: { stone: 0.5, shade: 0 },
  flame: { leaf: 2, frost: 2, flame: 0.5, tide: 0.5, stone: 0.5 },
  tide: { flame: 2, stone: 2, tide: 0.5, leaf: 0.5 },
  leaf: { tide: 2, stone: 2, flame: 0.5, leaf: 0.5, venom: 0.5, gale: 0.5 },
  volt: { tide: 2, gale: 2, volt: 0.5, leaf: 0.5, stone: 0 },
  frost: { leaf: 2, gale: 2, flame: 0.5, tide: 0.5, frost: 0.5 },
  stone: { flame: 2, frost: 2, gale: 2, fist: 0.5 },
  gale: { leaf: 2, fist: 2, volt: 0.5, stone: 0.5 },
  venom: { leaf: 2, venom: 0.5, stone: 0.5, shade: 0.5 },
  mind: { fist: 2, venom: 2, mind: 0.5 },
  shade: { mind: 2, shade: 2, normal: 0 },
  fist: { normal: 2, stone: 2, frost: 2, venom: 0.5, gale: 0.5, mind: 0.5, shade: 0.5 },
};

export function effectiveness(atk: MonType, def: readonly MonType[]): number {
  let m = 1;
  for (const d of def) m *= CHART[atk][d] ?? 1;
  return m;
}
