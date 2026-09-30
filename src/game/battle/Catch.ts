import type { Rng } from '../../engine/rng';
import { Creature, maxHp } from './Creature';

export interface CatchResult { shakes: number; caught: boolean; a: number }

/** Gen-3 style capture: 4 shake checks against a modified catch value. */
export function catchCheck(foe: Creature, rate: number, ball: number, rng: Rng): CatchResult {
  const max = maxHp(foe);
  const statusMul = foe.status === 'sleep' ? 2 : foe.status ? 1.5 : 1;
  const a = Math.floor((((3 * max - 2 * foe.hp) * rate * ball) / (3 * max)) * statusMul);
  if (a >= 255) return { shakes: 4, caught: true, a };
  const b = Math.floor(65536 / Math.pow(255 / Math.max(1, a), 0.1875));
  let shakes = 0;
  for (let i = 0; i < 4; i++) { if (rng.int(0, 65535) < b) shakes++; else break; }
  return { shakes, caught: shakes === 4, a };
}
