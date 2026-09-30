import { BADGES } from '../../data/badges';
import { backdrop, COL, text, win } from '../../engine/ui/kit';
import { fmtPlay } from '../../game/save/SaveManager';
import { state } from '../../game/state/GameState';
import type { MenuScene } from '../MenuScene';

/** Trainer card with badge case. */
export function cardScreen(m: MenuScene): Promise<void> {
  return m.screen(async (layer) => {
    layer.add(backdrop(m, 'TRAINER CARD'));
    layer.add(win(m, 4, 19, 232, 62));
    layer.add(m.add.image(40, 70, `c_${state.look}`, 0).setOrigin(0.5, 1).setScale(2));
    const rows = [['Name', state.playerName], ['Money', `$${state.money}`], ['Dex', `${Object.keys(state.dex.caught).length} caught / ${Object.keys(state.dex.seen).length} seen`], ['Time', fmtPlay(state.playMs)], ['Day', String(state.day)]];
    rows.forEach(([k, v], i) => { layer.add(text(m, 80, 25 + i * 11, k, COL.dim)); layer.add(text(m, 128, 25 + i * 11, v)); });
    layer.add(win(m, 4, 85, 232, 70));
    layer.add(text(m, 10, 90, 'BADGES', COL.dim));
    BADGES.forEach((b, i) => {
      const x = 14 + (i % 4) * 56, y = 104 + Math.floor(i / 4) * 26;
      const has = state.badges.includes(b.id);
      const g = m.add.graphics();
      const col = has ? Phaser.Display.Color.HexStringToColor(b.color).color : 0x4a4260;
      g.fillStyle(0x1b1530, 1).fillCircle(x + 8, y + 8, 9).fillStyle(col, 1).fillCircle(x + 8, y + 8, 7);
      if (has) g.fillStyle(0xffffff, 0.55).fillRect(x + 5, y + 4, 3, 2).fillStyle(0xf8d038, 1).fillRect(x + 7, y + 7, 3, 3);
      layer.add(g);
      layer.add(text(m, x + 20, y + 4, has ? b.name.split(' ')[0] : '???', has ? COL.ink : COL.dim).setScale(0.8));
    });
    await m.waitBack();
  }, 'card');
}
import Phaser from 'phaser';
