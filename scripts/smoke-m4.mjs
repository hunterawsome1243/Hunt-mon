// M4 smoke: title/new game, pause menu screens, shop, healing, PC, gifts, save + continue.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 5196;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find(existsSync);
mkdirSync('shots', { recursive: true });
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let failed = false;
const fail = (m) => { console.error('FAIL:', m); failed = true; };
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch { /* wait */ } await sleep(200); }
  const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 720, height: 480 } });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  const press = async (k, ms = 140) => { await page.keyboard.press(k); await sleep(ms); };
  const st = () => page.evaluate(() => window.__hunt.state());
  const hunt = (fn, ...a) => page.evaluate(([f, args]) => window.__hunt[f](...args), [fn, a]);
  const active = (key) => page.evaluate((k) => window.__game.scene.isActive(k), key);
  const untilMenuScene = async (want, ms = 6000) => { for (let i = 0; i < ms / 100 && (await active('menu')) !== want; i++) await sleep(100); return (await active('menu')) === want; };

  // ---------- title -> new game ----------
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.__title, null, { timeout: 15000 });
  await sleep(1500);
  await page.screenshot({ path: 'shots/20_title.png' });
  await press('z', 400); // New Game
  await sleep(500);
  await page.keyboard.type('Rae', { delay: 60 });
  await sleep(200);
  await page.screenshot({ path: 'shots/21_name.png' });
  // move cursor to OK (bottom row, right) and confirm
  await press('ArrowUp'); await press('ArrowRight'); await press('Enter', 400);
  await sleep(300);
  await page.screenshot({ path: 'shots/22_look.png' });
  await press('ArrowRight'); await press('Enter', 400);
  await page.waitForFunction(() => window.__hunt, null, { timeout: 15000 });
  await sleep(1800);
  let s = await st();
  if (s.map !== 'house_player') fail('new game did not start in the house: ' + JSON.stringify(s));
  await press('z', 600); await press('z', 600); await press('z', 400); // dismiss welcome message
  const name = await page.evaluate(() => window.__hunt.name());
  if (name !== 'Rae') fail('name entry failed: ' + name);

  // ---------- pause menu screens ----------
  await hunt('giveStarter', 'cinderpup', 8);
  await hunt('addMon', 'wrenlet', 4);
  await hunt('addMon', 'sparkit', 6);
  await sleep(300);
  await press('m', 500);
  if (!(await untilMenuScene(true))) fail('pause menu did not open');
  await sleep(400); await page.screenshot({ path: 'shots/23_pause.png' });
  // Dex
  await press('z', 600); await page.screenshot({ path: 'shots/24_dex.png' }); await press('x', 400);
  // Party -> summary
  await press('ArrowDown'); await press('z', 600); await page.screenshot({ path: 'shots/25_party.png' });
  await press('z', 400); await press('z', 600); await page.screenshot({ path: 'shots/26_summary.png' });
  await press('ArrowRight', 400); await page.screenshot({ path: 'shots/27_summary_moves.png' });
  await press('x', 300); await press('x', 500);
  // Bag
  await press('ArrowDown'); await press('z', 600); await page.screenshot({ path: 'shots/28_bag.png' }); await press('x', 400);
  // Card
  await press('ArrowDown'); await press('z', 600); await page.screenshot({ path: 'shots/29_card.png' }); await press('x', 400);
  // Options: flip text speed then back
  await press('ArrowDown'); await press('ArrowDown'); await press('z', 600);
  await press('ArrowRight', 200); await page.screenshot({ path: 'shots/30_options.png' }); await press('x', 400);
  // Save to slot 1
  await press('ArrowUp'); await press('z', 600); await press('z', 400); await sleep(1500);
  await page.screenshot({ path: 'shots/31_save.png' });
  const slotSaved = await page.evaluate(() => !!localStorage.getItem('huntmon.save.1'));
  if (!slotSaved) fail('save slot 1 empty after saving');
  await press('x', 400); await press('x', 400);
  // close pause menu
  for (let i = 0; i < 4 && (await active('menu')); i++) await press('x', 400);
  if (await active('menu')) fail('menu did not close');
  await sleep(300);
  s = await st();
  if (s.locked) fail('player still locked after closing menu');

  // ---------- shop (Mira), gift, flirt state ----------
  const moneyBefore = await hunt('money');
  await page.evaluate(() => window.__game.scene.getScene('overworld').warpTo('house_neighbor', 7, 3, 'left'));
  await sleep(1000);
  const pressUntil = async (cond, key = 'z', n = 14) => { for (let i = 0; i < n && !(await cond()); i++) await press(key, 350); };
  await press('z'); await pressUntil(async () => (await st()).menu);
  await press('z', 900); // Browse wares -> shop opens
  if (!(await untilMenuScene(true))) fail('shop did not open');
  await sleep(500); await page.screenshot({ path: 'shots/32_shop.png' });
  await press('z', 500); // Buy
  await press('z', 500); // first item (potion)
  await press('z', 500); // quantity 1 -> confirm
  await sleep(1400);
  const moneyAfter = await hunt('money');
  if (!(moneyAfter < moneyBefore)) fail(`buying did not cost money (${moneyBefore} -> ${moneyAfter})`);
  await press('x', 300); await press('x', 300); await press('x', 300); // leave lists and shop
  await sleep(1200);
  for (let i = 0; i < 4 && (await active('menu')); i++) await press('x', 400);
  if (await active('menu')) fail('shop did not close');

  // gift: give a sweet bun (liked)
  await hunt('addItem', 'sweet_bun', 1);
  await pressUntil(async () => (await st()).menu && !(await active('menu')), 'z', 4);
  await sleep(300);
  await press('ArrowDown'); await press('z', 900); // "Give a gift"
  if (await untilMenuScene(true)) {
    await sleep(400); await page.screenshot({ path: 'shots/33_gift.png' });
    await press('z', 900);
    await sleep(1500);
  } else fail('gift menu did not open');
  await pressUntil(async () => (await st()).menu || !(await st()).dialogue, 'z', 10);
  const aff = (await st()).aff.mira ?? 0;
  if (!(aff > 0)) fail('gift did not raise affection: ' + aff);

  // ---------- care hut: heal + PC ----------
  await hunt('hpAll', 1);
  await page.evaluate(() => window.__game.scene.getScene('overworld').warpTo('care_center', 5, 4, 'up'));
  await sleep(1000);
  await press('z'); await pressUntil(async () => (await st()).menu);
  await press('z', 400); // Yes, please
  await pressUntil(async () => !(await st()).dialogue, 'z', 12);
  await sleep(800);
  const party = await hunt('party');
  if (party.some((c) => c.hp <= 1)) fail('care hut did not heal: ' + JSON.stringify(party));
  // PC
  await page.evaluate(() => window.__game.scene.getScene('overworld').warpTo('care_center', 9, 2, 'up'));
  await sleep(1000);
  await press('z'); await pressUntil(async () => (await st()).menu);
  await press('z', 900);
  if (!(await untilMenuScene(true))) fail('PC did not open the box');
  await press('z', 500); // Deposit
  await press('z', 600); // first party member -> box
  await sleep(1300);
  await page.screenshot({ path: 'shots/34_box.png' });
  await press('x', 400); await press('ArrowDown'); await press('ArrowDown'); await press('ArrowDown'); await press('z', 600); // Close
  for (let i = 0; i < 4 && (await active('menu')); i++) await press('x', 400);
  if ((await hunt('box')) !== 1) fail('deposit failed, box=' + (await hunt('box')));

  // ---------- reload + continue ----------
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.__title, null, { timeout: 15000 });
  await sleep(1500);
  await press('ArrowDown'); await press('z', 500); // Continue
  await sleep(300); await page.screenshot({ path: 'shots/35_continue.png' });
  await press('z', 400);
  await page.waitForFunction(() => window.__hunt, null, { timeout: 15000 });
  await sleep(1500);
  const loaded = await hunt('party');
  const nm = await page.evaluate(() => window.__hunt.name());
  console.log('loaded party', JSON.stringify(loaded.map((c) => c.sp)), 'name', nm);
  if (nm !== 'Rae') fail('continue restored wrong name: ' + nm);
  if (loaded.length !== 3 || loaded[0].sp !== 'cinderpup') fail('continue restored wrong party: ' + JSON.stringify(loaded));

  await browser.close();
  if (logs.length) fail('console output:\n' + [...new Set(logs)].join('\n'));
} catch (e) { fail(String(e)); }
vite.kill();
console.log(failed ? 'M4 SMOKE FAILED' : 'M4 SMOKE OK');
process.exit(failed ? 1 : 0);
