import { ITEMS } from '../../data/items';
import type { ItemDef } from '../../data/types';
import { wrap } from '../../engine/ui/wrap';
import { backdrop, COL, text, win } from '../../engine/ui/kit';
import { canUseOn, useOn } from '../../game/systems/Items';
import { state } from '../../game/state/GameState';
import type { MenuScene } from '../MenuScene';
import { partyScreen } from './PartyScreen';

const TABS: Array<{ name: string; kinds: ItemDef['kind'][] }> = [
  { name: 'Items', kinds: ['heal', 'status', 'revive'] },
  { name: 'Orbs', kinds: ['ball'] },
  { name: 'Gifts', kinds: ['gift'] },
  { name: 'Key', kinds: ['key', 'evo'] },
];
const VIS = 6;

/**
 * Field bag. In 'gift' mode it only lists gift items and resolves with the chosen item id (null if cancelled);
 * the caller consumes the item.
 */
export function bagScreen(m: MenuScene, o: { mode: 'field' | 'gift' }): Promise<string | null> {
  return m.screen(async (layer) => {
    const gift = o.mode === 'gift';
    layer.add(backdrop(m, gift ? 'CHOOSE A GIFT' : 'BAG'));
    const dyn = m.add.container(0, 0);
    layer.add(dyn);
    let tab = gift ? 2 : 0, sel = 0, top = 0;
    const list = (): Array<[string, number]> => Object.entries(state.bag).filter(([id, n]) => n > 0 && ITEMS[id] && TABS[tab].kinds.includes(ITEMS[id].kind));
    const render = (): void => {
      dyn.removeAll(true);
      const items = list();
      sel = Math.min(sel, Math.max(0, items.length - 1));
      if (sel < top) top = sel; else if (sel >= top + VIS) top = sel - VIS + 1;
      if (!gift) TABS.forEach((t, i) => {
        const x = 6 + i * 58;
        dyn.add(win(m, x, 18, 54, 14));
        dyn.add(text(m, x + 27, 21, t.name, i === tab ? COL.hi : COL.dim).setOrigin(0.5, 0));
        if (i === tab) dyn.add(m.add.rectangle(x + 4, 30, 46, 2, 0xc8452f).setOrigin(0, 0));
      });
      dyn.add(win(m, 4, 36, 232, 72));
      if (!items.length) dyn.add(text(m, 120, 66, gift ? 'No gifts in your bag.' : 'Nothing here.', COL.dim).setOrigin(0.5, 0));
      items.slice(top, top + VIS).forEach(([id, n], k) => {
        const y = 42 + k * 11, i = top + k;
        if (i === sel) dyn.add(text(m, 10, y, '>', COL.hi));
        dyn.add(text(m, 22, y, ITEMS[id].name));
        dyn.add(text(m, 226, y, `x${n}`).setOrigin(1, 0));
      });
      if (items.length > VIS) {
        dyn.add(m.add.rectangle(231, 40 + (top / (items.length - VIS)) * 56, 2, 10, 0x8a5fb0).setOrigin(0, 0));
      }
      dyn.add(win(m, 4, 110, 232, 46));
      const it = items[sel] && ITEMS[items[sel][0]];
      dyn.add(text(m, 12, 117, it ? wrap(it.desc, 26).slice(0, 2).join('\n') : '', COL.ink).setLineSpacing(3));
      dyn.add(text(m, 232, 146, `$${state.money}`, COL.dim).setOrigin(1, 0));
    };
    render();

    return new Promise<string | null>((resolve) => {
      let busy = false;
      const finish = (v: string | null): void => { m.handler = null; resolve(v); };
      m.handler = (im) => {
        if (busy) return;
        const items = list();
        if (im.just('back')) { finish(null); return; }
        if (!gift && im.just('left')) { tab = (tab + TABS.length - 1) % TABS.length; sel = 0; top = 0; render(); }
        else if (!gift && im.just('right')) { tab = (tab + 1) % TABS.length; sel = 0; top = 0; render(); }
        else if (im.just('up') && items.length) { sel = (sel + items.length - 1) % items.length; render(); }
        else if (im.just('down') && items.length) { sel = (sel + 1) % items.length; render(); }
        else if (im.just('confirm') && items.length) {
          const id = items[sel][0], it = ITEMS[id];
          if (gift) { finish(id); return; }
          busy = true;
          void (async () => {
            if (['heal', 'status', 'revive'].includes(it.kind)) {
              const i = await partyScreen(m, { mode: 'pick', prompt: `Use ${it.name} on...`, allow: (c) => canUseOn(id, c) });
              if (i >= 0) {
                const r = useOn(id, state.party[i]);
                if (r.ok) state.bag[id]--;
                await m.say(r.msg);
              }
            } else if (it.kind === 'ball') await m.say('Orbs can only be thrown at wild creatures.');
            else if (it.kind === 'gift') await m.say('Give this to someone by talking to them.');
            else await m.say('Nothing to do with this right now.');
            render();
            busy = false;
          })();
        }
      };
    });
  }, 'bag');
}
