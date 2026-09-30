// M5 story smoke: plays the chapter's key beats with debug shortcuts + real input:
// lab intro + rival 1, parcel delivery, gym 1, rival 2, gym 2, finale + credits, and a date scene.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 5193;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find(existsSync);
mkdirSync('shots', { recursive: true });
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let failed = false;
const fail = (m) => { console.error('FAIL:', m); failed = true; };
const log = (m) => console.log('[m5]', m);
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch { /* wait */ } await sleep(200); }
  const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/GL Driver Message/.test(m.text())) logs.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.goto(`http://localhost:${PORT}/?quick`);
  await page.waitForFunction(() => window.__hunt, null, { timeout: 15000 });

  const press = async (k, ms = 140) => { await page.keyboard.press(k); await sleep(ms); };
  const st = () => page.evaluate(() => window.__hunt.state());
  const hunt = (fn, ...a) => page.evaluate(([f, args]) => window.__hunt[f](...args), [fn, a]);
  const flag = (k) => hunt('flag', k);
  const battleActive = () => page.evaluate(() => window.__game.scene.isActive('battle'));
  const phase = () => page.evaluate(() => window.__battle?.phase);
  const warp = async (map, x, y, dir = 'up') => { await hunt('warp', map, x, y, dir); await sleep(1100); };
  const free = async () => { const s = await st(); return !s.locked && !s.dialogue && !s.menu; };

  /** Wins the current battle: drops every foe creature to 1 HP, then uses the first damaging move until it ends. */
  const winBattle = async () => {
    for (let i = 0; i < 200 && !(await battleActive()); i++) await sleep(100);
    if (!(await battleActive())) { fail('expected a battle'); return; }
    for (let i = 0; i < 300 && (await phase()) !== 'command'; i++) { await press('z', 100); }
    for (let i = 0; i < 900 && (await battleActive()); i++) {
      if ((await phase()) === 'command') {
        await page.evaluate(() => { const b = window.__battle.battle; b.foeParty.forEach((c) => { c.hp = Math.min(c.hp, 1); }); });
        const mi = await page.evaluate(() => window.__battle.firstDamagingMove());
        await press('z', 250); // Fight
        for (let k = 0; k < mi; k++) await press('ArrowDown', 100);
        await press('z', 250); // first damaging move
      } else await press('z', 110);
    }
    if (await battleActive()) fail('battle did not finish');
    await sleep(900);
  };
  /** Presses confirm until the overworld is free again (or a battle starts). */
  const advance = async (until, maxPresses = 120) => {
    for (let i = 0; i < maxPresses; i++) {
      if (await until()) return true;
      await press('z', 260);
    }
    return false;
  };

  // ---------------------------------------------------------------- chapter opening: lab intro + rival battle 1
  await hunt('setLevel', 0, 5).catch(() => undefined);
  await warp('elder_house', 5, 6, 'up');
  await page.keyboard.down('ArrowUp'); await sleep(650); await page.keyboard.up('ArrowUp');
  await advance(async () => (await battleActive()) || (await st()).menu, 30); // dialogue up to the starter choice
  await page.screenshot({ path: 'shots/40_lab_choice.png' });
  await press('z', 600); // Cinderpup
  await advance(battleActive, 40);
  log('rival 1 battle');
  await winBattle();
  if (!(await advance(free, 60))) fail('lab scene did not release the player');
  if (!(await flag('starter.chosen'))) fail('starter not chosen');
  if (!(await flag('quest.rival1'))) fail('rival 1 flag missing');
  if ((await hunt('party')).length !== 1) fail('expected exactly one starter');
  if ((await hunt('item', 'parcel')) < 1) fail('Elder did not hand over the parcel');

  // ---------------------------------------------------------------- deliver the parcel to Ilsa
  log('parcel delivery');
  await warp('brindle_lab', 5, 4, 'up');
  await press('z', 400);
  await advance(async () => (await st()).menu, 40);
  if (!(await flag('quest.parcel_done'))) fail('parcel was not delivered');
  await page.screenshot({ path: 'shots/41_ilsa.png' });
  await press('x', 500); await advance(free, 20);

  // ---------------------------------------------------------------- gym 1: Rhea
  log('gym 1');
  await hunt('setLevel', 0, 30);
  await warp('brindle_gym', 7, 3, 'up');
  await press('z', 400);
  await advance(async () => (await st()).menu, 30);
  for (let i = 0; i < 3; i++) await press('ArrowDown', 130);
  await press('z', 700); // Challenge the gym
  await advance(async () => (await st()).menu, 10);
  await page.screenshot({ path: 'shots/42_gym_challenge.png' });
  await press('z', 600); // I'm ready
  await winBattle();
  await advance(async () => (await st()).menu || (await free()), 60);
  if (!(await flag('badge.cinder'))) fail('no Cinder Badge');
  if (!(await flag('quest.mistwood_open'))) fail('Mistwood not opened');
  await press('x', 500); await advance(free, 20);

  // ---------------------------------------------------------------- rival 2 at the Mistwood gate
  log('rival 2');
  await warp('mistwood', 3, 20, 'right');
  await page.keyboard.down('ArrowRight'); await sleep(900); await page.keyboard.up('ArrowRight');
  await advance(battleActive, 60);
  await winBattle();
  if (!(await advance(free, 40))) fail('rival 2 scene did not finish');
  if (!(await flag('quest.rival2'))) fail('rival 2 flag missing');

  // ---------------------------------------------------------------- gym 2: Orrin
  log('gym 2');
  await warp('hollow_hall', 11, 4, 'up');
  await press('z', 400);
  await advance(async () => (await st()).menu, 30);
  await press('z', 600); // Let's battle
  await winBattle();
  await advance(free, 60);
  if (!(await flag('badge.tidal'))) fail('no Tidal Badge');
  if (!(await flag('quest.lumen_open'))) fail('Lumen chamber not opened');

  // ---------------------------------------------------------------- finale
  log('finale');
  await warp('lumen_chamber', 7, 12, 'up');
  await page.keyboard.down('ArrowUp'); await sleep(500); await page.keyboard.up('ArrowUp');
  await advance(battleActive, 60); // up to rival 3
  await winBattle();
  await advance(async () => (await battleActive()) || (await st()).menu, 60); // up to the choice / guardian fight
  if (!(await battleActive())) await press('z', 600);
  await winBattle();
  let sawEnd = false;
  for (let i = 0; i < 80 && !sawEnd; i++) { await press('z', 300); sawEnd = await page.evaluate(() => window.__game.scene.isActive('end')); }
  if (!sawEnd) fail('credits never started');
  await sleep(2500); await page.screenshot({ path: 'shots/43_credits.png' });
  for (let i = 0; i < 40; i++) { await page.keyboard.down('z'); await sleep(250); }
  await page.keyboard.up('z');
  await sleep(1500); await page.screenshot({ path: 'shots/44_credits_end.png' });
  await press('z', 1500);
  await page.waitForFunction(() => window.__game.scene.isActive('overworld'), null, { timeout: 15000 });
  await sleep(800);
  if (!(await flag('quest.done'))) fail('quest.done not set');
  await advance(free, 10);

  // ---------------------------------------------------------------- a date scene
  log('date');
  await hunt('setAff', 'mira', 100);
  await hunt('setFlag', 'romance.mira.m100'); await hunt('setFlag', 'mira.date_ready');
  const day = (await st()).day;
  await warp('house_neighbor', 7, 3, 'left');
  await press('z', 400);
  await advance(async () => (await st()).menu, 30);
  for (let i = 0; i < 5; i++) await press('ArrowDown', 120);
  await press('z', 900); // Go for a walk
  await advance(async () => (await st()).map === 'date_mira', 20);
  await sleep(1800); await page.screenshot({ path: 'shots/45_date.png' });
  await advance(async () => (await st()).map === 'emberwick', 80);
  await sleep(1500);
  await advance(free, 20);
  if (!(await flag('mira.date_done'))) fail('date not completed');
  if (!((await st()).day > day)) fail('date did not advance the day');
  await page.screenshot({ path: 'shots/46_after_date.png' });

  await browser.close();
  if (logs.length) fail('console output:\n' + [...new Set(logs)].join('\n'));
} catch (e) { fail(String(e)); }
vite.kill();
console.log(failed ? 'M5 SMOKE FAILED' : 'M5 SMOKE OK');
process.exit(failed ? 1 : 0);
