import Phaser from 'phaser';
import { DEPTH, FONT, VIEW_H, VIEW_W } from '../config';
import { InputManager } from '../engine/input/InputManager';
import { rng } from '../engine/rng';
import { sfx } from '../engine/audio/Sfx';
import { textStyle } from '../engine/ui/DialogueBox';
import { ListMenu } from '../engine/ui/ListMenu';
import { backdrop, COL, text, win } from '../engine/ui/kit';
import { MAPS } from '../data/maps';
import { state } from '../game/state/GameState';
import { drawSlot, saves } from './screens/SaveScreen';
import { optionsScreen } from './screens/OptionsScreen';
import type { MenuScene } from './MenuScene';

const GRID = ['ABCDEFGHI', 'JKLMNOPQR', 'STUVWXYZ-', 'abcdefghi', 'jklmnopqr', 'stuvwxyz.'];

/** Title screen: new game (name + look), continue (slot list), options. */
export class TitleScene extends Phaser.Scene {
  private input2!: InputManager;
  private menu!: ListMenu;
  handler: ((im: InputManager, dt: number) => void) | null = null;
  private t = 0;
  private logo!: Phaser.GameObjects.Container;

  constructor() { super('title'); }

  create(): void {
    this.input2 = new InputManager(this);
    this.menu = new ListMenu(this);
    this.menu.onSound = (n) => sfx(n === 'move' ? 'cursor' : n);
    this.drawScenery();
    this.logo = this.makeLogo();
    this.cameras.main.fadeIn(500, 0, 0, 0);
    (window as unknown as { __title?: TitleScene }).__title = this;
    void this.main();
  }

  update(_t: number, dt: number): void {
    this.t += dt;
    this.input2.poll();
    if (this.menu.isOpen) this.menu.handleInput(this.input2, dt);
    else this.handler?.(this.input2, dt);
    this.logo.y = 28 + Math.round(Math.sin(this.t / 600) * 2);
  }

  // ------------------------------------------------------------ visuals
  private drawScenery(): void {
    const g = this.add.graphics();
    const bands = 12;
    for (let i = 0; i < bands; i++) {
      const k = i / (bands - 1);
      const r = Math.round(18 + k * 70), gg = Math.round(14 + k * 40), b = Math.round(48 + k * 70);
      g.fillStyle((r << 16) | (gg << 8) | b, 1).fillRect(0, (i * 100) / bands, VIEW_W, 100 / bands + 1);
    }
    for (let i = 0; i < 60; i++) {
      const s = this.add.rectangle(rng.int(0, VIEW_W), rng.int(0, 70), 1, 1, 0xffffff, rng.next() * 0.7 + 0.3);
      this.tweens.add({ targets: s, alpha: 0.1, duration: rng.int(700, 2000), yoyo: true, repeat: -1, delay: rng.int(0, 1500) });
    }
    g.fillStyle(0xfff6c0, 1).fillCircle(190, 34, 12).fillStyle(0xe8dca0, 1).fillCircle(186, 30, 3).fillCircle(194, 38, 2);
    // layered hills and a little town silhouette
    const hill = (col: number, base: number, amp: number, f: number, ph: number) => {
      g.fillStyle(col, 1);
      for (let x = 0; x < VIEW_W; x += 2) g.fillRect(x, base - Math.round(Math.abs(Math.sin(x / f + ph)) * amp), 2, VIEW_H);
    };
    hill(0x3a3568, 96, 18, 30, 0.4); hill(0x2c2858, 112, 14, 22, 1.7);
    g.fillStyle(0x1c1a3a, 1).fillRect(0, 124, VIEW_W, 40);
    for (const [x, w, h] of [[20, 22, 14], [52, 16, 10], [92, 26, 16], [150, 18, 12], [176, 24, 15], [208, 20, 11]] as const) {
      g.fillStyle(0x14122e, 1).fillRect(x, 124 - h, w, h).fillTriangle(x - 2, 124 - h, x + w + 2, 124 - h, x + w / 2, 124 - h - 8);
      g.fillStyle(0xffcf4a, 1).fillRect(x + 4, 124 - h + 4, 3, 3).fillRect(x + w - 8, 124 - h + 6, 3, 3);
    }
    // fireflies
    for (let i = 0; i < 14; i++) {
      const f = this.add.rectangle(rng.int(0, VIEW_W), rng.int(100, 150), 2, 2, 0xd8ff80, 0.9).setDepth(2);
      this.tweens.add({ targets: f, x: f.x + rng.int(-30, 30), y: f.y + rng.int(-14, 14), alpha: 0.15, duration: rng.int(1600, 3200), yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: rng.int(0, 1500) });
    }
  }

  private makeLogo(): Phaser.GameObjects.Container {
    const mk = (s: string, size: number, color: string, ox = 0, oy = 0) => this.add.text(ox, oy, s, { fontFamily: FONT, fontSize: `${size}px`, color }).setOrigin(0.5, 0);
    const c = this.add.container(VIEW_W / 2, 28, [mk('HUNT-MON', 24, '#1b1530', 2, 3), mk('HUNT-MON', 24, '#e8623a', 0, 0), mk('HUNT-MON', 24, '#f8d038', 0, -1).setAlpha(0.35),
      mk('a creature-collecting adventure', 8, '#d8d0f0', 0, 30)]).setDepth(DEPTH.ui - 10);
    return c;
  }

  // ------------------------------------------------------------ flow
  private async main(): Promise<void> {
    for (;;) {
      const has = saves.summaries().some((s) => !!s);
      const i = await this.menu.open({ x: 80, y: 96, w: 80, rows: [{ label: 'New Game' }, { label: 'Continue', disabled: !has }, { label: 'Options' }], rowH: 13, cancelable: false });
      if (i === 0) { if (await this.newGame()) return; }
      else if (i === 1) { if (await this.continueGame()) return; }
      else if (i === 2) await this.options();
    }
  }

  /** Same contract as MenuScene.screen so the shared options screen can run here. */
  async screen<T>(build: (layer: Phaser.GameObjects.Container) => Promise<T>): Promise<T> {
    const layer = this.add.container(0, 0).setDepth(DEPTH.ui - 50);
    try { return await build(layer); } finally { layer.destroy(); this.handler = null; }
  }

  private async options(): Promise<void> { await optionsScreen(this as unknown as MenuScene); }

  private async newGame(): Promise<boolean> {
    const name = await this.enterName();
    if (name === null) return false;
    const look = await this.pickLook();
    if (look === null) return false;
    state.newGame(name, look);
    await new Promise<void>((r) => { this.cameras.main.once('camerafadeoutcomplete', () => r()); this.cameras.main.fadeOut(500, 0, 0, 0); });
    this.scene.start('overworld', { map: 'house_player', x: 5, y: 5, dir: 'down', msg: [`Good morning, ${name}! The Elder stopped by earlier. He wants to see you in town.`, 'Take the path outside, past the pond.'] });
    return true;
  }

  private enterName(): Promise<string | null> {
    return new Promise((resolve) => {
      const layer = this.add.container(0, 0).setDepth(DEPTH.ui - 40);
      layer.add(backdrop(this, 'YOUR NAME?'));
      const nameT = text(this, 120, 24, '', COL.ink).setOrigin(0.5, 0).setScale(1.5);
      layer.add(win(this, 40, 19, 160, 26)); layer.add(nameT);
      const grid = this.add.container(0, 0); layer.add(grid);
      let name = '', cx = 0, cy = 0;
      const draw = (): void => {
        nameT.setText(name.padEnd(8, '_').split('').join(' '));
        grid.removeAll(true);
        grid.add(win(this, 18, 50, 204, 96));
        GRID.forEach((row, y) => [...row].forEach((ch, x) => {
          const px = 30 + x * 20, py = 57 + y * 13;
          if (x === cx && y === cy) grid.add(this.add.rectangle(px - 3, py - 2, 14, 12, 0xc8452f).setOrigin(0, 0));
          grid.add(text(this, px, py, ch, x === cx && y === cy ? '#ffffff' : COL.ink));
        }));
        const ay = 57 + GRID.length * 13;
        const acts: Array<[string, number]> = [['DEL', 0], ['OK', 1]];
        acts.forEach(([l, k]) => {
          const active = cy === GRID.length && cx === k;
          const px = 30 + k * 60;
          if (active) grid.add(this.add.rectangle(px - 3, ay - 2, 50, 12, 0xc8452f).setOrigin(0, 0));
          grid.add(text(this, px, ay, l, active ? '#ffffff' : COL.ink));
        });
        grid.add(text(this, 120, 148, 'Z: pick   X: back   (keyboard works too)', '#b8a8d8').setOrigin(0.5, 0).setScale(0.75));
      };
      draw();
      const done = (v: string | null): void => { kb?.off('keydown', onKey); this.handler = null; layer.destroy(); resolve(v); };
      const commit = (): void => { if (name.trim().length) done(name.trim()); else sfx('deny'); };
      const onKey = (e: KeyboardEvent): void => {
        if (/^[a-zA-Z]$/.test(e.key) && name.length < 8) { name += e.key; draw(); sfx('blip'); }
        else if (e.key === 'Backspace') { name = name.slice(0, -1); draw(); }
      };
      const kb = this.input.keyboard;
      kb?.on('keydown', onKey);
      this.handler = (im) => {
        const rows = GRID.length + 1;
        if (im.just('up')) { cy = (cy + rows - 1) % rows; if (cy === GRID.length) cx = Math.min(cx, 1); }
        else if (im.just('down')) { cy = (cy + 1) % rows; if (cy === GRID.length) cx = Math.min(cx, 1); }
        else if (im.just('left')) cx = (cx + (cy === GRID.length ? 2 : 9) - 1) % (cy === GRID.length ? 2 : 9);
        else if (im.just('right')) cx = (cx + 1) % (cy === GRID.length ? 2 : 9);
        else if (im.just('confirm')) {
          if (cy === GRID.length) { if (cx === 0) name = name.slice(0, -1); else { commit(); return; } }
          else if (name.length < 8) name += GRID[cy][cx];
          sfx('cursor');
        } else if (im.just('back')) { if (name.length) name = name.slice(0, -1); else { done(null); return; } }
        else return;
        draw();
      };
    });
  }

  private pickLook(): Promise<string | null> {
    return new Promise((resolve) => {
      const layer = this.add.container(0, 0).setDepth(DEPTH.ui - 40);
      layer.add(backdrop(this, 'CHOOSE YOUR LOOK'));
      const looks = ['hero_a', 'hero_b'];
      let sel = 0;
      const dyn = this.add.container(0, 0); layer.add(dyn);
      const draw = (): void => {
        dyn.removeAll(true);
        looks.forEach((l, i) => {
          const x = 60 + i * 120;
          dyn.add(win(this, x - 34, 30, 68, 90));
          if (i === sel) dyn.add(this.add.rectangle(x - 32, 32, 64, 86, 0xc8452f, 0.18).setOrigin(0, 0));
          dyn.add(this.add.image(x, 108, `c_${l}`, 0).setOrigin(0.5, 1).setScale(3));
          if (i === sel) dyn.add(text(this, x, 122, '▲', COL.hi).setOrigin(0.5, 0));
        });
        dyn.add(text(this, 120, 146, 'Left/Right: choose   Z: confirm', '#b8a8d8').setOrigin(0.5, 0).setScale(0.75));
      };
      draw();
      this.handler = (im) => {
        if (im.just('left') || im.just('right')) { sel = 1 - sel; draw(); sfx('cursor'); }
        else if (im.just('confirm')) { this.handler = null; layer.destroy(); resolve(looks[sel]); }
        else if (im.just('back')) { this.handler = null; layer.destroy(); resolve(null); }
      };
    });
  }

  private continueGame(): Promise<boolean> {
    return new Promise((resolve) => {
      const layer = this.add.container(0, 0).setDepth(DEPTH.ui - 40);
      layer.add(backdrop(this, 'CONTINUE'));
      const dyn = this.add.container(0, 0); layer.add(dyn);
      let sel = 0;
      const sums = saves.summaries();
      sel = Math.max(0, sums.findIndex((s) => !!s));
      const draw = (): void => { dyn.removeAll(true); sums.forEach((s, i) => drawSlot(this, dyn, i, s, i === sel)); };
      draw();
      const close = (v: boolean): void => { this.handler = null; layer.destroy(); resolve(v); };
      this.handler = (im) => {
        if (im.just('back')) close(false);
        else if (im.just('up')) { sel = (sel + 2) % 3; draw(); }
        else if (im.just('down')) { sel = (sel + 1) % 3; draw(); }
        else if (im.just('confirm')) {
          const f = saves.read(sel + 1);
          if (!f) { sfx('deny'); return; }
          this.handler = null;
          state.load(f.state as Partial<typeof state>);
          this.cameras.main.fadeOut(400, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            const m = MAPS[f.player.map] ? f.player : { map: 'house_player', x: 5, y: 5, dir: 'down', look: state.look };
            this.scene.start('overworld', { map: m.map, x: m.x, y: m.y, dir: m.dir });
          });
          resolve(true);
        }
      };
    });
  }
}
void textStyle; void VIEW_H;
