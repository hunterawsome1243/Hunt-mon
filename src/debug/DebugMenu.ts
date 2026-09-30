import type Phaser from 'phaser';
import { MAPS } from '../data/maps';
import { ROMANCE } from '../data/romance/profiles';
import { changeAffection } from '../game/romance/Affection';
import { state } from '../game/state/GameState';
import { SPECIES_LIST } from '../data/creatures';
import { ITEMS } from '../data/items';
import { createCreature, healFully } from '../game/battle/Creature';

/** DOM overlay toggled with backtick. Extended each milestone (items, levels, affection...). */
export class DebugMenu {
  private el: HTMLDivElement;
  open = false;
  constructor(private game: Phaser.Game) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed', right: '8px', top: '8px', background: 'rgba(15,10,30,.92)', color: '#f4ecd8',
      font: '12px monospace', padding: '8px', border: '2px solid #8a5fb0', display: 'none', zIndex: '10', maxHeight: '90vh', overflow: 'auto',
    } as CSSStyleDeclaration);
    document.body.appendChild(this.el);
    window.addEventListener('keydown', (e) => {
      if (e.key === '`') { e.preventDefault(); this.toggle(); }
    });
  }
  toggle(): void {
    this.open = !this.open;
    (this.game.registry as Phaser.Data.DataManager).set('debugOpen', this.open);
    this.el.style.display = this.open ? 'block' : 'none';
    if (this.open) this.render();
  }
  private render(): void {
    this.el.innerHTML = '<b>DEBUG</b> (` to close)<br><br>Warp:<br>';
    for (const m of Object.values(MAPS)) {
      const b = document.createElement('button');
      b.textContent = m.id;
      b.style.margin = '2px';
      b.onclick = () => {
        const sc = this.game.scene.getScene('overworld') as Phaser.Scene & { warpTo?: (m: string, x: number, y: number) => void };
        const s = m.spawn ?? { x: Math.floor(m.w / 2), y: m.h - 3 };
        sc.warpTo?.(m.id, s.x, s.y);
      };
      this.el.appendChild(b);
    }
    const sec = (t: string) => { const h = document.createElement('div'); h.innerHTML = `<br>${t}<br>`; this.el.appendChild(h); };
    const btn = (label: string, fn: () => void) => { const b = document.createElement('button'); b.textContent = label; b.style.margin = '2px'; b.onclick = () => { fn(); this.render(); }; this.el.appendChild(b); };
    sec(`Day ${state.day}`);
    btn('Next day', () => { state.day++; });
    sec('Affection (set to):');
    for (const p of Object.values(ROMANCE)) {
      const row = document.createElement('div');
      row.append(`${p.name} ${state.affection(p.id)}  `);
      this.el.appendChild(row);
      for (const v of [0, 25, 50, 75, 100]) btn(String(v), () => { changeAffection(state, p.id, v - state.affection(p.id)); state.rec(p.id).pending = []; });
    }
    sec('Creatures:');
    const sel = document.createElement('select');
    for (const sp of SPECIES_LIST) { const o = document.createElement('option'); o.value = sp.id; o.textContent = `${sp.dex}. ${sp.name}`; sel.appendChild(o); }
    const lv = document.createElement('input'); lv.type = 'number'; lv.value = '5'; lv.min = '1'; lv.max = '100'; lv.style.width = '48px';
    this.el.append(sel, ' Lv ', lv, document.createElement('br'));
    const ow = () => this.game.scene.getScene('overworld') as Phaser.Scene & { startBattle?: (i: unknown) => void };
    btn('Give', () => { state.addCreature(createCreature(sel.value, Number(lv.value))); });
    btn('Wild battle', () => { this.toggle(); ow().startBattle?.({ foeParty: [createCreature(sel.value, Number(lv.value))], terrain: 'grass' }); });
    btn('Heal party', () => { state.party.forEach(healFully); });
    btn('Set party Lv', () => { state.party.forEach((c) => { c.level = Number(lv.value); healFully(c); }); });
    sec(`Items (money $${state.money}):`);
    btn('+$1000', () => { state.money += 1000; });
    for (const id of ['potion', 'super_potion', 'revive', 'catch_orb', 'great_orb', 'full_heal']) btn(`+5 ${ITEMS[id].name}`, () => state.addItem(id, 5));
    sec('Flags:');
    btn('mira.intro', () => state.setFlag('mira.intro'));
  }
}
