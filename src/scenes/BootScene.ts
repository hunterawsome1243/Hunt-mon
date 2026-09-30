import Phaser from 'phaser';
import { TILES } from '../data/art/tiles';
import { LOOKS, characterFrames } from '../data/art/characters';
import { EXPRESSIONS, emotes, heart, portraitFrames } from '../data/art/portraits';
import { BALL_COLORS, makeBattleBg, Terrain } from '../data/art/battleBg';
import { PixelBuffer } from '../engine/gfx/PixelBuffer';
import { FX_TEXTURES } from '../data/art/fx';
import { SPECIES_LIST } from '../data/creatures';
import { creatureBack, creatureFront, creatureIcon } from '../engine/gfx/CreatureArt';
import { shade } from '../data/art/characters';
import { installAudioUnlock } from '../engine/audio';
import { AudioEngine } from '../engine/audio/AudioEngine';
import { TRACKS } from '../data/music/tracks';
import { makeAtmosphereTextures } from '../engine/fx/Atmosphere';
import { state } from '../game/state/GameState';
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
    for (const [name, look] of Object.entries(LOOKS)) {
      TextureFactory.sheet(this, `c_${name}`, characterFrames(look));
      TextureFactory.sheet(this, `p_${name}`, portraitFrames(look));
    }
    TextureFactory.sheet(this, 'ui_heart', [heart('full'), heart('empty')]);
    TextureFactory.sheet(this, 'ui_emote', emotes());
    for (const t of ['grass', 'forest', 'cave', 'gym'] as Terrain[]) if (!this.textures.exists(`bg_${t}`)) this.textures.addCanvas(`bg_${t}`, makeBattleBg(t));
    for (const [id, [body, band]] of Object.entries(BALL_COLORS)) {
      // 1 outline, 2 body, 3 band, 4 body shade, 5 glint
      const buf = new PixelBuffer(10, 10, ['', '#2a1d2e', body, band, shade(body, 0.7), '#ffffff']);
      for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
        const d = Math.hypot(x - 4.5, y - 4.5);
        if (d >= 4.9) continue;
        buf.set(x, y, d > 4.1 ? 1 : x + y > 11 ? 4 : 2);
      }
      for (let x = 1; x < 9; x++) if (Math.hypot(x - 4.5, 4.5) < 4.1) { buf.set(x, 4, 3); buf.set(x, 5, 3); }
      buf.set(4, 4, 5).set(5, 4, 5).set(2, 2, 5).set(3, 1, 5);
      TextureFactory.single(this, `ball_${id}`, buf);
    }
    makeAtmosphereTextures(this);
    installAudioUnlock();
    (window as unknown as { __audioTools?: unknown }).__audioTools = {
      tracks: Object.keys(TRACKS),
      sfx: ['blip', 'cursor', 'select', 'back', 'deny', 'menu_open', 'battle_start', 'alert', 'pickup', 'badge', 'heal_jingle', 'heart', 'nope', 'status', 'statup', 'statdown', 'send', 'throw', 'capture', 'shake', 'caught', 'breakfree', 'hit', 'hit_super', 'hit_weak', 'faint', 'heal', 'levelup', 'evolve', 'move_flame', 'move_tide', 'move_leaf', 'move_volt', 'move_frost', 'move_stone', 'move_gale', 'move_venom', 'move_mind', 'move_shade', 'move_fist', 'move_normal'],
      renderTrack: (id: string, sec: number) => AudioEngine.renderTrack(id, sec),
      renderSfx: (id: string, sec: number) => AudioEngine.renderSfx(id, sec),
    };
    for (const [k, b] of Object.entries(FX_TEXTURES)) TextureFactory.single(this, k, b);
    for (const sp of SPECIES_LIST) {
      const front = creatureFront(sp.art);
      TextureFactory.single(this, `mon_f_${sp.id}`, front);
      TextureFactory.single(this, `mon_b_${sp.id}`, creatureBack(sp.art));
      TextureFactory.single(this, `mon_i_${sp.id}`, creatureIcon(front));
    }
    void EXPRESSIONS;
    // `?quick` skips the title (used by automated tests): fresh game straight into the house
    if (new URLSearchParams(location.search).has('quick')) { state.newGame(); this.scene.start('overworld'); }
    else this.scene.start('title');
  }
}
