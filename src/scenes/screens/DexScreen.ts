import { SPECIES_LIST } from '../../data/creatures';
import { wrap } from '../../engine/ui/wrap';
import { backdrop, COL, text, typeChip, win } from '../../engine/ui/kit';
import { state } from '../../game/state/GameState';
import type { MenuScene } from '../MenuScene';

const VIS = 10;

/** Creature dex: seen entries show art, caught entries show full details. */
export function dexScreen(m: MenuScene): Promise<void> {
  return m.screen(async (layer) => {
    const seen = Object.keys(state.dex.seen).length, caught = Object.keys(state.dex.caught).length;
    layer.add(backdrop(m, `DEX   Seen ${seen}  Caught ${caught}`));
    const dyn = m.add.container(0, 0);
    layer.add(dyn);
    let sel = 0, top = 0;
    const render = (): void => {
      dyn.removeAll(true);
      if (sel < top) top = sel; else if (sel >= top + VIS) top = sel - VIS + 1;
      dyn.add(win(m, 4, 19, 104, 137));
      SPECIES_LIST.slice(top, top + VIS).forEach((sp, k) => {
        const y = 25 + k * 13, i = top + k;
        const s = state.dex.seen[sp.id], c = state.dex.caught[sp.id];
        if (i === sel) dyn.add(text(m, 8, y, '>', COL.hi));
        dyn.add(text(m, 18, y, `${String(sp.dex).padStart(2, '0')} ${s ? sp.name.slice(0, 9) : '---------'}`, s ? COL.ink : COL.dim));
        if (c) dyn.add(m.add.image(98, y + 4, 'ui_heart', 0).setScale(0.6));
      });
      dyn.add(win(m, 112, 19, 124, 137));
      const sp = SPECIES_LIST[sel];
      const s = state.dex.seen[sp.id], c = state.dex.caught[sp.id];
      if (s) {
        const img = m.add.image(174, 78, `mon_f_${sp.id}`).setOrigin(0.5, 1);
        if (!c) img.setTintFill(0x3a2f5c);
        dyn.add(img);
        dyn.add(text(m, 118, 25, `No.${String(sp.dex).padStart(3, '0')} ${sp.name}`));
        if (c) {
          sp.types.forEach((t, i) => dyn.add(typeChip(m, t, 118 + i * 40, 83)));
          dyn.add(text(m, 118, 96, wrap(sp.dexText, 14).slice(0, 7).join('\n'), COL.ink).setLineSpacing(2).setScale(0.9));
        } else dyn.add(text(m, 118, 96, 'Catch one to learn\nmore about it.', COL.dim).setLineSpacing(3));
      } else dyn.add(text(m, 174, 80, '?', COL.dim).setOrigin(0.5).setScale(3));
    };
    render();
    return new Promise<void>((res) => {
      m.handler = (im) => {
        if (im.just('back')) { m.handler = null; res(); return; }
        const n = SPECIES_LIST.length;
        if (im.just('up')) { sel = (sel + n - 1) % n; render(); }
        else if (im.just('down')) { sel = (sel + 1) % n; render(); }
        else if (im.just('left')) { sel = Math.max(0, sel - VIS); render(); }
        else if (im.just('right')) { sel = Math.min(n - 1, sel + VIS); render(); }
      };
    });
  });
}
