import Phaser from 'phaser';
import { DEPTH } from '../../config';
import type { InputManager } from '../input/InputManager';
import { drawWindow, textStyle } from './DialogueBox';

export interface Row { label: string; right?: string; disabled?: boolean; color?: string }
export interface MenuOpts {
  x: number; y: number; w: number;
  rows: Row[];
  cols?: number;
  rowH?: number;
  /** rows visible at once for long single-column lists */
  visible?: number;
  cancelable?: boolean;
  start?: number;
  onMove?: (i: number) => void;
  depth?: number;
  pad?: number;
}

/** Cursor menu (list or grid) in a bordered window. Feed input via handleInput(). Resolves to index, or -1 on cancel. */
export class ListMenu {
  private c?: Phaser.GameObjects.Container;
  private texts: Phaser.GameObjects.Text[] = [];
  private rights: Phaser.GameObjects.Text[] = [];
  private cursor?: Phaser.GameObjects.Graphics;
  private o!: MenuOpts;
  private sel = 0;
  private top = 0;
  private resolve?: (i: number) => void;
  private t = 0;
  onSound?: (n: 'move' | 'select' | 'back' | 'deny') => void;
  get isOpen(): boolean { return !!this.resolve; }

  constructor(private scene: Phaser.Scene) {}

  open(o: MenuOpts): Promise<number> {
    this.close();
    this.o = { cols: 1, rowH: 11, cancelable: true, pad: 8, ...o };
    this.sel = Math.max(0, Math.min(o.start ?? 0, o.rows.length - 1));
    // never start the cursor on a disabled row (would feel stuck, and can soft-lock forced menus)
    if (o.rows[this.sel]?.disabled) { const k = o.rows.findIndex((r) => !r.disabled); if (k >= 0) this.sel = k; }
    this.top = 0;
    const cols = this.o.cols!;
    const vis = this.o.visible ?? Math.ceil(o.rows.length / cols);
    const h = vis * this.o.rowH! + this.o.pad! * 2 - 2;
    const g = this.scene.add.graphics();
    drawWindow(g, 0, 0, o.w, h);
    this.c = this.scene.add.container(o.x, o.y, [g]).setScrollFactor(0).setDepth(o.depth ?? DEPTH.ui + 10);
    this.cursor = this.scene.add.graphics();
    this.cursor.fillStyle(0xc8452f, 1).fillTriangle(0, 0, 0, 7, 5, 3.5);
    this.c.add(this.cursor);
    this.build();
    // bouncy entrance
    this.c.setAlpha(0).setScale(1, 0.85);
    this.scene.tweens.add({ targets: this.c, alpha: 1, scaleY: 1, duration: 140, ease: 'Back.easeOut' });
    this.place(true);
    this.o.onMove?.(this.sel);
    return new Promise((res) => { this.resolve = res; });
  }

  private build(): void {
    this.texts.forEach((t) => t.destroy()); this.rights.forEach((t) => t.destroy());
    this.texts = []; this.rights = [];
    const { rows, cols, rowH, pad } = this.o;
    const vis = this.o.visible ?? Math.ceil(rows.length / cols!);
    const colW = (this.o.w - pad! * 2 - 8) / cols!;
    for (let k = 0; k < vis * cols!; k++) {
      const i = cols! > 1 ? k : this.top + k;
      const r = rows[i];
      if (!r) continue;
      const cx = cols! > 1 ? k % cols! : 0, cy = cols! > 1 ? Math.floor(k / cols!) : k;
      const x = pad! + 8 + cx * colW, y = pad! - 1 + cy * rowH!;
      const col = r.disabled ? '#9a8fb0' : r.color ?? '#2a1d2e';
      const t = this.scene.add.text(x, y, r.label, textStyle(col));
      this.c!.add(t); this.texts.push(t);
      if (r.right) {
        const rt = this.scene.add.text(x + colW - 8, y, r.right, textStyle(col)).setOrigin(1, 0);
        this.c!.add(rt); this.rights.push(rt);
      }
    }
  }

  private place(snap = false): void {
    const { cols, rowH, pad } = this.o;
    const colW = (this.o.w - pad! * 2 - 8) / cols!;
    const cx = cols! > 1 ? this.sel % cols! : 0;
    const cy = cols! > 1 ? Math.floor(this.sel / cols!) : this.sel - this.top;
    const x = pad! + cx * colW, y = pad! + 1 + cy * rowH!;
    this.cursor!.x = x; this.cursor!.y = y;
    void snap;
  }

  handleInput(im: InputManager, dt = 16): void {
    if (!this.resolve) return;
    this.t += dt;
    if (this.cursor) this.cursor.x += Math.sin(this.t / 110) * 0.15;
    const n = this.o.rows.length, cols = this.o.cols!;
    let s = this.sel;
    if (cols > 1) {
      if (im.just('left') && s % cols > 0) s--;
      else if (im.just('right') && s % cols < cols - 1 && s + 1 < n) s++;
      else if (im.just('up') && s - cols >= 0) s -= cols;
      else if (im.just('down') && s + cols < n) s += cols;
    } else {
      if (im.just('up')) s = (s + n - 1) % n;
      else if (im.just('down')) s = (s + 1) % n;
    }
    if (s !== this.sel) {
      this.sel = s;
      const vis = this.o.visible ?? n;
      if (cols === 1) {
        if (s < this.top) this.top = s; else if (s >= this.top + vis) this.top = s - vis + 1;
        this.build();
      }
      this.place();
      this.onSound?.('move');
      this.o.onMove?.(s);
    }
    if (im.just('confirm')) {
      if (this.o.rows[this.sel].disabled) { this.onSound?.('deny'); return; }
      this.finish(this.sel, 'select');
    } else if (im.just('back') && this.o.cancelable) this.finish(-1, 'back');
  }

  private finish(i: number, snd: 'select' | 'back'): void {
    this.onSound?.(snd);
    const r = this.resolve; this.resolve = undefined;
    this.close();
    r?.(i);
  }
  close(): void { this.c?.destroy(); this.c = undefined; this.resolve = undefined; }
}
