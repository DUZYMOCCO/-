// v0.16.0: ガンキック ステージ13 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 13,
 "sub": "ちかの むしの す",
 "theme": "hive",
 "world": "w3",
 "icon": "🪲",
 "desc": "むしの すを くぐりぬけろ",
 "length": 5600,
 "hpMul": 1.44,
 "gimmick": "goo",
 "boss": {
  "id": "queen",
  "name": "むしの じょおう",
  "hp": 2600
 },
 "arenas": [
  [
   ["swarm", "swarm", "crawler", "swarm"],
   ["spitter", "leaper", "swarm"]
  ],
  [
   ["bloatz", "crawler", "crawler"],
   ["wraith", "swarm", "swarm", "leaper", "spitter"]
  ],
  [
   ["leaper", "leaper", "crawler", "swarm", "swarm"],
   ["hulk", "spitter", "bloatz"],
   ["wraith", "wraith", "swarm", "swarm"]
  ],
  [
   ["bloatz", "bloatz", "spitter", "spitter"],
   ["hulk", "leaper", "leaper", "swarm", "swarm"]
  ]
 ],
 "weapons": ["shotgun", "rifle", "smoke", "rocket"],
 "start": null,
 "rooms": null,
 "bossCalls": 0
};
