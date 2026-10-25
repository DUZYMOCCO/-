// 機体ごとのシールドと体の表（データ。v0.4.12-dev）。sim.js の makeUnit が、味方ロボットを作る時に kind で引く。
//   shieldFrac＝盾の耐久（最大 HP に対する割合）／ blockChance＝攻撃を盾が受ける確率／ wearMult＝受けたダメージのうち盾が減る倍率（大きいほど割れやすい）
//   hp＝最大 HP（KINDS の hp を、この機体だけ置きかえる。省けば KINDS のまま）／ armor＝体に当たる一撃を減らす値（省けば 0。0 なら今までと同じ数）
//   why＝その機体がなぜその盾・体なのか（日本語 1 行。数値は全部「（仮）」）
// 兵種（UNIT_CLASS_CAPS）の倍率は、この表の上に掛かる（ガンナーは受ける確率 +0.15・すり減り ×0.7。sim.js の shieldStats）。
// 表にない機体・敵・人間は、sim.js の既定（SHIELD_HP_FRAC・SHIELD_BLOCK_CHANCE・すり減り 1・装甲 0）のまま。
// createSim({ shieldTable }) で表を差しかえられる（省けば SHIELD_TABLE）。SHIELD_TABLE_V0411 は v0.4.11 までの「全部同じ」表（ハッシュの確かめ用）。

const row = o => Object.freeze({ shieldFrac: 0.40, blockChance: 0.35, wearMult: 1, armor: 0, ...o });

export const SHIELD_TABLE = Object.freeze({
  // 基準の機体。他の機体はここから、盾と体の「どちらを厚くするか」を変えてある
  ponco: row({ shieldFrac: 0.40, blockChance: 0.35, wearMult: 1.0, hp: 120, armor: 0,
    why: '工場生まれの標準機で、盾も体もふつう（ほかの機体の物差し）（仮）' }),
  // 薄めの盾。ガンナーの兵種を乗せると受ける確率が上がる
  gunner: row({ shieldFrac: 0.30, blockChance: 0.30, wearMult: 1.1, hp: 100, armor: 0,
    why: '身軽な射撃型で、盾は小さく薄い。撃ち合いで受けきるより当てる機体（仮）' }),
  // 厚く固い盾。盾が割れにくく、よく受け、体にも装甲板がある
  heavy: row({ shieldFrac: 0.60, blockChance: 0.45, wearMult: 0.8, hp: 160, armor: 1,
    why: '分厚い盾を前に構える壁役。よく受けて割れにくく、体にも板を足してある（仮）' }),
  // 盾は薄くてすぐ割れるが、骨組みが太くて倒れにくい
  scav: row({ shieldFrac: 0.20, blockChance: 0.25, wearMult: 1.3, hp: 72, armor: 2,
    why: '寄せ集めの板で盾は薄く割れやすいが、骨組みが太くて倒れにくい（仮）' }),
  // 盾は小さめだが、体がとても丈夫
  giant: row({ shieldFrac: 0.12, blockChance: 0.20, wearMult: 1.5, hp: 1200, armor: 5,
    why: '大きすぎて盾では覆えず頼りない。そのかわり体そのものが分厚い装甲（仮）' }),
  // ?altunits=1 の 2 機（js/sim/alt-units.js）。取り込みの時に足した既定のままの行（今までと同じ数。性格はまだ決めていない）
  flyer: row({ hp: 90, why: 'スカイポンコ（仮）。盾と体の性格はまだ決めていないので既定のまま（仮）' }),
  amph: row({ hp: 140, why: 'アビスポンコ（仮）。盾と体の性格はまだ決めていないので既定のまま（仮）' }),
});

/** v0.4.11 までの表: 全部の機体が 0.40・0.35・すり減り 1・装甲 0、体は KINDS のまま（hp なし）。createSim({ shieldTable }) に渡すと昔の結果に戻る */
export const SHIELD_TABLE_V0411 = Object.freeze({
  gunner: row({ why: 'v0.4.11 まで（確かめ用）' }), heavy: row({ why: 'v0.4.11 まで（確かめ用）' }), scav: row({ why: 'v0.4.11 まで（確かめ用）' }),
  ponco: row({ why: 'v0.4.11 まで（確かめ用）' }), giant: row({ why: 'v0.4.11 まで（確かめ用）' }),
});

/** まだシムにない機体の案（design_robot_identity_v3.md から。シムには足さない。数値は全部（仮）） */
export const SHIELD_TABLE_IDEAS = Object.freeze({
  ponco07: { shieldFrac: 0.45, blockChance: 0.38, wearMult: 0.9, hpMul: 1.2, armor: 1, why: '序盤の主力の上位機。盾も体も一回り上（仮）' },
  onbo_r02: { shieldFrac: 0.25, blockChance: 0.30, wearMult: 1.2, hpMul: 0.9, armor: 0, why: 'ワケアリ工業のふつうの機体。直しやすいので盾は少し薄め（仮）' },
  doteliner: { shieldFrac: 0.55, blockChance: 0.40, wearMult: 0.9, hpMul: 1.5, armor: 2, why: 'ずんぐりした盾役。大きな盾と分厚い車体（仮）' },
});
