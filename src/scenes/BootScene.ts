import Phaser from 'phaser';
import { TILES } from '../data/art/tiles';
import { LOOKS, characterFrames } from '../data/art/characters';
import { TextureFactory, Manifest } from '../engine/gfx/TextureFactory';

/** Generates all procedural textures. Optional PNG sheets from public/assets/manifest.json override by key. */
export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  preload(): void {
    this.load.json('manifest', 'assets/manifest.json');

  }

  create(): void {
    const manifest = (this.cache.json.get('manifest') as Manifest | undefined) ?? {};
    // PNG overrides are loaded lazily by a second loader pass.
    const entries = Object.entries(manifest.textures ?? {});
    if (entries.length) {
      for (const [key, m] of entries) this.load.spritesheet(key, `assets/${m.file}`, { frameWidth: m.frameWidth, frameHeight: m.frameHeight });
      this.load.once('complete', () => { entries.forEach(([k]) => TextureFactory.overrides.add(k)); this.generate(); });
      this.load.start();
    } else this.generate();
  }

  private generate(): void {
    for (const [name, def] of Object.entries(TILES)) {
      TextureFactory.sheet(this, `t_${name}`, Array.from({ length: def.frames }, (_, i) => def.gen(i)));
    }
    for (const [name, look] of Object.entries(LOOKS)) TextureFactory.sheet(this, `c_${name}`, characterFrames(look));
    this.scene.start('overworld');
  }
}
