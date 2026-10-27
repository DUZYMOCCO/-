// パワードスーツ（?powersuit=1 の試作。js/sim/powersuit.js・js/ui/powersuit-menu.js）: 決定 8 つ（refs/POWERSUIT.md の「8. 決定」）を 1 つずつ確かめる。
// フラグがない時のシムの結果が 1 つも変わらないこと、同じ seed・同じ命令なら同じ結果になることも。画面は使わない。
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/sim/sim.js?v=30';
import * as M from '../js/sim/mission.js?v=10';
import * as R from '../js/sim/ride.js?v=3';
import * as P from '../js/sim/powersuit.js?v=1';
import { createRecorder, openReplay, makeStart, stringifyReplay, parseReplay } from '../js/sim/replay.js?v=17';
import { suitMenuState, suitActor, suitToggleWear, suitToggleRide } from '../js/ui/powersuit-menu.js?v=5';
import { tileCenter, nearestPassable } from '../js/sim/map.js?v=6';

const A = P.SUIT_TYPES.A;
const BASELINE = { 1: '6cc93eb6', 2: '2a60b985', 3: '24994a28', 4: '5558d677', 5: '6e46d4aa' }; // refs/baseline_300.json（v1.0.3）
const run = (sim, n) => S.runSim(sim, n);
const kind = (sim, k) => sim.units.find(u => u.side === 'ally' && u.kind === k);
const label = (sim, l) => sim.units.find(u => u.label === l);
const aliens = sim => sim.units.filter(u => u.side === 'enemy');
const suit = sim => sim.powersuit.suit;
const put = (u, x, y) => { u.x = x; u.y = y; u.anchor = { x, y }; };
/** 人間を、ほかの味方から離れた歩ける場所へ（押し合いで動かされない） */
const isolate = (sim, h) => { const p = nearestPassable(sim.map, 20, 44); put(h, tileCenter(p.tx), tileCenter(p.ty)); h.order = null; return h; };

/** 静かな場面: ?powersuit=1 のふつうのミッション。敵は全員のぞく（要る時だけ alien() で 1 体足す）。味方は動かない */
function quiet(opts = {}) {
  const sim = S.createSim({ seed: 1, mission: M.MISSION_1, powersuit: true, ...opts });
  sim.units = sim.units.filter(u => u.side === 'ally'); sim.groups = [];
  return sim;
}
/** 敵（異星生物）を 1 体、(x,y) に置く。もとの群れの 1 体を借りる（じっとしている: 巡回しない） */
function alien(sim0, x, y) {
  const probe = S.createSim({ seed: 1, mission: M.MISSION_1 });
  const a = probe.units.find(u => u.side === 'enemy'); a.id = 9000 + sim0.units.length; a.groupId = null; a.stance = 'hold'; a.order = null; a.cd = 0;
  put(a, x, y); sim0.units.push(a); return a;
}
const don = (sim, h) => { const r = P.issueDon(sim, h.id); run(sim, 1 + Math.ceil(P.POWERSUIT.donSec * 30)); return r; };
const wear = (sim, h) => { const r = don(sim, h); assert.ok(r.ok, r.reason); assert.equal(h.suitOn, true); };

test('表: 型の表 SUIT_TYPES は A だけ・HP70・小銃 W1-02 固定。数値は表から読む（後の章で B・C を足せる）', () => {
  assert.deepEqual(Object.keys(P.SUIT_TYPES), ['A']);
  assert.equal(A.hp, 70); assert.equal(A.weapon, 'W1-02'); assert.equal(S.weaponInfoById(A.weapon).row.name, 'AK型小銃');
  assert.ok(Object.isFrozen(P.SUIT_TYPES) && Object.isFrozen(A));
  for (const k of ['hp', 'armor', 'shieldHp', 'blockChance', 'wearMult', 'speed', 'gather', 'atk', 'cooldown', 'range', 'weapon']) assert.ok(A[k] != null, k);
  // 少年（HP30・速さ30・戦えない）より強く、PONCO（DPS 11.1）より弱い
  const dps = A.atk / A.cooldown; assert.ok(dps > 0 && dps < S.KINDS.ponco.atk / S.KINDS.ponco.cooldown, `DPS ${dps}`);
  assert.ok(A.speed < S.KINDS.boy.speed && A.speed > S.KINDS.ponco.speed && A.speed > S.KINDS.scav.speed);
  assert.equal(P.POWERSUIT.graceSec, 1.5);
  assert.deepEqual(P.POWERSUIT_COMMANDS, ['suitDon', 'suitDoff']);
});

test('フラグなしは今と同じ: hashSim が seed 1〜5 で 300 tick 後に基準のまま・sim.powersuit なし・スーツの欄が機体にない', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const sim = S.createSim({ seed, mission: M.MISSION_1 }); run(sim, 300);
    assert.equal(S.hashSim(sim), BASELINE[seed], `seed ${seed}`);
    assert.equal(sim.powersuit, undefined);
    for (const u of sim.units) for (const k of ['suitOn', 'suitBusy', 'suitGrace', 'suitSaved', 'suitGather']) assert.equal(u[k], undefined, k);
  }
  const off = S.createSim({ seed: 1, mission: M.MISSION_1, powersuit: false }); run(off, 300);
  assert.equal(S.hashSim(off), BASELINE[1]);
});

test('フラグありでも使わなければ、乱数も機体も今までどおり（スーツは hashSim の末尾に値が足されるだけ）', () => {
  const a = S.createSim({ seed: 3, mission: M.MISSION_1 }), b = S.createSim({ seed: 3, mission: M.MISSION_1, powersuit: true });
  run(a, 300); run(b, 300);
  assert.equal(b.rng.state(), a.rng.state(), '乱数を 1 回も多く引かない');
  assert.deepEqual(b.units.map(u => [u.id, u.x, u.y, u.hp]), a.units.map(u => [u.id, u.x, u.y, u.hp]));
  assert.notEqual(S.hashSim(b), S.hashSim(a), 'スーツ入りの局面は別のハッシュ（別ファイルの基準）');
  assert.equal(S.hashSimDeep(a), S.hashSimDeep(a));
});

test('?powersuit=1: 始めから少年が殻を 1 着持っている（着てはいない）・殻は世界に 1 着だけ', () => {
  const sim = S.createSim({ seed: 1, mission: M.MISSION_1, powersuit: true });
  const boy = kind(sim, 'boy'), st = P.suitStatus(sim);
  assert.equal(st.ownerId, boy.id); assert.equal(st.phase, 'off'); assert.equal(st.worn, false); assert.equal(st.hp, 70); assert.equal(st.maxHp, 70);
  assert.equal(st.wearable, true);
  assert.equal(Object.keys(sim.powersuit).join(), 'suit'); assert.ok(!Array.isArray(sim.powersuit.suit));
});

test('着る・脱ぐ: 1 秒で着て（その間は止まっていて人間のまま）、HP70・小銃・速さ26 になる。脱ぐと元の人間（HP30・武器なし・速さ30）に戻る', () => {
  const sim = quiet(), boy = kind(sim, 'boy'), before = { hp: boy.hp, atk: boy.atk, speed: boy.speed, range: boy.range, armor: boy.armor, shieldMax: boy.shieldMax };
  assert.equal(before.hp, 30);
  assert.deepEqual(P.issueDon(sim, boy.id), { ok: true, reason: null });
  run(sim, 15);
  assert.equal(boy.suitOn, undefined, '着る途中はまだ人間'); assert.equal(boy.suitBusy, true); assert.equal(P.suitStatus(sim).phase, 'donning');
  run(sim, 16);
  assert.equal(boy.suitOn, true); assert.equal(boy.hp, 70); assert.equal(boy.maxHp, 70); assert.equal(boy.atk, A.atk); assert.equal(boy.range, A.range); assert.equal(boy.speed, A.speed);
  assert.equal(boy.weapon, 'W1-02'); assert.equal(boy.armor, A.armor); assert.equal(boy.shieldMax, A.shieldHp); assert.equal(boy.shieldHp, A.shieldHp);
  assert.equal(S.unitWeaponInfo(boy).row.id, 'W1-02');
  assert.equal(sim.fx.some(f => f.type === 'suitOn'), true);
  // 脱ぐ
  assert.deepEqual(P.issueDoff(sim, boy.id), { ok: true, reason: null });
  run(sim, 32);
  assert.equal(boy.suitOn, undefined);
  for (const k of Object.keys(before)) assert.equal(boy[k], before[k], k);
  assert.equal(boy.weapon, undefined); assert.equal(boy.wmul, undefined); assert.equal(boy.suitSaved, undefined); assert.equal(boy.suitGather, undefined);
  assert.equal(P.suitStatus(sim).phase, 'off'); assert.equal(P.suitStatus(sim).ownerId, boy.id, '殻は持ち主の持ち物に残る');
  assert.equal(P.issueDoff(sim, boy.id).reason, 'notWearing');
});

test('決定1 枠: スーツは人間の枠（3）に数える。人間が 3 人の時に着ても 4 人目にならない・ロボの枠は使わない', () => {
  const m = { ...M.MISSION_1, ally: [...M.MISSION_1.ally.filter(a => a.kind !== 'girl'), { kind: 'girl', tx: 22, ty: 58 }, { kind: 'boy', tx: 16, ty: 58 }] };
  const sim = S.createSim({ seed: 1, mission: m, powersuit: true });
  const before = S.fieldCount(sim); assert.equal(before.humans, 3); assert.equal(before.robots, 12);
  const boy = kind(sim, 'boy'); sim.units = sim.units.filter(u => u.side === 'ally'); sim.groups = [];
  wear(sim, boy);
  const after = S.fieldCount(sim);
  assert.equal(after.humans, 3); assert.equal(after.robots, 12); assert.equal(after.ai, before.ai);
  assert.equal(S.canDeploy(sim, 'girl'), false, '人間は 4 人目を出せない');
  assert.equal(S.deployUnit(sim, 'boy', { tx: 10, ty: 58 }), null);
  assert.equal(S.slotCost('boy'), 0, 'ロボの枠は 0');
  assert.equal(S.KINDS.suit, undefined, 'スーツは KINDS（別の機体）ではない');
});

test('決定1 1度に1着: 着ている間・着る途中はほかの人が着られない。持ち主ではない人はそばにいる時だけ受け取って着られる', () => {
  const sim = quiet(), boy = kind(sim, 'boy'), girl = kind(sim, 'girl');
  assert.equal(P.canDon(sim, girl).reason, 'far', '離れている');
  put(girl, boy.x + 10, boy.y);
  assert.equal(P.canDon(sim, girl).ok, true, 'ミントも着られる作り');
  P.issueDon(sim, boy.id); run(sim, 5);
  assert.equal(P.canDon(sim, girl).reason, 'inUse');
  run(sim, 30); assert.equal(boy.suitOn, true);
  assert.equal(P.canDon(sim, girl).reason, 'inUse');
  assert.equal(P.issueDon(sim, girl.id).ok, false); assert.equal(sim.commands.length, 0);
  P.issueDoff(sim, boy.id); run(sim, 32);
  wear(sim, girl); // 脱いだあとはミントが着られる
  assert.equal(suit(sim).ownerId, girl.id); assert.equal(boy.suitOn, undefined); assert.equal(girl.hp, 70);
  assert.equal(sim.units.filter(u => u.suitOn).length, 1, '同時に着ているのは 1 人だけ');
});

test('決定1 ロウ: ロウ（KINDS にいない 狼）も人間として着られる', () => {
  const sim = quiet(), boy = kind(sim, 'boy');
  const wolf = { ...boy, id: 777, kind: 'wolf', label: 'ロウ', human: true }; sim.units.push(wolf); put(wolf, boy.x + 8, boy.y);
  assert.equal(P.canDon(sim, wolf).ok, true);
  wear(sim, wolf);
  assert.equal(wolf.hp, 70); assert.equal(S.unitWeaponInfo(wolf).row.id, 'W1-02');
  P.issueDoff(sim, wolf.id); run(sim, 32);
  assert.equal(wolf.hp, 30, '元の人間の HP に戻る'); assert.equal(wolf.weapon, undefined);
});

test('決定2 敵は着ている間は捕まえられない（人間は捕まる）', () => {
  const free = quiet(), b0 = isolate(free, kind(free, 'boy')); const a0 = alien(free, b0.x + 4, b0.y); a0.cd = 99;
  run(free, 3); assert.notEqual(b0.captured, null, '着ていない人間は捕まる（比べる相手）');
  const sim = quiet(), boy = isolate(sim, kind(sim, 'boy')); wear(sim, boy);
  const a = alien(sim, boy.x + 4, boy.y); a.cd = 99;
  run(sim, 120); assert.equal(boy.captured, null); assert.equal(a.carrying, null);
});

test('決定2 敵はスーツを撃つ。殻の HP は 70 で、中の人の HP（30）は減らない', () => {
  const sim = quiet(), boy = isolate(sim, kind(sim, 'boy')); wear(sim, boy);
  const a = alien(sim, boy.x + 20, boy.y);
  boy.order = null; boy.atk = 0; // 反撃で敵が倒れないよう、この確かめでは撃ち返さない
  let shot = null, target = null;
  for (let i = 0; i < 60 && !shot; i++) { S.stepSim(sim); target ??= a.targetId; shot = sim.fx.find(f => f.type === 'shot' && f.to === boy.id) || null; }
  assert.ok(shot, '殻が撃たれた'); assert.equal(target, boy.id, '敵はスーツを狙っている'); assert.equal(shot.from, a.id);
  assert.ok(boy.hp < 70 || boy.shieldHp < A.shieldHp);
  assert.equal(boy.maxHp, 70); assert.equal(suit(sim).bodyHp, 30, '中の人の HP は別にしまってある（減らない）');
  run(sim, 120); assert.ok(boy.hp < 70 || boy.shieldHp < A.shieldHp); assert.equal(suit(sim).bodyHp, 30);
  // 着ていない人間は撃たれない（今まで通り）
  const sim2 = quiet(), b2 = isolate(sim2, kind(sim2, 'boy')); const a2 = alien(sim2, b2.x + 30, b2.y); a2.cd = 0;
  run(sim2, 30); assert.equal(sim2.fx.some(f => f.type === 'shot' && f.to === b2.id), false);
});

test('決定2 着ていると撃てる（小銃）: 敵に当たる・戦闘移動でも撃つ。人間のままは撃てない', () => {
  const sim = quiet(), boy = isolate(sim, kind(sim, 'boy')); wear(sim, boy);
  const a = alien(sim, boy.x + 80, boy.y); const hp0 = a.hp; a.cd = 99; // 敵は撃たない（こちらの攻撃だけを見る）
  run(sim, 90);
  assert.ok(a.hp < hp0, `敵の HP ${hp0} → ${a.hp}`); assert.equal(boy.targetId, a.id);
  assert.ok(sim.fx.some(f => f.type === 'shot' && f.from === boy.id && f.weapon === 'W1-02'));
  const sim2 = quiet(), b2 = isolate(sim2, kind(sim2, 'boy')); const a2 = alien(sim2, b2.x + 40, b2.y); a2.cd = 99; const h2 = a2.hp;
  run(sim2, 90); assert.equal(a2.hp, h2, '人間のままは撃てない');
  // 戦闘移動（fight）中も撃つ。スーツでなければ noFight で撃たない
  const sim3 = quiet(), b3 = isolate(sim3, kind(sim3, 'boy')); wear(sim3, b3); const a3 = alien(sim3, b3.x + 60, b3.y - 10); a3.cd = 99;
  S.issueOrder(sim3, b3.id, [{ tx: Math.floor(b3.x / 32) - 6, ty: Math.floor(b3.y / 32) }]); run(sim3, 40);
  assert.equal(S.isPassive(b3), false); assert.ok(sim3.fx.some(f => f.type === 'shot' && f.from === b3.id) || a3.hp < S.KINDS.alien.hp);
});

test('決定3 壊れたら脱げて人間に戻る・殻は壊れた殻として持ち主に残る・最後の一撃のあまりは捨てる', () => {
  const sim = quiet(), boy = isolate(sim, kind(sim, 'boy')); wear(sim, boy);
  const a = alien(sim, boy.x + 20, boy.y);
  boy.shieldHp = 0; boy.hp = 1; boy.atk = 0; // 次の一撃で壊れる
  let broke = false;
  for (let i = 0; i < 60 && !broke; i++) { S.stepSim(sim); broke = sim.fx.some(f => f.type === 'suitBreak'); }
  assert.ok(broke, '壊れて脱げた（suitBreak）');
  assert.equal(boy.suitOn, undefined, '脱げた'); assert.equal(boy.hp, 30, '人間の HP に戻る（あまりは捨てる）'); assert.equal(boy.maxHp, 30); assert.equal(boy.captured, null);
  const st = P.suitStatus(sim);
  assert.equal(st.broken, true); assert.equal(st.hp, 0); assert.equal(st.phase, 'off'); assert.equal(st.ownerId, boy.id);
  assert.equal(boy.weapon, undefined); assert.equal(boy.atk, 0);
  assert.ok(sim.units.includes(boy), '人は倒れていない');
  assert.equal(P.canDon(sim, boy).reason, 'broken', '壊れた殻は着られない');
  assert.equal(a.hp > 0, true);
});

test('決定3 脱げて 1.5 秒は捕まらない・そのあとは捕まる', () => {
  const sim = quiet(), boy = isolate(sim, kind(sim, 'boy')); wear(sim, boy);
  const a = alien(sim, boy.x + 6, boy.y); a.cd = 0;
  boy.shieldHp = 0; boy.hp = 1; boy.atk = 0;
  let broke = -1;
  for (let i = 0; i < 400 && boy.captured == null; i++) {
    S.stepSim(sim);
    if (broke < 0 && boy.suitOn == null) broke = sim.tick;
    if (broke >= 0) put(a, boy.x + 6, boy.y); // 敵は人間のそばにいる（脱げたあと、押し戻された分だけ寄る）
    if (broke >= 0 && sim.time < boy.suitGrace - 1e-9) assert.equal(boy.captured, null, `猶予の間（tick ${sim.tick}）は捕まらない`);
  }
  assert.ok(broke > 0, '脱げた');
  assert.notEqual(boy.captured, null, 'そのあとは捕まる');
  assert.ok(sim.time >= boy.suitGrace - 1e-9, '捕まったのは猶予が切れてから');
  assert.ok(sim.time - (broke / 30) >= 1.5 - 1 / 30 - 1e-6, `脱げてから ${(sim.time - broke / 30).toFixed(2)} 秒で捕まった`);
});

test('決定3 直す: 拠点（仮: 資材の届け先）かリペアラーのそばでだけ。修理キットの拾い物では直らない', () => {
  const sim = quiet(), boy = isolate(sim, kind(sim, 'boy')); wear(sim, boy);
  boy.shieldHp = 0; boy.hp = 1; boy.atk = 0;
  const a = alien(sim, boy.x + 20, boy.y); run(sim, 60); // 壊す
  sim.units = sim.units.filter(u => u !== a);
  assert.equal(P.suitStatus(sim).broken, true);
  // どこでもない場所では直らない
  run(sim, 300); assert.equal(P.suitStatus(sim).hp, 0); assert.equal(P.suitStatus(sim).repairing, null);
  // 落ちている修理キットを踏んでも、殻は直らない（人間は満タンなので拾いもしない）
  sim.items.push({ id: 1, type: 'repair', x: boy.x, y: boy.y, t: sim.time }); run(sim, 30); assert.equal(P.suitStatus(sim).hp, 0);
  // 拠点（資材の届け先）のそば
  const ex = sim.mission.extraction; put(boy, tileCenter(ex.tx), tileCenter(ex.ty));
  run(sim, 30); assert.equal(P.suitStatus(sim).repairing, 'base'); assert.ok(P.suitStatus(sim).hp > 0);
  assert.equal(P.canDon(sim, boy).reason, 'broken', 'すこし直っただけでは着られない（30% まで）');
  run(sim, 120); // 計 5 秒ほど
  assert.equal(P.canDon(sim, boy).ok, true, '30% を超えたら着られる');
  assert.ok(sim.fx.some(f => f.type === 'suitFixed') || P.suitStatus(sim).hp > 21);
  run(sim, 30 * 10); assert.equal(P.suitStatus(sim).hp, 70); assert.equal(P.suitStatus(sim).broken, false);
  assert.ok(sim.fx.length >= 0);
});

test('決定3 リペアラー（兵種 repairer）のそばでも直る。拠点より遅い・リペアラーがいなければ直らない', () => {
  const mk = () => { const sim = quiet(), boy = kind(sim, 'boy'); suit(sim).hp = 0; suit(sim).broken = true; return { sim, boy }; };
  const { sim, boy } = mk();
  const rep = sim.units.find(u => u.cls === 'repairer'); assert.ok(rep, 'MISSION_1 にリペアラーがいる');
  put(boy, rep.x + 20, rep.y); run(sim, 60);
  assert.equal(P.suitStatus(sim).repairing, 'repairer'); const h1 = P.suitStatus(sim).hp; assert.ok(h1 > 0);
  const { sim: s2, boy: b2 } = mk(); const ex = s2.mission.extraction; put(b2, tileCenter(ex.tx), tileCenter(ex.ty)); run(s2, 60);
  assert.ok(P.suitStatus(s2).hp > h1, '拠点のほうが速い');
  // リペアラーも拠点もない所では直らない
  const { sim: s3, boy: b3 } = mk(); isolate(s3, b3); run(s3, 90);
  assert.equal(P.suitStatus(s3).hp, 0);
  // 着ている間も、傷んだ殻は拠点・リペアラーのそばで直る
  const s4 = quiet(), b4 = kind(s4, 'boy'); wear(s4, b4); b4.hp = 20; const e4 = s4.mission.extraction; put(b4, tileCenter(e4.tx), tileCenter(e4.ty)); run(s4, 60);
  assert.ok(b4.hp > 20 && b4.hp <= 70);
});

test('決定3 着ている間は修理キット・武器の拾い物を拾わない（殻は直らない・小銃は付けかえられない）', () => {
  const sim = quiet(), boy = kind(sim, 'boy'); wear(sim, boy); boy.hp = 30;
  sim.items.push({ id: 1, type: 'repair', x: boy.x, y: boy.y, t: sim.time });
  sim.items.push({ id: 2, type: 'weapon', weapon: 'W1-05', x: boy.x, y: boy.y, t: sim.time });
  run(sim, 30);
  assert.equal(boy.hp, 30); assert.equal(boy.weapon, 'W1-02'); assert.equal(sim.items.length, 2, '拾われない'); assert.equal(boy.wmul, 1);
});

test('決定6 ロボに乗る: 着たままでは乗れない（☰ にも「乗る」が出ない）・脱げば乗れる', () => {
  const sim = quiet(), boy = kind(sim, 'boy'), neji = kind(sim, 'scav');
  put(boy, neji.x + 12, neji.y + 4);
  assert.equal(R.canBoard(sim, boy, neji, 'back').ok, true, '着ていなければ乗れる（比べる）');
  assert.equal(suitMenuState(sim, boy).ride.show, true);
  wear(sim, boy);
  assert.deepEqual(R.canBoard(sim, boy, neji, 'back'), { ok: false, reason: 'suited' });
  assert.equal(R.issueBoard(sim, boy.id, neji.id, 'back').ok, false); assert.equal(sim.ride, undefined);
  const m = suitMenuState(sim, boy);
  assert.equal(m.ride.show, false, '☰ に乗るが出ない'); assert.equal(m.ride.on, false); assert.equal(m.don.text, 'スーツを脱ぐ');
  assert.equal(suitToggleRide(sim, boy).ok, false);
  assert.equal(R.RIDE_MESSAGES.suited, 'スーツを脱いでから乗ろう');
  // 脱いでいる途中も乗れない。脱ぎ終わると乗れる
  P.issueDoff(sim, boy.id); run(sim, 5);
  assert.equal(R.canBoard(sim, boy, neji, 'back').reason, 'suited'); assert.equal(suitMenuState(sim, boy).ride.show, false);
  run(sim, 30);
  assert.equal(R.canBoard(sim, boy, neji, 'back').ok, true);
  const res = suitToggleRide(sim, boy); assert.equal(res.ok, true); run(sim, 40);
  assert.ok(boy.ride && boy.ride.phase === 'on', '背中に乗った');
  // 乗っている間は着られない
  assert.equal(P.canDon(sim, boy).reason, 'riding');
});

test('決定7 武器は AK 型小銃 1 種で固定: 着ている間は W1-02 のまま・脱ぐと武器なし。付けかえの手段（拾う）が効かない', () => {
  const sim = quiet(), boy = kind(sim, 'boy'); wear(sim, boy);
  assert.equal(boy.weapon, 'W1-02');
  run(sim, 60); assert.equal(boy.weapon, 'W1-02');
  assert.equal(S.unitWeaponInfo(boy).row.id, 'W1-02');
  assert.equal(Object.keys(P.SUIT_TYPES).map(k => P.SUIT_TYPES[k].weapon).filter((w, i, a) => a.indexOf(w) === i).length, 1);
});

test('決定5 顔は閉じた仮面: スーツの見た目は仮面（顔を描かない）。絵は新しく作らず、コードで描く', async () => {
  const fs = await import('node:fs'); const url = new URL('../js/render/powersuit-view.js', import.meta.url);
  const src = fs.readFileSync(url, 'utf8');
  assert.match(src, /閉じた仮面/); assert.doesNotMatch(src, /\.(png|webp|jpg|svg)/);
});

test('決定8 型: 数値は SUIT_TYPES（型の表）から読む。着る時の値は表と同じ', () => {
  const sim = quiet(), boy = kind(sim, 'boy'); suit(sim).type = 'A'; wear(sim, boy);
  for (const [k, v] of [['maxHp', A.hp], ['atk', A.atk], ['range', A.range], ['cooldown', A.cooldown], ['speed', A.speed], ['armor', A.armor], ['shieldMax', A.shieldHp], ['shieldBlock', A.blockChance], ['suitGather', A.gather]]) assert.equal(boy[k], v, k);
  assert.equal(P.suitStatus(sim).maxHp, A.hp); assert.equal(P.suitStatus(sim).name, 'スーツ A');
});

test('スカベンジング: 着ている間は集める量が 0.15/秒（少年 0.2 の 75%）・歩く速さ 26', () => {
  const sim = quiet(), boy = kind(sim, 'boy'); wear(sim, boy);
  const pile = sim.mission.salvage[0]; put(boy, tileCenter(pile.tx), tileCenter(pile.ty)); boy.order = null;
  run(sim, 60); // 2 秒
  assert.ok(Math.abs(boy.cargo - 0.15 * 2) < 1e-6, `2 秒で ${boy.cargo}`);
  const b2 = quiet(), boy2 = kind(b2, 'boy'); const p2 = b2.mission.salvage[0]; put(boy2, tileCenter(p2.tx), tileCenter(p2.ty)); boy2.order = null; run(b2, 60);
  assert.ok(Math.abs(boy2.cargo - 0.2 * 2) < 1e-6, '人間のままは 0.2/秒'); assert.ok(boy.cargo < boy2.cargo);
});

test('リプレイ: 同じ seed・同じ命令なら同じ結果。着る・脱ぐの命令も記録され、再生でハッシュが一致する', () => {
  const play = () => {
    const sim = S.createSim({ seed: 2, mission: M.MISSION_1, powersuit: true });
    const rec = createRecorder(sim, makeStart({ seed: 2, mission: M.MISSION_1, powersuit: true }));
    const boy = kind(sim, 'boy');
    const script = { 5: () => P.issueDon(sim, boy.id), 60: () => S.issueOrder(sim, [boy.id], [{ tx: 18, ty: 50 }]), 200: () => P.issueDoff(sim, boy.id) };
    for (let i = 0; i < 400; i++) { script[i]?.(); rec.step(); }
    return { sim, rec: rec.snapshot() };
  };
  const a = play(), b = play();
  assert.equal(S.hashSim(a.sim), S.hashSim(b.sim)); assert.equal(S.hashSimDeep(a.sim), S.hashSimDeep(b.sim));
  assert.equal(a.rec.start.powersuit, true);
  assert.ok(a.rec.cmds.some(c => c[2].some(p => p[0] === '?' && p[1].type === 'suitDon')), '着る命令が記録に残る');
  const text = stringifyReplay(a.rec); assert.equal(parseReplay(text).ok, true);
  const op = openReplay(text); assert.equal(op.ok, true);
  const rep = op.player.runAll(); assert.equal(rep.match, true, JSON.stringify(rep.first));
  assert.equal(S.hashSim(op.sim), S.hashSim(a.sim));
  // ふつうの記録の start には powersuit の欄が足されない
  assert.equal('powersuit' in makeStart({ seed: 1 }), false);
});

test('☰ の項目: 選んでいる人間を優先・選んでいなければ持っている人。状態の文字・押せるか', () => {
  const sim = quiet(), boy = kind(sim, 'boy'), girl = kind(sim, 'girl');
  assert.equal(suitActor(sim, []).id, boy.id); assert.equal(suitActor(sim, [girl.id]).id, girl.id);
  let m = suitMenuState(sim, boy);
  assert.equal(m.don.text, 'スーツを着る'); assert.equal(m.don.on, true); assert.match(m.status, /スーツ A　HP 70／70/);
  assert.equal(suitMenuState(sim, girl).don.on, false); assert.equal(suitMenuState(sim, girl).don.why, 'スーツを持っている人のそばへ行こう');
  assert.equal(suitToggleWear(sim, boy).ok, true); run(sim, 40);
  m = suitMenuState(sim, boy); assert.equal(m.don.text, 'スーツを脱ぐ'); assert.match(m.status, /着ている/);
  // 画面の文字はやさしい日本語（ひらがな・かな・漢字・記号のみ。英字の説明文を出さない）
  for (const s of Object.values(P.SUIT_MESSAGES)) assert.doesNotMatch(s, /[A-Za-z]{4,}/);
});
