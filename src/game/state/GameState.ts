import { Creature, healFully, createCreature } from '../battle/Creature';

/** Persistent game state. Phaser-free; serialised as-is into save slots (M4). */
export interface RomanceRecord {
  affection: number;
  met: boolean;
  /** day number of the last flirt attempt + how many that day */
  flirtDay: number;
  flirtCount: number;
  /** flirting is locked until this day number (exclusive of earlier days) */
  brushUntilDay: number;
  giftDay: number;
  milestones: number[];
  pending: number[];
}

export interface Options { textSpeed: number; runToggle: boolean; shake: boolean; flashes: boolean; musicVol: number; sfxVol: number }
export const defaultOptions = (): Options => ({ textSpeed: 1, runToggle: false, shake: true, flashes: true, musicVol: 7, sfxVol: 7 });

export class GameState {
  look = 'hero_a';
  playMs = 0;
  /** game-clock minutes at playMs = 0 (8:00 at the start of a new game) */
  clockBase = 480;
  /** debug-only overrides */
  debugWeather: 'clear' | 'rain' | 'heavy_rain' | null = null;
  options: Options = defaultOptions();
  playerName = 'Kit';
  flags: Record<string, boolean> = {};
  vars: Record<string, number> = {};
  day = 1;
  romance: Record<string, RomanceRecord> = {};
  party: Creature[] = [];
  box: Creature[] = [];
  bag: Record<string, number> = {};
  money = 0;
  badges: string[] = [];
  dex: { seen: Record<string, boolean>; caught: Record<string, boolean> } = { seen: {}, caught: {} };
  /** last heal point: map + tile */
  home: { map: string; x: number; y: number } = { map: 'house_player', x: 5, y: 5 };
  steps = 0;
  /** where to return to after a date scene */
  returnTo: { map: string; x: number; y: number; dir: string } | null = null;

  flag(k: string): boolean { return this.flags[k] === true; }
  setFlag(k: string, v = true): void { this.flags[k] = v; }
  varOf(k: string): number { return this.vars[k] ?? 0; }

  rec(npc: string): RomanceRecord {
    return (this.romance[npc] ??= { affection: 0, met: false, flirtDay: 0, flirtCount: 0, brushUntilDay: 0, giftDay: 0, milestones: [], pending: [] });
  }
  affection(npc: string): number { return this.romance[npc]?.affection ?? 0; }

  markSeen(id: string): void { this.dex.seen[id] = true; }
  markCaught(id: string): void { this.dex.seen[id] = true; this.dex.caught[id] = true; }
  /** Adds to the party if there is room, else the box. Returns where it went. */
  addCreature(c: Creature): 'party' | 'box' {
    this.markCaught(c.species);
    if (this.party.length < 6) { this.party.push(c); return 'party'; }
    this.box.push(c); return 'box';
  }
  /** Gym badge: recorded, flagged (`badge.<id>`, plus `badge.first` / `badge.second` for shop unlocks). */
  awardBadge(id: string): void {
    if (!this.badges.includes(id)) this.badges.push(id);
    this.setFlag(`badge.${id}`);
    this.setFlag(this.badges.length >= 2 ? 'badge.second' : 'badge.first');
  }
  addItem(id: string, n = 1): void { this.bag[id] = (this.bag[id] ?? 0) + n; }
  healParty(): void { this.party.forEach(healFully); }
  /** Starting inventory for a fresh game. */
  newGame(name = 'Kit', look = 'hero_a'): void { const opts = this.options; this.reset(); this.options = opts; this.playerName = name; this.look = look; this.money = 500; this.bag = { potion: 5, catch_orb: 8 }; }
  giveStarter(species: string, level = 5): Creature { const c = createCreature(species, level); this.addCreature(c); return c; }

  toJSON(): object {
    return { look: this.look, playMs: this.playMs, clockBase: this.clockBase, options: this.options, playerName: this.playerName, flags: this.flags, vars: this.vars, day: this.day, romance: this.romance, party: this.party, box: this.box,
      bag: this.bag, money: this.money, badges: this.badges, dex: this.dex, home: this.home, steps: this.steps, returnTo: this.returnTo };
  }
  load(o: Partial<GameState>): void {
    this.look = o.look ?? 'hero_a';
    this.playMs = o.playMs ?? 0;
    this.clockBase = o.clockBase ?? 480;
    this.options = { ...defaultOptions(), ...(o.options ?? {}) };
    this.playerName = o.playerName ?? 'Kit';
    this.flags = { ...(o.flags ?? {}) };
    this.vars = { ...(o.vars ?? {}) };
    this.day = o.day ?? 1;
    this.romance = JSON.parse(JSON.stringify(o.romance ?? {}));
    this.party = JSON.parse(JSON.stringify(o.party ?? []));
    this.box = JSON.parse(JSON.stringify(o.box ?? []));
    this.bag = { ...(o.bag ?? {}) };
    this.money = o.money ?? 0;
    this.badges = [...(o.badges ?? [])];
    this.dex = JSON.parse(JSON.stringify(o.dex ?? { seen: {}, caught: {} }));
    this.home = o.home ?? { map: 'house_player', x: 5, y: 5 };
    this.steps = o.steps ?? 0;
    this.returnTo = o.returnTo ?? null;
  }
  reset(): void { this.load({}); }
}

export const state = new GameState();
