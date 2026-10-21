// ミッション「資材集め・巡回・脱出」（v0.2.1 の試作。制限時間なし）。データだけ（DOM・Pixi・乱数なし）。
// 数値はすべて調整用のつまみ。sim.js がこれを読む。

/** 異星生物の「気づき」と追跡の調整値 */
export const ALERT = Object.freeze({
  rise: 0.3,          // 見えている間に毎秒上がる量（近いほど最大2倍）
  decay: 0.1,         // 見えていない間に毎秒下がる量
  forestSight: 0.6,   // 森にいる機体は、この倍率の距離まで近づかれないと見つからない
  chaseMul: 1.5,      // 追跡中の速さの倍率（巡回の速さに掛ける）
  giveUp: 8,          // 見失ってから、あきらめるまでの秒数
  repath: 1,          // 追跡中に行き先を更新する間隔（秒）
  regenDelay: 4,      // 最後に攻撃されてから再生が始まるまでの秒数
  regenRate: 0.012,   // 再生の速さ（最大HPに対する毎秒の割合）
});

export const GATHER_RADIUS = 1.8;   // 回収ポイントの中心からこのタイル数以内の機体が集める
export const EXTRACT_RADIUS = 2.4;  // 脱出口の中心からこのタイル数以内に隊長が入ると、運んでいる資材を届ける

/** 回収の小さなお楽しみ: 山ごとに、集めた量がこの値を超えるたびに「掘り出し物」の抽選（乱数は sim の seed 付き rng） */
export const FIND = Object.freeze({
  at: [12, 28],       // 1つの山で集めた量がここを超えたら抽選
  chance: 0.5,        // 当たる確率
  bonus: 3,           // 当たったときにおまけで増える資材
  names: ['めずらしい部品', '古いバッテリー', 'ピカピカのネジ', '謎のチップ'],
});

/** ミッション1（マップ seed 7 用。座標はタイル。水の上なら近くの陸へずらす） */
export const MISSION_1 = Object.freeze({
  id: 'm1',
  title: '資材集め・巡回・脱出',
  target: 100,        // 脱出口へ届ける資材の目標
  salvage: [
    { tx: 8, ty: 42, amount: 40 },
    { tx: 32, ty: 38, amount: 40 },
    { tx: 9, ty: 18, amount: 40 },
    { tx: 31, ty: 14, amount: 40 },
  ],
  extraction: { tx: 20, ty: 4 },
  ally: [
    { name: 'ツギハギ隊', kind: 'scav', tx: 20, ty: 53, count: 4 },
    { name: 'A隊', kind: 'ponco', tx: 15, ty: 55, count: 4 },
    { name: 'B隊', kind: 'ponco', tx: 25, ty: 55, count: 4 },
  ],
  aliens: [
    { name: '巡回1', kind: 'alien', count: 2, route: [{ tx: 14, ty: 47 }, { tx: 24, ty: 44 }, { tx: 34, ty: 46 }, { tx: 24, ty: 49 }] },
    { name: '巡回2', kind: 'alien', count: 3, route: [{ tx: 8, ty: 26 }, { tx: 20, ty: 22 }, { tx: 33, ty: 26 }, { tx: 20, ty: 31 }] },
    { name: '巡回3', kind: 'alien', count: 3, route: [{ tx: 10, ty: 11 }, { tx: 30, ty: 9 }, { tx: 31, ty: 17 }, { tx: 11, ty: 17 }] },
  ],
});
