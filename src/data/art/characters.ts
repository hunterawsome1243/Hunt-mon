import { PixelBuffer } from '../../engine/gfx/PixelBuffer';

export type HairStyle = 'short' | 'long' | 'cap' | 'bob' | 'ponytail';
export type Extra = 'beard' | 'apron' | 'pack' | 'cape' | 'nursecap' | 'headband';
export interface Look { skin: string; hair: string; shirt: string; pants: string; hairStyle?: HairStyle; accent?: string; extra?: Extra }

export const shade = (hex: string, k: number): string => {
  const n = (i: number) => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k)));
  return '#' + [1, 3, 5].map((i) => n(i).toString(16).padStart(2, '0')).join('');
};

/** Blend `a` toward `b` by t (0..1). Used for warm highlights and tinted outlines. */
export const mix = (a: string, b: string, t: number): string => {
  const n = (i: number) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t);
  return '#' + [1, 3, 5].map((i) => n(i).toString(16).padStart(2, '0')).join('');
};

// palette indices
const SKIN = 2, SKIN_D = 3, HAIR = 4, HAIR_L = 5, SHIRT = 6, SHIRT_D = 7, PANTS = 8, SHOE = 9, WHITE = 10, EYE = 11, ACC = 12,
  BLUSH = 13, MOUTH = 14, PANTS_D = 15, SHIRT_L = 16, SHOE_L = 17, BELT = 18, HAIR_D = 19, ACC_L = 20, ACC_D = 21, X1 = 22, X2 = 23,
  O_SKIN = 24, O_HAIR = 25, O_SHIRT = 26, O_PANTS = 27, O_SHOE = 28;
const W = 16, H = 22;
const WARM_DARK = '#33202a';

function palette(look: Look): string[] {
  const acc = look.accent ?? look.shirt;
  const extra = look.extra === 'apron' ? ['#f0e6cc', '#c9bb98'] : look.extra === 'pack' ? ['#8a6a3e', '#5e4528'] : ['#' + '000000', '#000000'];
  const cape = look.extra === 'cape' ? [acc, shade(acc, 0.7)] : extra;
  return ['', WARM_DARK, look.skin, shade(look.skin, 0.84), look.hair, mix(look.hair, '#ffffff', 0.32), look.shirt, shade(look.shirt, 0.74),
    look.pants, '#4a2f2a', '#ffffff', '#2b1c28', acc, mix(look.skin, '#ee7f8e', 0.42), mix(look.skin, '#7a3030', 0.55), shade(look.pants, 0.78),
    mix(look.shirt, '#ffffff', 0.24), '#a8785a', shade(look.pants, 0.5), shade(look.hair, 0.72), mix(acc, '#ffffff', 0.3), shade(acc, 0.72),
    cape[0], cape[1], shade(look.skin, 0.52), shade(look.hair, 0.42), shade(look.shirt, 0.42), shade(look.pants, 0.42), '#2a1818'];
}

/** 1px outline tinted by the neighbouring material (dark skin/hair/cloth instead of one flat colour): the soft look. */
function softOutline(b: PixelBuffer): PixelBuffer {
  const src = b.data.slice();
  const tint = (v: number): number =>
    v === SKIN || v === SKIN_D || v === BLUSH || v === MOUTH || v === WHITE || v === EYE ? O_SKIN
      : v === HAIR || v === HAIR_L || v === HAIR_D ? O_HAIR
        : v === PANTS || v === PANTS_D || v === BELT ? O_PANTS
          : v === SHOE || v === SHOE_L ? O_SHOE : O_SHIRT;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    if (src[y * b.w + x]) continue;
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      const v = xx >= 0 && yy >= 0 && xx < b.w && yy < b.h ? src[yy * b.w + xx] : 0;
      if (v) { b.data[y * b.w + x] = tint(v); break; }
    }
  }
  return b;
}

function frame(look: Look, dir: 'down' | 'up' | 'side', step: 0 | 1 | 2): PixelBuffer {
  const b = new PixelBuffer(W, H, palette(look));
  const dip = step === 0 ? 0 : 1; // whole body dips a pixel mid-stride
  const y0 = 2 + dip;
  const T = 6 - dip; // torso rows
  const ty = y0 + 9;
  const style = look.hairStyle ?? 'short';
  const cap = style === 'cap', long = style === 'long', bobCut = style === 'bob', pony = style === 'ponytail';
  const cape = look.extra === 'cape';
  const armMain = cape ? X1 : SHIRT, armDark = cape ? X2 : SHIRT_D;

  // ---- legs & shoes (row 17-19, shoes 19/20) ----
  const leg = (x: number, lifted: boolean, col: number, inner: 'l' | 'r'): void => {
    const h = lifted ? 2 : 3;
    b.rect(x, 17, 3, h, col).vline(inner === 'l' ? x : x + 2, 17, h, PANTS_D);
    b.rect(x, 17 + h, 3, 1, SHOE).set(x + 1, 17 + h, SHOE_L);
  };
  if (dir === 'side') {
    const a = step === 0 ? 0 : step === 1 ? -2 : 2;
    leg(6 + a, false, PANTS_D, 'l');
    leg(7 - a, step !== 0, PANTS, 'r');
  } else {
    leg(5, step === 1, PANTS, 'r');
    leg(8, step === 2, PANTS, 'l');
  }

  // ---- torso ----
  const tx = dir === 'side' ? 5 : 4, tw = dir === 'side' ? 6 : 8;
  b.rect(tx, ty, tw, T, SHIRT).hline(tx, ty, tw, SHIRT_L).vline(tx + tw - 1, ty + 1, T - 1, SHIRT_D);
  b.hline(tx, ty + T - 1, tw, SHIRT_D).hline(tx, ty + T - 2, tw, BELT);
  if (look.accent && dir !== 'up' && !cape) b.rect(dir === 'side' ? 9 : 7, ty, dir === 'side' ? 1 : 2, T - 2, ACC).set(dir === 'side' ? 9 : 7, ty, ACC_L);
  if (dir === 'down') b.set(7, ty, SKIN_D).set(8, ty, SKIN_D);

  // ---- arms ----
  if (dir === 'side') {
    const sw = step === 1 ? 1 : step === 2 ? -1 : 0;
    b.rect(6 + sw, ty + 1, 3, 3, armDark).vline(6 + sw, ty + 1, 3, armMain).rect(7 + sw, ty + 4, 2, 1, SKIN);
  } else {
    const swL = step === 2 ? 1 : 0, swR = step === 1 ? 1 : 0;
    b.rect(2, ty + 1 + swL, 2, 3, armMain).vline(3, ty + 1 + swL, 3, armDark).rect(2, ty + 4 + swL, 2, 1, SKIN);
    b.rect(12, ty + 1 + swR, 2, 3, armMain).vline(13, ty + 1 + swR, 3, armDark).rect(12, ty + 4 + swR, 2, 1, SKIN);
  }

  // ---- clothing extras (below the head) ----
  switch (look.extra) {
    case 'apron':
      if (dir === 'down') { b.rect(5, ty + 1, 6, T - 1, X1).hline(5, ty + T - 1, 6, X2).set(5, ty, X1).set(10, ty, X1); }
      else if (dir === 'side') b.rect(8, ty + 1, 3, T - 1, X1).hline(8, ty + T - 1, 3, X2);
      else b.hline(5, ty + 2, 6, X1).set(7, ty + 3, X2).set(8, ty + 3, X2);
      break;
    case 'pack':
      if (dir === 'down') b.vline(5, ty, T - 1, X2).vline(10, ty, T - 1, X2);
      else if (dir === 'up') b.rect(5, ty - 1, 6, T, X1).hline(5, ty + T - 2, 6, X2).hline(5, ty - 1, 6, X2);
      else b.rect(3, ty, 3, T - 1, X1).vline(3, ty, T - 1, X2).hline(3, ty + T - 2, 3, X2);
      break;
    case 'cape':
      if (dir === 'up') b.rect(3, ty, 10, T + 2, X1).hline(3, ty + T + 1, 10, X2).vline(12, ty, T + 2, X2);
      else if (dir === 'side') b.rect(3, ty, 3, T + 2, X1).hline(3, ty + T + 1, 3, X2);
      else { b.hline(4, ty, 8, X1).set(3, ty, X1).set(12, ty, X1).set(7, ty + 1, ACC_L).set(8, ty + 1, ACC_L); }
      break;
    default: break;
  }

  // ---- head ----
  const hairTop = (): void => { b.hline(5, y0 - 1, 6, HAIR).hline(4, y0, 8, HAIR); b.hline(6, y0, 3, HAIR_L); };
  if (dir === 'down') {
    b.rect(4, y0 + 1, 8, 8, SKIN).hline(4, y0 + 8, 8, SKIN_D);
    hairTop();
    b.rect(3, y0 + 1, 10, 2, HAIR).set(5, y0 + 1, HAIR_L).set(6, y0 + 1, HAIR_L).hline(3, y0 + 2, 10, HAIR_D).hline(3, y0 + 2, 4, HAIR).set(7, y0 + 2, SKIN).set(8, y0 + 2, SKIN);
    const lockH = long ? 7 : bobCut ? 5 : 3;
    b.rect(3, y0 + 3, 2, lockH, HAIR).rect(11, y0 + 3, 2, lockH, HAIR).vline(12, y0 + 3, lockH, HAIR_D);
    if (bobCut) b.set(4, y0 + 8, HAIR).set(11, y0 + 8, HAIR);
    for (const x of [6, 9]) { b.set(x, y0 + 4, EYE).set(x, y0 + 5, EYE).set(x - (x < 8 ? 1 : -1), y0 + 3, HAIR_D); }
    b.set(5, y0 + 6, BLUSH).set(10, y0 + 6, BLUSH).hline(7, y0 + 7, 2, MOUTH);
    if (look.extra === 'beard') { b.rect(5, y0 + 6, 6, 3, HAIR_L).hline(6, y0 + 9, 4, HAIR_L).hline(7, y0 + 6, 2, SKIN_D); }
  } else if (dir === 'up') {
    b.rect(4, y0 + 1, 8, 8, SKIN).hline(4, y0 + 8, 8, SKIN_D);
    hairTop();
    b.rect(3, y0 + 1, 10, 7 + (long ? 3 : bobCut ? 1 : 0), HAIR).hline(6, y0, 3, HAIR_L).set(5, y0 + 1, HAIR_L).set(6, y0 + 1, HAIR_L).set(6, y0 + 2, HAIR_L);
    b.vline(12, y0 + 1, 7 + (long ? 3 : bobCut ? 1 : 0), HAIR_D).hline(4, y0 + 6, 8, HAIR_D);
    if (long) b.hline(3, y0 + 10, 10, HAIR_D);
  } else {
    b.rect(4, y0 + 1, 8, 8, SKIN).hline(4, y0 + 8, 8, SKIN_D);
    hairTop();
    b.rect(3, y0 + 1, 9, 2, HAIR).hline(3, y0 + 2, 9, HAIR_D).hline(3, y0 + 2, 5, HAIR).set(5, y0 + 1, HAIR_L).set(6, y0 + 1, HAIR_L);
    b.rect(3, y0 + 3, 4, long ? 8 : bobCut ? 6 : 5, HAIR).vline(3, y0 + 3, long ? 8 : 5, HAIR_D).set(10, y0 + 3, HAIR).set(11, y0 + 3, HAIR);
    b.set(7, y0 + 5, SKIN_D).set(7, y0 + 6, SKIN_D);
    b.set(9, y0 + 4, EYE).set(9, y0 + 5, EYE).hline(9, y0 + 3, 2, HAIR_D).set(12, y0 + 6, SKIN).set(9, y0 + 6, BLUSH).set(10, y0 + 7, MOUTH);
    if (pony) b.rect(2, y0 + 4, 2, 6, HAIR).vline(2, y0 + 4, 6, HAIR_D).set(3, y0 + 4, ACC);
    if (look.extra === 'beard') b.rect(8, y0 + 7, 4, 2, HAIR_L).hline(9, y0 + 9, 2, HAIR_L);
  }
  if (pony && dir === 'up') b.rect(7, y0 + 8, 2, 6, HAIR).vline(8, y0 + 8, 6, HAIR_D).hline(7, y0 + 8, 2, ACC);

  if (cap) {
    b.hline(5, y0 - 1, 6, ACC).hline(4, y0, 8, ACC).rect(3, y0 + 1, dir === 'side' ? 9 : 10, 2, ACC).hline(5, y0 - 1, 3, ACC_L).hline(4, y0, 2, ACC_L);
    b.hline(3, y0 + 2, dir === 'side' ? 9 : 10, ACC_D);
    if (dir === 'down') b.hline(5, y0 + 3, 6, SKIN_D);
    if (dir === 'side') { b.hline(10, y0 + 2, 5, ACC).hline(10, y0 + 3, 5, ACC_D).hline(10, y0 + 4, 2, SKIN_D); }
  }
  if (look.extra === 'headband') b.hline(3, y0 + 2, dir === 'side' ? 9 : 10, ACC).hline(3, y0 + 2, 3, ACC_L);
  if (look.extra === 'nursecap') { b.hline(5, y0 - 1, 6, WHITE).hline(4, y0, 8, WHITE).hline(7, y0, 2, ACC); }

  return softOutline(b);
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
  hero_b: { skin: '#e0a878', hair: '#7a3a2a', shirt: '#d6577a', pants: '#4a4a6a', hairStyle: 'ponytail', accent: '#f2d95c' },
  villager_m: { skin: '#f2c9a0', hair: '#8a6a3a', shirt: '#5a9a4a', pants: '#6a5a4a', hairStyle: 'short' },
  villager_f: { skin: '#f7d3b0', hair: '#c9772a', shirt: '#e0a84a', pants: '#7a5a8a', hairStyle: 'long' },
  elder: { skin: '#e8bf98', hair: '#d8d8e0', shirt: '#7a5aa8', pants: '#5a4a6a', hairStyle: 'short', extra: 'beard' },
  kid: { skin: '#f2c9a0', hair: '#2a2a3a', shirt: '#e0553a', pants: '#3a5a9a', hairStyle: 'cap', accent: '#f2d95c' },
  rhea: { skin: '#b9835a', hair: '#c8452f', shirt: '#2f3f6a', pants: '#3a3a4a', hairStyle: 'short', accent: '#f2d95c' },
  ilsa: { skin: '#f0d0b0', hair: '#4a3a6a', shirt: '#e8e2d0', pants: '#5a6a4a', hairStyle: 'bob', accent: '#4aa89a' },
  odette: { skin: '#8a5a3a', hair: '#1f1a2a', shirt: '#e8895a', pants: '#f0e2c0', hairStyle: 'long', accent: '#f2f2f2' },
  nurse: { skin: '#f4d4b8', hair: '#e878a8', shirt: '#f0f0f8', pants: '#e0a8c0', hairStyle: 'ponytail', accent: '#e0435f', extra: 'nursecap' },
  jace: { skin: '#d9a070', hair: '#2f8f9a', shirt: '#e8823a', pants: '#3a3a52', hairStyle: 'short', accent: '#f8f0d0' },
  orrin: { skin: '#e8dcd8', hair: '#c8c8e0', shirt: '#3a2a5c', pants: '#2a1d3e', hairStyle: 'long', accent: '#9a7ad8', extra: 'cape' },
  hiker: { skin: '#e0b088', hair: '#6a4a2a', shirt: '#8a6a3a', pants: '#4a4a3a', hairStyle: 'cap', accent: '#5a8a4a', extra: 'pack' },
  lass: { skin: '#f2c9a0', hair: '#e878a8', shirt: '#7aa8e8', pants: '#e8e0f0', hairStyle: 'ponytail' },
  scout: { skin: '#c98e62', hair: '#1f1a2a', shirt: '#4a8a4a', pants: '#5a4a3a', hairStyle: 'cap', accent: '#f2d95c', extra: 'pack' },
  brawler: { skin: '#d9a070', hair: '#3a2a1a', shirt: '#c8452f', pants: '#2a2a3a', hairStyle: 'short', accent: '#f2f2f2', extra: 'headband' },
  mystic: { skin: '#f0d0c0', hair: '#7a58b8', shirt: '#5a3a8a', pants: '#3a2a5a', hairStyle: 'long', accent: '#e0a8f0', extra: 'cape' },
  shopkeeper: { skin: '#c98e62', hair: '#2a1a1a', shirt: '#4aa89a', pants: '#3a3a5a', hairStyle: 'bob', extra: 'apron' },
};
