import { fileURLToPath } from 'node:url';
// 遮蔽物の状態別の絵（Codex）と落とし物アイコン: landmarks.json の中身・ファイル・キャッシュ一覧・アイコンの選び方
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { WEAPONS } from '../js/sim/weapons.js?v=2';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LM = JSON.parse(readFileSync(join(ROOT, 'assets/landmarks/landmarks.json'), 'utf8'));
const sw = () => { const sb = { GAME_ASSETS: {} }; new Function('self', readFileSync(join(ROOT, 'sw-assets.js'), 'utf8'))(sb); return sb.GAME_ASSETS['bot-commander']; };

test('landmarks.json: 9種類すべてに傷んだ・壊れた絵があり、ファイルとキャッシュ一覧がそろう', () => {
  const ids = Object.keys(LM).filter(k => !k.startsWith('_'));
  assert.equal(ids.length, 9);
  const files = sw().files;
  for (const id of ids) {
    const m = LM[id];
    for (const st of ['damaged', 'destroyed']) {
      const s = m.states?.[st]; assert.ok(s, `${id} に ${st} がない`);
      assert.equal(s.file, `${id}_${st}.webp`);
      assert.ok(existsSync(join(ROOT, 'assets/landmarks', s.file)), s.file);
      assert.ok(files.includes(`assets/landmarks/${s.file}`), `sw-assets.js に載っていない: ${s.file}`);
      // 同じキャンバスなので、ゲーム内の幅は元の絵と大きくは変わらない（壊れた木は倒れて少し広がる）
      assert.ok(Math.abs(s.worldW - m.worldW) / m.worldW < 0.25, `${id} ${st} worldW ${s.worldW} vs ${m.worldW}`);
      assert.ok(s.anchor[1] > 0.85 && s.anchor[1] < 1.0, `${id} ${st} 足元 ${s.anchor}`);
    }
  }
});

test('落とし物アイコン: 5種類が landmarks.json・ファイル・キャッシュ一覧にある', () => {
  const files = sw().files;
  for (const n of ['repair-kit', 'gun', 'cannon', 'blade', 'grenade']) {
    const f = LM._icons?.[n]?.file; assert.equal(f, `icons/pickup-${n}.webp`);
    assert.ok(existsSync(join(ROOT, 'assets/landmarks', f)), f);
    assert.ok(files.includes(`assets/landmarks/${f}`), f);
  }
});

test('落とし物アイコンの選び方: 修理キット / 銃 / 筒 / 刃 / 爆弾、ほかは銃', async () => {
  globalThis.navigator ??= { userAgent: 'node' }; // Pixi を読むため
  const { pickupIconName } = await import('../js/render/cover-view.js?v=3');
  const byType = t => pickupIconName({ type: 'weapon' }, { type: t });
  assert.equal(pickupIconName({ type: 'repair' }), 'repair-kit');
  assert.equal(byType('shoot'), 'gun'); assert.equal(byType('cannon'), 'cannon');
  assert.equal(byType('melee'), 'blade'); assert.equal(byType('throw'), 'grenade');
  assert.equal(byType('barrier'), 'gun'); assert.equal(pickupIconName({ type: 'weapon' }, undefined), 'gun');
  for (const w of WEAPONS) assert.ok(['gun', 'cannon', 'blade', 'grenade'].includes(byType(w.type)));
});
