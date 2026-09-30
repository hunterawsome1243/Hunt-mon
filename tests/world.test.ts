import { describe, expect, it } from 'vitest';
import { TILES } from '../src/data/art/tiles';
import { SPECIES } from '../src/data/creatures';
import { DIALOGUE } from '../src/data/dialogue';
import { ENCOUNTERS } from '../src/data/encounters';
import { ITEMS } from '../src/data/items';
import { MAPS, START } from '../src/data/maps';
import { ROMANCE } from '../src/data/romance/profiles';
import { SHOPS } from '../src/data/shops';
import { TRAINERS } from '../src/data/trainers';
import type { Cond, Effect, MapDef } from '../src/data/types';
import { DIRS } from '../src/config';

const maps = Object.values(MAPS);
const key = (x: number, y: number) => `${x},${y}`;

function solidGrid(m: MapDef, npcBlock: boolean): boolean[][] {
  const g = m.ground.map((row, y) => row.map((t, x) => !!TILES[t]?.solid || !!TILES[m.deco[y][x] ?? 'grass']?.solid));
  for (const s of m.signs) g[s.y][s.x] = true;
  if (npcBlock) for (const n of m.npcs) g[n.y][n.x] = true;
  return g;
}
function reach(m: MapDef, from: [number, number], npcBlock = true): Set<string> {
  const g = solidGrid(m, npcBlock);
  const seen = new Set<string>();
  const q: Array<[number, number]> = [];
  if (!g[from[1]]?.[from[0]]) { q.push(from); seen.add(key(...from)); }
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const d of Object.values(DIRS)) {
      const nx = x + d.x, ny = y + d.y;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || g[ny][nx] || seen.has(key(nx, ny))) continue;
      seen.add(key(nx, ny)); q.push([nx, ny]);
    }
  }
  return seen;
}

describe('map data', () => {
  it('uses only known tiles and is rectangular', () => {
    for (const m of maps) {
      expect(m.ground).toHaveLength(m.h); expect(m.deco).toHaveLength(m.h);
      for (let y = 0; y < m.h; y++) {
        expect(m.ground[y], `${m.id} row ${y}`).toHaveLength(m.w); expect(m.deco[y]).toHaveLength(m.w);
        for (let x = 0; x < m.w; x++) {
          expect(TILES[m.ground[y][x]], `${m.id} ground ${m.ground[y][x]} @${x},${y}`).toBeDefined();
          if (m.deco[y][x]) expect(TILES[m.deco[y][x]!], `${m.id} deco ${m.deco[y][x]}`).toBeDefined();
        }
      }
    }
  });

  it('warps lead to real, walkable tiles, and start on walkable tiles', () => {
    for (const m of maps) {
      const g = solidGrid(m, false);
      for (const w of m.warps) {
        expect(g[w.y][w.x], `${m.id} warp source ${w.x},${w.y} is solid`).toBe(false);
        const t = MAPS[w.to];
        expect(t, `${m.id} -> ${w.to}`).toBeDefined();
        expect(solidGrid(t, false)[w.ty]?.[w.tx], `${m.id} -> ${w.to} lands on solid ${w.tx},${w.ty}`).toBe(false);
      }
      if (m.spawn) expect(g[m.spawn.y][m.spawn.x], `${m.id} spawn`).toBe(false);
    }
    expect(solidGrid(MAPS[START.map], false)[START.y][START.x]).toBe(false);
  });

  it('references only existing dialogue, trainers, items and species', () => {
    for (const m of maps) {
      for (const n of m.npcs) {
        if (n.dialogue) expect(DIALOGUE[n.dialogue], `${m.id}:${n.id} dialogue ${n.dialogue}`).toBeDefined();
        if (n.trainer) expect(TRAINERS[n.trainer.id], `${m.id}:${n.id} trainer`).toBeDefined();
        expect(n.dialogue || n.lines || n.trainer, `${m.id}:${n.id} does nothing`).toBeTruthy();
      }
      for (const s of m.signs) expect(s.dialogue ? DIALOGUE[s.dialogue] : s.lines, `${m.id} sign ${s.x},${s.y}`).toBeDefined();
      for (const t of m.triggers) expect(DIALOGUE[t.dialogue], `${m.id} trigger ${t.dialogue}`).toBeDefined();
      for (const p of m.pickups) expect(ITEMS[p.item], `${m.id} pickup ${p.item}`).toBeDefined();
      if (m.autorun) expect(DIALOGUE[m.autorun], `${m.id} autorun`).toBeDefined();
    }
    for (const [id, t] of Object.entries(ENCOUNTERS)) {
      expect(MAPS[id], `encounters for unknown map ${id}`).toBeDefined();
      for (const e of t.entries) expect(SPECIES[e.species], `${id}:${e.species}`).toBeDefined();
    }
    for (const t of Object.values(TRAINERS)) {
      for (const p of [...t.party, ...Object.values(t.variants ?? {}).flat()]) expect(SPECIES[p.species], `${t.id}:${p.species}`).toBeDefined();
    }
    for (const s of Object.values(SHOPS)) for (const i of [...s.stock, ...(s.unlock ?? []).flatMap((u) => u.items)]) expect(ITEMS[i], `${s.id}:${i}`).toBeDefined();
  });

  it('every player-visible spot on each map is reachable from where you arrive', () => {
    const arrivals = new Map<string, Array<[number, number]>>();
    const add = (id: string, p: [number, number]) => arrivals.set(id, [...(arrivals.get(id) ?? []), p]);
    add(START.map, [START.x, START.y]);
    for (const m of maps) for (const w of m.warps) add(w.to, [w.tx, w.ty]);
    const problems: string[] = [];
    for (const m of maps) {
      if (m.autorun) continue;
      const arr = arrivals.get(m.id) ?? [];
      if (!arr.length) problems.push(`${m.id} has no way in`);
      const g = solidGrid(m, false);
      for (const from of arr) {
        const seen = reach(m, from, false);
        for (const w of m.warps) if (!seen.has(key(w.x, w.y))) problems.push(`${m.id}: warp ${w.x},${w.y} unreachable from ${from}`);
        for (const p of m.pickups) if (!seen.has(key(p.x, p.y))) problems.push(`${m.id}: pickup ${p.item} unreachable from ${from}`);
        const spots: Array<[string, number, number]> = [...m.npcs.filter((n) => !n.cond).map((n): [string, number, number] => [n.id, n.x, n.y]), ...m.signs.map((s): [string, number, number] => [`sign${s.x},${s.y}`, s.x, s.y])];
        for (const [id, x, y] of spots) {
          if (!Object.values(DIRS).some((d) => seen.has(key(x + d.x, y + d.y)))) problems.push(`${m.id}: ${id} cannot be reached from ${from}`);
        }
        for (const t of m.triggers) if (g[t.y][t.x]) problems.push(`${m.id}: trigger on solid ${t.x},${t.y}`);
      }
    }
    expect([...new Set(problems)]).toEqual([]);
  });

  it('the whole world is connected through warps', () => {
    const seen = new Set<string>([START.map]);
    const q = [START.map];
    while (q.length) { const id = q.shift()!; for (const w of MAPS[id].warps) if (!seen.has(w.to)) { seen.add(w.to); q.push(w.to); } }
    for (const m of maps) if (!m.autorun) expect(seen.has(m.id), `${m.id} is unreachable`).toBe(true);
  });

  it('trainers see walkable tiles in their line of sight', () => {
    for (const m of maps) {
      const g = solidGrid(m, false);
      for (const n of m.npcs.filter((n) => n.trainer)) {
        const d = DIRS[n.dir];
        let seesFloor = false;
        for (let i = 1; i <= n.trainer!.sight; i++) { const x = n.x + d.x * i, y = n.y + d.y * i; if (g[y]?.[x]) break; seesFloor = true; }
        expect(seesFloor, `${m.id}:${n.id} stares at a wall`).toBe(true);
      }
    }
  });
});

// ------------------------------------------------------------------ script/quest logic
function condFlags(c: Cond | undefined, out: Set<string>): void {
  if (!c) return;
  if ('flag' in c) out.add(c.flag);
  else if ('notFlag' in c) out.add(c.notFlag);
  else if ('all' in c) c.all.forEach((x) => condFlags(x, out));
  else if ('any' in c) c.any.forEach((x) => condFlags(x, out));
  else if ('not' in c) condFlags(c.not, out);
}
function setFlags(e: Effect, out: Set<string>): void { if ('flag' in e) out.add(e.flag); }

describe('story logic', () => {
  it('every flag a condition reads is set somewhere', () => {
    const read = new Set<string>(), set = new Set<string>();
    for (const g of Object.values(DIALOGUE)) for (const n of Object.values(g.nodes)) {
      condFlags(n.cond, read); n.branch?.forEach((b) => condFlags(b.cond, read)); n.choices?.forEach((c) => { condFlags(c.cond, read); c.effects?.forEach((e) => setFlags(e, set)); });
      n.effects?.forEach((e) => setFlags(e, set));
    }
    for (const m of maps) {
      m.npcs.forEach((n) => condFlags(n.cond, read)); m.triggers.forEach((t) => { condFlags(t.cond, read); if (t.once) set.add(t.once); }); m.pickups.forEach((p) => set.add(p.flag));
    }
    // flags set by engine code
    for (const b of ['cinder', 'tidal']) set.add(`badge.${b}`);
    set.add('badge.first'); set.add('badge.second');
    for (const t of Object.keys(TRAINERS)) set.add(`trainer.${t}`);
    for (const r of Object.keys(ROMANCE)) for (const mm of [25, 50, 75, 100]) set.add(`romance.${r}.m${mm}`);
    const missing = [...read].filter((f) => !set.has(f));
    expect(missing).toEqual([]);
  });

  it('dialogue effects reference real items, creatures, commands and shops', () => {
    const cmds = new Set(['sleep', 'heal', 'shop', 'pc', 'gift', 'battle', 'wild', 'badge', 'take', 'date', 'return', 'end', 'warp']);
    for (const g of Object.values(DIALOGUE)) {
      const effs: Effect[] = [];
      for (const n of Object.values(g.nodes)) { n.effects && effs.push(...n.effects); n.choices?.forEach((c) => c.effects && effs.push(...c.effects)); }
      for (const e of effs) {
        if ('give' in e) expect(ITEMS[e.give], `${g.id} gives ${e.give}`).toBeDefined();
        if ('creature' in e) expect(SPECIES[e.creature], `${g.id} creature ${e.creature}`).toBeDefined();
        if ('cmd' in e) {
          expect(cmds.has(e.cmd), `${g.id} unknown cmd ${e.cmd}`).toBe(true);
          if (e.cmd === 'battle') expect(TRAINERS[e.arg!], `${g.id} battle ${e.arg}`).toBeDefined();
          if (e.cmd === 'shop') expect(SHOPS[e.arg!], `${g.id} shop ${e.arg}`).toBeDefined();
          if (e.cmd === 'date') expect(MAPS[`date_${e.arg}`], `${g.id} date ${e.arg}`).toBeDefined();
          if (e.cmd === 'wild') expect(SPECIES[e.arg!.split(',')[0]]).toBeDefined();
        }
      }
    }
  });

  it('romance NPCs are adults with complete milestone content and rewards', () => {
    for (const p of Object.values(ROMANCE)) {
      expect(p.age).toBeGreaterThanOrEqual(25);
      const g = DIALOGUE[p.id];
      expect(g, p.id).toBeDefined();
      for (const k of [25, 50, 75, 100] as const) expect(g.nodes[g.milestones![k]!], `${p.id} m${k}`).toBeDefined();
      expect(DIALOGUE[`date_${p.id}`], `${p.id} date scene`).toBeDefined();
      const effects = JSON.stringify(g.nodes);
      expect(effects).toContain('"creature"'); // special creature at 75
      expect(effects).toContain('"cmd":"date"');
    }
  });

  it('a rival battle exists for each starter and the chain of three rival fights is in the story', () => {
    for (const id of ['rival1', 'rival2', 'rival3']) {
      const t = TRAINERS[id];
      expect(Object.keys(t.variants!).sort()).toEqual(['cinderpup', 'drippet', 'sproutle']);
    }
    const all = JSON.stringify(DIALOGUE);
    for (const id of ['rival1', 'rival2', 'rival3', 'rhea', 'orrin']) expect(all).toContain(`"arg":"${id}"`);
    expect(all).toContain('"cmd":"end"');
  });

  it('the roster has 20+ original creatures and 3 starters', () => {
    expect(Object.keys(SPECIES).length).toBeGreaterThanOrEqual(20);
    for (const s of ['cinderpup', 'drippet', 'sproutle']) expect(SPECIES[s]).toBeDefined();
  });
});
