import test from 'node:test';
import assert from 'node:assert/strict';
import { art, ART_NAMES, groundTile } from '../js/art.js';
import { CHARACTERS, ENEMY_TYPES, STAGES, WEAPONS } from '../js/rules.js';

const svgOf = url => decodeURIComponent(url.slice(url.indexOf(',') + 1, -2));

test('every sprite the game asks for exists', () => {
  const needed = [
    ...CHARACTERS.map(c => c.id), ...Object.keys(ENEMY_TYPES), ...STAGES.map(s => `ground-${s.ground}`),
    'gem1', 'gem2', 'gem3', 'coin', 'meat', 'magnet', 'nuke', 'bomb', 'kunai', 'star', 'bolt',
    'sword', 'armor', 'shoes', 'charm', 'chest', 'chestOpen',
    'gun', 'shotgun', 'bazooka', 'dual', 'gatling', 'mega', 'rocket', 'bullet', 'pellet', 'blast',
  ];
  for (const n of needed) assert.ok(ART_NAMES.includes(n), n);
  for (const w of Object.values(WEAPONS)) if (w.shot) assert.ok(ART_NAMES.includes(w.shot), w.shot);
});

// 同じタグに同じ属性が2回あると、ブラウザは SVG 全体を読めず 絵が消える
test('no SVG tag repeats an attribute', () => {
  for (const n of ART_NAMES) {
    for (const flash of [false, true]) {
      const svg = svgOf(art(n, flash));
      for (const tag of svg.match(/<[a-zA-Z][^>]*>/g)) {
        const names = [...tag.matchAll(/\s([a-zA-Z-:]+)="/g)].map(m => m[1]);
        assert.equal(new Set(names).size, names.length, `${n}${flash ? '!' : ''}: ${tag.slice(0, 80)}`);
      }
    }
  }
});

// こどもの リクエスト：いぬ → ゆうしゃ → じゅうを もった ソルジャー（id は セーブ互換で dog のまま）
test('dog slot is the soldier ソルジャー with the blue laser gun', () => {
  const c = CHARACTERS.find(c => c.id === 'dog');
  assert.equal(c.name, 'ソルジャー');
  assert.equal(c.weapon, 'laser');
  assert.ok(svgOf(art('dog')).includes('#67e8f9') && !svgOf(art('ally')).includes('#67e8f9'), 'レーザーじゅうは じぶんだけ');
  assert.deepEqual(c.perk, { hp: 10 }); // v1.11.0：レーザーじゅうで はじまるので HP ボーナスは 30→10
  const svg = svgOf(art('dog'));
  assert.ok(svg.includes('fill="#f5f5f4"') && svg.includes('fill="#dc2626"'), 'にほんの はたの ワッペン');
  for (const ch of CHARACTERS) assert.match(ch.name, /^[\u3041-\u309f\u30a0-\u30ff]+$/, ch.name);
});

// こどもの リクエスト：てきは「わるものぐんだん」。ぜんいん ワッペンを つける（プレイヤーには つけない）
test('every enemy and boss wears the わるものぐんだん emblem', () => {
  for (const [n, T] of Object.entries(ENEMY_TYPES)) {
    // うちゅうじんは わるものぐんだん では ない（ボトルから でてくる）
    if (T.noEmblem) { assert.ok(!svgOf(art(n)).includes('data-emblem'), n); continue; }
    for (const flash of [false, true]) assert.ok(svgOf(art(n, flash)).includes('data-emblem="warumono"'), `${n}${flash ? '!' : ''}`);
  }
  for (const c of CHARACTERS) assert.ok(!svgOf(art(c.id)).includes('data-emblem="warumono"'), c.id);
});

// こどもの リクエスト：てきは ぜんぶ わるものぐんだんの へいたい（ボスの なまえも かなだけ）
test('enemies are わるものぐんだん soldiers with kana-only boss names', () => {
  const kana = /^[\u3041-\u309f\u30a0-\u30ff ]+$/;
  const bosses = Object.entries(ENEMY_TYPES).filter(([, t]) => t.name);
  assert.equal(bosses.length, 10); // ステージの ボス（v1.13.0 ジャングルたいちょう・v1.14.0 そうこうトラック／こうげきヘリ も）＋ さばくの ちかの ドリルたいちょう
  for (const [, t] of bosses) assert.match(t.name, kana, t.name);
  for (const s of STAGES) if (s.mini.name) assert.match(s.mini.name, kana, s.mini.name);
  assert.equal(ENEMY_TYPES.maou.name, 'だいそうすい');
  // だいそうすいは むねと ぼうしの 2か所に ワッペン
  assert.equal(svgOf(art('maou')).split('data-emblem="warumono"').length - 1, 2);
});

// くさはらは わるものぐんだんに あらされた じめん（320px タイル）＋ けんきゅうしゃ と スーパーミサイル の 絵
test('ruined meadow, researcher and super missile art', () => {
  for (const n of ['researcher', 'smissile']) assert.ok(ART_NAMES.includes(n), n);
  assert.equal(groundTile('lab'), 320);
  for (const k of ['desert', 'snow', 'forest', 'castle']) assert.equal(groundTile(k), 160);
  const g = svgOf(art('ground-lab'));
  assert.ok(g.includes('viewBox="0 0 320 320"'));
  assert.ok(g.length < 40000, `ground svg too big: ${g.length}`);
  assert.ok(!svgOf(art('researcher')).includes('data-emblem'), 'けんきゅうしゃは みかた');
});

// こどもの リクエスト：ステージ1は けんきゅうじょ。ガラスの ボトルと、ときどき なかに うちゅうじん
test('lab floor, specimen bottles and alien art', () => {
  for (const n of ['ground-lab', 'capsule', 'capsuleBroken', 'alien']) assert.ok(ART_NAMES.includes(n), n);
  for (const n of ['capsule', 'capsuleBroken', 'alien']) {
    const s = svgOf(art(n));
    assert.ok(!s.includes('data-emblem'), `${n} は てきの マークなし`);
    assert.ok(s.length < 6000, `${n} too big`);
  }
  assert.ok(svgOf(art('capsule')).includes('#22c55e'), 'みどりの えきたい');
});

// こどもの リクエスト：みかたの けんきゅうじょは しろく きれいに。はたは みかたの かっこいい はた
test('white friendly lab floor and heroic lab flag', () => {
  const g = svgOf(art('ground-lab'));
  assert.ok(g.includes('#e8eef3'), 'まぶしすぎない オフホワイト');
  assert.ok(!g.includes('#5a1414'), 'わるものの はたは もう ない');
  assert.ok(!g.includes('data-emblem'));
  const f = svgOf(art('labFlag'));
  assert.ok(ART_NAMES.includes('labFlag'));
  assert.ok(f.includes('#2563eb') && f.includes('#facc15'), 'あおい たて と ほし');
  assert.ok(!f.includes('data-emblem') && !f.includes('#5a1414'), 'わるものの マークでは ない');
});

// こどもの リクエスト：バリアで たたかう うさぎ → まじゅつし（id は セーブ互換で rabbit のまま）
test('rabbit slot is the good magician まじゅつし with a barrier and a magic circle', () => {
  const c = CHARACTERS.find(c => c.id === 'rabbit');
  assert.equal(c.name, 'まじゅつし');
  assert.equal(c.weapon, 'aura');
  assert.deepEqual(c.perk, { spd: 0.2 });
  const svg = svgOf(art('rabbit'));
  assert.ok(svg.includes('#1e3a8a') && svg.includes('#facc15') && svg.includes('#22d3ee'), 'こん・きん・ひかる つえ');
  assert.ok(!svg.includes('data-emblem="warumono"') && !svg.includes('#4c1d95'), 'てきの まじょ では ない');
  assert.ok(svgOf(art('magicCircle')).includes('<circle'));
});

// こどもの リクエスト：ねこ → にんじゃ、パンダ → ボマー（id は セーブ互換で cat／panda のまま）
test('cat slot is the good ninja にんじゃ and panda slot is the good bomber ボマー', () => {
  const cat = CHARACTERS.find(c => c.id === 'cat'), panda = CHARACTERS.find(c => c.id === 'panda');
  assert.equal(cat.name, 'にんじゃ'); assert.equal(cat.weapon, 'kunai'); assert.deepEqual(cat.perk, { spd: 0.08 });
  assert.equal(panda.name, 'ボマー'); assert.equal(panda.weapon, 'bomb'); assert.deepEqual(panda.perk, { hp: 20, regen: 0.5 });
  const nj = svgOf(art('cat')), bm = svgOf(art('panda'));
  assert.ok(nj.includes('#14b8a6') && !nj.includes('#4c1d95'), 'みどりあお。てきの かげのたいちょう（むらさき）では ない');
  assert.ok(bm.includes('fill="#f5f5f4"') && bm.includes('fill="#dc2626"'), 'ボマーは にほんの はたの ワッペン');
  assert.ok(bm.includes('#1e3a8a'), 'あおい ばくだん');
  for (const s of [nj, bm]) assert.ok(!s.includes('data-emblem="warumono"'));
  for (const n of ['mummy', 'thrower']) assert.notEqual(ENEMY_TYPES[n].name, panda.name);
});

// こどもの リクエスト：きつね → かみなりさま、ペンギン → けいさつかん（id は セーブ互換で fox／penguin のまま）
test('fox slot is the thunder god かみなりさま and penguin slot is the police officer けいさつかん', () => {
  const fox = CHARACTERS.find(c => c.id === 'fox'), pg = CHARACTERS.find(c => c.id === 'penguin');
  assert.equal(fox.name, 'かみなりさま'); assert.equal(fox.weapon, 'thunder'); assert.deepEqual(fox.perk, { dmg: 0.1 });
  assert.equal(pg.name, 'けいさつかん'); assert.equal(pg.weapon, 'gun'); assert.deepEqual(pg.perk, { pickup: 0.5, hp: 20 }); assert.equal(pg.unlock, 2);
  const tg = svgOf(art('fox')), pc = svgOf(art('penguin'));
  assert.ok(tg.includes('#dc2626') && tg.includes('#facc15') && tg.includes('#e0f2fe'), 'たいこの わ・きんの かみなり・くも');
  assert.ok(pc.includes('#1e3a8a') && pc.includes('#7dd3fc') && pc.includes('#facc15'), 'こんの ぼうし・みずいろの シャツ・きんの ほし');
  for (const s of [tg, pc]) { assert.ok(!s.includes('data-emblem="warumono"')); assert.equal((s.match(/<svg/g) || []).length, 1); }
  assert.equal((svgOf(art('rabbit')).match(/<svg/g) || []).length, 1, 'まじゅつしも 1まいの svg');
});

// こどもの リクエスト：くま → さばくに なじむ カウボーイ（id は セーブ互換で bear のまま）
test('bear slot is the desert cowboy カウボーイ with a shotgun', () => {
  const c = CHARACTERS.find(c => c.id === 'bear');
  assert.equal(c.name, 'カウボーイ'); assert.equal(c.weapon, 'shotgun'); assert.deepEqual(c.perk, { hp: 70 }); assert.equal(c.unlock, 3);
  const svg = svgOf(art('bear'));
  assert.ok(svg.includes('#c2873a') && svg.includes('#e7d3a8'), 'すな・ちゃいろの ぼうしと シャツ');
  assert.ok(svg.includes('#2563eb') && !svg.includes('data-emblem="warumono"'), 'あおい バンダナの みかた（ナイフへいの あかい マスクでは ない）');
  assert.equal((svg.match(/<svg/g) || []).length, 1);
});

// こどもの リクエスト：きょうりゅう → ロケットへい、ユニコーン → かみさま（id は セーブ互換で dino／unicorn のまま）
test('dino slot is the rocket soldier ロケットへい and unicorn slot is the deity かみさま', () => {
  const dn = CHARACTERS.find(c => c.id === 'dino'), un = CHARACTERS.find(c => c.id === 'unicorn');
  assert.equal(dn.name, 'ロケットへい'); assert.equal(dn.weapon, 'bazooka'); assert.deepEqual(dn.perk, { dmg: 0.25 }); assert.equal(dn.unlock, 4);
  assert.equal(un.name, 'かみさま'); assert.equal(un.weapon, 'thunder'); assert.deepEqual(un.perk, { dmg: 0.15, spd: 0.1, hp: 40, regen: 0.5 }); assert.equal(un.unlock, 5);
  const rk = svgOf(art('dino')), gd = svgOf(art('unicorn')), sol = svgOf(art('dog')), tg = svgOf(art('fox'));
  assert.ok(rk.includes('fill="#f5f5f4"') && rk.includes('fill="#dc2626"'), 'にほんの はたの ワッペン');
  assert.ok(rk.includes('#3d4f3a') && rk.includes('#f97316') && !rk.includes('#2563eb'), 'オリーブの ランチャー（ソルジャーの あおい レーザーじゅう では ない）');
  assert.notEqual(rk, sol);
  assert.ok(gd.includes('#fde047') && gd.includes('#fafaf9') && gd.includes('#84cc16'), 'ひかりの わ・しろい ローブ・はっぱの かんむり');
  assert.ok(!gd.includes('#dc2626'), 'かみなりさまの あかい たいこは ない');
  assert.ok(tg.includes('#dc2626'));
  for (const s of [rk, gd]) { assert.ok(!s.includes('data-emblem="warumono"')); assert.equal((s.match(/<svg/g) || []).length, 1); }
  for (const n of Object.values(ENEMY_TYPES)) assert.ok(n.name !== dn.name && n.name !== un.name);
});

// v1.15.0：9にんが がったいした ゴッドロボ（あたらしい id。ステージ7 クリアで なかま）
test('godrobo is the combined god robot ゴッドロボ (laser + thunder, unlock after stage 7)', async () => {
  const { startWeapons, normalizeSave, charUnlocked, upgradeChoices } = await import('../js/rules.js');
  const c = CHARACTERS.find(c => c.id === 'godrobo');
  assert.equal(CHARACTERS.length, 10);
  assert.equal(c.name, 'ゴッドロボ'); assert.equal(c.unlock, 7);
  assert.deepEqual(startWeapons(c), { laser: 1, thunder: 1 });
  assert.deepEqual(startWeapons(CHARACTERS[0]), { kunai: 1 });
  assert.ok(!charUnlocked(normalizeSave({ stageClears: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 } }), c));
  assert.ok(charUnlocked(normalizeSave({ stageClears: { 7: 1 } }), c));
  // まだ なかまで ない セーブで えらんで いたら さいしょの キャラに もどる
  assert.equal(normalizeSave({ character: 'godrobo', stageClears: { 1: 1 } }).character, CHARACTERS[0].id);
  // じゅう けいを もって いるので さいしょの じゅう3択は でない
  const first = upgradeChoices(startWeapons(c), {}, () => 0.3);
  assert.notDeepEqual(first.map(x => x.id), ['gun', 'shotgun', 'bazooka'], 'じゅう3択 では ない');
  const svg = svgOf(art('godrobo'));
  for (const col of ['#fde047', '#14b8a6', '#2563eb', '#dc2626', '#c2873a', '#3d4f3a', '#f8fafc']) assert.ok(svg.includes(col), col);
  assert.ok(!svg.includes('data-emblem="warumono"'));
  assert.equal((svg.match(/<svg/g) || []).length, 1);
});
