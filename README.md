# Hunt-mon

An original 2D monster-collecting RPG in the spirit of the 16-bit handheld classics, with a light, flirty
dating-sim layer. Phaser 3 + TypeScript + Vite. **Everything is original** (creatures, characters, places,
art, music) and **nothing is loaded from disk**: all pixel art is generated in code and all music/SFX are
synthesised with the Web Audio API.

## Download (Windows)

[![Download Hunt-mon](https://img.shields.io/github/v/release/hunterawsome1243/Hunt-mon?label=Download%20Hunt-mon&style=for-the-badge&color=2ea44f)](https://github.com/hunterawsome1243/Hunt-mon/releases/latest)

1. Open the **[latest release](https://github.com/hunterawsome1243/Hunt-mon/releases/latest)** and scroll to **Assets**.
2. Download **`Hunt-mon.Setup.x.y.z.exe`** to install, or **`Hunt-mon.x.y.z.exe`** to run it with no install.
3. If Windows shows "Windows protected your PC", click **More info → Run anyway** (the app isn't code-signed).

Press **F11** for fullscreen.

## Run from source

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm test           # unit + logic-level playthrough tests (Vitest)
```

## Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Move | Arrow keys / WASD | D-pad / left stick |
| Confirm / talk | Z, Enter, Space | A |
| Back / cancel | X, Esc, Backspace | B |
| Run | Hold Shift (or toggle in Options) | X / bumpers |
| Menu | M, Tab (or X/Esc when idle) | Start |
| Debug menu | `` ` `` (backtick) | — |

## The game

*Chapter One: The Ember Tide.* The glow that lights the region is fading. Choose a partner in Emberwick, race
your friend-rival Jace to Brindlemoor, earn the **Cinder Badge** from gym leader Rhea, cross **Route 2** and the
foggy **Mistwood**, descend into the crystal cave **Hollowdeep**, beat Orrin for the **Tidal Badge**, and restore
the **Lumen Crystal**. Jace battles you three times.

* **36 creatures**, 12 types with a full effectiveness chart, evolutions, 3 starters, a catchable guardian.
* Turn-based battles: PP, accuracy, crits, stat stages, burn / poison / sleep / paralysis, XP, level-ups,
  move learning, evolution, capture formula with animated ball shakes, trainers with line-of-sight.
* Party of 6, storage box (PC), Dex (seen/caught), bag, shops, Care Huts, badge case, options, 3 save slots.
* Day/night cycle with colour grading and real point lights (lamps, windows, crystals, fireflies), rain with
  puddle ripples and lightning, forest fog, cave dust, drifting cloud shadows.
* Chiptune music (14 original scores) and ~40 synthesised sound effects.

### Romance

Four adults, each with their own personality, likes/dislikes, story and side quest:

| Who | Role | Where | Likes (flirt style) |
|---|---|---|---|
| **Mira** | Shopkeeper | Emberwick | witty, cheeky, sincere |
| **Rhea** | Gym leader | Brindlemoor Gym | bold, sincere, sweet |
| **Ilsa** | Researcher | Lab → Mistwood → Hollowdeep | nerdy, sincere, goofy |
| **Odette** | Café owner | Moth & Mug, Brindlemoor | sweet, smooth, sincere |

Affection is hidden (you only see hearts while talking). It rises with flirt lines that suit their
personality, fitting gifts (once a day), chatting, and finishing their side quest. Lines that are too forward for
how well you know them, or pushing past their patience, get playful rejections and lock flirting until tomorrow.
Milestones at 25 / 50 / 75 / 100 unlock story scenes, a discount or rare item, **a special creature**, and finally
a **date cutscene**. Jace and the gym leaders comment on who you've grown close to. Content is PG-13.

## Project layout

```
src/
  main.ts, config.ts          boot, integer scaling, constants
  scenes/                     Boot, Title, Overworld, Battle, Menu (overlay), End + screens/ (party, bag, dex, ...)
  engine/                     input, grid movement, ui kit, dialogue runner, fx (atmosphere, move fx), audio, gfx
  game/                       PURE logic (no Phaser): battle, romance, state, save, clock/weather, items
  data/                       ALL CONTENT: creatures, moves, items, trainers, encounters, shops, maps, dialogue, music, art
tests/                        Vitest: battle rules, dialogue, saves, world integrity, music, full playthrough bots
scripts/                      Playwright smoke tests and screenshot tools
```

Engine and content are strictly separated: adding a creature, move, map, trainer or conversation never requires
touching engine code. See `PLAN.md` for architecture notes and `CLAUDE.md` for conventions.

### Adding content

* **Creature**: add a row to `src/data/creatures.ts` (stats, learnset, evolution, and an `art` spec — body plan,
  palette, features). Sprites (front, back, icon) are generated automatically.
* **Move**: one line in `src/data/moves.ts`.
* **Map**: `src/data/maps/*.ts` use a small builder (`MapBuilder`): paint tiles, `house()`, `carve()` paths, then
  add `warp`, `npc`, `trigger`, `pickup`. `npm test` checks tiles exist, warps land on walkable tiles, everything
  is reachable, and every referenced dialogue / item / trainer exists.
* **Dialogue**: graphs in `src/data/dialogue/` (nodes, choices, conditions, effects, flirt outcomes). Romanceable
  characters are declared with `romanceGraph()` from a config. Tests verify every node reference.
* **Music**: `src/data/music/tracks.ts` — a chord progression plus one melody string per bar.

### Dropping in real art

Art is generated at startup, but every texture is addressed by a stable key (`c_hero_a`, `t_grass`, `mon_f_cinderpup`…).
To override one, put a PNG sprite sheet in `public/assets/` and list it in `public/assets/manifest.json`:

```json
{ "textures": { "c_hero_a": { "file": "hero.png", "frameWidth": 16, "frameHeight": 22 } } }
```

Listed keys skip procedural generation; everything else keeps working.

## Debug menu (backtick)

Warp to any map, give creatures (any species/level), set party level, heal, add items and money, set affection per
romance NPC, change the time of day and weather, set story flags and badges. Handy for testing any part of the
chapter quickly.

## Testing

```bash
npm test                   # 50+ tests: battle engine soak, save/load, world reachability, story + romance bots
node scripts/smoke.mjs     # headless Chromium: walking, dialogue, battles, capture, evolution, blackout
node scripts/smoke-m4.mjs  # title, menus, shop, gifts, save/continue
node scripts/smoke-m5.mjs  # the whole story: rivals, both gyms, finale + credits, a date scene
node scripts/audio-check.mjs  # renders every track and SFX offline and checks they are audible and clean
```

Screenshots land in `shots/`.

## Saves

Three slots in `localStorage` (`huntmon.save.1..3`), versioned with a migration hook (`game/save/SaveManager.ts`).
