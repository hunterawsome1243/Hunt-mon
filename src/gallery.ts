// Dev-only art gallery (gallery.html). Draws sprites straight from the pixel generators, no Phaser needed.
import { SPECIES_LIST } from './data/creatures';
import { creatureBack, creatureFront } from './engine/gfx/CreatureArt';
import { LOOKS, characterFrames } from './data/art/characters';
import { portraitFrames } from './data/art/portraits';
import { makeBattleBg } from './data/art/battleBg';
import { TILES } from './data/art/tiles';
import type { PixelBuffer } from './engine/gfx/PixelBuffer';

const root = document.getElementById('root')!;
const params = new URLSearchParams(location.search);
const only = params.get('only'); // e.g. ?only=creatures

function section(title: string): HTMLElement {
  const h = document.createElement('h2');
  h.textContent = title;
  const row = document.createElement('div');
  row.className = 'row';
  root.append(h, row);
  return row;
}

function add(row: HTMLElement, src: HTMLCanvasElement | PixelBuffer, label: string, scale: number): void {
  const cv = 'toCanvas' in src ? src.toCanvas() : src;
  cv.style.width = `${cv.width * scale}px`;
  cv.style.height = `${cv.height * scale}px`;
  const fig = document.createElement('figure');
  const cap = document.createElement('figcaption');
  cap.textContent = label;
  fig.append(cv, cap);
  row.append(fig);
}

if (!only || only === 'creatures') {
  const row = section('Creatures (front)');
  for (const s of SPECIES_LIST) add(row, creatureFront(s.art), s.name, 3);
  const back = section('Creatures (back)');
  for (const s of SPECIES_LIST) add(back, creatureBack(s.art), s.name, 3);
}
if (!only || only === 'characters') {
  const row = section('Characters (down, up, left, right + step)');
  for (const [id, look] of Object.entries(LOOKS)) {
    const f = characterFrames(look);
    for (const i of [0, 1, 3, 6, 9]) add(row, f[i], i === 0 ? id : '', 5);
  }
  const pr = section('Portraits');
  for (const [id, look] of Object.entries(LOOKS)) add(pr, portraitFrames(look)[0], id, 3);
}
if (!only || only === 'tiles') {
  const row = section('Tiles (frame 0)');
  for (const [id, def] of Object.entries(TILES)) add(row, def.gen(0), id, 4);
}
if (!only || only === 'bg') {
  const row = section('Battle backgrounds');
  for (const t of ['grass', 'forest', 'cave', 'gym'] as const) add(row, makeBattleBg(t), t, 2);
}
