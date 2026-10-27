// v0.4.3: 兵種のアイコン（データ CLASS_ICONS）。兵種の一覧 UNIT_CLASSES のすべてに行があるか・リペアラーは緑の十字か
import test from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_CLASSES, UNIT_CLASS_CAPS, KINDS, createSim } from '../js/sim/sim.js?v=29';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { CLASS_ICONS, GLYPH_NAMES, classIconOf, drawClassIcon, ICON_R } from '../js/render/class-icons.js?v=5';

// Graphics の代わり（呼ばれた描き方と色を数える）
function fakeG() {
  const calls = [], g = new Proxy({}, { get: (_, k) => k === 'calls' ? calls : (...a) => { calls.push([k, ...a]); return g; } });
  return g;
}

test('兵種のアイコン: UNIT_CLASSES のすべてに CLASS_ICONS の行がある（null＝なし）・余分な行がない', () => {
  const keys = UNIT_CLASSES.map(c => c.key);
  assert.deepEqual(Object.keys(CLASS_ICONS).sort(), [...keys].sort());
  for (const k of keys) { const ic = CLASS_ICONS[k]; if (ic) assert.ok(GLYPH_NAMES.includes(ic.glyph), k); }
  assert.ok(keys.includes('repairer') && Object.keys(UNIT_CLASS_CAPS).every(k => keys.includes(k)), '能力のある兵種は一覧にある');
  assert.equal(CLASS_ICONS.rookie, null, '新入りはアイコンなし');
});

test('兵種のアイコン: ガンナー＝銃・サポーター＝スパナ・リペアラー＝緑の十字（白地に赤い十字ではない）', () => {
  assert.equal(CLASS_ICONS.gunner.glyph, 'gun');
  assert.equal(CLASS_ICONS.supporter.glyph, 'wrench');
  const r = CLASS_ICONS.repairer; assert.equal(r.glyph, 'cross');
  const c = r.color, R = c >> 16 & 255, G = c >> 8 & 255, B = c & 255;
  assert.ok(G > 150 && G > R + 50 && G > B + 30, `緑 ${c.toString(16)}`);
  const g = fakeG(); assert.equal(drawClassIcon(g, r), true);
  const colors = g.calls.filter(x => x[0] === 'fill' || x[0] === 'stroke').map(x => x[1].color);
  assert.ok(!colors.some(x => (x >> 16 & 255) > 180 && (x >> 8 & 255) < 90), '赤を使わない');
  assert.ok(!colors.includes(0xffffff), '白い台を使わない');
});

test('兵種のアイコン: 台は小さい丸（直径 10〜12px）・すべての記号が描ける', () => {
  assert.ok(ICON_R * 2 >= 10 && ICON_R * 2 <= 12);
  for (const ic of Object.values(CLASS_ICONS)) if (ic) { const g = fakeG(); assert.equal(drawClassIcon(g, ic), true); assert.ok(g.calls.length > 3); }
  assert.equal(drawClassIcon(fakeG(), null), false);
});

test('兵種のアイコン: 機体の cls で引く。ミッションの機体は PONCO＝ガンナー6・リペアラー1・サポーター1、ツギハギ号＝スカベンジャー（v0.4.4）', () => {
  assert.ok(Object.values(KINDS).every(k => k.cls == null), '兵種は体の種類ではなく機体ごと');
  const sim = createSim({ seed: 1, mission: MISSION_1 });
  const count = (kind, cls) => sim.units.filter(u => u.kind === kind && u.cls === cls).length;
  assert.equal(count('ponco', 'gunner'), 6); assert.equal(count('ponco', 'repairer'), 1); assert.equal(count('ponco', 'supporter'), 1);
  assert.equal(count('scav', 'scavenger'), 4);
  for (const u of sim.units) {
    if (u.side === 'ally' && !u.human) assert.equal(classIconOf(u), CLASS_ICONS[u.cls], u.label);
    else assert.equal(u.cls ?? null, null, u.label);
  }
  const p = sim.units.find(u => u.kind === 'ponco');
  p.cls = 'rookie'; assert.equal(classIconOf(p), null);
  p.cls = 'unknown'; assert.equal(classIconOf(p), null);
});

test('兵種のアイコンの絵（v0.4.10）: アイコンのある兵種すべてに絵があり、状態の絵もそろい、sw-assets.js に載っている', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const { CLASS_BADGES, STATUS_BADGES, badgePath, classBadgeOf } = await import('../js/render/class-icons.js?v=5');
  const root = new URL('../', import.meta.url);
  const sandbox = { GAME_ASSETS: {} };
  new Function('self', readFileSync(new URL('sw-assets.js', root), 'utf8'))(sandbox);
  const files = sandbox.GAME_ASSETS['bot-commander'].files;
  for (const [cls, ic] of Object.entries(CLASS_ICONS)) assert.equal(!!ic, !!CLASS_BADGES[cls], cls);
  for (const name of [...Object.values(CLASS_BADGES), ...STATUS_BADGES]) {
    assert.ok(existsSync(new URL(badgePath(name), root)), name);
    assert.ok(files.includes(badgePath(name)), `sw-assets.js: ${name}`);
  }
  assert.equal(classBadgeOf({ cls: 'stealth' }), 'stalker');
  assert.equal(classBadgeOf({ cls: 'rookie' }), null);
});
