// v1.0.3 Codex gfx5 の取り込み: 味方の機体の傷んだ姿と残骸・異星生物の休眠体・2つ目の地面・斜めの浅瀬・拾い物の印・武器の絵・顔 3 つ・
// ?enemydemo=1 の見本（G05〜G12・地雷・巨大機ラストタイタン・地図の小物）。どれも見た目だけ（sim は変えない。ハッシュは sim.test などで見ている）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rasterArtSources, wreckArtSources, WRECK_ART, BODY_RECT, widenRect, gfx5GallerySources, GFX5_ENEMY_ART, GIANT_ART, PROP_ART, propDisplay, PROP_PX, shallowGroundSources } from '../js/render/raster-art.js?v=14';
import { damagedKey, wreckKey, wreckAlpha, trimWrecks, WRECK_SEC, WRECK_FADE, WRECK_MAX, DAMAGED_AT } from '../js/render/wreck-view.js?v=3';
import { gfx5GalleryLayout, galleryLayout } from '../js/render/enemy-gallery.js?v=3';
import { FIELD_ORDER, createField, bakeChunk, groundVariant } from '../js/render/ground-field.js?v=3';

const path = rel => fileURLToPath(new URL(rel, import.meta.url));
const fileOf = url => fileURLToPath(url.split('?')[0]);
const SW = readFileSync(path('../sw-assets.js'), 'utf8');
const swHas = url => SW.includes(`'assets/${url.split('/assets/')[1]}'`);
const allCached = (src, label) => { for (const [k, s] of Object.entries(src)) { assert.ok(existsSync(fileOf(s.url)), `${label} ${k} の絵がある`); assert.ok(swHas(s.url), `${label} ${k} 先読み`); } };
const json = rel => JSON.parse(readFileSync(path(rel), 'utf8'));
/** sprite() の焼き方（textures.js の rasterToCanvas）での 1254 枠 → 焼いた絵の倍率と、足元・左右の中心 */
const bake = (r, fit = [0.94, 0.86]) => ({ k: Math.min(fit[0] / r[2], fit[1] / r[3]), foot: r[1] + r[3], cx: r[0] + r[2] / 2 });

test('gfx5 ALLY_WRECK: 傷んだ姿・残骸は体と同じ倍率・同じ足元・同じ中心で焼く（はみ出す横だけ広げる）', () => {
  const src = wreckArtSources(), body = rasterArtSources();
  assert.deepEqual(Object.keys(src).sort(), Object.keys(WRECK_ART).sort());
  const bodyKey = { ponco: 'ponco_ally', scav: 'scav_ally', flyer: 'flyer_ally', amph: 'amph_ally', alien: 'alien_enemy' };
  for (const [key, a] of Object.entries(WRECK_ART)) {
    const s = src[key], b = body[bodyKey[a.kind]];
    assert.ok(b, `${a.kind} の体の絵`);
    assert.deepEqual([...BODY_RECT[a.kind]], [...b.rect], `${a.kind} の体の切り抜きは本体と同じ`);
    const x = bake(s.rect), y = bake(b.rect);
    assert.ok(Math.abs(x.k - y.k) < 1e-12, `${key} 倍率が体と同じ`);
    assert.equal(x.foot, y.foot, `${key} 足元`); assert.ok(Math.abs(x.cx - y.cx) < 1e-9, `${key} 中心`);
    assert.ok(s.rect[0] <= a.art[0] + 1e-9 && s.rect[0] + s.rect[2] >= a.art[0] + a.art[2] - 1e-9, `${key} 絵が横に切れない`);
    assert.ok(s.rect[1] <= a.art[1], `${key} 絵が上に切れない`);
  }
  allCached(src, 'ALLY_WRECK');
  assert.deepEqual(Object.keys(wreckArtSources(['flyer'])), ['wreck_flyer'], 'その種類の分だけ読む');
  assert.deepEqual(widenRect([100, 0, 200, 50], [150, 0, 100, 50]), [100, 0, 200, 50]);
  assert.deepEqual(widenRect([100, 0, 200, 50], [50, 0, 100, 50]), [50, 0, 300, 50]);
});

test('gfx5 ALLY_WRECK: どの機体に傷んだ姿・残骸を出すか（HP 半分以下・味方 4 種と異星生物）', () => {
  const u = (kind, side, hp, maxHp = 100) => ({ kind, side, hp, maxHp });
  assert.equal(DAMAGED_AT, 0.5);
  assert.equal(damagedKey(u('ponco', 'ally', 50)), 'dmg_ponco');
  assert.equal(damagedKey(u('scav', 'ally', 10)), 'dmg_scav');
  assert.equal(damagedKey(u('ponco', 'ally', 51)), null);
  assert.equal(damagedKey(u('ponco', 'ally', 0)), null, 'やられた後は傷んだ姿ではなく残骸');
  assert.equal(damagedKey(u('flyer', 'ally', 10)), null, '飛ぶ機体の傷んだ姿はない');
  assert.equal(damagedKey(u('ponco', 'enemy', 10)), null);
  for (const k of ['ponco', 'scav', 'flyer', 'amph']) assert.equal(wreckKey(u(k, 'ally', 0)), `wreck_${k}`);
  assert.equal(wreckKey(u('alien', 'enemy', 0)), 'wreck_alien');
  for (const k of ['boy', 'girl', 'launcher', 'gunner']) assert.equal(wreckKey(u(k, 'ally', 0)), null, `${k} は残骸を残さない`);
  assert.equal(wreckAlpha(0), 0); assert.equal(wreckAlpha(5), 1); assert.equal(wreckAlpha(WRECK_SEC + WRECK_FADE), 0);
  const list = Array.from({ length: WRECK_MAX + 3 }, () => ({ t: 1 }));
  trimWrecks(list);
  assert.equal(list.filter(w => w.t < WRECK_SEC).length, WRECK_MAX); assert.equal(list[0].t, WRECK_SEC, '古い物から消える');
  const R = readFileSync(path('../js/render/renderer.js'), 'utf8');
  assert.match(R, /wreckArtSources\(\[kind\]\)/, 'その種類の機体が出た時に読む');
  assert.doesNotMatch(readFileSync(path('../js/render/wreck-view.js'), 'utf8'), /Math\.random|sim\.rng/, '乱数は使わない');
});

test('gfx5 GROUND_TILE: 2つ目の地面（真上の地面だけ）と斜めの浅瀬。版は 4x4 マスごとに座標で決まる', () => {
  const a = rasterArtSources();
  for (const k of ['plain', 'forest', 'mountain', 'water']) {
    assert.match(a[`tile_${k}_0`].url, new RegExp(`art-v2/ground-${k}\\.webp`));
    assert.match(a[`tile_${k}_1`].url, new RegExp(`art-v2/ground-${k}_v2\\.webp`));
    assert.equal(rasterArtSources({ ground: 'oblique' })[`tile_${k}_1`].url, rasterArtSources({ ground: 'oblique' })[`tile_${k}_0`].url, '斜めの地面は 1 つだけ');
  }
  allCached(Object.fromEntries(Object.entries(a).filter(([k]) => k.startsWith('tile_'))), 'GROUND');
  allCached(shallowGroundSources(), 'SHALLOW'); allCached(shallowGroundSources({ ground: 'oblique' }), 'SHALLOW oblique');
  assert.match(shallowGroundSources({ ground: 'oblique' }).tile_shallow_0.url, /art-v2-oblique\/ground-shallow\.webp/);
  // 同じ場所ならいつも同じ・だいたい半分ずつ
  let n = 0; for (let x = 0; x < 60; x++) for (let y = 0; y < 60; y++) { const v = groundVariant(x, y, 2); assert.equal(v, groundVariant(x, y, 2)); n += v; }
  assert.ok(n > 1500 && n < 2100, `半分くらい（${n}/3600）`);
  // bakeChunk: alt がなければ前と同じ。alt があれば区画ごとに入れ替わる
  const PPT = 8, size = PPT * 4, keys = Array(16 * 16).fill('plain');
  const flat = (c, alt) => FIELD_ORDER.map(() => { const d = new Uint8ClampedArray(size * size * 4); for (let i = 0; i < size * size; i++) d.set([c, c, c, 255], i * 4); const t = { size, data: d }; if (alt != null) t.alt = flat(alt)[0]; return t; });
  const f = createField(keys, 16, 16), img0 = new Uint8ClampedArray(16 * PPT * 16 * PPT * 4), img1 = img0.slice();
  bakeChunk(f, flat(100), 0, 0, 16, 16, PPT, img0);
  assert.ok(img0.every((v, i) => v === (i % 4 === 3 ? 255 : 100)));
  bakeChunk(f, flat(100, 200), 0, 0, 16, 16, PPT, img1);
  for (let by = 0; by < 4; by++) for (let bx = 0; bx < 4; bx++) {
    const want = groundVariant(bx, by, 0) ? 200 : 100;
    for (const [dx, dy] of [[0, 0], [size - 1, size - 1]]) { const i = ((by * size + dy) * 16 * PPT + bx * size + dx) * 4; assert.equal(img1[i], want, `区画 ${bx},${by}`); }
  }
  const R = readFileSync(path('../js/render/renderer.js'), 'utf8');
  assert.match(R, /groundVariant\(Math\.floor\(tx \/ 4\), Math\.floor\(ty \/ 4\)/, 'edges2 の地面も同じ区画で選ぶ');
});

test('gfx5 ?enemydemo=1: G05〜G12（休眠体は同じ倍率）・地雷・ラストタイタン・小物の見本。前の見本（gfx4）とは重ならない', () => {
  const src = gfx5GallerySources();
  for (const id of Object.keys(GFX5_ENEMY_ART)) assert.deepEqual(src[`enemy_${id}`].rect, src[`enemy_${id}_dormant`].rect, `${id} 休眠体は同じ切り抜き`);
  assert.equal(Object.keys(GFX5_ENEMY_ART).length, 8);
  const lt = bake(src.giant_lasttitan.rect), ltw = bake(src.giant_lasttitan_wreck.rect);
  assert.ok(Math.abs(lt.k - ltw.k) < 1e-12 && lt.foot === ltw.foot, 'ラストタイタンの残骸は同じ倍率・足元');
  allCached(src, 'GFX5 見本');
  for (const [id, p] of Object.entries(PROP_ART)) for (const [st, [w, h]] of Object.entries(p.size)) {
    const s = src[`prop_${id}${st}`];
    assert.ok(existsSync(fileOf(s.url)));
    const shown = propDisplay(w, h, p.worldW) * w * Math.min(PROP_PX / w, PROP_PX / h) / PROP_PX;
    assert.ok(Math.abs(shown - p.worldW) < 1e-9, `${id}${st} 地図での幅は worldW`);
    const meta = json('../assets/props/props.json')[`${id}_v1`];
    const m = st ? meta.states[st.slice(1)] : meta;
    assert.deepEqual([m.w, m.h, m.worldW], [w, h, p.worldW], `${id}${st} props.json と同じ大きさ`);
  }
  assert.doesNotMatch(SW, /props\.json/, 'props.json はしまっただけ（読まない）');
  const map = { w: 40, h: 60, hq: { ally: { tx: 20, ty: 56 } } };
  const old = galleryLayout(map), lay = gfx5GalleryLayout(map);
  assert.equal(lay.length, Object.keys(src).length, '見本の絵を全部並べる');
  assert.ok(Math.max(...lay.map(p => p.y)) < Math.min(...old.map(p => p.y)) - 32, 'gfx4 の見本より上');
  for (const p of lay) assert.ok(p.x >= 32 && p.x <= 39 * 32 && p.y >= 80, `${p.key} 地図の中`);
  const rows = [...new Set(lay.map(p => p.y))].sort((a, b) => a - b);
  for (let i = 1; i < rows.length; i++) {
    const lower = lay.filter(p => p.y === rows[i]), tallest = Math.max(...lower.map(p => p.display * (p.anchor ? p.anchor[1] : 0.88)));
    assert.ok(rows[i] - tallest > rows[i - 1] - 4, `列 ${i} の絵が上の列の足元にかぶらない`);
  }
  assert.doesNotMatch(readFileSync(path('../js/sim/sim.js'), 'utf8'), /G0[5-9]|G1[0-2]|LASTTITAN/, 'sim には入れない');
});

test('gfx5 拾い物の印・武器の絵・顔: 新しい絵を使い、前の絵は消さない', async () => {
  const L = json('../assets/landmarks/landmarks.json');
  for (const k of ['repair-tool', 'barrier']) { assert.ok(L._icons[k]); assert.ok(existsSync(path(`../assets/landmarks/${L._icons[k].file ?? L._icons[k]}`))); }
  const A = json('../assets/weapons/armory-data.json'), items = JSON.stringify(A);
  for (const id of ['W1-11', 'W2-04', 'W2-07', 'W3-08']) { assert.match(items, new RegExp(`"${id}\\.webp"|weapons/${id}\\.webp|"${id}"`)); assert.ok(existsSync(path(`../assets/weapons/${id}.webp`))); }
  for (const f of ['weld_s1', 'overhaul_s2', 'dome_s2', 'weld_s3']) assert.ok(existsSync(path(`../assets/weapons/${f}.webp`)), `${f} は残す（ほかの武器が使う）`);
  const P = json('../assets/portraits/portraits.json').chars;
  for (const [c, f] of [['BOY', 'angry'], ['BOY', 'sad'], ['WOLF', 'worried']]) {
    assert.ok(P[c].faces[f], `${c} ${f}`); assert.ok(existsSync(path(`../assets/portraits/${c}/${c}__${f}.webp`)));
    assert.ok(SW.includes(`'assets/portraits/${c}/${c}__${f}.webp'`));
  }
  for (const c of ["ALT_AMPHI", "ALT_FLYER", "BACA", "BOY", "BULLDOZER_G", "CE_MISSILE", "DOTERAINER", "EA07", "GHOSTEAGLE", "GIRL", "GRANDCRUSHER", "GUARDIAN_DA", "IF_HEAVY", "IRONCLAD", "JEMINI", "LASTTITAN", "MIRAGEBLADEZ", "NEJI", "ONBO_PL", "ONBO_R01", "ONBO_R02", "ONBO_R03", "ONBO_R07", "ONBO_R08", "PHANTOMSTRIKER", "PONCO02", "PONCO07", "PONCO13", "PONCO17C", "PONCO44", "PONCO91", "SCOUTMATE", "SHADOWRUNNER", "SPIDER8", "TITANFRAME", "WHIPTAIL", "WOLF", "ZA01", "ZA25"]) assert.ok(P[c], `${c} を消していない（立ち絵を作る道具で作り直すと ALT_* が消えるので、顔だけ手で足した）`);
});

test('gfx5: 先読みの一覧に同じファイルが 2 度ない・全部ある', () => {
  const files = [...SW.matchAll(/^\s*'([^']+)',/gm)].map(m => m[1]);
  assert.equal(new Set(files).size, files.length, `重複 ${files.filter((f, i) => files.indexOf(f) !== i)}`);
  for (const f of files) assert.ok(existsSync(path(`../${f}`)), f);
});
