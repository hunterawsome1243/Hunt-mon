import { Rng } from '../rng';

/** A palette-indexed pixel canvas. Index 0 is always transparent. */
export class PixelBuffer {
  data: Uint8Array;
  constructor(public w: number, public h: number, public palette: string[]) {
    this.data = new Uint8Array(w * h);
  }
  set(x: number, y: number, c: number): this {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = c;
    return this;
  }
  get(x: number, y: number): number {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.data[y * this.w + x] : 0;
  }
  rect(x: number, y: number, w: number, h: number, c: number): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }
  hline(x: number, y: number, w: number, c: number): this { return this.rect(x, y, w, 1, c); }
  vline(x: number, y: number, h: number, c: number): this { return this.rect(x, y, 1, h, c); }
  fill(c: number): this { this.data.fill(c); return this; }
  /** Scatter colours over the whole buffer (or only where currently `over`). */
  speckle(rng: Rng, colors: number[], density: number, over?: number): this {
    for (let i = 0; i < this.data.length; i++) {
      if (over !== undefined && this.data[i] !== over) continue;
      if (rng.next() < density) this.data[i] = colors[Math.floor(rng.next() * colors.length)];
    }
    return this;
  }
  /** Draw ascii art: chars map through `map` (default '.'=transparent, digits/letters = index). */
  art(x: number, y: number, rows: string[], map?: Record<string, number>): this {
    rows.forEach((r, j) => [...r].forEach((ch, i) => {
      if (ch === '.' || ch === ' ') return;
      const v = map ? map[ch] : parseInt(ch, 36);
      if (v !== undefined) this.set(x + i, y + j, v);
    }));
    return this;
  }
  /** Add a 1px outline colour around opaque pixels (4-neighbour). */
  outline(c: number): this {
    const src = this.data.slice();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (src[y * this.w + x]) continue;
      const n = (dx: number, dy: number) => {
        const xx = x + dx, yy = y + dy;
        return xx >= 0 && yy >= 0 && xx < this.w && yy < this.h && src[yy * this.w + xx] !== 0;
      };
      if (n(1, 0) || n(-1, 0) || n(0, 1) || n(0, -1)) this.data[y * this.w + x] = c;
    }
    return this;
  }
  mirrorX(): PixelBuffer {
    const b = new PixelBuffer(this.w, this.h, this.palette);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) b.data[y * this.w + x] = this.data[y * this.w + (this.w - 1 - x)];
    return b;
  }
  clone(): PixelBuffer { const b = new PixelBuffer(this.w, this.h, this.palette); b.data.set(this.data); return b; }
  /** Draw another buffer on top (palette indices are assumed to share this palette). */
  blit(o: PixelBuffer, x: number, y: number): this {
    for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) { const v = o.data[j * o.w + i]; if (v) this.set(x + i, y + j, v); }
    return this;
  }
  toCanvas(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    const rgb = this.palette.map((h) => (h ? [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] : [0, 0, 0]));
    for (let i = 0; i < this.data.length; i++) {
      const v = this.data[i];
      if (!v) continue;
      const c = rgb[v];
      img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}
