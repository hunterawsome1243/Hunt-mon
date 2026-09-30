import Phaser from 'phaser';
import { DEPTH, TILE, VIEW_W } from '../../config';
import { SPEAKER_LOOK } from '../../data/dialogue';
import { ITEMS } from '../../data/items';
import { SPECIES } from '../../data/creatures';
import { ROMANCE } from '../../data/romance/profiles';
import type { Expression, FlirtReaction } from '../../data/types';
import type { AffectionChange } from '../../game/romance/Affection';
import { state } from '../../game/state/GameState';
import { safeShake } from '../fx/Safe';
import { DialogueBox, drawWindow, textStyle } from '../ui/DialogueBox';
import type { DialogueUI } from './DialogueRunner';

export interface UiHooks {
  /** world position (tile) of the NPC currently talked to, for emotes */
  npcActor(npc: string): { px: number; py: number } | undefined;
  command(name: string, arg?: string): Promise<void>;
  sfx?(name: string): void;
}

/** Binds the pure DialogueRunner to the on-screen DialogueBox and world effects. */
export class SceneDialogueUI implements DialogueUI {
  private toastQueue: string[] = [];
  private toasting = false;

  constructor(private scene: Phaser.Scene, public box: DialogueBox, private hooks: UiHooks) {}

  private portraitKey(speaker?: string, npc?: string): string | undefined {
    const look = npc ? ROMANCE[npc]?.look : speaker ? SPEAKER_LOOK[speaker] : undefined;
    return look ? `p_${look}` : undefined;
  }
  private opts(o: { speaker?: string; portrait?: Expression; npc?: string }) {
    return { speaker: o.speaker, portrait: o.portrait, npc: o.npc, portraitKey: o.speaker ? this.portraitKey(o.speaker, o.npc) : undefined, affection: o.npc ? state.affection(o.npc) : 0 };
  }

  say(o: { speaker?: string; portrait?: Expression; text: string; npc?: string }): Promise<void> {
    return this.box.say({ ...this.opts(o), text: o.text });
  }
  choose(o: { speaker?: string; portrait?: Expression; text?: string; options: string[]; npc?: string }): Promise<number> {
    return this.box.choose({ ...this.opts(o), text: o.text, options: o.options });
  }

  affectionFx(npc: string, ch: AffectionChange, reaction?: FlirtReaction): void {
    if (ch.delta === 0 && !reaction) return;
    const gained = ch.delta > 0;
    this.box.pulseHearts(ch.after, gained);
    const a = this.hooks.npcActor(npc);
    if (!a) return;
    const x = a.px, y = a.py - 26;
    if (gained) {
      const n = Math.min(3, 1 + Math.floor(ch.delta / 4));
      for (let i = 0; i < n; i++) {
        const h = this.scene.add.image(x + (i - (n - 1) / 2) * 10, y, 'ui_heart', 0).setDepth(DEPTH.fx).setAlpha(0).setScale(0.6);
        this.scene.tweens.add({ targets: h, y: y - 14, alpha: 1, scale: 1, duration: 320, delay: i * 90, ease: 'Back.easeOut',
          onComplete: () => this.scene.tweens.add({ targets: h, alpha: 0, y: h.y - 6, duration: 300, delay: 250, onComplete: () => h.destroy() }) });
      }
      this.hooks.sfx?.('heart');
    } else if (ch.delta < 0 || reaction === 'eye_roll' || reaction === 'pushy') {
      const frame = reaction === 'pushy' ? 0 : reaction === 'eye_roll' ? 1 : 3;
      const e = this.scene.add.image(x, y, 'ui_emote', frame).setDepth(DEPTH.fx).setAlpha(0);
      this.scene.tweens.add({ targets: e, alpha: 1, y: y - 8, duration: 220, ease: 'Back.easeOut',
        onComplete: () => this.scene.tweens.add({ targets: e, alpha: 0, duration: 260, delay: 520, onComplete: () => e.destroy() }) });
      if (reaction === 'pushy') safeShake(this.scene.cameras.main, 180, 0.004);
      this.hooks.sfx?.('nope');
    }
  }

  milestone(npc: string, m: number): void {
    const name = ROMANCE[npc]?.name ?? npc;
    const line = m >= 100 ? `${name} adores you!` : m >= 75 ? `${name} is falling for you!` : m >= 50 ? `${name} really likes you!` : `${name} warmed up to you!`;
    this.toast(line);
  }
  give(item: string, qty: number): void {
    state.addItem(item, qty);
    this.toast(`Received ${ITEMS[item]?.name ?? item}${qty > 1 ? ' x' + qty : ''}!`);
  }
  giveCreature(species: string, level: number): void {
    const c = state.giveStarter(species, level);
    this.toast(`${SPECIES[c.species].name} joined your party!`);
  }
  command(name: string, arg?: string): Promise<void> { return this.hooks.command(name, arg); }

  toast(msg: string): void { this.toastQueue.push(msg); void this.drain(); }
  private async drain(): Promise<void> {
    if (this.toasting) return;
    this.toasting = true;
    while (this.toastQueue.length) {
      const msg = this.toastQueue.shift()!;
      const w = msg.length * 8 + 22, h = 16;
      const g = this.scene.add.graphics(); drawWindow(g, 0, 0, w, h);
      const t = this.scene.add.text(16, 4, msg, textStyle());
      const heart = this.scene.add.image(5, 4, 'ui_heart', 0).setOrigin(0, 0);
      const c = this.scene.add.container((VIEW_W - w) / 2, -h - 2, [g, t, heart]).setScrollFactor(0).setDepth(DEPTH.ui + 20);
      await new Promise<void>((res) => this.scene.tweens.add({ targets: c, y: 4, duration: 260, ease: 'Back.easeOut', onComplete: () => res() }));
      await new Promise<void>((res) => this.scene.time.delayedCall(1500, () => res()));
      await new Promise<void>((res) => this.scene.tweens.add({ targets: c, y: -h - 2, duration: 200, ease: 'Quad.easeIn', onComplete: () => res() }));
      c.destroy();
    }
    this.toasting = false;
  }
}
void TILE;
