import { TRACKS } from '../../data/music/tracks';
import { compile, Compiled, freqOf, Score, Wave } from './musicdsl';

type Ctx = BaseAudioContext;
const DUTY: Record<string, number> = { pulse125: 0.125, pulse25: 0.25, pulse50: 0.5 };

/** Web Audio chiptune engine: pulse/triangle/noise voices, a looking-ahead sequencer and a synthesized SFX bank. */
export class AudioEngine {
  readonly ctx: Ctx;
  private master: GainNode;
  private musicBus: GainNode;
  private sfxBus: GainNode;
  private noise: AudioBuffer;
  private waves = new Map<string, PeriodicWave>();
  private cur: { id: string; gain: GainNode; timer: number; stop: () => void } | null = null;
  private volMusic = 0.7;
  private volSfx = 0.7;
  private lastSfx = new Map<string, number>();

  constructor(ctx?: Ctx) {
    this.ctx = ctx ?? new AudioContext();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.9;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain(); this.sfxBus = this.ctx.createGain();
    this.musicBus.connect(this.master); this.sfxBus.connect(this.master);
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let seed = 1234567;
    for (let i = 0; i < d.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = (seed / 0xffffffff) * 2 - 1; }
    this.applyVolumes();
  }

  /** Browsers start audio suspended until a user gesture. */
  resume(): void { if (this.ctx instanceof AudioContext && this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined); }
  setVolumes(music: number, sfx: number): void { this.volMusic = Math.pow(Math.max(0, Math.min(10, music)) / 10, 2) * 0.55; this.volSfx = Math.pow(Math.max(0, Math.min(10, sfx)) / 10, 2) * 0.8; this.applyVolumes(); }
  private applyVolumes(): void { this.musicBus.gain.value = this.volMusic; this.sfxBus.gain.value = this.volSfx; }

  // ------------------------------------------------------------ voices
  private wave(name: string): PeriodicWave {
    let w = this.waves.get(name);
    if (!w) {
      const d = DUTY[name], n = 48;
      const real = new Float32Array(n), imag = new Float32Array(n);
      for (let k = 1; k < n; k++) { real[k] = Math.sin(2 * Math.PI * k * d) / (k * Math.PI); imag[k] = (1 - Math.cos(2 * Math.PI * k * d)) / (k * Math.PI); }
      w = this.ctx.createPeriodicWave(real, imag);
      this.waves.set(name, w);
    }
    return w;
  }

  private osc(dest: AudioNode, t: number, freq: number, dur: number, wave: Wave | 'square' | 'sawtooth' | 'sine', vol: number, opts: { slideTo?: number; vibrato?: boolean; attack?: number; release?: number } = {}): void {
    const o = this.ctx.createOscillator();
    if (wave in DUTY) o.setPeriodicWave(this.wave(wave)); else o.type = wave === 'pulse125' || wave === 'pulse25' || wave === 'pulse50' ? 'square' : (wave as OscillatorType);
    o.frequency.setValueAtTime(freq, t);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), t + dur);
    const g = this.ctx.createGain();
    const a = opts.attack ?? 0.004, r = opts.release ?? 0.04;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.linearRampToValueAtTime(vol * 0.72, t + a + 0.05);
    g.gain.setValueAtTime(vol * 0.72, Math.max(t + a + 0.05, t + dur - r));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    if (opts.vibrato && dur > 0.25) {
      const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
      lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(14, t + 0.25);
      lfo.connect(lg).connect(o.detune);
      lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }

  private noiseHit(dest: AudioNode, t: number, dur: number, vol: number, kind: 'bp' | 'hp' | 'lp', f0: number, f1?: number): void {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise; s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = kind === 'bp' ? 'bandpass' : kind === 'hp' ? 'highpass' : 'lowpass';
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    f.Q.value = kind === 'bp' ? 1.2 : 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, (t * 7.31) % 0.9); s.stop(t + dur + 0.02);
  }

  private drum(dest: AudioNode, t: number, kind: 'k' | 's' | 'h', vol: number): void {
    if (kind === 'k') { this.osc(dest, t, 150, 0.13, 'sine', vol * 0.9, { slideTo: 42, attack: 0.001, release: 0.05 }); }
    else if (kind === 's') { this.noiseHit(dest, t, 0.11, vol * 0.45, 'bp', 2400); this.osc(dest, t, 210, 0.07, 'pulse50', vol * 0.16, { slideTo: 120, attack: 0.001 }); }
    else this.noiseHit(dest, t, 0.04, vol * 0.2, 'hp', 7500);
  }

  // ------------------------------------------------------------ music
  /** Schedule every event of a score between steps [from, to) offset at time `t0`. */
  private scheduleRange(c: Compiled, score: Score, bus: AudioNode, t0: number, from: number, to: number, noteIdx: { i: number; j: number }): void {
    const v = score.vol ?? 1;
    const leadWave = score.leadWave ?? 'pulse25';
    while (noteIdx.i < c.notes.length && c.notes[noteIdx.i].step < to) {
      const n = c.notes[noteIdx.i++];
      if (n.step < from) continue;
      const t = t0 + (n.step - from) * c.stepSec, dur = Math.max(0.05, n.dur * c.stepSec * 0.96);
      if (n.ch === 'lead') this.osc(bus, t, freqOf(n.midi), dur, leadWave, 0.22 * v, { vibrato: score.vibrato });
      else if (n.ch === 'arp') this.osc(bus, t, freqOf(n.midi), dur * 0.85, 'pulse125', 0.085 * v * n.vel);
      else this.osc(bus, t, freqOf(n.midi), dur, 'triangle', 0.34 * v, { attack: 0.003, release: 0.03 });
    }
    while (noteIdx.j < c.drums.length && c.drums[noteIdx.j].step < to) {
      const d = c.drums[noteIdx.j++];
      if (d.step < from) continue;
      this.drum(bus, t0 + (d.step - from) * c.stepSec, d.kind, 0.5 * v);
    }
  }

  playMusic(id: string, fadeMs = 350): void {
    if (this.cur?.id === id) return;
    const score = TRACKS[id];
    if (!score) { this.stopMusic(fadeMs); return; }
    this.stopMusic(fadeMs);
    const c = compile(score);
    c.notes.sort((a, b) => a.step - b.step); c.drums.sort((a, b) => a.step - b.step);
    const gain = this.ctx.createGain();
    gain.gain.value = 1;
    gain.connect(this.musicBus);
    const total = c.steps * c.stepSec;
    let start = this.ctx.currentTime + 0.08;    // wall time at which the current pass started
    let cursor = 0;                              // step scheduled up to
    const idx = { i: 0, j: 0 };
    const loop = score.loop !== false;
    let over = false;
    const pump = (): void => {
      if (over) return;
      const horizon = this.ctx.currentTime + 0.25;
      const maxStep = Math.floor((horizon - start) / c.stepSec);
      if (maxStep > cursor) {
        const to = Math.min(maxStep, c.steps);
        this.scheduleRange(c, score, gain, start + cursor * c.stepSec, cursor, to, idx);
        cursor = to;
      }
      if (cursor >= c.steps) {
        if (loop) { start += total; cursor = 0; idx.i = 0; idx.j = 0; } else over = true;
      }
    };
    pump();
    const timer = window.setInterval(pump, 40);
    this.cur = { id, gain, timer, stop: () => { over = true; window.clearInterval(timer); } };
  }

  stopMusic(fadeMs = 300): void {
    const c = this.cur;
    if (!c) return;
    this.cur = null;
    c.stop();
    const t = this.ctx.currentTime;
    c.gain.gain.cancelScheduledValues(t);
    c.gain.gain.setValueAtTime(c.gain.gain.value, t);
    c.gain.gain.linearRampToValueAtTime(0.0001, t + fadeMs / 1000);
    window.setTimeout(() => c.gain.disconnect(), fadeMs + 600);
  }
  get playing(): string | null { return this.cur?.id ?? null; }

  /** Duck the music briefly (used under jingles). */
  duck(ms: number): void {
    const t = this.ctx.currentTime, g = this.musicBus.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(this.volMusic * 0.25, t + 0.05);
    g.linearRampToValueAtTime(this.volMusic, t + ms / 1000);
  }

  // ------------------------------------------------------------ sfx
  private t(): number { return this.ctx.currentTime + 0.005; }
  private seq(notes: Array<[number, number]>, wave: Wave | 'square', vol: number, gap: number, dest: AudioNode = this.sfxBus): void {
    const t = this.t();
    notes.forEach(([f, d], i) => this.osc(dest, t + i * gap, f, d, wave, vol, { release: 0.03 }));
  }

  sfx(name: string): void {
    // very quick repeats of the same sound (typewriter blips) are rate limited
    const now = this.ctx.currentTime, last = this.lastSfx.get(name) ?? -1;
    if (now - last < (name === 'blip' ? 0.04 : 0.02)) return;
    this.lastSfx.set(name, now);
    const d = this.sfxBus, t = this.t();
    const n = (midi: number) => freqOf(midi);
    switch (name) {
      case 'blip': this.osc(d, t, 880 + Math.random() * 60, 0.035, 'pulse50', 0.05, { attack: 0.001, release: 0.01 }); break;
      case 'cursor': this.osc(d, t, 1320, 0.04, 'pulse25', 0.12, { attack: 0.001 }); break;
      case 'select': this.seq([[n(76), 0.05], [n(83), 0.08]], 'pulse25', 0.14, 0.05); break;
      case 'back': this.seq([[n(76), 0.05], [n(71), 0.08]], 'pulse25', 0.12, 0.05); break;
      case 'deny': this.osc(d, t, 160, 0.14, 'pulse50', 0.18, { slideTo: 110 }); break;
      case 'menu_open': this.seq([[n(72), 0.04], [n(79), 0.04], [n(84), 0.07]], 'pulse25', 0.12, 0.04); break;
      case 'battle_start': this.osc(d, t, 220, 0.5, 'pulse25', 0.16, { slideTo: 1760 }); this.noiseHit(d, t, 0.5, 0.15, 'bp', 400, 4000); break;
      case 'alert': this.seq([[n(88), 0.08], [n(88), 0.12]], 'pulse50', 0.2, 0.1); break;
      case 'pickup': this.seq([[n(79), 0.06], [n(84), 0.06], [n(91), 0.14]], 'pulse25', 0.15, 0.06); break;
      case 'badge': this.seq([[n(72), 0.12], [n(76), 0.12], [n(79), 0.12], [n(84), 0.5]], 'pulse25', 0.2, 0.14); this.duck(1200); break;
      case 'heal_jingle': this.seq([[n(72), 0.14], [n(76), 0.14], [n(79), 0.14], [n(84), 0.14], [n(79), 0.14], [n(84), 0.4]], 'pulse25', 0.16, 0.18); break;
      case 'heart': this.seq([[n(88), 0.06], [n(95), 0.12]], 'triangle', 0.22, 0.07); break;
      case 'nope': this.seq([[n(60), 0.1], [n(55), 0.18]], 'pulse50', 0.16, 0.1); break;
      case 'status': this.osc(d, t, 600, 0.25, 'pulse25', 0.12, { slideTo: 200 }); break;
      case 'statup': this.seq([[n(72), 0.05], [n(79), 0.05], [n(84), 0.1]], 'pulse25', 0.13, 0.05); break;
      case 'statdown': this.seq([[n(84), 0.05], [n(77), 0.05], [n(70), 0.1]], 'pulse25', 0.13, 0.05); break;
      case 'send': this.noiseHit(d, t, 0.25, 0.14, 'bp', 600, 3000); this.seq([[n(84), 0.05], [n(91), 0.1]], 'pulse25', 0.1, 0.06); break;
      case 'throw': this.noiseHit(d, t, 0.3, 0.1, 'hp', 1500, 500); break;
      case 'capture': this.osc(d, t, 1600, 0.25, 'pulse25', 0.14, { slideTo: 300 }); break;
      case 'shake': this.osc(d, t, 330, 0.06, 'pulse50', 0.18); this.osc(d, t + 0.07, 250, 0.08, 'pulse50', 0.18); break;
      case 'caught': this.seq([[n(72), 0.1], [n(76), 0.1], [n(79), 0.1], [n(84), 0.1], [n(88), 0.45]], 'pulse25', 0.2, 0.12); this.duck(1000); break;
      case 'breakfree': this.noiseHit(d, t, 0.2, 0.18, 'bp', 2500, 600); this.osc(d, t, 500, 0.15, 'pulse25', 0.12, { slideTo: 200 }); break;
      case 'hit': this.noiseHit(d, t, 0.14, 0.4, 'lp', 3000, 300); this.osc(d, t, 180, 0.1, 'pulse50', 0.2, { slideTo: 70 }); break;
      case 'hit_super': this.noiseHit(d, t, 0.22, 0.55, 'lp', 4500, 200); this.osc(d, t, 260, 0.18, 'pulse50', 0.28, { slideTo: 50 }); this.osc(d, t + 0.04, 1100, 0.12, 'pulse25', 0.12, { slideTo: 500 }); break;
      case 'hit_weak': this.noiseHit(d, t, 0.08, 0.2, 'lp', 1500, 300); break;
      case 'faint': this.osc(d, t, 500, 0.6, 'pulse25', 0.2, { slideTo: 60 }); break;
      case 'heal': this.seq([[n(84), 0.06], [n(88), 0.06], [n(91), 0.06], [n(96), 0.14]], 'triangle', 0.3, 0.07); break;
      case 'levelup': this.seq([[n(72), 0.08], [n(76), 0.08], [n(79), 0.08], [n(84), 0.08], [n(79), 0.08], [n(84), 0.08], [n(88), 0.35]], 'pulse25', 0.2, 0.09); this.duck(900); break;
      case 'evolve': this.seq(Array.from({ length: 16 }, (_, i) => [n(60 + i * 2), 0.14] as [number, number]), 'pulse25', 0.16, 0.16); break;
      case 'move_flame': this.noiseHit(d, t, 0.5, 0.25, 'bp', 500, 2600); break;
      case 'move_tide': this.noiseHit(d, t, 0.5, 0.22, 'lp', 3500, 500); this.osc(d, t, 500, 0.25, 'sine', 0.12, { slideTo: 900 }); break;
      case 'move_leaf': this.seq([[n(91), 0.04], [n(95), 0.04], [n(88), 0.04], [n(93), 0.04], [n(96), 0.06]], 'triangle', 0.22, 0.05); break;
      case 'move_volt': this.seq([[1600, 0.03], [700, 0.03], [2000, 0.03], [500, 0.03], [2400, 0.05]], 'pulse125', 0.2, 0.035); break;
      case 'move_frost': this.seq([[n(96), 0.05], [n(100), 0.05], [n(103), 0.05], [n(108), 0.1]], 'triangle', 0.2, 0.05); break;
      case 'move_stone': this.noiseHit(d, t, 0.22, 0.5, 'lp', 900, 100); this.osc(d, t, 110, 0.2, 'sine', 0.3, { slideTo: 45 }); break;
      case 'move_gale': this.noiseHit(d, t, 0.55, 0.2, 'hp', 800, 4500); break;
      case 'move_venom': this.osc(d, t, 220, 0.4, 'pulse25', 0.14, { slideTo: 330, vibrato: true }); break;
      case 'move_mind': this.osc(d, t, 700, 0.6, 'sine', 0.16, { slideTo: 1400, vibrato: true }); this.osc(d, t + 0.1, 1050, 0.5, 'sine', 0.1, { slideTo: 2100 }); break;
      case 'move_shade': this.osc(d, t, 400, 0.6, 'pulse125', 0.14, { slideTo: 70 }); this.noiseHit(d, t, 0.5, 0.1, 'lp', 600, 120); break;
      case 'move_fist': this.noiseHit(d, t, 0.12, 0.5, 'lp', 2000, 150); this.osc(d, t, 140, 0.12, 'sine', 0.35, { slideTo: 50 }); break;
      case 'move_normal': this.noiseHit(d, t, 0.1, 0.3, 'bp', 1800); break;
      default: break;
    }
  }

  // ------------------------------------------------------------ offline rendering (tests & tools)
  /** Render `seconds` of a track without any audio hardware. Used to verify scores are audible and sane. */
  static async renderTrack(id: string, seconds: number, rate = 22050): Promise<Float32Array> {
    const ctx = new OfflineAudioContext(1, Math.floor(seconds * rate), rate);
    const eng = new AudioEngine(ctx);
    const score = TRACKS[id];
    const c = compile(score);
    c.notes.sort((a, b) => a.step - b.step); c.drums.sort((a, b) => a.step - b.step);
    const total = c.steps * c.stepSec;
    const idx = { i: 0, j: 0 };
    for (let pass = 0; pass * total < seconds; pass++) {
      idx.i = 0; idx.j = 0;
      eng.scheduleRange(c, score, eng.musicBus, pass * total, 0, c.steps, idx);
      if (score.loop === false) break;
    }
    eng.musicBus.gain.value = 0.55 * 0.49;
    const buf = await ctx.startRendering();
    return buf.getChannelData(0);
  }

  static async renderSfx(name: string, seconds = 1, rate = 22050): Promise<Float32Array> {
    const ctx = new OfflineAudioContext(1, Math.floor(seconds * rate), rate);
    const eng = new AudioEngine(ctx);
    eng.sfxBus.gain.value = 0.8 * 0.49;
    eng.sfx(name);
    const buf = await ctx.startRendering();
    return buf.getChannelData(0);
  }
}
