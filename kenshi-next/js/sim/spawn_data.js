// ランダム出現の表（地方ごと）と数の決め。数値はすべて★仮（Kenshi の数字のコピーではない）。
// 作りは Kenshi の「地方ごとに Camps / Nests / Homeless Spawns の重み付き表＋地方の倍率」に合わせた
// （research/spawning.md）。

// 地図（±200m）を3つの地方に分ける。z>=10 が北の街道、南は x で東西に分ける。
export const REGIONS = [
  {
    id: 'kaido',
    name: '錆の街道',
    density: 1.0,
    homeless: { caravan: 50, thieves: 25, raiders: 15 },
    camps: { thief_camp: 30, raider_camp: 10, cannibal_camp: 5 },
    nests: { beast_den: 10, machine_ruin: 3 },
  },
  {
    id: 'arechi',
    name: '骨の荒地',
    density: 1.2,
    homeless: { caravan: 5, thieves: 20, raiders: 50 },
    camps: { raider_camp: 60, thief_camp: 20, cannibal_camp: 25 },
    nests: { beast_den: 30, machine_ruin: 30 },
  },
  {
    id: 'karedani',
    name: '枯れ谷',
    density: 0.8,
    homeless: { caravan: 0, thieves: 15, raiders: 20 },
    camps: { raider_camp: 20, thief_camp: 10, cannibal_camp: 45 },
    nests: { beast_den: 60, machine_ruin: 40 },
  },
];

export function regionAt(x, z) {
  if (z >= 10) return REGIONS[0];
  return x >= 0 ? REGIONS[1] : REGIONS[2];
}

// 部隊の型。members: [役目, 最少, 最多]。最初の1人が頭。
export const SQUAD_TYPES = {
  caravan: {
    name: '隊商',
    faction: 'guard',
    members: [
      ['merchant', 1, 1],
      ['caravan_guard', 2, 3],
    ],
  },
  thieves: {
    name: '盗賊',
    faction: 'bandit',
    members: [['thief', 2, 3]],
  },
  raiders: {
    name: '野盗',
    faction: 'bandit',
    members: [
      ['raider_boss', 1, 1],
      ['raider', 3, 5],
    ],
  },
  // 人食いとグール（tex_props_cx1 の肌・服。勢力は野盗と同じ bandit＝誰にでも襲いかかる。★仮）
  cannibals: {
    name: '人食い',
    faction: 'bandit',
    members: [
      ['cannibal_chief', 1, 1],
      ['cannibal', 2, 3],
      ['ghoul', 1, 2],
    ],
  },
  // 古代の暴走機械（robots_final1・beasts_mech_cx1）。勢力は獣と同じ beast＝誰にでも襲いかかる。数は★仮。
  machines: {
    name: '暴走機械',
    faction: 'beast',
    members: [
      ['robot_light', 1, 1],
      ['robot_heavy', 0, 1],
      ['rogue_quad', 0, 1],
      ['mech_dog', 1, 2],
      ['mech_boar', 0, 1],
      ['mech_spider', 0, 1],
      ['mech_lizard', 0, 1],
    ],
  },
  beasts: {
    name: '巣の獣',
    faction: 'beast',
    members: [['nest_beast', 3, 5]],
  },
};

// 役目の表示名と武器（null なら勢力の既定）。
export const ROLES = {
  merchant: { name: '商人', weapon: 'fists' },
  caravan_guard: { name: '隊商の護衛', weapon: null },
  thief: { name: '盗賊', weapon: null },
  raider_boss: { name: '野盗の頭', weapon: null },
  raider: { name: '野盗', weapon: null },
  nest_beast: { name: '巣の獣', weapon: null },
  cannibal_chief: { name: '人食いの頭', weapon: 'club' },
  cannibal: { name: '人食い', weapon: 'club' },
  ghoul: { name: 'グール', weapon: 'club' },
  // 刀を持つ古代のロボット: 人の剣士の決まり（受け・崩し・気絶の線）で戦う。★仮の技量（Kenshi の数字ではない）
  robot_light: { name: '暴走ロボット', weapon: 'sword', swordsman: true,
    skills: { attack: 26, defense: 24, toughness: 25, strength: 25, dexterity: 24, athletics: 22 } },
  robot_heavy: { name: '重装ロボット', weapon: 'sword', swordsman: true,
    skills: { attack: 32, defense: 34, toughness: 40, strength: 38, dexterity: 14, athletics: 12 } },
  rogue_quad: { name: '四脚の機械', weapon: 'bite' },
  mech_dog: { name: '機械の犬', weapon: 'bite' },
  mech_boar: { name: '機械の猪', weapon: 'bite' },
  mech_spider: { name: '機械の蜘蛛', weapon: 'bite' },
  mech_lizard: { name: '機械の蜥蜴', weapon: 'bite' },
};

// 野営地・巣の型。
export const SITE_TYPES = {
  raider_camp: { kind: 'camp', name: '野盗の野営地', squad: 'raiders', leash: 45, wander: 22 },
  thief_camp: { kind: 'camp', name: '盗賊の隠れ家', squad: 'thieves', leash: 45, wander: 18 },
  cannibal_camp: { kind: 'camp', name: '人食いの集落', squad: 'cannibals', leash: 40, wander: 16 },
  machine_ruin: { kind: 'nest', name: '古代の遺跡', squad: 'machines', leash: 35, wander: 14 },
  beast_den: { kind: 'nest', name: '獣の巣', squad: 'beasts', leash: 35, wander: 14 },
};

// 見た目が人食い・グールになる役目（描画側が肌と服を替える。人形は男の型）。
// 古代の暴走機械の役目（描画側が assets/mech/ の模型で描く。名前は役目の名前＋番号）。
export const MACHINE_ROLES = ['robot_light', 'robot_heavy', 'rogue_quad', 'mech_dog', 'mech_boar', 'mech_spider', 'mech_lizard'];

export const MOB_LOOK_ROLES = { cannibal_chief: 'cannibal', cannibal: 'cannibal', ghoul: 'ghoul' };

// 上限・時間（tick = 0.1秒。ゲーム内では 1tick = 3秒）。
export const SPAWN = {
  checkEvery: 10, // 10tick（1秒）ごとに出現・消える判定
  maxHomeless: 4, // 家なし部隊（隊商・こそ泥・野盗）の同時の数
  maxCamps: 2,
  maxNests: 2,
  actorBudget: 26, // 出現で増やす生きた人数の合計の上限
  aliveLimit: 56, // 全体の生きた人数がこれを超えるなら出さない（ACTOR_LIMIT 60 の内側）
  homelessEvery: 900, // 家なし部隊が出る間隔の基準（90秒）。地方の density と spawnrate で割る
  spawnMin: 90, // 出る場所: プレイヤーから 90〜140m（画面の外）
  spawnMax: 140,
  despawnDist: 170, // これより遠くに 30秒いたら消える
  despawnTicks: 300,
  siteMinPlayerDist: 80, // 野営地・巣はプレイヤーから 80m 以上離れた所に出る
  siteFirstAt: [100, 400], // 最初の野営地・巣が出るまで（10〜40秒）
  campRespawn: 6000, // 片付けた野営地が別の場所に出直すまで（10分 = ゲーム内5時間）
  nestRespawn: 6000,
  siteGoneAfter: 600, // 片付いた（空になった）場所が消えるまで（60秒）
  demandDist: 22, // 野盗がこの距離まで来たら通行料を要求する
  demandWait: 150, // 返事を待つ（15秒）
  demandMin: 100,
  peaceTicks: 3000, // 払った後に手を出さない時間（5分）
  thiefNotice: 70, // こそ泥がこの距離から獲物を狙って寄る
  thiefFlee: 600, // 盗んだ後に逃げる時間（60秒）
};
