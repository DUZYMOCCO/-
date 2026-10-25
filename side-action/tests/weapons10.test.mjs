import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { WEAPONS, WEAPON_ORDER, GUN_GEOM, STAGES, createArsenal, giveWeapon, tickGear, tickFlame, tickLaser, tickToss, rayBox, inFlame, inSmoke } from '../js/rules.js';
import { gearShoot, fireLaser, placeBomb, popCloud, throwSmoke, blindTo, updateGear } from '../js/gear.js';

const NEW = ['flame', 'tbomb', 'smoke', 'laser'];
const DT = 1 / 60;

function setup(n = 1, dx = 100, gap = 40, type = 'zombie') {
  const g = new Game(2, { viewW: 667, seed: 5, allies: false });
  g.enemies.length = 0; g.boss = null;
  const p = g.player;
  const es = [];
  for (let i = 0; i < n; i++) {
    const e = g.spawnEnemy(type, 1, 0);
    e.spawnT = 0; e.x = p.x + dx + i * gap; e.y = p.y; e.onGround = true; e.vx = 0; e.hp = e.maxHp = 500;
    es.push(e);
  }
  g.buildTargets();
  return { g, p, es };
}
const give = (p, id) => { giveWeapon(p.ars, id); p.ars.cur = id; p.ars.cool = 0; };

test('v0.10：あたらしい ぶき 4つ が ぶきリスト・じゅうの かたち・ステージに ある', () => {
  for (const id of NEW) {
    const W = WEAPONS[id];
    assert.ok(W && W.gear === id, id);
    assert.ok(/^[ぁ-んァ-ヶー]+$/.test(W.name), W.name);
    assert.ok(WEAPON_ORDER.includes(id), id);
    assert.ok(GUN_GEOM[id], id);
    assert.ok(STAGES.some((s) => s.arenas.some((a) => (a.pickups || []).some((k) => k[1] === id))) || STAGES.some((s) => JSON.stringify(s).includes(`"${id}"`)), id);
  }
  assert.equal(new Set(WEAPON_ORDER).size, WEAPON_ORDER.length);
  assert.equal(WEAPONS.flame.ammo, Infinity); assert.equal(WEAPONS.laser.ammo, Infinity);
  assert.ok(WEAPONS.tbomb.ammo > 0 && WEAPONS.smoke.ammo > 0);
});

test('かえん：ねんりょうが へって からっぽで とまり、やすむと もどる', () => {
  const a = createArsenal(['pistol', 'flame']); a.cur = 'flame';
  const F = WEAPONS.flame.flame;
  let t = 0, r;
  while ((r = tickFlame(a, DT, true)) === true) { tickGear(a, DT); t += DT; if (t > 10) break; }
  assert.equal(r, 'out');
  assert.ok(Math.abs(t - F.fuel / F.use) < 0.1, `もえる じかん ${t}`);
  assert.equal(tickFlame(a, DT, true), false, 'からっぽの ときは でない');
  let w = 0; while (a.guns.flame.out && w < 10) { tickGear(a, DT); w += DT; }
  assert.ok(!a.guns.flame.out);
  assert.ok(Math.abs(w - (F.regenDelay + F.restart / F.regen)) < 0.1, `もどる じかん ${w}`);
  giveWeapon(a, 'flame'); assert.equal(a.guns.flame.fuel, F.fuel, 'ひろうと まんたん');
});

test('かえん：ちかくの てき だけ もえて、はなしても すこし へりつづける', () => {
  const { g, p, es } = setup(2, 90, 300);
  give(p, 'flame'); p.face = 1;
  const [near, far] = es;
  for (let i = 0; i < 30; i++) { g.buildTargets(); gearShoot(g, p, WEAPONS.flame, DT, true); }
  assert.ok(near.hp < 500 && near.burnT > 0, 'ちかい てきは もえる');
  assert.equal(far.hp, 500, 'とおい てきは とどかない');
  assert.ok(g.parts.some((q) => q.kind === 'flame'));
  const hp = near.hp;
  for (let i = 0; i < 60; i++) updateGear(g, DT);
  assert.ok(near.hp < hp - 4 && near.hp > hp - 10, `やけど ${hp - near.hp}`);
  assert.ok(inFlame(0, 0, 1, { x: 100, y: -10, w: 20, h: 20 }, 150));
  assert.ok(!inFlame(0, 0, -1, { x: 100, y: -10, w: 20, h: 20 }, 150), 'うしろは もえない');
});

test('じげんばくだん：てきが ふむと ドカーン（じぶんは へいき）', () => {
  const { g, p, es } = setup(1, 300);
  give(p, 'tbomb'); p.face = 1;
  const b = placeBomb(g, p, WEAPONS.tbomb);
  const hp0 = p.hp;
  for (let i = 0; i < 40; i++) { g.buildTargets(); updateGear(g, DT); }
  assert.equal(g.bombs.length, 1, 'とおい てきでは ばくはつ しない');
  es[0].x = b.x + 10;
  g.buildTargets(); updateGear(g, DT);
  assert.equal(g.bombs.length, 0, 'ふんだら ばくはつ');
  assert.ok(es[0].hp <= 500 - WEAPONS.tbomb.bomb.blast.dmg + 1e-6);
  assert.equal(p.hp, hp0, 'プレイヤーは いたくない');
  assert.ok(JSON.stringify(g.texts).includes('ドカーン'));
});

test('じげんばくだん：おいてすぐ は ふんでも だいじょうぶ・8びょうで ひとりでに ばくはつ', () => {
  const { g, p, es } = setup(1, 16);
  give(p, 'tbomb'); p.face = 1;
  placeBomb(g, p, WEAPONS.tbomb);
  for (let i = 0; i < 20; i++) { g.buildTargets(); updateGear(g, DT); }
  assert.equal(g.bombs.length, 1, `${WEAPONS.tbomb.bomb.arm}びょう は ふんでも ばくはつ しない`);
  es[0].x = p.x + 2000; g.buildTargets();
  let t = 20 * DT, beeps = 0;
  while (g.bombs.length && t < 20) { updateGear(g, DT); t += DT; }
  beeps = g.drainEvents().filter((e) => e.type === 'beep').length;
  assert.ok(Math.abs(t - WEAPONS.tbomb.bomb.fuse) < 0.05, `${t}`);
  assert.ok(beeps >= 6, `ピッ ${beeps}`);
});

test('じげんばくだん：3こ まで・となりの ばくだんも ゆうばく', () => {
  const { g, p, es } = setup(1, 2000);
  give(p, 'tbomb'); p.face = 1;
  let ok = 0;
  for (let i = 0; i < 300 && ok < 5; i++) { const r = tickToss(p.ars, DT, true, g.bombs.length < 3); if (r === true) { placeBomb(g, p, WEAPONS.tbomb); p.x += 40; ok++; } if (r === 'full') break; }
  assert.equal(g.bombs.length, 3);
  assert.equal(tickToss(p.ars, 1, true, g.bombs.length < 3), 'full');
  for (let i = 0; i < 40; i++) updateGear(g, DT);
  es[0].x = g.bombs[0].x; g.buildTargets();
  updateGear(g, DT);
  assert.equal(g.bombs.length, 2, '1こ め が ばくはつ');
  es[0].x = p.x + 3000; g.buildTargets();
  for (let i = 0; i < 30; i++) updateGear(g, DT);
  assert.equal(g.bombs.length, 0, 'ちかくの ばくだんが ゆうばく');
});

test('スモーク：なげると とんで おちて けむり に なる', () => {
  const { g, p } = setup(1, 2000);
  give(p, 'smoke'); p.face = 1;
  assert.equal(tickToss(p.ars, DT, true), true);
  throwSmoke(g, p, WEAPONS.smoke);
  assert.equal(g.nades.length, 1);
  let t = 0; while (g.nades.length && t < 3) { updateGear(g, DT); t += DT; }
  assert.equal(g.clouds.length, 1);
  const c = g.clouds[0];
  assert.ok(c.x > p.x + 150 && c.x < p.x + 600, `とんだ きょり ${c.x - p.x}`);
  let d = 0; while (g.clouds.length && d < 10) { updateGear(g, DT); d += DT; }
  assert.ok(Math.abs(d + 0 - WEAPONS.smoke.smoke.dur) < 0.05, `つづく じかん ${d}`);
});

test('スモーク：けむりの なかの てき・けむりの むこうの プレイヤーが みえない（ボスは へいき）', () => {
  const { g, p, es } = setup(1, 200);
  const e = es[0];
  assert.equal(blindTo(g, e, p), false);
  popCloud(g, e.x, e.y);
  g.clouds[0].t = 0.5;
  assert.ok(inSmoke(g.clouds, e.x, e.y - 30));
  assert.equal(blindTo(g, e, p), true, 'なかの てき');
  g.clouds.length = 0; popCloud(g, p.x, p.y); g.clouds[0].t = 0.5;
  assert.equal(blindTo(g, e, p), true, 'プレイヤーが けむりの なか');
  assert.equal(blindTo(g, { ...e, kind: 'boss' }, p), false, 'ボスには きかない');
  e.cool = 0; e.tgt = p;
  for (let i = 0; i < 120; i++) { g.buildTargets(); g.updateEnemy(e, DT); }
  assert.ok(e.blind);
  assert.equal(g.bullets.filter((b) => b.owner === 'e').length, 0);
  popCloud(g, 0, 0); popCloud(g, 50, 0);
  assert.equal(g.clouds.length, WEAPONS.smoke.smoke.max, 'ふるい けむりから きえる');
  assert.equal(g.clouds[0].x, 0);
});

test('レーザー：てきを 4たい まで つらぬく', () => {
  const { g, p, es } = setup(6, 120, 45);
  give(p, 'laser'); p.face = 1;
  const n = fireLaser(g, p, WEAPONS.laser);
  assert.equal(n, WEAPONS.laser.laser.pierce);
  const hit = es.filter((e) => e.hp < 500).length;
  assert.equal(hit, 4);
  assert.equal(es[4].hp, 500); assert.equal(es[5].hp, 500);
  assert.equal(g.lasers.length, 1);
  assert.equal(rayBox(0, 0, 1, 0, { x: 10, y: -5, w: 10, h: 10 }, 100), 10);
  assert.equal(rayBox(0, 0, -1, 0, { x: 10, y: -5, w: 10, h: 10 }, 100), -1);
});

test('レーザー：うちすぎると オーバーヒート、さめると また うてる', () => {
  const a = createArsenal(['pistol', 'laser']); a.cur = 'laser';
  const L = WEAPONS.laser.laser;
  let shots = 0, r, t = 0;
  while (t < 10) { r = tickLaser(a, DT, true); t += DT; if (r) shots++; if (r === 'over') break; }
  assert.equal(r, 'over');
  assert.ok(shots >= 6 && shots <= 9, `${shots}はつ で あつく なる`);
  assert.equal(tickLaser(a, DT, true), false);
  let w = 0; while (a.guns.laser.over && w < 10) { tickGear(a, DT); w += DT; }
  assert.ok(w > 1 && w < 2.5, `さめる じかん ${w}`);
  a.cool = 0; assert.equal(tickLaser(a, DT, true), true);
});
