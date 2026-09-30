import Phaser from 'phaser';
import { FONT, VIEW_H, VIEW_W } from '../config';
import { rng } from '../engine/rng';
import { InputManager } from '../engine/input/InputManager';
import { playMusic } from '../engine/audio';
import { fmtPlay } from '../game/save/SaveManager';
import { state } from '../game/state/GameState';

/** Chapter-end credits with an epilogue that reflects who the player grew close to. */
export class EndScene extends Phaser.Scene {
  private input2!: InputManager;
  private scroll!: Phaser.GameObjects.Container;
  private done = false;
  private prompt!: Phaser.GameObjects.Text;

  constructor() { super('end'); }

  create(): void {
    this.input2 = new InputManager(this);
    this.done = false;
    this.cameras.main.setBackgroundColor('#0b0b1c');
    playMusic('ending', 200);
    this.cameras.main.fadeIn(1200, 255, 255, 255);
    for (let i = 0; i < 70; i++) {
      const s = this.add.rectangle(rng.int(0, VIEW_W), rng.int(0, VIEW_H), 1, 1, 0xffffff, rng.next() * 0.8 + 0.2);
      this.tweens.add({ targets: s, alpha: 0.1, duration: rng.int(800, 2400), yoyo: true, repeat: -1, delay: rng.int(0, 1500) });
    }
    // glow motes drifting upward: the region lighting back up
    for (let i = 0; i < 24; i++) {
      const m = this.add.rectangle(rng.int(0, VIEW_W), VIEW_H + rng.int(0, 60), 2, 2, 0xffe98a, 0.8);
      this.tweens.add({ targets: m, y: -10, x: m.x + rng.int(-20, 20), duration: rng.int(5000, 9000), repeat: -1, delay: rng.int(0, 5000) });
    }
    const lines = this.epilogue();
    const style = (c: string, size = 8) => ({ fontFamily: FONT, fontSize: `${size}px`, color: c, align: 'center' as const, lineSpacing: 5, wordWrap: { width: 216 } });
    const items: Phaser.GameObjects.Text[] = [];
    let y = 0;
    for (const [txt, col, size] of lines) {
      const t = this.add.text(VIEW_W / 2, y, txt, style(col, size)).setOrigin(0.5, 0);
      items.push(t);
      y += t.height + (size > 8 ? 14 : 10);
    }
    this.scroll = this.add.container(0, VIEW_H, items);
    this.prompt = this.add.text(VIEW_W / 2, VIEW_H - 14, 'Press Z to keep exploring', style('#f8d038')).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: this.prompt, alpha: { from: 0.3, to: 1 }, duration: 600, yoyo: true, repeat: -1, paused: false });
    this.prompt.setVisible(false);
    this.contentHeight = y;
  }
  private contentHeight = 0;

  private epilogue(): Array<[string, string, number]> {
    const L: Array<[string, string, number]> = [];
    const has = (npc: string) => state.affection(npc) >= 75 || state.flag(`date.${npc}`);
    L.push(['CHAPTER ONE', '#9a80c0', 8], ['THE EMBER TIDE', '#f2c94c', 16], ['', '#ffffff', 8]);
    L.push([`${state.playerName} and Jace carried the glow home.`, '#f4ecd8', 8]);
    L.push(['By morning, every lamp from Emberwick to Brindlemoor burned warm and steady.', '#f4ecd8', 8]);
    L.push(['Aurorix returned to the crystal, content to watch the light grow.', '#f4ecd8', 8], ['', '#ffffff', 8]);
    if (state.flag('elder.met') || true) L.push(['The Elder claims he foresaw everything. Nobody argues. It makes him happy.', '#c8d8f0', 8]);
    L.push(['Jace opened a snack stand by the pond and named it after a rival.', '#c8d8f0', 8], ['', '#ffffff', 8]);
    const any = ['mira', 'rhea', 'ilsa', 'odette'].some(has);
    if (any) L.push(['— AND IN THE QUIET HOURS —', '#e878a8', 8]);
    if (has('mira')) L.push(['Mira put a second chair by the shop window. It has never been empty since.', '#f4ecd8', 8]);
    if (has('rhea')) L.push(['Rhea runs the ridge at sunrise now. Someone always runs with her.', '#f4ecd8', 8]);
    if (has('ilsa')) L.push(["Ilsa's notebooks have a new chapter. It's mostly about one person. She pretends it's about the glow.", '#f4ecd8', 8]);
    if (has('odette')) L.push(['On the Moth & Mug chalkboard, in bright chalk: a story that is still being written.', '#f4ecd8', 8]);
    if (!any) L.push(['There are friendships yet to grow, and a region to explore.', '#f4ecd8', 8]);
    L.push(['', '#ffffff', 8]);
    L.push([`Time  ${fmtPlay(state.playMs)}`, '#c8d8f0', 8], [`Creatures caught  ${Object.keys(state.dex.caught).length}`, '#c8d8f0', 8], [`Badges  ${state.badges.length}`, '#c8d8f0', 8], [`Days  ${state.day}`, '#c8d8f0', 8]);
    L.push(['', '#ffffff', 8], ['HUNT-MON', '#e8623a', 16], ['Thank you for playing.', '#f4ecd8', 8], ['', '#ffffff', 8], ['', '#ffffff', 8]);
    return L;
  }

  update(_t: number, dt: number): void {
    this.input2.poll();
    const speed = this.input2.down('confirm') || this.input2.down('run') ? 0.14 : 0.022;
    if (!this.done) {
      this.scroll.y -= speed * dt;
      if (this.scroll.y + this.contentHeight < VIEW_H - 24) { this.scroll.y = VIEW_H - 24 - this.contentHeight; this.done = true; this.prompt.setVisible(true); }
    } else if (this.input2.just('confirm')) {
      this.done = false;
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('overworld', { map: 'emberwick', x: 7, y: 12, dir: 'down', msg: ['Emberwick glows gently in the evening light. There is still plenty to explore.'] }));
    }
  }
}
