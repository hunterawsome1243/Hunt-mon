import { Rng } from '../../engine/rng';

export type Terrain = 'grass' | 'forest' | 'cave' | 'gym';

interface Theme {
  skyTop: string; skyBot: string; far: string; mid: string; ground: string; ground2: string; platTop: string; platSide: string;
  shadow: string; light: string; kind: 'outdoor' | 'cave' | 'indoor';
}

const THEMES: Record<Terrain, Theme> = {
  grass: { skyTop: '#5aa8e8', skyBot: '#d6f1f8', far: '#8fb4d0', mid: '#6ec25a', ground: '#4ea23c', ground2: '#5cb84a', platTop: '#7fd05e', platSide: '#8a6440', shadow: '#2f6a2c', light: '#a8e878', kind: 'outdoor' },
  forest: { skyTop: '#2f5a6a', skyBot: '#8ab8a0', far: '#2f5a4a', mid: '#2a7a44', ground: '#1f5c2c', ground2: '#2a7a3a', platTop: '#4aa04a', platSide: '#5a4026', shadow: '#12361c', light: '#8ad06a', kind: 'outdoor' },
  cave: { skyTop: '#1a1428', skyBot: '#3a2e52', far: '#2a2040', mid: '#4a3c66', ground: '#3a3050', ground2: '#4a4064', platTop: '#7a6c98', platSide: '#4a3f64', shadow: '#1c1630', light: '#a898c8', kind: 'cave' },
  gym: { skyTop: '#2a2340', skyBot: '#4a3f6c', far: '#3a3258', mid: '#584c80', ground: '#8a6238', ground2: '#9a7244', platTop: '#d6ae78', platSide: '#7a5a3a', shadow: '#4a3220', light: '#f0d098', kind: 'indoor' },
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

/** Pixel-perfect battle backdrop: banded sky, layered scenery per terrain, and two ground platforms. */
export function makeBattleBg(t: Terrain): HTMLCanvasElement {
  const th = THEMES[t];
  const rng = new Rng(({ grass: 11, forest: 22, cave: 33, gym: 44 })[t]);
  const cv = document.createElement('canvas');
  cv.width = BG_W; cv.height = BG_H;
  const c = cv.getContext('2d')!;
  const R = (x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), ); };
  const P = (x: number, y: number, col: string) => R(x, y, 1, 1, col);
  const E = (cx: number, cy: number, rx: number, ry: number, col: string) => {
    for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry + 0.01))); R(cx - w, cy + y, w * 2, 1, col); }
  };
  const glow = (cx: number, cy: number, r: number, col: string, a: number) => {
    c.globalAlpha = a; for (let i = 3; i >= 1; i--) E(cx, cy, Math.round((r * i) / 3), Math.round((r * i) / 3), col); c.globalAlpha = 1;
  };
  const horizon = 70;

  // sky: banded gradient with a dithered seam between bands
  const bands = 9;
  for (let i = 0; i < bands; i++) {
    R(0, (i * horizon) / bands, BG_W, Math.ceil(horizon / bands) + 1, mix(th.skyTop, th.skyBot, i / (bands - 1)));
    if (i < bands - 1) {
      const next = mix(th.skyTop, th.skyBot, (i + 1) / (bands - 1));
      for (let x = 0; x < BG_W; x += 2) R(x + ((i % 2) ? 1 : 0), Math.round(((i + 1) * horizon) / bands) - 1, 1, 1, next);
    }
  }

  const hillY = (x: number) => horizon - 2 - Math.round(Math.abs(Math.sin(x / 22 + 1) * 6));

  if (th.kind === 'outdoor') {
    const forest = t === 'forest';
    if (!forest) {
      glow(200, 18, 20, '#fff6c0', 0.35); E(200, 18, 7, 7, '#fff3b0'); E(200, 18, 5, 5, '#fffbe0');
      const cloud = (x: number, y: number, s: number) => {
        E(x, y, 11 * s, 4 * s, '#ffffff'); E(x - 8 * s, y + 1, 7 * s, 3 * s, '#ffffff'); E(x + 9 * s, y + 1, 8 * s, 3 * s, '#ffffff');
        R(x - 15 * s, y + 3 * s, 30 * s, 2, '#d3e4f2'); R(x - 6 * s, y - 4 * s, 8 * s, 1, '#f4faff');
      };
      cloud(48, 18, 1); cloud(128, 30, 1); cloud(30, 40, 1);
    } else {
      glow(196, 20, 18, '#e8f4c8', 0.3);
    }
    // far mountains with a lit ridge line
    for (let x = 0; x < BG_W; x++) {
      const my = horizon - 8 - Math.round(Math.abs(Math.sin(x / 31) * 14 + Math.sin(x / 13) * 4));
      R(x, my, 1, horizon - my + 1, th.far);
      P(x, my, mix(th.far, '#ffffff', forest ? 0.12 : 0.28));
      if (x % 3 === 0) P(x, my + 2, mix(th.far, '#000000', 0.12));
    }
    // mid hills
    for (let x = 0; x < BG_W; x++) { const hy = hillY(x); R(x, hy, 1, BG_H - hy, th.mid); P(x, hy, mix(th.mid, '#ffffff', 0.2)); }
    // tree line: round canopies with a lit patch, or tall trunks in the forest
    for (let x = 6; x < BG_W; x += forest ? 15 : 19) {
      const tx = x + rng.int(-3, 3), hy = hillY(tx);
      if (forest) {
        R(tx - 2, hy - 28, 5, 32, '#4a3a26'); R(tx - 2, hy - 28, 2, 32, '#6a5238'); R(tx + 1, hy - 28, 1, 32, '#2f2418');
        E(tx, hy - 30, 12, 9, '#1c4a2a'); E(tx - 3, hy - 32, 8, 6, '#2a6a38'); E(tx - 5, hy - 34, 4, 3, '#44904a');
      } else {
        R(tx - 1, hy - 3, 3, 5, '#6a4a2e'); E(tx, hy - 9, 8, 8, '#3f8f3a'); E(tx - 1, hy - 11, 5, 5, '#58b048'); E(tx - 3, hy - 13, 2, 2, '#8ad06a');
        R(tx + 3, hy - 6, 3, 1, '#2f7a2e');
      }
    }
    if (forest) {
      // light shafts and drifting spores
      c.globalAlpha = 0.14;
      for (const x of [34, 96, 176]) for (let y = 0; y < horizon + 30; y++) R(x + y * 0.4, y, 12, 1, '#fff6c0');
      c.globalAlpha = 1;
      for (let i = 0; i < 22; i++) P(rng.int(0, BG_W - 1), rng.int(10, 100), i % 3 ? '#e8f48a' : '#ffffff');
    }
  } else if (th.kind === 'cave') {
    // stalactites with a lit edge, glowing crystals and low mist
    for (let x = -4; x < BG_W; x += 11) {
      const h = 10 + rng.int(0, 22);
      for (let y = 0; y < h; y++) {
        const w = Math.max(1, ((h - y) * 6) / h), l = x + 6 - (y * 6) / h;
        R(l, y, w, 1, y % 5 === 0 ? th.far : th.mid); P(l, y, th.light);
      }
    }
    for (const [x, y, col] of [[30, 38, '#7ad0ff'], [204, 30, '#c08aff'], [118, 50, '#7ad0ff'], [150, 24, '#c08aff'], [76, 28, '#7ad0ff']] as const) {
      glow(x + 1, y + 1, 12, col, 0.18);
      R(x, y, 3, 6, col); R(x - 2, y + 2, 2, 4, mix(col, '#000000', 0.25)); R(x + 3, y + 3, 2, 3, mix(col, '#000000', 0.25)); R(x + 1, y - 2, 2, 3, '#ffffff');
    }
    for (let x = 0; x < BG_W; x += 17) { const h = 6 + rng.int(0, 10); for (let y = 0; y < h; y++) R(x + 2 + y / 3, horizon - y, 8 - (y * 6) / h, 1, y > h - 3 ? th.light : th.mid); }
    c.globalAlpha = 0.18; for (let y = horizon - 10; y < horizon + 4; y += 2) R(0, y, BG_W, 1, '#b8a8e8'); c.globalAlpha = 1;
  } else {
    // arena hall: panelled wall, torches, banners
    R(0, 0, BG_W, horizon, th.far);
    for (let x = 0; x < BG_W; x += 40) {
      R(x + 6, 0, 28, horizon, mix(th.far, th.mid, 0.5)); R(x + 8, 2, 24, horizon - 4, th.far);
      R(x + 6, 0, 2, horizon, mix(th.far, '#ffffff', 0.18)); R(x + 32, 0, 2, horizon, mix(th.far, '#000000', 0.3));
      R(x + 14, 6, 12, 18, '#f2d95c'); R(x + 14, 6, 12, 2, '#fff2a0'); R(x + 19, 6, 2, 18, th.far); R(x + 14, 14, 12, 2, th.far);
      glow(x + 20, 15, 16, '#ffe9a0', 0.2);
      const banner = ['#c8452f', '#3a78d0', '#4aa04a'][(x / 40) % 3];
      R(x + 15, 32, 10, 24, banner); R(x + 15, 32, 10, 2, mix(banner, '#ffffff', 0.3)); R(x + 18, 40, 4, 4, '#f2d95c'); R(x + 15, 56, 2, 3, banner); R(x + 23, 56, 2, 3, banner);
    }
    R(0, horizon - 4, BG_W, 4, mix(th.mid, '#000000', 0.25));
  }

  // ground
  R(0, horizon, BG_W, BG_H - horizon, th.ground);
  for (let y = horizon; y < BG_H; y += 2) for (let x = (y % 4) ? 0 : 2; x < BG_W; x += 4) P(x, y, th.ground2);
  if (th.kind === 'outdoor') {
    for (let i = 0; i < 70; i++) {
      const x = rng.int(0, BG_W - 1), y = rng.int(horizon + 3, BG_H - 3);
      P(x, y, th.shadow); P(x - 1, y - 1, th.light); P(x + 1, y - 1, th.light); P(x, y - 2, th.light);
    }
    const petals = t === 'forest' ? ['#e05a4a', '#f2e8c8'] : ['#f5e05a', '#f58fb0', '#ffffff', '#a8c8ff'];
    for (let i = 0; i < (t === 'forest' ? 10 : 24); i++) { const x = rng.int(2, BG_W - 3), y = rng.int(horizon + 4, BG_H - 4); P(x, y, rng.pick(petals)); P(x, y + 1, '#2f7a2e'); }
  } else if (th.kind === 'cave') {
    for (let i = 0; i < 14; i++) { const x = rng.int(0, BG_W - 8), y = rng.int(horizon + 4, BG_H - 4); R(x, y, rng.int(3, 8), 1, th.shadow); P(x + 2, y + 1, th.shadow); }
    for (const [x, y] of [[90, 96], [200, 84]]) { E(x, y, 9, 2, '#34406a'); E(x - 1, y - 1, 6, 1, '#5a78b0'); P(x - 3, y - 1, '#c8e0ff'); }
  } else {
    // wooden planks with seams, plus a painted arena ring
    for (let y = horizon; y < BG_H; y += 8) R(0, y, BG_W, 1, th.shadow);
    for (let y = horizon, k = 0; y < BG_H; y += 8, k++) for (let x = (k % 2) * 17; x < BG_W; x += 34) R(x, y, 1, 8, th.shadow);
    c.globalAlpha = 0.5; E(120, 96, 100, 24, '#f6e6c0'); c.globalAlpha = 1; E(120, 96, 98, 22, th.ground); for (let y = horizon; y < BG_H; y += 8) R(22, y, 196, 1, th.shadow);
  }

  // platforms
  const plat = (p: { x: number; y: number; rx: number; ry: number }) => {
    const ell = (dy: number, rx: number, ry: number, col: string) => E(p.x, p.y + dy, rx, ry, col);
    c.globalAlpha = 0.35; ell(8, p.rx + 3, p.ry - 1, th.shadow); c.globalAlpha = 1;
    ell(6, p.rx - 1, p.ry, mix(th.platSide, '#000000', 0.35));
    ell(3, p.rx, p.ry, th.platSide);
    // side strata + stones
    for (let i = 0; i < 18; i++) { const x = p.x + rng.int(-p.rx + 4, p.rx - 4), y = p.y + p.ry + rng.int(0, 5); if (Math.abs(x - p.x) < p.rx - 2) R(x, y, rng.int(2, 4), 1, mix(th.platSide, i % 2 ? '#000000' : '#ffffff', 0.25)); }
    ell(0, p.rx, p.ry, mix(th.platTop, '#ffffff', 0.38));
    ell(1, p.rx - 1, p.ry - 1, th.platTop);
    ell(0, p.rx - 6, p.ry - 3, mix(th.platTop, '#ffffff', 0.16));
    if (th.kind === 'outdoor') {
      for (let i = 0; i < 26; i++) {
        const a = rng.next() * Math.PI * 2, x = p.x + Math.cos(a) * (p.rx - 2), y = p.y + Math.sin(a) * (p.ry - 1);
        P(x, y, th.light); P(x, y - 1, th.light); if (i % 3 === 0) P(x + 1, y - 2, th.light);
      }
      for (let i = 0; i < 8; i++) { const x = p.x + rng.int(-p.rx + 12, p.rx - 12), y = p.y + rng.int(-p.ry + 4, p.ry - 3); P(x, y, rng.pick(['#f5e05a', '#f58fb0', '#ffffff'])); P(x, y + 1, th.shadow); }
    } else if (th.kind === 'cave') {
      for (let i = 0; i < 6; i++) { const x = p.x + rng.int(-p.rx + 8, p.rx - 8), y = p.y + rng.int(-p.ry + 3, p.ry - 3); R(x, y, rng.int(3, 7), 1, th.shadow); P(x + 1, y + 1, th.shadow); }
      for (const dx of [-p.rx + 10, p.rx - 12]) { R(p.x + dx, p.y - p.ry + 2, 2, 4, '#7ad0ff'); P(p.x + dx, p.y - p.ry + 1, '#ffffff'); }
    } else {
      E(p.x, p.y, p.rx - 2, p.ry - 1, '#c8452f'); E(p.x, p.y + 1, p.rx - 4, p.ry - 2, th.platTop); E(p.x, p.y, p.rx - 8, p.ry - 4, mix(th.platTop, '#ffffff', 0.2));
    }
    for (let x = -p.rx + 8; x < p.rx - 8; x += 9) P(p.x + x, p.y + ((x * 5) % 4) - 2, mix(th.platTop, '#000000', 0.22));
  };
  plat(ENEMY_PLAT); plat(PLAYER_PLAT);
  return cv;
}

// ---- catch balls ----
/** [body, band]: banded glass orbs with a gem at the centre */
export const BALL_COLORS: Record<string, [string, string]> = { catch_orb: ['#3ab0a0', '#f2c94c'], great_orb: ['#5a6ad8', '#d8e0f0'], ultra_orb: ['#6a3f8c', '#f2c94c'] };
