import { describe, expect, it } from 'vitest';
import { Battle, BattleEvent } from '../src/game/battle/Battle';
import { addXp, calcStats, canEvolve, createCreature, evolve, healFully, maxHp, movesAt, xpForLevel } from '../src/game/battle/Creature';
import { catchCheck } from '../src/game/battle/Catch';
import { effectiveness, TYPES } from '../src/data/typeChart';
import { SPECIES, SPECIES_LIST } from '../src/data/creatures';
import { MOVES } from '../src/data/moves';
import { Rng } from '../src/engine/rng';

const mk = (sp: string, lv: number, seed = 1) => createCreature(sp, lv, new Rng(seed));
const battle = (a: string, la: number, b: string, lb: number, seed = 5, trainer = false) =>
  new Battle({ party: [mk(a, la)], foeParty: [mk(b, lb, 2)], bag: { potion: 3, catch_orb: 5 }, rng: new Rng(seed), trainerName: trainer ? 'Tester' : undefined });
const texts = (ev: BattleEvent[]) => ev.filter((e): e is Extract<BattleEvent, { t: 'msg' }> => e.t === 'msg').map((e) => e.text);

describe('type chart', () => {
  it('has 12 types with sane values', () => {
    expect(TYPES).toHaveLength(12);
    expect(effectiveness('flame', ['leaf'])).toBe(2);
    expect(effectiveness('flame', ['tide'])).toBe(0.5);
    expect(effectiveness('flame', ['leaf', 'frost'])).toBe(4);
    expect(effectiveness('normal', ['shade'])).toBe(0);
    expect(effectiveness('volt', ['stone'])).toBe(0);
  });
});

describe('data integrity', () => {
  it('all learnset moves and evolutions exist; art specs valid', () => {
    for (const s of SPECIES_LIST) {
      for (const [, m] of s.learnset) expect(MOVES[m], `${s.id}:${m}`).toBeDefined();
      if (s.evolve) expect(SPECIES[s.evolve.to], `${s.id} evo`).toBeDefined();
      expect(s.art.pal).toHaveLength(5);
      expect(movesAt(s.id, 5).length).toBeGreaterThan(0);
    }
    expect(SPECIES_LIST.length).toBeGreaterThanOrEqual(20);
  });
});

describe('creature math', () => {
  it('stats grow with level and xp curves are monotone', () => {
    const a = mk('cinderpup', 5), b = mk('cinderpup', 30);
    expect(calcStats(b).atk).toBeGreaterThan(calcStats(a).atk);
    expect(xpForLevel('medium', 10)).toBe(1000);
    expect(xpForLevel('fast', 10)).toBeLessThan(xpForLevel('slow', 10));
  });
  it('levels up, keeps hp gain, and evolves at threshold', () => {
    const c = mk('cinderpup', 15);
    const hp0 = c.hp;
    const infos = addXp(c, xpForLevel('medium', 16) - c.xp);
    expect(infos).toHaveLength(1);
    expect(c.level).toBe(16);
    expect(c.hp).toBeGreaterThan(hp0);
    expect(canEvolve(c)).toBe('emberhound');
    evolve(c, 'emberhound');
    expect(c.species).toBe('emberhound');
    expect(c.hp).toBeLessThanOrEqual(maxHp(c));
  });
  it('can learn a move at the right level', () => {
    const c = mk('cinderpup', 4);
    const infos = addXp(c, xpForLevel('medium', 5) - c.xp);
    expect(infos[0].learn).toContain('ember');
  });
});

describe('battle rules', () => {
  it('super effective hits harder than resisted', () => {
    const b = battle('cinderpup', 20, 'sproutle', 20);
    const dEff = Math.max(...Array.from({ length: 20 }, () => b.damage('p', MOVES.ember, 2, false)));
    const dRes = Math.max(...Array.from({ length: 20 }, () => b.damage('p', MOVES.ember, 0.5, false)));
    expect(dEff).toBeGreaterThan(dRes * 2);
  });
  it('priority moves go first regardless of speed', () => {
    const b = battle('sproutle', 10, 'cinderpup', 10);
    b.p.moves = [{ id: 'quick_dash', pp: 10, maxPp: 10 }];
    b.f.moves = [{ id: 'tackle', pp: 10, maxPp: 10 }];
    b.f.iv.spe = 15; b.p.iv.spe = 0;
    const ev = b.turn({ t: 'move', idx: 0 }, { t: 'move', idx: 0 });
    const used = ev.filter((e) => e.t === 'useMove').map((e) => (e as { side: string }).side);
    expect(used[0]).toBe('p');
  });
  it('pp is consumed and struggle is used when empty', () => {
    const b = battle('cinderpup', 30, 'nibbit', 5);
    b.p.moves[0].pp = 3;
    b.turn({ t: 'move', idx: 0 });
    expect(b.p.moves[0].pp).toBeLessThan(3);
    const c = battle('cinderpup', 5, 'skyrill', 50);
    c.p.moves.forEach((m) => (m.pp = 0));
    const ev = c.turn({ t: 'move', idx: 0 });
    expect(texts(ev).some((t) => t.includes('Struggle'))).toBe(true);
  });
  it('status: sleep skips turns, burn ticks, paralysis slows', () => {
    const b = battle('cinderpup', 20, 'nibbit', 20);
    b.f.status = 'burn';
    const hp = b.f.hp;
    b.p.moves = [{ id: 'growl', pp: 10, maxPp: 10 }];
    b.turn({ t: 'move', idx: 0 });
    expect(b.f.hp).toBeLessThan(hp);
    const c = battle('cinderpup', 20, 'nibbit', 20);
    c.p.status = 'sleep'; c.p.sleep = 3;
    c.p.moves = [{ id: 'tackle', pp: 10, maxPp: 10 }];
    const before = c.f.hp;
    c.f.moves = [{ id: 'growl', pp: 10, maxPp: 10 }];
    c.turn({ t: 'move', idx: 0 });
    expect(c.f.hp).toBe(before);
    const d = battle('cinderpup', 20, 'nibbit', 20);
    const spe = d.stat('p', 'spe'); d.p.status = 'paralysis';
    expect(d.stat('p', 'spe')).toBeLessThan(spe / 3);
  });
  it('stat stages clamp at +-6', () => {
    const b = battle('brawlcub', 20, 'nibbit', 20);
    b.p.moves = [{ id: 'howl', pp: 40, maxPp: 40 }];
    b.f.moves = [{ id: 'harden', pp: 40, maxPp: 40 }];
    for (let i = 0; i < 8; i++) { b.f.hp = maxHp(b.f); b.p.hp = maxHp(b.p); b.turn({ t: 'move', idx: 0 }, { t: 'move', idx: 0 }); }
    expect(b.stages.p.atk).toBe(6);
  });
  it('immune types resist status; normal cannot hit shade', () => {
    const b = battle('cinderpup', 20, 'wispling', 20);
    b.p.moves = [{ id: 'tackle', pp: 10, maxPp: 10 }];
    const ev = b.turn({ t: 'move', idx: 0 });
    expect(texts(ev).some((t) => t.includes("doesn't affect"))).toBe(true);
  });
  it('winning awards xp, can level up, and ends battle', () => {
    const b = battle('cinderpup', 10, 'nibbit', 3);
    b.f.hp = 1;
    b.p.moves = [{ id: 'tackle', pp: 10, maxPp: 10 }];
    const xp0 = b.p.xp;
    const ev = b.turn({ t: 'move', idx: 0 });
    expect(b.over).toBe('win');
    expect(b.p.xp).toBeGreaterThan(xp0);
    expect(ev.some((e) => e.t === 'end')).toBe(true);
  });
  it('trainer sends next creature; player must switch after faint', () => {
    const b = new Battle({ party: [mk('nibbit', 3), mk('cinderpup', 10)], foeParty: [mk('brawlcub', 30), mk('brawlcub', 30)], bag: {}, rng: new Rng(4), trainerName: 'T' });
    b.p.hp = 1;
    const ev = b.turn({ t: 'move', idx: 0 });
    expect(ev.some((e) => e.t === 'needSwitch')).toBe(true);
    expect(b.over).toBeNull();
    b.forcedSwitch(1);
    expect(b.p.species).toBe('cinderpup');
  });
  it('items: potion heals and is consumed; revive works out of battle rules', () => {
    const b = battle('cinderpup', 20, 'nibbit', 20);
    b.p.hp = 5;
    b.f.moves = [{ id: 'growl', pp: 10, maxPp: 10 }];
    b.turn({ t: 'item', id: 'potion', target: 0 });
    expect(b.p.hp).toBeGreaterThan(5);
    expect(b.bag.potion).toBe(2);
  });
  it('running from trainers fails', () => {
    const b = battle('cinderpup', 20, 'nibbit', 20, 1, true);
    b.turn({ t: 'run' });
    expect(b.over).toBeNull();
  });
});

describe('catching', () => {
  it('low hp + sleep catches far more often than full hp', () => {
    const rate = (hpFrac: number, status: 'sleep' | null) => {
      let n = 0;
      for (let i = 0; i < 400; i++) {
        const f = mk('skyrill', 20, i); f.hp = Math.max(1, Math.floor(maxHp(f) * hpFrac)); f.status = status;
        if (catchCheck(f, 120, 1, new Rng(i + 999)).caught) n++;
      }
      return n / 400;
    };
    expect(rate(0.05, 'sleep')).toBeGreaterThan(rate(1, null) * 3);
    expect(rate(1, null)).toBeLessThan(0.5);
  });
  it('throwing a ball can end the battle as caught', () => {
    const b = battle('cinderpup', 20, 'nibbit', 3);
    b.f.hp = 1; b.f.status = 'sleep';
    let caught = false;
    for (let i = 0; i < 6 && !caught; i++) { b.turn({ t: 'ball', id: 'catch_orb' }); caught = b.over === 'caught'; }
    expect(caught).toBe(true);
    expect(b.caughtMon).not.toBeNull();
  });
});

describe('soak: random battles always terminate without errors', () => {
  it('300 battles', () => {
    const rng = new Rng(12345);
    for (let n = 0; n < 300; n++) {
      const a = rng.pick(SPECIES_LIST), b2 = rng.pick(SPECIES_LIST);
      const trainer = rng.chance(0.5);
      const bt = new Battle({
        party: [mk(a.id, rng.int(5, 40), n), mk(rng.pick(SPECIES_LIST).id, rng.int(5, 40), n + 1)],
        foeParty: [mk(b2.id, rng.int(5, 40), n + 2), ...(trainer ? [mk(rng.pick(SPECIES_LIST).id, rng.int(5, 40), n + 3)] : [])],
        bag: { potion: 5, catch_orb: 5 }, rng: new Rng(n), trainerName: trainer ? 'T' : undefined,
      });
      bt.start();
      let turns = 0;
      while (!bt.over && turns++ < 500) {
        if (bt.awaitingSwitch) { const i = bt.party.findIndex((c) => c.hp > 0); bt.forcedSwitch(i); continue; }
        const r = rng.next();
        const act = r < 0.8 ? { t: 'move' as const, idx: rng.int(0, Math.max(0, bt.p.moves.length - 1)) } : r < 0.9 ? { t: 'ball' as const, id: 'catch_orb' } : { t: 'item' as const, id: 'potion', target: 0 };
        bt.turn(act);
      }
      expect(bt.over, `battle ${n} did not end`).not.toBeNull();
      bt.party.forEach(healFully);
    }
  });
});
