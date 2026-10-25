// v0.16.0: ガンキック ステージ3 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 3,
 "sub": "あめの はいきょとし",
 "theme": "city",
 "world": "w1",
 "icon": "🌧",
 "desc": "あめの まちを かけぬけろ",
 "length": 4900,
 "hpMul": 1,
 "gimmick": null,
 "boss": {
  "id": "giant",
  "name": "てっかめん の きょじん",
  "hp": 1600
 },
 "arenas": [
  [
   ["zombie", "soldierz", "zombie"],
   ["raider", "zombie", "soldierz"]
  ],
  [
   ["zombie", "zombie", "guard", "soldierz"],
   ["sniper", "soldierz", "zombie"]
  ],
  [
   ["guard", "soldierz", "sniper"],
   ["hulk", "zombie"],
   ["leaper", "zombie", "soldierz", "raider"]
  ],
  [
   ["soldierz", "soldierz", "sniper", "zombie"],
   ["hulk", "soldierz", "zombie", "guard"]
  ]
 ],
 "weapons": ["rifle", "smoke", "shotgun", "rocket"],
 "start": null,
 "rooms": null,
 "bossCalls": 0
};
