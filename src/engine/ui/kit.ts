import Phaser from 'phaser';
import { TYPE_COLOR } from '../../data/typeChart';
import type { MonType } from '../../data/types';
import { drawWindow, textStyle } from './DialogueBox';

export const COL = { ink: '#2a1d2e', dim: '#6a5a8a', hi: '#c8452f', white: '#ffffff', gold: '#f8d038', good: '#2f7d3a', bad: '#c8452f' };

/** Full-screen backdrop: deep violet with soft diagonal stripes and a title bar. */
export function backdrop(scene: Phaser.Scene, title: string, depth = 0): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(0x2a2340, 1).fillRect(0, 0, 240, 160);
  for (let i = -160; i < 240; i += 12) g.fillStyle(0x332b4d, 1).fillTriangle(i, 160, i + 6, 160, i + 166, 0).fillTriangle(i + 6, 160, i + 172, 0, i + 166, 0);
  g.fillStyle(0x1b1530, 1).fillRect(0, 0, 240, 15);
  g.fillStyle(0x8a5fb0, 1).fillRect(0, 15, 240, 1);
  const t = scene.add.text(6, 4, title, textStyle('#f4ecd8'));
  const c = scene.add.container(0, 0, [g, t]).setDepth(depth).setScrollFactor(0);
  return c;
}

export function win(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  drawWindow(g, x, y, w, h);
  return g;
}

export function text(scene: Phaser.Scene, x: number, y: number, s: string, color = COL.ink): Phaser.GameObjects.Text {
  return scene.add.text(x, y, s, textStyle(color));
}

/** Coloured HP / XP bar. */
export function drawBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, frac: number, kind: 'hp' | 'xp' = 'hp', h = 4): void {
  const f = Math.max(0, Math.min(1, frac));
  g.fillStyle(0x1b1530, 1).fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle(0x4a4260, 1).fillRect(x, y, w, h);
  const col = kind === 'xp' ? 0x58a8f8 : f > 0.5 ? 0x58d858 : f > 0.2 ? 0xf8d038 : 0xe84848;
  const fw = f > 0 ? Math.max(1, Math.round(w * f)) : 0;
  g.fillStyle(col, 1).fillRect(x, y, fw, h);
  g.fillStyle(0xffffff, 0.3).fillRect(x, y, fw, 1);
}

/** Small coloured type label. Returns container sized 38x9. */
export function typeChip(scene: Phaser.Scene, type: MonType, x: number, y: number): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(0x1b1530, 1).fillRect(0, 0, 38, 9).fillStyle(Phaser.Display.Color.HexStringToColor(TYPE_COLOR[type]).color, 1).fillRect(1, 1, 36, 7);
  const t = scene.add.text(19, 1, type.toUpperCase(), textStyle('#ffffff')).setScale(0.6).setOrigin(0.5, 0);
  t.setShadow(1, 1, '#00000066', 0, false, true);
  return scene.add.container(x, y, [g, t]);
}

export const money = (n: number): string => `$${n}`;
