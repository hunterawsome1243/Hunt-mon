import Phaser from 'phaser';
import { DEPTH } from '../../config';
import type { Status } from '../../data/types';
import { drawWindow, textStyle } from './DialogueBox';

const BADGE: Record<Status, [string, number]> = { burn: ['BRN', 0xe8623a], poison: ['PSN', 0xa05ac0], sleep: ['SLP', 0x8a8aa0], paralysis: ['PAR', 0xd8b020] };

/** Name / level / animated HP bar (and XP bar for the player's side). */
export class HpBox {
  readonly c: Phaser.GameObjects.Container;
  private bar: Phaser.GameObjects.Graphics;
  private nameT: Phaser.GameObjects.Text;
  private lvT: Phaser.GameObjects.Text;
  private hpT?: Phaser.GameObjects.Text;
  private badge: Phaser.GameObjects.Graphics;
  private badgeT: Phaser.GameObjects.Text;
  private hpLabel: Phaser.GameObjects.Text;
  private xpBar?: Phaser.GameObjects.Graphics;
  private max = 1;
  private status: Status | null = null;
  private tw?: Phaser.Tweens.Tween;
  private hpTween = { v: 1 };
  private xpTween = { v: 0 };
  readonly w: number; readonly h: number;

  constructor(private scene: Phaser.Scene, x: number, y: number, private player: boolean) {
    this.w = player ? 122 : 116; this.h = player ? 40 : 28;
    const g = scene.add.graphics(); drawWindow(g, 0, 0, this.w, this.h);
    this.nameT = scene.add.text(7, 5, '', textStyle());
    this.lvT = scene.add.text(this.w - 7, 5, '', textStyle()).setOrigin(1, 0);
    this.bar = scene.add.graphics();
    this.badge = scene.add.graphics();
    this.badgeT = scene.add.text(9, 16, '', textStyle('#ffffff')).setScale(0.75).setOrigin(0, 0);
    this.hpLabel = scene.add.text(this.w - 7 - 62 - 13, 16, 'HP', textStyle('#f8d038')).setScale(0.75);
    const items: Phaser.GameObjects.GameObject[] = [g, this.nameT, this.lvT, this.bar, this.badge, this.badgeT, this.hpLabel];
    if (player) {
      this.hpT = scene.add.text(this.w - 7, 24, '', textStyle()).setOrigin(1, 0);
      this.xpBar = scene.add.graphics();
      items.push(this.hpT, this.xpBar);
    }
    this.c = scene.add.container(x, y, items).setDepth(DEPTH.ui - 5).setVisible(false);
  }

  set(name: string, level: number, hp: number, max: number, status: Status | null, xpFrac = 0): void {
    this.nameT.setText(name.slice(0, 11)); this.lvT.setText(`Lv${level}`);
    this.max = max; this.hpTween.v = hp; this.status = status; this.xpTween.v = xpFrac;
    this.tw?.stop();
    this.redraw();
  }
  setLevel(level: number, max: number): void { this.lvT.setText(`Lv${level}`); this.max = max; this.redraw(); }
  setStatus(s: Status | null): void { this.status = s; this.redraw(); }

  private color(f: number): number { return f > 0.5 ? 0x58d858 : f > 0.2 ? 0xf8d038 : 0xe84848; }

  private redraw(): void {
    const by = 16, bw = 62, bx = this.w - 7 - bw;
    const cur = Math.max(0, this.hpTween.v);
    const f = Math.max(0, Math.min(1, cur / this.max));
    this.bar.clear();
    this.bar.fillStyle(0x1b1530, 1).fillRect(bx - 1, by - 1, bw + 2, 7);
    this.bar.fillStyle(0x4a4260, 1).fillRect(bx, by, bw, 5);
    const fw = f > 0 ? Math.max(1, Math.round(bw * f)) : 0;
    this.bar.fillStyle(this.color(f), 1).fillRect(bx, by, fw, 5);
    this.bar.fillStyle(0xffffff, 0.35).fillRect(bx, by, fw, 1);
    this.bar.fillStyle(0x2a1d2e, 1).fillRect(bx - 15, by - 1, 13, 7);
    this.badge.clear();
    if (this.status) {
      const [t, col] = BADGE[this.status];
      this.badge.fillStyle(col, 1).fillRect(7, 15, 24, 8);
      this.badgeT.setText(t).setVisible(true);
    } else this.badgeT.setVisible(false);
    this.hpT?.setText(`${Math.ceil(cur)}/${this.max}`);
    if (this.xpBar) {
      const xw = 106;
      this.xpBar.clear().fillStyle(0x1b1530, 1).fillRect(7, 33, xw + 2, 4).fillStyle(0x4a4260, 1).fillRect(8, 34, xw, 2);
      this.xpBar.fillStyle(0x58a8f8, 1).fillRect(8, 34, Math.round(xw * Math.max(0, Math.min(1, this.xpTween.v))), 2);
    }
  }

  /** Smoothly drain/fill to `hp`. */
  animateHp(hp: number, from?: number): Promise<void> {
    if (from !== undefined) this.hpTween.v = from;
    const dist = Math.abs(hp - this.hpTween.v);
    const dur = Math.min(1000, 260 + (dist / this.max) * 1100);
    return new Promise((res) => {
      this.tw?.stop();
      this.tw = this.scene.tweens.add({ targets: this.hpTween, v: hp, duration: dur, ease: 'Sine.easeInOut', onUpdate: () => this.redraw(), onComplete: () => { this.redraw(); res(); } });
    });
  }
  animateXp(frac: number, ms = 600): Promise<void> {
    return new Promise((res) => this.scene.tweens.add({ targets: this.xpTween, v: frac, duration: ms, ease: 'Sine.easeOut', onUpdate: () => this.redraw(), onComplete: () => res() }));
  }
  resetXp(): void { this.xpTween.v = 0; this.redraw(); }

  show(fromX: number): Promise<void> {
    const x = this.c.x;
    this.c.setVisible(true).x = fromX;
    return new Promise((res) => this.scene.tweens.add({ targets: this.c, x, duration: 320, ease: 'Back.easeOut', onComplete: () => res() }));
  }
  hide(): void { this.c.setVisible(false); }
  get isPlayer(): boolean { return this.player; }
}
