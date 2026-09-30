import type { DialogueGraph } from '../types';
import { MIRA } from './mira';
import { BED, ELDER, KID, MOM, SHELF } from './town';

export const DIALOGUE: Record<string, DialogueGraph> = Object.fromEntries([MIRA, ELDER, KID, MOM, BED, SHELF].map((g) => [g.id, g]));

/** Speaker display name -> character look (for portraits). Romanceable NPCs resolve through their profile. */
export const SPEAKER_LOOK: Record<string, string> = {
  Mira: 'shopkeeper', Rhea: 'rhea', Ilsa: 'ilsa', Odette: 'odette',
  Elder: 'elder', Kid: 'kid', Mom: 'villager_f',
};
