// 店ごとの差はこの表だけに置く。来客・売買・評判の処理は sim/shops.js で共通化。
export const SHOP_TYPES = Object.freeze({
  restaurant: { id: 'restaurant', name: '食堂', benches: ['stove', 'kitchen'], goods: [], dishes: true, skill: 'cooking', crowd: { traveler: 2, resident: 2, caravan: 1, mercenary: 1 } },
  weapon: { id: 'weapon', name: '武器屋', benches: ['forge'], goods: [], gear: 'weapon', skill: 'weaponsmith', crowd: { mercenary: 5, bounty_hunter: 4, traveler: 1, resident: 1 } },
  armor: { id: 'armor', name: '防具屋', benches: ['armor_bench'], goods: [], gear: 'armor', skill: 'armorsmith', crowd: { escort: 6, caravan: 2, mercenary: 1, resident: 1 } },
  clothes: { id: 'clothes', name: '服屋', benches: ['loom'], goods: [], gear: 'clothes', skill: 'weaving', crowd: { resident: 7, traveler: 2, caravan: 1 } },
  ranged: { id: 'ranged', name: '射撃武器屋', benches: ['crossbow_bench'], goods: ['bolts'], gear: 'ranged', skill: 'bowsmith', crowd: { hunter: 7, traveler: 2, resident: 1 } },
  prosthetic: { id: 'prosthetic', name: '義肢屋', benches: ['prosthetic_bench'], goods: [], gear: 'prosthetic', skill: 'robotics', crowd: { injured: 8, mercenary: 1, traveler: 1 }, visitorFactor: 0.3, purseFactor: 3 },
  general: { id: 'general', name: '雑貨屋', benches: [], goods: ['grain', 'water', 'dried_meat', 'salt', 'cotton', 'cloth', 'scrap', 'iron', 'parts', 'cactus_rum', 'herbs', 'luxury'], skill: 'trade', crowd: { resident: 6, traveler: 2, caravan: 2 } },
});

export const SHOP_BENCH_TYPE = Object.freeze(Object.fromEntries(
  Object.values(SHOP_TYPES).flatMap((entry) => entry.benches.map((bench) => [bench, entry.id])),
));

