import test from 'node:test';
import assert from 'node:assert/strict';
import { art, ART_NAMES } from '../js/art.js';
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
test('dog slot is the soldier ソルジャー with a gun', () => {
  const c = CHARACTERS.find(c => c.id === 'dog');
  assert.equal(c.name, 'ソルジャー');
  assert.equal(c.weapon, 'gun');
  assert.deepEqual(c.perk, { hp: 30 });
  const svg = svgOf(art('dog'));
  assert.ok(svg.includes('fill="#f5f5f4"') && svg.includes('fill="#dc2626"'), 'にほんの はたの ワッペン');
  for (const ch of CHARACTERS) assert.match(ch.name, /^[\u3041-\u309f\u30a0-\u30ff]+$/, ch.name);
});

// こどもの リクエスト：てきは「わるものぐんだん」。ぜんいん ワッペンを つける（プレイヤーには つけない）
test('every enemy and boss wears the わるものぐんだん emblem', () => {
  for (const n of Object.keys(ENEMY_TYPES)) {
    for (const flash of [false, true]) assert.ok(svgOf(art(n, flash)).includes('data-emblem="warumono"'), `${n}${flash ? '!' : ''}`);
  }
  for (const c of CHARACTERS) assert.ok(!svgOf(art(c.id)).includes('data-emblem="warumono"'), c.id);
});

// こどもの リクエスト：てきは ぜんぶ わるものぐんだんの へいたい（ボスの なまえも かなだけ）
test('enemies are わるものぐんだん soldiers with kana-only boss names', () => {
  const kana = /^[\u3041-\u309f\u30a0-\u30ff ]+$/;
  const bosses = Object.entries(ENEMY_TYPES).filter(([, t]) => t.name);
  assert.equal(bosses.length, 6);
  for (const [, t] of bosses) assert.match(t.name, kana, t.name);
  for (const s of STAGES) if (s.mini.name) assert.match(s.mini.name, kana, s.mini.name);
  assert.equal(ENEMY_TYPES.maou.name, 'だいそうすい');
  // だいそうすいは むねと ぼうしの 2か所に ワッペン
  assert.equal(svgOf(art('maou')).split('data-emblem="warumono"').length - 1, 2);
});
