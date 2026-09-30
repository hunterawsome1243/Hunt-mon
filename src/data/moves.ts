import type { MonType, MoveDef, MoveEffect } from './types';

type M = [id: string, name: string, type: MonType, cat: 'phys' | 'spec' | 'status', power: number, acc: number | null, pp: number, desc: string, extra?: { priority?: number; highCrit?: boolean; effect?: MoveEffect }];

const st = (kind: 'burn' | 'poison' | 'sleep' | 'paralysis', chance: number): MoveEffect => ({ status: { kind, chance } });
const stage = (stat: 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'acc' | 'eva', delta: number, who: 'self' | 'foe', chance?: number): MoveEffect => ({ stages: [{ stat, delta, who, chance }] });

const LIST: M[] = [
  // normal
  ['tackle', 'Tackle', 'normal', 'phys', 40, 100, 35, 'A full-body charge.'],
  ['scratch', 'Scratch', 'normal', 'phys', 40, 100, 35, 'Rakes with sharp claws.'],
  ['quick_dash', 'Quick Dash', 'normal', 'phys', 40, 100, 30, 'Strikes first with a burst of speed.', { priority: 1 }],
  ['body_slam', 'Body Slam', 'normal', 'phys', 85, 100, 15, 'A heavy slam that may paralyze.', { effect: st('paralysis', 0.3) }],
  ['take_down', 'Take Down', 'normal', 'phys', 90, 85, 20, 'A reckless charge that hurts the user too.', { effect: { recoil: 0.25 } }],
  ['slash', 'Slash', 'normal', 'phys', 70, 100, 20, 'Slices with a high critical rate.', { highCrit: true }],
  ['swift_star', 'Swift Star', 'normal', 'spec', 60, null, 20, 'Stars that never miss.'],
  ['struggle', 'Struggle', 'normal', 'phys', 50, null, 1, 'Used when no PP remains. Hurts the user.', { effect: { recoil: 0.25 } }],
  ['growl', 'Growl', 'normal', 'status', 0, 100, 40, 'Lowers foe’s Attack.', { effect: stage('atk', -1, 'foe') }],
  ['leer', 'Leer', 'normal', 'status', 0, 100, 30, 'Lowers foe’s Defense.', { effect: stage('def', -1, 'foe') }],
  ['screech', 'Screech', 'normal', 'status', 0, 85, 40, 'Sharply lowers foe’s Defense.', { effect: stage('def', -2, 'foe') }],
  ['harden', 'Harden', 'normal', 'status', 0, null, 30, 'Raises own Defense.', { effect: stage('def', 1, 'self') }],
  ['howl', 'Howl', 'normal', 'status', 0, null, 40, 'Raises own Attack.', { effect: stage('atk', 1, 'self') }],
  ['recover', 'Recover', 'normal', 'status', 0, null, 10, 'Restores half of max HP.', { effect: { heal: 0.5 } }],
  ['sing', 'Sing', 'normal', 'status', 0, 55, 15, 'A lullaby that may put foe to sleep.', { effect: st('sleep', 1) }],
  // flame
  ['ember', 'Ember', 'flame', 'spec', 40, 100, 25, 'Small flames that may burn.', { effect: st('burn', 0.1) }],
  ['flame_wheel', 'Flame Wheel', 'flame', 'phys', 60, 100, 25, 'A blazing roll that may burn.', { effect: st('burn', 0.1) }],
  ['fire_fang', 'Fire Fang', 'flame', 'phys', 65, 95, 15, 'Burning bite.', { effect: st('burn', 0.1) }],
  ['flamethrower', 'Flamethrower', 'flame', 'spec', 90, 100, 15, 'A torrent of fire.', { effect: st('burn', 0.1) }],
  ['will_o_wisp', 'Will-o-Wisp', 'flame', 'status', 0, 85, 15, 'Sinister flames that burn.', { effect: st('burn', 1) }],
  // tide
  ['bubble', 'Bubble', 'tide', 'spec', 40, 100, 30, 'Bubbles that may slow foe.', { effect: stage('spe', -1, 'foe', 0.1) }],
  ['water_gun', 'Water Gun', 'tide', 'spec', 40, 100, 25, 'A jet of water.'],
  ['aqua_jet', 'Aqua Jet', 'tide', 'phys', 40, 100, 20, 'A swift strike of water.', { priority: 1 }],
  ['surf', 'Surf', 'tide', 'spec', 90, 100, 15, 'A crashing wave.'],
  ['tidal_crash', 'Tidal Crash', 'tide', 'phys', 85, 95, 15, 'Slams down with the tide.'],
  // leaf
  ['vine_lash', 'Vine Lash', 'leaf', 'phys', 45, 100, 25, 'Whips with vines.'],
  ['razor_leaf', 'Razor Leaf', 'leaf', 'phys', 55, 95, 25, 'Sharp leaves, high crit.', { highCrit: true }],
  ['absorb', 'Absorb', 'leaf', 'spec', 40, 100, 25, 'Drains half the damage as HP.', { effect: { drain: 0.5 } }],
  ['sleep_spore', 'Sleep Spore', 'leaf', 'status', 0, 75, 15, 'Spores that induce sleep.', { effect: st('sleep', 1) }],
  ['petal_storm', 'Petal Storm', 'leaf', 'spec', 90, 100, 15, 'A whirl of petals.'],
  // volt
  ['thunder_shock', 'Thunder Shock', 'volt', 'spec', 40, 100, 30, 'A jolt that may paralyze.', { effect: st('paralysis', 0.1) }],
  ['spark', 'Spark', 'volt', 'phys', 65, 100, 20, 'Electric tackle, may paralyze.', { effect: st('paralysis', 0.3) }],
  ['thunderbolt', 'Thunderbolt', 'volt', 'spec', 90, 100, 15, 'A strong bolt.', { effect: st('paralysis', 0.1) }],
  ['thunder_wave', 'Thunder Wave', 'volt', 'status', 0, 90, 20, 'Paralyzes the foe.', { effect: st('paralysis', 1) }],
  // frost
  ['frost_breath', 'Frost Breath', 'frost', 'spec', 40, 100, 30, 'A chilling breath.'],
  ['ice_shard', 'Ice Shard', 'frost', 'phys', 40, 100, 30, 'A shard flung quickly.', { priority: 1 }],
  ['icy_wind', 'Icy Wind', 'frost', 'spec', 55, 95, 15, 'Lowers foe’s Speed.', { effect: stage('spe', -1, 'foe') }],
  ['ice_beam', 'Ice Beam', 'frost', 'spec', 90, 100, 10, 'A freezing beam.'],
  // stone
  ['pebble_shot', 'Pebble Shot', 'stone', 'phys', 35, 100, 30, 'Flings pebbles.'],
  ['rock_throw', 'Rock Throw', 'stone', 'phys', 50, 90, 15, 'Hurls a rock.'],
  ['rock_slide', 'Rock Slide', 'stone', 'phys', 75, 90, 10, 'Boulders tumble down.'],
  ['stone_edge', 'Stone Edge', 'stone', 'phys', 100, 80, 5, 'Sharp stones, high crit.', { highCrit: true }],
  // gale
  ['gust', 'Gust', 'gale', 'spec', 40, 100, 35, 'Whips up a gust.'],
  ['wing_slash', 'Wing Slash', 'gale', 'phys', 60, 100, 25, 'Strikes with wings.'],
  ['air_cutter', 'Air Cutter', 'gale', 'spec', 55, 95, 25, 'Blades of air, high crit.', { highCrit: true }],
  ['agility', 'Agility', 'gale', 'status', 0, null, 30, 'Sharply raises Speed.', { effect: stage('spe', 2, 'self') }],
  // venom
  ['poison_sting', 'Poison Sting', 'venom', 'phys', 35, 100, 35, 'A toxic sting.', { effect: st('poison', 0.3) }],
  ['acid', 'Acid', 'venom', 'spec', 40, 100, 30, 'Corrosive spray.', { effect: stage('spd', -1, 'foe', 0.1) }],
  ['sludge', 'Sludge', 'venom', 'spec', 65, 100, 20, 'Toxic sludge.', { effect: st('poison', 0.3) }],
  ['poison_gas', 'Poison Gas', 'venom', 'status', 0, 90, 20, 'Poisons the foe.', { effect: st('poison', 1) }],
  // mind
  ['mind_pulse', 'Mind Pulse', 'mind', 'spec', 50, 100, 25, 'A wave of thought.'],
  ['psy_wave', 'Psy Wave', 'mind', 'spec', 65, 100, 20, 'A strong psychic wave.', { effect: stage('spd', -1, 'foe', 0.2) }],
  ['calm_mind', 'Calm Mind', 'mind', 'status', 0, null, 20, 'Raises Sp. Atk and Sp. Def.', { effect: { stages: [{ stat: 'spa', delta: 1, who: 'self' }, { stat: 'spd', delta: 1, who: 'self' }] } }],
  ['hypnosis', 'Hypnosis', 'mind', 'status', 0, 60, 20, 'Puts the foe to sleep.', { effect: st('sleep', 1) }],
  ['mind_crush', 'Mind Crush', 'mind', 'spec', 90, 100, 10, 'Overwhelming mental force.'],
  // shade
  ['spook', 'Spook', 'shade', 'phys', 30, 100, 30, 'A startling touch.', { effect: st('paralysis', 0.3) }],
  ['nightfall', 'Nightfall', 'shade', 'spec', 60, 100, 25, 'Darkness closes in.'],
  ['shadow_orb', 'Shadow Orb', 'shade', 'spec', 80, 100, 15, 'A dark orb that may lower Sp. Def.', { effect: stage('spd', -1, 'foe', 0.2) }],
  // fist
  ['karate_chop', 'Karate Chop', 'fist', 'phys', 50, 100, 25, 'Chop with high crit.', { highCrit: true }],
  ['quick_jab', 'Quick Jab', 'fist', 'phys', 40, 100, 30, 'A jab that strikes first.', { priority: 1 }],
  ['brick_break', 'Brick Break', 'fist', 'phys', 75, 100, 15, 'Shatters barriers.'],
  ['bulk_up', 'Bulk Up', 'fist', 'status', 0, null, 20, 'Raises Attack and Defense.', { effect: { stages: [{ stat: 'atk', delta: 1, who: 'self' }, { stat: 'def', delta: 1, who: 'self' }] } }],
];

export const MOVES: Record<string, MoveDef> = Object.fromEntries(LIST.map(([id, name, type, cat, power, acc, pp, desc, x]) => [id, { id, name, type, cat, power, acc, pp, desc, ...x }]));
