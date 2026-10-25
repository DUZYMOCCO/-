import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackConfirm, requestBack, cancelBack } from '../js/ui/back-confirm.js?v=1';
test('ミッション中は確認を開き、続けるで元の一時停止状態に戻る', () => {
  const c = createBackConfirm();
  assert.equal(requestBack(c, { inMission: true, paused: false }), 'open');
  assert.equal(requestBack(c, { inMission: true, paused: true }), 'none');
  assert.equal(cancelBack(c), false);
  assert.equal(cancelBack(c), null);
  assert.equal(requestBack(c, { inMission: true, paused: true }), 'open');
  assert.equal(cancelBack(c), true);
});
test('結果画面では確認せずに戻る', () => {
  assert.equal(requestBack(createBackConfirm(), { inMission: false, paused: false }), 'exit');
});
