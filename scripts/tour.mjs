// Screenshots every map (at its spawn) into shots/tour_<map>.png and reports console errors.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 5194;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find(existsSync);
mkdirSync('shots', { recursive: true });
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let failed = false;
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch { /* wait */ } await sleep(200); }
  const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/GL Driver Message/.test(m.text())) logs.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.goto(`http://localhost:${PORT}/?quick`);
  await page.waitForFunction(() => window.__hunt, null, { timeout: 15000 });
  const only = process.argv.slice(2);
  const ids = (await page.evaluate(() => window.__hunt.maps)).filter((m) => !only.length || only.includes(m));
  for (const id of ids) {
    // warp onto the map's declared spawn
    const pos = await page.evaluate((id) => { const s = window.__hunt.spawnOf(id); return s; }, id);
    await page.evaluate(([id, p]) => window.__hunt.warp(id, p.x, p.y, p.dir), [id, pos]);
    await sleep(1300);
    await page.screenshot({ path: `shots/tour_${id}.png` });
  }
  await browser.close();
  if (logs.length) { console.error('console output:\n' + [...new Set(logs)].join('\n')); failed = true; }
} catch (e) { console.error(e); failed = true; }
vite.kill();
console.log(failed ? 'TOUR FAILED' : 'TOUR OK');
process.exit(failed ? 1 : 0);
