// v0.16.0: ガンキック ステージ6 の データ（あとから よむ）。side-action/js/rules.js から うつした（opencode で へんかん・テストで たしかめた）
export const STAGE = {
 "no": 6,
 "sub": "すてられた びょういん",
 "theme": "hospital",
 "world": "w2",
 "icon": "🩺",
 "desc": "びょういんを かけぬけよう",
 "length": 5200,
 "hpMul": 1.12,
 "gimmick": "blackout",
 "boss": {
  "id": "surgeon",
  "name": "メスの せんせい",
  "hp": 1900
 },
 "arenas": [
  [
   ["patient", "patient", "labz"],
   ["guard", "patient", "zombie", "crawler"]
  ],
  [
   ["labz", "labz", "spitter", "patient"],
   ["guard", "guard", "leaper"]
  ],
  [
   ["patient", "patient", "patient", "zombie"],
   ["hulk", "labz"],
   ["spitter", "guard", "leaper", "patient"]
  ],
  [
   ["guard", "labz", "crawler", "crawler"],
   ["bloatz", "patient", "spitter", "guard"]
  ]
 ],
 "weapons": ["rifle", "mlauncher", "shotgun"],
 "start": null,
 "rooms": null,
 "bossCalls": 0
};
