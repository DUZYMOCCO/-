// v0.16.0: ガンキック ステージ12 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 12,
 "sub": "ゆきやまの けんきゅうきち",
 "theme": "snow",
 "world": "w3",
 "icon": "❄️",
 "desc": "ゆきの やまを こえよう",
 "length": 5600,
 "hpMul": 1.4,
 "gimmick": "blizzard",
 "boss": {
  "id": "yeti",
  "name": "こおりの きょじん",
  "hp": 2550
 },
 "arenas": [
  [
   ["frozen", "frozen", "hound"],
   ["soldierz", "frozen", "hound"]
  ],
  [
   ["sniper", "frozen", "frozen", "soldierz"],
   ["hulk", "hound", "hound"]
  ],
  [
   ["frozen", "frozen", "leaper", "soldierz"],
   ["sniper", "sniper", "frozen"],
   ["hound", "hound", "hound", "frozen"]
  ],
  [
   ["frozen", "soldierz", "soldierz", "hound"],
   ["patch", "frozen"]
  ]
 ],
 "weapons": ["rifle", "beam", "flamer", "rocket"],
 "start": null,
 "rooms": null,
 "bossCalls": 0
};
