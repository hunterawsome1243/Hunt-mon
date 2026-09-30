# CLAUDE.md — Hunt-mon conventions

## Commands
- `npm run dev` — Vite dev server
- `npm run build` — typecheck (`tsc --noEmit`) + production build
- `npm test` — Vitest (pure logic)
- `npm run smoke` — Playwright headless smoke test (fails on any console error/warning)

## Architecture rules
- **Data ≠ engine.** All content lives in `src/data/**`. Adding a creature/move/item/map/dialogue must never require editing engine code.
- `src/game/battle`, `src/game/romance`, `src/game/state` are **Phaser-free** pure TypeScript. Never import `phaser` there.
- Scenes render and forward input only; logic goes into `game/` or `engine/`.
- Randomness goes through the seedable `Rng` in `engine/rng.ts` (never bare `Math.random()` in game logic) so tests are deterministic.
- All input goes through `InputManager` actions, never raw key codes in scenes.
- All art is generated in code from palette-indexed arrays in `src/data/art`. Texture keys are stable; optional PNGs in `public/assets/manifest.json` override the same keys.

## Style
- TypeScript strict, no `any` (use `unknown` + narrowing). Prefer `type`/`interface` in `data/types.ts`.
- 2-space indent, single quotes, semicolons, named exports.
- IDs are lowercase snake_case strings (`ember_pup`, `quick_jab`); flags are `namespace.name` (`quest.rival1_done`).
- Game constants (tile size, view size, speeds) live in `src/config.ts` only.
- Comments explain *why*, not what. Keep files under ~400 lines where practical (OverworldScene is the known exception); split otherwise.

## Rendering
- Internal res 240×160, tile 16px, `pixelArt: true`, integer zoom, no fractional camera positions (round scroll).
- No smoothing, no sub-pixel sprites; tweens on positions must round for display.

## Content guardrails
- 100% original names/designs/music. Never use trademarked creature names, designs, or melodies.
- Romanceable NPCs are clearly adults (25+), tone is PG-13, no explicit content. Pushy behavior gets realistic pushback.

## Workflow
- Milestone-based per `PLAN.md`. After each milestone: build, run smoke, fix all errors/warnings, tick the checklist, commit, push.
- Develop on the designated feature branch; do not open PRs unless asked.
