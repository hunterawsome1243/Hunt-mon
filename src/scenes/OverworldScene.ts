import Phaser from 'phaser';
import { DEPTH, DIRS, Dir, TILE, VIEW_H, VIEW_W } from '../config';
import { TILES } from '../data/art/tiles';
import { MAPS, START } from '../data/maps';
import type { MapDef, NpcDef, TriggerDef } from '../data/types';
import { evalCond } from '../game/script/Conditions';
import { partyFor } from '../data/trainers';
import { BADGES } from '../data/badges';
import { Actor } from '../engine/grid/Actor';
import { InputManager } from '../engine/input/InputManager';
import { DialogueBox, textStyle } from '../engine/ui/DialogueBox';
import { DialogueRunner } from '../engine/script/DialogueRunner';
import { SceneDialogueUI } from '../engine/script/SceneDialogueUI';
import { nextDay } from '../game/romance/Affection';
import { state } from '../game/state/GameState';
import { rng } from '../engine/rng';
import { ENCOUNTERS } from '../data/encounters';
import { TRAINERS } from '../data/trainers';
import { createCreature, maxHp, movesAt, xpForLevel } from '../game/battle/Creature';
import { SPECIES } from '../data/creatures';
import { MOVES } from '../data/moves';
import { shutterClose, shutterRetract } from '../engine/fx/Transitions';
import { sfx } from '../engine/audio/Sfx';
import { safeFlash } from '../engine/fx/Safe';
import { ITEMS } from '../data/items';
import { giveGift } from '../game/romance/Affection';
import type { MenuRequest, MenuResult } from './MenuScene';
import type { BattleInit, BattleOutcome } from './BattleScene';

interface AnimTile { sprite: Phaser.GameObjects.Image; key: string; frames: number; ms: number }
interface NpcRt { def: NpcDef; actor: Actor; homeX: number; homeY: number; timer: number }
interface PendingBattle { init: BattleInit }
type PickupDefLite = { item: string; qty?: number; flag: string; text?: string };
interface SceneData { map?: string; x?: number; y?: number; dir?: Dir; msg?: string[] }

export class OverworldScene extends Phaser.Scene {
  private input2!: InputManager;
  private map!: MapDef;
  private player!: Actor;
  private npcs: NpcRt[] = [];
  private solid: boolean[][] = [];
  private grass: boolean[][] = [];
  private animTiles: AnimTile[] = [];
  private dialogue!: DialogueBox;
  private runner!: DialogueRunner;
  private ui!: SceneDialogueUI;
  private locked = false;
  private turnWait = 0;
  private chain = false;
  private camX = 0; private camY = 0;
  private grassOverlay!: Phaser.GameObjects.Image;
  private mapLabel!: Phaser.GameObjects.Text;
  private tileClock = 0;
  private bars: Phaser.GameObjects.Rectangle[] = [];
  private stepsSince = 0;
  private runOn = false;
  private seed: SceneData = {};

  constructor() { super('overworld'); }

  init(data: SceneData): void { this.seed = data ?? {}; }

  create(): void {
    const id = this.seed.map ?? START.map;
    this.map = MAPS[id];
    const sx = this.seed.x ?? START.x, sy = this.seed.y ?? START.y, sd = this.seed.dir ?? START.dir;
    this.input2 = new InputManager(this);
    this.animTiles = []; this.npcs = []; this.locked = false; this.turnWait = 0; this.chain = false;
    this.buildMap();
    this.dialogue = new DialogueBox(this);
    this.dialogue.charsPerSec = [25, 45, 90][state.options.textSpeed];
    this.ui = new SceneDialogueUI(this, this.dialogue, {
      npcActor: (id) => this.npcs.find((n) => n.def.id === id)?.actor,
      command: (name, arg) => this.command(name, arg),
    });
    this.runner = new DialogueRunner(this.ui, state, rng);

    this.player = new Actor(this, 'player', `c_${state.look}`, sx, sy, sd);
    this.player.onArrive = (a) => this.onPlayerArrive(a);

    for (const def of this.map.npcs.filter((n) => evalCond(n.cond, state))) {
      const actor = new Actor(this, def.id, `c_${def.look}`, def.x, def.y, def.dir);
      this.npcs.push({ def, actor, homeX: def.x, homeY: def.y, timer: 800 + rng.int(0, 2000) });
    }

    this.grassOverlay = this.add.image(0, 0, 't_tall_grass', 0).setOrigin(0, 0).setVisible(false).setDepth(DEPTH.entity + 500);
    this.grassOverlay.setCrop(0, 8, TILE, 8);

    // Area name banner
    this.mapLabel = this.add.text(VIEW_W / 2, 6, this.map.name, textStyle('#fdf6e3')).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.ui + 5).setAlpha(0);
    this.mapLabel.setShadow(1, 1, '#1b1530', 0, false, true);
    this.tweens.add({ targets: this.mapLabel, alpha: 1, y: 8, duration: 300, hold: 1400, yoyo: true, ease: 'Sine.easeOut' });

    this.cameras.main.setBackgroundColor(this.map.indoor ? '#0b0910' : '#101820');
    this.centerCamera(true);
    this.cameras.main.fadeIn(280, 0, 0, 0);
    (window as unknown as { __hunt?: unknown }).__hunt = this.debugApi();
    if (this.map.autorun) {
      this.locked = true;
      this.time.delayedCall(1000, () => { void this.runner.run(this.map.autorun!).catch((e) => { console.error('autorun failed', e); this.locked = false; }); });
    } else if (this.seed.msg) {
      this.locked = true;
      this.time.delayedCall(450, () => { void this.dialogue.say({ text: this.seed.msg!.join(' ') }).then(() => { this.locked = false; }); });
    }
  }

  private debugApi() {
    return {
      state: () => ({ day: state.day, aff: { ...Object.fromEntries(Object.entries(state.romance).map(([k, v]) => [k, v.affection])) }, map: this.map.id, x: this.player.tx, y: this.player.ty, dir: this.player.dir, moving: this.player.moving, locked: this.locked, dialogue: this.dialogue.active, menu: this.dialogue.hasMenu }),
      maps: Object.keys(MAPS),
      spawnOf: (id: string) => MAPS[id].spawn ?? { x: Math.floor(MAPS[id].w / 2), y: MAPS[id].h - 3, dir: 'up' },
      giveStarter: (id: string, lv = 5) => { if (!state.party.length) state.giveStarter(id, lv); },
      wild: (sp: string, lv: number) => this.startBattle({ foeParty: [createCreature(sp, lv)], terrain: this.terrain() }),
      trainerBattle: (id: string) => { const d = TRAINERS[id]; return this.startBattle({ foeParty: d.party.map((p) => createCreature(p.species, p.level)), trainer: d, terrain: this.terrain() }); },
      party: () => state.party.map((c) => ({ sp: c.species, lv: c.level, hp: c.hp, xp: c.xp, moves: c.moves.map((m) => m.id) })),
      box: () => state.box.length,
      name: () => state.playerName,
      addItem: (id: string, n = 1) => state.addItem(id, n),
      addMon: (sp: string, lv: number) => { state.addCreature(createCreature(sp, lv)); },
      setLevel: (i: number, lv: number) => { const c = state.party[i]; c.level = lv; c.xp = xpForLevel(SPECIES[c.species].curve, lv); c.moves = movesAt(c.species, lv).map((id) => ({ id, pp: MOVES[id].pp, maxPp: MOVES[id].pp })); c.hp = maxHp(c); },
      nearLevelUp: (i: number) => { const c = state.party[i]; c.xp = xpForLevel(SPECIES[c.species].curve, c.level + 1) - 1; },
      hpAll: (hp: number) => { state.party.forEach((c) => { c.hp = Math.min(c.hp, hp); }); },
      money: () => state.money,
      flag: (k: string) => state.flag(k),
      setFlag: (k: string, v = true) => state.setFlag(k, v),
      setAff: (npc: string, v: number) => { state.rec(npc).affection = v; state.rec(npc).pending = []; },
      warp: (map: string, x: number, y: number, dir: Dir = 'down') => this.warpTo(map, x, y, dir),
      say: (id: string) => this.runner.run(id),
      giveBadge: (id: string) => { void this.command('badge', id); },
    };
  }

  // ---------- map construction ----------
  private buildMap(): void {
    const { w, h } = this.map;
    // Static tiles are collected per layer and baked one layer at a time. (Interleaving begin/endDraw across
    // RenderTextures corrupts them, and an RT that never receives a draw renders as an opaque smear.)
    type Layer = 'under' | 'detail' | 'above';
    const draws: Record<Layer, Array<[string, number, number]>> = { under: [], detail: [], above: [] };
    this.solid = Array.from({ length: h }, () => Array<boolean>(w).fill(false));
    this.grass = Array.from({ length: h }, () => Array<boolean>(w).fill(false));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const g = this.map.ground[y][x];
      const gd = TILES[g];
      this.placeTile(draws.under, g, x, y, DEPTH.ground + 0.1);
      if (gd.solid) this.solid[y][x] = true;
      if (gd.grass) this.grass[y][x] = true;
      let d = this.map.deco[y][x];
      if (d === 'sparkle' && this.map.pickups.some((p) => p.x === x && p.y === y && state.flag(p.flag))) d = null;
      if (d) {
        const dd = TILES[d];
        if (dd.solid) this.solid[y][x] = true;
        this.placeTile(draws[dd.above ? 'above' : 'detail'], d, x, y, dd.above ? DEPTH.above + 0.1 : DEPTH.detail + 0.1);
      }
    }
    const depths: Record<Layer, number> = { under: DEPTH.ground, detail: DEPTH.detail, above: DEPTH.above };
    for (const k of ['under', 'detail', 'above'] as Layer[]) {
      if (!draws[k].length) continue;
      const rt = this.add.renderTexture(0, 0, w * TILE, h * TILE).setOrigin(0, 0).setDepth(depths[k]);
      rt.beginDraw();
      for (const [key, x, y] of draws[k]) rt.batchDrawFrame(key, 0, x, y);
      rt.endDraw();
    }
    for (const s of this.map.signs) this.solid[s.y][s.x] = true;
  }

  private placeTile(out: Array<[string, number, number]>, name: string, x: number, y: number, depth: number): void {
    const def = TILES[name];
    const key = `t_${name}`;
    if (def.frames > 1) {
      const img = this.add.image(x * TILE, y * TILE, key, 0).setOrigin(0, 0).setDepth(depth);
      this.animTiles.push({ sprite: img, key, frames: def.frames, ms: def.animMs ?? 300 });
    } else out.push([key, x * TILE, y * TILE]);
  }

  // ---------- helpers ----------
  private blocked(x: number, y: number, self?: Actor): boolean {
    if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h) return true;
    if (this.solid[y][x]) return true;
    const all = [this.player, ...this.npcs.map((n) => n.actor)];
    return all.some((a) => a !== self && ((a.tx === x && a.ty === y) || (a.moving && a.destX === x && a.destY === y)));
  }

  warpTo(mapId: string, x: number, y: number, dir: Dir = 'down', msg?: string[]): void {
    if (this.locked && this.cameras.main.fadeEffect.isRunning) return;
    this.locked = true;
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ map: mapId, x, y, dir, msg }));
  }

  private onPlayerArrive(a: Actor): void {
    this.chain = true;
    const w = this.map.warps.find((wp) => wp.x === a.tx && wp.y === a.ty);
    if (w) { this.warpTo(w.to, w.tx, w.ty, w.dir); return; }
    state.steps++;
    if (this.collectPickup(a.tx, a.ty)) return;
    const trig = this.map.triggers.find((t) => t.x === a.tx && t.y === a.ty && evalCond(t.cond, state));
    if (trig) { void this.runTrigger(trig); return; }
    if (this.grass[a.ty][a.tx]) { this.rustle(a.tx, a.ty); this.maybeEncounter(); }
  }

  // ---------- battles ----------
  private terrain(): BattleInit['terrain'] { return this.map.terrain ?? ENCOUNTERS[this.map.id]?.terrain ?? (this.map.indoor ? 'gym' : 'grass'); }

  private maybeEncounter(): void {
    const table = ENCOUNTERS[this.map.id];
    if (!table || this.locked || !state.party.some((c) => c.hp > 0)) return;
    this.stepsSince++;
    if (this.stepsSince < 3 || !rng.chance(table.rate)) return;
    const total = table.entries.reduce((a, e) => a + e.weight, 0);
    let r = rng.next() * total;
    const entry = table.entries.find((e) => (r -= e.weight) < 0) ?? table.entries[0];
    void this.startBattle({ foeParty: [createCreature(entry.species, rng.int(entry.min, entry.max))], terrain: table.terrain });
  }

  private until(cond: () => boolean): Promise<void> {
    return new Promise((res) => {
      const t = this.time.addEvent({ delay: 16, loop: true, callback: () => { if (cond()) { t.remove(); res(); } } });
    });
  }

  private pickupAt(x: number, y: number): PickupDefLite | undefined { return this.map.pickups.find((p) => p.x === x && p.y === y && !state.flag(p.flag)); }

  private collectPickup(x: number, y: number): boolean {
    const p = this.pickupAt(x, y);
    if (!p) return false;
    state.setFlag(p.flag);
    state.addItem(p.item, p.qty ?? 1);
    const i = this.animTiles.findIndex((t) => t.key === 't_sparkle' && Math.round(t.sprite.x / TILE) === x && Math.round(t.sprite.y / TILE) === y);
    if (i >= 0) { this.animTiles[i].sprite.destroy(); this.animTiles.splice(i, 1); }
    sfx('pickup');
    this.ui.toast(p.text ?? `Found ${ITEMS[p.item].name}!`);
    return true;
  }

  private async runTrigger(t: TriggerDef): Promise<void> {
    this.locked = true;
    try {
      await this.runner.run(t.dialogue);
      if (t.once) state.setFlag(t.once);
      if (t.push) {
        const d = DIRS[t.push];
        if (!this.blocked(this.player.tx + d.x, this.player.ty + d.y, this.player)) { this.player.step(t.push, false); await this.until(() => !this.player.moving); }
      }
    } finally { this.locked = false; }
  }

  /** Cinematic intro (flashes + shutter wipe), then hands over to the battle scene. Resolves when the player is back. */
  async startBattle(init: BattleInit): Promise<BattleOutcome> {
    this.locked = true;
    sfx('battle_start');
    const cam = this.cameras.main;
    for (let i = 0; i < 2; i++) { safeFlash(cam, 140); await new Promise((r) => this.time.delayedCall(230, () => r(null))); }
    this.bars = await shutterClose(this, 560);
    return new Promise<BattleOutcome>((res) => {
      this.events.once('wake', (_sys: unknown, data: BattleOutcome) => { void this.onBattleEnd(data, init).then((resume) => { if (resume) res(data); }); });
      this.scene.sleep();
      this.scene.launch('battle', init);
    });
  }

  /** Returns false when the scene is being replaced (blackout) and callers should not continue. */
  private async onBattleEnd(o: BattleOutcome, init: PendingBattle['init']): Promise<boolean> {
    this.stepsSince = 0;
    this.player.moving = false;
    await shutterRetract(this, this.bars, 480);
    this.bars = [];
    state.vars['battle.won'] = o.result === 'win' ? 1 : 0;
    state.vars['battle.result'] = { win: 1, caught: 2, run: 3, lose: 0 }[o.result];
    if (o.result === 'lose') {
      state.healParty();
      state.money = Math.floor(state.money / 2);
      const h = state.home;
      this.warpTo(h.map, h.x, h.y, 'down', ['You scurry back home and rest up...', 'Your creatures are fully healed.']);
      return false;
    }
    if (o.trainerId) {
      state.setFlag('trainer.' + o.trainerId);
      const def = TRAINERS[o.trainerId];
      if (def && !init.scripted) await this.dialogue.say({ speaker: def.name, text: def.post.join(' ') });
    }
    if (!init.scripted) this.locked = false;
    return true;
  }

  private checkTrainers(): void {
    if (this.locked || this.dialogue.active || this.player.moving || !state.party.some((c) => c.hp > 0)) return;
    for (const n of this.npcs) {
      const t = n.def.trainer;
      if (!t || state.flag('trainer.' + t.id) || n.actor.moving) continue;
      const dv = DIRS[n.actor.dir];
      for (let i = 1; i <= t.sight; i++) {
        const x = n.actor.tx + dv.x * i, y = n.actor.ty + dv.y * i;
        if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h || this.solid[y][x]) break;
        if (this.player.tx === x && this.player.ty === y) { void this.trainerEncounter(n, i); return; }
        if (this.npcs.some((o) => o !== n && o.actor.tx === x && o.actor.ty === y)) break;
      }
    }
  }

  private async trainerEncounter(n: NpcRt, dist: number): Promise<void> {
    const def = TRAINERS[n.def.trainer!.id];
    this.locked = true;
    if (dist > 1) {
      const e = this.add.image(n.actor.px, n.actor.py - 26, 'ui_emote', 2).setDepth(DEPTH.fx).setScale(0.3);
      sfx('alert');
      this.tweens.add({ targets: e, scale: 1, y: e.y - 4, duration: 220, ease: 'Back.easeOut' });
      await new Promise((r) => this.time.delayedCall(700, () => r(null)));
      e.destroy();
      for (let i = 0; i < dist - 1; i++) { n.actor.step(n.actor.dir, false); await this.until(() => !n.actor.moving); }
    }
    const opp: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
    this.player.face(opp[n.actor.dir]);
    await this.dialogue.say({ speaker: def.name, text: def.pre.join(' ') });
    await this.startBattle({ foeParty: partyFor(def, (k) => state.flag(k)).map((p) => createCreature(p.species, p.level)), trainer: def, terrain: this.terrain() });
  }

  private rustle(tx: number, ty: number): void {
    for (let i = 0; i < 5; i++) {
      const p = this.add.rectangle(tx * TILE + 8 + rng.int(-4, 4), ty * TILE + 12, 2, 2, rng.chance(0.5) ? 0x7fd05e : 0x3a7f32).setDepth(DEPTH.fx);
      this.tweens.add({ targets: p, x: p.x + rng.int(-9, 9), y: p.y - rng.int(5, 12), alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => p.destroy() });
    }
  }

  private facingTile(): { x: number; y: number } {
    return { x: this.player.tx + DIRS[this.player.dir].x, y: this.player.ty + DIRS[this.player.dir].y };
  }

  private async interact(): Promise<void> {
    const t = this.facingTile();
    const npc = this.npcs.find((n) => !n.actor.moving && n.actor.tx === t.x && n.actor.ty === t.y);
    const sign = this.map.signs.find((s) => s.x === t.x && s.y === t.y);
    if (!npc && !sign) return;
    this.locked = true;
    const target = npc?.def ?? sign!;
    if (npc) {
      const opp: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
      npc.actor.face(opp[this.player.dir]);
    }
    try {
      const tr = npc?.def.trainer;
      if (tr && TRAINERS[tr.id]) {
        const def = TRAINERS[tr.id];
        if (state.flag('trainer.' + tr.id)) await this.dialogue.say({ speaker: def.name, text: def.post.join(' ') });
        else if (state.party.some((c) => c.hp > 0)) { await this.trainerEncounter(npc!, 1); return; }
        else await this.dialogue.say({ speaker: def.name, text: 'Come back when you have a partner!' });
      } else if (target.dialogue) await this.runner.run(target.dialogue);
      else if (target.lines) await this.dialogue.say({ text: target.lines.join(' ') });
    } finally { this.locked = false; }
  }

  /** Opens the overlay menu scene and resolves when it closes. */
  private runMenu(req: MenuRequest): Promise<MenuResult> {
    return new Promise((res) => {
      this.game.events.once('menu-closed', (r: MenuResult) => {
        this.scene.resume();
        this.input2.flush();
        this.time.delayedCall(120, () => res(r));
      });
      this.scene.pause();
      this.scene.launch('menu', req);
    });
  }

  private async openPause(): Promise<void> {
    this.locked = true;
    sfx('menu_open');
    const pos = { map: this.map.id, x: this.player.tx, y: this.player.ty, dir: this.player.dir };
    await this.runMenu({ screen: 'pause', pos });
    this.dialogue.charsPerSec = [25, 45, 90][state.options.textSpeed];
    this.locked = false;
  }

  private async command(name: string, arg?: string): Promise<void> {
    if (name === 'battle' && arg) {
      const def = TRAINERS[arg];
      await this.startBattle({ foeParty: partyFor(def, (k) => state.flag(k)).map((p) => createCreature(p.species, p.level)), trainer: def, terrain: this.terrain(), scripted: true });
      return;
    }
    if (name === 'wild' && arg) {
      const [sp, lv] = arg.split(',');
      await this.startBattle({ foeParty: [createCreature(sp, Number(lv))], terrain: this.terrain(), scripted: true });
      return;
    }
    if (name === 'badge' && arg) {
      if (!state.badges.includes(arg)) state.badges.push(arg);
      state.setFlag(`badge.${arg}`);
      state.setFlag(state.badges.length >= 2 ? 'badge.second' : 'badge.first');
      sfx('badge');
      this.ui.toast(`Got the ${BADGES.find((b) => b.id === arg)?.name ?? 'badge'}!`);
      await new Promise<void>((r) => this.time.delayedCall(1600, () => r()));
      return;
    }
    if (name === 'take' && arg) { state.bag[arg] = Math.max(0, (state.bag[arg] ?? 0) - 1); return; }
    if (name === 'warp' && arg) { const [m, x, y, d] = arg.split(','); this.warpTo(m, Number(x), Number(y), (d as Dir) ?? 'down'); await new Promise(() => undefined); }
    if (name === 'date' && arg) {
      state.returnTo = { map: this.map.id, x: this.player.tx, y: this.player.ty, dir: this.player.dir };
      const m = MAPS[`date_${arg}`];
      const sp = m.spawn ?? { x: 2, y: 2, dir: 'up' as Dir };
      this.warpTo(m.id, sp.x, sp.y, sp.dir);
      await new Promise(() => undefined); // the scene is being replaced
    }
    if (name === 'return') {
      const r = state.returnTo ?? { map: 'emberwick', x: 7, y: 12, dir: 'down' };
      state.returnTo = null;
      nextDay(state);
      this.warpTo(r.map, r.x, r.y, r.dir as Dir, ['What a lovely evening. You head home as the stars come out.']);
      await new Promise(() => undefined);
    }
    if (name === 'end') {
      const cam = this.cameras.main;
      await new Promise<void>((res) => { cam.once('camerafadeoutcomplete', () => res()); cam.fadeOut(900, 255, 255, 255); });
      this.scene.start('end');
      await new Promise(() => undefined);
    }
    if (name === 'shop') { await this.runMenu({ screen: 'shop', shop: arg ?? 'mira' }); return; }
    if (name === 'pc') { await this.runMenu({ screen: 'box' }); return; }
    if (name === 'heal') {
      const cam = this.cameras.main;
      sfx('heal_jingle');
      await new Promise<void>((r) => this.time.delayedCall(300, () => r()));
      cam.flash(700, 160, 255, 200);
      state.healParty();
      state.home = { map: this.map.id, x: Math.floor(this.map.w / 2), y: this.map.h - 2 };
      await new Promise<void>((r) => this.time.delayedCall(1100, () => r()));
      return;
    }
    if (name === 'gift' && arg) {
      const r = await this.runMenu({ screen: 'gift', npc: arg });
      if (!r.gift) { state.vars['gift.result'] = 0; return; }
      const id = r.gift.item;
      const res = giveGift(state, arg, ITEMS[id].tags ?? []);
      if (res.reaction !== 'already') state.bag[id]--;
      state.vars['gift.result'] = { loved: 1, liked: 2, disliked: 3, already: 4 }[res.reaction];
      this.ui.affectionFx(arg, res, undefined);
      for (const m of res.crossed) this.ui.milestone(arg, m);
      return;
    }
    if (name === 'sleep') {
      state.healParty();
      const cam = this.cameras.main;
      await new Promise<void>((res) => { cam.once('camerafadeoutcomplete', () => res()); cam.fadeOut(600, 0, 0, 0); });
      nextDay(state);
      await new Promise<void>((r) => this.time.delayedCall(500, () => r()));
      await new Promise<void>((res) => { cam.once('camerafadeincomplete', () => res()); cam.fadeIn(600, 0, 0, 0); });
    }
  }

  // ---------- frame loop ----------
  update(_time: number, dt: number): void {
    dt = Math.min(dt, 50);
    this.input2.poll();
    const dbg = this.game.registry.get('debugOpen') === true;
    this.dialogue.update(dt);
    state.playMs += dt;
    this.updateTiles(dt);

    if (this.dialogue.active) this.dialogue.handleInput(this.input2);
    else if (!this.locked && !dbg) {
      this.handlePlayer(dt);
    }
    this.player.update(dt);
    this.updateNpcs(dt);
    this.updateGrassOverlay();
    this.checkTrainers();
    this.centerCamera(false, dt);
  }

  private handlePlayer(dt: number): void {
    const p = this.player;
    if (p.moving) return;
    if (this.input2.just('confirm')) { void this.interact(); return; }
    if (this.input2.just('menu') || this.input2.just('back')) { void this.openPause(); return; }
    if (this.input2.just('run') && state.options.runToggle) this.runOn = !this.runOn;
    const d = this.input2.heldDir();
    if (!d) { this.chain = false; this.turnWait = 0; return; }
    if (d !== p.dir && !this.chain) {
      // a quick tap only turns in place; holding continues into a step
      p.face(d);
      this.turnWait = 90;
      this.chain = false;
    }
    if (this.turnWait > 0) { this.turnWait -= dt; if (this.turnWait > 0) return; }
    p.face(d);
    const nx = p.tx + DIRS[d].x, ny = p.ty + DIRS[d].y;
    if (this.blocked(nx, ny, p)) { this.chain = false; return; }
    p.step(d, state.options.runToggle ? this.runOn : this.input2.down('run'));
    this.chain = false;
  }

  private updateNpcs(dt: number): void {
    const frozen = this.locked || this.dialogue.active;
    for (const n of this.npcs) {
      n.actor.update(dt);
      if (n.actor.moving || frozen || n.def.move === 'idle' || !n.def.move) continue;
      n.timer -= dt;
      if (n.timer > 0) continue;
      n.timer = 900 + rng.int(0, 2600);
      const d = rng.pick(['up', 'down', 'left', 'right'] as Dir[]);
      if (n.def.move === 'look') { n.actor.face(d); continue; }
      const nx = n.actor.tx + DIRS[d].x, ny = n.actor.ty + DIRS[d].y;
      const r = n.def.radius ?? 2;
      n.actor.face(d);
      if (Math.abs(nx - n.homeX) > r || Math.abs(ny - n.homeY) > r || this.blocked(nx, ny, n.actor)) continue;
      // also don't walk onto warps
      if (this.map.warps.some((w) => w.x === nx && w.y === ny)) continue;
      n.actor.step(d, false);
    }
  }

  private updateTiles(dt: number): void {
    this.tileClock += dt;
    for (const a of this.animTiles) {
      const f = Math.floor(this.tileClock / a.ms) % a.frames;
      a.sprite.setFrame(f);
    }
  }

  private updateGrassOverlay(): void {
    const p = this.player;
    const on = !p.moving && this.grass[p.ty][p.tx];
    this.grassOverlay.setVisible(on);
    if (on) {
      this.grassOverlay.setPosition(p.tx * TILE, p.ty * TILE);
      this.grassOverlay.setFrame(Math.floor(this.tileClock / 260) % 4);
      this.grassOverlay.setCrop(0, 8, TILE, 8);
      this.grassOverlay.y = p.ty * TILE;
    }
  }

  private centerCamera(snap: boolean, dt = 16): void {
    const cam = this.cameras.main;
    const mw = this.map.w * TILE, mh = this.map.h * TILE;
    let tx = this.player.px - VIEW_W / 2;
    let ty = this.player.py - TILE / 2 - VIEW_H / 2;
    tx = mw <= VIEW_W ? -(VIEW_W - mw) / 2 : Phaser.Math.Clamp(tx, 0, mw - VIEW_W);
    ty = mh <= VIEW_H ? -(VIEW_H - mh) / 2 : Phaser.Math.Clamp(ty, 0, mh - VIEW_H);
    if (snap) { this.camX = tx; this.camY = ty; }
    else {
      const k = 1 - Math.pow(0.0005, dt / 1000); // frame-rate independent ease
      this.camX += (tx - this.camX) * k; this.camY += (ty - this.camY) * k;
    }
    cam.setScroll(Math.round(this.camX), Math.round(this.camY));
  }
}
