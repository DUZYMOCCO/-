// v0.16.0: ガンキック ステージ4 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 4,
 "sub": "くらやみの ちかてつ",
 "theme": "subway",
 "world": "w1",
 "icon": "🚇",
 "desc": "くらやみの てつろを すすめ",
 "length": 5000,
 "hpMul": 1,
 "gimmick": "train",
 "boss": {
  "id": "mutant",
  "name": "どろどろ ミュータント",
  "hp": 1700
 },
 "arenas": [
  [
   ["zombie", "swarm", "swarm", "zombie"],
   ["bloatz", "spitter"]
  ],
  [
   ["leaper", "swarm", "swarm", "zombie"],
   ["bloatz", "spitter", "swarm"]
  ],
  [
   ["leaper", "bloatz", "swarm", "swarm"],
   ["spitter", "spitter", "zombie", "soldierz"],
   ["swarm", "swarm", "leaper", "leaper", "swarm"]
  ],
  [
   ["bloatz", "bloatz", "spitter"],
   ["hulk", "leaper", "swarm", "spitter"]
  ]
 ],
 "weapons": ["shotgun", "laser", "rifle"],
 "start": null,
 "rooms": null,
 "bossCalls": 0
};
