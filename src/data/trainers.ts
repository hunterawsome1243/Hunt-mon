export interface Mon { species: string; level: number }
export interface TrainerDef {
  id: string; name: string; class: string; look: string;
  party: Mon[];
  /** rival teams: keyed by the species the rival holds (flag `rival.<species>`) */
  variants?: Record<string, Mon[]>;
  prize: number;
  pre: string[]; post: string[]; win: string[];
}

const T = (id: string, name: string, cls: string, look: string, party: Mon[], prize: number, pre: string, win: string, post: string): TrainerDef =>
  ({ id, name, class: cls, look, party, prize, pre: [pre], win: [win], post: [post] });
const m = (species: string, level: number): Mon => ({ species, level });

const rivalStarters = ['cinderpup', 'drippet', 'sproutle'] as const;
const stage2: Record<string, string> = { cinderpup: 'emberhound', drippet: 'rivulon', sproutle: 'bramblet' };
const rival = (id: string, pre: string, build: (s: string) => Mon[], prize: number): TrainerDef => ({
  id, name: 'Jace', class: 'Rival', look: 'jace', party: build('cinderpup'),
  variants: Object.fromEntries(rivalStarters.map((s) => [s, build(s)])), prize, pre: [pre], win: ['...Okay. That stung. In a good way.'], post: ['Next time I win.'],
});

export const TRAINERS: Record<string, TrainerDef> = {
  // ---- Route 1
  timo: T('timo', 'Timo', 'Bug Catcher', 'kid', [m('stingfly', 3), m('nibbit', 4)], 120, 'Hey! You there! Trainers meet in the tall grass, and you just walked in!', 'My bugs! I mean, my... stingflies!', 'Okay okay, you win. I will train harder!'),
  pip: T('pip', 'Pip', 'Lass', 'lass', [m('nibbit', 4), m('petalpuff', 5)], 160, 'Oh! A challenger! Petalpuff smells lovely, please do not be mean to it.', 'You are mean and I love it.', 'Tea after battle is the rule. I will pour.'),
  dov: T('dov', 'Dov', 'Youngster', 'scout', [m('sparkit', 5), m('wrenlet', 5)], 180, 'You look strong. Let us find out!', 'Zap! Out of juice!', 'Route 2 is tougher. Bring potions.'),
  // ---- Brindlemoor Gym
  tamsin: T('tamsin', 'Tamsin', 'Gym Trainer', 'brawler', [m('brawlcub', 10), m('pebbleback', 10)], 300, 'Rhea does not take visitors who skip the warm-ups. I am the warm-up.', 'Ow. Good reps!', 'Rhea is just through that door. Hydrate.'),
  hugo: T('hugo', 'Hugo', 'Gym Trainer', 'brawler', [m('brawlcub', 11), m('brawlcub', 11)], 320, 'Double the cubs, double the trouble!', 'Both down! I need a nap.', 'If she frowns, keep fighting. That means she likes you.'),
  rhea: { id: 'rhea', name: 'Rhea', class: 'Gym Leader', look: 'rhea', party: [m('pebbleback', 12), m('brawlcub', 13), m('brawlcub', 15)], prize: 1500, pre: ['Fists up.'], win: ['Good fight.'], post: ['Come back for a rematch.'] },
  rhea_rematch: { id: 'rhea_rematch', name: 'Rhea', class: 'Gym Leader', look: 'rhea', party: [m('pebbleback', 22), m('maulbear', 24), m('boulderon', 26)], prize: 2400, pre: ['Fists up.'], win: ['Now that was a match.'], post: ['Again?'] },
  // ---- Route 2
  hana: T('hana', 'Hana', 'Hiker', 'hiker', [m('wrenlet', 10), m('wrenlet', 11)], 260, 'Fresh air, fresh battles! Let us go!', 'Phew! Nicely done.', 'Mistwood gets foggy. Keep your eyes open.'),
  bo: T('bo', 'Bo', 'Hiker', 'hiker', [m('gnawlord', 12)], 280, 'One big creature is worth two small ones!', 'Mine was not the big one after all.', 'Try the cliff path for the view.'),
  nell: T('nell', 'Nell', 'Collector', 'lass', [m('coilsnap', 11), m('stingfly', 11)], 300, 'I collect venomous creatures. Safely! Mostly!', 'Hmph! My collection has a hole in it.', 'Careful with poison. Antidotes are a gift.'),
  // ---- Mistwood
  fen: T('fen', 'Fen', 'Dreamer', 'mystic', [m('dreamoth', 16)], 420, 'Did you dream of me too? No? Then let me introduce myself.', 'I think I am waking up.', 'Sleep is underrated. So is waking up.'),
  lark: T('lark', 'Lark', 'Ranger', 'scout', [m('petalpuff', 15), m('toxwasp', 16)], 440, 'The forest watches. So do I. Battle!', 'Rangers lose sometimes. Especially to visitors.', 'Stay on the leaf path. It is safer.'),
  wick: T('wick', 'Wick', 'Occultist', 'mystic', [m('wispling', 15), m('coilsnap', 16)], 460, 'Spirits whisper that you would be fun to fight.', 'The spirits were wrong. Or right.', 'Hollowdeep hums at night. Listen.'),
  // ---- Hollowdeep
  ash: T('ash', 'Ash', 'Spelunker', 'hiker', [m('pebbleback', 20), m('frostkin', 20)], 560, 'Careful, the walls echo your mistakes.', 'Echoes only, this time.', 'The crystals are brighter near the hall.'),
  jun: T('jun', 'Jun', 'Spelunker', 'scout', [m('glimmerbat', 21), m('brawlcub', 21)], 580, 'Bats, fists, and a bad sense of direction!', 'I am so lost.', 'Follow the glow. It knows the way.'),
  rue: T('rue', 'Rue', 'Occultist', 'mystic', [m('wispling', 22), m('coilsnap', 22)], 600, 'The dark is not empty. It is full of choices.', 'I choose a nap.', 'Orrin awaits beyond the hall doors.'),
  // ---- Gym 2
  kade: T('kade', 'Kade', 'Gym Trainer', 'mystic', [m('glimmerbat', 23), m('wispling', 23)], 640, 'The hall has rules. First: entertain the shadows.', 'The shadows applaud.', 'Orrin loves a worthy challenger.'),
  lyra: T('lyra', 'Lyra', 'Gym Trainer', 'scout', [m('frostkin', 24), m('pebbleback', 24)], 660, 'Cold hands, warm heart. Let me show you.', 'Warmed right up.', 'Orrin is dramatic, but fair.'),
  orrin: { id: 'orrin', name: 'Orrin', class: 'Gym Leader', look: 'orrin', party: [m('wispling', 25), m('duskwing', 27), m('dreamoth', 26), m('gloomwraith', 29)], prize: 2600, pre: ['Shall we begin?'], win: ['A worthy performance!'], post: ['Bravo.'] },
  // ---- Rival
  rival1: rival('rival1', 'Ready? My partner is going to win this one!', (s) => [m(s, 5)], 200),
  rival2: rival('rival2', 'Ready?', (s) => [m(s, 15), m('skyrill', 18), m('sparkit', 14)], 900),
  rival3: rival('rival3', 'Ready?', (s) => [m(stage2[s], 29), m('skyrill', 27), m('voltfox', 27), m('dreamoth', 28)], 2000),
};

/** The team a trainer fields right now (rivals adapt to the starter the player did not pick). */
export function partyFor(def: TrainerDef, hasFlag: (k: string) => boolean): Mon[] {
  if (!def.variants) return def.party;
  for (const s of Object.keys(def.variants)) if (hasFlag(`rival.${s}`)) return def.variants[s];
  return def.party;
}
