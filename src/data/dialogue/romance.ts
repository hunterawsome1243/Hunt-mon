import type { DialogueGraph } from '../types';
import { fx, line, Nodes, romanceGraph } from './factory';

/* ===========================================================================================
   The four romanceable adults. Each has a personality (see data/romance/profiles.ts), a short
   personal story told across the 25/50/75/100 affection milestones, a side quest, a special
   creature at 75 and a date cutscene at 100. Flirt lines are PG-13 and playful.
   =========================================================================================== */

// ------------------------------------------------------------------ MIRA (shopkeeper, 28)
const M = 'Mira';
const miraNodes: Nodes = {
  q_offer: line(M, 'neutral', "Actually... yes. I lost Gran's recipe book on Route 1 while hauling crates. Worn green cover, burnt corner. Silly to be this attached to a notebook.", 'q_offer2'),
  q_offer2: line(M, 'happy', "If you find it, I'll bake for a week. Somewhere near the trees west of the path, I think. Thank you, {player}.", 'menu', { effects: [fx.flag('mira.quest_active')] }),
  q_check: { branch: [{ cond: { has: 'recipe_book' }, next: 'q_done' }], speaker: M, portrait: 'neutral', text: "Not yet? No rush. Somewhere along Route 1, west of the path, near the trees.", next: 'menu' },
  q_done: line(M, 'surprised', "That's... that's her handwriting. You actually found it.", 'q_done2', { effects: [{ cmd: 'take', arg: 'recipe_book' }] }),
  q_done2: line(M, 'blush', "Here. Don't argue. The first batch is always for whoever earned it. Thank you, {player}. Really.", 'menu', {
    effects: [fx.give('sweet_bun', 3), fx.aff('mira', 12), fx.flag('mira.quest_done')],
  }),
  date_go: line(M, 'smug', "Okay. Close the shutters, grab a jacket. I know a spot.", undefined, { effects: [{ cmd: 'date', arg: 'mira' }], end: true }),
};
export const MIRA = romanceGraph({
  id: 'mira', name: M,
  intro: ["Welcome to my shop! I'm Mira. Potions, pouches, and unsolicited opinions, all at fair prices.", 'You must be {player}. Word travels fast in a town this small.'],
  greet: ['Back again, {player}?', 'Look who it is.', 'Need anything, or just admiring the shelves?'],
  greetClose: "There you are! I was just about to stop pretending I wasn't waiting.",
  shop: { label: 'Browse wares', shopId: 'mira', line: "Everything's priced fairly. Mostly. Take a look, boss." },
  menuExtra: [
    { text: 'Need any help?', cond: { all: [{ affection: 'mira', gte: 25 }, { notFlag: 'mira.quest_active' }, { notFlag: 'mira.quest_done' }] }, next: 'q_offer' },
    { text: 'The recipe book', cond: { all: [{ flag: 'mira.quest_active' }, { notFlag: 'mira.quest_done' }] }, next: 'q_check' },
    { text: 'Go for a walk', cond: { all: [{ flag: 'romance.mira.m100' }, { notFlag: 'mira.date_done' }] }, next: 'date_go' },
  ],
  chats: [
    { label: 'How is business?', bonus: 3, text: ['Steady. Trainers always need supplies, and they always forget them. I never run out of customers.'] },
    { label: 'Why open a shop here?', text: ['I grew up two towns over. Emberwick smelled like fresh bread and adventure.', 'Half of that turned out to be true.'] },
    { label: 'Tell me about Gran', cond: { affection: 'mira', gte: 25 }, bonus: 4, text: ['Gran taught me everything. Prices, patience, and how to tell haggling from hardship.', 'She passed a couple of winters ago. I never put my name on the sign. Everyone here knows whose shop it really is.'] },
    { label: 'What do you do for fun?', text: ["Fun? I read delivery manifests. ...Kidding. I bake. Badly. Ask me again when I'm feeling brave."] },
    { label: 'Know Rhea?', cond: { flag: 'rhea.intro' }, text: ['The gym leader? She buys potions in bulk and insists they are "for the team." Her team has never once been hurt.', 'I like her. Don\'t tell her.'] },
  ],
  flirts: [
    { text: 'Prices are criminal.', trait: 'witty', love: 'Ha! Okay, that one landed. Report me to the authorities. They will side with inflation.' },
    { text: 'Love your laugh.', trait: 'sincere', love: "...Thanks. That's the nicest thing anyone's said to me across this counter. And I've been called 'the nice one'." },
    { text: 'Come here often?', trait: 'cheeky', love: "Every day. I live here. ...That's the joke, isn't it. Fine. Good one.", eye: 'Come here often? Buddy, I own the building.' },
    { text: 'Nice shop. Nicer you.', trait: 'smooth', eye: "Mm. Smooth. Like a countertop. Next." },
    { text: 'Bet I make you blush.', trait: 'bold', forward: 30, eye: "Bet you can't, and I'd hate to watch you try." },
  ],
  react: {
    love: ["Hm. Now I'm smiling and I hate that you saw it.", "...You're annoyingly charming. Keep that up and I'll have to raise my prices."],
    meh: ['Mm-hm. Cute. Anything else?', 'Points for effort.', 'Bless your heart. Try again?'],
    eye: ['Really? Did that ever work on anyone?', '*eye roll* I\'ve heard better from the delivery goblins.', 'Wow. Bold. Wrong, but bold.'],
    pushy: "Okay, that's enough. I have a shop to run. Come back tomorrow, {player}.",
    brushed: 'Not today, {player}. I said what I said.',
  },
  gift: {
    love: "You remembered what I like? Okay, now I'm the one who's flustered. Thank you, {player}.",
    like: "Oh, that's thoughtful. Thanks!",
    hate: "...Is this a joke? I'll put it... somewhere. Far away.",
    again: "One gift a day, romeo. I have to stretch these out.",
  },
  bye: 'Come back soon. Try not to get eaten by anything.',
  milestoneStart: { 25: 'm25', 50: 'm50', 75: 'm75', 100: 'm100' },
  milestones: {
    25: { m25: line(M, 'happy', "You know, you're growing on me. Like moss. Charming, slightly damp moss.", 'm25b'), m25b: line(M, 'neutral', "The shop gets quiet after sunset. It's... nice having someone to talk to. Ask if I need help with anything, okay?", 'menu') },
    50: { m50: line(M, 'blush', "Friends-and-family discount, {player}. Don't tell the others. They'd riot.", 'm50b', { effects: [fx.flag('mira.discount')] }), m50b: line(M, 'smug', "Also — found this in a crate. Thought of you. Don't read into it.", 'menu', { effects: [fx.give('shiny_pebble')] }) },
    75: {
      m75: line(M, 'happy', "Gran's oven always had a stray cub curled up under it. This one decided you were better company than me. Rude.", 'm75b'),
      m75b: line(M, 'blush', "Take care of her. ...And yourself. I mean it.", 'menu', { effects: [{ creature: 'honeypaw', level: 10 }, fx.flag('mira.honeypaw')] }),
    },
    100: { m100: line(M, 'blush', "So. The shop closes early on Sundays. If you're free, I wouldn't mind some company down by the pond.", 'menu', { effects: [fx.flag('mira.date_ready')] }) },
  },
  nodes: miraNodes,
});

// ------------------------------------------------------------------ RHEA (gym leader, 31)
const R = 'Rhea';
const rheaNodes: Nodes = {
  challenge: {
    speaker: R, portrait: 'smug', text: "You want the Cinder Badge? Then show me. Three creatures each. No excuses, no mercy, plenty of respect.",
    choices: [{ text: "I'm ready.", next: 'fight' }, { text: 'Not yet.', next: 'menu' }],
  },
  fight: { effects: [{ cmd: 'battle', arg: 'rhea' }], branch: [{ cond: { var: 'battle.won', op: '==', value: 1 }, next: 'won' }], next: 'lost' },
  lost: line(R, 'smug', "Good fight. Heal up and come back. I'll be right here, being unbeaten.", 'menu'),
  won: line(R, 'surprised', "...Huh. I felt that in my knees. Fine. That was a real battle.", 'won2'),
  won2: line(R, 'happy', "The Cinder Badge is yours, {player}. Wear it like you earned it, because you did.", 'won3', { effects: [{ cmd: 'badge', arg: 'cinder' }, fx.give('super_potion', 3)] }),
  won3: line(R, 'neutral', "Word of advice: something strange is dimming the lights out east. Dr. Ilsa thinks it starts in the forest. Go see her.", 'menu', { effects: [fx.flag('quest.mistwood_open')] }),
  rematch: { effects: [{ cmd: 'battle', arg: 'rhea_rematch' }], next: 'rematch_end' },
  rematch_end: line(R, 'smug', "Still sharp. I like that.", 'menu'),
  q_offer: line(R, 'neutral', "There's a wristband my father wore for thirty years of matches. I lost it on the Route 2 cliffs during a morning run. Don't laugh. I've searched twice.", 'q_offer2'),
  q_offer2: line(R, 'annoyed', "...Fine, laugh a little. But if you see a faded blue band up there, I'd be in your debt.", 'menu', { effects: [fx.flag('rhea.quest_active')] }),
  q_check: { branch: [{ cond: { has: 'lucky_band' }, next: 'q_done' }], speaker: R, portrait: 'neutral', text: "Faded blue wristband. East cliffs, Route 2. Take your time. ...Not too much time.", next: 'menu' },
  q_done: line(R, 'surprised', "That's it. That's his band.", 'q_done2', { effects: [{ cmd: 'take', arg: 'lucky_band' }] }),
  q_done2: line(R, 'blush', "I don't... say thanks well. So here's a plan: you win something big, and I'll be the loudest person in the crowd. Deal?", 'menu', { effects: [fx.aff('rhea', 12), fx.flag('rhea.quest_done'), fx.give('power_band')] }),
  date_go: line(R, 'smug', "Sunrise run. Keep up if you can, {player}. I'll buy breakfast if you do.", undefined, { effects: [{ cmd: 'date', arg: 'rhea' }], end: true }),
};
export const RHEA = romanceGraph({
  id: 'rhea', name: R,
  intro: ["So you're the new challenger. I'm Rhea, leader of the Brindlemoor Gym. Fists up, manners optional.", 'Beat my trainers, then come find me.'],
  greet: ['Training or talking?', "You're early. Good.", 'Stretch first. Conversation second.'],
  greetClose: "Hey, you. I was hoping you'd stop by. Not that I was standing here on purpose.",
  menuExtra: [
    { text: 'Challenge the gym', cond: { notFlag: 'badge.cinder' }, next: 'challenge' },
    { text: 'Rematch!', cond: { flag: 'badge.cinder' }, next: 'rematch' },
    { text: 'Need any help?', cond: { all: [{ affection: 'rhea', gte: 25 }, { notFlag: 'rhea.quest_active' }, { notFlag: 'rhea.quest_done' }] }, next: 'q_offer' },
    { text: 'The wristband', cond: { all: [{ flag: 'rhea.quest_active' }, { notFlag: 'rhea.quest_done' }] }, next: 'q_check' },
    { text: 'Go for a run', cond: { all: [{ flag: 'romance.rhea.m100' }, { notFlag: 'rhea.date_done' }] }, next: 'date_go' },
  ],
  chats: [
    { label: 'Why fight?', bonus: 3, text: ["Because it's honest. You can lie with words all day. A battle tells you exactly who someone is under pressure."] },
    { label: 'About the gym', text: ['My father ran it before me. Forty years, never a dull day. His knees gave out, not his spirit.', 'I took over at twenty-four. Everyone expected him to come back within a month.'] },
    { label: 'Do you ever lose?', cond: { affection: 'rhea', gte: 25 }, bonus: 4, text: ['Constantly. Just not here. Out there I lose plenty. Sparring, tournaments, arguments with my own reflection.', "Here it's my house. People need someone steady. I can be that. Some days it costs me more than I let on."] },
    { label: 'Favorite food?', text: ["Protein and more protein. And a slice of Odette's lemon cake after a hard day. Do NOT tell my trainers."], portrait: 'smug' },
    { label: 'Seen Mira lately?', cond: { flag: 'mira.intro' }, text: ['The shopkeeper? Sharp as a tack. I respect anyone who can make me laugh and overcharge me in the same sentence.'] },
  ],
  flirts: [
    { text: "You're formidable.", trait: 'sincere', love: "...Coming from someone who took a hit like that? I'll take it. I'm smiling, don't stare." },
    { text: 'Race you to lunch.', trait: 'bold', forward: 20, love: "Oh, you're on. Loser pays. And I do not lose. ...Much.", eye: "Bit early to be daring me, rookie." },
    { text: 'Bring it, Champ.', trait: 'bold', love: 'There it is. That spark. Keep it, you will need it.' },
    { text: 'Hello, gorgeous!', trait: 'smooth', eye: 'Smooth-talking a person who bench-presses creatures before breakfast is a bold choice.' },
    { text: 'You wear cape well.', trait: 'goofy', eye: "...I am not wearing a cape. Did you hit your head?" },
    { text: 'You make tough look kind.', trait: 'sweet', love: "That was... actually really nice. Okay. Okay. I need to go lift something heavy." },
  ],
  react: {
    love: ['Not bad. Not bad at all.', "Careful. That's the kind of line that gets a person a rematch. Or something else."],
    meh: ['Huh. Okay.', 'Interesting strategy. Needs work.', "I've had worse warm-ups."],
    eye: ["Seriously? That's your opener?", 'I\'ve been hit harder, and with more conviction.', "No. But I admire the confidence."],
    pushy: 'Time out. Take a lap, {player}. Come back tomorrow when you remember how to knock.',
    brushed: 'Nope. You had your round for today.',
  },
  gift: {
    love: "A gift? For me? ...Okay, this is great. Thank you, {player}. I'm going to pretend I'm not grinning.",
    like: 'Thanks! That was thoughtful.',
    hate: "Huh. Not quite my thing. But I appreciate the gesture. I guess.",
    again: 'One gift a day, challenger. The gym has rules, and they apply to me too.',
  },
  bye: 'Go train. Or rest. Both are allowed.',
  milestoneStart: { 25: 'm25', 50: 'm50', 75: 'm75', 100: 'm100' },
  milestones: {
    25: { m25: line(R, 'neutral', "Can I admit something? Before matches, I get nervous. Hands shake, knees wobble. Nobody sees it.", 'm25b'), m25b: line(R, 'smug', "You've seen it now. Consider yourself trusted. Also, sworn to secrecy.", 'menu') },
    50: { m50: line(R, 'happy', "You fight like someone who's having fun. I forgot what that looked like.", 'm50b'), m50b: line(R, 'blush', 'Take this. A gift for the road. A little thing I would\'ve been embarrassed to say out loud.', 'menu', { effects: [fx.give('trail_bar', 3), fx.flag('rhea.rematch_open')] }) },
    75: {
      m75: line(R, 'neutral', "This little one is the first creature I ever raised. It's stubborn, loyal, and hits like a wrecking ball.", 'm75b'),
      m75b: line(R, 'blush', "Take good care of Ironpaw. And of yourself. That last part is an order.", 'menu', { effects: [{ creature: 'ironpaw', level: 14 }, fx.flag('rhea.ironpaw')] }),
    },
    100: { m100: line(R, 'blush', "I run at sunrise on the east cliffs. Every day. Nobody's ever come along. ...Would you?", 'menu', { effects: [fx.flag('rhea.date_ready')] }) },
  },
  nodes: rheaNodes,
});

// ------------------------------------------------------------------ ILSA (researcher, 30)
const I = 'Ilsa';
const ilsaNodes: Nodes = {
  parcel: { branch: [{ cond: { has: 'parcel' }, next: 'parcel_give' }], next: 'menu' },
  parcel_give: line(I, 'surprised', 'Is that the parcel from the Elder?! Oh, finally — my spare lens. You have no idea how much I needed this.', 'parcel2', { effects: [{ cmd: 'take', arg: 'parcel' }, fx.flag('quest.parcel_done')] }),
  parcel2: line(I, 'happy', "I'm Dr. Ilsa Varga, field researcher. I study the glow — the soft light that lives in this region's stones, and in some creatures. It has been dimming.", 'parcel3'),
  parcel3: line(I, 'neutral', "If you win the Cinder Badge from Rhea, come find me. I'll need help with Mistwood. Here — a little research grant for your trouble.", 'menu', { effects: [fx.give('hyper_potion'), fx.aff('ilsa', 2)] }),
  q_offer: line(I, 'neutral', "I'm building a field log of local creatures. Observation matters more than my own notes. If you can register ten different species in your Dex, I'll have real data to work with.", 'q_offer2'),
  q_offer2: line(I, 'happy', "Ten species, caught or seen. Bring it to me and I'll make it worth your while.", 'menu', { effects: [fx.flag('ilsa.quest_active')] }),
  q_check: { branch: [{ cond: { dexCaught: 10 }, next: 'q_done' }], speaker: I, portrait: 'neutral', text: "Not quite ten yet. Seen counts as data too, but I love when you bring them home safely.", next: 'menu' },
  q_done: line(I, 'surprised', "Ten species! Do you realize this triples my sample set? Come here. I want to shake your hand. Enthusiastically.", 'q_done2'),
  q_done2: line(I, 'blush', "Thank you, {player}. Really. For the first time in a year, it feels like my work is going somewhere.", 'menu', { effects: [fx.aff('ilsa', 12), fx.flag('ilsa.quest_done'), fx.give('pocket_gadget')] }),
  date_go: line(I, 'happy', "Tonight's clear. The Dreamoths are out, the canopy is open — let me show you the sky. Bring a jacket!", undefined, { effects: [{ cmd: 'date', arg: 'ilsa' }], end: true }),
  where: line(I, 'neutral', "I follow the glow. It started in Hollowdeep and it is fading outward. I'll set up camp wherever the data leads.", 'menu'),
};
export const ILSA = romanceGraph({
  id: 'ilsa', name: I,
  intro: ["Oh! A visitor. Watch the cables — they're everywhere. I'm Ilsa, researcher.", "You look like someone who notices things. That's my favorite kind of person."],
  greet: ['Fascinating timing, {player}.', 'Hello! I was just talking to a notebook.', "Perfect. I needed a second opinion."],
  greetClose: "{player}! I saved you the good tea. Also three new observations. Mostly about you, honestly.",
  entryBranch: [{ cond: { all: [{ has: 'parcel' }, { notFlag: 'quest.parcel_done' }] }, next: 'parcel' }],
  menuExtra: [
    { text: 'Where do you camp?', next: 'where' },
    { text: 'Field log help?', cond: { all: [{ affection: 'ilsa', gte: 25 }, { notFlag: 'ilsa.quest_active' }, { notFlag: 'ilsa.quest_done' }] }, next: 'q_offer' },
    { text: 'About the field log', cond: { all: [{ flag: 'ilsa.quest_active' }, { notFlag: 'ilsa.quest_done' }] }, next: 'q_check' },
    { text: 'Stargaze together', cond: { all: [{ flag: 'romance.ilsa.m100' }, { notFlag: 'ilsa.date_done' }] }, next: 'date_go' },
  ],
  chats: [
    { label: 'What is the glow?', bonus: 3, text: ["Light in the stones. Some creatures store it, some follow it. My theory: it's memory. Warmth, stored as light.", 'My colleagues say that is unscientific. My data says they are not reading the data.'] },
    { label: 'Why the field life?', text: ['Labs are quiet. Out here, the research walks up and sneezes on you.'] },
    { label: 'Do you get lonely?', cond: { affection: 'ilsa', gte: 25 }, bonus: 4, text: ["Only when I stop moving. Which is why I don't, mostly. But I'm realizing I like having someone to tell things to.", 'Most of my findings have only ever been shared with a notebook. The notebook does not laugh at my jokes.'] },
    { label: 'Favorite creature?', text: ['Wispling. A little lantern with opinions. The Dex entry undersells them.'], portrait: 'happy' },
    { label: 'Met Odette?', cond: { flag: 'odette.intro' }, text: ['The café owner? She knows every story in town. I borrow her chalkboard for field notes. She charges me in pastries.'] },
  ],
  flirts: [
    { text: 'You glow like data.', trait: 'nerdy', love: "That... is the most ridiculous thing anyone's said to me. Do it again." },
    { text: 'Your theories fascinate me.', trait: 'sincere', love: "Fascinate? You mean it? Nobody has ever said that. Say it again, slowly, so I can log it." },
    { text: 'Can I observe you?', trait: 'goofy', love: "You want to *observe* me? That is, statistically, the most romantic thing a person has said in my field.", eye: "Please don't say 'observe' like that. It's deeply unsettling." },
    { text: 'Bet I can impress you.', trait: 'bold', forward: 30, eye: "I am a scientist, {player}. You'd need a control group." },
    { text: 'Smooth as a hypothesis.', trait: 'cheeky', eye: 'Is that a pick-up line, or an insult to my methodology?' },
  ],
  react: {
    love: ["I... lost my train of thought. Which never happens. That is data.", "Hm. My pulse just did something uncontrolled. Fascinating."],
    meh: ['Interesting. Inconclusive. Try again?', 'I follow... about half of that.', 'Mm. Noted.'],
    eye: ['Sorry — I think my face just did the thing where it tells you no.', 'That line is not peer-reviewed.', "Yikes. Let's pretend we both saw a bird instead."],
    pushy: "I need some space, please. Come back tomorrow — I'd like to talk about creatures again.",
    brushed: "Not now, {player}. Maybe tomorrow. My notebooks need me.",
  },
  gift: {
    love: "For me?! This is exactly what I needed. How did you know? ...Don't tell me. I'll log it as magic.",
    like: "Oh, thank you! That's kind.",
    hate: "Ah... thanks. I'll, um, put it with the other specimens I can't identify.",
    again: 'Only one gift a day? Even I have a rate limit. Come back tomorrow.',
  },
  bye: 'Stay curious. And hydrated.',
  milestoneStart: { 25: 'm25', 50: 'm50', 75: 'm75', 100: 'm100' },
  milestones: {
    25: { m25: line(I, 'neutral', "I should tell you why I chase the glow. My mentor worked here for decades. He believed it was a language. He didn't live to prove it.", 'm25b'), m25b: line(I, 'happy', "I'd like to. For him. Thank you for listening, {player}. It helps.", 'menu') },
    50: { m50: line(I, 'happy', "Your observations have been better than half the lab's. Keep this — a proper field lens. It sees the glow even when the light is low.", 'menu', { effects: [fx.give('glow_lens'), fx.flag('ilsa.lens')] }) },
    75: {
      m75: line(I, 'blush', "Quillbit was my assistant for two seasons. It listens better than any colleague. It asked — well, it did something very loud — to go with you.", 'm75b'),
      m75b: line(I, 'happy', "Take it. Treat it kindly. I'll miss it. Not you. ...Both. Both!", 'menu', { effects: [{ creature: 'quillbit', level: 18 }, fx.flag('ilsa.quillbit')] }),
    },
    100: { m100: line(I, 'blush', "There's a clearing in Mistwood where the canopy opens. On clear nights, the stars look close enough to log. Want to see?", 'menu', { effects: [fx.flag('ilsa.date_ready')] }) },
  },
  nodes: ilsaNodes,
});

// ------------------------------------------------------------------ ODETTE (café owner, 29)
const O = 'Odette';
const odetteNodes: Nodes = {
  q_offer: line(O, 'neutral', "My best recipe needs Glowcap tea — a rare leaf that grows along the Mistwood paths. I can't walk that far anymore. Not with this knee.", 'q_offer2'),
  q_offer2: line(O, 'happy', "If you spot a sparkle by the forest floor, that'll be it. I'd pay in cake. And kindness.", 'menu', { effects: [fx.flag('odette.quest_active')] }),
  q_check: { branch: [{ cond: { has: 'tea_leaves' }, next: 'q_done' }], speaker: O, portrait: 'neutral', text: 'Glowcap leaves, Mistwood. They shimmer when the light is right.', next: 'menu' },
  q_done: line(O, 'surprised', 'The real Glowcap! Smell that — earthy, green, a little sweet. You are wonderful.', 'q_done2', { effects: [{ cmd: 'take', arg: 'tea_leaves' }] }),
  q_done2: line(O, 'blush', "Sit. Drink. Tell me everything you saw out there. That's the real payment, honestly.", 'menu', { effects: [fx.aff('odette', 12), fx.flag('odette.quest_done'), fx.give('cocoa', 3)] }),
  date_go: line(O, 'smug', "Closing time. Lights low, music on, two cups. You up for a tasting menu of one?", undefined, { effects: [{ cmd: 'date', arg: 'odette' }], end: true }),
};
export const ODETTE = romanceGraph({
  id: 'odette', name: O,
  intro: ["Welcome to the Moth & Mug! I'm Odette. Sit anywhere — the chalkboard wall is for stories.", "Every traveler leaves one. What's yours?"],
  greet: ["The usual, {player}? Kidding. Today it's whatever you're feeling.", 'Hello again! The pastries were baking for you.', 'Take a seat, {player}.'],
  greetClose: "There's my favorite regular. I set your cup out before you even walked in.",
  shop: { label: 'See the menu', shopId: 'cafe', line: 'Everything is made fresh. If it tastes sad, tell me. I\'ll fix it.' },
  menuExtra: [
    { text: 'Need any help?', cond: { all: [{ affection: 'odette', gte: 25 }, { notFlag: 'odette.quest_active' }, { notFlag: 'odette.quest_done' }] }, next: 'q_offer' },
    { text: 'The Glowcap tea', cond: { all: [{ flag: 'odette.quest_active' }, { notFlag: 'odette.quest_done' }] }, next: 'q_check' },
    { text: 'Stay after closing', cond: { all: [{ flag: 'romance.odette.m100' }, { notFlag: 'odette.date_done' }] }, next: 'date_go' },
  ],
  chats: [
    { label: 'Tell me about the café', bonus: 3, text: ["I wanted a place where travelers could rest. Somewhere that remembers their stories.", "Every scribble on that wall is someone's best day, or worst day, or both."] },
    { label: 'Were you a trainer?', text: ["Ten years. Stone-and-frost team, all over the region. Then a bad fall in Hollowdeep, a knee that never forgave me, and a lot of soul searching."] },
    { label: 'Do you miss it?', cond: { affection: 'odette', gte: 25 }, bonus: 4, text: ['Every day. The road, the danger, the first look at a new place.', "But here, I get to hear every road. Thousands. It's not the same. But it's enough. Most days."] },
    { label: 'Favorite drink?', text: ['Hot cocoa with a pinch of salt. Everyone thinks I\'m joking. Nobody has ever sent it back.'], portrait: 'happy' },
    { label: 'How is Ilsa?', cond: { flag: 'ilsa.intro' }, text: ['The researcher? She pays me in field notes. Brilliant, rumpled, allergic to sleep. I adore her.'] },
  ],
  flirts: [
    { text: 'You light up this place.', trait: 'sweet', love: "Oh... that's sweet. I'm going to be thinking about that while I steam milk for the next hour." },
    { text: 'Be still, my cocoa.', trait: 'smooth', love: "Smooth. I'm smiling into the foam. Well played, {player}." },
    { text: 'Your smile is a story.', trait: 'sincere', love: "...That might be my new favorite chalkboard line." },
    { text: 'Are you a muffin?', trait: 'goofy', eye: 'A muffin? Sweetheart, I have standards. And also I do sell muffins, so that\'s just confusing.' },
    { text: 'Seen my heart?', trait: 'cheeky', eye: 'Lost and found is behind the counter. Try again, {player}.' },
  ],
  react: {
    love: ["You're good at this. Suspiciously good.", "Well now. I'll be smiling at the espresso machine for an hour."],
    meh: ["That's... a line. Thank you?", 'Sweet of you to try.', 'I need a moment to process that.'],
    eye: ['Mmm, no. Let me put that back on the shelf.', 'Oh dear.', "That's... a choice."],
    pushy: "I think you should go cool off. Come back tomorrow and order something.",
    brushed: "Not today, {player}. Order a cocoa. Stay quiet. It helps.",
  },
  gift: {
    love: "For me? Oh, you didn't have to... but I'm so glad you did. This is perfect.",
    like: 'How lovely. Thank you.',
    hate: "Oh... thank you. That's... very thoughtful of you to try.",
    again: 'You spoil me, but only one per day, dear. Save something for tomorrow.',
  },
  bye: 'Safe travels. Leave a story on the wall before you go!',
  milestoneStart: { 25: 'm25', 50: 'm50', 75: 'm75', 100: 'm100' },
  milestones: {
    25: { m25: line(O, 'neutral', "The chalkboard wall started as a joke. Some traveler dared me to keep every story I heard. Five years later, it's the heart of the place.", 'm25b'), m25b: line(O, 'happy', "I like that you stay long enough to read it. Most people only glance.", 'menu') },
    50: { m50: line(O, 'blush', "Your cup is free from now on, regular. No arguing. A barista's prerogative.", 'm50b', { effects: [fx.flag('odette.free_cocoa')] }), m50b: line(O, 'happy', 'And this is the recipe for my house cocoa. Do not share it with Rhea. She\'ll drink it all.', 'menu', { effects: [fx.give('cocoa', 5)] }) },
    75: {
      m75: line(O, 'neutral', "Cocoamoth started as a stowaway in a flour sack. Now it naps on the pastry case. It has decided you are family.", 'm75b'),
      m75b: line(O, 'blush', "Take it with you. It should see the world. ...Bring it back for breakfast, though.", 'menu', { effects: [{ creature: 'cocoamoth', level: 16 }, fx.flag('odette.cocoamoth')] }),
    },
    100: { m100: line(O, 'blush', "After closing, I like to try new recipes. Usually alone. ...Would you like to stay and taste something?", 'menu', { effects: [fx.flag('odette.date_ready')] }) },
  },
  nodes: odetteNodes,
});

export const ROMANCE_GRAPHS: DialogueGraph[] = [MIRA, RHEA, ILSA, ODETTE];
