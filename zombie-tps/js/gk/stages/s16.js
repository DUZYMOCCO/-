// v0.16.0: ガンキック ステージ16 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 16,
 "sub": "いせきの どうくつ",
 "theme": "ruins",
 "world": "w4",
 "icon": "🗿",
 "desc": "いせきの どうくつを さがそう",
 "length": 5400,
 "hpMul": 1.45,
 "gimmick": "debris",
 "boss": {
  "id": "ghoulking",
  "name": "いせきの グール",
  "hp": 3000
 },
 "arenas": [
  [
   ["ghoul", "ghoulet", "ghoul"],
   ["ghoulet", "ghoulet", "ghoul"]
  ],
  [
   ["ghoul", "ghoul", "ghoulet", "ghoulet"],
   ["ghoul", "leaper", "ghoulet"]
  ],
  [
   ["ghoulet", "ghoulet", "ghoulet", "ghoul"],
   ["ghoul", "ghoul", "leaper"],
   ["ghoul", "ghoulet", "ghoulet", "ghoul"]
  ],
  [
   ["ghoul", "ghoul", "ghoulet"],
   ["bigghoul", "ghoulet"]
  ]
 ],
 "weapons": [],
 "start": ["katana", "pistol"],
 "rooms": null,
 "bossCalls": 0
};
