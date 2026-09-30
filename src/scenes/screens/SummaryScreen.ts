import { MOVES } from '../../data/moves';
import { SPECIES } from '../../data/creatures';
import { wrap } from '../../engine/ui/wrap';
import { backdrop, COL, drawBar, text, typeChip, win } from '../../engine/ui/kit';
import { calcStats, maxHp, nameOf, xpForLevel } from '../../game/battle/Creature';
import { state } from '../../game/state/GameState';
import type { MenuScene } from '../MenuScene';

const STAT_ROWS: Array<[keyof import('../../data/types').Stats, string]> = [['hp', 'HP'], ['atk', 'Attack'], ['def', 'Defense'], ['spa', 'Sp.Atk'], ['spd', 'Sp.Def'], ['spe', 'Speed']];

/** Two-page creature summary: Up/Down = previous/next creature, Left/Right = page. */
export function summaryScreen(m: MenuScene, start: number): Promise<void> {
  return m.screen(async (layer) => {
    let idx = start, page = 0, mv = 0;
    const party = state.party;
    const content = m.add.container(0, 0);
    layer.add(content);
    const render = (): void => {
      content.removeAll(true);
      const c = party[idx];
      const sp = SPECIES[c.species];
      content.add(backdrop(m, `SUMMARY ${idx + 1}/${party.length}  ${page === 0 ? 'INFO' : 'MOVES'}`));
      content.add(win(m, 4, 19, 76, 86));
      content.add(m.add.image(42, 92, `mon_f_${c.species}`).setOrigin(0.5, 1));
      content.add(text(m, 8, 108, nameOf(c).slice(0, 10)));
      content.add(text(m, 8, 119, `Lv${c.level}  No.${String(sp.dex).padStart(3, '0')}`, COL.dim));
      sp.types.forEach((t, i) => content.add(typeChip(m, t, 8 + i * 40, 131)));
      if (page === 0) {
        content.add(win(m, 84, 19, 152, 86));
        const s = calcStats(c);
        STAT_ROWS.forEach(([k, label], i) => {
          const y = 26 + i * 12;
          content.add(text(m, 92, y, label));
          content.add(text(m, 226, y, k === 'hp' ? `${c.hp}/${s.hp}` : String(s[k]), c.hp <= 0 && k === 'hp' ? COL.bad : COL.ink).setOrigin(1, 0));
        });
        content.add(win(m, 84, 108, 152, 48));
        const lo = xpForLevel(sp.curve, c.level), hi = xpForLevel(sp.curve, c.level + 1);
        content.add(text(m, 92, 115, `EXP ${c.xp}`));
        content.add(text(m, 92, 127, `Next Lv ${Math.max(0, hi - c.xp)}`, COL.dim));
        const g = m.add.graphics(); drawBar(g, 92, 141, 136, (c.xp - lo) / Math.max(1, hi - lo), 'xp'); content.add(g);
        const hp = m.add.graphics(); drawBar(hp, 8, 152, 66, c.hp / maxHp(c)); content.add(hp);
        if (c.status) content.add(text(m, 130, 127, c.status.toUpperCase(), COL.bad));
      } else {
        content.add(win(m, 84, 19, 152, 86));
        c.moves.forEach((slot, i) => {
          const d = MOVES[slot.id], y = 25 + i * 20;
          if (i === mv) content.add(text(m, 88, y + 4, '>', COL.hi));
          content.add(text(m, 97, y, d.name));
          content.add(typeChip(m, d.type, 97, y + 9));
          content.add(text(m, 226, y, `${slot.pp}/${slot.maxPp}`, slot.pp === 0 ? COL.bad : COL.ink).setOrigin(1, 0));
          content.add(text(m, 226, y + 9, d.power ? `Pow ${d.power}` : 'Status', COL.dim).setOrigin(1, 0).setScale(0.75));
        });
        content.add(win(m, 84, 108, 152, 48));
        const d = MOVES[c.moves[mv]?.id ?? 'tackle'];
        content.add(text(m, 92, 115, wrap(d.desc, 17).slice(0, 3).join('\n')).setLineSpacing(2));
      }
    };
    render();
    return new Promise<void>((res) => {
      m.handler = (im) => {
        if (im.just('back')) { m.handler = null; res(); return; }
        if (im.just('left') || im.just('right')) { page = 1 - page; render(); }
        else if (page === 0 && im.just('up')) { idx = (idx + party.length - 1) % party.length; render(); }
        else if (page === 0 && im.just('down')) { idx = (idx + 1) % party.length; render(); }
        else if (page === 1 && im.just('up')) { mv = (mv + party[idx].moves.length - 1) % party[idx].moves.length; render(); }
        else if (page === 1 && im.just('down')) { mv = (mv + 1) % party[idx].moves.length; render(); }
      };
    });
  });
}
