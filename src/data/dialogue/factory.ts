import type { Cond, DialogueChoice, DialogueGraph, DialogueNode, Effect, Expression, Trait } from '../types';

export type Nodes = Record<string, DialogueNode>;

/** Tiny authoring helper: a spoken line. */
export const line = (speaker: string, portrait: Expression, text: string, next?: string, extra: Partial<DialogueNode> = {}): DialogueNode => ({ speaker, portrait, text, next, ...extra });

export interface FlirtLine {
  text: string; trait: Trait; forward?: number;
  /** custom reactions for this line (fall back to the NPC's generic pool) */
  love?: string; eye?: string;
}
export interface ChatTopic {
  label: string;
  text: string[];
  /** one-time affection bonus for showing interest */
  bonus?: number;
  cond?: Cond;
  portrait?: Expression;
}
export interface RomanceCfg {
  id: string;            // graph id == npc id
  name: string;
  intro: string[];
  greet: string[];       // random greeting (first is main, rest alts)
  greetClose: string;
  shop?: { label: string; shopId: string; line: string };
  /** extra main-menu entries (side quests, challenges...) */
  menuExtra?: Array<DialogueChoice>;
  chats: ChatTopic[];
  flirts: FlirtLine[];
  react: { love: string[]; meh: string[]; eye: string[]; pushy: string; brushed: string };
  gift: { love: string; like: string; hate: string; again: string };
  bye: string;
  milestones: { 25: Nodes; 50: Nodes; 75: Nodes; 100: Nodes };
  /** entry node of each milestone scene inside `milestones` */
  milestoneStart: { 25: string; 50: string; 75: string; 100: string };
  /** extra nodes (side quest dialogue, date trigger...) */
  nodes?: Nodes;
  /** override the first branch rules of the entry node */
  entryBranch?: Array<{ cond: Cond; next: string }>;
  dateCond?: Cond;
}

/** Builds the standard romanceable-NPC conversation hub: greet / shop / gift / chat / flirt with personality-driven reactions. */
export function romanceGraph(c: RomanceCfg): DialogueGraph {
  const N = c.name, id = c.id;
  const n: Nodes = {};
  n.entry = {
    branch: [
      ...(c.entryBranch ?? []),
      { cond: { notFlag: `${id}.intro` }, next: 'intro' },
      { cond: { affection: id, gte: 50 }, next: 'greet_close' },
    ],
    next: 'greet',
  };
  c.intro.forEach((t, i) => {
    n[i === 0 ? 'intro' : `intro${i}`] = line(N, i === 0 ? 'neutral' : 'smug', t, i < c.intro.length - 1 ? `intro${i + 1}` : 'menu', i === 0 ? { effects: [{ flag: `${id}.intro` }] } : {});
  });
  n.greet = line(N, 'neutral', c.greet[0], 'menu', { alts: c.greet.slice(1) });
  n.greet_close = line(N, 'happy', c.greetClose, 'menu');

  const menu: DialogueChoice[] = [];
  if (c.shop) menu.push({ text: c.shop.label, next: 'shop' });
  menu.push({ text: 'Give a gift', next: 'gift' }, { text: 'Chat', next: 'chat' }, { text: 'Flirt', next: 'flirt_gate' }, ...(c.menuExtra ?? []), { text: 'Leave', next: 'bye' });
  n.menu = { hub: true, speaker: N, portrait: 'neutral', text: 'What can I do for you?', choices: menu };
  if (c.shop) n.shop = line(N, 'smug', c.shop.line, 'menu', { effects: [{ cmd: 'shop', arg: c.shop.shopId }] });

  n.gift = {
    effects: [{ cmd: 'gift', arg: id }],
    branch: [1, 2, 3, 4].map((v, i) => ({ cond: { var: 'gift.result', op: '==' as const, value: v }, next: ['gift_love', 'gift_like', 'gift_hate', 'gift_again'][i] })),
    next: 'menu',
  };
  n.gift_love = line(N, 'blush', c.gift.love, 'menu');
  n.gift_like = line(N, 'happy', c.gift.like, 'menu');
  n.gift_hate = line(N, 'annoyed', c.gift.hate, 'menu');
  n.gift_again = line(N, 'smug', c.gift.again, 'menu');

  n.chat = {
    speaker: N, portrait: 'neutral', text: 'Ask away.',
    choices: [...c.chats.map((t, i) => ({ text: t.label, next: `chat_${i}`, cond: t.cond })), { text: 'Never mind', next: 'menu' }],
  };
  c.chats.forEach((t, i) => {
    t.text.forEach((tx, k) => {
      const last = k === t.text.length - 1;
      n[k === 0 ? `chat_${i}` : `chat_${i}_${k}`] = line(N, t.portrait ?? 'neutral', tx, last ? (t.bonus ? `chat_${i}_b` : 'menu') : `chat_${i}_${k + 1}`);
    });
    if (t.bonus) n[`chat_${i}_b`] = { branch: [{ cond: { flag: `${id}.chat${i}` }, next: 'menu' }], speaker: N, portrait: 'happy', text: 'Thanks for listening. Not many people ask.', effects: [{ flag: `${id}.chat${i}` }, { affection: id, delta: t.bonus }], next: 'menu' };
  });

  n.flirt_gate = { branch: [{ cond: { brushed: id }, next: 'brushed_now' }], next: 'flirt_menu' };
  n.brushed_now = line(N, 'annoyed', c.react.brushed, 'menu');
  n.flirt_menu = {
    text: 'You put on your most charming smile...',
    choices: [
      ...c.flirts.map((f, i): DialogueChoice => ({
        text: f.text, flirt: { trait: f.trait, forward: f.forward },
        outcomes: { ...(f.love ? { love: `r_love_${i}` } : {}), ...(f.eye ? { eye_roll: `r_eye_${i}` } : {}) },
      })),
      { text: 'Actually, never mind.', next: 'menu' },
    ],
  };
  c.flirts.forEach((f, i) => {
    if (f.love) n[`r_love_${i}`] = line(N, 'blush', f.love, 'menu');
    if (f.eye) n[`r_eye_${i}`] = line(N, 'annoyed', f.eye, 'menu');
  });
  n.r_love = line(N, 'blush', c.react.love[0], 'menu', { alts: c.react.love.slice(1) });
  n.r_meh = line(N, 'neutral', c.react.meh[0], 'menu', { alts: c.react.meh.slice(1) });
  n.r_eye = line(N, 'annoyed', c.react.eye[0], 'menu', { alts: c.react.eye.slice(1) });
  n.r_pushy = line(N, 'annoyed', c.react.pushy, undefined, { end: true });
  n.r_brushed = line(N, 'annoyed', c.react.brushed, 'menu');
  n.bye = line(N, 'neutral', c.bye, undefined, { end: true });

  Object.assign(n, c.milestones[25], c.milestones[50], c.milestones[75], c.milestones[100], c.nodes ?? {});
  return {
    id, npc: id, start: 'entry', nodes: n,
    react: { love: 'r_love', like: 'r_meh', meh: 'r_meh', eye_roll: 'r_eye', pushy: 'r_pushy', brushed: 'r_brushed' },
    milestones: { 25: c.milestoneStart[25], 50: c.milestoneStart[50], 75: c.milestoneStart[75], 100: c.milestoneStart[100] },
  };
}

export const fx = {
  flag: (k: string): Effect => ({ flag: k }),
  aff: (npc: string, delta: number): Effect => ({ affection: npc, delta }),
  give: (item: string, qty = 1): Effect => ({ give: item, qty }),
};
