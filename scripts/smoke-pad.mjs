// Gamepad smoke: injects a fake standard gamepad and plays title -> new game -> walk -> pause menu using only the pad.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 5189;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find(existsSync);
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let failed = false;
const fail = (m) => { console.error('FAIL:', m); failed = true; };
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch { /* wait */ } await sleep(200); }
  const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/GL Driver Message/.test(m.text())) logs.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.addInitScript(() => {
    const st = { buttons: Array(17).fill(false), axes: [0, 0, 0, 0], plugged: false };
    window.__pad = st;
    const build = () => ({
      id: 'Fake Standard Pad', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(),
      axes: [...st.axes], buttons: st.buttons.map((b) => ({ pressed: b, touched: b, value: b ? 1 : 0 })), vibrationActuator: null,
    });
    navigator.getGamepads = () => (st.plugged ? [build(), null, null, null] : [null, null, null, null]);
    window.__plug = () => { st.plugged = true; const ev = new Event('gamepadconnected'); ev.gamepad = build(); window.dispatchEvent(ev); };
  });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.__title, null, { timeout: 15000 });
  await page.evaluate(() => window.__plug());
  await sleep(800);
  const BTN = { A: 0, B: 1, X: 2, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
  const tap = async (b, ms = 120) => { await page.evaluate(([i, v]) => { window.__pad.buttons[i] = v; }, [BTN[b], true]); await sleep(ms); await page.evaluate(([i, v]) => { window.__pad.buttons[i] = v; }, [BTN[b], false]); await sleep(160); };
  const hold = async (b, ms) => { await page.evaluate(([i, v]) => { window.__pad.buttons[i] = v; }, [BTN[b], true]); await sleep(ms); await page.evaluate(([i, v]) => { window.__pad.buttons[i] = v; }, [BTN[b], false]); await sleep(120); };
  const st = () => page.evaluate(() => window.__hunt.state());
  const active = (k) => page.evaluate((x) => window.__game.scene.isActive(x), k);

  // title: New Game via A, then spell "A" and confirm OK with the d-pad
  await tap('A', 150); await sleep(500);
  await tap('A'); // places "A"
  await tap('UP'); await tap('RIGHT'); await tap('A'); // OK
  await sleep(500);
  await tap('RIGHT'); await tap('A'); // pick the second look
  await page.waitForFunction(() => window.__hunt, null, { timeout: 15000 }).catch(() => fail('pad could not start a new game'));
  await sleep(1800);
  const name = await page.evaluate(() => window.__hunt.name());
  if (name !== 'A') fail('name entry via pad gave "' + name + '"');
  for (let i = 0; i < 12; i++) { const s = await st(); if (!s.locked && !s.dialogue) break; await tap('A'); await sleep(300); }

  // walk with the d-pad and with the left stick
  const s0 = await st();
  await hold('DOWN', 520);
  const s1 = await st();
  if (s1.y <= s0.y) fail(`d-pad did not move the player (${s0.y} -> ${s1.y})`);
  await page.evaluate(() => { window.__pad.axes[0] = 0.9; });
  await sleep(550);
  await page.evaluate(() => { window.__pad.axes[0] = 0; });
  await sleep(300);
  const s2 = await st();
  if (s2.x <= s1.x) fail(`left stick did not move the player (${s1.x} -> ${s2.x})`);

  // pause menu: Start opens, B closes
  await tap('START', 150); await sleep(700);
  if (!(await active('menu'))) fail('Start did not open the pause menu');
  await tap('DOWN'); await tap('A'); await sleep(600); // Party
  await tap('B'); await sleep(300); await tap('B'); await sleep(700);
  if (await active('menu')) fail('B did not close the menus');
  // run with X: faster than walking
  const a0 = await st();
  await page.evaluate(() => { window.__pad.buttons[2] = true; window.__pad.buttons[15] = true; });
  await sleep(1000);
  await page.evaluate(() => { window.__pad.buttons[2] = false; window.__pad.buttons[15] = false; });
  await sleep(300);
  const a1 = await st();
  if (a1.x - a0.x < 4) fail(`running with X too slow: ${a0.x} -> ${a1.x}`);

  await browser.close();
  if (logs.length) fail('console output:\n' + [...new Set(logs)].join('\n'));
} catch (e) { fail(String(e)); }
vite.kill();
console.log(failed ? 'PAD SMOKE FAILED' : 'PAD SMOKE OK');
process.exit(failed ? 1 : 0);
