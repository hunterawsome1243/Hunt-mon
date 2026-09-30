import { ITEMS } from '../../data/items';
import { Creature, maxHp, nameOf } from '../battle/Creature';

export interface UseResult { ok: boolean; msg: string }

/** Whether the item can be used on this creature outside battle. */
export function canUseOn(itemId: string, c: Creature): boolean {
  const it = ITEMS[itemId];
  if (!it) return false;
  switch (it.kind) {
    case 'heal': return c.hp > 0 && c.hp < maxHp(c);
    case 'status': return c.hp > 0 && !!c.status && (it.cures === 'all' || (it.cures as string[]).includes(c.status));
    case 'revive': return c.hp <= 0;
    default: return false;
  }
}

/** Applies a healing/status/revive item to a creature. Caller is responsible for consuming the item when ok. */
export function useOn(itemId: string, c: Creature): UseResult {
  const it = ITEMS[itemId];
  if (!it || !canUseOn(itemId, c)) return { ok: false, msg: 'It won’t have any effect.' };
  const n = nameOf(c);
  if (it.kind === 'heal') {
    const from = c.hp;
    c.hp = Math.min(maxHp(c), c.hp + (it.heal === 'full' ? maxHp(c) : (it.heal as number)));
    return { ok: true, msg: `${n} recovered ${c.hp - from} HP.` };
  }
  if (it.kind === 'status') { c.status = null; c.sleep = 0; return { ok: true, msg: `${n} was cured.` }; }
  c.hp = Math.max(1, Math.floor(maxHp(c) / 2));
  return { ok: true, msg: `${n} is back on its feet!` };
}
