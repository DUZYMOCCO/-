// v0.16.0: ガンキック ステージ5 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 5,
 "sub": "あかい そらの とう",
 "theme": "tower",
 "world": "w1",
 "icon": "🏙️",
 "desc": "そらの とうを のぼろう",
 "length": 5300,
 "hpMul": 1,
 "gimmick": null,
 "boss": {
  "id": "king",
  "name": "あかい め の おう",
  "hp": 2400
 },
 "arenas": [
  [
   ["soldierz", "knight", "leaper"],
   ["sniper", "soldierz", "wraith"]
  ],
  [
   ["leaper", "leaper", "spitter", "zombie"],
   ["hulk", "sniper", "wraith"]
  ],
  [
   ["knight", "soldierz", "spitter"],
   ["bloatz", "sniper", "soldierz"],
   ["wraith", "leaper", "leaper", "swarm", "swarm"]
  ],
  [
   ["knight", "spitter", "soldierz", "wraith"],
   ["hulk", "knight", "leaper"]
  ],
  [
   ["soldierz", "soldierz", "leaper", "spitter", "sniper"],
   ["hulk", "hulk", "swarm", "swarm"]
  ]
 ],
 "weapons": ["rifle", "shotgun", "rocket"],
 "start": null,
 "rooms": null,
 "bossCalls": 0
};
