// Screenshots the day/night cycle, lights, rain, fog and cave dust into shots/atmo_*.png
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
const PORT = 5191;
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
  const hunt = (fn, ...a) => page.evaluate(([f, args]) => window.__hunt[f](...args), [fn, a]);
  const shot = async (name, map, x, y, hour, weather, dir = 'down') => {
    await page.evaluate((w) => { window.__game.registry.set('dbgWeather', w); }, weather);
    await hunt('setWeather', weather);
    await hunt('setHour', hour);
    await hunt('warp', map, x, y, dir);
    await sleep(1800);
    await page.screenshot({ path: `shots/atmo_${name}.png` });
  };
  await shot('ember_noon', 'emberwick', 12, 13, 12, 'clear');
  await shot('ember_dusk', 'emberwick', 12, 13, 18.6, 'clear');
  await shot('ember_night', 'emberwick', 12, 13, 23, 'clear');
  await shot('brindle_night', 'brindlemoor', 16, 18, 22, 'clear', 'up');
  await shot('route1_rain', 'route1', 10, 20, 12, 'rain');
  await shot('route1_storm_night', 'route1', 10, 20, 22, 'heavy_rain');
  await shot('mistwood_fog', 'mistwood', 10, 21, 12, 'clear', 'right');
  await shot('hollowdeep', 'hollowdeep', 6, 30, 12, 'clear', 'right');
  await shot('date_mira_dusk', 'date_mira', 6, 7, 12, 'clear', 'right');
  await shot('date_ilsa_night', 'date_ilsa', 6, 5, 12, 'clear', 'right');
  await shot('house_noon', 'house_player', 5, 5, 23, 'clear');
  await browser.close();
  if (logs.length) { console.error([...new Set(logs)].join('\n')); failed = true; }
} catch (e) { console.error(e); failed = true; }
vite.kill();
console.log(failed ? 'ATMO FAILED' : 'ATMO OK');
process.exit(failed ? 1 : 0);
