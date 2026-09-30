// End-to-end bot: starts a new game and WALKS the whole chapter with real keyboard input -
// house -> Elder's lab -> Route 1 -> Brindlemoor -> gym 1 -> Route 2 -> Mistwood -> Hollowdeep -> gym 2 -> Lumen -> credits.
// Trainer battles are fast-forwarded (foe HP is set to 1 on each command turn); everything else is real movement,
// collision, line-of-sight, dialogue, menus and scene transitions.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 5188;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find(existsSync);
mkdirSync('shots', { recursive: true });
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let failed = false;
const fail = (m) => { console.error('FAIL:', m); failed = true; };
const log = (m) => console.log('[walk]', m);
const t0 = Date.now();
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch { /* wait */ } await sleep(200); }
  const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/GL Driver Message/.test(m.text())) logs.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.goto(`http://localhost:${PORT}/?quick`);
  await page.waitForFunction(() => window.__hunt, null, { timeout: 15000 });

  const hunt = (fn, ...a) => page.evaluate(([f, args]) => window.__hunt[f](...args), [fn, a]);
  const st = () => hunt('state');
  const active = (k) => page.evaluate((x) => window.__game.scene.isActive(x), k);
  const phase = () => page.evaluate(() => window.__battle?.phase);
  const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  const press = async (k, ms = 120) => { await page.keyboard.press(k); await sleep(ms); };

  const winBattle = async () => {
    for (let i = 0; i < 3000 && (await active('battle')); i++) {
      if ((await phase()) === 'command') {
        await page.evaluate(() => window.__battle.battle.foeParty.forEach((c) => { c.hp = Math.min(c.hp, 1); }));
        const mi = await page.evaluate(() => window.__battle.firstDamagingMove());
        await press('z', 230);
        for (let k = 0; k < mi; k++) await press('ArrowDown', 90);
        await press('z', 230);
      } else await press('z', 100);
    }
    await sleep(700);
  };

  /** Dismiss dialogue / handle scene changes. Returns true if something was handled (caller should re-evaluate). */
  const interrupt = async (prefer = []) => {
    if (await active('battle')) { log('  battle'); await winBattle(); return true; }
    if (await active('end')) return true;
    const s = await st();
    if (s.dialogue || s.locked || s.menu) {
      if (s.menu && prefer.length) {
        // pick a preferred option by index via the dialogue box's public hook
        const opts = await page.evaluate(() => window.__choiceTexts?.() ?? []);
        for (const p of prefer) { const i = opts.findIndex((o) => o.includes(p)); if (i >= 0) { for (let k = 0; k < i; k++) await press('ArrowDown', 90); break; } }
      }
      await press('z', 260);
      return true;
    }
    return false;
  };

  /** One step toward (gx,gy) using BFS on the live collision grid. */
  const stepToward = async (gx, gy, allowGoalSolid = false) => {
    const g = await hunt('grid');
    const s = await st();
    const blocked = new Set(g.npcs.map((n) => `${n.x},${n.y}`));
    const key = (x, y) => `${x},${y}`;
    const prev = new Map([[key(s.x, s.y), null]]);
    const q = [[s.x, s.y]];
    let found = false;
    while (q.length) {
      const [x, y] = q.shift();
      if (x === gx && y === gy) { found = true; break; }
      for (const [d, [dx, dy]] of Object.entries(D)) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h || prev.has(key(nx, ny))) continue;
        const goal = nx === gx && ny === gy;
        if ((g.solid[ny][nx] || blocked.has(key(nx, ny))) && !(goal && allowGoalSolid)) continue;
        prev.set(key(nx, ny), [x, y, d]);
        q.push([nx, ny]);
      }
    }
    if (!found) return null;
    // first step of the path
    let cur = key(gx, gy), step = null;
    while (prev.get(cur)) { const [px, py, d] = prev.get(cur); step = d; cur = key(px, py); }
    if (!step) return 'here';
    await page.keyboard.down(KEY[step]); await sleep(200); await page.keyboard.up(KEY[step]);
    for (let i = 0; i < 25 && (await st()).moving; i++) await sleep(30);
    return step;
  };

  /** Walk to a tile (or until the map changes). */
  const goto = async (map, gx, gy, label, opts = {}) => {
    const deadline = Date.now() + (opts.timeout ?? 150000);
    let stuck = 0;
    while (Date.now() < deadline) {
      if (await interrupt(opts.prefer)) { stuck = 0; continue; }
      const s = await st();
      if (s.map !== map) return s.map;
      if (s.x === gx && s.y === gy) return 'arrived';
      const r = await stepToward(gx, gy, opts.allowGoalSolid);
      if (r === null) { stuck++; await sleep(300); if (stuck > 20) { fail(`${label}: no path from ${s.x},${s.y} to ${gx},${gy} on ${map}`); return 'nopath'; } }
      else stuck = 0;
    }
    fail(`${label}: timed out on ${map} at ${JSON.stringify(await st())}`);
    await page.screenshot({ path: `shots/walk_timeout.png` });
    return 'timeout';
  };
  const expectMap = async (want, label) => {
    await sleep(900);
    for (let i = 0; i < 40 && (await st()).map !== want; i++) { if (!(await interrupt())) await sleep(200); }
    const s = await st();
    if (s.map !== want) { fail(`${label}: expected map ${want}, on ${s.map}`); throw new Error('lost'); }
    log(`${label}: ${want} (t+${Math.round((Date.now() - t0) / 1000)}s)`);
  };
  /** Stand next to (nx,ny) on the side (fx,fy) relative to the NPC, face it and press confirm. */
  const talkFrom = async (map, sx, sy, face, label, prefer = []) => {
    const r = await goto(map, sx, sy, label);
    if (r !== 'arrived') return false;
    await press(KEY[face], 160);
    await press('z', 300);
    return true;
  };
  const dialogueUntil = async (cond, label, prefer = [], max = 120) => {
    for (let i = 0; i < max; i++) {
      if (await cond()) return true;
      if (await active('battle')) { await winBattle(); continue; }
      const s = await st();
      if (s.menu && prefer.length) {
        const opts = await page.evaluate(() => window.__choiceTexts());
        let idx = -1;
        for (const p of prefer) { idx = opts.findIndex((o) => o.includes(p)); if (idx >= 0) break; }
        if (idx >= 0) { for (let k = 0; k < idx; k++) await press('ArrowDown', 90); }
      }
      await press('z', 280);
    }
    fail(`${label}: dialogue condition never met`);
    return false;
  };
  const flag = (k) => hunt('flag', k);

  // ============================================================ 1. home -> Elder's lab
  log('start in ' + (await st()).map);
  await goto('house_player', 5, 7, 'leave house');
  await expectMap('emberwick', 'left home');
  // the north road is still blocked without a partner (trigger pushes back)
  await goto('emberwick', 15, 3, 'walk to north road');
  await page.keyboard.down('ArrowUp'); await sleep(700); await page.keyboard.up('ArrowUp'); await sleep(600);
  await dialogueUntil(async () => { const s = await st(); return !s.dialogue && !s.locked; }, 'gate blocked w/o starter', [], 10);
  const gate = await st();
  if (gate.map !== 'emberwick') fail('walked past the starter gate without a partner');
  await goto('emberwick', 23, 20, 'to the Elder\'s lab door');
  await expectMap('elder_house', 'entered lab');
  await goto('elder_house', 5, 4, 'lab trigger', { prefer: ['Cinderpup'] });
  await dialogueUntil(() => flag('quest.rival1'), 'lab intro + rival 1', ['Cinderpup']);
  await hunt('setLevel', 0, 55); // keep the bot alive through the long fights
  await dialogueUntil(async () => { const s = await st(); return !s.dialogue && !s.locked && !(await active('battle')); }, 'lab cleanup', [], 60);
  if ((await hunt('item', 'parcel')) < 1) fail('no parcel after the lab');
  await goto('elder_house', 5, 7, 'leave lab');
  await expectMap('emberwick', 'left lab');

  // ============================================================ 2. Route 1 -> Brindlemoor
  await goto('emberwick', 15, 0, 'north exit');
  await expectMap('route1', 'route 1');
  await goto('route1', 4, 30, 'Gran\'s recipe book (side trip)');
  if ((await hunt('item', 'recipe_book')) < 1) fail('recipe book not picked up');
  await goto('route1', 10, 0, 'through Route 1 (trainers)');
  await expectMap('brindlemoor', 'Brindlemoor');

  // ============================================================ 3. lab: parcel for Ilsa
  await goto('brindlemoor', 26, 9, 'lab door');
  await expectMap('brindle_lab', 'lab');
  await talkFrom('brindle_lab', 5, 4, 'up', 'talk to Ilsa');
  await dialogueUntil(() => flag('quest.parcel_done'), 'parcel handover', ['Leave']);
  await dialogueUntil(async () => (await st()).menu || !(await st()).dialogue, 'hub', [], 30);
  await dialogueUntil(async () => { const s = await st(); return !s.dialogue && !s.locked; }, 'leave Ilsa', ['Leave'], 20);
  await goto('brindle_lab', 5, 7, 'leave lab');
  await expectMap('brindlemoor', 'left lab');

  // ============================================================ 4. gym 1
  await goto('brindlemoor', 17, 5, 'gym door');
  await expectMap('brindle_gym', 'gym');
  await goto('brindle_gym', 7, 3, 'walk up to Rhea (gym trainers)');
  await press('ArrowUp', 160); await press('z', 300);
  await dialogueUntil(() => flag('badge.cinder'), 'Rhea challenge', ['Challenge the gym', "I'm ready."]);
  await dialogueUntil(async () => (await st()).menu || !(await st()).dialogue, 'post-gym hub', [], 40);
  await dialogueUntil(async () => { const s = await st(); return !s.dialogue && !s.locked; }, 'leave Rhea', ['Leave'], 20);
  if (!(await flag('quest.mistwood_open'))) fail('Mistwood not opened by Rhea');
  await goto('brindle_gym', 7, 16, 'leave gym');
  await expectMap('brindlemoor', 'left gym');

  // ============================================================ 5. Route 2 -> Mistwood
  await goto('brindlemoor', 35, 14, 'east exit');
  await expectMap('route2', 'route 2');
  await goto('route2', 25, 2, 'ledge: lucky wristband');
  if ((await hunt('item', 'lucky_band')) < 1) fail('wristband not picked up');
  await goto('route2', 39, 9, 'through Route 2 (trainers)');
  await expectMap('mistwood', 'Mistwood');
  await goto('mistwood', 43, 30, 'through Mistwood (rival 2, trainers)');
  await expectMap('hollowdeep', 'Hollowdeep');
  if (!(await flag('quest.rival2'))) fail('rival 2 never happened on the way');

  // ============================================================ 6. cave + gym 2
  await goto('hollowdeep', 22, 0, 'through the cave');
  await expectMap('hollow_hall', 'hall');
  await goto('hollow_hall', 11, 4, 'walk to Orrin (gym trainers)');
  await press('ArrowUp', 160); await press('z', 300);
  await dialogueUntil(() => flag('badge.tidal'), 'Orrin', ["Let's battle!"]);
  await dialogueUntil(async () => { const s = await st(); return !s.dialogue && !s.locked; }, 'after Orrin', [], 40);
  await goto('hollow_hall', 11, 0, 'north door');
  await expectMap('lumen_chamber', 'Lumen chamber');

  // ============================================================ 7. finale
  await goto('lumen_chamber', 7, 10, 'crystal', { prefer: ['Calm it gently'] });
  let ended = false;
  for (let i = 0; i < 300 && !ended; i++) {
    if (await active('end')) { ended = true; break; }
    if (await active('battle')) { await winBattle(); continue; }
    const s = await st();
    if (s.menu) {
      const opts = await page.evaluate(() => window.__choiceTexts());
      const idx = opts.findIndex((o) => o.includes('Calm'));
      for (let k = 0; k < Math.max(0, idx); k++) await press('ArrowDown', 90);
    }
    await press('z', 300);
  }
  if (!ended) fail('credits did not start');
  else { log('credits'); await sleep(2000); await page.screenshot({ path: 'shots/walk_credits.png' }); }
  if (!(await flag('quest.done'))) fail('quest.done missing');
  log(`done in ${Math.round((Date.now() - t0) / 1000)}s`);
  await browser.close();
  if (logs.length) fail('console output:\n' + [...new Set(logs)].join('\n'));
} catch (e) { if (!String(e).includes('lost')) fail(String(e)); }
vite.kill();
console.log(failed ? 'WALKTHROUGH FAILED' : 'WALKTHROUGH OK');
process.exit(failed ? 1 : 0);
