import { PixelBuffer } from '../../engine/gfx/PixelBuffer';
import { Rng } from '../../engine/rng';
import { TILES2 } from './tiles2';

export interface TileDef {
  frames: number;
  /** ms per animation frame (only if frames > 1) */
  animMs?: number;
  solid?: boolean;
  /** drawn above entities (tree crowns, roof overhangs) */
  above?: boolean;
  /** wild-encounter grass */
  grass?: boolean;
  gen: (frame: number) => PixelBuffer;
}

// Shared palette; index 0 = transparent.
const P = [
  '', '#2a1d2e', // 1 outline
  '#4a9a3c', '#5cb84a', '#7fd05e', '#3a7f32', // 2-5 grass
  '#d9b877', '#c49a5c', '#e8cf94', '#a87f45', // 6-9 path
  '#3b7fd0', '#5aa0e8', '#8cc8f5', '#2a5fae', '#ffffff', // 10-14 water
  '#b57a45', '#9a6236', '#cc9058', '#7a4a28', // 15-18 wood
  '#c8452f', '#a3331f', '#e06a4a', '#7d2416', // 19-22 roof
  '#f0e2c0', '#d9c69a', '#bba878', // 23-25 wall
  '#7fc4f0', '#4a8fc0', // 26-27 glass
  '#2f7d3a', '#3f9a48', '#62bb5a', '#1f5c2c', // 28-31 leaves
  '#6b4326', '#4e2f18', // 32-33 trunk
  '#f2d95c', '#e8895a', '#f2f2f2', '#d64f7a', // 34-37 flowers
  '#8a8a9a', '#6a6a7a', '#a8a8b8', // 38-40 stone
  '#3a3a4a', '#ffcf4a', '#ff8a2a', // 41-43 lamp iron / flame
  '#6a3f8c', '#8a5fb0', // 44-45 rug
];
const C = { o: 1, g0: 2, g1: 3, g2: 4, g3: 5, p0: 6, p1: 7, p2: 8, p3: 9, w0: 10, w1: 11, w2: 12, w3: 13, wf: 14,
  f0: 15, f1: 16, f2: 17, f3: 18, r0: 19, r1: 20, r2: 21, r3: 22, s0: 23, s1: 24, s2: 25, gl0: 26, gl1: 27,
  l0: 28, l1: 29, l2: 30, l3: 31, t0: 32, t1: 33, fy: 34, fo: 35, fw: 36, fp: 37, st0: 38, st1: 39, st2: 40,
  ir: 41, fl0: 42, fl1: 43, ru0: 44, ru1: 45 };

const buf = () => new PixelBuffer(16, 16, P);
const rngFor = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return new Rng(h >>> 0); };

function grass(seed: string): PixelBuffer {
  const b = buf().fill(C.g0);
  const r = rngFor(seed);
  b.speckle(r, [C.g1], 0.18).speckle(r, [C.g3], 0.06);
  for (let i = 0; i < 4; i++) { const x = r.int(1, 14), y = r.int(1, 14); b.set(x, y, C.g2); b.set(x, y - 1, C.g1); }
  return b;
}
function tallGrass(f: number): PixelBuffer {
  const b = grass('tg');
  const sway = [0, 1, 0, -1][f];
  for (let x = 0; x < 16; x += 2) {
    const h = 6 + ((x * 7) % 4);
    for (let y = 0; y < h; y++) {
      const off = Math.round((sway * (h - y)) / 4);
      const c = y < 2 ? C.g2 : y < h - 3 ? C.g1 : C.g3;
      b.set(x + off, 15 - y, c);
      b.set(x + 1 + off, 15 - y + 1 > 15 ? 15 : 15 - y + 1, C.g3);
    }
  }
  for (let x = 1; x < 16; x += 4) b.set(x, 15, C.g3);
  return b;
}
function path(seed: string): PixelBuffer {
  const b = buf().fill(C.p0);
  const r = rngFor(seed);
  b.speckle(r, [C.p2], 0.14).speckle(r, [C.p1], 0.1).speckle(r, [C.p3], 0.03);
  return b;
}
function water(f: number): PixelBuffer {
  const b = buf().fill(C.w0);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const wave = Math.sin((x + f * 4) * 0.7 + y * 0.9);
    if (wave > 0.85) b.set(x, y, C.w1);
    else if (wave < -0.9) b.set(x, y, C.w3);
  }
  const sx = (f * 5 + 3) % 14, sy = (f * 3 + 2) % 14;
  b.set(sx, sy, C.w2); b.set(sx + 1, sy, C.w2); b.set(sx, sy + 5, C.wf);
  return b;
}
function woodFloor(): PixelBuffer {
  const b = buf().fill(C.f0);
  for (let y = 0; y < 16; y += 4) b.hline(0, y + 3, 16, C.f1);
  for (let y = 0; y < 16; y += 4) { const x = (y * 5) % 16; b.vline(x, y, 3, C.f1); b.set(x + 5, y + 1, C.f2); }
  return b;
}
function stoneFloor(): PixelBuffer {
  const b = buf().fill(C.st1);
  b.speckle(rngFor('sf'), [C.st0, C.st2], 0.2);
  b.hline(0, 7, 16, C.st0).vline(7, 0, 7, C.st0).vline(3, 8, 8, C.st0);
  return b;
}
function tree(part: 'tl' | 'tr' | 'bl' | 'br'): PixelBuffer {
  const b = grass('tree' + part);
  // draw on a 32x32 virtual canvas, then crop the quarter
  const big = new PixelBuffer(32, 32, P);
  const r = rngFor('crown');
  for (let y = 0; y < 26; y++) for (let x = 0; x < 32; x++) {
    const dx = (x - 15.5) / 15, dy = (y - 12) / 13;
    if (dx * dx + dy * dy < 1) {
      const lit = (x - 15.5) * -0.5 + (y - 12) * -0.5;
      big.set(x, y, lit > 5 ? C.l2 : lit > -2 ? C.l1 : lit > -8 ? C.l0 : C.l3);
    }
  }
  big.speckle(r, [C.l2, C.l3], 0.12, C.l1);
  big.outline(C.o);
  big.rect(13, 24, 6, 8, C.t0).rect(17, 24, 2, 8, C.t1).rect(12, 30, 8, 2, C.t1);
  big.set(12, 24, C.o);
  const qx = part.includes('r') ? 16 : 0, qy = part.startsWith('b') ? 16 : 0;
  const q = new PixelBuffer(16, 16, P);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) q.set(x, y, big.get(x + qx, y + qy));
  if (part.startsWith('b')) { const g = b.clone(); return g.blit(q, 0, 0); }
  return q; // crowns overlay the ground tile below in the deco layer
}
function flowers(seed: string, col: number): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  const r = rngFor(seed);
  for (let i = 0; i < 5; i++) {
    const x = r.int(1, 13), y = r.int(2, 13);
    b.set(x, y + 1, C.g3);
    b.set(x, y, col); b.set(x + 1, y, col); b.set(x, y - 1, col === C.fw ? C.fy : C.fw);
  }
  return b;
}
function fence(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(0, 6, 16, 2, C.f2).rect(0, 10, 16, 2, C.f2).hline(0, 8, 16, C.f1).hline(0, 12, 16, C.f1);
  for (const x of [1, 11]) { b.rect(x, 3, 3, 12, C.f0).vline(x + 2, 3, 12, C.f3).hline(x, 3, 3, C.f2); }
  return b.outline(C.o);
}
function roof(row: 0 | 1, edge: 'l' | 'r' | null, col: [number, number, number, number]): PixelBuffer {
  const [a, b2, hi, dk] = col;
  const b = buf().fill(a);
  for (let y = 0; y < 16; y += 4) b.hline(0, y + 3, 16, b2);
  for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 4 : 0; x < 16; x += 8) b.vline(x, y, 3, hi);
  if (row === 0) b.hline(0, 0, 16, hi);
  if (row === 1) b.rect(0, 13, 16, 3, dk).hline(0, 12, 16, b2);
  if (edge === 'l') b.vline(0, 0, 16, C.o);
  if (edge === 'r') b.vline(15, 0, 16, C.o);
  if (row === 0) b.hline(0, 0, 16, C.o);
  return b;
}
function wall(kind: 'plain' | 'window' | 'door'): PixelBuffer {
  const b = buf().fill(C.s0);
  b.speckle(rngFor('wall'), [C.s1], 0.1);
  b.hline(0, 15, 16, C.s2);
  if (kind === 'window') {
    b.rect(3, 3, 10, 9, C.f3).rect(4, 4, 8, 7, C.gl0).rect(4, 4, 3, 3, C.wf).vline(7, 4, 7, C.f3).hline(4, 7, 8, C.f3);
    b.rect(2, 12, 12, 2, C.f1);
  }
  if (kind === 'door') {
    b.fill(C.s1).rect(3, 0, 10, 16, C.o).rect(4, 1, 8, 15, C.f1).rect(5, 2, 6, 13, C.f0).vline(8, 2, 13, C.f1);
    b.rect(10, 9, 2, 2, C.fl1);
  }
  return b;
}
function sign(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(7, 9, 2, 6, C.f3).rect(2, 2, 12, 8, C.f2).hline(2, 2, 12, C.f0).hline(2, 9, 12, C.f1);
  b.hline(4, 4, 8, C.f3).hline(4, 6, 6, C.f3);
  return b.outline(C.o);
}
function lamp(part: 'top' | 'base', f = 0): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  if (part === 'top') {
    b.rect(6, 4, 4, 7, C.fl1).rect(7, 5, 2, 5, f % 2 ? C.fl0 : C.wf).rect(5, 3, 6, 1, C.ir).rect(6, 11, 4, 1, C.ir).vline(7, 12, 4, C.ir).vline(8, 12, 4, C.ir);
    b.outline(C.o);
  } else {
    b.rect(7, 0, 2, 12, C.ir).rect(5, 12, 6, 3, C.ir).hline(5, 12, 6, C.st1).outline(C.o);
  }
  return b;
}
function rock(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(3, 7, 10, 7, C.st1).rect(5, 5, 7, 3, C.st1).rect(5, 5, 4, 2, C.st2).rect(3, 12, 10, 2, C.st0).set(4, 8, C.st2);
  return b.outline(C.o);
}
function bush(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(2, 6, 12, 8, C.l1).rect(4, 4, 8, 3, C.l1).rect(4, 4, 4, 2, C.l2).rect(2, 12, 12, 2, C.l3).set(10, 8, C.fw).set(5, 10, C.fw);
  return b.outline(C.o);
}
function interiorWall(kind: 'plain' | 'shelf' | 'window'): PixelBuffer {
  const b = buf().fill(C.s0);
  b.rect(0, 10, 16, 6, C.s1).hline(0, 10, 16, C.f1).hline(0, 9, 16, C.s2);
  if (kind === 'shelf') {
    b.fill(0).rect(1, 0, 14, 16, C.f2).rect(2, 1, 12, 6, C.f3).rect(2, 8, 12, 6, C.f3);
    const r = rngFor('books');
    for (let x = 2; x < 14; x += 2) { b.rect(x, 2 + r.int(0, 1), 2, 5, r.pick([C.r0, C.gl1, C.l0, C.fy])); b.rect(x, 9 + r.int(0, 1), 2, 4, r.pick([C.fp, C.w0, C.r2])); }
    b.outline(C.o);
  }
  if (kind === 'window') b.rect(4, 1, 8, 7, C.f3).rect(5, 2, 6, 5, C.gl0).rect(5, 2, 2, 2, C.wf).vline(8, 2, 5, C.f3);
  return b;
}
function bed(part: 'top' | 'bot'): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  if (part === 'top') b.rect(1, 3, 14, 13, C.f2).rect(2, 4, 12, 12, C.wf).rect(3, 5, 10, 4, C.gl0).outline(C.o);
  else b.rect(1, 0, 14, 12, C.wf).rect(1, 0, 14, 8, C.gl1).rect(1, 12, 14, 3, C.f2).outline(C.o);
  return b;
}
function table(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(1, 4, 14, 6, C.f2).rect(1, 10, 14, 2, C.f1).rect(2, 12, 2, 3, C.f3).rect(12, 12, 2, 3, C.f3).rect(5, 5, 4, 2, C.wf);
  return b.outline(C.o);
}
function plant(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(5, 10, 6, 5, C.r0).rect(5, 10, 6, 1, C.r2).rect(7, 4, 2, 6, C.l3).rect(3, 3, 5, 4, C.l1).rect(8, 5, 5, 4, C.l2);
  return b.outline(C.o);
}
function counter(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(0, 4, 16, 5, C.f2).hline(0, 4, 16, C.f2).rect(0, 9, 16, 7, C.f1).hline(0, 9, 16, C.f0).rect(2, 11, 12, 3, C.f0).hline(2, 13, 12, C.f1);
  return b.outline(C.o);
}
function pc(f: number): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(2, 1, 12, 9, C.st1).rect(3, 2, 10, 7, C.ir).rect(4, 3, 8, 5, f ? C.gl0 : C.gl1).hline(4, 3, 8, C.wf).rect(6, 10, 4, 2, C.st1).rect(3, 12, 10, 3, C.st2).hline(3, 13, 10, C.st1);
  b.set(11, 12, C.fl1);
  return b.outline(C.o);
}
function rug(): PixelBuffer {
  const b = buf().fill(C.ru0);
  b.rect(0, 0, 16, 1, C.ru1).rect(0, 15, 16, 1, C.ru1).vline(0, 0, 16, C.ru1).vline(15, 0, 16, C.ru1).rect(6, 6, 4, 4, C.ru1);
  return b;
}
function mat(): PixelBuffer {
  const b = woodFloor();
  b.rect(2, 4, 12, 9, C.r1).rect(3, 5, 10, 7, C.r0).hline(3, 8, 10, C.r2);
  return b;
}

const roofRed: [number, number, number, number] = [C.r0, C.r1, C.r2, C.r3];
const roofBlue: [number, number, number, number] = [C.w3, C.w0, C.w1, 41];
const s = (f: () => PixelBuffer, extra: Partial<TileDef> = {}): TileDef => ({ frames: 1, gen: f, ...extra });

const BASE: Record<string, TileDef> = {
  grass: s(() => grass('a')),
  grass2: s(() => grass('b')),
  tall_grass: { frames: 4, animMs: 260, grass: true, gen: tallGrass },
  path: s(() => path('a')),
  path2: s(() => path('b')),
  water: { frames: 4, animMs: 380, solid: true, gen: water },
  wood_floor: s(woodFloor),
  stone_floor: s(stoneFloor),
  tree_tl: s(() => tree('tl'), { solid: true, above: true }),
  tree_tr: s(() => tree('tr'), { solid: true, above: true }),
  tree_bl: s(() => tree('bl'), { solid: true }),
  tree_br: s(() => tree('br'), { solid: true }),
  flowers_y: s(() => flowers('fy', C.fy)),
  flowers_p: s(() => flowers('fp', C.fp)),
  fence: s(fence, { solid: true }),
  roof_t: s(() => roof(0, null, roofRed), { solid: true }),
  roof_tl: s(() => roof(0, 'l', roofRed), { solid: true }),
  roof_tr: s(() => roof(0, 'r', roofRed), { solid: true }),
  roof_b: s(() => roof(1, null, roofRed), { solid: true }),
  roof_bl: s(() => roof(1, 'l', roofRed), { solid: true }),
  roof_br: s(() => roof(1, 'r', roofRed), { solid: true }),
  roofb_t: s(() => roof(0, null, roofBlue), { solid: true }),
  roofb_tl: s(() => roof(0, 'l', roofBlue), { solid: true }),
  roofb_tr: s(() => roof(0, 'r', roofBlue), { solid: true }),
  roofb_b: s(() => roof(1, null, roofBlue), { solid: true }),
  roofb_bl: s(() => roof(1, 'l', roofBlue), { solid: true }),
  roofb_br: s(() => roof(1, 'r', roofBlue), { solid: true }),
  wall: s(() => wall('plain'), { solid: true }),
  wall_win: s(() => wall('window'), { solid: true }),
  door: s(() => wall('door')),
  sign: s(sign, { solid: true }),
  lamp_top: { frames: 2, animMs: 420, above: true, solid: true, gen: (f) => lamp('top', f) },
  lamp_base: s(() => lamp('base'), { solid: true }),
  rock: s(rock, { solid: true }),
  bush: s(bush, { solid: true }),
  in_wall: s(() => interiorWall('plain'), { solid: true }),
  in_shelf: s(() => interiorWall('shelf'), { solid: true }),
  in_window: s(() => interiorWall('window'), { solid: true }),
  bed_top: s(() => bed('top'), { solid: true }),
  bed_bot: s(() => bed('bot'), { solid: true }),
  table: s(table, { solid: true }),
  plant: s(plant, { solid: true }),
  rug: s(rug),
  counter: s(counter, { solid: true }),
  pc: { frames: 2, animMs: 700, solid: true, gen: pc },
  mat: s(mat),
  void: s(() => buf().fill(C.o), { solid: true }),
};

export const TILES: Record<string, TileDef> = { ...BASE, ...TILES2 };
