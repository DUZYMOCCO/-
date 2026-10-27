// 新しい敵 G01〜G12・A01・A08 を通常ミッションに出す試作（?newenemies=1。js/sim/new-enemies.js・js/render/new-enemies-view.js）。
// フラグなしは今までと1つも変わらない（seed 1〜5 の 300 ステップ後のハッシュ）／フラグありで 14 種が決めた数値で出る／届かない相手は狙わない・印の判定／
// 空の敵に地上の近接は当たらない／特別な動き（G06 自爆・G07 粘液と範囲・G08 人間を追う・G10 地雷・G11 ツギハギ号を追う・A01 範囲）／同じ seed なら同じ結果。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as S from '../js/sim/sim.js?v=29';
import * as M from '../js/sim/mission.js?v=10';
import { NE_IDS, NEW_ENEMY_KINDS, NEW_ENEMY_WEAPON, newEnemiesMission, neWreckArt, isNewEnemy } from '../js/sim/new-enemies.js?v=2';
import { NE_PX, newEnemyArtSources, neWreckScale } from '../js/render/new-enemies-view.js?v=2';
import { wreckKey } from '../js/render/wreck-view.js?v=3';
import { ALT, BAND, unitBand, canHit } from '../js/sim/altitude.js?v=1';
import { reaches, groupReaches, unreachableTarget } from '../js/sim/targeting.js?v=2';
import { weaponById, KIND_WEAPON } from '../js/sim/weapons.js?v=7';
import { toTile } from '../js/sim/map.js?v=6';

const path = rel => fileURLToPath(new URL(rel, import.meta.url));
const SW = readFileSync(path('../sw-assets.js'), 'utf8');
const HASH300 = { 1: '6cc93eb6', 2: '2a60b985', 3: '24994a28', 4: '5558d677', 5: '6e46d4aa' }; // v1.0.3 の MISSION_1・300 ステップ後（refs/baseline_300.json と同じ）
const mk = (seed = 1, extra = {}) => S.createSim({ seed, mission: M.MISSION_1, newEnemies: true, ...extra });
const enemy = (sim, kind) => sim.units.find(u => u.side === 'enemy' && u.kind === kind);
const ally = (sim, kind) => sim.units.find(u => u.side === 'ally' && u.kind === kind);
/** 敵を 1 体だけ残して、ほかの敵を消す（特別な動きを 1 つずつ確かめる） */
function only(sim, ...kinds) {
  sim.units = sim.units.filter(u => u.side === 'ally' || kinds.includes(u.kind));
  sim.groups = sim.groups.filter(g => g.unitIds.some(id => sim.units.some(u => u.id === id)));
  for (const g of sim.groups) g.unitIds = g.unitIds.filter(id => sim.units.some(u => u.id === id));
  return sim;
}
const put = (u, x, y) => { u.x = x; u.y = y; u.order = null; return u; };
const run = (sim, sec) => { for (let i = 0; i < Math.round(sec * 30); i++) S.stepSim(sim); };

test('フラグなし: seed 1〜5 の 300 ステップ後のハッシュが今までと同じ・sim.ne も乱数の追加もない', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const sim = S.createSim({ seed, mission: M.MISSION_1 }); S.runSim(sim, 300);
    assert.equal(S.hashSim(sim), HASH300[seed], `seed ${seed}`);
    assert.equal(sim.ne, undefined, 'sim.ne は作らない');
    assert.ok(!sim.units.some(u => NE_IDS.includes(u.kind)), '新しい敵は出ない');
    const off = S.createSim({ seed, mission: M.MISSION_1, newEnemies: false }); S.runSim(off, 300);
    assert.equal(S.hashSim(off), HASH300[seed], 'newEnemies: false も同じ');
    assert.equal(S.hashSimDeep(off), S.hashSimDeep(sim));
  }
  // 新しい敵の種類は、フラグなしでは KINDS に足さない（隠しのキーも作らない）
  for (const id of NE_IDS) assert.ok(!Object.getOwnPropertyNames(S.KINDS).includes(id) && S.KINDS[id] === undefined, `${id} は KINDS にない`);
  assert.equal(S.createSim({ seed: 1, mission: M.MISSION_1 }).neKinds, undefined, 'フラグなしは sim.neKinds も作らない');
  assert.deepEqual(Object.keys(S.createSim({ seed: 1, mission: M.MISSION_1, newEnemies: true }).neKinds).sort(), [...NE_IDS].sort(), 'フラグありだけ、そのシムに 14 種');
  // 今の異星生物の数値は変えていない
  assert.deepEqual(S.KINDS.alien, { name: '異星生物', short: '異星', hp: 360, atk: 14, range: 44, cooldown: 1.2, speed: 16, sight: 4, gather: 0, regen: true });
});

test('フラグあり: 14 種（G01〜G12・A01・A08）が 1 体ずつ出て、数値は表のとおり。今の異星生物は出ない', () => {
  const sim = mk();
  const es = sim.units.filter(u => u.side === 'enemy');
  assert.equal(es.length, 14);
  assert.deepEqual(es.map(u => u.kind).sort(), [...NE_IDS].sort());
  assert.ok(!es.some(u => u.kind === 'alien'));
  for (const u of es) {
    const k = NEW_ENEMY_KINDS[u.kind];
    assert.equal(u.maxHp, k.hp, `${u.kind} hp`); assert.equal(u.atk, k.atk); assert.equal(u.range, k.range);
    assert.equal(u.cooldown, k.cooldown); assert.equal(u.speed, k.speed); assert.equal(u.sight, k.sight);
    assert.equal(u.armor, k.armor ?? 0, `${u.kind} 装甲`);
    assert.equal(u.label, k.name, '名前は種類の名前');
    assert.equal(KIND_WEAPON[u.kind], NEW_ENEMY_WEAPON[u.kind]); assert.ok(weaponById(NEW_ENEMY_WEAPON[u.kind]), `${u.kind} の武器が表にある`);
  }
  for (const id of ['A01', 'A08']) { const u = enemy(sim, id); assert.equal(u.z, ALT.demoAirZ); assert.equal(unitBand(u), BAND.AIR); assert.deepEqual([...u.moves], ['air']); }
  for (const id of NE_IDS.filter(i => i[0] === 'G' && i !== 'G12')) assert.equal(unitBand(enemy(sim, id)), BAND.SURFACE, `${id} は地上`);
  assert.equal(unitBand(enemy(sim, 'G12')), BAND.UNDERWATER, 'G12 は地中（水中の帯を借りる）から始まる');
  assert.equal(enemy(sim, 'G03').armor, 3); assert.equal(enemy(sim, 'G09').armor, 3);
  // 味方は今までと同じ（12 機・人 2）
  assert.equal(sim.units.filter(u => u.side === 'ally').length, 14);
  assert.equal(M.MISSION_1.aliens.length, 3, '元のミッションの表は書きかえない');
  assert.equal(newEnemiesMission(M.MISSION_1).aliens.reduce((a, g) => a + g.kinds.length, 0), 14);
  // 強さの順（回復力 低 0.5・中 1・高 2）
  assert.ok(NEW_ENEMY_KINDS.G07.regen > NEW_ENEMY_KINDS.G01.regen && NEW_ENEMY_KINDS.G01.regen > NEW_ENEMY_KINDS.G03.regen);
});

test('フラグあり: 同じ seed なら同じ結果（ハッシュ・深いハッシュ）・seed がちがえば別', () => {
  const a = mk(3), b = mk(3), c = mk(4);
  S.runSim(a, 900); S.runSim(b, 900); S.runSim(c, 900);
  assert.equal(S.hashSim(a), S.hashSim(b)); assert.equal(S.hashSimDeep(a), S.hashSimDeep(b));
  assert.notEqual(S.hashSim(a), S.hashSim(c));
  assert.notEqual(S.hashSim(mk(3)), HASH300[3], 'フラグありは別の局面（ハッシュも別）');
});

test('届かない相手: 地上の近接（G03・G06・G08・G11）は空の味方に届かない・寄らない・気づきのゲージも上がらない・印の判定が出る', () => {
  const w = u => S.unitWeaponInfo(u)?.row ?? null;
  const sim = only(mk(1), 'G03', 'G01');
  const air = ally(sim, 'ponco'); air.z = ALT.demoAirZ; air.moves = Object.freeze(['air']);
  const g3 = put(enemy(sim, 'G03'), air.x, air.y - 40), g1 = enemy(sim, 'G01');
  put(g1, 300, 300); g1.hp = 0; sim.units = sim.units.filter(u => u !== g1); // 射撃のほうは別に確かめる
  assert.equal(canHit(g3, air, w(g3)), false);
  assert.equal(reaches(g3, air, w), false);
  assert.equal(groupReaches([g3], air, w), false);
  for (const kind of ['G03', 'G06', 'G08', 'G11']) assert.equal(canHit({ z: 0 }, air, weaponById(NEW_ENEMY_WEAPON[kind])), false, `${kind} の武器は空に届かない`);
  // 空の味方だけが近くにいる時は、印の判定が出る（ほかに届く味方がいない時だけ）
  for (const u of sim.units) if (u.side === 'ally' && u !== air) put(u, 40, 40);
  const mark = unreachableTarget(sim, g3, w, 32);
  assert.equal(mark?.id, air.id, '届かない相手の印');
  // 寄らない・撃たない・気づかない: 10 秒たっても 1 歩も寄らず、空の味方は無傷、群れのゲージは 0
  const g = S.groupById(sim, g3.groupId); const alert0 = g.alert, p0 = { x: g3.x, y: g3.y };
  g3.stance = 'free';
  run(sim, 10);
  assert.equal(air.hp, air.maxHp, '空の味方は無傷');
  assert.equal(g.alert, alert0, '気づきのゲージは上がらない');
  assert.equal(g.ai, 'patrol');
  assert.equal(S.groupSees(sim, g), null, '見ている本人が届かない相手は見えない扱い');
  assert.ok(Math.hypot(g3.x - air.x, g3.y - air.y) > 30, '寄って来ない'); assert.ok(g3.x !== undefined && p0);
});

test('空の敵（A01・A08）: 地上の近接の味方は倒せない・射撃は届く・空の敵は地上を攻撃できる', () => {
  const sim = mk(2);
  const a01 = enemy(sim, 'A01'), a08 = enemy(sim, 'A08'), pon = ally(sim, 'ponco'), scav = ally(sim, 'scav'), g03 = enemy(sim, 'G03');
  const wp = S.unitWeaponInfo(pon).row, ws = S.unitWeaponInfo(scav).row;
  assert.equal(canHit(pon, a01, wp), true, 'PONCO（射撃）は空に届く');
  assert.equal(canHit(scav, a01, ws), false, 'ツギハギ号（近接）は空に届かない');
  assert.equal(canHit(a01, scav, S.unitWeaponInfo(a01).row), true, '空の敵は地上に届く');
  assert.equal(canHit(a08, pon, S.unitWeaponInfo(a08).row), true);
  assert.equal(canHit(g03, a01, S.unitWeaponInfo(g03).row), false, 'G03（近接）は空に届かない');
  // 実際に、近接のツギハギ号だけを真下に置いても A01 の HP は減らない。PONCO を置くと減る
  const s2 = only(mk(2), 'A01');
  const a = enemy(s2, 'A01'), sc = ally(s2, 'scav');
  for (const u of s2.units) if (u.side === 'ally') put(u, 40, 40);
  put(a, 600, 600); put(sc, 600, 620); sc.noFightTest = true;
  s2.groups = []; a.groupId = null; a.stance = 'free';
  sc.stance = 'free'; sc.atk = 5; // 近接に殴らせる（ふだんは戦わない機体だが、判定は武器で決まる）
  run(s2, 5);
  assert.equal(a.hp, a.maxHp, '近接では空の敵に当たらない');
  const pon2 = ally(s2, 'ponco'); put(pon2, 600, 660); pon2.stance = 'free'; pon2.anchor = { x: pon2.x, y: pon2.y };
  run(s2, 6);
  assert.ok(a.hp < a.maxHp || !s2.units.includes(a), 'PONCO の射撃は当たる');
});

test('G06 自爆: 地上の味方に触れるとまわりの味方に 40 ダメージ・本人は消える・空の味方には当たらない', () => {
  const sim = only(mk(1), 'G06');
  const g6 = enemy(sim, 'G06'), pons = sim.units.filter(u => u.kind === 'ponco');
  for (const u of sim.units) if (u.side === 'ally') put(u, 40, 40);
  const [a, b, c] = pons; put(a, 600, 600); put(b, 600 + 30, 600); put(c, 600 + 200, 600);
  const air = pons[3]; put(air, 600, 610); air.z = ALT.demoAirZ; air.moves = Object.freeze(['air']);
  put(g6, 600 + 10, 600);
  const hp = pons.map(u => u.hp);
  S.stepSim(sim);
  assert.equal(sim.units.includes(g6), false, '自爆して消えた');
  assert.equal(a.hp, hp[0] - 40); assert.equal(b.hp, hp[1] - 40); assert.equal(c.hp, hp[2], '範囲の外は無傷'); assert.equal(air.hp, hp[3], '空は無傷');
  assert.equal(sim.ne.exploded, 1);
  assert.ok(sim.fx.some(f => f.type === 'neBlast'));
});

test('G07 粘液: 当てた味方ロボを遅くする（3 秒）・近くの味方にも範囲ダメージ。G04・A01 も範囲ダメージ', () => {
  const sim = only(mk(1), 'G07');
  const g7 = enemy(sim, 'G07'), [a, b, far] = sim.units.filter(u => u.kind === 'ponco');
  for (const u of sim.units) if (u.side === 'ally') put(u, 40, 40);
  put(a, 600, 600); put(b, 620, 600); put(far, 700, 600); put(g7, 600, 600 + 150);
  g7.cd = 0; g7.stance = 'free';
  let slowed = false, hurtB = false;
  const hpB = b.hp;
  for (let i = 0; i < 30 * 8; i++) {
    S.stepSim(sim);
    if (a.neSlowUntil != null || b.neSlowUntil != null) slowed = true;
    if (b.hp < hpB) hurtB = true;
  }
  assert.ok(slowed, '当たった味方が遅くなる'); assert.ok(sim.ne.slowed >= 1);
  assert.ok(hurtB || a.hp < a.maxHp, '範囲ダメージか直撃');
  assert.equal(far.hp, far.maxHp, '範囲の外は無傷');
  run(sim, 6); S.stepSim(sim);
  for (const u of [a, b]) if (u.neSlowUntil == null) assert.equal(u.speedMul, 1, '遅さは元に戻る');
  assert.ok(NEW_ENEMY_KINDS.G04.ne.splash && NEW_ENEMY_KINDS.A01.ne.splash);
});

test('G08 は人間を追って捕まえる・G11 はツギハギ号を追う（近くにいる時だけ）', () => {
  const s8 = only(mk(1), 'G08');
  const g8 = enemy(s8, 'G08'), boy = ally(s8, 'boy');
  for (const u of s8.units) if (u.side === 'ally') put(u, 40, 40);
  put(boy, 600, 600); boy.hp = boy.maxHp = 9999;
  put(g8, 600 + 150, 600); // 見える範囲 5 タイル×1.6 の中
  s8.groups = []; g8.groupId = null;
  let got = false;
  for (let i = 0; i < 30 * 12 && !got; i++) { S.stepSim(s8); got = boy.captured != null; }
  assert.ok(s8.ne.hunts >= 1, '人間へ寄る命令を出した'); assert.ok(got, '人間を捕まえた');
  const s11 = only(mk(1), 'G11');
  const g11 = enemy(s11, 'G11'), sc = ally(s11, 'scav');
  for (const u of s11.units) if (u.side === 'ally') put(u, 40, 40);
  put(sc, 600, 600); put(g11, 600 + 100, 600);
  s11.groups = []; g11.groupId = null;
  const d0 = Math.hypot(g11.x - sc.x, g11.y - sc.y);
  run(s11, 1.5);
  assert.ok(s11.ne.hunts >= 1);
  assert.ok(!s11.units.includes(g11) || Math.hypot(g11.x - sc.x, g11.y - sc.y) < d0 - 20, 'ハイエナがツギハギ号へ寄る');
});

test('G10 地雷: 一定の間隔で足元に置く（1 体 3 個まで）・地上の味方が踏むと 25 ダメージで 2.5 秒止まる・空の味方は踏まない', () => {
  const sim = only(mk(1), 'G10');
  const g10 = enemy(sim, 'G10'), [a, air] = sim.units.filter(u => u.kind === 'ponco');
  for (const u of sim.units) if (u.side === 'ally') put(u, 40, 40);
  put(g10, 700, 700); g10.stance = 'hold'; sim.groups = []; g10.groupId = null; g10.range = 0; // 撃たせない（地雷だけ見る）
  run(sim, 7.1);
  assert.equal(sim.ne.mines.length, 1, '最初の 1 個（every の半分の 7 秒で）');
  run(sim, 14);
  assert.equal(sim.ne.mines.length, 1, '同じ場所には重ねて置かない（動かない間は 1 個）');
  for (const x of [760, 820, 880, 940]) { put(g10, x, 700); run(sim, 14); }
  assert.equal(sim.ne.mines.length, 3, '1 体 3 個まで');
  const m = sim.ne.mines[0];
  put(air, m.x, m.y); air.z = ALT.demoAirZ; air.moves = Object.freeze(['air']);
  S.stepSim(sim); assert.equal(sim.ne.mines.length, 3, '空は踏まない'); assert.equal(air.hp, air.maxHp);
  put(air, 40, 40);
  put(a, m.x, m.y); const hp = a.hp;
  S.stepSim(sim);
  assert.equal(a.hp, hp - 25); assert.equal(a.speedMul, 0.2, '足止め'); assert.equal(sim.ne.mines.length, 2);
  run(sim, 2.6); assert.equal(a.speedMul, 1, '2.5 秒で解ける');
  // 寿命
  const life = NEW_ENEMY_KINDS.G10.ne.mine.life;
  for (const u of sim.units) if (u.side === 'ally') put(u, 40, 40);
  g10.hp = 0; sim.units = sim.units.filter(u => u !== g10);
  run(sim, life + 1); assert.equal(sim.ne.mines.length, 0, '時間がたつと消える');
});

test('絵と表示: 14 種の体・倒れた姿・地雷の絵が決まっていて、先読みの一覧に入っている・空の敵は人間を捕まえない', () => {
  const src = newEnemyArtSources();
  for (const id of NE_IDS) {
    assert.ok(src[`enemy_${id}`], `${id} の体`); assert.ok(src[neWreckArt(id)], `${id} の倒れた姿 ${neWreckArt(id)}`);
    assert.ok(NE_PX[id] >= 40 && NE_PX[id] <= 72, `${id} の大きさ ${NE_PX[id]}`);
    assert.equal(wreckKey({ kind: id, side: 'enemy', hp: 0 }), neWreckArt(id));
    assert.equal(wreckKey({ kind: id, side: 'ally', hp: 0 }), null, '味方の同名はない');
    assert.ok(isNewEnemy(id));
  }
  assert.equal(neWreckArt('G01'), 'enemy_G01_dormant'); assert.equal(neWreckArt('A01'), 'enemy_A01_down'); assert.equal(neWreckArt('alien'), null);
  assert.equal(wreckKey({ kind: 'alien', side: 'enemy', hp: 0 }), 'wreck_alien', '異星生物は今までどおり');
  assert.ok(neWreckScale('G01') < 1 && neWreckScale('G08') === 1);
  assert.ok(src.enemy_G10_mine);
  for (const [k, s] of Object.entries(src)) {
    const file = fileURLToPath(s.url.split('?')[0]);
    assert.ok(existsSync(file), `${k} の絵がある`);
    assert.ok(SW.includes(`'assets/${s.url.split('/assets/')[1]}'`), `${k} が先読みの一覧にある`);
  }
  for (const f of ['js/sim/new-enemies.js', 'js/render/new-enemies-view.js']) assert.ok(SW.includes(`'${f}'`), `${f} が sw-assets.js にある`);
  // 空の敵は人間に触れても捕まえない
  const sim = only(mk(1), 'A01');
  const a01 = enemy(sim, 'A01'), boy = ally(sim, 'boy');
  for (const u of sim.units) if (u.side === 'ally') put(u, 40, 40);
  sim.groups = []; a01.groupId = null; put(boy, 600, 600); put(a01, 600, 600); a01.range = 0;
  S.stepSim(sim);
  assert.equal(boy.captured, null, '空の敵は捕まえない');
  assert.equal(toTile(a01.x), 18);
});

test('G06 自爆: 近接の体当たりの距離（range）で止まっても、触れた扱い（trigger）の中に入る', () => {
  const k = NEW_ENEMY_KINDS.G06;
  assert.ok(k.ne.explode.trigger >= k.range, `trigger ${k.ne.explode.trigger} は range ${k.range} 以上（止まった所で爆発する）`);
  const sim = only(mk(1), 'G06');
  const g6 = enemy(sim, 'G06'), p = ally(sim, 'ponco');
  for (const u of sim.units) if (u.side === 'ally') put(u, 40, 40);
  sim.groups = []; g6.groupId = null; put(p, 600, 600); put(g6, 600, 600 - 90); g6.stance = 'free';
  p.atk = 0; // 撃ち返さない（近づいて自爆するところだけ見る）
  const hp = p.hp;
  run(sim, 8);
  assert.equal(sim.ne.exploded, 1, '追いかけて自爆した');
  assert.ok(p.hp < hp, '近くの味方が傷ついた');
});
