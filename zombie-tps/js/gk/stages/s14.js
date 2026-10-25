// v0.16.0: ガンキック ステージ14 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 14,
 "sub": "あらしの ひこうじょう",
 "theme": "airfield",
 "world": "w3",
 "icon": "⛈",
 "desc": "あらしの ひこうじょうを かけぬけろ",
 "length": 5800,
 "hpMul": 1.48,
 "gimmick": "lightning",
 "boss": {
  "id": "heli",
  "name": "ゾンビ ヘリ",
  "hp": 2400
 },
 "arenas": [
  [
   ["soldierz", "soldierz", "zombie", "hound"],
   ["sniper", "soldierz", "guard"]
  ],
  [
   ["hound", "hound", "soldierz", "zombie"],
   ["sergeant"]
  ],
  [
   ["soldierz", "sniper", "hulk"],
   ["hound", "leaper", "soldierz", "soldierz"],
   ["guard", "guard", "zombie", "zombie", "hound"]
  ],
  [
   ["sniper", "sniper", "soldierz", "soldierz"],
   ["hulk", "soldierz", "hound"]
  ]
 ],
 "weapons": ["rifle", "minigun", "laser", "rocket", "mlauncher", "shotgun"],
 "start": null,
 "rooms": null,
 "bossCalls": 0
};
