import Phaser from 'phaser';
import { DEPTH, VIEW_H, VIEW_W } from '../../config';

const BARS = 8;

/** Classic shutter wipe: bars slide in alternately from the left and right. */
export function shutterClose(scene: Phaser.Scene, ms = 520): Promise<Phaser.GameObjects.Rectangle[]> {
  const h = VIEW_H / BARS;
  const bars: Phaser.GameObjects.Rectangle[] = [];
  const jobs: Promise<void>[] = [];
  for (let i = 0; i < BARS; i++) {
    const left = i % 2 === 0;
    const r = scene.add.rectangle(left ? 0 : VIEW_W, i * h, 0, h + 1, 0x0b0b14).setOrigin(left ? 0 : 1, 0).setScrollFactor(0).setDepth(DEPTH.ui + 100);
    bars.push(r);
    jobs.push(new Promise((res) => scene.tweens.add({ targets: r, width: VIEW_W, duration: ms * 0.6, delay: (i * ms * 0.4) / BARS, ease: 'Cubic.easeIn', onComplete: () => res() })));
  }
  return Promise.all(jobs).then(() => bars);
}

/** Retract existing bars (created by shutterClose) to reveal the scene. */
export function shutterRetract(scene: Phaser.Scene, bars: Phaser.GameObjects.Rectangle[], ms = 520): Promise<void> {
  const jobs = bars.map((r, i) => new Promise<void>((res) => scene.tweens.add({ targets: r, width: 0, duration: ms * 0.6, delay: (i * ms * 0.4) / BARS, ease: 'Cubic.easeOut', onComplete: () => { r.destroy(); res(); } })));
  return Promise.all(jobs).then(() => undefined);
}

/** Bars that already cover the screen (start of the next scene), then retract. */
export function shutterOpen(scene: Phaser.Scene, ms = 520): Promise<void> {
  const h = VIEW_H / BARS;
  const bars: Phaser.GameObjects.Rectangle[] = [];
  for (let i = 0; i < BARS; i++) {
    const left = i % 2 === 0;
    bars.push(scene.add.rectangle(left ? 0 : VIEW_W, i * h, VIEW_W, h + 1, 0x0b0b14).setOrigin(left ? 0 : 1, 0).setScrollFactor(0).setDepth(DEPTH.ui + 100));
  }
  return shutterRetract(scene, bars, ms);
}
