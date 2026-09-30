/** In-game time of day. 1 real second = 1 game minute, so a full day lasts 24 real minutes. */
export const MINUTES_PER_DAY = 1440;

export function gameMinutes(clockBase: number, playMs: number): number {
  return (((clockBase + playMs / 1000) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}
export const hourOf = (minutes: number): number => minutes / 60;
export const fmtClock = (minutes: number): string => {
  const h = Math.floor(minutes / 60) % 24, m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
export type Phase = 'night' | 'dawn' | 'day' | 'dusk';
export function phaseOf(hour: number): Phase {
  if (hour >= 5 && hour < 7.5) return 'dawn';
  if (hour >= 7.5 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

export interface Ambient { /** multiply-blend colour grade (0xRRGGBB) */ grade: number; /** night layer opacity 0..1 (lights punch holes in it) */ dark: number }

const KEYS: Array<[number, number, number]> = [ // hour, grade, dark*100
  [0, 0xb0b8f0, 72], [5, 0xc8b8e8, 66], [6, 0xffc8a8, 35], [7, 0xfff0e0, 8], [8, 0xffffff, 0],
  [17, 0xffffff, 0], [18, 0xffc890, 12], [19, 0xd890a8, 40], [20, 0x9898d0, 62], [21, 0xa8b0f0, 72], [24, 0xb0b8f0, 72],
];
const lerpColor = (a: number, b: number, t: number): number => {
  const c = (s: number) => Math.round(((a >> s) & 255) + ((((b >> s) & 255) - ((a >> s) & 255)) * t));
  return (c(16) << 16) | (c(8) << 8) | c(0);
};
export function ambientAt(hour: number): Ambient {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [h0, c0, d0] = KEYS[i], [h1, c1, d1] = KEYS[i + 1];
    if (h >= h0 && h <= h1) { const t = h1 === h0 ? 0 : (h - h0) / (h1 - h0); return { grade: lerpColor(c0, c1, t), dark: (d0 + (d1 - d0) * t) / 100 }; }
  }
  return { grade: 0xffffff, dark: 0 };
}

// ------------------------------------------------------------------ weather
export type Weather = 'clear' | 'rain' | 'heavy_rain';
const hash = (n: number): number => { let x = (n ^ 0x9e3779b9) >>> 0; x = Math.imul(x ^ (x >>> 16), 0x45d35d); x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d); return (x ^ (x >>> 16)) >>> 0; };
/** Region-wide weather for a given day. Day 1 (the first morning) is always clear. */
export function weatherForDay(day: number): Weather {
  if (day <= 1) return 'clear';
  const r = hash(day * 7919) % 100;
  return r < 58 ? 'clear' : r < 88 ? 'rain' : 'heavy_rain';
}
export type AreaKind = 'outdoor' | 'forest' | 'cave' | 'indoor';
export interface AreaWeather { rain: 0 | 1 | 2; fog: boolean; dust: boolean }
export function areaWeather(kind: AreaKind, day: number): AreaWeather {
  const w = weatherForDay(day);
  const rain = kind === 'cave' || kind === 'indoor' ? 0 : w === 'clear' ? 0 : w === 'rain' ? 1 : 2;
  return { rain: rain as 0 | 1 | 2, fog: kind === 'forest', dust: kind === 'cave' };
}
