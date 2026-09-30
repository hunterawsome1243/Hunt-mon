import type { ItemDef } from './types';

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(([
  { id: 'potion', name: 'Potion', desc: 'Restores 20 HP.', price: 200, kind: 'heal', heal: 20 },
  { id: 'super_potion', name: 'Super Potion', desc: 'Restores 50 HP.', price: 500, kind: 'heal', heal: 50 },
  { id: 'hyper_potion', name: 'Hyper Potion', desc: 'Restores 120 HP.', price: 1000, kind: 'heal', heal: 120 },
  { id: 'antidote', name: 'Antidote', desc: 'Cures poison.', price: 100, kind: 'status', cures: ['poison'] },
  { id: 'burn_salve', name: 'Burn Salve', desc: 'Cures a burn.', price: 150, kind: 'status', cures: ['burn'] },
  { id: 'wake_bell', name: 'Wake Bell', desc: 'Wakes a sleeping creature.', price: 150, kind: 'status', cures: ['sleep'] },
  { id: 'zap_relief', name: 'Zap Relief', desc: 'Cures paralysis.', price: 150, kind: 'status', cures: ['paralysis'] },
  { id: 'full_heal', name: 'Full Heal', desc: 'Cures any status.', price: 400, kind: 'status', cures: 'all' },
  { id: 'revive', name: 'Revive', desc: 'Revives a fainted creature at half HP.', price: 1500, kind: 'revive' },
  { id: 'catch_orb', name: 'Catch Orb', desc: 'A device for catching wild creatures.', price: 200, kind: 'ball', ballBonus: 1 },
  { id: 'great_orb', name: 'Great Orb', desc: 'A better orb.', price: 600, kind: 'ball', ballBonus: 1.5 },
  { id: 'ultra_orb', name: 'Ultra Orb', desc: 'A top-tier orb.', price: 1200, kind: 'ball', ballBonus: 2 },
  { id: 'wildflower', name: 'Wildflowers', desc: 'A hand-tied bunch of wildflowers.', price: 150, kind: 'gift', tags: ['flower'] },
  { id: 'old_novel', name: 'Old Novel', desc: 'A well-loved adventure novel.', price: 300, kind: 'gift', tags: ['book'] },
  { id: 'trail_bar', name: 'Trail Bar', desc: 'Chewy and energising.', price: 100, kind: 'gift', tags: ['sport', 'food'] },
  { id: 'pocket_gadget', name: 'Pocket Gadget', desc: 'A clicking, whirring little gizmo.', price: 500, kind: 'gift', tags: ['tech'] },
  { id: 'shiny_pebble', name: 'Shiny Pebble', desc: 'Unusually smooth and sparkly.', price: 400, kind: 'gift', tags: ['rare'] },
  { id: 'odd_trinket', name: 'Odd Trinket', desc: 'You are not sure what it is.', price: 40, kind: 'gift', tags: ['junk'] },
  { id: 'sweet_bun', name: 'Sweet Bun', desc: 'A fresh bun. Mira’s favorite recipe.', price: 120, kind: 'gift', tags: ['sweet', 'food'] },
] as ItemDef[]).map((i) => [i.id, i]));
