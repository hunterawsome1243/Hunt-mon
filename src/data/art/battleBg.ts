export type Terrain = 'grass' | 'forest' | 'cave' | 'gym';

interface Theme { skyTop: string; skyBot: string; far: string; mid: string; ground: string; ground2: string; platTop: string; platSide: string; kind: 'outdoor' | 'cave' | 'indoor' }

const THEMES: Record<Terrain, Theme> = {
  grass: { skyTop: '#5aa8e8', skyBot: '#cfeefa', far: '#8fb4d0', mid: '#6ec25a', ground: '#4ea23c', ground2: '#5cb84a', platTop: '#7fd05e', platSide: '#3a7f32', kind: 'outdoor' },
  forest: { skyTop: '#2f5a6a', skyBot: '#7aa898', far: '#2f5a4a', mid: '#2a7a44', ground: '#1f5c2c', ground2: '#2a7a3a', platTop: '#4aa04a', platSide: '#1f5c2c', kind: 'outdoor' },
  cave: { skyTop: '#1a1428', skyBot: '#3a2e52', far: '#2a2040', mid: '#4a3c66', ground: '#3a3050', ground2: '#4a4064', platTop: '#7a6c98', platSide: '#3a3050', kind: 'cave' },
  gym: { skyTop: '#2a2340', skyBot: '#4a3f6c', far: '#3a3258', mid: '#584c80', ground: '#7a5a3a', ground2: '#8a6a44', platTop: '#c8a070', platSide: '#7a5a3a', kind: 'indoor' },
};

const mix = (a: string, b: string, t: number): string => {
  const p = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  const c = (i: number) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, '0');
  return `#${c(1)}${c(3)}${c(5)}`;
};

export const ENEMY_PLAT = { x: 168, y: 62, rx: 42, ry: 9 };
export const PLAYER_PLAT = { x: 64, y: 112, rx: 54, ry: 11 };
export const BG_W = 240;
export const BG_H = 128;

/** Pixel-perfect battle backdrop with banded sky, parallax layers and two ground platforms. */
export function makeBattleBg(t: Terrain): HTMLCanvasElement {
  const th = THEMES[t];
  const cv = document.createElement('canvas');
  cv.width = BG_W; cv.height = BG_H;
  const c = cv.getContext('2d')!;
  const R = (x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
  const horizon = 70;

  // sky: banded gradient with a dithered seam between bands
  const bands = 9;
  for (let i = 0; i < bands; i++) {
    const col = mix(th.skyTop, th.skyBot, i / (bands - 1));
    R(0, (i * horizon) / bands, BG_W, Math.ceil(horizon / bands) + 1, col);
    if (i < bands - 1) {
      const next = mix(th.skyTop, th.skyBot, (i + 1) / (bands - 1));
      for (let x = 0; x < BG_W; x += 2) R(x + ((i % 2) ? 1 : 0), Math.round(((i + 1) * horizon) / bands) - 1, 1, 1, next);
    }
  }
  if (th.kind === 'cave') {
    // stalactites and glowing crystals
    for (let x = 0; x < BG_W; x += 12) { const h = 10 + ((x * 7) % 22); for (let y = 0; y < h; y++) R(x + 6 - (y * 6) / h, y, Math.max(1, ((h - y) * 6) / h), 1, y % 5 === 0 ? th.far : th.mid); }
    for (const [x, y] of [[30, 40], [200, 30], [120, 48]]) { R(x, y, 3, 5, '#9ad0ff'); R(x + 1, y - 2, 2, 3, '#d0eaff'); }
  } else if (th.kind === 'indoor') {
    for (let x = 0; x < BG_W; x += 40) { R(x + 6, 0, 28, 70, mix(th.far, th.mid, 0.5)); R(x + 8, 2, 24, 66, th.far); R(x + 14, 6, 12, 18, '#f2d95c'); }
  } else {
    // sun/moon glow + far mountains + mid hills
    R(196, 12, 12, 12, '#fffbe0'); R(194, 14, 16, 8, '#fff6c0'); R(198, 10, 8, 16, '#fff6c0');
    for (let x = 0; x < BG_W; x++) {
      const my = horizon - 8 - Math.round(Math.abs(Math.sin(x / 31) * 14 + Math.sin(x / 13) * 4));
      R(x, my, 1, horizon - my + 1, th.far);
      if (t === 'forest') { const ty = horizon - 12 - ((x * 13) % 9); if (x % 6 < 3) R(x, ty, 1, horizon - ty, th.mid); }
    }
    for (let x = 0; x < BG_W; x++) { const hy = horizon - 2 - Math.round(Math.abs(Math.sin(x / 22 + 1) * 6)); R(x, hy, 1, BG_H - hy, th.mid); }
  }
  // ground
  R(0, horizon, BG_W, BG_H - horizon, th.ground);
  for (let y = horizon; y < BG_H; y += 2) for (let x = (y % 4) ? 0 : 2; x < BG_W; x += 4) R(x, y, 1, 1, th.ground2);
  if (th.kind === 'outdoor') {
    for (let i = 0; i < 40; i++) { const x = (i * 53) % BG_W, y = horizon + 4 + ((i * 37) % (BG_H - horizon - 6)); R(x, y, 1, 2, th.ground2); R(x + 1, y - 1, 1, 2, th.platTop); }
  }
  // platforms (ellipses with rim + side)
  const plat = (p: { x: number; y: number; rx: number; ry: number }) => {
    const ell = (dy: number, rx: number, ry: number, col: string) => { for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry + 0.01))); R(p.x - w, p.y + y + dy, w * 2, 1, col); } };
    ell(3, p.rx, p.ry, th.platSide);
    ell(0, p.rx, p.ry, th.platTop);
    ell(-1, p.rx - 5, p.ry - 3, mix(th.platTop, '#ffffff', 0.18));
    for (let x = -p.rx + 8; x < p.rx - 8; x += 9) R(p.x + x, p.y + ((x * 5) % 4) - 2, 2, 1, th.platSide);
  };
  plat(ENEMY_PLAT); plat(PLAYER_PLAT);
  return cv;
}

// ---- catch balls ----
/** [body, band]: banded glass orbs with a gem at the centre */
export const BALL_COLORS: Record<string, [string, string]> = { catch_orb: ['#3ab0a0', '#f2c94c'], great_orb: ['#5a6ad8', '#d8e0f0'], ultra_orb: ['#6a3f8c', '#f2c94c'] };
