import type { Trait } from '../types';

export interface RomanceProfile {
  id: string;
  name: string;
  job: string;
  age: number;
  look: string;
  likes: Trait[];
  dislikes: Trait[];
  /** item tags this person loves / can't stand (items get tags in M4) */
  giftLikes: string[];
  giftDislikes: string[];
  /** flirt attempts per day before they get annoyed */
  patience: number;
  blurb: string;
}

// All four are clearly adults. Full side stories arrive with M5 content.
export const ROMANCE: Record<string, RomanceProfile> = {
  mira: {
    id: 'mira', name: 'Mira', job: 'Shopkeeper', age: 28, look: 'shopkeeper',
    likes: ['witty', 'cheeky', 'sincere'], dislikes: ['smooth', 'bold'],
    giftLikes: ['sweet', 'book'], giftDislikes: ['junk'], patience: 3,
    blurb: 'Sharp-tongued shopkeeper who has heard every pickup line twice.',
  },
  rhea: {
    id: 'rhea', name: 'Rhea', job: 'Gym Leader', age: 31, look: 'rhea',
    likes: ['bold', 'sincere', 'sweet'], dislikes: ['goofy', 'smooth'],
    giftLikes: ['sport', 'rare'], giftDislikes: ['sweet'], patience: 4,
    blurb: 'Competitive gym leader who respects nerve and honesty.',
  },
  ilsa: {
    id: 'ilsa', name: 'Ilsa', job: 'Researcher', age: 30, look: 'ilsa',
    likes: ['nerdy', 'sincere', 'goofy'], dislikes: ['bold', 'cheeky'],
    giftLikes: ['book', 'tech'], giftDislikes: ['junk'], patience: 3,
    blurb: 'Traveling researcher; more comfortable with field notes than small talk.',
  },
  odette: {
    id: 'odette', name: 'Odette', job: 'Café Owner', age: 29, look: 'odette',
    likes: ['sweet', 'smooth', 'sincere'], dislikes: ['goofy', 'cheeky'],
    giftLikes: ['flower', 'sweet'], giftDislikes: ['junk', 'sport'], patience: 3,
    blurb: 'Warm café owner who remembers everyone’s order — and everyone’s secrets.',
  },
};
