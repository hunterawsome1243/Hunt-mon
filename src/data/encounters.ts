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
};
