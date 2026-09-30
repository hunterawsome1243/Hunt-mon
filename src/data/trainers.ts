export interface TrainerDef {
  id: string; name: string; class: string; look: string;
  party: Array<{ species: string; level: number }>;
  prize: number;
  pre: string[]; post: string[]; win: string[];
}

export const TRAINERS: Record<string, TrainerDef> = {
  timo: { id: 'timo', name: 'Timo', class: 'Bug Catcher', look: 'kid',
    party: [{ species: 'stingfly', level: 3 }, { species: 'nibbit', level: 4 }], prize: 120,
    pre: ['Hey! You there! Trainers meet in the tall grass, and you just walked in!'], win: ['My bugs! I mean, my... stingflies!'], post: ['Okay okay, you win. I will train harder!'] },
};
