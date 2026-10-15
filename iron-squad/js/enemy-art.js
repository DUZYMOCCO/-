// IRON SQUAD - Enemy Art Module (v6.11.23 candidate)
// Visual rendering functions and roster definitions for 22 new biome-specific enemy types.
// Follows the same toon/cel-shaded style as visuals.js (flat palettes, dark contours, hitPulse flash, facing flip, walking bob).

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

// Helper primitives matching visuals.js conventions
const shape = (c, points, color, edge = '#20282a') => {
  c.fillStyle = color;
  c.strokeStyle = edge;
  c.lineWidth = 0.9;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
  if (edge !== 'transparent') c.stroke();
};

const line = (c, points, color, width = 1) => {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
};

const ellipse = (c, x, y, rx, ry, color) => {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
};

// 1. 野盗の弓兵 (road_archer)
function drawRoadArcher(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const step = Math.sin(now * 0.016 + (m.x || 0)) * 1.8;
  const bob = Math.sin(now * 0.009 + (m.x || 0)) * 0.8;

  const cloth = flash ? '#d9d3cc' : '#6b5e4a';
  const hood = flash ? '#ece8e1' : '#8c7a5e';
  const dark = flash ? '#c4bdae' : '#3d342a';
  const bow = flash ? '#d9c7a2' : '#94784a';

  c.save();
  if (facingLeft) c.scale(-1, 1);
  c.translate(0, bob);

  // Legs
  line(c, [[-4, -8], [-5 + step, 1], [3, -8], [4 - step, 1]], dark, 3.2);

  // Torso / Coat
  shape(c, [[-6, -21], [5, -21], [7, -7], [-7, -7]], cloth);
  c.fillStyle = dark;
  c.fillRect(-6, -11, 12, 2.5); // belt

  // Quiver on back (left)
  shape(c, [[-9, -24], [-6, -25], [-4, -12], [-8, -11]], '#4a3d2e');
  line(c, [[-8, -25], [-10, -29], [-6, -25], [-7, -30]], flash ? '#fff' : '#b8a686', 1.5);

  // Head with hood
  shape(c, [[-6, -21], [-7, -31], [0, -35], [6, -31], [5, -21]], hood);
  c.fillStyle = dark;
  c.fillRect(-3, -28, 8, 4); // eye slit
  c.fillStyle = flash ? '#fff' : '#e5b350';
  c.fillRect(1, -27, 2.5, 2); // glinting eye

  // Bow in front
  c.strokeStyle = bow;
  c.lineWidth = 2.2;
  c.beginPath();
  c.arc(9, -15, 8.5, -Math.PI * 0.38, Math.PI * 0.38);
  c.stroke();
  line(c, [[12, -21], [12, -8]], flash ? '#fff' : '#d2cbba', 1);

  c.restore();
}

// 2. 盗賊騎兵 (bandit_rider)
function drawBanditRider(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const step = Math.sin(now * 0.02 + (m.x || 0)) * 2.5;
  const bob = Math.sin(now * 0.015 + (m.x || 0)) * 1.5;

  const horse = flash ? '#d9d0c7' : '#6b472e';
  const mane = flash ? '#c2b5a8' : '#382215';
  const armor = flash ? '#e0dedb' : '#575b63';
  const spear = flash ? '#fff' : '#a8b3b5';

  c.save();
  if (facingLeft) c.scale(-1, 1);
  c.translate(0, bob);
  c.scale(1.15, 1.15);

  // Horse legs
  line(c, [[-10, -8], [-12 - step, 1], [-7, -8], [-5 + step, 1]], mane, 2.8);
  line(c, [[7, -8], [9 + step, 1], [12, -8], [14 - step, 1]], mane, 2.8);

  // Horse tail
  shape(c, [[-14, -14], [-22, -9], [-15, -8]], mane);

  // Horse body
  ellipse(c, 0, -13, 14, 8, horse);

  // Horse neck & head
  shape(c, [[7, -15], [16, -25], [22, -23], [17, -13]], horse);
  shape(c, [[6, -17], [14, -27], [12, -18]], mane); // mane
  shape(c, [[15, -26], [17, -30], [19, -26]], horse); // ear
  c.fillStyle = flash ? '#fff' : '#1a100b';
  c.fillRect(18, -24, 2, 2); // eye

  // Rider torso
  shape(c, [[-4, -22], [4, -22], [3, -14], [-4, -14]], armor);
  ellipse(c, 0, -27, 4.5, 4.5, flash ? '#ece8e1' : '#c59d74');
  shape(c, [[-5, -29], [0, -34], [5, -29], [4, -26], [-4, -26]], armor);

  // Spear
  line(c, [[-8, -17], [28, -28]], spear, 2.2);
  shape(c, [[28, -28], [35, -31], [29, -26]], flash ? '#fff' : '#d1dadc');

  c.restore();
}

// 3. 野犬 (wild_dog)
function drawWildDog(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const step = Math.sin(now * 0.022 + (m.x || 0)) * 2.2;
  const bob = Math.sin(now * 0.018 + (m.x || 0)) * 1.0;

  const fur = flash ? '#d9d3cc' : '#78654c';
  const dark = flash ? '#b8b0a2' : '#453828';

  c.save();
  if (facingLeft) c.scale(-1, 1);
  c.translate(0, bob);
  c.scale(0.85, 0.85);

  // Legs (thin, running)
  line(c, [[-7, -5], [-9 + step, 1], [-4, -5], [-2 - step, 1]], dark, 2.2);
  line(c, [[4, -5], [6 + step, 1], [8, -5], [10 - step, 1]], dark, 2.2);

  // Tail
  line(c, [[-9, -9], [-15, -5]], fur, 2.0);

  // Body
  ellipse(c, 0, -9, 10, 5.2, fur);
  line(c, [[-2, -11], [-2, -7], [1, -11], [1, -7]], dark, 1.2); // ribs

  // Head & snout
  shape(c, [[4, -11], [11, -16], [16, -12], [14, -8], [7, -7]], fur);
  shape(c, [[7, -14], [8, -19], [11, -15]], dark); // ear
  c.fillStyle = dark;
  c.fillRect(15, -11, 2, 2); // nose
  c.fillStyle = flash ? '#fff' : '#e0ab46';
  c.fillRect(10, -13, 2, 1.5); // eye

  c.restore();
}

// 4. 荒野の大牛 (plains_bull)
function drawPlainsBull(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const step = Math.sin(now * 0.014 + (m.x || 0)) * 2.0;
  const bob = Math.sin(now * 0.01 + (m.x || 0)) * 1.2;

  const body = flash ? '#d9d0c7' : '#573322';
  const dark = flash ? '#baa89b' : '#381f14';
  const horn = flash ? '#fff' : '#d6ccb6';

  c.save();
  if (facingLeft) c.scale(-1, 1);
  c.translate(0, bob);
  c.scale(1.25, 1.25);

  // Massive sturdy legs
  shape(c, [[-11, -8], [-13 + step, 1], [-8 + step, 1], [-6, -8]], dark);
  shape(c, [[6, -8], [4 - step, 1], [9 - step, 1], [11, -8]], dark);

  // Barrel body with shoulder hump
  ellipse(c, -2, -15, 17, 10.5, body);
  shape(c, [[-3, -20], [6, -26], [13, -20], [3, -15]], body);

  // Head lower for charge
  shape(c, [[8, -16], [16, -22], [22, -16], [17, -9], [9, -11]], body);

  // Huge curved horns
  shape(c, [[13, -21], [17, -29], [25, -25], [19, -20]], horn);

  // Glowing angry eye & nostril
  c.fillStyle = flash ? '#fff' : '#e63946';
  c.fillRect(15, -16, 2.5, 2);
  c.fillStyle = dark;
  c.fillRect(19, -11, 2, 2);

  c.restore();
}

// 5. 塩サソリ (salt_scorpion)
function drawSaltScorpion(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const step = Math.sin(now * 0.02 + (m.x || 0)) * 1.6;
  const tailSway = Math.sin(now * 0.015 + (m.x || 0)) * 1.8;

  const shell = flash ? '#f4f1ea' : '#d2cfc4';
  const dark = flash ? '#c5c0b4' : '#8c857b';
  const stinger = flash ? '#fff' : '#588b76';

  c.save();
  if (facingLeft) c.scale(-1, 1);

  // Walking legs (6)
  line(c, [[-6, -4], [-13 - step, 1], [-2, -4], [-8 + step, 1], [2, -4], [8 - step, 1]], dark, 1.8);
  line(c, [[-4, -3], [-11 + step, 1], [0, -3], [-5 - step, 1], [4, -3], [11 + step, 1]], dark, 1.8);

  // Main flat shell
  shape(c, [[-9, -7], [-5, -13], [5, -13], [9, -7], [5, -3], [-5, -3]], shell);

  // Front pincers
  line(c, [[6, -8], [14, -13], [17, -11]], shell, 2.4);
  line(c, [[17, -11], [22, -15]], dark, 2.0); // upper claw
  line(c, [[17, -11], [22, -9]], dark, 2.0); // lower claw

  // Raised tail curving over
  shape(c, [
    [-7, -9],
    [-13, -15],
    [-12 + tailSway, -23],
    [-5 + tailSway, -27],
    [1 + tailSway, -24],
    [-3 + tailSway, -21],
    [-7, -14]
  ], shell);

  // Stinger bulb & needle
  ellipse(c, 1 + tailSway, -24, 2.5, 2.5, shell);
  shape(c, [[2 + tailSway, -24], [6 + tailSway, -27], [2 + tailSway, -22]], stinger);

  c.restore();
}

// 6. 砂塵ワーム (sand_worm)
function drawSandWorm(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const sway = Math.sin(now * 0.012 + (m.x || 0)) * 2.5;

  const body = flash ? '#ded7cb' : '#ab824e';
  const dark = flash ? '#b89f7f' : '#6b4e28';
  const mouth = flash ? '#fff' : '#4a2520';

  c.save();
  if (facingLeft) c.scale(-1, 1);

  // Ground sand mound
  ellipse(c, 0, 0, 15, 4.5, '#cbb48b');

  // Segment 1 (base)
  shape(c, [[-11, 0], [-9, -9], [9, -9], [11, 0]], body);
  line(c, [[-9, -5], [9, -5]], dark, 1.5);

  // Segment 2 (mid leaning)
  shape(c, [[-9, -9], [-7 + sway * 0.5, -19], [8 + sway * 0.5, -18], [9, -9]], body);
  line(c, [[-8 + sway * 0.25, -14], [8 + sway * 0.25, -13]], dark, 1.5);

  // Segment 3 (head reared up)
  shape(c, [[-7 + sway * 0.5, -18], [-3 + sway, -27], [10 + sway, -23], [8 + sway * 0.5, -17]], body);

  // Circular maw
  ellipse(c, 4 + sway, -25, 5.5, 5.5, mouth);
  // Teeth (4 triangle points inside)
  shape(c, [[-1 + sway, -25], [3 + sway, -29], [2 + sway, -26]], '#ded6c1', 'transparent');
  shape(c, [[9 + sway, -25], [5 + sway, -29], [6 + sway, -26]], '#ded6c1', 'transparent');
  shape(c, [[4 + sway, -21], [1 + sway, -24], [4 + sway, -24]], '#ded6c1', 'transparent');

  c.restore();
}

// 7. 塩漬けの亡者 (salt_mummy)
function drawSaltMummy(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const step = Math.sin(now * 0.015 + (m.x || 0)) * 1.5;
  const bob = Math.sin(now * 0.008 + (m.x || 0)) * 0.8;

  const bandage = flash ? '#f5f2eb' : '#bfb69e';
  const dark = flash ? '#c7c0af' : '#473d32';
  const crystal = flash ? '#fff' : '#f0ece1';

  c.save();
  if (facingLeft) c.scale(-1, 1);
  c.translate(0, bob);

  // Legs (stiff bandaged shuffle)
  line(c, [[-4, -8], [-6 + step, 1], [3, -8], [4 - step, 1]], bandage, 3.4);

  // Torso
  shape(c, [[-6, -22], [5, -22], [7, -7], [-7, -7]], bandage);
  line(c, [[-6, -17], [6, -15], [-5, -11], [7, -9]], dark, 1.2);

  // Salt crystals crusted on shoulder/hip
  shape(c, [[-8, -19], [-5, -25], [-2, -20]], crystal);
  shape(c, [[4, -13], [8, -17], [6, -9]], crystal);

  // Head
  ellipse(c, 1, -28, 5.5, 6, bandage);
  c.fillStyle = dark;
  c.fillRect(2, -29, 2.5, 2); // sunken dark eye socket

  // Trailing ragged wrap
  line(c, [[-4, -12], [-8, -4]], bandage, 1.2);

  c.restore();
}

// 8. 砂の精 (dust_spirit)
function drawDustSpirit(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const spin = Math.sin(now * 0.02 + (m.x || 0)) * 3;
  const floatY = Math.sin(now * 0.01 + (m.x || 0)) * 2;

  const sandLight = flash ? '#f7f4ee' : '#cfb386';
  const sandDark = flash ? '#d9d0c1' : '#997c50';
  const eye = flash ? '#fff' : '#ffe866';

  c.save();
  if (facingLeft) c.scale(-1, 1);
  c.translate(0, floatY);

  // Funnel bottom
  shape(c, [[-2, 0], [2, 0], [5 + spin * 0.3, -8], [-5 + spin * 0.3, -8]], sandDark, 'transparent');

  // Mid vortex
  ellipse(c, spin * 0.6, -14, 10, 6.5, sandDark);

  // Upper storm body
  ellipse(c, -spin * 0.4, -22, 12, 8, sandLight);

  // Whirling sand motes
  c.fillStyle = sandDark;
  c.fillRect(-7 - spin * 0.5, -17, 2.5, 2.5);
  c.fillRect(6 + spin * 0.5, -12, 2, 2);
  c.fillRect(8 - spin * 0.5, -24, 2, 2);

  // Glowing eyes
  c.fillStyle = eye;
  c.fillRect(-2, -23, 2.5, 2.5);
  c.fillRect(4, -23, 2.5, 2.5);

  c.restore();
}

// 9. 山羊鬼 (goat_ogre)
function drawGoatOgre(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const step = Math.sin(now * 0.016 + (m.x || 0)) * 2.0;
  const bob = Math.sin(now * 0.01 + (m.x || 0)) * 1.2;

  const skin = flash ? '#e6dec8' : '#7d705c';
  const fur = flash ? '#c9bca6' : '#4f4436';
  const horn = flash ? '#f5eee1' : '#332b22';
  const wood = flash ? '#c2b093' : '#573d23';

  c.save();
  if (facingLeft) c.scale(-1, 1);
  c.translate(0, bob);
  c.scale(1.2, 1.2);

  // Hoofed hairy legs
  shape(c, [[-7, -8], [-9 + step, 1], [-4 + step, 1], [-3, -8]], fur);
  shape(c, [[3, -8], [1 - step, 1], [6 - step, 1], [7, -8]], fur);

  // Torso with fur pelt
  shape(c, [[-9, -24], [7, -24], [9, -7], [-9, -7]], skin);
  shape(c, [[-9, -22], [4, -24], [7, -14], [-8, -12]], fur); // fur vest

  // Head & goat beard
  shape(c, [[-6, -24], [6, -24], [8, -34], [-6, -34]], skin);
  shape(c, [[1, -24], [4, -19], [2, -24]], fur); // beard

  // Curving goat horns
  shape(c, [[-5, -34], [-12, -43], [-4, -45], [-1, -36]], horn);
  shape(c, [[3, -34], [11, -43], [5, -45], [1, -36]], horn);

  // Yellow eye
  c.fillStyle = flash ? '#fff' : '#e0ab46';
  c.fillRect(3, -30, 2.5, 2);

  // Heavy wooden club
  line(c, [[6, -17], [18, -36]], wood, 4.8);
  ellipse(c, 18, -36, 4.5, 4.5, wood);

  c.restore();
}

// 10. 雪狼 (snow_wolf)
function drawSnowWolf(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const step = Math.sin(now * 0.02 + (m.x || 0)) * 2.2;
  const bob = Math.sin(now * 0.012 + (m.x || 0)) * 1.0;

  const whiteFur = flash ? '#ffffff' : '#e4eaed';
  const shadowFur = flash ? '#d4dadc' : '#8898a3';
  const eye = flash ? '#ffffff' : '#4da3e6';

  c.save();
  if (facingLeft) c.scale(-1, 1);
  c.translate(0, bob);
  c.scale(1.05, 1.05);

  // Legs
  line(c, [[-8, -7], [-10 + step, 1], [-5, -6], [-3 - step, 2]], shadowFur, 3.2);
  line(c, [[6, -7], [7 + step, 1], [11, -7], [13 - step, 1]], shadowFur, 3.2);

  // Tail
  shape(c, [[-10, -11], [-20, -15], [-14, -6], [-8, -6]], shadowFur);

  // Fluffy white body
  ellipse(c, 0, -12, 13, 7.5, whiteFur);

  // Thick winter ruff & head
  shape(c, [[3, -15], [7, -22], [11, -17], [14, -21], [17, -13], [23, -10], [18, -5], [9, -7]], whiteFur);

  // Ice blue eye
  c.fillStyle = eye;
  c.fillRect(14, -14, 2.5, 2);

  // Breath vapor
  c.fillStyle = 'rgba(255,255,255,0.55)';
  ellipse(c, 24, -9, 3, 2, 'rgba(255,255,255,0.55)');

  c.restore();
}

// 11. 岩トロル (rock_troll)
function drawRockTroll(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const step = Math.sin(now * 0.012 + (m.x || 0)) * 1.6;
  const bob = Math.sin(now * 0.008 + (m.x || 0)) * 1.0;

  const rock = flash ? '#e6e3dd' : '#646b65';
  const moss = flash ? '#c9ccb2' : '#495944';
  const dark = flash ? '#c2beba' : '#383d3a';

  c.save();
  if (facingLeft) c.scale(-1, 1);
  c.translate(0, bob);
  c.scale(1.35, 1.35);

  // Tree-trunk rock legs
  shape(c, [[-9, -8], [-11 + step, 2], [-4 + step, 2], [-3, -8]], dark);
  shape(c, [[3, -8], [1 - step, 2], [8 - step, 2], [9, -8]], dark);

  // Boulder torso
  shape(c, [[-12, -26], [10, -27], [13, -7], [-13, -7]], rock);
  shape(c, [[-10, -24], [-1, -29], [8, -26], [-1, -22]], moss); // moss patch

  // Head sunk directly onto shoulders
  shape(c, [[-5, -27], [5, -27], [4, -36], [-4, -36]], rock);

  // Tiny stony eye
  c.fillStyle = flash ? '#fff' : '#d4ac0d';
  c.fillRect(1, -32, 2, 2);

  // Heavy rock arm hanging low
  line(c, [[9, -20], [13, -5]], rock, 5.5);
  ellipse(c, 13, -5, 4, 4, dark);

  c.restore();
}

// 12. ハーピー (harpy)
function drawHarpy(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const wing = Math.sin(now * 0.02 + (m.x || 0)) * 4.5;
  const floatY = Math.sin(now * 0.012 + (m.x || 0)) * 2.5;

  const skin = flash ? '#f5eee4' : '#c7ab8d';
  const feathers = flash ? '#d9dee0' : '#576c75';
  const dark = flash ? '#a8b2b5' : '#35434a';

  c.save();
  if (facingLeft) c.scale(-1, 1);
  c.translate(0, -12 + floatY);

  // Bird talons hanging down
  line(c, [[-3, 0], [-5, 8], [-2, 9]], '#7a6549', 2);
  line(c, [[3, 0], [2, 8], [5, 9]], '#7a6549', 2);

  // Wing 1 (back)
  shape(c, [[-3, -13], [-18, -22 - wing], [-22, -10], [-8, -9]], dark);

  // Human torso
  shape(c, [[-4, -16], [4, -16], [3, -5], [-3, -5]], skin);

  // Head & wild hair
  ellipse(c, 0, -21, 4.5, 4.5, skin);
  shape(c, [[-5, -22], [-9, -29], [3, -27]], feathers); // hair
  c.fillStyle = flash ? '#fff' : '#2b1c13';
  c.fillRect(1, -21, 2, 2);

  // Wing 2 (front)
  shape(c, [[3, -13], [18, -22 - wing], [22, -10], [8, -9]], feathers);

  c.restore();
}

// 13. 沼スライム (bog_slime)
function drawBogSlime(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const pulse = Math.sin(now * 0.01 + (m.x || 0)) * 1.0;

  const base = flash ? '#d8e4d2' : '#36543b';
  const mid = flash ? '#eef5eb' : '#5a8c62';
  const toxin = flash ? '#fff' : '#8fd96c';

  c.save();

  // Murky blob
  c.fillStyle = base;
  c.beginPath();
  c.moveTo(-13, -2);
  c.bezierCurveTo(-15, -8, -8, -16 - pulse, -2, -16 - pulse);
  c.bezierCurveTo(7, -17 - pulse, 14, -8, 13, -2);
  c.quadraticCurveTo(0, 3, -13, -2);
  c.fill();

  // Toxic highlight / bubbles
  ellipse(c, -2, -9, 8, 4.5, mid);
  ellipse(c, -4, -11, 2.8, 2.8, toxin);
  ellipse(c, 5, -8, 2.2, 2.2, toxin);

  // Slime poison drip
  shape(c, [[-6, -2], [-5, 3], [-4, -2]], toxin);

  // Murky yellow eyes
  c.fillStyle = flash ? '#fff' : '#e6be43';
  ellipse(c, 3, -8, 1.5, 1.8, flash ? '#fff' : '#e6be43');
  ellipse(c, 7, -8, 1.5, 1.8, flash ? '#fff' : '#e6be43');

  c.restore();
}

// 14. 大ガエル (giant_frog)
function drawGiantFrog(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const tongueExtend = Math.max(0, Math.sin(now * 0.015 + (m.x || 0))) * 10;

  const skin = flash ? '#dce6d3' : '#4d693d';
  const belly = flash ? '#f5faee' : '#9bb57c';
  const dark = flash ? '#9fb38f' : '#2b3b22';

  c.save();
  if (facingLeft) c.scale(-1, 1);

  // Large folded hind legs
  ellipse(c, -11, -7, 6, 8, dark);

  // Fat frog body & pale belly
  ellipse(c, 0, -10, 13, 8.5, skin);
  ellipse(c, 3, -7, 9, 5.5, belly);

  // Front foot
  line(c, [[5, -5], [8, 0]], skin, 2.5);

  // Bulging eye on top
  ellipse(c, 6, -17, 3.8, 3.8, skin);
  c.fillStyle = flash ? '#fff' : '#141c10';
  c.fillRect(6, -18, 3, 1.5); // horizontal slit pupil

  // Long red tongue
  if (tongueExtend > 1) {
    line(c, [[9, -11], [14 + tongueExtend, -11]], flash ? '#fff' : '#d95368', 2.2);
    ellipse(c, 14 + tongueExtend, -11, 2, 2, flash ? '#fff' : '#d95368');
  }

  c.restore();
}

// 15. リザードマン槍兵 (lizard_spearman)
function drawLizardSpearman(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const step = Math.sin(now * 0.018 + (m.x || 0)) * 1.8;
  const bob = Math.sin(now * 0.01 + (m.x || 0)) * 0.9;

  const scale = flash ? '#dae8de' : '#4a7356';
  const belly = flash ? '#eff7f1' : '#7ea88a';
  const dark = flash ? '#a4baa8' : '#284230';
  const spear = flash ? '#fff' : '#9daeb5';

  c.save();
  if (facingLeft) c.scale(-1, 1);
  c.translate(0, bob);

  // Legs with claws
  line(c, [[-5, -7], [-7 + step, 1], [4, -7], [6 - step, 1]], dark, 3.2);

  // Heavy tail curving back
  shape(c, [[-7, -9], [-18, -6], [-12, -2], [-5, -6]], scale);

  // Scaled torso & belly plates
  shape(c, [[-6, -21], [5, -21], [7, -7], [-6, -7]], scale);
  line(c, [[-1, -19], [-1, -9]], belly, 2.4);

  // Dorsal ridge
  shape(c, [[-6, -23], [-8, -26], [-6, -19]], dark);

  // Reptile head with snout
  shape(c, [[-4, -22], [6, -24], [13, -19], [7, -16], [-3, -17]], scale);
  c.fillStyle = flash ? '#fff' : '#f1c40f';
  c.fillRect(4, -22, 2.2, 2.2); // yellow slit eye

  // Small buckler shield on left arm
  ellipse(c, -7, -15, 3.5, 6.5, flash ? '#fff' : '#61513c');

  // Long thrusting spear
  line(c, [[3, -12], [22, -24]], spear, 2.2);
  shape(c, [[22, -24], [29, -28], [24, -22]], flash ? '#fff' : '#c9d4d8');

  c.restore();
}

// 16. 沼の鬼火 (marsh_wisp)
function drawMarshWisp(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const floatY = Math.sin(now * 0.015 + (m.x || 0)) * 3;
  const flicker = Math.sin(now * 0.03 + (m.x || 0)) * 2;

  const aura = flash ? 'rgba(255,255,255,0.4)' : 'rgba(66,165,196,0.32)';
  const flame = flash ? '#ffffff' : '#3daec9';
  const core = flash ? '#ffffff' : '#d8f6ff';

  c.save();
  c.translate(0, -14 + floatY);

  // Outer ethereal aura
  ellipse(c, 0, 0, 11, 13, aura);

  // Flickering flame body
  shape(c, [[-7, 4], [0, -12 + flicker], [7, 4], [3, 8], [-3, 8]], flame, 'transparent');

  // Brilliant core
  ellipse(c, 0, 2, 4.5, 6, core);

  // Floating sparks
  c.fillStyle = core;
  c.fillRect(-8, -6, 1.8, 1.8);
  c.fillRect(7, -8, 1.8, 1.8);

  c.restore();
}

// 17. 亡霊 (wraith)
function drawWraith(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const floatY = Math.sin(now * 0.012 + (m.x || 0)) * 2.5;
  const trail = Math.sin(now * 0.02 + (m.x || 0)) * 2.2;

  const cloth = flash ? '#ede8f5' : '#494459';
  const shadow = flash ? '#c9c2d6' : '#23202b';
  const glow = flash ? '#ffffff' : '#5ce1e6';

  c.save();
  if (facingLeft) c.scale(-1, 1);
  c.translate(0, -10 + floatY);

  // Ragged trailing tattered hem (no legs)
  shape(c, [
    [-8, 0],
    [-12 + trail, 8],
    [-5, 3],
    [2 + trail, 9],
    [8, 2],
    [0, -4],
    [-8, 0]
  ], shadow, 'transparent');

  // Main tattered shroud
  shape(c, [[-8, -18], [7, -18], [9, -1], [-9, -1]], cloth);

  // Hooded head
  shape(c, [[-7, -18], [-8, -28], [0, -32], [7, -28], [6, -18]], cloth);

  // Deep shadow under hood
  c.fillStyle = shadow;
  c.fillRect(-4, -26, 8, 5.5);

  // Twin cyan glowing spirit eyes
  c.fillStyle = glow;
  c.fillRect(-2, -24, 2, 2);
  c.fillRect(2, -24, 2, 2);

  // Reaching wispy arms
  line(c, [[-5, -12], [-12, -9]], cloth, 2);
  line(c, [[5, -12], [12, -9]], cloth, 2);

  c.restore();
}

// 18. 吸血コウモリ (vampire_bat)
function drawVampireBat(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const wing = Math.sin(now * 0.025 + (m.x || 0)) * 4.0;
  const floatY = Math.sin(now * 0.015 + (m.x || 0)) * 2.0;

  const body = flash ? '#e2d9e6' : '#231a28';
  const membrane = flash ? '#c7bcc9' : '#392b42';
  const eye = flash ? '#ffffff' : '#e63946';

  c.save();
  c.translate(0, -10 + floatY);
  c.scale(0.85, 0.85);

  // Sharp bat wings
  shape(c, [[-3, -9], [-19, -19 - wing], [-23, -5], [-15, -8], [-9, -3]], membrane);
  shape(c, [[3, -9], [19, -19 - wing], [23, -5], [15, -8], [9, -3]], membrane);

  // Compact body
  ellipse(c, 0, -8, 3.8, 6.5, body);

  // Sharp ears
  shape(c, [[-3, -12], [-5, -19], [-1, -15]], body);
  shape(c, [[3, -12], [5, -19], [1, -15]], body);

  // Crimson eyes & fangs
  c.fillStyle = eye;
  c.fillRect(-2, -11, 1.8, 1.8);
  c.fillRect(1, -11, 1.8, 1.8);
  c.fillStyle = flash ? '#fff' : '#f0f0f0';
  c.fillRect(-1, -7, 1, 2);
  c.fillRect(1, -7, 1, 2);

  c.restore();
}

// 19. インプ (imp)
function drawImp(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const step = Math.sin(now * 0.02 + (m.x || 0)) * 1.5;
  const wing = Math.sin(now * 0.025 + (m.x || 0)) * 2.5;

  const red = flash ? '#e8d2d6' : '#873442';
  const dark = flash ? '#baa2a7' : '#3b1c23';
  const tip = flash ? '#ffffff' : '#d9485c';

  c.save();
  if (facingLeft) c.scale(-1, 1);
  c.scale(0.9, 0.9);

  // Tiny hooves
  line(c, [[-3, -5], [-4 + step, 1], [2, -5], [3 - step, 1]], dark, 2.2);

  // Tail with pointed barb
  line(c, [[-3, -7], [-10, -5]], dark, 1.5);
  shape(c, [[-10, -5], [-14, -3], [-11, -8]], dark);

  // Back bat wing
  shape(c, [[-3, -13], [-12, -19 - wing], [-13, -9], [-5, -9]], dark);

  // Imp torso
  shape(c, [[-4, -15], [4, -15], [5, -5], [-4, -5]], red);

  // Head with 2 horns
  ellipse(c, 0, -20, 4, 4.5, red);
  shape(c, [[-3, -22], [-5, -28], [-1, -24]], dark);
  shape(c, [[2, -22], [4, -28], [0, -24]], dark);

  // Glowing yellow eye
  c.fillStyle = flash ? '#fff' : '#f1c40f';
  c.fillRect(1, -20, 2, 2);

  // Trident lance
  line(c, [[3, -8], [9, -24]], dark, 1.8);
  shape(c, [[7, -24], [9, -29], [11, -24]], tip);

  c.restore();
}

// 20. 魔族の槍兵 (demon_lancer)
function drawDemonLancer(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const step = Math.sin(now * 0.016 + (m.x || 0)) * 1.8;
  const bob = Math.sin(now * 0.01 + (m.x || 0)) * 1.0;

  const armor = flash ? '#dedbdf' : '#2b2633';
  const crimson = flash ? '#edd8dc' : '#732737';
  const dark = flash ? '#baaebf' : '#17141c';
  const blade = flash ? '#ffffff' : '#bf3f54';

  c.save();
  if (facingLeft) c.scale(-1, 1);
  c.translate(0, bob);
  c.scale(1.1, 1.1);

  // Heavy greaves
  line(c, [[-5, -8], [-6 + step, 1], [4, -8], [5 - step, 1]], dark, 3.8);

  // Heavy demonic chestplate
  shape(c, [[-8, -25], [7, -25], [9, -8], [-9, -8]], armor);
  line(c, [[-5, -23], [-5, -9]], crimson, 2.2); // crimson sash

  // Horned helm
  shape(c, [[-6, -25], [6, -25], [7, -35], [-7, -35]], armor);
  shape(c, [[-5, -33], [-10, -43], [-2, -35]], crimson); // left horn
  shape(c, [[4, -33], [9, -43], [1, -35]], crimson); // right horn

  // Glowing eye visor slit
  c.fillStyle = flash ? '#fff' : '#e63946';
  c.fillRect(-1, -30, 5, 2);

  // Massive dark spear with crimson blade
  line(c, [[6, -11], [21, -37]], '#382f42', 2.8);
  shape(c, [[19, -34], [25, -43], [23, -32]], blade);

  c.restore();
}

// 21. 魔族の魔導士 (demon_mage)
function drawDemonMage(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const bob = Math.sin(now * 0.009 + (m.x || 0)) * 1.2;
  const orbGlow = Math.sin(now * 0.02 + (m.x || 0)) * 1.2;

  const robe = flash ? '#e6dfec' : '#382547';
  const purple = flash ? '#f1e6fa' : '#8848ba';
  const dark = flash ? '#bfb3c9' : '#191121';
  const orb = flash ? '#ffffff' : '#be63ff';

  c.save();
  if (facingLeft) c.scale(-1, 1);
  c.translate(0, bob);

  // Long flowing robe (down to floor)
  shape(c, [[-8, -24], [7, -24], [10, -1], [-10, -1]], robe);
  line(c, [[0, -23], [0, -2]], purple, 1.8); // magical trim

  // Hooded cowl
  shape(c, [[-6, -24], [-7, -34], [0, -37], [7, -34], [6, -24]], robe);

  // Shadow in hood
  c.fillStyle = dark;
  c.fillRect(-3, -31, 7, 5);

  // Glowing purple eyes
  c.fillStyle = orb;
  c.fillRect(-1, -29, 2, 2);
  c.fillRect(2, -29, 2, 2);

  // Dark staff with glowing orb
  line(c, [[7, -8], [15, -34]], '#24192e', 2.4);
  ellipse(c, 15, -36, 3.8 + orbGlow * 0.3, 3.8 + orbGlow * 0.3, orb);

  // Orbiting mana spark
  c.fillStyle = orb;
  c.fillRect(11 + orbGlow * 2, -38 - orbGlow, 1.8, 1.8);

  c.restore();
}

// 22. 地獄の猟犬 (hellhound)
function drawHellhound(c, m, now = 0) {
  const flash = (m.hitPulse || 0) > 0;
  const facingLeft = Math.cos(m.facingAngle || 0) < 0;
  const step = Math.sin(now * 0.02 + (m.x || 0)) * 2.2;
  const bob = Math.sin(now * 0.014 + (m.x || 0)) * 1.2;
  const flameFlicker = Math.sin(now * 0.03 + (m.x || 0)) * 1.5;

  const fur = flash ? '#d9d4d8' : '#231e28';
  const fire = flash ? '#ffffff' : '#ff6333';
  const fireCore = flash ? '#ffffff' : '#f7c23b';

  c.save();
  if (facingLeft) c.scale(-1, 1);
  c.translate(0, bob);
  c.scale(1.1, 1.1);

  // Muscular dark legs
  line(c, [[-8, -7], [-10 + step, 1], [-5, -6], [-3 - step, 2]], fur, 3.4);
  line(c, [[7, -7], [8 + step, 1], [12, -7], [14 - step, 1]], fur, 3.4);

  // Flaming tail
  line(c, [[-10, -11], [-17, -8]], fur, 2.5);
  ellipse(c, -18, -8, 2.2, 2.2, fire);

  // Black muscular body
  ellipse(c, 1, -12, 13, 7.5, fur);

  // Flaming mane along neck and spine
  shape(c, [
    [-2, -15],
    [3, -23 + flameFlicker],
    [8, -17],
    [13, -22 - flameFlicker],
    [16, -15],
    [11, -11]
  ], fire);
  shape(c, [[2, -17], [6, -22 + flameFlicker], [9, -17]], fireCore);

  // Demonic head with jaws & fangs
  shape(c, [[8, -14], [15, -19], [21, -14], [16, -9], [9, -10]], fur);
  shape(c, [[17, -11], [19, -8], [18, -11]], flash ? '#fff' : '#f4f1de'); // white fang

  // Blazing eyes
  c.fillStyle = fireCore;
  c.fillRect(13, -15, 3, 2);

  c.restore();
}

// Art mapping dictionary
export const ENEMY_ART = {
  road_archer: drawRoadArcher,
  bandit_rider: drawBanditRider,
  wild_dog: drawWildDog,
  plains_bull: drawPlainsBull,
  salt_scorpion: drawSaltScorpion,
  sand_worm: drawSandWorm,
  salt_mummy: drawSaltMummy,
  dust_spirit: drawDustSpirit,
  goat_ogre: drawGoatOgre,
  snow_wolf: drawSnowWolf,
  rock_troll: drawRockTroll,
  harpy: drawHarpy,
  bog_slime: drawBogSlime,
  giant_frog: drawGiantFrog,
  lizard_spearman: drawLizardSpearman,
  marsh_wisp: drawMarshWisp,
  wraith: drawWraith,
  vampire_bat: drawVampireBat,
  imp: drawImp,
  demon_lancer: drawDemonLancer,
  demon_mage: drawDemonMage,
  hellhound: drawHellhound
};

export function drawEnemyArt(c, m, now = 0) {
  if (!m || !m.type) return false;
  const drawFn = ENEMY_ART[m.type];
  if (!drawFn) return false;
  drawFn(c, m, now);
  return true;
}
