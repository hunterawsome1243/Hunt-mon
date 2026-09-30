import type { Cond, DialogueGraph, DialogueNode } from '../types';
import { line, Nodes } from './factory';

const J = 'Jace';
const E = 'Elder';

/** Lines Jace adds about the player's romances, depending on who they've grown close to (affection >= 50). */
function romanceComments(prefix: string, done: string, tone: 'rival2' | 'rival3'): Nodes {
  const c = (npc: string, text: string, next: string, portrait: DialogueNode['portrait'] = 'smug'): Nodes => ({
    [`${prefix}_${npc}`]: { branch: [{ cond: { affection: npc, gte: 50 }, next: `${prefix}_${npc}_l` }], next },
    [`${prefix}_${npc}_l`]: line(J, portrait, text, next),
  });
  const order = ['mira', 'rhea', 'ilsa', 'odette'];
  const lines: Record<string, [string, string]> = tone === 'rival2'
    ? {
      mira: ["Word is you've gotten cozy with the shopkeeper back home. She gave ME full price. Explain that.", 'smug'],
      rhea: ['And you got the gym leader to smile. Rhea! I have seen that woman laugh exactly once, and it was at a rock.', 'surprised'],
      ilsa: ["Dr. Ilsa says you're her 'best field assistant.' She said it twice. With a funny look.", 'smug'],
      odette: ['Odette keeps a chair for you at the Moth & Mug. I asked for that chair. She said it was "reserved."', 'annoyed'],
    }
    : {
      mira: ["Mira asked me to tell you the shop's 'fine without you.' Which is how I know she misses you.", 'happy'],
      rhea: ["Rhea told me she'd train me if I kept being your rival. Think about that: I'm being trained by your competition.", 'smug'],
      ilsa: ["Ilsa showed me the night sky, once. She got your name wrong three times on purpose. She likes you.", 'smug'],
      odette: ['Odette gave me free cocoa and asked if I was eating enough. You are her favorite, not me. I checked.', 'annoyed'],
    };
  let out: Nodes = {};
  order.forEach((npc, i) => {
    const next = i < order.length - 1 ? `${prefix}_${order[i + 1]}` : done;
    out = { ...out, ...c(npc, lines[npc][0], next, lines[npc][1] as DialogueNode['portrait']) };
  });
  return out;
}

// ------------------------------------------------------------------ chapter opening in the Elder's lab
export const LAB_INTRO: DialogueGraph = {
  id: 'lab_intro', start: 'n1',
  nodes: {
    n1: line(E, 'happy', 'Ah, {player}! Right on time. And Jace is already here, bouncing off the walls.', 'n2'),
    n2: line(J, 'happy', "Finally! I've been waiting an hour. I brought snacks. Mostly for me. Hi, {player}!", 'n3'),
    n3: line(E, 'neutral', 'The lights in our region have been dimming, and the wild creatures are restless. Someone has to find out why.', 'n4'),
    n4: line(E, 'smug', "I cannot do it with these knees. You two can. But not alone: choose a partner from my three young friends.", 'pick'),
    pick: {
      speaker: E, portrait: 'neutral', text: 'Which one will walk beside you?',
      choices: [{ text: 'Cinderpup (Flame)', next: 'pc' }, { text: 'Drippet (Tide)', next: 'pd' }, { text: 'Sproutle (Leaf)', next: 'ps' }],
    },
    pc: line(E, 'happy', 'Cinderpup! Warm-hearted and brave.', 'jace', { effects: [{ creature: 'cinderpup', level: 5 }, { flag: 'starter.chosen' }, { flag: 'starter.cinderpup' }, { flag: 'rival.drippet' }] }),
    pd: line(E, 'happy', 'Drippet! Calm, clever, loyal.', 'jace', { effects: [{ creature: 'drippet', level: 5 }, { flag: 'starter.chosen' }, { flag: 'starter.drippet' }, { flag: 'rival.sproutle' }] }),
    ps: line(E, 'happy', 'Sproutle! Patient and hardy.', 'jace', { effects: [{ creature: 'sproutle', level: 5 }, { flag: 'starter.chosen' }, { flag: 'starter.sproutle' }, { flag: 'rival.cinderpup' }] }),
    jace: line(J, 'smug', "Nice pick. Mine's better, though. I'll take the one that beats yours. Strategy!", 'jace2'),
    jace2: line(J, 'happy', "Come on — let's see who's ready. First battle of the adventure! Don't go easy on me!", 'fight'),
    fight: { effects: [{ cmd: 'battle', arg: 'rival1' }], next: 'post' },
    post: { branch: [{ cond: { var: 'battle.won', op: '==', value: 1 }, next: 'won' }], next: 'lost' },
    won: line(J, 'surprised', "Ow. Okay. You're good. Annoyingly good. I'll catch up — I always do.", 'elder2'),
    lost: line(J, 'happy', "Ha! Better luck next time. I'll still go easy on you later. No I won't.", 'elder2'),
    elder2: line(E, 'neutral', 'Now, a favor. Dr. Ilsa Varga studies the glow in Brindlemoor, north past Route 1. She is waiting for a parcel. Would you deliver it?', 'elder3', { effects: [{ give: 'parcel' }, { flag: 'quest.rival1' }, { flag: 'elder.met' }] }),
    elder3: line(E, 'happy', 'Train on the way. Talk to people. The best answers in this region are always inside someone\'s story.', 'jace3'),
    jace3: line(J, 'happy', "Race you to Brindlemoor! Loser buys cocoa!", undefined, { end: true }),
  },
};

export const ELDER_AFTER: DialogueGraph = {
  id: 'elder_after', start: 'entry',
  nodes: {
    entry: {
      branch: [
        { cond: { flag: 'quest.done' }, next: 'done' },
        { cond: { flag: 'badge.tidal' }, next: 'tidal' },
        { cond: { flag: 'badge.cinder' }, next: 'cinder' },
        { cond: { flag: 'quest.parcel_done' }, next: 'parcel' },
      ], next: 'hint',
    },
    hint: line(E, 'neutral', "Dr. Ilsa is in Brindlemoor, north of Route 1. She's waiting for that parcel.", undefined, { end: true }),
    parcel: line(E, 'happy', 'The parcel arrived! Good. Now, Brindlemoor has a gym. Rhea is fair and fierce. Earn her badge.', undefined, { end: true }),
    cinder: line(E, 'happy', 'You beat Rhea! Wonderful. The glow dims further in Mistwood and Hollowdeep. Follow it, carefully.', undefined, { end: true }),
    tidal: line(E, 'smug', 'Two badges already. The Lumen Chamber lies beyond Hollowdeep Hall. You are nearly there.', undefined, { end: true }),
    done: line(E, 'happy', "The lights are back, thanks to you and Jace. I'm going to sit here and be insufferably proud for a while.", undefined, { end: true }),
  },
};

// ------------------------------------------------------------------ rival battle 2 (Mistwood gate)
export const RIVAL2: DialogueGraph = {
  id: 'rival2', start: 'n1',
  nodes: {
    n1: line(J, 'smug', "{player}! You made it through Route 2. I've been here since dawn, resting. Completely resting. Not lost at all.", 'n2'),
    n2: line(J, 'neutral', "Mistwood is where the glow fades. Ilsa says something in Hollowdeep is pulling it all in. Somebody's got to go down there.", 'mira_'),
    mira_: { branch: [{ cond: { affection: 'mira', gte: 50 }, next: 'c_mira' }], next: 'c_rhea_' },
    c_mira: line(J, 'smug', "Word is you've gotten cozy with the shopkeeper back home. She gave ME full price. Explain that.", 'c_rhea_'),
    c_rhea_: { branch: [{ cond: { affection: 'rhea', gte: 50 }, next: 'c_rhea' }], next: 'c_ilsa_' },
    c_rhea: line(J, 'surprised', "And you got the gym leader to smile. Rhea! I've seen that woman laugh exactly once, and it was at a rock.", 'c_ilsa_'),
    c_ilsa_: { branch: [{ cond: { affection: 'ilsa', gte: 50 }, next: 'c_ilsa' }], next: 'c_odette_' },
    c_ilsa: line(J, 'smug', "Dr. Ilsa calls you her 'best field assistant.' Twice. With a funny look.", 'c_odette_'),
    c_odette_: { branch: [{ cond: { affection: 'odette', gte: 50 }, next: 'c_odette' }], next: 'any_' },
    c_odette: line(J, 'annoyed', "Odette keeps a chair for you at the Moth & Mug. I asked for that chair. She said it was 'reserved.'", 'any_'),
    any_: {
      branch: [{ cond: { any: [{ affection: 'mira', gte: 50 }, { affection: 'rhea', gte: 50 }, { affection: 'ilsa', gte: 50 }, { affection: 'odette', gte: 50 }] }, next: 'any_yes' }], next: 'none',
    },
    any_yes: line(J, 'happy', "Anyway, I'm glad someone's looking out for you. Now — put your badge where your mouth is!", 'fight'),
    none: line(J, 'smug', "Not a single crush? Hm. I'm not judging. Okay I'm judging a little. Come on, battle me!", 'fight'),
    fight: { effects: [{ cmd: 'battle', arg: 'rival2' }], next: 'post' },
    post: { branch: [{ cond: { var: 'battle.won', op: '==', value: 1 }, next: 'won' }], next: 'lost' },
    won: line(J, 'surprised', "You're scary good now. Fine. You lead, I'll cover your back. Deal?", 'end', { effects: [{ flag: 'quest.rival2' }] }),
    lost: line(J, 'smug', "I win this one! But I'll wait for you to heal before we both go in. I'm not a monster.", 'end', { effects: [{ flag: 'quest.rival2' }] }),
    end: line(J, 'neutral', 'The cave entrance is past the forest. Be careful, {player}. I mean it.', undefined, { end: true }),
  },
};

// ------------------------------------------------------------------ rival battle 3 + Lumen Chamber finale
const c3 = romanceComments('c3', 'any3', 'rival3');
export const LUMEN: DialogueGraph = {
  id: 'lumen', start: 'n1',
  nodes: {
    n1: line('', 'neutral', 'The chamber hums. A huge crystal sits at the center, its light almost out.', 'n2'),
    n2: line(J, 'surprised', "{player}! There you are. I didn't want to go in alone. Everyone kept saying 'be brave.' I wanted a friend.", 'n3'),
    n3: line(J, 'neutral', "Whatever protects the glow is here, and it's hurt. I want to help. But first — one last match? Just to settle my nerves.", 'c3_mira'),
    ...c3,
    any3: {
      branch: [{ cond: { any: [{ affection: 'mira', gte: 50 }, { affection: 'rhea', gte: 50 }, { affection: 'ilsa', gte: 50 }, { affection: 'odette', gte: 50 }] }, next: 'any3_yes' }], next: 'none3',
    },
    any3_yes: line(J, 'happy', "Whoever it is, they're lucky. Right. Stop stalling, {player}. Battle!", 'fight'),
    none3: line(J, 'happy', "Love can wait. The region can't. Battle!", 'fight'),
    fight: { effects: [{ cmd: 'battle', arg: 'rival3' }], next: 'post' },
    post: { branch: [{ cond: { var: 'battle.won', op: '==', value: 1 }, next: 'won' }], next: 'lost' },
    won: line(J, 'happy', "That's it. You've outgrown me. I'm okay with that, actually. Proud, even. Don't tell anyone.", 'crystal'),
    lost: line(J, 'smug', "Ha! ...Okay, we both know you could've beaten me. Let's focus. Look.", 'crystal'),
    crystal: line('', 'neutral', 'The crystal flickers. Something shimmers above it, folding in on itself like frost on glass.', 'aurorix'),
    aurorix: line('', 'surprised', 'Aurorix, the Lumen guardian, unfolds from the light! It is weak, frightened, and protecting the last of the glow.', 'choice'),
    choice: {
      speaker: '', text: 'What do you do?',
      choices: [{ text: 'Calm it gently', next: 'battle' }, { text: 'Stand your ground', next: 'battle' }],
    },
    battle: { effects: [{ cmd: 'wild', arg: 'aurorix,30' }], next: 'after' },
    after: line('', 'neutral', 'Aurorix shudders, then presses itself against the crystal. Light spills out — warm, gold, endless.', 'after2'),
    after2: line(J, 'surprised', 'The glow! Look at it go! {player}, the whole region must be lighting up right now!', 'after3'),
    after3: line('', 'happy', 'Far to the west, the lamps in Brindlemoor flare. Further still, in Emberwick, the pond shines like a mirror full of stars.', 'end', { effects: [{ flag: 'quest.rival3' }, { flag: 'quest.done' }] }),
    end: { effects: [{ cmd: 'end' }], end: true },
  },
};

// ------------------------------------------------------------------ gym 2 leader
export const ORRIN: DialogueGraph = {
  id: 'orrin', start: 'entry',
  nodes: {
    entry: { branch: [{ cond: { flag: 'badge.tidal' }, next: 'after' }, { cond: { flag: 'orrin.met' }, next: 'again' }], next: 'first' },
    first: line('Orrin', 'smug', "Ah. A visitor in my hall of shadows. I am Orrin, keeper of Hollowdeep, and professional dramatist.", 'first2', { effects: [{ flag: 'orrin.met' }] }),
    first2: line('Orrin', 'neutral', "The glow is failing. Some say shadows are to blame. I say shadows are merely *guests.* But yes, beat me and the chamber will open.", 'rom'),
    rom: { branch: [{ cond: { any: [{ affection: 'mira', gte: 50 }, { affection: 'rhea', gte: 50 }, { affection: 'ilsa', gte: 50 }, { affection: 'odette', gte: 50 }] }, next: 'rom_yes' }], next: 'ask' },
    rom_yes: line('Orrin', 'smug', "Rumor says your heart is busy with someone far above. Good. A full heart makes a braver trainer. Also a more dramatic one.", 'ask'),
    again: line('Orrin', 'smug', 'The shadows whispered you would return. Are you ready?', 'ask'),
    ask: { speaker: 'Orrin', portrait: 'neutral', text: 'Shall we begin?', choices: [{ text: "Let's battle!", next: 'fight' }, { text: 'Not yet.', next: 'wait' }] },
    wait: line('Orrin', 'neutral', 'Take your time. Shadows are patient. Mostly.', undefined, { end: true }),
    fight: { effects: [{ cmd: 'battle', arg: 'orrin' }], branch: [{ cond: { var: 'battle.won', op: '==', value: 1 }, next: 'won' }], next: 'lost' },
    lost: line('Orrin', 'smug', 'The curtain falls on this act. Heal up. Return for the encore.', undefined, { end: true }),
    won: line('Orrin', 'surprised', "Extraordinary! A light even I could not dim.", 'won2'),
    won2: line('Orrin', 'happy', 'Take the Tidal Badge, brave one. The Lumen Chamber lies beyond the north door. The crystal needs you more than I need applause.', 'won3', { effects: [{ cmd: 'badge', arg: 'tidal' }, { give: 'hyper_potion', qty: 3 }, { flag: 'quest.lumen_open' }] }),
    won3: line('Orrin', 'smug', "...And tell your rival I said the 'hello, darkness' bit worked. They'll understand.", undefined, { end: true }),
    after: line('Orrin', 'happy', "The Lumen Chamber is open. Go. Shine. Try not to upstage the crystal.", undefined, { end: true }),
  },
};

// ------------------------------------------------------------------ guards and helper scenes
const guard = (id: string, speaker: string, text: string): DialogueGraph => ({ id, start: 'a', nodes: { a: line(speaker, 'neutral', text, undefined, { end: true }) } });
export const GUARDS: DialogueGraph[] = [
  guard('need_starter', 'You', "You should see the Elder first. He wanted to meet you in his lab."),
  guard('need_badge', 'Guard', "Mistwood and the roads beyond are off limits to trainers without a Cinder Badge. Rule of the Brindlemoor Gym."),
  guard('need_rival', 'Guard', "Hold it. Hollowdeep is dangerous. You can get through once you've spoken to your friend by the Mistwood gate."),
  guard('need_lumen', 'You', "The door to the Lumen Chamber is sealed. Whoever keeps the hall has the key."),
  guard('need_parcel', 'Guard', "Brindlemoor Lab is expecting a parcel. Better deliver it first."),
];

export const STORY_GRAPHS: DialogueGraph[] = [LAB_INTRO, ELDER_AFTER, RIVAL2, LUMEN, ORRIN, ...GUARDS];
export type _Cond = Cond;
