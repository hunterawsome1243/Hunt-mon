// Headless smoke test: boots the game, walks around, warps, fails on any console error/warning.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 5199;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find(existsSync);
mkdirSync('shots', { recursive: true });
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let failed = false;
const fail = (m) => { console.error('FAIL:', m); failed = true; };
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch { /* wait */ } await sleep(200); }
  const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.__hunt, null, { timeout: 15000 });
  const st = () => page.evaluate(() => window.__hunt.state());
  await sleep(1200);
  await page.screenshot({ path: 'shots/01_house.png' });
  let s0 = await st();
  await page.keyboard.down('ArrowDown'); await sleep(700); await page.keyboard.up('ArrowDown');
  let s1 = await st();
  if (s1.y <= s0.y) fail(`player did not move down (${JSON.stringify(s0)} -> ${JSON.stringify(s1)})`);
  // walk out through the door: house_player exit at (5,7)
  await page.keyboard.down('ArrowDown'); await sleep(1500); await page.keyboard.up('ArrowDown');
  await sleep(1200);
  s1 = await st();
  if (s1.map !== 'emberwick') fail('did not transition to emberwick: ' + JSON.stringify(s1));
  await page.screenshot({ path: 'shots/02_town.png' });
  // run right for a while
  await page.keyboard.down('Shift'); await page.keyboard.down('ArrowRight'); await sleep(1500);
  await page.keyboard.up('ArrowRight'); await page.keyboard.up('Shift'); await sleep(300);
  await page.screenshot({ path: 'shots/03_run.png' });
  // talk to the elder (17,12): stand at (18,12) facing left
  await page.evaluate(() => window.__game.scene.getScene('overworld').warpTo('emberwick', 18, 12, 'left'));
  await sleep(900);
  await page.keyboard.press('z'); await sleep(200);
  if (!(await st()).dialogue) fail('interaction did not open dialogue');
  await sleep(1200); await page.screenshot({ path: 'shots/04_dialogue.png' });
  let closed = false;
  for (let i = 0; i < 8 && !closed; i++) { await page.keyboard.press(i < 3 ? 'z' : 'x'); await sleep(350); closed = !(await st()).dialogue; }
  if (!closed) fail('dialogue did not close');
  await sleep(300);
  // north exit to route 1
  await page.evaluate(() => window.__game.scene.getScene('overworld').warpTo('emberwick', 15, 3, 'up'));
  await sleep(900);
  await page.keyboard.down('ArrowUp'); await sleep(1600); await page.keyboard.up('ArrowUp'); await sleep(900);
  if ((await st()).map !== 'route1') fail('north exit did not reach route1: ' + JSON.stringify(await st()));
  // tall grass: walk in it
  await page.evaluate(() => window.__game.scene.getScene('overworld').warpTo('route1', 8, 14, 'up'));
  await sleep(900);
  await page.keyboard.down('ArrowUp'); await sleep(900); await page.keyboard.up('ArrowUp');
  await page.screenshot({ path: 'shots/05_route1.png' });
  // Mira: intro -> flirt with a liked trait -> hearts go up
  await page.evaluate(() => window.__game.scene.getScene('overworld').warpTo('house_neighbor', 7, 3, 'left'));
  await sleep(900);
  const press = async (k) => { await page.keyboard.press(k); await sleep(160); };
  const untilMenu = async () => { for (let i = 0; i < 12 && !(await st()).menu; i++) { await press('z'); await sleep(350); } };
  await press('z'); await untilMenu();
  if (!(await st()).menu) fail('Mira menu never appeared');
  await sleep(500); await page.screenshot({ path: 'shots/06_mira_menu.png' });
  await press('ArrowDown'); await press('ArrowDown'); await press('z'); await sleep(300); await untilMenu(); await sleep(700); // Flirt
  if (!(await st()).menu) fail('flirt menu missing');
  await page.screenshot({ path: 'shots/07_flirt_menu.png' });
  await press('z'); await sleep(200); // "Your prices are a crime." (witty, liked)
  await sleep(700);
  await page.screenshot({ path: 'shots/08_flirt_reaction.png' });
  await untilMenu();
  const aff = (await st()).aff.mira;
  if (!(aff > 0)) fail('flirt did not raise affection: ' + aff);
  // every map loads via warp
  for (const m of await page.evaluate(() => window.__hunt.maps)) {
    await page.evaluate((id) => window.__game.scene.getScene('overworld').warpTo(id, 5, 5), m);
    await sleep(900);
    const s = await st();
    if (s.map !== m) fail(`warp to ${m} gave ${s.map}`);
    await page.screenshot({ path: `shots/map_${m}.png` });
  }
  await browser.close();
  if (logs.length) { fail('console output:\n' + [...new Set(logs)].join('\n')); }
} catch (e) { fail(String(e)); }
vite.kill();
console.log(failed ? 'SMOKE FAILED' : 'SMOKE OK');
process.exit(failed ? 1 : 0);
