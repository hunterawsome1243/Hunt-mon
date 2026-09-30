import { MOVES } from '../../data/moves';
import { SPECIES } from '../../data/creatures';
import type { SpeciesDef, Stats, Status } from '../../data/types';
import { rng as defaultRng, Rng } from '../../engine/rng';

export interface MoveSlot { id: string; pp: number; maxPp: number }

export interface Creature {
  uid: string;
  species: string;
  nick?: string;
  level: number;
  xp: number;
  hp: number;
  iv: Stats;
  moves: MoveSlot[];
  status: Status | null;
  /** turns of sleep remaining */
  sleep: number;
  /** trainer/origin info for dex & trade flavour */
  caughtOn?: string;
}

let uidCounter = 0;
export const newUid = (): string => `m${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

export const spec = (c: Creature): SpeciesDef => SPECIES[c.species];
export const nameOf = (c: Creature): string => c.nick ?? spec(c).name;

export function xpForLevel(curve: SpeciesDef['curve'], level: number): number {
  const c = level ** 3;
  return Math.floor(curve === 'fast' ? c * 0.8 : curve === 'slow' ? c * 1.25 : c);
}

export function calcStats(c: Pick<Creature, 'species' | 'level' | 'iv'>): Stats {
  const b = SPECIES[c.species].base;
  const L = c.level;
  const f = (k: keyof Stats, extra: number) => Math.floor(((2 * b[k] + c.iv[k]) * L) / 100) + extra;
  return { hp: f('hp', L + 10), atk: f('atk', 5), def: f('def', 5), spa: f('spa', 5), spd: f('spd', 5), spe: f('spe', 5) };
}
export const maxHp = (c: Creature): number => calcStats(c).hp;

/** Own learnset plus every earlier evolution stage's, ordered by level. */
export function fullLearnset(species: string): Array<[number, string]> {
  const pre = Object.values(SPECIES).find((s) => s.evolve?.to === species);
  const own = SPECIES[species].learnset;
  return pre ? [...fullLearnset(pre.id), ...own].sort((a, b) => a[0] - b[0]) : own;
}

/** The four most recent moves the species would have learned by `level`. */
export function movesAt(species: string, level: number): string[] {
  const learned = fullLearnset(species).filter(([l]) => l <= level).map(([, m]) => m);
  const uniq: string[] = [];
  for (const m of learned) { const i = uniq.indexOf(m); if (i >= 0) uniq.splice(i, 1); uniq.push(m); }
  return uniq.slice(-4);
}

export function createCreature(species: string, level: number, rng: Rng = defaultRng): Creature {
  const iv: Stats = { hp: rng.int(0, 15), atk: rng.int(0, 15), def: rng.int(0, 15), spa: rng.int(0, 15), spd: rng.int(0, 15), spe: rng.int(0, 15) };
  const c: Creature = {
    uid: newUid(), species, level, xp: xpForLevel(SPECIES[species].curve, level), hp: 1, iv,
    moves: movesAt(species, level).map((id) => ({ id, pp: MOVES[id].pp, maxPp: MOVES[id].pp })),
    status: null, sleep: 0,
  };
  c.hp = maxHp(c);
  return c;
}

export function healFully(c: Creature): void {
  c.hp = maxHp(c); c.status = null; c.sleep = 0;
  for (const m of c.moves) m.pp = m.maxPp;
}

/** Moves gained exactly at `level` that the creature does not know. */
export function learnableAt(c: Creature, level: number): string[] {
  return spec(c).learnset.filter(([l, m]) => l === level && !c.moves.some((s) => s.id === m)).map(([, m]) => m);
}

export interface LevelUpInfo { level: number; before: Stats; after: Stats; learn: string[] }

/** Adds XP, levels up as needed. Returns one entry per level gained. HP gain is added to current HP. */
export function addXp(c: Creature, amount: number): LevelUpInfo[] {
  const out: LevelUpInfo[] = [];
  c.xp += amount;
  const curve = spec(c).curve;
  while (c.level < 100 && c.xp >= xpForLevel(curve, c.level + 1)) {
    const before = calcStats(c);
    c.level++;
    const after = calcStats(c);
    if (c.hp > 0) c.hp += after.hp - before.hp;
    out.push({ level: c.level, before, after, learn: learnableAt(c, c.level) });
  }
  return out;
}

export function learnMove(c: Creature, id: string, replace: number | null): void {
  const slot: MoveSlot = { id, pp: MOVES[id].pp, maxPp: MOVES[id].pp };
  if (replace === null || c.moves.length < 4) c.moves.push(slot); else c.moves[replace] = slot;
}

export function canEvolve(c: Creature): string | null {
  const e = spec(c).evolve;
  return e && c.level >= e.level ? e.to : null;
}
export function evolve(c: Creature, to: string): void {
  const old = maxHp(c);
  c.species = to;
  c.hp += maxHp(c) - old;
}
