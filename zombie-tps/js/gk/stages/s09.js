// v0.16.0: ガンキック ステージ9 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 9,
 "sub": "うごく こうじょう",
 "theme": "factory",
 "world": "w2",
 "icon": "🏭",
 "desc": "うごく こうじょうを ぬけろ",
 "length": 5600,
 "hpMul": 1.27,
 "gimmick": "factory",
 "boss": {
  "id": "welder",
  "name": "ようせつ ゾンビ",
  "hp": 2350
 },
 "arenas": [
  [
   ["worker", "worker", "zombie"],
   ["worker", "soldierz", "zombie"]
  ],
  [
   ["bloatz", "worker", "worker"],
   ["soldierz", "worker", "leaper", "zombie"]
  ],
  [
   ["worker", "hulk", "worker"],
   ["spitter", "soldierz", "worker", "bloatz"]
  ],
  [
   ["worker", "worker", "zombie", "soldierz"],
   ["patch"]
  ]
 ],
 "weapons": ["rifle", "flamer", "shotgun", "rocket"],
 "start": null,
 "rooms": null,
 "bossCalls": 0
};
