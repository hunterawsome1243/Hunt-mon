import type { DialogueGraph } from '../types';
import { DATE_GRAPHS } from './dates';
import { ROMANCE_GRAPHS } from './romance';
import { STORY_GRAPHS } from './story';
import { BED, KID, MART, MOM, NURSE, PC, SHELF } from './town';

export const DIALOGUE: Record<string, DialogueGraph> = Object.fromEntries([...ROMANCE_GRAPHS, ...STORY_GRAPHS, ...DATE_GRAPHS, KID, MOM, BED, SHELF, NURSE, PC, MART].map((g) => [g.id, g]));

/** Speaker display name -> character look (for portraits). Romanceable NPCs resolve through their profile. */
export const SPEAKER_LOOK: Record<string, string> = {
  Mira: 'shopkeeper', Rhea: 'rhea', Ilsa: 'ilsa', Odette: 'odette', Jace: 'jace', Orrin: 'orrin',
  Elder: 'elder', Nurse: 'nurse', Kid: 'kid', Mom: 'villager_f', Clerk: 'scout', Guard: 'scout',
};
