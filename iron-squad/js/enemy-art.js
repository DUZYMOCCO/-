// IRON SQUAD - biome enemy roster and finished field illustrations (v7.0.3)
// Visual rendering functions and roster definitions for 22 new biome-specific enemy types.
// Rounded contours, shaded volumes, hit flash, facing and walking follow visuals.js.

export const ENEMY_ROSTER = [
  // 東の街道平原 | 野盗の弓兵 | 頭巾、短弓、矢筒
  { id: 'road_archer', name: '\u91ce\u76d7\u306e\u5f13\u5175', region: '\u6771\u306e\u8857\u9053\u5e73\u539f', radius: 16, desc: '\u982d\u5dfe\u3001\u77ed\u5f13\u3001\u77e2\u7b52' },
  // 東の街道平原 | 盗賊騎兵 | 小さめの馬にまたがる。槍
  { id: 'bandit_rider', name: '\u76d7\u8cca\u9a0e\u5175', region: '\u6771\u306e\u8857\u9053\u5e73\u539f', radius: 24, desc: '\u5c0f\u3055\u3081\u306e\u99ac\u306b\u307e\u305f\u304c\u308b\u3002\u69cd' },
  // 東の街道平原 | 野犬 | 痩せた犬。群れで出る想定（小さめ）
  { id: 'wild_dog', name: '\u91ce\u72ac', region: '\u6771\u306e\u8857\u9053\u5e73\u539f', radius: 12, desc: '\u75e9\u305b\u305f\u72ac\u3002\u7fa4\u308c\u3067\u51fa\u308b\u60f3\u5b9a\uff08\u5c0f\u3055\u3081\uff09' },
  // 東の街道平原 | 荒野の大牛 | 大きな角、突進しそうな前傾
  { id: 'plains_bull', name: '\u8352\u91ce\u306e\u5927\u725b', region: '\u6771\u306e\u8857\u9053\u5e73\u539f', radius: 28, desc: '\u5927\u304d\u306a\u89d2\u3001\u7a81\u9032\u3057\u305d\u3046\u306a\u524d\u50be' },

  // 南の塩原 | 塩サソリ | 白っぽい殻、持ち上げた尾
  { id: 'salt_scorpion', name: '\u5869\u30b5\u30bd\u30ea', region: '\u5357\u306e\u5869\u539f', radius: 18, desc: '\u767d\u3063\u307d\u3044\u6bbb\u3001\u6301\u3061\u4e0a\u3052\u305f\u5c3e' },
  // 南の塩原 | 砂塵ワーム | 地面から半身を出した太い虫
  { id: 'sand_worm', name: '\u7802\u5875\u30ef\u30fc\u30e0', region: '\u5357\u306e\u5869\u539f', radius: 22, desc: '\u5730\u9762\u304b\u3089\u534a\u8eab\u3092\u51fa\u3057\u305f\u592a\u3044\u866b' },
  // 南の塩原 | 塩漬けの亡者 | 包帯、白い結晶がこびりつく
  { id: 'salt_mummy', name: '\u5869\u6f2c\u3051\u306e\u4ea1\u8005', region: '\u5357\u306e\u5869\u539f', radius: 16, desc: '\u5305\u5e2f\u3001\u767d\u3044\u7d50\u6676\u304c\u3053\u3073\u308a\u3064\u304f' },
  // 南の塩原 | 砂の精 | 渦を巻く砂の体、光る目
  { id: 'dust_spirit', name: '\u7802\u306e\u7cbe', region: '\u5357\u306e\u5869\u539f', radius: 16, desc: '\u6e26\u3092\u5dfb\u304f\u7802\u306e\u4f53\u3001\u5149\u308b\u76ee' },

  // 北の山地 | 山羊鬼 | 曲がった角、毛皮、棍棒
  { id: 'goat_ogre', name: '\u5c71\u7f8a\u9b3c', region: '\u5317\u306e\u5c71\u5730', radius: 26, desc: '\u66f2\u304c\u3063\u305f\u89d2\u3001\u6bdb\u76ae\u3001\u68cd\u68d2' },
  // 北の山地 | 雪狼 | 白い毛並み、吐く息
  { id: 'snow_wolf', name: '\u96ea\u72fc', region: '\u5317\u306e\u5c71\u5730', radius: 18, desc: '\u767d\u3044\u6bdb\u4e26\u307f\u3001\u5410\u304f\u606f' },
  // 北の山地 | 岩トロル | 苔むした岩の肌、大柄
  { id: 'rock_troll', name: '\u5ca9\u30c8\u30ed\u30eb', region: '\u5317\u306e\u5c71\u5730', radius: 32, desc: '\u82d4\u3080\u3057\u305f\u5ca9\u306e\u808c\u3001\u5927\u67c4' },
  // 北の山地 | ハーピー | 翼の腕、鳥の脚。飛んでいる
  { id: 'harpy', name: '\u30cf\u30fc\u30d4\u30fc', region: '\u5317\u306e\u5c71\u5730', radius: 18, desc: '\u7ffc\u306e\u8155\u3001\u9ce5\u306e\u811a\u3002\u98db\u3093\u3067\u3044\u308b' },

  // 西の湿地 | 沼スライム | 濁った緑、泡、毒の雫
  { id: 'bog_slime', name: '\u6cbc\u30b9\u30e9\u30a4\u30e0', region: '\u897f\u306e\u6e7f\u5730', radius: 16, desc: '\u6fc1\u3063\u305f\u7dd1\u3001\u6ce1\u3001\u6bd2\u306e\u96eb' },
  // 西の湿地 | 大ガエル | 太った体、長い舌
  { id: 'giant_frog', name: '\u5927\u30ac\u30a8\u30eb', region: '\u897f\u306e\u6e7f\u5730', radius: 20, desc: '\u592a\u3063\u305f\u4f53\u3001\u9577\u3044\u820c' },
  // 西の湿地 | リザードマン槍兵 | うろこ、長槍、小盾
  { id: 'lizard_spearman', name: '\u30ea\u30b6\u30fc\u30c9\u30de\u30f3\u69cd\u5175', region: '\u897f\u306e\u6e7f\u5730', radius: 18, desc: '\u3046\u308d\u3053\u3001\u9577\u69cd\u3001\u5c0f\u76fe' },
  // 西の湿地 | 沼の鬼火 | 青白い火の玉
  { id: 'marsh_wisp', name: '\u6cbc\u306e\u9b3c\u706b', region: '\u897f\u306e\u6e7f\u5730', radius: 12, desc: '\u9752\u767d\u3044\u706b\u306e\u7389' },

  // 夜（どこでも） | 亡霊 | 半透明、ぼろ布、足がない
  { id: 'wraith', name: '\u4ea1\u970a', region: '\u591c\uff08\u3069\u3053\u3067\u3082\uff09', radius: 18, desc: '\u534a\u900f\u660e\u3001\u307c\u308d\u5e03\u3001\u8db3\u304c\u306a\u3044' },
  // 夜（どこでも） | 吸血コウモリ | 赤い目、小さめ
  { id: 'vampire_bat', name: '\u5438\u8840\u30b3\u30a6\u30e2\u30ea', region: '\u591c\uff08\u3069\u3053\u3067\u3082\uff09', radius: 12, desc: '\u8d64\u3044\u76ee\u3001\u5c0f\u3055\u3081' },

  // 魔王城の近く | インプ | 小さい悪魔、三叉の槍、羽
  { id: 'imp', name: '\u30a4\u30f3\u30d7', region: '\u9b54\u738b\u57ce\u306e\u8fd1\u304f', radius: 14, desc: '\u5c0f\u3055\u3044\u60aa\u9b54\u3001\u4e09\u53c9\u306e\u69cd\u3001\u7fbd' },
  // 魔王城の近く | 魔族の槍兵 | 黒い鎧、角兜、長槍
  { id: 'demon_lancer', name: '\u9b54\u65cf\u306e\u69cd\u5175', region: '\u9b54\u738b\u57ce\u306e\u8fd1\u304f', radius: 20, desc: '\u9ed2\u3044\u93a7\u3001\u89d2\u515c\u3001\u9577\u69cd' },
  // 魔王城の近く | 魔族の魔導士 | ローブ、杖の先に紫の光
  { id: 'demon_mage', name: '\u9b54\u65cf\u306e\u9b54\u5c0e\u58eb', region: '\u9b54\u738b\u57ce\u306e\u8fd1\u304f', radius: 18, desc: '\u30ed\u30fc\u30d6\u3001\u6756\u306e\u5148\u306b\u7d2b\u306e\u5149' },
  // 魔王城の近く | 地獄の猟犬 | 黒い犬、たてがみに炎
  { id: 'hellhound', name: '\u5730\u7344\u306e\u731f\u72ac', region: '\u9b54\u738b\u57ce\u306e\u8fd1\u304f', radius: 20, desc: '\u9ed2\u3044\u72ac\u3001\u305f\u3066\u304c\u307f\u306b\u708e' }
];

// The roster remains stable; all live painters now use the rounded field style.
import {TOON_ENEMY_ART,ENEMY_HEAD_HEIGHT} from './enemy-art-toon.js?v=280';
export const ENEMY_ART=TOON_ENEMY_ART;
export const enemyArtHeadHeight=mob=>ENEMY_HEAD_HEIGHT[mob?.type]||0;
export function drawEnemyArt(c,m,now=0,facingApplied=false){
  const paint=ENEMY_ART[m?.type];if(!paint)return false;
  paint(c,m,now,facingApplied);return true;
}
