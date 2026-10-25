// 武器庫（js/armory/loadout.js）: 枠の数・入れてよい物・兵種に向く物の絞り込み・出撃の時の反映。装備を選ばない時はシムが1つも変わらない。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BODY_OF_KIND, bodyOf, slotCounts, slotAccepts, isBackItem, classFits, candidates, simEffect, emptyEntry, entryIsEmpty, normalizeEntry, setSlot, toggleSlot,
  attachIt01, buildRoster, sanitizeLoadout, applyLoadout,
} from '../js/armory/loadout.js?v=4';
import { WEAPONS, weaponById } from '../js/sim/weapons.js?v=5';
import { weaponMul, WEAPON_DROP } from '../js/sim/cover.js?v=6';
import { createSim, runSim, hashSim, KINDS, UNIT_CLASSES } from '../js/sim/sim.js?v=23';
import { MISSION_1 } from '../js/sim/mission.js?v=10';

const HERE = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(HERE, '../assets/weapons/armory-data.json'), 'utf8'));
const roster = buildRoster(MISSION_1, KINDS);
const row = id => data.weapons.find(r => r.id === id);
const mk = loadout => createSim({ seed: 1, mission: MISSION_1, loadout });
const unitBy = (sim, label) => sim.units.find(u => u.label === label);

test('資料: 武器の表が68件あり、シムの表（weapons.js）と同じ値を持つ', () => {
  assert.equal(data.weapons.length, 68);
  for (const w of WEAPONS) {
    const r = row(w.id);
    assert.ok(r, w.id);
    for (const k of ['stage', 'type', 'tier', 'motion_s', 'pellets', 'splash', 'slot']) assert.equal(r[k], w[k], `${w.id}.${k}`);
  }
  assert.equal(data.SLOT_EXPANDER.id, 'IT-01');
  assert.equal(data.SLOT_EXPANDER.maxPerBody, 1);
});

test('枠の数: 体の大きさごと（roster 7-2-1）・IT-01 で武器の枠が1つ増える（1個まで）', () => {
  const want = { kai0: [1, 0, 1], small: [1, 0, 1], mid: [2, 0, 1], large: [2, 1, 2], giant: [3, 0, 2] }; // [手などの武器, 背中, 修理/バリア]
  for (const [body, [w, b, s]] of Object.entries(want)) {
    assert.deepEqual(slotCounts(data, body), { weapon: w, back: b, support: s, total: w + b }, body);
    assert.deepEqual(slotCounts(data, body, 1), { weapon: w + 1, back: b, support: s, total: w + b + 1 }, `${body} + IT-01`);
    assert.equal(slotCounts(data, body, 2).weapon, w + 1, `${body}: IT-01 は1個まで`);
  }
  assert.equal(slotCounts(data, 'large').total, 3, '全高4m以上は 2＋背中1');
  assert.throws(() => slotCounts(data, 'nothing'));
});

test('機体の体の大きさ: PONCO02 は mid（2〜4m）・ツギハギ号は kai0。人間は一覧に出ない', () => {
  assert.equal(BODY_OF_KIND.ponco, 'mid');
  assert.equal(BODY_OF_KIND.scav, 'kai0');
  assert.equal(bodyOf('somethingNew'), 'small');
  assert.equal(roster.length, 12);
  assert.deepEqual(roster.map(r => r.label), [...Array.from({ length: 4 }, (_, i) => `ツギハギ${i + 1}`), ...Array.from({ length: 8 }, (_, i) => `PONCO${i + 1}`)]);
  assert.equal(roster.filter(r => r.kind === 'ponco' && slotCounts(data, r.body).weapon === 2).length, 8);
  assert.equal(roster.filter(r => r.kind === 'scav' && slotCounts(data, r.body).weapon === 1).length, 4);
  assert.equal(roster.filter(r => r.cls === 'repairer').length, 1);
  assert.equal(roster.filter(r => r.cls === 'supporter').length, 1);
  assert.equal(roster.filter(r => r.cls === 'gunner').length, 6);
  assert.equal(roster.filter(r => r.cls === 'scavenger').length, 4);
});

test('一覧の名前は、シムが機体に付ける名前（label）と同じ', () => {
  const sim = mk();
  const names = sim.units.filter(u => u.side === 'ally' && !u.human).map(u => u.label);
  assert.deepEqual(roster.map(r => r.label).sort(), names.slice().sort());
  for (const r of roster) assert.equal(unitBy(sim, r.label).kind, r.kind);
  for (const r of roster) assert.equal(unitBy(sim, r.label).cls, r.cls);
});

test('入れてよい物: 武器の枠は slot weapon・修理/バリアの枠は slot support・罠(carry)と素手(default)はどこにも入らない', () => {
  for (const r of data.weapons) {
    const ok = ['weapon', 'back', 'support'].filter(k => slotAccepts(r, k));
    if (r.slot === 'carry' || r.slot === 'default') assert.deepEqual(ok, [], r.id);
    else assert.equal(ok.length, 1, `${r.id} はちょうど1種類の枠に入る`);
    if (r.slot === 'support') assert.deepEqual(ok, ['support'], r.id);
  }
  assert.equal(data.weapons.filter(r => r.slot === 'carry').length, 3);
  assert.equal(slotAccepts(null, 'weapon'), false);
  assert.equal(slotAccepts(row('W1-02'), 'nothing'), false);
});

test('背中の枠は大物だけ（武器の枠で、付く場所が背中、大きさが L か XL）', () => {
  const back = data.weapons.filter(isBackItem).map(r => r.id).sort();
  assert.deepEqual(back, ['W3-04', 'W3-10', 'W3-14', 'W3-16', 'W4-03', 'W4-04']);
  assert.equal(slotAccepts(row('W3-10'), 'back'), true);
  assert.equal(slotAccepts(row('W3-10'), 'weapon'), false);
  assert.equal(slotAccepts(row('W1-12'), 'weapon'), true, '背中でも中くらいの物(M)は手などの枠');
  assert.equal(slotAccepts(row('W1-12'), 'back'), false);
});

test('兵種に向く物: classes の値（ALL はみな向く）・リペアラーとサポーターは【仮】の決め方', () => {
  assert.equal(classFits(row('W1-02'), 'gunner'), true);       // ROOKIE + GUNNER
  assert.equal(classFits(row('W1-02'), 'scavenger'), false);
  assert.equal(classFits(row('W1-01'), 'scavenger'), true);    // ROOKIE + SCOUT + SCAVENGER
  assert.equal(classFits(row('W2-01'), 'stealth'), true);      // ALL
  assert.equal(classFits(row('W2-01'), 'repairer'), true);
  assert.equal(classFits(row('WB1-03'), 'supporter'), true);   // バリアはサポーター
  assert.equal(classFits(row('WB1-03'), 'gunner'), false);
  assert.equal(classFits(row('WB1-01'), 'gunner'), true);      // 機動隊の盾は GUNNER + SUPPORT
  assert.equal(classFits(row('W1-11'), 'supporter'), false, '修理はリペアラーへ移った');
  assert.equal(classFits(row('W1-11'), 'repairer'), true);
  assert.equal(classFits(row('WR3-01'), 'repairer'), true);
  assert.equal(classFits(row('WR4-01'), 'repairer'), false, '巨大機専用の修理は除く');
  assert.equal(classFits(row('WB1-03'), 'repairer'), false, 'バリアはサポーターに残す');
  assert.equal(classFits(row('W1-02'), 'repairer'), true, 'ROOKIE の物は向く');
  assert.equal(classFits(row('W1-04'), 'repairer'), false);
  assert.equal(classFits(null, 'gunner'), false);
  // 兵種のキーは UNIT_CLASSES にある物だけ
  for (const c of UNIT_CLASSES) assert.equal(typeof classFits(row('W1-02'), c.key), 'boolean');
});

test('候補の一覧: 枠に入る物だけ・向く物で絞れる・種類と段階でも絞れる・並びはいつも同じ', () => {
  const all = candidates(data, { slotKind: 'weapon', cls: 'gunner', classOnly: false });
  const gun = candidates(data, { slotKind: 'weapon', cls: 'gunner', classOnly: true });
  assert.ok(all.length > gun.length && gun.length > 0);
  assert.ok(gun.every(r => classFits(r, 'gunner') && r.slot === 'weapon'));
  assert.ok(all.every(r => r.slot === 'weapon' && !isBackItem(r)));
  assert.equal(all.length, data.weapons.filter(r => r.slot === 'weapon' && !isBackItem(r)).length);
  assert.deepEqual(gun.map(r => r.id), candidates(data, { slotKind: 'weapon', cls: 'gunner' }).map(r => r.id), '既定は向く物だけ');
  for (let i = 1; i < all.length; i++) assert.ok(all[i - 1].stage < all[i].stage || (all[i - 1].stage === all[i].stage && all[i - 1].tier <= all[i].tier));
  const sh = candidates(data, { slotKind: 'weapon', cls: 'gunner', classOnly: false, type: 'shoot' });
  assert.ok(sh.length > 0 && sh.every(r => r.type === 'shoot'));
  const s1 = candidates(data, { slotKind: 'weapon', cls: 'gunner', classOnly: false, stage: 1 });
  assert.ok(s1.length > 0 && s1.every(r => r.stage === 1));
  const sup = candidates(data, { slotKind: 'support', cls: 'repairer' });
  assert.ok(sup.length > 0 && sup.every(r => r.type === 'repair'));
  const sup2 = candidates(data, { slotKind: 'support', cls: 'supporter' });
  assert.ok(sup2.length > 0 && sup2.every(r => r.type === 'barrier'));
  assert.deepEqual(candidates(data, { slotKind: 'back', cls: 'gunner', classOnly: false }).map(r => r.id).sort(), ['W3-04', 'W3-10', 'W3-14', 'W3-16', 'W4-03', 'W4-04']);
});

test('1機の装備: 付ける・同じ物をもう一度で外す・枠の数に合わせて整える', () => {
  let e = normalizeEntry(data, 'mid', emptyEntry());
  assert.deepEqual(e, { weapon: [null, null], back: [], support: [null], it01: 0 });
  assert.equal(entryIsEmpty(e), true);
  e = setSlot(e, 'weapon', 0, 'W1-02');
  assert.equal(e.weapon[0], 'W1-02');
  assert.equal(entryIsEmpty(e), false);
  assert.equal(toggleSlot(e, 'weapon', 0, 'W1-02').weapon[0], null);
  assert.equal(toggleSlot(e, 'weapon', 0, 'W1-04').weapon[0], 'W1-04');
  // 元の entry は変えない
  assert.equal(e.weapon[0], 'W1-02');
  // 枠に入らない物・多い分・ない id は捨てる
  const n = normalizeEntry(data, 'kai0', { weapon: ['W1-10', 'W1-02'], back: ['W3-10'], support: ['W1-02', 'WB1-03'] });
  assert.deepEqual(n, { weapon: [null], back: [], support: [null], it01: 0 });
  assert.deepEqual(normalizeEntry(data, 'mid', { weapon: ['ZZZ', 'W1-03'] }).weapon, [null, 'W1-03']);
});

test('IT-01: 持っている時だけ付けられ、1機に1個まで、付けたら外せない（武器の枠が1つ増える）', () => {
  const e0 = normalizeEntry(data, 'mid', emptyEntry());
  assert.equal(attachIt01(data, 'mid', e0, 0), null, '持っていない');
  const e1 = attachIt01(data, 'mid', e0, 1);
  assert.equal(e1.it01, 1);
  assert.equal(e1.weapon.length, 3);
  assert.equal(attachIt01(data, 'mid', e1, 1), null, '2個目は付けない');
  // 外す手段がない: normalize しても it01 は残る
  assert.equal(normalizeEntry(data, 'mid', setSlot(e1, 'weapon', 2, 'W1-02')).it01, 1);
  assert.equal(entryIsEmpty(e1), false, 'IT-01 だけでも「空」ではない');
});

test('出撃の反映: 1つ目の武器が u.weapon に入り、u.wmul は weaponMul と同じ', () => {
  const sim = mk({ PONCO1: { weapon: ['W1-04', 'W1-05'], back: [], support: ['WB1-01'], it01: 0 } });
  const u = unitBy(sim, 'PONCO1');
  const w = weaponById('W1-04');
  assert.equal(u.weapon, 'W1-04');
  assert.equal(u.wmul, weaponMul(u.kind, w));
  assert.ok(u.wmul >= 1);
  // 選んだ装備は u.loadout にもしまう（2つ目の武器・修理/バリアの道具は u.loadoutFx で戦闘に効く。tests/loadout-effects.test.mjs）
  assert.deepEqual(u.loadout, { weapon: ['W1-04', 'W1-05'], back: [], support: ['WB1-01'], it01: 0 });
  assert.equal(u.loadoutFx.guns.length, 1);
  // ほかの機体は変わらない
  const base = mk();
  for (const v of sim.units) if (v.label !== 'PONCO1') {
    assert.equal(v.weapon, undefined, v.label);
    assert.equal(v.loadout, undefined, v.label);
    assert.deepEqual(Object.keys(v), Object.keys(unitBy(base, v.label)), v.label);
  }
});

test('出撃の反映: シムが持てない type は入らない（ツギハギ号は何も持てない・近接や妨害は PONCO も持てない）', () => {
  assert.equal(WEAPON_DROP.accepts.scav, undefined);
  const sim = mk({ 'ツギハギ1': { weapon: ['W1-04'], back: [], support: [], it01: 0 }, PONCO2: { weapon: ['W1-07'] }, PONCO3: { weapon: ['W1-12'] } });
  const t = unitBy(sim, 'ツギハギ1');
  assert.equal(t.weapon, undefined);
  assert.equal(t.wmul, undefined);
  assert.deepEqual(t.loadout.weapon, ['W1-04'], '選んだ物は u.loadout にしまう（効かない）');
  assert.equal(t.loadoutFx, undefined, '効く物がないので戦闘の効き目も付かない');
  assert.equal(unitBy(sim, 'PONCO2').weapon, undefined, '近接');
  assert.equal(unitBy(sim, 'PONCO3').weapon, undefined, '妨害');
  assert.equal(simEffect('scav', row('W1-04'), 'weapon', 0), 'noEffect');
  assert.equal(simEffect('ponco', row('W1-04'), 'weapon', 0), 'active');
  assert.equal(simEffect('ponco', row('W1-07'), 'weapon', 0), 'noEffect');
  // 2つ目以降・背中・修理/バリアも、持てる物なら効く（loadout-effects.js）。持てない type は効かない
  assert.equal(simEffect('ponco', row('W1-04'), 'weapon', 1), 'active');
  assert.equal(simEffect('ponco', row('W1-07'), 'weapon', 1), 'noEffect', '近接は PONCO も持てない');
  assert.equal(simEffect('scav', row('W1-04'), 'weapon', 1), 'noEffect');
  assert.equal(simEffect('ponco', row('W3-04'), 'back', 0), 'active');
  assert.equal(simEffect('ponco', row('WB1-01'), 'support', 0), 'active');
  assert.equal(simEffect('scav', row('W1-11'), 'support', 0), 'active', '修理・バリアはツギハギ号でも効く');
  assert.equal(simEffect('ponco', row('W1-04'), 'support', 0), 'noEffect', '武器は修理/バリアの枠では効かない');
  assert.equal(simEffect('ponco', row('W1-04'), 'nothing', 0), 'stored');
});

test('出撃の反映: 1つ目の枠が空なら（2つ目だけ入れていても）武器は変えない。支援の道具を1つ目に入れても反映しない', () => {
  const sim = mk({ PONCO1: { weapon: [null, 'W1-04'] }, PONCO2: { weapon: ['WB1-01'] } });
  assert.equal(unitBy(sim, 'PONCO1').weapon, undefined);
  assert.deepEqual(unitBy(sim, 'PONCO1').loadout.weapon, [null, 'W1-04']);
  assert.equal(unitBy(sim, 'PONCO2').weapon, undefined);
});

test('変わらないこと: loadout を省いた時・null・空・空の entry で、300ステップ後のハッシュが同じ（機体にプロパティも増えない）', () => {
  const run = loadout => { const s = mk(loadout); runSim(s, 300); return s; };
  const base = run(undefined);
  const h = hashSim(base);
  for (const lo of [null, {}, { PONCO1: emptyEntry() }, { PONCO1: { weapon: [null, null], back: [], support: [null], it01: 0 } }, { 'いない機体': { weapon: ['W1-04'] } }]) {
    const s = run(lo);
    assert.equal(hashSim(s), h, JSON.stringify(lo));
    for (const u of s.units) assert.equal(u.loadout, undefined);
  }
  // 省いた時と空の時で、機体のプロパティ名が同じ
  const a = mk(), b = mk({});
  assert.deepEqual(a.units.map(u => Object.keys(u)), b.units.map(u => Object.keys(u)));
  assert.equal(a.rng.state(), b.rng.state(), '乱数を引かない');
  // 空の entry だけ渡した createSim は、applyLoadout 単体でも何もしない
  const s2 = mk(); const before = JSON.stringify(s2.units);
  applyLoadout(s2, undefined); applyLoadout(s2, {}); applyLoadout(s2, { PONCO1: emptyEntry() });
  assert.equal(JSON.stringify(s2.units), before);
});

test('装備を選ぶと（反映される武器があれば）ハッシュは変わり、同じ装備なら毎回同じ', () => {
  const lo = { PONCO1: { weapon: ['W1-04', null], back: [], support: [null], it01: 0 } };
  const run = loadout => { const s = mk(loadout); runSim(s, 120); return hashSim(s); };
  assert.equal(run(lo), run(lo));
  assert.notEqual(run(lo), run());
  // 効かない装備（武器を持てないツギハギ号の武器・PONCO が持てない近接・妨害）はハッシュに混ざらない
  const stored = { 'ツギハギ1': { weapon: ['W1-04'] }, PONCO2: { weapon: [null, 'W1-07'] }, PONCO3: { weapon: [null, 'W1-12'] } };
  assert.equal(run(stored), run());
});

test('保存してあった物の読みこみ: 一覧にない機体・こわれた中身は何も付けていないことにする', () => {
  assert.deepEqual(sanitizeLoadout(data, roster, null), {});
  assert.deepEqual(sanitizeLoadout(data, roster, 'x'), {});
  assert.deepEqual(sanitizeLoadout(data, roster, { PONCO1: 5, 'ふめい': { weapon: ['W1-02'] } }), {});
  const ok = sanitizeLoadout(data, roster, { PONCO1: { weapon: ['W1-02', 'nope', 'W1-04'], support: ['WB1-03'] }, PONCO2: emptyEntry() });
  assert.deepEqual(Object.keys(ok), ['PONCO1']);
  assert.deepEqual(ok.PONCO1, { weapon: ['W1-02', null], back: [], support: ['WB1-03'], it01: 0 });
});
