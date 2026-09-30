export interface ShopDef { id: string; name: string; stock: string[]; /** extra stock unlocked by a flag */ unlock?: Array<{ flag: string; items: string[] }> }

export const SHOPS: Record<string, ShopDef> = {
  mira: {
    id: 'mira', name: "Mira's Supplies",
    stock: ['potion', 'antidote', 'burn_salve', 'wake_bell', 'zap_relief', 'catch_orb', 'sweet_bun', 'wildflower', 'old_novel'],
    unlock: [
      { flag: 'badge.first', items: ['super_potion', 'great_orb', 'revive'] },
      { flag: 'badge.second', items: ['hyper_potion', 'full_heal', 'ultra_orb'] },
    ],
  },
  cafe: { id: 'cafe', name: 'Moth & Mug Menu', stock: ['cocoa', 'sweet_bun', 'trail_bar', 'wildflower'] },
  brindle: {
    id: 'brindle', name: 'Brindlemoor Mart', stock: ['potion', 'super_potion', 'antidote', 'burn_salve', 'wake_bell', 'zap_relief', 'catch_orb', 'great_orb'],
    unlock: [{ flag: 'badge.tidal', items: ['hyper_potion', 'full_heal', 'revive', 'ultra_orb'] }],
  },
};
