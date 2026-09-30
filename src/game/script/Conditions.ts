import type { Cond, Effect } from '../../data/types';
import type { GameState } from '../state/GameState';

export function evalCond(c: Cond | undefined, s: GameState): boolean {
  if (!c) return true;
  if ('flag' in c) return s.flag(c.flag);
  if ('notFlag' in c) return !s.flag(c.notFlag);
  if ('var' in c) {
    const v = s.varOf(c.var);
    switch (c.op ?? '>=') {
      case '>=': return v >= c.value; case '<=': return v <= c.value; case '==': return v === c.value;
      case '>': return v > c.value; case '<': return v < c.value; case '!=': return v !== c.value;
    }
  }
  if ('affection' in c) {
    const a = s.affection(c.affection);
    return (c.gte === undefined || a >= c.gte) && (c.lt === undefined || a < c.lt);
  }
  if ('has' in c) return (s.bag[c.has] ?? 0) > 0;
  if ('dexCaught' in c) return Object.keys(s.dex.caught).length >= c.dexCaught;
  if ('brushed' in c) return (s.romance[c.brushed]?.brushUntilDay ?? 0) > s.day;
  if ('day' in c) return (s.day % 2 === 0) === (c.day === 'even');
  if ('all' in c) return c.all.every((x) => evalCond(x, s));
  if ('any' in c) return c.any.some((x) => evalCond(x, s));
  if ('not' in c) return !evalCond(c.not, s);
  return false;
}

/** Applies non-affection, non-command effects. Affection/give/cmd are handled by the caller (they need systems). */
export function applyBasicEffect(e: Effect, s: GameState): boolean {
  if ('flag' in e) { s.setFlag(e.flag, e.value ?? true); return true; }
  if ('var' in e) {
    if (e.set !== undefined) s.vars[e.var] = e.set;
    if (e.add !== undefined) s.vars[e.var] = s.varOf(e.var) + e.add;
    return true;
  }
  return false;
}
