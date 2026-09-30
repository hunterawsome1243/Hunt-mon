import { backdrop, COL, text, win } from '../../engine/ui/kit';
import { state } from '../../game/state/GameState';
import type { MenuScene } from '../MenuScene';

interface Opt { label: string; get: () => string; step: (d: number) => void }

export const optionRows = (): Opt[] => {
  const o = state.options;
  const cycle = (v: number, d: number, n: number) => (v + d + n) % n;
  return [
    { label: 'Text speed', get: () => ['Slow', 'Normal', 'Fast'][o.textSpeed], step: (d) => { o.textSpeed = cycle(o.textSpeed, d, 3); } },
    { label: 'Running', get: () => (o.runToggle ? 'Toggle' : 'Hold'), step: () => { o.runToggle = !o.runToggle; } },
    { label: 'Screen shake', get: () => (o.shake ? 'On' : 'Off'), step: () => { o.shake = !o.shake; } },
    { label: 'Screen flashes', get: () => (o.flashes ? 'On' : 'Off'), step: () => { o.flashes = !o.flashes; } },
    { label: 'Music', get: () => `${'|'.repeat(o.musicVol)}${'.'.repeat(10 - o.musicVol)}`, step: (d) => { o.musicVol = Math.max(0, Math.min(10, o.musicVol + d)); } },
    { label: 'Sound FX', get: () => `${'|'.repeat(o.sfxVol)}${'.'.repeat(10 - o.sfxVol)}`, step: (d) => { o.sfxVol = Math.max(0, Math.min(10, o.sfxVol + d)); } },
  ];
};

export function optionsScreen(m: MenuScene): Promise<void> {
  return m.screen(async (layer) => {
    layer.add(backdrop(m, 'OPTIONS'));
    layer.add(win(m, 4, 19, 232, 120));
    const dyn = m.add.container(0, 0);
    layer.add(dyn);
    layer.add(text(m, 6, 146, '←→ change   X: back', '#b8a8d8').setScale(0.9));
    let sel = 0;
    const render = (): void => {
      dyn.removeAll(true);
      optionRows().forEach((r, i) => {
        const y = 28 + i * 17;
        if (i === sel) dyn.add(text(m, 10, y, '>', COL.hi));
        dyn.add(text(m, 22, y, r.label));
        dyn.add(text(m, 226, y, `< ${r.get()} >`, i === sel ? COL.hi : COL.ink).setOrigin(1, 0));
      });
    };
    render();
    return new Promise<void>((res) => {
      m.handler = (im) => {
        const rows = optionRows();
        if (im.just('back')) { m.handler = null; res(); return; }
        if (im.just('up')) { sel = (sel + rows.length - 1) % rows.length; render(); }
        else if (im.just('down')) { sel = (sel + 1) % rows.length; render(); }
        else if (im.just('left')) { rows[sel].step(-1); render(); }
        else if (im.just('right') || im.just('confirm')) { rows[sel].step(1); render(); }
      };
    });
  });
}
