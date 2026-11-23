// ABYSS DIVE — 追加兵装（通常/反射レーザー・反射魚雷・全自動近接・回収からの恒久解放・指定開発・段階強化）
// v1.16.0: 純粋ルール・テスト。範囲は数値と状態機械（描画・DOM・本編の敵/地形データには触れない）。
//          実ブラウザでの実射・近接・基地 UI は別途（WORK_REPORT 参照）。

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SHOT_ORDER, SHOT_WEAPONS, shotDef, isAdvancedShot,
  SHOT_STATS, initialShot, shotParams, itemCount, itemPattern,
  TRAIT_ORDER, TRAIT_COMPAT, traitOptions, traitCompatible, optionLabel,
  designCost, DESIGN_BASE_COST, traitCost, designCats,
  rollAdvanced, designRoll, createAdvancedStore, createForgePanel, buildGeometry, fireBeam,
  SHOT_PER_SHELL, shotPerShell,
  ARMORY_TYPES, TRAIT_TYPES, isArmoryType, traitTypeName,
  ADV_ENHANCE_MAX, advEnhanceCost, advEnhanceInfo, advItemLabel,
  MELEE_ENHANCE_MAX, MELEE_ENHANCE_COST,
} from '../js/advanced-weapons.js';

import { fireLaser, advanceProjectile, MAX_REFLECT } from '../js/reflect-rules.js';
import { createMelee, meleeParams, MELEE_ORDER } from '../js/melee-rules.js';
import { createArsenalStore, designItem, rollItem, ARSENAL_CAP } from '../js/weapon-rules.js';

/* 決定的な乱数（0..1 を順に返す）。 */
function seq(vals){
  let i = 0;
  return () => vals[(i++) % vals.length];
}
const mid = () => 0.5;

/* -------------------------------------------------------------------------- */
test('撃つ枠: 4 種（魚雷＋レーザー3種）。反射レーザーは maxReflect=1、通常は 0', () => {
  assert.deepEqual(SHOT_ORDER, ['torpedo', 'laser', 'reflaser', 'reftorp']);
  assert.equal(shotDef('torpedo').kind, 'torpedo');
  assert.equal(isAdvancedShot('torpedo'), false);
  assert.equal(isAdvancedShot('laser'), true);
  assert.equal(SHOT_WEAPONS.laser.maxReflect, 0);
  assert.equal(SHOT_WEAPONS.reflaser.maxReflect, 1);
  assert.equal(SHOT_WEAPONS.reftorp.kind, 'refProjectile');
  assert.equal(SHOT_WEAPONS.reftorp.maxReflect, 1);
});

test('型の範囲: 特性ライブラリは魚雷/ミサイルも扱う（armory 委譲）', () => {
  assert.deepEqual([...TRAIT_TYPES], ['torpedo', 'missile', 'laser', 'reflaser', 'reftorp']);
  assert.ok(isArmoryType('torpedo') && isArmoryType('missile'));
  assert.ok(!isArmoryType('laser'));
  assert.equal(traitTypeName('missile'), 'ミサイル');
  assert.equal(traitTypeName('reflaser'), '反射レーザー');
  /* v1.16.0+: armory（魚雷/ミサイル）は形状/発射音/着弾音まで独立に選べる（5 項目）。
     レーザー（beam）は弾の形も着弾音も実処理が無いため、意味のある 3 項目だけを見せる。 */
  assert.deepEqual([...designCats('torpedo')], ['count', 'pattern', 'projectile', 'launchSound', 'impactSound']);
  assert.deepEqual([...designCats('missile')], ['count', 'pattern', 'projectile', 'launchSound', 'impactSound']);
  assert.deepEqual([...designCats('laser')], ['count', 'pattern', 'launchSound']);
  assert.deepEqual([...designCats('reflaser')], ['count', 'pattern', 'launchSound']);
  assert.equal(designCats('reftorp').length, 5);
});

test('shotParams: 個体の倍率を基準値へ掛ける（初期品は倍率 1）', () => {
  const p = shotParams('laser', initialShot('laser'));
  assert.equal(p.kind, 'beam');
  assert.equal(p.count, 1);
  assert.equal(p.pattern, 'single');
  assert.ok(Math.abs(p.dmg - SHOT_WEAPONS.laser.base.dmg) < 1e-9);
  assert.equal(p.launchSound, 'stock');
});

test('shotParams: 多連は 1 発威力を割り引き、熱は斉射ぶん（総火力は線形未満）', () => {
  const one = shotParams('reflaser', { type:'reflaser', stats:{ power:1, speed:1, interval:1, heat:1 }, count:1, pattern:'single', projectile:'stock', launchSound:'stock', impactSound:'stock' });
  const two = shotParams('reflaser', { type:'reflaser', stats:{ power:1, speed:1, interval:1, heat:1 }, count:2, pattern:'parallel', projectile:'stock', launchSound:'stock', impactSound:'stock' });
  assert.ok(two.dmg < one.dmg, '1 発威力は多連で下がる');
  assert.ok(two.salvoMul < 2 * one.salvoMul, '総火力は線形未満');
  assert.ok(Math.abs(two.heat - one.heat * 2) < 1e-9, '熱は count 倍');
  assert.equal(shotPerShell(1), SHOT_PER_SHELL[1]);
  assert.ok(shotPerShell(3) < shotPerShell(2));
});

/* -------------------------------------------------------------------------- */
test('特性: 型ごとの互換。通常レーザーに扇状/尾翼の弾は無い', () => {
  assert.ok(traitCompatible('laser', 'pattern', 'parallel'));
  assert.ok(!traitCompatible('laser', 'pattern', 'fan'), '通常レーザーは扇状に非互換');
  assert.ok(!traitCompatible('laser', 'projectile', 'finned'));
  assert.ok(traitCompatible('reflaser', 'pattern', 'fan'), '反射レーザーは扇状に互換');
  assert.deepEqual(traitOptions('reftorp', 'count'), [1,2,3]);
  assert.equal(optionLabel('count', 1), '単発');
  assert.equal(optionLabel('count', 3), '×3');
});

test('特性: 魚雷/ミサイルの互換は armory の style 集合に合わせる', () => {
  assert.ok(traitCompatible('torpedo', 'projectile', 'slender'));
  assert.ok(traitCompatible('torpedo', 'pattern', 'fan'));
  assert.deepEqual(traitOptions('torpedo', 'count'), [1,2,3]);
  assert.ok(traitCompatible('missile', 'projectile', 'finned'));
  assert.ok(!traitCompatible('missile', 'projectile', 'slender'), 'ミサイルに細身は無い');
  assert.deepEqual(traitOptions('missile', 'count'), [1,2]);
});

test('designCost: 基本費用＋選んだ項目だけ加算する', () => {
  assert.equal(designCost('laser', {}), DESIGN_BASE_COST);
  const c = designCost('laser', { count:2, pattern:'parallel' });
  assert.equal(c, DESIGN_BASE_COST + traitCost('count', 2) + traitCost('pattern', 'parallel'));
  assert.ok(c > DESIGN_BASE_COST);
});

/* -------------------------------------------------------------------------- */
test('rollAdvanced: 型互換の特性だけをロールする', () => {
  const it = rollAdvanced('laser', mid);
  assert.equal(it.type, 'laser');
  assert.ok(traitCompatible('laser', 'count', it.count));
  assert.ok(traitCompatible('laser', 'pattern', it.pattern));
  assert.ok(traitCompatible('laser', 'projectile', it.projectile));
  assert.ok(traitCompatible('laser', 'launchSound', it.launchSound));
  assert.ok(traitCompatible('laser', 'impactSound', it.impactSound));
});

test('designRoll: 選んだ項目はそのまま、未指定はロールで埋まる', () => {
  const it = designRoll('reflaser', { count:2, pattern:'fan' }, mid);
  assert.equal(it.count, 2);
  assert.equal(it.pattern, 'fan');
  assert.ok(it.projectile);                                  // 未指定はロール
  assert.equal(it.quality, 'common');                        // mid のロール
});

test('designRoll: 非互換の選択は null（＝無消費で拒否できる）', () => {
  assert.equal(designRoll('laser', { pattern:'fan' }, mid), null);        // 通常レーザーに扇状は無い
  assert.equal(designRoll('laser', { projectile:'finned' }, mid), null);
  assert.equal(designRoll('reftorp', { pattern:'fan' }, mid) !== null, true);
});

/* -------------------------------------------------------------------------- */
test('倉庫: 追加・満杯拒否・装備中は捨てられない', () => {
  const store = createAdvancedStore({ load:() => null, save:() => {} });
  const a = store.add(rollAdvanced('laser', seq([0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5])));
  assert.equal(a.ok, true);
  const id = a.item.id;
  for (let i = 0; i < 20; i++) store.add(rollAdvanced('laser', mid));
  assert.equal(store.count(), store.cap());
  const over = store.add(rollAdvanced('laser', mid));
  assert.equal(over.ok, false);
  assert.equal(over.reason, 'full');
  store.equipShot(id);
  assert.equal(store.remove(id), false);
  store.equipShot('torpedo');
  assert.equal(store.remove(id), true);
});

test('解放: unlockFromItem は型互換の特性を恒久解放し、再読込でも残る', () => {
  let saved = null;
  const io = { load:() => saved, save:(v) => { saved = JSON.parse(JSON.stringify(v)); } };
  const s1 = createAdvancedStore(io);
  const item = { type:'reflaser', count:2, pattern:'fan', projectile:'slender', launchSound:'stock', impactSound:'light' };
  const n = s1.unlockFromItem(item);
  assert.ok(n >= 3, '複数項目が解放される');
  assert.ok(s1.isUnlocked('reflaser', 'count', 2));
  assert.ok(s1.isUnlocked('reflaser', 'pattern', 'fan'));
  assert.ok(s1.isUnlocked('reflaser', 'projectile', 'slender'));

  const s2 = createAdvancedStore(io);
  assert.ok(s2.isUnlocked('reflaser', 'pattern', 'fan'), 'ロード後も解放が残る');
  assert.ok(s2.isUnlocked('reflaser', 'count', 2));
  assert.ok(!s2.isUnlocked('laser', 'pattern', 'fan'), '型が違えば解放されない');
});

test('解放: 通常魚雷/ミサイルも回収成功で恒久解放（style は形状/発射音/着弾音へ展開＝旧style互換）', () => {
  let saved = null;
  const io = { load:() => saved, save:(v) => { saved = JSON.parse(JSON.stringify(v)); } };
  const s1 = createAdvancedStore(io);
  /* weapon-rules の個体（style 1 つ）。魚雷の rollItem と同じ形。 */
  const torp = { type:'torpedo', count:2, pattern:'fan', style:'slender', quality:'fine', stats:{ power:1, speed:1, interval:1, heat:1 } };
  const n = s1.unlockFromItem(torp);
  assert.equal(n, 5, 'count/pattern/形状/発射音/着弾音の 5 項目が解放される');
  assert.ok(s1.isUnlocked('torpedo', 'count', 2));
  assert.ok(s1.isUnlocked('torpedo', 'pattern', 'fan'));
  assert.ok(s1.isUnlocked('torpedo', 'projectile', 'slender'));
  assert.ok(s1.isUnlocked('torpedo', 'launchSound', 'slender'));
  assert.ok(s1.isUnlocked('torpedo', 'impactSound', 'slender'));

  const mis = { type:'missile', count:2, pattern:'parallel', style:'finned', quality:'common', stats:{ power:1, turn:1, speed:1 } };
  s1.unlockFromItem(mis);
  assert.ok(s1.isUnlocked('missile', 'projectile', 'finned'));
  assert.ok(s1.isUnlocked('missile', 'count', 2));

  /* 保存 → 再読込でも残る（廃棄・ロード保持） */
  const s2 = createAdvancedStore(io);
  assert.ok(s2.isUnlocked('torpedo', 'projectile', 'slender'), '再読込でも魚雷の解放が残る');
  assert.ok(s2.isUnlocked('missile', 'count', 2));
});

test('解放: 非互換・未知の型は解放しない（標準値は常に許可・armory も解放可）', () => {
  const store = createAdvancedStore({ load:() => null, save:() => {} });
  assert.equal(store.unlock('laser', 'pattern', 'fan'), false);       // 非互換
  assert.equal(store.unlock('missile', 'projectile', 'slender'), false); // 非互換
  assert.equal(store.unlock('torpedo', 'pattern', 'fan'), true);      // v1.16.0: 魚雷も解放できる
  assert.equal(store.unlock('unknown', 'count', 2), false);           // 未知の型
  assert.equal(store.isUnlocked('laser', 'count', 1), true);          // 標準値は初期解放
  assert.equal(store.isUnlocked('laser', 'projectile', 'stock'), true);
  assert.equal(store.isUnlocked('torpedo', 'count', 1), true);        // armory も標準値は初期解放
});

test('装備: 撃つ枠を追加兵装へ換装し、shotParams が返る（魚雷は null）', () => {
  const store = createAdvancedStore({ load:() => null, save:() => {} });
  assert.equal(store.equippedShotType(), 'torpedo');
  assert.equal(store.shotParams(), null);
  const eq = store.equipShot('initial:reflaser');
  assert.equal(eq.ok, true);
  assert.equal(store.equippedShotType(), 'reflaser');
  const p = store.shotParams();
  assert.equal(p.kind, 'beam');
  assert.equal(p.maxReflect, 1);
});

test('近接: 未解放は装備できない。解放後は 1 種だけ装備できる', () => {
  const store = createAdvancedStore({ load:() => null, save:() => {} });
  assert.equal(store.equipMelee('chainsaw').ok, false);
  assert.equal(store.unlockMelee('chainsaw'), true);
  assert.equal(store.equipMelee('chainsaw').ok, true);
  assert.equal(store.equippedMelee(), 'chainsaw');
  assert.equal(store.unlockMelee('phaseblade'), true);
  store.equipMelee('phaseblade');
  assert.equal(store.equippedMelee(), 'phaseblade');
});

/* --- 段階強化（新兵装も資源で伸ばす・保存/実射へ反映） -------------------- */
test('強化: 所持個体を段階強化でき、初期品は保護・上限で止まる', () => {
  const store = createAdvancedStore({ load:() => null, save:() => {} });
  const it = store.add(rollAdvanced('laser', mid)).item;
  assert.equal(advEnhanceInfo(it).eligible, true);
  assert.equal(advEnhanceInfo(it).price, advEnhanceCost(0));
  for (let i = 0; i < ADV_ENHANCE_MAX; i++) assert.equal(store.enhance(it.id).ok, true);
  assert.equal(store.enhance(it.id).ok, false, '上限で止まる');
  assert.equal(store.itemById(it.id).enh, ADV_ENHANCE_MAX);
});

test('強化: 実パラメータ（威力）へ反映され、保存→再読込でも維持', () => {
  let saved = null;
  const io = { load:() => saved, save:(v) => { saved = JSON.parse(JSON.stringify(v)); } };
  const s1 = createAdvancedStore(io);
  const it = s1.add(rollAdvanced('laser', seq([0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5]))).item;
  const before = shotParams(it.type, s1.itemById(it.id)).dmg;
  s1.enhance(it.id); s1.enhance(it.id);
  const after = shotParams(it.type, s1.itemById(it.id)).dmg;
  assert.ok(after > before, '強化で威力が上がる');

  const s2 = createAdvancedStore(io);
  assert.equal(s2.itemById(it.id).enh, 2, '再読込でも強化段が残る');
  const reloaded = shotParams(s2.itemById(it.id).type, s2.itemById(it.id)).dmg;
  assert.ok(Math.abs(reloaded - after) < 1e-9, '再読込後の実射パラメータが一致');
});

/* -------------------------------------------------------------------------- */
test('接続: buildGeometry は trench solids（矩形）と rocks（円）をそのまま図形化する', () => {
  const solids = [{ id:'w', x:100, y:0, w:20, h:200 }];
  const rocks = [{ x:400, y:100, r:40 }];
  const geo = buildGeometry(solids, rocks);
  assert.equal(geo.length, 2);
  assert.equal(geo[0].kind, 'rect');
  assert.equal(geo[1].kind, 'circle');
});

test('接続: fireBeam は壁で反射し、可視経路と実当たりが一致する（反射レーザー）', () => {
  const wall = { id:'w', x:300, y:-100, w:20, h:400 };
  const geo = buildGeometry([wall], []);
  const tr = fireBeam(0, 100, 0, [], geo, { range:900, maxReflect:1 });
  assert.ok(tr.reflected === 1, '1 回反射する');
  assert.ok(Math.abs(tr.points[1].x - tr.hits[0].x) < 1e-6 && Math.abs(tr.points[1].y - tr.hits[0].y) < 1e-6, '当たり点は経路の頂点');
  assert.equal(tr.hits[0].kind, 'solid');
  assert.equal(tr.endKind, 'length');
});

test('接続: 通常レーザー（maxReflect 0）は壁で止まり、奥の敵に届かない', () => {
  const wall = { id:'w', x:300, y:-100, w:20, h:400 };
  const geo = buildGeometry([wall], []);
  const enemy = { x:600, y:100, r:16, ref:{ kind:'hunter' } };
  const tr = fireBeam(0, 100, 0, [enemy], geo, { range:900, maxReflect:0 });
  assert.equal(tr.reflected, 0);
  assert.equal(tr.endKind, 'solid');
  assert.equal(tr.target, null, '壁の奥の敵には当たらない');
});

test('接続: 反射魚雷は壁で 1 回跳ね、速さと寿命を保つ（advanceProjectile）', () => {
  const wall = { id:'w', x:200, y:-100, w:20, h:400 };
  const geo = buildGeometry([wall], []);
  const p = { x:0, y:100, vx:600, vy:0, life:2, reflected:0, dead:false };
  const r = advanceProjectile(p, 0.5, { solids:geo, maxReflect:1 });
  assert.ok(r.p.vx < 0, '壁で反射して向きが反転する');
  assert.equal(r.reflected, 1, '1 回だけ反射する');
  assert.ok(Math.abs(Math.hypot(r.p.vx, r.p.vy) - 600) < 1e-6, '速さは不変');
  assert.equal(r.p.life, 2, '寿命は延長しない');
});

test('接続: 近接は equip した 1 種だけが潜航中に作動する（岩越し・基地/徒歩では作動しない）', () => {
  const melee = createMelee();
  melee.equip('punch', {});
  const enemy = { x:80, y:0, r:14, dead:false, kind:'hunter' };
  const rock  = { kind:'circle', x:40, y:0, r:16 };

  const countHits = (ml, ctx) => { let h = 0; for (let i = 0; i < 60; i++){ const r = ml.update(1/60, ctx); if (r.events.some(e => e.type === 'hit')) h++; } return h; };
  assert.ok(countHits(melee, { mode:'dive', player:{ x:0, y:0, facing:0 }, enemies:[enemy], geometry:[] }) > 0, '射程内・遮蔽なしで命中');

  const melee2 = createMelee();
  melee2.equip('punch', {});
  assert.equal(countHits(melee2, { mode:'dive', player:{ x:0, y:0, facing:0 }, enemies:[enemy], geometry:[rock] }), 0, '岩越しには作動しない');

  const melee3 = createMelee();
  melee3.equip('punch', {});
  assert.equal(countHits(melee3, { mode:'base', player:{ x:0, y:0, facing:0 }, enemies:[enemy], geometry:[] }), 0, '基地中は作動しない');
});

test('近接6種: すべて定義があり、個体値の倍率を掛けられる', () => {
  assert.equal(MELEE_ORDER.length, 6);
  for (const id of MELEE_ORDER){
    const p = meleeParams(id, { power:1.3, reach:1.2, speed:1.1, cooldown:0.8, heat:0.9 });
    assert.ok(p && p.typeId === id, id + ' の params が返る');
  }
});

/* -------------------------------------------------------------------------- */
/* 指定開発パネル（武器選択 → 開発の選択と確定） */

function mkLedger(start){
  let bal = start;
  return { get balance(){ return bal; }, total:() => bal, spend(n){ if (bal < n) return false; bal -= n; return true; }, add(n){ bal += n; } };
}
function mkArmory(){
  let saved = null;
  const store = createArsenalStore({ load:() => saved, save:(v) => { saved = JSON.parse(JSON.stringify(v)); } });
  return { store, saved:() => saved };
}

test('開発パネル: 決定で『撃つ』枠を追加兵装へ換装できる（魚雷↔レーザー）', () => {
  const store = createAdvancedStore({ load:() => null, save:() => {} });
  const panel = createForgePanel({ store, ledger: mkLedger(1000), rng: mid });
  panel.open();
  const i = panel.rows().findIndex(r => r.kind === 'shot' && r.typeId === 'laser');
  assert.ok(i >= 0);
  panel.setCursor(i); panel.activate();
  assert.equal(store.equippedShotType(), 'laser');
  assert.equal(store.shotParams().kind, 'beam');
});

test('開発パネル: 選べるのは解放済みの値だけ（未解放は設計項目に出ない）', () => {
  const store = createAdvancedStore({ load:() => null, save:() => {} });
  store.unlock('laser', 'count', 2);
  const panel = createForgePanel({ store, ledger: mkLedger(1000), rng: mid });
  panel.open();
  let i = panel.rows().findIndex(r => r.kind === 'design' && r.typeId === 'laser');
  panel.setCursor(i); panel.activate();
  assert.equal(panel.screen(), 'design');
  const trow = panel.rows().find(r => r.kind === 'trait' && r.cat === 'count');
  assert.deepEqual(trow.options, [1, 2], '標準 1 と解放済み 2 だけが並ぶ');
});

test('開発パネル: 決定で開発（費用だけ払い、選んだ項目はそのまま・品質は維持）', () => {
  const store = createAdvancedStore({ load:() => null, save:() => {} });
  store.unlock('laser', 'count', 2);
  const ledger = mkLedger(1000);
  const panel = createForgePanel({ store, ledger, rng: mid });
  panel.open();
  let i = panel.rows().findIndex(r => r.kind === 'design' && r.typeId === 'laser');
  panel.setCursor(i); panel.activate();
  i = panel.rows().findIndex(r => r.kind === 'trait' && r.cat === 'count');
  panel.setCursor(i); panel.adjust(1);
  const cost = designCost('laser', { count:2 });
  i = panel.rows().findIndex(r => r.kind === 'confirm');
  panel.setCursor(i);
  const r = panel.activate();
  assert.equal(r.ok, true);
  assert.equal(ledger.balance, 1000 - cost, '費用だけ引く');
  assert.equal(store.count(), 1);
  assert.equal(store.items()[0].count, 2, '選んだ項目はそのまま');
  assert.equal(store.items()[0].type, 'laser');
});

test('開発パネル: 資源不足は無消費（開発できない・資源も減らない）', () => {
  const store = createAdvancedStore({ load:() => null, save:() => {} });
  const ledger = mkLedger(10);
  const panel = createForgePanel({ store, ledger, rng: mid });
  panel.open();
  let i = panel.rows().findIndex(r => r.kind === 'design' && r.typeId === 'reflaser');
  panel.setCursor(i); panel.activate();
  i = panel.rows().findIndex(r => r.kind === 'confirm');
  panel.setCursor(i);
  const r = panel.activate();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'insufficient');
  assert.equal(ledger.balance, 10, '資源は減らない');
  assert.equal(store.count(), 0);
});

test('開発パネル: 未解放の近接は決定しても装備できない（無消費）', () => {
  const store = createAdvancedStore({ load:() => null, save:() => {} });
  const panel = createForgePanel({ store, ledger: mkLedger(1000), rng: mid });
  panel.open();
  const i = panel.rows().findIndex(r => r.kind === 'melee' && r.id === 'axe');
  panel.setCursor(i);
  const r = panel.activate();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'locked');
  assert.equal(store.equippedMelee(), null);
});

test('開発パネル: 解放後は近接を 1 種だけ装備できる', () => {
  const store = createAdvancedStore({ load:() => null, save:() => {} });
  store.unlockMelee('axe', mid);
  const panel = createForgePanel({ store, ledger: mkLedger(1000), rng: mid });
  panel.open();
  const i = panel.rows().findIndex(r => r.kind === 'melee' && r.id === 'axe');
  panel.setCursor(i);
  const r = panel.activate();
  assert.equal(r.ok, true);
  assert.equal(store.equippedMelee(), 'axe');
});

/* --- 指定開発（armory の魚雷/ミサイル。回収で解放した特性を組み合わせる） --- */
test('設計(weapon-rules): designItem は count/pattern/style を固定し、非互換は null', () => {
  const it = designItem('torpedo', { count:3, pattern:'fan', projectile:'stout' }, mid);
  assert.equal(it.type, 'torpedo');
  assert.equal(it.count, 3);
  assert.equal(it.pattern, 'fan');
  assert.equal(it.style, 'stout');
  assert.equal(it.initial, false);
  assert.equal(designItem('torpedo', { count:9 }, mid), null);            // max 3 を越える
  assert.equal(designItem('torpedo', { projectile:'finned' }, mid), null);// 魚雷に尾翼は無い
  assert.equal(designItem('missile', { count:3 }, mid), null);            // ミサイルは max 2
});

test('開発パネル: armory 型（魚雷）を指定開発すると armory に入り、装備され、撃つ枠は魚雷のまま', () => {
  const store = createAdvancedStore({ load:() => null, save:() => {} });
  const { store: armory } = mkArmory();
  const ledger = mkLedger(1000);
  const panel = createForgePanel({ store, ledger, rng: mid, armory, designWeapon: designItem });
  store.unlockFromItem({ type:'torpedo', count:2, pattern:'fan', style:'slender' });
  panel.open();
  let i = panel.rows().findIndex(r => r.kind === 'design' && r.typeId === 'torpedo');
  assert.ok(i >= 0, '魚雷の指定開発行がある');
  panel.setCursor(i); panel.activate();
  assert.equal(panel.screen(), 'design');
  /* count を 2 に、pattern を fan に、形状を slender に（rows() は毎回作り直すので findIndex で都度引く）。 */
  panel.setCursor(panel.rows().findIndex(r => r.kind === 'trait' && r.cat === 'count')); panel.adjust(1);
  panel.setCursor(panel.rows().findIndex(r => r.kind === 'trait' && r.cat === 'pattern')); panel.adjust(1);
  panel.setCursor(panel.rows().findIndex(r => r.kind === 'trait' && r.cat === 'projectile')); panel.adjust(1);
  const sel = panel.selection();
  assert.equal(sel.count, 2); assert.equal(sel.pattern, 'fan');
  i = panel.rows().findIndex(r => r.kind === 'confirm');
  panel.setCursor(i);
  const r = panel.activate();
  assert.equal(r.ok, true, '開発できる');
  assert.equal(armory.count(), 1, 'armory に 1 個入る');
  assert.equal(store.count(), 0, '追加兵装の倉庫は増えない');
  const made = armory.items()[0];
  assert.equal(made.count, 2); assert.equal(made.pattern, 'fan'); assert.equal(made.style, 'slender');
  assert.equal(armory.equippedId('torpedo'), made.id, '装備される');
  assert.equal(store.equippedShotType(), 'torpedo', '撃つ枠は魚雷のまま');
});

test('開発パネル: 強化（所持品を選択中）で段階強化し、費用だけ払う。上限・不足は無消費', () => {
  const store = createAdvancedStore({ load:() => null, save:() => {} });
  const ledger = mkLedger(5000);
  const panel = createForgePanel({ store, ledger, rng: mid });
  const it = store.add(rollAdvanced('laser', mid)).item;
  panel.open();
  const i = panel.rows().findIndex(r => r.kind === 'item' && r.id === it.id);
  assert.ok(i >= 0, '所持品の行がある');
  panel.setCursor(i);
  const price = advEnhanceCost(0);
  const e = panel.enhance();
  assert.equal(e.ok, true);
  assert.equal(ledger.balance, 5000 - price, '費用だけ引く');
  assert.equal(store.itemById(it.id).enh, 1);

  /* 上限まで上げて、上限では無消費 */
  for (let k = 0; k < ADV_ENHANCE_MAX; k++) panel.enhance();
  assert.equal(store.itemById(it.id).enh, ADV_ENHANCE_MAX);
  const bal = ledger.balance;
  const over = panel.enhance();
  assert.equal(over.ok, false);
  assert.equal(over.reason, 'max');
  assert.equal(ledger.balance, bal, '上限は消費しない');
});

test('開発パネル: 資源不足の強化は無消費', () => {
  const store = createAdvancedStore({ load:() => null, save:() => {} });
  const it = store.add(rollAdvanced('laser', mid)).item;
  const ledger = mkLedger(advEnhanceCost(0) - 1);
  const panel = createForgePanel({ store, ledger, rng: mid });
  panel.open();
  panel.setCursor(panel.rows().findIndex(r => r.kind === 'item' && r.id === it.id));
  const e = panel.enhance();
  assert.equal(e.ok, false);
  assert.equal(e.reason, 'insufficient');
  assert.equal(ledger.balance, advEnhanceCost(0) - 1);
  assert.equal(store.itemById(it.id).enh, 0);
});

test('旧セーブ不変: 追加兵装の保存が無くても標準値だけで起動する（型が違っても落ちない）', () => {
  const store = createAdvancedStore({ load:() => ({ v:0 }), save:() => {} });
  assert.equal(store.equippedShotType(), 'torpedo');
  assert.equal(store.count(), 0);
  assert.equal(store.isUnlocked('torpedo', 'count', 1), true);
  assert.equal(store.isUnlocked('missile', 'pattern', 'single'), true);
});

test('表示: advItemLabel は型・品質・強化段を示す', () => {
  const it = { type:'reflaser', quality:'fine', enh:2, initial:false };
  const s = advItemLabel(it);
  assert.ok(s.indexOf('反射レーザー') >= 0);
  assert.ok(s.indexOf('強化+2') >= 0);
  assert.equal(advItemLabel(initialShot('laser')), '通常レーザー・標準装備');
});

/* --- v1.16.0+: 指定開発で魚雷/ミサイルの形状/発射音/着弾音を独立に選ぶ --------- */
test('指定開発: 魚雷/ミサイルで形状/発射音/着弾音を独立に選べる（非互換は拒否・保存維持）', () => {
  const armStore = {};
  const armory = createArsenalStore({ load:() => armStore.a, save:v => { armStore.a = v; } });
  const advStore = {};
  const store = createAdvancedStore({ load:() => advStore.a, save:v => { advStore.a = v; } });
  const ledger = mkLedger(10000);
  const panel = createForgePanel({ store, ledger, rng: mid, armory, designWeapon: designItem });

  /* 拾得品で解放（三者が別の値になるように） */
  store.unlockFromItem({ type:'torpedo', count:1, pattern:'single', projectile:'slender', launchSound:'stout', impactSound:'slender' });
  store.unlockFromItem({ type:'missile', count:1, pattern:'single', projectile:'sleek', launchSound:'finned', impactSound:'stout' });

  const pick = (cat, target) => {
    panel.setCursor(panel.rows().findIndex(r => r.kind === 'trait' && r.cat === cat));
    let guard = 0;
    while (String(panel.currentRow().value) !== String(target) && guard++ < 8) panel.adjust(1);
    assert.equal(String(panel.currentRow().value), String(target), cat + ' → ' + target);
  };
  const confirm = () => { panel.setCursor(panel.rows().findIndex(x => x.kind === 'confirm')); return panel.activate(); };

  /* 魚雷: 形状=細身 / 発射音=ずんぐり / 着弾音=細身（三者が別） */
  panel.open();
  panel.setCursor(panel.rows().findIndex(r => r.kind === 'design' && r.typeId === 'torpedo')); panel.activate();
  assert.equal(panel.screen(), 'design');
  pick('projectile', 'slender'); pick('launchSound', 'stout'); pick('impactSound', 'slender');
  assert.equal(confirm().ok, true);
  const torp = armory.items().find(it => it.type === 'torpedo');
  assert.equal(torp.projectile, 'slender');
  assert.equal(torp.launchSound, 'stout');
  assert.equal(torp.impactSound, 'slender');
  assert.equal(torp.style, 'slender', 'style は形状と同値（旧 consumer 互換）');

  /* ミサイル: 形状=流線 / 発射音=尾翼 / 着弾音=ずんぐり（三者が別） */
  panel.back();
  panel.setCursor(panel.rows().findIndex(r => r.kind === 'design' && r.typeId === 'missile')); panel.activate();
  assert.equal(panel.screen(), 'design');
  pick('projectile', 'sleek'); pick('launchSound', 'finned'); pick('impactSound', 'stout');
  assert.equal(confirm().ok, true);
  const mis = armory.items().find(it => it.type === 'missile');
  assert.equal(mis.projectile, 'sleek'); assert.equal(mis.launchSound, 'finned'); assert.equal(mis.impactSound, 'stout');

  /* 保存 → 再読込（新セッション）で三者が維持される */
  const armory2 = createArsenalStore({ load:() => armStore.a, save:v => { armStore.a = v; } });
  const t2 = armory2.items().find(it => it.type === 'torpedo');
  const m2 = armory2.items().find(it => it.type === 'missile');
  assert.equal(t2.projectile, 'slender'); assert.equal(t2.launchSound, 'stout'); assert.equal(t2.impactSound, 'slender');
  assert.equal(m2.projectile, 'sleek'); assert.equal(m2.launchSound, 'finned'); assert.equal(m2.impactSound, 'stout');

  /* 非互換（魚雷に尾翼 finned）は設計の選択肢に無い＝無消費で拒否できる */
  panel.back();
  panel.setCursor(panel.rows().findIndex(r => r.kind === 'design' && r.typeId === 'torpedo')); panel.activate();
  const projRow = panel.rows().find(r => r.kind === 'trait' && r.cat === 'projectile');
  assert.ok(!projRow.options.includes('finned'), '魚雷の形状に尾翼は無い');
  assert.ok(traitCompatible('torpedo', 'projectile', 'sleek'), '流線は魚雷の形状として互換（解放すれば選べる）');
  assert.equal(designItem('torpedo', { projectile:'finned' }, mid), null, '非互換は null（無消費拒否）');
});

/* --- v1.16.0+: 全自動近接の段階強化（資源で伸ばす・実ダメージへ・保存） -------- */
test('近接の段階強化: 解放済みだけ・威力中心に伸び、実ダメージへ出て保存される', () => {
  let saved = null;
  const io = { load:() => saved, save:v => { saved = JSON.parse(JSON.stringify(v)); } };
  const store = createAdvancedStore(io);

  /* 未解放は強化できない（無消費で拒否できる） */
  assert.equal(store.enhanceMelee('punch').ok, false);
  assert.equal(store.enhanceMelee('punch').reason, 'locked');
  assert.equal(store.meleeStats('punch'), null);

  assert.equal(store.unlockMelee('punch', seq([0.5,0.5,0.5,0.5,0.5])), true);
  const baseRaw = store.meleeBaseStats('punch');
  const before = meleeParams('punch', store.meleeStats('punch'));
  assert.equal(store.meleeEnhanceInfo('punch').price, MELEE_ENHANCE_COST[0]);

  for (let k = 0; k < MELEE_ENHANCE_MAX; k++) assert.equal(store.enhanceMelee('punch').ok, true);
  assert.equal(store.enhanceMelee('punch').reason, 'max', '上限で止まる');
  const after = meleeParams('punch', store.meleeStats('punch'));
  assert.ok(after.power > before.power, '強化で実威力が上がる: ' + before.power.toFixed(2) + '→' + after.power.toFixed(2));
  assert.ok(Math.abs(store.meleeBaseStats('punch').power - baseRaw.power) < 1e-9, '個人差の倍率は保持（再抽選しない）');

  /* 保存 → 再読込で段と倍率が維持される */
  const store2 = createAdvancedStore(io);
  assert.equal(store2.meleeEnhanceLevel('punch'), MELEE_ENHANCE_MAX);
  const reloaded = meleeParams('punch', store2.meleeStats('punch'));
  assert.ok(Math.abs(reloaded.power - after.power) < 1e-9, '再読込後の実ダメージが一致');
});

test('開発パネル: 近接の段階強化（費用だけ払う・未解放/上限は無消費）', () => {
  const store = createAdvancedStore({ load:() => null, save:() => {} });
  store.unlockMelee('axe', mid);
  const ledger = mkLedger(5000);
  const panel = createForgePanel({ store, ledger, rng: mid });
  panel.open();
  const i = panel.rows().findIndex(r => r.kind === 'melee' && r.id === 'axe');
  assert.ok(i >= 0);
  panel.setCursor(i);
  const price = MELEE_ENHANCE_COST[0];
  const e = panel.enhance();
  assert.equal(e.ok, true);
  assert.equal(ledger.balance, 5000 - price, '費用だけ引く');
  assert.equal(store.meleeEnhanceLevel('axe'), 1);

  /* 未解放の近接は強化できない（無消費） */
  const bal = ledger.balance;
  panel.setCursor(panel.rows().findIndex(r => r.kind === 'melee' && r.id === 'punch'));
  const e2 = panel.enhance();
  assert.equal(e2.ok, false);
  assert.equal(e2.reason, 'locked');
  assert.equal(ledger.balance, bal, '未解放は消費しない');
});
