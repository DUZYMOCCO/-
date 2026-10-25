// v0.16.0: ガンキック ステージ18 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 18,
 "sub": "とびらの そうこ",
 "theme": "doors",
 "world": "w4",
 "icon": "🚪",
 "desc": "とびらを あけて すすもう",
 "length": 6600,
 "hpMul": 1.3,
 "gimmick": null,
 "boss": {
  "id": "doorboss",
  "name": "サングラスの ボス",
  "hp": 2600
 },
 "arenas": [
  [
   ["suit", "suit", "suit"]
  ],
  [
   ["suit", "suit", "suitk"]
  ],
  [
   ["suit", "suit", "suit"]
  ],
  [
   ["suit", "suit", "suitk"]
  ],
  [
   ["suit", "suit", "suitk"]
  ]
 ],
 "weapons": ["shotgun", "smoke", "mlauncher", "rifle", "laser", "flamer"],
 "start": ["shotgun", "pistol"],
 "rooms": [
  {
   "quota": 26,
   "doors": [
    [-170, "door"],
    [130, "door"]
   ],
   "mix": ["suit", "suit", "suit", "suitk", "suitp"],
   "tough": null
  },
  {
   "quota": 36,
   "doors": [
    [-200, "door"],
    [-20, "shutter"],
    [190, "door"]
   ],
   "mix": ["suit", "suit", "suitk", "suitk", "suitp", "suitp", "suitsg"],
   "tough": null
  },
  {
   "quota": 40,
   "doors": [
    [-205, "shutter"],
    [0, "steel"],
    [200, "shutter"]
   ],
   "mix": ["suit", "suit", "suit", "suitk", "suitp", "suitsg"],
   "tough": ["heavy", "suitsg"]
  },
  {
   "quota": 44,
   "doors": [
    [-215, "door"],
    [-85, "door"],
    [65, "shutter"],
    [205, "door"]
   ],
   "mix": ["suit", "suit", "suitk", "suitk", "suitp", "suitp", "suitsg"],
   "tough": null
  },
  {
   "quota": 50,
   "doors": [
    [-210, "steel"],
    [-60, "shutter"],
    [90, "door"],
    [215, "shutter"]
   ],
   "mix": ["suit", "suit", "suitk", "suitp", "suitsg", "suitsg"],
   "tough": ["heavy", "heavy", "suitsg"]
  }
 ],
 "bossCalls": 36
};
