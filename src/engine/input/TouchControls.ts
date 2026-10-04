import { virtualHeld, virtualQueued } from './virtual';
import type { Action } from './InputManager';

const CSS = `
#touch{position:absolute;inset:0;pointer-events:none;z-index:20;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none;font-family:"Press Start 2P",monospace}
#touch *{touch-action:none;-webkit-tap-highlight-color:transparent}
#touch .pad{position:absolute;pointer-events:auto;border-radius:50%;background:rgba(20,18,36,.55);border:2px solid rgba(232,220,255,.35)}
#touch .stick{left:max(18px,env(safe-area-inset-left));bottom:max(22px,env(safe-area-inset-bottom));width:132px;height:132px}
#touch .knob{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;background:rgba(200,69,47,.85);border:2px solid #f4d9c8;pointer-events:none}
#touch .btn{position:absolute;pointer-events:auto;display:flex;align-items:center;justify-content:center;border-radius:50%;color:#f4ecff;font-size:14px;background:rgba(20,18,36,.6);border:2px solid rgba(232,220,255,.4)}
#touch .btn.on{background:rgba(200,69,47,.85);border-color:#f4d9c8}
#touch .a{right:max(18px,env(safe-area-inset-right));bottom:calc(max(22px,env(safe-area-inset-bottom)) + 44px);width:70px;height:70px}
#touch .b{right:calc(max(18px,env(safe-area-inset-right)) + 80px);bottom:max(22px,env(safe-area-inset-bottom));width:60px;height:60px}
#touch .run{right:calc(max(18px,env(safe-area-inset-right)) + 6px);bottom:max(22px,env(safe-area-inset-bottom));width:44px;height:44px;font-size:8px}
#touch .menu{right:max(14px,env(safe-area-inset-right));top:max(10px,env(safe-area-inset-top));width:auto;height:30px;padding:0 12px;border-radius:15px;font-size:8px}
`;

/** Floating thumb-stick (4-way, dominant axis) plus A / B / RUN / MENU buttons, as a DOM overlay for phones and tablets. */
export class TouchControls {
  private root = document.createElement('div');

  constructor(parent: HTMLElement = document.body) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root.id = 'touch';
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    this.root.append(this.makeStick(), this.button('a', 'A', 'confirm'), this.button('b', 'B', 'back'), this.button('run', 'RUN', 'run'), this.button('menu', 'MENU', 'menu'));
    parent.appendChild(this.root);
  }

  private button(cls: string, label: string, action: Action): HTMLElement {
    const el = document.createElement('div');
    el.className = `btn ${cls}`; el.textContent = label;
    const press = (e: PointerEvent): void => {
      e.preventDefault(); el.setPointerCapture(e.pointerId);
      virtualHeld.add(action); virtualQueued.add(action); el.classList.add('on');
      try { navigator.vibrate?.(8); } catch { /* not supported on iOS */ }
    };
    const release = (): void => { virtualHeld.delete(action); el.classList.remove('on'); };
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
    return el;
  }

  private makeStick(): HTMLElement {
    const base = document.createElement('div');
    base.className = 'pad stick';
    const knob = document.createElement('div');
    knob.className = 'knob';
    base.appendChild(knob);
    const dirs: Action[] = ['up', 'down', 'left', 'right'];
    let id: number | null = null;
    const set = (d: Action | null): void => {
      for (const a of dirs) {
        if (a === d) { if (!virtualHeld.has(a)) { virtualHeld.add(a); virtualQueued.add(a); } }
        else virtualHeld.delete(a);
      }
    };
    const move = (e: PointerEvent): void => {
      const r = base.getBoundingClientRect();
      const sx = e.clientX - (r.left + r.width / 2), sy = e.clientY - (r.top + r.height / 2);
      // when the whole game is turned 90 degrees clockwise (portrait phones), screen axes map to frame axes: x' = y, y' = -x
      const turned = document.getElementById('rot')?.dataset.turned === '1';
      const dx = turned ? sy : sx, dy = turned ? -sx : sy;
      const max = r.width / 2 - 6, len = Math.hypot(dx, dy) || 1, k = Math.min(1, max / len);
      knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
      // dead zone, then pick the dominant axis (grid movement is 4-way)
      if (len < r.width * 0.16) { set(null); return; }
      set(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
    };
    const end = (): void => { id = null; knob.style.transform = ''; set(null); };
    base.addEventListener('pointerdown', (e) => { e.preventDefault(); id = e.pointerId; base.setPointerCapture(id); move(e); });
    base.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    base.addEventListener('pointerup', end);
    base.addEventListener('pointercancel', end);
    base.addEventListener('lostpointercapture', end);
    return base;
  }
}
