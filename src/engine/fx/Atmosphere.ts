import Phaser from 'phaser';
import { DEPTH, TILE, VIEW_H, VIEW_W } from '../../config';
import type { MapDef } from '../../data/types';
import { Ambient, AreaKind, AreaWeather, ambientAt } from '../../game/systems/Clock';
import { state } from '../../game/state/GameState';
import { rng } from '../rng';

/** Soft generated textures shared by lights, fog, cloud shadows and the vignette. */
export function makeAtmosphereTextures(scene: Phaser.Scene): void {
  const make = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d')!);
    scene.textures.addCanvas(key, cv);
  };
  make('light_soft', 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.75)'); g.addColorStop(0.7, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  });
  make('fog_blob', 128, 64, (c) => {
    c.save(); c.scale(2, 1);
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.6, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64); c.restore();
  });
  make('vignette', VIEW_W, VIEW_H, (c) => {
    const g = c.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.68);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,4,20,0.55)');
    c.fillStyle = g; c.fillRect(0, 0, VIEW_W, VIEW_H);
  });
}

export interface Light { x: number; y: number; r: number; color: number; /** 0..1 flicker amount */ flicker?: number }

const LIGHT_TILES: Record<string, { r: number; color: number; oy?: number; flicker?: number; window?: boolean }> = {
  lamp_top: { r: 46, color: 0xffcf70, oy: 4, flicker: 0.1 }, lantern: { r: 42, color: 0xffcf70, oy: 6, flicker: 0.1 },
  crystal: { r: 34, color: 0x7ad8ff, flicker: 0.15 }, glow_flower: { r: 16, color: 0xb8ff9a, flicker: 0.2 },
  wall_win: { r: 24, color: 0xffd890, window: true }, slate_win: { r: 24, color: 0xffd890, window: true },
  machine: { r: 22, color: 0x7ad8ff }, pc: { r: 18, color: 0x7ad8ff }, sparkle: { r: 16, color: 0xffe98a, flicker: 0.3 },
};

/** Finds every light-emitting tile on a map. */
export function collectLights(map: MapDef): Light[] {
  const out: Light[] = [];
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    for (const name of [map.ground[y][x], map.deco[y][x]]) {
      const l = name ? LIGHT_TILES[name] : undefined;
      if (l) out.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 + (l.oy ?? 0), r: l.r, color: l.color, flicker: l.flicker });
    }
  }
  return out;
}

export function areaKindOf(map: MapDef): AreaKind {
  if (map.indoor && map.terrain !== 'cave') return 'indoor';
  if (map.terrain === 'cave') return 'cave';
  if (map.terrain === 'forest') return 'forest';
  return 'outdoor';
}

/**
 * Day/night colour grading, punched-out point lights, fireflies, rain with puddle ripples, forest fog,
 * cave dust and drifting cloud shadows. One instance per overworld map.
 */
export class Atmosphere {
  private grade: Phaser.GameObjects.Rectangle;
  private night: Phaser.GameObjects.RenderTexture;
  private vignette: Phaser.GameObjects.Image;
  private glows: Array<{ img: Phaser.GameObjects.Image; l: Light; ph: number }> = [];
  private lights: Light[];
  private fireflies: Array<{ s: Phaser.GameObjects.Rectangle; x: number; y: number; ph: number; sp: number }> = [];
  private rain: Array<{ r: Phaser.GameObjects.Rectangle; x: number; y: number; v: number }> = [];
  private rainShade?: Phaser.GameObjects.Rectangle;
  private fog: Array<{ img: Phaser.GameObjects.Image; v: number }> = [];
  private dust: Array<{ s: Phaser.GameObjects.Rectangle; x: number; y: number; vx: number; vy: number; ph: number }> = [];
  private shadows: Array<{ img: Phaser.GameObjects.Image; v: number }> = [];
  private ripple = 0;
  private bolt = 4000;
  private t = 0;
  private readonly kind: AreaKind;

  constructor(private scene: Phaser.Scene, private map: MapDef, private weather: AreaWeather, private fixedHour?: number) {
    this.kind = areaKindOf(map);
    this.lights = this.kind === 'indoor' && fixedHour === undefined ? [] : collectLights(map);
    this.grade = scene.add.rectangle(0, 0, VIEW_W, VIEW_H, 0xffffff).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.fx + 5).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.night = scene.add.renderTexture(0, 0, VIEW_W, VIEW_H).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.fx + 6);
    this.vignette = scene.add.image(0, 0, 'vignette').setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.fx + 8).setAlpha(this.kind === 'indoor' ? 0.6 : 0.85);
    for (const l of this.lights) {
      const img = scene.add.image(l.x, l.y, 'light_soft').setTint(l.color).setScale((l.r * 2) / 64).setDepth(DEPTH.fx + 7).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      this.glows.push({ img, l, ph: rng.next() * 6 });
    }
    // fireflies (outdoor grass/forest at night)
    if (this.kind === 'outdoor' || this.kind === 'forest') for (let i = 0; i < 16; i++) {
      const s = scene.add.rectangle(0, 0, 2, 2, 0xe6ff7a).setScrollFactor(0).setDepth(DEPTH.fx + 7).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      this.fireflies.push({ s, x: rng.int(0, VIEW_W), y: rng.int(30, VIEW_H - 10), ph: rng.next() * 6, sp: 4 + rng.next() * 8 });
    }
    if (weather.rain) this.buildRain(weather.rain);
    if (weather.fog) this.buildFog();
    if (weather.dust) this.buildDust();
    if (this.kind === 'outdoor' && weather.rain === 0) this.buildShadows();
  }

  private buildRain(level: 1 | 2): void {
    const n = level === 2 ? 130 : 70;
    for (let i = 0; i < n; i++) {
      const r = this.scene.add.rectangle(0, 0, 1, level === 2 ? 7 : 5, 0xbcd4ff, 0.55).setAngle(12).setScrollFactor(0).setDepth(DEPTH.fx + 4);
      this.rain.push({ r, x: rng.int(-20, VIEW_W + 20), y: rng.int(-10, VIEW_H), v: (level === 2 ? 340 : 260) + rng.int(0, 80) });
    }
    this.rainShade = this.scene.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x1a2a48, level === 2 ? 0.3 : 0.18).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.fx + 3);
  }
  private buildFog(): void {
    for (let i = 0; i < 7; i++) {
      const img = this.scene.add.image(rng.int(-40, VIEW_W), rng.int(20, VIEW_H - 20), 'fog_blob').setTint(0xd8ece0).setAlpha(0.22 + rng.next() * 0.16).setScale(1.3 + rng.next() * 1.2).setScrollFactor(0).setDepth(DEPTH.fx + 3);
      this.fog.push({ img, v: 3 + rng.next() * 6 });
    }
  }
  private buildDust(): void {
    for (let i = 0; i < 42; i++) {
      const s = this.scene.add.rectangle(0, 0, 1, 1, 0xd8c8ff).setScrollFactor(0).setDepth(DEPTH.fx + 4).setAlpha(0.4);
      this.dust.push({ s, x: rng.int(0, VIEW_W), y: rng.int(0, VIEW_H), vx: 2 + rng.next() * 6, vy: -1 - rng.next() * 3, ph: rng.next() * 6 });
    }
  }
  private buildShadows(): void {
    if (!this.scene.textures.exists('fog_blob')) return;
    const w = this.map.w * TILE, h = this.map.h * TILE;
    for (let i = 0; i < 4; i++) {
      const img = this.scene.add.image(rng.int(0, w), rng.int(0, h), 'fog_blob').setTint(0x000000).setAlpha(0.16).setScale(2.4 + rng.next() * 1.6, 1.8 + rng.next() * 1).setDepth(5.5);
      this.shadows.push({ img, v: 5 + rng.next() * 4 });
    }
  }

  destroy(): void {
    [this.grade, this.night, this.vignette, this.rainShade].forEach((o) => o?.destroy());
    this.glows.forEach((g) => g.img.destroy());
    this.fireflies.forEach((f) => f.s.destroy()); this.rain.forEach((r) => r.r.destroy());
    this.fog.forEach((f) => f.img.destroy()); this.dust.forEach((d) => d.s.destroy()); this.shadows.forEach((s) => s.img.destroy());
  }

  /** Current ambient for this area: time-of-day outdoors, permanent gloom in caves, soft green in forests. */
  ambient(hour: number): Ambient {
    const a = ambientAt(this.fixedHour ?? hour);
    if (this.kind === 'indoor') return this.fixedHour === undefined ? { grade: 0xffffff, dark: 0 } : { grade: a.grade, dark: a.dark * 0.55 };
    if (this.kind === 'cave') return { grade: 0xc8c0ff, dark: Math.max(0.6, a.dark * 0.9) };
    if (this.kind === 'forest') {
      const g = a.grade & 0xffffff;
      const mix = (s: number) => Math.round(((g >> s) & 255) * (s === 8 ? 1 : 0.86));
      return { grade: (mix(16) << 16) | (mix(8) << 8) | mix(0), dark: Math.max(0.2, a.dark * 0.92) };
    }
    return a;
  }

  update(dtMs: number, cam: Phaser.Cameras.Scene2D.Camera, hour: number, player?: { x: number; y: number }): void {
    const dt = dtMs / 1000;
    this.t += dtMs;
    const a = this.ambient(hour);
    const night = a.dark;
    this.grade.setFillStyle(a.grade).setVisible(a.grade !== 0xffffff);
    this.night.setVisible(night > 0.01);
    if (night > 0.01) {
      const rt = this.night;
      rt.clear(); rt.fill(this.kind === 'cave' ? 0x0a0618 : 0x070b24, night);
      rt.beginDraw();
      const erase = (x: number, y: number, r: number, amt = 1) => {
        if (x < -r || y < -r || x > VIEW_W + r || y > VIEW_H + r) return;
        rt.erase('light_soft', x - r, y - r);
        void amt;
      };
      for (const g of this.glows) {
        const f = 1 - (g.l.flicker ?? 0) * (0.5 + 0.5 * Math.sin(this.t / 140 + g.ph));
        const r = g.l.r * f;
        erase(g.l.x - cam.scrollX, g.l.y - cam.scrollY, r);
      }
      if (player) erase(player.x - cam.scrollX, player.y - cam.scrollY - 8, this.kind === 'cave' ? 44 : 30);
      for (const f of this.fireflies) if (f.s.alpha > 0.2) erase(f.x, f.y, 9);
      rt.endDraw();
    }
    // warm additive glow on top of the holes, stronger the darker it is
    for (const g of this.glows) {
      const f = 1 - (g.l.flicker ?? 0) * (0.5 + 0.5 * Math.sin(this.t / 140 + g.ph));
      const onScreen = g.l.x > cam.scrollX - 60 && g.l.x < cam.scrollX + VIEW_W + 60 && g.l.y > cam.scrollY - 60 && g.l.y < cam.scrollY + VIEW_H + 60;
      g.img.setVisible(onScreen && night > 0.05).setAlpha(Math.min(0.55, night * 0.75) * f);
    }
    // fireflies
    for (const f of this.fireflies) {
      f.ph += dt * 1.4; f.x += Math.sin(f.ph) * f.sp * dt; f.y += Math.cos(f.ph * 0.8) * f.sp * 0.6 * dt;
      if (f.x < 0) f.x = VIEW_W; if (f.x > VIEW_W) f.x = 0; if (f.y < 20) f.y = VIEW_H - 10; if (f.y > VIEW_H) f.y = 30;
      f.s.setPosition(Math.round(f.x), Math.round(f.y)).setAlpha(night > 0.35 ? (0.25 + 0.75 * Math.max(0, Math.sin(this.t / 320 + f.ph * 3))) * Math.min(1, (night - 0.35) * 4) : 0);
    }
    // rain + ripples + lightning
    if (this.rain.length) {
      for (const r of this.rain) {
        r.y += r.v * dt; r.x -= r.v * 0.2 * dt;
        if (r.y > VIEW_H + 6) { r.y = -8; r.x = rng.int(-10, VIEW_W + 30); }
        r.r.setPosition(Math.round(r.x), Math.round(r.y));
      }
      this.ripple -= dtMs;
      if (this.ripple <= 0) {
        this.ripple = this.weather.rain === 2 ? 55 : 120;
        const x = rng.int(6, VIEW_W - 6), y = rng.int(50, VIEW_H - 6);
        const s = this.scene.add.image(x, y, 'fx_ring').setTint(0xdce8ff).setAlpha(0.55).setScale(0.12, 0.05).setScrollFactor(0).setDepth(DEPTH.fx + 2);
        this.scene.tweens.add({ targets: s, scaleX: 0.5, scaleY: 0.2, alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => s.destroy() });
      }
      if (this.weather.rain === 2) {
        this.bolt -= dtMs;
        if (this.bolt <= 0) {
          this.bolt = 6000 + rng.int(0, 9000);
          if (state.options.flashes) cam.flash(110, 210, 225, 255);
        }
      }
    }
    // fog, dust, shadows
    for (const f of this.fog) { f.img.x += f.v * dt; if (f.img.x > VIEW_W + 120) f.img.x = -120; f.img.alpha = 0.2 + 0.1 * Math.sin(this.t / 2400 + f.v); }
    for (const d of this.dust) {
      d.ph += dt * 2; d.x += d.vx * dt; d.y += d.vy * dt + Math.sin(d.ph) * 0.1;
      if (d.x > VIEW_W) d.x = 0; if (d.y < 0) d.y = VIEW_H;
      d.s.setPosition(Math.round(d.x), Math.round(d.y)).setAlpha(0.25 + 0.3 * Math.max(0, Math.sin(this.t / 600 + d.ph)));
    }
    const w = this.map.w * TILE;
    for (const s of this.shadows) { s.img.x += s.v * dt; if (s.img.x > w + 120) s.img.x = -120; s.img.setVisible(night < 0.3); }
  }
}
