import type { MapDef, NpcDef, SignDef, WarpDef } from '../types';
import type { Dir } from '../../config';

/** Authoring helper: paint tile names into a grid, then emit a MapDef. */
export class MapBuilder {
  ground: string[][];
  deco: (string | null)[][];
  warps: WarpDef[] = [];
  npcs: NpcDef[] = [];
  signs: SignDef[] = [];
  spawn?: { x: number; y: number; dir: Dir };
  constructor(public id: string, public name: string, public w: number, public h: number, base: string, public indoor = false) {
    this.ground = Array.from({ length: h }, () => Array<string>(w).fill(base));
    this.deco = Array.from({ length: h }, () => Array<string | null>(w).fill(null));
  }
  in(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  g(x: number, y: number, t: string): this { if (this.in(x, y)) this.ground[y][x] = t; return this; }
  d(x: number, y: number, t: string | null): this { if (this.in(x, y)) this.deco[y][x] = t; return this; }
  fill(x: number, y: number, w: number, h: number, t: string): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.g(x + i, y + j, t);
    return this;
  }
  fillDeco(x: number, y: number, w: number, h: number, t: string | null): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.d(x + i, y + j, t);
    return this;
  }
  /** 2x2 tree with top-left at (x,y). */
  tree(x: number, y: number): this {
    return this.d(x, y, 'tree_tl').d(x + 1, y, 'tree_tr').d(x, y + 1, 'tree_bl').d(x + 1, y + 1, 'tree_br');
  }
  treeRow(x: number, y: number, count: number): this { for (let i = 0; i < count; i++) this.tree(x + i * 2, y); return this; }
  treeCol(x: number, y: number, count: number): this { for (let i = 0; i < count; i++) this.tree(x, y + i * 2); return this; }
  /** Tree border around the whole map, with optional gaps [x,y] left open. */
  treeBorder(gaps: Array<[number, number, number]> = []): this {
    for (let x = 0; x < this.w; x += 2) { this.tree(x, 0); this.tree(x, this.h - 2); }
    for (let y = 2; y < this.h - 2; y += 2) { this.tree(0, y); this.tree(this.w - 2, y); }
    for (const [gx, gy, len] of gaps) {
      // gaps are horizontal spans on top/bottom rows (len wide) — clear deco there
      this.fillDeco(gx, gy, len, 2, null);
    }
    return this;
  }
  /** House: 2 roof rows + wall row. Door at wall row, returns door tile. */
  house(x: number, y: number, w: number, roof: 'r' | 'b' = 'r', doorAt?: number): { x: number; y: number } {
    const p = roof === 'r' ? 'roof' : 'roofb';
    for (let i = 0; i < w; i++) {
      const e = i === 0 ? 'l' : i === w - 1 ? 'r' : '';
      this.d(x + i, y, e ? `${p}_t${e}` : `${p}_t`).d(x + i, y + 1, e ? `${p}_b${e}` : `${p}_b`);
      this.d(x + i, y + 2, i % 2 === 1 ? 'wall_win' : 'wall');
    }
    const dx = x + (doorAt ?? Math.floor(w / 2));
    this.d(dx, y + 2, 'door');
    return { x: dx, y: y + 2 };
  }
  pathH(x: number, y: number, len: number, wide = 1): this { return this.fill(x, y, len, wide, 'path'); }
  pathV(x: number, y: number, len: number, wide = 1): this { return this.fill(x, y, wide, len, 'path'); }
  warp(x: number, y: number, to: string, tx: number, ty: number, dir: Dir): this { this.warps.push({ x, y, to, tx, ty, dir }); return this; }
  /** Non-tile interaction on a solid tile (bed, bookshelf...). */
  talk(x: number, y: number, dialogue: string): this { this.signs.push({ x, y, dialogue }); return this; }
  sign(x: number, y: number, lines: string[]): this { this.d(x, y, 'sign'); this.signs.push({ x, y, lines }); return this; }
  npc(n: NpcDef): this { this.npcs.push(n); return this; }
  build(): MapDef {
    return { id: this.id, name: this.name, w: this.w, h: this.h, ground: this.ground, deco: this.deco, warps: this.warps, npcs: this.npcs, signs: this.signs, indoor: this.indoor, spawn: this.spawn };
  }
}

/** Standard small interior: wall row on top, wood floor, door mat at bottom. Returns builder + exit x. */
export function room(id: string, name: string, w: number, h: number): MapBuilder {
  const b = new MapBuilder(id, name, w, h, 'wood_floor', true);
  b.fill(0, h - 1, w, 1, 'void');
  for (let x = 0; x < w; x++) b.d(x, 0, x === 2 || x === w - 3 ? 'in_window' : 'in_wall');
  for (let y = 0; y < h; y++) { b.g(0, y, 'void'); b.g(w - 1, y, 'void'); }
  const ex = Math.floor(w / 2);
  b.g(ex, h - 1, 'mat');
  return b;
}
