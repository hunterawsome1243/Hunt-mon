import { describe, expect, it } from 'vitest';
import { KV, migrate, SaveManager } from '../src/game/save/SaveManager';
import { GameState } from '../src/game/state/GameState';
import { canUseOn, useOn } from '../src/game/systems/Items';
import { createCreature, maxHp } from '../src/game/battle/Creature';

const mem = (): KV => { const m = new Map<string, string>(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }; };

describe('save manager', () => {
  it('round-trips full game state through a slot', () => {
    const s = new GameState(); s.newGame(); s.playerName = 'Rae'; s.giveStarter('drippet', 7); s.setFlag('x'); s.day = 4; s.rec('mira').affection = 33; s.badges.push('cinder');
    s.markSeen('nibbit');
    const sm = new SaveManager(mem());
    expect(sm.write(2, s, { map: 'emberwick', x: 3, y: 4, dir: 'up', look: 'hero_b' }, 'Emberwick')).toBe(true);
    expect(sm.read(1)).toBeNull();
    const f = sm.read(2)!;
    const t = new GameState(); t.load(f.state as Partial<GameState>);
    expect(t.playerName).toBe('Rae');
    expect(t.party[0].species).toBe('drippet');
    expect(t.party[0].level).toBe(7);
    expect(t.flag('x')).toBe(true);
    expect(t.affection('mira')).toBe(33);
    expect(t.badges).toEqual(['cinder']);
    expect(t.dex.seen.nibbit).toBe(true);
    expect(f.player.look).toBe('hero_b');
    expect(sm.summaries().map((x) => x?.name ?? null)).toEqual([null, 'Rae', null]);
    sm.delete(2);
    expect(sm.read(2)).toBeNull();
  });
  it('rejects corrupt and future saves instead of crashing', () => {
    const kv = mem(); kv.setItem('huntmon.save.1', '{not json'); kv.setItem('huntmon.save.2', JSON.stringify({ version: 999 }));
    const sm = new SaveManager(kv);
    expect(sm.read(1)).toBeNull(); expect(sm.read(2)).toBeNull();
    expect(migrate(null as never)).toBeNull();
  });
  it('works (as a no-op) without storage', () => {
    const sm = new SaveManager(null);
    expect(sm.write(1, new GameState(), { map: 'a', x: 0, y: 0, dir: 'up', look: 'hero_a' }, 'A')).toBe(false);
    expect(sm.read(1)).toBeNull();
  });
});

describe('item use', () => {
  it('potions heal, revives revive, cures cure', () => {
    const c = createCreature('cinderpup', 10);
    expect(canUseOn('potion', c)).toBe(false);
    c.hp = 3;
    expect(useOn('potion', c).ok).toBe(true);
    expect(c.hp).toBeGreaterThan(3);
    c.hp = 0;
    expect(canUseOn('potion', c)).toBe(false);
    expect(useOn('revive', c).ok).toBe(true);
    expect(c.hp).toBe(Math.floor(maxHp(c) / 2));
    c.status = 'burn';
    expect(canUseOn('antidote', c)).toBe(false);
    expect(useOn('burn_salve', c).ok).toBe(true);
    expect(c.status).toBeNull();
  });
});
