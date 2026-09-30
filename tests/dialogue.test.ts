import { describe, expect, it } from 'vitest';
import { DialogueRunner, DialogueUI } from '../src/engine/script/DialogueRunner';
import { Rng } from '../src/engine/rng';
import { GameState } from '../src/game/state/GameState';
import { changeAffection, flirt, giveGift, hearts } from '../src/game/romance/Affection';
import { evalCond } from '../src/game/script/Conditions';
import { wrap, paginate } from '../src/engine/ui/wrap';
import { DIALOGUE } from '../src/data/dialogue';
import type { DialogueGraph } from '../src/data/types';

function mockUI(picks: Array<number | string>) {
  const log: string[] = [];
  const ui: DialogueUI = {
    async say(o) { log.push(`say:${o.text}`); },
    async choose(o) {
      const p = picks.shift();
      const i = typeof p === 'string' ? o.options.findIndex((x) => x.includes(p)) : (p ?? 0);
      if (i < 0) throw new Error(`no option ${String(p)} in ${o.options.join('|')}`);
      log.push(`choose:${o.options[i]}`);
      return i;
    },
    affectionFx() {}, milestone(_n, m) { log.push(`milestone:${m}`); },
    async command(n) { log.push(`cmd:${n}`); }, give(i) { log.push(`give:${i}`); }, giveCreature(sp) { log.push(`creature:${sp}`); },
  };
  return { ui, log };
}

describe('wrap', () => {
  it('wraps on word boundaries', () => expect(wrap('aaa bbb ccc', 7)).toEqual(['aaa bbb', 'ccc']));
  it('splits long words', () => expect(wrap('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']));
  it('paginates in pairs', () => expect(paginate('a b c d', 1)).toEqual(['a\nb', 'c\nd']));
});

describe('conditions', () => {
  const s = new GameState();
  it('flags/vars/affection', () => {
    s.setFlag('x'); s.vars.n = 3; changeAffection(s, 'mira', 30);
    expect(evalCond({ flag: 'x' }, s)).toBe(true);
    expect(evalCond({ notFlag: 'x' }, s)).toBe(false);
    expect(evalCond({ var: 'n', value: 3 }, s)).toBe(true);
    expect(evalCond({ var: 'n', op: '>', value: 3 }, s)).toBe(false);
    expect(evalCond({ affection: 'mira', gte: 25, lt: 50 }, s)).toBe(true);
    expect(evalCond({ all: [{ flag: 'x' }, { not: { flag: 'y' } }] }, s)).toBe(true);
  });
});

describe('affection', () => {
  it('clamps and reports milestones once', () => {
    const s = new GameState();
    expect(changeAffection(s, 'mira', 30).crossed).toEqual([25]);
    expect(changeAffection(s, 'mira', -20).crossed).toEqual([]);
    expect(changeAffection(s, 'mira', 20).crossed).toEqual([]); // 25 already recorded
    expect(changeAffection(s, 'mira', 500).after).toBe(100);
    expect(changeAffection(s, 'mira', -500).after).toBe(0);
    expect(hearts(100)).toBe(5);
  });
  it('liked trait raises, disliked lowers', () => {
    const s = new GameState();
    expect(flirt(s, 'mira', 'witty', 0, new Rng(1)).delta).toBeGreaterThan(0);
    expect(flirt(s, 'mira', 'smooth', 0, new Rng(1)).reaction).toBe('eye_roll');
  });
  it('too-forward lines fail early but not once close', () => {
    const s = new GameState();
    expect(flirt(s, 'mira', 'bold', 30, new Rng(1)).reaction).toBe('eye_roll');
    const t = new GameState(); changeAffection(t, 'rhea', 40);
    expect(flirt(t, 'rhea', 'bold', 30, new Rng(1)).reaction).toBe('love');
  });
  it('pushing past patience locks flirting until tomorrow', () => {
    const s = new GameState(); const r = new Rng(3);
    const outcomes = Array.from({ length: 5 }, () => flirt(s, 'mira', 'witty', 0, r).reaction);
    expect(outcomes[3]).toBe('pushy');
    expect(outcomes[4]).toBe('brushed');
    expect(evalCond({ brushed: 'mira' }, s)).toBe(true);
    s.day++;
    expect(evalCond({ brushed: 'mira' }, s)).toBe(false);
    expect(flirt(s, 'mira', 'witty', 0, r).reaction).toBe('love');
  });
  it('gifts: once per day, tag-based', () => {
    const s = new GameState();
    expect(giveGift(s, 'mira', ['book']).reaction).toBe('loved');
    expect(giveGift(s, 'mira', ['book']).reaction).toBe('already');
    s.day++;
    expect(giveGift(s, 'mira', ['junk']).reaction).toBe('disliked');
  });
});

describe('dialogue runner', () => {
  it('branches on flags and applies effects', async () => {
    const g: DialogueGraph = { id: 't', start: 'a', nodes: {
      a: { branch: [{ cond: { flag: 'seen' }, next: 'again' }], next: 'first' },
      first: { text: 'hi {player}', effects: [{ flag: 'seen' }, { var: 'n', add: 2 }], end: true },
      again: { text: 'again', end: true },
    } };
    const s = new GameState(); s.playerName = 'Zed';
    const { ui, log } = mockUI([]);
    const r = new DialogueRunner(ui, s, new Rng(1), { t: g });
    await r.run('t'); await r.run('t');
    expect(log).toEqual(['say:hi Zed', 'say:again']);
    expect(s.varOf('n')).toBe(2);
  });
  it('choice conditions hide options', async () => {
    const g: DialogueGraph = { id: 't', start: 'a', nodes: {
      a: { choices: [{ text: 'A', next: 'x' }, { text: 'B', cond: { flag: 'no' }, next: 'x' }, { text: 'C', next: 'x' }] },
      x: { end: true },
    } };
    let opts: string[] = [];
    const { ui } = mockUI([]);
    ui.choose = async (o) => { opts = o.options; return 0; };
    await new DialogueRunner(ui, new GameState(), new Rng(1), { t: g }).run('t');
    expect(opts).toEqual(['A', 'C']);
  });
  it('throws on missing node instead of hanging', async () => {
    const g: DialogueGraph = { id: 't', start: 'a', nodes: { a: { next: 'nope' } } };
    await expect(new DialogueRunner(mockUI([]).ui, new GameState(), new Rng(1), { t: g }).run('t')).rejects.toThrow(/missing node/);
  });
  it('every graph in the game references only existing nodes', () => {
    for (const g of Object.values(DIALOGUE)) {
      const ids = new Set(Object.keys(g.nodes));
      expect(ids.has(g.start), `${g.id} start`).toBe(true);
      const refs: string[] = [];
      for (const n of Object.values(g.nodes)) {
        if (n.next) refs.push(n.next);
        n.branch?.forEach((b) => refs.push(b.next));
        n.choices?.forEach((c) => { if (c.next) refs.push(c.next); Object.values(c.outcomes ?? {}).forEach((o) => refs.push(o)); });
      }
      Object.values(g.react ?? {}).forEach((o) => refs.push(o));
      Object.values(g.milestones ?? {}).forEach((o) => refs.push(o));
      for (const r of refs) expect(ids.has(r), `${g.id} -> ${r}`).toBe(true);
    }
  });
});

describe('Mira scripted playthrough', () => {
  it('flirting with liked lines raises affection and hits milestones with pending scenes', async () => {
    const s = new GameState();
    // intro, then 3 liked flirts across days until 25+
    const picks: Array<number | string> = [];
    const { ui, log } = mockUI(picks);
    const r = new DialogueRunner(ui, s, new Rng(7));
    for (let day = 0; day < 4; day++) {
      picks.push('Flirt', 'Prices are', 'Flirt', 'Love your', 'Leave');
      await r.run('mira');
      s.day++;
    }
    expect(s.affection('mira')).toBeGreaterThanOrEqual(25);
    expect(log.some((l) => l.startsWith('milestone:25'))).toBe(true);
    expect(s.flag('romance.mira.m25')).toBe(true);
  });
  it('spamming flirts gets a pushy reaction and ends the chat', async () => {
    const s = new GameState();
    const picks: Array<number | string> = [];
    for (let i = 0; i < 4; i++) picks.push('Flirt', 'Prices are');
    const { ui, log } = mockUI(picks);
    await new DialogueRunner(ui, s, new Rng(2)).run('mira');
    expect(log.some((l) => l.includes("that's enough"))).toBe(true);
    expect(evalCond({ brushed: 'mira' }, s)).toBe(true);
  });
});
