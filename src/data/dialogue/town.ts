import type { DialogueGraph } from '../types';

export const ELDER: DialogueGraph = {
  id: 'elder', start: 'entry',
  nodes: {
    entry: { branch: [{ cond: { flag: 'elder.met' }, next: 'again' }], next: 'first' },
    first: {
      speaker: 'Elder', portrait: 'neutral', text: 'Ah, a new traveller. The world is wide, {player}. Walk with care, and run only with purpose.',
      effects: [{ flag: 'elder.met' }], next: 'menu',
    },
    again: { speaker: 'Elder', portrait: 'happy', text: 'Back again? Good. Curiosity keeps the old young.', next: 'menu' },
    menu: {
      speaker: 'Elder', portrait: 'neutral', text: 'What would you like to know?',
      choices: [
        { text: 'About this town', next: 'lore' },
        { text: 'Any advice?', next: 'advice' },
        { text: 'Nothing, thanks', next: 'bye' },
      ],
    },
    lore: { speaker: 'Elder', portrait: 'neutral', text: 'Emberwick was founded beside a pond that never freezes. Some say the water remembers warmth.', next: 'menu' },
    advice: { speaker: 'Elder', portrait: 'smug', text: 'Talk to everyone. Shopkeepers hear things. The heart of a town lives in its counters and kitchens.', next: 'menu' },
    bye: { speaker: 'Elder', portrait: 'neutral', text: 'Safe roads.', end: true },
  },
};

export const KID: DialogueGraph = {
  id: 'kid', start: 'entry',
  nodes: {
    entry: {
      branch: [
        { cond: { var: 'kid.talks', value: 3 }, next: 'annoyed' },
        { cond: { var: 'kid.talks', value: 1 }, next: 'again' },
      ],
      next: 'first',
    },
    first: { speaker: 'Kid', portrait: 'happy', text: 'I want to catch a creature just like the ones in the stories!', effects: [{ var: 'kid.talks', add: 1 }], end: true },
    again: { speaker: 'Kid', portrait: 'neutral', text: "Mom says I'm not allowed in the tall grass yet. But YOU can go!", effects: [{ var: 'kid.talks', add: 1 }], end: true },
    annoyed: { speaker: 'Kid', portrait: 'annoyed', text: "You've talked to me {player}... like, a lot. Go have an adventure!", effects: [{ var: 'kid.talks', add: 1 }], end: true },
  },
};

export const MOM: DialogueGraph = {
  id: 'mom', start: 'a',
  nodes: {
    a: { speaker: 'Mom', portrait: 'happy', text: 'Good morning, sweetheart! Be careful out there, and come home any time.', end: true },
  },
};

export const BED: DialogueGraph = {
  id: 'bed', start: 'a',
  nodes: {
    a: {
      text: 'A cozy bed. Sleep until tomorrow?',
      choices: [{ text: 'Sleep', next: 'sleep' }, { text: 'Not now', next: 'no' }],
    },
    sleep: { effects: [{ cmd: 'sleep' }], next: 'wake' },
    wake: { text: 'You wake up refreshed. A new day begins.', end: true },
    no: { end: true },
  },
};

export const SHELF: DialogueGraph = {
  id: 'shelf', start: 'a',
  nodes: { a: { text: 'Shelves of worn adventure novels and creature field guides.', end: true } },
};
