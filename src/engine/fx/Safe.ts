import type Phaser from 'phaser';
import { state } from '../../game/state/GameState';

/** Camera effects that respect the shake / flash accessibility options. */
export const safeShake = (cam: Phaser.Cameras.Scene2D.Camera, ms: number, amt: number): void => { if (state.options.shake) cam.shake(ms, amt); };
export const safeFlash = (cam: Phaser.Cameras.Scene2D.Camera, ms: number): void => { if (state.options.flashes) cam.flash(ms, 255, 255, 255); };
