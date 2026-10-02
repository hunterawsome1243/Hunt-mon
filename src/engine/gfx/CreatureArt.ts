import type { CreatureArt } from '../../data/types';
import { mix, shade } from '../../data/art/characters';
import { PixelBuffer } from './PixelBuffer';

export const MON_SIZE = 56;

// palette indices
const OL = 1, MAIN = 2, SHD = 3, LIT = 4, ACC = 5, ACS = 6, BEL = 7, EYW = 8, EYE = 9, DARK = 10, WHITE = 11, IRIS = 12, OL_ACC = 13, OL_BEL = 14;

/** Light from the top-left: lift body pixels on top/left silhouette edges, then outline with a tone that matches the neighbour. */
function finish(b: PixelBuffer): PixelBuffer {
  const src = b.data.slice();
  const at = (x: number, y: number): number => (x >= 0 && y >= 0 && x < b.w && y < b.h ? src[y * b.w + x] : 0);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    if (at(x, y) === MAIN && (!at(x, y - 1) || !at(x - 1, y))) b.data[y * b.w + x] = LIT;
  }
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    if (at(x, y)) continue;
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      const v = at(x + dx, y + dy);
      if (v) { b.data[y * b.w + x] = v === ACC || v === ACS ? OL_ACC : v === BEL || v === WHITE || v === EYW ? OL_BEL : OL; break; }
    }
  }
  return b;
}

interface Ell { x: number; y: number; rx: number; ry: number }

/** Draws scaled about the ground point (28, 52) so `size` shrinks/grows a creature without changing its layout. */
class Painter {
  constructor(public b: PixelBuffer, private s: number) {}
  X = (x: number): number => 28 + (x - 28) * this.s;
  Y = (y: number): number => 52 + (y - 52) * this.s;
  R = (r: number): number => Math.max(1, r * this.s);

  /** Lit ellipse: light from top-left, dithered bands. */
  ell(e: Ell, main = MAIN, shd = SHD, lit = LIT): void {
    const cx = this.X(e.x), cy = this.Y(e.y), rx = this.R(e.rx), ry = this.R(e.ry);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
        if (u * u + v * v > 1) continue;
        const l = -(u * 0.55 + v * 0.75);
        const chk = (x + y) & 1;
        let c = main;
        if (l > 0.55) c = lit; else if (l > 0.49) c = chk ? lit : main;
        else if (l < -0.4) c = shd; else if (l < -0.34) c = chk ? shd : main;
        this.b.set(x, y, c);
      }
    }
  }
  flat(e: Ell, c: number): void {
    const cx = this.X(e.x), cy = this.Y(e.y), rx = this.R(e.rx), ry = this.R(e.ry);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
      if (u * u + v * v <= 1) this.b.set(x, y, c);
    }
  }
  tri(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, c: number): void {
    const [ax, ay, bx, by, cx, cy] = [this.X(x1), this.Y(y1), this.X(x2), this.Y(y2), this.X(x3), this.Y(y3)];
    const minX = Math.floor(Math.min(ax, bx, cx)), maxX = Math.ceil(Math.max(ax, bx, cx));
    const minY = Math.floor(Math.min(ay, by, cy)), maxY = Math.ceil(Math.max(ay, by, cy));
    const d = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay) || 1;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w1 = ((px - ax) * (cy - ay) - (cx - ax) * (py - ay)) / d;
      const w2 = ((bx - ax) * (py - ay) - (px - ax) * (by - ay)) / d;
      if (w1 >= 0 && w2 >= 0 && w1 + w2 <= 1) this.b.set(x, y, c);
    }
  }
  px(x: number, y: number, c: number, w = 1, h = 1): void { this.b.rect(Math.round(this.X(x)), Math.round(this.Y(y)), w, h, c); }
  line(x1: number, y1: number, x2: number, y2: number, c: number): void {
    const [ax, ay, bx, by] = [this.X(x1), this.Y(y1), this.X(x2), this.Y(y2)];
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
    for (let i = 0; i <= n; i++) this.b.set(Math.round(ax + ((bx - ax) * i) / n), Math.round(ay + ((by - ay) * i) / n), c);
  }
}

interface Layout { head: Ell; body: Ell; eyes: [number, number, number]; mouth: [number, number]; earsAt: number; topY: number; hasFeet?: Ell[]; arms?: Ell[] }

function layoutFor(plan: CreatureArt['plan']): Layout {
  switch (plan) {
    case 'blob': return { head: { x: 28, y: 34, rx: 18, ry: 16 }, body: { x: 28, y: 34, rx: 18, ry: 16 }, eyes: [21, 35, 31], mouth: [28, 41], earsAt: 20, topY: 18,
      hasFeet: [{ x: 20, y: 50, rx: 6, ry: 3 }, { x: 36, y: 50, rx: 6, ry: 3 }], arms: [{ x: 9, y: 39, rx: 4, ry: 6 }, { x: 47, y: 39, rx: 4, ry: 6 }] };
    case 'quad': return { head: { x: 28, y: 26, rx: 14, ry: 12 }, body: { x: 28, y: 42, rx: 17, ry: 11 }, eyes: [22, 26, 34], mouth: [28, 32], earsAt: 16, topY: 14,
      hasFeet: [{ x: 17, y: 50, rx: 5, ry: 4 }, { x: 39, y: 50, rx: 5, ry: 4 }] };
    case 'biped': return { head: { x: 28, y: 15, rx: 11, ry: 10 }, body: { x: 28, y: 33, rx: 13, ry: 13 }, eyes: [23, 15, 33], mouth: [28, 20], earsAt: 8, topY: 5,
      hasFeet: [{ x: 21, y: 48, rx: 6, ry: 5 }, { x: 35, y: 48, rx: 6, ry: 5 }], arms: [{ x: 11, y: 33, rx: 5, ry: 10 }, { x: 45, y: 33, rx: 5, ry: 10 }] };
    case 'bird': return { head: { x: 28, y: 18, rx: 10, ry: 9 }, body: { x: 28, y: 37, rx: 14, ry: 14 }, eyes: [23, 17, 33], mouth: [28, 24], earsAt: 10, topY: 8,
      hasFeet: [{ x: 22, y: 51, rx: 4, ry: 2 }, { x: 34, y: 51, rx: 4, ry: 2 }] };
    case 'serpent': return { head: { x: 28, y: 17, rx: 10, ry: 9 }, body: { x: 28, y: 42, rx: 20, ry: 9 }, eyes: [23, 17, 33], mouth: [28, 23], earsAt: 10, topY: 8 };
    case 'insect': return { head: { x: 28, y: 16, rx: 9, ry: 8 }, body: { x: 28, y: 30, rx: 8, ry: 8 }, eyes: [23, 16, 33], mouth: [28, 21], earsAt: 10, topY: 8 };
    case 'floater': return { head: { x: 28, y: 26, rx: 16, ry: 16 }, body: { x: 28, y: 26, rx: 16, ry: 16 }, eyes: [21, 27, 35], mouth: [28, 34], earsAt: 12, topY: 10 };
  }
}

function drawCreature(art: CreatureArt, back: boolean): PixelBuffer {
  const [main, shd, lit, acc, bel] = art.pal;
  const outline = shade(shd, 0.4);
  const pal = ['', outline, main, shd, lit, acc, shade(acc, 0.7), bel, '#ffffff', '#2a1d2e', '#3a1a24', '#ffffff', art.eye ?? '#2a1d2e', shade(acc, 0.4), mix(outline, bel, 0.45)];
  const b = new PixelBuffer(MON_SIZE, MON_SIZE, pal);
  const s = art.size * (back ? 1.12 : 1);
  const p = new Painter(b, s);
  const L = layoutFor(art.plan);
  const f = new Set(art.feats);
  const { head, body } = L;
  const big = f.has('bigeyes');

  // ---- behind-body features ----
  if (f.has('mane')) p.ell({ x: head.x, y: head.y + 1, rx: head.rx + 5, ry: head.ry + 5 }, LIT, SHD, LIT);
  if (f.has('flametail')) {
    p.tri(42, 44, 55, 26, 50, 46, ACS); p.tri(44, 46, 52, 30, 49, 47, ACC);
    p.ell({ x: 46, y: 36, rx: 5, ry: 8 }, ACC, ACS, ACC); p.ell({ x: 46, y: 37, rx: 2.5, ry: 5 }, LIT, ACC, LIT);
  }
  if (f.has('leaftail')) { p.ell({ x: 47, y: 34, rx: 5, ry: 11 }, LIT, MAIN, LIT); p.line(47, 24, 47, 44, SHD); }
  if (f.has('bolttail')) {
    p.tri(40, 46, 56, 24, 48, 34, LIT); p.tri(48, 34, 56, 22, 44, 26, ACC); p.tri(38, 46, 50, 30, 44, 40, MAIN);
  }
  if (f.has('wings') && art.plan !== 'insect') {
    const wc = art.plan === 'bird' ? [MAIN, SHD, LIT] : [ACC, ACS, LIT];
    p.ell({ x: 9, y: 34, rx: 8, ry: 15 }, wc[0], wc[1], wc[2]); p.ell({ x: 47, y: 34, rx: 8, ry: 15 }, wc[0], wc[1], wc[2]);
    p.tri(2, 44, 8, 30, 12, 50, wc[1]); p.tri(54, 44, 48, 30, 44, 50, wc[1]);
  }
  if (art.plan === 'insect') {
    // translucent-looking big wings: light fill with accent edge
    for (const sx of [-1, 1]) {
      const cx = 28 + sx * 19;
      p.ell({ x: cx, y: 24, rx: 11, ry: 17 }, ACS, ACS, ACS); p.ell({ x: cx, y: 24, rx: 9, ry: 15 }, LIT, LIT, BEL);
      p.line(28 + sx * 10, 28, cx + sx * 3, 12, ACS); p.line(28 + sx * 10, 30, cx + sx * 4, 26, ACS);
    }
  }
  if (art.plan === 'floater') {
    // wispy tapered tail
    for (let i = 0; i < 6; i++) {
      const y = 38 + i * 3, w = 14 - i * 2.2, off = Math.sin(i * 1.3) * 3;
      p.ell({ x: 28 + off, y, rx: Math.max(2, w), ry: 3.4 }, i % 2 ? MAIN : SHD, SHD, MAIN);
    }
  }
  if (art.plan === 'serpent') {
    p.ell({ x: 28, y: 46, rx: 21, ry: 7 }); p.ell({ x: 28, y: 39, rx: 16, ry: 7 }); p.ell({ x: 28, y: 32, rx: 11, ry: 7 }); p.ell({ x: 28, y: 25, rx: 8, ry: 7 });
    p.ell({ x: 46, y: 50, rx: 6, ry: 3 }, MAIN, SHD, LIT); p.tri(50, 50, 56, 46, 52, 54, SHD);
    p.ell({ x: 28, y: 18, rx: 15, ry: 10 }, SHD, SHD, MAIN); // hood
  }
  if (art.plan === 'bird') { p.tri(22, 46, 28, 56, 34, 46, SHD); p.tri(18, 44, 22, 54, 26, 46, MAIN); p.tri(38, 44, 34, 54, 30, 46, MAIN); }

  // ---- limbs & body ----
  for (const a of L.hasFeet ?? []) p.ell(a, MAIN, SHD, LIT);
  if (art.plan === 'insect') {
    for (const sx of [-1, 1]) for (const dy of [0, 5, 10]) p.line(28 + sx * 6, 28 + dy, 28 + sx * (14 + dy * 0.3), 36 + dy * 1.4, SHD);
    p.ell({ x: 28, y: 44, rx: 8, ry: 11 });
  }
  if (art.plan !== 'serpent') p.ell(body);
  for (const a of L.arms ?? []) p.ell(a, MAIN, SHD, LIT);
  if (art.plan === 'quad') { p.ell(body); }
  if (f.has('belly') && !back) {
    const be = art.plan === 'blob' ? { x: 28, y: 42, rx: 11, ry: 9 } : art.plan === 'quad' ? { x: 28, y: 44, rx: 9, ry: 8 }
      : art.plan === 'serpent' ? { x: 28, y: 38, rx: 8, ry: 14 } : { x: 28, y: 37, rx: 8, ry: 9 };
    p.flat(be, BEL);
    p.ell({ x: be.x, y: be.y + 1, rx: be.rx - 1, ry: be.ry - 1 }, BEL, BEL, BEL);
  }
  if (f.has('armor')) {
    p.ell({ x: body.x - 11, y: body.y - 4, rx: 5, ry: 4 }, ACC, ACS, ACC); p.ell({ x: body.x + 11, y: body.y - 4, rx: 5, ry: 4 }, ACC, ACS, ACC);
    if (!back) p.ell({ x: body.x, y: body.y + 2, rx: 7, ry: 6 }, ACC, ACS, ACC);
  }
  if (f.has('stripes')) {
    for (let y = Math.floor(body.y - body.ry); y < body.y + body.ry; y += 5) for (let x = 0; x < MON_SIZE; x++) {
      const v = b.get(x, Math.round(p.Y(y)));
      if (v === MAIN || v === LIT || v === SHD) b.set(x, Math.round(p.Y(y)), ACS);
    }
  }
  if (art.plan !== 'blob' && art.plan !== 'floater' && art.plan !== 'insect') p.ell(head);
  if (art.plan === 'insect') { p.ell(head); }
  if (f.has('spikes')) for (let i = -2; i <= 2; i++) p.tri(28 + i * 6 - 3, body.y - body.ry + 3 + Math.abs(i), 28 + i * 6, body.y - body.ry - 6 + Math.abs(i) * 1.5, 28 + i * 6 + 3, body.y - body.ry + 3 + Math.abs(i), LIT);
  if (f.has('fins')) { p.tri(head.x - head.rx + 1, head.y - 3, head.x - head.rx - 8, head.y - 9, head.x - head.rx + 2, head.y + 5, LIT); p.tri(head.x + head.rx - 1, head.y - 3, head.x + head.rx + 8, head.y - 9, head.x + head.rx - 2, head.y + 5, LIT); }

  // ---- head features ----
  if (f.has('ears')) {
    for (const sx of [-1, 1]) {
      const ex = head.x + sx * (head.rx - 3);
      p.tri(ex - 5, L.earsAt + 5, ex + sx * 1, L.topY - 5, ex + 5, L.earsAt + 5, MAIN);
      p.tri(ex - 3, L.earsAt + 4, ex + sx * 0.5, L.topY - 1, ex + 3, L.earsAt + 4, back ? SHD : BEL);
    }
  }
  if (f.has('horns')) for (const sx of [-1, 1]) p.tri(head.x + sx * 5 - 2, L.topY + 5, head.x + sx * 9, L.topY - 6, head.x + sx * 5 + 3, L.topY + 5, LIT), p.px(head.x + sx * 8, L.topY - 3, WHITE);
  if (f.has('crest_flame')) {
    for (const [dx, h] of [[-5, 8], [0, 12], [5, 8]] as const) { p.tri(head.x + dx - 3, L.topY + 4, head.x + dx, L.topY - h, head.x + dx + 3, L.topY + 4, ACC); p.tri(head.x + dx - 1.5, L.topY + 4, head.x + dx, L.topY - h + 5, head.x + dx + 1.5, L.topY + 4, LIT); }
  }
  if (f.has('crest_leaf')) {
    p.ell({ x: head.x - 5, y: L.topY - 1, rx: 3, ry: 7 }, LIT, MAIN, LIT); p.ell({ x: head.x + 5, y: L.topY - 1, rx: 3, ry: 7 }, LIT, MAIN, LIT);
    p.ell({ x: head.x, y: L.topY - 3, rx: 3, ry: 8 }, MAIN, SHD, LIT); p.flat({ x: head.x, y: L.topY - 9, rx: 2.5, ry: 2.5 }, ACC);
  }
  if (f.has('crest_crystal')) for (const [dx, h] of [[-6, 7], [0, 11], [6, 7]] as const) { p.tri(head.x + dx - 3, L.topY + 4, head.x + dx, L.topY - h, head.x + dx + 3, L.topY + 4, ACC); p.tri(head.x + dx, L.topY + 4, head.x + dx, L.topY - h, head.x + dx + 3, L.topY + 4, ACS); }
  if (art.plan === 'insect') {
    p.line(head.x - 4, head.y - 6, head.x - 10, head.y - 15, SHD); p.line(head.x + 4, head.y - 6, head.x + 10, head.y - 15, SHD);
    p.flat({ x: head.x - 10, y: head.y - 15, rx: 2, ry: 2 }, ACC); p.flat({ x: head.x + 10, y: head.y - 15, rx: 2, ry: 2 }, ACC);
  }
  if (art.plan === 'bird' && !back) { p.tri(head.x - 4, head.y + 3, head.x, head.y + 10, head.x + 4, head.y + 3, ACC); p.tri(head.x - 4, head.y + 3, head.x, head.y + 6, head.x + 4, head.y + 3, LIT); }

  // ---- face ----
  if (!back) {
    const [ex1, ey, ex2] = L.eyes;
    const fierce = !!art.eye;
    for (const ex of [ex1, ex2]) {
      if (fierce) {
        p.px(ex - 1, ey - 1, EYW, 4, 3); p.px(ex, ey - 1, IRIS, 2, 3); p.px(ex + 0.5, ey, DARK, 1, 1);
        p.px(ex - 2, ey - 2 - (ex < 28 ? 0 : 0), DARK, 5, 1);
      } else if (big) {
        p.px(ex - 1, ey - 2, DARK, 4, 5); p.px(ex - 1, ey - 2, EYW, 1, 2); p.px(ex + 1, ey + 1, EYW, 1, 1);
      } else {
        p.px(ex - 1, ey - 1, EYE, 3, 4); p.px(ex - 1, ey - 1, EYW, 1, 1);
      }
    }
    if (art.plan === 'quad' || art.plan === 'biped' || art.plan === 'bird') {
      if (art.plan === 'quad') { p.ell({ x: 28, y: head.y + 5, rx: 6, ry: 4 }, BEL, BEL, BEL); p.px(27, head.y + 3, DARK, 3, 2); }
    }
    const [mx, my] = L.mouth;
    if (art.plan !== 'bird') { p.px(mx - 2, my, DARK, 5, 1); p.px(mx - 3, my - 1, DARK, 1, 1); p.px(mx + 3, my - 1, DARK, 1, 1); }
    if (f.has('fangs')) { p.px(mx - 3, my + 1, WHITE, 1, 2); p.px(mx + 2, my + 1, WHITE, 1, 2); }
    if (art.plan === 'blob' && !f.has('bigeyes')) { p.px(ex1 - 3, ey + 3, LIT, 2, 1); p.px(ex2 + 2, ey + 3, LIT, 2, 1); }
  } else {
    // back view: spine highlight
    p.ell({ x: body.x, y: body.y - body.ry * 0.3, rx: 3, ry: body.ry * 0.7 }, LIT, LIT, LIT);
  }
  return finish(b);
}

export const creatureFront = (a: CreatureArt): PixelBuffer => drawCreature(a, false);
export const creatureBack = (a: CreatureArt): PixelBuffer => drawCreature(a, true);

/** Half-size icon using the most common opaque colour of each 2x2 block. */
export function creatureIcon(front: PixelBuffer): PixelBuffer {
  const out = new PixelBuffer(front.w / 2, front.h / 2, front.palette);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const cnt: Record<number, number> = {};
    let op = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const v = front.get(x * 2 + dx, y * 2 + dy); if (v) { cnt[v] = (cnt[v] ?? 0) + 1; op++; } }
    if (op < 2) continue;
    let best = 0, bn = 0;
    for (const [k, n] of Object.entries(cnt)) { if (n > bn || (n === bn && Number(k) === 1)) { best = Number(k); bn = n; } }
    out.set(x, y, best);
  }
  return out;
}
