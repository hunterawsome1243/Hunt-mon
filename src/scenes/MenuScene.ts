import Phaser from 'phaser';
import { DEPTH, VIEW_H, VIEW_W } from '../config';
import { MAPS } from '../data/maps';
import { DialogueBox, textStyle } from '../engine/ui/DialogueBox';
import { ListMenu, MenuOpts } from '../engine/ui/ListMenu';
import { InputManager } from '../engine/input/InputManager';
import { sfx } from '../engine/audio/Sfx';
import { win } from '../engine/ui/kit';
import { fmtPlay } from '../game/save/SaveManager';
import { state } from '../game/state/GameState';
import { bagScreen } from './screens/BagScreen';
import { boxScreen } from './screens/BoxScreen';
import { cardScreen } from './screens/CardScreen';
import { dexScreen } from './screens/DexScreen';
import { optionsScreen } from './screens/OptionsScreen';
import { partyScreen } from './screens/PartyScreen';
import { saveScreen } from './screens/SaveScreen';
import { shopScreen } from './screens/ShopScreen';

export interface PlayerPos { map: string; x: number; y: number; dir: string }
export type MenuRequest =
  | { screen: 'pause'; pos: PlayerPos }
  | { screen: 'shop'; shop: string }
  | { screen: 'box' }
  | { screen: 'gift'; npc: string };
export interface MenuResult { gift?: { item: string } | null; saved?: boolean }

/** Overlay scene hosting the pause menu and every full-screen menu (party, bag, dex, box, shop, save...). */
export class MenuScene extends Phaser.Scene {
  input2!: InputManager;
  menu!: ListMenu;
  box!: DialogueBox;
  /** screens set this to receive raw input when no ListMenu is open */
  handler: ((im: InputManager, dt: number) => void) | null = null;
  /** name of the screen currently shown (used by tests/tools) */
  current = '';
  private req!: MenuRequest;
  private result: MenuResult = {};

  constructor() { super('menu'); }
  init(req: MenuRequest): void { this.req = req; this.result = {}; this.handler = null; }

  create(): void {
    this.input2 = new InputManager(this);
    this.menu = new ListMenu(this);
    this.menu.onSound = (n) => sfx(n === 'move' ? 'cursor' : n === 'deny' ? 'deny' : n);
    this.box = new DialogueBox(this);
    this.box.charsPerSec = [25, 45, 90][state.options.textSpeed];
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.45).setOrigin(0, 0).setDepth(-1);
    (window as unknown as { __menuScene?: MenuScene }).__menuScene = this;
    void this.run().catch((e) => { console.error('menu crashed', e); this.close(); });
  }

  update(_t: number, dt: number): void {
    this.input2.poll();
    this.box.update(Math.min(dt, 50));
    if (this.menu.isOpen) this.menu.handleInput(this.input2, dt);
    else if (this.box.active) this.box.handleInput(this.input2);
    else this.handler?.(this.input2, dt);
  }

  // ------------------------------------------------------------ helpers
  pick(o: MenuOpts): Promise<number> { return this.menu.open(o); }
  /** Non-blocking-in-world message at the bottom of the screen. */
  async say(text: string, hold = 900): Promise<void> {
    this.box.layout(232);
    await this.box.message(text, hold);
    this.box.hide();
  }
  async confirm(text: string): Promise<boolean> {
    this.box.layout(232);
    this.box.showText(text);
    const i = await this.menu.open({ x: 160, y: 108, w: 76, rows: [{ label: 'Yes' }, { label: 'No' }], rowH: 12, cancelable: true, start: 1 });
    this.box.hide();
    return i === 0;
  }
  /** Wait for any confirm/back press (used by display-only screens). */
  waitBack(): Promise<void> {
    return new Promise((res) => {
      this.handler = (im) => { if (im.just('back') || im.just('confirm')) { this.handler = null; res(); } };
    });
  }
  /** Runs `fn` with a fresh set of display objects and destroys them afterwards. */
  async screen<T>(build: (layer: Phaser.GameObjects.Container) => Promise<T>, name = 'screen'): Promise<T> {
    const layer = this.add.container(0, 0).setDepth(DEPTH.ui - 50);
    const prev = this.current, prevHandler = this.handler;
    this.current = name;
    try { return await build(layer); } finally { layer.destroy(); this.handler = prevHandler; this.current = prev; }
  }

  close(): void {
    this.menu.close();
    this.scene.stop('menu');
    this.game.events.emit('menu-closed', this.result);
  }

  // ------------------------------------------------------------ flows
  private async run(): Promise<void> {
    const r = this.req;
    if (r.screen === 'pause') await this.pause(r.pos);
    else if (r.screen === 'shop') await shopScreen(this, r.shop);
    else if (r.screen === 'box') await boxScreen(this);
    else if (r.screen === 'gift') {
      const item = await bagScreen(this, { mode: 'gift' });
      this.result.gift = item ? { item } : null;
    }
    this.close();
  }

  private async pause(pos: PlayerPos): Promise<void> {
    const rows = [{ label: 'Dex' }, { label: 'Party' }, { label: 'Bag' }, { label: 'Card' }, { label: 'Save' }, { label: 'Options' }, { label: 'Close' }];
    const info = this.add.container(4, 18);
    const g = win(this, 0, 0, 132, 52);
    const mapName = MAPS[pos.map]?.name ?? pos.map;
    const t = this.add.text(8, 7, `${state.playerName}\n${mapName}\nDay ${state.day}  ${fmtPlay(state.playMs)}\n$${state.money}`, { ...textStyle(), lineSpacing: 2 });
    info.add([g, t]);
    info.setAlpha(0).setX(-20);
    this.tweens.add({ targets: info, alpha: 1, x: 4, duration: 180, ease: 'Back.easeOut' });
    let start = 0;
    for (;;) {
      this.current = 'pause';
      const i = await this.pick({ x: 152, y: 18, w: 84, rows, rowH: 13, start, cancelable: true });
      if (i < 0 || i === 6) break;
      start = i;
      this.menu.close();
      if (i === 0) await dexScreen(this);
      else if (i === 1) await partyScreen(this, { mode: 'browse' });
      else if (i === 2) await bagScreen(this, { mode: 'field' });
      else if (i === 3) await cardScreen(this);
      else if (i === 4) { const saved = await saveScreen(this, 'save', pos); if (saved) this.result.saved = true; }
      else if (i === 5) await optionsScreen(this);
    }
    info.destroy();
  }
}
