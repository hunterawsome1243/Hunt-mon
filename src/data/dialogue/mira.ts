import type { DialogueGraph } from '../types';

const M = 'Mira';

export const MIRA: DialogueGraph = {
  id: 'mira', npc: 'mira', start: 'entry',
  react: { love: 'r_love', like: 'r_meh', meh: 'r_meh', eye_roll: 'r_eye', pushy: 'r_pushy', brushed: 'r_brushed' },
  milestones: { 25: 'm25', 50: 'm50', 75: 'm75', 100: 'm100' },
  nodes: {
    entry: {
      branch: [
        { cond: { notFlag: 'mira.intro' }, next: 'intro' },
        { cond: { affection: 'mira', gte: 50 }, next: 'greet_close' },
      ],
      next: 'greet',
    },
    intro: {
      speaker: M, portrait: 'neutral', text: "Welcome to my shop! I'm Mira. Potions, pouches, and unsolicited opinions, all at fair prices.",
      effects: [{ flag: 'mira.intro' }], next: 'intro2',
    },
    intro2: { speaker: M, portrait: 'smug', text: "You must be {player}. Word travels fast in a town this small.", next: 'menu' },
    greet: { speaker: M, portrait: 'neutral', text: "Back again, {player}?", alts: ['Look who it is.', 'Need anything, or just admiring the shelves?'], next: 'menu' },
    greet_close: { speaker: M, portrait: 'happy', text: "There you are! I was just about to stop pretending I wasn't waiting.", next: 'menu' },
    menu: {
      hub: true, speaker: M, portrait: 'neutral', text: 'What can I do for you?',
      choices: [
        { text: 'Browse wares', next: 'shop' },
        { text: 'Chat', next: 'chat' },
        { text: 'Flirt', next: 'flirt_gate' },
        { text: 'Leave', next: 'bye' },
      ],
    },
    shop: { speaker: M, portrait: 'smug', text: "The shelves aren't stocked yet. Come back after the delivery, boss.", next: 'menu' },
    chat: {
      speaker: M, portrait: 'neutral', text: 'Ask away.',
      choices: [
        { text: 'How is business?', next: 'chat_biz' },
        { text: 'Why open a shop here?', next: 'chat_why' },
        { text: 'Never mind', next: 'menu' },
      ],
    },
    chat_biz: {
      speaker: M, portrait: 'neutral', text: 'Steady. Trainers always need supplies, and they always forget them. I never run out of customers.',
      effects: [{ var: 'mira.chats', add: 1 }], next: 'chat_biz_bonus',
    },
    chat_biz_bonus: {
      branch: [{ cond: { flag: 'mira.chat_biz' }, next: 'menu' }],
      speaker: M, portrait: 'happy', text: 'Thanks for asking, by the way. Most people just ask for a discount.',
      effects: [{ flag: 'mira.chat_biz' }, { affection: 'mira', delta: 3 }], next: 'menu',
    },
    chat_why: {
      speaker: M, portrait: 'neutral', text: "I grew up two towns over. Emberwick smelled like fresh bread and adventure. Half of that turned out to be true.",
      effects: [{ var: 'mira.chats', add: 1 }, { flag: 'mira.chat_why' }], next: 'menu',
    },
    flirt_gate: {
      branch: [{ cond: { brushed: 'mira' }, next: 'brushed_now' }],
      next: 'flirt_menu',
    },
    brushed_now: { speaker: M, portrait: 'annoyed', text: "Not today, {player}. I said what I said.", next: 'menu' },
    flirt_menu: {
      text: 'You lean on the counter with a winning smile...',
      choices: [
        { text: 'Prices are criminal.', flirt: { trait: 'witty' } },
        { text: 'Love your laugh.', flirt: { trait: 'sincere' } },
        { text: 'Come here often?', flirt: { trait: 'cheeky' } },
        { text: 'Nice shop. Nicer you.', flirt: { trait: 'smooth' } },
        { text: 'Bet I make you blush.', flirt: { trait: 'bold', forward: 30 } },
        { text: 'Actually, never mind.', next: 'menu' },
      ],
    },
    r_love: {
      speaker: M, portrait: 'blush', text: "Ha! Okay, that one actually landed. Don't let it go to your head.",
      alts: ["...You're annoyingly charming. Keep that up and I'll have to raise my prices.", "Hm. Now I'm smiling and I hate that you saw it."],
      next: 'menu',
    },
    r_meh: { speaker: M, portrait: 'neutral', text: 'Mm-hm. Cute. Anything else?', alts: ["Bless your heart. Try again?", 'Points for effort.'], next: 'menu' },
    r_eye: {
      speaker: M, portrait: 'annoyed', text: 'Really? Did that ever work on anyone?',
      alts: ["*eye roll* I've heard better from the delivery goblins.", "Wow. Bold. Wrong, but bold."], next: 'menu',
    },
    r_pushy: {
      speaker: M, portrait: 'annoyed', text: "Okay, that's enough. I've got a shop to run. Come back tomorrow, {player}.", end: true,
    },
    r_brushed: { speaker: M, portrait: 'annoyed', text: 'Not today.', next: 'menu' },
    bye: { speaker: M, portrait: 'neutral', text: 'Come back soon. Try not to get eaten by anything.', end: true },

    m25: { speaker: M, portrait: 'happy', text: "You know, you're growing on me. Like moss. Charming, slightly damp moss.", next: 'menu' },
    m50: {
      speaker: M, portrait: 'blush', text: "Friends-and-family discount, {player}. Don't tell the others. They'd riot.",
      effects: [{ flag: 'mira.discount' }], next: 'menu',
    },
    m75: {
      speaker: M, portrait: 'happy', text: 'I set this aside for you. Something from my personal stash.',
      effects: [{ give: 'sweet_bun' }], next: 'menu',
    },
    m100: {
      speaker: M, portrait: 'blush', text: "So... the shop closes early on Sundays. If you're free, I wouldn't mind some company.",
      effects: [{ flag: 'mira.date_ready' }], next: 'menu',
    },
  },
};
