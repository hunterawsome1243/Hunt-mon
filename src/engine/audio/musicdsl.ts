/** Compact chiptune score format. Pure data + parsing so it can be tested without any audio hardware. */
export type Wave = 'pulse125' | 'pulse25' | 'pulse50' | 'triangle';

export interface Score {
  bpm: number;
  /** one chord per bar, e.g. 'Am', 'F', 'G7', 'Bbmaj7' */
  prog: string[];
  /** one string per bar, 16 sixteenth-steps each: "E5:2 G5:2 R:4 ..." */
  lead: string[];
  leadWave?: Wave;
  arp?: 'none' | 'up' | 'broken';
  bass?: 'none' | 'root8' | 'pulse' | 'walk';
  drums?: 'none' | 'light' | 'march' | 'drive';
  loop?: boolean;
  /** 0..1 overall level multiplier */
  vol?: number;
  vibrato?: boolean;
}

export interface NoteEv { step: number; dur: number; midi: number; ch: 'lead' | 'arp' | 'bass'; vel: number }
export interface DrumEv { step: number; kind: 'k' | 's' | 'h' }

const NOTE = /^([A-G])([#b]?)(-?\d)$/;
const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function midiOf(name: string): number {
  const m = NOTE.exec(name);
  if (!m) throw new Error(`bad note "${name}"`);
  return 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
export const freqOf = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

const QUAL: Record<string, number[]> = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6], sus: [0, 5, 7] };
export function chordTones(name: string): number[] {
  const m = /^([A-G][#b]?)(.*)$/.exec(name);
  if (!m || !(m[2] in QUAL)) throw new Error(`bad chord "${name}"`);
  const root = midiOf(`${m[1]}3`); // root in octave 3
  return QUAL[m[2]].map((i) => root + i);
}

export function parseBar(bar: string): Array<{ step: number; dur: number; midi: number | null }> {
  let step = 0;
  const out: Array<{ step: number; dur: number; midi: number | null }> = [];
  for (const tok of bar.trim().split(/\s+/)) {
    const [n, d] = tok.split(':');
    const dur = Number(d ?? 2);
    if (!Number.isFinite(dur) || dur <= 0) throw new Error(`bad duration in "${tok}"`);
    out.push({ step, dur, midi: n === 'R' ? null : midiOf(n) });
    step += dur;
  }
  return out;
}
export const barSteps = (bar: string): number => parseBar(bar).reduce((a, n) => a + n.dur, 0);

export interface Compiled { notes: NoteEv[]; drums: DrumEv[]; steps: number; stepSec: number }

/** Expands the score into absolute note/drum events (16 steps per bar). */
export function compile(s: Score): Compiled {
  const notes: NoteEv[] = [], drums: DrumEv[] = [];
  const bars = s.prog.length;
  for (let b = 0; b < bars; b++) {
    const base = b * 16;
    for (const n of parseBar(s.lead[b])) if (n.midi !== null) notes.push({ step: base + n.step, dur: n.dur, midi: n.midi, ch: 'lead', vel: 1 });
    const ch = chordTones(s.prog[b]);
    const hi = ch.map((m) => m + 24), root = ch[0] - 12, fifth = ch[Math.min(2, ch.length - 1)] - 12;
    if (s.arp && s.arp !== 'none') {
      const seq = s.arp === 'up' ? [hi[0], hi[1], hi[2], hi[1]] : [hi[0], hi[2], hi[1], hi[2], hi[0] + 12, hi[2], hi[1], hi[2]];
      const stepLen = s.arp === 'up' ? 2 : 2;
      for (let i = 0; i < 16 / stepLen; i++) notes.push({ step: base + i * stepLen, dur: stepLen, midi: seq[i % seq.length], ch: 'arp', vel: 0.6 });
    }
    if (s.bass && s.bass !== 'none') {
      if (s.bass === 'root8') for (let i = 0; i < 8; i++) notes.push({ step: base + i * 2, dur: 2, midi: i % 4 === 2 ? fifth : root, ch: 'bass', vel: 1 });
      else if (s.bass === 'pulse') for (let i = 0; i < 4; i++) notes.push({ step: base + i * 4, dur: 3, midi: i === 2 ? fifth : root, ch: 'bass', vel: 1 });
      else { const walk = [root, ch[1] - 12, fifth, ch[1] - 12]; for (let i = 0; i < 4; i++) notes.push({ step: base + i * 4, dur: 4, midi: walk[i], ch: 'bass', vel: 1 }); }
    }
    const d = s.drums ?? 'none';
    if (d !== 'none') for (let i = 0; i < 16; i++) {
      const beat = i % 4 === 0, off = i % 4 === 2;
      if (d === 'light') { if (i === 0 || i === 8) drums.push({ step: base + i, kind: 'k' }); if (i === 4 || i === 12) drums.push({ step: base + i, kind: 's' }); if (off) drums.push({ step: base + i, kind: 'h' }); }
      else if (d === 'march') { if (beat) drums.push({ step: base + i, kind: i % 8 === 0 ? 'k' : 's' }); if (i === 14) drums.push({ step: base + i, kind: 's' }); }
      else { if (beat) drums.push({ step: base + i, kind: 'k' }); if (i === 4 || i === 12) drums.push({ step: base + i, kind: 's' }); if (i % 2 === 0 && !beat) drums.push({ step: base + i, kind: 'h' }); if (i === 15) drums.push({ step: base + i, kind: 'h' }); }
    }
  }
  return { notes, drums, steps: bars * 16, stepSec: 60 / s.bpm / 4 };
}
