// Mobile emulation of the single-file build: portrait + landscape screenshots, joystick drag + A button via real touch events.
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find(existsSync);
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
let bad = false;
for (const [name, vp] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 3, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/GL Driver|GPU stall/.test(m.text())) logs.push(m.text()); });
  page.on('pageerror', (e) => logs.push('pageerror ' + e.message));
  await page.goto('file:///home/user/Hunt-mon/dist-single/hunt-mon.html');
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 20000 });
  await sleep(1500);
  await page.screenshot({ path: `shots/touch_${name}_title.png` });
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const tap = async (sel) => { const r = await page.locator(sel).boundingBox(); await touch('touchStart', r.x + r.width / 2, r.y + r.height / 2); await sleep(80); await touch('touchEnd'); await sleep(250); };
  // New Game -> name -> pick look, via A taps
  await tap('#touch .a'); await sleep(500);
  for (let i = 0; i < 3; i++) { await tap('#touch .a'); await sleep(300); } // letter, then move to OK is tested below by stick
  // stick: push down to OK row, right, then A
  const s = await page.locator('#touch .stick').boundingBox();
  const cx = s.x + s.width / 2, cy = s.y + s.height / 2;
  await touch('touchStart', cx, cy); await touch('touchMove', cx, cy + 50); await sleep(150); await touch('touchMove', cx, cy); await sleep(150);
  await touch('touchEnd');
  await page.screenshot({ path: `shots/touch_${name}_name.png` });
  console.log(name, 'scene title active:', await page.evaluate(() => window.__game.scene.isActive('title')), 'logs:', logs.length ? [...new Set(logs)] : 'none');
  if (logs.length) bad = true;
  await ctx.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
