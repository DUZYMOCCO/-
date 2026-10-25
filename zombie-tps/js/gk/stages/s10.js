// v0.16.0: ガンキック ステージ10 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 10,
 "sub": "くずれる はし",
 "theme": "bridge",
 "world": "w2",
 "icon": "🌉",
 "desc": "くずれる はしを わたろう",
 "length": 5800,
 "hpMul": 1.32,
 "gimmick": "debris",
 "boss": {
  "id": "wreck",
  "name": "がれきの きょじん",
  "hp": 2450
 },
 "arenas": [
  [
   ["zombie", "zombie", "soldierz"],
   ["leaper", "zombie", "spitter", "soldierz"]
  ],
  [
   ["soldierz", "soldierz", "zombie", "guard"],
   ["hulk", "leaper", "zombie"]
  ],
  [
   ["spitter", "spitter", "zombie", "leaper"],
   ["soldierz", "sniper", "zombie", "zombie"],
   ["hulk", "hulk"]
  ],
  [
   ["leaper", "leaper", "soldierz", "zombie"],
   ["sergeant", "zombie"]
  ]
 ],
 "weapons": ["rifle", "mlauncher", "minigun", "shotgun", "smoke", "rocket"],
 "start": null,
 "rooms": null,
 "bossCalls": 0
};
