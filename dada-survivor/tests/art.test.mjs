import test from 'node:test';
import assert from 'node:assert/strict';
import { art, ART_NAMES } from '../js/art.js';
import { CHARACTERS, ENEMY_TYPES, STAGES } from '../js/rules.js';

const svgOf = url => decodeURIComponent(url.slice(url.indexOf(',') + 1, -2));

test('every sprite the game asks for exists', () => {
  const needed = [
    ...CHARACTERS.map(c => c.id), ...Object.keys(ENEMY_TYPES), ...STAGES.map(s => `ground-${s.ground}`),
    'gem1', 'gem2', 'gem3', 'coin', 'meat', 'magnet', 'nuke', 'bomb', 'kunai', 'star', 'bolt',
    'sword', 'armor', 'shoes', 'charm', 'chest', 'chestOpen',
  ];
  for (const n of needed) assert.ok(ART_NAMES.includes(n), n);
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
