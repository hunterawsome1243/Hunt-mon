import '@fontsource/press-start-2p/index.css';
import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from './config';
import { BootScene } from './scenes/BootScene';
import { EndScene } from './scenes/EndScene';
import { MenuScene } from './scenes/MenuScene';
import { TitleScene } from './scenes/TitleScene';
import { BattleScene } from './scenes/BattleScene';
import { OverworldScene } from './scenes/OverworldScene';
import { DebugMenu } from './debug/DebugMenu';
import { TouchControls } from './engine/input/TouchControls';
import { isTouchDevice } from './engine/input/virtual';

async function start(): Promise<void> {
  try { await document.fonts.load('8px "Press Start 2P"'); } catch { /* font falls back */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: VIEW_W,
    height: VIEW_H,
    backgroundColor: '#0b0b14',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: { mode: Phaser.Scale.NONE, zoom: 1 },
    input: { gamepad: true },
    scene: [BootScene, TitleScene, OverworldScene, BattleScene, MenuScene, EndScene],
  });
  // Integer scaling: largest whole multiple that fits the window (canvas is upscaled with nearest-neighbour).
  // Phones: fractional zoom so the picture fills a narrow portrait screen (the canvas is still nearest-neighbour),
  // with the top half reserved for the game and the lower part for the thumb controls.
  const touch = isTouchDevice();
  const host = document.getElementById('game');
  const fit = (): void => {
    const w = window.innerWidth, h = window.innerHeight;
    if (touch) {
      const portrait = h > w;
      game.scale.setZoom(Math.max(1, Math.min(w / VIEW_W, (portrait ? h * 0.5 : h) / VIEW_H)));
      if (host) host.style.alignItems = portrait ? 'flex-start' : 'center';
    } else game.scale.setZoom(Math.max(1, Math.floor(Math.min(w / VIEW_W, h / VIEW_H))));
  };
  if (touch) new TouchControls();
  fit();
  window.addEventListener('resize', fit);
  new DebugMenu(game);
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
void start();
