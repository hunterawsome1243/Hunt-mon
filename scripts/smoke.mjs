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
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/GL Driver Message/.test(m.text())) logs.push(`${m.type()}: ${m.text()}`); });
  page.on('crash', () => console.log('PAGE CRASH'));
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.goto(`http://localhost:${PORT}/?quick`);
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
  // talk to a villager at (26,17): stand at (27,17) facing left
  await page.evaluate(() => window.__game.scene.getScene('overworld').warpTo('emberwick', 27, 17, 'left'));
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
  await page.evaluate(() => { window.__hunt.setFlag('starter.chosen'); window.__hunt.setFlag('quest.rival1'); });
  await page.keyboard.down('ArrowUp'); await sleep(1600); await page.keyboard.up('ArrowUp'); await sleep(900);
  if ((await st()).map !== 'route1') fail('north exit did not reach route1: ' + JSON.stringify(await st()));
  // tall grass: walk in it
  await page.evaluate(() => window.__game.scene.getScene('overworld').warpTo('route1', 10, 20, 'up'));
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
  await press('ArrowDown'); await press('ArrowDown'); await press('ArrowDown'); await press('z'); await sleep(300); await untilMenu(); await sleep(700); // Flirt
  if (!(await st()).menu) fail('flirt menu missing');
  await page.screenshot({ path: 'shots/07_flirt_menu.png' });
  await press('z'); await sleep(200); // "Your prices are a crime." (witty, liked)
  await sleep(700);
  await page.screenshot({ path: 'shots/08_flirt_reaction.png' });
  await untilMenu();
  const aff = (await st()).aff.mira;
  if (!(aff > 0)) fail('flirt did not raise affection: ' + aff);
  console.log('[smoke] maps');
  // every map loads via warp
  // date_* maps autorun cutscenes that lock input; smoke-m5 covers them
  for (const m of (await page.evaluate(() => window.__hunt.maps)).filter((x) => !x.startsWith('date_'))) {
    await page.evaluate((id) => window.__game.scene.getScene('overworld').warpTo(id, 5, 5), m);
    await sleep(900);
    const s = await st();
    console.log('  map', m);
    if (s.map !== m) fail(`warp to ${m} gave ${s.map}`);
    await page.screenshot({ path: `shots/map_${m}.png` });
  }
  // ---------------- battles ----------------
  const hunt = (fn, ...a) => page.evaluate(([f, args]) => window.__hunt[f](...args), [fn, a]);
  const battleActive = () => page.evaluate(() => window.__game.scene.isActive('battle'));
  const waitBattle = async (ms = 8000) => { for (let i = 0; i < ms / 100 && !(await battleActive()); i++) await sleep(100); };
  await page.evaluate(() => window.__game.scene.getScene('overworld').warpTo('route1', 10, 20, 'up'));
  await sleep(900);
  await hunt('giveStarter', 'cinderpup', 5);
  if ((await hunt('party')).length !== 1) fail('starter not given');
  const phase = () => page.evaluate(() => window.__battle?.phase);
  const waitPhase = async (ph, ms = 15000) => { for (let i = 0; i < ms / 100 && (await phase()) !== ph; i++) await sleep(100); return (await phase()) === ph; };
  const finishBattle = async (maxIter = 800) => {
    for (let i = 0; i < maxIter && (await battleActive()); i++) { await page.keyboard.press('z'); await sleep(120); }
    return !(await battleActive());
  };
  console.log('[smoke] wild');
  // wild fight: spam confirm (Fight -> first move) until the battle ends
  await hunt('wild', 'nibbit', 2);
  await waitBattle();
  if (!(await battleActive())) fail('battle scene never started');
  await sleep(2600); await page.screenshot({ path: 'shots/10_battle_intro.png' });
  if (!(await waitPhase('command'))) fail('never reached command menu');
  await page.screenshot({ path: 'shots/11_battle_menu.png' });
  await page.keyboard.press('z'); await sleep(500); await page.screenshot({ path: 'shots/11b_moves.png' });
  // the first move is a status move (Growl): pick the first damaging one and leave the foe nearly dead so the spam loop ends
  await page.evaluate(() => { window.__battle.battle.f.hp = 1; });
  for (let k = await page.evaluate(() => window.__battle.firstDamagingMove()); k > 0; k--) { await page.keyboard.press('ArrowDown'); await sleep(120); }
  if (!(await finishBattle())) fail('wild battle did not finish');
  await sleep(1200);
  console.log('after wild battle:', JSON.stringify((await hunt('party'))[0]));
  if (!(await st()).map) fail('overworld dead after battle');
  // capture: weaken foe, throw an orb via Bag
  const before = (await hunt('party')).length + (await hunt('box'));
  let caught = false;
  for (let attempt = 0; attempt < 6 && !caught; attempt++) {
    console.log('[smoke] capture attempt', attempt);
    await hunt('wild', 'wrenlet', 3);
    await waitBattle();
    if (!(await waitPhase('command'))) { fail('no command phase for capture test'); break; }
    await page.evaluate(() => { const b = window.__battle.battle; b.f.hp = 1; b.f.status = 'sleep'; b.f.sleep = 5; });
    await page.keyboard.press('ArrowRight'); await sleep(150);
    await page.keyboard.press('z'); await sleep(600); // Bag
    await page.keyboard.press('ArrowDown'); await sleep(150);
    await page.keyboard.press('z'); await sleep(3200); // catch_orb
    if (attempt === 0) await page.screenshot({ path: 'shots/12_catch.png' });
    await finishBattle();
    await sleep(1000);
    caught = (await hunt('party')).length + (await hunt('box')) > before;
  }
  if (!caught) fail('could not capture a sleeping 1hp creature in 6 tries');
  await hunt('setLevel', 0, 10); // keep the trainer fight winnable so the test is deterministic
  console.log('[smoke] trainer');
  // trainer battle with line of sight
  await page.evaluate(() => window.__game.scene.getScene('overworld').warpTo('route1', 10, 32, 'up'));
  await sleep(1000);
  await page.keyboard.down('ArrowUp'); await sleep(1900); await page.keyboard.up('ArrowUp');
  for (let i = 0; i < 40 && !(await battleActive()); i++) { await page.keyboard.press('z'); await sleep(350); } // dismiss the challenge dialogue
  if (!(await battleActive())) fail('trainer did not challenge the player');
  else {
    await sleep(2500); await page.screenshot({ path: 'shots/13_trainer.png' });
    if (!(await finishBattle(1500))) fail('trainer battle did not finish');
    await sleep(2500);
    console.log('after trainer:', JSON.stringify(await hunt('party')), 'money', await hunt('money'), 'defeated', await hunt('flag', 'trainer.timo'));
  }
  console.log('[smoke] evolution scenario');
  // ---------------- scenario: level-up -> evolution -> learn prompt ----------------
  await page.evaluate(() => window.__game.scene.getScene('overworld').warpTo('route1', 10, 22, 'up'));
  await sleep(1000);
  await hunt('setLevel', 0, 15);
  await hunt('nearLevelUp', 0);
  await hunt('wild', 'nibbit', 2);
  await waitBattle();
  if (!(await waitPhase('command'))) fail('no command phase (evolution scenario)');
  await page.evaluate(() => { const b = window.__battle.battle; b.f.hp = 1; });
  await page.keyboard.press('z'); await sleep(300);
  await page.keyboard.press('ArrowDown'); await sleep(120);
  await page.keyboard.press('z'); // second move (ember) - the first is a status move
  let sawEvo = false;
  for (let i = 0; i < 400 && (await battleActive()); i++) {
    await sleep(150);
    await page.keyboard.press('z');
    if (i === 40) await page.screenshot({ path: 'shots/14_levelup.png' });
    const sp = (await hunt('party'))[0].sp;
    if (sp === 'emberhound') sawEvo = true;
  }
  const pp = (await hunt('party'))[0];
  console.log('after evolution scenario:', JSON.stringify(pp));
  if (!sawEvo || pp.sp !== 'emberhound') fail('creature did not evolve');
  if (!pp.moves.includes('flame_wheel')) fail('evolved creature did not learn flame_wheel: ' + pp.moves);
  await sleep(1200);
  console.log('[smoke] faint scenario');
  // ---------------- scenario: faint -> forced switch -> blackout ----------------
  await hunt('addMon', 'nibbit', 4);
  await hunt('wild', 'skyrill', 45);
  await waitBattle();
  if (!(await waitPhase('command'))) fail('no command phase (faint scenario)');
  let switched = false;
  for (let i = 0; i < 600 && (await battleActive()); i++) {
    const ph = await phase();
    if (ph === 'command') { await page.keyboard.press('z'); await sleep(250); await page.keyboard.press('z'); await sleep(200); }
    else await page.keyboard.press('z');
    await sleep(160);
    if (!switched && (await page.evaluate(() => window.__battle?.battle?.party.filter((c) => c.hp <= 0).length)) === 1) switched = true;
  }
  await sleep(2500);
  const afterLose = await st();
  console.log('after blackout:', JSON.stringify(afterLose), 'party', JSON.stringify(await hunt('party')));
  if (!switched) fail('never saw a single faint followed by a forced switch');
  if (afterLose.map !== 'house_player') fail('blackout did not send the player home');
  if ((await hunt('party')).some((c) => c.hp <= 0)) fail('party not healed after blackout');
  await browser.close();
  if (logs.length) { fail('console output:\n' + [...new Set(logs)].join('\n')); }
} catch (e) { fail(String(e.stack ?? e)); }
vite.kill();
console.log(failed ? 'SMOKE FAILED' : 'SMOKE OK');
process.exit(failed ? 1 : 0);
