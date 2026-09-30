import Phaser from 'phaser';
import { DEPTH } from '../../config';
import type { BattleStat, MonType, Status } from '../../data/types';
import { rng } from '../rng';

export interface Pt { x: number; y: number }

/** Per-type particle choreography for battle moves. Each play() resolves when the effect is done. */
export class MoveFx {
  constructor(private scene: Phaser.Scene, private flash: (color: number, alpha: number, ms: number) => void, private shake: (ms: number, amt: number) => void) {}

  private wait(ms: number): Promise<void> { return new Promise((r) => this.scene.time.delayedCall(ms, () => r())); }

  private sprite(key: string, at: Pt, tint: number, scale = 1, alpha = 1): Phaser.GameObjects.Image {
    return this.scene.add.image(at.x, at.y, key).setTint(tint).setScale(scale).setAlpha(alpha).setDepth(DEPTH.fx);
  }
  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((res) => this.scene.tweens.add({ ...cfg, onComplete: () => res() }));
  }

  /** Fire `n` projectiles from -> to with staggered starts and a bit of wobble/arc. */
  private async proj(key: string, tints: number[], from: Pt, to: Pt, o: { n?: number; dur?: number; arc?: number; spin?: boolean; scale?: number; stagger?: number; spread?: number } = {}): Promise<void> {
    const n = o.n ?? 5, dur = o.dur ?? 380, stagger = o.stagger ?? 60, arc = o.arc ?? 0, spread = o.spread ?? 10;
    const jobs: Promise<void>[] = [];
    for (let i = 0; i < n; i++) {
      const s = this.sprite(key, from, rng.pick(tints), o.scale ?? 1, 0);
      const ty = to.y + rng.int(-spread, spread), tx = to.x + rng.int(-spread, spread);
      const c = { t: 0 };
      jobs.push(this.tween({
        targets: c, t: 1, duration: dur, delay: i * stagger, ease: 'Sine.easeIn',
        onStart: () => s.setAlpha(1),
        onUpdate: () => {
          s.x = Math.round(from.x + (tx - from.x) * c.t);
          s.y = Math.round(from.y + (ty - from.y) * c.t - Math.sin(c.t * Math.PI) * arc + Math.sin(c.t * 12 + i) * 2);
          if (o.spin) s.rotation += 0.35;
        },
      }).then(() => s.destroy()));
    }
    await Promise.all(jobs);
  }

  private burst(key: string, tints: number[], at: Pt, n: number, o: { r?: number; dur?: number; gravity?: number; scale?: number; up?: boolean } = {}): Promise<void> {
    const jobs: Promise<void>[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.next(), r = (o.r ?? 22) * (0.5 + rng.next() * 0.7);
      const s = this.sprite(key, at, rng.pick(tints), o.scale ?? 1);
      const dx = Math.cos(a) * r, dy = Math.sin(a) * r * (o.up ? 0.6 : 1) - (o.up ? 10 : 0);
      jobs.push(this.tween({ targets: s, x: at.x + dx, y: at.y + dy + (o.gravity ?? 0), alpha: 0, angle: rng.int(-90, 90), duration: o.dur ?? 420, ease: 'Quad.easeOut' }).then(() => s.destroy()));
    }
    return Promise.all(jobs).then(() => undefined);
  }

  private ring(at: Pt, tint: number, dur = 380, to = 2.2, from = 0.3): Promise<void> {
    const s = this.sprite('fx_ring', at, tint, from);
    return this.tween({ targets: s, scale: to, alpha: 0, duration: dur, ease: 'Quad.easeOut' }).then(() => s.destroy());
  }
  private star(at: Pt, tint = 0xffffff, scale = 1.6): Promise<void> {
    const s = this.sprite('fx_star', at, tint, 0.3);
    return this.tween({ targets: s, scale, angle: 30, alpha: 0, duration: 280, ease: 'Back.easeOut' }).then(() => s.destroy());
  }

  async play(type: MonType, cat: 'phys' | 'spec' | 'status', from: Pt, to: Pt): Promise<void> {
    const c = cat === 'status' ? from : to;
    switch (type) {
      case 'flame':
        await this.proj('fx_orb', [0xffa030, 0xffe060, 0xe84020], from, to, { n: 6, arc: 8, scale: 1 });
        this.flash(0xff8030, 0.25, 160);
        await Promise.all([this.burst('fx_orb', [0xffa030, 0xffe060, 0xe84020], c, 10, { up: true, r: 20 }), this.ring(c, 0xffb050)]);
        break;
      case 'tide':
        await this.proj('fx_drop', [0x4a8fe0, 0x8cc8f5, 0xffffff], from, to, { n: 7, arc: 26, stagger: 45 });
        await Promise.all([this.burst('fx_drop', [0x4a8fe0, 0x8cc8f5], c, 10, { r: 20, gravity: 10 }), this.ring(c, 0x8cc8f5, 320)]);
        break;
      case 'leaf':
        await this.proj('fx_leaf', [0x5cb84a, 0x88d868, 0x3a8a34], from, to, { n: 7, arc: 14, spin: true, stagger: 50 });
        await this.burst('fx_leaf', [0x5cb84a, 0x88d868], c, 9, { r: 24, gravity: 12 });
        break;
      case 'volt': {
        const jobs: Promise<void>[] = [];
        for (let i = 0; i < 4; i++) {
          const b = this.sprite('fx_bolt', { x: c.x + rng.int(-14, 14), y: c.y - 8 }, 0xfff06a, 1.6 + rng.next());
          b.setAngle(rng.int(-20, 20));
          jobs.push(this.tween({ targets: b, alpha: { from: 1, to: 0 }, duration: 100, delay: i * 90, repeat: 1, yoyo: true }).then(() => b.destroy()));
        }
        this.scene.time.delayedCall(60, () => this.flash(0xfff06a, 0.45, 140));
        this.scene.time.delayedCall(240, () => this.flash(0xffffff, 0.35, 120));
        await Promise.all(jobs);
        await this.burst('fx_px', [0xfff06a, 0xffffff], c, 14, { r: 26, dur: 300, scale: 1.5 });
        break;
      }
      case 'frost':
        await this.proj('fx_shard', [0xcdf0fa, 0x8ad4e8, 0xffffff], from, to, { n: 5, arc: 6, dur: 300, stagger: 55 });
        this.flash(0xcdf0fa, 0.3, 140);
        await this.burst('fx_shard', [0xcdf0fa, 0x8ad4e8], c, 10, { r: 26, dur: 480, gravity: 6 });
        break;
      case 'stone': {
        const jobs: Promise<void>[] = [];
        for (let i = 0; i < 5; i++) {
          const s = this.sprite('fx_orb', { x: c.x + rng.int(-16, 16), y: c.y - 70 }, rng.pick([0xa88a58, 0x7a6640, 0xcdb890]), 1.4);
          jobs.push(this.tween({ targets: s, y: c.y + rng.int(-4, 8), duration: 260, delay: i * 90, ease: 'Quad.easeIn' }).then(() => {
            this.shake(90, 0.004);
            return this.burst('fx_px', [0xa88a58, 0xcdb890], { x: s.x, y: s.y }, 4, { r: 12, dur: 260, scale: 1.5 }).then(() => s.destroy());
          }));
        }
        await Promise.all(jobs);
        break;
      }
      case 'gale': {
        const jobs: Promise<void>[] = [];
        for (let i = 0; i < 4; i++) {
          const s = this.sprite('fx_streak', { x: c.x - 44, y: c.y - 20 + i * 12 }, 0xe6ecff, 1.4, 0);
          jobs.push(this.tween({ targets: s, x: c.x + 44, alpha: { from: 0.9, to: 0 }, duration: 320, delay: i * 70, ease: 'Sine.easeInOut' }).then(() => s.destroy()));
        }
        await Promise.all(jobs);
        await this.ring(c, 0xe6ecff, 300);
        break;
      }
      case 'venom':
        await this.proj('fx_orb', [0xa05ac0, 0x7a3a98, 0xc890e0], from, to, { n: 5, arc: 18, dur: 460, stagger: 70, scale: 1 });
        await this.burst('fx_orb', [0xa05ac0, 0xc890e0], c, 8, { r: 18, up: true, dur: 520 });
        break;
      case 'mind':
        await Promise.all([this.ring(c, 0xe878a8, 480, 2.6, 0.2), this.wait(140).then(() => this.ring(c, 0xffc0e0, 480, 2.6, 0.2)), this.wait(280).then(() => this.ring(c, 0xe878a8, 480, 2.6, 0.2))]);
        this.flash(0xe878a8, 0.25, 160);
        break;
      case 'shade': {
        const jobs: Promise<void>[] = [];
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2, s = this.sprite('fx_orb', { x: c.x + Math.cos(a) * 36, y: c.y + Math.sin(a) * 36 }, rng.pick([0x6a5a8a, 0x2a1d3e, 0x9a80c0]), 1.2);
          const t = { k: 0 };
          jobs.push(this.tween({
            targets: t, k: 1, duration: 520, delay: i * 30, ease: 'Sine.easeIn',
            onUpdate: () => { const r = 36 * (1 - t.k), aa = a + t.k * 3.2; s.x = c.x + Math.cos(aa) * r; s.y = c.y + Math.sin(aa) * r; s.alpha = 1 - t.k * 0.3; },
          }).then(() => s.destroy()));
        }
        await Promise.all(jobs);
        this.flash(0x1a1030, 0.4, 180);
        await this.ring(c, 0x9a80c0, 260);
        break;
      }
      case 'fist':
        await this.star(c, 0xffe0a0, 1.9);
        this.shake(120, 0.008);
        await Promise.all([this.ring(c, 0xffb070, 300), this.burst('fx_px', [0xffe0a0, 0xffffff, 0xc8503a], c, 10, { r: 24, dur: 260, scale: 1.5 })]);
        break;
      default:
        await this.star(c, 0xffffff, 1.6);
        await this.burst('fx_px', [0xffffff, 0xe0e0e8], c, 8, { r: 20, dur: 240, scale: 1.4 });
    }
  }

  /** Stat stage rising/falling on `at`. */
  async stage(at: Pt, up: boolean, stat: BattleStat): Promise<void> {
    void stat;
    const tint = up ? 0x7ad0ff : 0xff7a7a;
    const jobs: Promise<void>[] = [];
    for (let i = 0; i < 5; i++) {
      const s = this.sprite('fx_arrow', { x: at.x - 20 + i * 10, y: at.y + (up ? 6 : -30) }, tint, 1, 0);
      if (!up) s.setFlipY(true);
      jobs.push(this.tween({ targets: s, y: at.y + (up ? -30 : 6), alpha: { from: 1, to: 0 }, duration: 520, delay: i * 70, ease: 'Sine.easeOut', onStart: () => s.setAlpha(1) }).then(() => s.destroy()));
    }
    await Promise.all(jobs);
  }

  async status(at: Pt, kind: Status): Promise<void> {
    const col: Record<Status, number[]> = { burn: [0xff8030, 0xffe060], poison: [0xa05ac0, 0xc890e0], sleep: [0xcdd6f0, 0x9aa8d0], paralysis: [0xfff06a, 0xffffff] };
    await this.burst(kind === 'paralysis' ? 'fx_px' : 'fx_orb', col[kind], at, 9, { r: 22, up: true, dur: 520, scale: kind === 'paralysis' ? 1.5 : 0.8 });
  }

  async heal(at: Pt): Promise<void> {
    const jobs: Promise<void>[] = [];
    for (let i = 0; i < 6; i++) {
      const s = this.sprite('fx_plus', { x: at.x + rng.int(-20, 20), y: at.y }, 0x7aff9a, 1, 0);
      jobs.push(this.tween({ targets: s, y: at.y - 32, alpha: { from: 1, to: 0 }, duration: 600, delay: i * 80, onStart: () => s.setAlpha(1) }).then(() => s.destroy()));
    }
    await Promise.all(jobs);
  }
}
