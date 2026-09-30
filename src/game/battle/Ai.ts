import { MOVES } from '../../data/moves';
import type { Rng } from '../../engine/rng';
import { maxHp } from './Creature';
import type { Battle } from './Battle';

/** Returns the index of the move the foe will use (or 0 -> Struggle when out of PP). */
export function chooseFoeMove(b: Battle, rng: Rng): number {
  const c = b.f;
  const usable = c.moves.map((m, i) => ({ m, i })).filter(({ m }) => m.pp > 0);
  if (!usable.length) return 0;
  if (!b.isTrainer) return rng.pick(usable).i; // wild creatures act on instinct

  let best = usable[0].i, bestScore = -1;
  for (const { m, i } of usable) {
    const def = MOVES[m.id];
    let score = b.expectedDamage('f', def);
    if (def.cat === 'status') {
      const e = def.effect;
      score = 8;
      if (e?.status && !b.p.status) score = 26;
      if (e?.heal) score = c.hp < maxHp(c) * 0.4 ? 40 : 0;
      if (e?.stages?.some((s) => s.who === 'self' && b.stages.f[s.stat] < 1)) score = 20;
      if (e?.stages?.some((s) => s.who === 'foe' && b.stages.p[s.stat] > -1)) score = 14;
    }
    // do not kill-shot a fainted target's worth of overkill differently; add noise so the AI isn't a robot
    score *= 0.8 + rng.next() * 0.4;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}
