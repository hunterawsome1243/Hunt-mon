// Renders a contact sheet of all creature sprites -> shots/creatures.png
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
mkdirSync('shots', { recursive: true });
const vite = spawn('npx', ['vite', '--port', '5197', '--strictPort'], { stdio: 'ignore' });
await sleep(2500);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 720, height: 480 } });
await p.goto('http://localhost:5197/');
await p.waitForFunction(() => window.__hunt);
const [from, to] = [Number(process.argv[2] ?? 0), Number(process.argv[3] ?? 100)];
// Render at 2x for visibility
const data = await p.evaluate(([from, to]) => {
  const g = window.__game;
  const ids = g.textures.getTextureKeys().filter((k) => k.startsWith('mon_f_')).map((k) => k.slice(6)).slice(from, to);
  const cols = 8, cell = 56, z = 2;
  const cv = document.createElement('canvas'); cv.width = cols * cell * z; cv.height = Math.ceil(ids.length / cols) * cell * 2 * z;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = '#7fa88a'; c.fillRect(0, 0, cv.width, cv.height);
  ids.forEach((id, i) => {
    const x = (i % cols) * cell * z, y = Math.floor(i / cols) * cell * 2 * z;
    c.drawImage(g.textures.get('mon_f_' + id).getSourceImage(), x, y, cell * z, cell * z);
    c.drawImage(g.textures.get('mon_b_' + id).getSourceImage(), x, y + cell * z, cell * z, cell * z);
  });
  return cv.toDataURL();
}, [from, to]);
writeFileSync('shots/creatures.png', Buffer.from(data.split(',')[1], 'base64'));
await b.close(); vite.kill();
