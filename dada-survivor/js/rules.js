/**
 * ダダサバイバーもどき ルールデータ（描画に依存しない純粋なデータと計算）
 */

export const STAGE_SECONDS = 300;      // 5分生き残ると大ボス登場
export const MINI_BOSS_SECONDS = 150;  // 2分30秒で中ボス
export const MAX_ENEMIES = 150;   // DOM描画のためiPhone SE2基準で控えめ
export const MAX_GEMS = 150;
export const MAX_LEVEL = 5;

export const DIFFICULTIES = {
  easy:   { id: 'easy',   label: 'やさしい',   enemyHp: 0.7, enemyDmg: 0.6, spawn: 0.8, coin: 1 },
  normal: { id: 'normal', label: 'ふつう',     enemyHp: 1.35, enemyDmg: 1.35, spawn: 1.1, coin: 1.5 },
  hard:   { id: 'hard',   label: 'むずかしい', enemyHp: 2.5, enemyDmg: 1.85, spawn: 1.7, lateHp: 0.3, coin: 2 },
};

// perk: キャラの とくちょう（hp:さいだいHP, dmg:ダメージ倍率+, spd:いどう+, pickup:ひろう範囲+, regen:まいびょう かいふく）
// unlock: そのステージを クリアすると なかまになる
// extra: さいしょから もって いる 2つめ いこうの ぶき（Lv1）
export const CHARACTERS = [
  { id: 'cat',     name: 'にんじゃ',   weapon: 'kunai',   perk: { spd: 0.08 },             trait: 'すばやい' },
  { id: 'dog',     name: 'ソルジャー', weapon: 'laser',   perk: { hp: 10 },                trait: 'タフ' },
  { id: 'fox',     name: 'かみなりさま', weapon: 'thunder', perk: { dmg: 0.1 },              trait: 'つよい' },
  { id: 'panda',   name: 'ボマー',     weapon: 'bomb',    perk: { hp: 20, regen: 0.5 },    trait: 'かいふく' },
  { id: 'rabbit',  name: 'まじゅつし', weapon: 'aura',    perk: { spd: 0.2 },              trait: 'とっても はやい', unlock: 1 },
  { id: 'penguin', name: 'けいさつかん', weapon: 'gun',     perk: { pickup: 0.5, hp: 20 },   trait: 'ほうせき あつめ', unlock: 2 },
  { id: 'bear',    name: 'カウボーイ', weapon: 'shotgun', perk: { hp: 70 },                trait: 'すごく タフ', unlock: 3 },
  { id: 'dino',    name: 'ロケットへい', weapon: 'bazooka', perk: { dmg: 0.25 },           trait: 'すごく つよい', unlock: 4 },
  { id: 'unicorn', name: 'かみさま', weapon: 'thunder', perk: { dmg: 0.15, spd: 0.1, hp: 40, regen: 0.5 }, trait: 'ぜんぶ アップ', unlock: 5 },
  // v1.16.0：2たいめの ロボ バトルロボ（ロケットへい・カウボーイ・ボマー・けいさつかん・ソルジャー・かみさま・ゴッドロボを あわせた）。
  // ステージ6 クリアで なかま（ゴッドロボより さき）。バズーカ（Lv1）と ショットガン（Lv1）で はじまる。かなり つよい（ゴッドロボと だいたい おなじ くらい。はやさ アップは なし）
  { id: 'robo',    name: 'バトルロボ', weapon: 'bazooka', extra: ['shotgun'], perk: { dmg: 0.18, hp: 30, regen: 0.25 }, trait: 'つよい ロボ', unlock: 6 },
  // v1.15.0：9にんが がったいした ゴッドロボ。ステージ7 クリアで なかま。レーザーじゅう（Lv1）と かみなり（Lv1）の 2つで はじまる（extra）
  // v1.18.0：さいきょうの ソルジャーの クローン。ソルジャー・ボマー・まじゅつし・けいさつかん・ロケットへい・バトルロボ・ゴッドロボの ちからを ぜんぶ。
  // レーザーじゅう＋ばくだん＋バリア＋バズーカ＋ショットガン＋かみなり（ぜんぶ Lv1。じゅうは レーザーと かぶるので なし）。ステージ7 を 2かい クリアで なかま
  { id: 'clone',   name: 'さいきょうソルジャー', weapon: 'laser', extra: ['bomb', 'aura', 'bazooka', 'shotgun', 'thunder'], perk: { dmg: 0.2, hp: 50, regen: 0.5, spd: 0.15, pickup: 0.5 }, trait: 'さいきょう', unlock: 7, unlockClears: 2 },
  { id: 'godrobo', name: 'ゴッドロボ', weapon: 'laser', extra: ['thunder'], perk: { dmg: 0.1, spd: 0.06, hp: 30, regen: 0.3 }, trait: 'さいきょう', unlock: 7 },
];

// てきは ぜんぶ「わるものぐんだん」の へいたい（id は むかしの モンスターめいの まま。どの へいたいかは js/art.js の コメント）
export const ENEMY_TYPES = {
  zombie:   { hp: 10, speed: 42, dmg: 8,  xp: 1, r: 16, size: 34 },
  bat:      { hp: 6,  speed: 78, dmg: 5,  xp: 1, r: 13, size: 28 },
  ghost:    { hp: 20, speed: 55, dmg: 10, xp: 2, r: 16, size: 34 },
  skull:    { hp: 36, speed: 50, dmg: 12, xp: 3, r: 17, size: 36 },
  scorpion: { hp: 12, speed: 50, dmg: 8,  xp: 1, r: 15, size: 34 },
  mummy:    { hp: 26, speed: 40, dmg: 11, xp: 2, r: 16, size: 36 },
  snowman:  { hp: 30, speed: 34, dmg: 10, xp: 2, r: 17, size: 38 },
  wolf:     { hp: 16, speed: 92, dmg: 10, xp: 1, r: 15, size: 36 },
  pumpkin:  { hp: 22, speed: 50, dmg: 10, xp: 2, r: 16, size: 34 },
  // けんきゅうじょ（ステージ1）だけ：ばくだんなげへい（はなれて とまり、ばくだんを なげる。いちどに cap にんまで）
  thrower:  { hp: 16, speed: 48, dmg: 8,  xp: 2, r: 16, size: 36, ranged: true, cap: 4 },
  // ジャングル（ステージ6）：めいさいの ジャングルへい（なた もち・すこし かたい）
  jungler:  { hp: 24, speed: 54, dmg: 11, xp: 2, r: 16, size: 36 },
  // こわれた まち（ステージ7）：まちの へいたい（はいいろの めいさい・あかい ベレー）
  urban:    { hp: 26, speed: 56, dmg: 12, xp: 2, r: 16, size: 36 },
  // ボトルから とびだす うちゅうじん（わるものぐんだん では ないので ワッペンなし）
  alien:    { hp: 14, speed: 74, dmg: 7,  xp: 4, r: 14, size: 34, noEmblem: true },
  // ボス（hp は ステージがわで きめる）
  // ちかの ボス（ステージ2 さばくの ちか。たおすと レーザーじゅう）
  driller:  { speed: 42, dmg: 18, xp: 40, r: 42, size: 100, name: 'ドリルたいちょう' },
  ogre:     { speed: 40, dmg: 20, xp: 40, r: 38, size: 80,  name: 'おおぐんそう' },
  dragon:   { speed: 38, dmg: 25, xp: 40, r: 48, size: 104, name: 'せんしゃたいちょう' },
  snake:    { speed: 46, dmg: 26, xp: 40, r: 46, size: 100, name: 'メカアーマー' },
  icegiant: { speed: 36, dmg: 28, xp: 40, r: 50, size: 110, name: 'ゆきやまたいちょう' },
  witch:    { speed: 52, dmg: 28, xp: 40, r: 40, size: 96,  name: 'かげの たいちょう' },
  maou:     { speed: 40, dmg: 32, xp: 40, r: 52, size: 116, name: 'だいそうすい' },
  // ジャングルの ボス：2ほんあしの ジャングルメカに のった たいちょう
  walker:   { speed: 44, dmg: 30, xp: 40, r: 50, size: 112, name: 'ジャングルたいちょう' },
  // こわれた まち：ちゅうボスの そうこうトラック と ボスの こうげきヘリ（みかたの ヘリとは いろも かたちも ちがう）
  truck:    { speed: 40, dmg: 28, xp: 40, r: 46, size: 104, name: 'そうこうトラック' },
  gunship:  { speed: 50, dmg: 32, xp: 40, r: 50, size: 120, name: 'こうげきヘリ' },
  // v1.17.0 おばけのもりの おおきな こやの たからべやを まもる わるもの ロボ（くろ×あかい め・ドクロの ワッペン）。でかい ミサイル（MANSION.robo）
  blackrobo: { speed: 46, dmg: 18, xp: 40, r: 40, size: 106, name: 'ブラックロボ', missiles: true },
  // v1.19.0 ステージ8：わるものぐんだんの いちばん えらい ひとが のる さいごの メカ（むらさき×きん・かんむり・ドクロ）。でかい ミサイル
  supreme:  { speed: 44, dmg: 34, xp: 40, r: 56, size: 136, name: 'そうすいメカ', missiles: true },
  // v1.19.0 きんこの コインばこ（うごかない・いたく ない。うって あける）
  coinbox:  { hp: 1, speed: 0, dmg: 0, xp: 0, r: 34, size: 84, name: 'コインばこ' },
  // v1.20.0 きょだいきんこ（ロケットけい だけ きく。1ぱつ 1ダメージ）
  megavault: { hp: 20, speed: 0, dmg: 0, xp: 0, r: 110, size: 280, name: 'きょだいきんこ', rocketOnly: true },
};

// enemies: [しゅるい, でてくる びょう, でやすさ]
export const STAGES = [
  { id: 1, name: 'けんきゅうじょ', ground: 'lab', decor: 'lab', hpMul: 2.1, spawnMul: 1.25, dmgMul: 1.55,
    enemies: [['zombie', 0, 10], ['bat', 30, 6], ['thrower', 45, 3], ['ghost', 90, 5], ['skull', 180, 4]],
    mini: { type: 'ogre', hp: 1080 }, boss: { type: 'dragon', hp: 3600 },
    // ばくだんの ひが ひろがった ところに ばくはへい（mummy）が あつまる・ボトルは こわせる
    fire: true, bottles: true,
    // けんきゅうしゃ：at びょうで あらわれ、さわると gift の ぶきを くれる（いまは ステージ1だけ）
    // container: けんきゅうしゃは コンテナの なか（なかまと いっしょ）。at びょうで コンテナが みつかる
    researcher: { at: 90, gift: 'supermissile', container: true } },
  { id: 2, name: 'さばく', ground: 'desert', hpMul: 2.4, spawnMul: 1.1, dmgMul: 1.5,
    enemies: [['scorpion', 0, 10], ['bat', 30, 5], ['mummy', 90, 6], ['skull', 180, 4]],
    mini: { type: 'mummy', hp: 1920, big: 2.4, name: 'でかばくはへい' }, boss: { type: 'snake', hp: 6000 },
    // quest: スタートに けんきゅうじょ → こやの みはりを たおす → ちか への とびら → ちかで なかまを たすけて ドリルたいちょう → gift（`QUEST`）
    quest: { gift: 'laser' } },
  { id: 3, name: 'ゆきやま', ground: 'snow', hpMul: 2.2, spawnMul: 1.2, dmgMul: 1.13,
    enemies: [['snowman', 0, 10], ['wolf', 30, 6], ['bat', 90, 4], ['skull', 180, 4]],
    mini: { type: 'wolf', hp: 3120, big: 2.4, name: 'ボスぐんようけん' }, boss: { type: 'icegiant', hp: 9000 },
    // camp: スタートの かまくら（へいたい 3にん・ちりょうたい・けんきゅうしゃ 2にん）。なかまは さいしょから いっしょ（`CAMP`）
    camp: true },
  { id: 4, name: 'おばけのもり', ground: 'forest', hpMul: 3.0, spawnMul: 1.3, dmgMul: 1.25,
    enemies: [['pumpkin', 0, 10], ['ghost', 30, 7], ['bat', 90, 5], ['skull', 180, 5]],
    mini: { type: 'pumpkin', hp: 4320, big: 2.6, name: 'でかかえんへい' }, boss: { type: 'witch', hp: 12600 }, mansion: true },
  { id: 5, name: 'まおうじょう', ground: 'castle', hpMul: 2.8, spawnMul: 1.4, dmgMul: 1.05,
    enemies: [['zombie', 0, 8], ['skull', 0, 4], ['wolf', 30, 5], ['mummy', 60, 5], ['pumpkin', 120, 5], ['snowman', 180, 4]],
    mini: { type: 'dragon', hp: 7200 }, boss: { type: 'maou', hp: 18000 } },
  // v1.13.0：まおうじょうの あと（ステージ5 クリアで ひらく）。わるものぐんだんの ジャングルの きち
  { id: 6, name: 'ジャングル', ground: 'jungle', hpMul: 3.1, spawnMul: 1.45, dmgMul: 1.15, bgm: 'jungle',
    enemies: [['jungler', 0, 10], ['bat', 30, 5], ['wolf', 60, 5], ['ghost', 90, 5], ['skull', 150, 5]],
    mini: { type: 'jungler', hp: 8000, big: 2.5, name: 'でかジャングルへい' }, boss: { type: 'walker', hp: 20000 },
    temple: true }, // v1.21.0 いしの ようさい（`TEMPLE`）
  // v1.14.0：ジャングルの あと（ステージ6 クリアで ひらく）。こわれた まち。たかい ビルに はいって 4かいの なかまを たすけ、おくじょうへ（`TOWER`）
  { id: 7, name: 'こわれた まち', ground: 'city', decor: 'city', hpMul: 4.0, spawnMul: 1.5, dmgMul: 1.35, bgm: 'city',
    enemies: [['urban', 0, 10], ['bat', 30, 5], ['ghost', 60, 4], ['skull', 120, 5], ['wolf', 150, 4]],
    mini: { type: 'truck', hp: 10000 }, boss: { type: 'gunship', hp: 26000 },
    tower: true, burning: true },
  // v1.19.0：さいごの ステージ（ステージ7 クリアで ひらく）。こわれた まちの さきの わるものぐんだんの ようさいに はいって、
  // ろうか → ぶきこ → ブラックロボ 20たい → きんこ（コインばこ）→ めいれいしつの そうすいメカ（たおすと クリア。`FORTRESS`）
  { id: 8, name: 'わるものの ようさい', ground: 'city', decor: 'city', hpMul: 4.6, spawnMul: 1.6, dmgMul: 1.45, bgm: 'city',
    enemies: [['urban', 0, 10], ['bat', 20, 5], ['ghost', 45, 4], ['skull', 90, 5], ['wolf', 120, 4]],
    mini: { type: 'blackrobo', hp: 12000, big: 1.3, name: 'でかブラックロボ' }, boss: { type: 'supreme', hp: 42000 },
    fortress: true, burning: true },
];

export function stageById(id) { return STAGES.find(s => s.id === id) || STAGES[0]; }

/** ステージの ボス／中ボスの データ（ENEMY_TYPES に ステージの うわがきを かさねる） */
/** lateHp: むずかしいだけ、あとの ステージほど てきが かたい（1ステージごとに +lateHp） */
export function lateHpMul(difficulty = DIFFICULTIES.normal, stage = null) {
  return 1 + (difficulty.lateHp || 0) * (((stage && stage.id) || 1) - 1);
}
export function bossType(def, difficulty = DIFFICULTIES.normal, stage = null) {
  const T = ENEMY_TYPES[def.type], big = def.big || 1;
  return {
    ...T, boss: true,
    hp: def.hp * difficulty.enemyHp * lateHpMul(difficulty, stage),
    name: def.name || T.name,
    r: def.big ? T.r * big * 0.9 : T.r,
    size: T.size * big,
    dmg: def.dmg ?? (def.big ? T.dmg * 2 : T.dmg), // v1.17.0 def.dmg で うわがき（こやの こうげきヘリ）
    speed: def.big ? T.speed * 0.8 : T.speed,
    xp: 40,
  };
}

/* ---------- そうび ---------- */
export const RARITIES = [
  { name: 'ふつう',   color: '#e5e7eb', weight: 55 },
  { name: 'いいもの', color: '#4ade80', weight: 28 },
  { name: 'レア',     color: '#60a5fa', weight: 12 },
  { name: 'すごい',   color: '#c084fc', weight: 4 },
  { name: 'でんせつ', color: '#facc15', weight: 1 },
];
export const GEAR_SLOTS = {
  weapon: { name: 'けん',     stat: 'dmg',   values: [0.1, 0.2, 0.35, 0.55, 0.8] },
  armor:  { name: 'よろい',   stat: 'hp',    values: [20, 40, 70, 110, 160] },
  boots:  { name: 'くつ',     stat: 'spd',   values: [0.05, 0.1, 0.15, 0.22, 0.3] },
  charm:  { name: 'おまもり', stat: 'regen', values: [0.5, 1, 1.8, 2.8, 4] },
};
export const CHEST_COST = 80;

export function gearLabel(slot, rarity) {
  const g = GEAR_SLOTS[slot], v = g.values[rarity];
  if (g.stat === 'dmg') return `こうげき +${Math.round(v * 100)}%`;
  if (g.stat === 'hp') return `たいりょく +${v}`;
  if (g.stat === 'spd') return `はやさ +${Math.round(v * 100)}%`;
  return `まいびょう ${v} かいふく`;
}

export function rollGear(rnd = Math.random) {
  const slots = Object.keys(GEAR_SLOTS);
  const slot = slots[Math.floor(rnd() * slots.length)];
  const rarity = +pickWeighted(Object.fromEntries(RARITIES.map((r, i) => [i, r.weight])), rnd);
  return { slot, rarity };
}

export function addGear(save, { slot, rarity }) { save.gear.inv[slot][rarity]++; }

export function equipGear(save, slot, rarity) {
  const g = save.gear;
  if (!(g.inv[slot][rarity] > 0)) return false;
  g.inv[slot][rarity]--;
  if (g.equip[slot] >= 0) g.inv[slot][g.equip[slot]]++;
  g.equip[slot] = rarity;
  return true;
}

export function unequipGear(save, slot) {
  const g = save.gear;
  if (g.equip[slot] < 0) return false;
  g.inv[slot][g.equip[slot]]++;
  g.equip[slot] = -1;
  return true;
}

/** おなじ ぶい・おなじ レアど 3つ → ひとつ うえの レアど 1つ */
export function mergeGear(save, slot, rarity) {
  const inv = save.gear.inv[slot];
  if (rarity >= RARITIES.length - 1 || inv[rarity] < 3) return false;
  inv[rarity] -= 3; inv[rarity + 1]++;
  return true;
}

/** そうび と キャラの とくちょうを ひとつの ボーナスに まとめる */
export function bonusFor(save, charId) {
  const b = { hp: 0, dmg: 0, spd: 0, pickup: 0, regen: 0 };
  const ch = CHARACTERS.find(c => c.id === charId);
  for (const [k, v] of Object.entries(ch?.perk || {})) b[k] += v;
  for (const [slot, r] of Object.entries(save.gear?.equip || {})) {
    if (r >= 0) b[GEAR_SLOTS[slot].stat] += GEAR_SLOTS[slot].values[r];
  }
  return b;
}

/* ---------- すすみぐあい ---------- */
export function stageUnlocked(save, id) { return id === 1 || (save.stageClears[id - 1] || 0) > 0; }
export function charUnlocked(save, ch) { return !ch.unlock || (save.stageClears[ch.unlock] || 0) >= (ch.unlockClears || 1); }

/** クリア ほうしゅう：はじめては たからばこ 2こ、2かいめからは 1こ（むずかしいは +1） */
export function clearRewards(save, stageId, difficultyId) {
  const first = !(save.stageClears[stageId] > 0);
  return { chests: (first ? 2 : 1) + (difficultyId === 'hard' ? 1 : 0), first };
}

// レベル1〜5の性能。index = level-1
// fire: bullet=まっすぐ弾 / spread=ひろがる弾 / rocket=とんでばくはつ。evolved はしんか後、gift は けんきゅうしゃの おくりもの。どちらも ふつうの候補には出さない。
export const GUNS = ['gun', 'shotgun', 'bazooka'];
export const EVOLUTIONS = {
  gun:     { need: 'ammo',  into: 'dual' },
  shotgun: { need: 'ammo',  into: 'gatling' },
  bazooka: { need: 'blast', into: 'mega' },
};

export const WEAPONS = {
  kunai: {
    name: 'クナイ', icon: '🗡️', desc: 'ちかくのてきに とんでいく',
    cooldown: [0.8, 0.72, 0.64, 0.56, 0.48], damage: [12, 15, 18, 22, 27], count: [1, 2, 2, 3, 4],
  },
  orbit: {
    name: 'まわるほし', icon: '⭐', desc: 'まわりを ぐるぐる まもる',
    damage: [11, 13, 15, 18, 22], count: [2, 3, 3, 4, 5], radius: [70, 75, 82, 88, 95],
  },
  thunder: {
    name: 'かみなり', icon: '⚡', desc: 'てきに かみなりを おとす',
    cooldown: [1.8, 1.6, 1.4, 1.2, 1.0], damage: [25, 32, 40, 50, 60], count: [1, 2, 2, 3, 4],
  },
  bomb: {
    name: 'ばくだん', icon: '💣', desc: 'なげると どかーん！',
    cooldown: [2.0, 1.8, 1.6, 1.4, 1.2], damage: [30, 38, 46, 58, 70], radius: [60, 70, 80, 90, 100],
  },
  aura: {
    name: 'バリア', icon: '🔵', desc: 'ちかよる てきに ダメージ',
    damage: [8, 10, 13, 16, 20], radius: [85, 95, 105, 115, 128],
  },
  gun: {
    name: 'じゅう', icon: '🔫', desc: 'まっすぐ たまを うつ',
    fire: 'bullet', shot: 'bullet', size: 22, speed: 720, spread: 0, kb: 0.1,
    cooldown: [0.85, 0.72, 0.6, 0.5, 0.42],
    damage: [18, 26, 34, 44, 56],
    count: [1, 1, 1, 1, 1],
    pierce: [1, 1, 1, 1, 1],
    life: [0.62, 0.62, 0.64, 0.66, 0.68],
    splash: [0, 0, 0, 0, 40],
  },
  shotgun: {
    name: 'ショットガン', icon: '🔫', desc: 'ひろがって とぶ たま',
    fire: 'spread', shot: 'pellet', size: 16, speed: 520, spread: 1.05, kb: 0.22,
    cooldown: [1.1, 1.0, 0.92, 0.84, 0.76],
    damage: [7, 8, 8, 9, 10],
    count: [4, 6, 8, 10, 12],
    pierce: [1, 1, 1, 1, 6],
    life: [0.28, 0.32, 0.4, 0.48, 0.58],
  },
  bazooka: {
    name: 'バズーカ', icon: '🚀', desc: 'ロケットが とんで ばくはつ',
    fire: 'rocket', shot: 'rocket', size: 36, speed: 250, turn: 3.4,
    cooldown: [2.3, 2.1, 1.9, 1.75, 1.6],
    damage: [34, 62, 62, 88, 88],
    count: [1, 1, 2, 2, 3],
    radius: [68, 74, 74, 88, 96],
  },
  dual: {
    name: 'にちょう', icon: '🔫', desc: 'たまが ふたつ とんでいく',
    evolved: true, fire: 'bullet', shot: 'bullet', size: 22, speed: 740, spread: 0.28, kb: 0.12,
    cooldown: [0.34, 0.34, 0.34, 0.34, 0.34],
    damage: [32, 32, 32, 32, 32],
    count: [2, 2, 2, 2, 2],
    pierce: [1, 1, 1, 1, 1],
    life: [0.6, 0.6, 0.6, 0.6, 0.6],
    splash: [34, 34, 34, 34, 34],
  },
  gatling: {
    name: 'ガトリング', icon: '🔫', desc: 'まっすぐ どんどん うつ',
    evolved: true, fire: 'bullet', shot: 'bullet', size: 18, speed: 820, spread: 0, kb: 0.08,
    cooldown: [0.1, 0.1, 0.1, 0.1, 0.1],
    damage: [15, 15, 15, 15, 15],
    count: [1, 1, 1, 1, 1],
    pierce: [10, 10, 10, 10, 10],
    life: [0.75, 0.75, 0.75, 0.75, 0.75],
  },
  // gift: レベルアップの カードには でない。けんきゅうしゃから もらう ぶき（もらったら さいだいレベル）
  supermissile: {
    name: 'スーパーミサイル', icon: '🚀', desc: 'けんきゅうしゃの いちばん つよい ミサイル',
    gift: true, fire: 'rocket', shot: 'smissile', size: 64, speed: 210, turn: 3.6,
    cooldown: [3.2, 3.2, 3.2, 3.2, 3.2],
    damage: [320, 320, 320, 320, 320],
    count: [1, 1, 1, 1, 1],
    radius: [155, 155, 155, 155, 155],
  },
  // あおい レーザーじゅう（ちかの ボスを たおすと さいだいレベルで もらえる。ソルジャーは Lv1 から もって はじまる）。
  // modes の じゅんに ボタンで きりかえ。じっさいに うつのは いまの モードの ぶき（mode: true。もちものには ならない）。
  // levelUp: gift だけど、もって いれば レベルアップの カードに でる（ソルジャーが Lv1→5 に そだてる）。どの モードも あたると あおい ばくはつ
  laser: {
    name: 'レーザーじゅう', icon: '🔫', desc: 'あおい レーザー。3つの モード',
    gift: true, levelUp: true, fire: 'laser', modes: ['laserMg', 'laserBeam', 'laserRk'],
    cooldown: [1.2, 1.05, 0.9, 0.72, 0.55], damage: [30, 35, 42, 52, 66], // ひょうじよう（うつのは modes の ぶき）
  },
  laserMg: {
    name: 'マシンガン', mode: true, gift: true, fire: 'bullet', shot: 'lbullet', size: 22, speed: 880, spread: 0, kb: 0.06, quiet: true, boomFx: 'bboom',
    cooldown: [0.3, 0.26, 0.22, 0.17, 0.12], damage: [5, 6, 8, 10, 14], count: [1, 1, 1, 1, 1],
    pierce: [1, 1, 1, 2, 2], life: [0.62, 0.62, 0.62, 0.62, 0.62], splash: [10, 12, 16, 20, 28],
  },
  laserBeam: {
    name: 'レーザー', mode: true, gift: true, fire: 'beam', len: 560, width: 26, boomFx: 'bboom',
    cooldown: [1.2, 1.05, 0.9, 0.72, 0.55], damage: [30, 35, 42, 52, 66], splash: [28, 30, 32, 35, 38],
  },
  laserRk: {
    name: 'ロケットランチャー', mode: true, gift: true, fire: 'rocket', shot: 'lrocket', size: 40, speed: 300, turn: 4.2, boomFx: 'bboom',
    cooldown: [2.2, 2.0, 1.75, 1.45, 1.1], damage: [60, 70, 85, 108, 140], count: [1, 1, 1, 1, 1], radius: [70, 80, 90, 100, 110],
  },
  mega: {
    name: 'でかロケット', icon: '🚀', desc: 'おおきな ロケットが ばくはつ',
    evolved: true, fire: 'rocket', shot: 'mega', size: 52, speed: 230, turn: 2.8,
    cooldown: [1.45, 1.45, 1.45, 1.45, 1.45],
    damage: [120, 120, 120, 120, 120],
    count: [2, 2, 2, 2, 2],
    radius: [130, 130, 130, 130, 130],
  },
};

export const PASSIVES = {
  power:  { name: 'ちから',   icon: '💪', desc: 'こうげき アップ' },
  boots:  { name: 'くつ',     icon: '👟', desc: 'はやく うごける' },
  magnet: { name: 'じしゃく', icon: '🧲', desc: 'ほうせきを とおくから あつめる' },
  heart:  { name: 'ハート',   icon: '❤️', desc: 'たいりょく アップ ＆ かいふく' },
  clock:  { name: 'とけい',   icon: '⏰', desc: 'こうげきが はやくなる' },
  ammo:   { name: 'つよいたま', icon: '🔶', desc: 'こうげきアップ。たまの ぶきが しんか' },
  blast:  { name: 'ばくやく',   icon: '💥', desc: 'ばくはつアップ。バズーカが しんか' },
};

// ショップ（ずっと残る強化）
export const SHOP_ITEMS = {
  hp:  { name: 'たいりょく', icon: '❤️', desc: 'さいだいHP +10', max: 10 },
  atk: { name: 'こうげき',   icon: '⚔️', desc: 'ダメージ +5%',   max: 10 },
  spd: { name: 'はやさ',     icon: '👟', desc: 'いどう +4%',     max: 10 },
};

export function shopCost(level) { return 30 * (level + 1); }

export function weaponStat(id, key, level) {
  const list = WEAPONS[id][key];
  return list[Math.max(0, Math.min(MAX_LEVEL, level) - 1)];
}

/** バランスの つまみ（hpTime: てきの HP が 1ばい ふえる びょう／xp: レベルアップに いる ほうせき） */
export const TUNE = { hpTime: 170, xpBase: 4, xpStep: 3.4, ramp0: 0.35, rampTime: 200 };
/** 1より おおきい ばいりつは さいしょ ramp0 から rampTime びょうかけて ぜんぶに（いきなり やられない）。1いかは そのまま */
export function rampMul(mul, t) { return mul > 1 ? 1 + (mul - 1) * Math.min(1, TUNE.ramp0 + t / TUNE.rampTime) : mul; }
/** てきの こうげきの ばいりつ（むずかしさ × ステージ、じかんで じわじわ） */
export function enemyDmgMul(t, difficulty = DIFFICULTIES.normal, stage = STAGES[0]) {
  return rampMul(difficulty.enemyDmg, t) * rampMul(stage.dmgMul || 1, t);
}
export function xpToNext(level) { return Math.round(TUNE.xpBase + (level - 1) * TUNE.xpStep); }

/** パッシブとショップ強化から最終ステータスを計算 */
export function playerStats(passives = {}, shop = {}, bonus = {}) {
  const p = k => passives[k] || 0, s = k => shop[k] || 0, b = k => bonus[k] || 0;
  return {
    maxHp: 100 + p('heart') * 20 + s('hp') * 10 + b('hp'),
    damage: (1 + p('power') * 0.15) * (1 + p('ammo') * 0.1) * (1 + s('atk') * 0.05) * (1 + b('dmg')),
    speed: Math.min(260, 150 * (1 + p('boots') * 0.1) * (1 + s('spd') * 0.04) * (1 + b('spd'))),
    pickup: 90 * (1 + p('magnet') * 0.3) * (1 + b('pickup')),
    cooldown: Math.max(0.5, 1 - p('clock') * 0.08),
    regen: b('regen'),
    boom: 1 + p('blast') * 0.12,
  };
}

/** 経過時間に応じた湧き方 */
export function spawnPlan(t, difficulty = DIFFICULTIES.normal, stage = STAGES[0]) {
  const weights = {};
  for (const [type, from, w] of stage.enemies) if (t >= from) weights[type] = (weights[type] || 0) + w;
  const interval = Math.max(0.22, 1.0 - t * 0.0026) / rampMul(difficulty.spawn, t) / (stage.spawnMul || 1);
  const batch = 1 + Math.floor(t / 100);
  // ステージの かたさは さいしょ 4わり → 2ふん24びょうで ぜんぶ（レベル1の じょばんで つまらないように）
  const stageHp = 1 + (stage.hpMul - 1) * Math.min(1, 0.4 + t / 240);
  const hpScale = (1 + t / TUNE.hpTime) * rampMul(difficulty.enemyHp, t) * stageHp * lateHpMul(difficulty, stage);
  return { weights, interval, batch, hpScale };
}

export function pickWeighted(weights, rnd = Math.random) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [k, w] of entries) { if ((r -= w) < 0) return k; }
  return entries[entries.length - 1][0];
}

function choiceWeight(item, weapons) {
  return item.kind === 'weapon' && !(weapons[item.id] > 0) ? 3 : 1;
}

/** レベルアップ時の3択。
 *  じゅう系をまだ持っていない最初の1回は、じゅう・ショットガン・バズーカだけ出す。
 *  進化できるときはそのカードを必ず1枚混ぜる。持っていない武器は出やすい。
 */
/** キャラの さいしょの ぶき（weapon と extra を Lv1 で） */
export function startWeapons(ch) {
  const w = { [ch.weapon]: 1 };
  for (const id of ch.extra || []) w[id] = 1;
  return w;
}

export function upgradeChoices(weapons, passives, rnd = Math.random, count = 3) {
  const ownsGun = GUNS.some(id => weapons[id] > 0) || weapons.laser > 0
    || Object.values(EVOLUTIONS).some(e => weapons[e.into] > 0);
  if (!ownsGun) return GUNS.slice(0, count).map(id => ({ kind: 'weapon', id, level: 1 }));

  const evos = [];
  for (const [from, evo] of Object.entries(EVOLUTIONS)) {
    if ((weapons[from] || 0) >= MAX_LEVEL && (passives[evo.need] || 0) >= 1 && !(weapons[evo.into] > 0)) {
      evos.push({ kind: 'evolve', id: evo.into, from, level: MAX_LEVEL });
    }
  }
  const pool = [];
  for (const id of Object.keys(WEAPONS)) {
    if (WEAPONS[id].evolved || (WEAPONS[id].gift && !(WEAPONS[id].levelUp && weapons[id] > 0))) continue;
    const lv = weapons[id] || 0;
    if (lv < MAX_LEVEL) pool.push({ kind: 'weapon', id, level: lv + 1 });
  }
  for (const id of Object.keys(PASSIVES)) {
    const lv = passives[id] || 0;
    if (lv < MAX_LEVEL) pool.push({ kind: 'passive', id, level: lv + 1 });
  }

  const picks = [];
  if (evos.length) picks.push(evos[Math.floor(rnd() * evos.length)]);
  const left = [...pool];
  while (picks.length < count && left.length) {
    const total = left.reduce((s, item) => s + choiceWeight(item, weapons), 0);
    let r = rnd() * total, idx = left.length - 1;
    for (let i = 0; i < left.length; i++) {
      r -= choiceWeight(left[i], weapons);
      if (r < 0) { idx = i; break; }
    }
    picks.push(left.splice(idx, 1)[0]);
  }
  if (picks.length < count) picks.push({ kind: 'food', id: 'meat', level: 0 });
  if (picks.length < count) picks.push({ kind: 'coin', id: 'coin', level: 0 });
  return picks;
}

const emptyGear = () => ({
  inv: Object.fromEntries(Object.keys(GEAR_SLOTS).map(k => [k, RARITIES.map(() => 0)])),
  equip: Object.fromEntries(Object.keys(GEAR_SLOTS).map(k => [k, -1])),
});

// カメラの ズーム（2ほんゆびで ピンチ／PCは ホイール）。ちいさいほど ひろく みえる
export const ZOOM_MIN = 0.6, ZOOM_MAX = 1.4;
export function clampZoom(z) {
  z = Number(z);
  if (!Number.isFinite(z) || z <= 0) return 1;
  return Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) * 1000) / 1000;
}
/** ピンチ：はじめの ズームに ゆびの きょりの ひを かける */
export function pinchZoom(startZoom, startDist, dist) {
  if (!(startDist > 0) || !(dist > 0)) return clampZoom(startZoom);
  return clampZoom(startZoom * dist / startDist);
}
/** ホイール：したに まわすと ひろく（ズームアウト） */
export function wheelZoom(z, deltaY) {
  return clampZoom(clampZoom(z) * Math.exp(-(Number(deltaY) || 0) * 0.0015));
}

export function defaultSave() {
  return {
    coins: 0, shop: { hp: 0, atk: 0, spd: 0 }, character: 'cat', difficulty: 'easy', stage: 1,
    bestKills: 0, clears: 0, stageClears: {}, pendingChests: 0, gear: emptyGear(), zoom: 1,
  };
}

export function normalizeSave(raw) {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const s = {
    ...base, ...raw,
    coins: Math.max(0, Math.floor(Number(raw.coins) || 0)),
    pendingChests: Math.max(0, Math.floor(Number(raw.pendingChests) || 0)),
    shop: { ...base.shop, ...(raw.shop || {}) },
    stageClears: { ...(raw.stageClears || {}) },
    gear: emptyGear(),
    zoom: clampZoom(raw.zoom ?? 1),
  };
  // まえの バージョン（ステージ1しか なかった）で クリアしていたら ステージ1 クリアあつかい
  if (!raw.stageClears && raw.clears > 0) s.stageClears[1] = raw.clears;
  for (const slot of Object.keys(GEAR_SLOTS)) {
    const inv = raw.gear?.inv?.[slot];
    if (Array.isArray(inv)) s.gear.inv[slot] = RARITIES.map((_, i) => Math.max(0, Math.floor(inv[i] || 0)));
    const e = raw.gear?.equip?.[slot];
    s.gear.equip[slot] = Number.isInteger(e) && e >= 0 && e < RARITIES.length ? e : -1;
  }
  const ch = CHARACTERS.find(c => c.id === raw.character);
  s.character = ch && charUnlocked(s, ch) ? ch.id : base.character;
  s.difficulty = DIFFICULTIES[raw.difficulty] ? raw.difficulty : base.difficulty;
  s.stage = STAGES.some(st => st.id === raw.stage) && stageUnlocked(s, raw.stage) ? raw.stage : 1;
  return s;
}

/** けんきゅうしゃに さわった とき：おくりものの ぶきを さいだいレベルで もらう。もらった ぶきの id を かえす */
export function receiveGift(weapons, stageDef) {
  const id = stageDef?.researcher?.gift;
  if (!id || !WEAPONS[id]) return null;
  weapons[id] = MAX_LEVEL;
  return id;
}

/* ---------- かるい モード（じどう がしつ） ----------
 * 1フレームの じかん（ms）を なめらかに して、おもい（24ms こえ ≒ 40fps いか）が つづいたら lite に する。
 * もどすのは かるい（19ms みまん）が hold びょう つづいた とき。もどって また おもく なったら hold を 2ばいに（いったり きたり しない）。
 * 250ms いじょうの フレーム（タブを もどした とき など）は かぞえない。 */
export const QUALITY = { enterMs: 24, exitMs: 19, hold: 3, maxHold: 24 };
export function newQuality() { return { ema: 16.7, lite: false, calm: 0, hold: QUALITY.hold, enters: 0 }; }
export function adaptQuality(q, ms) {
  if (!(ms > 0) || ms > 250) return q;
  q.ema += (ms - q.ema) * 0.1;
  if (!q.lite) {
    if (q.ema > QUALITY.enterMs) {
      q.lite = true; q.calm = 0;
      if (q.enters++ > 0) q.hold = Math.min(QUALITY.maxHold, q.hold * 2);
    }
  } else if (q.ema < QUALITY.exitMs) {
    q.calm += ms / 1000;
    if (q.calm >= q.hold) { q.lite = false; q.calm = 0; }
  } else q.calm = 0;
  return q;
}

/* ---------- けんきゅうじょの ばくだん と ひ ----------
 * ばくだんなげへいは keep の きょりで とまり、range いないなら cd びょうごとに なげる（flight びょうで おちる。おちる ばしょに しるし）。
 * ばくはつ（blast）に いたら dmg。おちた ところに ひ（life びょう）。ひは r0 → r1 に ひろがり、なかに いると まいびょう dps。
 * ひが できると gatherChance で ばくはへいが gatherMin〜gatherMax にん あつまる（ひの あつまりで できた ばくはへいは gatherCap にんまで）。 */
export const THROW = {
  keep: 210, range: 330, cd: 4.2, firstCd: 2.2, flight: 1.15, blast: 44, dmg: 10,
  fireLife: 4.5, fireR0: 24, fireR1: 54, fireGrow: 1.2, fireDps: 6, maxFires: 6, maxBombs: 6,
  gatherChance: 0.45, gatherMin: 2, gatherMax: 3, gatherCap: 9, gatherType: 'mummy',
};
/** ひの おおきさ（age びょう めの はんけい。さいごの 0.6びょうで ちいさく なる） */
export function fireRadius(age, T = THROW) {
  if (age < 0 || age >= T.fireLife) return 0;
  const grow = Math.min(1, age / T.fireGrow);
  const r = T.fireR0 + (T.fireR1 - T.fireR0) * (1 - (1 - grow) ** 2);
  const fade = Math.min(1, (T.fireLife - age) / 0.6);
  return r * (0.6 + 0.4 * fade);
}
/** cap の ある てき（ばくだんなげへい）が もう いっぱい なら、ステージの さいしょの てきに かえる */
export function capType(type, counts, stage = STAGES[0]) {
  const cap = ENEMY_TYPES[type]?.cap;
  if (!cap || (counts[type] || 0) < cap) return type;
  return stage.enemies[0][0];
}
/** ひから あつまる ばくはへいの かず（いまの あつまり にんずう alive。cap を こえない） */
export function gatherCount(alive, rnd = Math.random, T = THROW) {
  if (rnd() >= T.gatherChance) return 0;
  const n = T.gatherMin + Math.floor(rnd() * (T.gatherMax - T.gatherMin + 1));
  return Math.max(0, Math.min(n, T.gatherCap - alive));
}

/* ---------- こわせる ボトル ----------
 * hp かいで われる（たま・ばくはつ・ほし・バリア。てきの ばくだんでは われない）。
 * うちゅうじん いりは alien が とびだす。からっぽは ほうせき（gem）。 */
export const BOTTLE = { hp: 3, r: 20, cy: -30, emptyGem: 2, aimRange: 340, orbitGap: 0.45 };
export function bottleOutcome(kind) {
  if (kind === 'alien') return { alien: true, gem: 0 };
  if (kind === 'capsule') return { alien: false, gem: BOTTLE.emptyGem };
  return null; // わられた ボトル・はた は こわせない
}

/* ---------- けんきゅうじょの コンテナと なかま ----------
 * コンテナ：at びょうで プレイヤーから dist0〜dist1 はなれた ところに 1つ。さわると ひらく（openR）。
 * なかから けんきゅうしゃ（スーパーミサイルを くれて、コンテナの そばに のこる）・ちりょうたい 1・ぶたいの なかま 3。
 * なかまは むてき（たおれない・てきを ふさがない）。じぶんの まわりに ならんで、ちかくの てきを うつ。
 * ちりょうたいは うしろに ついて くる。ふえ（ボタン／F キー）で はしって きて、healTime びょうで さいだいHP の healPct かいふく。 */
export const SQUAD = {
  dist0: 650, dist1: 900, openR: 62,
  soldiers: 3, slotDist: 58, slotAngles: [125, -125, 180], medicDist: 104,
  speed: 230, range: 340, cd: 0.9, dmg: 5.5, bulletSpeed: 520, life: 0.75,
  medicRun: 340, healTime: 2, healPct: 0.3, whistleCd: 35,
};
/** なかまの だんがんの ダメージ（じかんで すこし つよく。プレイヤーの こうげき ばいりつも のる） */
export function allyDamage(t, playerDamage = 1, S = SQUAD) { return S.dmg * (1 + t / 240) * playerDamage; }
/** ならぶ ばしょ（すすむ むき heading の うしろ に ひろがる）。i < soldiers は へいたい、i === soldiers は ちりょうたい */
export function squadSlot(i, heading, S = SQUAD) {
  const medic = i >= S.soldiers;
  const a = heading + (medic ? Math.PI : S.slotAngles[i] * Math.PI / 180);
  const d = medic ? S.medicDist : S.slotDist;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d };
}
/** ふえ：ちりょうたいが いて、クールダウンが おわって いれば ふける */
export function canWhistle(medic, cd) { return !!medic && cd <= 0; }
/** ちりょうの かいふくりょう（dt びょうぶん） */
export function healAmount(maxHp, dt, S = SQUAD) { return maxHp * S.healPct / S.healTime * dt; }

/* ---------- さばくの クエスト（ステージ2） ----------
 * スタートの そばに みかたの けんきゅうじょ（かざり）。hutDist0〜1 はなれた ところに わるものの こや。
 * at びょうに「こやに わるものが いる」→ こやに triggerR まで ちかづくと みはり（guards）が でる → ぜんぶ たおすと ちか への とびらが ひらく → さわると ちかへ。
 * ちかは たての ろうか（はば ±halfW）と おくの ボスの へや（±roomHalfW、roomY より おく）。ちかに いる あいだは
 * ステージの タイマーが とまる（ちじょうの てきも そのまま まつ）。ろうやに さわると なかまが はいる。
 * おくの ドリルたいちょうを たおすと レーザーじゅう、でぐちから ちじょうの とびらの まえに もどる。 */
/** ゆきやまの スタートキャンプ：かまくら 3つ（なかま／けんきゅうしゃ／ちりょうたいは スタートの ばしょ）。なかまは すぐ くる */
export const CAMP = {
  squadHut: { x: -112, y: 120 }, sciHut: { x: 112, y: 120 }, medicHut: { x: 0, y: -150 }, w: 120, h: 92,
  medic: { x: 0, y: 40 }, researchers: 2,
};
export const QUEST = {
  lab: { x: 0, y: -240 },
  // at びょうから こやに わるものが いる（それまでは ちかづいても なにも おきない・やじるしも でない）
  // underTime: ちかに いる あいだの タイマーの はやさ（0＝とまる）
  underTime: 0.5,
  at: 90, hutDist0: 520, hutDist1: 760, triggerR: 260, doorR: 46, cellR: 72,
  guards: ['scorpion', 'scorpion', 'scorpion', 'scorpion', 'skull', 'mummy', 'mummy'], guardHp: 1.2,
  under: {
    halfW: 180, roomHalfW: 330, roomY: -1650, top: -2300, bottom: 140,
    groups: [{ y: -260, n: 4 }, { y: -660, n: 5 }, { y: -1060, n: 5 }, { y: -1440, n: 6 }],
    cells: [{ y: -480, side: -1, art: 'cellA', who: ['soldier', 'soldier'] },
      { y: -880, side: 1, art: 'cellB', who: ['researcher', 'medic'] },
      { y: -1280, side: -1, art: 'cellC', who: ['soldier', 'researcher'] }],
    boss: { type: 'driller', hp: 1600 }, bossAt: { x: 0, y: -2020 }, bossTrigger: -1600, exit: { x: 0, y: -2200 },
  },
};
/**
 * こわれた まち（ステージ7）の たかい ビル：at びょうで いりぐちが ひらく（やじるし）→ なかは 1かい〜4かい と おくじょう。
 * かくかいの わるものを ぜんぶ たおすと かいだんが でる。4かいの ろうやに なかま。おくじょうには half の かくりつで みかたの ヘリ。
 * なかでは タイマーが はんぶんの はやさ（QUEST.underTime と おなじ）。
 */
export const TOWER = {
  at: 60, dist0: 520, dist1: 760, doorR: 54, cellR: 72, stairsR: 50, heliR: 80, heliChance: 0.5,
  floors: 4, foes: [4, 5, 6, 6], foeHp: 1.2,
  room: { halfW: 300, roomHalfW: 300, roomY: -1e9, top: -620, bottom: 140 },
  stairs: { x: 0, y: -540 },
  cells: [{ x: -125, y: -360, side: -1, art: 'cellA', who: ['soldier', 'soldier'] },
    { x: 125, y: -360, side: 1, art: 'cellB', who: ['researcher', 'medic'] },
    { x: -125, y: -170, side: -1, art: 'cellC', who: ['soldier', 'researcher'] }],
  pad: { x: 0, y: -320 }, roofExit: { x: -220, y: 40 },
  // みかたの ヘリの えんご：time びょう（そとで）うえから うつ。たまは なかまの ダメージ × dmgMul、ときどき ロケット
  heli: { time: 45, cd: 0.2, range: 380, dmgMul: 1, rocketCd: 2.4, rocketMul: 3, splash: 70 },
};
/**
 * v1.17.0 おばけのもり：スタートの ちかくの おおきな こや（TOWER と おなじ しくみ。なかでは タイマーが はんぶん）。
 * 1かい・2かいは わるものが いっぱい → 3かいは たからべや：まえで ブラックロボが まもる（でかい ミサイル。おちる ばしょに あかい しるし）→
 * たおすと たからべやが ひらく（コイン・たからばこ・もって いる ぶき ぜんぶ +1）→ かいだんで おくじょう：てきの こうげきヘリ（ステージ4 むけに よわめ）→ たおすと はしご
 */
export const MANSION = {
  mansion: true, at: 110, dist0: 430, dist1: 620, doorR: 54, stairsR: 50, cellR: 72, heliR: 80, vaultR: 70,
  floors: 3, vaultFloor: 3, foes: [6, 8, 0], foeHp: 0.9,
  room: TOWER.room, stairs: TOWER.stairs, cells: [], pad: TOWER.pad, roofExit: TOWER.roofExit, heli: TOWER.heli,
  robo: { type: 'blackrobo', hp: 1800, at: { x: 0, y: -330 }, cd: 3.6, firstCd: 2.6, n: 3, spread: 95, flight: 1.5, blast: 52, dmg: 10, range: 560 },
  vault: { x: -185, y: -470 }, reward: { coins: 50, chests: 1, levelUp: 1 },
  heliBoss: { type: 'gunship', hp: 2000, dmg: 20, at: { x: 0, y: -420 } },
};
/**
 * v1.19.0 ステージ8 わるものの ようさい（なかは へやが 5つ。じかんは はんぶんの はやさ）。
 * 1 ろうか（ザコ いっぱい）→ 2 ぶきこ（20たい）→ 3 ブラックロボ 20たい（wave たいずつ。のこりが 2 より すくなく なったら つぎ）
 * → 4 きんこ（コインばこ 2こ：100まい と 230まい。うって あける）→ 5 めいれいしつ（そうすいメカ＝たおすと クリア）。
 * ようさいに はいらずに 5:00 に なったら、そうすいメカが そとに でて くる（たおせば クリア）
 */
export const FORTRESS = {
  fortress: true, at: 75, dist0: 560, dist1: 780, doorR: 54, stairsR: 50, cellR: 72, heliR: 80,
  floors: 6, foes: [14, 20, 0, 0, 0, 0], foeHp: 1.4, names: ['ろうか', 'ぶきこ', 'きんこの まえ', 'きんこ', 'めいれいしつ', 'きょだいきんこ'],
  // v1.20.0 へやを ひろく（はば 680→1040・おくゆき 820→1100）
  room: { halfW: 520, roomHalfW: 520, roomY: -1e9, top: -960, bottom: 140 },
  stairs: { x: 0, y: -870 }, exit: { x: -380, y: 40 }, cells: [], pad: TOWER.pad, roofExit: TOWER.roofExit, heli: TOWER.heli,
  robo: { total: 20, wave: 4, hp: 420, cd: 6.5, firstCd: 2.5 },
  boxes: [{ x: -200, y: -420, coins: 100, hp: 1400 }, { x: 200, y: -420, coins: 230, hp: 2200 }],
  // v1.20.0 めいれいしつの うえの きょだいきんこ：ロケットけいの ぶき（バズーカ・でかロケット・スーパーミサイル・レーザーの ロケット）でだけ こわれる。hits かい あてると コイン coins まい
  mega: { x: 0, y: -520, hits: 20, coins: 10000 },
  // v1.20.1 きょだいきんこの へやに てき 90たい（いちどに cap たい まで、batch たいずつ）
  horde: { total: 90, cap: 15, batch: 5, hp: 1.0 },
  boss: { type: 'supreme', hp: 33000, at: { x: 0, y: -620 }, levelRef: 31, minHp: 0.75 },
  bossMissile: { n: 5, spread: 120, flight: 1.5, blast: 56, dmg: 12, range: 700, cd: 3.2, firstCd: 2.8 },
};
/**
 * v1.21.0 ジャングルの いしの ようさい（スタートから あしあとで いける。やじるしは ださない）。
 * なかは じかん はんぶん。1 とげの ゆか → 2 ころがる いし → 3 おちて くる いわ（＋とげ）→ 4 おたからの へや。
 * おたからを とると その へやで だいぐん 200たい（いちどに cap たい まで）。はしごは おたからの あと すぐ でる（にげても OK）
 */
export const TEMPLE = {
  temple: true, door: 'templeDoor', noArrow: true, at: 3, dist0: 1300, dist1: 1600, trailStart: 45, // v1.21.1 とおく（まえの やく 2ばい）・あしあとは スタートの すぐ そばから doorR: 54, stairsR: 50, cellR: 72, heliR: 80, vaultR: 70,
  floors: 4, foes: [0, 0, 0, 0], foeHp: 1, names: ['とげの へや', 'ころがる いしの へや', 'おちる いわの へや', 'おたからの へや'],
  room: { halfW: 380, roomHalfW: 380, roomY: -1e9, top: -900, bottom: 140 },
  stairs: { x: 0, y: -820 }, cells: [], pad: TOWER.pad, roofExit: { x: -260, y: 40 }, heli: TOWER.heli,
  trapDmg: 9, // わなの ダメージ（× むずかしさの enemyDmg）。あたると すこし むてき
  spike: { size: 96, period: 3.4, down: 1.6, warn: 0.8 },
  lane: { period: 3.6, warn: 1.0, speed: 480, r: 42, ys: [-250, -450, -650] },
  rock: { cd: 1.7, n: 3, spread: 130, flight: 1.1, blast: 48 },
  vault: { x: 0, y: -520 }, reward: { coins: 400, chests: 2, levelUp: 1 },
  horde: { total: 200, cap: 16, batch: 4, hp: 0.8, types: ['mummy', 'zombie', 'bat', 'scorpion', 'jungler'] },
};
/** とげの ゆかの じょうたい（0 ひっこみ・1 あぶない しるし・2 でてる） */
export function spikeState(t, S = TEMPLE.spike) { const k = ((t % S.period) + S.period) % S.period; return k < S.down ? 0 : k < S.down + S.warn ? 1 : 2; }
/** v1.19.1 そうすいメカの HP の ばいりつ（プレイヤーの レベル / levelRef。minHp〜1） */
export function fortressBossScale(level, T = FORTRESS) { return Math.max(T.boss.minHp, Math.min(1, level / T.boss.levelRef)); }
/** v1.17.1 みちの あしあとの ばしょ（スタートから d までの きょり。はじめと おわりは あける） */
export function trailSteps(d, step = 100, start = 110, end = 90) {
  const out = [];
  for (let s = start; s <= d - end; s += step) out.push(s);
  return out;
}
/** ブラックロボの ミサイルの おちる ばしょ（プレイヤーの いる ところ ＋ まわり。n こ） */
export function missileTargets(px, py, rnd = Math.random, R = MANSION.robo) {
  const out = [{ x: px, y: py }];
  for (let i = 1; i < R.n; i++) { const a = rnd() * Math.PI * 2; out.push({ x: px + Math.cos(a) * R.spread, y: py + Math.sin(a) * R.spread }); }
  return out;
}

/**
 * v1.15.1 こわれた まち：さいしょから もえて いる ところ（まえに ばくだんが おちた あと）。
 * ちかづくと（wake）ゆかの ひ（ステージ1と おなじ。たつと いたい）が flames こ ついて、きえたら relight びょうで また もえる。
 * はじめて ちかづいた ときに ばくはへいが group にん まわりに いる。もえなおす とき regather の かくりつで すこし あつまる（gatherCap まで）
 */
export const CITY_FIRE = { sites: 8, dist0: 520, dist1: 2200, avoidTower: 600, wake: 1100, flames: 4, spread: 56, relight: 3.0, startAge: 1.2, group: 4, regather: 0.2, maxFires: 16 };
/** もえて いる ところの ばしょ（スタートと はいれる ビルの そばは さける） */
export function burnSites(tower, rnd = Math.random, F = CITY_FIRE) {
  const out = [];
  for (let tries = 0; out.length < F.sites && tries < 400; tries++) {
    const a = rnd() * Math.PI * 2, d = F.dist0 + rnd() * (F.dist1 - F.dist0);
    const s = { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d) };
    if (tower && Math.hypot(s.x - tower.x, s.y - tower.y) < F.avoidTower) continue;
    if (out.some(o => Math.hypot(o.x - s.x, o.y - s.y) < 360)) continue;
    out.push({ ...s, seen: false, cd: 0 });
  }
  return out;
}

/** ビルの ばしょ（スタートから dist0〜dist1。うえ むきの ±40° は さける：hutSpot と おなじ） */
export function towerSpot(rnd = Math.random, T = TOWER) { return hutSpot(rnd, { hutDist0: T.dist0, hutDist1: T.dist1 }); }
/** おくじょうに ヘリが いるか（ラン ごとに 1かい きめる） */
export function rollHeli(rnd = Math.random, T = TOWER) { return rnd() < T.heliChance; }
/** みかたの ヘリの たまの ダメージ */
export function heliDamage(t, playerDamage = 1, T = TOWER) { return allyDamage(t, playerDamage) * T.heli.dmgMul; }
/** かいの なまえ（1〜4 は「Nかい」、そのうえは おくじょう） */
export function floorName(f, T = TOWER) { return T.names ? T.names[f - 1] || '' : f > T.floors ? 'おくじょう' : `${f}かい`; }

/** ちかの ろうかの はば（y で かわる：おくは ボスの へや） */
export function underHalfW(y, U = QUEST.under) { return y < U.roomY ? U.roomHalfW : U.halfW; }
/** ちかの なかに おさめる（r は からだの はんけい） */
export function clampUnder(o, r = 16, U = QUEST.under) {
  o.y = Math.max(U.top + r, Math.min(U.bottom - r, o.y));
  const w = underHalfW(o.y, U) - r;
  o.x = Math.max(-w, Math.min(w, o.x));
  return o;
}
/** こやの ばしょ（けんきゅうじょの うえがわ ±40° は さける） */
export function hutSpot(rnd = Math.random, Q = QUEST) {
  let a = rnd() * Math.PI * 2;
  const up = -Math.PI / 2, gap = 40 * Math.PI / 180;
  let d = Math.atan2(Math.sin(a - up), Math.cos(a - up));
  if (Math.abs(d) < gap) a = up + Math.sign(d || 1) * gap;
  const dist = Q.hutDist0 + rnd() * (Q.hutDist1 - Q.hutDist0);
  return { x: Math.cos(a) * dist, y: Math.sin(a) * dist };
}
/** レーザーじゅうの つぎの モード */
export const LASER_MODES = WEAPONS.laser.modes;
export function nextLaserMode(i) { return ((i | 0) + 1) % LASER_MODES.length; }
/** なかまを ふやす：へいたいは soldiers にん まで、ちりょうたいは 1にん（もう いれば ふやさない）。はいった かずを かえす */
export function squadRoom(allies, medic, S = SQUAD) {
  const soldiers = allies.filter(a => !a.medic).length;
  return medic ? (allies.some(a => a.medic) ? 0 : 1) : Math.max(0, Math.min(1, S.soldiers - soldiers));
}
/** ビーム（x,y から ang むき・ながさ len・はば w）に e が かかって いるか */
export function beamHits(x, y, ang, len, w, e) {
  const dx = e.x - x, dy = e.y - y, c = Math.cos(ang), s = Math.sin(ang);
  const along = dx * c + dy * s, side = Math.abs(-dx * s + dy * c);
  return along > -e.T.r && along < len + e.T.r && side < w / 2 + e.T.r;
}
