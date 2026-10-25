// v0.16.0: ガンキック ステージ15 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 15,
 "sub": "さいごの けんきゅうじょ",
 "theme": "core",
 "world": "w3",
 "icon": "☢️",
 "desc": "さいごの へやへ いそげ",
 "length": 6200,
 "hpMul": 1.45,
 "gimmick": "vents",
 "boss": {
  "id": "final",
  "name": "はじまりの ミュータント",
  "hp": 3000
 },
 "arenas": [
  [
   ["labz", "labz", "guard", "patient"],
   ["spitter", "leaper", "labz"]
  ],
  [
   ["soldierz", "soldierz", "hound", "frozen"],
   ["bloatz", "sailor", "worker"]
  ],
  [
   ["wraith", "leaper", "leaper", "swarm", "swarm"],
   ["hulk", "spitter", "guard"],
   ["sniper", "soldierz", "hound", "hound"]
  ],
  [
   ["patch"],
   ["leaper", "leaper", "spitter", "crawler"]
  ],
  [
   ["hulk", "hulk", "swarm", "swarm"],
   ["sergeant", "labz", "labz"]
  ]
 ],
 "weapons": ["beam", "shotgun", "flamer", "minigun", "rocket", "smoke", "rifle"],
 "start": null,
 "rooms": null,
 "bossCalls": 0
};
