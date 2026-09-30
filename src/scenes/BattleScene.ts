import Phaser from 'phaser';
import { DEPTH, VIEW_H, VIEW_W } from '../config';
import { ENEMY_PLAT, PLAYER_PLAT, Terrain } from '../data/art/battleBg';
import { SPECIES } from '../data/creatures';
import { ITEMS } from '../data/items';
import { MOVES } from '../data/moves';
import { TYPE_COLOR } from '../data/typeChart';
import type { TrainerDef } from '../data/trainers';
import type { Status } from '../data/types';
import { InputManager } from '../engine/input/InputManager';
import { MoveFx, Pt } from '../engine/fx/MoveFx';
import { shutterClose, shutterOpen } from '../engine/fx/Transitions';
import { sfx } from '../engine/audio/Sfx';
import { safeShake } from '../engine/fx/Safe';
import { DialogueBox, drawWindow, textStyle } from '../engine/ui/DialogueBox';
import { HpBox } from '../engine/ui/HpBox';
import { ListMenu, Row } from '../engine/ui/ListMenu';
import { Action, Battle, BattleEvent, BattleResult, Side } from '../game/battle/Battle';
import { canEvolve, Creature, evolve, learnableAt, learnMove, maxHp, nameOf, spec, xpForLevel } from '../game/battle/Creature';
import { state } from '../game/state/GameState';
import { rng } from '../engine/rng';
import { wrap } from '../engine/ui/wrap';

export interface BattleInit {
  foeParty: Creature[];
  trainer?: TrainerDef;
  terrain: Terrain;
}
export interface BattleOutcome { result: BattleResult; trainerId?: string; prize?: number }

const FOE: Pt = { x: ENEMY_PLAT.x, y: ENEMY_PLAT.y + 2 };
const PLY: Pt = { x: PLAYER_PLAT.x, y: PLAYER_PLAT.y + 2 };
const centerOf = (s: Side): Pt => (s === 'f' ? { x: FOE.x, y: FOE.y - 26 } : { x: PLY.x, y: PLY.y - 26 });
const STAT_LABEL: Array<[keyof import('../data/types').Stats, string]> = [['hp', 'HP'], ['atk', 'Attack'], ['def', 'Defense'], ['spa', 'Sp.Atk'], ['spd', 'Sp.Def'], ['spe', 'Speed']];

export class BattleScene extends Phaser.Scene {
  private init0!: BattleInit;
  private battle!: Battle;
  private input2!: InputManager;
  private box!: DialogueBox;
  private menu!: ListMenu;
  private fx!: MoveFx;
  private foeImg!: Phaser.GameObjects.Image;
  private plyImg!: Phaser.GameObjects.Image;
  private trainerImg?: Phaser.GameObjects.Image;
  private heroImg!: Phaser.GameObjects.Image;
  private foeBox!: HpBox;
  private plyBox!: HpBox;
  private breathing = true;
  private t = 0;
  private shown = { p: -1, f: 0 };
  private hpShown = { p: 0, f: 0 };
  private pLevel = 1;
  private flashRect!: Phaser.GameObjects.Rectangle;
  private clouds: Phaser.GameObjects.Image[] = [];
  /** 'command' while waiting for the player's main-menu choice (used by tests/tools). */
  phase = 'intro';

  constructor() { super('battle'); }

  init(data: BattleInit): void { this.init0 = data; }

  create(): void {
    this.input2 = new InputManager(this);
    this.cameras.main.setBackgroundColor('#000000');
    this.add.image(0, 0, `bg_${this.init0.terrain}`).setOrigin(0, 0).setDepth(0);
    this.makeAmbient();

    this.foeImg = this.add.image(FOE.x, FOE.y, 'mon_f_nibbit').setOrigin(0.5, 1).setDepth(10).setVisible(false);
    this.plyImg = this.add.image(PLY.x, PLY.y, 'mon_b_nibbit').setOrigin(0.5, 1).setDepth(12).setVisible(false);
    this.heroImg = this.add.image(PLY.x, PLY.y + 2, `c_${state.look}`, 3).setOrigin(0.5, 1).setScale(3).setDepth(12);

    this.foeBox = new HpBox(this, 4, 6, false);
    this.plyBox = new HpBox(this, VIEW_W - 122 - 4, 70, true);
    this.box = new DialogueBox(this);
    this.box.charsPerSec = [45, 70, 120][state.options.textSpeed];
    this.box.onBlip = () => sfx('blip');
    this.menu = new ListMenu(this);
    this.menu.onSound = (n) => sfx(n === 'move' ? 'cursor' : n === 'deny' ? 'deny' : n);
    this.flashRect = this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0xffffff, 0).setOrigin(0, 0).setDepth(DEPTH.ui + 50);
    this.fx = new MoveFx(this, (c, a, ms) => this.screenFlash(c, a, ms),
      (ms, amt) => safeShake(this.cameras.main, ms, amt));

    if (this.init0.trainer) {
      const t = this.init0.trainer;
      this.trainerImg = this.add.image(FOE.x, FOE.y + 2, `p_${t.look}`, 0).setOrigin(0.5, 1).setScale(2).setDepth(10);
    }

    this.battle = new Battle({
      party: state.party, foeParty: this.init0.foeParty, trainerName: this.init0.trainer ? `${this.init0.trainer.class} ${this.init0.trainer.name}` : undefined,
      bag: state.bag, prize: this.init0.trainer?.prize,
    });
    for (const c of this.init0.foeParty.slice(0, 1)) state.markSeen(c.species);

    (window as unknown as { __battle?: BattleScene }).__battle = this;
    void this.run().catch((e) => { console.error('battle crashed', e); this.leave({ result: 'run' }); });
  }

  // ---------------------------------------------------------------- helpers
  private wait(ms: number): Promise<void> { return new Promise((r) => this.time.delayedCall(ms, () => r())); }
  private tw(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((res) => this.tweens.add({ ...cfg, onComplete: () => res() }));
  }
  private msg(text: string, hold = 620): Promise<void> { return this.box.message(text, hold); }
  private imgOf(s: Side): Phaser.GameObjects.Image { return s === 'p' ? this.plyImg : this.foeImg; }
  private boxOf(s: Side): HpBox { return s === 'p' ? this.plyBox : this.foeBox; }
  private mon(s: Side): Creature { return s === 'p' ? this.battle.party[this.shown.p] : this.battle.foeParty[this.shown.f]; }

  private makeAmbient(): void {
    if (this.init0.terrain === 'cave') {
      for (let i = 0; i < 18; i++) {
        const p = this.add.rectangle(rng.int(0, VIEW_W), rng.int(0, 110), 1, 1, 0xc8b8ff, 0.5).setDepth(3);
        this.tweens.add({ targets: p, y: p.y - rng.int(6, 20), x: p.x + rng.int(-10, 10), alpha: 0.05, duration: rng.int(2000, 4000), yoyo: true, repeat: -1, delay: rng.int(0, 2000) });
      }
    } else if (this.init0.terrain !== 'gym') {
      // drifting pixel clouds
      for (let i = 0; i < 3; i++) {
        const w = rng.int(22, 40);
        const g = this.add.graphics().setDepth(1);
        g.fillStyle(0xffffff, 0.85).fillRect(3, 4, w, 5).fillRect(7, 1, w - 12, 4).fillRect(0, 6, w + 6, 3);
        g.fillStyle(0xdcecf8, 0.9).fillRect(3, 8, w, 1);
        g.x = rng.int(-20, VIEW_W); g.y = rng.int(6, 40);
        this.tweens.add({ targets: g, x: VIEW_W + 30, duration: rng.int(38000, 60000), repeat: -1, onRepeat: () => { g.x = -50; } });
        this.clouds.push(g as unknown as Phaser.GameObjects.Image);
      }
    }
  }

  update(_t: number, dt: number): void {
    dt = Math.min(dt, 50);
    this.t += dt;
    this.input2.poll();
    this.box.update(dt);
    if (this.menu.isOpen) this.menu.handleInput(this.input2, dt);
    else this.box.handleInput(this.input2);
    if (this.breathing) {
      const b = Math.round(Math.sin(this.t / 420) * 0.9 + 0.4);
      if (this.foeImg.visible) this.foeImg.y = FOE.y + b;
      if (this.plyImg.visible) this.plyImg.y = PLY.y - Math.round(Math.sin(this.t / 400 + 1) * 0.9 + 0.4);
    }
  }

  private waitConfirm(): Promise<void> {
    return new Promise((res) => {
      const h = this.time.addEvent({ delay: 16, loop: true, callback: () => { if (this.input2.just('confirm') || this.input2.just('back')) { h.remove(); res(); } } });
    });
  }

  // ---------------------------------------------------------------- main flow
  private async run(): Promise<void> {
    await shutterOpen(this, 480);
    const trainer = this.init0.trainer;
    this.box.layout(232);
    if (trainer) {
      await this.msg(`${trainer.class} ${trainer.name} wants to battle!`, 900);
    }
    await this.playEvents(this.battle.start());

    while (!this.battle.over) {
      const act = await this.chooseAction();
      this.phase = 'busy';
      const ev = this.battle.turn(act);
      await this.playEvents(ev);
      if (this.battle.awaitingSwitch && !this.battle.over) {
        const idx = await this.partyMenu(false, 'Send out which creature?');
        await this.playEvents(this.battle.forcedSwitch(idx));
      }
    }
    await this.wrapUp();
  }

  private async wrapUp(): Promise<void> {
    const result = this.battle.over!;
    const outcome: BattleOutcome = { result };
    const trainer = this.init0.trainer;
    this.plyBox.hide(); this.foeBox.hide();
    if (result === 'win' && trainer) {
      this.trainerImg!.setPosition(FOE.x + 90, FOE.y + 2).setAlpha(1);
      await this.tw({ targets: this.trainerImg, x: FOE.x, duration: 380, ease: 'Sine.easeOut' });
      for (const l of trainer.win) await this.msg(`${trainer.name}: ${l}`, 1100);
      state.money += trainer.prize;
      await this.msg(`You got $${trainer.prize} for winning!`, 1100);
      outcome.trainerId = trainer.id; outcome.prize = trainer.prize;
    } else if (result === 'caught' && this.battle.caughtMon) {
      const c = this.battle.caughtMon;
      const where = state.addCreature(c);
      await this.msg(`${nameOf(c)} was added to your ${where === 'party' ? 'party' : 'storage box'}.`, 1000);
    } else if (result === 'lose') {
      await this.msg('You are out of creatures that can fight!', 1000);
      await this.msg('You blacked out...', 1000);
    }
    if (result === 'win' || result === 'caught' || result === 'run') {
      for (const uid of this.battle.everFought) {
        const c = state.party.find((m) => m.uid === uid);
        if (c && c.hp > 0) { const to = canEvolve(c); if (to) await this.evolution(c, to); }
      }
    }
    this.phase = 'done';
    await this.leave(outcome);
  }

  private async leave(outcome: BattleOutcome): Promise<void> {
    await shutterClose(this, 420);
    this.scene.stop('battle');
    this.scene.wake('overworld', outcome);
  }

  // ---------------------------------------------------------------- player choices
  private async chooseAction(): Promise<Action> {
    for (;;) {
      this.box.layout(112);
      this.box.showText(wrap(`What will ${nameOf(this.mon('p'))} do?`, 12).slice(0, 3).join('\n'));
      this.phase = 'command';
      const c = await this.menu.open({ x: 120, y: 114, w: 116, rows: [{ label: 'Fight' }, { label: 'Bag' }, { label: 'Party' }, { label: 'Run' }], cols: 2, rowH: 13, cancelable: false });
      this.box.layout(232);
      this.phase = 'busy';
      if (c === 0) {
        const a = await this.moveMenu();
        if (a) return a;
      } else if (c === 1) {
        const a = await this.bagMenu();
        if (a) return a;
      } else if (c === 2) {
        const idx = await this.partyMenu(true, 'Switch to which creature?');
        if (idx >= 0) return { t: 'switch', to: idx };
      } else if (c === 3) return { t: 'run' };
    }
  }

  private async moveMenu(): Promise<Action | null> {
    const p = this.battle.p;
    if (!this.battle.hasPp('p')) return { t: 'move', idx: 0 }; // out of PP: Struggle
    const rows: Row[] = p.moves.map((m) => ({ label: MOVES[m.id].name, disabled: m.pp <= 0 }));
    const g = this.add.graphics().setDepth(DEPTH.ui + 10);
    drawWindow(g, 154, 100, 82, 56);
    const tagG = this.add.graphics().setDepth(DEPTH.ui + 11);
    const typeT = this.add.text(0, 0, '', textStyle('#ffffff')).setDepth(DEPTH.ui + 12).setScale(0.75);
    const infoT = this.add.text(162, 114, '', { ...textStyle(), lineSpacing: 2 }).setDepth(DEPTH.ui + 12);
    const draw = (i: number) => {
      const slot = p.moves[i], m = MOVES[slot.id];
      tagG.clear().fillStyle(Phaser.Display.Color.HexStringToColor(TYPE_COLOR[m.type]).color, 1).fillRect(162, 105, 42, 8);
      typeT.setPosition(164, 106).setText(m.type.toUpperCase());
      infoT.setText(`PP ${slot.pp}/${slot.maxPp}\nPow ${m.power || '--'}\nAcc ${m.acc ?? '--'}`);
    };
    this.box.hide();
    const idx = await this.menu.open({ x: 4, y: 100, w: 148, rows, rowH: 11, cancelable: true, visible: 4, onMove: draw });
    g.destroy(); tagG.destroy(); typeT.destroy(); infoT.destroy();
    this.box.showText('');
    if (idx < 0) return null;
    return { t: 'move', idx };
  }

  private async bagMenu(): Promise<Action | null> {
    const usable = Object.entries(state.bag).filter(([id, n]) => n > 0 && ITEMS[id] && ['heal', 'status', 'revive', 'ball'].includes(ITEMS[id].kind));
    if (!usable.length) { await this.msg('Your bag has nothing usable.', 700); return null; }
    const rows: Row[] = usable.map(([id, n]) => ({ label: ITEMS[id].name, right: `x${n}`, disabled: ITEMS[id].kind === 'ball' && !!this.init0.trainer }));
    this.box.layout(232);
    const sel = await this.menu.open({ x: 60, y: 4, w: 176, rows, rowH: 11, visible: Math.min(6, rows.length), cancelable: true,
      onMove: (i) => this.box.showText(ITEMS[usable[i][0]].desc.replace(/(.{24})\s/g, '$1\n')) });
    if (sel < 0) return null;
    const id = usable[sel][0];
    if (ITEMS[id].kind === 'ball') return { t: 'ball', id };
    const target = await this.partyMenu(true, `Use ${ITEMS[id].name} on which creature?`, true);
    if (target < 0) return null;
    return { t: 'item', id, target };
  }

  /** Party list. `includeCurrent` false hides nothing but disables the active one when switching. */
  private async partyMenu(cancelable: boolean, prompt: string, itemUse = false): Promise<number> {
    const party = this.battle.party;
    const rows: Row[] = party.map((c, i) => ({
      label: `${nameOf(c).slice(0, 9)} Lv${c.level}${c.status ? ' ' + c.status.slice(0, 3).toUpperCase() : ''}`,
      right: c.hp > 0 ? `${c.hp}/${maxHp(c)}` : 'FNT',
      color: c.hp <= 0 ? '#c8452f' : undefined,
      disabled: !itemUse && (c.hp <= 0 || i === this.battle.pi),
    }));
    this.box.layout(232);
    this.box.showText(prompt.replace(/(.{26})\s/, '$1\n'));
    const sel = await this.menu.open({ x: 4, y: 2, w: 232, rows, rowH: 14, cancelable, visible: party.length, pad: 6 });
    return sel;
  }

  // ---------------------------------------------------------------- event playback
  private async playEvents(events: BattleEvent[]): Promise<void> {
    for (const e of events) {
      switch (e.t) {
        case 'msg': await this.msg(e.text); break;
        case 'send': await this.sendOut(e.side, e.idx); break;
        case 'useMove': await this.useMove(e.side, e.move); break;
        case 'miss': await this.dodge(e.side === 'p' ? 'f' : 'p'); break;
        case 'damage': await this.damage(e); break;
        case 'heal': await this.heal(e); break;
        case 'status': {
          if (e.side === 'p' || e.side === 'f') { this.boxOf(e.side).setStatus(e.status); if (e.status) { sfx('status'); await this.fx.status(centerOf(e.side), e.status as Status); } }
          break;
        }
        case 'stage': sfx(e.delta > 0 ? 'statup' : 'statdown'); await this.fx.stage(centerOf(e.side), e.delta > 0, e.stat); break;
        case 'faint': await this.faint(e.side); break;
        case 'xp': await this.xpGain(e); break;
        case 'levelUp': await this.levelUp(e); break;
        case 'learnPrompt': await this.learnPrompt(e.idx, e.move); break;
        case 'ball': await this.catchAnim(e.ball, e.shakes, e.caught); break;
        case 'needSwitch': case 'end': break;
      }
    }
  }

  private async sendOut(side: Side, idx: number): Promise<void> {
    const c = side === 'p' ? this.battle.party[idx] : this.battle.foeParty[idx];
    const img = this.imgOf(side);
    const box = this.boxOf(side);
    this.shown[side === 'p' ? 'p' : 'f'] = idx;
    this.hpShown[side] = c.hp;
    if (side === 'f') state.markSeen(c.species);
    this.breathing = false;
    box.hide();
    if (side === 'p') {
      this.pLevel = c.level;
      // hero steps off / previous creature recalled
      if (this.heroImg.visible) await this.tw({ targets: this.heroImg, x: -50, duration: 360, ease: 'Sine.easeIn' }), this.heroImg.setVisible(false);
      else if (img.visible) await this.recall(img);
    } else {
      if (this.trainerImg?.visible) await this.tw({ targets: this.trainerImg, x: FOE.x + 100, duration: 340, ease: 'Sine.easeIn' }), this.trainerImg.setVisible(false);
      else if (img.visible) await this.recall(img);
    }
    img.setTexture(side === 'p' ? `mon_b_${c.species}` : `mon_f_${c.species}`).setVisible(true).setAlpha(1).setScale(1);
    img.setPosition(side === 'p' ? PLY.x : FOE.x, side === 'p' ? PLY.y : FOE.y).setTintFill(0xffffff);
    img.setScale(0.2);
    sfx('send');
    this.spawnPoof(side === 'p' ? PLY : FOE);
    const grow = this.tw({ targets: img, scale: 1, duration: 320, ease: 'Back.easeOut' });
    this.time.delayedCall(220, () => img.clearTint());
    await grow;
    const xpFrac = side === 'p' ? this.xpFrac(c) : 0;
    box.set(nameOf(c), c.level, c.hp, maxHp(c), c.status, xpFrac);
    await box.show(side === 'p' ? VIEW_W + 10 : -130);
    this.breathing = true;
  }

  private spawnPoof(at: Pt): void {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const s = this.add.image(at.x, at.y - 20, 'fx_orb').setTint(0xffffff).setDepth(DEPTH.fx).setScale(0.8);
      this.tweens.add({ targets: s, x: at.x + Math.cos(a) * 26, y: at.y - 20 + Math.sin(a) * 20, alpha: 0, scale: 0.3, duration: 380, ease: 'Quad.easeOut', onComplete: () => s.destroy() });
    }
  }
  private async recall(img: Phaser.GameObjects.Image): Promise<void> {
    img.setTintFill(0xffffff);
    await this.tw({ targets: img, scale: 0.1, alpha: 0.2, duration: 240, ease: 'Quad.easeIn' });
    img.setVisible(false).clearTint();
  }

  private xpFrac(c: Creature): number {
    const cv = spec(c).curve;
    const lo = xpForLevel(cv, c.level), hi = xpForLevel(cv, c.level + 1);
    return Math.max(0, Math.min(1, (c.xp - lo) / Math.max(1, hi - lo)));
  }

  private async useMove(side: Side, id: string): Promise<void> {
    const m = MOVES[id];
    const img = this.imgOf(side);
    const other: Side = side === 'p' ? 'f' : 'p';
    this.breathing = false;
    sfx('move_' + m.type);
    if (m.cat === 'phys') {
      const dir = side === 'p' ? 1 : -1;
      await this.tw({ targets: img, x: img.x + 12 * dir, y: img.y - 3, duration: 90, ease: 'Quad.easeOut' });
      const fxp = this.fx.play(m.type, m.cat, centerOf(side), centerOf(other));
      await this.tw({ targets: img, x: (side === 'p' ? PLY.x : FOE.x), y: side === 'p' ? PLY.y : FOE.y, duration: 140, ease: 'Quad.easeIn' });
      await fxp;
    } else if (m.cat === 'spec') {
      await this.fx.play(m.type, m.cat, centerOf(side), centerOf(other));
    } else {
      // status move: shimmer on the user, result effects follow as their own events
      await this.fx.play(m.type, 'status', centerOf(side), centerOf(side));
    }
    this.breathing = true;
  }

  private async dodge(side: Side): Promise<void> {
    const img = this.imgOf(side);
    const dx = side === 'p' ? -10 : 10;
    const home = side === 'p' ? PLY.x : FOE.x;
    await this.tw({ targets: img, x: home + dx, duration: 110, ease: 'Quad.easeOut' });
    await this.tw({ targets: img, x: home, duration: 140, ease: 'Quad.easeIn' });
  }

  private async blink(img: Phaser.GameObjects.Image, times = 3): Promise<void> {
    for (let i = 0; i < times; i++) { img.setAlpha(0.15); await this.wait(45); img.setAlpha(1); await this.wait(45); }
  }

  private async damage(e: Extract<BattleEvent, { t: 'damage' }>): Promise<void> {
    const img = this.imgOf(e.side);
    const hb = this.boxOf(e.side);
    this.breathing = false;
    sfx(e.eff > 1 ? 'hit_super' : e.eff < 1 ? 'hit_weak' : 'hit');
    img.setTintFill(0xffffff);
    this.time.delayedCall(70, () => img.clearTint());
    safeShake(this.cameras.main, e.crit || e.eff > 1 ? 200 : 120, e.crit || e.eff > 1 ? 0.012 : 0.006);
    if (e.eff > 1) this.flashSprite(0xffe08a);
    this.hpShown[e.side] = e.hp;
    await Promise.all([this.blink(img), hb.animateHp(e.hp, e.from)]);
    this.breathing = true;
  }
  private flashSprite(color: number): void { this.screenFlash(color, 0.25, 140); }
  private screenFlash(color: number, alpha: number, ms: number): void {
    if (!state.options.flashes) return;
    this.flashRect.setFillStyle(color, alpha);
    this.tweens.add({ targets: this.flashRect, fillAlpha: { from: alpha, to: 0 }, duration: ms });
  }

  private async heal(e: Extract<BattleEvent, { t: 'heal' }>): Promise<void> {
    const isShown = e.target === undefined || e.target === this.shown.p || e.side === 'f';
    sfx('heal');
    await this.fx.heal(centerOf(e.side));
    if (isShown) { this.hpShown[e.side] = e.hp; await this.boxOf(e.side).animateHp(e.hp, e.from); }
  }

  private async faint(side: Side): Promise<void> {
    const img = this.imgOf(side);
    this.breathing = false;
    sfx('faint');
    img.setTintFill(0xffffff);
    await this.wait(80); img.clearTint();
    await this.tw({ targets: img, y: img.y + 34, alpha: 0, duration: 520, ease: 'Quad.easeIn' });
    img.setVisible(false).setAlpha(1);
    this.boxOf(side).hide();
    this.breathing = true;
  }

  private async xpGain(e: Extract<BattleEvent, { t: 'xp' }>): Promise<void> {
    if (e.idx !== this.shown.p) return;
    const c = this.battle.party[e.idx];
    const cv = spec(c).curve;
    let lv = this.pLevel;
    for (;;) {
      const lo = xpForLevel(cv, lv), hi = xpForLevel(cv, lv + 1);
      if (e.toXp >= hi) { await this.plyBox.animateXp(1, 420); this.plyBox.resetXp(); lv++; continue; }
      await this.plyBox.animateXp(Math.max(0, (e.toXp - lo) / (hi - lo)), 520);
      break;
    }
  }

  private async levelUp(e: Extract<BattleEvent, { t: 'levelUp' }>): Promise<void> {
    if (e.idx !== this.shown.p) return;
    const { info } = e;
    this.pLevel = info.level;
    sfx('levelup');
    const c = this.battle.party[e.idx];
    this.plyBox.setLevel(info.level, info.after.hp);
    this.hpShown.p = Math.min(info.after.hp, this.hpShown.p + (info.after.hp - info.before.hp));
    await this.plyBox.animateHp(this.hpShown.p);
    // stat panel
    const g = this.add.graphics().setDepth(DEPTH.ui + 30);
    drawWindow(g, 0, 0, 120, 82);
    const lines = STAT_LABEL.map(([k, label]) => `${label.padEnd(7)}${String(info.after[k]).padStart(3)} +${info.after[k] - info.before[k]}`).join('\n');
    const t = this.add.text(8, 8, `${nameOf(c)} Lv${info.level}\n${lines}`, { ...textStyle(), lineSpacing: 2 }).setDepth(DEPTH.ui + 31);
    const cont = this.add.container(4, 2, [g, t]).setDepth(DEPTH.ui + 30);
    cont.setAlpha(0);
    await this.tw({ targets: cont, alpha: 1, duration: 160 });
    await this.waitConfirm();
    cont.destroy();
  }

  private async learnPrompt(idx: number, move: string): Promise<void> {
    const c = this.battle.party[idx];
    const name = nameOf(c), mv = MOVES[move].name;
    await this.msg(`${name} wants to learn ${mv}, but already knows four moves.`, 900);
    this.box.layout(112);
    this.box.showText('Forget a move to make room?'.replace(/(.{13})\s/g, '$1\n'));
    const yes = await this.menu.open({ x: 120, y: 114, w: 116, rows: [{ label: 'Yes' }, { label: 'No' }], cols: 2, rowH: 13, cancelable: false });
    this.box.layout(232);
    if (yes === 0) {
      const rows: Row[] = c.moves.map((m) => ({ label: MOVES[m.id].name, right: `${m.pp}/${m.maxPp}` }));
      this.box.showText(`Which move should ${name} forget?`);
      const sel = await this.menu.open({ x: 60, y: 4, w: 176, rows, rowH: 11, cancelable: false });
      const old = MOVES[c.moves[sel].id].name;
      this.battle.learnFor(idx, move, sel);
      await this.msg(`${name} forgot ${old} and learned ${mv}!`, 1100);
    } else await this.msg(`${name} did not learn ${mv}.`, 800);
  }

  // ---------------------------------------------------------------- catching
  private async catchAnim(ballId: string, shakes: number, caught: boolean): Promise<void> {
    const img = this.foeImg;
    this.breathing = false;
    const ball = this.add.image(PLY.x + 10, PLY.y - 40, `ball_${ballId}`).setDepth(DEPTH.fx).setScale(1.4);
    sfx('throw');
    const from = { x: ball.x, y: ball.y }, to = { x: FOE.x, y: FOE.y - 34 };
    const p = { t: 0 };
    await this.tw({ targets: p, t: 1, duration: 620, ease: 'Sine.easeOut', onUpdate: () => {
      ball.x = from.x + (to.x - from.x) * p.t;
      ball.y = from.y + (to.y - from.y) * p.t - Math.sin(p.t * Math.PI) * 50;
      ball.rotation = p.t * 12;
    } });
    // creature is sucked into the ball
    sfx('capture');
    this.flashBall(ball);
    img.setTintFill(0xffffff);
    await Promise.all([
      this.tw({ targets: img, scale: 0.1, y: FOE.y - 30, alpha: 0.3, duration: 320, ease: 'Quad.easeIn' }),
      this.tw({ targets: ball, y: to.y - 6, duration: 320 }),
    ]);
    img.setVisible(false);
    this.foeBox.hide();
    // drop to the ground with a bounce
    ball.rotation = 0;
    await this.tw({ targets: ball, y: FOE.y - 6, duration: 300, ease: 'Bounce.easeOut' });
    for (let i = 0; i < shakes; i++) {
      await this.wait(420);
      sfx('shake');
      await this.tw({ targets: ball, angle: { from: -22, to: 22 }, duration: 130, yoyo: true, ease: 'Sine.easeInOut' });
      ball.angle = 0;
    }
    await this.wait(380);
    if (caught) {
      sfx('caught');
      ball.setTint(0x777788);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const s = this.add.image(ball.x, ball.y - 4, 'fx_star').setTint(0xffe060).setDepth(DEPTH.fx).setScale(0.5);
        this.tweens.add({ targets: s, x: ball.x + Math.cos(a) * 28, y: ball.y - 4 + Math.sin(a) * 28, alpha: 0, angle: 180, duration: 620, ease: 'Quad.easeOut', onComplete: () => s.destroy() });
      }
      await this.wait(500);
      await this.tw({ targets: ball, alpha: 0, duration: 260 });
      ball.destroy();
      state.markCaught(this.battle.f.species);
    } else {
      sfx('breakfree');
      this.spawnPoof({ x: ball.x, y: ball.y + 12 });
      ball.destroy();
      img.setVisible(true).setAlpha(1).setPosition(FOE.x, FOE.y).setScale(0.2).setTintFill(0xffffff);
      this.time.delayedCall(160, () => img.clearTint());
      await this.tw({ targets: img, scale: 1, duration: 300, ease: 'Back.easeOut' });
      this.foeBox.c.setVisible(true);
      this.foeBox.set(nameOf(this.battle.f), this.battle.f.level, this.battle.f.hp, maxHp(this.battle.f), this.battle.f.status);
    }
    this.breathing = true;
  }
  private flashBall(b: Phaser.GameObjects.Image): void {
    b.setTintFill(0xffffff);
    this.time.delayedCall(120, () => b.clearTint());
  }

  // ---------------------------------------------------------------- evolution
  private async evolution(c: Creature, to: string): Promise<void> {
    const from = c.species;
    this.foeBox.hide(); this.plyBox.hide();
    this.plyImg.setVisible(false); this.foeImg.setVisible(false); this.heroImg.setVisible(false);
    const spr = this.add.image(VIEW_W / 2, 92, `mon_f_${from}`).setOrigin(0.5, 1).setScale(1.5).setDepth(15);
    const bg = this.add.rectangle(0, 0, VIEW_W, 114, 0x000000, 0.65).setOrigin(0, 0).setDepth(14);
    this.box.layout(232);
    await this.msg(`What? ${nameOf(c)} is evolving!`, 1000);
    let cancelled = false;
    sfx('evolve');
    const total = 3400;
    let elapsed = 0;
    let showNew = false;
    while (elapsed < total && !cancelled) {
      const interval = Math.max(45, 300 - (elapsed / total) * 260);
      showNew = !showNew;
      spr.setTexture(`mon_f_${showNew ? to : from}`).setTintFill(0xffffff);
      await this.wait(interval * 0.6);
      spr.clearTint().setTexture(`mon_f_${from}`);
      await this.wait(interval * 0.4);
      elapsed += interval;
      this.input2.poll();
      if (this.input2.just('back')) cancelled = true;
    }
    if (cancelled) {
      spr.setTexture(`mon_f_${from}`).clearTint();
      await this.msg(`Huh? ${nameOf(c)} stopped evolving!`, 1000);
    } else {
      this.flashRect.setFillStyle(0xffffff, 1); this.tweens.add({ targets: this.flashRect, fillAlpha: { from: 1, to: 0 }, duration: 700 });
      const oldName = nameOf(c);
      evolve(c, to);
      state.markCaught(to);
      spr.setTexture(`mon_f_${to}`).clearTint();
      for (let i = 0; i < 14; i++) {
        const s = this.add.image(spr.x + rng.int(-30, 30), 92, 'fx_star').setTint(0xfff0a0).setDepth(16).setScale(0.6);
        this.tweens.add({ targets: s, y: 30, alpha: 0, duration: rng.int(600, 1200), delay: rng.int(0, 500), onComplete: () => s.destroy() });
      }
      sfx('levelup');
      await this.msg(`Congratulations! ${oldName} evolved into ${SPECIES[to].name}!`, 1500);
      for (const m of learnableAt(c, c.level)) {
        if (c.moves.length < 4) { learnMove(c, m, null); await this.msg(`${nameOf(c)} learned ${MOVES[m].name}!`, 900); }
        else await this.learnPromptDirect(c, m);
      }
    }
    spr.destroy(); bg.destroy();
  }

  private async learnPromptDirect(c: Creature, move: string): Promise<void> {
    const idx = state.party.indexOf(c);
    this.battle.party = state.party;
    await this.learnPrompt(idx, move);
  }
}
