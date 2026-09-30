export const TILE = 16;
export const VIEW_W = 240;
export const VIEW_H = 160;
export const WALK_MS = 250; // ms per tile
export const RUN_MS = 125;
export const FONT = '"Press Start 2P"';
export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRS: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};
export const DEPTH = { ground: 0, detail: 1, entity: 10, above: 20, fx: 30, ui: 100 };
