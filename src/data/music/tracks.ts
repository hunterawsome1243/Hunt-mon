import type { Score } from '../../engine/audio/musicdsl';

/**
 * Original chiptune scores. Each bar is 16 sixteenth-steps. Harmony (arpeggio, bass, drums) is derived from `prog`,
 * melodies are hand-written to sit on the chord tones.
 */
export const TRACKS: Record<string, Score> = {
  // gentle title theme
  title: {
    bpm: 90, leadWave: 'pulse25', arp: 'broken', bass: 'pulse', drums: 'none', vibrato: true,
    prog: ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'C'],
    lead: ['E5:8 A5:8', 'C6:8 A5:4 F5:4', 'E5:4 G5:4 C6:8', 'D6:8 B5:4 G5:4', 'C6:4 E6:4 A5:8', 'A5:4 F6:4 C6:8', 'B5:4 D6:4 G6:8', 'E6:8 C6:8'],
  },
  // Emberwick: sunny folk melody
  emberwick: {
    bpm: 112, leadWave: 'pulse25', arp: 'up', bass: 'root8', drums: 'light',
    prog: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
    lead: ['E5:2 G5:2 E5:2 C5:2 E5:4 D5:2 C5:2', 'D5:2 G5:2 B5:2 G5:2 D5:4 R:4', 'C5:2 E5:2 A5:2 E5:2 C5:4 B4:2 A4:2', 'A4:2 C5:2 F5:2 C5:2 A4:4 G4:4',
      'G5:4 E5:2 C5:2 E5:2 G5:2 C6:2 G5:2', 'B5:4 G5:2 D5:2 G5:4 A5:2 B5:2', 'A5:2 G5:2 F5:2 E5:2 F5:4 A5:4', 'G5:2 F5:2 E5:2 D5:2 D5:4 R:4'],
  },
  // Brindlemoor: bustling market town
  brindlemoor: {
    bpm: 120, leadWave: 'pulse25', arp: 'up', bass: 'root8', drums: 'light',
    prog: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'],
    lead: ['B5:2 D6:2 B5:2 G5:2 B5:4 A5:4', 'A5:2 F#5:2 A5:2 D6:2 A5:4 F#5:4', 'G5:2 B5:2 E6:2 B5:2 G5:4 E5:4', 'E5:2 G5:2 C6:2 G5:2 E5:4 G5:4',
      'D6:2 B5:2 G5:2 B5:2 D6:4 G6:4', 'F#6:2 E6:2 D6:2 A5:2 D6:4 A5:4', 'C6:2 B5:2 A5:2 G5:2 E5:4 G5:4', 'F#5:2 A5:2 D6:2 F#6:2 A5:4 R:4'],
  },
  // routes: a brisk walking tune
  route: {
    bpm: 124, leadWave: 'pulse50', arp: 'up', bass: 'root8', drums: 'light', vol: 0.9,
    prog: ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'],
    lead: ['F#5:2 A5:2 F#5:2 D5:2 F#5:2 A5:2 D6:4', 'E5:2 A5:2 C#6:2 A5:2 E5:4 R:4', 'D5:2 F#5:2 B5:2 F#5:2 D5:4 F#5:4', 'B4:2 D5:2 G5:2 D5:2 B4:4 D5:4',
      'A5:2 F#5:2 D5:2 F#5:2 A5:4 D6:4', 'C#6:2 E6:2 C#6:2 A5:2 E5:4 A5:4', 'B5:2 G5:2 D5:2 G5:2 B5:4 D6:4', 'C#6:2 B5:2 A5:2 G#5:2 A5:4 R:4'],
  },
  // Mistwood: slow, misty
  mistwood: {
    bpm: 84, leadWave: 'pulse125', arp: 'broken', bass: 'pulse', drums: 'none', vibrato: true, vol: 0.85,
    prog: ['Am', 'F', 'Dm', 'E', 'Am', 'F', 'E', 'Am'],
    lead: ['E5:6 C5:2 A4:4 R:4', 'F5:6 A5:2 C6:4 R:4', 'D5:4 F5:4 A5:4 F5:4', 'G#5:6 B5:2 E6:4 R:4', 'A5:4 C6:4 B5:4 A5:4', 'C6:6 A5:2 F5:4 R:4', 'B5:4 G#5:4 E5:4 G#5:4', 'A4:12 R:4'],
  },
  // Hollowdeep: eerie drip and hum
  hollowdeep: {
    bpm: 72, leadWave: 'triangle', arp: 'broken', bass: 'pulse', drums: 'none', vibrato: true, vol: 0.8,
    prog: ['Cm', 'Ab', 'Fm', 'G', 'Cm', 'Ab', 'G', 'Cm'],
    lead: ['G4:8 Eb5:4 D5:4', 'C5:8 Eb5:4 C5:4', 'Ab4:6 C5:2 F5:8', 'B4:4 D5:4 G5:8', 'Eb5:4 G5:4 C6:8', 'Eb5:8 C5:4 Ab4:4', 'D5:4 B4:4 G4:8', 'C5:12 R:4'],
  },
  // interiors: warm and cosy
  interior: {
    bpm: 100, leadWave: 'pulse25', arp: 'up', bass: 'walk', drums: 'none', vol: 0.85,
    prog: ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C'],
    lead: ['A5:4 C6:4 A5:4 F5:4', 'G5:4 E5:4 G5:4 C5:4', 'F5:4 A5:4 D6:4 A5:4', 'D6:4 Bb5:4 F5:4 D5:4', 'C6:4 A5:4 F5:4 A5:4', 'E5:4 G5:4 C6:4 G5:4', 'D5:4 F5:4 Bb5:4 F5:4', 'G5:8 E5:4 R:4'],
  },
  // gyms: driving
  gym: {
    bpm: 140, leadWave: 'pulse25', arp: 'up', bass: 'root8', drums: 'drive',
    prog: ['Em', 'C', 'D', 'Em', 'Em', 'C', 'B', 'Em'],
    lead: ['B5:2 B5:2 G5:2 E5:2 B5:4 E6:4', 'C6:2 C6:2 G5:2 E5:2 C6:4 G5:4', 'D6:2 D6:2 A5:2 F#5:2 D6:4 A5:4', 'E6:2 D6:2 B5:2 G5:2 E5:8',
      'G5:2 B5:2 E6:2 B5:2 G6:4 E6:4', 'E6:2 C6:2 G5:2 E5:2 G5:4 C6:4', 'F#5:2 B5:2 D#6:2 B5:2 F#6:4 D#6:4', 'E6:4 B5:4 G5:4 E5:4'],
  },
  // wild battle
  battle_wild: {
    bpm: 150, leadWave: 'pulse25', arp: 'broken', bass: 'root8', drums: 'drive',
    prog: ['Am', 'G', 'F', 'E', 'Am', 'G', 'F', 'E'],
    lead: ['A5:2 A5:2 C6:2 A5:2 E6:4 C6:4', 'G5:2 G5:2 B5:2 G5:2 D6:4 B5:4', 'F5:2 F5:2 A5:2 F5:2 C6:4 A5:4', 'E5:2 G#5:2 B5:2 E6:2 B5:4 G#5:4',
      'C6:2 E6:2 A6:2 E6:2 C6:4 A5:4', 'B5:2 D6:2 G6:2 D6:2 B5:4 G5:4', 'A5:2 C6:2 F6:2 C6:2 A5:4 F5:4', 'G#5:2 B5:2 E6:2 G#6:2 E6:8'],
  },
  // trainer / rival battle
  battle_trainer: {
    bpm: 160, leadWave: 'pulse25', arp: 'broken', bass: 'root8', drums: 'drive',
    prog: ['Dm', 'Bb', 'C', 'A', 'Dm', 'Bb', 'C', 'A'],
    lead: ['D6:2 D6:2 F6:2 D6:2 A6:4 F6:4', 'Bb5:2 Bb5:2 D6:2 Bb5:2 F6:4 D6:4', 'C6:2 C6:2 E6:2 C6:2 G6:4 E6:4', 'A5:2 C#6:2 E6:2 A6:2 E6:4 C#6:4',
      'F6:2 A6:2 D7:2 A6:2 F6:4 D6:4', 'D6:2 F6:2 Bb6:2 F6:2 D6:4 Bb5:4', 'E6:2 G6:2 C7:2 G6:2 E6:4 C6:4', 'C#6:2 E6:2 A6:2 C#7:2 A6:8'],
  },
  // gym leader / finale battles
  battle_leader: {
    bpm: 168, leadWave: 'pulse25', arp: 'broken', bass: 'root8', drums: 'drive',
    prog: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'Em'],
    lead: ['E6:2 G6:2 B6:2 G6:2 E6:4 B5:4', 'C6:2 E6:2 G6:2 E6:2 C6:4 G5:4', 'D6:2 G6:2 B6:2 G6:2 D6:4 B5:4', 'F#6:2 A6:2 D7:2 A6:2 F#6:4 D6:4',
      'B6:2 A6:2 G6:2 F#6:2 E6:8', 'G6:2 E6:2 C6:2 E6:2 G6:8', 'A6:2 F#6:2 D6:2 F#6:2 A6:4 D7:4', 'E6:4 G6:4 B6:4 E7:4'],
  },
  victory: {
    bpm: 140, leadWave: 'pulse25', arp: 'up', bass: 'root8', drums: 'march', loop: false,
    prog: ['C', 'F', 'G', 'C'],
    lead: ['G5:2 G5:2 G5:2 C6:6 R:4', 'A5:2 A5:2 A5:2 F6:6 R:4', 'B5:2 B5:2 B5:2 G6:6 R:4', 'C6:4 E6:4 G6:4 C7:4'],
  },
  date: {
    bpm: 78, leadWave: 'pulse25', arp: 'broken', bass: 'walk', drums: 'none', vibrato: true, vol: 0.9,
    prog: ['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Bb', 'C'],
    lead: ['C6:4 A5:4 C6:4 F6:4', 'D6:4 A5:4 F5:4 A5:4', 'D6:4 F6:4 D6:4 Bb5:4', 'E6:6 D6:2 C6:8', 'A5:4 C6:4 F6:4 E6:4', 'E6:4 C6:4 A5:4 C6:4', 'F6:4 D6:4 Bb5:4 D6:4', 'G5:4 C6:4 E6:8'],
  },
  ending: {
    bpm: 100, leadWave: 'pulse25', arp: 'up', bass: 'root8', drums: 'light', vibrato: true,
    prog: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C'],
    lead: ['E5:4 G5:4 C6:8', 'D6:4 B5:4 G5:8', 'C6:4 E6:4 A5:8', 'A5:4 C6:4 F6:8', 'G5:4 C6:4 E6:4 G6:4', 'B5:4 D6:4 G6:8', 'A5:4 C6:4 F6:4 A6:4', 'C6:16'],
  },
};

/** Which track plays on which map (falls back by terrain / indoor). */
export function trackForMap(id: string, indoor: boolean, terrain?: string): string {
  if (id.startsWith('date_')) return 'date';
  if (id === 'emberwick') return 'emberwick';
  if (id === 'brindlemoor') return 'brindlemoor';
  if (id === 'brindle_gym' || id === 'hollow_hall') return 'gym';
  if (id === 'mistwood') return 'mistwood';
  if (id === 'hollowdeep' || id === 'lumen_chamber') return 'hollowdeep';
  if (indoor) return 'interior';
  if (terrain === 'cave') return 'hollowdeep';
  return 'route';
}
