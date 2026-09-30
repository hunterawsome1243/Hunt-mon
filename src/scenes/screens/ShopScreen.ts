import { ITEMS } from '../../data/items';
import { SHOPS } from '../../data/shops';
import { wrap } from '../../engine/ui/wrap';
import { backdrop, COL, text, win } from '../../engine/ui/kit';
import { state } from '../../game/state/GameState';
import type { MenuScene } from '../MenuScene';

/** Discount earned through romance milestones (see Mira's 50 / 75 affection scenes). */
export function discountFor(shopId: string): number {
  if (shopId === 'mira') {
    if (state.flag('romance.mira.m75')) return 0.8;
    if (state.flag('mira.discount')) return 0.9;
  }
  return 1;
}
export const priceOf = (shopId: string, item: string): number => Math.max(1, Math.round(ITEMS[item].price * discountFor(shopId)));

function askQty(m: MenuScene, name: string, unit: number, max: number, verb: string): Promise<number> {
  return m.screen(async (layer) => {
    const g = win(m, 50, 56, 140, 46);
    const t = text(m, 60, 62, '');
    const tot = text(m, 60, 78, '');
    const hint = text(m, 60, 90, '↑↓ ±1  ←→ ±5', COL.dim).setScale(0.75);
    layer.add([g, t, tot, hint]);
    let q = 1;
    const draw = (): void => { t.setText(`${name.slice(0, 12)} x${q}`); tot.setText(`${verb} $${q * unit}`); };
    draw();
    return new Promise<number>((res) => {
      m.handler = (im) => {
        const d = im.just('up') ? 1 : im.just('down') ? -1 : im.just('right') ? 5 : im.just('left') ? -5 : 0;
        if (d) { q = Math.max(1, Math.min(max, q + d)); draw(); }
        if (im.just('confirm')) { m.handler = null; res(q); }
        else if (im.just('back')) { m.handler = null; res(0); }
      };
    });
  }, 'qty');
}

export function shopScreen(m: MenuScene, shopId: string): Promise<void> {
  return m.screen(async (layer) => {
    const shop = SHOPS[shopId];
    layer.add(backdrop(m, shop.name.toUpperCase()));
    const moneyWin = win(m, 150, 19, 86, 16);
    const moneyT = text(m, 232, 23, '', COL.ink).setOrigin(1, 0);
    const descWin = win(m, 4, 110, 232, 46);
    const desc = text(m, 12, 117, '').setLineSpacing(3);
    const note = text(m, 8, 147, '', COL.good).setScale(0.75);
    layer.add([moneyWin, moneyT, descWin, desc, note]);
    const refresh = (): void => { moneyT.setText(`$${state.money}`); const d = discountFor(shopId); note.setText(d < 1 ? `Friend discount: ${Math.round((1 - d) * 100)}% off!` : ''); };
    refresh();
    const stock = (): string[] => [...shop.stock, ...(shop.unlock ?? []).filter((u) => state.flag(u.flag)).flatMap((u) => u.items)];

    for (;;) {
      desc.setText('Welcome! What can I get you?');
      const a = await m.pick({ x: 4, y: 20, w: 70, rows: [{ label: 'Buy' }, { label: 'Sell' }, { label: 'Exit' }], rowH: 13 });
      if (a < 0 || a === 2) break;
      if (a === 0) {
        for (;;) {
          const ids = stock();
          const rows = ids.map((id) => ({ label: ITEMS[id].name.slice(0, 12), right: `$${priceOf(shopId, id)}`, disabled: priceOf(shopId, id) > state.money }));
          const i = await m.pick({ x: 80, y: 38, w: 156, rows, rowH: 11, visible: Math.min(6, rows.length), onMove: (k) => desc.setText(wrap(ITEMS[ids[k]].desc, 26).slice(0, 3).join('\n')) });
          if (i < 0) break;
          const id = ids[i], unit = priceOf(shopId, id);
          const max = Math.max(1, Math.min(99, Math.floor(state.money / unit)));
          const q = await askQty(m, ITEMS[id].name, unit, max, 'Total');
          if (q > 0 && state.money >= q * unit) {
            state.money -= q * unit; state.addItem(id, q); refresh();
            await m.say(`Bought ${q} ${ITEMS[id].name}. Thank you!`);
          }
        }
      } else {
        for (;;) {
          const owned = Object.entries(state.bag).filter(([id, n]) => n > 0 && ITEMS[id] && ITEMS[id].kind !== 'key' && ITEMS[id].kind !== 'evo');
          if (!owned.length) { await m.say('You have nothing I can buy.'); break; }
          const rows = owned.map(([id, n]) => ({ label: `${ITEMS[id].name.slice(0, 11)} x${n}`, right: `$${Math.floor(ITEMS[id].price / 2)}` }));
          const i = await m.pick({ x: 80, y: 38, w: 156, rows, rowH: 11, visible: Math.min(6, rows.length), onMove: (k) => desc.setText(wrap(ITEMS[owned[k][0]].desc, 26).slice(0, 3).join('\n')) });
          if (i < 0) break;
          const [id, n] = owned[i];
          const unit = Math.floor(ITEMS[id].price / 2);
          const q = await askQty(m, ITEMS[id].name, unit, n, 'Get');
          if (q > 0) { state.bag[id] -= q; state.money += q * unit; refresh(); await m.say(`Sold ${q} ${ITEMS[id].name}.`); }
        }
      }
    }
    m.box.hide();
  }, 'shop');
}
