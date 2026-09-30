# HUNT-MON — Project Plan

Working title: **Hunt-mon**. An original 2D monster-collecting RPG with a light dating-sim layer.
All creatures, characters, places, art, and audio are original.

## 1. Tech stack

| Concern | Choice |
|---|---|
| Engine | Phaser 3.90 (pinned; v4 is not used). Grid movement is custom, no Arcade physics |
| Language | TypeScript (strict) |
| Bundler | Vite |
| Render | Internal resolution **240×160** (GBA), `pixelArt: true`, `roundPixels`, integer scale via `Scale.FIT` + custom integer zoom snap in `main.ts` |
| Audio | Web Audio API (custom chiptune synth: pulse/tri/noise channels, sequencer) |
| Saves | `localStorage`, 3 slots, versioned JSON with migration hook |
| Tests | Vitest for pure logic (battle math, catch formula, affection, save migration) |
| Verification | Playwright (Chromium is pre-installed) headless smoke test: boot, walk, battle, screenshot, console-error check |

## 2. Folder structure

```
Hunt-mon/
  PLAN.md  CLAUDE.md  package.json  tsconfig.json  vite.config.ts  index.html
  public/
    assets/            # OPTIONAL drop-in PNG sheets + manifest (see §5)
  src/
    main.ts            # Phaser config, integer scaling, boot
    config.ts          # constants (TILE=16, VIEW_W/H, colors, key bindings)
    scenes/
      BootScene.ts     # generate textures, load optional PNG overrides, init audio on first input
      TitleScene.ts    # new game / continue (slot picker) / options
      OverworldScene.ts
      BattleScene.ts
      UIScene.ts       # overlay scene: dialogue, menus, HUD, transitions (persistent)
      CutsceneScene.ts # date cutscene / scripted sequences (or run inside Overworld)
    engine/
      input/           # InputManager (keyboard + gamepad → abstract actions)
      grid/            # GridMover, collision, Tilemap loader, map transitions
      entities/        # Player, Npc, Trainer (line-of-sight), Interactable
      camera/          # follow + bounds + shake
      fx/              # Day/night grading, LightLayer, Weather (rain/fog/dust), particles, cloud shadows
      ui/              # Window, TypewriterText, Menu (bouncy), HpBar, PixelFont, Portrait
      audio/           # Synth, Sequencer, SfxBank, MusicBank
      script/          # ScriptRunner: executes dialogue/event graphs, flags & vars
      save/            # SaveManager, migrations
      gfx/             # PaletteSprite renderer, TextureFactory, TilesetBuilder, animation registry
    game/
      state/           # GameState (party, box, bag, dex, flags, affection, badges, time, position)
      battle/          # BattleEngine (pure, no Phaser), TypeChart, Damage, Status, AI, Catch, Xp/Evolution
      romance/         # AffectionSystem, GiftSystem, dateScenes
      systems/         # Shop, HealCenter, Encounter tables, DayClock
    data/              # ALL CONTENT — no engine imports beyond types
      types.ts         # TS interfaces for every data format
      creatures.ts  moves.ts  items.ts  typeChart.ts  trainers.ts  encounters.ts
      maps/            # one .ts (or .json) per map: tiles, objects, npcs, warps, lights, weather
      dialogue/        # per-NPC / per-event graphs
      romance/         # 4 romance NPC profiles + side-quests + gift prefs
      art/             # palettes.ts, sprites/*.ts (indexed pixel arrays), tiles/*.ts
      quest.ts         # main quest beats & flag names
    debug/DebugMenu.ts # backtick toggle
  tests/               # vitest
  scripts/smoke.mjs    # playwright smoke test
```

**Rule:** `game/battle` and `game/romance` are Phaser-free pure TS so they are unit-testable. Scenes only render and forward input.

## 3. Data formats (all in `src/data`, typed by `types.ts`)

- **Creature**: `{ id, name, types:[T,T?], baseStats:{hp,atk,def,spa,spd,spe}, catchRate, xpCurve, baseXp, learnset:[{lvl,move}], evolves?:{lvl|item, to}, sprite:{front,back,icon}, dexText }`
- **Move**: `{ id, name, type, category:'phys'|'spec'|'status', power, accuracy, pp, priority, effect?:{status|statStage|heal|drain, chance}, fx: particleKey }`
- **Item**: `{ id, name, kind:'heal'|'ball'|'status'|'key'|'gift'|'evo', price, effect, desc }`
- **Map**: `{ id, w, h, tileset, layers:{ground,detail,above}, collision, objects:[warp|npc|sign|trainer|item|grassZone|light], music, weather, palette, indoor }`
- **Dialogue graph**: nodes `{ id, speaker, portrait, text, next | choices:[{text, goto, cond?, set?, affection?:{npc,delta,tag}}], cond?, set? }`. Conditions/effects use a tiny expression form: `{flag:'x'}`, `{var:'y',gte:2}`, `{affection:'mira',gte:40}`.
- **Sprite art**: `{ palette: string[], frames: string[][] }` — each row a string of palette-index chars; rendered to a Phaser canvas texture at boot.
- **Save**: `{ version, slot, playtime, player:{map,x,y,dir}, party, box, bag, dex, flags, vars, affection, badges, clock, options }`.

## 4. Key system designs

**Overworld**: fixed-timestep grid mover (16px tiles, walk 4 tiles/s → run 8 tiles/s w/ Shift), input buffering for snappy turns, ledge/collision from a collision layer, warps trigger fade transitions, NPC behavior states (idle/wander/face/path), trainer line-of-sight raycast → exclamation → walk-up → battle.

**Dialogue/Script**: `ScriptRunner` consumes dialogue graphs and event commands (`say`, `choice`, `setFlag`, `giveItem`, `giveCreature`, `battle`, `warp`, `wait`, `fade`, `affection`, `cutscene`). Typewriter with per-char blip SFX; portraits are palette sprites with expression variants.

**Battle**: `BattleEngine` is a deterministic (seedable RNG) state machine producing an ordered **event list** (`useMove`, `damage`, `miss`, `crit`, `effective`, `status`, `stage`, `faint`, `xp`, `levelUp`, `learnMove`, `evolve`, `catchShake`…). `BattleScene` plays events with animation. Gen-1/2-style formulas: damage with STAB/type/crit/random; stat stages ±6; burn/poison/sleep/paralysis; capture formula with 0–3 shakes.

**Romance**: hidden affection 0–100 per NPC. Sources: flirt choices (tagged by personality trait; matching trait +, mismatching −, spamming within a cooldown → "pushy" penalty and a brush-off flag that locks flirt options for a day), liked/disliked gifts, side-quest completion. Heart icon shown in dialogue box (1–5 hearts). Milestones at 25/50/75/100: unique dialogue, shop discount, rare item, special creature, date cutscene. Rival and gym leaders have conditional lines reading affection flags.

**Rendering/FX**: day/night via a full-screen multiply overlay with color-grade ramp keyed to in-game clock (accelerated real time), additive light sprites (lamps, windows, fireflies) on a RenderTexture that gets erased out of the darkness layer. Weather as particle systems. Animated tiles via frame-swap on a global tile clock.

**Audio**: WebAudio synth with square (duty 12.5/25/50), triangle, noise channels; sequencer reads compact note-string patterns from `data/music`. One track per area + battle/victory/title/date. SFX bank (menu, blip, hit types, catch, level-up). Starts on first user gesture.

**Pixel-art pipeline**: `PaletteSprite` → `TextureFactory.make(key, data)`. `BootScene` first checks `public/assets/manifest.json`; if a PNG sheet is listed for a key, it loads that and skips procedural generation. Same texture keys either way, so real art drops in with no code change.

**Input**: `InputManager` maps keyboard + Gamepad API to actions `up/down/left/right/confirm/back/run/menu/debug`.

## 5. Content targets

- 3 starters (fire/water/grass analogues, original) + evolutions, **24+ creatures** total, 12 types: Flame, Tide, Leaf, Volt, Frost, Stone, Gale, Venom, Mind, Shade, Fist, Normal.
- Maps: Player home/town (**Emberwick**), Route 1, Route 2, **Brindlemoor** (2nd town), **Mistwood** forest, **Hollowdeep** cave, 2 gyms, healing center + shop interiors, café, research lodge.
- Trainers ~15, 2 gym leaders, rival ×3 battles, short main quest → chapter ending.
- 4 romanceable adult NPCs: shopkeeper, gym leader, traveling researcher, café owner — each with personality traits, likes/dislikes, side story, milestone rewards.

## 6. Milestone checklist

Each milestone ends with: run game (Playwright smoke), zero console errors/warnings, update this list, summarize what's playable, commit + push.

- [x] **M0** Scaffold: Vite+TS+Phaser, integer-scale config, Boot scene, texture factory, input manager
- [x] **M1** Overworld: grid movement (walk/run), camera, collision, warps + fades, NPC idle/walk, signs/objects
- [x] **M2** Dialogue: typewriter, portraits, choices, flags/vars, affection + hearts
- [ ] **M3** Battle: engine + type chart + moves/PP/accuracy/crits/stages/status, XP/level/learn/evolve, wild grass + trainer LoS
- [ ] **M4** Collection & menus: catching, party 6, box, dex, bag, shop, heal center, badges, options, 3-slot save/load
- [ ] **M5** Content: all maps, 24+ creatures, trainers, gyms, rival ×3, main quest, 4 romances (content + rewards + date cutscene)
- [ ] **M6** Polish: day/night + lights, weather, animated tiles, battle FX, chiptune music + SFX, UI juice
- [ ] **M7** Debug menu (backtick), gamepad pass, softlock audit, full playthrough test, README

(Debug menu is scaffolded early — in M1 — and extended each milestone.)

## 7. Risks and decisions

- **Scope is large.** Procedural art for 24+ creatures ×(front/back/icon) is the biggest cost. Plan: creature sprites are built from a shared *body-template + per-creature palette/feature overlay* generator, hand-tuned per species, keeping data compact.
- **Maps as TS data** with an ASCII-grid authoring helper (legend chars → tile ids) so they are easy to edit and diff.
- **Sprite fidelity:** 16×16 overworld, 64×64 battle sprites, 32×32 portraits.
- **Music/SFX** are code-defined; no audio files.
- I cannot listen to audio or judge feel in this environment; I verify via automated smoke tests, screenshots, and console checks, and will flag anything needing your ears/eyes.

## 8. Open questions (defaults if you don't answer)

1. Internal resolution 240×160 (GBA) — OK? *(default: yes)*
2. Title: "Hunt-mon" OK, or something else? *(default: Hunt-mon)*
3. Protagonist gender/name choice? *(default: pick from 2 looks, name entry)*
4. Time cycle: 1 real minute ≈ 1 in-game hour, with a debug override. *(default: yes)*
