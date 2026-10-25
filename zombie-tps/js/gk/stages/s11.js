// v0.16.0: ガンキック ステージ11 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 11,
 "sub": "しずむ ふね",
 "theme": "ship",
 "world": "w3",
 "icon": "🚢",
 "desc": "しずむ ふねから にげよう",
 "length": 5600,
 "hpMul": 1.36,
 "gimmick": "tilt",
 "boss": {
  "id": "kraken",
  "name": "うみの ばけもの",
  "hp": 2300
 },
 "arenas": [
  [
   ["sailor", "sailor", "zombie"],
   ["sailor", "spitter", "swarm", "swarm"]
  ],
  [
   ["bloatz", "sailor", "sailor"],
   ["leaper", "sailor", "spitter", "zombie"]
  ],
  [
   ["sailor", "sailor", "swarm", "swarm", "leaper"],
   ["hulk", "sailor", "spitter"]
  ],
  [
   ["bloatz", "bloatz", "sailor"],
   ["leaper", "leaper", "sailor", "sailor", "swarm"]
  ]
 ],
 "weapons": ["rifle", "shotgun", "laser", "rocket"],
 "start": null,
 "rooms": null,
 "bossCalls": 0
};
