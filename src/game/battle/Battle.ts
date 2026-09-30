import { effectiveness } from '../../data/typeChart';
import { ITEMS } from '../../data/items';
import { MOVES } from '../../data/moves';
import type { BattleStat, MoveDef, Status } from '../../data/types';
import { rng as defaultRng, Rng } from '../../engine/rng';
import { addXp, calcStats, Creature, learnMove, LevelUpInfo, maxHp, nameOf, spec } from './Creature';
import { catchCheck } from './Catch';
import { chooseFoeMove } from './Ai';

export type Side = 'p' | 'f';
export type Stages = Record<BattleStat, number>;
export const emptyStages = (): Stages => ({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 });

export type Action =
  | { t: 'move'; idx: number }
  | { t: 'switch'; to: number }
  | { t: 'item'; id: string; target: number }
  | { t: 'ball'; id: string }
  | { t: 'run' };

export type BattleResult = 'win' | 'lose' | 'run' | 'caught';

export type BattleEvent =
  | { t: 'msg'; text: string }
  | { t: 'send'; side: Side; idx: number }
  | { t: 'useMove'; side: Side; move: string }
  | { t: 'miss'; side: Side }
  | { t: 'damage'; side: Side; from: number; hp: number; max: number; crit: boolean; eff: number }
  | { t: 'heal'; side: Side; from: number; hp: number; max: number; target?: number }
  | { t: 'status'; side: Side; status: Status | null }
  | { t: 'stage'; side: Side; stat: BattleStat; delta: number }
  | { t: 'faint'; side: Side }
  | { t: 'xp'; idx: number; gain: number; fromXp: number; toXp: number }
  | { t: 'levelUp'; idx: number; info: LevelUpInfo }
  | { t: 'learnPrompt'; idx: number; move: string }
  | { t: 'ball'; ball: string; shakes: number; caught: boolean }
  | { t: 'needSwitch' }
  | { t: 'end'; result: BattleResult };

export interface BattleOpts {
  party: Creature[];
  foeParty: Creature[];
  trainerName?: string;
  bag: Record<string, number>;
  rng?: Rng;
  /** prize money for trainer battles */
  prize?: number;
}

const stageMul = (n: number): number => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n));
const accMul = (n: number): number => (n >= 0 ? (3 + n) / 3 : 3 / (3 - n));
const STATUS_TEXT: Record<Status, string> = { burn: 'was burned!', poison: 'was poisoned!', sleep: 'fell asleep!', paralysis: 'is paralyzed! It may be unable to move!' };
const STAT_NAME: Record<BattleStat, string> = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', acc: 'accuracy', eva: 'evasiveness' };

export class Battle {
  party: Creature[];
  foeParty: Creature[];
  pi = 0;
  fi = 0;
  stages: Record<Side, Stages> = { p: emptyStages(), f: emptyStages() };
  over: BattleResult | null = null;
  readonly trainerName?: string;
  readonly isTrainer: boolean;
  bag: Record<string, number>;
  rng: Rng;
  prize: number;
  /** player creatures that took part against the current foe */
  parts = new Set<string>();
  /** every player creature that fought at all (for post-battle evolution checks) */
  everFought = new Set<string>();
  private fleeTries = 0;
  awaitingSwitch = false;
  caughtMon: Creature | null = null;

  constructor(o: BattleOpts) {
    this.party = o.party; this.foeParty = o.foeParty; this.trainerName = o.trainerName;
    this.isTrainer = !!o.trainerName; this.bag = o.bag; this.rng = o.rng ?? defaultRng; this.prize = o.prize ?? 0;
    this.pi = Math.max(0, this.party.findIndex((c) => c.hp > 0));
    this.parts.add(this.p.uid); this.everFought.add(this.p.uid);
  }

  get p(): Creature { return this.party[this.pi]; }
  get f(): Creature { return this.foeParty[this.fi]; }
  mon(s: Side): Creature { return s === 'p' ? this.p : this.f; }
  private other(s: Side): Side { return s === 'p' ? 'f' : 'p'; }
  private label(s: Side): string {
    const n = nameOf(this.mon(s));
    return s === 'p' ? n : this.isTrainer ? `Foe ${n}` : `Wild ${n}`;
  }

  /** Stat with stage & status modifiers applied. */
  stat(s: Side, k: 'atk' | 'def' | 'spa' | 'spd' | 'spe'): number {
    const c = this.mon(s);
    let v = calcStats(c)[k] * stageMul(this.stages[s][k]);
    if (k === 'atk' && c.status === 'burn') v *= 0.5;
    if (k === 'spe' && c.status === 'paralysis') v *= 0.25;
    return Math.max(1, Math.floor(v));
  }

  // ---------- start ----------
  start(): BattleEvent[] {
    const ev: BattleEvent[] = [];
    this.parts.add(this.p.uid); this.everFought.add(this.p.uid);
    ev.push({ t: 'send', side: 'f', idx: this.fi });
    ev.push({ t: 'msg', text: this.isTrainer ? `${this.trainerName} sent out ${nameOf(this.f)}!` : `A wild ${nameOf(this.f)} appeared!` });
    ev.push({ t: 'send', side: 'p', idx: this.pi });
    ev.push({ t: 'msg', text: `Go, ${nameOf(this.p)}!` });
    return ev;
  }

  // ---------- turn resolution ----------
  foeAction(): Action {
    return { t: 'move', idx: chooseFoeMove(this, this.rng) };
  }

  private moveSlot(s: Side, idx: number): { def: MoveDef; slot?: { id: string; pp: number } } {
    const c = this.mon(s);
    const slot = c.moves[idx];
    if (!slot || slot.pp <= 0) return { def: MOVES.struggle };
    return { def: MOVES[slot.id], slot };
  }

  /** Whether the given side has any move with PP left. */
  hasPp(s: Side): boolean { return this.mon(s).moves.some((m) => m.pp > 0); }

  turn(pAct: Action, fAct: Action = this.foeAction()): BattleEvent[] {
    const ev: BattleEvent[] = [];
    if (this.over) return ev;
    this.awaitingSwitch = false;
    const acts: Array<{ s: Side; a: Action }> = [{ s: 'p', a: pAct }, { s: 'f', a: fAct }];
    const order = this.order(acts);
    const startUid: Record<Side, string> = { p: this.p.uid, f: this.f.uid };
    for (const { s, a } of order) {
      if (this.over) break;
      // a creature that fainted (or was replaced) earlier this turn does not act
      if (this.mon(s).hp <= 0 || this.mon(s).uid !== startUid[s]) {
        if (!(a.t !== 'move' && s === 'p' && this.mon(s).hp > 0)) continue;
      }
      this.perform(s, a, ev);
      if (this.over) break;
      this.afterAction(ev);
    }
    if (!this.over) this.endOfTurn(ev);
    if (!this.over && this.p.hp <= 0 && !this.awaitingSwitch) this.checkPlayerFaint(ev);
    if (this.awaitingSwitch && !this.over) ev.push({ t: 'needSwitch' });
    if (this.over) ev.push({ t: 'end', result: this.over });
    return ev;
  }

  private order(acts: Array<{ s: Side; a: Action }>): Array<{ s: Side; a: Action }> {
    const pri = (x: { s: Side; a: Action }) => (x.a.t === 'move' ? (this.moveSlot(x.s, x.a.idx).def.priority ?? 0) : 10);
    return [...acts].sort((x, y) => {
      const d = pri(y) - pri(x);
      if (d) return d;
      const sx = this.stat(x.s, 'spe'), sy = this.stat(y.s, 'spe');
      if (sx !== sy) return sy - sx;
      return this.rng.chance(0.5) ? -1 : 1;
    });
  }

  private perform(s: Side, a: Action, ev: BattleEvent[]): void {
    switch (a.t) {
      case 'move': this.useMove(s, a.idx, ev); break;
      case 'switch': this.doSwitch(a.to, ev, false); break;
      case 'item': this.useItem(a.id, a.target, ev); break;
      case 'ball': this.throwBall(a.id, ev); break;
      case 'run': this.tryRun(ev); break;
    }
  }

  // ---------- switching ----------
  private doSwitch(to: number, ev: BattleEvent[], forced: boolean): void {
    const c = this.party[to];
    if (!c || c.hp <= 0 || to === this.pi) return;
    if (!forced) ev.push({ t: 'msg', text: `Come back, ${nameOf(this.p)}!` });
    this.pi = to;
    this.stages.p = emptyStages();
    this.parts.add(c.uid); this.everFought.add(c.uid);
    ev.push({ t: 'send', side: 'p', idx: to });
    ev.push({ t: 'msg', text: `Go, ${nameOf(c)}!` });
  }
  /** After a forced switch (player's creature fainted). Foe does not act. */
  forcedSwitch(to: number): BattleEvent[] {
    const ev: BattleEvent[] = [];
    this.doSwitch(to, ev, true);
    this.awaitingSwitch = false;
    return ev;
  }

  // ---------- items / balls / run ----------
  private useItem(id: string, target: number, ev: BattleEvent[]): void {
    const item = ITEMS[id];
    const c = this.party[target];
    if (!item || !c || (this.bag[id] ?? 0) <= 0) { ev.push({ t: 'msg', text: 'It had no effect.' }); return; }
    ev.push({ t: 'msg', text: `${'You'} used a ${item.name} on ${nameOf(c)}.` });
    if (item.kind === 'heal' && c.hp > 0) {
      const from = c.hp; c.hp = Math.min(maxHp(c), c.hp + (item.heal === 'full' ? maxHp(c) : (item.heal as number)));
      this.bag[id]--;
      ev.push({ t: 'heal', side: 'p', from, hp: c.hp, max: maxHp(c), target });
      ev.push({ t: 'msg', text: `${nameOf(c)} recovered ${c.hp - from} HP!` });
    } else if (item.kind === 'status' && c.hp > 0 && c.status && (item.cures === 'all' || (item.cures as Status[]).includes(c.status))) {
      c.status = null; c.sleep = 0; this.bag[id]--;
      if (target === this.pi) ev.push({ t: 'status', side: 'p', status: null });
      ev.push({ t: 'msg', text: `${nameOf(c)} was cured!` });
    } else if (item.kind === 'revive' && c.hp <= 0) {
      c.hp = Math.max(1, Math.floor(maxHp(c) / 2)); this.bag[id]--;
      ev.push({ t: 'msg', text: `${nameOf(c)} is back on its feet!` });
    } else ev.push({ t: 'msg', text: 'It had no effect.' });
  }

  private throwBall(id: string, ev: BattleEvent[]): void {
    const item = ITEMS[id];
    if (!item || (this.bag[id] ?? 0) <= 0) return;
    if (this.isTrainer) { ev.push({ t: 'msg', text: "You can't steal another trainer's creature!" }); return; }
    this.bag[id]--;
    ev.push({ t: 'msg', text: `You threw a ${item.name}!` });
    const r = catchCheck(this.f, spec(this.f).catchRate, item.ballBonus ?? 1, this.rng);
    ev.push({ t: 'ball', ball: id, shakes: Math.min(3, r.shakes), caught: r.caught });
    if (r.caught) {
      ev.push({ t: 'msg', text: `Gotcha! ${nameOf(this.f)} was caught!` });
      this.caughtMon = this.f;
      this.over = 'caught';
    } else {
      ev.push({ t: 'msg', text: ['Oh no! It broke free!', 'Aww! It appeared to be caught!', 'Aargh! Almost had it!', 'So close!'][Math.min(3, r.shakes)] });
    }
  }

  private tryRun(ev: BattleEvent[]): void {
    if (this.isTrainer) { ev.push({ t: 'msg', text: "No! There's no running from a trainer battle!" }); return; }
    this.fleeTries++;
    const a = calcStats(this.p).spe, b = Math.max(1, calcStats(this.f).spe);
    const f = Math.floor((a * 128) / b) + 30 * this.fleeTries;
    if (a >= b || this.rng.int(0, 255) < f % 256 || f > 255) { ev.push({ t: 'msg', text: 'Got away safely!' }); this.over = 'run'; }
    else ev.push({ t: 'msg', text: "Can't escape!" });
  }

  // ---------- moves ----------
  private useMove(s: Side, idx: number, ev: BattleEvent[]): void {
    const user = this.mon(s);
    const foeS = this.other(s);
    const { def, slot } = this.moveSlot(s, idx);

    // status gates
    if (user.status === 'sleep') {
      if (user.sleep > 0) { user.sleep--; }
      if (user.sleep > 0) { ev.push({ t: 'msg', text: `${this.label(s)} is fast asleep.` }); return; }
      user.status = null; ev.push({ t: 'status', side: s, status: null }); ev.push({ t: 'msg', text: `${this.label(s)} woke up!` });
    }
    if (user.status === 'paralysis' && this.rng.chance(0.25)) { ev.push({ t: 'msg', text: `${this.label(s)} is fully paralyzed!` }); return; }

    if (slot) slot.pp--;
    ev.push({ t: 'msg', text: `${this.label(s)} used ${def.name}!` });
    ev.push({ t: 'useMove', side: s, move: def.id });

    const target = this.mon(foeS);
    if (def.acc !== null && !this.hit(s, def.acc)) { ev.push({ t: 'miss', side: s }); ev.push({ t: 'msg', text: `${this.label(s)}'s attack missed!` }); return; }

    if (def.cat === 'status') { this.applyEffects(s, def, 0, ev, true); return; }

    // damage
    const eff = effectiveness(def.type, spec(target).types);
    if (eff === 0) { ev.push({ t: 'msg', text: `It doesn't affect ${this.label(foeS)}...` }); return; }
    const [minH, maxH] = def.effect?.hits ?? [1, 1];
    const hits = this.rng.int(minH, maxH);
    let total = 0, landed = 0;
    for (let i = 0; i < hits && target.hp > 0; i++) {
      const crit = this.rng.chance(def.highCrit ? 1 / 8 : 1 / 16);
      const dmg = this.damage(s, def, eff, crit);
      const from = target.hp;
      target.hp = Math.max(0, target.hp - dmg);
      ev.push({ t: 'damage', side: foeS, from, hp: target.hp, max: maxHp(target), crit, eff });
      if (crit) ev.push({ t: 'msg', text: 'A critical hit!' });
      total += from - target.hp; landed++;
    }
    if (eff > 1) ev.push({ t: 'msg', text: "It's super effective!" });
    else if (eff < 1) ev.push({ t: 'msg', text: "It's not very effective..." });
    if (landed > 1) ev.push({ t: 'msg', text: `Hit ${landed} times!` });
    if (target.hp <= 0) return; // faint handled by afterAction; effects skipped
    this.applyEffects(s, def, total, ev, false);
    if (def.effect?.recoil || def.effect?.drain) { /* handled in applyEffects */ }
  }

  /** Recoil & drain apply even if the target fainted, so they run here for KO hits too. */
  private applyEffects(s: Side, def: MoveDef, dealt: number, ev: BattleEvent[], statusMove: boolean): void {
    const e = def.effect;
    if (!e) return;
    const user = this.mon(s), foeS = this.other(s), target = this.mon(foeS);
    if (e.heal) {
      const from = user.hp; user.hp = Math.min(maxHp(user), user.hp + Math.floor(maxHp(user) * e.heal));
      if (user.hp === from) ev.push({ t: 'msg', text: `${this.label(s)}'s HP is already full!` });
      else { ev.push({ t: 'heal', side: s, from, hp: user.hp, max: maxHp(user) }); ev.push({ t: 'msg', text: `${this.label(s)} regained health!` }); }
    }
    if (e.drain && dealt > 0) {
      const from = user.hp; user.hp = Math.min(maxHp(user), user.hp + Math.max(1, Math.floor(dealt * e.drain)));
      ev.push({ t: 'heal', side: s, from, hp: user.hp, max: maxHp(user) });
      ev.push({ t: 'msg', text: `${this.label(foeS)} had its energy drained!` });
    }
    if (e.recoil && dealt > 0) {
      const from = user.hp; user.hp = Math.max(0, user.hp - Math.max(1, Math.floor(dealt * e.recoil)));
      ev.push({ t: 'damage', side: s, from, hp: user.hp, max: maxHp(user), crit: false, eff: 1 });
      ev.push({ t: 'msg', text: `${this.label(s)} was hurt by recoil!` });
    }
    if (e.status && target.hp > 0 && this.rng.chance(e.status.chance)) this.inflict(foeS, e.status.kind, ev, statusMove);
    for (const st of e.stages ?? []) {
      if (st.chance !== undefined && !this.rng.chance(st.chance)) continue;
      const who = st.who === 'self' ? s : foeS;
      if (who === foeS && target.hp <= 0) continue;
      this.changeStage(who, st.stat, st.delta, ev);
    }
  }

  private inflict(s: Side, kind: Status, ev: BattleEvent[], announceFail: boolean): void {
    const c = this.mon(s);
    const t = spec(c).types as readonly string[];
    const immune = (kind === 'burn' && t.includes('flame')) || (kind === 'poison' && t.includes('venom')) || (kind === 'paralysis' && t.includes('volt'));
    if (c.status || immune) { if (announceFail) ev.push({ t: 'msg', text: c.status ? `${this.label(s)} is already affected!` : `It doesn't affect ${this.label(s)}...` }); return; }
    c.status = kind;
    if (kind === 'sleep') c.sleep = this.rng.int(1, 3) + 1;
    ev.push({ t: 'status', side: s, status: kind });
    ev.push({ t: 'msg', text: `${this.label(s)} ${STATUS_TEXT[kind]}` });
  }

  private changeStage(s: Side, stat: BattleStat, delta: number, ev: BattleEvent[]): void {
    const cur = this.stages[s][stat];
    const next = Math.max(-6, Math.min(6, cur + delta));
    if (next === cur) { ev.push({ t: 'msg', text: `${this.label(s)}'s ${STAT_NAME[stat]} won't go ${delta > 0 ? 'higher' : 'lower'}!` }); return; }
    this.stages[s][stat] = next;
    ev.push({ t: 'stage', side: s, stat, delta });
    const mag = Math.abs(delta) >= 2 ? (delta > 0 ? ' sharply' : ' harshly') : '';
    ev.push({ t: 'msg', text: `${this.label(s)}'s ${STAT_NAME[stat]}${mag} ${delta > 0 ? 'rose' : 'fell'}!` });
  }

  private hit(s: Side, acc: number): boolean {
    const m = accMul(this.stages[s].acc - this.stages[this.other(s)].eva);
    return this.rng.int(1, 100) <= acc * m;
  }

  damage(s: Side, def: MoveDef, eff: number, crit: boolean): number {
    const user = this.mon(s);
    const phys = def.cat === 'phys';
    const A = this.stat(s, phys ? 'atk' : 'spa');
    const D = this.stat(this.other(s), phys ? 'def' : 'spd');
    let d = Math.floor(Math.floor((Math.floor((2 * user.level) / 5) + 2) * def.power * A / D) / 50) + 2;
    if ((spec(user).types as readonly string[]).includes(def.type)) d = Math.floor(d * 1.5);
    if (crit) d = Math.floor(d * 1.5);
    d = Math.floor(d * eff);
    d = Math.floor(d * (this.rng.int(85, 100) / 100));
    return Math.max(1, d);
  }

  /** Expected-damage helper for AI (no randomness). */
  expectedDamage(s: Side, def: MoveDef): number {
    if (def.cat === 'status' || def.power === 0) return 0;
    const eff = effectiveness(def.type, spec(this.mon(this.other(s))).types);
    const phys = def.cat === 'phys';
    const A = this.stat(s, phys ? 'atk' : 'spa'), D = this.stat(this.other(s), phys ? 'def' : 'spd');
    const stab = (spec(this.mon(s)).types as readonly string[]).includes(def.type) ? 1.5 : 1;
    return (((2 * this.mon(s).level) / 5 + 2) * def.power * A / D / 50 + 2) * stab * eff * ((def.acc ?? 100) / 100);
  }

  // ---------- faint / xp / end of turn ----------
  private afterAction(ev: BattleEvent[]): void {
    if (this.f.hp <= 0 && !this.over) this.foeFainted(ev);
    if (!this.over && this.p.hp <= 0) this.checkPlayerFaint(ev);
  }

  private foeFainted(ev: BattleEvent[]): void {
    ev.push({ t: 'faint', side: 'f' });
    ev.push({ t: 'msg', text: `${this.label('f')} fainted!` });
    this.awardXp(ev);
    const next = this.foeParty.findIndex((c, i) => i > this.fi && c.hp > 0);
    if (next < 0) {
      this.over = 'win';
      if (this.isTrainer) ev.push({ t: 'msg', text: `You defeated ${this.trainerName}!` });
      return;
    }
    this.fi = next; this.stages.f = emptyStages();
    this.parts = new Set([this.p.uid]);
    ev.push({ t: 'send', side: 'f', idx: next });
    ev.push({ t: 'msg', text: `${this.trainerName} sent out ${nameOf(this.f)}!` });
  }

  private checkPlayerFaint(ev: BattleEvent[]): void {
    if (this.awaitingSwitch || this.over) return;
    ev.push({ t: 'faint', side: 'p' });
    ev.push({ t: 'msg', text: `${nameOf(this.p)} fainted!` });
    if (this.party.some((c) => c.hp > 0)) this.awaitingSwitch = true;
    else { this.over = 'lose'; ev.push({ t: 'msg', text: 'You have no more creatures that can fight!' }); }
  }

  private awardXp(ev: BattleEvent[]): void {
    const foe = this.f;
    const sharers = this.party.map((c, i) => ({ c, i })).filter(({ c }) => this.parts.has(c.uid) && c.hp > 0);
    if (!sharers.length) return;
    const total = Math.max(1, Math.floor((spec(foe).baseXp * foe.level) / 7 * (this.isTrainer ? 1.5 : 1)));
    const each = Math.max(1, Math.floor(total / sharers.length));
    for (const { c, i } of sharers) {
      const fromXp = c.xp;
      const infos = addXp(c, each);
      ev.push({ t: 'msg', text: `${nameOf(c)} gained ${each} XP!` });
      ev.push({ t: 'xp', idx: i, gain: each, fromXp, toXp: c.xp });
      for (const info of infos) {
        ev.push({ t: 'msg', text: `${nameOf(c)} grew to Lv. ${info.level}!` });
        ev.push({ t: 'levelUp', idx: i, info });
        for (const m of info.learn) {
          if (c.moves.length < 4) { learnMove(c, m, null); ev.push({ t: 'msg', text: `${nameOf(c)} learned ${MOVES[m].name}!` }); }
          else ev.push({ t: 'learnPrompt', idx: i, move: m });
        }
      }
    }
  }

  private endOfTurn(ev: BattleEvent[]): void {
    for (const s of ['p', 'f'] as Side[]) {
      const c = this.mon(s);
      if (c.hp <= 0 || !c.status) continue;
      if (c.status !== 'burn' && c.status !== 'poison') continue;
      const dmg = Math.max(1, Math.floor(maxHp(c) / (c.status === 'burn' ? 16 : 8)));
      const from = c.hp; c.hp = Math.max(0, c.hp - dmg);
      ev.push({ t: 'msg', text: `${this.label(s)} was hurt by its ${c.status === 'burn' ? 'burn' : 'poison'}!` });
      ev.push({ t: 'damage', side: s, from, hp: c.hp, max: maxHp(c), crit: false, eff: 1 });
      this.afterAction(ev);
      if (this.over) return;
    }
  }

  // ---------- helpers for UI ----------
  learnFor(idx: number, move: string, replace: number | null): void { learnMove(this.party[idx], move, replace); }
}
