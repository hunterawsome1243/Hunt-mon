import type { MapDef, NpcDef, PickupDef, SignDef, TriggerDef, WarpDef } from '../types';
import type { Dir } from '../../config';
import { TILES } from '../art/tiles';

/** Authoring helper: paint tile names into a grid, then emit a MapDef. */
export class MapBuilder {
  ground: string[][];
  deco: (string | null)[][];
  warps: WarpDef[] = [];
  npcs: NpcDef[] = [];
  signs: SignDef[] = [];
  triggers: TriggerDef[] = [];
  pickups: PickupDef[] = [];
  terrain?: MapDef['terrain'];
  autorun?: string;
  time?: number;
  spawn?: { x: number; y: number; dir: Dir };
  constructor(public id: string, public name: string, public w: number, public h: number, base: string, public indoor = false) {
    this.ground = Array.from({ length: h }, () => Array<string>(w).fill(base));
    this.deco = Array.from({ length: h }, () => Array<string | null>(w).fill(null));
  }
  in(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  g(x: number, y: number, t: string): this { if (this.in(x, y)) this.ground[y][x] = t; return this; }
  d(x: number, y: number, t: string | null): this {
    if (!this.in(x, y)) return this;
    const old = this.deco[y][x];
    // erasing one quarter of a 2x2 tree removes the whole tree so no orphan crowns or trunks are left behind
    if (t === null && old && /^d?tree_(tl|tr|bl|br)$/.test(old)) {
      const pre = old.startsWith('dtree') ? 'dtree' : 'tree';
      const part = old.slice(-2);
      const ax = x - (part === 'tr' || part === 'br' ? 1 : 0), ay = y - (part === 'bl' || part === 'br' ? 1 : 0);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (this.in(ax + dx, ay + dy) && this.deco[ay + dy][ax + dx]?.startsWith(pre)) this.deco[ay + dy][ax + dx] = null;
      return this;
    }
    this.deco[y][x] = t;
    return this;
  }
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
  house(x: number, y: number, w: number, roof: 'r' | 'b' | 'g' = 'r', doorAt?: number): { x: number; y: number } {
    const p = roof === 'r' ? 'roof' : roof === 'b' ? 'roofb' : 'roofg';
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
  /** Paint a polyline with `tile` (square brush of `width`), on the ground layer. */
  carve(points: Array<[number, number]>, width: number, tile: string, layer: 'g' | 'd' = 'g'): this {
    const put = (x: number, y: number) => { if (layer === 'g') this.g(x, y, tile); else this.d(x, y, tile); };
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i], [x1, y1] = points[i + 1];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let k = 0; k <= n; k++) {
        const cx = Math.round(x0 + ((x1 - x0) * k) / n), cy = Math.round(y0 + ((y1 - y0) * k) / n);
        for (let dy = 0; dy < width; dy++) for (let dx = 0; dx < width; dx++) put(cx + dx - Math.floor((width - 1) / 2), cy + dy - Math.floor((width - 1) / 2));
      }
    }
    return this;
  }
  /** Remove decoration (trees, rocks...) along a polyline. */
  clearLine(points: Array<[number, number]>, width: number): this {
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i], [x1, y1] = points[i + 1];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let k = 0; k <= n; k++) {
        const cx = Math.round(x0 + ((x1 - x0) * k) / n), cy = Math.round(y0 + ((y1 - y0) * k) / n);
        for (let dy = 0; dy < width; dy++) for (let dx = 0; dx < width; dx++) this.d(cx + dx - Math.floor((width - 1) / 2), cy + dy - Math.floor((width - 1) / 2), null);
      }
    }
    return this;
  }
  /** Distance (chebyshev) from (x,y) to the nearest ground tile equal to `tile`, up to `max`. */
  near(x: number, y: number, tile: string | string[], max: number): boolean {
    const set = Array.isArray(tile) ? tile : [tile];
    for (let dy = -max; dy <= max; dy++) for (let dx = -max; dx <= max; dx++) if (this.in(x + dx, y + dy) && set.includes(this.ground[y + dy][x + dx])) return true;
    return false;
  }
  /** Informational text on an existing solid tile (chalkboards, notice boards). */
  note(x: number, y: number, lines: string[]): this { this.signs.push({ x, y, lines }); return this; }
  dtree(x: number, y: number): this {
    return this.d(x, y, 'dtree_tl').d(x + 1, y, 'dtree_tr').d(x, y + 1, 'dtree_bl').d(x + 1, y + 1, 'dtree_br');
  }
  /** Non-tile interaction on a solid tile (bed, bookshelf...). */
  talk(x: number, y: number, dialogue: string): this { this.signs.push({ x, y, dialogue }); return this; }
  sign(x: number, y: number, lines: string[]): this { this.d(x, y, 'sign'); this.signs.push({ x, y, lines }); return this; }
  npc(n: NpcDef): this { this.npcs.push(n); return this; }
  trigger(t: TriggerDef): this { this.triggers.push(t); return this; }
  /** Can the player stand here (ignoring NPCs)? */
  walkable(x: number, y: number): boolean {
    if (!this.in(x, y)) return false;
    const g = TILES[this.ground[y][x]], d = this.deco[y][x] ? TILES[this.deco[y][x]!] : null;
    return !g?.solid && !d?.solid && !this.signs.some((s) => s.x === x && s.y === y);
  }
  /**
   * A story trigger across a whole row or column of walkable tiles, so the player cannot slip around it
   * through a gap beside the path.
   */
  triggerLine(axis: 'row' | 'col', at: number, t: Omit<TriggerDef, 'x' | 'y'>): this {
    const n = axis === 'row' ? this.w : this.h;
    for (let i = 0; i < n; i++) {
      const x = axis === 'row' ? i : at, y = axis === 'row' ? at : i;
      if (this.walkable(x, y) && !this.warps.some((w) => w.x === x && w.y === y)) this.triggers.push({ ...t, x, y });
    }
    return this;
  }
  pickup(p: PickupDef): this { this.pickups.push(p); this.d(p.x, p.y, 'sparkle'); return this; }
  build(): MapDef {
    return { id: this.id, name: this.name, w: this.w, h: this.h, ground: this.ground, deco: this.deco, warps: this.warps, npcs: this.npcs, signs: this.signs, indoor: this.indoor, terrain: this.terrain, triggers: this.triggers, pickups: this.pickups, autorun: this.autorun, time: this.time, spawn: this.spawn };
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
