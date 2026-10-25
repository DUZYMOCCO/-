// v0.16.0: ガンキック ステージ7 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 7,
 "sub": "のっとられた きち",
 "theme": "base",
 "world": "w2",
 "icon": "🪖",
 "desc": "くんれんじょうを とりもどそう",
 "length": 5400,
 "hpMul": 1.18,
 "gimmick": "turret",
 "boss": {
  "id": "tank",
  "name": "ぼうそう せんしゃ",
  "hp": 2150
 },
 "arenas": [
  [
   ["soldierz", "zombie", "guard"],
   ["soldierz", "soldierz", "zombie"]
  ],
  [
   ["sniper", "soldierz", "guard", "zombie"],
   ["hulk", "soldierz"]
  ],
  [
   ["guard", "guard", "soldierz", "leaper"],
   ["sniper", "sniper", "zombie", "zombie"],
   ["soldierz", "hulk", "guard"]
  ],
  [
   ["soldierz", "zombie", "zombie"],
   ["sergeant"]
  ]
 ],
 "weapons": ["rifle", "laser", "minigun", "rocket"],
 "start": null,
 "rooms": null,
 "bossCalls": 0
};
