// Renders every music track and sound effect offline in headless Chromium and checks the samples are
// audible, finite and not clipping. (Nobody can listen in CI, so this guards against silent/broken audio.)
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 5192;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find(existsSync);
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let failed = false;
const fail = (m) => { console.error('FAIL:', m); failed = true; };
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch { /* wait */ } await sleep(200); }
  const browser = await chromium.launch({ executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/GL Driver Message/.test(m.text())) logs.push(m.text()); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.goto(`http://localhost:${PORT}/?quick`);
  await page.waitForFunction(() => window.__audioTools, null, { timeout: 15000 });
  const report = await page.evaluate(async () => {
    const { tracks, sfx, renderTrack, renderSfx } = window.__audioTools;
    const stats = (d) => {
      let peak = 0, sum = 0, bad = 0;
      for (let i = 0; i < d.length; i++) { const v = d[i]; if (!Number.isFinite(v)) { bad++; continue; } peak = Math.max(peak, Math.abs(v)); sum += v * v; }
      // fraction of 50ms windows that are not silent
      const win = 1100; let active = 0, n = 0;
      for (let i = 0; i < d.length; i += win) { let e = 0; for (let j = i; j < Math.min(d.length, i + win); j++) e += d[j] * d[j]; n++; if (e / win > 1e-6) active++; }
      return { peak, rms: Math.sqrt(sum / d.length), bad, active: active / n };
    };
    const out = { tracks: {}, sfx: {} };
    for (const id of tracks) out.tracks[id] = stats(await renderTrack(id, 12));
    for (const id of sfx) out.sfx[id] = stats(await renderSfx(id, 1.2));
    return out;
  });
  for (const [id, s] of Object.entries(report.tracks)) {
    console.log(`track ${id.padEnd(15)} peak ${s.peak.toFixed(2)} rms ${s.rms.toFixed(3)} active ${(s.active * 100).toFixed(0)}%`);
    if (s.bad) fail(`${id}: ${s.bad} non-finite samples`);
    if (s.rms < 0.01) fail(`${id}: nearly silent (rms ${s.rms})`);
    if (s.peak > 1.001) fail(`${id}: clips (peak ${s.peak})`);
    if (s.active < 0.5) fail(`${id}: mostly silent (${s.active})`);
  }
  for (const [id, s] of Object.entries(report.sfx)) {
    if (s.bad) fail(`sfx ${id}: non-finite samples`);
    if (s.peak < 0.005) fail(`sfx ${id}: silent`);
    if (s.peak > 1.001) fail(`sfx ${id}: clips (peak ${s.peak})`);
  }
  console.log(`checked ${Object.keys(report.tracks).length} tracks and ${Object.keys(report.sfx).length} sfx`);
  await browser.close();
  if (logs.length) fail('console output:\n' + [...new Set(logs)].join('\n'));
} catch (e) { fail(String(e)); }
vite.kill();
console.log(failed ? 'AUDIO CHECK FAILED' : 'AUDIO CHECK OK');
process.exit(failed ? 1 : 0);
