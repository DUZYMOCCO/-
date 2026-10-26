import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('R-09: 資材バーとヒントが入力を受け、周囲の帯は地図へ通す', () => {
  const css = readFileSync(new URL('../css/bot-commander.css', import.meta.url), 'utf8');
  assert.match(css, /\.bc-hint,\s*\.bc-mat\s*\{\s*pointer-events:\s*auto/);
  assert.match(css, /\.bc-mission\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(css, /\.bc-bottom\s*\{[^}]*pointer-events:\s*none/s);
});
