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
  const fit = (): void => {
    const z = Math.max(1, Math.floor(Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H)));
    game.scale.setZoom(z);
  };
  fit();
  window.addEventListener('resize', fit);
  new DebugMenu(game);
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
void start();
