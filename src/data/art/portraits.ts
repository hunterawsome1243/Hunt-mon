import { PixelBuffer } from '../../engine/gfx/PixelBuffer';
import type { Expression } from '../types';
import { Look, shade } from './characters';

export const EXPRESSIONS: Expression[] = ['neutral', 'happy', 'blush', 'annoyed', 'surprised', 'smug'];

// idx: 1 outline 2 skin 3 skin shade 4 hair 5 hair light 6 shirt 7 shirt shade 10 white 11 eye 12 accent 13 blush 14 mouth 15 tongue
function portrait(look: Look, ex: Expression): PixelBuffer {
  const pal = ['', '#2a1d2e', look.skin, shade(look.skin, 0.85), look.hair, shade(look.hair, 1.5), look.shirt, shade(look.shirt, 0.75), '', '', '#ffffff', '#2a1d2e', look.accent ?? look.shirt, '#f08a9a', '#7a2a3a', '#e0607a'];
  const b = new PixelBuffer(32, 32, pal);
  const long = look.hairStyle === 'long';
  // hair behind head
  b.rect(6, 5, 20, long ? 25 : 14, 4);
  // shoulders + neck
  b.rect(4, 26, 24, 6, 6).rect(4, 30, 24, 2, 7).rect(13, 22, 6, 5, 3);
  if (look.accent && look.hairStyle !== 'cap') b.rect(15, 26, 2, 6, 12);
  // face with softened corners
  b.rect(9, 9, 14, 14, 2).rect(10, 23, 12, 1, 2).rect(11, 24, 10, 1, 3);
  for (const [x, y] of [[9, 9], [22, 9], [9, 22], [22, 22]]) b.set(x, y, 0);
  b.hline(10, 23, 12, 3);
  // fringe
  b.rect(7, 4, 18, 6, 4).rect(9, 3, 14, 1, 4).rect(11, 4, 5, 1, 5).rect(9, 9, 3, 3, 4).rect(20, 9, 3, 3, 4).rect(7, 9, 2, 11, 4).rect(23, 9, 2, 11, 4);
  b.rect(13, 8, 6, 1, 4);
  if (look.hairStyle === 'cap') { b.rect(6, 4, 20, 6, 12).rect(5, 9, 22, 2, 12).rect(6, 10, 20, 1, 7); }
  // cheeks + eyes + mouth per expression
  const eye = (x: number, y: number) => { b.rect(x, y, 3, 4, 11).set(x, y, 10); };
  switch (ex) {
    case 'neutral': eye(11, 14); eye(18, 14); b.hline(14, 20, 4, 14); break;
    case 'happy':
      for (const x of [11, 18]) { b.set(x, 16, 11).set(x + 1, 15, 11).set(x + 2, 16, 11); }
      b.rect(13, 19, 6, 2, 14).rect(14, 20, 4, 1, 15).hline(13, 19, 6, 10); b.rect(10, 18, 2, 1, 13).rect(20, 18, 2, 1, 13); break;
    case 'blush':
      eye(11, 14); eye(18, 14); b.rect(9, 18, 4, 2, 13).rect(19, 18, 4, 2, 13); b.hline(14, 20, 4, 14).set(13, 19, 14).set(18, 19, 14); break;
    case 'annoyed':
      b.rect(11, 15, 3, 2, 11).rect(18, 15, 3, 2, 11).hline(11, 14, 3, 4).hline(18, 14, 3, 4).set(12, 15, 10).set(19, 15, 10);
      b.hline(11, 13, 4, 11).hline(17, 13, 4, 11); b.hline(14, 21, 4, 14); break;
    case 'surprised':
      b.rect(11, 13, 4, 5, 10).rect(18, 13, 4, 5, 10).rect(12, 15, 2, 3, 11).rect(19, 15, 2, 3, 11).rect(15, 19, 2, 3, 14); break;
    case 'smug':
      eye(11, 14); b.rect(18, 15, 3, 2, 11).hline(18, 14, 3, 4); b.hline(11, 12, 3, 11); b.hline(18, 11, 3, 11);
      b.hline(14, 20, 4, 14).set(18, 19, 14).set(19, 18, 14); break;
  }
  return b.outline(1);
}
export const portraitFrames = (look: Look): PixelBuffer[] => EXPRESSIONS.map((e) => portrait(look, e));

const HP = ['', '#2a1d2e', '#e0435f', '#ff8fa3', '#ffffff', '#5a4a6a'];
export function heart(kind: 'full' | 'empty'): PixelBuffer {
  const b = new PixelBuffer(9, 8, HP);
  const shape = ['.11.11...', '1221221..', '122222221', '122222221', '.1222221.', '..12221..', '...121...', '....1....'];
  shape.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') b.set(x, y, c === '1' ? 1 : kind === 'full' ? 2 : 5); }));
  if (kind === 'full') b.set(2, 2, 3).set(3, 2, 3).set(2, 3, 3);
  return b;
}

const EP = ['', '#2a1d2e', '#e0435f', '#ffffff', '#5aa0e8'];
/** Emote bubbles: 0 anger, 1 dots, 2 exclaim, 3 sweat-drop */
export function emotes(): PixelBuffer[] {
  const mk = (rows: string[]) => new PixelBuffer(11, 11, EP).art(0, 0, rows).outline(1);
  return [
    mk(['..2.....2..', '..22...22..', '...22.22...', '....222....', '...22.22...', '..22...22..', '..2.....2..']),
    mk(['...........', '...........', '.33..33..33', '.33..33..33', '...........']),
    mk(['...22...', '...22...', '...22...', '...22...', '...22...', '........', '...22...', '...22...']),
    mk(['....4....', '...444...', '..44444..', '..44344..', '...444...']),
  ];
}
