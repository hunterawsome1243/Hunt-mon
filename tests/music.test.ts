import { describe, expect, it } from 'vitest';
import { TRACKS, trackForMap } from '../src/data/music/tracks';
import { barSteps, chordTones, compile, freqOf, midiOf } from '../src/engine/audio/musicdsl';
import { MAPS } from '../src/data/maps';
import { ambientAt, areaWeather, fmtClock, gameMinutes, phaseOf, weatherForDay } from '../src/game/systems/Clock';

describe('music DSL', () => {
  it('parses note names', () => {
    expect(midiOf('A4')).toBe(69); expect(midiOf('C4')).toBe(60); expect(midiOf('F#5')).toBe(78); expect(midiOf('Bb3')).toBe(58);
    expect(freqOf(69)).toBeCloseTo(440, 5);
    expect(chordTones('Am')).toEqual([57, 60, 64]);
  });
  it('every bar of every track is exactly 16 steps and matches its chord progression length', () => {
    for (const [id, t] of Object.entries(TRACKS)) {
      expect(t.lead.length, `${id} lead/prog length`).toBe(t.prog.length);
      t.lead.forEach((b, i) => expect(barSteps(b), `${id} bar ${i + 1}: "${b}"`).toBe(16));
      t.prog.forEach((c) => expect(() => chordTones(c), `${id} chord ${c}`).not.toThrow());
      const c = compile(t);
      expect(c.steps).toBe(t.prog.length * 16);
      expect(c.notes.length).toBeGreaterThan(0);
      for (const n of c.notes) { const hz = freqOf(n.midi); expect(hz).toBeGreaterThan(20); expect(hz).toBeLessThan(4200); }
    }
  });
  it('every map has a music track', () => {
    for (const m of Object.values(MAPS)) expect(TRACKS[trackForMap(m.id, m.indoor, m.terrain)], m.id).toBeDefined();
  });
});

describe('clock and weather', () => {
  it('wraps the day and formats time', () => {
    expect(gameMinutes(360, 0)).toBe(360);
    expect(gameMinutes(360, 60000)).toBe(420);
    expect(gameMinutes(1430, 30000)).toBe(20);
    expect(fmtClock(375)).toBe('06:15');
  });
  it('is dark at night, bright at noon and warm at dusk', () => {
    expect(ambientAt(12).dark).toBe(0);
    expect(ambientAt(12).grade).toBe(0xffffff);
    expect(ambientAt(2).dark).toBeGreaterThan(0.6);
    expect(ambientAt(18.5).dark).toBeGreaterThan(0.12);
    expect(ambientAt(18.5).dark).toBeLessThan(0.4);
    expect(phaseOf(12)).toBe('day'); expect(phaseOf(23)).toBe('night'); expect(phaseOf(6)).toBe('dawn'); expect(phaseOf(18)).toBe('dusk');
    for (let h = 0; h < 24; h += 0.25) { const a = ambientAt(h); expect(a.dark).toBeGreaterThanOrEqual(0); expect(a.dark).toBeLessThanOrEqual(0.8); }
  });
  it('weather is deterministic, first day is clear, and some days rain', () => {
    expect(weatherForDay(1)).toBe('clear');
    expect(weatherForDay(17)).toBe(weatherForDay(17));
    const days = Array.from({ length: 200 }, (_, i) => weatherForDay(i + 1));
    expect(days.filter((d) => d !== 'clear').length).toBeGreaterThan(40);
    expect(days.filter((d) => d === 'clear').length).toBeGreaterThan(80);
  });
  it('rain never falls indoors or in caves, forests are foggy, caves dusty', () => {
    const rainyDay = Array.from({ length: 200 }, (_, i) => i + 2).find((d) => weatherForDay(d) !== 'clear')!;
    expect(areaWeather('outdoor', rainyDay).rain).toBeGreaterThan(0);
    expect(areaWeather('indoor', rainyDay).rain).toBe(0);
    expect(areaWeather('cave', rainyDay).rain).toBe(0);
    expect(areaWeather('forest', 1).fog).toBe(true);
    expect(areaWeather('cave', 1).dust).toBe(true);
  });
});
