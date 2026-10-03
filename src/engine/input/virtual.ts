import type { Action } from './InputManager';

/** Shared state written by the on-screen touch controls and read by InputManager (keeps DOM code out of the scenes). */
export const virtualHeld = new Set<Action>();
export const virtualQueued = new Set<Action>();

export const isTouchDevice = (): boolean => {
  try { return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0; } catch { return false; }
};
