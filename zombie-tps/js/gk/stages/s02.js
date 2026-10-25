// v0.16.0: ガンキック ステージ2 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 2,
 "sub": "あかい そらの おやしき",
 "theme": "manor",
 "world": "w1",
 "icon": "🏚",
 "desc": "あかい そらの おやしきへ",
 "length": 4700,
 "hpMul": 1,
 "gimmick": null,
 "boss": {
  "id": "hydra",
  "name": "ねじれ ばけもの",
  "hp": 1700
 },
 "arenas": [
  [
   ["zombie", "zombie", "crawler"],
   ["leaper", "zombie", "grunt"]
  ],
  [
   ["shield", "guard", "zombie", "crawler"],
   ["leaper", "leaper", "crawler", "zombie"]
  ],
  [
   ["hulk", "zombie", "crawler"],
   ["gunner", "guard", "shield", "zombie"],
   ["leaper", "zombie", "crawler", "labz", "leaper"]
  ],
  [
   ["brute", "gunner", "zombie"],
   ["shield", "leaper", "crawler", "guard", "zombie"]
  ],
  [
   ["zombie", "zombie", "guard", "leaper", "crawler"],
   ["hulk", "brute", "crawler"]
  ]
 ],
 "weapons": ["rifle", "mlauncher", "rocket"],
 "start": null,
 "rooms": null,
 "bossCalls": 0
};
