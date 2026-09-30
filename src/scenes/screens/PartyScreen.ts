import { backdrop, COL, drawBar, text, win } from '../../engine/ui/kit';
import { Creature, maxHp, nameOf } from '../../game/battle/Creature';
import { state } from '../../game/state/GameState';
import type { MenuScene } from '../MenuScene';
import { summaryScreen } from './SummaryScreen';

export interface PartyOpts {
  mode: 'browse' | 'pick';
  prompt?: string;
  /** pick mode: which members may be chosen */
  allow?: (c: Creature, i: number) => boolean;
}

const SLOT = { w: 114, h: 43 };
const pos = (i: number): { x: number; y: number } => ({ x: 4 + (i % 2) * 118, y: 19 + Math.floor(i / 2) * 46 });
const STATUS_COL: Record<string, number> = { burn: 0xe8623a, poison: 0xa05ac0, sleep: 0x8a8aa0, paralysis: 0xd8b020 };

/** Party grid. Browse mode offers Summary / Switch; pick mode returns the chosen index (or -1). */
export function partyScreen(m: MenuScene, o: PartyOpts): Promise<number> {
  return m.screen(async (layer) => {
    layer.add(backdrop(m, o.mode === 'pick' ? o.prompt ?? 'Choose a creature' : 'PARTY'));
    const party = state.party;
    let sel = 0;
    let busy = false;
    let switchFrom = -1;
    const slotLayer = m.add.container(0, 0);
    const cursor = m.add.graphics();
    const hint = text(m, 6, 149, '', '#b8a8d8');
    layer.add([slotLayer, cursor, hint]);
    m.tweens.add({ targets: cursor, alpha: 0.35, duration: 380, yoyo: true, repeat: -1 });

    const render = (): void => {
      slotLayer.removeAll(true);
      for (let i = 0; i < 6; i++) {
        const { x, y } = pos(i);
        const c = party[i];
        const g = win(m, x, y, SLOT.w, SLOT.h);
        slotLayer.add(g);
        if (!c) { slotLayer.add(text(m, x + 40, y + 17, '- empty -', '#b8a8d8')); continue; }
        const dim = o.mode === 'pick' && o.allow && !o.allow(c, i);
        const col = c.hp <= 0 ? COL.bad : dim ? '#9a8fb0' : COL.ink;
        slotLayer.add(m.add.image(x + 18, y + 22, `mon_i_${c.species}`).setOrigin(0.5).setAlpha(dim || c.hp <= 0 ? 0.55 : 1));
        slotLayer.add(text(m, x + 36, y + 6, nameOf(c).slice(0, 8), col));
        slotLayer.add(text(m, x + SLOT.w - 7, y + 6, `Lv${c.level}`, col).setOrigin(1, 0));
        const bar = m.add.graphics();
        drawBar(bar, x + 50, y + 20, 56, c.hp / maxHp(c));
        slotLayer.add(bar);
        slotLayer.add(text(m, x + 36, y + 19, 'HP', COL.gold).setScale(0.75));
        slotLayer.add(text(m, x + SLOT.w - 7, y + 28, `${c.hp}/${maxHp(c)}`, col).setOrigin(1, 0));
        if (c.status) {
          const b = m.add.graphics(); b.fillStyle(STATUS_COL[c.status], 1).fillRect(x + 37, y + 29, 24, 8);
          slotLayer.add(b);
          slotLayer.add(text(m, x + 38, y + 29, c.status.slice(0, 3).toUpperCase(), '#ffffff').setScale(0.75));
        } else if (c.hp <= 0) slotLayer.add(text(m, x + 37, y + 29, 'FAINTED', COL.bad).setScale(0.75));
      }
      cursor.clear();
      const { x, y } = pos(sel);
      cursor.lineStyle(2, switchFrom >= 0 ? 0x2f7d3a : 0xc8452f, 1).strokeRect(x - 1, y - 1, SLOT.w + 2, SLOT.h + 2);
      if (switchFrom >= 0) { const p = pos(switchFrom); cursor.lineStyle(2, 0x2f7d3a, 0.6).strokeRect(p.x - 1, p.y - 1, SLOT.w + 2, SLOT.h + 2); }
      hint.setText(switchFrom >= 0 ? 'Move where? Z: place  X: cancel' : o.mode === 'pick' ? 'Z: choose   X: back' : 'Z: options   X: back');
    };
    render();

    return new Promise<number>((resolve) => {
      const finish = (v: number): void => { m.handler = null; resolve(v); };
      m.handler = (im) => {
        if (busy) return;
        const n = Math.max(1, party.length);
        let s = sel;
        if (im.just('left') && s % 2 === 1) s--;
        else if (im.just('right') && s % 2 === 0 && s + 1 < n) s++;
        else if (im.just('up') && s >= 2) s -= 2;
        else if (im.just('down') && s + 2 < n) s += 2;
        if (s !== sel) { sel = s; render(); }
        if (im.just('back')) {
          if (switchFrom >= 0) { switchFrom = -1; render(); } else finish(-1);
          return;
        }
        if (!im.just('confirm') || !party[sel]) return;
        if (switchFrom >= 0) {
          [party[switchFrom], party[sel]] = [party[sel], party[switchFrom]];
          switchFrom = -1; render(); return;
        }
        if (o.mode === 'pick') {
          if (o.allow && !o.allow(party[sel], sel)) return;
          finish(sel); return;
        }
        busy = true;
        void (async () => {
          const i = await m.pick({ x: 150, y: 96, w: 86, rows: [{ label: 'Summary' }, { label: 'Switch', disabled: party.length < 2 }, { label: 'Cancel' }], rowH: 12, cancelable: true });
          if (i === 0) { await summaryScreen(m, sel); render(); }
          else if (i === 1) { switchFrom = sel; render(); }
          busy = false;
        })();
      };
    });
  });
}
