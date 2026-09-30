import Phaser from 'phaser';
import { DEPTH, FONT, VIEW_H, VIEW_W } from '../../config';
import type { Expression } from '../../data/types';
import { hearts as heartCount } from '../../game/romance/Affection';
import type { InputManager } from '../input/InputManager';
import { paginate, wrap } from './wrap';

/** Bordered pixel window drawn with rects so it stays crisp at any zoom. */
export function drawWindow(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillStyle(0x1b1530, 1).fillRect(x, y, w, h);
  g.fillStyle(0xf4ecd8, 1).fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(0x3b2f5c, 1).fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle(0xfdf6e3, 1).fillRect(x + 3, y + 3, w - 6, h - 6);
  g.fillStyle(0xe4d7b6, 1).fillRect(x + 3, y + h - 5, w - 6, 2);
}

export const textStyle = (color = '#2a1d2e'): Phaser.Types.GameObjects.Text.TextStyle => ({ fontFamily: FONT, fontSize: '8px', color, lineSpacing: 4 });

const BOX: { x: number; y: number; w: number; h: number } = { x: 4, y: VIEW_H - 46, w: VIEW_W - 8, h: 42 };
const CHOICE_COLS = 21;
const CHOICE_W = 190;
const ROW_LINE = 9;

export interface SayOpts { speaker?: string; portrait?: Expression; text: string; npc?: string; portraitKey?: string; affection?: number }
export interface ChooseOpts extends Omit<SayOpts, 'text'> { text?: string; options: string[] }

/**
 * Typewriter dialogue box with portrait, name tag, heart meter and a bouncy choice menu.
 * All objects are screen-fixed. Input is fed via handleInput().
 */
export class DialogueBox {
  private box: Phaser.GameObjects.Graphics;
  private txt: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Graphics;
  private tag: Phaser.GameObjects.Container;
  private tagG: Phaser.GameObjects.Graphics;
  private tagTxt: Phaser.GameObjects.Text;
  private heartImgs: Phaser.GameObjects.Image[] = [];
  private portraitWin: Phaser.GameObjects.Container;
  private portraitImg: Phaser.GameObjects.Image;
  private menu: Phaser.GameObjects.Container | null = null;
  private menuRows: Array<{ y: number; h: number }> = [];
  private cursor!: Phaser.GameObjects.Graphics;
  private cursorTween?: Phaser.Tweens.Tween;

  private w = BOX.w;
  private cols = 26;
  private holdMs = 0;
  private holdLeft = 0;
  private autoMode = false;
  private full = '';
  private shown = 0;
  private acc = 0;
  private pages: string[] = [];
  private page = 0;
  private resolve: (() => void) | null = null;
  private chooseResolve: ((i: number) => void) | null = null;
  private wantChoices: string[] | null = null;
  private sel = 0;
  private lastPortrait = '';
  private open = false;
  active = false;
  /** texts of the choices currently offered (for tooling/tests) */
  choiceTexts: string[] = [];
  get hasMenu(): boolean { return !!this.menu; }
  charsPerSec = 42;
  onBlip?: () => void;
  onMove?: () => void;
  onSelect?: () => void;

  constructor(private scene: Phaser.Scene) {
    const d = DEPTH.ui;
    this.box = scene.add.graphics().setScrollFactor(0).setDepth(d);
    drawWindow(this.box, BOX.x, BOX.y, BOX.w, BOX.h);
    this.txt = scene.add.text(BOX.x + 8, BOX.y + 8, '', textStyle()).setScrollFactor(0).setDepth(d + 1);
    this.arrow = scene.add.graphics().setScrollFactor(0).setDepth(d + 1);
    this.arrow.fillStyle(0xc8452f, 1).fillTriangle(0, 0, 7, 0, 3.5, 4).setPosition(BOX.x + BOX.w - 14, BOX.y + BOX.h - 13);
    scene.tweens.add({ targets: this.arrow, y: this.arrow.y + 2, yoyo: true, repeat: -1, duration: 330, ease: 'Sine.easeInOut' });

    this.tagG = scene.add.graphics();
    this.tagTxt = scene.add.text(6, 3, '', textStyle()).setOrigin(0, 0);
    this.tag = scene.add.container(BOX.x + 42, BOX.y - 13, [this.tagG, this.tagTxt]).setScrollFactor(0).setDepth(d + 2);

    const pg = scene.add.graphics();
    drawWindow(pg, 0, 0, 36, 36);
    this.portraitImg = scene.add.image(18, 18, 'p_elder', 0);
    this.portraitWin = scene.add.container(BOX.x + 2, BOX.y - 33, [pg, this.portraitImg]).setScrollFactor(0).setDepth(d + 2);

    this.cursor = scene.add.graphics().setScrollFactor(0).setDepth(d + 6);
    this.cursor.fillStyle(0xc8452f, 1).fillTriangle(0, 0, 0, 7, 5, 3.5);
    this.setOpen(false);
  }

  private setOpen(v: boolean): void {
    this.open = v;
    for (const o of [this.box, this.txt, this.tag, this.portraitWin]) o.setVisible(v);
    this.arrow.setVisible(false);
    if (!v) { this.cursor.setVisible(false); this.clearMenu(); }
  }

  // ---------- header (name / portrait / hearts) ----------
  private header(o: SayOpts | ChooseOpts): void {
    const showTag = !!o.speaker;
    this.tag.setVisible(showTag);
    if (showTag) {
      const nameW = o.speaker!.length * 8;
      const rom = o.npc !== undefined;
      const w = nameW + 12 + (rom ? 58 : 0);
      this.tagG.clear(); drawWindow(this.tagG, 0, 0, w, 14);
      this.tagTxt.setText(o.speaker!);
      this.setHearts(rom ? o.affection ?? 0 : -1, w - 58);
    }
    const key = o.portraitKey;
    this.portraitWin.setVisible(!!key);
    if (key && this.scene.textures.exists(key)) {
      const frame = ['neutral', 'happy', 'blush', 'annoyed', 'surprised', 'smug'].indexOf(o.portrait ?? 'neutral');
      this.portraitImg.setTexture(key, Math.max(0, frame));
      const sig = key + ':' + frame;
      if (sig !== this.lastPortrait) {
        this.lastPortrait = sig;
        this.portraitImg.y = 22;
        this.scene.tweens.add({ targets: this.portraitImg, y: 18, duration: 220, ease: 'Back.easeOut' });
      }
    }
  }

  /** Each heart is an empty outline with a full heart cropped from the bottom up: 20 affection per heart. */
  private fills: Phaser.GameObjects.Image[] = [];
  private setHearts(aff: number, x: number): void {
    this.heartImgs.forEach((h) => h.destroy());
    this.fills.forEach((h) => h.destroy());
    this.heartImgs = []; this.fills = [];
    if (aff < 0) return;
    for (let i = 0; i < 5; i++) {
      const base = this.scene.add.image(x + 2 + i * 10, 3, 'ui_heart', 1).setOrigin(0, 0);
      const fill = this.scene.add.image(x + 2 + i * 10, 3, 'ui_heart', 0).setOrigin(0, 0);
      this.tag.add([base, fill]);
      this.heartImgs.push(base); this.fills.push(fill);
    }
    this.applyFill(aff);
  }
  private applyFill(aff: number): void {
    this.fills.forEach((f, i) => {
      const r = Math.max(0, Math.min(1, (aff - i * 20) / 20));
      f.setVisible(r > 0);
      // keep the heart's outline row visible for tiny values
      const px = r > 0 ? Math.max(2, Math.round(8 * r)) : 0;
      f.setCrop(0, 8 - px, 9, px);
    });
  }
  /** Bounce the hearts after an affection change. */
  pulseHearts(aff: number, gained: boolean): void {
    if (!this.heartImgs.length) return;
    this.applyFill(aff);
    const full = heartCount(aff);
    this.heartImgs.forEach((h, i) => {
      const f = this.fills[i];
      if (gained && (i < full || (i === full && aff % 20 > 0))) {
        this.scene.tweens.add({ targets: [h, f], y: h.y - 3, duration: 130, yoyo: true, delay: i * 45, ease: 'Quad.easeOut' });
      } else if (!gained && i <= full) {
        this.scene.tweens.add({ targets: [h, f], x: h.x + 2, duration: 40, yoyo: true, repeat: 3 });
      }
    });
  }

  // ---------- public API ----------
  say(o: SayOpts): Promise<void> {
    this.autoMode = false;
    this.begin(o, paginate(o.text, this.cols));
    this.wantChoices = null;
    return new Promise((res) => { this.resolve = res; });
  }

  choose(o: ChooseOpts): Promise<number> {
    this.autoMode = false;
    this.begin(o, o.text ? paginate(o.text, this.cols) : ['']);
    this.wantChoices = o.options;
    this.choiceTexts = o.options;
    this.sel = 0;
    return new Promise((res) => { this.chooseResolve = res; });
  }

  /** Redraw the window at a new width (battle shrinks it to make room for the command menu). */
  layout(w: number): void {
    this.w = w;
    this.box.clear(); drawWindow(this.box, BOX.x, BOX.y, w, BOX.h);
    this.cols = Math.floor((w - 16) / 8);
    this.arrow.x = BOX.x + w - 14;
    if (this.full && this.shown >= this.full.length) this.txt.setText(this.full);
  }
  get width(): number { return this.w; }

  /** Battle-style message: types out, holds briefly, then resolves on its own (confirm skips). Box stays open. */
  message(text: string, holdMs = 650): Promise<void> {
    this.autoMode = true; this.holdMs = holdMs; this.holdLeft = -1;
    this.wantChoices = null;
    this.begin({ text }, paginate(text, this.cols));
    return new Promise((res) => { this.resolve = res; });
  }
  hide(): void { this.active = false; this.setOpen(false); }
  /** Show the (empty or fixed) box without waiting for input. */
  showText(text: string): void {
    this.autoMode = false; this.wantChoices = null; this.pages = [text]; this.page = 0; this.setOpen(true);
    this.tag.setVisible(false); this.portraitWin.setVisible(false);
    this.full = text; this.shown = text.length; this.txt.setText(text); this.arrow.setVisible(false); this.active = false;
  }

  private begin(o: SayOpts | ChooseOpts, pages: string[]): void {
    this.pages = pages.length ? pages : [''];
    this.page = 0;
    this.active = true;
    this.setOpen(true);
    this.clearMenu();
    this.header(o);
    this.startPage();
  }
  private startPage(): void {
    this.full = this.pages[this.page]; this.shown = 0; this.acc = 0;
    this.txt.setText(''); this.arrow.setVisible(false);
    if (!this.full) this.finishTyping();
  }
  private finishTyping(): void {
    this.shown = this.full.length; this.txt.setText(this.full);
    if (this.autoMode) { this.holdLeft = this.holdMs; this.arrow.setVisible(false); return; }
    const last = this.page >= this.pages.length - 1;
    if (last && this.wantChoices) this.showMenu(this.wantChoices);
    else this.arrow.setVisible(true);
  }

  /** Convenience for callers that need to change only the hearts while the box is open. */
  refreshHeader(o: SayOpts): void { if (this.open) this.header(o); }

  handleInput(im: InputManager): void {
    if (!this.active) return;
    if (this.autoMode) {
      if (im.just('confirm') || im.just('back')) {
        if (this.shown < this.full.length) this.finishTyping(); else this.holdLeft = 0;
      }
      return;
    }
    if (this.menu) {
      const n = this.wantChoices!.length;
      if (im.just('up')) this.moveSel((this.sel + n - 1) % n);
      else if (im.just('down')) this.moveSel((this.sel + 1) % n);
      else if (im.just('confirm')) this.pick(this.sel);
      else if (im.just('back')) this.pick(n - 1);
      return;
    }
    if (im.just('confirm') || im.just('back')) this.advance();
  }

  private advance(): void {
    if (this.shown < this.full.length) { this.finishTyping(); return; }
    if (this.page < this.pages.length - 1) { this.page++; this.startPage(); return; }
    this.active = false; this.setOpen(false);
    const r = this.resolve; this.resolve = null; r?.();
  }

  update(dtMs: number): void {
    if (this.autoMode && this.active && this.shown >= this.full.length && this.holdLeft >= 0) {
      this.holdLeft -= dtMs;
      if (this.holdLeft <= 0) {
        this.holdLeft = -1;
        if (this.page < this.pages.length - 1) { this.page++; this.startPage(); }
        else { this.active = false; const r = this.resolve; this.resolve = null; r?.(); } // box stays visible
      }
      return;
    }
    if (!this.active || this.shown >= this.full.length) return;
    this.acc += dtMs / 1000 * this.charsPerSec;
    const n = Math.floor(this.acc);
    if (n <= 0) return;
    this.acc -= n;
    const before = this.shown;
    this.shown = Math.min(this.full.length, this.shown + n);
    this.txt.setText(this.full.slice(0, this.shown));
    if (this.shown !== before && this.full[this.shown - 1] !== ' ') this.onBlip?.();
    if (this.shown >= this.full.length) this.finishTyping();
  }

  // ---------- choices ----------
  private clearMenu(): void {
    this.menu?.destroy(); this.menu = null; this.menuRows = [];
    this.cursorTween?.stop(); this.cursor.setVisible(false);
  }

  private showMenu(options: string[]): void {
    const lines = options.map((o) => wrap(o, CHOICE_COLS));
    const rowsH = lines.map((l) => l.length * ROW_LINE + 3);
    const h = rowsH.reduce((a, b) => a + b, 0) + 10;
    const w = CHOICE_W;
    const x = VIEW_W - 4 - w, y = BOX.y - h - 2;
    const g = this.scene.add.graphics();
    drawWindow(g, 0, 0, w, h);
    const items: Phaser.GameObjects.GameObject[] = [g];
    let ry = 6;
    this.menuRows = [];
    lines.forEach((l, i) => {
      const t = this.scene.add.text(16, ry, l.join('\n'), { ...textStyle(), lineSpacing: 1 });
      items.push(t);
      this.menuRows.push({ y: ry, h: rowsH[i] });
      // staggered slide-in
      t.x = 40; t.alpha = 0;
      this.scene.tweens.add({ targets: t, x: 16, alpha: 1, duration: 220, delay: 40 * i, ease: 'Back.easeOut' });
      ry += rowsH[i];
    });
    this.menu = this.scene.add.container(x, y + 8, items).setScrollFactor(0).setDepth(DEPTH.ui + 5).setAlpha(0);
    this.scene.tweens.add({ targets: this.menu, y, alpha: 1, duration: 200, ease: 'Back.easeOut' });
    this.arrow.setVisible(false);
    this.sel = 0;
    this.cursor.setVisible(true);
    this.placeCursor(true, x, y);
  }

  private menuOrigin(): { x: number; y: number } { return { x: VIEW_W - 4 - CHOICE_W, y: (this.menu?.y ?? 0) }; }

  private placeCursor(snap = false, mx?: number, my?: number): void {
    const o = mx !== undefined ? { x: mx, y: my! } : this.menuOrigin();
    const row = this.menuRows[this.sel];
    const ty = o.y + row.y + 2;
    this.cursorTween?.stop();
    this.cursor.x = o.x + 5;
    if (snap) this.cursor.y = ty;
    else this.scene.tweens.add({ targets: this.cursor, y: ty, duration: 90, ease: 'Quad.easeOut' });
    this.cursorTween = this.scene.tweens.add({ targets: this.cursor, x: o.x + 8, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 100 });
  }
  private moveSel(i: number): void { this.sel = i; this.onMove?.(); this.placeCursor(); }

  private pick(i: number): void {
    this.onSelect?.();
    const r = this.chooseResolve; this.chooseResolve = null;
    this.wantChoices = null;
    this.active = false; this.setOpen(false);
    r?.(i);
  }
}
