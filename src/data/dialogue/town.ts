import type { DialogueGraph } from '../types';

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

export const NURSE: DialogueGraph = {
  id: 'nurse', start: 'a',
  nodes: {
    a: {
      speaker: 'Nurse', portrait: 'happy', text: "Welcome to the Care Hut! I can heal your creatures so they're in top shape. Shall I?",
      choices: [{ text: 'Yes, please', next: 'heal' }, { text: 'Not right now', next: 'no' }],
    },
    heal: { speaker: 'Nurse', portrait: 'neutral', text: "Okay, I'll take your creatures for a moment.", effects: [{ cmd: 'heal' }], next: 'done' },
    done: { speaker: 'Nurse', portrait: 'happy', text: "Thank you for waiting! Your creatures are fully healed. We hope to see you again!", end: true },
    no: { speaker: 'Nurse', portrait: 'neutral', text: 'Come back any time. Rest is the best medicine!', end: true },
  },
};

export const PC: DialogueGraph = {
  id: 'pc', start: 'a',
  nodes: {
    a: { text: 'A storage terminal hums quietly. Open the creature box?', choices: [{ text: 'Open box', next: 'open' }, { text: 'Not now', next: 'no' }] },
    open: { effects: [{ cmd: 'pc' }], end: true },
    no: { end: true },
  },
};

export const MART: DialogueGraph = {
  id: 'mart', start: 'a',
  nodes: {
    a: { speaker: 'Clerk', portrait: 'happy', text: 'Welcome to Brindlemoor Mart! Looking for supplies?', effects: [{ cmd: 'shop', arg: 'brindle' }], next: 'b' },
    b: { speaker: 'Clerk', portrait: 'neutral', text: 'Come again!', end: true },
  },
};
