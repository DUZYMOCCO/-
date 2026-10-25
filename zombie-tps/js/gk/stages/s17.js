// v0.16.0: ガンキック ステージ17 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 17,
 "sub": "よあけの こうや",
 "theme": "dawn",
 "world": "w4",
 "icon": "🌅",
 "desc": "よあけの こうやを はしろう",
 "length": 5600,
 "hpMul": 1.45,
 "gimmick": null,
 "boss": {
  "id": "sunscorp",
  "name": "よあけの おおさそり",
  "hp": 3100
 },
 "arenas": [
  [
   ["nomad", "nomad", "scorp"],
   ["nomad", "scorp", "scorp"]
  ],
  [
   ["outlaw", "nomad", "zombie"],
   ["scorp", "scorp", "scorp", "nomad"]
  ],
  [
   ["nomad", "outlaw", "outlaw", "scorp"],
   ["hound", "hound", "nomad"],
   ["outlaw", "nomad", "scorp", "scorp"]
  ],
  [
   ["nomad", "nomad", "scorp"],
   ["rockz", "scorp", "scorp"]
  ]
 ],
 "weapons": ["shotgun", "flamer", "rifle", "mlauncher", "smoke", "rocket", "laser"],
 "start": ["katana", "pistol"],
 "rooms": null,
 "bossCalls": 0
};
