export interface EncounterEntry { species: string; min: number; max: number; weight: number }
export interface EncounterTable { /** chance per grass step */ rate: number; terrain: 'grass' | 'forest' | 'cave'; entries: EncounterEntry[] }

/** Wild encounter tables per map (tall grass tiles). Expanded in M5 with the forest and cave. */
export const ENCOUNTERS: Record<string, EncounterTable> = {
  emberwick: { rate: 0.12, terrain: 'grass', entries: [
    { species: 'nibbit', min: 2, max: 3, weight: 60 }, { species: 'wrenlet', min: 2, max: 3, weight: 40 },
  ] },
  route1: { rate: 0.16, terrain: 'grass', entries: [
    { species: 'nibbit', min: 2, max: 5, weight: 35 }, { species: 'wrenlet', min: 3, max: 5, weight: 30 },
    { species: 'sparkit', min: 3, max: 5, weight: 15 }, { species: 'stingfly', min: 3, max: 5, weight: 15 }, { species: 'petalpuff', min: 4, max: 5, weight: 5 },
  ] },
  route2: { rate: 0.15, terrain: 'grass', entries: [
    { species: 'wrenlet', min: 8, max: 11, weight: 25 }, { species: 'nibbit', min: 8, max: 11, weight: 20 }, { species: 'brawlcub', min: 9, max: 12, weight: 20 },
    { species: 'coilsnap', min: 9, max: 12, weight: 15 }, { species: 'sparkit', min: 9, max: 12, weight: 15 }, { species: 'stingfly', min: 9, max: 12, weight: 5 },
  ] },
  mistwood: { rate: 0.17, terrain: 'forest', entries: [
    { species: 'petalpuff', min: 13, max: 17, weight: 25 }, { species: 'stingfly', min: 13, max: 16, weight: 20 }, { species: 'toxwasp', min: 15, max: 18, weight: 10 },
    { species: 'wispling', min: 14, max: 17, weight: 15 }, { species: 'coilsnap', min: 14, max: 17, weight: 15 }, { species: 'dreamoth', min: 16, max: 18, weight: 8 }, { species: 'brawlcub', min: 14, max: 17, weight: 7 },
  ] },
  hollowdeep: { rate: 0.2, terrain: 'cave', entries: [
    { species: 'glimmerbat', min: 17, max: 21, weight: 25 }, { species: 'pebbleback', min: 17, max: 21, weight: 25 }, { species: 'frostkin', min: 18, max: 22, weight: 20 },
    { species: 'wispling', min: 18, max: 22, weight: 15 }, { species: 'brawlcub', min: 18, max: 22, weight: 10 }, { species: 'coilsnap', min: 18, max: 22, weight: 5 },
  ] },
};
