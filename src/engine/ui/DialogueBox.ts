import Phaser from 'phaser';
import { DEPTH, FONT, VIEW_H, VIEW_W } from '../../config';

/** Bordered pixel window drawn with rects so it stays crisp at any zoom. */
export function drawWindow(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.clear();
  g.fillStyle(0x1b1530, 1).fillRect(x, y, w, h);
  g.fillStyle(0xf4ecd8, 1).fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(0x3b2f5c, 1).fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle(0xfdf6e3, 1).fillRect(x + 3, y + 3, w - 6, h - 6);
  g.fillStyle(0xe4d7b6, 1).fillRect(x + 3, y + h - 5, w - 6, 2);
}

export const textStyle = (color = '#2a1d2e'): Phaser.Types.GameObjects.Text.TextStyle => ({ fontFamily: FONT, fontSize: '8px', color, lineSpacing: 4 });

/** Typewriter dialogue box docked to the bottom of the screen. */
export class DialogueBox {
  private g: Phaser.GameObjects.Graphics;
  private txt: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Text;
  private full = '';
  private shown = 0;
  private acc = 0;
  private pages: string[] = [];
  private page = 0;
  private resolve: (() => void) | null = null;
  active = false;
  charsPerSec = 40;
  onBlip?: () => void;

  constructor(scene: Phaser.Scene) {
    const x = 4, y = VIEW_H - 46, w = VIEW_W - 8, h = 42;
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.ui);
    drawWindow(this.g, x, y, w, h);
    this.txt = scene.add.text(x + 8, y + 8, '', textStyle()).setScrollFactor(0).setDepth(DEPTH.ui + 1);
    this.arrow = scene.add.text(x + w - 14, y + h - 14, '▼', textStyle('#c8452f')).setScrollFactor(0).setDepth(DEPTH.ui + 1);
    scene.tweens.add({ targets: this.arrow, y: this.arrow.y + 2, yoyo: true, repeat: -1, duration: 350, ease: 'Sine.easeInOut' });
    this.hide();
  }

  private hide(): void { this.g.setVisible(false); this.txt.setVisible(false); this.arrow.setVisible(false); }

  /** Show lines (each string = one row; 2 rows per page). Resolves when the player closes it. */
  say(lines: string[]): Promise<void> {
    this.pages = [];
    for (let i = 0; i < lines.length; i += 2) this.pages.push(lines.slice(i, i + 2).join('\n'));
    this.page = 0;
    this.active = true;
    this.g.setVisible(true); this.txt.setVisible(true);
    this.begin();
    return new Promise((res) => { this.resolve = res; });
  }
  private begin(): void {
    this.full = this.pages[this.page]; this.shown = 0; this.acc = 0;
    this.txt.setText(''); this.arrow.setVisible(false);
  }
  /** Feed confirm presses here. Returns true if the press was consumed. */
  advance(): boolean {
    if (!this.active) return false;
    if (this.shown < this.full.length) { this.shown = this.full.length; this.txt.setText(this.full); this.arrow.setVisible(true); return true; }
    if (this.page < this.pages.length - 1) { this.page++; this.begin(); return true; }
    this.active = false; this.hide();
    const r = this.resolve; this.resolve = null; r?.();
    return true;
  }
  update(dtMs: number): void {
    if (!this.active || this.shown >= this.full.length) return;
    this.acc += dtMs / 1000 * this.charsPerSec;
    const n = Math.floor(this.acc);
    if (n > 0) {
      this.acc -= n;
      const before = this.shown;
      this.shown = Math.min(this.full.length, this.shown + n);
      this.txt.setText(this.full.slice(0, this.shown));
      if (this.shown !== before) this.onBlip?.();
      if (this.shown >= this.full.length) this.arrow.setVisible(true);
    }
  }
}
