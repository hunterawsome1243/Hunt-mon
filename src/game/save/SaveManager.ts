import type { GameState } from '../state/GameState';

export const SAVE_VERSION = 1;
export const SLOTS = 3;

export interface SaveSummary { name: string; map: string; mapName: string; badges: number; dexCaught: number; party: string[]; playMs: number; savedAt: number; day: number }
export interface SaveFile {
  version: number;
  summary: SaveSummary;
  state: object;
  player: { map: string; x: number; y: number; dir: string; look: string };
}

/** Minimal storage interface so tests can use an in-memory fake. */
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

const key = (slot: number): string => `huntmon.save.${slot}`;

/** Upgrade older save layouts here when SAVE_VERSION changes. */
export function migrate(raw: SaveFile): SaveFile | null {
  if (!raw || typeof raw !== 'object' || typeof raw.version !== 'number') return null;
  if (raw.version > SAVE_VERSION) return null; // made by a newer build
  return raw;
}

export class SaveManager {
  constructor(private kv: KV | null = safeStorage()) {}

  read(slot: number): SaveFile | null {
    try {
      const s = this.kv?.getItem(key(slot));
      if (!s) return null;
      return migrate(JSON.parse(s) as SaveFile);
    } catch { return null; }
  }
  summaries(): Array<SaveSummary | null> { return Array.from({ length: SLOTS }, (_, i) => this.read(i + 1)?.summary ?? null); }

  write(slot: number, s: GameState, player: SaveFile['player'], mapName: string): boolean {
    try {
      const file: SaveFile = {
        version: SAVE_VERSION,
        summary: {
          name: s.playerName, map: player.map, mapName, badges: s.badges.length, dexCaught: Object.keys(s.dex.caught).length,
          party: s.party.map((c) => c.species), playMs: s.playMs, savedAt: Date.now(), day: s.day,
        },
        state: s.toJSON(), player,
      };
      this.kv?.setItem(key(slot), JSON.stringify(file));
      return !!this.kv;
    } catch { return false; }
  }
  delete(slot: number): void { try { this.kv?.removeItem(key(slot)); } catch { /* ignore */ } }
}

function safeStorage(): KV | null {
  try { const t = '__t'; localStorage.setItem(t, '1'); localStorage.removeItem(t); return localStorage; } catch { return null; }
}

export const fmtPlay = (ms: number): string => {
  const m = Math.floor(ms / 60000);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
};
