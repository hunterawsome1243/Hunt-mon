import { state } from '../../game/state/GameState';
import { AudioEngine } from './AudioEngine';
import { setSfxHandler } from './Sfx';

let engine: AudioEngine | null = null;
let wanted: string | null = null;
let unlockHooked = false;

/** Volumes from the options screen. */
export function syncAudio(): void { engine?.setVolumes(state.options.musicVol, state.options.sfxVol); }

function ensure(): AudioEngine | null {
  if (engine) return engine;
  try {
    engine = new AudioEngine();
    syncAudio();
    setSfxHandler((n) => engine?.sfx(n));
    if (wanted) engine.playMusic(wanted, 0);
  } catch (e) { console.warn('Audio unavailable', e); engine = null; }
  return engine;
}

/** Browsers only allow audio after a user gesture; wire that up once. */
export function installAudioUnlock(): void {
  if (unlockHooked) return;
  unlockHooked = true;
  const go = (): void => { const e = ensure(); e?.resume(); };
  for (const ev of ['keydown', 'pointerdown', 'touchstart', 'gamepadconnected']) window.addEventListener(ev, go, { passive: true });
  (window as unknown as { __audio?: () => AudioEngine | null }).__audio = () => engine;
}

/** Request a looping track; the request is remembered until audio has been unlocked. */
export function playMusic(id: string | null, fadeMs = 350): void {
  wanted = id;
  if (!engine) return;
  if (id) engine.playMusic(id, fadeMs); else engine.stopMusic(fadeMs);
}
export function currentMusic(): string | null { return wanted; }
export function duckMusic(ms: number): void { engine?.duck(ms); }
