// v0.16.0: ガンキック ステージ1 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 1,
 "sub": "ほろびた けんきゅうじょ",
 "theme": "lab",
 "world": "w1",
 "icon": "🧪",
 "desc": "くらい けんきゅうじょを すすめ",
 "length": 4300,
 "hpMul": 1,
 "gimmick": null,
 "boss": {
  "id": "agent",
  "name": "くろよろい エージェント",
  "hp": 1400
 },
 "arenas": [
  [
   ["zombie", "labz", "zombie"],
   ["guard", "labz", "crawler"]
  ],
  [
   ["labz", "zombie", "crawler", "labz"],
   ["guard", "gunner", "zombie"]
  ],
  [
   ["guard", "zombie", "crawler", "labz"],
   ["hulk", "labz"],
   ["gunner", "guard", "crawler", "zombie"]
  ],
  [
   ["zombie", "zombie", "guard", "labz"],
   ["crawler", "bloatz", "guard", "zombie", "hulk"]
  ]
 ],
 "weapons": ["rifle", "flamer", "shotgun"],
 "start": null,
 "rooms": null,
 "bossCalls": 0
};
