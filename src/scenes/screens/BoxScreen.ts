import { backdrop, text } from '../../engine/ui/kit';
import { Creature, maxHp, nameOf } from '../../game/battle/Creature';
import { state } from '../../game/state/GameState';
import type { MenuScene } from '../MenuScene';
import { summaryScreen } from './SummaryScreen';

const row = (c: Creature) => ({ label: `${nameOf(c).slice(0, 9)} Lv${c.level}`, right: c.hp > 0 ? `${c.hp}/${maxHp(c)}` : 'FNT', color: c.hp <= 0 ? '#c8452f' : undefined });

/** Storage PC: move creatures between the party and the box. The last healthy party member must stay. */
export function boxScreen(m: MenuScene): Promise<void> {
  return m.screen(async (layer) => {
    layer.add(backdrop(m, 'STORAGE BOX'));
    const info = text(m, 6, 149, '', '#b8a8d8');
    layer.add(info);
    for (;;) {
      info.setText(`Party ${state.party.length}/6   Box ${state.box.length}`);
      const a = await m.pick({ x: 4, y: 20, w: 100, rows: [{ label: 'Deposit' }, { label: 'Withdraw' }, { label: 'Summary' }, { label: 'Close' }], rowH: 13 });
      if (a < 0 || a === 3) break;
      if (a === 0) {
        if (state.party.length <= 1) { await m.say('You need at least one creature with you!'); continue; }
        const rows = state.party.map(row).map((r, i) => ({ ...r, disabled: state.party.filter((c) => c.hp > 0).length <= 1 && state.party[i].hp > 0 }));
        const i = await m.pick({ x: 110, y: 20, w: 126, rows, rowH: 12, visible: Math.min(6, rows.length) });
        if (i >= 0) { const [c] = state.party.splice(i, 1); state.box.push(c); await m.say(`${nameOf(c)} was sent to the box.`); }
      } else if (a === 1) {
        if (!state.box.length) { await m.say('The box is empty.'); continue; }
        if (state.party.length >= 6) { await m.say('Your party is full.'); continue; }
        const rows = state.box.map(row);
        const i = await m.pick({ x: 110, y: 20, w: 126, rows, rowH: 12, visible: Math.min(8, rows.length) });
        if (i >= 0) { const [c] = state.box.splice(i, 1); state.party.push(c); await m.say(`${nameOf(c)} joined your party.`); }
      } else if (a === 2) {
        if (!state.box.length) { await m.say('The box is empty.'); continue; }
        const i = await m.pick({ x: 110, y: 20, w: 126, rows: state.box.map(row), rowH: 12, visible: Math.min(8, state.box.length) });
        if (i >= 0) {
          // borrow the party-summary view by temporarily viewing the box member
          const c = state.box[i];
          state.party.push(c);
          await summaryScreen(m, state.party.length - 1);
          state.party.pop();
        }
      }
    }
  });
}
