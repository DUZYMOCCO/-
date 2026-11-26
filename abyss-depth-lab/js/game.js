/**
 * ABYSS DIVE — 深淵潜航 のゲーム本体（描画・更新・入力・音をすべて内包）。
 *
 * 工房の他ゲームと同じく、ハブから動的 import され init() で起動する。
 * createAbyssDive({ canvas, onGameOver }) を呼ぶと、その canvas に描き込み、
 * 停止・破棄までを自分で管理する（DOM の生成は呼び出し側の index.js が行う）。
 */

import { createExplore } from './explore.js?v=13';
import { createBase } from './base.js?v=21';
import { drawTorpedoShape, drawMissileShape } from './projectile-shapes.js?v=3';
import { DIVE_BASE, outpostMarker, deepOpen, baseStage, baseDockNear } from './base-rules.js?v=11';
import { createResourceLedger, RESOURCE_KEY } from './resources.js?v=2';
import { createUpgradeStore, createUpgradePanel, effectiveStats, visualScale, UPGRADE_KEY } from './upgrade-rules.js?v=2';
import { createTrenchView } from './trench.js?v=4';
import { createTrench, trenchFloorYAt, resolveSub, trenchSegHit, inTrenchRegion, corridorAt,
  base2Open, base2Marker, base2DockNear, base2Stage, trenchStage, TRENCH } from './trench-rules.js?v=4';
import { sampleBiomeAt, zoneNameAt, depthMetersAt, formatDepthDisplay } from './world-biomes.js?v=2';
import { createRadioChat, RADIO_KEY } from './radio-rules.js?v=1';
import { createMusic, MUSIC_URL } from './music.js?v=1';
import { createBarrierState, deployBarrier, tickBarrier, presentHit, endBarrierFrame,
  closeBarrier, barrierReady, barrierReadyProgress, BARRIER } from './barrier-rules.js?v=1';
import { createShipStore, createShipPanel, applyShipStats, shipBarrierConfig,
  SHIP_KEY, SHIPS, SHIP_ORDER } from './ship-rules.js?v=1';
import { drawShipRig, drawShipBody, hasBespokeHull, hullSource, setFirepowerPlate } from './ship-rig.js?v=3';
/* v1.19.0: 進行方向に応じた見た目の動き（ピッチ／バンク）。純粋ルールは ship-motion.js。 */
import { pitchTarget, pitchStep, twistStep, bodyTransform, localToWorld } from './ship-motion.js?v=1';
/* v3.7.0(隔離試作): 敵汎用の「表示ポーズ → 撃破破片」共有モジュール（純粋ロジック/DOM 非依存）。
   通常描画と撃破が *同じ* ローカル部位姿勢を読み、表示した物がそのまま割れる。 */
import * as PD from './pose-debris.js?v=1';
import { createArsenalStore, createWeaponPanel, weaponParams, rollItem, designItem, itemShort, itemBadge, itemShots,
  qualityLabel, WEAPON_KEY, WEAPON_TYPES, ARSENAL_CAP, salvoSpread, MISSILE_BASE, TORPEDO_BASE } from './weapon-rules.js?v=5';
/* v1.16.0: 追加兵装（通常/反射レーザー・反射魚雷・全自動近接）と、回収からの恒久解放・指定開発。 */
import { createAdvancedStore, createForgePanel, shotParams, rollAdvanced, SHOT_WEAPONS, SHOT_ORDER, initialShot,
  buildGeometry, fireBeam, advanceProjectile, optionLabel, TRAIT_ORDER, TRAIT_NAMES, traitOptions,
  designCost, traitCompatible, shotQualityLabel, itemCount, itemPattern, ADV_KEY,
  createMelee, MELEE_TYPES, MELEE_ORDER } from './advanced-weapons.js?v=5';
import { storage } from '../../common/js/storage.js';
/* v1.19.0: 冒頭ストーリー（導入）。初回だけ潜航の前に短い会話を出す独立モジュール。
   ルールは intro-rules.js（純粋）、描画・入力は intro.js。資源・装備・既存セーブには触れない。 */
import { INTRO_KEY, createIntroStore } from './intro-rules.js?v=6';
import { createIntro } from './intro.js?v=5';
/* v3.8.0: 熱水・火山帯 固有の固定型・中型敵「煤冠イソギンチャク（仮）」の純ロジック
   （発生地点・当たり・予告/攻撃の状態機械・1遭遇の台帳）。 */
import { ANEMONE, anemoneAnchor, stepAnemone, createAnemoneEncounter } from './anemone-rules.js?v=1';
/* v2.1.0(試作): 非攻撃の照明弾（弾数無制限）と、光を当てて見える深い区間の規則。
   ルールは純粋モジュール側。ここは入力・更新・描画だけ。資源/当たり/武器には触れない。 */
import { FLARE, createFlareState, fireFlare, tickFlares, resetFlares, flareIntensity } from './flare-rules.js?v=4';
import { LIT_WATCH, inLitWatch } from './deep-light-rules.js?v=2';
/* v3.8.0(隔離試作): 地層背負いの巨蟹（仮）。岩に擬態する大型蟹の遭遇は純粋ルール側。 */
import { GEO_CRAB, createGeoCrab, stepGeoCrab, geoCrabLeg, geoCrabLegTouch,
  geoCrabBodyHit, geoCrabHitZone, geoCrabDamage, createCrabEncounter } from './geo-crab-rules.js?v=1';
/* v3.9.2(隔離試作): 礫鎧ガニ A/B/C。承認済みの全身原画から解剖分割したパーツを共有リグで組み立てる。
   A=丸い／B=低く幅広い／C=青灰の異形鎧。色替えではなく体格・歩行・鋏の違いで識別する。 */
import { GRAVEL_CRAB_SPECIES, GRAVEL_CRAB_KEYS, gravelCrabGeom, createGravelCrab,
  stepGravelCrab, gravelCrabPose, gravelCrabClaw, gravelCrabClawTouch,
  gravelCrabBodyHit, gravelCrabDamage, gravelCrabHitZone,
  GRAVEL_CRAB_SHOTS, gravelCrabShot, gravelCrabShotOrigin, stepGravelShot } from './gravel-crab-rules.js?v=5';
/* v3.9.4: 礫鎧ガニの発射物の遮蔽/地形判定に、既存の幾何（castSegment / pointInShapes）を再利用する。 */
import { castSegment, pointInShapes } from './geometry-rules.js';
/* v2.2.0: 透過マップ（縦断面）。ルールは map-rules.js、描画/入力は dive-map.js。
   潜航の描画には触れず、上に 1 枚重ねる独立モジュール。発見記録は専用キー（別系統・有界）。 */
import { createDiscoveredStore, MAP_KEY, sitesWithin, deepVisible, WORLD_BOTTOM } from './map-rules.js?v=2';
import { createDiveMap } from './dive-map.js?v=2';
import { ZOOM_LEVELS, clampZoom, cycleZoom, nudgeZoom, zoomStep } from './zoom-rules.js?v=1';

export function createAbyssDive(opts) {
  'use strict';
  const options = opts || {};
  const canvas = options.canvas;
  const onGameOver = options.onGameOver;
  const depthBridge = options.depthBridge || null;
  /* v3.0.0 一本化: 従来の本番セーブキー（abyss_*）をそのまま正規保存先として引き継ぐ。
     旧キーが未保存で _depthlab キーだけ存在する端末もフォールバック読み込みで保護する。 */
  const MISSING = Symbol('missing');
  const loadUnified = (k, fallback) => {
    if (typeof localStorage === 'undefined') return fallback;
    const primary = storage.get(k, MISSING);
    if (primary !== MISSING) return primary;
    return storage.get(k + '_depthlab', fallback);
  };
  const saveUnified = (k, v) => {
    if (typeof localStorage === 'undefined') return;
    if (v == null) storage.remove(k);
    else storage.set(k, v);
  };

  /* 破棄時に外すリスナーを記録しておく（ハブへ戻ったあと動き続けないように） */
  const _listeners = [];
  function on(target, type, fn, opt) {
    target.addEventListener(type, fn, opt);
    _listeners.push([target, type, fn, opt]);
  }
  const errors = [];
  let running = false;


  /* =====================================================================
     ABYSS DIVE — 深淵潜航
     深海横スクロール潜水艇アクション（Canvas 2D / 依存ライブラリなし）
     ===================================================================== */

  /* ------------------------------------------------------------------ *
   * 0. Canvas / viewport
   * ------------------------------------------------------------------ */
  const VW = 1280, VH = 720;                 // logical resolution
  const cvs = canvas;
  const ctx = cvs.getContext('2d', { alpha: !!depthBridge });
  const LIGHT_SCALE = 0.5;
  const darkCv = document.createElement('canvas');
  darkCv.width = VW * LIGHT_SCALE;
  darkCv.height = VH * LIGHT_SCALE;
  const dctx = darkCv.getContext('2d');

  /* v2.1.0(試作): 「光を当てて初めて見える」深い区間の低コスト描画。
     litMaskCv＝ライトのマスク（艇灯＋照明弾）。litDetailCv＝深い敵のディテール。
     ディテールをマスクで destination-in して、当たった側だけ読ませる（一律発光ではない）。 */
  const litMaskCv = document.createElement('canvas');
  litMaskCv.width = VW * LIGHT_SCALE; litMaskCv.height = VH * LIGHT_SCALE;
  const lmctx = litMaskCv.getContext('2d');
  const litDetailCv = document.createElement('canvas');
  litDetailCv.width = VW; litDetailCv.height = VH;
  const ldctx = litDetailCv.getContext('2d');

  /* v2.1.0(試作): 非攻撃の照明弾（弾数無制限）。出撃ごとにリセットして持ち越さない。 */
  let flareState = createFlareState();
  /* v3.11.0: ノンストップ無線会話（時間停止なし・操作中断なし）。既読は専用キーに保存。 */
  const radioChat = createRadioChat({
    load: () => loadUnified(RADIO_KEY, null),
    save: (v) => storage.set(RADIO_KEY, v),
  });
  let corridorRush = 0;
  let corridorDir = 1;
  let corridorSfxCd = 0;

  const view = { dpr:1, cssW:0, cssH:0, scale:1, ox:0, oy:0 };
  function resize(){
    // Limit high-density backing stores to keep mobile fill cost bounded.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const host = (cvs.parentElement && cvs.parentElement.clientHeight) ? cvs.parentElement : document.body;
    const w = Math.max(320, host.clientWidth || window.innerWidth);
    const h = Math.max(240, host.clientHeight || window.innerHeight);
    view.dpr = dpr; view.cssW = w; view.cssH = h;
    cvs.width  = Math.round(w * dpr);
    cvs.height = Math.round(h * dpr);
    cvs.style.width  = w + 'px';
    cvs.style.height = h + 'px';
    view.scale = Math.min(w / VW, h / VH);
    view.ox = (w - VW * view.scale) * 0.5;
    view.oy = (h - VH * view.scale) * 0.5;
    buildUI();
  }
  on(window, 'resize', resize);
  on(window, 'orientationchange', () => setTimeout(resize, 120));

  /* ------------------------------------------------------------------ *
   * 1. Utils
   * ------------------------------------------------------------------ */
  const TAU = Math.PI * 2;
  const rnd   = (a, b) => a + Math.random() * (b - a);
  const rint  = (a, b) => Math.floor(a + Math.random() * (b - a));
  const pick  = a => a[(Math.random() * a.length) | 0];
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const lerp  = (a, b, t) => a + (b - a) * t;
  const d2    = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx*dx + dy*dy; };
  const angNorm = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  let seed = 1337;
  const srnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  function loadArt(file) {
    const img = new Image();
    img.src = new URL('../assets/' + file, import.meta.url).href;
    return img;
  }
  const ruinsArt = loadArt('sunken-city.webp');
  const subArt = loadArt('submersible-09.webp');
  const leviathanArt = loadArt('leviathan.webp');
  const pilotTitleArt = loadArt('pilot-smug.webp');
  const pilotArt = loadArt('pilot-neutral.webp');
  const pilotHurtArt = loadArt('pilot-hurt.webp');
  const mineArt = loadArt('organic-mine.webp');
  const hermitArt = loadArt('hermit-tank.webp');
  const hermitDormantArt = loadArt('hermit-tank-dormant.webp');
  /* v3.7.0(隔離試作): B亜種ヤドカリ（中型）。既存の戦車ヤドカリとは別種・別アセットで共存。
     歩行=<16コマ strip>＋部位別アトラス、警戒=静止パーツ、撃破=殻/胴/脚/鋏/眼に分裂（演出のみ）。
     参照元（読取のみ）: scratch/abyss-hermit-palette-tree の隔離試作。 */
  const hermitBWalkArt = loadArt('hermit-b-walk.webp');
  const hermitBAlertArt = loadArt('hermit-b-alert.webp');
  const hermitBPartArt = {
    shell: loadArt('hermit-b-part-shell.webp'), torso: loadArt('hermit-b-part-torso.webp'),
    legs: loadArt('hermit-b-part-legs.webp'), clawL: loadArt('hermit-b-part-clawL.webp'),
    clawR: loadArt('hermit-b-part-clawR.webp'), eyes: loadArt('hermit-b-part-eyes.webp'),
  };
  /* 歩行のパーツ別アトラス（hermit-b-walk.webp と同座標で書き出し済み）。 */
  const hermitBWalkPartArt = {
    shell: loadArt('hermit-b-walk-shell.webp'), torso: loadArt('hermit-b-walk-torso.webp'),
    legs: loadArt('hermit-b-walk-legs.webp'), clawL: loadArt('hermit-b-walk-clawL.webp'),
    clawR: loadArt('hermit-b-walk-clawR.webp'), eyes: loadArt('hermit-b-walk-eyes.webp'),
  };
  const gunnerArt = loadArt('squid-gunner.webp');
  /* v3.8.0: 煤冠イソギンチャク（Blender オフライン焼きの透過 WebP。閉/白い予告/広げ/引っ込む/死） */
  const anemoneArt = Object.fromEntries(['closed', 'warn', 'open', 'retract', 'dead']
    .map(p => [p, loadArt(`anemone-cinder-${p}.webp`)]));
  /* v3.8.0(隔離試作): 地層背負いの巨蟹の殻（オフライン Blender 焼き。黒玄武岩の露頭）。
     脚は殻に焼き込まず、ゲーム内で関節として描く（拡大した静止画にしない）。 */
  const geoCrabShellArt = loadArt('geo-crab-shell.webp');
  /* v3.8.0-crab 改2: 前脚は Blender 4.5 / Cycles で焼いた実体メッシュのパーツ（関節ピボット付き）。
     素材が読めない時だけ、下の Canvas 図形（drawCrabLegRig のフォールバック）に落ちる。 */
  const crabLegArt = {
    merus: loadArt('crab-leg-merus.webp'),
    fore: loadArt('crab-leg-fore.webp'),
    claw: loadArt('crab-leg-claw.webp'),
  };
  const CRAB_LEG_META = {
    merus: { w:1614, h:287, scale:5.0, pivot:[48.6, 182.34] },
    fore:  { w:1739, h:240, scale:5.0, pivot:[90.0, 136.89] },
    claw:  { w:360,  h:344, scale:5.0, pivot:[139.87, 171.5] },
  };
  /* v3.9.2(隔離試作): 礫鎧ガニ A/B/C の解剖パーツ（全身原画から分割。幾何ブロックアウトの型抜きはしない）。 */
  const gravelCrabArt = {};
  for (const _gk of GRAVEL_CRAB_KEYS){
    const _gm = gravelCrabGeom(_gk);
    gravelCrabArt[_gk] = {};
    if (_gm) for (const _pn in _gm.parts) gravelCrabArt[_gk][_pn] = loadArt(_gm.parts[_pn].file);
  }
  const fishArt = Object.fromEntries(['minnow', 'hunter', 'angler'].map(kind =>
    [kind, loadArt(`fish-${kind}-swim.webp`)]));
  /* v1.6.0 徒歩探索: アセット倉庫 bot-commander/assets/suit の既存素材から生成した歩行アトラス
     （v1.8.0: 8コマ歩行＋歩き出し＋調査を 1 枚のアトラスに。射撃は上半身を別途） */
  const suitWalkArt = loadArt('suit_walk.webp');
  const suitShootUpperArt = loadArt('suit_shoot_upper.webp');
  const suitShootBodyArt = loadArt('suit_shoot_body.webp');   // v1.10.1: 腕を抜いた射撃の体（腕は upper を切り抜いて回す）
  /* v1.9.0 徒歩探索の地上敵（倉庫 bot-commander/assets/enemies の G06。休眠と活動の 2 枚） */
  const foeArt = loadArt('G06.webp');
  const foeDormantArt = loadArt('G06_dormant.webp');
  /* v1.10.0: 海底基地。室内は倉庫 hangar（縦長）を切り出し、エリーは倉庫 GIRL の idle/walk。 */
  const baseHangarArt = loadArt('base-hangar.webp');
const cabinWorkshopArt = loadArt('cabin-workshop.webp');
const cabinEllieAnimArt = loadArt('cabin_ellie_anim.webp');
const cabinGemAnimArt = loadArt('cabin_gem_anim.webp');
const cabinPoncoAnimArt = loadArt('cabin_ponco_anim.webp');
  const ellieIdleArt = loadArt('ellie_idle.webp');
  const ellieWalkArt = loadArt('ellie_walk.webp');
  /* v1.19.0: 冒頭ストーリーの風景スプライト（倉庫 art-v2 の scavenger をコピー）と、
     会話用の立ち絵（倉庫 portraits/GIRL・PONCO02 をコピー。発話者を明示する別レイヤ）。 */
  const scavengerArt = loadArt('scavenger.webp');
  const girlNeutralArt = loadArt('girl_neutral.webp');
  const girlSmugArt = loadArt('girl_smug.webp');
  const girlSurprisedArt = loadArt('girl_surprised.webp');
  const girlSadArt = loadArt('girl_sad.webp');
  const poncoNeutralArt = loadArt('ponco_neutral.webp');
  const poncoAlertArt = loadArt('ponco_alert.webp');
  const gemNeutralArt = loadArt('gem_neutral.webp');
  const ready = img => img.complete && img.naturalWidth > 0;

  function makeTexture(width, height, paint) {
    const tile = document.createElement('canvas');
    tile.width = width;
    tile.height = height;
    paint(tile.getContext('2d'));
    return tile;
  }

  // Shared lamp position in hull-local coordinates. Darkness and scattering
  // use the same two origins as the visible lamps.
  const LAMP_X = 59;
  const LAMP_Y = 17;
  const BEAM_LENGTH = 640;
  const BEAM_HALF_HEIGHT = 170;
  const beamTexture = makeTexture(320, 170, g => {
    // Soft across the cone as well as along it. Bake once at half resolution.
    const pixels = g.createImageData(320, 170);
    for (let y = 0; y < pixels.height; y++) {
      for (let x = 0; x < pixels.width; x++) {
        const u = x / pixels.width;
        const edge = 1.8 + u * 79;
        const spread = Math.abs(y - 85) / edge;
        const strength = Math.pow(Math.max(0, 1 - spread * spread), 2.6);
        const falloff = Math.pow(1 - u, 2) * (0.72 + 0.28 * Math.sin(Math.PI * u));
        const at = (y * pixels.width + x) * 4;
        pixels.data[at] = 246 - 52 * u;
        pixels.data[at + 1] = 229 - 34 * u;
        pixels.data[at + 2] = 157 - 12 * u;
        pixels.data[at + 3] = 164 * strength * falloff;
      }
    }
    g.putImageData(pixels, 0, 0);
  });

  /* v2.1.0(試作): 深い区間の「ディテールを見せるマスク」用の光条。
     見える光条（beamTexture）は近距離で急に減衰するため、そのままでは遠くの敵を読ませられない。
     マスクは可読性のためのもので、見た目の光条とは別に、距離減衰を緩くした白いコーンを使う。 */
  const litBeamTexture = makeTexture(320, 170, g => {
    const px = g.createImageData(320, 170);
    for (let y = 0; y < px.height; y++) {
      for (let x = 0; x < px.width; x++) {
        const u = x / px.width;
        const edge = 1.8 + u * 79;
        const spread = Math.abs(y - 85) / edge;
        const strength = Math.pow(Math.max(0, 1 - spread * spread), 2.2);
        const at = (y * px.width + x) * 4;
        px.data[at] = 255; px.data[at + 1] = 255; px.data[at + 2] = 255;
        px.data[at + 3] = Math.min(255, 225 * strength * (0.85 + 0.15 * Math.sin(Math.PI * u)));
      }
    }
    g.putImageData(px, 0, 0);
  });

  const bubbleTexture = makeTexture(32, 32, g => {
    const edge = g.createRadialGradient(16, 16, 6, 16, 16, 15);
    edge.addColorStop(0, 'rgba(26,67,73,0.04)');
    edge.addColorStop(0.75, 'rgba(100,165,182,0.30)');
    edge.addColorStop(0.89, 'rgba(181,226,234,0.60)');
    edge.addColorStop(1, 'rgba(125,200,220,0)');
    g.fillStyle = edge;
    g.fillRect(0, 0, 32, 32);
    g.fillStyle = 'rgba(218,246,250,0.66)';
    g.beginPath(); g.ellipse(11, 8, 5, 2, -0.55, 0, TAU); g.fill();
  });

  let leviathanSkin;
  function getLeviathanSkin(g) {
    if (!leviathanSkin && ready(leviathanArt)) {
      const tile = makeTexture(128, 96, skin => {
        skin.drawImage(leviathanArt, 640, 0, 256, 192, 0, 0, 128, 96);
      });
      leviathanSkin = g.createPattern(tile, 'repeat');
    }
    return leviathanSkin;
  }

  /* ------------------------------------------------------------------ *
   * 2. Audio (合成音 + v2.0.3 のミサイル着弾サンプル)
   * ------------------------------------------------------------------ */
  function _sfxUrl(rel){ try { return new URL(rel, import.meta.url).href; } catch (e) { return rel; } }
  /* v2.0.3: ミサイル着弾の実録音レイヤー（attack=乾いた機械的衝撃 / body=鈍い水圧 / tail=水・泡）。
     音源は Lots of Sounds ではなく別の CC0 ライブラリ（出所・ライセンスは docs/WORK_REPORT.md）。
     stock は承認済みアセットそのまま（不変）。finned / stout は同じ CC0取得＋attack/body/tail 方式の別テイクで、
     鳴る音は個体の着弾音IDで固定（毎回ランダムに変えない）。遅延ロード＝初回のユーザー操作（resume）でだけ読む。
     失敗・未ロード・未対応IDは従来の合成音（missileBoom）を維持する。 */
  const MISSILE_IMPACT_URLS = {
    stock:  _sfxUrl('../assets/sfx/missile-impact.m4a'),
    finned: _sfxUrl('../assets/sfx/missile-impact-finned.m4a'),
    stout:  _sfxUrl('../assets/sfx/missile-impact-stout.m4a'),
  };
  const MISSILE_IMPACT_IDS = ['stock', 'finned', 'stout'];   // 武器側の実在ID（TRAIT_COMPAT.missile.impactSound）に一致
  const MISSILE_IMPACT_MAX_VOICES = 3;   // 近接同時着弾で濁らないよう同時発音の上限を設ける
  /* 個体IDごとの再生ゲイン。stock=0.40 は承認済み音の実測値そのまま（前後で不変）。
     finned は sharper/高クレストで既存 master のコンプが浅く掛かるため、実測で着弾レベルを
     そろえる（finned=1.00 / stout=0.40）。音量ではなく音色・長さで個性を出す。 */
  const MISSILE_IMPACT_GAIN = { stock: 0.40, finned: 1.00, stout: 0.40 };
  const AU = {
    ctx:null, master:null, ambGain:null, ambFilt:null, rumbleGain:null,
    on:false, muted:false, voices:0, lastShot:0,
    impactBufs:{}, impactLoading:{}, impactBlocked:{}, impactVoices:[],

    init(){
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { return; }
      const c = this.ctx;

      this.master = c.createGain(); this.master.gain.value = 0.5;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 14; comp.ratio.value = 7;
      comp.attack.value = 0.004; comp.release.value = 0.22;
      this.master.connect(comp); comp.connect(c.destination);

      const len = Math.floor(c.sampleRate * 2);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;

      // --- ambient drone -------------------------------------------------
      this.ambGain = c.createGain(); this.ambGain.gain.value = 0;
      this.ambFilt = c.createBiquadFilter();
      this.ambFilt.type = 'lowpass'; this.ambFilt.frequency.value = 240; this.ambFilt.Q.value = 0.8;
      this.ambFilt.connect(this.ambGain); this.ambGain.connect(this.master);
      [54, 54.7, 81.2].forEach((f, i) => {
        const o = c.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth';
        o.frequency.value = f;
        const g = c.createGain(); g.gain.value = i === 2 ? 0.12 : 0.3;
        o.connect(g); g.connect(this.ambFilt); o.start();
      });
      const ns = c.createBufferSource(); ns.buffer = buf; ns.loop = true;
      const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 480; nf.Q.value = 0.5;
      const ng = c.createGain(); ng.gain.value = 0.55;
      ns.connect(nf); nf.connect(ng); ng.connect(this.ambGain); ns.start();
      this.ambGain.gain.setTargetAtTime(0.16, c.currentTime, 2.0);

      // --- persistent boss rumble ---------------------------------------
      const ro = c.createOscillator(); ro.type = 'sine'; ro.frequency.value = 34;
      const rl = c.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 90;
      this.rumbleGain = c.createGain(); this.rumbleGain.gain.value = 0;
      ro.connect(rl); rl.connect(this.rumbleGain); this.rumbleGain.connect(this.master);
      ro.start();

      this.on = true;
      this.setDepth(0);
    },

    resume(){ this.init(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); try { music.ensure(); } catch (e) { /* BGM は失敗してもゲームを止めない */ } try { this.ensureImpactSample(); } catch (e) { /* 着弾サンプルも失敗でゲームを止めない */ } },
    mute(v){ this.muted = v; if (this.master) this.master.gain.setTargetAtTime(v ? 0 : 0.5, this.ctx.currentTime, 0.04); },
    setDepth(t){ if (this.on) this.ambFilt.frequency.setTargetAtTime(lerp(300, 84, t), this.ctx.currentTime, 0.8); },
    setRumble(v){ if (this.on) this.rumbleGain.gain.setTargetAtTime(clamp(v, 0, 0.45), this.ctx.currentTime, 0.25); },

    _noise(dur, type, f0, f1, q, gain, delay){
      if (!this.on || this.muted) return;
      const c = this.ctx, t0 = c.currentTime + (delay || 0);
      const s = c.createBufferSource(); s.buffer = this.noiseBuf;
      s.playbackRate.value = rnd(0.85, 1.15);
      const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(f0, t0);
      f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.012, dur * 0.2));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f); f.connect(g); g.connect(this.master);
      s.start(t0); s.stop(t0 + dur + 0.05);
    },
    _tone(type, f0, f1, dur, gain, delay){
      if (!this.on || this.muted) return;
      const c = this.ctx, t0 = c.currentTime + (delay || 0);
      const o = c.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + dur + 0.05);
    },

    /* v1.15.0: 射出音。v1.15.0+: 個体の外観（style）で音色を少し変える（性能には影響しない）。
       一斉射でも 1 回だけ呼ばれ、既存のレート制限で長押し連射でも耳につかない。 */
    shoot(style){
      const now = performance.now();
      if (now - this.lastShot < 45) return;          // rate-limit to avoid clicks
      this.lastShot = now;
      const st = style || 'stock';
      if (st === 'slender'){ this._noise(0.11, 'bandpass', 2000, 560, 1.3, 0.20); this._tone('sine', 330, 92, 0.10, 0.15); }
      else if (st === 'stout'){ this._noise(0.17, 'lowpass', 900, 250, 0.9, 0.26); this._tone('sine', 175, 52, 0.15, 0.19); }
      else { this._noise(0.13, 'bandpass', 1500, 380, 1.1, 0.22); this._tone('sine', 240, 70, 0.11, 0.16); }
    },
    /* ミサイル射出（チューブから「シュポンッ」と押し出す音） */
    mLaunch(style){
      const st = style || 'stock';
      this._tone('sine', 190, 82, 0.14, 0.22);
      this._noise(0.16, 'bandpass', st === 'stout' ? 420 : 680, 260, 0.9, 0.20);
    },
    /* アフターバーナー点火（「カッ…ゴォォォッ！」と一気に加速する推進音） */
    mIgnite(style){
      const now = performance.now();
      if (now - (this._lastIgnite || -99999) < 60) return;
      this._lastIgnite = now;
      const st = style || 'stock';
      // 点火クラック
      this._noise(0.07, 'highpass', 2200, 1200, 0.8, 0.24);
      this._tone('triangle', 520, 140, 0.11, 0.18);
      // アフターバーナー噴射の吹き上がり
      this._noise(0.36, 'bandpass', st === 'finned' ? 980 : 620, 2400, 0.75, 0.26, 0.02);
      this._tone('sawtooth', 120, 310, 0.26, 0.10, 0.02);
    },
    /* v1.15.0+: 複数着弾が近接して音が飽和しないよう、直近の着弾に重なる分は控えめにする。
       最初の一撃は常に素の音量（単発の手応えは不変）。効果＝ダメージは一切変えない。 */
    _impactDuck(){
      const now = performance.now();
      const d = now - (this._lastImpact || -99999);
      this._lastImpact = now;
      if (d < 90) return 0.6;
      if (d < 160) return 0.85;
      return 1;
    },
    boom(power, style){
      const p = clamp(power, 0.4, 2.2) * this._impactDuck();
      const st = style || 'stock';
      /* v1.16.0+: 着弾音（個体の独立項目）で余韻の色を少し変える。stock は従来の音そのまま。ダメージは不変。 */
      if (st === 'heavy'){ this._noise(0.72 * p, 'lowpass', 900, 70, 0.7, 0.50); this._tone('sine', 84, 26, 0.74 * p, 0.42); this._noise(0.24, 'highpass', 1600, 800, 0.5, 0.12, 0.03); }
      else if (st === 'light'){ this._noise(0.42 * p, 'highpass', 1900, 760, 0.9, 0.30); this._tone('sine', 150, 58, 0.44 * p, 0.26); this._noise(0.26, 'highpass', 2300, 1200, 0.5, 0.14, 0.02); }
      else if (st === 'slender'){ this._noise(0.44 * p, 'bandpass', 1650, 520, 0.8, 0.34); this._tone('sine', 158, 52, 0.5 * p, 0.30); this._noise(0.26, 'highpass', 2100, 1000, 0.5, 0.13, 0.02); }
      else if (st === 'stout'){ this._noise(0.62 * p, 'lowpass', 960, 82, 0.7, 0.46); this._tone('sine', 94, 30, 0.66 * p, 0.38); this._noise(0.26, 'highpass', 1700, 850, 0.5, 0.13, 0.02); }
      else { this._noise(0.55 * p, 'lowpass', 1100, 90, 0.7, 0.42); this._tone('sine', 110, 32, 0.6 * p, 0.34); this._noise(0.25, 'highpass', 1800, 900, 0.5, 0.14, 0.02); }
    },
    hit(){ this._noise(0.07, 'bandpass', 2400, 1200, 1.4, 0.13); },
    pick(){ this._tone('sine', 680, 1360, 0.14, 0.18); this._tone('sine', 1020, 2040, 0.12, 0.1, 0.06); },
    hurt(){ this._tone('sawtooth', 200, 52, 0.34, 0.24); this._noise(0.22, 'lowpass', 700, 120, 0.9, 0.2); },
    ping(){ this._tone('sine', 1250, 1180, 1.1, 0.16); this._tone('sine', 1250, 900, 0.9, 0.07, 0.35); },
    warp(){ this._tone('sine', 90, 300, 0.5, 0.2); this._noise(0.4, 'bandpass', 300, 1600, 0.8, 0.16); },
    creak(){ this._noise(rnd(0.5, 1.1), 'lowpass', rnd(240, 420), 120, 2.2, 0.07); },
    /* 爽快な「チュドーン！」ミサイル大爆発音（鋭い高域アタック「チュ！」＋腹に響く重低音「ドォォーン！」） */
    missileBoom(power, style){
      const p = clamp(power, 1, 2.4) * this._impactDuck();
      const st = style || 'stock';
      // 1) 「チュッ！」: 鋭く抜ける高周波スイープダウン＋パチッと弾けるクラック
      this._tone('sawtooth', st === 'finned' ? 1680 : 1380, 180, 0.085, 0.22 * Math.min(1.2, p));
      this._noise(0.09, 'highpass', 3200, 1100, 0.7, 0.30 * Math.min(1.2, p));
      // 2) 「ドォォーン！！」: 重厚なサブベース落下＋厚く抜ける爆風ノイズ
      const baseHz = st === 'stout' ? 118 : (st === 'finned' ? 152 : 136);
      this._tone('sine', baseHz, 24, 0.88 * p, 0.56);
      this._tone('triangle', baseHz * 1.45, 36, 0.48 * p, 0.28, 0.015);
      this._noise(0.84 * p, 'lowpass', 2400, 72, 0.55, 0.58, 0.015);
      // 3) 爽快な中域の抜け＋余韻の水中泡クラックル
      this._noise(0.36 * p, 'bandpass', 1100, 320, 0.8, 0.24, 0.03);
      this._noise(0.42, 'highpass', 2400, 950, 0.6, 0.14, 0.08);
    },
    /* ミサイル着弾は爽快な「チュドーン！」合成爆発音を主軸に鳴らす */
    missileImpact(power, style){
      this.missileBoom(power, style || 'stock');
    },
    /* v2.0.3: サンプルの遅延ロード。初回のユーザー操作で 1 回だけ各IDを試し、失敗したら二度と試さない。
       fetch/デコードに失敗してもゲームは止めない（合成音へ退避）。 */
    ensureImpactSample(){
      if (!this.on) return;
      if (typeof fetch !== 'function'){ for (const id of MISSILE_IMPACT_IDS) this.impactBlocked[id] = true; return; }
      const ctx = this.ctx; if (!ctx) return;
      for (const id of MISSILE_IMPACT_IDS){
        if (this.impactBufs[id] || this.impactLoading[id] || this.impactBlocked[id]) continue;
        const url = MISSILE_IMPACT_URLS[id];
        if (!url){ this.impactBlocked[id] = true; continue; }
        this.impactLoading[id] = true;
        fetch(url)
          .then(r => (r && r.ok) ? r.arrayBuffer() : Promise.reject(new Error('HTTP ' + (r && r.status))))
          .then(ab => new Promise((res, rej) => { ctx.decodeAudioData(ab, res, rej); }))
          .then(buf => { this.impactBufs[id] = buf; this.impactLoading[id] = false; })
          .catch(() => { this.impactLoading[id] = false; this.impactBlocked[id] = true; });   // 非ブロッキング
      }
    },
    /* v2.0.3: 着弾音IDの実サンプルを 1 発鳴らす。ミュートは master 経由で連動（合成音と同経路）。
       近接同時着弾は _impactDuck() と同時発音上限で濁り/クリップを防ぎ、上限超過は合成音へ退避。 */
    sampleImpact(power, style){
      const id = (style && MISSILE_IMPACT_URLS[style]) ? style : 'stock';
      if (!this.on || this.muted) return;
      const buf = this.impactBufs[id];
      if (!buf){ this.missileBoom(power, id); return; }
      const ctx = this.ctx;
      const p = clamp(power, 1, 2.4) * this._impactDuck();
      const t0 = ctx.currentTime;
      this.impactVoices = this.impactVoices.filter(v => v.end > t0);
      if (this.impactVoices.length >= MISSILE_IMPACT_MAX_VOICES){ this.missileBoom(power, id); return; }
      try {
        const src = ctx.createBufferSource(); src.buffer = buf;
        const gain = (MISSILE_IMPACT_GAIN[id] != null) ? MISSILE_IMPACT_GAIN[id] : 0.40;
        const g = ctx.createGain(); g.gain.value = gain * (p / 1.7);   // 基準 power=1.7。stock は実測値そのまま（不変）
        src.connect(g); g.connect(this.master);
        src.start(t0);
        this.impactVoices.push({ end: t0 + buf.duration, src: src });
      } catch (e) { this.missileBoom(power, id); }
    },
    alarm(){ this._tone('square', 780, 760, 0.18, 0.10); this._tone('square', 620, 600, 0.18, 0.10, 0.22); },
    /* v1.13.0: 瞬間バリア。発動／通常ガード／ジャスト／破損で音を分ける（青白い膜と対）。 */
    barrierOn(){ this._tone('sine', 300, 520, 0.14, 0.07); },
    barrierGuard(){ this._tone('sine', 520, 300, 0.16, 0.14); this._noise(0.12, 'bandpass', 1200, 700, 1.0, 0.11); },
    barrierJust(){ this._tone('triangle', 900, 1500, 0.18, 0.18); this._tone('sine', 1500, 2400, 0.16, 0.10, 0.02); this._noise(0.10, 'highpass', 2200, 3600, 0.6, 0.09); },
    barrierBreak(){ this._noise(0.30, 'lowpass', 900, 180, 0.8, 0.24); this._tone('sawtooth', 320, 90, 0.30, 0.16); },
    /* v2.1.0(試作): 照明弾の発射音（非攻撃の光。短い打ち上げと小さな火薬音）。 */
    flare(){ this._tone('sine', 240, 620, 0.18, 0.14); this._noise(0.22, 'bandpass', 1400, 500, 1.0, 0.12); },
    /* v3.11.0: 大深度・海流回廊の高速水流サウンド（爽快感のあるうなり＋泡の轟音）。 */
    corridorRush(){ this._noise(0.45, 'bandpass', 620, 320, 0.7, 0.11); this._tone('sine', 92, 138, 0.36, 0.08); }
  };

  /* v1.12.0: 控えめな環境 BGM（1曲）。既存のマスターへ薄く混ぜる（M で SE と一緒に切れる）。
     読み込みや再生に失敗してもゲームをブロックしない。ハブ帰還（destroy）で停止する。 */
  const music = createMusic({ getCtx: () => AU.ctx, getMaster: () => AU.master });

  /* ------------------------------------------------------------------ *
   * 3. Input  (mouse+keyboard  /  touch)
   * ------------------------------------------------------------------ */
  const Input = {
    mode:'mouse',
    keys:{},
    mx:VW * 0.78, my:VH * 0.5,
    fireQueued:false,          // セミオート: 押した瞬間の1発だけを予約する
    wantMissile:false, wantDash:false, wantSonar:false, wantPause:false,
    wantDock:false,            // v1.6.0: 遺跡へ降りる／戻る（E・パッドA・画面ボタン）
    wantFlare:false,           // v2.1.0(試作): 照明弾（画面「照明」ボタン・F）。押した瞬間だけ
    wantShoot:false,           // v1.8.0: 探索中の射撃（J/Z・画面ボタン。押した瞬間だけ）
    wantMap:false,             // v2.1.0: 透過マップを開く/閉じる（画面ボタン・G）
    wantZoom:false,            // v2.1.0: 潜航ズームの縮尺を 1 段切り替える（画面ボタン・C）
    fireMouseHeld:false,
    fireHeld:false,            // v1.8.2: 魚雷の押しっぱなし連射（専用ボタン/左クリック/J/Z）
    shootHeld:false,           // v1.8.2: 徒歩射撃の押しっぱなし連射（専用ボタン/J/Z）
    pad:{ x:0, y:0, action:false, actionEdge:false },   // v1.6.0: ゲームパッド（v1.16.0: y はメニュー上下）
    stick:{ active:false, id:null, ox:0, oy:0, x:0, y:0, dx:0, dy:0, r:78 },
    pinch:{ active:false, dist0:0, zoom0:1 },   // v2.1.0: 2本指ピンチ（潜航ズーム）
    ui:[],
    hitBtn:null, btnTouch:{},
  };
  function buildUI(){
    Input.ui = [
      { id:'fire',    x:VW-188, y:VH-118, r:76, label:'撃つ',     col:'#ffe08a' },
      { id:'flare',   x:VW-56,  y:VH-122, r:44, label:'照明',     col:'#ffe38b' },   // 撃つボタンの右側へ配置（視界を遮らない）
      { id:'missile', x:VW-336, y:VH-126, r:52, label:'ミサイル', col:'#ffb14a' },
      { id:'dash',    x:VW-196, y:VH-282, r:48, label:'バリア',   col:'#66e0ff' },
      { id:'sonar',   x:VW-322, y:VH-286, r:44, label:'ソナー',   col:'#8affd0' },
    ];
  }
  function toLogical(clientX, clientY){
    return {
      x: (clientX - view.ox) / view.scale,
      y: (clientY - view.oy) / view.scale
    };
  }
  function btnAt(x, y){
    for (const b of Input.ui) if (d2(x, y, b.x, b.y) < (b.r + 18) * (b.r + 18)) return b;
    return null;
  }
  function pressBtn(id){
    if (id === 'fire') Input.fireQueued = true;
    else if (id === 'missile') Input.wantMissile = true;
    else if (id === 'dash') Input.wantDash = true;
    else if (id === 'sonar') Input.wantSonar = true;
    else if (id === 'flare') Input.wantFlare = true;
    else if (id === 'pause') Input.wantPause = true;
    else if (id === 'map') Input.wantMap = true;
    else if (id === 'zoom') Input.wantZoom = true;
    else if (id === 'cabin') { if (G.state === 'play' && !G.exploreOn && !G.baseOn && !G.mapOn) enterBase(0); }
  }

  function syncFireHold(){
    const keys = Input.keys.KeyJ || Input.keys.KeyZ;
    const touch = Object.values(Input.btnTouch).includes('fire');
    Input.fireHeld = !G.exploreOn && !G.baseOn && G.state === 'play' && !!(keys || touch || Input.fireMouseHeld);
    Input.shootHeld = G.exploreOn && !!(keys || touch);
  }

  function clearFireHold(){
    Input.fireHeld = Input.shootHeld = Input.fireMouseHeld = false;
    Input.fireQueued = Input.wantShoot = false;
    Input.wantFlare = false;
    delete Input.keys.KeyJ; delete Input.keys.KeyZ;
    for (const id of Object.keys(Input.btnTouch)) if (Input.btnTouch[id] === 'fire') delete Input.btnTouch[id];
  }

  /* --- keyboard ------------------------------------------------------- */
  on(window, 'keydown', e => {
    if (e.repeat) return;
    Input.mode = 'mouse';
    /* v1.19.0: 冒頭ストーリー中はキーで進む／スキップ（潜航側へ入力を持ち込まない） */
    if (G.state === 'intro') { intro.key(e.code); e.preventDefault(); return; }
    /* v2.1.0: 透過マップ中はキーをマップ側で捌く（潜航へ持ち込まない） */
    if (G.mapOn) { if (diveMap.key(e.code)) e.preventDefault(); return; }
    Input.keys[e.code] = true;
    if (e.code === 'KeyJ' || e.code === 'KeyZ') {
      if (G.exploreOn) Input.wantShoot = true;
      else if (G.baseOn) { /* 基地内は射撃しない（入力を持ち込まない） */ delete Input.keys[e.code]; }
      else if (G.state === 'play') Input.fireQueued = true;
      else delete Input.keys[e.code];
      syncFireHold();
    }
    if (e.code === 'KeyK' || e.code === 'KeyL') Input.wantMissile = true;
    /* v2.1.0(試作): 照明弾（非攻撃の光）。潜航中だけ。メニュー/基地/探索へは持ち込まない。 */
    if (e.code === 'KeyF') { if (G.state === 'play' && !G.exploreOn && !G.baseOn) Input.wantFlare = true; }
    if (e.code === 'Space') { Input.wantDash = true; e.preventDefault(); }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') Input.wantSonar = true;
    if (e.code === 'KeyP' || e.code === 'Escape') Input.wantPause = true;
    if (e.code === 'KeyM') { AU.resume(); AU.mute(!AU.muted); }
    if (e.code === 'KeyE' || e.code === 'Enter') Input.wantDock = true;   // v1.6.0: 降艇／調べる／戻る
    if (e.code === 'KeyG') Input.wantMap = true;                          // v2.1.0: 透過マップを開く/閉じる
    if (e.code === 'KeyC') Input.wantZoom = true;                         // v2.1.0: 潜航ズームの縮尺切替
    if (e.code === 'KeyB') { if (G.state === 'play' && !G.exploreOn && !G.mapOn) { if (G.baseOn) exitBase(); else enterBase(0); } }
    if (e.code === 'KeyR' && G.state === 'dead') startGame();
  });
  on(window, 'keyup', e => {
    Input.keys[e.code] = false;
    /* v1.8.2: 射撃キーを離したらホールド解除（J/Z 両方を見て、片方だけ離しても続く） */
    if (e.code === 'KeyJ' || e.code === 'KeyZ') {
      syncFireHold();
    }
  });
  on(window, 'blur', () => { Input.keys = {}; Input.stick.active = false; Input.stick.dx = Input.stick.dy = 0; Input.pinch.active = false; clearFireHold(); });

  /* --- mouse ---------------------------------------------------------- */
  on(cvs, 'mousemove', e => {
    Input.mode = 'mouse';
    const p = toLogical(e.clientX, e.clientY);
    Input.mx = p.x; Input.my = p.y;
    if (G.mapOn) diveMap.mouseMove(p.x, p.y);   // v2.1.0: マップのドラッグ（パン）
  });
  on(cvs, 'mousedown', e => {
    AU.resume();
    if (G.mapOn) {                              // v2.1.0: マップ中はマップ側で捌く
      Input.mode = 'mouse';
      const q = toLogical(e.clientX, e.clientY);
      if (e.button === 0) diveMap.mouseDown(q.x, q.y);
      return;
    }
    if (G.baseOn) {
      if (e.button === 0) {
        const q = toLogical(e.clientX, e.clientY);
        base.click(q.x, q.y);
      }
      return;
    }
    if (G.exploreOn) return;      // v1.6.0: 探索中はマウスで潜航の射撃予約をしない（PCはE）
    Input.mode = 'mouse';
    const p = toLogical(e.clientX, e.clientY);
    Input.mx = p.x; Input.my = p.y;
    /* v1.19.0: 冒頭ストーリー中はクリックで進む／スキップ */
    if (G.state === 'intro') { if (e.button === 0) intro.tap(p.x, p.y); return; }
    if (e.button === 0) {
      const b = btnAt(p.x, p.y);
      if (G.state !== 'play') { clickScreen(p.x, p.y); return; }
      if (b) {
        pressBtn(b.id);
        if (b.id !== 'fire') return;
      } else Input.fireQueued = true;
      Input.fireMouseHeld = true;
      syncFireHold();
    } else if (e.button === 2) { Input.wantMissile = true; }
  });
  /* v1.8.2: キャンバス外で離してもホールドを解除する */
  on(window, 'mouseup', e => { if (e.button === 0) { Input.fireMouseHeld = false; syncFireHold(); if (G.mapOn) diveMap.mouseUp(); } });
  on(cvs, 'contextmenu', e => e.preventDefault());

  /* --- touch ---------------------------------------------------------- */
  /* v2.1.0: 2 本指の距離（ピンチの倍率計算用）。 */
  function touchDist(ts){
    if (!ts || ts.length < 2) return 0;
    return Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
  }
  function touchStart(e){
    AU.resume();
    Input.mode = 'touch';
    /* v1.19.0: 冒頭ストーリー中はタップで進む／スキップ（スティック等へ渡さない） */
    if (G.state === 'intro') { intro.touchStart(e); e.preventDefault(); return; }
    /* v2.1.0: 透過マップ中はタッチをマップ側で捌く（潜航へ持ち込まない＝入力隔離） */
    if (G.mapOn) { diveMap.touchStart(e); e.preventDefault(); return; }
    /* v1.6.0 徒歩探索中は探索側でタッチを捌く（スティックは Input.stick を共用） */
    if (G.exploreOn) { explore.touchStart(e); return; }
    if (G.baseOn) { base.touchStart(e); return; }
    /* タイトル / ゲームオーバー / ポーズ中は、どこをタップしても画面送り */
    if (G.state !== 'play') {
      const tp = (e.changedTouches && e.changedTouches.length)
        ? toLogical(e.changedTouches[0].clientX, e.changedTouches[0].clientY) : null;
      clickScreen(tp ? tp.x : null, tp ? tp.y : null);
      e.preventDefault(); return;
    }
    /* v2.1.0: 2 本指のピンチで潜航ズーム（スティックと射撃は奪わない）。
       スティック使用中・ボタン上のときは始めない（仮想スティック優先）。 */
    const ts = e.touches ? Array.from(e.touches) : [];
    if (ts.length >= 2 && !Input.stick.active && !Input.pinch.active){
      const onBtn = ts.some(t => { const q = toLogical(t.clientX, t.clientY); return !!btnAt(q.x, q.y); });
      if (!onBtn){
        Input.pinch.active = true;
        Input.pinch.dist0 = touchDist(ts);
        Input.pinch.zoom0 = G.diveZoomTarget;
        Input.fireQueued = false;   // 2 本目が「撃つ」に化けないよう消す
        e.preventDefault(); return;
      }
    }
    for (const t of e.changedTouches) {
      const p = toLogical(t.clientX, t.clientY);
      /* v1.6.0: 入口近くの「降艇」ボタン（潜航の既存ボタンには影響しない）。v1.10.0: 基地の「入港」も同じ位置。 */
      if ((G.entranceNear || G.baseNear) && d2(p.x, p.y, DOCK_BTN.x, DOCK_BTN.y) < (DOCK_BTN.r + 22) * (DOCK_BTN.r + 22)) {
        Input.btnTouch[t.identifier] = 'dock'; Input.wantDock = true; continue;
      }
      const b = btnAt(p.x, p.y);
      if (b) {
        Input.btnTouch[t.identifier] = b.id;
        pressBtn(b.id);
        /* v1.8.2: 「撃つ」ボタンは指を置いている間ホールド（他の指の解放では止めない） */
        if (b.id === 'fire') syncFireHold();
        continue;
      }
      if (!Input.stick.active && p.x < VW * 0.66) {
        Input.stick.active = true; Input.stick.id = t.identifier;
        Input.stick.ox = p.x; Input.stick.oy = p.y;
        Input.stick.x = p.x; Input.stick.y = p.y;
        Input.stick.dx = Input.stick.dy = 0;
      } else {
        Input.mx = p.x; Input.my = p.y;
        /* v2.1.0: セミオートの画面タップ射撃。ただし 2 本指（ピンチ）では撃たない。 */
        if (e.touches.length === 1) Input.fireQueued = true;
      }
    }
    if (!Input.stick.active && e.touches.length === 1 && clickScreen()) { /* consumed by title/dead */ }
    e.preventDefault();
  }
  function touchMove(e){
    if (G.mapOn) { diveMap.touchMove(e); e.preventDefault(); return; }
    if (Input.pinch.active && e.touches.length >= 2){
      const d = touchDist(Array.from(e.touches));
      G.diveZoomTarget = nudgeZoom(Input.pinch.zoom0, (Input.pinch.dist0 - d) / 220);   // v2.1.0: ピンチ＝ズーム
      e.preventDefault(); return;
    }
    for (const t of e.changedTouches){
      const p = toLogical(t.clientX, t.clientY);
      if (Input.stick.active && t.identifier === Input.stick.id) {
        Input.stick.x = p.x; Input.stick.y = p.y;
        let dx = p.x - Input.stick.ox, dy = p.y - Input.stick.oy;
        const m = Math.hypot(dx, dy), mx = Input.stick.r;
        if (m > mx) { Input.stick.ox += (dx / m) * (m - mx); Input.stick.oy += (dy / m) * (m - mx); dx = dx / m * mx; dy = dy / m * mx; }
        Input.stick.dx = dx / mx; Input.stick.dy = dy / mx;
      } else {
        Input.mx = p.x; Input.my = p.y;
      }
    }
    e.preventDefault();
  }
  function touchEnd(e){
    if (G.mapOn) { diveMap.touchEnd(e); e.preventDefault(); return; }
    if (Input.pinch.active && e.touches.length < 2){ Input.pinch.active = false; e.preventDefault(); return; }   // v2.1.0
    for (const t of e.changedTouches){
      if (Input.stick.active && t.identifier === Input.stick.id) {
        Input.stick.active = false; Input.stick.id = null;
        Input.stick.dx = Input.stick.dy = 0;
      }
      const id = Input.btnTouch[t.identifier];
      if (id) delete Input.btnTouch[t.identifier];
      if (id === 'fire') syncFireHold();
    }
    e.preventDefault();
  }
  on(cvs, 'touchstart', touchStart, { passive:false });
  on(cvs, 'touchmove',  touchMove,  { passive:false });
  on(cvs, 'touchend',   touchEnd,   { passive:false });
  on(cvs, 'touchcancel',touchEnd,   { passive:false });

  /* ------------------------------------------------------------------ *
   * 4. Game state
   * ------------------------------------------------------------------ */
  const G = {
    state:'title',           // title | play | pause | dead
    time:0, dt:0,
    player:null, boss:null,
    enemies:[], bullets:[], ebullets:[], parts:[], rocks:[], spires:[],
    pickups:[], floats:[], lights:[], silh:[], rings:[], ruins:[], impacts:[],
    camX:0, camY:0, shake:0, shakeX:0, shakeY:0,
    score:0, kills:0, combo:0, comboT:0, bossKills:0,   /* score は互換のデバッグ値（UI・保存とは分ける） */
    resource:0,                                          /* v1.10.0: 表示する資源残高（ledger の写し） */
    genX:0, nextBossAt:0, dist:0, best:0,
    warnMsg:'', warnT:0, flash:0, hurtFlash:0, slowmo:0,
    deathT:0, creakT:0, spawnT:1, genRuinX:0, inkT:0,
    exploreOn:false, entranceNear:false,   // v1.6.0 徒歩探索
    baseOn:false, baseNear:false, baseMarker:null,   // v1.10.0 海底基地
    base2Near:false, nearBase:null, baseAnchor:null, baseIndex:0,   // v1.12.0 海溝の第2基地
    /* v2.1.0（隔離試作）: 透過マップと、見た目だけの潜航ズーム。
       mapOn の間は潜航を止める（更新しない）。diveZoom は描画専用でシミュレーションに触れない。 */
    mapOn:false, diveZoom:1, diveZoomTarget:1,
    /* v3.7.0(隔離試作): B亜種ヤドカリの独立配置（一度きり）。 */
    hermitBSeeded:false,
    /* v3.8.0: 煤冠イソギンチャクの 1 遭遇台帳（新しい潜行で作り直す＝多重化しない） */
    anemone:null,
  };

  /* v1.19.0: bossKills の責務を分ける。
     - 前哨基地（G.baseMarker）は世界の固定地点。ボス撃破に依存しない（常に存在）。
     - 深部（海溝・深棚基地・深層ドロップ）はボス撃破で開く。前哨基地とは別系統。
     海溝の生成・当たり・描画は、深部が開いているときだけ前哨基地を錨にする。 */
  function deepUnlocked(){ return deepOpen(G.bossKills); }
  function trenchAnchor(){ return deepUnlocked() ? G.baseMarker : null; }

  /* ------------------------------------------------------------------ *
   * v2.1.0（隔離試作）: 透過マップの発見記録（専用キー・別系統・有界）
   *   資源・スコア・既存の探索記録（relicDone 等）とは別のキーで保存する。
   *   載せてよい id は map-rules の SITE_IDS に固定＝増え続けない（有界）。
   *   旧セーブ互換: キーが無い/壊れていても空から始める。
   * ------------------------------------------------------------------ */
  const discovered = createDiscoveredStore({
    load: () => loadUnified(MAP_KEY, null),
    save: (v) => saveUnified(MAP_KEY, v),
  });

  /* その潜航で「発見」を判定する候補地点。実在するものだけを返す（未実装の都市は含めない）。 */
  function discoverySites(){
    const out = [];
    out.push({ id:'ruin-entrance', x:DIVE_ENTRANCE.x, y:DIVE_ENTRANCE.y });
    if (G.baseMarker) out.push({ id:'outpost-1', x:G.baseMarker.x, y:G.baseMarker.y });
    /* 深部（海溝・深棚・深棚下の分岐）はボス撃破で世界に現れてから、実在の拠点・海域として候補にする。 */
    const t = createTrench(trenchAnchor());
    const m2 = base2Marker(G.baseMarker, G.bossKills);
    if (m2) out.push({ id:'deepshelf', x:m2.x, y:m2.y, range:1100 });
    if (t && t.sites) {
      out.push({ id:'cave-route', x:t.sites.caveRoute.x, y:t.sites.caveRoute.y, range:520 });
      out.push({ id:'volcanic-vent', x:t.sites.volcanicVent.x, y:t.sites.volcanicVent.y, range:700 });
      out.push({ id:'confluence-hall', x:t.sites.confluenceHall.x, y:t.sites.confluenceHall.y, range:1400 });
    }
    return out;
  }
  function updateDiscoveries(){
    const p = G.player;
    if (!p || !p.alive) return;
    for (const id of sitesWithin(p.x, p.y, discoverySites())){
      if (discovered.add(id)) G.discNotice = id;   // 新規だけ（重複なし・保存も 1 回）
    }
  }

  /* ------------------------------------------------------------------ *
   * v2.1.0（隔離試作）: 潜航カメラの「見た目だけ」のズーム。
   *   シミュレーションのカメラ（G.camX/camY）とは分ける。敵AI・生成・交戦・
   *   武器の射程/ダメージ/当たりには一切影響しない（描画の投影にだけ掛ける）。
   * ------------------------------------------------------------------ */
  function zoomAnchor(){
    const p = G.player;
    if (p && p.alive && !G.exploreOn && !G.baseOn)
      return { x: clamp(p.x - G.camX, 56, VW - 56), y: clamp(p.y - G.camY, 56, VH - 56) };
    return { x: VW * 0.5, y: VH * 0.5 };
  }
  function zoomFactor(){ return clampZoom(G.diveZoom || 1); }
  /* 世界 → 画面（論理）。等倍（z=1）では従来の (world - cam) と一致する。 */
  function worldToScreen(wx, wy){
    const z = zoomFactor(), c = zoomAnchor();
    return { x: c.x + (wx - G.camX - c.x) * z, y: c.y + (wy - G.camY - c.y) * z };
  }
  function screenToWorld(sx, sy){
    const z = zoomFactor(), c = zoomAnchor();
    return { x: G.camX + c.x + (sx - c.x) / z, y: G.camY + c.y + (sy - c.y) / z };
  }
  /* 画面に映っている世界の範囲（ズームで広がる）。カリング・地形の先読みに使う。 */
  function visibleWorld(){
    const z = zoomFactor(), c = zoomAnchor();
    return {
      x0: G.camX + c.x - c.x / z,
      x1: G.camX + c.x + (VW - c.x) / z,
      y0: G.camY + c.y - c.y / z,
      y1: G.camY + c.y + (VH - c.y) / z,
    };
  }
  /* ワールド描画の投影に、ズームを 1 枚掛ける（各描画関数は自前で -cam する前提）。 */
  function applyZoomTransform(){
    const z = zoomFactor(), c = zoomAnchor();
    ctx.translate(c.x, c.y);
    ctx.scale(z, z);
    ctx.translate(-c.x, -c.y);
  }
  function stepDiveZoom(dt){
    G.diveZoom = zoomStep(G.diveZoom, G.diveZoomTarget, dt, undefined);
  }

  /* v1.10.0: 資源（スコアに代わる保存値）。独自キーで保存し、ハブの BEST SCORE とは別系統。
     localStorage が無い環境（node テスト）では no-op にして安全に動かす。 */
  const hasStore = (typeof localStorage !== 'undefined');
  const ledger = createResourceLedger({
    load: () => loadUnified(RESOURCE_KEY, 0),
    save: (v) => saveUnified(RESOURCE_KEY, v),
  });
  G.resource = ledger.total();

  /* v1.11.0: 艇の整備・改造（永続、資源とは別キー）。未購入の性能は現行同等（BASE_STATS）。 */
  const upgrades = createUpgradeStore({
    load: () => loadUnified(UPGRADE_KEY, null),
    save: (v) => saveUnified(UPGRADE_KEY, v),
  });

  /* v1.13.0: 潜水艇の乗り換え（4 艇、永続）。共有の改造・資源はそのまま引き継ぐ。 */
  const ships = createShipStore({
    load: () => loadUnified(SHIP_KEY, null),
    save: (v) => saveUnified(SHIP_KEY, v),
  });
  G.ship = ships.selected();
  /* 実性能＝改造後の値に、艇差の倍率を重ねる。 */
  G.stats = applyShipStats(effectiveStats(upgrades.levels()), G.ship);

  /* 購入・修理の効果を艇へ一度だけ適用する（艇の性能のみ。描画や敵には影響しない）。 */
  function applyToShip(act){
    G.stats = applyShipStats(effectiveStats(upgrades.levels()), G.ship);
    const p = G.player;
    if (!p) return;
    if (act.type === 'repair'){
      p.hp = Math.min(p.maxHp, p.hp + Math.max(0, act.amount || 0));
      return;
    }
    const prevMax = p.maxHp;
    p.maxHp = G.stats.maxHp;
    if (p.maxHp > prevMax) p.hp = Math.min(p.maxHp, p.hp + (p.maxHp - prevMax));
    else p.hp = Math.min(p.maxHp, p.hp);
  }

  /* v1.13.0: 艇の乗り換え。船体を無償全回復しない・弾を増やさない（最大船体に合わせてクランプのみ）。 */
  function applyShip(){
    const nid = ships.selected();
    G.ship = nid;
    G.stats = applyShipStats(effectiveStats(upgrades.levels()), nid);
    const p = G.player;
    if (p){
      p.maxHp = G.stats.maxHp;
      p.hp = Math.min(p.hp, p.maxHp);                 // 増える側でも回復しない（クランプのみ）
      p.barrier = createBarrierState(shipBarrierConfig(nid));
      closeBarrier(p.barrier);
    }
  }
  function selectShip(id){
    if (!ships.select(id)) return false;
    applyShip();
    return true;
  }

  /* 船のそばの整備端末のパネル（選択／確認／閉じる）。資源の減算はパネル側で一度だけ。 */
  const upgradePanel = createUpgradePanel({
    store: upgrades,
    ledger,
    getHp: () => ({ hp: G.player ? G.player.hp : 0, maxHp: G.player ? G.player.maxHp : G.stats.maxHp }),
    onApply: applyToShip,
  });

  /* v1.13.0: 艇選択パネル（選択と決定を分ける）。確定で乗り換える（資源は消費しない）。
     パネルが store を更新し、ここでは既に選ばれた艇を G へ反映する（回復・弾の増加はしない）。 */
  const shipPanel = createShipPanel({
    store: ships,
    onSelect: (id, changed) => { if (changed) applyShip(); },
  });

  /* v1.15.0: 武器（魚雷・ミサイル）の個体。初期品は固定（倍率 1 ＝現行同等）。
     敵の確率ドロップ（回収品。資源/補給とは別）と、基地のランダム製造の両方から倉庫に入る。
     乱数は G.lootRng に分離する（表示の乱数と混ぜない／テストで注入できる）。 */
  const arsenal = createArsenalStore({
    load: () => loadUnified(WEAPON_KEY, null),
    save: (v) => saveUnified(WEAPON_KEY, v),
  });
  G.arsenal = arsenal;
  G.lootRng = (typeof options.lootRng === 'function') ? options.lootRng : Math.random;
  G.wp = null;
  function recomputeWeapon(){
    G.wp = {
      torpedo: weaponParams('torpedo', arsenal.equipped('torpedo')),
      missile: weaponParams('missile', arsenal.equipped('missile')),
    };
    /* v1.17.0: ミサイルの装弾数（残弾上限）は装備中の個体で決まる。装備交換では
       残弾を増やさない（上限の減少だけクランプ）。新潜航の開始時だけ満タンにする。 */
    applyMissileAmmo(false);
  }
  recomputeWeapon();
  /* 装備中のミサイルの装弾数（標準 8）。 */
  function missileAmmoCap(){
    return Math.max(1, Math.round((G.wp && G.wp.missile && G.wp.missile.ammoCap) || MISSILE_BASE.ammo));
  }
  /* refill=false: 残弾を増やさず上限だけ合わせる（装備交換・出港）。true: 満タン（新潜航）。 */
  function applyMissileAmmo(refill){
    const p = G.player; if (!p || !p.alive) return;
    const cap = missileAmmoCap();
    p.maxMissiles = cap;
    p.missiles = refill ? cap : Math.min(p.missiles, cap);
  }

  /* 基地の武器製作台のパネル（製造・換装・比較・捨てる）。資源の減算はパネル側で一度だけ。 */
  const weaponPanel = createWeaponPanel({
    store: arsenal,
    ledger,
    rng: () => G.lootRng(),
    onEquip: (id, changed) => { if (changed) recomputeWeapon(); },
    onEnhance: () => recomputeWeapon(),
  });

  /* v1.16.0: 追加兵装（通常/反射レーザー・反射魚雷・全自動近接）と、回収からの恒久解放・指定開発。
     撃つ枠は魚雷（armory）と追加兵装を同じ枠で換装する。ミサイルは既存の別ボタンのまま。
     近接は全種オート・基地で 1 種だけ選択（専用ボタンは無い）。保存は独自キーで両基地共通。 */
  const advanced = createAdvancedStore({
    load: () => loadUnified(ADV_KEY, null),
    save: (v) => saveUnified(ADV_KEY, v),
  });
  G.advanced = advanced;
  G.beams = [];                                  // レーザーの可視経路（描画用。当たりは発射時に確定）
  G.melee = createMelee();
  function syncMelee(){
    const id = advanced.equippedMelee();
    if (!id){ G.melee.equip(null); return; }
    G.melee.equip(id, advanced.meleeStats(id) || {});
  }
  syncMelee();

  /* 指定開発（武器選択 → 開発の選択と確定）。資源の減算はパネル側で一度だけ。
     armory（魚雷/ミサイル）の指定開発は weapon-rules の設計で個体を作り、armory へ入れる。 */
  const forgePanel = createForgePanel({
    store: advanced,
    ledger,
    rng: () => G.lootRng(),
    onEquip: () => recomputeWeapon(),
    onMelee: () => syncMelee(),
    onEnhance: () => { recomputeWeapon(); syncMelee(); },   // 近接の強化も次フレームで実射へ反映
    armory: arsenal,
    designWeapon: designItem,
  });

  const LAYER_TOP = 0, LAYER_TWILIGHT = 420, LAYER_MID = 980, LAYER_ABYSS = 1700;
  const FLOOR_Y = 2600;
  const RAY_PARALLAX = 0.6;
  const seaFloorY = x => FLOOR_Y + Math.sin(x * 0.013) * 30 - 30;

  /* v1.6.0 徒歩探索の入口（潜航側）。序盤 x の浅い位置に置き、深潜り無しで触れられる。 */
  const DIVE_ENTRANCE = { x: 1450, y: 430, r: 78 };
  const DOCK_BTN = { x: VW - 96, y: VH * 0.46, r: 62 };   // 入口近くのタッチ「降艇」ボタン

  function depthT(y){ return clamp(y / FLOOR_Y, 0, 1); }
  function zoneName(y, x){
    const px = (x !== undefined) ? x : (G.player ? G.player.x : G.camX + VW * 0.5);
    return zoneNameAt(px, y, createTrench(trenchAnchor()));
  }

  /* ------------------------------------------------------------------ *
   * 5. FX helpers
   * ------------------------------------------------------------------ */
  function part(x, y, vx, vy, o){
    if (G.parts.length > 700) G.parts.shift();
    G.parts.push(Object.assign({
      x, y, vx, vy, life:0.6, max:0.6, size:3, col:'#9fe8ff',
      drag:1.6, grav:0, glow:0, kind:'dot', rot:0, vr:0
    }, o || {}));
  }
  function bubbles(x, y, n, spread, up){
    for (let i = 0; i < n; i++) {
      part(x + rnd(-spread, spread), y + rnd(-spread, spread),
           rnd(-24, 24), -rnd(20, 70) * (up === undefined ? 1 : up),
        { life:rnd(0.7, 1.9), max:1.9, size:rnd(1.5, 4.2), col:'rgba(180,235,255,0.75)',
          drag:0.6, glow:0.25, kind:'bubble' });
    }
  }
  function explode(x, y, r, power){
    G.shake = Math.min(30, G.shake + power * 3.4);
    G.lights.push({ x, y, r:r * 3.4, life:0.42, max:0.42, col:'#ffe6b0' });
    G.rings.push({ x, y, r:r * 0.35, speed:r * 7.5, life:0.36, max:0.36, col:'rgba(255,193,125,0.25)', w:Math.max(2, r * 0.075) });
    const n = Math.min(60, 14 + Math.round(power * 9));
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), s = rnd(40, 60 + power * 190);
      part(x, y, Math.cos(a) * s, Math.sin(a) * s, {
        life:rnd(0.25, 0.8), max:0.8, size:rnd(2, 6.5),
        col:pick(['#fff4c4','#ffd166','#ff9a3c','#ff6b2b','#ff3d00']),
        drag:3.2, glow:1, kind:'spark'
      });
    }
    for (let i = 0; i < 10; i++) {
      const a = rnd(0, TAU), s = rnd(10, 70);
      part(x, y, Math.cos(a) * s, Math.sin(a) * s - 18, {
        life:rnd(0.9, 2.1), max:2.1, size:rnd(10, 26),
        col:'rgba(40,50,60,0.5)', drag:1.0, glow:0.0, kind:'smoke'
      });
    }
    bubbles(x, y, 10, r * 0.3, 1);
  }

  /* ミサイル着弾の大爆発演出：瞬間白熱コア → 三重衝撃波 → 厚い多層火球 → 大量灼熱スパーク＆気泡 */
  function missileBurst(x, y, R, mag){
    const r = R || 110;
    const m = clamp(((Number(mag) || 1) - 1) / 3, 0, 1);
    /* 爽快な重めの揺れ＋一瞬のフラッシュ */
    G.shake = Math.min(32, G.shake + 14 + 8 * m);
    G.flash = Math.min(0.26, G.flash + 0.14 + 0.06 * m);
    /* 1) 爆心の白熱コア閃光＋広がる琥珀爆炎ライト */
    G.lights.push({ x, y, r:68 + 36 * m, life:0.13, max:0.13, col:'#fffbe8' });
    G.lights.push({ x, y, r:165 + 85 * m, life:0.44, max:0.44, col:'#ffbe5e' });
    /* 2) 三重の圧力衝撃波リング（高速の白熱内輪＋実爆風半径 R まで届く外輪） */
    G.rings.push({ x, y, r:0, r0:0, toR:r * 1.15, life:0.46, max:0.46, col:'rgba(255,232,175,0.72)', w:7 + 2 * m });
    G.rings.push({ x, y, r:0, r0:0, toR:r,        life:0.60, max:0.60, col:'rgba(165,230,255,0.48)', w:4.5 });
    G.rings.push({ x, y, r:8, speed:r * 6.8,      life:0.34, max:0.34, col:'rgba(255,156,64,0.58)',  w:5.5 });
    /* 3) 厚みのある多段水中火球（白黄コア → 鮮烈オレンジ → 深紅・黒煙） */
    for (let i = 0; i < 14 + Math.round(6 * m); i++){
      const a = rnd(0, TAU), s = rnd(18, 95 + 65 * m);
      part(x + Math.cos(a) * rnd(0, 28), y + Math.sin(a) * rnd(0, 28), Math.cos(a) * s, Math.sin(a) * s,
        { life:rnd(0.36, 0.92), max:0.92, size:rnd(18, 38) + 22 * m,
          col:pick(['rgba(255,244,180,0.76)', 'rgba(255,162,56,0.68)', 'rgba(255,92,28,0.60)', 'rgba(54,48,50,0.52)']),
          drag:2.1, glow:0.75, kind:'smoke' });
    }
    /* 4) 破片と大量の灼熱スパーク */
    for (let i = 0; i < 12 + Math.round(6 * m); i++){
      const a = rnd(0, TAU), s = rnd(110, 310 + 110 * m);
      part(x, y, Math.cos(a) * s, Math.sin(a) * s,
        { life:rnd(0.4, 1.0), max:1.0, size:rnd(2.2, 4.4), col:'rgba(52,58,66,0.82)',
          drag:1.4, grav:140, glow:0, kind:'smoke' });
    }
    for (let i = 0; i < 42 + Math.round(18 * m); i++){
      const a = rnd(0, TAU), s = rnd(110, 480 + 130 * m);
      part(x, y, Math.cos(a) * s, Math.sin(a) * s,
        { life:rnd(0.22, 0.78), max:0.78, size:rnd(2.2, 6.2),
          col:pick(['#fffdf4', '#ffe58f', '#ff9b3d', '#ff5b24', '#ff3d00']), drag:3.0, glow:1, kind:'spark' });
    }
    /* 5) 余韻の大量気泡 */
    bubbles(x, y, 28 + Math.round(14 * m), r * 0.44, 1);
  }
  function floatText(x, y, txt, col, size){
    G.floats.push({ x, y, txt, col:col || '#ffe9a8', size:size || 22, life:1.1, max:1.1, vy:-34 });
  }
  /* v1.10.0: 資源の獲得。G.score は互換のデバッグ値として残し、表示・保存は資源（ledger）を使う。 */
  function addResource(v, x, y, txt){
    G.score += v;                       // 互換のデバッグ値
    ledger.add(v);
    G.resource = ledger.total();
    if (x !== undefined) floatText(x, y, txt || ('+' + v), '#ffe9a8', txt ? 26 : 20);
  }
  /* 同じ潜航内で同じ源（遺物・地上敵の撃破など）からは一度だけ。 */
  function addResourceOnce(id, v){
    if (!ledger.awardOnce(id, v)) return false;
    G.score += v;
    G.resource = ledger.total();
    return true;
  }

  /* ------------------------------------------------------------------ *
   * 6. Player
   * ------------------------------------------------------------------ */
  function makePlayer(){
    return {
      x:520, y:520, vx:0, vy:0, aim:0, aimTarget:null,
      hp:G.stats.maxHp, maxHp:G.stats.maxHp, r:24,
      heat:0, over:false, fireCd:0,
      /* v1.17.0: ミサイルの残弾と上限は装備中の個体の装弾数で決まる（標準 8）。新潜航は満タン。 */
      missiles:(G.wp && G.wp.missile && G.wp.missile.ammoCap) || 8,
      maxMissiles:(G.wp && G.wp.missile && G.wp.missile.ammoCap) || 8, missileCd:0,
      sonarCd:0, inv:0, alive:true,
      /* v1.13.0: 緊急回避（艇を押し飛ばす加速）を、速度・方向を変えない瞬間バリアへ置き換えた。
         バリア型だけ耐久・持続・再使用が優位（ジャスト受付・報酬は全艇共通）。 */
      barrier: createBarrierState(shipBarrierConfig(G.ship)), barHitT:0, barJustT:0,
      thrust:0, tilt:0, bank:0, motionPrevVx:0, hurtT:0, sonarR:0, recoil:0,
    };
  }
  function playerUpdate(dt){
    const p = G.player;
    if (!p.alive) return;

    /* --- movement input --- */
    let ix = 0, iy = 0;
    if (Input.keys['KeyA'] || Input.keys['ArrowLeft'])  ix -= 1;
    if (Input.keys['KeyD'] || Input.keys['ArrowRight']) ix += 1;
    if (Input.keys['KeyW'] || Input.keys['ArrowUp'])    iy -= 1;
    if (Input.keys['KeyS'] || Input.keys['ArrowDown'])  iy += 1;
    if (Input.stick.active) { ix += Input.stick.dx; iy += Input.stick.dy; }
    const im = Math.hypot(ix, iy);
    if (im > 1) { ix /= im; iy /= im; }
    p.thrust = Math.hypot(ix, iy);

    const ACC = G.stats.accel, MAXV = G.stats.maxSpeed;
    const cruiseDrag = 3.1 * 360 / MAXV;
    const alongDrag = Math.exp(-cruiseDrag * dt);
    const brakeDrag = Math.exp(-G.stats.drag * dt);
    p.vx += ix * ACC * dt;
    p.vy += iy * ACC * dt;
    p.vy -= 26 * dt;                              // slight buoyancy
    // 運動性は横滑り・逆方向の速度だけを早く落とす。巡航速度とは別の改造。
    const ux = p.thrust ? ix / p.thrust : 0, uy = p.thrust ? iy / p.thrust : 0;
    const forward = Math.max(0, p.vx * ux + p.vy * uy);
    p.vx = p.vx * brakeDrag + ux * forward * (alongDrag - brakeDrag);
    p.vy = p.vy * brakeDrag + uy * forward * (alongDrag - brakeDrag);
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > MAXV) { p.vx = p.vx / sp * MAXV; p.vy = p.vy / sp * MAXV; }

    /* --- v1.13.0: 瞬間バリア（旧ダッシュの置き換え） ---
       進行方向・速度は変えない（押し飛ばさない）。発動中は再発動しない＝押しっぱなしでも連続発動しない。 */
    const bar = p.barrier;
    tickBarrier(bar, dt);
    p.barHitT = Math.max(0, p.barHitT - dt);
    p.barJustT = Math.max(0, p.barJustT - dt);
    const barPressed = Input.wantDash;
    Input.wantDash = false;
    if (barPressed && deployBarrier(bar)) {
      /* 空振りでも再使用待ちは deploy 後の持続切れで始まる。発動音は控えめ。 */
      AU.barrierOn();
    }

    p.x += p.vx * dt; p.y += p.vy * dt;
    p.x = Math.max(60, p.x);
    /* v1.12.0: 海溝の地形（描画と共有する矩形）から押し出す。床は海溝の開口内だけ深い。 */
    const trench = createTrench(trenchAnchor());
    if (trench){
      /* v3.11.0: 大深度・海流回廊（高速下降／上昇リフト＋スピード＆爽快感演出） */
      const cor = corridorAt(p.x, p.y, trench);
      if (cor){
        corridorDir = cor.dir;
        corridorRush = Math.min(1, corridorRush + dt * 3.8);
        const targetVy = cor.dir * cor.speed;
        p.vy += (targetVy - p.vy) * Math.min(1, dt * 6.5);
        // 回廊中心へわずかに整流して壁への引っ掛かりを防ぐ（左右操作は効く）
        const midX = (cor.x0 + cor.x1) * 0.5;
        p.vx += (midX - p.x) * 0.8 * dt;
        G.shake = Math.max(G.shake, 2.2);
        corridorSfxCd -= dt;
        if (corridorSfxCd <= 0){ AU.corridorRush(); corridorSfxCd = 0.42; }
        if (Math.random() < 0.85){
          part(p.x + rnd(-110, 110), p.y + cor.dir * rnd(40, 140), rnd(-18, 18), -cor.dir * rnd(260, 520),
            { life:rnd(0.25, 0.55), max:0.55, size:rnd(2.2, 5.2), col:'rgba(165,242,255,0.75)', glow:0.9, kind:'bubble' });
        }
        if (cor.dir > 0) radioChat.trigger('abyss_corridor_down');
      } else {
        corridorRush = Math.max(0, corridorRush - dt * 2.8);
        corridorSfxCd = Math.max(0, corridorSfxCd - dt);
      }
      /* シームレス無線会話（時間停止なし）の到達トリガー */
      if (p.y > FLOOR_Y + 280 && p.y < trench.floorY) radioChat.trigger('trench_enter');
      else if (p.y > trench.hallTopY + 180 && p.y < trench.deepFloorY - 80) radioChat.trigger('confluence_enter');
      else if (trench.mantleTopY && p.y > trench.mantleTopY + 140) radioChat.trigger('mantle_upper_enter');

      const res = resolveSub(trench, p.x, p.y, p.r, 60);
      if (res.hit){ p.x = res.x; p.y = res.y; p.vx *= 0.35; p.vy *= 0.35; }
      p.y = clamp(p.y, 46, trenchFloorYAt(p.x, trench, p.y) - 60);
    } else {
      corridorRush = Math.max(0, corridorRush - dt * 2.8);
      p.y = clamp(p.y, 46, FLOOR_Y - 60);
    }
    radioChat.tick(dt);

    /* --- 射出方向。船体とライトの傾きは移動で決まる。 --- */
    p.aimTarget = Input.mode === 'touch' ? lockTarget() : null;
    if (Input.mode === 'mouse') {
      Input.mx = clamp(Input.mx, -20, VW + 20);
      /* v2.1.0: ズーム時もマウス/タップの照準はワールドへ逆変換する（画面→世界）。 */
      const ps = worldToScreen(p.x, p.y);
      p.aim = Math.atan2(Input.my - ps.y, Input.mx - ps.x);
    } else if (p.aimTarget) {
      p.aim = Math.atan2(p.aimTarget.y - p.y, enemyAimX(p.aimTarget) - p.x);
    } else {
      p.aim = 0;
    }
    /* v1.19.0: 見た目の動き（物理には触れない）。
       上下成分（vy）で船首を上下＝ピッチ、速度が小さいほど水平へ戻る（減速で自然に水平）。
       水平の切り返し（前フレームとの vx 差）で短い「ひねり（バンク）」を入れる。 */
    p.tilt = pitchStep(p.tilt, pitchTarget(p.vx, p.vy), dt);
    p.bank = twistStep(p.bank, p.motionPrevVx, p.vx, dt);
    p.motionPrevVx = p.vx;

    /* --- weapons --- */
    p.fireCd -= dt; p.missileCd -= dt;
    const heatRate = p.over ? -0.62 : -0.40;
    p.heat = clamp(p.heat + heatRate * dt, 0, 1);
    if (p.over && p.heat <= 0.18) p.over = false;

    /* 魚雷: 押した瞬間の1発＋押しっぱなし中は発射間隔ごとに連射（熱・過熱はそのまま効く）。
       離した瞬間にホールドが切れるので、進行中の1発以外は新たに撃たない。 */
    const wantFire = Input.fireQueued || Input.fireHeld;
    Input.fireQueued = false;
    /* v1.16.0: 『撃つ』枠。魚雷は既存どおり、追加兵装（レーザー/反射）は同じ枠で換装して撃つ。 */
    const advShot = advanced.shotParams();
    if (wantFire && !p.over && p.fireCd <= 0) {
      if (advShot) { p.fireCd = advShot.fireCd; fireAdvancedShot(p, advShot); }
      else { p.fireCd = G.wp.torpedo.fireCd; fireTorpedo(p); }
    }
    if (Input.wantMissile) { Input.wantMissile = false; fireMissile(p); }

    /* --- sonar --- */
    p.sonarCd = Math.max(0, p.sonarCd - dt);
    if (Input.wantSonar) {
      Input.wantSonar = false;
      if (p.sonarCd <= 0) {
        p.sonarCd = 5.0; p.sonarR = 1;
        AU.ping();
        for (const e of G.enemies) {
          const dd = Math.hypot(e.x - p.x, e.y - p.y);
          if (dd < 820) { e.stun = Math.max(e.stun, 1.3); damageEnemy(e, 1.2, 0, 0); }
        }
        G.lights.push({ x:p.x, y:p.y, r:900, life:0.6, max:0.6, col:'#8affd0' });
      }
    }
    if (p.sonarR > 0) { p.sonarR += dt * 2.4; if (p.sonarR > 4.2) p.sonarR = 0; }

    /* --- invuln / engine fx --- */
    p.inv = Math.max(0, p.inv - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.recoil = Math.max(0, p.recoil - dt * 5.5);
    if (p.thrust > 0.15 && Math.random() < Math.min(1, dt * 42)) {
      const a = Math.atan2(-iy, -ix);
      const tail = bodyWorld(p, -34, 0);       // v1.19.0: 排気は艇の姿勢に載せた尾部から（ズレない）
      part(tail.x, tail.y,
           Math.cos(a) * rnd(24, 70) + p.vx * 0.18, -rnd(45, 100) + p.vy * 0.12,
        { life:rnd(0.65, 1.35), max:1.35, size:rnd(2, 6.2), col:'rgba(190,235,255,0.7)', drag:0.5, glow:0, kind:'bubble' });
    }

    /* --- depth ambience --- */
    const dt2 = depthT(p.y);
    AU.setDepth(dt2);
    if (dt2 > 0.55) {
      G.creakT -= dt;
      if (G.creakT <= 0) { G.creakT = rnd(3.5, 9); AU.creak(); }
    }
  }

  function lockTarget(){
    const p = G.player; if (!p) return null;
    let best = null, bd = 1e9;
    let small = null, sd = 1100 ** 2;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const dd = d2(enemyAimX(e), e.y, p.x, p.y);
      if (e.kind === 'minnow') {
        if (dd < sd) { sd = dd; small = e; }
        continue;
      }
      if (dd < bd) { bd = dd; best = e; }
    }
    if (G.boss && !G.boss.dead) return G.boss;
    return bd <= 1100 ** 2 ? best : small;
  }

  /* v1.16.0: 追加兵装の射撃。レーザーは可視経路＝実当たり（fireBeam）、反射魚雷は壁で 1 回跳ねる。
     幾何は本編の海溝 solids（矩形）と G.rocks（円）をそのまま渡す。敵は生きた個体を円で渡す。 */
  function worldGeometry(){
    const t = createTrench(trenchAnchor());
    return buildGeometry(t ? t.solids : [], G.rocks);
  }
  function enemyTargets(){
    const out = [];
    for (const e of G.enemies){ if (!e || e.dead) continue; out.push({ kind:'circle', x:e.x, y:e.y, r:e.r || 16, ref:e }); }
    return out;
  }
  function applyBeamHits(tr, shot){
    for (const h of tr.hits){
      const enemy = (h.ref && h.ref.ref) ? h.ref.ref : h.ref;
      if (h.kind === 'target' && enemy && !enemy.dead){
        damageEnemy(enemy, shot.dmg, 0, 0);                 // レーザーはノックバックなし
        G.impacts.push({ x:h.x, y:h.y, life:0.22 });
      }
      const base = (h.kind === 'solid') ? Math.atan2(h.ny, h.nx) : 0;
      const nspark = (h.kind === 'target') ? 6 : 5;
      for (let i = 0; i < nspark; i++){
        const a = base + rnd(-0.7, 0.7), s = rnd(60, 220);
        part(h.x, h.y, Math.cos(a) * s, Math.sin(a) * s,
          { life:rnd(0.08, 0.28), max:0.28, size:rnd(1.5, 3.5), col:shot.color, drag:4, glow:1, kind:'spark' });
      }
    }
  }
  function fireAdvancedShot(p, shot){
    const a = p.aim;
    const n = Math.max(1, Math.floor(shot.count || 1));
    const spread = salvoSpread(n, shot.pattern);
    const base = shotOffset(p, 34);
    const bx = p.x + Math.cos(a) * base, by = p.y + Math.sin(a) * base;
    if (shot.kind === 'beam'){
      const geo = worldGeometry();
      const tg = enemyTargets();
      for (let i = 0; i < n; i++){
        const s = spread[i] || { dAng:0, lat:0 };
        const ang = a + s.dAng;
        const ox = bx - Math.sin(a) * (s.lat || 0), oy = by + Math.cos(a) * (s.lat || 0);
        const tr = fireBeam(ox, oy, ang, tg, geo, shot);
        applyBeamHits(tr, shot);
        G.beams.push({ points:tr.points, life:0.16, max:0.16, color:shot.color, r:shot.r });
      }
      p.heat = clamp(p.heat + shot.heat, 0, 1);
      if (p.heat >= 1) { p.over = true; AU.alarm(); }
      p.recoil = Math.min(1.4, p.recoil + 0.28);
      G.shake = Math.min(10, G.shake + 0.9);
      AU.shoot(shot.launchSound);
      for (let i = 0; i < 4; i++){
        const sa = a + rnd(-0.4, 0.4);
        part(bx, by, Math.cos(sa) * rnd(80, 300), Math.sin(sa) * rnd(80, 300),
          { life:rnd(0.06, 0.16), max:0.16, size:rnd(2, 4.5), col:shot.color, drag:5, glow:1, kind:'spark' });
      }
    } else {
      for (let i = 0; i < n; i++){
        const s = spread[i] || { dAng:0, lat:0 };
        const ang = a + s.dAng;
        const ox = bx - Math.sin(a) * (s.lat || 0), oy = by + Math.cos(a) * (s.lat || 0);
        G.bullets.push({
          kind:'reftorp', x:ox, y:oy, vx:Math.cos(ang) * shot.speed, vy:Math.sin(ang) * shot.speed,
          a:ang, life:shot.life, dmg:shot.dmg, r:shot.r, aoe:shot.aoe,
          reflected:0, maxReflect:shot.maxReflect, style:shot.projectile, projectile:shot.projectile,
          launchSound:shot.launchSound, impactSound:shot.impactSound, trail:0, age:0,
        });
      }
      p.heat = clamp(p.heat + shot.heat, 0, 1);
      if (p.heat >= 1) { p.over = true; AU.alarm(); }
      p.recoil = Math.min(1.4, p.recoil + 0.4);
      G.shake = Math.min(14, G.shake + 1.5);
      AU.shoot(shot.launchSound);
    }
  }

  /* v1.16.0: 全自動近接の更新。equip した 1 種だけが潜航中に作動する（melee-rules 側でゲート）。
     命中は damageEnemy へ、押し返しは push（大型・固定は 0）。 */
  function updateMelee(dt){
    const p = G.player;
    if (!p || !p.alive || !G.melee) return;
    /* 装備中の近接が変わっていたら合わせる（基地で選び直した直後も次フレームで反映）。 */
    if (G.melee.equipped() !== advanced.equippedMelee()) syncMelee();
    const mode = G.exploreOn ? 'walk' : (G.baseOn ? 'base' : 'dive');
    const res = G.melee.update(dt, { mode, player:{ x:p.x, y:p.y, facing:p.aim }, enemies:G.enemies, geometry:worldGeometry() });
    for (const ev of res.events){
      if (ev.type === 'start'){ AU.hit(); continue; }
      if (ev.type !== 'hit' || !ev.enemy || ev.enemy.dead) continue;
      const e = ev.enemy;
      const px = ev.push ? ev.push.ix : 0, py = ev.push ? ev.push.iy : 0;
      damageEnemy(e, ev.dmg, px, py);
      G.impacts.push({ x:e.x, y:e.y, life:0.2 });
      for (let i = 0; i < 6; i++){
        const a = rnd(0, TAU), s = rnd(60, 240);
        part(e.x, e.y, Math.cos(a) * s, Math.sin(a) * s,
          { life:rnd(0.1, 0.3), max:0.3, size:rnd(1.5, 3.5), col:'#cfeaff', drag:4, glow:1, kind:'spark' });
      }
    }
  }

  /* v1.15.0+: 同時発射数（魚雷 1〜3）と射出方向（並列/扇状）。1 発は従来どおり。
     多連は発射位置・向きを目で分け、発射直後は進路を保つ（誘導で即座に束にならない）。
     画面・音は一斉射に 1 回だけ（火花・揺れ・音を本数ぶん重ねない）。 */
  function fireTorpedo(p){
    const a = p.aim;
    const wp = G.wp.torpedo;                     // v1.15.0: 個体の倍率（初期品は現行同等）
    const n = Math.max(1, Math.floor(wp.count || 1));
    const spread = salvoSpread(n, wp.pattern);
    const base = shotOffset(p, 40);
    const bx = p.x + Math.cos(a) * base, by = p.y + Math.sin(a) * base;
    const dmg = G.stats.torpedoDmg * wp.dmgMul;  // 1 発あたり威力（多連は割り引かれる）
    for (let i = 0; i < n; i++) {
      const s = spread[i] || { dAng:0, lat:0 };
      const ang = a + s.dAng;
      const ox = bx - Math.sin(a) * (s.lat || 0), oy = by + Math.cos(a) * (s.lat || 0);
      G.bullets.push({
        kind:'torp', x:ox, y:oy, vx:Math.cos(ang) * wp.speed, vy:Math.sin(ang) * wp.speed,
        a:ang, life:1.5, dmg, r:6, aoe:34, trail:0, style:wp.style,
        projectile:wp.projectile, launchSound:wp.launchSound, impactSound:wp.impactSound,   // v1.16.0+: 形状/発射音/着弾音（独立）
        age:0, homeDelay:(n > 1 ? 0.12 : 0),     // 発射直後は向きを保つ（多連のみ）
        /* v1.7.0: 発射時に前方近傍の標的を1つだけ決める（継続誘導はこの標的のみ） */
        target:pickTorpedoTarget(p, ang)
      });
    }
    p.heat = clamp(p.heat + wp.heat, 0, 1);      // 斉射ぶんの熱（多連は熱効率が悪化）
    if (p.heat >= 1) { p.over = true; AU.alarm(); }
    p.recoil = Math.min(1.4, p.recoil + 0.4);
    G.shake = Math.min(14, G.shake + 1.5);
    AU.shoot(wp.launchSound);                    // 一斉射に 1 回（レート制限も既存のまま）
    for (let i = 0; i < 4; i++) {
      const sa = a + rnd(-0.5, 0.5);
      part(bx, by, Math.cos(sa) * rnd(80, 320), Math.sin(sa) * rnd(80, 320),
        { life:rnd(0.08, 0.2), max:0.2, size:rnd(2, 5), col:'#ffd77a', drag:5, glow:1, kind:'spark' });
    }
  }

  /* v1.15.0+: ミサイルは 1 押し 1 斉射。count ぶんの残数を消費し、残数を越えない。
     残り 1 なら単発（空撃ち・無料複製なし）。湾曲（誘導）で即座に束にならないよう発射直後は進路を保つ。 */
  function fireMissile(p){
    if (p.missiles <= 0 || p.missileCd > 0) { if (p.missiles <= 0) AU.alarm(); return; }
    const wp = G.wp.missile;                     // v1.15.0: 個体の倍率（初期品は現行同等）
    const want = Math.max(1, Math.floor(wp.count || 1));
    const n = Math.max(1, Math.min(want, p.missiles));   // 残数を越えない（残り1なら単発）
    p.missiles -= n;
    p.missileCd = 0.42;
    const a = p.aim;
    /* v1.11.0: ミサイル威力のランクで「弾体の見た目」が大きくなる。命中判定は先端側へ寄せ、
       半径は控えめ（見た目に比べて広げすぎず、自艇や発射直後に当たらない）。 */
    const vscale = visualScale('missilePower', upgrades.level('missilePower'));
    const spread = salvoSpread(n, wp.pattern);
    const offset = shotOffset(p, 26) + 26 * (vscale - 1); // 尾翼の後端を従来の射出位置に揃える
    const bx = p.x + Math.cos(a) * offset, by = p.y + Math.sin(a) * offset;
    const dmg = G.stats.missileDmg * wp.dmgMul * MISSILE_DMG_MUL;   // v1.17.0: 装弾数に見合う実ダメージ係数
    for (let i = 0; i < n; i++) {
      const s = spread[i] || { dAng:0, lat:0 };
      const ang = a + s.dAng;
      const ox = bx - Math.sin(a) * (s.lat || 0), oy = by + Math.cos(a) * (s.lat || 0);
      const ejectSpd = Math.min(145, (wp.launchSpeed || 300) * 0.45);
      G.bullets.push({
        kind:'missile', x:ox, y:oy,
        vx:Math.cos(ang) * ejectSpd, vy:Math.sin(ang) * ejectSpd + 24,
        a:ang, life:4.4, dmg, r:Math.min(15, 9 + (vscale - 1) * 1.2), aoe:G.stats.missileBlast,
        turn:wp.turn, speed:ejectSpd, maxSpeed:Math.max(1080, (wp.cruiseSpeed || 330) * 3.2),
        accel:Math.max(1850, (wp.accel || 520) * 3.5), smoke:0, target:p.aimTarget,
        vscale, hitAhead: vscale > 1 ? Math.round(14 * vscale) : 0,
        style:wp.style, projectile:wp.projectile, launchSound:wp.launchSound, impactSound:wp.impactSound,
        age:0, igniteDelay:0.18 + i * 0.03, ignited:false, burner:0.0, homeDelay:(n > 1 ? 0.22 : 0.18)
      });
    }
    G.shake = Math.min(18, G.shake + 4);
    AU.mLaunch(wp.launchSound);                  // 一斉射に 1 回
    bubbles(p.x, p.y, 8, 12, 1);
  }

  function shotOffset(p, max){
    const t = p.aimTarget;
    return t ? Math.min(max, Math.hypot(enemyAimX(t) - p.x, t.y - p.y) * 0.5) : max;
  }

  function hurtPlayer(dmg, srcx, srcy){
    const p = G.player;
    if (!p.alive || p.inv > 0) return;
    p.hp -= dmg; p.inv = 0.85; p.hurtT = 0.35;
    G.shake = Math.min(26, G.shake + dmg * 0.9);
    G.hurtFlash = Math.min(1, G.hurtFlash + 0.5);
    AU.hurt();
    const a = srcx !== undefined ? Math.atan2(p.y - srcy, p.x - srcx) : rnd(0, TAU);
    p.vx += Math.cos(a) * 180; p.vy += Math.sin(a) * 180;
    for (let i = 0; i < 14; i++) {
      const sa = a + rnd(-0.8, 0.8);
      part(p.x, p.y, Math.cos(sa) * rnd(60, 260), Math.sin(sa) * rnd(60, 260),
        { life:rnd(0.2, 0.6), max:0.6, size:rnd(2, 5), col:'#ff6b4a', drag:3, glow:1, kind:'spark' });
    }
    if (p.hp <= 0) killPlayer();
  }
  /* v1.13.0: 瞬間バリアで攻撃を受ける（岩・被弾無敵とは別系統）。
     key は攻撃元の安定 ID（連続接触のジャスト払い戻し防止・吸収の間引きに使う）。 */
  function tryGuard(key, dmg, srcx, srcy){
    const p = G.player;
    const st = p && p.barrier;
    if (!st){ hurtPlayer(dmg, srcx, srcy); return; }
    const r = presentHit(st, key, dmg);
    if (r.kind === 'gated') return;                     // 直近に吸収した同一の源は短く無視
    if (r.kind === 'none'){ hurtPlayer(dmg, srcx, srcy); return; }
    if (r.kind === 'just'){ onGuardJust(r); return; }
    if (r.kind === 'break'){ onGuardBreak(r); if (r.overflow > 0) hurtPlayer(r.overflow, srcx, srcy); return; }
    onGuardAbsorb(r);                                   // 通常ガード（全吸収＝ノックバックなし）
    if (r.overflow > 0) hurtPlayer(r.overflow, srcx, srcy);
  }
  /* ジャスト：完全防御。青白い薄膜の明滅・局所の波紋・短い澄んだ音。 */
  function onGuardJust(){
    const p = G.player;
    p.barHitT = 0.24; p.barJustT = 0.22;
    G.rings.push({ x:p.x, y:p.y, r:30, speed:540, life:0.44, max:0.44, col:'rgba(196,246,255,0.85)', w:6 });
    G.rings.push({ x:p.x, y:p.y, r:14, speed:340, life:0.30, max:0.30, col:'rgba(255,255,255,0.72)', w:4 });
    G.lights.push({ x:p.x, y:p.y, r:200, life:0.26, max:0.26, col:'#e2f7ff' });
    AU.barrierJust();
    for (let i = 0; i < 12; i++){
      const a = rnd(0, TAU);
      part(p.x + Math.cos(a) * 42, p.y + Math.sin(a) * 42,
           Math.cos(a) * rnd(170, 400), Math.sin(a) * rnd(170, 400),
        { life:rnd(0.2, 0.5), max:0.5, size:rnd(1.6, 3.4), col:'#d4f1ff', drag:2.6, glow:1, kind:'spark' });
    }
  }
  /* 通常ガード：吸収。小さめの波紋と柔らかい音。 */
  function onGuardAbsorb(){
    const p = G.player;
    p.barHitT = Math.max(p.barHitT, 0.16);
    G.rings.push({ x:p.x, y:p.y, r:22, speed:360, life:0.30, max:0.30, col:'rgba(170,225,255,0.6)', w:4 });
    AU.barrierGuard();
    for (let i = 0; i < 6; i++){
      const a = rnd(0, TAU);
      part(p.x + Math.cos(a) * 34, p.y + Math.sin(a) * 34,
           Math.cos(a) * rnd(80, 220), Math.sin(a) * rnd(80, 220),
        { life:rnd(0.16, 0.36), max:0.36, size:rnd(1.4, 2.8), col:'#bfe9ff', drag:3, glow:1, kind:'spark' });
    }
  }
  /* 破損：耐久が尽きて膜が割れる（超過分は呼び側がすでに船体へ通している）。 */
  function onGuardBreak(){
    const p = G.player;
    p.barHitT = 0.3;
    G.rings.push({ x:p.x, y:p.y, r:26, speed:620, life:0.40, max:0.40, col:'rgba(214,242,255,0.8)', w:5 });
    G.shake = Math.min(18, G.shake + 4);
    AU.barrierBreak();
    for (let i = 0; i < 18; i++){
      const a = rnd(0, TAU);
      part(p.x + Math.cos(a) * 46, p.y + Math.sin(a) * 44,
           Math.cos(a) * rnd(140, 420), Math.sin(a) * rnd(140, 420),
        { life:rnd(0.24, 0.6), max:0.6, size:rnd(2, 4.6), col:'rgba(190,236,255,0.85)', drag:2.2, glow:0.8, kind:'spark' });
    }
  }
  function killPlayer(){
    const p = G.player;
    p.hp = 0; p.alive = false;
    G.state = 'dead'; G.deathT = 0;
    G.flash = 1;
    explode(p.x, p.y, 70, 2.2);
    AU.boom(2.2); AU.setRumble(0);
    G.best = Math.max(G.best, G.score);
    Input.fireQueued = false;
    if (onGameOver) { try { onGameOver(G.score); } catch (e) { console.warn(e); } }
  }
  function healPlayer(v){
    const p = G.player;
    p.hp = Math.min(p.maxHp, p.hp + v);
    floatText(p.x, p.y - 40, '船体修復 +' + v, '#7dffb0', 22);
  }

  /* ------------------------------------------------------------------ *
   * 7. Enemies
   * ------------------------------------------------------------------ */
  const isBoss = e => e.kind === 'leviathan' || e.kind === 'squid';
  const fishBody = {
    minnow:{ length:54, height:20 },
    hunter:{ length:54, height:20 },
    angler:{ length:128, height:46 },
  };
  function enemyAimX(e){
    const body = fishBody[e.kind];
    return body ? e.x - e.dir * body.length * 0.4 : e.x;
  }
  /* v1.8.1: ボスの頭の当たり判定。描いた頭の形（ローカル座標・進行方向の逆側）に
     沿わせた円。頭の1点を中心にした巨大な透明円は使わない（何も描いていない空間に
     当たってしまうため）。x は頭側が負。 */
  function leviathanProfile(u, H){
    const shoulder = clamp((u - 0.17) / 0.40, 0, 1);
    return Math.sin(Math.pow(u, 0.68) * Math.PI) * H * (1 - u * 0.22)
      * (0.38 + 0.38 * shoulder * shoulder * (3 - 2 * shoulder));
  }
  const BOSS_HEAD = {
    leviathan: [[-370, -2, 116], [-300, -2, 116], [-230, -10, 114], [-160, -9, 102], [-95, 1, 98], [-30, 8, 92]],
    squid:     [[-8, 0, 100], [25, 0, 99], [55, 0, 90], [80, 0, 64], [96, 0, 32]],
  };
  /* v1.8.1: 巨大イカの危険な触腕（クラブ付きの長い2本）の当たり判定。
     drawSquid と同じ式・同じ太さで描いた線に沿わせる（攻撃中＝'whip' のときだけ使う）。 */
  function squidWhipTouch(e, tx, ty, tr){
    const W = e.W, t = e.t;
    const arm = Math.max(0, e.arm);
    const reach = e.reach * (0.75 + arm * 1.2);
    const len = reach * 1.32;
    const flip = e.dir < 0 ? -1 : 1;
    for (const sgn of [-1, 1]){
      const y0 = sgn * W * 0.36;
      for (let s = 0; s <= 10; s++){
        const u = s / 10;
        const lx = 62 + u * len;
        const ly = y0 * 0.72 + (u > 0
          ? Math.sin(u * 2.8 - t * 3.0 + (sgn > 0 ? 1.6 : 0)) * len * 0.13 * u + e.whiplash * len * u * 0.9
          : 0);
        const rr = (s === 10 ? 26 : 12) + tr;   /* 先端クラブ(約30x12)／本線(lineWidth 12) */
        if (d2(e.x + flip * lx, e.y + ly, tx, ty) < rr * rr) return true;
      }
    }
    return false;
  }
  const HERMIT_SIZE = 150;
  const HERMIT_RANGE = 560;
  const HERMIT_CHARGE = 0.45;
  const HERMIT_MUZZLE_X = 69;
  const HERMIT_MUZZLE_Y = -96;
  const GUNNER_MUZZLE_X = 70;
  const GUNNER_MUZZLE_Y = -25;
  const GUNNER_CHARGE = 0.65;
  /* v3.8.0: 煤冠イソギンチャク（熱水・火山帯 固有）。表示の高さ(px)。
     発生地点・当たり・予告/攻撃の状態機械は anemone-rules.js（純ロジック）と共有する。 */
  const ANEMONE_DRAW_H = 150;

  /* ------------------------------------------------------------------ *
   * v3.7.0(隔離試作): B亜種ヤドカリ（中型）。既存の戦車ヤドカリ（hermit）とは別種・別アセットで共存。
   *   殻を硬く保ったまま歩行（接地足は世界固定＝前後脚を交互・止まれる）→ 接近すると「見える歩行」を
   *   しばらく続けてから停止 → 警戒 → 鋏を開く（砲撃の予兆）。撃破は殻/胴/脚/鋏/眼に分裂（殻は重く遅く、
   *   部位は軽く速い）。部位は演出のみ（攻撃/接触を即停止・報酬は killEnemy で一度）。当たりは body 半径 r=52 に一致。
   *   通常描画も撃破も同じ pose-debris の部位定義・同じ変換を読む＝撃破アニメを手で作らない。
   * ------------------------------------------------------------------ */
  const HERMITB_BOX = 150, HERMITB_CELL = 384, HERMITB_FRAMES = 16, HERMITB_FPS = 12;
  const HERMITB_SPEED = 26, HERMITB_RANGE = 520, HERMITB_CHARGE = 0.5, HERMITB_PATROL = 300;
  /* v3.7.0: 視認性の修正。旧隔離版は距離 520 で即「警戒」に入り、画面へ入る前に歩行が終わって
     歩行アニメが見えなかった。接近時は range 内でも「見える歩行」を最低 NOTICE 秒だけ続けてから
     警戒へ移る（何歩か見える）。至近（CLOSE 以内）まで詰められた近接遭遇では歩行を挟まず即警戒＝
     ダメージ予告を不自然に遅らせない。退路: range 外へ出たら NOTICE はリセットされる。 */
  const HERMITB_NOTICE_T = 0.9;   // 発見〜警戒の最低「見える歩行」秒数（12fps で約 11 コマ＝数歩）
  const HERMITB_CLOSE = 300;      // これ以内は近接遭遇とみなし即警戒（進入時に予告を遅らせない）
  const HERMITB_PARTS = {   /* 150box 座標。Blender のパーツ別レンダから（_hermit_lab/hermit_b_parts.json） */
    shell:{x:21.29,y:48.05,w:121.29,h:100.2}, torso:{x:50.0,y:92.97,w:76.37,h:49.61},
    legs:{x:2.73,y:105.08,w:119.92,h:39.84}, clawL:{x:90.23,y:78.52,w:52.54,h:49.8},
    clawR:{x:104.49,y:84.57,w:42.38,h:31.25}, eyes:{x:107.62,y:55.08,w:36.91,h:45.12},
  };
  /* 歩行16コマの部位矩形（150box 座標・x,y,w,h）。_hermit_lab/hermit_b_walkparts.json から生成。 */
  const HERMITB_WALK_RECTS = {
    shell:'20.31,49.61,122.27,99.61;19.92,48.83,122.66,100.39;19.92,48.44,122.66,100.78;19.92,48.83,122.66,100.39;19.92,49.61,122.66,99.61;19.92,50,122.66,99.22;19.92,50.39,122.66,98.83;20.31,50,122.27,99.22;20.31,49.61,122.27,99.61;20.31,48.83,122.27,100.39;20.31,48.44,122.27,100.78;20.31,48.83,122.66,100.39;20.31,49.61,122.66,99.61;20.31,50,122.66,99.22;20.31,50.39,122.27,98.83;20.31,50,122.27,99.22',
    torso:'48.83,94.14,77.34,51.17;48.83,93.75,77.34,50.78;48.83,93.36,77.34,50.78;48.83,93.75,77.34,50.78;48.83,94.14,77.34,51.17;48.83,94.92,77.34,50.78;48.83,94.92,77.34,51.17;48.83,94.92,77.34,50.78;48.83,94.14,77.34,51.17;49.22,93.75,76.95,50.78;49.22,93.36,77.34,50.78;49.22,93.75,77.34,50.78;49.22,94.14,77.34,50.78;49.22,94.92,77.34,50.78;49.22,94.92,76.95,51.17;49.22,94.92,76.95,50.78',
    legs:'13.28,105.47,101.56,40.62;11.72,105.47,102.34,40.62;10.16,105.47,103.91,40.62;8.98,105.47,106.25,40.23;7.42,104.3,108.59,41.41;6.25,103.12,110.94,42.58;4.69,102.73,114.06,42.58;3.12,103.52,117.58,41.8;1.95,104.69,121.48,41.02;0.39,105.08,121.09,40.62;0.39,105.08,119.92,40.23;2.34,105.47,116.8,39.84;4.69,105.47,113.28,39.84;6.64,105.08,110.55,39.84;8.98,104.69,107.42,40.23;10.94,105.08,104.69,39.84',
    clawL:'88.67,92.58,53.91,44.53;88.67,91.8,53.91,44.53;88.67,91.41,53.91,44.53;88.67,91.8,53.91,44.53;88.67,92.58,53.91,44.53;88.67,92.97,53.91,44.53;88.67,93.36,53.91,44.53;88.67,92.97,53.91,44.53;88.67,92.58,53.91,44.53;88.67,91.8,53.91,44.53;89.06,91.41,53.52,44.53;89.06,91.8,53.91,44.53;89.06,92.19,53.91,44.92;89.06,92.97,53.91,44.53;89.06,93.36,53.52,44.53;88.67,92.97,53.91,44.53',
    clawR:'103.91,91.02,44.14,28.91;103.91,90.62,44.14,28.52;103.91,90.23,44.14,28.52;103.91,90.62,43.75,28.52;103.91,91.02,43.75,28.91;103.91,91.8,43.75,28.52;103.91,92.19,44.14,28.52;103.91,91.8,44.14,28.52;103.91,91.02,44.14,28.91;104.3,90.62,43.75,28.52;104.3,90.23,43.75,28.52;104.3,90.62,43.75,28.52;104.3,91.02,44.14,28.91;104.3,91.8,43.75,28.52;104.3,92.19,43.75,28.52;104.3,91.8,43.75,28.52',
    eyes:'106.64,57.03,37.11,45.7;106.64,56.25,37.89,45.7;106.25,56.25,37.89,45.7;106.25,56.25,37.89,45.7;106.25,57.03,37.89,45.7;106.25,57.81,37.89,45.31;106.25,57.81,37.89,45.7;106.64,57.81,37.11,45.31;106.64,57.03,37.11,45.7;106.64,56.25,37.89,45.7;106.64,56.25,37.89,45.7;106.64,56.25,37.89,45.7;106.64,57.03,37.89,45.7;106.64,57.81,37.89,45.31;106.64,57.81,37.89,45.7;106.64,57.81,37.89,45.31',
  };
  const HERMITB_PART_META = {
    shell:{ depth:1, mass:4.5, spin:0.5 }, torso:{ depth:2, mass:1.6, spin:1.7 },
    legs:{ depth:3, mass:1.0, spin:2.2 }, clawL:{ depth:4, mass:1.2, spin:1.9 },
    clawR:{ depth:4, mass:1.2, spin:1.9 }, eyes:{ depth:5, mass:0.7, spin:2.6 },
  };
  const HERMITB_AS = HERMITB_CELL / HERMITB_BOX;      /* アトラス px / box 単位 = 2.56 */
  function rectRows(s){
    const out = [];
    for (const v of s.split(';')) out.push(v.split(',').map(Number));
    return out;
  }
  const HERMITB_DEF_WALK = { box:HERMITB_BOX, frames:HERMITB_FRAMES, parts: Object.keys(HERMITB_PART_META).map(name => {
    const rows = rectRows(HERMITB_WALK_RECTS[name]);
    const perFrame = rows.map((r, f) => ({
      crop:[f * HERMITB_CELL + r[0] * HERMITB_AS, r[1] * HERMITB_AS, r[2] * HERMITB_AS, r[3] * HERMITB_AS],
      at:[r[0] + r[2] / 2 - 75, r[1] + r[3] / 2 - 149], scale:1 / HERMITB_AS, rot:0,
    }));
    return Object.assign({ id:name, img:hermitBWalkPartArt[name], perFrame }, HERMITB_PART_META[name]);
  })};
  const HERMITB_DEF_ALERT = { box:HERMITB_BOX, frames:1, parts: Object.keys(HERMITB_PART_META).map(name => {
    const r = HERMITB_PARTS[name];
    return Object.assign({ id:name, img:hermitBPartArt[name], crop:null,
      at:[r.x + r.w / 2 - 75, r.y + r.h / 2 - 149], scale:150 / 768, rot:0 }, HERMITB_PART_META[name]);
  })};
  /** 表示ポーズの部位（歩行フレーム / 警戒）。警戒の静止パーツは実寸で crop を埋める。 */
  function hermitBParts(which, frame){
    const def = which === 'walk' ? HERMITB_DEF_WALK : HERMITB_DEF_ALERT;
    const parts = PD.poseFrame(def, { frame });
    if (which !== 'walk') for (const p of parts) if (!p.crop && p.img) p.crop = [0, 0, p.img.width || 1, p.img.height || 1];
    return parts;
  }
  /** スナップショットを描く（通常描画も撃破も同じ変換を読む）。 */
  function drawSnapParts(g, snap){
    for (const p of snap.parts){
      if (!p.crop || !p.img || !ready(p.img)) continue;
      const w = p.crop[2] * p.scale, h = p.crop[3] * p.scale;
      g.save();
      g.translate(p.at[0], p.at[1]);
      if (p.flip < 0) g.scale(-1, 1);
      if (p.rot) g.rotate(p.rot);
      g.drawImage(p.img, p.crop[0], p.crop[1], p.crop[2], p.crop[3], -w / 2, -h / 2, w, h);
      g.restore();
    }
  }

  /* v1.7.0: ミサイルの吹き飛ばし と 魚雷の弱い誘導。
     ミサイルは爆心の普通の敵を放射状に飛ばす（ボスと海底固定はダメージのみ）。
     魚雷は発射時に前方近傍の標的を1つだけ選び、そこへミサイルより明確に弱く寄る。 */
  const MISSILE_KNOCK = 640;         // 爆心の敵へ与える放射速度（px/s）。距離減衰する
  const MISSILE_KNOCK_STUN = 0.42;   // 吹き飛び中は短く制御を外して飛ばす
  /* v1.17.0: ミサイルは装弾数が限られる代わりに一撃を重くする。
     魚雷＝長い連射の継続火力、ミサイル＝まとめて・大きな敵へ短時間の強打。
     直撃と爆風の実ダメージに係数を掛け、爆風の外周でも群れを散らす。
     艇の改造カーブ（BASE_STATS/200段/見た目最大4倍）と既存セーブの効きは不変。 */
  const MISSILE_DMG_MUL = 1.8;        // 直撃・爆風の実ダメージ係数（装備個体の倍率に掛かる）
  const MISSILE_BLAST_FLOOR = 0.55;   // 爆風の外周でも入る割合（群れをまとめて散らす）
  const missileKnock = vs => MISSILE_KNOCK * (0.85 + 0.15 * (vs || 1));   // 威力ランクで吹き飛びも強く
  const TORP_TURN = 1.1;             // 魚雷の誘導角速度（rad/s）。ミサイル4.2より明確に弱い
  const TORP_CONE = 0.42;            // 発射時に狙う前方コーン（rad, 約24°）
  const TORP_RANGE = 1000;           // 誘導候補の最大距離
  const TORP_MAX_OFF = 0.6;          // 誘導中に許す最大偏角。背後へは旋回しない

  /* v1.13.0: 攻撃元の安定 ID（瞬間バリアの連続接触判定に使う）。 */
  let gidSeq = 0;
  const nextGid = () => ++gidSeq;

  /* v1.17.0: 序盤の緩和（静かな導入 → 少数の弱敵 → 徐々に通常）。
     進行（G.dist）で決まるので座標任せではない。導入が明けると 1 に戻り、
     前哨基地の後も永久に弱いままにはしない。 */
  const EARLY_RAMP = 6000;                  // この距離で通常へ戻る（前哨基地より手前）
  function earlyEase(){ return clamp(G.dist / EARLY_RAMP, 0, 1); }
  function earlyHpMul(){ return 0.45 + 0.55 * earlyEase(); }   // 硬さ（0.45 → 1）
  function earlyDmgMul(){ return 0.60 + 0.40 * earlyEase(); }  // 攻撃の重さ（頻度と併せて体感を和らげる）
  function earlySpawnMul(){ return 1.8 - 0.8 * earlyEase(); }  // 出現間隔（1.8 → 1：序盤は少なめ）

  function spawnEnemy(kind, x, y){
    const d = 1 + G.dist / 26000;
    const base = {
      gid: nextGid(),
      kind, x, y, vx:0, vy:0, t:rnd(0, 10), dir:-1, stun:0, flash:0,
      dead:false, hitCd:0, phase:0, pt:0, st:0, jaw:0, eye:0
    };
    let e;
    if (kind === 'minnow') {
      e = Object.assign(base, {
        r:9, hp:1, maxHp:1, score:10, dmg:4, speed:rnd(70, 130), dir:-1,
        wob:rnd(0, TAU), amp:rnd(8, 26), sp:rnd(0.7, 1.4), fus:rnd(0.9, 1.3)
      });
    } else if (kind === 'hunter') {
      e = Object.assign(base, { r:24, hp:5 + d * 1.6, maxHp:5 + d * 1.6, score:60, speed:rnd(150, 210), dmg:12, ang:Math.PI, turn:1.8 });
    } else if (kind === 'jelly') {
      e = Object.assign(base, { r:30, hp:3 + d, maxHp:3 + d, score:40, speed:rnd(14, 30), dmg:9, pulse:rnd(0, TAU) });
    } else if (kind === 'angler') {
      e = Object.assign(base, { r:44, hp:13 + d * 4, maxHp:13 + d * 4, score:170, speed:rnd(60, 95), dmg:17, lure:rnd(0, TAU), state:'stalk' });
    } else if (kind === 'mine') {
      e = Object.assign(base, { r:22, hp:2, maxHp:2, score:20, dmg:26, drift:rnd(0, TAU) });
    } else if (kind === 'hermit') {
      const hp = 12 + d * 4;
      e = Object.assign(base, {
        y:y - 34, r:34, hp, maxHp:hp, score:180, dmg:14,
        floorY:y, state:'dormant', st:0.85,
      });
    } else if (kind === 'hermitB') {
      /* v3.7.0(隔離試作): B亜種ヤドカリ（中型）。海底を歩き、接近で止まって砲撃。既存の戦車ヤドカリとは別種。
         当たりは body 半径 r=52・体の中心 y=floorY-60（既存の戦車ヤドカリの active と同じ基準）。
         noticeT は「発見してから警戒に入るまでの見える歩行」の経過（v3.7.0 視認性の修正）。 */
      const hp = 14 + d * 4;
      e = Object.assign(base, {
        y:y - 60, r:52, hp, maxHp:hp, score:200, dmg:14,
        floorY:y, state:'walk', st:0, dir:1, x0:x, walkT:0, t:0, noticeT:0,
      });
    } else if (kind === 'gunner') {
      const hp = 10 + d * 4;
      e = Object.assign(base, { r:43, hp, maxHp:hp, score:160, dmg:10, st:1.1 });
    } else if (kind === 'anemone') {
      /* v3.8.0: 黒玄武岩に根づく固定型。動かない（rooted）ので吹き飛ばし・ノックバック対象外。 */
      const hp = ANEMONE.HP + d * 3;
      e = Object.assign(base, {
        r:40, hp, maxHp:hp, score:ANEMONE.SCORE, dmg:ANEMONE.DAMAGE,
        phase:'idle', pt:0, dir:1, rooted:true,
      });
    } else if (kind === 'geo_crab') {
      /* v3.8.0(隔離試作): 地層背負いの巨蟹。岩そのものに見える大型蟹。
         殻は硬く、撃破・進行フラグは必須にしない（上・後ろを通過できる）。1 遭遇の場所固有の脅威。 */
      const cfY = (G.trenchFloorY != null) ? G.trenchFloorY : (y + GEO_CRAB.BODY_H * 0.5);
      const c = createGeoCrab(x, y, cfY, { dir:-1 });
      e = Object.assign(base, c);
      e.score = 0; e.dmg = 26; e.swingHit = false;
      G.crab = e;
    } else if (kind === 'leviathan') {
      const hp = 300 + G.bossKills * 150;
      e = Object.assign(base, {
        r:150, hp, maxHp:hp, score:3000, dmg:34, state:'enter', jaw:0.05, dir:-1,
        L:1180, H:250, hover:0.74, atkCd:0, flashT:0, dead:false
      });
      G.boss = e;
    } else if (kind === 'squid') {
      const hp = 280 + G.bossKills * 140;
      e = Object.assign(base, {
        r:190, hp, maxHp:hp, score:3200, dmg:26, state:'enter', dir:-1,
        L:580, W:120, hover:0.60, reach:340, arm:0, whiplash:0, inkT:0, st:2.4
      });
      G.boss = e;
    }
    /* v1.17.0: 序盤の緩和（ボスと巨大な敵は対象外）。hp を丸め、0 にならないよう最低 1。 */
    if (e && e.maxHp != null && kind !== 'leviathan' && kind !== 'squid' && kind !== 'geo_crab' && kind !== 'gravel_crab'){
      const em = earlyHpMul(), dm = earlyDmgMul();
      e.hp = Math.max(1, Math.round(e.hp * em));
      e.maxHp = e.hp;
      if (typeof e.dmg === 'number') e.dmg = Math.max(1, Math.round(e.dmg * dm));
    }
    G.enemies.push(e);
    return e;
  }

  function damageEnemy(e, dmg, kx, ky, zone){
    if (e.dead) return;
    /* v1.17.0: ボスは着弾で体表だけ発光/変色させない（部位スプライトのヒットフラッシュ無し）。
       手応えは泡・圧力波・音・短い揺れ・HP 変化で出す。通常敵のヒットフラッシュはこれまでどおり。 */
    /* v3.8.0(隔離試作): 地層背負いの巨蟹は殻が硬い。装甲を通した実ダメージにする
       （弾を無効化しない＝イベント無敵・進行フラグで消さない。序盤は極小、強化装備は通る）。
       ヒットで殻を発光/変色させない（全身・部位を光らせない）。手応えは衝突点の局所で出す。 */
    let eff = dmg;
    if (e.kind === 'geo_crab'){
      const z = zone || 'body';
      eff = geoCrabDamage(e, dmg, z);
      e.lastZone = z;
    } else if (e.kind === 'gravel_crab'){
      /* v3.9.2: 礫鎧ガニも殻は硬い（装甲を通した実ダメージ。0 にはしない）。 */
      const z = zone || 'body';
      eff = gravelCrabDamage(e, dmg, z);
      e.lastZone = z;
    } else if (!isBoss(e)) {
      e.flash = 0.1;
    }
    e.hp -= eff;
    /* v3.7.0: 戦車ヤドカリ・B亜種ヤドカリは接地する重い甲殻。吹き飛ばしの速度を溜めない（足を据える）。 */
    if (e.kind !== 'hermit' && e.kind !== 'hermitB' && e.kind !== 'geo_crab' && e.kind !== 'gravel_crab' && !e.rooted && (kx || ky)) { e.vx += kx; e.vy += ky; }
    if (e.hp <= 0) killEnemy(e);
    else if (e.kind !== 'leviathan') AU.hit();
  }

  /* v1.7.0: 吹き飛ばし。普通の敵だけ放射状に飛ばす。ボスと海底固定の戦車ヤドカリは
     ダメージのみで動かさない（既存の stun を短く借りて vx/vy で移動させる）。 */
  function knockEnemy(e, ix, iy){
    if (e.dead || isBoss(e) || e.kind === 'hermit' || e.kind === 'hermitB' || e.kind === 'gravel_crab' || e.rooted) return;
    if (!ix && !iy) return;
    e.vx += ix; e.vy += iy;
    e.stun = Math.max(e.stun || 0, MISSILE_KNOCK_STUN);
  }

  /* v1.7.0: ミサイルの爆発。直撃は威力そのまま、周囲は爆心からの距離減衰つきで
     放射ダメージ＋吹き飛ばし。直撃した敵は周囲ループから外して二重加算を防ぐ。
     敵に当たらず地形で爆発した場合も同じ周囲効果になる（引数 enemy は null）。 */
  function missileBlast(b, x, y, directEnemy){
    const R = b.aoe || 110;
    const ba = (typeof b.a === 'number') ? b.a : 0;
    if (directEnemy && !directEnemy.dead){
      damageEnemy(directEnemy, b.dmg, 0, 0);
      const dk = missileKnock(b.vscale || 1);
      knockEnemy(directEnemy, Math.cos(ba) * dk, Math.sin(ba) * dk);
      G.impacts.push({ x, y, life:0.26 });
    }
    for (const e of G.enemies){
      if (e === directEnemy || e.dead) continue;
      const ex = enemyAimX(e), ey = e.y;
      const dd = Math.hypot(ex - x, ey - y);
      if (dd > R) continue;
      const f = 1 - dd / R;                       // 0(外周)..1(爆心)
      damageEnemy(e, b.dmg * Math.max(MISSILE_BLAST_FLOOR, f), 0, 0);   // v1.17.0: 外周でも床ぶんは入る（群れを散らす）
      const ux = dd > 0.001 ? (ex - x) / dd : Math.cos(ba);
      const uy = dd > 0.001 ? (ey - y) / dd : Math.sin(ba);
      const imp = missileKnock(b.vscale || 1) * (0.5 + 0.5 * f);       // v1.17.0: 威力ランクで吹き飛びも強く
      knockEnemy(e, ux * imp, uy * imp);
    }
    missileBurst(x, y, R, b.vscale || 1);
    AU.missileImpact(1.3 + 0.4 * (b.vscale || 1), b.impactSound || b.style);
    /* v1.18.0: 直撃/近接爆風がボスの突進を迎撃する（既存のダメージ・爆発はこの上で不変）。 */
    bossDashStopFromBlast(x, y, R);
  }

  /* v1.18.0: ミサイルでボスの突進を止める「迎撃」。
     直撃・十分近い爆風（描画と共通の当たり幾何で実ボディが爆心に触れる）で、突進中
     （lunge/sweep と、その予備動作）のリヴァイアサンだけを一度止める。イカは突進を
     持たないため対象外。遠い爆風・待機/回復中の追撃・魚雷では中断リセットしない（永久ハメ防止）。
     中断＝短い押し戻し→安全な復帰（攻撃状態と lvx/lvy を解除、押し戻し中は接触ダメージ無効）。 */
  const BOSS_DASH_STATES = { lungeWind:true, lunge:true, sweepWind:true, sweep:true };
  const BOSS_STAGGER_T = 0.7;        // 押し戻し＋復帰までの短い時間
  const BOSS_STAGGER_PUSH = 560;     // 押し戻しの初速（px/s・減衰して止まる）

  function stopBossDash(e){
    const p = G.player;
    const a = p ? Math.atan2(e.y - p.y, e.x - p.x) : Math.PI;   // プレイヤーから離れる向き（≒突進の後方）
    e.state = 'stagger';
    e.st = BOSS_STAGGER_T;
    e.lvx = 0; e.lvy = 0;                                       // 突進速度を止める
    e.vx = Math.cos(a) * BOSS_STAGGER_PUSH;
    e.vy = Math.sin(a) * BOSS_STAGGER_PUSH;
    e.jaw = 0.05;
    AU.boom(1.0); AU.setRumble(0.35);
    G.shake = Math.min(20, G.shake + 5);
    bubbles(e.x, e.y, 16, 64, 1);
    floatText(e.x, e.y - e.r - 24, '突進を止めた！', '#cfe8ff', 26);
  }
  function bossDashStopFromBlast(x, y, R){
    for (const e of G.enemies){
      if (e.dead || e.kind !== 'leviathan' || !BOSS_DASH_STATES[e.state]) continue;
      /* 「十分近い」＝中心座標ではなく、描画と共通の幾何で実ボディが爆心に触れていること。 */
      if (enemyHit(e, x, y, R)) stopBossDash(e);
    }
  }

  /* v1.7.0: 魚雷の発射時に前方近傍の生きた標的を1つ選ぶ（毎フレーム全弾×全敵の走査を避ける）。
     前方コーン (TORP_CONE) 内かつ TORP_RANGE 以内の最も近い敵のみ。海底固定は対象外。 */
  function pickTorpedoTarget(p, aim){
    let best = null, bd = TORP_RANGE * TORP_RANGE;
    for (const e of G.enemies){
      if (e.dead || e.kind === 'hermit') continue;
      const ex = enemyAimX(e), ey = e.y;
      const dd = d2(ex, ey, p.x, p.y);
      if (dd > bd) continue;
      if (Math.abs(angNorm(Math.atan2(ey - p.y, ex - p.x) - aim)) > TORP_CONE) continue;
      bd = dd; best = e;
    }
    return best;
  }

  /* v1.15.0: 敵の確率ドロップ＝「回収品」（武器の個体）。資源・補給（ミサイル/修理）とは別の物。
     ドロップ判定は G.lootRng に分離する（表示の乱数とは混ぜない／テストで注入できる）。 */
  const SALVAGE_KINDS = { hunter:true, angler:true, gunner:true };
  const SALVAGE_CHANCE = 0.22;

  function killEnemy(e){
    if (e.dead) return;
    e.dead = true;
    G.kills++; G.combo++; G.comboT = 1.6;
    if (e.kind === 'geo_crab'){ killGeoCrab(e); return; }
    if (e.kind === 'gravel_crab'){
      /* v3.9.2(隔離試作): 撃破は崩壊を見せてから消える（cull が deadT>0 の間だけ残す）。
         隔離候補なので資源・ドロップは出さない（本編の経済に影響しない）。 */
      e.deadT = 1.4;
      G.shake = Math.max(G.shake, 8);
      AU.boom(1.1);
      for (let i = 0; i < 10; i++)
        explode(e.x + rnd(-e.bodyW * 0.4, e.bodyW * 0.4), e.y + rnd(-40, 50), rnd(30, 80), 1.2);
      return;
    }
    let sc = e.score * (1 + (G.combo - 1) * 0.12);
    const gained = Math.round(sc);
    addResource(gained);
    floatText(e.x, e.y - e.r, '+' + gained, '#ffe9a8', 20 + Math.min(18, G.combo * 2));
    if (G.combo >= 4 && G.combo % 4 === 0) floatText(e.x, e.y - e.r - 28, 'MULTI x' + G.combo, '#ff9ad5', 30);

    if (isBoss(e)) {
      G.bossKills++;
      G.boss = null;
      G.flash = 0.85; G.shake = 30;
      for (let i = 0; i < 14; i++) {
        const a = rnd(0, TAU), rr = rnd(0, 300);
        G.lights.push({ x:e.x + Math.cos(a) * rr, y:e.y + Math.sin(a) * rr, r:rnd(260, 620), life:rnd(0.4, 1.0), max:1.0, col:'#ffd28a' });
      }
      for (let i = 0; i < 9; i++) setTimeout(() => {
        explode(e.x + rnd(-420, 260), e.y + rnd(-180, 180), rnd(50, 120), 2.2);
        AU.boom(2.0);
      }, i * 110);
      for (let i = 0; i < 4; i++) spawnPickup(e.x + rnd(-200, 120), e.y + rnd(-120, 120), 'missile');
      spawnPickup(e.x, e.y, 'repair');
      spawnPickup(e.x - 100, e.y + 60, 'repair');
      /* v1.15.0: ボスは回収品を確実に落とす（資源・補給とは別枠）。 */
      for (let i = 0; i < 2; i++) spawnPickup(e.x + rnd(-160, 40), e.y + rnd(-110, 110), 'salvage');
      /* v1.16.0: ボス撃破は近接を 1 種解放する（回収の機会。全自動近接の入口）。 */
      const lockedMelee = MELEE_ORDER.filter(id => !advanced.isMeleeUnlocked(id));
      if (lockedMelee.length){
        const pickId = lockedMelee[Math.floor(G.lootRng() * lockedMelee.length)];
        if (advanced.unlockMelee(pickId, G.lootRng)) floatText(e.x, e.y - 210, MELEE_TYPES[pickId].name + ' を解放', '#c8ffd0', 24);
      }
      floatText(e.x, e.y - 200, '撃破!! ' + (e.kind === 'squid' ? 'COLOSSAL SQUID' : 'LEVIATHAN'), '#ffd0ff', 44);
      G.nextBossAt = G.player.x + 11000 + G.bossKills * 1500;
      /* v1.19.0: ボス撃破は前哨基地の出現・トーストに関係しない（基地は最初から世界にある）。
         ボスは“その場所の脅威”で、撃破報酬（資源・回収品・近接解放）だけを維持する。 */
    } else {
      explode(e.x, e.y, e.r * (e.kind === 'angler' ? 2.4 : 1.3), e.kind === 'angler' ? 1.5 : 0.9);
      AU.boom(e.kind === 'angler' ? 1.2 : 0.6);
      if (e.kind === 'hermitB') spawnHermitBBurst(e);    // v3.7.0: 殻/胴/脚/鋏/眼に分裂（演出のみ・報酬はこの下で一度）
      if (e.kind === 'mine') {
        for (const o of G.enemies) if (o !== e && !o.dead && d2(o.x, o.y, e.x, e.y) < 160 * 160) damageEnemy(o, 4, 0, 0);
      }
      const p = G.player;
      if (e.kind === 'hunter' || e.kind === 'angler') {
        if (Math.random() < 0.24) spawnPickup(e.x, e.y, 'missile');
        else if (Math.random() < 0.12) spawnPickup(e.x, e.y, 'repair');
      }
      /* v1.15.0: 撃破機会の回収品ドロップ。判定は lootRng に分離（同一敵は一度きり＝撃破で消える）。 */
      if (SALVAGE_KINDS[e.kind] && G.lootRng() < SALVAGE_CHANCE) {
        spawnPickup(e.x + rnd(-30, 30), e.y + rnd(-30, 30), 'salvage');
      }
      /* v3.8.0: 煤冠イソギンチャクの撃破は一度だけ（この遭遇を defeated にして再出現させない＝報酬一回）。 */
      if (e.kind === 'anemone' && G.anemone) G.anemone.onDefeat();
      if (e.kind === 'jelly') {
        for (let i = 0; i < 6; i++) {
          const a = rnd(0, TAU);
          G.ebullets.push({ gid:nextGid(), x:e.x, y:e.y, vx:Math.cos(a) * 190, vy:Math.sin(a) * 190, r:7, dmg:6, life:1.2, a });
        }
      }
    }
    e.hp = 0;
  }

  function spawnPickup(x, y, kind){
    G.pickups.push({ x, y, vx:rnd(-30, 30), vy:rnd(-40, -10), kind, r:14, t:rnd(0, 6), life:16 });
  }

  /* v1.15.0: 回収品を拾うと、武器の個体（魚雷/ミサイル）が倉庫に入る。資源・補給とは別。
     倉庫が満杯なら何も増やさずメッセージだけ（安全）。個体は保存され、再読み込みで再抽選しない。 */
  function pickupSalvage(k){
    /* 既存: 回収品（魚雷/ミサイル）を armory へ（現行挙動を維持）。 */
    const typeId = G.lootRng() < 0.5 ? 'torpedo' : 'missile';
    /* v1.17.0: 初回ボス後、海溝の実際の深部（回収座標が海溝の開口内で海底より下）で拾った魚雷だけ、
       扇状 6/9/12 ウェイが抽選に混ざる（weapon-rules.rollItem の deepSalvo。通常抽選・他兵装は不変）。 */
    const deepSalvo = inTrenchDeep(k.x, k.y, G.baseMarker, G.bossKills);
    const rolled = rollItem(typeId, G.lootRng, { deepSalvo });
    const res = arsenal.add(rolled);
    /* v1.16.0: 回収成功の時だけ、通常魚雷/ミサイルの特性も恒久解放する（style→形状/発射音/着弾音）。 */
    let suffix = '';
    const wn = advanced.unlockFromItem(rolled);
    if (wn > 0) suffix = '  特性+' + wn;
    /* v1.16.0: 追加兵装の型互換の特性（同時発射/方向/弾の形/発射音/着弾音）も恒久解放する。 */
    const advType = SHOT_ORDER[1 + Math.floor(G.lootRng() * (SHOT_ORDER.length - 1))];
    const advItem = rollAdvanced(advType, G.lootRng);
    if (advItem){
      const n = advanced.unlockFromItem(advItem);
      if (n > 0) suffix += '  追加+' + n;
      advanced.add(advItem);                                     // 満杯なら解放だけ残る（安全）
    }
    if (res.ok){
      floatText(k.x, k.y, '回収 ' + itemShort(res.item) + suffix, '#bfe9ff', 20);
      AU.pick();
    } else {
      floatText(k.x, k.y, '倉庫が満杯' + (suffix ? '（特性のみ解放）' : ''), '#ffb0a0', 20);
    }
  }

  function enemyUpdate(e, dt){
    if (e.flash > 0) e.flash -= dt;
    e.hitCd = Math.max(0, e.hitCd - dt);
    if (e.stun > 0) e.stun -= dt;
    const p = G.player;
    if (!p) return;

    if (e.stun > 0) { e.vx *= Math.exp(-3 * dt); e.vy *= Math.exp(-3 * dt); e.x += e.vx * dt; e.y += e.vy * dt; return; }

    switch (e.kind) {
      case 'minnow': {
        e.t += dt;
        const flee = d2(e.x, e.y, p.x, p.y) < 150 * 150 ? 1 : 0;
        e.x -= (e.speed + flee * 90) * dt;
        e.y += Math.sin(e.t * e.sp + e.wob) * e.amp * dt;
        e.y += Math.sin(e.t * 2.3) * 14 * dt;
        e.vx = -e.speed;
        break;
      }
      case 'hunter': {
        const dx = p.x - e.x, dy = p.y - e.y;
        const dd = Math.hypot(dx, dy) || 1;
        if (e.state === 'idle') {
          e.ang += angNorm(Math.atan2(dy, dx) - e.ang) * Math.min(1, dt * 1.4);
          e.x += Math.cos(e.ang) * e.speed * dt; e.y += Math.sin(e.ang) * e.speed * dt;
          if (dd < 480 || e.x < G.camX + VW * 0.85) { e.state = 'wind'; e.st = 0.55; }
        } else if (e.state === 'wind') {
          e.st -= dt;
          e.ang += angNorm(Math.atan2(dy, dx) - e.ang) * Math.min(1, dt * 6);
          e.x -= Math.cos(e.ang) * 60 * dt; e.y -= Math.sin(e.ang) * 60 * dt;
          if (e.st <= 0) {
            e.state = 'dash'; e.st = 1.0;
            e.dvx = Math.cos(e.ang) * 780; e.dvy = Math.sin(e.ang) * 780;
            AU.warp();
          }
        } else if (e.state === 'dash') {
          e.st -= dt;
          e.x += e.dvx * dt; e.y += e.dvy * dt;
          e.dvx *= Math.exp(-1.1 * dt); e.dvy *= Math.exp(-1.1 * dt);
          if (Math.random() < 0.5) part(e.x, e.y, rnd(-20, 20), rnd(-20, 20), { life:0.4, max:0.4, size:2.5, col:'rgba(160,220,255,0.5)', glow:0.2 });
          if (e.st <= 0) { e.state = 'idle'; }
        }
        e.dir = Math.cos(e.ang) < 0 ? -1 : 1;
        break;
      }
      case 'jelly': {
        e.t += dt;
        e.y += Math.sin(e.t * 0.9 + e.pulse) * 26 * dt;
        e.x -= (e.speed + Math.sin(e.t * 0.4) * 12) * dt;
        if (Math.random() < 0.25) part(e.x + rnd(-14, 14), e.y + 24, rnd(-10, 10), rnd(10, 40), { life:rnd(0.5, 1.1), max:1.1, size:rnd(1.5, 3), col:'rgba(150,255,230,0.5)', glow:0.5 });
        break;
      }
      case 'angler': {
        e.t += dt; e.lure += dt * 1.6;
        const dx = p.x - e.x, dy = p.y - e.y, dd = Math.hypot(dx, dy) || 1;
        if (e.state === 'stalk') {
          e.vx = lerp(e.vx, (dx / dd) * e.speed, dt * 1.6);
          e.vy = lerp(e.vy, (dy / dd) * e.speed * 0.8 + Math.sin(e.t) * 26, dt * 1.6);
          if (dd < 420) { e.state = 'wind'; e.st = 0.7; AU.warp(); }
          if (dd > 1200) { e.vx = -60; e.vy = Math.sin(e.t) * 30; }
        } else if (e.state === 'wind') {
          e.st -= dt;
          e.vx = lerp(e.vx, -Math.cos(Math.atan2(dy, dx)) * 70, dt * 4);
          e.vy = lerp(e.vy, -Math.sin(Math.atan2(dy, dx)) * 70, dt * 4);
          if (e.st <= 0) {
            e.state = 'lunge'; e.st = 0.85; e.jaw = 1;
            const a = Math.atan2(dy, dx);
            e.vx = Math.cos(a) * 720; e.vy = Math.sin(a) * 720; AU.boom(0.7);
          }
        } else if (e.state === 'lunge') {
          e.st -= dt;
          e.vx *= Math.exp(-1.6 * dt); e.vy *= Math.exp(-1.6 * dt);
          if (e.st <= 0) { e.state = 'stalk'; e.jaw = 0; }
        }
        e.jaw = lerp(e.jaw, e.state === 'lunge' ? 1 : 0.15, dt * 7);
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.dir = p.x < e.x ? -1 : 1;
        if (Math.random() < 0.4) part(e.x + Math.cos(e.t * 2) * 40 * e.dir, e.y - 46, rnd(-8, 8), rnd(-14, 2), { life:rnd(0.4, 0.9), max:0.9, size:rnd(1.5, 3.4), col:'#bff7ff', glow:1 });
        break;
      }
      case 'mine': {
        e.t += dt;
        e.x -= 26 * dt;
        e.y += Math.sin(e.t * 0.8 + e.drift) * 22 * dt;
        break;
      }
      case 'hermit': updateHermit(e, dt, p); return;
      case 'hermitB': updateHermitB(e, dt, p); return;
      case 'gunner': updateGunner(e, dt, p); break;
      case 'anemone': updateAnemone(e, dt, p); return;   // v3.8.0: 根づいた固定型（上下クランプに乗せない）
      case 'geo_crab': updateGeoCrab(e, dt, p); return;   // 深海の帯クランプを避ける（hermit と同じ）
      case 'gravel_crab': updateGravelCrab(e, dt, p); return;   // v3.9.2: 床に張り付く（上下クランプに乗せない）
      case 'squid': squidUpdate(e, dt, p); break;
      case 'leviathan': leviathanUpdate(e, dt, p); break;
    }

    /* keep inside vertical band */
    e.y = clamp(e.y, 60, FLOOR_Y - 40);

    /* timers */
    e.hitCd = e.hitCd;
  }

  function updateHermit(e, dt, p){
    const inRange = d2(e.x, e.y, p.x, p.y) < HERMIT_RANGE * HERMIT_RANGE;
    if (e.state === 'dormant') {
      if (!inRange && e.hp === e.maxHp) return;
      e.state = 'active';
      e.y = e.floorY - 60;
      e.r = 52;
      bubbles(e.x, e.y, 12, 26);
    }
    if (!inRange) {
      e.st = Math.max(e.st, 0.65);
      return;
    }
    e.dir = p.x < e.x ? -1 : 1;
    e.st -= dt;
    if (e.st > 0) return;

    const x = e.x + e.dir * HERMIT_MUZZLE_X;
    const y = e.floorY + HERMIT_MUZZLE_Y;
    fireEnemyShell(x, y, p, 350, 12);
    e.st = 2.1;
  }

  function updateGunner(e, dt, p){
    e.t += dt;
    e.dir = p.x < e.x ? -1 : 1;
    const dx = p.x - e.x, dy = p.y - e.y;
    const inRange = dx * dx + dy * dy < 600 ** 2;
    if (inRange) e.st -= dt;
    else e.st = Math.max(e.st, 1.1);
    const charging = e.st <= GUNNER_CHARGE;
    const speed = Math.abs(dx) > 280 ? e.dir * 136 : -e.dir * 32;
    e.x += speed * (charging ? 0.2 : 1) * dt;
    e.y += (Math.sin(e.t * 2) * 29 + clamp(dy - 45, -90, 90) * 0.42) * dt;
    if (e.st > 0) return;
    fireEnemyShell(e.x + e.dir * GUNNER_MUZZLE_X, e.y + GUNNER_MUZZLE_Y, p, 300, 10);
    e.st = 2.5;
  }

  /* v3.8.0: 煤冠イソギンチャク。攻撃判定は「見えている範囲」の触手だけ（長い引き寄せ・通行遮断なし）。
     予告（warn）は無害、広げた（flare）ときだけ、触手の届く帯に居るときに被弾する。
     ダメージは瞬間バリア（just guard）でも受けられるように tryGuard を通す。 */
  function updateAnemone(e, dt, p){
    const dmg = stepAnemone(e, dt, p.x, p.y);      // e.t は stepAnemone 側で進む
    if (dmg > 0) tryGuard(foeKey(e), dmg, e.x, e.y);
    /* 予告中は白青い気配（細かい）：無害の合図。攻撃の合図は drawAnemoneTelegraph が光の後に描く。 */
    if (e.phase === 'warn' && Math.random() < 0.5){
      part(e.x + rnd(-16, 16), e.y - 42 + rnd(-12, 12),
           rnd(-6, 6), rnd(-34, -10),
           { life:rnd(0.3, 0.7), max:0.7, size:rnd(1, 2.6), col:'rgba(206,234,255,0.6)', glow:1, kind:'bubble' });
    }
  }

  /* v3.8.0: 煤冠イソギンチャクを 1 遭遇だけ出す（周回しても多重化しない）。
     地形（海溝＝深部が開いている）が在り、その地点へ近づいたときだけ 1 体を出現させる。 */
  function maybeSpawnAnemone(p){
    if (G.state !== 'play' || !p) return null;
    const t = createTrench(trenchAnchor());
    if (!t) return null;
    if (!G.anemone) G.anemone = createAnemoneEncounter(t);
    if (!G.anemone.needSpawn()) return null;
    const a = G.anemone.anchor;
    if (!a) return null;
    if (Math.hypot(p.x - a.x, p.y - a.y) > 1700) return null;   // 遠くで先出ししない
    const e = spawnEnemy('anemone', a.x, a.y);
    e.dir = a.dir;
    G.anemone.onSpawn();
    bubbles(a.x, a.y - 40, 10, 22);                              // 根づく気配（予告ではない）
    return e;
  }

  function fireEnemyShell(x, y, p, speed, dmg){
    const a = Math.atan2(p.y - y, p.x - x);
    G.ebullets.push({ gid:nextGid(), x, y, vx:Math.cos(a) * speed, vy:Math.sin(a) * speed,
      r:9, dmg, life:2.4, a, kind:'shell' });
    G.lights.push({ x, y, r:120, life:0.16, max:0.16, col:'#ffc178' });
    AU.boom(0.55);
  }

  /* ------------------------------------------------------------------ *
   * v3.8.0(隔離試作): 地層背負いの巨蟹（仮）
   *   起伏のある黒玄武岩に擬態する幅広の海底大型蟹（殻を背負うヤドカリではない）。
   *   前脚（近側 1 本）を持ち上げた一瞬にだけ生物だと分かる。攻撃は鈍重な一振りのみ
   *   （触手・弾幕・泳ぐボス の焼き直しにしない）。1 遭遇・場所固有の脅威で、
   *   撃破・進行フラグは必須にしない（上・後ろを通過できる）。
   *   殻は硬いが弾は無効化しない（装甲を通した実ダメージ。序盤は極小、強化装備は通る）。
   * ------------------------------------------------------------------ */
  let crabEncounter = createCrabEncounter();
  let crabSpawned = false;

  /* v3.9.2(隔離試作): 礫鎧ガニ（A/B/C）を 1 体その場に置く（1 遭遇の台帳は持たない）。
     既存の巨蟹（geo_crab）とは別種・別位置。体の接触は無害（上・後ろを通過できる）。 */
  let gravelPlaced = false;
  function spawnGravelCrab(species, x, floorY){
    const c = createGravelCrab(species, x, floorY, { dir:-1 });
    const e = Object.assign({
      gid: nextGid(), vx:0, vy:0, stun:0, phase:0, pt:0, jaw:0, eye:0, hitCd:0,
    }, c);
    e.dmg = GRAVEL_CRAB_SPECIES[species].clawDmg;
    e.score = 0;
    G.enemies.push(e);
    return e;
  }
  /* 3 別種を合流広間の深床へ、同一点に密集させず離して置く（中央の既存巨蟹は不変）。 */
  function ensureGravelCrabs(){
    if (gravelPlaced) return;
    const p = G.player; if (!p) return;
    const t = createTrench(trenchAnchor()); if (!t) return;
    const cx = t.sites.confluenceHall.x;
    if (Math.abs(p.x - cx) > 2600) return;
    gravelPlaced = true;
    const fy = t.deepFloorY;
    spawnGravelCrab('a', cx - 1450, fy);
    spawnGravelCrab('b', cx + 1350, fy);
    spawnGravelCrab('c', cx + 2350, fy);
  }

  /* 合流広間に 1 遭遇だけ置く（深部が開いてから）。 */
  function ensureGeoCrab(){
    if (crabSpawned || crabEncounter.isDefeated() || !deepUnlocked()) return;   // 撃破後は同じ遭遇で再出現しない
    const p = G.player;
    if (!p) return;
    const t = createTrench(trenchAnchor());
    if (!t) return;
    const cx = t.sites.confluenceHall.x;
    /* まだ遠いうちに置かない（カメラから離れた敵はカリングされるため）。
       広間へ近づいたときに 1 遭遇だけ置く。spawnWave と同じくカメラ相対で出す。 */
    if (Math.abs(p.x - cx) > 2600) return;
    crabSpawned = true;
    const c = spawnEnemy('geo_crab', cx, t.deepFloorY - GEO_CRAB.BODY_H * 0.5);
    crabEncounter.spawn(c);
  }

  function updateGeoCrab(e, dt, p){
    /* 撃破後は崩壊（脚が弛む）を見せる短い時間だけ残す。ダメージ・狙いは即終了。 */
    if (e.dead){ e.deadT = Math.max(0, (e.deadT || 0) - dt); return; }
    const ev = stepGeoCrab(e, dt, p);
    /* 床に張り付く（泳がせない）。体の接触では傷つかない＝岩。 */
    e.y = e.floorY - GEO_CRAB.BODY_H * 0.5;
    e.vx = 0; e.vy = 0;
    for (const t of ev){
      if (t === 'alert'){ AU.warp(); }
      else if (t === 'tell'){
        AU.alarm(); AU.setRumble(0.10);
        const leg = geoCrabLeg(e);
        bubbles(leg.knee.x, leg.knee.y, 6, 22);
        for (let i = 0; i < 5; i++) part(leg.tip.x, e.floorY - 6, rnd(-40, 40), rnd(-70, -10),
          { life:rnd(0.5, 1.1), max:1.1, size:rnd(2, 5), col:'rgba(150,160,168,0.5)', drag:2.0, kind:'smoke' });
      }
      else if (t === 'swingStart'){
        AU.boom(1.0); AU.setRumble(0.30); G.shake = Math.max(G.shake, 9);
        const leg = geoCrabLeg(e);
        for (let i = 0; i < 10; i++) part(leg.tip.x, leg.tip.y, rnd(-160, 160), rnd(-120, 60),
          { life:rnd(0.3, 0.8), max:0.8, size:rnd(3, 8), col:'rgba(175,186,196,0.45)', drag:1.8, kind:'smoke' });
      }
    }
    /* 堆積の粒を少量（常時発光させない） */
    if (Math.random() < 0.05) part(e.x + rnd(-GEO_CRAB.BODY_W * 0.4, GEO_CRAB.BODY_W * 0.4), e.y - GEO_CRAB.BODY_H * 0.3,
      rnd(-8, 8), rnd(-14, -2), { life:rnd(1.0, 2.0), max:2.0, size:rnd(1, 2.4), col:'rgba(150,175,185,0.28)', glow:0 });
  }

  /* 殻に当たって弾かれた合図（局所のみ。全身・部位を光らせない）。 */
  function crabImpactFeedback(e, x, y, ang, eff, zone){
    if (e.dead) return;
    if (zone === 'soft'){
      for (let i = 0; i < 6; i++) part(x, y, Math.cos(ang + rnd(-0.6, 0.6)) * rnd(60, 220), Math.sin(ang + rnd(-0.6, 0.6)) * rnd(60, 220),
        { life:rnd(0.15, 0.4), max:0.4, size:rnd(2, 4), col:'#ffd9a0', drag:3.5, glow:1, kind:'spark' });
      return;
    }
    /* 殻: 弾かれて横へ散る火花 ＋ 小さな破片（鈍い手応え）。 */
    const deflect = ang + Math.PI + rnd(-0.9, 0.9);
    for (let i = 0; i < 5; i++) part(x, y, Math.cos(deflect) * rnd(90, 260) + rnd(-40, 40), Math.sin(deflect) * rnd(90, 260) - 60,
      { life:rnd(0.14, 0.34), max:0.34, size:rnd(1.4, 3.2), col:'#c9d6df', drag:4.0, glow:0.5, kind:'spark' });
    if (eff < 3){
      for (let i = 0; i < 3; i++) part(x, y, rnd(-90, 90), rnd(-40, 120),
        { life:rnd(0.5, 1.2), max:1.2, size:rnd(1.5, 3.2), col:'rgba(140,148,156,0.55)', drag:2.4, kind:'smoke' });
    }
  }

  function killGeoCrab(e){
    const r = crabEncounter.onDefeat();
    if (r.first){
      addResource(r.reward, e.x, e.y, '+' + r.reward);
      floatText(e.x, e.y - GEO_CRAB.BODY_H * 0.5, '地層背負いの巨蟹 撃破', '#ffd0ff', 40);
    }
    G.shake = Math.max(G.shake, 26); G.flash = Math.max(G.flash, 0.25);
    AU.boom(1.6);
    e.deadT = 1.6;   // 崩壊を見せる時間（描画は drawGeoCrab が dead 姿勢でフェード）
    for (let i = 0; i < 12; i++){
      explode(e.x + rnd(-GEO_CRAB.BODY_W * 0.42, GEO_CRAB.BODY_W * 0.42), e.y + rnd(-GEO_CRAB.BODY_H * 0.4, 30), rnd(46, 120), 1.5);
    }
    for (let i = 0; i < 26; i++) part(e.x + rnd(-GEO_CRAB.BODY_W * 0.45, GEO_CRAB.BODY_W * 0.45), e.y + rnd(-120, 60),
      rnd(-140, 140), rnd(-70, 140), { life:rnd(0.6, 1.6), max:1.6, size:rnd(3, 9), col:'rgba(120,130,140,0.6)', drag:1.6, kind:'smoke' });
    spawnPickup(e.x - 120, e.y - 40, 'repair');
    spawnPickup(e.x + 120, e.y - 40, 'repair');
    spawnPickup(e.x, e.y - 90, 'missile');
    e.hp = 0;
  }

  function squidUpdate(e, dt, p){
    e.t += dt;
    e.dir = Math.sign(p.x - e.x) || -1;
    const rage = e.hp < e.maxHp * 0.45;

    switch (e.state) {
      case 'enter': {
        e.st -= dt;
        e.x = lerp(e.x, G.camX + VW * e.hover, 1 - Math.exp(-2.0 * dt));
        e.y = lerp(e.y, p.y - 20, 1 - Math.exp(-1.6 * dt));
        e.arm = lerp(e.arm, 0, dt * 2);
        if (e.st <= 0) { e.state = 'stalk'; e.st = rnd(1.2, 2.0); }
        AU.setRumble(0.3);
        break;
      }
      case 'stalk': {
        e.st -= dt;
        e.x = lerp(e.x, G.camX + VW * e.hover, 1 - Math.exp(-1.3 * dt));
        e.y = lerp(e.y, p.y + Math.sin(e.t * 0.8) * 110, 1 - Math.exp(-1.1 * dt));
        e.arm = lerp(e.arm, 0.06, dt * 2);
        e.whiplash = lerp(e.whiplash, Math.sin(e.t * 0.9) * 0.12, dt * 2);
        AU.setRumble(0.14);
        if (e.st <= 0) {
          const r = Math.random();
          if (r < 0.5) { e.state = 'whipWind'; e.st = rage ? 0.5 : 0.85; AU.alarm(); }
          else if (r < 0.8) { e.state = 'ink'; e.st = 0.7; }
          else { e.state = 'drift'; e.st = 1.4; }
        }
        break;
      }
      case 'whipWind': {
        e.st -= dt;
        e.x += 30 * dt;
        e.arm = lerp(e.arm, -0.16, dt * 5);
        e.whiplash = lerp(e.whiplash, 0, dt * 6);
        if (e.st <= 0) { e.state = 'whip'; e.st = rage ? 1.0 : 1.3; AU.boom(1.0); AU.setRumble(0.4); }
        break;
      }
      case 'whip': {
        e.st -= dt;
        e.arm = lerp(e.arm, 1, dt * 7);
        e.whiplash = Math.sin((1.3 - e.st) * (rage ? 9 : 7)) * 0.55;
        if (Math.random() < 0.9) bubbles(e.x + e.dir * 220, e.y + rnd(-140, 140), 2, 44, 1);
        if (e.st <= 0) { e.state = 'recover'; e.st = 1.0; }
        break;
      }
      case 'ink': {
        e.st -= dt;
        e.x -= 130 * dt;
        e.arm = lerp(e.arm, 0.5, dt * 3);
        if (e.st <= 0) {
          G.inkT = 2.6; AU.boom(1.2);
          for (let i = 0; i < 26; i++) {
            const a = rnd(0, TAU);
            part(e.x + e.dir * 90 + Math.cos(a) * rnd(0, 60), e.y + Math.sin(a) * rnd(0, 60),
                 Math.cos(a) * rnd(50, 260) - 120, Math.sin(a) * rnd(50, 260),
              { life:rnd(1.2, 2.6), max:2.6, size:rnd(30, 90), col:'rgba(3,5,11,0.75)', drag:1.4, kind:'ink' });
          }
          const base = Math.atan2(p.y - e.y, p.x - e.x);
          for (let i = 0; i < 5; i++) {
            const a = base + (i - 2) * 0.2;
            G.ebullets.push({ gid:nextGid(), x:e.x + e.dir * 90, y:e.y, vx:Math.cos(a) * 380, vy:Math.sin(a) * 380, r:10, dmg:10, life:3, a, kind:'barnacle' });
          }
          e.state = 'recover'; e.st = 1.0;
        }
        break;
      }
      case 'drift': {
        e.st -= dt;
        e.x -= 380 * dt;
        e.y += Math.sin(e.t * 2) * 90 * dt;
        e.arm = lerp(e.arm, 0.35, dt * 3);
        e.whiplash = Math.sin(e.t * 2.4) * 0.2;
        if (e.st <= 0) { e.state = 'recover'; e.st = 0.9; }
        break;
      }
      case 'recover': {
        e.st -= dt;
        e.arm = lerp(e.arm, 0.1, dt * 3);
        e.whiplash = lerp(e.whiplash, 0, dt * 3);
        e.x = lerp(e.x, G.camX + VW * e.hover, 1 - Math.exp(-1.4 * dt));
        e.y = lerp(e.y, p.y + Math.sin(e.t * 0.8) * 70, 1 - Math.exp(-1.2 * dt));
        if (e.st <= 0) { e.state = 'stalk'; e.st = rnd(0.8, 1.6) * (rage ? 0.62 : 1); }
        break;
      }
    }
    AU.setRumble(clamp(G.shake / 30 * 0.2 + 0.14, 0, 0.4));
  }

  function leviathanUpdate(e, dt, p){
    e.t += dt;
    const dirToP = Math.sign(p.x - e.x) || -1;
    e.dir = dirToP;

    switch (e.state) {
      case 'enter': {
        e.st -= dt;
        const tx = G.camX + VW * e.hover;
        const ty = p.y - 30;
        e.x = lerp(e.x, tx, 1 - Math.exp(-2.0 * dt));
        e.y = lerp(e.y, ty, 1 - Math.exp(-1.6 * dt));
        if (e.st <= 0) { e.state = 'stalk'; e.st = rnd(1.4, 2.4); }
        AU.setRumble(0.34);
        break;
      }
      case 'stalk': {
        e.st -= dt;
        const tx = G.camX + VW * e.hover;
        e.x = lerp(e.x, tx, 1 - Math.exp(-1.4 * dt));
        e.y = lerp(e.y, p.y + Math.sin(e.t * 0.7) * 90, 1 - Math.exp(-1.2 * dt));
        e.jaw = lerp(e.jaw, 0.06, dt * 3);
        AU.setRumble(0.16);
        if (e.st <= 0) {
          const r = Math.random();
          const rage = e.hp < e.maxHp * 0.45;
          if (r < (rage ? 0.55 : 0.42)) { e.state = 'lungeWind'; e.st = rage ? 0.55 : 0.85; AU.alarm(); }
          else if (r < 0.8) { e.state = 'spit'; e.st = 0.6; }
          else { e.state = 'sweepWind'; e.st = 0.7; AU.alarm(); }
        }
        break;
      }
      case 'lungeWind': {
        e.st -= dt;
        e.x += 40 * dt;
        e.jaw = lerp(e.jaw, 0.14, dt * 4);
        if (e.st <= 0) {
          e.state = 'lunge'; e.st = 1.25;
          const tx = p.x + 90, ty = p.y;
          const a = Math.atan2(ty - e.y, tx - e.x);
          e.lvx = Math.cos(a) * 900; e.lvy = Math.sin(a) * 900;
          e.jaw = 1; AU.boom(1.1); AU.setRumble(0.4);
        }
        break;
      }
      case 'lunge': {
        e.st -= dt;
        e.vx = e.lvx; e.vy = e.lvy;
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.lvx *= Math.exp(-1.5 * dt); e.lvy *= Math.exp(-1.5 * dt);
        e.jaw = lerp(e.jaw, 1, dt * 10);
        if (Math.random() < 0.9) bubbles(e.x + rnd(-60, 40), e.y + rnd(-90, 90), 2, 40, 1);
        if (e.st <= 0) { e.state = 'recover'; e.st = 0.85; }
        break;
      }
      case 'sweepWind': {
        e.st -= dt;
        e.y += (p.y - e.y) * Math.min(1, dt * 2.4);
        e.x += 30 * dt;
        e.jaw = lerp(e.jaw, 0.1, dt * 3);
        if (e.st <= 0) { e.state = 'sweep'; e.st = 1.5; AU.boom(0.9); AU.setRumble(0.4); }
        break;
      }
      case 'sweep': {
        e.st -= dt;
        e.x -= 1150 * dt;
        e.y += Math.sin(e.t * 3) * 60 * dt;
        e.jaw = lerp(e.jaw, 0.35, dt * 4);
        if (Math.random() < 0.9) bubbles(e.x + rnd(-60, 40), e.y + rnd(-90, 90), 2, 40, 1);
        if (e.st <= 0) { e.state = 'recover'; e.st = 1.1; }
        break;
      }
      case 'stagger': {
        /* v1.18.0: ミサイルで突進を止められた後の押し戻し→安全な復帰。
           lvx/lvy は 0（突進は止まった）。vx/vy で短く後退し、減衰して止まる。
           この間の接触ダメージは collide 側で無効。復帰後は通常の stalk へ。 */
        e.st -= dt;
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.vx *= Math.exp(-3.2 * dt); e.vy *= Math.exp(-3.2 * dt);
        e.jaw = lerp(e.jaw, 0.05, dt * 4);
        if (e.st <= 0) { e.state = 'recover'; e.st = 0.7; }
        break;
      }
      case 'spit': {
        e.st -= dt;
        e.jaw = lerp(e.jaw, 0.8, dt * 8);
        if (e.st <= 0) {
          const rage = e.hp < e.maxHp * 0.45;
          const n = rage ? 7 : 5;
          const base = Math.atan2(p.y - e.y, p.x - e.x);
          for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * 0.16;
            G.ebullets.push({ gid:nextGid(), x:e.x + Math.cos(a) * 90, y:e.y + Math.sin(a) * 90, vx:Math.cos(a) * 420, vy:Math.sin(a) * 420, r:11, dmg:11, life:3.2, a, kind:'barnacle' });
          }
          AU.boom(0.8);
          e.state = 'recover'; e.st = 1.0;
        }
        break;
      }
      case 'recover': {
        e.st -= dt;
        e.jaw = lerp(e.jaw, 0.05, dt * 3);
        e.x = lerp(e.x, G.camX + VW * e.hover, 1 - Math.exp(-1.6 * dt));
        e.y = lerp(e.y, p.y + Math.sin(e.t * 0.7) * 60, 1 - Math.exp(-1.4 * dt));
        if (e.st <= 0) { e.state = 'stalk'; e.st = rnd(0.9, 1.8) * (e.hp < e.maxHp * 0.45 ? 0.6 : 1); }
        break;
      }
    }
    AU.setRumble(clamp(G.shake / 30 * 0.2 + 0.14, 0, 0.4));
  }

  /* ------------------------------------------------------------------ *
   * 8. Collisions
   * ------------------------------------------------------------------ */
  /* 当たり判定。ボスは頭だけでなく体の芯に沿って円を並べる
     （頭の1点だけだと、でかい胴体を撃っても当たらず「無敵」に見えてしまう） */
  function enemyHit(e, x, y, r, projectile = false){
    /* v3.8.0(隔離試作): 巨蟹の体（殻の塊）は描いた輪郭に沿った楕円で判定する（透明な巨大円を使わない）。 */
    if (e.kind === 'geo_crab') return geoCrabBodyHit(e, x, y, r);
    if (e.kind === 'gravel_crab') return gravelCrabBodyHit(e, x, y, r);   // v3.9.2
    const body = projectile && fishBody[e.kind];
    if (body) {
      const dx = (x - enemyAimX(e)) / (body.length * 0.43 + r);
      const dy = (y - e.y) / (body.height * 0.82 + r);
      return dx * dx + dy * dy < 1;
    }
    if (e.kind === 'leviathan' || e.kind === 'squid') {
      /* 頭は「描いた頭」に沿った円で判定（頭の1点を中心にした巨大な透明円は使わない） */
      const flip = e.dir < 0 ? -1 : 1;
      for (const h of BOSS_HEAD[e.kind]) {
        const hx = e.x + flip * h[0];
        const hy = e.y + h[1];
        const hr = h[2] + r;
        if (d2(x, y, hx, hy) < hr * hr) return true;
      }
      /* 胴は背骨に沿って円を並べる（描画と同じ式） */
      const N = 12;
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        let prof, wig;
        if (e.kind === 'leviathan') {
          prof = leviathanProfile(u, e.H);
          wig  = Math.sin(u * 3.6 - e.t * 2.1) * e.L * 0.055 * Math.pow(u, 1.5);
        } else {
          prof = e.W * Math.pow(1 - u, 0.72) * (0.72 + 0.48 * Math.sin(u * Math.PI));
          wig  = Math.sin(u * 3.0 - e.t * 1.8) * e.W * 0.14 * Math.pow(u, 1.3);
        }
        const cx = e.x - e.dir * u * e.L;
        const cy = e.y + wig;
        const cr = Math.max(e.kind === 'leviathan' ? 42 : 46, prof * 0.90) + r;
        if (d2(x, y, cx, cy) < cr * cr) return true;
      }
      return false;
    }
    const rr = e.r + r;
    return d2(x, y, e.x, e.y) < rr * rr;
  }

  function projectileImpact(b){
    /* v1.11.0: 大型ミサイルは見た目の先端側に命中判定を合わせる（胴全体へ広げない）。 */
    const ahead = (b.kind === 'missile' && b.hitAhead) ? b.hitAhead : 0;
    const ax = ahead ? Math.cos(b.a || 0) * ahead : 0;
    const ay = ahead ? Math.sin(b.a || 0) * ahead : 0;
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - b.prevX, b.y - b.prevY) / 10));
    const trench = createTrench(trenchAnchor());   // v1.12.0: 海溝の地形（描画と同じ矩形）へ当たる
    for (let i = 0; i <= steps; i++){
      const x = lerp(b.prevX, b.x, i / steps) + ax;
      const y = lerp(b.prevY, b.y, i / steps) + ay;
      const enemy = G.enemies.find(e => !e.dead && enemyHit(e, x, y, b.r, true));
      if (enemy) return { x, y, enemy };
      if (G.rocks.some(r => d2(x, y, r.x, r.y) < (r.r + b.r) ** 2)) return { x, y, enemy:null };
      if (trench && trenchSegHit(trench, x, y, x, y, b.r)) return { x, y, enemy:null };
    }
    return null;
  }

  /* 攻撃元の安定 ID（gid が無い弾は座標から作る）。 */
  const foeKey = e => 'e' + (e.gid != null ? e.gid : (Math.round(e.x * 10) + ':' + Math.round(e.y * 10)));
  const shotKey = b => 'b' + (b.gid != null ? b.gid : (Math.round(b.x * 10) + ':' + Math.round(b.y * 10)));

  function collide(){
    const p = G.player;
    if (!p || !p.alive) return;
    /* 前フレームで見えなかった接触を justLatch から外す（離れた接触は再びジャストで取れる）。 */
    endBarrierFrame(p.barrier);

    /* player bullets → enemies */
    for (const b of G.bullets) {
      if (b.dead) continue;
      if (b.kind === 'reftorp') continue;            // v1.16.0: 反射魚雷の当たりは update 側で処理済み
      const hit = projectileImpact(b);
      if (!hit) continue;
      const { x, y, enemy } = hit;
      b.dead = true;
      /* v1.7.0: ミサイルの着弾は爆発・吹き飛ばしを専用処理に任せる（直撃/地形で一貫） */
      if (b.kind === 'missile') {
        missileBlast(b, x, y, enemy);
        continue;
      }
      if (enemy) {
        /* v3.9.2(隔離試作): 巨蟹は着弾点で「殻/露出関節」を判定し、装甲を通した実ダメージにする。 */
        const crab = enemy.kind === 'geo_crab';
        const gravel = enemy.kind === 'gravel_crab';   // v3.9.2
        /* v3.9.3: 礫鎧ガニは面で効きが変わる（正面=かばわれて僅少 / 横・背後=露出関節 / 振り直後=隙）。 */
        const zc = crab ? (geoCrabHitZone(enemy, x, y) || 'body')
                        : (gravel ? (gravelCrabHitZone(enemy, x, y) || 'body') : null);
        const grounded = crab || gravel;
        const knockback = (isBoss(enemy) || grounded) ? 0 : 90;
        const eff = crab ? geoCrabDamage(enemy, b.dmg, zc) : b.dmg;
        damageEnemy(enemy, b.dmg, Math.cos(b.a) * knockback, Math.sin(b.a) * knockback, zc);
        if (crab) crabImpactFeedback(enemy, x, y, b.a, eff, zc);
        G.impacts.push({ x, y, life:0.26 });
        for (const other of G.enemies) {
          if (other !== enemy && !other.dead && enemyHit(other, x, y, b.aoe, true)) {
            damageEnemy(other, b.dmg * 0.7, 0, 0, (other.kind === 'geo_crab' || other.kind === 'gravel_crab') ? 'body' : null);
          }
        }
      }
      explode(x, y, b.aoe, b.aoe / 42);
      AU.boom(b.aoe / 60, b.impactSound || b.style);
    }

    /* enemies → player（瞬間バリアが稼働していれば吸収する。岩・被弾無敵とは別） */
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.kind === 'anemone') continue;         // v3.8.0: 煤冠イソギンチャクは接触ではなく flare の触手だけで判定
      if (e.state === 'stagger') continue;        // v1.18.0: 押し戻し中はその突進の接触ダメージを無効
      /* v3.8.0(隔離試作): 巨蟹の体は岩。接触では傷つかない（上・後ろを通過できる）。
         脅威は「見えている近側前脚の一振り」だけ＝振り中かつ脚の範囲にいるときだけ。 */
      if (e.kind === 'geo_crab') {
        if (!e.swingHit && geoCrabLegTouch(e, p.x, p.y, p.r)) {
          e.swingHit = true;
          tryGuard(foeKey(e), e.dmg, e.x, e.y);
        }
        continue;
      }
      /* v3.9.2(隔離試作): 礫鎧ガニの体は無害。見えている近側の鋏の一振りだけが当たる。 */
      if (e.kind === 'gravel_crab') {
        if (!e.swingHit && gravelCrabClawTouch(e, p.x, p.y, p.r)) {
          e.swingHit = true;
          tryGuard(foeKey(e), e.dmg, e.x, e.y);
        }
        continue;
      }
      if (enemyHit(e, p.x, p.y, p.r)) {
        tryGuard(foeKey(e), e.dmg, e.x, e.y);
        continue;
      }
      /* 巨大イカ：攻撃中（whip）だけ、描いている長い触腕と同じ線がダメージ判定 */
      if (e.kind === 'squid' && e.state === 'whip') {
        if (squidWhipTouch(e, p.x, p.y, p.r)) tryGuard(foeKey(e), e.dmg, e.x, e.y);
      }
    }
    /* rocks → player（地形はバリアですり抜けない＝バリア対象外。従来どおり船体へ） */
    for (const r of G.rocks) {
      if (d2(r.x, r.y, p.x, p.y) < (r.r + p.r) * (r.r + p.r)) {
        const a = Math.atan2(p.y - r.y, p.x - r.x);
        p.vx += Math.cos(a) * 260; p.vy += Math.sin(a) * 260;
        hurtPlayer(9, r.x, r.y);
      }
    }
    /* enemy bullets → player（弾もバリアで受けられる） */
    for (const b of G.ebullets) {
      if (d2(b.x, b.y, p.x, p.y) < (b.r + p.r) * (b.r + p.r)) {
        tryGuard(shotKey(b), b.dmg, b.x, b.y);
        explode(b.x, b.y, 26, 0.5);
        b.dead = true;
      }
    }
    /* pickups */
    for (const k of G.pickups) {
      if (d2(k.x, k.y, p.x, p.y) < (k.r + p.r + 24) * (k.r + p.r + 24)) {
        k.dead = true; AU.pick();
        if (k.kind === 'missile') {
          /* v1.17.0: 補給は実際の増加量だけを示す（上限や残量で端数になる）。 */
          const before = p.missiles;
          p.missiles = Math.min(p.maxMissiles, p.missiles + 3);
          const inc = p.missiles - before;
          if (inc > 0) floatText(k.x, k.y, 'ミサイル +' + inc, '#ffc978', 22);
        }
        else if (k.kind === 'salvage') pickupSalvage(k);
        else healPlayer(24);
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * 9. World generation
   * ------------------------------------------------------------------ */
  function generateTo(x){
    while (G.genX < x) {
      const cx = G.genX;
      G.genX += 460;
      const d = 1 + G.dist / 26000;
      /* v1.12.0: 海溝の区間には自動生成（尖塔・岩・ヤドカリ）を置かない（固定地形の邪魔をしない）。 */
      const inT = inTrenchRegion(cx, createTrench(trenchAnchor()));

      /* background spires (parallax, non-solid) */
      if (!inT && srnd() < 0.55) {
        G.spires.push({
          x:cx + srnd() * 400, y:G.camY + VH * (0.4 + srnd() * 0.9),
          w:rnd(120, 460) * (0.6 + d * 0.2), h:rnd(200, 700),
          lay:0.55, a:0.5
        });
      }

      /* mid rocks (solid) */
      if (!inT && cx > 1500 && srnd() < 0.34 + d * 0.05) {
        const fromFloor = srnd() < 0.5;
        const r = rnd(60, 130);
        G.rocks.push({
          x:cx + srnd() * 400,
          y:fromFloor ? FLOOR_Y - rnd(0, 90) : rnd(0, 120),
          r, seed:rint(0, 9999), fromFloor
        });
      }

      /* 沈没戦車に擬態したヤドカリ。海底に沿って配置する。 */
      if (!inT && G.state === 'play' && cx >= 1840 && cx % 1840 === 0) {
        const x = cx + 230;
        spawnEnemy('hermit', x, seaFloorY(x));
      }

      /* 遠景のエイ。視差レイヤー上に置く。 */
      if (srnd() < 0.05 && G.silh.length < 2 && G.camY > 600) {
        G.silh.push({
          x:G.camX * RAY_PARALLAX + VW + rnd(260, 520),
          y:G.camY * RAY_PARALLAX + VH * rnd(0.24, 0.76),
          width:rnd(350, 520), height:rnd(100, 160), sp:-rnd(18, 55), t:rnd(0, 9)
        });
      }
    }

    /* boss trigger */
    if (G.player && G.player.x > G.nextBossAt && !G.boss && G.state === 'play') {
      const isSquid = G.bossKills % 2 === 1;
      const b = spawnEnemy(isSquid ? 'squid' : 'leviathan', G.player.x + VW * 1.35, G.player.y - 40);
      b.state = 'enter'; b.st = 2.4;
      G.warnMsg = isSquid ? '⚠ 巨大反応接近 — 触腕に警戒せよ' : '⚠ 巨大反応接近 — 総員戦闘配置';
      G.warnT = 3.2;
      AU.alarm(); AU.setRumble(0.35);
    }
  }

  /* ---- enemy wave spawner (screen-relative so foes actually show up) ---- */
  function spawnWave(){
    const p = G.player;
    if (!p || !p.alive) return;
    const d = 1 + G.dist / 26000;
    const deep = clamp((p.y - 300) / 2000, 0, 1);
    const yA = clamp(G.camY + 100, 90, FLOOR_Y - 100);
    const yB = clamp(G.camY + VH - 100, 140, FLOOR_Y - 70);
    const ry = () => rnd(Math.min(yA, yB), Math.max(yA, yB));
    const ex = () => G.camX + VW + rnd(70, 380);
    const warm = G.dist < 2400;
    const r = Math.random();
    const cap = G.enemies.length;

    if (cap < 90) {
      if (warm) {
        if (r < 0.6) {
          const cy = ry();
          for (let i = 0, k = rint(5, 10); i < k; i++) spawnEnemy('minnow', ex() + i * 36, cy + rnd(-70, 70));
        } else {
          spawnEnemy('hunter', ex(), ry());
        }
        return;
      }
      if (r < 0.22) {
        const cy = ry();
        for (let i = 0, k = rint(6, 13); i < k; i++) spawnEnemy('minnow', ex() + i * 36, cy + rnd(-80, 80));
      } else if (r < 0.22 + 0.24 * (0.5 + d * 0.5)) {
        for (let i = 0, k = rint(1, 2 + Math.round(d * 0.4)); i < k; i++) spawnEnemy('hunter', ex(), ry());
      } else if (r < 0.66) {
        const cy = ry();
        for (let i = 0, k = rint(1, 3); i < k; i++) spawnEnemy('jelly', ex(), cy + rnd(-90, 90));
      } else if (r < 0.66 + 0.17 * (0.35 + deep)) {
        spawnEnemy(deep > 0.35 && Math.random() < 0.55 ? 'gunner' : 'angler', ex() + 120, ry());
      } else if (r < 0.94) {
        for (let i = 0, k = rint(1, 3); i < k; i++) spawnEnemy('mine', ex(), ry());
      } else {
        spawnEnemy('hunter', ex(), ry());
        spawnEnemy('jelly', ex(), ry());
        spawnEnemy('mine', ex(), ry());
      }
    }
  }

  /* ---- 沈んだ古代都市の遺跡（背景・視差0.78） ---- */
  const RUIN_PAR = 0.78;
  function generateRuins(){
    const px0 = G.camX * RUIN_PAR;
    let guard = 0;
    while (G.genRuinX < px0 + VW + 900 && guard++ < 40) {
      const x = G.genRuinX;
      G.genRuinX += rnd(340, 720);
      if (Math.random() < 0.18) continue;
      const y = clamp(G.camY + VH * rnd(0.5, 1.3), 320, FLOOR_Y - 60);
      G.ruins.push({
        x, y,
        type: pick(['pillar','pillar','arch','block','temple','pillar']),
        w: rnd(100, 260), h: rnd(200, 620),
        a: rnd(0.38, 0.64), seed: rint(0, 9999), tilt: rnd(-0.05, 0.05)
      });
    }
    G.ruins = G.ruins.filter(r => r.x > px0 - 1100);
  }
  function drawRuins(camX, camY){
    ctx.save();
    ctx.translate(-camX * RUIN_PAR, -camY);
    ctx.lineJoin = 'round';
    for (const r of G.ruins) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.tilt);
      ctx.globalAlpha = r.a;
      ctx.fillStyle = '#04101a';
      ctx.strokeStyle = 'rgba(125,190,225,0.22)';
      ctx.lineWidth = 2;
      const w = r.w, h = r.h;
      if (r.type === 'pillar') {
        const cw = w * 0.34;
        ctx.beginPath();
        ctx.moveTo(-cw / 2, 0);
        ctx.lineTo(-cw / 2, -h);
        ctx.lineTo(-cw * 0.18, -h - h * 0.09);
        ctx.lineTo(cw * 0.12, -h + h * 0.04);
        ctx.lineTo(cw / 2, -h - h * 0.05);
        ctx.lineTo(cw / 2, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillRect(-cw * 0.8, -14, cw * 1.6, 16);
        ctx.strokeRect(-cw * 0.8, -14, cw * 1.6, 16);
      } else if (r.type === 'arch') {
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0);
        ctx.lineTo(-w / 2, -h);
        ctx.lineTo(w / 2, -h);
        ctx.lineTo(w / 2, 0);
        ctx.lineTo(w * 0.27, 0);
        ctx.lineTo(w * 0.27, -h * 0.6);
        ctx.arc(0, -h * 0.6, w * 0.27, 0, Math.PI, true);
        ctx.lineTo(-w * 0.27, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h); ctx.lineTo(w / 2, -h * 0.93); ctx.lineTo(w / 2, -h * 0.99); ctx.lineTo(-w / 2, -h * 1.06);
        ctx.closePath(); ctx.fill();
      } else if (r.type === 'block') {
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0);
        ctx.lineTo(-w / 2, -h);
        ctx.lineTo(w * 0.24, -h * 1.07);
        ctx.lineTo(w / 2, -h * 0.88);
        ctx.lineTo(w / 2, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.globalAlpha = r.a * 0.7;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath(); ctx.moveTo(-w / 2, -h * i / 4); ctx.lineTo(w / 2, -h * i / 4); ctx.stroke();
        }
      } else {
        /* temple（階段状の基壇） */
        const steps = 4;
        for (let i = 0; i < steps; i++) {
          const ww = w * (1 - i * 0.19), hh = h / steps;
          ctx.fillRect(-ww / 2, -hh * (i + 1), ww, hh * 1.03);
          ctx.strokeRect(-ww / 2, -hh * (i + 1), ww, hh * 1.03);
        }
        const tw = w * 0.28;
        ctx.fillRect(-tw / 2, -h - h * 0.22, tw, h * 0.22);
        ctx.strokeRect(-tw / 2, -h - h * 0.22, tw, h * 0.22);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function cull(){
    const left = G.camX - 1400, right = G.camX + VW + 2600;
    /* v3.7.0: B亜種ヤドカリは世界固定の1遭遇。カメラの追従遅れや往復で消えないようカリング対象外にする
       （演出のみ・1体。撃破後は敵配列から外れる）。
       v3.8.0(隔離試作): 巨蟹は撃破直後だけ崩壊を見せるため残す（deadT>0 の間）。 */
    G.enemies = G.enemies.filter(e =>
      (!e.dead || ((e.kind === 'geo_crab' || e.kind === 'gravel_crab') && (e.deadT || 0) > 0))
      && (e.kind === 'hermitB' || e.kind === 'gravel_crab' || (e.x > left && (isBoss(e) ? e.x < right + 3000 : e.x < right))));
    G.bullets = G.bullets.filter(b => !b.dead && b.life > 0 && b.x > left - 400 && b.x < right + 1200);
    G.ebullets = G.ebullets.filter(b => !b.dead && b.life > 0 && b.x > left - 400 && b.x < right + 1200);
    G.pickups = G.pickups.filter(k => !k.dead && k.life > 0 && k.x > left);
    G.rocks = G.rocks.filter(r => r.x > left - 600);
    G.spires = G.spires.filter(s => s.x > G.camX - 2200);
    const rayLeft = G.camX * RAY_PARALLAX;
    G.silh = G.silh.filter(s => s.x > rayLeft - 800 && s.x < rayLeft + VW + 1200);
  }

  /* ------------------------------------------------------------------ *
   * 10. Update loop
   * ------------------------------------------------------------------ */
  function update(dt){
    G.time += dt;
    /* v2.1.0: 潜航ズームは描画専用。目標へ滑らかに寄せる（シミュレーションには触れない）。 */
    stepDiveZoom(dt);
    G.flash = Math.max(0, G.flash - dt * 2.4);
    G.hurtFlash = Math.max(0, G.hurtFlash - dt * 2.6);
    G.inkT = Math.max(0, G.inkT - dt);
    G.warnT = Math.max(0, G.warnT - dt);
    G.comboT = Math.max(0, G.comboT - dt);
    if (G.comboT <= 0) G.combo = 0;

    /* v1.19.0: 冒頭ストーリー中は潜航シミュレーションを止め、導入の時間だけ進める。
       完了/スキップ後は onFinish が G.state を 'title' へ戻す。 */
    if (G.state === 'intro') { intro.update(dt); return; }

    if (G.state === 'play') {
      playerUpdate(dt);
      /* v2.1.0(試作): 照明弾。一押しで 1 発・弾数無制限・非攻撃。
         照準に関係なく「艇の前方斜め上」へ出る（弾道＝上がって頂点を越え、ゆっくり沈む）。 */
      const flareWanted = Input.wantFlare; Input.wantFlare = false;
      const fp = G.player;
      if (flareWanted && fp && fp.alive) {
        const f = fireFlare(flareState, { x: fp.x + 40, y: fp.y - 6 });
        if (f) AU.flare();
      }
      updateDiscoveries();   // v2.2.0: 近づいた拠点・遺跡を発見記録へ（専用キー・有界）
      ensureGeoCrab();       // v3.8.0(隔離試作): 合流広間に 1 遭遇だけ巨蟹を置く
      ensureGravelCrabs();   // v3.9.2(隔離試作): 礫鎧ガニ A/B/C を離して置く
      /* weapons */
      for (const b of G.bullets) {
        b.life -= dt;
        b.age = (b.age || 0) + dt;
        const keepPath = b.homeDelay && b.age < b.homeDelay;   // v1.15.0+: 多連は発射直後の進路を保つ
        if (b.kind === 'missile') {
          const t = lockTarget();
          if (t && (!b.target || b.target.dead)) b.target = t;
          const igniteAt = b.igniteDelay ?? 0.18;

          if (!b.ignited) {
            /* Phase 1: 射出直後の「その場タメ」— ゆっくり減速しながら僅かに沈み、標的へ鼻先を向ける */
            b.speed = Math.max(32, b.speed * Math.exp(-5.5 * dt));
            b.vx = Math.cos(b.a) * b.speed;
            b.vy = Math.sin(b.a) * b.speed + 26;
            b.burner = 0.06;
            b.smoke -= dt;
            if (b.smoke <= 0) {
              b.smoke = 0.04;
              part(b.x - Math.cos(b.a) * 18, b.y - Math.sin(b.a) * 18, rnd(-18, 18), rnd(-24, 6),
                { life:rnd(0.25, 0.5), max:0.5, size:rnd(2, 4.5), col:'rgba(185,232,250,0.65)', drag:1.5, kind:'bubble' });
            }
            if (b.age >= igniteAt) {
              /* Phase 2: その場で点火！フラッシュ＋衝撃輪＋白煙バースト＋点火音 */
              b.ignited = true;
              b.burner = 0.35;
              const tx = b.x - Math.cos(b.a) * 24 * (b.vscale || 1);
              const ty = b.y - Math.sin(b.a) * 24 * (b.vscale || 1);
              const isCyan = (b.projectile === 'finned' || b.projectile === 'sleek');
              G.lights.push({ x: tx, y: ty, r: 95, life: 0.14, max: 0.14, col: isCyan ? '#9ef4ff' : '#ffe49e' });
              G.rings.push({ x: tx, y: ty, r: 4, speed: 180, life: 0.18, max: 0.18, col: isCyan ? 'rgba(130,240,255,0.65)' : 'rgba(255,210,120,0.65)', w: 3 });
              for (let k = 0; k < 9; k++) {
                const sa = b.a + Math.PI + rnd(-0.65, 0.65);
                const sp = rnd(90, 260);
                part(tx, ty, Math.cos(sa) * sp, Math.sin(sa) * sp,
                  { life: rnd(0.14, 0.32), max: 0.32, size: rnd(2.2, 4.8), col: isCyan ? '#9ef6ff' : '#ffd26a', drag: 3.4, glow: 1, kind: 'spark' });
              }
              for (let k = 0; k < 5; k++) {
                const sa = b.a + Math.PI + rnd(-0.5, 0.5);
                part(tx, ty, Math.cos(sa) * rnd(30, 90), Math.sin(sa) * rnd(30, 90),
                  { life: rnd(0.35, 0.7), max: 0.7, size: rnd(7, 14), col: 'rgba(220,235,245,0.52)', drag: 2.2, kind: 'smoke' });
              }
              AU.mIgnite(b.launchSound || b.projectile);
            }
          } else {
            /* Phase 3: アフターバーナーが伸びて一気に急加速！ */
            b.burner = Math.min(1.15, (b.burner || 0.35) + dt * 5.8);
            if (!keepPath && b.target && !b.target.dead) {
              const want = Math.atan2(b.target.y - b.y, enemyAimX(b.target) - b.x);
              b.a += angNorm(want - b.a) * Math.min(1, dt * (b.turn * 1.15));
            }
            const maxSpd = b.maxSpeed || 1080;
            b.speed = Math.min(maxSpd, b.speed + (b.accel || 1850) * dt);
            b.vx = Math.cos(b.a) * b.speed;
            b.vy = Math.sin(b.a) * b.speed;
            b.smoke -= dt;
            if (b.smoke <= 0) {
              b.smoke = 0.014;
              const backX = b.x - Math.cos(b.a) * 28 * (b.vscale || 1);
              const backY = b.y - Math.sin(b.a) * 28 * (b.vscale || 1);
              const isCyan = (b.projectile === 'finned' || b.projectile === 'sleek');
              part(backX, backY, rnd(-18, 18), rnd(-18, 18),
                { life:rnd(0.35, 0.85), max:0.85, size:rnd(5, 11), col:'rgba(210,224,238,0.45)', drag:1.5, kind:'smoke' });
              part(backX, backY, -Math.cos(b.a) * rnd(80, 180) + rnd(-24, 24), -Math.sin(b.a) * rnd(80, 180) + rnd(-24, 24),
                { life:0.18, max:0.18, size:rnd(2.8, 5.2), col: isCyan ? '#98f2ff' : '#ffcf6e', glow:1, kind:'spark' });
            }
          }
        } else if (b.kind === 'reftorp') {
          /* v1.16.0: 反射魚雷。1 フレーム進め、壁で 1 回だけ跳ねる（速さ保存・寿命は延長しない）。
             敵/地形へ当たれば着弾（爆風は既存の aoe 判定に任せる）。 */
          const rr = advanceProjectile({ x:b.x, y:b.y, vx:b.vx, vy:b.vy, life:1, reflected:b.reflected, dead:false }, dt,
            { solids: worldGeometry(), targets: enemyTargets(), maxReflect: b.maxReflect });
          b.x = rr.p.x; b.y = rr.p.y; b.vx = rr.p.vx; b.vy = rr.p.vy;
          b.reflected = rr.p.reflected; b.a = Math.atan2(b.vy, b.vx);
          const lastHit = rr.hits.length ? rr.hits[rr.hits.length - 1] : null;
          if (rr.p.dead){
            b.dead = true;
            const targetEnemy = (lastHit && lastHit.ref) ? (lastHit.ref.ref || lastHit.ref) : null;
            if (lastHit && lastHit.kind === 'target' && targetEnemy && !targetEnemy.dead){
              const kbe = isBoss(targetEnemy) ? 0 : 70;
              damageEnemy(targetEnemy, b.dmg, Math.cos(b.a) * kbe, Math.sin(b.a) * kbe);
              for (const other of G.enemies){
                if (other !== targetEnemy && !other.dead && enemyHit(other, b.x, b.y, b.aoe, true)) damageEnemy(other, b.dmg * 0.7, 0, 0);
              }
            }
            G.impacts.push({ x:b.x, y:b.y, life:0.26 });
            explode(b.x, b.y, b.aoe, b.aoe / 42);
            AU.boom(b.aoe / 60, b.impactSound);
          }
          b.trail -= dt;
          if (b.trail <= 0){
            b.trail = 0.03;
            part(b.x, b.y, rnd(-8, 8), rnd(-8, 8), { life:rnd(0.12, 0.4), max:0.4, size:rnd(2, 4), col:'rgba(255,220,150,0.7)', glow:0.7, kind:'bubble' });
          }
        } else {
          /* v1.7.0: 魚雷の弱い誘導。発射時に選んだ1つの標的へ、前方コーン内だけ
             弱い角速度で寄る。標的が死んだ/背後へ回ったら補正しない。
             v1.15.0+: 多連は発射直後（homeDelay の間）は向きを保つ＝すぐ束にならない。 */
          const tg = b.target;
          if (!keepPath && tg && !tg.dead) {
            const want = Math.atan2(tg.y - b.y, enemyAimX(tg) - b.x);
            const off = angNorm(want - b.a);
            if (Math.abs(off) <= TORP_MAX_OFF) {
              const sp = Math.hypot(b.vx, b.vy) || 900;
              b.a += clamp(off, -TORP_TURN * dt, TORP_TURN * dt);
              b.vx = Math.cos(b.a) * sp; b.vy = Math.sin(b.a) * sp;   // a と vx/vy を揃える
            }
          }
          b.vx += Math.cos(b.a) * 90 * dt; b.vy += Math.sin(b.a) * 90 * dt;
          b.trail -= dt;
          if (b.trail <= 0) {
            b.trail = 0.028;
            const perp = b.a + Math.PI / 2, off = rnd(-5, 5);
            part(b.x + Math.cos(perp) * off, b.y + Math.sin(perp) * off,
                 Math.cos(perp) * off * 6 + rnd(-9, 9), Math.sin(perp) * off * 6 + rnd(-9, 9),
                 { life:rnd(0.12, 0.42), max:0.42, size:rnd(1.2, 3.8), col:'rgba(236,244,255,0.72)', glow:0.5, kind:'bubble' });
          }
        }
        b.prevX = b.x; b.prevY = b.y;
        if (b.kind !== 'reftorp') {
          b.x += b.vx * dt; b.y += b.vy * dt;
        }
      }
      for (const e of G.ebullets) {
        /* v3.9.4: 礫鎧ガニの遠距離弾（泡は寿命/地形で破裂、岩は床/壁で止まり砕ける）。 */
        if (e.kind === 'bubble' || e.kind === 'rock') {
          e.floorY = gravelFloorYAt(e.x, e.y);
          const sev = stepGravelShot(e, dt, { blocked: gravelShotBlocked });
          for (const t of sev) {
            if (t === 'burst') {
              for (let i = 0; i < 6; i++) part(e.x, e.y, rnd(-70, 70), rnd(-70, 20),
                { life:rnd(0.2, 0.5), max:0.5, size:rnd(2, 5), col:'rgba(200,235,255,0.7)', drag:2.2, kind:'bubble' });
            } else if (t === 'shatter') {
              AU.boom(0.8); G.shake = Math.max(G.shake, 5);
              explode(e.x, e.y, 34, 0.7);
              for (let i = 0; i < 10; i++) part(e.x, e.y, rnd(-160, 160), rnd(-190, -20),
                { life:rnd(0.4, 0.9), max:0.9, size:rnd(2, 5), col:'rgba(150,140,130,0.85)', drag:2.0 });
            }
          }
          if (e.kind === 'bubble' && Math.random() < 0.22)
            part(e.x, e.y, rnd(-8, 8), rnd(-16, -4), { life:rnd(0.3, 0.7), max:0.7, size:rnd(1.5, 3), col:'rgba(190,225,255,0.5)', glow:0.4, kind:'bubble' });
          continue;
        }
        e.life -= dt;
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (Math.random() < 0.4) part(e.x, e.y, rnd(-10, 10), rnd(-10, 10), { life:rnd(0.2, 0.5), max:0.5, size:rnd(2, 4), col:'rgba(190,140,255,0.6)', glow:0.7 });
      }
      for (const e of G.enemies) enemyUpdate(e, dt);
      for (const k of G.pickups) {
        k.t += dt; k.life -= dt;
        k.vx *= Math.exp(-1.2 * dt); k.vy = k.vy * Math.exp(-1.2 * dt) - 6 * dt;
        k.x += k.vx * dt; k.y += k.vy * dt;
      }
      collide();
      /* v1.16.0: 全自動近接。潜航中のみ・生きた敵へ射程内かつ遮蔽なしのときだけ作動する（専用ボタン無し）。 */
      updateMelee(dt);
      maybeSpawnAnemone(G.player);             // v3.8.0: 熱水・火山帯の固定型を 1 遭遇だけ出す
      generateTo(visibleWorld().x1 + 1200);   // v2.1.0: ズームで広がった見える範囲の先まで地形を先読み
      generateRuins();

      /* v3.7.0(隔離試作): B亜種ヤドカリ（中型）を1遭遇だけ世界の固定地点へ。既存の戦車ヤドカリは消さず共存。
         海溝下の洞窟分岐を降りた先＝合流広場の実床（深棚下の深床）。プレイヤーが分岐帯へ入った
         時点で 1 度だけ配置（遠方カリングで即消えない範囲で出す）。撃破/離脱後は再配置しない。 */
      if (!G.hermitBSeeded && deepUnlocked() && G.player){
        const t = createTrench(trenchAnchor());
        if (t){
          const bx = clamp((t.caveX0 + t.caveX1) * 0.5, t.hallX0 + 240, t.hallX1 - 240);
          if (G.player.y > t.floorY - 150 && Math.abs(G.player.x - bx) < 1900){
            G.hermitBSeeded = true;
            spawnEnemy('hermitB', bx, hermitBFloorY(bx));
          }
        }
      }

      /* 敵の湧き（画面右端基準・時間ベース） */
      G.spawnT -= dt;
      if (G.spawnT <= 0) {
        G.spawnT = rnd(0.8, 1.9) / (0.75 + G.dist / 34000) * earlySpawnMul();   // v1.17.0: 序盤は出現を絞る
        spawnWave();
      }
    }

    /* effects always tick */
    for (const q of G.parts) {
      if (q.kind === 'husk') continue;      /* v3.7.0: 撃破破片は pose-debris の共通ルールで動かす */
      q.life -= dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.vy += q.grav * dt;
      const dr = Math.exp(-(q.drag || 0) * dt);
      q.vx *= dr; q.vy *= dr;
      if (q.kind === 'bubble') q.vy -= 42 * dt;
      if (q.kind === 'smoke' || q.kind === 'ink') q.size += 12 * dt;
      q.rot += q.vr * dt;
    }
    if (G.parts.length > 700) G.parts.splice(0, G.parts.length - 700);
    G.parts = G.parts.filter(q => q.life > 0);
    /* v3.7.0: 撃破破片（husk）は敵汎用 pose-debris モジュールが積分する。
       0 フレームは描画と同じ姿勢のまま、その後だけ重さと慣性で動く。 */
    {
      const husks = [];
      G.parts = G.parts.filter(q => (q.kind === 'husk' ? (husks.push(q), false) : true));
      PD.step(husks, dt, {});
      for (const h of husks) G.parts.push(h);
    }

    for (const r of G.rings) {
      r.life -= dt;
      if (r.toR !== undefined && r.toR !== null){
        /* v1.12.0: 主リングは実半径 r.toR へ到達（爆風範囲の改造だけが到達距離を変える）。 */
        r.r = (r.r0 || 0) + (r.toR - (r.r0 || 0)) * (1 - Math.max(0, r.life) / r.max);
      } else {
        r.r += r.speed * dt; r.speed *= Math.exp(-2.6 * dt);
      }
    }
    G.rings = G.rings.filter(r => r.life > 0);
    for (const l of G.lights) l.life -= dt;
    G.lights = G.lights.filter(l => l.life > 0);
    /* v2.1.0(試作): 照明弾の寿命・弾道・接触を進める（潜航外でも寿命は尽きる）。 */
    tickFlares(flareState, dt, flareEnv());
    for (const f of G.floats) { f.life -= dt; f.y += f.vy * dt; f.vy *= Math.exp(-1.6 * dt); }
    G.floats = G.floats.filter(f => f.life > 0);
    for (const hit of G.impacts) hit.life -= dt;
    G.impacts = G.impacts.filter(hit => hit.life > 0);
    /* v1.16.0: 追加兵装のレーザー経路（描画用）は短くフェードして消える。 */
    for (const bm of G.beams) bm.life -= dt;
    G.beams = G.beams.filter(bm => bm.life > 0);

    for (const s of G.silh) {
      s.t += dt;
      s.x += s.sp * dt;
      s.y += Math.sin(s.t * 0.35) * 14 * dt;
    }

    /* camera */
    const p = G.player;
    if (p) {
      const tx = Math.max(0, p.x - 430);
      /* v1.12.0: 海溝の中では深くまで追従する（開口の内側だけ床が下がる）。 */
      const ty = clamp(p.y - VH * 0.5, 0, trenchFloorYAt(p.x, createTrench(trenchAnchor()), p.y) - VH);
      G.camX = lerp(G.camX, tx, 1 - Math.exp(-6 * dt));
      G.camY = lerp(G.camY, ty, 1 - Math.exp(-4.5 * dt));
      G.dist = p.x;
    }
    G.shake *= Math.exp(-6.5 * dt);
    G.shakeX = rnd(-1, 1) * G.shake;
    G.shakeY = rnd(-1, 1) * G.shake;
    cull(); // 撃破済みの敵と寿命切れの弾を、描画前に取り除く。
    if (G.state === 'dead') G.deathT += dt;
  }

  /* ------------------------------------------------------------------ *
   * 11. Drawing primitives
   * ------------------------------------------------------------------ */
  function fishPath(g, L, H, t){
    const segs = 20, top = [], bot = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const hp = Math.sin(Math.pow(u, 0.72) * Math.PI) * H * (1 - u * 0.28);
      const wig = Math.sin(u * 4.4 - t * 3.2) * L * 0.045 * Math.pow(u, 1.8);
      top.push([-u * L, wig - hp]);
      bot.push([-u * L, wig + hp]);
    }
    g.beginPath();
    g.moveTo(top[0][0], top[0][1]);
    for (let i = 1; i <= segs; i++) g.lineTo(top[i][0], top[i][1]);
    for (let i = segs; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]);
    g.closePath();
    return { top, bot, segs };
  }
  function drawFish(g, e){
    const { length:L, height:H } = fishBody[e.kind];
    g.save();
    g.translate(e.x, e.y);
    g.scale(e.dir < 0 ? -1 : 1, 1);
    const art = fishArt[e.kind];
    if (art && ready(art)) {
      const frame = Math.floor(e.t * 3.2 / TAU * 8) % 8;
      const row = e.kind === 'angler' ? Math.round(clamp(e.jaw, 0, 1) * 3) : 0;
      if (e.flash > 0) g.filter = 'brightness(2.8) saturate(0.35)';
      g.drawImage(art, frame * 368, row * 304, 368, 304, -168, -76, 184, 152);
      if (e.flash > 0) g.filter = 'none';
    } else {
    const body = e.flash > 0 ? '#ffffff' : '#382636';
    const belly = e.flash > 0 ? '#ffffff' : '#655065';

    /* tail + dorsal fin */
    g.fillStyle = '#492b3f';
    g.beginPath();
    g.moveTo(-L + 4, 0);
    g.lineTo(-L - 34, -H * 1.35);
    g.lineTo(-L - 12, 0);
    g.lineTo(-L - 34, H * 1.3);
    g.closePath(); g.fill();
    g.beginPath();
    for (let i = 0; i < 3; i++) {
      const x = -L * (0.76 - i * 0.2);
      g.moveTo(x - L * 0.12, -H * 0.49);
      g.lineTo(x - L * 0.2, -H * (1.3 + i * 0.17));
      g.lineTo(x + L * 0.12, -H * 0.65);
      g.closePath();
    }
    g.fill();
    g.strokeStyle = '#ab666e'; g.lineWidth = 2; g.stroke();

    const p = fishPath(g, L, H, e.t);
    g.fillStyle = body; g.fill();
    g.save(); g.clip();
    g.fillStyle = belly;
    g.beginPath(); g.moveTo(0, 2); g.lineTo(-L, H * 1.4); g.lineTo(-L, H * 2.4); g.lineTo(0, 8); g.closePath(); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(120,190,215,0.35)'; g.lineWidth = 1.6;
    g.beginPath();
    for (let i = 0; i <= 20; i++) { const q = p.top[i]; i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
    g.stroke();

    if (e.kind === 'angler') {
      /* teeth */
      g.fillStyle = '#e8f4ff';
      for (let i = 0; i < 5; i++) {
        const x = -6 - i * 11;
        g.beginPath(); g.moveTo(x, H * 0.28 + e.jaw * 6); g.lineTo(x - 5, H * 0.9 + e.jaw * 22); g.lineTo(x + 4, H * 0.9 + e.jaw * 22); g.closePath(); g.fill();
      }
      /* eye */
      g.fillStyle = '#0a1a22'; g.beginPath(); g.arc(-70, -H * 0.4, 8.5, 0, TAU); g.fill();
      g.fillStyle = '#ff9c4a'; g.beginPath(); g.arc(-70, -H * 0.4, 5.2, 0, TAU); g.fill();

    } else {
      g.fillStyle = '#ff704f';
      g.beginPath(); g.ellipse(-12, -H * 0.32, 6.5, 3.4, 0.36, 0, TAU); g.fill();
      g.fillStyle = '#ffe1af';
      g.fillRect(-12, -H * 0.32 - 1, 3, 2);
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        const x = -8 - i * 7;
        g.moveTo(x, 3); g.lineTo(x - 4, 10); g.lineTo(x - 6, 3); g.closePath();
      }
      g.fill();
    }
    }
    if (e.kind === 'angler') {
      /* Keep the independently animated lure and its existing cue coordinates. */
      g.strokeStyle = '#526168'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-40, -H * 0.81); g.quadraticCurveTo(-6, -H * 1.9, 24 + Math.sin(e.lure) * 8, -H * 1.6); g.stroke();
      const lb = 7 + Math.sin(e.lure * 3) * 1.6;
      g.fillStyle = 'rgba(180,255,230,0.95)'; g.beginPath(); g.arc(24 + Math.sin(e.lure) * 8, -H * 1.6, lb, 0, TAU); g.fill();
    }
    g.restore();

    /* pre-lunge telegraph */
    if ((e.kind === 'hunter' && e.state === 'wind') || (e.kind === 'angler' && e.state === 'wind')) {
      g.save();
      g.translate(e.x, e.y);
      g.globalAlpha = 0.35 + Math.sin(G.time * 30) * 0.25;
      g.strokeStyle = '#ff5a3c'; g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, e.r + 12, 0, TAU); g.stroke();
      g.restore();
    }
  }

  function drawLeviathan(g, e){
    const L = e.L, H = e.H;
    g.save();
    g.translate(e.x, e.y);
    g.scale(e.dir < 0 ? -1 : 1, 1);

    const t = e.t;
    const spine = u => Math.sin(u * 3.6 - t * 2.1) * L * 0.055 * Math.pow(u, 1.5);
    const prof = u => leviathanProfile(u, H);
    const N = 34;
    const headEnd = 0.17;

    /* tail fin */
    g.fillStyle = '#07141c';
    const tw = spine(1);
    g.beginPath();
    g.moveTo(-L * 0.97, tw);
    g.lineTo(-L - 150, tw - H * 1.5);
    g.lineTo(-L - 40, tw);
    g.lineTo(-L - 150, tw + H * 1.5);
    g.closePath(); g.fill();

    /* 背棘（ギザギザの棘） */
    const NSP = 16, u0 = 0.24, u1 = 0.9;
    g.beginPath();
    for (let i = 0; i <= NSP; i++) {
      const u = u0 + (u1 - u0) * (i / NSP);
      const spike = (i % 2 === 0) ? 1.62 : 1.02;
      g.lineTo(-u * L, spine(u) - prof(u) * spike);
    }
    for (let i = NSP; i >= 0; i--) {
      const u = u0 + (u1 - u0) * (i / NSP);
      g.lineTo(-u * L, spine(u) - prof(u) * 0.70);
    }
    g.closePath(); g.fill();

    /* Taper the drawn shoulder under the head to hide the neck seam. */
    const bt = [], bb = [];
    const hasHead = ready(leviathanArt);
    for (let i = 0; i <= N; i++) {
      const u = headEnd + (1 - headEnd) * (i / N);
      const radius = prof(u);
      bt.push([-u * L, spine(u) - radius]);
      bb.push([-u * L, spine(u) + radius]);
    }
    g.beginPath();
    g.moveTo(bt[0][0], bt[0][1]);
    bt.forEach(q => g.lineTo(q[0], q[1]));
    bb.slice().reverse().forEach(q => g.lineTo(q[0], q[1]));
    g.closePath();
    const bg = g.createLinearGradient(0, -H, 0, H);
    if (e.flash > 0) { bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.5, '#ffe8e8'); bg.addColorStop(1, '#ffffff'); }
    else { bg.addColorStop(0, '#172b2d'); bg.addColorStop(0.24, '#3b5351'); bg.addColorStop(0.63, '#254043'); bg.addColorStop(1, '#091617'); }
    g.fillStyle = bg; g.fill();
    const skin = getLeviathanSkin(g);
    if (e.flash <= 0 && skin) {
      g.save();
      g.globalAlpha = 0.38;
      g.fillStyle = skin; g.fill();
      g.restore();
    }
    g.strokeStyle = 'rgba(148,188,188,0.30)'; g.lineWidth = 2; g.stroke();

    /* photophore rows */
    g.save();
    g.beginPath();
    g.moveTo(bt[0][0], bt[0][1]); bt.forEach(q => g.lineTo(q[0], q[1]));
    bb.slice().reverse().forEach(q => g.lineTo(q[0], q[1]));
    g.closePath(); g.clip();
    for (let i = 2; i < N - 1; i++) {
      const u = headEnd + (1 - headEnd) * (i / N);
      const fl = 0.35 + 0.55 * Math.abs(Math.sin(t * 2.2 - u * 7));
      const x = bt[i][0], y = spine(u) + Math.sin(i * 1.9) * prof(u) * 0.21;
      g.strokeStyle = 'rgba(102,199,245,' + (fl * 0.81).toFixed(3) + ')';
      g.lineWidth = 1.8 + i % 3;
      g.beginPath(); g.moveTo(x - 9, y + 8); g.lineTo(x - 3, y); g.lineTo(x + 10, y - 4); g.stroke();
      if (i % 3 === 0) { g.fillStyle = 'rgba(150,255,220,' + (fl * 0.4).toFixed(3) + ')'; g.beginPath(); g.arc(bt[i][0], bt[i][1] + prof(u) * 0.3, 3.2, 0, TAU); g.fill(); }
    }
    /* scars */
    g.strokeStyle = 'rgba(190,220,235,0.16)'; g.lineWidth = 5;
    for (let i = 0; i < 5; i++) {
      const u = 0.32 + i * 0.13;
      g.beginPath();
      g.moveTo(-u * L, spine(u) - prof(u) * 0.85);
      g.lineTo(-(u + 0.06) * L, spine(u) + prof(u) * 0.2);
      g.stroke();
    }
    g.restore();

    /* ---- head ---- */
    const hx = -headEnd * L, hy = spine(headEnd);
    if (hasHead) drawLeviathanHead(g, e, hx, hy);
    else drawLeviathanFallbackHead(g, e, spine, prof, headEnd, hx, hy);

    /* pectoral fin */
    g.fillStyle = 'rgba(8,22,30,0.9)';
    g.beginPath();
    const pu = headEnd + 0.1;
    g.moveTo(-pu * L, spine(pu) + prof(pu) * 0.35);
    g.lineTo(-pu * L - 170, spine(pu) + prof(pu) * 1.05 + Math.sin(t * 2) * 20);
    g.lineTo(-pu * L - 40, spine(pu) + prof(pu) * 0.2);
    g.closePath(); g.fill();

    g.restore();

    /* lunge telegraph */
    if (e.state === 'lungeWind' || e.state === 'sweepWind') {
      g.save();
      g.globalAlpha = 0.3 + Math.sin(G.time * 26) * 0.22;
      g.strokeStyle = '#ff3b30'; g.lineWidth = 6;
      g.strokeRect(G.camX, G.camY, VW, VH);
      g.restore();
    }
  }

  let leviathanHeadPlate = null;
  function drawLeviathanHead(g, e, hingeX, hingeY) {
    // Blend the cut edge of the head plate into the procedural shoulder once.
    if (!leviathanHeadPlate) {
      leviathanHeadPlate = makeTexture(640, 427, layer => {
        layer.drawImage(leviathanArt, 0, 0, 640, 427, 0, 0, 640, 427);
        layer.globalCompositeOperation = 'destination-in';
        const neck = layer.createLinearGradient(0, 0, 120, 0);
        neck.addColorStop(0, 'rgba(0,0,0,0)');
        neck.addColorStop(1, '#000');
        layer.fillStyle = neck; layer.fillRect(0, 0, 640, 427);
      });
    }
    const width = -hingeX * 1.96;
    const topPixels = 218, bottomPixels = 209, artWidth = 640;
    const top = width * topPixels / artWidth;
    const bottom = width * bottomPixels / artWidth;
    const opening = lerp(0.48, 1.12, clamp(e.jaw, 0, 1));
    // Put both pieces on the same seam; squash only the lower jaw as it closes.
    g.drawImage(leviathanHeadPlate, 0, 0, artWidth, topPixels,
      -width, hingeY - top, width, top);
    g.drawImage(leviathanHeadPlate, 0, topPixels, artWidth, bottomPixels,
      -width, hingeY, width, bottom * opening);
  }

  function drawLeviathanFallbackHead(g, e, spine, prof, headEnd, hx, hy) {
    const { L, H, t } = e;
    const hp = prof(headEnd);
    const jawOpen = e.jaw * 1.0;

    const jawPts = (sign) => {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const u = headEnd * (i / 10);
        pts.push([-u * L, spine(u) + sign * prof(u)]);
      }
      pts.push([0, spine(0) + sign * 4]);
      return pts;
    };

    const drawJaw = (sign, open, fill) => {
      g.save();
      g.translate(hx, hy);
      g.rotate(open);
      g.translate(-hx, -hy);
      g.beginPath();
      const pts = jawPts(sign);
      g.moveTo(pts[0][0], pts[0][1]);
      pts.forEach(q => g.lineTo(q[0], q[1]));
      for (let i = 10; i >= 0; i--) { const u = headEnd * (i / 10); g.lineTo(-u * L, spine(u)); }
      g.closePath();
      const shell = g.createLinearGradient(0, hy - hp, 0, hy + hp);
      shell.addColorStop(0, '#537271');
      shell.addColorStop(0.5, fill);
      shell.addColorStop(1, '#142728');
      g.fillStyle = shell; g.fill();
      g.strokeStyle = 'rgba(141,180,177,0.28)'; g.lineWidth = 2; g.stroke();
      // Curved ivory teeth project into the open mouth from each jaw.
      g.fillStyle = '#bcba94';
      for (let i = 0; i < 11; i++) {
        const u = headEnd * ((i + 0.5) / 11);
        const bx = -u * L, by = spine(u) + sign * 3;
        const length = 13 + prof(u) * (0.12 + (i % 3) * 0.08);
        g.beginPath();
        g.moveTo(bx + 5, by);
        g.quadraticCurveTo(bx + 5, by - sign * length * 0.65, bx - 6, by - sign * length);
        g.quadraticCurveTo(bx - 2, by - sign * length * 0.46, bx - 5, by);
        g.closePath(); g.fill();
      }
      g.restore();
    };

    /* throat */
    if (jawOpen > 0.12) {
      g.save();
      const tipX = angle => hx + Math.cos(angle) * -hx;
      const tipY = angle => hy + Math.sin(angle) * -hx;
      const top = -jawOpen * 0.22, bottom = jawOpen;
      const th = g.createRadialGradient(hx, hy, 12, hx, hy, -hx);
      th.addColorStop(0, '#06090a');
      th.addColorStop(0.65, '#191615');
      th.addColorStop(1, '#784936');
      g.fillStyle = th;
      g.beginPath();
      g.moveTo(hx - hp * 0.50, hy);
      g.quadraticCurveTo(hx, hy - hp * 0.55, tipX(top), tipY(top));
      g.quadraticCurveTo(tipX(bottom) + hp * 0.18, (tipY(top) + tipY(bottom)) / 2, tipX(bottom), tipY(bottom));
      g.quadraticCurveTo(hx, hy + hp * 0.70, hx - hp * 0.50, hy);
      g.closePath(); g.fill();
      g.restore();
    }

    drawJaw(-1, -jawOpen * 0.22, '#243e40');
    drawJaw(1, jawOpen, '#213739');

    /* 顎と体側のフォトフォア（青い発光ライン） */
    if (e.flash <= 0) {
      for (let i = 0; i < 12; i++) {
        const u = headEnd * (0.1 + (i / 12) * 0.88);
        const fl = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.6 - i * 0.7));
        g.fillStyle = 'rgba(90,240,255,' + (fl * 0.9).toFixed(2) + ')';
        g.beginPath(); g.arc(-u * L, spine(u) - prof(u) * 0.6, 5, 0, TAU); g.fill();
        g.fillStyle = 'rgba(80,220,255,' + (fl * 0.75).toFixed(2) + ')';
        g.beginPath(); g.arc(-u * L, spine(u) + prof(u) * 0.76 + jawOpen * 24, 4.2, 0, TAU); g.fill();
      }
    }

    /* eyes */
    const ex = -headEnd * L * 0.62, ey = hy - hp * 0.55;
    const rage = e.hp < e.maxHp * 0.45;
    g.fillStyle = '#03121a'; g.beginPath(); g.arc(ex, ey, 27, 0, TAU); g.fill();
    const ec = rage ? '#ff603d' : '#e8cc55';
    const eg = g.createRadialGradient(ex, ey, 3, ex, ey, 24);
    eg.addColorStop(0, '#fff6d8'); eg.addColorStop(0.5, ec); eg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = eg; g.beginPath(); g.arc(ex, ey, 22, 0, TAU); g.fill();
    /* 縦スリットの瞳孔 */
    g.fillStyle = '#04141c';
    g.beginPath(); g.ellipse(ex, ey, 3.4, 21, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(150,210,230,0.4)'; g.lineWidth = 4; g.beginPath(); g.arc(ex, ey, 27, 0, TAU); g.stroke();

    /* angler lure on head */
    g.strokeStyle = '#0d2530'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(-headEnd * L * 0.8, hy - hp * 0.9);
    g.quadraticCurveTo(-40, -H * 2.0, 130 + Math.sin(t * 1.5) * 40, -H * 1.55 + Math.cos(t * 1.1) * 26); g.stroke();
    const lx = 130 + Math.sin(t * 1.5) * 40, ly = -H * 1.55 + Math.cos(t * 1.1) * 26;
    g.fillStyle = 'rgba(190,255,235,0.9)'; g.beginPath(); g.arc(lx, ly, 15, 0, TAU); g.fill();
    g.fillStyle = 'rgba(230,255,255,0.95)'; g.beginPath(); g.arc(lx, ly, 7, 0, TAU); g.fill();
  }

  function drawSquid(g, e){
    const t = e.t, L = e.L, W = e.W;
    const arm = Math.max(0, e.arm);
    const reach = e.reach * (0.75 + arm * 1.2);
    const rage = e.hp < e.maxHp * 0.45;

    g.save();
    g.translate(e.x, e.y);
    g.scale(e.dir < 0 ? -1 : 1, 1);

    /* ---- 触腕 ---- */
    const ARMS = 8;
    for (let i = 0; i < ARMS; i++) {
      const sp = (i / (ARMS - 1)) * 2 - 1;
      const baseY = sp * W * 0.68;
      const len = reach * (0.7 + 0.3 * Math.abs(Math.sin(i * 1.7)));
      const sweep = e.whiplash * (1 + Math.abs(sp) * 0.55);
      const pts = [[56, baseY * 0.72]];
      for (let s = 1; s <= 8; s++) {
        const u = s / 8;
        pts.push([56 + u * len,
          baseY * 0.72 + Math.sin(u * 3.4 - t * 3.6 + i * 0.9) * len * 0.15 * u + sweep * len * u * 0.85]);
      }
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.strokeStyle = e.flash > 0 ? '#ffffff' : 'rgba(38,70,88,0.97)';
      g.lineWidth = 20 - Math.abs(sp) * 5;
      g.beginPath();
      pts.forEach((q, k) => k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]));
      g.stroke();
      /* 吸盤 */
      if (e.flash <= 0) {
        for (let k = 1; k < pts.length; k++) {
          const rr = 5 - k * 0.42;
          if (rr <= 1.2) continue;
          g.fillStyle = 'rgba(214,240,250,0.7)';
          g.beginPath(); g.arc(pts[k][0], pts[k][1] - (20 - Math.abs(sp) * 5) * 0.26, rr, 0, TAU); g.fill();
          g.fillStyle = 'rgba(40,80,100,0.85)';
          g.beginPath(); g.arc(pts[k][0], pts[k][1] - (20 - Math.abs(sp) * 5) * 0.26, rr * 0.45, 0, TAU); g.fill();
        }
        g.strokeStyle = 'rgba(150,220,250,0.22)';
        g.lineWidth = 4;
        g.beginPath();
        pts.forEach((q, k) => k ? g.lineTo(q[0], q[1] - (20 - Math.abs(sp) * 5) * 0.26) : g.moveTo(q[0], q[1] - (20 - Math.abs(sp) * 5) * 0.26));
        g.stroke();
      }
    }
    /* 2本の長い触腕＋クラブ */
    for (const sgn of [-1, 1]) {
      const len = reach * 1.32, y0 = sgn * W * 0.36;
      let ex2 = 62, ey2 = y0 * 0.72;
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(13,30,41,0.96)';
      g.lineWidth = 12;
      g.beginPath();
      g.moveTo(62, y0 * 0.72);
      for (let s = 1; s <= 10; s++) {
        const u = s / 10;
        ex2 = 62 + u * len;
        ey2 = y0 * 0.72 + Math.sin(u * 2.8 - t * 3.0 + (sgn > 0 ? 1.6 : 0)) * len * 0.13 * u + e.whiplash * len * u * 0.9;
        g.lineTo(ex2, ey2);
      }
      g.stroke();
      g.strokeStyle = 'rgba(120,205,235,0.20)'; g.lineWidth = 2.6; g.stroke();
      /* クラブ */
      g.save();
      g.translate(ex2, ey2);
      g.rotate(Math.atan2(ey2 - y0 * 0.72, ex2 - 62));
      g.fillStyle = 'rgba(24,46,60,0.96)';
      g.beginPath(); g.ellipse(6, 0, 30, 12, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(130,210,240,0.28)'; g.lineWidth = 2; g.stroke();
      g.fillStyle = 'rgba(150,240,255,0.5)';
      for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(-18 + k * 10, 0, 2.4, 0, TAU); g.fill(); }
      g.restore();
    }

    /* ---- 外套（ボディ） ---- */
    const N = 24, top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const prof = W * Math.pow(1 - u, 0.72) * (0.72 + 0.48 * Math.sin(u * Math.PI));
      const wob = Math.sin(u * 3.0 - t * 1.8) * W * 0.14 * Math.pow(u, 1.3);
      top.push([-u * L, wob - prof]);
      bot.push([-u * L, wob + prof]);
    }
    /* 尾鰭（外套の左右に張り出す） */
    g.fillStyle = 'rgba(34,66,84,0.96)';
    for (const sgn of [-1, 1]) {
      g.beginPath();
      g.moveTo(-L * 0.22, sgn * W * 0.74);
      g.lineTo(-L * 0.84, sgn * W * 1.85);
      g.lineTo(-L * 1.02, sgn * W * 0.14);
      g.lineTo(-L * 0.6, sgn * W * 0.92);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(150,225,255,0.34)'; g.lineWidth = 2.4; g.stroke();
    }
    g.beginPath();
    g.moveTo(top[0][0], top[0][1]);
    top.forEach(q => g.lineTo(q[0], q[1]));
    for (let i = N; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]);
    g.closePath();
    const mg = g.createLinearGradient(0, -W, 0, W);
    if (e.flash > 0) { mg.addColorStop(0, '#ffffff'); mg.addColorStop(0.5, '#eef4ff'); mg.addColorStop(1, '#ffffff'); }
    else { mg.addColorStop(0, '#12293a'); mg.addColorStop(0.38, '#1f4459'); mg.addColorStop(0.6, '#2d5d74'); mg.addColorStop(1, '#0b1c26'); }
    g.fillStyle = mg; g.fill();
    g.strokeStyle = 'rgba(110,190,220,0.3)'; g.lineWidth = 2.5; g.stroke();

    /* 外套の発光ライン */
    if (e.flash <= 0) {
      for (let i = 2; i < 14; i++) {
        const u = i / 14;
        const prof = W * Math.pow(1 - u, 0.72) * (0.72 + 0.48 * Math.sin(u * Math.PI));
        const fl = 0.3 + 0.7 * Math.abs(Math.sin(t * 2.4 - i * 0.6));
        g.fillStyle = 'rgba(110,240,255,' + (fl * 0.7).toFixed(2) + ')';
        g.beginPath();
        g.arc(-u * L, Math.sin(u * 3.0 - t * 1.8) * W * 0.14 * Math.pow(u, 1.3) + prof * 0.82, 4.5, 0, TAU);
        g.fill();
      }
    }

    /* ---- 頭部 ---- */
    g.beginPath();
    g.moveTo(-12, -W * 0.92);
    g.bezierCurveTo(48, -W * 0.98, 96, -W * 0.6, 100, 0);
    g.bezierCurveTo(96, W * 0.6, 48, W * 0.98, -12, W * 0.92);
    g.closePath();
    const hg = g.createLinearGradient(0, -W, 0, W);
    if (e.flash > 0) { hg.addColorStop(0, '#ffffff'); hg.addColorStop(0.5, '#f0f6ff'); hg.addColorStop(1, '#ffffff'); }
    else { hg.addColorStop(0, '#1a3546'); hg.addColorStop(0.45, '#26506a'); hg.addColorStop(1, '#0e2230'); }
    g.fillStyle = hg; g.fill();
    g.strokeStyle = 'rgba(120,200,230,0.34)'; g.lineWidth = 2.5; g.stroke();

    /* 巨大な発光眼 */
    const ex = 30, ey = -W * 0.34;
    g.fillStyle = '#031018'; g.beginPath(); g.arc(ex, ey, 31, 0, TAU); g.fill();
    const eg = g.createRadialGradient(ex, ey, 2, ex, ey, 29);
    const ec = rage ? 'rgba(255,120,120,' : 'rgba(87,216,255,';
    eg.addColorStop(0, '#eaffff');
    eg.addColorStop(0.35, ec + '0.95)');
    eg.addColorStop(1, 'rgba(8,50,100,0)');
    g.fillStyle = eg; g.beginPath(); g.arc(ex, ey, 29, 0, TAU); g.fill();
    g.fillStyle = '#04141c';
    g.beginPath(); g.ellipse(ex + 3, ey, 6.5, 14, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(140,220,255,0.45)'; g.lineWidth = 3;
    g.beginPath(); g.arc(ex, ey, 31, 0, TAU); g.stroke();

    /* 漏斗（サイフォン） */
    g.fillStyle = 'rgba(18,40,54,0.96)';
    g.beginPath();
    g.moveTo(24, W * 0.74);
    g.lineTo(-18, W * 1.12);
    g.lineTo(8, W * 0.6);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,200,230,0.3)'; g.lineWidth = 2; g.stroke();

    /* 嘴（カラストンビ） */
    g.save();
    g.fillStyle = '#0a1218';
    g.beginPath();
    g.moveTo(86, W * 0.08);
    g.quadraticCurveTo(128, W * 0.56, 78, W * 0.8);
    g.quadraticCurveTo(104, W * 0.46, 80, W * 0.12);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(190,228,248,0.4)'; g.lineWidth = 2.4; g.stroke();
    g.restore();

    g.restore();

    /* 攻撃予兆 */
    if (e.state === 'whipWind') {
      g.save();
      g.globalAlpha = 0.3 + Math.sin(G.time * 26) * 0.22;
      g.strokeStyle = '#ff3b30'; g.lineWidth = 6;
      g.strokeRect(G.camX, G.camY, VW, VH);
      g.restore();
    }
  }

  /* v1.19.0: 見た目の姿勢（ピッチ＋バンク）を 1 か所で作る。
     船体も付属物（ライト・発射口・取付物）もこの同じ変換を使うので、艇からズレない。
     見た目だけの変換で、当たり・照準・発射位置（p.x/p.y/p.aim）には影響しない。 */
  function bodyWorld(p, lx, ly){
    return localToWorld(p.tilt, p.bank, p.x, p.y + p.tilt * 6, lx, ly);
  }
  function applyBody(g, p){
    const t = bodyTransform(p.tilt, p.bank);
    g.translate(p.x, p.y + p.tilt * 6);
    g.rotate(t.rotate);
    g.scale(t.squash, 1);
    return t;
  }
  function drawSub(g, p){
    g.save();
    applyBody(g, p);
    g.translate(-p.recoil * 6, 0);
    const blink = p.inv > 0 && Math.floor(G.time * 22) % 2 === 0;
    g.globalAlpha = blink ? 0.45 : 1;

    /* v1.20.0: 火力型は専用の船体（別の重装艇）。09 素材を使わない＝箱/筒を貼らない。 */
    if (hasBespokeHull(G.ship)) { drawShipBody(g, G.ship, 150, 54, { glow: true }); g.restore(); return; }

    if (ready(subArt)) {
      const width = 142;
      const height = width * subArt.naturalHeight / subArt.naturalWidth;
      g.drawImage(subArt, -76, -height * 0.65, width, height);
      /* v1.13.0: 艇の差分（形で見分ける）。09 は何も足さない。 */
      g.save(); g.translate(-4, -6); drawShipRig(g, G.ship, 150, 54); g.restore();
      g.restore();
      return;
    }

    /* 尾部スタビライザー */
    g.fillStyle = '#222b32';
    g.beginPath(); g.moveTo(-30, -14); g.lineTo(-58, -32); g.lineTo(-42, -12); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-30, 14); g.lineTo(-58, 32); g.lineTo(-42, 12); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(160,200,220,0.25)'; g.lineWidth = 1.2; g.stroke();

    /* プロペラダクト + プロペラ */
    g.save();
    g.translate(-52, 0);
    g.fillStyle = '#141c22';
    g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fill();
    g.strokeStyle = '#3a464e'; g.lineWidth = 2; g.stroke();
    g.rotate(G.time * 20);
    g.fillStyle = 'rgba(150,180,196,0.7)';
    for (let i = 0; i < 3; i++) { g.rotate(TAU / 3); g.fillRect(-2, -9, 4, 18); }
    g.restore();

    /* 船体（使い込まれた重工業の潜水艇） */
    g.beginPath();
    g.moveTo(46, 0);
    g.bezierCurveTo(37, -15, 14, -20, -12, -17);
    g.bezierCurveTo(-32, -15, -44, -9, -46, 0);
    g.bezierCurveTo(-44, 9, -32, 15, -12, 17);
    g.bezierCurveTo(14, 20, 37, 15, 46, 0);
    g.closePath();
    const hull = g.createLinearGradient(0, -20, 0, 20);
    hull.addColorStop(0,    '#8a7358');
    hull.addColorStop(0.16, '#5b5245');
    hull.addColorStop(0.42, '#3b4045');
    hull.addColorStop(0.68, '#28323a');
    hull.addColorStop(0.86, '#1a2229');
    hull.addColorStop(1,    '#0c1216');
    g.fillStyle = hull; g.fill();
    g.strokeStyle = 'rgba(190,215,230,0.38)'; g.lineWidth = 1.6; g.stroke();

    /* 錆と板の合わせ目 */
    g.save();
    g.beginPath();
    g.moveTo(46, 0);
    g.bezierCurveTo(37, -15, 14, -20, -12, -17);
    g.bezierCurveTo(-32, -15, -44, -9, -46, 0);
    g.bezierCurveTo(-44, 9, -32, 15, -12, 17);
    g.bezierCurveTo(14, 20, 37, 15, 46, 0);
    g.closePath(); g.clip();
    g.strokeStyle = 'rgba(160,105,60,0.42)'; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const x = -36 + i * 19;
      g.beginPath(); g.moveTo(x, -20); g.lineTo(x + 5, -4); g.stroke();
    }
    g.strokeStyle = 'rgba(8,12,16,0.55)'; g.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) { const x = -40 + i * 19; g.beginPath(); g.moveTo(x, -22); g.lineTo(x, 22); g.stroke(); }
    // Subtle rivets and scratches on the pressure hull.
    for (let i = 0; i < 15; i++) {
      const x = -37 + i * 5.2, edge = 11 + 5 * Math.sin(i / 14 * Math.PI);
      g.fillStyle = 'rgba(5,12,15,0.6)'; g.fillRect(x, edge - 1, 1.4, 1.4);
      g.fillStyle = 'rgba(185,190,172,0.3)'; g.fillRect(x, edge - 2, 1, 1);
    }
    g.strokeStyle = 'rgba(201,196,166,0.16)'; g.lineWidth = 0.7;
    for (let i = 0; i < 7; i++) {
      const x = -38 + i * 11;
      g.beginPath(); g.moveTo(x, 3 + i % 3 * 3); g.lineTo(x + 5, 2 + i % 3 * 3); g.stroke();
    }
    g.fillStyle = 'rgba(232,240,246,0.72)';
    g.font = 'bold 8px "Yu Gothic UI",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('09', -24, -9);
    g.restore();

    /* コックピット（大きな丸窓＋支柱） */
    g.save();
    g.beginPath(); g.ellipse(15, -1, 15.5, 14.5, 0, 0, TAU);
    const cg = g.createRadialGradient(12, -5, 2, 15, -1, 18);
    cg.addColorStop(0, 'rgba(185,242,255,0.96)');
    cg.addColorStop(0.45, 'rgba(58,150,192,0.9)');
    cg.addColorStop(1, 'rgba(6,26,40,0.96)');
    g.fillStyle = cg; g.fill();
    g.strokeStyle = '#161f26'; g.lineWidth = 3.6; g.stroke();
    g.strokeStyle = 'rgba(26,38,46,0.92)'; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(1, -14); g.lineTo(1, 12); g.moveTo(29, -14); g.lineTo(29, 12); g.stroke();
    g.restore();

    /* ツイン・ヘッドライト */
    for (const oy of [-9.5, 9.5]) {
      g.save();
      g.translate(39, oy);
      g.fillStyle = '#141b21'; g.beginPath(); g.arc(0, 0, 8.6, 0, TAU); g.fill();
      g.strokeStyle = '#4b5560'; g.lineWidth = 1.6; g.stroke();
      const lg = g.createRadialGradient(1.5, 0, 1, 1.5, 0, 7);
      lg.addColorStop(0, '#fffdf0'); lg.addColorStop(0.4, '#ffe9a0'); lg.addColorStop(1, '#b8821c');
      g.fillStyle = lg; g.beginPath(); g.arc(1.6, 0, 6.5, 0, TAU); g.fill();
      g.restore();
    }

    /* 魚雷発射管 */
    g.fillStyle = '#0b1218';
    g.fillRect(30, -2.6, 12, 5.2);
    g.fillStyle = '#3f4a54';
    g.fillRect(30, -2.6, 12, 1);

    /* 緑のインジケータ */
    g.fillStyle = 'rgba(120,255,150,' + (0.55 + 0.45 * Math.sin(G.time * 6)).toFixed(2) + ')';
    g.beginPath(); g.arc(22, 13, 2.2, 0, TAU); g.fill();

    /* 発熱時のノーズグロー */
    if (p.heat > 0.5) {
      g.fillStyle = 'rgba(255,' + Math.round(180 - p.heat * 160) + ',60,' + ((p.heat - 0.5) * 1.4).toFixed(2) + ')';
      g.beginPath(); g.ellipse(46, 0, 13, 11, 0, 0, TAU); g.fill();
    }
    /* v1.13.0: 艇の差分（形で見分ける）。09 は何も足さない。 */
    g.save(); drawShipRig(g, G.ship, 96, 40); g.restore();
    g.restore();
  }

  /* v1.13.0: 瞬間バリアの膜。稼働中だけ艇の周りに青白い薄膜を描く。
     ジャストは明滅を強め、通常ガードは控えめ、破損で消える（膜は active のときだけ）。 */
  function drawBarrier(g, p){
    const st = p && p.barrier;
    if (!st || !st.active) return;
    const life = clamp(st.durability / st.maxDurability, 0, 1);
    const just = clamp(p.barJustT / 0.22, 0, 1);
    const hit = clamp(p.barHitT / 0.24, 0, 1);
    const rx = 84, ry = 56;
    g.save();
    g.translate(p.x, p.y);
    g.globalCompositeOperation = 'lighter';
    /* 薄膜（内側の淡い塗り） */
    g.globalAlpha = 0.10 + 0.16 * life + 0.22 * hit;
    g.fillStyle = 'rgba(150,225,255,0.7)';
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
    /* 輪郭（青白） */
    g.globalAlpha = 0.40 + 0.35 * life + 0.5 * just;
    g.strokeStyle = just > 0.01 ? '#eaffff' : '#bff2ff';
    g.lineWidth = 2.2 + 2.4 * just;
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
    /* 内側に走る細い締めの線（膜らしさ） */
    g.globalAlpha = 0.18 + 0.2 * just;
    g.strokeStyle = 'rgba(220,246,255,0.9)';
    g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(0, 0, rx * 0.72, ry * 0.72, 0, 0, TAU); g.stroke();
    g.restore();
  }

  function drawJelly(g, e){
    g.save(); g.translate(e.x, e.y);
    const pulse = 1 + Math.sin(e.t * 2.4 + e.pulse) * 0.14;
    const a = e.flash > 0 ? 0.95 : 0.55;
    const rg = g.createRadialGradient(0, -6, 4, 0, -6, 44 * pulse);
    rg.addColorStop(0, e.flash > 0 ? 'rgba(255,255,255,' + a + ')' : 'rgba(170,255,235,' + a + ')');
    rg.addColorStop(1, 'rgba(80,160,190,0)');
    g.fillStyle = rg;
    g.beginPath(); g.ellipse(0, -6, 34 * pulse, 30 * pulse, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(160,255,230,0.5)'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, -4, 30 * pulse, Math.PI, TAU); g.stroke();
    g.strokeStyle = 'rgba(150,240,225,0.42)'; g.lineWidth = 2.2;
    for (let i = 0; i < 7; i++) {
      const x = -22 + i * 7.4;
      g.beginPath();
      g.moveTo(x, 20);
      g.quadraticCurveTo(x + Math.sin(e.t * 2 + i) * 10, 40, x + Math.sin(e.t * 1.6 + i * 1.3) * 14, 62);
      g.stroke();
    }
    g.restore();
  }

  function drawMine(g, e){
    g.save(); g.translate(e.x, e.y); g.rotate(Math.sin(e.t * 0.5) * 0.2);
    const blink = 0.5 + 0.5 * Math.sin(e.t * 5);
    if (ready(mineArt)) {
      const scale = e.r / 0.45;
      g.drawImage(mineArt, -scale / 2, -scale / 2, scale, scale);
      g.fillStyle = 'rgba(255,225,118,' + (0.1 + blink * 0.35) + ')';
      g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill();
      g.restore();
      return;
    }
    g.fillStyle = Math.floor(e.t * 5) % 2 ? '#3a2a30' : '#2a1e24';
    g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.fill();
    g.strokeStyle = '#54616b'; g.lineWidth = 2; g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + e.t * 0.2;
      g.strokeStyle = '#47545e'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(Math.cos(a) * 18, Math.sin(a) * 18); g.lineTo(Math.cos(a) * 28, Math.sin(a) * 28); g.stroke();
      g.fillStyle = '#3c4a54';
      g.beginPath(); g.arc(Math.cos(a) * 30, Math.sin(a) * 30, 4, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(255,70,70,' + (0.35 + blink * 0.65) + ')';
    g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill();
    g.restore();
  }

  function drawHermit(g, e){
    const active = e.state === 'active';
    const art = active ? hermitArt : hermitDormantArt;
    g.save();
    g.translate(e.x, e.floorY);
    g.scale(e.dir, 1);
    if (ready(art)) {
      g.drawImage(art, -HERMIT_SIZE / 2, -HERMIT_SIZE + 1, HERMIT_SIZE, HERMIT_SIZE);
    } else {
      g.fillStyle = active ? '#82746b' : '#4b4b47';
      g.beginPath(); g.ellipse(0, -e.r, e.r * 1.15, e.r * 0.75, 0, 0, TAU); g.fill();
      g.fillRect(18, -e.r * 1.65, e.r, 11);
    }
    if (active && e.st <= HERMIT_CHARGE && e.stun <= 0) {
      const charge = 1 - e.st / HERMIT_CHARGE;
      g.fillStyle = '#ffd491';
      g.shadowColor = '#ffad56';
      g.shadowBlur = 18;
      g.beginPath(); g.arc(HERMIT_MUZZLE_X, HERMIT_MUZZLE_Y, 3 + charge * 7, 0, TAU); g.fill();
    }
    if (e.flash > 0) {
      g.fillStyle = 'rgba(255,228,193,0.35)';
      g.beginPath(); g.ellipse(0, e.y - e.floorY, e.r * 0.8, e.r * 0.62, 0, 0, TAU); g.fill();
    }
    g.restore();
  }

  /* ------------------------------------------------------------------ *
   * v3.7.0(隔離試作): B亜種ヤドカリ（中型）。既存の戦車ヤドカリ（hermit）とは別種・別アセットで共存。
   *   updateHermitB: 歩行（接地足は世界固定＝前後脚を交互・止まれる）→ 接近すると「見える歩行」を
   *   しばらく続けてから停止 → 警戒 → 鋏を開く（砲撃の予兆）。床は実地形（深棚下＝合流広場の深床）に沿う。
   *   drawHermitB: 表示ポーズ（歩行フレーム/警戒）を共有モジュールで解決して描く。
   *   spawnHermitBBurst: 表示した姿勢のまま殻/胴/脚/鋏/眼へ分裂（殻は重く遅く、部位は軽く速い）。演出のみ。
   * ------------------------------------------------------------------ */
  function hermitBFloorY(x){
    const t = createTrench(trenchAnchor());
    if (t && x > t.gorgeX0 && x < t.gorgeX1) return t.deepFloorY;
    if (t && x > t.hallX0 && x < t.hallX1) return t.deepFloorY;
    return seaFloorY(x);
  }
  function updateHermitB(e, dt, p){
    e.t += dt;
    const dist2 = d2(e.x, e.y, p.x, p.y);
    const inRange = dist2 < HERMITB_RANGE * HERMITB_RANGE;
    if (e.state === 'walk'){
      if (inRange){
        /* v3.7.0: 見える歩行。range 内でも NOTICE 秒だけ歩行を続けてから警戒へ（何歩か見える）。
           至近（CLOSE 以内）は近接遭遇とみなし歩行を挟まず即警戒＝ダメージ予告を遅らせない。 */
        e.noticeT = (e.noticeT || 0) + dt;
        e.x += e.dir * HERMITB_SPEED * dt; e.walkT += dt;
        if (e.x < e.x0 - HERMITB_PATROL){ e.x = e.x0 - HERMITB_PATROL; e.dir = 1; }
        if (e.x > e.x0 + HERMITB_PATROL){ e.x = e.x0 + HERMITB_PATROL; e.dir = -1; }
        if (dist2 < HERMITB_CLOSE * HERMITB_CLOSE || e.noticeT >= HERMITB_NOTICE_T){
          e.state = 'alert'; e.st = HERMITB_CHARGE + 0.35; e.noticeT = 0;
        }
      } else {
        e.noticeT = 0;                              // 退路: range 外へ出たら発見をリセット
        e.x += e.dir * HERMITB_SPEED * dt; e.walkT += dt;
        if (e.x < e.x0 - HERMITB_PATROL){ e.x = e.x0 - HERMITB_PATROL; e.dir = 1; }
        if (e.x > e.x0 + HERMITB_PATROL){ e.x = e.x0 + HERMITB_PATROL; e.dir = -1; }
      }
    } else {                                        // alert / attack（止まって警戒→鋏を開く）
      e.noticeT = 0;
      e.dir = p.x < e.x ? -1 : 1;
      if (!inRange){ e.state = 'walk'; e.st = 0.6; }
      else {
        e.st -= dt;
        if (e.st <= 0){
          fireEnemyShell(e.x + e.dir * HERMIT_MUZZLE_X, e.floorY + HERMIT_MUZZLE_Y, p, 350, 12);
          e.st = 2.1;
        }
      }
    }
    e.floorY = hermitBFloorY(e.x);                  // 実地形に沿う（浮かない）
    e.y = e.floorY - 60;                            // 体の中心＝既存の当たり円の中心
  }

  function drawHermitB(g, e){
    /* 表示ポーズ（歩行フレーム/警戒）を共有モジュールで解決し、その変換で描く。
       撃破は同じスナップショットを読む＝切離し 0 フレームが表示と一致する。 */
    const walking = e.state === 'walk';
    const frame = walking ? Math.floor((e.walkT * HERMITB_FPS) % HERMITB_FRAMES) : 0;
    const snap = PD.snapshot(hermitBParts(walking ? 'walk' : 'alert', frame), { x: e.x, y: e.floorY, flip: e.dir });
    e._snap = { which: walking ? 'walk' : 'alert', frame, snap };   /* 実際に表示したポーズ */
    if (walking ? ready(hermitBWalkPartArt.shell) : ready(hermitBPartArt.shell)){
      drawSnapParts(g, snap);
    } else {
      /* パーツ素材が読めない時は、従来の 1 枚絵（合成済みアトラス）へ静かに戻す。 */
      g.save(); g.translate(e.x, e.floorY); g.scale(e.dir, 1);
      if (walking && ready(hermitBWalkArt)) g.drawImage(hermitBWalkArt, frame * HERMITB_CELL, 0, HERMITB_CELL, HERMITB_CELL, -75, -149, 150, 150);
      else if (!walking && ready(hermitBAlertArt)) g.drawImage(hermitBAlertArt, -75, -149, 150, 150);
      else { g.fillStyle = walking ? '#8b8476' : '#a49c8a'; g.beginPath(); g.ellipse(0, -e.r, e.r * 1.15, e.r * 0.75, 0, 0, TAU); g.fill(); }
      g.restore();
    }
    if (!walking && e.st <= HERMITB_CHARGE && e.stun <= 0){
      const charge = 1 - e.st / HERMITB_CHARGE;
      g.fillStyle = '#ffd491'; g.shadowColor = '#ffad56'; g.shadowBlur = 18;
      g.beginPath(); g.arc(e.x + e.dir * HERMIT_MUZZLE_X, e.floorY + HERMIT_MUZZLE_Y, 3 + charge * 7, 0, TAU); g.fill();
      g.shadowBlur = 0;
    }
    if (e.flash > 0){
      g.fillStyle = 'rgba(255,228,193,0.35)';
      g.beginPath(); g.ellipse(e.x, e.y, e.r * 0.8, e.r * 0.62, 0, 0, TAU); g.fill();
    }
  }

  /* v3.7.0: 深い区間の砲口チャージ予告（光の当たりに依らず残す＝攻撃の合図）。 */
  function drawHermitBTelegraph(g, e){
    if (!(e.state === 'alert' && e.st <= HERMITB_CHARGE && e.stun <= 0)) return;
    const charge = 1 - e.st / HERMITB_CHARGE;
    g.save();
    g.translate(e.x, e.floorY); g.scale(e.dir, 1);
    g.fillStyle = '#ffd491'; g.shadowColor = '#ffad56'; g.shadowBlur = 18;
    g.beginPath(); g.arc(HERMIT_MUZZLE_X, HERMIT_MUZZLE_Y, 3 + charge * 7, 0, TAU); g.fill();
    g.restore();
  }

  function spawnHermitBBurst(e){
    /* 実際に表示したポーズをそのまま切る（殻は重く＝遅い/回転小、部位は軽く）。表示前に倒れた場合は
       現ポーズで作り直す。乱数は速度と回転だけ。部位が読めない時は従来の爆発演出へ安全に戻す。 */
    let snap = e._snap && e._snap.snap;
    if (!snap){
      const walking = e.state === 'walk';
      const frame = walking ? Math.floor((e.walkT * HERMITB_FPS) % HERMITB_FRAMES) : 0;
      snap = PD.snapshot(hermitBParts(walking ? 'walk' : 'alert', frame), { x: e.x, y: e.floorY, flip: e.dir });
    }
    const burst = PD.spawn(snap, { rng: Math.random, missing: (id) => {
      const p = snap.parts.find(q => q.id === id);
      return !p || !p.crop || !ready(p.img);
    } });
    if (!burst.ok){ explode(e.x, e.y, e.r * 1.3, 0.9); return; }
    const n = burst.parts.length;
    if (G.parts.length + n > 700) G.parts.splice(0, G.parts.length + n - 700);
    for (const d of burst.parts){
      d.kind = 'husk';                                  /* 演出のみ（敵配列には入れない） */
      d.w = d.crop[2] * d.scale; d.h = d.crop[3] * d.scale;
      G.parts.push(d);
    }
    G.lights.push({ x:e.x, y:e.y, r:150, life:0.16, max:0.16, col:'#ffe0b0' });   // 短い爆発（部位を隠さない）
    G.rings.push({ x:e.x, y:e.y, r:18, speed:120, life:0.22, max:0.22, col:'rgba(255,220,170,0.5)', w:4 });
    bubbles(e.x, e.y, 10, 26);
  }

  function drawGunner(g, e){
    g.save();
    g.translate(e.x, e.y);
    g.scale(e.dir, 1);
    if (ready(gunnerArt)) {
      g.drawImage(gunnerArt, 0, 172, 768, 596, -76, -59, 152, 118);
    } else {
      g.fillStyle = '#96627f';
      g.beginPath(); g.ellipse(-14, 4, 43, 37, -0.3, 0, TAU); g.fill();
      g.fillStyle = '#60483a'; g.fillRect(-8, -32, GUNNER_MUZZLE_X + 8, 14);
    }
    if (e.flash > 0) {
      g.fillStyle = 'rgba(255,240,230,0.35)';
      g.beginPath(); g.ellipse(-12, 5, 35, 28, 0, 0, TAU); g.fill();
    }
    if (e.st <= GUNNER_CHARGE && e.stun <= 0) {
      const charge = 1 - e.st / GUNNER_CHARGE;
      g.fillStyle = '#ffe38b'; g.shadowColor = '#ff8a50'; g.shadowBlur = 22;
      g.beginPath(); g.arc(GUNNER_MUZZLE_X, GUNNER_MUZZLE_Y, 4 + charge * 8, 0, TAU); g.fill();
    }
    g.restore();
  }

  /* v2.1.0(試作): 照明弾の当たり環境（本編の地形と共有）。
     壁/天井＝solids（海溝の壁・岩棚・岩）、海底/下の地形＝floorY、画面上端＝ceilY。 */
  function flareFloorY(x){
    const t = createTrench(trenchAnchor());
    if (t && x > t.gorgeX0 && x < t.gorgeX1) return trenchFloorYAt(x, t);
    return seaFloorY(x);
  }
  function flareEnv(){
    return { solids: worldGeometry(), floorY: flareFloorY, ceilY: 40 };
  }

  /* v2.1.0(試作): 照明弾の本体（世界座標で描く）。白に近い淡い琥珀〜乳白の芯＋柔らかく控えめな散乱。
     赤い火球・強い白飛び・画面全体の色被りは避ける。軌跡は短い淡い残像。 */
  function drawFlareBody(g, f){
    const s = flareIntensity(f);
    if (s <= 0) return;
    g.save();
    /* 軌跡（comet 風の淡い残像）。古い点ほど薄く細い。 */
    if (f.trail && f.trail.length > 1){
      g.globalCompositeOperation = 'lighter';
      g.lineCap = 'round';
      for (let i = 1; i < f.trail.length; i++){
        const u = i / f.trail.length;
        const p0 = f.trail[i - 1], p1 = f.trail[i];
        g.strokeStyle = 'rgba(255,246,224,' + (u * u * 0.26 * s).toFixed(3) + ')';
        g.lineWidth = 1 + u * 3.2;
        g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.stroke();
      }
    }
    g.translate(f.x, f.y);
    g.globalCompositeOperation = 'lighter';
    const flick = 0.88 + 0.12 * Math.sin(G.time * 30 + f.id * 1.7);
    g.fillStyle = 'rgba(255,251,242,' + (0.7 * s * flick).toFixed(3) + ')';   // 乳白の芯
    g.beginPath(); g.arc(0, 0, 4 + 3 * s, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,238,208,' + (0.26 * s).toFixed(3) + ')';          // 淡い琥珀の散乱
    g.beginPath(); g.arc(0, 0, 11 + 9 * s, 0, TAU); g.fill();
    g.restore();
  }

  /* v2.1.0(試作): 光で読ませる対象の本体を g に描く（描画先を選べる＝シルエット／ディテール）。 */
  function drawEnemyBody(g, e){
    if (e.kind === 'hermit') return drawHermit(g, e);
    if (e.kind === 'hermitB') return drawHermitB(g, e);
    if (e.kind === 'gunner') return drawGunner(g, e);
    if (e.kind === 'anemone') return drawAnemone(g, e);   // v3.8.0
    if (e.kind === 'geo_crab') return drawGeoCrab(g, e);
    if (e.kind === 'gravel_crab') return drawGravelCrab(g, e);
    return drawFish(g, e);
  }

  /* v3.8.0: 煤冠イソギンチャクの本体。閉／白い予告／広げ／引っ込む／死 の 5 枚を使い分ける。
     根づいた位置 (e.x, e.y) を基部に置く。体はゆっくり脈打つ。黒輪郭・線だけの触手は使わない
     （Blender 焼きの立体陰影スプライト）。 */
  function drawAnemone(g, e){
    const art = e.dead ? anemoneArt.dead
              : e.phase === 'warn' ? anemoneArt.warn
              : e.phase === 'flare' ? anemoneArt.open
              : e.phase === 'retract' ? anemoneArt.retract
              : anemoneArt.closed;
    g.save();
    g.translate(e.x, e.y);
    g.scale(e.dir, 1);
    const H = ANEMONE_DRAW_H + (e.phase === 'flare' ? 16 : 0);
    const asp = (ready(art) && art.naturalHeight) ? (art.naturalWidth / art.naturalHeight) : 1.12;
    const W = H * asp;
    const pulse = 1 + Math.sin(e.t * 1.9) * 0.025;                 // 体が脈打つ
    if (ready(art)){
      g.drawImage(art, -W * 0.5, 14 - H * pulse, W, H * pulse);
    } else {
      /* 画像が無いときのフォールバック（根づいた塊＋触手） */
      g.fillStyle = '#2b2320';
      g.beginPath(); g.ellipse(0, -6, 34, 24, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(150,110,70,0.85)'; g.lineWidth = 3; g.lineCap = 'round';
      const open = e.phase === 'flare' ? 1 : 0.32;
      for (let i = 0; i < 7; i++){
        const a = -Math.PI * 0.86 + (i / 6) * Math.PI * 0.72;
        g.beginPath(); g.moveTo(Math.cos(a) * 10, -18);
        g.lineTo(Math.cos(a) * (30 + 40 * open), -18 - (26 + 44 * open));
        g.stroke();
      }
    }
    if (e.flash > 0){
      g.fillStyle = 'rgba(255,238,214,0.28)';
      g.beginPath(); g.ellipse(0, -52, 40, 46, 0, 0, TAU); g.fill();
    }
    g.restore();
  }

  /* v3.8.0: 白い短い収縮予告。光（暗幕・照明）で消えないよう、加算光の後に描く。
     白青い芯＋収縮を強調する輪で、アンバーの熱水背景に対して形と色の両方で区別する。 */
  function drawAnemoneTelegraph(g, e){
    if (e.dead || e.phase !== 'warn') return;
    const k = 1 - Math.max(0, e.pt) / ANEMONE.WARN_T;              // 0→1 白青く立ち上がる
    g.save();
    g.translate(e.x, e.y); g.scale(e.dir, 1);
    g.globalCompositeOperation = 'lighter';
    const core = 30 + k * 22;
    const rg = g.createRadialGradient(0, -46, 2, 0, -46, core);
    rg.addColorStop(0, 'rgba(232,246,255,' + (0.50 + 0.40 * k).toFixed(3) + ')');
    rg.addColorStop(0.5, 'rgba(176,214,255,' + (0.28 * (0.4 + 0.6 * k)).toFixed(3) + ')');
    rg.addColorStop(1, 'rgba(150,200,255,0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(0, -46, core, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(214,240,255,' + (0.35 + 0.45 * k).toFixed(3) + ')';
    g.lineWidth = 2 + 2 * k;
    g.beginPath(); g.arc(0, -46, 22 + 16 * k, 0, TAU); g.stroke();
    g.restore();
  }


  /* ------------------------------------------------------------------ *
   * v3.8.0(隔離試作) / 改5: 巨蟹の近側前脚（生体）の描画。
   *   方針: 均一な円筒と長い連続の艶を消す。
   *     - 断面は非円形（上=丸く高い / 下=平ら）＋中心線はゆるい S 字。
   *     - 部位ごとに太さを変える（根元 太い → 膝 括れる → 先細り → 爪で再び太い）。
   *     - 膝は括れた「腰」にして濡れた膜を見せる（丸いヒンジにしない）。
   *     - 殻板は 3 枚重ね、板ごとに太さを変えて輪郭が段になる。
   *     - 小さな欠けを入れる。明るい点（リベット状）は置かない。
   *     - 艶は狭い面だけ（関節の濡れた膜・爪先）。殻板はマット。
   *   描いた外形は当たり（geoCrabLeg: LEG_R=26 / CLAW_R=34）の内側。
   *   関節座標・タイミング・殻・装甲・地形は geoCrabLeg のまま（ここは描画のみ）。
   * ------------------------------------------------------------------ */
  const CRAB_LEG_PAL = {
    shell: { rock:'#313b47', rock2:'#232c36', rock3:'#171e27', rock4:'#1d252e',
             dark:'#070b10', edge:'#3f4b58', mem:'#060a0e',
             wet:'rgba(150,205,212,0.30)', wet2:'rgba(200,235,238,0.40)',
             epi:'rgba(112,176,170,0.40)' },
    tell:  { rock:'#5f6e7c', rock2:'#4a5662', rock3:'#3a4450', rock4:'#444f5b',
             dark:'#141b23', edge:'#78869a', mem:'#0b1017',
             wet:'rgba(170,216,222,0.34)', wet2:'rgba(215,245,248,0.50)',
             epi:'rgba(150,210,200,0.60)' },
  };

  function crabRnd(i){ const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  const crabLerp = (x, y, t) => x + (y - x) * t;
  const crabHump = (t, c, w, a) => a * Math.exp(-Math.pow((t - c) / w, 2));

  /* 非円形の断面・ゆるい S 字の中心線。ftop/fbot は t ごとの半幅。 */
  function crabLimbPath(g, a, b, ftop, fbot, seed){
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    const axis = (t) => Math.sin(t * 3.1 + seed) * 3.4 + Math.sin(t * 8.3 + seed * 1.7) * 1.5;
    const Pt = (t, side) => {
      const w = side > 0 ? ftop(t) : fbot(t);
      const off = axis(t);
      return [a.x + dx * t + nx * (off + side * w), a.y + dy * t + ny * (off + side * w)];
    };
    const N = 14;
    g.beginPath();
    let p = Pt(0, 1); g.moveTo(p[0], p[1]);
    for (let i = 1; i <= N; i++){ p = Pt(i / N, 1); g.lineTo(p[0], p[1]); }
    for (let i = N; i >= 0; i--){ p = Pt(i / N, -1); g.lineTo(p[0], p[1]); }
    g.closePath();
    return { Pt, nx, ny, dx, dy, L, axis };
  }

  /* 節。殻板 3 枚を重ね、板ごとに太さを変えて輪郭を段にする。マット。 */
  function crabSegment(g, a, b, ftop, fbot, pal, seed, detail){
    crabLimbPath(g, a, b, ftop, fbot, seed);
    g.fillStyle = pal.rock2; g.fill();
    if (!detail) return;
    const geo = crabLimbPath(g, a, b, ftop, fbot, seed);
    const { Pt, nx, ny, dx, dy, axis } = geo;
    const Pk = (t, side, ws) => {
      const w = (side > 0 ? ftop(t) : fbot(t)) * ws;
      const off = axis(t);
      return [a.x + dx * t + nx * (off + side * w), a.y + dy * t + ny * (off + side * w)];
    };
    g.save();
    crabLimbPath(g, a, b, ftop, fbot, seed); g.clip();
    const RANGES = [[0.02, 0.40], [0.33, 0.72], [0.65, 0.98]];
    const WSCALE = [1.14, 0.84, 1.12];
    for (let k2 = 0; k2 < 3; k2++){
      const t0 = RANGES[k2][0], t1 = RANGES[k2][1], ws = WSCALE[k2];
      if (k2 > 0){
        g.fillStyle = 'rgba(3,6,9,0.66)';
        g.beginPath();
        let q = Pk(t0 - 0.05, 1, ws); g.moveTo(q[0], q[1]);
        for (let s2 = 1; s2 <= 4; s2++){ q = Pk(t0 - 0.05 + 0.05 * s2 / 4, 1, ws); g.lineTo(q[0], q[1]); }
        for (let s2 = 4; s2 >= 0; s2--){ q = Pk(t0 - 0.05 + 0.05 * s2 / 4, -1, ws); g.lineTo(q[0], q[1]); }
        g.closePath(); g.fill();
      }
      g.fillStyle = [pal.rock3, pal.rock4, pal.rock][k2];
      g.beginPath();
      const ST = 8;
      let q = Pk(t0, 1, ws); g.moveTo(q[0], q[1]);
      for (let s2 = 1; s2 <= ST; s2++){ q = Pk(t0 + (t1 - t0) * s2 / ST, 1, ws); g.lineTo(q[0], q[1]); }
      for (let s2 = ST; s2 >= 0; s2--){ q = Pk(t0 + (t1 - t0) * s2 / ST, -1, ws); g.lineTo(q[0], q[1]); }
      g.closePath(); g.fill();
      /* 板の縁（マットな細面。艶ではない） */
      g.strokeStyle = pal.edge; g.lineWidth = 1.5; g.lineCap = 'round';
      g.beginPath();
      q = Pk(t0, 1, ws); g.moveTo(q[0], q[1]);
      for (let s2 = 1; s2 <= 4; s2++){ q = Pk(t0, 1 - s2 / 2, ws); g.lineTo(q[0], q[1]); }
      g.stroke();
    }
    /* 暗い染み（マット。明るい点＝リベットは置かない） */
    for (let i2 = 0; i2 < 6; i2++){
      const tt = crabRnd(i2 * 3.1 + seed);
      const p = Pt(tt, crabRnd(i2 * 7.7 + seed) < 0.5 ? 1 : -1);
      g.fillStyle = 'rgba(0,0,0,0.16)';
      g.beginPath();
      g.ellipse(p[0], p[1], 2.2 + crabRnd(i2) * 3.2, 1.2 + crabRnd(i2 + 9) * 2.0, crabRnd(i2) * 3, 0, TAU);
      g.fill();
    }
    /* 小さな欠け（輪郭を噛む） */
    for (const tb of [[0.20, 1], [0.55, -1], [0.80, 1]]){
      const p = Pt(tb[0], tb[1]);
      g.fillStyle = 'rgba(3,6,9,0.92)';
      g.beginPath();
      g.moveTo(p[0] + nx * tb[1] * 1.5, p[1] + ny * tb[1] * 1.5);
      g.lineTo(p[0] + nx * tb[1] * 5.5, p[1] + ny * tb[1] * 5.5);
      g.lineTo(p[0] - dx * 0.030, p[1] - dy * 0.030);
      g.lineTo(p[0] + dx * 0.005, p[1] + dy * 0.005);
      g.closePath(); g.fill();
    }
    g.restore();
  }

  /* 関節は括れた「腰」に覗く濡れた膜。輪郭は不規則（丸い軸にしない）。艶はここだけ。 */
  function crabJoint(g, p, r, pal, lifted, ang){
    g.save();
    g.translate(p.x, p.y); g.rotate(ang);
    /* 不規則な輪郭の膜 */
    g.fillStyle = pal.mem;
    g.beginPath();
    for (let i2 = 0; i2 <= 16; i2++){
      const th = i2 / 16 * TAU;
      const rr = (0.78 + 0.16 * Math.sin(th * 3 + 1.1) + 0.10 * Math.sin(th * 7 + 2.3));
      const px2 = Math.cos(th) * r * rr * 0.92;
      const py2 = Math.sin(th) * r * rr * 1.14;
      if (i2) g.lineTo(px2, py2); else g.moveTo(px2, py2);
    }
    g.closePath(); g.fill();
    /* 膜の皺（伸び縮みの折り目） */
    g.strokeStyle = 'rgba(0,0,0,0.60)'; g.lineWidth = 1.5; g.lineCap = 'round';
    for (const o of [-0.62, -0.18, 0.26, 0.66]){
      g.beginPath();
      g.moveTo(-r * 0.62, r * o);
      g.quadraticCurveTo(0, r * (o + 0.20 * Math.sin(o * 9)), r * 0.62, r * o);
      g.stroke();
    }
    /* 濡れの艶は割れた細い断片だけ（ひとつの艶玉にしない） */
    g.fillStyle = pal.wet;
    g.beginPath(); g.ellipse(-r * 0.16, -r * 0.54, r * 0.34, r * 0.10, -0.34, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(r * 0.24, -r * 0.30, r * 0.17, r * 0.070, -0.20, 0, TAU); g.fill();
    g.fillStyle = pal.wet2;
    g.beginPath(); g.ellipse(-r * 0.22, -r * 0.60, r * 0.16, r * 0.055, -0.34, 0, TAU); g.fill();
    if (lifted){
      g.fillStyle = pal.wet;
      g.beginPath(); g.ellipse(r * 0.14, r * 0.54, r * 0.26, r * 0.09, 0.28, 0, TAU); g.fill();
    }
    g.restore();
  }

  /* 末端は太い鈍い二枚の爪（明快な pincer の隙間）。艶は爪先の狭い面だけ。 */
  function crabClaw(g, tip, ang, r, pal, detail){
    g.save();
    g.translate(tip.x, tip.y); g.rotate(ang);
    const L = r * 1.6, HW = r * 0.70;
    g.fillStyle = pal.rock3;
    g.beginPath(); g.ellipse(-L * 0.30, 0, L * 0.32, HW * 0.94, 0, 0, TAU); g.fill();
    g.fillStyle = pal.rock;
    g.beginPath();
    g.moveTo(-L * 0.36, -HW * 0.30);
    g.quadraticCurveTo(-L * 0.02, -HW * 1.12, L * 0.46, -HW * 0.52);
    g.quadraticCurveTo(L * 0.34, -HW * 0.20, L * 0.10, -HW * 0.14);
    g.quadraticCurveTo(-L * 0.14, -HW * 0.16, -L * 0.36, -HW * 0.30);
    g.closePath(); g.fill();
    g.fillStyle = pal.rock2;
    g.beginPath();
    g.moveTo(-L * 0.34, HW * 0.26);
    g.quadraticCurveTo(-L * 0.02, HW * 1.02, L * 0.34, HW * 0.46);
    g.quadraticCurveTo(L * 0.22, HW * 0.16, L * 0.02, HW * 0.14);
    g.quadraticCurveTo(-L * 0.16, HW * 0.18, -L * 0.34, HW * 0.26);
    g.closePath(); g.fill();
    if (detail){
      g.fillStyle = pal.mem;
      g.beginPath();
      g.moveTo(L * 0.50, -HW * 0.34);
      g.lineTo(-L * 0.08, -HW * 0.06);
      g.lineTo(-L * 0.06, HW * 0.10);
      g.lineTo(L * 0.42, HW * 0.30);
      g.lineTo(L * 0.26, -HW * 0.02);
      g.closePath(); g.fill();
      g.fillStyle = pal.rock2;
      for (let i2 = 0; i2 < 3; i2++){
        const x = -L * 0.04 + i2 * L * 0.13;
        g.beginPath();
        g.moveTo(x, -HW * 0.30);
        g.lineTo(x + L * 0.055, -HW * 0.10);
        g.lineTo(x - L * 0.02, -HW * 0.14);
        g.closePath(); g.fill();
      }
      g.strokeStyle = pal.dark; g.lineWidth = 1.8; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-L * 0.30, -HW * 0.30);
      g.quadraticCurveTo(L * 0.04, -HW * 0.36, L * 0.40, -HW * 0.28);
      g.stroke();
      g.fillStyle = pal.wet2;
      g.beginPath(); g.ellipse(L * 0.34, -HW * 0.62, L * 0.085, HW * 0.11, -0.35, 0, TAU); g.fill();
    }
    g.restore();
  }

  /* 殻から出る根元の肉厚（マット）。 */
  function crabRoot(g, p, r, pal, detail){
    g.fillStyle = pal.rock2;
    g.beginPath(); g.ellipse(p.x, p.y, r, r * 0.90, 0, 0, TAU); g.fill();
    g.fillStyle = pal.rock3;
    g.beginPath(); g.ellipse(p.x + r * 0.22, p.y + r * 0.30, r * 0.66, r * 0.52, -0.3, 0, TAU); g.fill();
    if (detail){
      g.strokeStyle = pal.dark; g.lineWidth = 2.2;
      g.beginPath(); g.arc(p.x, p.y, r * 0.90, Math.PI * 1.06, Math.PI * 1.94); g.stroke();
    }
  }

  /* 部位ごとに太さを変える: 根元=肉厚 / 上腕=中ほど隆起 / 前腕=先細り / 爪=再び太い。 */
  const CRAB_MERUS_T = (t) => crabLerp(20, 13.5, t) + crabHump(t, 0.34, 0.28, 1.6);
  const CRAB_MERUS_B = (t) => crabLerp(12.5, 9, t);
  const CRAB_FORE_T  = (t) => crabLerp(15, 10, t) + crabHump(t, 0.30, 0.30, 1.0);
  const CRAB_FORE_B  = (t) => crabLerp(10.5, 7, t);
  /* 膝側だけ括る＝関節に「腰」を作る（濡れた膜が覗く） */
  const crabPinchEnd   = (f) => (t) => f(t) * (0.60 + 0.40 * Math.min(1, (1 - t) / 0.22));
  const crabPinchStart = (f) => (t) => f(t) * (0.60 + 0.40 * Math.min(1, t / 0.22));

  /* 生体の近側前脚を一式で描く（殻パスと予告パスで同じ形を共有）。 */
  /* 焼いた実体パーツを、関節ピボットで回して置く（描画と当たりは geoCrabLeg の座標で一致）。 */
  function crabLegSpriteReady(){
    return ready(crabLegArt.merus) && ready(crabLegArt.fore) && ready(crabLegArt.claw);
  }

  function crabLegPart(g, img, meta, px, py, ang){
    const s = 1 / meta.scale;
    g.save();
    g.translate(px, py);
    if (ang) g.rotate(ang);
    g.drawImage(img, -meta.pivot[0] * s, -meta.pivot[1] * s, meta.w * s, meta.h * s);
    g.restore();
  }

  function drawCrabLegSprites(g, leg, tell){
    const a1 = Math.atan2(leg.knee.y - leg.shoulder.y, leg.knee.x - leg.shoulder.x);
    const a2 = Math.atan2(leg.tip.y - leg.knee.y, leg.tip.x - leg.knee.x);
    /* 予告は照明に依らず読めるよう一段明るく（発光はしない）。 */
    const f = tell ? 'brightness(1.22) contrast(1.04)' : '';
    if (f && 'filter' in g) g.filter = f;
    crabLegPart(g, crabLegArt.merus, CRAB_LEG_META.merus, leg.shoulder.x, leg.shoulder.y, a1);
    crabLegPart(g, crabLegArt.fore, CRAB_LEG_META.fore, leg.knee.x, leg.knee.y, a2);
    crabLegPart(g, crabLegArt.claw, CRAB_LEG_META.claw, leg.tip.x, leg.tip.y, a2);
    if (f && 'filter' in g) g.filter = 'none';
  }

  function drawCrabLegRig(g, leg, pal, detail, tell){
    if (crabLegSpriteReady()){ drawCrabLegSprites(g, leg, !!tell); return; }
    /* フォールバック: 素材が読めない時だけ Canvas 図形で描く。 */
    const a2 = Math.atan2(leg.tip.y - leg.knee.y, leg.tip.x - leg.knee.x);
    crabJoint(g, leg.knee, 22, pal, leg.lifted, a2);
    crabRoot(g, leg.shoulder, 25, pal, detail);
    crabSegment(g, leg.shoulder, leg.knee, crabPinchEnd(CRAB_MERUS_T), crabPinchEnd(CRAB_MERUS_B), pal, 1.7, detail);
    crabSegment(g, leg.knee, leg.tip, crabPinchStart(CRAB_FORE_T), crabPinchStart(CRAB_FORE_B), pal, 4.3, detail);
    crabClaw(g, leg.tip, a2, GEO_CRAB.CLAW_R, pal, detail);
  }

  /* v3.8.0(隔離試作): 地層背負いの巨蟹の描画。殻は焼いた 1 枚（黒玄武岩の露頭）、
     近側前脚だけゲーム内で関節として描く（拡大した静止画だけで終えない）。
     全身・輪郭を光らせない（擬態を壊さない）。 */
  function drawGeoCrab(g, e){
    const W = GEO_CRAB.BODY_W, Hh = GEO_CRAB.BODY_H;
    g.save();
    g.translate(e.x, e.y);
    /* 撃破後は崩壊（脚が弛む）＋わずかに沈みながら消える（消えるだけにしない）。 */
    if (e.dead){
      const a = clamp((e.deadT || 0) / 1.6, 0, 1);
      g.globalAlpha = a;
      g.translate(0, (1 - a) * 26);
    }
    g.scale(e.dir < 0 ? -1 : 1, 1);
    const art = geoCrabShellArt;
    if (ready(art)){
      const h = art.naturalHeight / art.naturalWidth * W;
      g.drawImage(art, -W * 0.5, -Hh * 0.5 - (h - Hh) * 0.60, W, h);
    } else {
      g.fillStyle = '#141a24'; g.beginPath(); g.ellipse(0, 0, W * 0.5, Hh * 0.5, 0, 0, TAU); g.fill();
      g.fillStyle = '#0f141c'; g.beginPath(); g.ellipse(0, Hh * 0.34, W * 0.46, Hh * 0.20, 0, 0, TAU); g.fill();
    }
    /* 近側前脚（ローカル座標。geoCrabLeg と同じ式を共有＝描画と当たりがズレない）。 */
    const leg = geoCrabLeg({ dir: 1, x: 0, y: 0, state: e.state, st: e.st, dead: e.dead });
    drawCrabLegRig(g, leg, CRAB_LEG_PAL.shell, !e.dead, false);
    g.restore();
  }

  /* 予告は照明に消されない別パス。見えている前脚そのものを、光の当たりに関係なく
     読める明度で描く（攻撃の合図）。発光はさせない＝岩の色のまま一段明るくするだけ。
     扇・破線・着地点円は非当たり。脚は最後に描く＝琥珀の被りで潰れない。 */
  function drawGeoCrabTelegraph(g, e){
    if (e.dead || (e.state !== 'wind' && e.state !== 'swing')) return;
    const leg = geoCrabLeg(e);
    const swing = geoCrabLeg({ dir: e.dir, x: e.x, y: e.y, state: 'swing', st: 0 });
    g.save();
    if (e.state === 'wind'){
      const t = 1 - clamp(e.st / GEO_CRAB.TELL, 0, 1);
      g.globalAlpha = 0.30 + 0.30 * t + 0.10 * Math.sin(G.time * 24);
      g.beginPath();
      g.moveTo(leg.shoulder.x, leg.shoulder.y);
      g.lineTo(leg.tip.x, leg.tip.y);
      g.lineTo(swing.tip.x, swing.tip.y);
      g.closePath();
      g.globalAlpha = 0.10 + 0.10 * t;
      g.fillStyle = '#ffb457'; g.fill();
      g.globalAlpha = 0.55 + 0.30 * t + 0.10 * Math.sin(G.time * 24);
      g.strokeStyle = '#ffd79a'; g.lineWidth = 4; g.setLineDash([11, 9]);
      g.beginPath(); g.moveTo(leg.tip.x, leg.tip.y);
      g.quadraticCurveTo((leg.tip.x + swing.tip.x) / 2, Math.min(leg.tip.y, swing.tip.y) - 110, swing.tip.x, swing.tip.y);
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 0.85;
      g.strokeStyle = 'rgba(255,196,120,0.95)'; g.lineWidth = 3;
      g.beginPath(); g.arc(swing.tip.x, swing.tip.y, 20 + 14 * t, 0, TAU); g.stroke();
      g.globalAlpha = 1;
    }
    drawCrabLegRig(g, leg, CRAB_LEG_PAL.tell, true, true);
    g.restore();
  }

  /* v3.9.4: 礫鎧ガニの発射物の地形・遮蔽・画面内（既存の幾何を再利用。同フレーム内はキャッシュ）。 */
  let _geoCache = { t: null, geo: null };
  function geoNow(){
    if (_geoCache.t !== G.time){ _geoCache.t = G.time; _geoCache.geo = worldGeometry(); }
    return _geoCache.geo;
  }
  /* 弾の床: 海溝〜合流広間の深床まで見る（flareFloorY は開口の外で浅場を返すため使わない）。 */
  function gravelFloorYAt(x, y){ return trenchFloorYAt(x, createTrench(trenchAnchor()), y); }
  function gravelShotBlocked(x, y, r){
    if (pointInShapes(x, y, geoNow(), r)) return true;      /* 海溝の壁・岩棚・G.rocks */
    return (y + r) >= gravelFloorYAt(x, y);                 /* 床で止まる/破裂する */
  }
  function gravelLosBlocked(x0, y0, x1, y1){
    return !!castSegment(x0, y0, x1, y1, geoNow(), 0);       /* 岩越しに撃たない（遮蔽があれば発射しない） */
  }
  function gravelOnScreen(e){
    const m = 120;                                           /* 画面外からの狙撃をしない（カメラの遅れぶんだけ許容） */
    return e.x >= G.camX - m && e.x <= G.camX + VW + m;
  }
  function spawnGravelShot(s){
    G.ebullets.push(Object.assign({ gid: nextGid(), dead: false }, s));
    G.lights.push({ x:s.x, y:s.y, r: s.kind === 'rock' ? 130 : 90, life:0.18, max:0.18,
                    col: s.kind === 'rock' ? '#ffd08a' : '#cfeaff' });
    if (s.kind === 'rock') AU.boom(0.7); else AU.hit();
  }

  /* v3.9.2(隔離試作): 礫鎧ガニ（A/B/C）。解剖パーツを共有リグで組み立て、姿勢で動かす。
     描画と当たりは gravelCrabPose / gravelCrabClaw の同じ式を共有する（見えない当たりを作らない）。 */
  function updateGravelCrab(e, dt, p){
    /* v3.9.4: 遮蔽（岩越しを撃たない）と画面内（画面外から狙撃しない）を注入する。 */
    const env = { losBlocked: gravelLosBlocked, onScreen: gravelOnScreen };
    const ev = stepGravelCrab(e, dt, p, env);
    for (const t of ev){
      if (t === 'alert'){ AU.warp(); }
      else if (t === 'chargeStart'){ AU.alarm(); }
      else if (t && t.t === 'shot'){ spawnGravelShot(t.s); }
      else if (t === 'tell'){
        AU.alarm(); AU.setRumble(0.10);
        const c = gravelCrabClaw(e);
        for (let i = 0; i < 4; i++) part(c.tip.x, e.floorY - 6, rnd(-30, 30), rnd(-60, -8),
          { life:rnd(0.4, 0.9), max:0.9, size:rnd(2, 5), col:'rgba(150,160,168,0.4)', drag:2.0, kind:'smoke' });
      }
      else if (t === 'swingStart'){
        AU.boom(0.9); AU.setRumble(0.26); G.shake = Math.max(G.shake, 7);
        const c = gravelCrabClaw(e);
        for (let i = 0; i < 8; i++) part(c.tip.x, c.tip.y, rnd(-140, 140), rnd(-100, 50),
          { life:rnd(0.3, 0.7), max:0.7, size:rnd(3, 7), col:'rgba(175,186,196,0.4)', drag:1.8, kind:'smoke' });
      }
    }
  }

  function gravelCrabArtReady(sp){
    const a = gravelCrabArt[sp];
    if (!a) return false;
    for (const n in a) if (!ready(a[n])) return false;
    return true;
  }

  function drawGravelCrabPart(g, e, name, pose){
    const gm = gravelCrabGeom(e.species), m = gm.parts[name];
    if (!m) return;
    const img = gravelCrabArt[e.species] && gravelCrabArt[e.species][name];
    if (!ready(img)) return;
    const p = pose[name] || { dx:0, dy:0, rot:0 };
    const s = gm.scale;
    g.save();
    g.translate((m.offset[0] + m.pivot[0]) * s + (p.dx || 0), (m.offset[1] + m.pivot[1]) * s + (p.dy || 0));
    if (p.rot) g.rotate(p.rot);
    g.drawImage(img, -m.pivot[0] * s, -m.pivot[1] * s, m.w * s, m.h * s);
    g.restore();
  }

  function drawGravelCrab(g, e){
    const gm = gravelCrabGeom(e.species);
    const pose = gravelCrabPose(e);
    g.save();
    g.translate(e.x, e.y);
    if (e.dead){ const a = clamp((e.deadT || 0) / 1.4, 0, 1); g.globalAlpha = a; g.translate(0, (1 - a) * 18); }
    /* 原画は正面（手前）向きで、近い側の大鋏は画像の左にある。
       プレイヤーのいる側へ向ける＝dir > 0 のときだけ左右反転（S(flip)）。 */
    g.scale(e.dir > 0 ? -1 : 1, 1);
    if (!gravelCrabArtReady(e.species)){
      const sp = GRAVEL_CRAB_SPECIES[e.species];
      g.globalAlpha = 0.5; g.fillStyle = sp.tint;
      g.beginPath(); g.ellipse(0, 0, gm.bodyR * 0.5, gm.bodyH * 0.4, 0, 0, TAU); g.fill();
      g.restore(); return;
    }
    drawGravelCrabPart(g, e, 'legs', pose);
    drawGravelCrabPart(g, e, 'clawFar', pose);
    drawGravelCrabPart(g, e, 'carapace', pose);
    drawGravelCrabPart(g, e, 'clawNear', pose);
    g.restore();
  }

  /* 予告は照明に消されない別パス。見えている近側の鋏と、振り終わりの着地点を出す（発光はしない）。 */
  function drawGravelCrabTelegraph(g, e){
    if (e.dead) return;
    /* v3.9.4: 遠距離の無害な予備動作（口元に泡／大鋏に岩）。画面全体の予告は出さない。 */
    if (e.state === 'charge') { drawGravelCrabCharge(g, e); return; }
    if (e.state !== 'wind' && e.state !== 'swing') return;
    const sp = GRAVEL_CRAB_SPECIES[e.species];
    const cur = gravelCrabClaw(e);
    const end = gravelCrabClaw(Object.assign({}, e, { state:'swing', st:0 }));
    g.save();
    if (e.state === 'wind'){
      const t = 1 - clamp(e.st / sp.tell, 0, 1);
      g.globalAlpha = 0.10 + 0.12 * t;
      g.fillStyle = sp.tint;
      g.beginPath(); g.moveTo(cur.shoulder.x, cur.shoulder.y); g.lineTo(cur.tip.x, cur.tip.y);
      g.lineTo(end.tip.x, end.tip.y); g.closePath(); g.fill();
      g.globalAlpha = 0.55 + 0.30 * t + 0.10 * Math.sin(G.time * 24);
      g.strokeStyle = '#ffd79a'; g.lineWidth = 4; g.setLineDash([11, 9]);
      g.beginPath(); g.moveTo(cur.tip.x, cur.tip.y);
      g.quadraticCurveTo((cur.tip.x + end.tip.x) / 2, Math.min(cur.tip.y, end.tip.y) - 90, end.tip.x, end.tip.y);
      g.stroke(); g.setLineDash([]);
      g.globalAlpha = 0.85;
      g.strokeStyle = 'rgba(255,196,120,0.95)'; g.lineWidth = 3;
      g.beginPath(); g.arc(end.tip.x, end.tip.y, 18 + 12 * t, 0, TAU); g.stroke();
      g.globalAlpha = 1;
    }
    g.restore();
  }

  /* v3.9.4: 予備動作（charge）の見える化。局所だけ（画面全体の予告にしない）。
     泡は口元に溜まる／岩は大鋏の先に構える。照準の薄い破線は出るが、移動すれば避けられる。 */
  function drawGravelCrabCharge(g, e){
    const sp = GRAVEL_CRAB_SPECIES[e.species];
    if (!sp || !sp.ranged) return;
    const t = clamp((e.chargeT || 0) / Math.max(0.001, sp.chargeTime), 0, 1);
    const dir = (e.dir < 0) ? -1 : 1;
    g.save();
    if (sp.ranged === 'bubble') {
      const m = gravelCrabShotOrigin(e);
      for (let i = 0; i < 4; i++) {
        const ph = (t * 1.6 + i * 0.25) % 1;
        const r = 5 + 11 * ph;
        g.globalAlpha = (1 - ph) * 0.70 * (0.45 + 0.55 * t);
        g.fillStyle = 'rgba(214,240,255,0.92)';
        g.beginPath(); g.arc(m.x - dir * r * 0.35, m.y + r * 0.55, r, 0, TAU); g.fill();
      }
      g.globalAlpha = 0.30 + 0.28 * t;
      g.strokeStyle = 'rgba(200,235,255,0.8)'; g.lineWidth = 2; g.setLineDash([6, 7]);
      g.beginPath(); g.moveTo(m.x, m.y); g.lineTo(e.aimX, e.aimY); g.stroke(); g.setLineDash([]);
    } else {
      const c = gravelCrabClaw(e);
      const r = 11 + 9 * t;
      g.fillStyle = '#6d6155';
      g.beginPath(); g.arc(c.tip.x, c.tip.y - 8, r, 0, TAU); g.fill();
      g.fillStyle = '#8d8175';
      g.beginPath(); g.arc(c.tip.x - r * 0.3, c.tip.y - 8 - r * 0.3, r * 0.5, 0, TAU); g.fill();
      g.globalAlpha = 0.28 + 0.26 * t;
      g.strokeStyle = 'rgba(255,214,150,0.8)'; g.lineWidth = 2; g.setLineDash([6, 7]);
      g.beginPath(); g.moveTo(c.tip.x, c.tip.y); g.lineTo(e.aimX, e.aimY); g.stroke(); g.setLineDash([]);
    }
    g.globalAlpha = 1;
    g.restore();
  }

  /* v2.1.0(試作): 砲口のチャージ予告。光の当たりに依らず残す（消さない）。 */
  function drawGunnerTelegraph(g, e){
    if (!(e.st <= GUNNER_CHARGE && e.stun <= 0)) return;
    const charge = 1 - e.st / GUNNER_CHARGE;
    g.save();
    g.translate(e.x, e.y); g.scale(e.dir, 1);
    g.fillStyle = '#ffe38b'; g.shadowColor = '#ff8a50'; g.shadowBlur = 22;
    g.beginPath(); g.arc(GUNNER_MUZZLE_X, GUNNER_MUZZLE_Y, 4 + charge * 8, 0, TAU); g.fill();
    g.restore();
  }

  /* v2.1.0(試作): 「光を当てて初めて見える」深い区間の描画（低コスト Canvas2D マスク）。
     通常海域では何もしない。深い区間だけ:
       1) ライトのマスク（自艇の灯＋ツイン光条＋照明弾）を作る。
       2) 対象の敵を等倍で描き、マスクで destination-in ＝ 当たった側だけディテール。
       3) 薄いシルエット（消さない）→ 当たった側のディテール → 予告、の順で重ねる。
     画面全体を暗くするだけ／敵全身を一律に明るくするだけ／予告を消す、のいずれもしない。 */
  function drawDeepWatch(camX, camY){
    const watch = inLitWatch(G.player ? G.player.y : camY + VH * 0.5);
    if (!watch) return;
    const subs = [];
    for (const e of G.enemies){
      /* 撃破直後の巨蟹は崩壊を見せる間だけ光の対象に残す。 */
      if (e.dead && !(e.kind === 'geo_crab' && (e.deadT || 0) > 0)) continue;
      if (isBoss(e) || e.kind === 'jelly' || e.kind === 'mine') continue;
      if (e.x < camX - 260 || e.x > camX + VW + 400) continue;
      subs.push(e);
    }
    if (!subs.length) return;

    /* 1) ライトのマスク（ハーフ解像度・論理座標で描く） */
    lmctx.setTransform(1, 0, 0, 1, 0, 0);
    lmctx.globalCompositeOperation = 'source-over';
    lmctx.clearRect(0, 0, litMaskCv.width, litMaskCv.height);
    lmctx.setTransform(LIGHT_SCALE, 0, 0, LIGHT_SCALE, 0, 0);
    const p = G.player;
    if (p && p.alive){
      const px = p.x - camX, py = p.y - camY + p.tilt * 6;
      const dt2 = depthT(camY + VH * 0.5);
      const rr = lerp(385, 290, dt2);
      const gg = lmctx.createRadialGradient(px, py, 1, px, py, rr);
      gg.addColorStop(0, 'rgba(255,255,255,0.96)');
      gg.addColorStop(0.62, 'rgba(255,255,255,0.5)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      lmctx.fillStyle = gg; lmctx.beginPath(); lmctx.arc(px, py, rr, 0, TAU); lmctx.fill();
      lmctx.globalCompositeOperation = 'lighter';
      const btl = bodyTransform(p.tilt, p.bank);
      const lampL = (ready(subArt) ? LAMP_X : 40) - p.recoil * 6;
      for (const off of [-LAMP_Y, LAMP_Y]){
        lmctx.save();
        lmctx.translate(px, py); lmctx.rotate(btl.rotate); lmctx.scale(btl.squash, 1);
        lmctx.translate(lampL, off);
        lmctx.drawImage(litBeamTexture, 0, -BEAM_HALF_HEIGHT, BEAM_LENGTH + 80, BEAM_HALF_HEIGHT * 2);
        lmctx.restore();
      }
      lmctx.globalCompositeOperation = 'source-over';
    }
    lmctx.globalCompositeOperation = 'lighter';
    for (const f of flareState.flares){
      const s = flareIntensity(f);
      if (s <= 0) continue;
      /* v2.1.0(試作): 暗幕の穴（punchFlare）と同じ半径・同じ広い柔らかい減衰で揃える。 */
      const x = f.x - camX, y = f.y - camY, r = FLARE.LIGHT_R * (0.82 + 0.18 * s);
      const g = lmctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.14, 'rgba(255,255,255,' + (0.88 * (0.55 + 0.45 * s)).toFixed(3) + ')');
      g.addColorStop(0.5, 'rgba(255,255,255,' + (0.60 * (0.55 + 0.45 * s)).toFixed(3) + ')');
      g.addColorStop(0.8, 'rgba(255,255,255,' + (0.32 * (0.55 + 0.45 * s)).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      lmctx.fillStyle = g; lmctx.beginPath(); lmctx.arc(x, y, r, 0, TAU); lmctx.fill();
    }
    lmctx.globalCompositeOperation = 'source-over';

    /* 2) ディテール層（等倍で描いてマスクで切り抜く） */
    ldctx.setTransform(1, 0, 0, 1, 0, 0);
    ldctx.globalCompositeOperation = 'source-over';
    ldctx.clearRect(0, 0, litDetailCv.width, litDetailCv.height);
    ldctx.save();
    ldctx.translate(-camX, -camY);
    for (const e of subs) drawEnemyBody(ldctx, e);
    ldctx.restore();
    ldctx.globalCompositeOperation = 'destination-in';
    ldctx.drawImage(litMaskCv, 0, 0, VW, VH);
    ldctx.globalCompositeOperation = 'source-over';

    /* 3) 暗幕の後に重ねる: 薄いシルエット → 当たった側 → 予告 */
    ctx.save();
    ctx.translate(-camX, -camY);
    ctx.globalAlpha = LIT_WATCH.SILHOUETTE_ALPHA;
    for (const e of subs) drawEnemyBody(ctx, e);
    ctx.globalAlpha = 1;
    ctx.drawImage(litDetailCv, camX, camY);
    ctx.restore();
  }

  /* v2.1.0(試作): 深い区間の攻撃予告（砲口チャージ）は加算光の後に描き、光で消させない。
     予告はゲームプレイの合図なので、広く柔らかい照明より手前に残す。 */
  function drawWatchTelegraph(camX, camY){
    if (!inLitWatch(G.player ? G.player.y : camY + VH * 0.5)) return;
    ctx.save();
    ctx.translate(-camX, -camY);
    for (const e of G.enemies){
      if (e.dead) continue;
      if (e.x < camX - 260 || e.x > camX + VW + 400) continue;
      if (e.kind === 'gunner') drawGunnerTelegraph(ctx, e);
      else if (e.kind === 'hermitB') drawHermitBTelegraph(ctx, e);
      else if (e.kind === 'anemone') drawAnemoneTelegraph(ctx, e);   // v3.8.0: 白青い予告は光で消させない
      else if (e.kind === 'geo_crab') drawGeoCrabTelegraph(ctx, e);   // 予告は照明に消されない
      else if (e.kind === 'gravel_crab') drawGravelCrabTelegraph(ctx, e);   // v3.9.2: 予告は照明に消されない
    }
    ctx.restore();
  }

  function drawRock(g, r){
    g.save(); g.translate(r.x, r.y);
    const s = r.seed;
    g.beginPath();
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const a = i / n * TAU;
      const rr = r.r * (0.72 + ((Math.sin(s + i * 2.3) + 1) * 0.5) * 0.42);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 1.05;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
    const rg = g.createLinearGradient(0, -r.r, 0, r.r);
    rg.addColorStop(0, '#2a3a44'); rg.addColorStop(0.5, '#1a272f'); rg.addColorStop(1, '#0c151b');
    g.fillStyle = rg; g.fill();
    g.strokeStyle = 'rgba(110,170,195,0.22)'; g.lineWidth = 2; g.stroke();
    g.restore();
  }

  /* ------------------------------------------------------------------ *
   * 12. Render
   * ------------------------------------------------------------------ */
  const snow = [];
  for (let i = 0; i < 320; i++) snow.push({ x:rnd(0, VW), y:rnd(0, FLOOR_Y), z:rnd(0.3, 1.4), s:rnd(0.7, 2.6), ph:rnd(0, TAU) });

  // Cache sediment once; reuse it instead of allocating per-particle gradients.
  const sediment = document.createElement('canvas');
  sediment.width = 512; sediment.height = 512;
  const sedimentCtx = sediment.getContext('2d');
  let textureSeed = 79831;
  const textureRandom = () => { textureSeed = (textureSeed * 1664525 + 1013904223) >>> 0; return textureSeed / 4294967296; };
  for (let i = 0; i < 1800; i++) {
    const x = textureRandom() * 512, y = textureRandom() * 512;
    const size = 0.4 + textureRandom() * 1.7;
    sedimentCtx.fillStyle = 'rgba(180,213,214,' + (textureRandom() * 0.22).toFixed(3) + ')';
    sedimentCtx.fillRect(x, y, size, size);
  }
  function drawWaterAtmosphere(camX, camY) {
    ctx.save();
    const x = -((camX * 0.14 + G.time * 2) % 512 + 512) % 512;
    const y = -((camY * 0.1 - G.time * 4) % 512 + 512) % 512;
    ctx.globalAlpha = 0.48;
    for (let yy = y; yy < VH; yy += 512)
      for (let xx = x; xx < VW; xx += 512) ctx.drawImage(sediment, xx, yy);
    ctx.restore();
  }
  function drawHeadlightAtmosphere(camX, camY) {
    const p = G.player;
    if (!p || !p.alive) return;
    const lampX = ready(subArt) ? LAMP_X : 40;
    ctx.save();
    ctx.translate(p.x - camX, p.y - camY + p.tilt * 6);
    const bt = bodyTransform(p.tilt, p.bank);   // v1.19.0: ヘッドライトも艇と同じ姿勢
    ctx.rotate(bt.rotate);
    ctx.scale(bt.squash, 1);
    ctx.globalCompositeOperation = 'screen';
    for (const offset of [-LAMP_Y, LAMP_Y]) {
      ctx.drawImage(beamTexture, lampX - p.recoil * 6, offset - BEAM_HALF_HEIGHT,
        BEAM_LENGTH, BEAM_HALF_HEIGHT * 2);
    }
    ctx.restore();
  }

  function drawCityPlate(camX, camY, depth) {
    if (!ready(ruinsArt)) return false;
    const width = 1660, height = 920;
    const travel = camX * 0.40;
    const index = Math.floor(travel / width);
    const x = index * width - travel;
    const y = -clamp(camY * 0.14, 0, height - VH);
    ctx.save();
    ctx.globalAlpha = lerp(0.88, 0.55, depth);
    // Mirrored adjoining copies meet on the same edge at every tile boundary.
    const tiles = x + width < VW ? 2 : 1;
    for (let i = 0; i < tiles; i++) {
      ctx.save();
      const mirror = (index + i) % 2 !== 0;
      ctx.translate(x + i * width + (mirror ? width : 0), y);
      if (mirror) ctx.scale(-1, 1);
      ctx.drawImage(ruinsArt, 0, 0, width, height);
      ctx.restore();
    }
    ctx.restore();
    return true;
  }

  function drawAmbientFish(camX, camY){
    const span = VW + 460;
    ctx.fillStyle = 'rgba(113,170,191,0.33)';
    ctx.beginPath();
    for (let school = 0; school < 4; school++) {
      const travel = camX * 0.38 + G.time * (15 + school * 3);
      const x = ((school * 441 - travel) % span + span) % span - 150;
      const y = 125 + school * 142 - camY * 0.06 + Math.sin(G.time * 0.4 + school) * 24;
      for (let i = 0; i < 8; i++) {
        const px = x + i * 23;
        const py = y + Math.sin(i * 2.4 + school) * 30 + Math.sin(G.time * 1.9 + i) * 3;
        const size = 4 + (i * 3 + school) % 5;
        ctx.moveTo(px + size, py);
        ctx.ellipse(px, py, size, size * 0.36, -0.1, 0, TAU);
        ctx.moveTo(px + size * 0.6, py);
        ctx.lineTo(px + size * 1.65, py - size * 0.47);
        ctx.lineTo(px + size * 1.65, py + size * 0.47);
        ctx.closePath();
      }
    }
    ctx.fill();
  }

  function drawBackground(camX, camY){
    const dt = depthT(camY + VH * 0.5);
    /* water column gradient */
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    const blue = Math.round(lerp(52, 18, dt));
    g.addColorStop(0, 'rgb(6,' + (blue - 5) + ',' + blue + ')');
    g.addColorStop(0.48, 'rgb(4,' + Math.round(blue * 0.53) + ',' + Math.round(blue * 0.72) + ')');
    g.addColorStop(1, '#030c0d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
    const cityVisible = drawCityPlate(camX, camY, dt);

    /* surface caustics near the top */
    if (camY < 420) {
      const a = clamp(1 - camY / 420, 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        const x = ((i * 210 - camX * 0.32) % (VW + 420)) - 140;
        const w = 90 + Math.sin(G.time * 0.5 + i) * 34;
        const grd = ctx.createLinearGradient(x, -camY, x + 150, 700 - camY);
        grd.addColorStop(0, 'rgba(150,230,255,' + (0.045 * a).toFixed(3) + ')');
        grd.addColorStop(1, 'rgba(120,210,255,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(x, -camY);
        ctx.lineTo(x + w, -camY);
        ctx.lineTo(x + w + 180, 760 - camY);
        ctx.lineTo(x + 96, 760 - camY);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    /* background spires (parallax 0.55) */
    ctx.save();
    ctx.translate(-camX * 0.55, -camY * 0.72 + camY);
    ctx.fillStyle = cityVisible ? 'rgba(7,21,23,0.14)' : 'rgba(6,20,34,0.62)';
    for (const s of G.spires) {
      ctx.beginPath();
      ctx.moveTo(s.x - s.w * 0.5, s.y + s.h);
      ctx.lineTo(s.x, s.y);
      ctx.lineTo(s.x + s.w * 0.5, s.y + s.h);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    /* sunken city ruins (parallax 0.78) */
    if (!cityVisible) drawRuins(camX, camY);
    drawAmbientFish(camX, camY);

    /* 遠景のエイは幅広いひれと細い尾で見分けられる。 */
    ctx.save();
    ctx.translate(-camX * RAY_PARALLAX, -camY * RAY_PARALLAX);
    for (const s of G.silh) {
      ctx.save();
      ctx.translate(s.x, s.y);
      const w = s.width, h = s.height, flap = Math.sin(s.t * 1.55) * h * 0.23;
      ctx.fillStyle = 'rgba(103,157,181,0.24)';
      ctx.beginPath();
      ctx.moveTo(-w * 0.34, 0);
      ctx.bezierCurveTo(-w * 0.29, -h * 0.17, -w * 0.03, -h * 0.37, w * 0.33, -h + flap);
      ctx.quadraticCurveTo(w * 0.4, -h * 0.1, w * 0.16, 0);
      ctx.quadraticCurveTo(w * 0.36, h * 0.3, w * 0.23, h + flap);
      ctx.bezierCurveTo(-w * 0.02, h * 0.64, -w * 0.13, h * 0.23, -w * 0.34, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(103,157,181,0.24)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(w * 0.14, 0);
      ctx.quadraticCurveTo(w * 0.43, h * 0.15, w * 0.77, -h * 0.11 + flap);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    /* marine snow layer 1 (far) */
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#bfe9ff';
    for (const s of snow) {
      const sx = ((s.x - camX * 0.45) % (VW + 80) + VW + 80) % (VW + 80) - 40;
      const sy = ((s.y - camY * 0.55) % (FLOOR_Y) + FLOOR_Y) % (FLOOR_Y) - camY * 0.45;
      if (sy < -30 || sy > VH + 30) continue;
      ctx.globalAlpha = 0.22 * s.z;
      ctx.beginPath(); ctx.arc(sx, sy, s.s * 0.7, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* 背景と実体のあいだに一枚かけて遠景を沈める。
     これが無いと、背景を泳ぐ巨大魚のシルエットと手前の敵が同じ濃さで混ざって見分けられない */
  function drawDepthScrim(camY){
    const dt = depthT(camY + VH * 0.5);
    const a = lerp(0.14, 0.21, dt);
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, 'rgba(4,16,30,' + a.toFixed(3) + ')');
    g.addColorStop(0.5, 'rgba(2,11,22,' + (a * 1.06).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(1,7,15,' + (a * 0.9).toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
  }

  /* v1.15.0+: 弾体の外観（個体の style）。気分のみで、性能・当たり・爆風には一切影響しない。
     暗い海でも輪郭が読めるよう暗い縁取りを付ける。stock は従来の見た目そのまま。
     ctx は translate(b.x,b.y)+rotate(b.a) 済みの前提（+x が進行方向）。 */
  function drawTorpedoShot(b){
    drawTorpedoShape(ctx, b.projectile || b.style || 'stock');
  }

  function drawMissileShot(b){
    drawMissileShape(ctx, b.projectile || b.style || 'stock', b.vscale || 1, {
      burner: Number.isFinite(b.burner) ? b.burner : 0.6,
    });
  }

  function drawWorld(camX, camY, depthActive){
    ctx.save();
    ctx.translate(-camX, -camY);
    /* v2.1.0: ズームで広がった「見えている世界」の範囲。カリングと先読みに使う。 */
    const vr = visibleWorld();

    /* rocks（Depth Stacking ON 時は WebGL2 z=0 層で高精細ノーマルマップ岩として描画するため旧ベクター岩はスキップ） */
    if (!depthActive) {
      for (const r of G.rocks) if (r.x > vr.x0 - 300 && r.x < vr.x1 + 300) drawRock(ctx, r);
    }

    const trench = createTrench(trenchAnchor());

    /* sea floor（Depth Stacking ON 時は WebGL2 z=0 層で高精細海底を描画するため単色ベタ塗りはスキップ） */
    if (!depthActive && vr.y1 > FLOOR_Y - 260 && vr.y0 < FLOOR_Y + 420) {
      const drawFloorSpan = (xA, xB) => {
        if (xB <= xA) return;
        ctx.fillStyle = '#050d13';
        ctx.beginPath();
        ctx.moveTo(xA, FLOOR_Y + 400);
        for (let x = xA; x < xB; x += 40) ctx.lineTo(x, seaFloorY(x));
        ctx.lineTo(xB, seaFloorY(xB));
        ctx.lineTo(xB, FLOOR_Y + 400);
        ctx.closePath(); ctx.fill();
      };
      const fx0 = vr.x0 - 120, fx1 = vr.x1 + 240;
      if (trench && fx1 > trench.gorgeX0 && fx0 < trench.gorgeX1) {
        drawFloorSpan(fx0, Math.min(fx1, trench.gorgeX0));
        drawFloorSpan(Math.max(fx0, trench.gorgeX1), fx1);
      } else {
        drawFloorSpan(fx0, fx1);
      }
    }

    /* 海溝・深棚下の分岐・合流広間（Depth Stacking ON 時は WebGL2 側で描画、OFF 時のみフォールバック） */
    if (trench) {
      trenchView.renderTerrain(camX, camY, trench, G.time, depthActive);
    }
    /* v1.12.0: 第2前哨基地は海溝の地盤の上（地形より後・実体より前）に描く。
       地形の後に描かないと、海溝の岩盤に上書きされて見えなくなる。 */
    const b2m = base2Marker(G.baseMarker, G.bossKills);
    if (G.state === 'play' && b2m){
      ctx.save();
      ctx.translate(camX, camY); // 基地の描画 API はスクリーン座標。カメラを二重に引かない。
      base.renderDiveMarker(camX, camY, {
        marker: b2m, r: TRENCH.BASE_R, near: G.nearBase === 2,
        stage: base2Stage(G.player.x, G.player.y, b2m), time: G.time, label: '第二前哨基地 深棚',
      });
      ctx.restore();
    }

    /* pickups */
    for (const k of G.pickups) {
      ctx.save();
      ctx.translate(k.x, k.y + Math.sin(k.t * 2.4) * 4);
      if (k.kind === 'missile') {
        /* ミサイル補給＝高精細ミサイルスプライト（炎なし・斜め浮遊＋控えめな琥珀ハロー） */
        ctx.save();
        ctx.shadowColor = '#ffb14a'; ctx.shadowBlur = 14;
        ctx.rotate(-0.35);
        drawMissileShape(ctx, 'stock', 0.86, { noFlame: true });
        ctx.restore();
      } else if (k.kind === 'salvage') {
        /* v1.15.0: 回収品（武器の個体）。資源・補給とは別の物。暗い海でも形で分かるよう、
           鋼のコンテナ（角丸の箱＋青白いリム＋留め具）の中に弾の刻印。 */
        ctx.shadowColor = '#8fd8ff'; ctx.shadowBlur = 16;
        ctx.fillStyle = '#0f2733';
        roundRect(ctx, -13, -11, 26, 22, 4); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#8fd8ff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#cfefff';
        ctx.beginPath(); ctx.moveTo(-5, -4); ctx.lineTo(9, 0); ctx.lineTo(-5, 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(150,220,255,0.85)';
        ctx.fillRect(-9, -2.5, 3, 5);
        ctx.fillStyle = '#8fd8ff';
        for (const [sx, sy] of [[-10.5, -8.5], [10.5, -8.5], [-10.5, 8.5], [10.5, 8.5]]){
          ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, TAU); ctx.fill();
        }
      } else {
        /* 船体修理＝明るい緑十字そのもの（回復とすぐ分かる形）。縁取り＋控えめな発光。 */
        ctx.shadowColor = '#7dffb0'; ctx.shadowBlur = 15;
        const a = 5.5, b = 15;
        ctx.beginPath();
        ctx.moveTo(-a, -b); ctx.lineTo(a, -b); ctx.lineTo(a, -a); ctx.lineTo(b, -a);
        ctx.lineTo(b, a);   ctx.lineTo(a, a);  ctx.lineTo(a, b);  ctx.lineTo(-a, b);
        ctx.lineTo(-a, a);  ctx.lineTo(-b, a); ctx.lineTo(-b, -a); ctx.lineTo(-a, -a);
        ctx.closePath();
        ctx.fillStyle = '#8affc0';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(4,40,26,0.8)'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.fillStyle = 'rgba(235,255,244,0.92)';
        ctx.beginPath(); ctx.arc(-1.4, -1.4, 2.2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    /* enemies */
    /* v2.1.0(試作): 深い区間では、光で読ませる対象（非ボス・非jelly/mine）はここで描かない。
       暗幕の後に drawDeepWatch が「薄いシルエット＋当たった側のディテール」を描く。 */
    const litWatch = inLitWatch(G.player ? G.player.y : camY + VH * 0.5);
    for (const e of G.enemies) {
      if (e.kind === 'leviathan') { if (G.boss) drawLeviathan(ctx, e); continue; }
      if (e.kind === 'squid') { drawSquid(ctx, e); continue; }
      if (e.kind === 'jelly') { drawJelly(ctx, e); continue; }
      if (e.kind === 'mine') { drawMine(ctx, e); continue; }
      /* v3.8.0(隔離試作): 巨蟹。深い区間（litWatch）では drawDeepWatch が担当する。 */
      if (e.kind === 'geo_crab') { if (!litWatch) { drawGeoCrab(ctx, e); drawGeoCrabTelegraph(ctx, e); } continue; }
      if (e.kind === 'gravel_crab') { if (!litWatch) { drawGravelCrab(ctx, e); drawGravelCrabTelegraph(ctx, e); } continue; }   // v3.9.2
      if (e.x < vr.x0 - 260 || e.x > vr.x1 + 400) continue;
      if (litWatch) continue;
      if (e.kind === 'hermit') { drawHermit(ctx, e); continue; }
      if (e.kind === 'hermitB') { drawHermitB(ctx, e); continue; }
      if (e.kind === 'gunner') { drawGunner(ctx, e); continue; }
      if (e.kind === 'anemone') { drawAnemone(ctx, e); continue; }   // v3.8.0
      drawFish(ctx, e);
    }

    /* v2.1.0(試作): 照明弾の本体（明るい火薬の光）。暗幕の穴・加算光は別パス。 */
    for (const f of flareState.flares) drawFlareBody(ctx, f);

    /* player bullets（v1.15.0+: 個体の外観 style で形を変える。性能・当たり・爆風は不変） */
    for (const b of G.bullets) {
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(b.a);
      if (b.kind === 'missile') drawMissileShot(b);
      else drawTorpedoShot(b);
      ctx.restore();
    }
    /* enemy bullets */
    for (const b of G.ebullets) {
      ctx.save(); ctx.translate(b.x, b.y);
      /* v3.9.4: 礫鎧ガニの遠距離弾。 */
      if (b.kind === 'bubble') {
        const life0 = GRAVEL_CRAB_SHOTS.bubble.life;
        const s = clamp(b.life / life0, 0, 1);
        const rr = b.r * (0.92 + 0.08 * Math.sin(G.time * 6 + b.x * 0.03));
        const grd = ctx.createRadialGradient(-rr * 0.32, -rr * 0.36, 1, 0, 0, rr);
        grd.addColorStop(0, 'rgba(255,255,255,0.92)');
        grd.addColorStop(0.36, 'rgba(190,228,255,0.5)');
        grd.addColorStop(1, 'rgba(120,180,235,0.05)');
        ctx.globalAlpha = 0.40 + 0.45 * s;
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(224,244,255,0.72)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, rr * 0.97, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore(); continue;
      }
      if (b.kind === 'rock') {
        ctx.rotate(b.stopped ? 0 : b.a);
        ctx.fillStyle = '#6d6155';
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
          const ang = i / 7 * TAU, r2 = b.r * (i % 2 ? 0.78 : 1.0);
          i ? ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2) : ctx.moveTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8d8175';
        ctx.beginPath(); ctx.arc(-b.r * 0.24, -b.r * 0.26, b.r * 0.42, 0, TAU); ctx.fill();
        ctx.restore(); continue;
      }
      if (b.kind === 'shell') {
        ctx.rotate(b.a);
        ctx.fillStyle = '#ffb15e';
        ctx.shadowColor = '#ff9c53';
        ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.ellipse(0, 0, 15, 7, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff1c8';
        ctx.fillRect(1, -2, 10, 4);
        ctx.restore();
        continue;
      }
      ctx.fillStyle = '#c08cff';
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU + G.time * 2;
        const rr = i % 2 ? 8 : 13;
        i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    /* v1.16.0: 追加兵装のレーザー（可視経路＝実当たり。points をそのまま発光描画） */
    for (const bm of G.beams){
      const s = clamp(bm.life / bm.max, 0, 1);
      if (!bm.points || bm.points.length < 2) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const path = () => { ctx.beginPath(); for (let i = 0; i < bm.points.length; i++){ const q = bm.points[i]; i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); } ctx.stroke(); };
      ctx.strokeStyle = bm.color; ctx.globalAlpha = 0.55 * s; ctx.lineWidth = (bm.r || 3) * 3.0; path();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.globalAlpha = 0.9 * s; ctx.lineWidth = (bm.r || 3) * 0.9; path();
      ctx.restore();
    }

    /* particles (below player) */
    drawParticles(false);

    /* player */
    if (G.player && G.player.alive) drawSub(ctx, G.player);
    else if (G.player && G.state === 'dead' && G.deathT < 0.4) { /* handled by explosion */ }
    /* v1.13.0: 瞬間バリアの膜（自艇の上に重ねる。敵より手前でも読めるよう発光） */
    if (G.player && G.player.alive) drawBarrier(ctx, G.player);
    /* v1.16.0: 全自動近接の振り（選択中・潜航中のみ）。前方へ腕/刃の弧を描く。 */
    if (G.player && G.player.alive) drawMeleeSwing();

    /* particles glow layer handled later */
    ctx.restore();
  }

  /* v1.16.0: 近接の振りを見せる（当たりは melee-rules と共有。専用ボタンは無い）。
     windup/active/密着のいずれかで、前方へ発光する弧を短く出す。 */
  function drawMeleeSwing(){
    if (!G.melee) return;
    const st = G.melee.state();
    const prm = G.melee.params();
    if (!st.typeId || !prm) return;
    const active = (st.phase === 'windup' || st.phase === 'active' || st.contact);
    if (!active) return;
    const p = G.player;
    const arc = prm.arc || 0.7;
    const reach = (prm.reach || 150) * 0.82;
    const t = clamp(st.phase === 'windup' ? 0.4 : 1, 0.3, 1);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.aim);
    ctx.globalCompositeOperation = 'lighter';
    const grd = ctx.createLinearGradient(0, 0, reach, 0);
    grd.addColorStop(0, 'rgba(150,220,255,0)');
    grd.addColorStop(1, 'rgba(200,245,255,' + (0.5 * t) + ')');
    ctx.strokeStyle = grd;
    ctx.lineWidth = (prm.hitR || 24) * 0.7;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, reach, -arc, arc); ctx.stroke();
    ctx.restore();
  }

  function drawParticles(glowOnly){
    for (const q of G.parts) {
      const t = clamp(q.life / q.max, 0, 1);
      if (glowOnly ? !(q.glow > 0) : false) continue;
      ctx.save();
      ctx.globalAlpha = t;
      if (q.kind === 'smoke' || q.kind === 'ink') {
        if (glowOnly) { ctx.restore(); continue; }
        ctx.fillStyle = q.col;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.fill();
      } else if (q.kind === 'bubble') {
        if (!glowOnly) ctx.drawImage(bubbleTexture, q.x - q.size, q.y - q.size, q.size * 2, q.size * 2);
      } else if (q.kind === 'spark') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = q.col;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.4 + t * 0.9), 0, TAU); ctx.fill();
      } else if (q.kind === 'husk') {
        /* v3.7.0: 撃破破片。表示ポーズそのままの位置・大きさ・向きで切れ、その後だけ動く。 */
        if (glowOnly) { ctx.restore(); continue; }
        ctx.globalAlpha = Math.min(1, t * 2.4);
        ctx.translate(q.x, q.y); ctx.rotate(q.rot);
        if (q.flip < 0) ctx.scale(-1, 1);         /* 部位ごとの左右反転（描画と同じ基準） */
        if (q.crop) ctx.drawImage(q.img, q.crop[0], q.crop[1], q.crop[2], q.crop[3], -q.w / 2, -q.h / 2, q.w, q.h);
        else ctx.drawImage(q.img, -q.w / 2, -q.h / 2, q.w, q.h);
      } else {
        ctx.strokeStyle = q.col; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawLighting(camX, camY, depthActive){
    const p = G.player;
    const dt = depthT(camY + VH * 0.5);
    const trenchForBio = createTrench(trenchAnchor());
    const bio = sampleBiomeAt(p ? p.x : camX + VW * 0.5, p ? p.y : camY + VH * 0.5, trenchForBio);
    let base = clamp(lerp(0.18, 0.79, Math.pow(dt, 0.85)) * bio.darkMaskMul + Math.min(0.22, G.inkT * 0.09), 0, 0.985);
    if (depthActive && depthBridge) {
      const mul = clamp(depthBridge.cfg.darkMaskMul, 0, 1);
      const deepFloor = inLitWatch(p ? p.y : camY + VH * 0.5) ? Math.max(mul, 0.68 * bio.darkMaskMul) : mul;
      base *= clamp(deepFloor, 0.25, 1.0);
    }
    dctx.setTransform(LIGHT_SCALE, 0, 0, LIGHT_SCALE, 0, 0);
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, VW, VH);
    dctx.fillStyle = 'rgba(0,3,8,' + base.toFixed(3) + ')';
    dctx.fillRect(0, 0, VW, VH);

    dctx.globalCompositeOperation = 'destination-out';
    const punch = (x, y, r, strength) => {
      const g = dctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,' + strength + ')');
      g.addColorStop(0.55, 'rgba(0,0,0,' + (strength * 0.72) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g;
      dctx.beginPath(); dctx.arc(x, y, r, 0, TAU); dctx.fill();
    };
    /* v2.1.0(試作): 照明弾専用の広く柔らかい減衰。中心の強さ（＝乳白の明るさ）は据え置き、
       半径だけ広げて遠くの岩や敵まで読ませる（暗幕設定・艇ライトは不変）。 */
    const punchFlare = (x, y, r, strength) => {
      const g = dctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,' + strength + ')');
      g.addColorStop(0.12, 'rgba(0,0,0,' + (strength * 0.90) + ')');
      g.addColorStop(0.45, 'rgba(0,0,0,' + (strength * 0.66) + ')');
      g.addColorStop(0.78, 'rgba(0,0,0,' + (strength * 0.40) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g;
      dctx.beginPath(); dctx.arc(x, y, r, 0, TAU); dctx.fill();
    };

    /* v2.1.0: 暗幕はワールドと同じ投影（ズーム済み）で穴を開ける。
       ズーム時は光の位置を worldToScreen で写し、半径も z 倍する（等倍では従来どおり）。 */
    const z = zoomFactor();
    const P = (wx, wy) => worldToScreen(wx, wy);
    const punchW = (wx, wy, r, strength) => { const s = P(wx, wy); punch(s.x, s.y, r * z, strength); };
    /* v2.2.0: 照明弾の穴も同じ投影で写す（flare の位置を worldToScreen、半径を z 倍）。 */
    const punchFlareW = (wx, wy, r, strength) => { const s = P(wx, wy); punchFlare(s.x, s.y, r * z, strength); };

    if (p && p.alive) {
      const ps = P(p.x, p.y + p.tilt * 6);
      punch(ps.x, ps.y, lerp(385, 290, dt) * z, 1);
      /* ツイン・ヘッドライトの光条（船体と同じ姿勢を当てて、ライトが艇からズレないようにする） */
      const btl = bodyTransform(p.tilt, p.bank);
      const lampL = (ready(subArt) ? LAMP_X : 40) - p.recoil * 6;
      for (const off of [-LAMP_Y, LAMP_Y]) {
        dctx.save();
        dctx.translate(ps.x, ps.y); dctx.rotate(btl.rotate); dctx.scale(btl.squash * z, z);
        dctx.translate(lampL, off);
        dctx.drawImage(beamTexture, 0, -BEAM_HALF_HEIGHT, BEAM_LENGTH + 80, BEAM_HALF_HEIGHT * 2);
        dctx.restore();
      }
      /* sonar pulse reveal */
      if (p.sonarR > 0) {
        dctx.strokeStyle = 'rgba(0,0,0,' + clamp(0.9 - p.sonarR / 4.4, 0, 1) + ')';
        dctx.lineWidth = 26 * z;
        dctx.beginPath(); dctx.arc(ps.x, ps.y, p.sonarR * 210 * z, 0, TAU); dctx.stroke();
      }
    }

    /* dynamic lights punch holes in darkness */
    for (const l of G.lights) {
      const s = l.life / l.max;
      punchW(l.x, l.y, l.r * (0.6 + s * 0.6), clamp(s * 1.0, 0, 1));
    }
    /* bioluminescence of nearby creatures */
    /* v2.1.0(試作): 深い区間では、光で読ませる対象を「あらかじめ照らさない」（恒常 punch を弱める）。
       自艇の灯・照明弾が実際に当たった側だけでディテールを読ませるため。通常海域はこれまでどおり。 */
    const litWatch = inLitWatch(G.player ? G.player.y : camY + VH * 0.5);
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.kind === 'angler') punchW(e.x, e.y, 190, litWatch ? 0 : 0.85);
      else if (e.kind === 'jelly') punchW(e.x, e.y, 130, 0.5);
      else if (e.kind === 'leviathan' && G.boss) punchW(e.x, e.y, 620, 0.75);
      else if (e.kind === 'squid') punchW(e.x, e.y, 560, 0.72);
      else if (e.kind === 'mine') punchW(e.x, e.y, 60, 0.3);
      else if (e.kind === 'hermit' && e.state === 'active') punchW(e.x, e.y, 150, litWatch ? 0 : 0.55);
      else if (e.kind === 'gunner') punchW(e.x, e.y, 175, litWatch ? 0 : 0.65);
    }
    /* v2.1.0(試作): 照明弾の光（弾道に追従・有限寿命・同時点灯の上限つき）。広く柔らかく暗幕に穴を開ける。
       v2.2.0: ズーム時も穴の位置を worldToScreen で写す（punchFlareW）。 */
    for (const f of flareState.flares) {
      const s = flareIntensity(f);
      if (s <= 0) continue;
      punchFlareW(f.x, f.y, FLARE.LIGHT_R * (0.82 + 0.18 * s), 0.6 + 0.4 * s);
    }
    for (const k of G.pickups) punchW(k.x, k.y, 90, 0.7);

    /* v1.12.0: 海溝の誘導灯と発光植物（暗幕に穴。全体は照らさない）。 */
    const trench = createTrench(trenchAnchor());
    if (trench){
      for (const q of trenchView.lightPunches(trench, G.time)) punchW(q.x, q.y, q.r, q.s);
      /* v1.15.0: 海溝の軸に沿ってごく淡い明かりを足す。暗部は保ったまま、
         降下ルートと視差レイヤー（奥の崖・中距離の岩壁）の稜線が読めるようにする。 */
      const gxm = (trench.gorgeX0 + trench.gorgeX1) * 0.5;
      for (let wy = trench.wallTop + 120; wy < trench.floorY; wy += 250){
        punchW(gxm, wy, 300, 0.16);
      }
    }
    /* v1.12.0: 第2前哨基地の接岸灯（深い棚でも基地の所在が読めるよう局所の暖色）。 */
    const b2m = base2Marker(G.baseMarker, G.bossKills);
    if (b2m) punchW(b2m.x, b2m.y, 380, 0.44);

    dctx.globalCompositeOperation = 'source-over';
    if (depthActive && view.ox > 2) {
      /* ワイド画面（iPhone横持ち等）の 16:9 境界で暗幕の縦段差が出ないよう左右端を滑らかに抜く */
      dctx.globalCompositeOperation = 'destination-out';
      const edgeW = 90;
      const gl = dctx.createLinearGradient(0, 0, edgeW, 0);
      gl.addColorStop(0, 'rgba(0,0,0,1)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = gl; dctx.fillRect(0, 0, edgeW, VH);
      const gr = dctx.createLinearGradient(VW - edgeW, 0, VW, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
      dctx.fillStyle = gr; dctx.fillRect(VW - edgeW, 0, edgeW, VH);
      dctx.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(darkCv, 0, 0, VW, VH);
  }

  function drawGlowPass(camX, camY){
    ctx.save();
    ctx.translate(-camX, -camY);
    ctx.globalCompositeOperation = 'lighter';
    const vr = visibleWorld();   // v2.1.0: ズームで広がった見える範囲

    /* explosion lights */
    for (const l of G.lights) {
      const s = l.life / l.max;
      const g = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, l.r);
      g.addColorStop(0, 'rgba(255,240,200,' + (s * 0.75).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, TAU); ctx.fill();
    }
    /* v2.1.0(試作): 照明弾の加算光。中心の乳白の芯は前版と同じ大きさ・光量を維持し、
       別に「広く柔らかな散乱」を足して遠くまで薄く届かせる（重なっても白飛びしない濃度）。 */
    for (const f of flareState.flares) {
      const s = flareIntensity(f);
      if (s <= 0) continue;
      /* 広い柔らかな散乱（ピークを上げずに照射範囲だけ広げる） */
      const rw = FLARE.LIGHT_R * (0.72 + 0.28 * s);
      const gw = ctx.createRadialGradient(f.x, f.y, 1, f.x, f.y, rw);
      gw.addColorStop(0, 'rgba(255,246,228,' + (0.16 * s).toFixed(3) + ')');
      gw.addColorStop(0.4, 'rgba(255,238,208,' + (0.07 * s).toFixed(3) + ')');
      gw.addColorStop(1, 'rgba(255,226,182,0)');
      ctx.fillStyle = gw; ctx.beginPath(); ctx.arc(f.x, f.y, rw, 0, TAU); ctx.fill();
      /* 中心の乳白の芯（前版と同じ・半径も光量も据え置き） */
      const rc = 92 + 58 * s;
      const g = ctx.createRadialGradient(f.x, f.y, 1, f.x, f.y, rc);
      g.addColorStop(0, 'rgba(255,250,240,' + (0.58 * s).toFixed(3) + ')');
      g.addColorStop(0.42, 'rgba(255,238,208,' + (0.20 * s).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,226,182,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, rc, 0, TAU); ctx.fill();
    }
    /* 弾のブルーム（暗い海で弾道を読ませる） */
    for (const b of G.bullets) {
      const sx = b.x, sy = b.y;
      if (sx < vr.x0 - 60 || sx > vr.x1 + 60) continue;
      const missile = b.kind === 'missile';
      const r = missile ? (44 + 14 * (b.vscale || 1)) : 30;
      const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, r);
      g.addColorStop(0, missile ? 'rgba(255,237,201,0.75)' : 'rgba(200,248,255,0.5)');
      if (missile) g.addColorStop(0.24, 'rgba(239,85,51,0.30)');
      g.addColorStop(1, missile ? 'rgba(120,15,5,0)' : 'rgba(70,170,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
    }
    /* rings */
    for (const r of G.rings) {
      const s = r.life / r.max;
      ctx.globalAlpha = s * 0.8;
      ctx.strokeStyle = r.col; ctx.lineWidth = r.w * s + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    /* sonar ring */
    const p = G.player;
    if (p && p.sonarR > 0) {
      ctx.globalAlpha = clamp(1 - p.sonarR / 4.2, 0, 1);
      ctx.strokeStyle = '#7dffd8'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.sonarR * 210, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    /* creatures that glow in the dark (readability + dread) */
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.kind === 'angler') {
        const lx = e.x + e.dir * (24 + Math.sin(e.lure) * 8), ly = e.y - 74;
        const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, 110);
        g.addColorStop(0, 'rgba(200,255,240,0.9)');
        g.addColorStop(1, 'rgba(120,255,220,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 110, 0, TAU); ctx.fill();
        const ex = e.x - e.dir * 70, ey = e.y - 18;
        const g2 = ctx.createRadialGradient(ex, ey, 1, ex, ey, 40);
        g2.addColorStop(0, 'rgba(255,170,90,0.75)');
        g2.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(ex, ey, 40, 0, TAU); ctx.fill();
      } else if (e.kind === 'jelly') {
        const g = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, 78);
        g.addColorStop(0, 'rgba(150,255,235,0.45)');
        g.addColorStop(1, 'rgba(60,200,220,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, 78, 0, TAU); ctx.fill();
      } else if (e.kind === 'hunter' || e.kind === 'minnow') {
        const big = e.kind === 'hunter';
        const ex = e.x - e.dir * 12, ey = e.y - 6;
        const rr = big ? 42 : 20;
        const g = ctx.createRadialGradient(ex, ey, 1, ex, ey, rr);
        g.addColorStop(0, big ? 'rgba(255,135,90,0.8)' : 'rgba(255,114,82,0.62)');
        g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, rr, 0, TAU); ctx.fill();
      } else if (e.kind === 'mine') {
        const bl = 0.5 + 0.5 * Math.sin(e.t * 5);
        const g = ctx.createRadialGradient(e.x, e.y, 1, e.x, e.y, 46 * bl + 12);
        g.addColorStop(0, 'rgba(255,90,80,' + (0.35 + bl * 0.45).toFixed(2) + ')');
        g.addColorStop(1, 'rgba(255,40,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, 46 * bl + 12, 0, TAU); ctx.fill();
      }
    }
    /* boss eye glow */
    const b = G.boss;
    if (b && !b.dead) {
      if (b.kind === 'squid') {
        const rage2 = b.hp < b.maxHp * 0.45;
        const g = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, 460);
        g.addColorStop(0, rage2 ? 'rgba(255,110,110,0.30)' : 'rgba(90,220,255,0.26)');
        g.addColorStop(1, 'rgba(40,120,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, 460, 0, TAU); ctx.fill();
        const exs = 30, eys = -b.W * 0.34;
        const g2 = ctx.createRadialGradient(b.x + b.dir * exs, b.y + eys, 1, b.x + b.dir * exs, b.y + eys, 120);
        g2.addColorStop(0, 'rgba(200,250,255,0.62)');
        g2.addColorStop(1, 'rgba(60,180,255,0)');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(b.x + b.dir * exs, b.y + eys, 120, 0, TAU); ctx.fill();
      } else {
        const rage = b.hp < b.maxHp * 0.45;
        const g = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, 420);
        g.addColorStop(0, rage ? 'rgba(255,80,80,0.32)' : 'rgba(255,190,110,0.20)');
        g.addColorStop(1, 'rgba(255,140,60,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, 420, 0, TAU); ctx.fill();
      }
    }
    /* player headlight + thruster bloom */
    if (p && p.alive) {
      const lampX = (ready(subArt) ? LAMP_X : 40) - p.recoil * 6;
      for (const off of [-LAMP_Y, LAMP_Y]) {
        const w = bodyWorld(p, lampX, off);     // v1.19.0: 発光も艇の姿勢に載せる
        const hx = w.x, hy = w.y;
        const hg = ctx.createRadialGradient(hx, hy, 1, hx, hy, 56);
        hg.addColorStop(0, 'rgba(255,242,205,0.58)');
        hg.addColorStop(0.34, 'rgba(234,205,135,0.16)');
        hg.addColorStop(1, 'rgba(255,185,80,0)');
        ctx.fillStyle = hg; ctx.fillRect(hx - 56, hy - 56, 112, 112);
      }
      /* スラスター排気（青白） */
      const thr = 0.18 + p.thrust * 0.7;
      const tail = ready(subArt) ? 69 : 56;
      const bw = bodyWorld(p, -tail, 0);
      const bx = bw.x, by = bw.y;
      const br = 38 + thr * 78;
      const tg = ctx.createRadialGradient(bx, by, 2, bx, by, br);
      tg.addColorStop(0, 'rgba(200,240,255,' + (0.22 + thr * 0.45).toFixed(2) + ')');
      tg.addColorStop(1, 'rgba(60,150,255,0)');
      ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
    }
    drawParticles(true);
    /* v1.12.0: 海溝の誘導灯・発光植物（加算）。 */
    const trench = createTrench(trenchAnchor());
    if (trench) trenchView.renderGlow(camX, camY, trench, G.time);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ------------------------------------------------------------------ *
   * 13. HUD
   * ------------------------------------------------------------------ */
  function roundRect(g, x, y, w, h, r){
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function bar(g, x, y, w, h, v, c1, c2, label){
    g.fillStyle = 'rgba(8,18,26,0.72)';
    roundRect(g, x, y, w, h, h / 2); g.fill();
    g.strokeStyle = 'rgba(150,210,235,0.35)'; g.lineWidth = 1.5; g.stroke();
    const gr = g.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr;
    roundRect(g, x + 2, y + 2, Math.max(0, (w - 4) * clamp(v, 0, 1)), h - 4, (h - 4) / 2); g.fill();
    if (label) {
      g.fillStyle = 'rgba(230,250,255,0.92)';
      g.font = 'bold 15px "Yu Gothic UI","Hiragino Sans",sans-serif';
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(label, x + 10, y + h / 2 + 1);
    }
  }

  /* v3.11.0: 大深度・海流回廊のスピード＆爽快感演出（スピード線＋高速深度カウントアップ） */
  function drawCorridorOverlay(){
    if (corridorRush <= 0.02 || !G.player) return;
    ctx.save();
    ctx.globalAlpha = corridorRush;
    ctx.globalCompositeOperation = 'lighter';
    const dir = corridorDir || 1;
    // 画面を縦に駆け抜ける高速水流スピード線
    for (let i = 0; i < 26; i++){
      const seed = (i * 197 + 31) % 1000;
      const sx = (seed / 1000) * VW;
      const spd = 1150 + (i % 5) * 260;
      const rawY = ((G.t * spd * -dir + i * 173) % (VH + 240) + (VH + 240)) % (VH + 240) - 120;
      const len = 72 + (i % 4) * 34;
      const col = (dir > 0) ? 'rgba(110,235,255,0.42)' : 'rgba(255,222,135,0.42)';
      const grad = ctx.createLinearGradient(sx, rawY - len * 0.5, sx, rawY + len * 0.5);
      grad.addColorStop(0, 'rgba(120,235,255,0)');
      grad.addColorStop(0.5, col);
      grad.addColorStop(1, 'rgba(120,235,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = (i % 3 === 0) ? 3.2 : 1.8;
      ctx.beginPath();
      ctx.moveTo(sx, rawY - len * 0.5);
      ctx.lineTo(sx, rawY + len * 0.5);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    // 高速深度カウントアップ表示（m → km 切替のカタルシスを正面下部やや上に控えめに表示）
    const dText = formatDepthDisplay(G.player.y);
    const dirLabel = dir > 0 ? '▼ 大深度・下降海流' : '▲ 上昇海流リフト';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(4,16,26,0.68)';
    roundRect(ctx, VW * 0.5 - 148, VH - 144, 296, 56, 14); ctx.fill();
    ctx.strokeStyle = dir > 0 ? 'rgba(110,232,255,0.72)' : 'rgba(255,216,120,0.72)';
    ctx.lineWidth = 1.8; ctx.stroke();
    ctx.font = 'bold 14px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = dir > 0 ? '#8ef0ff' : '#ffe29a';
    ctx.fillText(dirLabel, VW * 0.5, VH - 128);
    ctx.font = 'bold 26px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = '#f2fbff';
    ctx.fillText('DEPTH ' + dText, VW * 0.5, VH - 103);
    ctx.restore();
  }

  /* v3.11.0: ノンストップ無線会話バー（時間停止なし・操作を一切妨げない上部中央コンパクト表示） */
  function drawRadioChat(){
    const v = radioChat.view();
    if (!v || v.alpha <= 0.01) return;
    const faceMap = {
      girl_neutral: girlNeutralArt, girl_smug: girlSmugArt,
      girl_surprised: girlSurprisedArt, girl_sad: girlSadArt,
      ponco_neutral: poncoNeutralArt, ponco_alert: poncoAlertArt,
      gem_neutral: gemNeutralArt,
    };
    const img = faceMap[v.face];
    const w = 620, h = 74;
    const x = Math.round((VW - w) * 0.5), y = 12;
    ctx.save();
    ctx.globalAlpha = v.alpha;
    ctx.fillStyle = 'rgba(6, 16, 24, 0.82)';
    roundRect(ctx, x, y, w, h, 14); ctx.fill();
    ctx.strokeStyle = v.accent;
    ctx.globalAlpha = v.alpha * 0.65;
    ctx.lineWidth = 1.6; ctx.stroke();
    ctx.globalAlpha = v.alpha;

    // 話者ポートレート（角丸 56x56）
    const px = x + 10, py = y + 9, ps = 56;
    ctx.save();
    roundRect(ctx, px, py, ps, ps, 10); ctx.clip();
    ctx.fillStyle = 'rgba(12, 26, 36, 0.92)';
    ctx.fillRect(px, py, ps, ps);
    if (ready(img)) {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const sc = Math.max(ps / iw, ps / ih);
      ctx.drawImage(img, px + (ps - iw * sc) * 0.5, py + (ps - ih * sc) * 0.12, iw * sc, ih * sc);
    }
    ctx.restore();

    // 話者名＋台詞（2行まで自動折り返し）
    const tx = px + ps + 14;
    const maxW = x + w - tx - 16;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = v.accent;
    ctx.fillText(v.name, tx, y + 20);

    ctx.font = '16px "Yu Gothic UI","Hiragino Sans",sans-serif';
    ctx.fillStyle = '#eef8ff';
    const chars = Array.from(v.text);
    let line1 = '', line2 = '';
    for (const ch of chars) {
      if (!line2 && ctx.measureText(line1 + ch).width <= maxW) line1 += ch;
      else line2 += ch;
    }
    if (line2) {
      ctx.fillText(line1, tx, y + 40);
      ctx.fillText(line2, tx, y + 59);
    } else {
      ctx.fillText(line1, tx, y + 46);
    }
    ctx.restore();
  }

  function drawHUD(){
    const p = G.player;
    ctx.save();
    ctx.textBaseline = 'middle';

    /* top-left: エリー顔＋最小限の戦闘ステータスを左上の端っこへコンパクトに詰める */
    if (p) {
      const pilot = p.hurtT > 0 && ready(pilotHurtArt) ? pilotHurtArt : pilotArt;
      ctx.save();
      const bx0 = 12, by0 = 10;
      if (ready(pilot)) {
        roundRect(ctx, bx0, by0, 62, 64, 9);
        ctx.save();
        ctx.clip();
        const screen = ctx.createLinearGradient(bx0, by0, bx0 + 62, by0 + 64);
        screen.addColorStop(0, '#143547'); screen.addColorStop(1, '#07131c');
        ctx.fillStyle = screen; ctx.fillRect(bx0, by0, 62, 64);
        ctx.drawImage(pilot, bx0, by0 + 2, 62, 62 * pilot.naturalHeight / pilot.naturalWidth);
        ctx.restore();
        ctx.strokeStyle = p.hurtT > 0 ? '#ff9c80' : 'rgba(150,210,235,0.48)';
        ctx.lineWidth = 1.5; ctx.stroke();
        ctx.translate(70, 0);
      }
      const hpv = p.hp / p.maxHp;
      bar(ctx, bx0, by0, 214, 20, hpv, hpv > 0.5 ? '#42e08b' : (hpv > 0.25 ? '#ffcc44' : '#ff4d4d'),
          hpv > 0.5 ? '#1f9e6a' : '#e0574a', Math.max(0, Math.round(p.hp)) + '%');
      bar(ctx, bx0, by0 + 25, 134, 14, 1 - p.heat, p.over ? '#ff5a3c' : '#61d6ff', '#2f7fd6',
          p.over ? '過熱' : '');
      /* ミサイル残弾（コンパクト表示） */
      ctx.fillStyle = 'rgba(8,18,26,0.72)';
      roundRect(ctx, bx0 + 140, by0 + 22, 74, 20, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(255,177,74,0.42)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd58a'; ctx.font = 'bold 12px "Yu Gothic UI",sans-serif';
      ctx.fillText('M ' + p.missiles + '/' + p.maxMissiles, bx0 + 177, by0 + 33);

      /* ソナー（細いゲージのみ） */
      const sr = 1 - p.sonarCd / 5.0;
      ctx.fillStyle = 'rgba(8,18,26,0.68)';
      roundRect(ctx, bx0, by0 + 46, 108, 12, 6); ctx.fill();
      ctx.fillStyle = sr >= 1 ? '#8affd0' : 'rgba(120,180,200,0.48)';
      roundRect(ctx, bx0 + 2, by0 + 48, 104 * clamp(sr, 0, 1), 8, 4); ctx.fill();
      ctx.restore();
    }

    /* 右上の詳細テキスト（深度・圧力・資源・装備・信号・縮尺）は統合「☰ メニュー」へ格納し、景色を妨げない */

    /* combo */
    if (G.combo > 1) {
      ctx.textAlign = 'center';
      ctx.globalAlpha = clamp(G.comboT / 1.6, 0, 1);
      ctx.font = 'bold ' + (28 + Math.min(20, G.combo)) + 'px "Yu Gothic UI",sans-serif';
      ctx.fillStyle = '#ff9ad5';
      ctx.fillText('COMBO ×' + G.combo, VW * 0.5, 60);
      ctx.globalAlpha = 1;
    }

    /* boss bar */
    const b = G.boss;
    if (b && !b.dead) {
      const w = VW * 0.56, x = (VW - w) / 2, y = VH - 74;
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px "Yu Gothic UI",sans-serif';
      ctx.fillStyle = b.kind === 'squid' ? '#cfe8ff' : '#ffd0d0';
      ctx.fillText(b.kind === 'squid' ? 'COLOSSAL SQUID — 巨大イカ' : 'LEVIATHAN — 巨大深海魚', VW / 2, y - 16);
      const bv = clamp(b.hp / b.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(10,4,8,0.8)';
      roundRect(ctx, x, y, w, 20, 10); ctx.fill();
      ctx.strokeStyle = b.kind === 'squid' ? 'rgba(140,210,255,0.6)' : 'rgba(255,140,140,0.6)';
      ctx.lineWidth = 2; ctx.stroke();
      const gr = ctx.createLinearGradient(x, 0, x + w, 0);
      if (b.kind === 'squid') { gr.addColorStop(0, '#8ad4ff'); gr.addColorStop(1, '#2a4fd0'); }
      else { gr.addColorStop(0, '#ff8a5c'); gr.addColorStop(1, '#c81e4a'); }
      ctx.fillStyle = gr;
      roundRect(ctx, x + 2, y + 2, Math.max(0, (w - 4) * bv), 16, 8); ctx.fill();
    }

    /* warning banner */
    if (G.warnT > 0) {
      ctx.globalAlpha = clamp(G.warnT, 0, 1) * (0.6 + 0.4 * Math.sin(G.time * 12));
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px "Yu Gothic UI",sans-serif';
      ctx.fillStyle = '#ff5a4a';
      ctx.fillText(G.warnMsg, VW / 2, VH * 0.24);
      ctx.globalAlpha = 1;
    }

    /* touch UI */
    if (Input.mode === 'touch' && G.state === 'play') drawTouchUI();

    /* target reticle */
    const tgt = Input.mode === 'touch' ? lockTarget() : null;
    if (tgt) {
      const ts = worldToScreen(enemyAimX(tgt), tgt.y);   // v2.1.0: ズーム時も同じ投影で合わせる
      const sx = ts.x, sy = ts.y;
      if (tgt.kind === 'leviathan' || tgt.kind === 'squid') {
        /* v1.8.1: ボスは頭のそばの小さな中立色ブラケット。当たり判定はシルエット側で、
           この表示はただの目印（遠くを囲う大きな赤い円は出さない）。 */
        const flip = tgt.dir < 0 ? -1 : 1;
        const cx = sx + flip * (tgt.kind === 'leviathan' ? -180 : 40);
        const rr = 44;
        ctx.strokeStyle = 'rgba(190,236,255,0.9)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a0 = i * TAU / 4 + 0.55;
          ctx.moveTo(cx + Math.cos(a0) * rr, sy + Math.sin(a0) * rr);
          ctx.arc(cx, sy, rr, a0, a0 + TAU / 4 - 1.1);
        }
        ctx.stroke();
        ctx.fillStyle = 'rgba(190,236,255,0.9)';
        ctx.beginPath(); ctx.arc(cx, sy, 2.6, 0, TAU); ctx.fill();
      } else {
        const rr = tgt.r + 16;
        ctx.strokeStyle = 'rgba(255,120,90,0.75)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, rr, 0, TAU); ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const a = G.time * 2 + i * TAU / 4;
          ctx.beginPath();
          ctx.moveTo(sx + Math.cos(a) * (rr + 3), sy + Math.sin(a) * (rr + 3));
          ctx.lineTo(sx + Math.cos(a) * (rr + 12), sy + Math.sin(a) * (rr + 12));
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  function drawTouchUI(){
    const p = G.player;
    ctx.save();
    /* buttons */
    for (const b of Input.ui) {
      if (b.id === 'pause' && G.state !== 'play') continue;
      let ready = 1;
      if (b.id === 'sonar' && p) ready = 1 - p.sonarCd / 5.0;
      if (b.id === 'dash' && p && p.barrier) ready = barrierReadyProgress(p.barrier);
      if (b.id === 'missile' && p) ready = clamp(p.missiles / 3, 0, 1);
      ctx.globalAlpha = 0.62;
      ctx.fillStyle = 'rgba(6,18,26,0.55)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = ready >= 1 ? b.col : 'rgba(120,160,180,0.5)';
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 2, 0, TAU); ctx.stroke();
      if (ready < 1) {
        ctx.strokeStyle = b.col; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 2, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(ready, 0, 1)); ctx.stroke();
      }
      if (b.id === 'fire') {
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = b.col;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 4, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 0.9;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(b.r * 0.36) + 'px "Yu Gothic UI",sans-serif';
      ctx.fillStyle = ready >= 1 ? '#eafcff' : 'rgba(180,205,220,0.55)';
      if (b.id === 'pause') ctx.fillText('❚❚', b.x, b.y);
      else if (b.id === 'missile') ctx.fillText('ミサ\nイル', b.x, b.y);
      else ctx.fillText(b.label, b.x, b.y + 1);
      if (b.id === 'missile' && p) {
        ctx.font = 'bold 20px "Yu Gothic UI",sans-serif';
        ctx.fillStyle = '#ffb14a';
        ctx.fillText('×' + p.missiles + '/' + p.maxMissiles, b.x, b.y + b.r * 0.55);
      }
    }
    /* joystick */
    const s = Input.stick;
    if (s.active) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = 'rgba(160,225,255,0.75)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.ox, s.oy, s.r, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(120,220,255,0.28)';
      ctx.beginPath(); ctx.arc(s.ox, s.oy, s.r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(190,245,255,0.85)';
      ctx.beginPath(); ctx.arc(s.ox + s.dx * s.r, s.oy + s.dy * s.r, 30, 0, TAU); ctx.fill();
    } else {
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = 'rgba(160,225,255,0.8)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(190, VH - 150, 78, 0, TAU); ctx.stroke();
      ctx.textAlign = 'center'; ctx.font = 'bold 15px "Yu Gothic UI",sans-serif';
      ctx.fillStyle = 'rgba(190,240,255,0.9)';
      ctx.fillText('ここをドラッグで移動', 190, VH - 150);
    }
    ctx.restore();
  }

  /* v3.6.0: マップ・縮尺・船内・Depth・もどるは左上の統合 DOM「☰ メニュー」へ集約したため
     Canvas 側の小さい上部ボタンは描かない。 */
  function drawDiveControls(){}

  /* ------------------------------------------------------------------ *
   * 14. Screens
   * ------------------------------------------------------------------ */
  /* v1.19.0: タイトルの「物語をもう一度」ボタン（右下。潜航開始のタップとは別の入口）。 */
  const REWATCH = { x: VW - 278, y: VH - 58, w: 248, h: 44 };

  function drawTitle(){
    ctx.save();
    ctx.fillStyle = 'rgba(0,6,14,0.72)';
    ctx.fillRect(0, 0, VW, VH);

    const hasPilot = ready(pilotTitleArt);
    const titleX = hasPilot ? 790 : VW / 2;
    if (hasPilot) {
      const w = 370, h = w * pilotTitleArt.naturalHeight / pilotTitleArt.naturalWidth;
      const halo = ctx.createRadialGradient(232, 456, 36, 232, 456, 290);
      halo.addColorStop(0, 'rgba(32,131,164,0.38)');
      halo.addColorStop(1, 'rgba(15,76,113,0)');
      ctx.fillStyle = halo; ctx.fillRect(0, 150, 520, VH - 150);
      ctx.drawImage(pilotTitleArt, 47, VH - h, w, h);
    }
    const bob = Math.sin(G.time * 1.4) * 4;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    ctx.font = 'bold 20px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = 'rgba(140,215,255,0.75)';
    ctx.fillText('スマホゲーム工房  presents', titleX, 128 + bob);

    ctx.font = 'bold 88px "Yu Gothic UI",sans-serif';
    const tg = ctx.createLinearGradient(0, 170, 0, 260);
    tg.addColorStop(0, '#dffaff'); tg.addColorStop(0.5, '#61d6ff'); tg.addColorStop(1, '#1a6fa8');
    ctx.fillStyle = tg;
    ctx.fillText('ABYSS DIVE', titleX, 205 + bob);

    ctx.font = 'bold 40px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = '#9fe8ff';
    ctx.fillText('深 淵 潜 航', titleX, 272 + bob);

    ctx.font = '17px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = 'rgba(175,220,245,0.85)';
    const ly = 348;
    const lines = [
      '【キーボード／マウス】  照準＝マウス   移動＝WASD・矢印   魚雷＝左クリック / J（1発ずつ）',
      'ミサイル＝右クリック / K    瞬間バリア＝SPACE    ソナー＝SHIFT    P＝停止  M＝消音',
      '【スマホ】  左側ドラッグ＝移動   画面タップ／「撃つ」＝魚雷   右のボタン＝ミサイル・バリア・ソナー'
    ];
    lines.forEach((s, i) => ctx.fillText(s, titleX, ly + i * 30, hasPilot ? 840 : VW - 80));

    ctx.font = 'bold 26px "Yu Gothic UI",sans-serif';
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(G.time * 3.4);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('▶ タップ / クリックで潜航開始', titleX, 486);
    ctx.globalAlpha = 1;

    ctx.font = '15px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = 'rgba(150,200,225,0.7)';
    ctx.fillText('最深部に眠る巨大生物に注意。ソナーは常に鳴らせ。', titleX, 528);

    /* v1.19.0: 冒頭ストーリーの再視聴（任意。潜航開始とは別の小さな入口） */
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(8,22,34,0.66)';
    ctx.fillRect(REWATCH.x, REWATCH.y, REWATCH.w, REWATCH.h);
    ctx.strokeStyle = 'rgba(140,200,235,0.5)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(REWATCH.x + 0.5, REWATCH.y + 0.5, REWATCH.w - 1, REWATCH.h - 1);
    ctx.fillStyle = '#bcd8ea';
    ctx.font = '600 20px "Yu Gothic UI","Hiragino Sans",system-ui,sans-serif';
    ctx.fillText('↺ 物語をもう一度', REWATCH.x + REWATCH.w / 2, REWATCH.y + REWATCH.h / 2 + 1);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawDead(){
    ctx.save();
    ctx.fillStyle = 'rgba(8,0,2,' + clamp(0.35 + G.deathT * 0.35, 0, 0.85) + ')';
    ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 76px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = '#ff4d4d';
    ctx.fillText('船 体 崩 壊', VW / 2, 250);
    ctx.font = 'bold 22px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = 'rgba(220,240,255,0.9)';
    ctx.fillText('HULL BREACH — 深度 ' + Math.round((G.player ? G.player.y : 0) / 2.6) + ' m', VW / 2, 312);
    ctx.font = 'bold 44px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('資源  ' + ledger.total().toLocaleString(), VW / 2, 386);
    ctx.font = 'bold 20px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = 'rgba(190,225,245,0.85)';
    ctx.fillText('撃破 ' + G.kills + ' 体   巨獣 ' + G.bossKills + ' 体   航行 ' + Math.round(G.dist / 10) + ' m', VW / 2, 428);
    ctx.font = 'bold 24px "Yu Gothic UI",sans-serif';
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(G.time * 3.6);
    ctx.fillStyle = '#8affd0';
    ctx.fillText('タップ / R キーで再潜航', VW / 2, 500);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawPause(){
    ctx.save();
    ctx.fillStyle = 'rgba(0,6,14,0.7)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 56px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = '#9fe8ff';
    ctx.fillText('一時停止', VW / 2, VH / 2 - 30);
    ctx.font = '20px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = 'rgba(190,225,245,0.85)';
    ctx.fillText('P / ESC / ❚❚ で再開', VW / 2, VH / 2 + 40);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ *
   * 15. Render pipeline
   * ------------------------------------------------------------------ */
  /* v3.11.0: 大深度・海流回廊（下降／上昇）の入口＆水流シェブロン表示（ワールド座標） */
  function drawCorridorGuides(camX, camY){
    const t = createTrench(trenchAnchor());
    if (!t || !t.corridors) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const c of t.corridors){
      const cx = (c.x0 + c.x1) * 0.5 - camX;
      if (cx < -500 || cx > VW + 500) continue;
      const w = (c.x1 - c.x0) * 0.34;
      const down = c.dir > 0;
      const col = down ? 'rgba(92,232,255,' : 'rgba(255,216,124,';
      for (let i = 0; i < 8; i++){
        const ph = ((G.t * 0.85 * c.dir + i / 8) % 1 + 1) % 1;
        const wy = c.y0 - 40 + ph * (c.y1 - c.y0 + 80);
        const sy = wy - camY;
        if (sy < -140 || sy > VH + 140) continue;
        const a = Math.sin(ph * Math.PI) * 0.55;
        ctx.strokeStyle = col + a.toFixed(3) + ')';
        ctx.lineWidth = 4;
        ctx.beginPath();
        const tip = down ? 26 : -26;
        ctx.moveTo(cx - w, sy - tip * 0.5);
        ctx.lineTo(cx, sy + tip * 0.5);
        ctx.lineTo(cx + w, sy - tip * 0.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawImpactMarkers(camX, camY){
    ctx.save();
    ctx.lineCap = 'round';
    for (const hit of G.impacts) {
      const x = hit.x - camX, y = hit.y - camY;
      const outer = lerp(21, 14, hit.life / 0.26);
      ctx.globalAlpha = Math.min(1, hit.life / 0.11);
      ctx.beginPath();
      for (const dx of [-1, 1]) {
        for (const dy of [-1, 1]) {
          ctx.moveTo(x + dx * 6, y + dy * 6);
          ctx.lineTo(x + dx * outer, y + dy * outer);
        }
      }
      ctx.strokeStyle = '#39200c'; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = '#fff0b8'; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
  }

  function buildDepthSnapshot(camX, camY, suspend){
    const z = zoomFactor();
    const anc = zoomAnchor();
    const viewW = Math.max(VW, view.cssW / Math.max(0.1, view.scale));
    const viewH = Math.max(VH, view.cssH / Math.max(0.1, view.scale));
    const camCenterX = camX + anc.x + (VW * 0.5 - anc.x) / z - G.shakeX / z;
    const camCenterY = camY + anc.y + (VH * 0.5 - anc.y) / z - G.shakeY / z;
    const p = G.player;
    const bt = (p && p.alive) ? bodyTransform(p.tilt, p.bank) : { rotate: 0 };

    const flares = [];
    for (const f of flareState.flares) {
      const s = flareIntensity(f);
      if (s > 0.01) flares.push({ x: f.x, y: f.y, intensity: s });
    }
    const lights = [];
    for (const l of G.lights) {
      if (l.life > 0 && l.max > 0) lights.push({ x: l.x, y: l.y, r: l.r, strength: clamp(l.life / l.max, 0, 1) });
    }
    const bioLights = [];
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.kind === 'jelly') bioLights.push({ x: e.x, y: e.y, r: 220, color: [0.30, 0.92, 1.0], intensity: 0.65 });
      else if (e.kind === 'angler') bioLights.push({ x: e.x, y: e.y, r: 260, color: [0.55, 0.96, 0.85], intensity: 0.72 });
      else if (e.kind === 'leviathan' && G.boss) bioLights.push({ x: e.x, y: e.y, r: 520, color: [0.28, 0.82, 1.0], intensity: 0.85 });
      else if (e.kind === 'squid') bioLights.push({ x: e.x, y: e.y, r: 420, color: [0.42, 0.88, 1.0], intensity: 0.75 });
    }
    const b2m = base2Marker(G.baseMarker, G.bossKills);
    if (b2m) bioLights.push({ x: b2m.x, y: b2m.y, r: 380, color: [1.0, 0.78, 0.42], intensity: 0.75 });

    return {
      suspend,
      camCenterX,
      camCenterY,
      zoom: z,
      viewW,
      viewH,
      vw: VW,
      vh: VH,
      worldTime: G.time,
      depthT: depthT(camY + VH * 0.5),
      floorY: FLOOR_Y,
      trench: createTrench(trenchAnchor()),
      rocks: G.rocks,
      player: p ? { alive: p.alive, x: p.x, y: p.y + p.tilt * 6, rotate: bt.rotate } : null,
      flares,
      lights,
      bioLights,
    };
  }

  function render(){
    const camX = G.camX, camY = G.camY;
    const suspendDepth = (G.state === 'intro' || G.baseOn || G.exploreOn);
    const depthSnap = depthBridge ? buildDepthSnapshot(camX, camY, suspendDepth) : null;
    const depthActive = !!(depthBridge && depthBridge.renderBackground(depthSnap));

    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    if (depthActive) {
      ctx.clearRect(0, 0, view.cssW, view.cssH);
    } else {
      ctx.fillStyle = '#000308';
      ctx.fillRect(0, 0, view.cssW, view.cssH);
    }

    /* v1.19.0: 冒頭ストーリーは 1 枚まるごと導入モジュールが描く（潜航の描画には入らない） */
    if (G.state === 'intro') {
      ctx.save();
      ctx.translate(view.ox, view.oy);
      ctx.scale(view.scale, view.scale);
      ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
      intro.render();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(view.ox + G.shakeX * view.scale, view.oy + G.shakeY * view.scale);
    ctx.scale(view.scale, view.scale);
    ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();

    if (!depthActive) {
      drawBackground(camX, camY);
      drawDepthScrim(camY);
      drawWaterAtmosphere(camX, camY);
    }
    const bp = G.player;
    const b1m = G.baseMarker;
    const b2m = base2Marker(G.baseMarker, G.bossKills);   // v1.12.0: 海溝の第2基地
    const baseView = G.state === 'play' && b1m ? {
      marker: b1m, r: DIVE_BASE.r, near: G.nearBase === 1,
      stage: baseStage(bp.x, bp.y, b1m), time: G.time,
    } : null;
    const base2View = G.state === 'play' && b2m ? {
      marker: b2m, r: TRENCH.BASE_R, near: G.nearBase === 2,
      stage: base2Stage(bp.x, bp.y, b2m), time: G.time, label: '第二前哨基地 深棚',
    } : null;

    /* v2.1.0: ワールド本体（地形・艇・弾・敵予告・基地・灯）は潜航ズームの投影で描く。
       遠景の背景・海雪・暗幕・ビネット・HUD は画面固定のまま。等倍（z=1）では従来と一致。 */
    ctx.save(); applyZoomTransform();
    // 建物は背景。接岸直前でも自艇・敵・射出した弾を隠さない。
    if (baseView) base.renderDiveMarker(camX, camY, baseView);
    drawWorld(camX, camY, depthActive);
    ctx.restore();

    drawLighting(camX, camY, depthActive);   // 画面固定（暗幕）。穴の位置だけズームへ写す。

    ctx.save(); applyZoomTransform();
    drawHeadlightAtmosphere(camX, camY);
    /* v2.1.0(試作): 深い区間だけ「光を当てて初めて見える」描画を重ねる（通常海域は素通り）。 */
    drawDeepWatch(camX, camY);
    drawGlowPass(camX, camY);
    /* v2.1.0(試作): 攻撃予告は加算光より後に重ねて、広い照明でも消えないようにする。 */
    drawWatchTelegraph(camX, camY);

    /* v1.6.0 徒歩探索の入口マーカー（潜航の描画関数には触れず、上へ1つ足すだけ） */
    if (G.state === 'play') explore.renderDiveEntrance(camX, camY, {
      x: DIVE_ENTRANCE.x, y: DIVE_ENTRANCE.y, r: DIVE_ENTRANCE.r, near: G.entranceNear,
    });

    if (baseView) base.renderDiveMarker(camX, camY, baseView, true);
    if (base2View) base.renderDiveMarker(camX, camY, base2View, true);

    /* v1.12.0: 海溝の下り口のラベル（近づいたときだけ） */
    if (G.state === 'play'){
      const trench = createTrench(trenchAnchor());
      if (trench) trenchView.renderLabel(camX, camY, trench, trenchStage(bp.x, bp.y, trench), G.time);
    }
    ctx.restore();

    /* Depth Stacking 前景レイヤー（操作層より手前・HUD より奥） */
    if (depthActive && depthBridge) {
      depthBridge.renderForeground(ctx, depthSnap);
    }

    /* vignette (Depth Stacking ON時はWebGL2側で全画面シームレスヴィネットを描くため二重描画を省略) */
    if (!depthActive) {
      const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VH * 0.95);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.72)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
    }

    /* flashes */
    if (G.flash > 0) { ctx.fillStyle = 'rgba(255,240,210,' + (G.flash * 0.55).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); }
    if (G.hurtFlash > 0) {
      const hg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.2, VW / 2, VH / 2, VH * 0.8);
      hg.addColorStop(0, 'rgba(255,0,0,0)');
      hg.addColorStop(1, 'rgba(255,30,30,' + (G.hurtFlash * 0.55).toFixed(3) + ')');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, VW, VH);
    }

    if (G.state === 'title') drawTitle();
    else {
      /* v2.1.0: 命中マークもワールド投影（ズーム）で描く。 */
      ctx.save(); applyZoomTransform();
      drawCorridorGuides(camX, camY);
      drawImpactMarkers(camX, camY);
      ctx.restore();
      drawHUD();
      drawCorridorOverlay();
      drawRadioChat();
      if (G.state === 'pause') drawPause();
      if (G.state === 'dead') drawDead();
    }

    /* crosshair (mouse mode) */
    if (Input.mode === 'mouse' && G.state === 'play') {
      ctx.save();
      ctx.translate(Input.mx, Input.my);
      ctx.strokeStyle = 'rgba(255,150,120,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-20, 0); ctx.lineTo(-6, 0); ctx.moveTo(6, 0); ctx.lineTo(20, 0);
      ctx.moveTo(0, -20); ctx.lineTo(0, -6); ctx.moveTo(0, 6); ctx.lineTo(0, 20);
      ctx.stroke();
      ctx.restore();
    }

    /* in-game pause button (touch) */
    if (Input.mode === 'touch' && G.state === 'play') {
      const b = Input.ui.find(x => x.id === 'pause');
      if (b) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = 'rgba(6,18,26,0.6)';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(180,215,235,0.7)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 2, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#e6f6ff'; ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('❚❚', b.x, b.y + 1);
        ctx.restore();
      }
    }

    /* v1.6.0 入口近くのタッチ「降艇」ボタン（v1.10.0: 基地の「入港」も同じ位置） */
    if (G.state === 'play' && (G.entranceNear || G.baseNear) && Input.mode === 'touch') {
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = 'rgba(6,18,26,0.6)';
      ctx.beginPath(); ctx.arc(DOCK_BTN.x, DOCK_BTN.y, DOCK_BTN.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(DOCK_BTN.x, DOCK_BTN.y, DOCK_BTN.r - 2, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.95;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 22px "Yu Gothic UI",sans-serif';
      ctx.fillStyle = '#eafcff';
      ctx.fillText(G.baseNear ? '入港' : '降艇', DOCK_BTN.x, DOCK_BTN.y + 1);
      ctx.restore();
    }

    /* v2.1.0: 地図・縮尺のボタン（マウスでも見える）。 */
    drawDiveControls();
    /* v2.1.0: 透過マップ（モーダル）。潜航の上に 1 枚重ねるだけ。 */
    if (G.mapOn) diveMap.render();

    ctx.restore();
  }

  /* ------------------------------------------------------------------ *
   * 16. Flow
   * ------------------------------------------------------------------ */
  function clickScreen(x, y){
    if (G.state === 'title') {
      /* v1.19.0: タイトル右下の「物語をもう一度」で導入を再視聴（潜航開始とは別の入口） */
      if (x != null && y != null &&
          x >= REWATCH.x && x <= REWATCH.x + REWATCH.w &&
          y >= REWATCH.y && y <= REWATCH.y + REWATCH.h) {
        intro.enter(); G.state = 'intro'; return true;
      }
      startGame(); return true;
    }
    if (G.state === 'dead' && G.deathT > 0.8) { startGame(); return true; }
    if (G.state === 'pause') { G.state = 'play'; return true; }
    return false;
  }

  function startGame(){
    AU.resume();
    seed = (Date.now() & 0xffff) | 1;
    G.state = 'play'; G.time = 0; G.dt = 0;
    G.player = makePlayer();
    G.enemies = []; G.bullets = []; G.ebullets = []; G.parts = [];
    G.rocks = []; G.spires = []; G.pickups = []; G.floats = []; G.lights = []; G.silh = []; G.rings = []; G.ruins = []; G.impacts = []; G.beams = [];
    G.camX = 0; G.camY = clamp(G.player.y - VH * 0.5, 0, FLOOR_Y - VH);
    G.score = 0; G.kills = 0; G.combo = 0; G.comboT = 0; G.bossKills = 0;
    G.genX = 0; G.nextBossAt = 8600; G.dist = 0; G.boss = null; G.spawnT = 1.0; G.genRuinX = 0; G.hermitBSeeded = false;
    G.genX = 0; G.nextBossAt = 8600; G.dist = 0; G.boss = null; G.spawnT = 1.0; G.genRuinX = 0;
    crabEncounter = createCrabEncounter(); crabSpawned = false; G.crab = null;   // v3.8.0: 新潜航で 1 遭遇を張り直す
    gravelPlaced = false;    // v3.9.2: 礫鎧ガニも新潜航で置き直す
    G.warnMsg = ''; G.warnT = 0; G.flash = 0; G.hurtFlash = 0; G.shake = 0; G.deathT = 0; G.inkT = 0;
    clearFireHold();
    Input.wantMissile = Input.wantDash = Input.wantSonar = false;
    /* v2.1.0(試作): 照明弾は出撃ごとにリセット（持ち越さない）。 */
    resetFlares(flareState);
    Input.stick.active = false; Input.stick.dx = Input.stick.dy = 0;
    /* v1.6.0: 探索の進捗もリセット（新しい潜航で遺物はまた未調査に戻る） */
    G.exploreOn = false; G.entranceNear = false;
    explore.leave(); explore.reset();
    /* v1.19.0: 前哨基地は世界の固定地点（常に存在）。深部（海溝・深棚）は新しい潜航で再びボス撃破から。
       資源残高は維持し、付与済みの記録だけ捨てる（やり直しで進行が壊れない）。 */
    G.baseOn = false; G.baseNear = false;
    /* v1.19.0: 前哨基地は世界の固定地点。新しい潜航でも常に存在する（ボス撃破に依存しない）。 */
    G.baseMarker = outpostMarker();
    G.base2Near = false; G.nearBase = null; G.baseAnchor = null; G.baseIndex = 0;   // v1.12.0: 海溝の第2基地もリセット
    base.leave(); base.reset(); ledger.resetDive();
    G.resource = ledger.total();
    generateTo(G.camX + VW + 1400);
    /* opening calm: clear immediate threats */
    G.enemies = G.enemies.filter(e => e.x > G.camX + VW * 0.9);
  }

  function frame(now){
    if (!running) return;
    requestAnimationFrame(frame);
    if (now < frame.next - 0.8) return;
    const interval = 1000 / 60;
    frame.next = Math.max(frame.next + interval, now);
    const dt = Math.min(0.05, (now - frame.last) / 1000);
    frame.last = now;

    pollGamepad();

    /* v1.6.0 徒歩探索中は潜航シミュレーションを止め、探索の更新と描画だけを行う */
    if (G.exploreOn) {
      Input.wantPause = false;
      explore.update(dt);
      explore.render();
      return;
    }

    /* v1.10.0 基地（室内）中も潜航を止め、室内の更新と描画だけを行う */
    if (G.baseOn) {
      Input.wantPause = false;
      base.update(dt);
      base.render();
      return;
    }

    /* v2.1.0: 透過マップ（モーダル）。開いている間は潜航を止める（安全な一時停止）。
       マップ自身の時間（明滅）だけ進める。 */
    if (G.mapOn) {
      Input.wantPause = false; Input.wantMap = false;
      diveMap.update(dt);
      render();
      return;
    }
    /* v2.1.0: マップ/縮尺のボタン・キー。潜航中だけ効く。 */
    if (Input.wantMap) { Input.wantMap = false; if (G.state === 'play') { openMap(); render(); return; } }
    if (Input.wantZoom) { Input.wantZoom = false; if (G.state === 'play') G.diveZoomTarget = cycleZoom(G.diveZoomTarget, ZOOM_LEVELS); }

    if (Input.wantPause) {
      Input.wantPause = false;
      if (G.state === 'play') { G.state = 'pause'; clearFireHold(); }
      else if (G.state === 'pause') G.state = 'play';
    }

    if (G.state !== 'pause') update(dt);
    if (G.state === 'play') checkDiveEntrance();
    render();
  }


  /* ------------------------------------------------------------------ *
   * 17. ライフサイクル（ハブからの起動・停止・破棄）
   * ------------------------------------------------------------------ */
  /* 構築時に一度だけ初期化しておく（起動直後の1フレーム目から描けるように） */
  resize();
  buildUI();
  G.player = makePlayer();
  G.player.alive = false;
  generateTo(VW * 2);

  /* ------------------------------------------------------------------ *
   * 17b. 徒歩探索（v1.6.0）— 潜航から降りて遺跡を歩く小さなループ
   *   実体は explore.js / ルールは explore-rules.js に分離。ここは受け渡しだけ。
   * ------------------------------------------------------------------ */
  const explore = createExplore({
    ctx, view, VW, VH, Input, toLogical,
    art: { city: ruinsArt, walk: suitWalkArt, shootUpper: suitShootUpperArt, shootBody: suitShootBodyArt,
      foe: foeArt, foeDormant: foeDormantArt },
    onSurvey: (idx) => { AU.pick(); addResourceOnce('relic' + idx, 250); },
    onReturn: () => exitExplore(),
    onShoot: () => { AU.hit(); },
    /* v1.9.0 戦闘の音と敗北（潜水艇へ撤退＝短い回復経路） */
    onHurt: () => { AU.hurt(); },
    onKill: () => { AU.boom(0.9); addResourceOnce('foe', 40); },
    onDefeat: () => { exitExplore(); },
  });

  /* v3.3.0: 船内インターミッション（イラスト＆立ち絵アニメーション UI。改造・整備・武器開発）。 */
  const base = createBase({
    ctx, view, VW, VH, Input, toLogical,
    art: {
      cabin: cabinWorkshopArt, interior: baseHangarArt,
      ellieAnim: cabinEllieAnimArt, gemAnim: cabinGemAnimArt, poncoAnim: cabinPoncoAnimArt,
      girl: girlNeutralArt, girlSmug: girlSmugArt, ponco: poncoNeutralArt, gem: gemNeutralArt,
      ellieIdle: ellieIdleArt, ellieWalk: ellieWalkArt, sub: subArt,
    },
    onDepart: () => exitBase(),
    panel: upgradePanel,                 // v1.11.0: 整備端末
    shipPanel,                           // v1.13.0: 艇選択（乗り換え）
    ship: () => G.ship,                  // v1.13.0: 現在の艇（格納庫の見分け）
    balance: () => ledger.total(),
    weaponPanel,                         // v1.15.0: 武器製作台（製造・換装）
    weaponEquipped: () => ({ torpedo: arsenal.equipped('torpedo'), missile: arsenal.equipped('missile') }),
    forgePanel,                          // v1.16.0: 指定開発（追加兵装・全自動近接）
  });

  /* v1.12.0: 海溝（固定地形）の描画。描画と衝突は trench-rules の同じ矩形を共有する。 */
  const trenchView = createTrenchView({ ctx, VW, VH });

  /* ------------------------------------------------------------------ *
   * v2.1.0（隔離試作）: 透過マップ。実在の地形と現在地をそのまま渡す（勝手な形を作らない）。
   * ------------------------------------------------------------------ */
  function buildMapModel(){
    const p = G.player;
    const t = createTrench(trenchAnchor());
    const m2 = base2Marker(G.baseMarker, G.bossKills);
    /* 地図に出す拠点・遺跡は「発見済み」だけ（未探索・未実装の都市・ネタバレは出さない）。 */
    const sites = [];
    if (discovered.has('ruin-entrance')) sites.push({ id:'ruin-entrance', x:DIVE_ENTRANCE.x, y:DIVE_ENTRANCE.y });
    if (discovered.has('outpost-1') && G.baseMarker) sites.push({ id:'outpost-1', x:G.baseMarker.x, y:G.baseMarker.y });
    if (discovered.has('deepshelf') && m2) sites.push({ id:'deepshelf', x:m2.x, y:m2.y });
    if (t && t.sites) {
      if (discovered.has('cave-route')) sites.push({ id:'cave-route', x:t.sites.caveRoute.x, y:t.sites.caveRoute.y });
      if (discovered.has('volcanic-vent')) sites.push({ id:'volcanic-vent', x:t.sites.volcanicVent.x, y:t.sites.volcanicVent.y });
      if (discovered.has('confluence-hall')) sites.push({ id:'confluence-hall', x:t.sites.confluenceHall.x, y:t.sites.confluenceHall.y });
    }
    const genX = Math.max(G.genX, (p ? p.x : 0) + 4000);
    return {
      time: G.time,
      player: (p && p.alive && !G.exploreOn && !G.baseOn) ? { x:p.x, y:p.y, aim:p.aim } : null,
      camX: G.camX, camY: G.camY,
      floorY: FLOOR_Y, worldBottom: WORLD_BOTTOM,
      seaFloorY: (x) => seaFloorY(x),
      trench: t,
      deepVisible: deepVisible(discovered) && !!t,
      rocks: G.rocks,
      sites,
      entrance: DIVE_ENTRANCE,
      bounds: { xMin: 0, xMax: Math.max(genX, 12000), yMin: 0, yMax: WORLD_BOTTOM },
      zoneName: (y) => zoneName(y),
    };
  }
  const diveMap = createDiveMap({
    ctx, view, VW, VH,
    getModel: buildMapModel,
    onRequestClose: () => closeMap(),
  });

  /* 入力隔離: 開く/閉じる操作が潜航へ流れないように、予約入力をまとめて捨てる
     （バリアは閉じない＝見た目のモーダルで状態を変えない）。 */
  function clearMapLatches(){
    Input.fireQueued = false;
    Input.wantMissile = Input.wantDash = Input.wantSonar = Input.wantDock = false;
    Input.wantMap = Input.wantZoom = false;
    clearFireHold();
    Input.stick.active = false; Input.stick.dx = 0; Input.stick.dy = 0;
    Input.pinch.active = false;
  }
  function openMap(){
    if (G.mapOn) return;
    G.mapOn = true;
    diveMap.open();
    clearMapLatches();
    AU.resume();
  }
  function closeMap(){
    if (!G.mapOn) return;
    G.mapOn = false;
    diveMap.close();
    clearMapLatches();
  }

  /* v1.19.0: 冒頭ストーリー（初回のみ）。視聴済みフラグは独自キー（game_studio_abyss_intro）。
     資源・装備・既存セーブのキーには一切触れない。完了/スキップでフラグを立て、タイトルへ
     引き渡す。タイトルからは任意で再視聴できる。 */
  const introStore = createIntroStore({
    load: () => loadUnified(INTRO_KEY, null),
    save: (v) => saveUnified(INTRO_KEY, v),
  });
  const intro = createIntro({
    ctx, view, VW, VH, toLogical,
    art: { interior: baseHangarArt, sub: subArt, scavenger: scavengerArt,
      ruins: ruinsArt, leviathan: leviathanArt,
      portraits: {
        'girl:neutral': girlNeutralArt, 'girl:smug': girlSmugArt, 'girl:surprised': girlSurprisedArt,
        'girl:sad': girlSadArt, 'ponco:neutral': poncoNeutralArt, 'ponco:alert': poncoAlertArt,
        'gem:neutral': gemNeutralArt,
      } },
    store: introStore,
    onFinish: () => { if (G.state === 'intro') G.state = 'title'; },
  });
  /* 初回（フラグ未設定）だけ潜航の前に導入を出す。既存プレイヤーも 1 回は出るがスキップできる。 */
  if (!introStore.seen()) { intro.enter(); G.state = 'intro'; }

  /* 予約入力を捨てる（降艇・帰還のたびに前の押下を持ち越さない） */
  function clearInputLatch(){
    Input.fireQueued = false;
    Input.wantMissile = Input.wantDash = Input.wantSonar = Input.wantPause = Input.wantDock = false;
    clearFireHold();
    Input.stick.active = false; Input.stick.dx = 0; Input.stick.dy = 0;
    if (Input.pad) Input.pad.actionEdge = false;
    /* v1.13.0: バリアも持ち越さない（降艇・入港・出港で膜を閉じる）。 */
    if (G.player) closeBarrier(G.player.barrier);
  }

  function enterExplore(){
    if (G.exploreOn) return;
    G.exploreOn = true;
    G.entranceNear = false;
    explore.enter();
    clearInputLatch();
    AU.resume(); AU.warp();
  }

  function exitExplore(){
    if (!G.exploreOn) return;
    G.exploreOn = false;
    explore.leave();
    clearInputLatch();
    const p = G.player;
    if (p) {
      p.x = DIVE_ENTRANCE.x + (DIVE_ENTRANCE.r + 90);   // 入口の外側へ出して再突入を防ぐ
      p.vx = 0; p.vy = 0; p.inv = Math.max(p.inv, 0.7);
    }
    AU.warp();
  }

  /* v3.3.0: 船内インターミッションへの切替／復帰。現在地を保ったまま安全に整備・開発できる。 */
  function enterBase(index){
    if (G.baseOn) return;
    G.baseOn = true; G.baseNear = false; G.base2Near = false;
    G.baseIndex = index || 0;
    G.baseAnchor = null;
    base.enter();
    clearInputLatch();
    AU.resume(); AU.warp();
  }

  function exitBase(){
    if (!G.baseOn) return;
    G.baseOn = false;
    base.leave();
    clearInputLatch();
    const p = G.player;
    if (p){
      /* 船内インターミッションから、元の現在地へそのままシームレス復帰する */
      p.vx = 0; p.vy = 0; p.inv = Math.max(p.inv, 0.7);
    }
    G.baseAnchor = null; G.baseIndex = 0;
    AU.warp();
  }

  /* 潜航中: 遺跡エアロック入口の近くでのみ降艇する（旧海中前哨基地ドックは船内インターミッションへ統合済み）。 */
  function checkDiveEntrance(){
    const p = G.player;
    if (!p || !p.alive) { G.entranceNear = false; G.baseNear = false; G.base2Near = false; G.nearBase = null; Input.wantDock = false; return; }
    const d = Math.hypot(p.x - DIVE_ENTRANCE.x, p.y - DIVE_ENTRANCE.y);
    G.entranceNear = d <= DIVE_ENTRANCE.r + 46;
    G.baseNear = false; G.base2Near = false; G.nearBase = null;
    const padAction = !!(Input.pad && Input.pad.actionEdge);
    if (G.entranceNear && (Input.wantDock || padAction)) { Input.wantDock = false; enterExplore(); return; }
    Input.wantDock = false;
  }

  /* ゲームパッド（スティック／十字キー移動、Aで調べる・降艇を同時押しできる） */
  function pollGamepad(){
    if (!Input.pad) return;
    const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : null;
    let pad = null;
    if (pads) for (const q of pads) { if (q && q.connected) { pad = q; break; } }
    const prev = Input.pad.action;
    if (!pad) { Input.pad.x = 0; Input.pad.y = 0; Input.pad.action = false; Input.pad.actionEdge = false; return; }
    let ax = (pad.axes && pad.axes.length) ? (pad.axes[0] || 0) : 0;
    let ay = (pad.axes && pad.axes.length > 1) ? (pad.axes[1] || 0) : 0;
    const b = pad.buttons || [];
    if (b[14] && b[14].pressed) ax -= 1;      // 十字キー左
    if (b[15] && b[15].pressed) ax += 1;      // 十字キー右
    if (b[12] && b[12].pressed) ay -= 1;      // 十字キー上（基地メニューの選択に使う）
    if (b[13] && b[13].pressed) ay += 1;      // 十字キー下
    ax = Math.abs(ax) < 0.28 ? 0 : clamp(ax, -1, 1);
    ay = Math.abs(ay) < 0.28 ? 0 : clamp(ay, -1, 1);
    const aNow = !!(b[0] && b[0].pressed);    // A / ×
    Input.pad.x = ax;
    Input.pad.y = ay;
    Input.pad.actionEdge = aNow && !prev;
    Input.pad.action = aNow;
  }

  function start() {
    if (running) return;
    running = true;
    resize();
    frame.last = performance.now();
    frame.next = frame.last;
    requestAnimationFrame(frame);
  }

  function stop() { running = false; }

  function destroy() {
    running = false;
    for (const [t, type, fn, opt] of _listeners) t.removeEventListener(type, fn, opt);
    _listeners.length = 0;
    /* 音を止めて AudioContext を閉じる（起動のたびに作り直すので、閉じないと枯渇する） */
    try { AU.setRumble(0); } catch (e) { /* noop */ }
    try {
      if (AU.ctx && AU.ctx.state !== 'closed') AU.ctx.close();
    } catch (e) { /* noop */ }
    AU.ctx = null; AU.on = false;
    G.enemies.length = 0; G.bullets.length = 0; G.ebullets.length = 0;
    G.parts.length = 0; G.lights.length = 0; G.rings.length = 0; G.impacts.length = 0; G.beams.length = 0;
    G.exploreOn = false; explore.leave();
    G.baseOn = false; base.leave();
    /* v2.1.0: ハブ帰還でマップを閉じる（開いたまま戻らない）。 */
    G.mapOn = false; try { diveMap.close(); } catch (e) { /* noop */ }
    try { music.destroy(); } catch (e) { /* BGM 停止の失敗は無視（ハブ帰還で鳴り続けないこと優先） */ }
    if (depthBridge) { try { depthBridge.destroy(); } catch (e) { /* noop */ } }
  }

  function state() {
    return {
      state: G.state,
      mode: G.baseOn ? 'base' : (G.exploreOn ? 'explore' : 'dive'),   // v1.6.0 徒歩探索 / v1.10.0 基地
      px: G.player ? Math.round(G.player.x) : null,
      py: G.player ? Math.round(G.player.y) : null,
      hp: G.player ? Math.round(G.player.hp) : null,
      aim: G.player ? +G.player.aim.toFixed(2) : null,
      enemies: G.enemies.length, bullets: G.bullets.length, ebullets: G.ebullets.length,
      parts: G.parts.length, rocks: G.rocks.length, pickups: G.pickups.length,
      score: G.score, resource: ledger.total(), kills: G.kills, boss: !!G.boss,
      stats: G.stats,                                 // v1.11.0: 実効性能（改造の反映）
      upgrades: upgrades.levels(),                    // v1.11.0: 購入済みの改造レベル
      ship: G.ship,                                   // v1.13.0: 現在の艇（乗り換え）
      hull: hullSource(G.ship),                        // v1.21.0: 船体の出所（plate/procedural/sprite。検証用）
      /* v1.19.0: 見た目の動き（進行方向のピッチ／切り返しのバンク）の観測用。物理とは独立。 */
      motion: (G.player && G.player.alive) ? (() => {
        const b = bodyTransform(G.player.tilt, G.player.bank);
        return { pitch: +G.player.tilt.toFixed(3), bank: +G.player.bank.toFixed(3),
                 rotate: +b.rotate.toFixed(3), squash: +b.squash.toFixed(3) };
      })() : null,
      /* v1.15.0: 装備中の武器の個体（品質・倍率）と実パラメータ（観測用）。v1.15.0+: 発射数・方向・外観。 */
      weapon: {
        torpedo: { id: arsenal.equippedId('torpedo'), quality: qualityLabel(arsenal.equipped('torpedo')), stats: arsenal.equipped('torpedo').stats,
          shots: itemShots(arsenal.equipped('torpedo')), style: arsenal.equipped('torpedo').style,
          projectile: arsenal.equipped('torpedo').projectile, launchSound: arsenal.equipped('torpedo').launchSound, impactSound: arsenal.equipped('torpedo').impactSound },
        missile: { id: arsenal.equippedId('missile'), quality: qualityLabel(arsenal.equipped('missile')), stats: arsenal.equipped('missile').stats,
          shots: itemShots(arsenal.equipped('missile')), style: arsenal.equipped('missile').style,
          projectile: arsenal.equipped('missile').projectile, launchSound: arsenal.equipped('missile').launchSound, impactSound: arsenal.equipped('missile').impactSound },
        count: arsenal.count(), cap: ARSENAL_CAP, wp: G.wp,
      },
      /* v1.16.0: 追加兵装の観測（撃つ枠・近接・解放状況）。 */
      advanced: {
        shot: advanced.equippedShotType(),
        shotItemType: (advanced.shotItem() ? advanced.shotItem().type : null),
        melee: advanced.equippedMelee(),
        items: advanced.count(), cap: advanced.cap(),
        meleeUnlocked: advanced.meleeUnlockedList(),
        shotParams: advanced.shotParams(),
      },
      camX: Math.round(G.camX), camY: Math.round(G.camY), genX: Math.round(G.genX),
      /* v2.1.0: 潜航ズーム（描画のみ）と透過マップの観測用。 */
      diveZoom: +zoomFactor().toFixed(3), diveZoomTarget: +clampZoom(G.diveZoomTarget).toFixed(3),
      mapOn: !!G.mapOn, map: diveMap ? diveMap.state() : null,
      discovered: discovered.list(), discoveredCount: discovered.count(),
      deepVisible: deepVisible(discovered),
      /* v1.13.0: 瞬間バリアの観測（ジャスト／通常／破損・待ち・膜残量） */
      barrier: (G.player && G.player.barrier) ? {
        active: !!G.player.barrier.active,
        ready: barrierReady(G.player.barrier),
        cooldown: +G.player.barrier.cooldown.toFixed(3),
        durability: +G.player.barrier.durability.toFixed(2),
        charge: +barrierReadyProgress(G.player.barrier).toFixed(3),
      } : null,
      entranceNear: !!G.entranceNear,                 // v1.6.0: 入口の近くか
      baseNear: !!G.baseNear,                         // v1.10.0: 入港圏か
      baseMarker: !!G.baseMarker,                     // v1.19.0: 前哨基地が存在するか（常に true）
      outpost: G.baseMarker ? { x: Math.round(G.baseMarker.x), y: Math.round(G.baseMarker.y) } : null,
      deepOpen: deepUnlocked(),                        // v1.19.0: 深部（海溝・深棚）が開いているか
      /* v1.12.0: 海溝と第2基地（観測用） */
      base2Marker: !!base2Marker(G.baseMarker, G.bossKills),
      base2Near: !!G.base2Near,
      nearBase: G.nearBase,
      trench: !!createTrench(trenchAnchor()),
      trenchStage: trenchStage(G.player ? G.player.x : 0, G.player ? G.player.y : 0, createTrench(trenchAnchor())),
      /* v2.1.0(試作): 照明弾（弾数無制限・非攻撃）と深い区間の光の観測用。 */
      flares: flareState.flares.length,
      flareCd: +flareState.cd.toFixed(3),
      flareFired: flareState.fired,
      flarePos: flareState.flares.map(f => ({ x: Math.round(f.x), y: Math.round(f.y), vy: Math.round(f.vy), life: +f.life.toFixed(2), land: !!f.land, lit: +flareIntensity(f).toFixed(2) })),
      litWatch: inLitWatch(G.player ? G.player.y : 0),
      explore: explore ? explore.state() : null,      // v1.6.0: 探索状態（観測用）
      base: base ? base.state() : null,               // v1.10.0: 基地の室内状態（観測用）
    };
  }

  /* 検証・デバッグ用の入り口（index.js が window.__abyss に載せる） */
  return { start, stop, destroy, resize, state, startGame, enterExplore, exitExplore, enterBase, exitBase,
    G, Input, AU, errors, music,
    /* v1.19.0: 冒頭ストーリーの検証用（状態・再視聴・フラグ）。 */
    intro, introStore,
    introState: () => intro.state(),
    replayIntro: () => { if (G.state !== 'play') { intro.enter(); G.state = 'intro'; } },
    /* v1.13.0: 瞬間バリアの検証用（発動・状態） */
    BARRIER, deployBarrier,
    /* v1.12.0: 海溝の検証用（固定地形・第2基地） */
    trench: () => createTrench(trenchAnchor()), base2Marker: () => base2Marker(G.baseMarker, G.bossKills),
    /* v1.15.0: 2D 海溝の背景（視差・海雪・水流・巨影）の検証用 */
    trenchView, trenchFx: () => trenchView.debugFx(), forceShadow: (x) => trenchView.forceShadow(x),
    /* v1.11.0: 整備・改造の検証用（資源付与・保存・実効性能） */
    addResource, ledger, upgrades, upgradePanel, stats: () => G.stats,
    /* v1.13.0: 潜水艇の乗り換えの検証用 */
    ships, shipPanel, selectShip, SHIPS, SHIP_ORDER,
    /* v1.21.0: 火力型の船体の出所（焼き板/プロシージャル）の検証用。setHullPlate は板の強制差し替え。 */
    hullSource: () => hullSource(G.ship), setHullPlate: (img) => setFirepowerPlate(img),
    /* v1.15.0: 武器の個体（回収・製造・換装）の検証用 */
    arsenal, weaponPanel, wp: () => G.wp, ARSENAL_CAP, WEAPON_TYPES, salvoSpread,
    /* v1.16.0: 追加兵装（レーザー/反射・全自動近接）と恒久解放・指定開発の検証用 */
    advanced, forgePanel, melee: () => G.melee, meleeState: () => (G.melee ? G.melee.state() : null),
    advancedShot: () => advanced.shotParams(), SHOT_WEAPONS, SHOT_ORDER, MELEE_TYPES, MELEE_ORDER,
    unlockMelee: (id) => advanced.unlockMelee(id, G.lootRng),
    /* v1.16.0+: 近接の段階強化と特性解放の検証用（ステージング用。設計操作は実タッチで行う）。 */
    meleeStats: (id) => advanced.meleeStats(id), meleeEnhanceInfo: (id) => advanced.meleeEnhanceInfo(id),
    unlockTrait: (typeId, cat, value) => advanced.unlock(typeId, cat, value),
    equippedShotItem: () => advanced.shotItem(),
    setLootRng: (fn) => { G.lootRng = (typeof fn === 'function') ? fn : Math.random; },
    /* v2.1.0(試作): 照明弾と深い区間の光の検証用（状態・手動発射・リセット）。 */
    flare: { state: () => flareState, fire: () => { Input.wantFlare = true; }, reset: () => resetFlares(flareState), CONFIG: FLARE },
    litWatch: () => inLitWatch(G.player ? G.player.y : 0),
    /* v2.1.0(試作): 検証用の敵スポーン（現場で照明比較を作るための補助。通常プレイでは使わない）。 */
    spawnEnemy: (kind, x, y) => spawnEnemy(kind, x, y),
    /* v3.8.0: 煤冠イソギンチャク（熱水・火山帯 固有）の検証用 */
    ANEMONE,
    anemoneAnchor: () => anemoneAnchor(createTrench(trenchAnchor())),
    anemone: () => G.anemone,
    anemoneEnemies: () => G.enemies.filter(e => e.kind === 'anemone'),
    spawnAnemone: () => maybeSpawnAnemone(G.player),
    /* v3.8.0(隔離試作): 地層背負いの巨蟹の検証用（隔離。通常プレイでは使わない）。 */
    geoCrab: () => G.crab,
    crabLeg: () => (G.crab ? geoCrabLeg(G.crab) : null),
    drawCrabLeg: (ctx, leg, tell, detail) => drawCrabLegRig(ctx, leg, tell ? CRAB_LEG_PAL.tell : CRAB_LEG_PAL.shell, detail !== false),
    crabTouch: (x, y, r) => (G.crab ? geoCrabLegTouch(G.crab, x, y, r) : false),
    spawnGeoCrab: (x, y) => spawnEnemy('geo_crab', x, y),
    ensureGeoCrab: () => { crabSpawned = false; ensureGeoCrab(); return G.crab; },
    crabDefeated: () => crabEncounter.isDefeated(),
    crabRules: () => GEO_CRAB,
    /* v3.9.2(隔離試作): 礫鎧ガニ A/B/C の検証用（隔離。通常プレイでは使わない）。 */
    gravelSpecies: () => GRAVEL_CRAB_SPECIES,
    gravelKeys: () => GRAVEL_CRAB_KEYS,
    gravelCrabs: () => G.enemies.filter(e => e.kind === 'gravel_crab'),
    gravelCrabOf: (sp) => G.enemies.find(e => e.kind === 'gravel_crab' && e.species === sp) || null,
    gravelClaw: (sp) => { const c = G.enemies.find(e => e.kind === 'gravel_crab' && e.species === sp); return c ? gravelCrabClaw(c) : null; },
    gravelClawTouch: (sp, px, py, pr) => { const c = G.enemies.find(e => e.kind === 'gravel_crab' && e.species === sp); return c ? gravelCrabClawTouch(c, px, py, pr) : false; },
    spawnGravelCrab: (sp, x, y) => spawnGravelCrab(sp, x, y),
    /* 強制配置（検証用）。既存の礫鎧ガニを消してから置き直す＝二重スポーンしない。 */
    ensureGravelCrabs: () => { G.enemies = G.enemies.filter(e => e.kind !== 'gravel_crab'); gravelPlaced = false; ensureGravelCrabs(); return G.enemies.filter(e => e.kind === 'gravel_crab').length; },
    gravelFreeze: (sp, state) => { const c = G.enemies.find(e => e.kind === 'gravel_crab' && e.species === sp); if (!c) return null; c.frozen = !!state; if (state) { c.state = state; c.st = (state==='wind'? GRAVEL_CRAB_SPECIES[sp].tell : state==='swing'? GRAVEL_CRAB_SPECIES[sp].swing : 1); } return { species: sp, state: c.state, frozen: !!c.frozen }; },
    gravelFace: (sp, dir) => { const c = G.enemies.find(e => e.kind === 'gravel_crab' && e.species === sp); if (!c) return null; c.dir = dir<0?-1:1; return c.dir; },
    /* 序盤装備と実在の強化装備を「同じ条件」で測るための補助（数値は本物の抽選・強化式）。 */
    loadout: () => ({
      torpedoUpgrade: upgrades.level('torpedoDmg'),
      torpedoDmg: G.stats.torpedoDmg,
      torpedoDmgMul: G.wp.torpedo.dmgMul,
      perShot: G.stats.torpedoDmg * G.wp.torpedo.dmgMul,
      missileDmg: G.stats.missileDmg,
      missileDmgMul: G.wp.missile.dmgMul,
    }),
    applyInitialLoadout: () => {
      upgrades.setLevel('torpedoDmg', 0);
      applyToShip({ type: 'upgrade', id: 'torpedoDmg', level: 0 });
      arsenal.equip('initial:torpedo');
      recomputeWeapon();
      return G.stats.torpedoDmg * G.wp.torpedo.dmgMul;
    },
    applyMaxLoadout: () => {
      upgrades.setLevel('torpedoDmg', 200);
      upgrades.setLevel('missilePower', 200);
      let it = arsenal.items().find(x => x.type === 'torpedo');
      if (!it){ const r = arsenal.add(rollItem('torpedo', G.lootRng)); it = r.item; }
      let guard = 0;
      while (it && (it.enh || 0) < 200 && guard++ < 400){
        const r = arsenal.enhance(it.id);
        if (!r.ok) break;
        it = arsenal.itemById(it.id) || it;
      }
      if (it) arsenal.equip(it.id);
      applyToShip({ type: 'upgrade', id: 'torpedoDmg', level: 200 });
      recomputeWeapon();
      return G.stats.torpedoDmg * G.wp.torpedo.dmgMul;
    },
    /* v2.2.0: 透過マップと潜航ズームの検証用 */
    map: diveMap, openMap, closeMap, mapState: () => diveMap.state(),
    worldToScreen, screenToWorld, visibleWorld,
    discovered, MAP_KEY,
    zoomLevels: ZOOM_LEVELS,
    diveZoom: () => zoomFactor(),
    setDiveZoom: (z) => { G.diveZoom = clampZoom(z); G.diveZoomTarget = clampZoom(z); },
    setDiveZoomTarget: (z) => { G.diveZoomTarget = clampZoom(z); },
    cycleDiveZoom: () => { G.diveZoomTarget = cycleZoom(G.diveZoomTarget, ZOOM_LEVELS); return G.diveZoomTarget; },
    updateDiscoveries,
    depthT,
    zoneNameAtPlayer: () => zoneName(G.player ? G.player.y : 0),
    formatDepth: () => formatDepthDisplay(G.player ? G.player.y : 0),
    radioChat,
    depthBridge };
}

/**
 * v1.17.0: 回収座標が「初回ボス後の海溝の実際の深部」にあるか（位置の純関数）。
 * 画面表示ではなく、回収座標と trench レイアウト（描画・衝突と同じ式）で判定する。
 * 深部で拾った魚雷だけが rollItem の deepSalvo（扇状 6/9/12）に到達できる。
 */
export function inTrenchDeep(x, y, baseMarker, bossKills){
  if (!deepOpen(bossKills)) return false;
  const t = createTrench(baseMarker);
  if (!t) return false;
  const minX = (t.hallX0 != null) ? Math.min(t.gorgeX0, t.hallX0) : t.gorgeX0;
  const maxX = (t.hallX1 != null) ? Math.max(t.gorgeX1, t.hallX1) : t.gorgeX1;
  if (x < minX || x > maxX) return false;
  return y > t.wallTop + 200;                               // 通常の海底（wallTop）より下＝深部
}
