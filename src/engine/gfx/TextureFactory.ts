import Phaser from 'phaser';
import { PixelBuffer } from './PixelBuffer';

export interface Manifest { textures?: Record<string, { file: string; frameWidth: number; frameHeight: number }> }

/** Turns pixel buffers into Phaser textures. Keys are stable so real PNGs can override them. */
export class TextureFactory {
  /** Keys supplied by the optional PNG manifest; procedural generation skips these. */
  static overrides = new Set<string>();

  static single(scene: Phaser.Scene, key: string, buf: PixelBuffer): void {
    if (TextureFactory.overrides.has(key) || scene.textures.exists(key)) return;
    scene.textures.addCanvas(key, buf.toCanvas());
  }

  /** Lay frames left-to-right into one texture; frame names are '0','1',... */
  static sheet(scene: Phaser.Scene, key: string, frames: PixelBuffer[]): void {
    if (TextureFactory.overrides.has(key) || scene.textures.exists(key)) return;
    const w = frames[0].w, h = frames[0].h;
    const cv = document.createElement('canvas');
    cv.width = w * frames.length; cv.height = h;
    const ctx = cv.getContext('2d')!;
    frames.forEach((f, i) => ctx.drawImage(f.toCanvas(), i * w, 0));
    const tex = scene.textures.addCanvas(key, cv);
    if (!tex) return;
    frames.forEach((_, i) => tex.add(i, 0, i * w, 0, w, h));
  }
}
