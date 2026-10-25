// v0.16.0: ガンキック ステージ8 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 8,
 "sub": "きりの もり",
 "theme": "forest",
 "world": "w2",
 "icon": "🌫",
 "desc": "きりの もりを すすもう",
 "length": 5400,
 "hpMul": 1.22,
 "gimmick": "fog",
 "boss": {
  "id": "beast",
  "name": "もりの ぬし",
  "hp": 2250
 },
 "arenas": [
  [
   ["hound", "zombie", "hound"],
   ["leaper", "zombie", "hound"]
  ],
  [
   ["wraith", "hound", "zombie", "zombie"],
   ["leaper", "leaper", "hound"]
  ],
  [
   ["hound", "hound", "crawler", "zombie"],
   ["hulk", "hound"],
   ["wraith", "leaper", "zombie", "hound"]
  ],
  [
   ["zombie", "zombie", "hound", "hound", "leaper"],
   ["hulk", "wraith", "hound"]
  ]
 ],
 "weapons": ["shotgun", "rifle", "smoke"],
 "start": null,
 "rooms": null,
 "bossCalls": 0
};
