import Phaser from 'phaser';
import { DEPTH, DIRS, Dir, RUN_MS, TILE, WALK_MS } from '../../config';

const DIR_BASE: Record<Dir, number> = { down: 0, up: 3, left: 6, right: 9 };

/** A grid-bound character with smooth tile-to-tile movement and walk animation. */
export class Actor {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  tx: number; ty: number;
  dir: Dir;
  moving = false;
  private t = 0;
  private dur = WALK_MS;
  private fromX = 0; private fromY = 0;
  private stepParity = 0;
  private animT = 0;
  /** tile being moved into (reserved so others can't step in) */
  destX: number; destY: number;
  onArrive?: (a: Actor) => void;

  constructor(scene: Phaser.Scene, public id: string, texture: string, tx: number, ty: number, dir: Dir) {
    this.tx = tx; this.ty = ty; this.destX = tx; this.destY = ty; this.dir = dir;
    this.shadow = scene.add.ellipse(0, 0, 10, 4, 0x000000, 0.28);
    this.sprite = scene.add.sprite(0, 0, texture, DIR_BASE[dir]).setOrigin(0.5, 1);
    this.place();
  }
  get px(): number { return this.sprite.x; }
  get py(): number { return this.sprite.y; }

  place(): void {
    this.setPixel(this.tx * TILE + TILE / 2, this.ty * TILE + TILE);
    this.face(this.dir);
  }
  private setPixel(x: number, y: number): void {
    this.sprite.setPosition(Math.round(x), Math.round(y) + 1);
    this.shadow.setPosition(Math.round(x), Math.round(y) - 1);
    this.sprite.setDepth(DEPTH.entity + y / 1000);
    this.shadow.setDepth(DEPTH.entity - 1 + y / 1000);
  }
  face(d: Dir): void { this.dir = d; this.sprite.setFrame(DIR_BASE[d] + (this.moving ? this.walkFrame() : 0)); }
  private walkFrame(): number { return this.stepParity ? 2 : 1; }

  /** Begin a step. Caller must already have verified the destination is free. */
  step(d: Dir, run = false): void {
    this.dir = d;
    this.moving = true;
    this.t = 0;
    this.dur = run ? RUN_MS : WALK_MS;
    this.fromX = this.tx * TILE + TILE / 2; this.fromY = this.ty * TILE + TILE;
    this.destX = this.tx + DIRS[d].x; this.destY = this.ty + DIRS[d].y;
    this.stepParity ^= 1;
    this.sprite.setFrame(DIR_BASE[d] + this.walkFrame());
  }
  update(dtMs: number): void {
    if (!this.moving) return;
    this.t += dtMs;
    const k = Math.min(1, this.t / this.dur);
    const x = this.fromX + (this.destX - this.tx) * TILE * k;
    const y = this.fromY + (this.destY - this.ty) * TILE * k;
    this.setPixel(x, y);
    // idle frame in mid-step for a natural gait
    const mid = k > 0.35 && k < 0.65;
    this.sprite.setFrame(DIR_BASE[this.dir] + (mid ? 0 : this.walkFrame()));
    this.animT += dtMs;
    if (k >= 1) {
      this.tx = this.destX; this.ty = this.destY;
      this.moving = false;
      this.sprite.setFrame(DIR_BASE[this.dir]);
      this.setPixel(this.tx * TILE + TILE / 2, this.ty * TILE + TILE);
      this.onArrive?.(this);
    }
  }
  /** Overshoot leftover time so chained steps stay smooth. */
  get overshoot(): number { return Math.max(0, this.t - this.dur); }
  destroy(): void { this.sprite.destroy(); this.shadow.destroy(); }
}
