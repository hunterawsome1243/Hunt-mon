import { describe, expect, it } from 'vitest';
import { DIALOGUE } from '../src/data/dialogue';
import { ITEMS } from '../src/data/items';
import { ROMANCE } from '../src/data/romance/profiles';
import { DialogueRunner, DialogueUI } from '../src/engine/script/DialogueRunner';
import { Rng } from '../src/engine/rng';
import { giveGift, nextDay } from '../src/game/romance/Affection';
import { GameState } from '../src/game/state/GameState';

/**
 * A rendering-free "bot" that plays the whole chapter through the real dialogue graphs:
 * story beats, all four romances (milestones, side quests, special creatures, dates) and the ending.
 * Engine-side commands (battles, shops, warps) are stubbed with the same state effects the engine applies.
 */
interface World { s: GameState; run(id: string): Promise<void>; log: string[]; ended: boolean; dates: string[]; choose: (o: { options: string[]; text?: string }) => number }

function makeWorld(policy: (options: string[], text?: string) => number | string, winBattles = true): World {
  const s = new GameState();
  s.newGame('Tester');
  const w: World = { s, log: [], ended: false, dates: [], choose: () => 0, run: async () => undefined };
  const ui: DialogueUI = {
    async say(o) { w.log.push(`${o.speaker ?? ''}: ${o.text}`); },
    async choose(o) {
      const p = policy(o.options, o.text);
      const i = typeof p === 'string' ? o.options.findIndex((x) => x.includes(p)) : p;
      if (i < 0 || i >= o.options.length) throw new Error(`policy gave "${String(p)}" but options are: ${o.options.join(' | ')}`);
      w.log.push(`> ${o.options[i]}`);
      return i;
    },
    affectionFx() {},
    milestone(npc, m) { w.log.push(`MILESTONE ${npc} ${m}`); },
    give(item, qty) { s.addItem(item, qty); },
    giveCreature(sp, lv) { s.giveStarter(sp, lv); },
    async command(name, arg) {
      switch (name) {
        case 'battle': s.vars['battle.won'] = winBattles ? 1 : 0; if (winBattles) s.setFlag('trainer.' + arg); break;
        case 'wild': s.vars['battle.result'] = 1; break;
        case 'badge': s.awardBadge(arg!); break;
        case 'take': s.bag[arg!] = Math.max(0, (s.bag[arg!] ?? 0) - 1); break;
        case 'date': w.dates.push(arg!); await runner.run(`date_${arg}`); break;
        case 'return': nextDay(s); break;
        case 'end': w.ended = true; break;
        case 'gift': {
          // give the first gift the NPC likes (by tag), else any gift in the bag
          const liked = ROMANCE[arg!].giftLikes;
          const gifts = Object.keys(s.bag).filter((k) => (s.bag[k] ?? 0) > 0 && ITEMS[k]?.kind === 'gift');
          const pick = gifts.find((g) => ITEMS[g].tags?.some((t) => liked.includes(t))) ?? gifts[0];
          if (!pick) { s.vars['gift.result'] = 0; break; }
          const r = giveGift(s, arg!, ITEMS[pick].tags ?? []);
          if (r.reaction !== 'already') s.bag[pick]--;
          s.vars['gift.result'] = { loved: 1, liked: 2, disliked: 3, already: 4 }[r.reaction];
          for (const m of r.crossed) w.log.push(`MILESTONE ${arg} ${m}`);
          break;
        }
        default: break; // shop, pc, heal, sleep: nothing to check here
      }
    },
  };
  const runner = new DialogueRunner(ui, s, new Rng(99));
  w.run = (id) => runner.run(id);
  return w;
}

describe('story playthrough (logic level)', () => {
  it('plays the whole chapter from the Elder to the credits', async () => {
    const w = makeWorld((opts) => {
      const pref = ['Cinderpup', 'Challenge the gym', "I'm ready.", "Let's battle!", 'Calm it gently', 'Leave', 'Nothing'];
      for (const p of pref) { const i = opts.findIndex((o) => o.includes(p)); if (i >= 0) return i; }
      return 0;
    });
    const { s } = w;
    await w.run('need_starter');
    await w.run('lab_intro');
    expect(s.flag('starter.chosen') && s.flag('quest.rival1')).toBe(true);
    expect(s.flag('rival.drippet')).toBe(true);
    expect(s.party).toHaveLength(1);
    expect(s.bag.parcel).toBe(1);
    await w.run('elder_after');
    await w.run('ilsa'); // parcel delivery comes first
    expect(s.flag('quest.parcel_done')).toBe(true);
    expect(s.bag.parcel).toBe(0);
    await w.run('rhea');
    expect(s.flag('badge.cinder') && s.flag('badge.first') && s.flag('quest.mistwood_open')).toBe(true);
    await w.run('rival2');
    expect(s.flag('quest.rival2')).toBe(true);
    await w.run('orrin');
    expect(s.flag('badge.tidal') && s.flag('badge.second') && s.flag('quest.lumen_open')).toBe(true);
    await w.run('lumen');
    expect(s.flag('quest.rival3') && s.flag('quest.done') && w.ended).toBe(true);
    await w.run('elder_after');
    expect(w.log.some((l) => l.includes('lights are back'))).toBe(true);
  });

  it('rivals comment on whoever the player grew close to', async () => {
    const w = makeWorld(() => 0);
    w.s.rec('mira').affection = 60; w.s.rec('odette').affection = 55;
    await w.run('rival2');
    const text = w.log.join('\n');
    expect(text).toContain('shopkeeper'); expect(text).toContain('Odette'); expect(text).not.toContain('Dr. Ilsa calls you');
    const w2 = makeWorld(() => 0);
    await w2.run('rival2');
    expect(w2.log.join('\n')).toContain('Not a single crush');
  });

  it('losing to the gym leader keeps the gate shut but never traps the conversation', async () => {
    const w = makeWorld((o) => { const i = o.findIndex((x) => x.includes("I'm ready.") || x.includes('Challenge')); return i >= 0 ? i : o.findIndex((x) => x === 'Leave'); }, false);
    await w.run('rhea');
    expect(w.s.flag('badge.cinder')).toBe(false);
    expect(w.log.join('\n')).toContain('Good fight. Heal up');
  });
});

/** Everything one romance needs, played as a bot would: flirt with liked styles, gift, chat, finish the side quest, date. */
describe.each(Object.keys(ROMANCE))('romance: %s', (npc) => {
  const p = ROMANCE[npc];
  const flirtTexts = (): string[] => {
    const menu = DIALOGUE[npc].nodes.flirt_menu.choices!;
    return menu.filter((c) => c.flirt && p.likes.includes(c.flirt.trait) && (c.flirt.forward ?? 0) <= 20).map((c) => c.text);
  };
  const QUEST_ITEM: Record<string, string> = { mira: 'recipe_book', rhea: 'lucky_band', ilsa: 'parcel', odette: 'tea_leaves' };

  it('can be courted from stranger to date with every reward', async () => {
    let flirtsToday = 0;
    const w = makeWorld((opts) => {
      const has = (t: string) => opts.findIndex((o) => o.includes(t));
      for (const t of ['Go for a walk', 'Go for a run', 'Stargaze together', 'Stay after closing']) if (has(t) >= 0) return has(t);
      for (const t of ['The recipe book', 'The wristband', 'About the field log', 'The Glowcap tea']) if (has(t) >= 0) return has(t);
      for (const t of ['Need any help?', 'Field log help?']) if (has(t) >= 0) return has(t);
      if (opts.includes('Actually, never mind.')) { flirtsToday++; const good = flirtTexts().map((t) => opts.indexOf(t)).filter((i) => i >= 0); return good.length ? good[flirtsToday % good.length] : 0; }
      if (has('Flirt') >= 0 && flirtsToday < p.patience - 1) return has('Flirt');
      if (has('Give a gift') >= 0 && !w.s.flag(`${npc}.gifted.${w.s.day}`)) { w.s.setFlag(`${npc}.gifted.${w.s.day}`); return has('Give a gift'); }
      const leave = has('Leave'); return leave >= 0 ? leave : opts.length - 1;
    });
    const { s } = w;
    s.addItem('sweet_bun', 50); s.addItem('old_novel', 50); s.addItem('wildflower', 50); s.addItem('trail_bar', 50); s.addItem('pocket_gadget', 50);
    for (const sp of ['cinderpup', 'drippet', 'sproutle', 'nibbit', 'wrenlet', 'sparkit', 'stingfly', 'petalpuff', 'glimmerbat', 'wispling']) s.markCaught(sp);
    s.giveStarter('cinderpup', 10);
    const parcelStory = npc === 'ilsa';
    if (!parcelStory) s.addItem(QUEST_ITEM[npc], 1);

    let day = 0;
    for (; day < 80 && !s.flag(`${npc}.date_done`); day++) {
      flirtsToday = 0;
      await w.run(npc);
      s.day++;
    }
    expect(s.flag(`${npc}.date_done`), `date never happened (aff ${s.affection(npc)}, day ${day})`).toBe(true);
    expect(day).toBeLessThan(60);
    for (const m of [25, 50, 75, 100]) expect(s.flag(`romance.${npc}.m${m}`), `milestone ${m}`).toBe(true);
    expect(s.flag(`${npc}.quest_done`), 'side quest').toBe(true);
    const special = { mira: 'honeypaw', rhea: 'ironpaw', ilsa: 'quillbit', odette: 'cocoamoth' }[npc]!;
    expect(s.party.some((c) => c.species === special) || s.box.some((c) => c.species === special), 'special creature').toBe(true);
    expect(w.dates).toEqual([npc]);
    expect(s.affection(npc)).toBeGreaterThanOrEqual(100);
    // nothing sensitive: lines stay PG-13 and mention no explicit words
    const text = w.log.join(' ').toLowerCase();
    for (const bad of ['sex', 'naked', 'nude', 'strip']) expect(text).not.toContain(bad);
  });

  it('too-forward flirting is refused, and pushing your luck locks flirting for the day', async () => {
    let flirts = 0;
    const w = makeWorld((opts) => {
      if (opts.includes('Actually, never mind.')) { flirts++; return 0; }
      const f = opts.indexOf('Flirt'); return f >= 0 ? f : opts.length - 1;
    });
    // spam flirt until the NPC ends the conversation
    await w.run(npc);
    expect(flirts).toBeGreaterThan(0);
    expect(w.s.rec(npc).brushUntilDay).toBeGreaterThan(w.s.day);
    expect(w.log.join(' ')).not.toContain('undefined');
  });
});
