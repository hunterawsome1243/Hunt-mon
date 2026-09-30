import type { FlirtReaction, Trait } from '../../data/types';
import { ROMANCE } from '../../data/romance/profiles';
import type { GameState } from '../state/GameState';
import { rng as defaultRng, Rng } from '../../engine/rng';

export const MILESTONES = [25, 50, 75, 100] as const;
export const MAX_AFFECTION = 100;

export const hearts = (aff: number): number => Math.min(5, Math.floor(aff / 20));

export interface AffectionChange { delta: number; before: number; after: number; crossed: number[]; heartsBefore: number; heartsAfter: number }

/** Adds (or removes) affection, clamps, and records newly reached milestones. */
export function changeAffection(s: GameState, npc: string, delta: number): AffectionChange {
  const r = s.rec(npc);
  const before = r.affection;
  r.affection = Math.max(0, Math.min(MAX_AFFECTION, before + delta));
  const crossed: number[] = [];
  for (const m of MILESTONES) {
    if (before < m && r.affection >= m && !r.milestones.includes(m)) {
      r.milestones.push(m); r.pending.push(m); crossed.push(m);
      s.setFlag(`romance.${npc}.m${m}`);
    }
  }
  return { delta: r.affection - before, before, after: r.affection, crossed, heartsBefore: hearts(before), heartsAfter: hearts(r.affection) };
}

export interface FlirtResult extends AffectionChange { reaction: FlirtReaction }

/**
 * Resolve a flirt attempt. Personality decides the base result; pushing past the NPC's daily patience
 * costs affection and locks flirting until tomorrow; lines that are too forward for the current
 * closeness land badly even if the NPC likes that style.
 */
export function flirt(s: GameState, npc: string, trait: Trait, forward = 0, rng: Rng = defaultRng): FlirtResult {
  const p = ROMANCE[npc];
  const r = s.rec(npc);
  if (r.flirtDay !== s.day) { r.flirtDay = s.day; r.flirtCount = 0; }
  const done = (reaction: FlirtReaction, delta: number): FlirtResult => ({ ...changeAffection(s, npc, delta), reaction });

  if (r.brushUntilDay > s.day) return done('brushed', -1);
  r.flirtCount++;
  if (r.flirtCount > p.patience) {
    r.brushUntilDay = s.day + 1;
    return done('pushy', -8);
  }
  if (r.affection < forward) return done('eye_roll', -3);
  if (p.dislikes.includes(trait)) return done('eye_roll', -4);
  if (p.likes.includes(trait)) {
    // diminishing returns for repeated flirting the same day, so it can't be button-mashed
    const base = 7 - (r.flirtCount - 1) * 2 + rng.int(0, 2);
    return done('love', Math.max(2, base));
  }
  return done('meh', rng.int(1, 2));
}

export interface GiftResult extends AffectionChange { reaction: 'loved' | 'liked' | 'disliked' | 'already' }

/** Gift logic works on item tags (items land in M4). One gift per day counts. */
export function giveGift(s: GameState, npc: string, tags: string[]): GiftResult {
  const p = ROMANCE[npc];
  const r = s.rec(npc);
  if (r.giftDay === s.day) return { ...changeAffection(s, npc, 0), reaction: 'already' };
  r.giftDay = s.day;
  const loved = tags.some((t) => p.giftLikes.includes(t));
  const hated = tags.some((t) => p.giftDislikes.includes(t));
  if (hated && !loved) return { ...changeAffection(s, npc, -4), reaction: 'disliked' };
  if (loved) return { ...changeAffection(s, npc, hated ? 3 : 8), reaction: 'loved' };
  return { ...changeAffection(s, npc, 2), reaction: 'liked' };
}

/** Advance the calendar; flirt counters reset lazily via flirtDay. */
export function nextDay(s: GameState): void { s.day++; }
