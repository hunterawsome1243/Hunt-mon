import type { Dir } from '../config';

export interface WarpDef { x: number; y: number; to: string; tx: number; ty: number; dir: Dir }
export interface NpcDef {
  id: string; x: number; y: number; look: string; dir: Dir;
  move?: 'idle' | 'wander' | 'look';
  radius?: number;
  lines?: string[];
  dialogue?: string;
}
export interface SignDef { x: number; y: number; lines?: string[]; dialogue?: string }
export interface MapDef {
  id: string; name: string; w: number; h: number;
  ground: string[][];
  deco: (string | null)[][];
  warps: WarpDef[]; npcs: NpcDef[]; signs: SignDef[];
  indoor: boolean;
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
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond };

export type Effect =
  | { flag: string; value?: boolean }
  | { var: string; set?: number; add?: number }
  | { affection: string; delta: number; tag?: string }
  | { give: string; qty?: number }
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
