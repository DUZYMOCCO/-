import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STORY1_HINTS } from '../js/story/story-1.js?v=3';

const storyDir = fileURLToPath(new URL('../assets/story/', import.meta.url));

test('story107: 第1章・第2章・第3章の全セリフにメタ発言（☰、マス、もしもの、ボタン）が含まれない', () => {
  const files = readdirSync(storyDir).filter(f => /^(story1_|story2_|story3_).*\.json$/.test(f));
  assert.ok(files.length >= 15, `対象ファイル数: ${files.length}`);
  const FORBIDDEN = ['☰', 'マス', 'もしもの', 'ボタン'];

  for (const f of files) {
    const sc = JSON.parse(readFileSync(`${storyDir}/${f}`, 'utf8'));
    for (const line of sc.lines || []) {
      if (!line.text) continue;
      for (const word of FORBIDDEN) {
        assert.ok(!line.text.includes(word), `${f} [${line.who || 'N/A'}] に "${word}" が含まれています: ${line.text}`);
      }
    }
  }
});

test('story107: STORY1_HINTS に intro / found / after / lose が定義されている', () => {
  assert.ok(STORY1_HINTS, 'STORY1_HINTS が存在すること');
  assert.equal(typeof STORY1_HINTS.intro, 'string', 'intro hint が文字列であること');
  assert.equal(typeof STORY1_HINTS.found, 'string', 'found hint が文字列であること');
  assert.equal(typeof STORY1_HINTS.after, 'string', 'after hint が文字列であること');
  assert.equal(typeof STORY1_HINTS.lose, 'string', 'lose hint が文字列であること');
  assert.ok(STORY1_HINTS.intro.length > 0);
  assert.ok(STORY1_HINTS.found.length > 0);
  assert.ok(STORY1_HINTS.after.length > 0);
  assert.ok(STORY1_HINTS.lose.length > 0);
  assert.ok(Object.isFrozen(STORY1_HINTS), 'STORY1_HINTS が freeze されていること');
});
