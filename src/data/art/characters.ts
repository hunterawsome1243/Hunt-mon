import { PixelBuffer } from '../../engine/gfx/PixelBuffer';

export interface Look { skin: string; hair: string; shirt: string; pants: string; hairStyle?: 'short' | 'long' | 'cap'; accent?: string }

export const shade = (hex: string, k: number): string => {
  const n = (i: number) => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k)));
  return '#' + [1, 3, 5].map((i) => n(i).toString(16).padStart(2, '0')).join('');
};

// palette idx: 1 outline, 2 skin, 3 skin shade, 4 hair, 5 hair light, 6 shirt, 7 shirt shade, 8 pants, 9 shoes, 10 white, 11 eye, 12 accent
const W = 16, H = 22;

function frame(look: Look, dir: 'down' | 'up' | 'side', step: 0 | 1 | 2): PixelBuffer {
  const pal = ['', '#2a1d2e', look.skin, shade(look.skin, 0.85), look.hair, shade(look.hair, 1.5), look.shirt, shade(look.shirt, 0.75), look.pants, '#3a2a2a', '#ffffff', '#2a1d2e', look.accent ?? look.shirt];
  const b = new PixelBuffer(W, H, pal);
  const bob = step === 0 ? 0 : 1; // head/body bob during steps
  const y0 = 2 + bob;
  // legs
  const lLift = step === 1 ? 1 : 0, rLift = step === 2 ? 1 : 0;
  if (dir === 'side') {
    const a = step === 0 ? 0 : step === 1 ? -2 : 2;
    b.rect(6 + a, 17, 3, 3 - 0, 8).rect(6 + a, 20 - 0, 3, 1, 9);
    b.rect(7 - a, 17, 3, 3, 8).rect(7 - a, 20, 3, 1, 9);
  } else {
    b.rect(5, 17 - lLift, 3, 3 + lLift, 8).rect(5, 20, 3, 1, 9);
    b.rect(8, 17 - rLift, 3, 3 + rLift, 8).rect(8, 20, 3, 1, 9);
  }
  // torso
  b.rect(4, y0 + 9, 8, 6 - bob, 6).rect(4, y0 + 14 - bob, 8, 1, 7);
  if (look.accent) b.rect(7, y0 + 9, 2, 5 - bob, 12);
  // arms
  if (dir === 'side') {
    b.rect(6, y0 + 10, 3, 4, 7).set(7, y0 + 14, 2);
  } else {
    const sw = step === 0 ? 0 : 1;
    b.rect(3, y0 + 10 + (step === 2 ? sw : 0), 1, 4, 6).set(3, y0 + 14 + (step === 2 ? sw : 0), 2);
    b.rect(12, y0 + 10 + (step === 1 ? sw : 0), 1, 4, 6).set(12, y0 + 14 + (step === 1 ? sw : 0), 2);
  }
  // head
  b.rect(4, y0 + 1, 8, 8, 2).rect(4, y0 + 8, 8, 1, 3);
  // hair
  const long = look.hairStyle === 'long';
  if (dir === 'down') {
    b.rect(3, y0 - 1, 10, 4, 4).rect(4, y0 - 2, 8, 1, 4).rect(5, y0 - 1, 3, 1, 5);
    b.rect(3, y0 + 3, 2, 3, 4).rect(11, y0 + 3, 2, 3, 4);
    if (long) { b.rect(3, y0 + 3, 2, 7, 4).rect(11, y0 + 3, 2, 7, 4); }
    b.set(6, y0 + 5, 11).set(9, y0 + 5, 11).set(6, y0 + 4, 10).set(9, y0 + 4, 10).set(6, y0 + 5, 11).set(9, y0 + 5, 11);
    b.hline(7, y0 + 7, 2, 3);
  } else if (dir === 'up') {
    b.rect(3, y0 - 1, 10, 9, 4).rect(4, y0 - 2, 8, 1, 4).rect(5, y0 - 1, 4, 1, 5);
    if (long) b.rect(3, y0 + 8, 10, 3, 4);
  } else {
    b.rect(3, y0 - 1, 9, 5, 4).rect(4, y0 - 2, 7, 1, 4).rect(3, y0 + 3, 4, 5, 4).rect(5, y0 - 1, 3, 1, 5);
    if (long) b.rect(3, y0 + 3, 4, 8, 4);
    b.set(9, y0 + 4, 10).set(9, y0 + 5, 11).set(10, y0 + 5, 2);
  }
  if (look.hairStyle === 'cap') {
    const c = 12;
    b.rect(3, y0 - 1, 10, 3, c);
    if (dir === 'down') b.rect(3, y0 + 2, 10, 1, c).rect(4, y0 + 3, 8, 1, 7);
    if (dir === 'side') b.rect(10, y0 + 2, 4, 1, c);
  }
  return b.outline(1);
}

/** 12 frames: down(0-2) up(3-5) left(6-8) right(9-11); each = idle, stepA, stepB */
export function characterFrames(look: Look): PixelBuffer[] {
  const out: PixelBuffer[] = [];
  for (const d of ['down', 'up', 'side'] as const) for (const s of [0, 1, 2] as const) out.push(frame(look, d, s));
  const left = out.slice(6, 9);
  return [...out.slice(0, 6), ...left.map((f) => f.mirrorX()), ...left].map((f) => f);
}
// Note: side frames are drawn facing right; 'left' is the mirror, so indices 6-8 = left, 9-11 = right.

export const LOOKS: Record<string, Look> = {
  hero_a: { skin: '#f2c9a0', hair: '#3a2a4a', shirt: '#3b7fd0', pants: '#4a4a6a', hairStyle: 'cap', accent: '#e05a4a' },
  hero_b: { skin: '#e0a878', hair: '#7a3a2a', shirt: '#d6577a', pants: '#4a4a6a', hairStyle: 'long' },
  villager_m: { skin: '#f2c9a0', hair: '#8a6a3a', shirt: '#5a9a4a', pants: '#6a5a4a', hairStyle: 'short' },
  villager_f: { skin: '#f7d3b0', hair: '#c9772a', shirt: '#e0a84a', pants: '#7a5a8a', hairStyle: 'long' },
  elder: { skin: '#e8bf98', hair: '#d8d8e0', shirt: '#7a5aa8', pants: '#5a4a6a', hairStyle: 'short' },
  kid: { skin: '#f2c9a0', hair: '#2a2a3a', shirt: '#e0553a', pants: '#3a5a9a', hairStyle: 'cap', accent: '#f2d95c' },
  rhea: { skin: '#b9835a', hair: '#c8452f', shirt: '#2f3f6a', pants: '#3a3a4a', hairStyle: 'short', accent: '#f2d95c' },
  ilsa: { skin: '#f0d0b0', hair: '#4a3a6a', shirt: '#e8e2d0', pants: '#5a6a4a', hairStyle: 'long', accent: '#4aa89a' },
  odette: { skin: '#8a5a3a', hair: '#1f1a2a', shirt: '#e8895a', pants: '#f0e2c0', hairStyle: 'long', accent: '#f2f2f2' },
  nurse: { skin: '#f4d4b8', hair: '#e878a8', shirt: '#f0f0f8', pants: '#e0a8c0', hairStyle: 'long', accent: '#e0435f' },
  shopkeeper: { skin: '#c98e62', hair: '#2a1a1a', shirt: '#4aa89a', pants: '#3a3a5a', hairStyle: 'long' },
};
