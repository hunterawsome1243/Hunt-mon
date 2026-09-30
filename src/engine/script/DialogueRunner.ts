import { DIALOGUE } from '../../data/dialogue';
import type { DialogueGraph, DialogueNode, Effect, Expression, FlirtReaction } from '../../data/types';
import { AffectionChange, changeAffection, flirt } from '../../game/romance/Affection';
import { applyBasicEffect, evalCond } from '../../game/script/Conditions';
import type { GameState } from '../../game/state/GameState';
import { Rng } from '../rng';

/** Everything the runner needs from the presentation layer; tests provide a mock. */
export interface DialogueUI {
  say(o: { speaker?: string; portrait?: Expression; text: string; npc?: string }): Promise<void>;
  /** Shows `text` (if any), then the options; resolves to the chosen index. */
  choose(o: { speaker?: string; portrait?: Expression; text?: string; options: string[]; npc?: string }): Promise<number>;
  affectionFx(npc: string, change: AffectionChange, reaction?: FlirtReaction): void;
  milestone(npc: string, m: number): void;
  command(name: string, arg?: string): Promise<void>;
  give(item: string, qty: number): void;
}

const MAX_STEPS = 500; // guard against authoring loops with no player input

export class DialogueRunner {
  constructor(private ui: DialogueUI, private s: GameState, private rng: Rng, private graphs: Record<string, DialogueGraph> = DIALOGUE) {}

  private fmt(t: string): string { return t.replace(/\{player\}/g, this.s.playerName); }

  private async effect(e: Effect, g: DialogueGraph): Promise<void> {
    if (applyBasicEffect(e, this.s)) return;
    if ('affection' in e) { const ch = changeAffection(this.s, e.affection, e.delta); this.ui.affectionFx(e.affection, ch); this.announce(e.affection, ch); }
    else if ('give' in e) this.ui.give(e.give, e.qty ?? 1);
    else if ('cmd' in e) await this.ui.command(e.cmd, e.arg);
    void g;
  }
  private announce(npc: string, ch: AffectionChange): void { for (const m of ch.crossed) this.ui.milestone(npc, m); }

  async run(graphId: string): Promise<void> {
    const g = this.graphs[graphId];
    if (!g) throw new Error(`Unknown dialogue graph: ${graphId}`);
    if (g.npc) this.s.rec(g.npc).met = true;
    let id: string | undefined = g.start;
    let steps = 0;
    while (id && steps++ < MAX_STEPS) {
      const node: DialogueNode | undefined = g.nodes[id];
      if (!node) throw new Error(`Dialogue ${graphId}: missing node "${id}"`);
      id = await this.node(g, id, node);
    }
  }

  /** Executes one node and returns the id of the next node (undefined = end). */
  private async node(g: DialogueGraph, id: string, node: DialogueNode): Promise<string | undefined> {
    if (node.cond && !evalCond(node.cond, this.s)) return node.next;
    if (node.branch) {
      const hit = node.branch.find((b) => evalCond(b.cond, this.s));
      if (hit) return hit.next;
      if (!node.text && !node.choices) return node.next;
    }
    if (node.hub && g.npc) {
      const rec = this.s.rec(g.npc);
      while (rec.pending.length) {
        const m = rec.pending.shift()!;
        const target = g.milestones?.[m as 25 | 50 | 75 | 100];
        if (target) { await this.playChain(g, target, id); }
      }
    }
    const raw = node.alts?.length && this.rng.chance(1 - 1 / (node.alts.length + 1)) ? this.rng.pick(node.alts) : node.text;
    const text = raw ? this.fmt(raw) : undefined;
    const base = { speaker: node.speaker, portrait: node.portrait, npc: g.npc };

    if (node.choices) {
      const avail = node.choices.filter((c) => evalCond(c.cond, this.s));
      const idx = await this.ui.choose({ ...base, text, options: avail.map((c) => this.fmt(c.text)) });
      const c = avail[idx] ?? avail[avail.length - 1];
      for (const e of c.effects ?? []) await this.effect(e, g);
      if (c.flirt && g.npc) {
        const r = flirt(this.s, g.npc, c.flirt.trait, c.flirt.forward ?? 0, this.rng);
        this.ui.affectionFx(g.npc, r, r.reaction);
        this.announce(g.npc, r);
        return c.outcomes?.[r.reaction] ?? g.react?.[r.reaction] ?? c.next;
      }
      return c.next;
    }
    if (text) await this.ui.say({ ...base, text });
    for (const e of node.effects ?? []) await this.effect(e, g);
    return node.end ? undefined : node.next;
  }

  /** Play nodes starting at `from` until the chain returns to `until` (or ends). */
  private async playChain(g: DialogueGraph, from: string, until: string): Promise<void> {
    let id: string | undefined = from;
    let steps = 0;
    while (id && id !== until && steps++ < MAX_STEPS) id = await this.node(g, id, g.nodes[id]);
  }
}
