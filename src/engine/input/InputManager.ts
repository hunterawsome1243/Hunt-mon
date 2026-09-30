import Phaser from 'phaser';

const isLetter = (k: Phaser.Input.Keyboard.Key): boolean => k.keyCode >= 65 && k.keyCode <= 90;

export type Action = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'run' | 'menu' | 'debug';

const KEYS: Record<Action, string[]> = {
  up: ['UP', 'W'], down: ['DOWN', 'S'], left: ['LEFT', 'A'], right: ['RIGHT', 'D'],
  confirm: ['Z', 'ENTER', 'SPACE'], back: ['X', 'ESC', 'BACKSPACE'], run: ['SHIFT'],
  menu: ['M', 'TAB'], debug: ['BACKTICK'],
};
// standard gamepad mapping
const PAD: Record<Action, number[]> = {
  up: [12], down: [13], left: [14], right: [15], confirm: [0], back: [1], run: [2, 5, 7], menu: [9], debug: [8],
};

/** Abstract actions over keyboard + gamepad. Scenes never read raw keys. */
export class InputManager {
  private keys = new Map<Action, Phaser.Input.Keyboard.Key[]>();
  private prevPad = new Set<Action>();
  private padDown = new Set<Action>();
  private pressed = new Set<Action>();
  private prevKey = new Set<Action>();
  private queued = new Set<Action>();
  /** While true, letter keys (WASD/Z/X/M) are ignored so the player can type text. Arrows/Enter/Esc still work. */
  textMode = false;

  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) return;
    for (const a of Object.keys(KEYS) as Action[]) {
      const keys = KEYS[a].map((k) => kb.addKey(k === 'BACKTICK' ? 192 : k, false));
      this.keys.set(a, keys);
      // Event-based edge detection so taps shorter than a frame are never lost.
      for (const k of keys) k.on('down', () => { if (!(this.textMode && isLetter(k))) this.queued.add(a); });
    }
    kb.addCapture('UP,DOWN,LEFT,RIGHT,SPACE,TAB');
  }

  /** Call once per frame at top of update. */
  poll(): void {
    this.pressed.clear();
    const pad = this.scene.input.gamepad?.pad1 ?? null;
    this.padDown.clear();
    if (pad) {
      for (const a of Object.keys(PAD) as Action[]) {
        if (PAD[a].some((b) => pad.buttons[b]?.pressed)) this.padDown.add(a);
      }
      if (pad.axes.length >= 2) {
        const [ax, ay] = [pad.axes[0].getValue(), pad.axes[1].getValue()];
        if (ax < -0.5) this.padDown.add('left'); else if (ax > 0.5) this.padDown.add('right');
        if (ay < -0.5) this.padDown.add('up'); else if (ay > 0.5) this.padDown.add('down');
      }
    }
    const nowKey = new Set<Action>();
    for (const a of this.keys.keys()) if (this.keyDown(a)) nowKey.add(a);
    for (const a of Object.keys(KEYS) as Action[]) {
      const now = nowKey.has(a) || this.padDown.has(a);
      const was = this.prevKey.has(a) || this.prevPad.has(a);
      if (now && !was) this.pressed.add(a);
    }
    for (const a of this.queued) this.pressed.add(a);
    this.queued.clear();
    this.prevKey = nowKey;
    this.prevPad = new Set(this.padDown);
  }

  /** Forget pending presses and treat currently held inputs as already handled (after returning from a menu scene). */
  flush(): void {
    this.queued.clear(); this.pressed.clear();
    const now = new Set<Action>();
    for (const a of this.keys.keys()) if (this.keyDown(a)) now.add(a);
    this.prevKey = now; this.prevPad = new Set(this.padDown);
  }

  private keyDown(a: Action): boolean {
    return (this.keys.get(a) ?? []).some((k) => k.isDown && !(this.textMode && isLetter(k)));
  }
  down(a: Action): boolean { return this.keyDown(a) || this.padDown.has(a); }
  /** True only on the frame the action was first pressed. */
  just(a: Action): boolean { return this.pressed.has(a); }
  /** Currently-held direction, last-pressed priority is approximated by fixed order. */
  heldDir(): 'up' | 'down' | 'left' | 'right' | null {
    for (const d of ['up', 'down', 'left', 'right'] as const) if (this.down(d)) return d;
    return null;
  }
}
