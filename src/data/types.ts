import type { Dir } from '../config';

export interface WarpDef { x: number; y: number; to: string; tx: number; ty: number; dir: Dir }
export interface NpcDef {
  id: string; x: number; y: number; look: string; dir: Dir;
  move?: 'idle' | 'wander' | 'look';
  radius?: number;
  lines?: string[];
  dialogue?: string;
  /** Trainer id (data/trainers.ts). Sees the player along `sight` tiles in facing direction. */
  trainer?: { id: string; sight: number };
  /** only present while this condition holds (evaluated when the map loads) */
  cond?: Cond;
}
export interface TriggerDef {
  x: number; y: number;
  /** fires while this holds */
  cond?: Cond;
  dialogue: string;
  /** walk the player one tile this way afterwards (blocks progress until a condition is met) */
  push?: Dir;
  /** run once: set this flag when the dialogue ends */
  once?: string;
}
export interface PickupDef { x: number; y: number; item: string; qty?: number; flag: string; text?: string }
export interface SignDef { x: number; y: number; lines?: string[]; dialogue?: string }
export interface MapDef {
  id: string; name: string; w: number; h: number;
  ground: string[][];
  deco: (string | null)[][];
  warps: WarpDef[]; npcs: NpcDef[]; signs: SignDef[];
  indoor: boolean;
  /** battle backdrop / encounter flavour override */
  terrain?: 'grass' | 'forest' | 'cave' | 'gym';
  /** step-on story triggers */
  triggers: TriggerDef[];
  /** pick-up-able items lying around (flag makes each one single-use) */
  pickups: PickupDef[];
  /** fixed hour of day for this map (date scenes) */
  time?: number;
  /** dialogue that plays automatically on arrival (date scenes) */
  autorun?: string;
  spawn?: { x: number; y: number; dir: Dir };
}

// ---------- dialogue / script ----------
export type Cond =
  | { flag: string }
  | { notFlag: string }
  | { var: string; op?: '>=' | '<=' | '==' | '>' | '<' | '!='; value: number }
  | { affection: string; gte?: number; lt?: number }
  | { day: 'even' | 'odd' }
  | { brushed: string }
  | { has: string }
  | { dexCaught: number }
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond };

export type Effect =
  | { flag: string; value?: boolean }
  | { var: string; set?: number; add?: number }
  | { affection: string; delta: number; tag?: string }
  | { give: string; qty?: number }
  | { creature: string; level: number }
  | { cmd: string; arg?: string };

export type Expression = 'neutral' | 'happy' | 'blush' | 'annoyed' | 'surprised' | 'smug';
export type FlirtReaction = 'love' | 'like' | 'meh' | 'eye_roll' | 'pushy' | 'brushed';
export type Trait = 'witty' | 'sweet' | 'bold' | 'nerdy' | 'smooth' | 'goofy' | 'sincere' | 'cheeky';

export interface DialogueChoice {
  text: string;
  next?: string;
  cond?: Cond;
  effects?: Effect[];
  /** Makes this choice a flirt attempt: outcome is computed from the NPC's personality. */
  flirt?: { trait: Trait; /** minimum affection at which this line lands well */ forward?: number };
  /** Per-outcome override; otherwise falls back to graph.react[outcome]. */
  outcomes?: Partial<Record<FlirtReaction, string>>;
}

export interface DialogueNode {
  speaker?: string;
  portrait?: Expression;
  /** Lines are wrapped automatically. Use {player} for the player's name. */
  text?: string;
  /** Alternative phrasings; one of text/alts is picked at random. */
  alts?: string[];
  cond?: Cond;
  /** First matching branch wins; otherwise `next`. */
  branch?: Array<{ cond: Cond; next: string }>;
  next?: string;
  choices?: DialogueChoice[];
  effects?: Effect[];
  /** Hub nodes play any pending romance milestone scene first. */
  hub?: boolean;
  end?: boolean;
}

export interface DialogueGraph {
  id: string;
  /** Romanceable NPC this conversation belongs to (enables hearts, flirting, milestones). */
  npc?: string;
  start: string;
  nodes: Record<string, DialogueNode>;
  react?: Partial<Record<FlirtReaction, string>>;
  /** milestone threshold -> node id played from the next hub. */
  milestones?: Partial<Record<25 | 50 | 75 | 100, string>>;
}

// ---------- battle / creatures ----------
export type MonType = 'normal' | 'flame' | 'tide' | 'leaf' | 'volt' | 'frost' | 'stone' | 'gale' | 'venom' | 'mind' | 'shade' | 'fist';
export type Stat = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
export type BattleStat = Exclude<Stat, 'hp'> | 'acc' | 'eva';
export type Status = 'burn' | 'poison' | 'sleep' | 'paralysis';
export type Stats = Record<Stat, number>;

export interface MoveEffect {
  /** inflict status on the target */
  status?: { kind: Status; chance: number };
  /** stat stage change; who = 'self' | 'foe' */
  stages?: Array<{ stat: BattleStat; delta: number; who: 'self' | 'foe'; chance?: number }>;
  /** heal user by fraction of max HP */
  heal?: number;
  /** restore fraction of damage dealt to user */
  drain?: number;
  /** damage to user as fraction of damage dealt */
  recoil?: number;
  /** multi-hit range */
  hits?: [number, number];
}
export interface MoveDef {
  id: string; name: string; type: MonType; cat: 'phys' | 'spec' | 'status';
  power: number;
  /** null = never misses */
  acc: number | null;
  pp: number; priority?: number; highCrit?: boolean;
  effect?: MoveEffect;
  desc: string;
}
export interface CreatureArt {
  plan: 'blob' | 'quad' | 'biped' | 'bird' | 'serpent' | 'insect' | 'floater';
  /** main, shade, light, accent, belly */
  pal: [string, string, string, string, string];
  size: number;
  feats: string[];
  eye?: string;
}
export interface SpeciesDef {
  id: string; name: string; dex: number; types: [MonType] | [MonType, MonType];
  base: Stats;
  catchRate: number;
  curve: 'fast' | 'medium' | 'slow';
  baseXp: number;
  learnset: Array<[number, string]>;
  evolve?: { level: number; to: string };
  art: CreatureArt;
  dexText: string;
}
export interface ItemDef {
  id: string; name: string; desc: string; price: number;
  kind: 'heal' | 'status' | 'revive' | 'ball' | 'key' | 'gift' | 'evo';
  heal?: number | 'full';
  cures?: Status[] | 'all';
  ballBonus?: number;
  tags?: string[];
}
