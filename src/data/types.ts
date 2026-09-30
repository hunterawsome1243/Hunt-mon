import type { Dir } from '../config';

export interface WarpDef { x: number; y: number; to: string; tx: number; ty: number; dir: Dir }
export interface NpcDef {
  id: string; x: number; y: number; look: string; dir: Dir;
  move?: 'idle' | 'wander' | 'look';
  radius?: number;
  lines: string[];
}
export interface SignDef { x: number; y: number; lines: string[] }
export interface MapDef {
  id: string; name: string; w: number; h: number;
  ground: string[][];
  deco: (string | null)[][];
  warps: WarpDef[]; npcs: NpcDef[]; signs: SignDef[];
  indoor: boolean;
  spawn?: { x: number; y: number; dir: Dir };
}
