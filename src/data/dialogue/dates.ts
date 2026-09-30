import type { DialogueGraph, Expression } from '../types';
import { line, Nodes } from './factory';

/** Builds a linear date scene from [speaker, portrait, text] beats, with optional choices that only change flavour. */
function scene(id: string, npc: string, beats: Array<[string, Expression, string]>, done: string, choiceAt?: { after: number; prompt: string; options: Array<[string, string]> }): DialogueGraph {
  const nodes: Nodes = {};
  beats.forEach(([sp, pr, tx], i) => {
    const key = `b${i}`;
    const last = i === beats.length - 1;
    let next: string | undefined = last ? 'fin' : `b${i + 1}`;
    if (choiceAt && choiceAt.after === i) next = 'ch';
    nodes[key] = line(sp, pr, tx, next);
  });
  if (choiceAt) {
    nodes.ch = { speaker: '', text: choiceAt.prompt, choices: choiceAt.options.map(([t, resp], k) => ({ text: t, next: `ch${k}` })) };
    choiceAt.options.forEach(([, resp], k) => { nodes[`ch${k}`] = line(beats[choiceAt.after][0], 'blush', resp, `b${choiceAt.after + 1}`); });
  }
  nodes.fin = { effects: [{ flag: done }, { flag: `date.${npc}` }], next: 'out' };
  nodes.out = { effects: [{ cmd: 'return' }], end: true };
  return { id, npc, start: 'b0', nodes };
}

// ---- Mira: pond at dusk, sweet buns, Gran's story
export const DATE_MIRA = scene('date_mira', 'mira', [
  ['', 'neutral', 'Dusk settles over the pond. The water glows a soft orange, then violet. Fireflies drift between the reeds.'],
  ['Mira', 'happy', "I come here when the shop gets too quiet. It's the one place in Emberwick that's never crowded."],
  ['Mira', 'smug', "I brought buns. Gran's recipe — the first batch since you found the book. They're slightly burnt. On purpose. It's heritage."],
  ['', 'neutral', 'She hands you a warm bun. It is slightly burnt. It is also the best thing you have eaten all week.'],
  ['Mira', 'neutral', "She used to say a bun shared is worth two. I never understood it until recently."],
  ['Mira', 'blush', "I don't do this, you know. Sit by the water with someone. I'm usually the one behind the counter."],
  ['', 'neutral', 'A firefly lands on her shoulder. She holds very still, suddenly shy.'],
  ['Mira', 'blush', "...Can I say something ridiculous? I'm really glad you walked into my shop that first day."],
], 'mira.date_done', { after: 5, prompt: 'What do you say?', options: [['Me too.', "Yeah? Good. I was hoping that wasn't just me."], ['Your buns are great.', "...That is a weirdly specific compliment, and I'm taking it."], ['Hold her hand.', 'Oh. Okay. Warm hands. That\'s... new. Nice.']] });

// ---- Rhea: sunrise run on the east cliffs
export const DATE_RHEA = scene('date_rhea', 'rhea', [
  ['', 'neutral', 'Pre-dawn on the east cliffs. The sky is pink at the edges. Rhea is already stretching, bouncing on her heels.'],
  ['Rhea', 'smug', "Nice of you to show up. Ten laps of the ridge. Loser carries the picnic basket."],
  ['', 'neutral', 'You run. She pulls ahead, slows, waits, pulls ahead again. She is pretending not to show off. She is showing off.'],
  ['Rhea', 'happy', "Not bad! Okay, you're a solid runner. I might have to be nice to you."],
  ['', 'neutral', 'At the top of the ridge, the sun breaks over the horizon and the whole region turns gold.'],
  ['Rhea', 'neutral', "My dad used to bring me here when I was little. He'd say the day was a fresh match. You don't know the outcome yet."],
  ['Rhea', 'blush', "I've never told anyone I come up here to be scared before big battles. You were the first person I wanted to bring."],
  ['Rhea', 'blush', "...Okay. Breakfast time. I have cold dumplings. They're excellent. Don't laugh."],
], 'rhea.date_done', { after: 6, prompt: 'What do you say?', options: [["I'm honored.", "Stop it. You're going to make me blush. ...Too late."], ['Race you back?', 'Ha! There it is. The spark. Keep it. Go!'], ['Squeeze her hand.', 'Mm. Steady. I like steady.']] });

// ---- Ilsa: stargazing in Mistwood
export const DATE_ILSA = scene('date_ilsa', 'ilsa', [
  ['', 'neutral', 'The clearing in Mistwood is open to the sky. Glow flowers pulse softly in the grass. Above, the stars are impossibly sharp.'],
  ['Ilsa', 'happy', "I brought the small telescope. The big one is a heavy, resentful beast. This one is a friend."],
  ['Ilsa', 'neutral', "See that cluster? The old trainers called it 'the Hearth.' Here. Look."],
  ['', 'neutral', 'You lean in to the eyepiece. Her shoulder brushes yours. She says nothing about it. She also does not move.'],
  ['Ilsa', 'happy', "I've logged eleven thousand observations this year. None of them have ever made me feel like this."],
  ['Ilsa', 'blush', "I'm not good at this part. The part where I say the thing without calling it a hypothesis."],
  ['', 'neutral', 'A Dreamoth drifts over the clearing, scattering pale dust that glows like a thousand tiny lanterns.'],
  ['Ilsa', 'blush', "Hypothesis: I really like you, {player}. Conclusion: pending. Please stay to help me gather more data."],
], 'ilsa.date_done', { after: 5, prompt: 'What do you say?', options: [['Data it is.', "Excellent. I'll bring snacks for the next round of observations."], ['Kiss her cheek.', "Oh! Oh. Logged. Underlined. Starred. Emphasis."], ['Count stars with her.', 'One. Two. Three. ...I lost count at your smile. That was terrible. I apologize.']] });

// ---- Odette: after hours at the Moth & Mug
export const DATE_ODETTE = scene('date_odette', 'odette', [
  ['', 'neutral', 'Chairs on tables, lamps low. Rain on the window. The café smells like cinnamon and warm milk.'],
  ['Odette', 'happy', "I only do this after closing. No customers, no rush. Just a recipe and someone I like."],
  ['', 'neutral', 'She slides a steaming cup across the counter. A tiny moth is drawn in the foam.'],
  ['Odette', 'smug', "Taste it. Honestly. If it's sad, I'll remake it. I'll remake it all night if I have to."],
  ['', 'neutral', 'It is spiced, warm and a little bit sweet. It tastes like a story told by a fire.'],
  ['Odette', 'neutral', "When I couldn't travel anymore, I thought I'd lost the best part of my life. Then I started collecting other people's roads."],
  ['Odette', 'blush', "And then you walked in with yours. I'd like to add a line to the wall about you. If that's okay."],
  ['', 'neutral', 'She comes around the counter and, quietly, takes your hand. A soft song plays on the old radio.'],
], 'odette.date_done', { after: 6, prompt: 'What do you say?', options: [['Write it big.', "Oh, I will. In the brightest chalk I own."], ['Dance with her.', 'Slowly. Mind my knee. ...And you\'re leading. Good. I trust you.'], ['Drink the cocoa.', "Good. Stay for another. I'll tell you what's in it after you say you like me."]] });

export const DATE_GRAPHS: DialogueGraph[] = [DATE_MIRA, DATE_RHEA, DATE_ILSA, DATE_ODETTE];
