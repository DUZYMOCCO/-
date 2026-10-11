import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STAGES, ENEMY_TYPES, WEAPONS, QUEST, SQUAD, underHalfW, clampUnder, hutSpot, LASER_MODES, nextLaserMode, squadRoom, beamHits,
  upgradeChoices, weaponStat, MAX_LEVEL,
} from '../js/rules.js';
import { art, ART_NAMES } from '../js/art.js';

const svgOf = url => decodeURIComponent(url.replace(/^url\("data:image\/svg\+xml(;charset=utf-8)?,/, '').replace(/"\)$/, ''));
const noKanji = s => !/[\u4e00-\u9faf]/.test(s);

test('desert stage has the quest (laser gift); stage 1 and others unchanged', () => {
  assert.deepEqual(STAGES[1].quest, { gift: 'laser' });
  assert.equal(STAGES[1].name, 'さばく');
  for (const s of STAGES) if (s.id !== 2) assert.equal(s.quest, undefined, `stage ${s.id}`);
  assert.equal(STAGES[0].researcher.container, true, 'ステージ1は コンテナの まま');
  assert.equal(STAGES[1].boss.type, 'snake', 'さばくの おおボスは そのまま');
});

test('hut is 520〜760 away and not on top of the lab', () => {
  let s = 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 500; i++) {
    const h = hutSpot(rnd), d = Math.hypot(h.x, h.y);
    assert.ok(d >= QUEST.hutDist0 - 1e-6 && d <= QUEST.hutDist1 + 1e-6, String(d));
    assert.ok(Math.hypot(h.x - QUEST.lab.x, h.y - QUEST.lab.y) > 250, 'けんきゅうじょと かさならない');
  }
  assert.ok(QUEST.at >= 30, 'はじまって すぐには みはりが でない');
});

test('underground corridor bounds: narrow hall, wide boss room, clamping', () => {
  const U = QUEST.under;
  assert.equal(underHalfW(0), U.halfW);
  assert.equal(underHalfW(U.roomY - 10), U.roomHalfW);
  const o = clampUnder({ x: 999, y: 999 }, 16);
  assert.equal(o.y, U.bottom - 16); assert.equal(o.x, U.halfW - 16);
  const t = clampUnder({ x: -999, y: -9999 }, 16);
  assert.equal(t.y, U.top + 16); assert.equal(t.x, -(U.roomHalfW - 16));
  // ろうやは ろうかの なか、ボスは へやの なか、でぐちは ボスの おく
  for (const c of U.cells) assert.ok(c.y < 0 && c.y > U.roomY && Math.abs(c.side) === 1);
  assert.ok(U.bossAt.y < U.roomY && U.bossAt.y > U.top && U.exit.y < U.bossAt.y);
  assert.ok(U.bossTrigger < U.cells.at(-1).y, 'ろうやを ぜんぶ すぎてから ボス');
  const who = U.cells.flatMap(c => c.who);
  assert.equal(who.filter(w => w === 'soldier').length, SQUAD.soldiers);
  assert.equal(who.filter(w => w === 'medic').length, 1);
  assert.ok(who.includes('researcher'));
});

test('underground boss is a kana-named villain; laser gun has 3 modes and stays out of level-up cards', () => {
  const T = ENEMY_TYPES.driller;
  assert.equal(T.name, 'ドリルたいちょう');
  assert.ok(svgOf(art('driller')).includes('data-emblem="warumono"'));
  assert.ok(QUEST.under.boss.hp <= STAGES[1].boss.hp / 2, 'おおボスより ずっと よわい');
  assert.deepEqual(LASER_MODES, ['laserMg', 'laserBeam', 'laserRk']);
  assert.deepEqual(LASER_MODES.map(id => WEAPONS[id].name), ['マシンガン', 'レーザー', 'ロケットランチャー']);
  assert.equal(nextLaserMode(0), 1); assert.equal(nextLaserMode(2), 0); assert.equal(nextLaserMode(undefined), 1);
  for (const id of ['laser', ...LASER_MODES]) assert.ok(WEAPONS[id].gift, id);
  for (const id of LASER_MODES) assert.equal(WEAPONS[id].boomFx, 'bboom', `${id} は あおい ばくはつ`);
  for (let i = 0; i < 200; i++) for (const c of upgradeChoices({ gun: 2 }, {})) assert.ok(!String(c.id || c).startsWith('laser'));
  // つよいけど こわれて いない：どの モードも 1びょうの ダメージが でかロケット の 3ばい いか
  const dps = id => weaponStat(id, 'damage', MAX_LEVEL) * (WEAPONS[id].count ? weaponStat(id, 'count', MAX_LEVEL) : 1) / weaponStat(id, 'cooldown', MAX_LEVEL);
  const mega = dps('mega');
  for (const id of LASER_MODES) assert.ok(dps(id) > 100 && dps(id) < mega * 3, `${id} ${dps(id)}`);
});

test('squadRoom caps soldiers at 3 and medic at 1; beamHits geometry', () => {
  const al = n => Array.from({ length: n }, () => ({ medic: false }));
  assert.equal(squadRoom([], false), 1);
  assert.equal(squadRoom(al(3), false), 0);
  assert.equal(squadRoom(al(2), true), 1);
  assert.equal(squadRoom([...al(1), { medic: true }], true), 0);
  const e = (x, y) => ({ x, y, T: { r: 10 } });
  assert.ok(beamHits(0, 0, 0, 500, 20, e(300, 15)));
  assert.ok(!beamHits(0, 0, 0, 500, 20, e(300, 40)));
  assert.ok(!beamHits(0, 0, 0, 500, 20, e(-40, 0)));
  assert.ok(!beamHits(0, 0, 0, 500, 20, e(530, 0)));
  assert.ok(beamHits(0, 0, Math.PI / 2, 500, 20, e(0, 200)));
});

test('quest art exists; walls stretch; banners and HUD are kana only', () => {
  for (const n of ['outpost', 'hut', 'hatch', 'hatchOpen', 'wallL', 'wallR', 'wallT', 'wallB', 'cellA', 'cellB', 'cellC', 'cellOpen', 'exitStairs', 'driller', 'laserGun', 'lbullet', 'lrocket', 'modeMg', 'modeBeam', 'modeRk', 'ground-bunker'])
    assert.ok(ART_NAMES.includes(n), n);
  for (const n of ['wallL', 'wallR', 'wallT', 'wallB']) assert.ok(svgOf(art(n)).includes('preserveAspectRatio="none"'), n);
  assert.ok(!svgOf(art('outpost')).includes('data-emblem'), 'けんきゅうじょは みかた');
  assert.ok(svgOf(art('hut')).includes('data-emblem="warumono"'), 'こやは わるもの');
  const src = readFileSync(new URL('../js/index.js', import.meta.url), 'utf8');
  const q = src.slice(src.indexOf('/* ---------- さばくの クエスト'), src.indexOf('/** ふえ：'));
  for (const m of q.matchAll(/showBanner\(([`'])([^`']*)\1/g)) assert.ok(noKanji(m[2]), m[2]);
  for (const l of ['こや', 'とびら', 'ろうや', 'でぐち']) assert.ok(q.includes(`label: '${l}'`) || src.includes(`label: '${l}'`), l);
  assert.ok(noKanji(src.match(/<button class="ds-mode[^\n]*/)[0]));
  assert.ok(/k === 'q' \|\| k === 'e'/.test(src), 'PC は Q／E で モード');
  assert.ok(src.includes("this.el.mode.addEventListener('pointerdown'"));
  // ちかでは タイマーが ゆっくり
  assert.ok(src.includes("r.time += r.zone === 'under' ? dt * QUEST.underTime : dt;"))
  assert.ok(QUEST.underTime > 0 && QUEST.underTime < 1, 'ちかでも タイマーは ゆっくり すすむ');
});
