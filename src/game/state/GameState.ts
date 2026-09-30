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

export class GameState {
  playerName = 'Kit';
  flags: Record<string, boolean> = {};
  vars: Record<string, number> = {};
  day = 1;
  romance: Record<string, RomanceRecord> = {};

  flag(k: string): boolean { return this.flags[k] === true; }
  setFlag(k: string, v = true): void { this.flags[k] = v; }
  varOf(k: string): number { return this.vars[k] ?? 0; }

  rec(npc: string): RomanceRecord {
    return (this.romance[npc] ??= { affection: 0, met: false, flirtDay: 0, flirtCount: 0, brushUntilDay: 0, giftDay: 0, milestones: [], pending: [] });
  }
  affection(npc: string): number { return this.romance[npc]?.affection ?? 0; }

  toJSON(): object {
    return { playerName: this.playerName, flags: this.flags, vars: this.vars, day: this.day, romance: this.romance };
  }
  load(o: Partial<GameState>): void {
    this.playerName = o.playerName ?? 'Kit';
    this.flags = { ...(o.flags ?? {}) };
    this.vars = { ...(o.vars ?? {}) };
    this.day = o.day ?? 1;
    this.romance = JSON.parse(JSON.stringify(o.romance ?? {}));
  }
  reset(): void { this.load({}); }
}

export const state = new GameState();
