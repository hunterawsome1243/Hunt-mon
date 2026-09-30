import { PixelBuffer } from '../../engine/gfx/PixelBuffer';
import { Rng } from '../../engine/rng';
import type { TileDef } from './tiles';

// Second tileset: Brindlemoor (cobble/slate), Mistwood (forest), Hollowdeep (cave), gym, café, lab.
const P = [
  '', '#241a2e', // 1 outline
  '#9a9aa8', '#7c7c8c', '#b8b8c8', '#5e5e70', // 2-5 cobble: base, shade, light, dark
  '#6a7c9a', '#4e5e7c', '#8aa0c0', // 6-8 slate wall/roof: base, shade, light
  '#3e7a5a', '#2a5a42', '#5aa078', // 9-11 green roof
  '#2a4a34', '#1e3826', '#3e6a48', '#16281c', // 12-15 forest floor: base, dark, light, deepest
  '#7a5a36', '#5e4226', '#9a7a4a', // 16-18 leaf path
  '#2c2a3c', '#3c3a52', '#524e6c', '#1c1a28', // 19-22 cave rock: base, light, lighter, dark
  '#6fd0ff', '#b8ecff', '#3a8ac0', // 23-25 crystal
  '#e8e0cc', '#c8c0a8', '#a8a088', // 26-28 lab/cafe light tile
  '#8a5a3a', '#6a3f22', '#b07a4a', // 29-31 wood
  '#c8452f', '#f2d95c', '#f4ecd8', '#3a7a5a', // 32-35 accents: red, yellow, cream, green
  '#ffe98a', '#fff6c8', // 36-37 glow
  '#d8b088', '#a87c50', // 38-39 sand
  '#e0a8c0', '#7a3a5a', // 40-41 pink, wine
  '#4a7ac0', '#2a4a80', // 42-43 blue
];
const buf = () => new PixelBuffer(16, 16, P);
const rngFor = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return new Rng(h >>> 0); };
const s1 = (gen: () => PixelBuffer, extra: Partial<TileDef> = {}): TileDef => ({ frames: 1, gen, ...extra });

// ---- Brindlemoor ----
function cobble(seed: string): PixelBuffer {
  const b = buf().fill(3);
  const r = rngFor(seed);
  for (let y = 0; y < 16; y += 4) {
    const off = (y / 4) % 2 ? 4 : 0;
    for (let x = -off; x < 16; x += 8) {
      b.rect(x + 1, y + 1, 6, 2, 2).hline(x + 1, y + 1, 6, 4).hline(x + 1, y + 3, 6, 5);
      b.speckle(r, [3], 0.0);
    }
    b.hline(0, y, 16, 5);
  }
  b.speckle(r, [4, 5], 0.05);
  return b;
}
function slateWall(kind: 'plain' | 'window'): PixelBuffer {
  const b = buf().fill(6);
  for (let y = 0; y < 16; y += 4) { b.hline(0, y, 16, 7); for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) b.vline(x, y, 4, 7); }
  b.speckle(rngFor('sw'), [8], 0.06);
  b.hline(0, 15, 16, 7);
  if (kind === 'window') b.rect(3, 3, 10, 9, 30).rect(4, 4, 8, 7, 23).rect(4, 4, 3, 3, 24).vline(8, 4, 7, 30).rect(2, 12, 12, 2, 29);
  return b;
}
function greenRoof(row: 0 | 1, edge: 'l' | 'r' | null): PixelBuffer {
  const b = buf().fill(9);
  for (let y = 0; y < 16; y += 4) b.hline(0, y + 3, 16, 10);
  for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 4 : 0; x < 16; x += 8) b.vline(x, y, 3, 11);
  if (row === 0) b.hline(0, 0, 16, 1);
  if (row === 1) b.rect(0, 13, 16, 3, 10).hline(0, 12, 16, 9);
  if (edge === 'l') b.vline(0, 0, 16, 1);
  if (edge === 'r') b.vline(15, 0, 16, 1);
  return b;
}
function bridge(): PixelBuffer {
  const b = buf().fill(30);
  for (let y = 0; y < 16; y += 4) b.hline(0, y + 3, 16, 29).hline(0, y, 16, 31);
  b.vline(0, 0, 16, 1).vline(15, 0, 16, 1);
  return b;
}
function bench(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(1, 6, 14, 3, 31).rect(1, 9, 14, 2, 29).rect(2, 11, 2, 4, 30).rect(12, 11, 2, 4, 30).rect(1, 3, 14, 2, 30);
  return b.outline(1);
}
function lantern(f: number): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(7, 6, 2, 10, 19).rect(5, 2, 6, 5, f ? 36 : 35).rect(6, 3, 4, 3, 37).rect(4, 1, 8, 1, 19);
  return b.outline(1);
}
function cliff(top: boolean): PixelBuffer {
  const b = buf().fill(top ? 4 : 5);
  const r = rngFor(top ? 'ct' : 'cb');
  b.speckle(r, [2, 3], 0.25);
  if (top) b.rect(0, 0, 16, 3, 2).hline(0, 3, 16, 1);
  else for (let x = 0; x < 16; x += 5) b.vline(x + (x % 3), 0, 16, 1);
  return b;
}
function banner(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(3, 0, 10, 13, 32).rect(3, 13, 3, 3, 32).rect(10, 13, 3, 3, 32).rect(7, 13, 2, 2, 32);
  b.rect(6, 3, 4, 4, 33).rect(7, 7, 2, 3, 33).hline(3, 0, 10, 1);
  return b.outline(1);
}

// ---- Mistwood ----
function forestFloor(seed: string): PixelBuffer {
  const b = buf().fill(12);
  const r = rngFor(seed);
  b.speckle(r, [13, 14], 0.22).speckle(r, [15], 0.04);
  for (let i = 0; i < 3; i++) { const x = r.int(1, 13), y = r.int(1, 13); b.set(x, y, 14).set(x + 1, y - 1, 14); }
  return b;
}
function leafPath(seed: string): PixelBuffer {
  const b = buf().fill(16);
  const r = rngFor(seed);
  b.speckle(r, [17, 18], 0.16);
  for (let i = 0; i < 4; i++) { const x = r.int(1, 13), y = r.int(1, 13); b.set(x, y, 35).set(x + 1, y, 10); }
  return b;
}
function darkGrass(f: number): PixelBuffer {
  const b = forestFloor('dg');
  const sway = [0, 1, 0, -1][f];
  for (let x = 0; x < 16; x += 2) {
    const h = 6 + ((x * 5) % 5);
    for (let y = 0; y < h; y++) { const off = Math.round((sway * (h - y)) / 4); b.set(x + off, 15 - y, y < 2 ? 11 : y < h - 3 ? 10 : 13); b.set(x + 1 + off, 15 - y + 1 > 15 ? 15 : 15 - y + 1, 13); }
  }
  return b;
}
function darkTree(part: 'tl' | 'tr' | 'bl' | 'br'): PixelBuffer {
  const big = new PixelBuffer(32, 32, P);
  const r = rngFor('dtree');
  for (let y = 0; y < 26; y++) for (let x = 0; x < 32; x++) {
    const dx = (x - 15.5) / 15.5, dy = (y - 12) / 13;
    if (dx * dx + dy * dy < 1) { const l = (x - 15.5) * -0.5 + (y - 12) * -0.5; big.set(x, y, l > 5 ? 14 : l > -2 ? 10 : l > -8 ? 13 : 15); }
  }
  big.speckle(r, [14, 15], 0.12, 10).outline(1);
  big.rect(13, 24, 6, 8, 17).rect(17, 24, 2, 8, 18).rect(12, 30, 8, 2, 18);
  const qx = part.includes('r') ? 16 : 0, qy = part.startsWith('b') ? 16 : 0;
  const q = new PixelBuffer(16, 16, P);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) q.set(x, y, big.get(x + qx, y + qy));
  if (part.startsWith('b')) return forestFloor('tb').blit(q, 0, 0);
  return q;
}
function mushroom(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(7, 9, 3, 5, 34);
  b.rect(3, 5, 10, 5, 32).rect(4, 4, 8, 1, 32).rect(5, 6, 2, 2, 34).rect(9, 7, 2, 2, 34);
  return b.outline(1);
}
function log(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(0, 5, 16, 9, 30).rect(0, 5, 16, 2, 31).rect(0, 12, 16, 2, 29).vline(3, 7, 5, 29).vline(9, 7, 5, 29);
  b.rect(0, 6, 3, 7, 18).rect(1, 8, 1, 3, 17);
  return b.outline(1);
}
function fern(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  for (let i = 0; i < 5; i++) { const a = -1 + i * 0.5; for (let k = 0; k < 7; k++) b.set(Math.round(8 + Math.sin(a) * k), Math.round(14 - Math.cos(a) * k * 1.2), k < 5 ? 11 : 10); }
  return b;
}
function glowFlower(f: number): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  const r = rngFor('gf');
  for (let i = 0; i < 3; i++) {
    const x = r.int(2, 12), y = r.int(4, 13);
    b.set(x, y + 1, 10).set(x, y + 2, 10);
    b.set(x, y, (i + f) % 2 ? 36 : 37).set(x - 1, y, 24).set(x + 1, y, 24);
  }
  return b;
}

// ---- Hollowdeep ----
function caveFloor(seed: string): PixelBuffer {
  const b = buf().fill(19);
  const r = rngFor(seed);
  b.speckle(r, [20, 22], 0.2).speckle(r, [21], 0.04);
  return b;
}
function caveWall(): PixelBuffer {
  const b = buf().fill(22);
  const r = rngFor('cw');
  b.speckle(r, [19], 0.35).speckle(r, [20], 0.08);
  for (let x = 0; x < 16; x += 4) b.vline(x + (x % 3), 0, 16, 22);
  b.hline(0, 14, 16, 19).hline(0, 15, 16, 1);
  return b;
}
function stalagmite(): PixelBuffer {
  const b = caveFloor('st');
  for (let y = 0; y < 13; y++) { const w = Math.round(1 + y * 0.45); b.rect(8 - w, 2 + y, w * 2, 1, y < 6 ? 21 : 20); b.set(8 - w, 2 + y, 1); b.set(8 + w - 1, 2 + y, 1); }
  b.hline(3, 15, 10, 1);
  return b;
}
function crystal(f: number): PixelBuffer {
  const b = caveFloor('cr');
  for (const [x, h, w] of [[4, 9, 2], [8, 12, 3], [12, 7, 2]] as const) for (let y = 0; y < h; y++) { const ww = Math.max(1, Math.round(w * (1 - y / (h + 2)) * 1.6)); b.rect(x - ww / 2, 14 - y, ww, 1, y % 5 === f ? 24 : 23); b.set(x - Math.floor(ww / 2), 14 - y, 25); }
  b.set(8, 4, 24).set(8, 3, 24);
  return b.outline(1);
}
function puddle(f: number): PixelBuffer {
  const b = caveFloor('pd');
  for (let y = 4; y < 13; y++) for (let x = 2; x < 14; x++) { const d = ((x - 8) / 6) ** 2 + ((y - 8) / 4.4) ** 2; if (d < 1) b.set(x, y, d > 0.8 ? 25 : (x + f * 2 + y) % 6 === 0 ? 24 : 23); }
  return b;
}
function rubble(f: number): PixelBuffer {
  const b = caveFloor('rb');
  const r = rngFor('rub' + f);
  for (let i = 0; i < 6; i++) b.set(r.int(1, 14), r.int(1, 14), 21).set(r.int(1, 14), r.int(1, 14), 22);
  for (let i = 0; i < 3; i++) { const x = 3 + i * 4, y = 10 + ((i * 3 + f) % 4); b.rect(x, y, 2, 1, 20).set(x, y - 1, 21); }
  return b;
}

// ---- interiors ----
function gymFloor(): PixelBuffer {
  const b = buf();
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) b.rect(x * 8, y * 8, 8, 8, (x + y) % 2 ? 3 : 2);
  b.hline(0, 0, 16, 4).vline(0, 0, 16, 4).hline(0, 8, 16, 5);
  return b;
}
function gymPillar(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(3, 0, 10, 16, 4).rect(3, 0, 3, 16, 26).rect(10, 0, 3, 16, 3).rect(2, 0, 12, 2, 2).rect(2, 14, 12, 2, 2);
  return b.outline(1);
}
function gymWall(): PixelBuffer {
  const b = buf().fill(7);
  for (let x = 0; x < 16; x += 8) b.vline(x, 0, 16, 6);
  b.rect(0, 12, 16, 4, 6).hline(0, 11, 16, 8);
  return b;
}
function cafeFloor(): PixelBuffer {
  const b = buf();
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) b.rect(x * 8, y * 8, 8, 8, (x + y) % 2 ? 38 : 39);
  b.hline(0, 0, 16, 38);
  return b;
}
function cafeTable(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(3, 4, 10, 6, 31).rect(3, 9, 10, 2, 29).rect(7, 11, 2, 4, 30).rect(5, 14, 6, 1, 30);
  b.rect(5, 2, 3, 3, 34).set(6, 1, 34).rect(9, 3, 2, 2, 32);
  return b.outline(1);
}
function coffeeMachine(f: number): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(2, 2, 12, 11, 20).rect(3, 3, 10, 4, 21).rect(5, 8, 6, 5, 19).rect(6, 10, 4, 3, 34).set(11, 4, f ? 32 : 35).rect(2, 13, 12, 2, 29);
  return b.outline(1);
}
function cakeCase(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(1, 3, 14, 9, 23).rect(2, 4, 12, 7, 26).rect(3, 7, 4, 4, 40).rect(4, 5, 2, 2, 32).rect(8, 8, 5, 3, 34).rect(1, 12, 14, 3, 30);
  return b.outline(1);
}
function labFloor(): PixelBuffer {
  const b = buf().fill(26);
  b.hline(0, 7, 16, 27).vline(7, 0, 16, 27).hline(0, 15, 16, 28).vline(15, 0, 16, 28);
  return b;
}
function labBench(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(0, 7, 16, 8, 20).rect(0, 7, 16, 2, 21).rect(2, 2, 3, 6, 23).rect(3, 1, 1, 2, 23).rect(7, 4, 3, 4, 32).rect(11, 3, 3, 5, 35);
  return b.outline(1);
}
function machine(f: number): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(1, 1, 14, 14, 20).rect(2, 2, 12, 6, 19).rect(3, 3, 10, 4, 23).rect(3, 9, 3, 3, f ? 32 : 35).rect(7, 9, 3, 3, f ? 35 : 34).rect(11, 9, 3, 3, 34);
  return b.outline(1);
}
function telescope(): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(3, 2, 10, 4, 21).rect(11, 1, 3, 6, 20).rect(7, 6, 2, 8, 19).rect(3, 13, 10, 2, 19).rect(1, 2, 3, 4, 23);
  return b.outline(1);
}
function sandTile(seed: string): PixelBuffer {
  const b = buf().fill(38);
  b.speckle(rngFor(seed), [39], 0.12);
  return b;
}
function sparkle(f: number): PixelBuffer {
  const b = new PixelBuffer(16, 16, P);
  b.rect(5, 6, 6, 6, 32).rect(6, 5, 4, 1, 32).rect(4, 7, 1, 4, 32).rect(11, 7, 1, 4, 32).rect(6, 7, 2, 2, 37).rect(7, 12, 2, 1, 1);
  b.outline(1);
  const p = f ? [[2, 2], [13, 3], [3, 12]] : [[13, 2], [2, 4], [12, 12]];
  for (const [x, y] of p) b.set(x, y, 36).set(x, y - 1, 37);
  return b;
}

const roofG = (row: 0 | 1, e: 'l' | 'r' | null) => s1(() => greenRoof(row, e), { solid: true });

export const TILES2: Record<string, TileDef> = {
  cobble: s1(() => cobble('a')), cobble2: s1(() => cobble('b')),
  slate_wall: s1(() => slateWall('plain'), { solid: true }), slate_win: s1(() => slateWall('window'), { solid: true }),
  roofg_t: roofG(0, null), roofg_tl: roofG(0, 'l'), roofg_tr: roofG(0, 'r'), roofg_b: roofG(1, null), roofg_bl: roofG(1, 'l'), roofg_br: roofG(1, 'r'),
  bridge: s1(bridge), bench: s1(bench, { solid: true }), lantern: { frames: 2, animMs: 500, solid: true, above: false, gen: lantern },
  cliff: s1(() => cliff(false), { solid: true }), cliff_top: s1(() => cliff(true), { solid: true }), banner: s1(banner, { solid: true }),
  sand: s1(() => sandTile('a')), sand2: s1(() => sandTile('b')),

  forest_floor: s1(() => forestFloor('a')), forest_floor2: s1(() => forestFloor('b')),
  leaf_path: s1(() => leafPath('a')), leaf_path2: s1(() => leafPath('b')),
  dark_grass: { frames: 4, animMs: 280, grass: true, gen: darkGrass },
  dtree_tl: s1(() => darkTree('tl'), { solid: true, above: true }), dtree_tr: s1(() => darkTree('tr'), { solid: true, above: true }),
  dtree_bl: s1(() => darkTree('bl'), { solid: true }), dtree_br: s1(() => darkTree('br'), { solid: true }),
  mushroom: s1(mushroom, { solid: true }), log: s1(log, { solid: true }), fern: s1(fern),
  glow_flower: { frames: 2, animMs: 650, gen: glowFlower },

  cave_floor: s1(() => caveFloor('a')), cave_floor2: s1(() => caveFloor('b')),
  cave_wall: s1(caveWall, { solid: true }), stalagmite: s1(stalagmite, { solid: true }),
  crystal: { frames: 5, animMs: 420, solid: true, gen: crystal },
  puddle: { frames: 3, animMs: 500, gen: puddle },
  rubble: { frames: 3, animMs: 600, grass: true, gen: rubble },

  gym_floor: s1(gymFloor), gym_pillar: s1(gymPillar, { solid: true }), gym_wall: s1(gymWall, { solid: true }),
  cafe_floor: s1(cafeFloor), cafe_table: s1(cafeTable, { solid: true }),
  coffee: { frames: 2, animMs: 800, solid: true, gen: coffeeMachine }, cake_case: s1(cakeCase, { solid: true }),
  lab_floor: s1(labFloor), lab_bench: s1(labBench, { solid: true }), machine: { frames: 2, animMs: 600, solid: true, gen: machine }, telescope: s1(telescope, { solid: true }),
  sparkle: { frames: 2, animMs: 400, gen: sparkle },
};
