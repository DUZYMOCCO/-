// 新しい敵 G01〜G12（地上）・A01・A08（空）を通常ミッションに出す試作（v1.0.3 + ?newenemies=1。取り込み前の試作）。
// データと計算だけ（DOM・Pixi なし）。URL に ?newenemies=1 を付けた時だけ（createSim({ newEnemies: true }) の時だけ）効く。
// 付けない時: sim.ne も sim.neKinds も無いので（KINDS にも足さない）、乱数（sim.rng()）も hashSim も今までと同じ。
// このファイルの計算は乱数を 1 回も引かない（同じ seed・同じ命令なら同じ結果）。
// 数値の出どころ: 今の異星生物（alien）は sim.js の KINDS（hp 360・atk 14・range 44・cooldown 1.2・speed 16・sight 4）。
//   役割・大きさ・回復力は refs/enemy_roster_v0.md の G01〜G12・A01・A08。ほかの数はすべて【仮】（out/ENEMY_TABLE.md）。
// 高さ: A01・A08 は z=ALT.demoAirZ・動き方は空だけ（altitude.js の帯。地上の近接の武器は届かず、射撃だけ届く）。
import { ALT, MOVE, BAND, unitBand } from './altitude.js?v=1';

/** 出す順（ミッションの並びと見本の並びと同じ） */
export const NE_IDS = Object.freeze(['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08', 'G09', 'G10', 'G11', 'G12', 'A01', 'A08']);
export const isNewEnemy = kind => NE_IDS.includes(kind);
const AIR = Object.freeze({ z: ALT.demoAirZ, moves: Object.freeze([MOVE.AIR]) });
/** 回復力（非戦闘中）の倍率。KINDS の regen に入れる（sim.js の updateRegen が ALERT.regenRate に掛ける）: 低 0.5・中 1・高 2 */
const REGEN = Object.freeze({ low: 0.5, mid: 1, high: 2 });

/**
 * 種類の表（sim.js の KINDS に足す）。range/speed はワールド座標（1 タイル=32）。atk は 1 発。
 * armor: 体に当たる一撃を減らす値（sim.js の updateCombat が u.armor を読む。initNewEnemies が敵に入れる）
 * ne: 特別な動き（このファイルの stepNewEnemies が読む）
 *   explode＝触れると自爆（trigger 距離・radius 範囲・dmg）／ splash＝当たった相手の近くの味方にも（r・frac）／ slow＝当てた相手を遅く（mul・sec）／
 *   prefer＝この相手が近くにいれば優先して追う（'human'・'scav'。追っている間は速さ ×HUNT_MUL）／ burrow＝地中にもぐる（under 秒以上もぐってから、trigger px 以内にロボが来たら飛び出す／up 秒たつともぐる／ambush＝出る時の一撃）／ mine＝地雷を置く（every 秒・max 個・radius・dmg・rootSec・life 秒）
 */
export const NEW_ENEMY_KINDS = Object.freeze({
  G01: { name: 'ガトリングガエル（仮）', short: 'ガエル', hp: 220, atk: 5, range: 96, cooldown: 0.35, speed: 18, sight: 4.5, gather: 0, regen: REGEN.mid },
  G02: { name: 'ホノオミジンコ（仮）', short: 'ミジンコ', hp: 200, atk: 8, range: 48, cooldown: 0.5, speed: 17, sight: 4, gather: 0, regen: REGEN.mid },
  G03: { name: 'ツノタテ甲虫（仮）', short: '甲虫', hp: 360, atk: 16, range: 40, cooldown: 1.6, speed: 11, sight: 3.5, gather: 0, regen: REGEN.low, armor: 3 },
  G04: { name: 'ホウダンイカ（仮）', short: 'イカ', hp: 160, atk: 11, range: 144, cooldown: 2.4, speed: 13, sight: 6, gather: 0, regen: REGEN.mid, ne: { splash: { r: 30, frac: 0.5 } } },
  G05: { name: 'カマライフル（仮）', short: 'カマキリ', hp: 140, atk: 15, range: 152, cooldown: 3.0, speed: 14, sight: 6.5, gather: 0, regen: REGEN.low },
  G06: { name: 'バクダンゴムシ（仮）', short: 'ゴムシ', hp: 90, atk: 4, range: 18, cooldown: 1.0, speed: 30, sight: 4.5, gather: 0, regen: REGEN.low, ne: { explode: { trigger: 26, radius: 56, dmg: 40 } } },
  G07: { name: 'ホウトウマイマイ（仮）', short: 'マイマイ', hp: 220, atk: 12, range: 160, cooldown: 2.8, speed: 7, sight: 5.5, gather: 0, regen: REGEN.high, ne: { splash: { r: 36, frac: 0.5 }, slow: { mul: 0.5, sec: 3 } } },
  G08: { name: 'ハサミアリ（仮）', short: 'アリ', hp: 130, atk: 5, range: 28, cooldown: 1.0, speed: 30, sight: 5, gather: 0, regen: REGEN.mid, ne: { prefer: 'human' } },
  G09: { name: 'センシャヤドカリ（仮）', short: 'ヤドカリ', hp: 360, atk: 16, range: 130, cooldown: 2.4, speed: 9, sight: 5, gather: 0, regen: REGEN.mid, armor: 3 },
  G10: { name: 'ワナグモ（仮）', short: 'クモ', hp: 110, atk: 4, range: 80, cooldown: 1.5, speed: 20, sight: 4.5, gather: 0, regen: REGEN.low, ne: { mine: { every: 14, max: 3, radius: 13, dmg: 25, rootSec: 2.5, life: 150 } } },
  G11: { name: 'ノコギリハイエナ（仮）', short: 'ハイエナ', hp: 150, atk: 9, range: 30, cooldown: 0.7, speed: 34, sight: 4.5, gather: 0, regen: REGEN.mid, ne: { prefer: 'scav' } },
  G12: { name: 'ドリルムカデ（仮）', short: 'ムカデ', hp: 330, atk: 7, range: 56, cooldown: 0.5, speed: 20, sight: 4, gather: 0, regen: REGEN.mid, ne: { burrow: { under: 2, up: 10, trigger: 110, ambush: { r: 46, dmg: 24 } } } },
  A01: { name: 'バクゲキトンボ（仮）', short: 'トンボ', hp: 100, atk: 20, range: 40, cooldown: 2.0, speed: 30, sight: 5, gather: 0, regen: REGEN.mid, ...AIR, ne: { splash: { r: 36, frac: 0.6 } } },
  A08: { name: 'ゲイゲキツバメ（仮）', short: 'ツバメ', hp: 80, atk: 7, range: 100, cooldown: 0.4, speed: 40, sight: 6, gather: 0, regen: REGEN.low, ...AIR },
});
// 種類の表は sim.js の KINDS には足さない。createSim({ newEnemies: true }) の時だけ sim.neKinds（＝NEW_ENEMY_KINDS）として、そのシムで引く（ボット担当の取り込みで変更）
/** 持っている武器（weapons.js の KIND_WEAPON に足す）。表にある武器の id を借りる（見た目と「届くか」のタグだけ。ダメージは上の atk） */
export const NEW_ENEMY_WEAPON = Object.freeze({
  G01: 'W3-01',  // ガトリング腕（射撃）
  G02: 'W3-02',  // 両手火炎放射器（射撃・炎）
  G03: 'W3-03',  // 杭打ち角（近接）
  G04: 'W3-04',  // 触手長砲（砲）
  G05: 'W3-15',  // 透明スコープ光線銃（射撃）
  G06: 'W3-05',  // 回転のこ顎（近接。自爆の前の体当たり）
  G07: 'W1-09',  // 手製パイプ爆弾（投げ）
  G08: 'W3-05',  // 回転のこ顎（近接。大あごのクランプの代わり）
  G09: 'W2-03',  // アイアンフィストの砲身（砲。背負った戦車の砲塔）
  G10: 'W0-02',  // 投石（投げ。粘着の塊の代わり）
  G11: 'W3-05',  // 回転のこ顎（近接）
  G12: 'W3-11',  // お腹の対空砲（射撃・針）
  A01: 'W1-09',  // 手製パイプ爆弾（投げ。真上から落とす）
  A08: 'W3-11',  // お腹の対空砲（射撃・針）
});

/** 倒れた後に残る絵のキー（renderer の tex のキー）。G01〜G12 は休眠体（dormant）、空の敵は落ちた姿（down）。新しい敵でなければ null */
export const neWreckArt = kind => (isNewEnemy(kind) ? (kind[0] === 'A' ? `enemy_${kind}_down` : `enemy_${kind}_dormant`) : null);

/**
 * 本編のミッション（MISSION_1）の異星生物を、新しい敵 14 種の 7 つの群れに入れ替えた写しを返す（今の異星生物 3 群 8 体の代わり）。
 * ally・salvage・脱出口・巣はそのまま。各群れは kinds（1 体ずつの種類の並び）を持ち、sim.js の spawnGroup が読む。
 * 数（1 種 1 体 ＝ 14 体）の考え方: out/ENEMY_TABLE.md の「出現数」。
 */
export function newEnemiesMission(m) {
  const r = i => m.aliens[i].route;
  return {
    ...m,
    aliens: [
      { name: '前線', kinds: ['G01', 'G02', 'G06'], route: r(0) },
      { name: '中央', kinds: ['G03', 'G04', 'G05'], route: r(1) },
      { name: '北の守り', kinds: ['G09', 'G07', 'G10'], route: r(2) },
      { name: '猟兵', kinds: ['G11', 'G08'], role: 'raid', tx: 12, ty: 30 },
      { name: '地中', kinds: ['G12'], route: [{ tx: 6, ty: 30 }, { tx: 10, ty: 22 }, { tx: 7, ty: 15 }, { tx: 13, ty: 21 }] },
      { name: '空1', kinds: ['A01'], route: [{ tx: 10, ty: 44 }, { tx: 30, ty: 38 }, { tx: 22, ty: 30 }, { tx: 8, ty: 34 }] },
      { name: '空2', kinds: ['A08'], route: [{ tx: 30, ty: 20 }, { tx: 12, ty: 14 }, { tx: 20, ty: 24 }, { tx: 32, ty: 30 }] },
    ],
  };
}

/** sim.ne の初期状態。敵の体の装甲（armor）を入れる。createSim が、敵を全部出した後に 1 回だけ呼ぶ */
export function initNewEnemies(sim) {
  for (const u of sim.units) if (u.side === 'enemy') {
    const k = NEW_ENEMY_KINDS[u.kind]; if (k?.armor) u.armor = k.armor;
    if (k?.ne?.burrow) { u.neBur = 'under'; u.neBurT = 0; u.z = ALT.diveZ; } // G12 は地中から始まる（地中の帯＝水中の帯 BAND.UNDERWATER を借りる）
  }
  return { mines: [], nextMineId: 1, exploded: 0, slowed: 0, hunts: 0, emerged: 0, burrowed: 0, splashed: 0 };
}

const HUNT_EVERY = 0.5;      // 好物（prefer）を探す間隔（秒）
const HUNT_SIGHT_MUL = 1.6;  // 好物を探す距離（見える範囲 sight のこの倍）
const HUNT_KEEP_MUL = 2.4;   // 追い始めた後、見失うまでの距離（sight のこの倍。行ったり来たりしないように）
const HUNT_MUL = 1.3;        // 好物を追っている間の速さの倍率
const HUNT_CARGO_BIAS = 0.6; // 資材を運んでいる相手は、距離をこの倍に見て優先する
const isGround = u => unitBand(u) === BAND.SURFACE;
const groundRobot = u => u.side === 'ally' && !u.human && !u.object && u.hp > 0 && u.captured == null && isGround(u);

/**
 * 1 ステップ（sim.js の stepSim が updateCombat の後に呼ぶ。sim.ne が無ければ何もしない）。
 * api: sim.js の中の関数（循環 import を避けて渡してもらう）{ applyOrder, removeDead, autoRepair, cannotBeCaptured, isStunned }
 */
export function stepNewEnemies(sim, dt, api) {
  const ne = sim.ne; if (!ne) return;
  let died = false;
  // 1. 遅くされた味方の回復（G07 の粘液・G10 の地雷）
  for (const u of sim.units) if (u.neSlowUntil != null && sim.time >= u.neSlowUntil) { u.neSlowUntil = null; u.speedMul = 1; }
  // 2. この 1 ステップに撃たれた弾の追加の効果（fx の shot は t が今の時間）: 範囲（splash）・遅くする（slow）
  for (const f of sim.fx) {
    if (f.type !== 'shot' || f.t !== sim.time || f.side !== 'enemy' || f.shield || f.to == null || f.toSide !== 'ally') continue;
    const k = NEW_ENEMY_KINDS[f.kind]; if (!k?.ne) continue;
    const t = sim.units.find(u => u.id === f.to); if (!t || t.hp <= 0) continue;
    if (k.ne.slow && !t.human && t.captured == null) { t.neSlowUntil = sim.time + k.ne.slow.sec; t.speedMul = k.ne.slow.mul; ne.slowed++; }
    if (k.ne.splash) {
      for (const v of sim.units) {
        if (v === t || v.side !== 'ally' || v.hp <= 0 || v.captured != null || api.cannotBeCaptured(v) || unitBand(v) !== unitBand(t)) continue;
        if (Math.hypot(v.x - t.x, v.y - t.y) > k.ne.splash.r) continue;
        v.hp -= Math.max(1, Math.round(f.dmg * k.ne.splash.frac)); v.lastHit = sim.time; ne.splashed++;
        if (v.hp > 0) api.autoRepair(sim, v); else died = true;
      }
      sim.fx.push({ type: 'neSplash', x: t.x, y: t.y, r: k.ne.splash.r, t: sim.time, kind: f.kind }); // 範囲の輪（見た目）
    }
  }
  for (const e of sim.units) {
    if (e.side !== 'enemy' || e.hp <= 0) continue;
    const k = NEW_ENEMY_KINDS[e.kind]; if (!k?.ne) continue;
    const busy = e.captured != null || e.carrying != null || api.isStunned(e);
    // 3. G06 の自爆: 地上の味方（人間も）に触れたら、まわりの味方へ一定のダメージ。本人は消える
    if (k.ne.explode && !busy) {
      const X = k.ne.explode;
      const hit = sim.units.some(a => a.side === 'ally' && a.hp > 0 && a.captured == null && !api.cannotBeCaptured(a) && isGround(a) && Math.hypot(a.x - e.x, a.y - e.y) <= X.trigger);
      if (hit) {
        for (const a of sim.units) {
          if (a.side !== 'ally' || a.hp <= 0 || a.captured != null || api.cannotBeCaptured(a) || !isGround(a) || Math.hypot(a.x - e.x, a.y - e.y) > X.radius) continue;
          a.hp -= X.dmg; a.lastHit = sim.time; if (a.hp > 0) api.autoRepair(sim, a);
        }
        sim.fx.push({ type: 'neBlast', x: e.x, y: e.y, r: X.radius, t: sim.time, kind: e.kind });
        e.hp = 0; ne.exploded++; died = true; continue;
      }
    }
    // 4. 好物（prefer）: 近くにいれば優先して追う（G08 は人間・G11 はツギハギ号。資材を運んでいる相手を先に）。追い始めたら少し遠くまで追い、追っている間は速い
    if (k.ne.prefer && !busy) {
      e.neT = (e.neT ?? 0) - dt;
      if (e.neT <= 0) {
        e.neT = HUNT_EVERY;
        const rIn = e.sight * HUNT_SIGHT_MUL * 32, rKeep = e.sight * HUNT_KEEP_MUL * 32;
        let best = null, bs = Infinity;
        for (const a of sim.units) {
          if (a.side !== 'ally' || a.hp <= 0 || a.captured != null || !api.reaches(e, a)) continue;
          if (k.ne.prefer === 'human' ? !a.human || api.cannotBeCaptured(a) : a.kind !== k.ne.prefer) continue;
          const d = Math.hypot(a.x - e.x, a.y - e.y);
          if (d > (a.id === e.neHunt ? rKeep : rIn)) continue;
          const score = d * (a.cargo > 0 ? HUNT_CARGO_BIAS : 1);
          if (score < bs) { bs = score; best = a; }
        }
        if (best) {
          api.applyOrder(sim, e, [{ tx: Math.floor(best.x / 32), ty: Math.floor(best.y / 32) }], 'fight', best.human ? null : best.id);
          if (e.neHunt !== best.id) { e.neHunt = best.id; ne.hunts++; }
          e.speedMul = HUNT_MUL;
        } else if (e.neHunt != null) { e.neHunt = null; e.speedMul = 1; e.order = null; e.targetId = null; e.engaged = false; }
      }
    }
    // 4b. G12 の地中: もぐっている間は「地中の帯」（弾も近接も届かない・こちらも撃てない）。ロボが近づいたら飛び出して一撃。しばらくするともぐる
    if (k.ne.burrow && !busy) {
      const B = k.ne.burrow;
      e.neBurT = (e.neBurT ?? 0) + dt;
      if (e.neBur === 'under') {
        if (e.neBurT >= B.under) {
          const hit = sim.units.some(a => groundRobot(a) && Math.hypot(a.x - e.x, a.y - e.y) <= B.trigger);
          if (hit) {
            e.neBur = 'up'; e.neBurT = 0; e.z = 0; e.cd = 0; ne.emerged++;
            for (const a of sim.units) {
              if (!groundRobot(a) || Math.hypot(a.x - e.x, a.y - e.y) > B.ambush.r) continue;
              a.hp -= B.ambush.dmg; a.lastHit = sim.time; if (a.hp > 0) api.autoRepair(sim, a); else died = true;
            }
            sim.fx.push({ type: 'neBlast', x: e.x, y: e.y, r: B.ambush.r, t: sim.time, kind: e.kind });
          }
        }
      } else if (e.neBurT >= B.up) { e.neBur = 'under'; e.neBurT = 0; e.z = ALT.diveZ; e.targetId = null; ne.burrowed++; }
    }
    // 5. G10 の地雷: 一定の間隔で足元に置く（持っている数の上限まで）
    if (k.ne.mine && !busy) {
      const M = k.ne.mine;
      e.neMineT = (e.neMineT ?? M.every * 0.5) - dt;
      if (e.neMineT <= 0) {
        e.neMineT = M.every;
        const own = ne.mines.filter(m => m.owner === e.id);
        if (own.length < M.max && !own.some(m => Math.hypot(m.x - e.x, m.y - e.y) < M.radius * 3)) ne.mines.push({ id: ne.nextMineId++, x: e.x, y: e.y + 6, owner: e.id, t: sim.time });
      }
    }
  }
  // 6. 地雷: 寿命・踏んだ地上の味方ロボ（空は踏まない）にダメージと足止め
  if (ne.mines.length) {
    const live = [], M = NEW_ENEMY_KINDS.G10.ne.mine, stepped = new Set(); // stepped: この 1 ステップに踏んだ機体（1 ステップに 1 個まで）
    for (const m of ne.mines) {
      if (sim.time - m.t > M.life) continue;
      const v = sim.time - m.t > 0.5 ? sim.units.find(u => groundRobot(u) && !stepped.has(u.id) && Math.hypot(u.x - m.x, u.y - m.y) <= M.radius) : null; // 置いて 0.5 秒は踏んでも反応しない
      if (!v) { live.push(m); continue; }
      stepped.add(v.id); v.hp -= M.dmg; v.lastHit = sim.time; v.neSlowUntil = sim.time + M.rootSec; v.speedMul = 0.2;
      sim.fx.push({ type: 'neBlast', x: m.x, y: m.y, r: 24, t: sim.time, kind: 'G10' });
      if (v.hp > 0) api.autoRepair(sim, v); else died = true;
    }
    ne.mines = live;
  }
  if (died) api.removeDead(sim);
}

/** hashSim に混ぜる値（sim.ne がある時だけ。無い時は呼ばれない＝今までのハッシュと同じ） */
export function newEnemiesHashValues(sim) {
  const ne = sim.ne, out = [ne.exploded, ne.slowed, ne.hunts, ne.mines.length, ne.emerged, ne.burrowed, ne.splashed];
  for (const m of ne.mines) out.push(m.id, Math.round(m.x * 100), Math.round(m.y * 100));
  for (const u of sim.units) if (u.neSlowUntil != null) out.push(u.id, Math.round(u.neSlowUntil * 1000));
  for (const u of sim.units) if (u.neBur) out.push(u.id, u.neBur === 'under' ? 1 : 2, Math.round(u.neBurT * 1000));
  return out;
}
