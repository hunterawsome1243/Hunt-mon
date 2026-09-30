import type Phaser from 'phaser';
import { SPECIES } from '../../data/creatures';
import { MAPS } from '../../data/maps';
import { backdrop, COL, text, win } from '../../engine/ui/kit';
import { fmtPlay, SaveManager, SaveSummary } from '../../game/save/SaveManager';
import { state } from '../../game/state/GameState';
import type { MenuScene, PlayerPos } from '../MenuScene';

export const saves = new SaveManager();

export function drawSlot(m: Phaser.Scene, layer: Phaser.GameObjects.Container, i: number, s: SaveSummary | null, sel: boolean): void {
  const y = 20 + i * 45;
  layer.add(win(m, 4, y, 232, 42));
  if (sel) layer.add(m.add.rectangle(6, y + 19, 3, 5, 0xc8452f).setOrigin(0, 0));
  layer.add(text(m, 14, y + 6, `SLOT ${i + 1}`, COL.dim).setScale(0.8));
  if (!s) { layer.add(text(m, 14, y + 22, '- empty -', COL.dim)); return; }
  layer.add(text(m, 60, y + 5, `${s.name}  Day ${s.day}`));
  layer.add(text(m, 60, y + 17, s.mapName, COL.dim));
  layer.add(text(m, 60, y + 28, `${fmtPlay(s.playMs)}  Dex ${s.dexCaught}  Badges ${s.badges}`, COL.dim).setScale(0.8));
  s.party.slice(0, 6).forEach((sp, k) => layer.add(m.add.image(150 + (k % 3) * 28, y + 12 + Math.floor(k / 3) * 14, `mon_i_${sp}`).setOrigin(0.5).setScale(0.5)));
  void SPECIES;
}

/** Slot picker used for saving. Resolves true if a save was written. */
export function saveScreen(m: MenuScene, _mode: 'save', pos: PlayerPos): Promise<boolean> {
  return m.screen(async (layer) => {
    layer.add(backdrop(m, 'SAVE GAME'));
    const dyn = m.add.container(0, 0);
    layer.add(dyn);
    let sel = 0, saved = false;
    const render = (): void => {
      dyn.removeAll(true);
      saves.summaries().forEach((s, i) => drawSlot(m, dyn, i, s, i === sel));
    };
    render();
    return new Promise<boolean>((res) => {
      let busy = false;
      m.handler = (im) => {
        if (busy) return;
        if (im.just('back')) { m.handler = null; res(saved); return; }
        if (im.just('up')) { sel = (sel + 2) % 3; render(); }
        else if (im.just('down')) { sel = (sel + 1) % 3; render(); }
        else if (im.just('confirm')) {
          busy = true;
          void (async () => {
            const existing = saves.read(sel + 1);
            if (!existing || await m.confirm('Overwrite this save?')) {
              const ok = saves.write(sel + 1, state, { ...pos, look: state.look }, MAPS[pos.map]?.name ?? pos.map);
              await m.say(ok ? 'Game saved!' : 'Saving failed. Is browser storage disabled?');
              if (ok) saved = true;
              render();
            }
            busy = false;
          })();
        }
      };
    });
  }, 'save');
}
