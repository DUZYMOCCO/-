// 起動、ループ、URL引数、window.__game。ルール層と描画層をつなぐ。

import * as THREE from 'three';
import { createWorld, step, applyCommand, heightAt, deserialize, darknessOf, ambientLight, initSpawn, forceSquad, forceSite, spawnSummary } from './sim/index.js';
import { createSpawnSites } from './render/spawn_sites.js';
import { createScene } from './render/scene.js';
import { createTerrain } from './render/terrain.js';
import { createCameraRig } from './render/camera.js';
import { loadDollTemplate, createDollManager } from './render/dolls.js';
import { loadDollTextures, femaleEnabled, BEAUTY_LOOKS, MOB_TEX_DIR, MOB_TEX_NAMES, setMobLooksReady } from './render/doll_textures.js';
import { createClutter, propsByRole } from './render/clutter.js';
import { createGreen } from './render/green.js';
import { GREEN_NAMES, GREEN_DIR, greenEntry } from './render/green_plan.js';
import { PROP_NAMES, PROP_DIR, CLUB_MODEL, NEST_NAMES, NEST_DIR, NEST_COLORS } from './render/clutter_plan.js';
import { createBedrolls } from './render/bedrolls.js';
import { loadHairData, buildHairTemplates } from './render/hair.js';
import { createInput } from './ui/input.js';
import { createPortraits } from './render/portraits.js';
import { loadMachineTemplates, ruinTextureFrom } from './render/machines.js';
import { pickFollowId, squadCentre, leash, dragResistance, LOOK_RADIUS } from './render/camfollow.js';
import { createHud } from './ui/hud.js';
import { createTradeUI } from './ui/trade_ui.js';
import { createSelection } from './ui/selection.js';
import { createSaveUi, AUTO_KEY } from './ui/save_ui.js';
import { createNameLabels } from './render/name_labels.js';
import { createOptions } from './ui/options.js';
import { createCrossbows, GRIP, SHEATH } from './render/crossbows.js';
import { createCombatFx } from './render/combat_fx.js';
import { createLights } from './render/lights.js';
import { loadModels, softenMetal } from './render/models.js';
import { groundFiles, GROUND_SETS, loadEach, allOrNull, dollTexDir, textureBytes, modelRoles, firstChoices, fallbackChoices, resolveRoles } from './render/asset_plan.js';

const canvas = document.getElementById('game');
const params = new URLSearchParams(window.location.search);

function numberParam(name, fallback) {
  const raw = params.get(name);
  if (raw === null || raw === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

const seed = Math.floor(numberParam('seed', 12345));
let speed = numberParam('speed', 1);
if (![0, 1, 2, 3, 5].includes(speed)) speed = 1;
const skipTicks = Math.max(0, Math.floor(numberParam('skip', 0)));
const followParam = params.get('follow') !== '0';
const camRaw = (params.get('cam') || '').split(',').map((value) => Number(value));
const camValid = camRaw.length >= 2 && Number.isFinite(camRaw[0]) && Number.isFinite(camRaw[1]);
const camDistance = camRaw.length >= 3 && Number.isFinite(camRaw[2]) ? camRaw[2] : 30;

const xbowParam = params.get('xbow');
const femaleOn = femaleEnabled(params.get('female')); // 20:42 ?female=0 で女性の人形なし
// ランダム出現（隊商・盗賊・野盗・野営地・獣の巣）。?spawn=0 で無し、?spawn=debug で目印と数、?spawnrate=N で頻度（既定1）。
const spawnParam = params.get('spawn');
const spawnOn = spawnParam !== '0';
const spawnDebug = spawnParam === 'debug';
const spawnRate = Math.max(0, Math.min(20, numberParam('spawnrate', 1)));
// 古い保存（state.spawn 無し）にも後から入れる。?spawn=0 なら止める。
function ensureSpawn(st) {
  if (spawnOn && !st.spawn) initSpawn(st, { spawnRate });
  if (st.spawn) {
    st.spawn.on = spawnOn;
    if (params.get('spawnrate') !== null) st.spawn.rate = spawnRate;
  }
  return st;
}
function startOpts() {
  const female = femaleOn;
  const spawn = spawnOn;
  if (xbowParam === '0') return { companionCrossbow: false, female, spawn, spawnRate };
  if (xbowParam === '1') return { companionCrossbow: true, female, spawn, spawnRate };
  let on = true;
  try {
    on = window.localStorage.getItem('sunahate_opt_xbow') !== '0';
  } catch (err) {
    on = true;
  }
  return { companionCrossbow: on, female, spawn, spawnRate };
}
let state = createWorld(seed, startOpts());
const selection = createSelection();
let loadedAuto = false;
if (params.get('load') === 'auto') {
  try {
    const raw = window.localStorage.getItem(AUTO_KEY);
    const loaded = raw ? deserialize(raw) : null;
    if (loaded) {
      state = loaded;
      loadedAuto = true;
    }
  } catch (err) {
    loadedAuto = false;
  }
}
ensureSpawn(state);
// ?tp=green: 部隊を翠緑の盆地の入口へ移す（確認用）
if (params.get('tp') === 'green') {
  const e = greenEntry();
  const pl = state.actors.filter((a) => a.faction === 'player');
  pl.forEach((a, i) => {
    a.x = e.x + (i % 3) * 1.4;
    a.z = e.z + Math.floor(i / 3) * 1.4;
  });
}
if (!loadedAuto) {
  for (let i = 0; i < skipTicks; i += 1) step(state);
}

const sceneCtx = createScene(canvas);

// 素材（仮）: 地面テクスチャ（?gtex=0 で従来の頂点カラー）と glb（?models=0 で従来の手続きの形）。
async function loadGroundTextures() {
  if (params.get('gtex') === '0') return null;
  const files = groundFiles();
  const loader = new THREE.TextureLoader();
  const map = await loadEach(Object.keys(files), (k) => loader.loadAsync(files[k]));
  const ok = allOrNull(map, Object.keys(files));
  if (!ok) console.warn('地面テクスチャが欠けています。従来の色で描きます。');
  return ok;
}
// glb は役目ごと（武器・灯り・小屋の壁の色など）。既定は2・3回目、?models=1 で1回目だけ。
// 1つ目が読めなかった役目は、次の候補（最後は1回目の版）を読む。
const roles = modelRoles(params.get('models'));
async function loadRoleModels() {
  if (params.get('models') === '0') return { models: {}, names: {}, loaded: {} };
  const loaded = await loadModels(firstChoices(roles));
  const more = fallbackChoices(roles, loaded);
  if (more.length) Object.assign(loaded, await loadModels(more));
  const r = resolveRoles(roles, loaded);
  // 武器は金属っぽさを抑える（環境マップが無いと黒くつぶれて、引きの画面で見えない）
  for (const k of ['katana', 'cleaver_a', 'cleaver_b', 'crossbow', 'bolt']) softenMetal(r.models[k], 0.2, 0.6);
  return { ...r, loaded };
}
// 小物の glb（tex_props_cx1: 木箱・樽・椅子・柵・瓦礫など＋人食いの棍棒）。?props=0 で無し。読めない物は置かない。
// 小物 12 点は同じアトラス画像を1枚ずつ埋め込んでいる。GPU 上では1枚にまとめる（iPhone のメモリ対策）。
function shareAtlas(loaded, names) {
  let shared = null;
  for (const n of names) {
    const baked = loaded[n];
    if (!baked || !baked.parts) continue;
    for (const part of baked.parts) {
      const m = part.material;
      if (!m || !m.map) continue;
      if (!shared) shared = m.map;
      else if (m.map !== shared) {
        m.map.dispose();
        m.map = shared;
        m.needsUpdate = true;
      }
    }
  }
}

async function loadPropModels() {
  if (params.get('models') === '0' || params.get('props') === '0') return {};
  try {
    const loaded = await loadModels([...PROP_NAMES, CLUB_MODEL], PROP_DIR);
    shareAtlas(loaded, PROP_NAMES);
    return loaded;
  } catch (err) {
    console.warn('小物の glb を読めませんでした。', err);
    return {};
  }
}
async function loadNestModels() {
  if (params.get('models') === '0' || params.get('props') === '0') return {};
  try {
    const loaded = await loadModels(NEST_NAMES, NEST_DIR);
    for (const baked of Object.values(loaded)) {
      for (const part of baked.parts) {
        const c = NEST_COLORS[part.material.name];
        if (c && part.material.color) part.material.color.setRGB(c[0], c[1], c[2]);
        if ('metalness' in part.material) part.material.metalness = Math.min(part.material.metalness, 0.25);
      }
    }
    return loaded;
  } catch (err) {
    console.warn('人食いの集落の glb を読めませんでした。', err);
    return {};
  }
}
async function loadGreenModels() {
  if (params.get('green') === '0' || params.get('models') === '0') return null;
  try {
    return await loadModels(GREEN_NAMES, GREEN_DIR);
  } catch (err) {
    console.warn('盆地の glb を読めませんでした。', err);
    return null;
  }
}
// 古代の暴走機械（assets/mech/）。?mech=0 で無し（従来の獣の形で描く）。
const mechLoad = params.get('mech') === '0' || params.get('models') === '0' ? Promise.resolve(null) : loadMachineTemplates().catch(() => null);
const [groundTex, modelInfo, propLoaded, nestModels, greenModels, mechTemplates] = await Promise.all([loadGroundTextures(), loadRoleModels(), loadPropModels(), loadNestModels(), loadGreenModels(), mechLoad]);
const models = modelInfo.models;
const propModels = propsByRole(propLoaded);
if (propLoaded[CLUB_MODEL]) models.club = propLoaded[CLUB_MODEL];
const terrain = createTerrain(sceneCtx.scene, state, { ground: groundTex, models, renderer: sceneCtx.renderer, fenceGlb: !!propModels.fence });
const clutter = createClutter(sceneCtx.scene, state, propModels);
// 翠緑の盆地（草・花・木・小川・橋・柵）。iPhone 向けに草は既定で半分。?green=hi で全部、?green=0 で無し。
const green = greenModels ? createGreen(sceneCtx.scene, greenModels, { density: params.get('green') === 'hi' ? 1 : 0.5 }) : null;

// 影を落とすのは人物・建物・岩だけ。地面は受けるだけ、枯れ木・廃墟・小物は落とさない。
terrain.trees.castShadow = false;
terrain.ruins.castShadow = false;
terrain.stones.castShadow = false;
terrain.grass.castShadow = false;
terrain.ground.receiveShadow = true;

let template = null;
try {
  template = await loadDollTemplate('assets/doll.glb');
} catch (err) {
  console.warn('人形の読み込みに失敗しました。予備の人形で表示します。', err);
}

// 肌＋服のテクスチャ（?tex=0 で従来の勢力色）。
// 既定は5回目の顔＋4回目の服（assets/tex5/）。?tex=4・3・2 で前の版。
const texDir = dollTexDir(params.get('tex'));
const lookImages = template && texDir ? await loadDollTextures(texDir) : null;
// 人食い・グールの肌と服（assets/tex_mobs/）。?mobs=0 で無し。読めなければ普通の盗賊の見た目。
if (lookImages && params.get('mobs') !== '0') {
  const mobImages = await loadDollTextures(MOB_TEX_DIR, MOB_TEX_NAMES);
  if (mobImages) {
    Object.assign(lookImages, mobImages);
    setMobLooksReady(true);
  }
}
// 女性の人形（同じ骨65本・同じUV配置・同じ8動作）。読めなければ男の人形で描く。
let female = null;
if (template && femaleOn) {
  try {
    const fTemplate = await loadDollTemplate('assets/doll_f.glb');
    const fImages = texDir ? await loadDollTextures('assets/tex_f/') : null;
    female = { template: fTemplate, lookImages: fImages, hairTemplates: null, beautyForce: params.get('beauty') || null };
    // 21:xx tex_f3_beauty の5人（髪＋肌）を女性のモブの見た目に混ぜる。?beauty=0 で無し。読めなければ無しで続ける。
    if (fImages && params.get('beauty') !== '0') {
      try {
        const [bSkins, hair] = await Promise.all([
          loadDollTextures('assets/tex_f3/', BEAUTY_LOOKS.map((b) => b.skin)),
          loadHairData('assets/hair_f/'),
        ]);
        if (bSkins) {
          Object.assign(fImages, bSkins);
          female.hairTemplates = buildHairTemplates(fTemplate, hair);
        }
      } catch (err) {
        console.warn('髪を読めませんでした。前の女性の見た目だけで表示します。', err);
      }
    }
  } catch (err) {
    console.warn('女性の人形を読めませんでした。男の人形で表示します。', err);
  }
}
const dolls = createDollManager(sceneCtx.scene, template, lookImages, female);
dolls.setMachines(mechTemplates, models.katana);
dolls.sync(state);
const nameLabels = createNameLabels(dolls);
const lights = createLights(sceneCtx.scene, state, models);
const crossbows = createCrossbows(sceneCtx.scene, models);
const combatFx = createCombatFx(sceneCtx.scene); // 20:13 チャンバラの火花・受けの構え
const spawnSites = createSpawnSites(sceneCtx.scene, { debug: spawnDebug, props: propModels, nest: nestModels });
// 敷いた寝袋
const bedrolls = createBedrolls(sceneCtx.scene, { noModels: params.get('models') === '0' || params.get('props') === '0' });
// 遺跡の錆の模様は機械の獣の glb の物を使い回す（余分な読み込みなし）
if (mechTemplates) spawnSites.setRuinTexture(ruinTextureFrom(mechTemplates));
const options = createOptions({
  onShowNames(on) {
    dolls.setShowNames(on);
  },
});
dolls.setShowNames(options.getShowNames());

function findPlayer() {
  for (const actor of state.actors) {
    if (actor.id === state.playerId) return actor;
  }
  return null;
}

const startPlayer = findPlayer();
const initX = camValid ? camRaw[0] : startPlayer ? startPlayer.x : 0;
const initZ = camValid ? camRaw[1] : startPlayer ? startPlayer.z : 0;

const rig = createCameraRig(sceneCtx.camera, {
  x: initX,
  z: initZ,
  distance: camValid ? camDistance : 30,
  follow: followParam,
});
rig.apply();

// 追従している人（選んだ部隊員／いなければ操作キャラ）と見回しの状態。
let followId = null;
// 検証用 cam() で置いた時だけ綱を外す（見回しに入ると戻る）。
let freeCam = !followParam;
const edgeParam = params.get('edge') === '1';
const portraits = createPortraits(sceneCtx.renderer);

function dollPosition(id) {
  if (id === null || id === undefined) return null;
  const doll = dolls.getDoll(id);
  return doll && doll.group ? doll.group.position : null;
}

function squadMembers() {
  const ids = Array.isArray(state.squadIds) ? state.squadIds : [];
  const out = [];
  for (const actor of state.actors) if (ids.includes(actor.id)) out.push(actor);
  return out;
}

function squadCentreNow() {
  const pts = [];
  for (const actor of squadMembers()) {
    if (actor.state === 'dead') continue;
    const p = dollPosition(actor.id);
    if (p) pts.push(p);
  }
  return squadCentre(pts);
}

// 見回しに入る（地面からのドラッグ・WASD）
function enterLook() {
  freeCam = false;
  if (!rig.getFollow()) return;
  rig.setFollow(false);
  if (hud) hud.setFollow(false);
}

// 追従に戻る（ボタン・Space/Home・顔カードの二度押し）
function returnFollow() {
  freeCam = false;
  if (!rig.getFollow()) rig.startGlide();
  rig.setFollow(true);
  if (hud) hud.setFollow(true);
}

const markerGeo = new THREE.RingGeometry(0.4, 0.66, 24);
markerGeo.rotateX(-Math.PI / 2);
const marker = new THREE.Mesh(
  markerGeo,
  new THREE.MeshBasicMaterial({
    color: 0xffe28a,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
);
marker.visible = false;
marker.renderOrder = 2;
sceneCtx.scene.add(marker);
let markerUntil = 0;

let accumulator = 0;
let hud = null;

// step 直前の {x,z,rot} を描画側だけで控える（state には入れない）。
const prevMap = new Map();
const prevSeen = new Set();

function capturePrev() {
  prevSeen.clear();
  for (const actor of state.actors) {
    prevSeen.add(actor.id);
    let entry = prevMap.get(actor.id);
    if (!entry) {
      prevMap.set(actor.id, { x: actor.x, z: actor.z, rot: actor.rot });
    } else {
      entry.x = actor.x;
      entry.z = actor.z;
      entry.rot = actor.rot;
    }
  }
  for (const id of prevMap.keys()) {
    if (!prevSeen.has(id)) prevMap.delete(id);
  }
}

function setSpeed(n) {
  if (![0, 1, 2, 3, 5].includes(n)) return;
  speed = n;
  if (hud) hud.setSpeed(n);
}

// 命令を受ける仲間: 最後に選んだ／追っている部隊の者（cam2 の弱点の修正）。
// 敵や他人を選んでいる間も、その前に選んでいた仲間が受ける。
let orderId = null;
function isSquadAlive(id) {
  if (id === null || id === undefined) return false;
  const ids = Array.isArray(state.squadIds) && state.squadIds.length ? state.squadIds : [state.playerId];
  if (!ids.includes(id)) return false;
  const a = state.actors.find((e) => e.id === id);
  return !!a && a.state !== 'dead' && a.faction === 'player';
}
function orderee(targetId) {
  const sel = selection.get();
  if (isSquadAlive(sel) && sel !== targetId) return sel;
  // 敵や他人を選んでいる時は、その前に選んでいた仲間
  if (sel !== null && isSquadAlive(orderId) && orderId !== targetId) return orderId;
  if (isSquadAlive(followId) && followId !== targetId) return followId;
  return null;
}

function command(cmd) {
  return applyCommand(state, cmd);
}

function applyState(next) {
  state = ensureSpawn(next);
  spawnSites.reset();
  bedrolls.reset();
  dolls.reset(state);
  nameLabels.clear();
  lights.reset(state);
  crossbows.reset();
  combatFx.reset();
  const player = findPlayer();
  if (player) rig.setTarget(player.x, player.z);
  rig.setFollow(followParam);
  freeCam = !followParam;
  followId = null;
  orderId = null;
  portraits.reset();
  rig.apply();
  marker.visible = false;
  accumulator = 0;
  prevMap.clear();
  selection.clear();
  dolls.setSelected(null);
  if (hud) hud.setFollow(rig.getFollow());
  window.__game.state = state;
}

function restart() {
  applyState(createWorld(seed, startOpts()));
}

hud = createHud({
  onSpeed(n) {
    setSpeed(n);
  },
  onFollow() {
    if (rig.getFollow()) enterLook();
    else returnFollow();
  },
  onReturnFollow() {
    returnFollow();
  },
  onFocusActor(id) {
    selection.select(id);
    returnFollow();
  },
  getPortrait(id) {
    return portraits.get(id);
  },
  portraitVersion() {
    return portraits.version();
  },
  onRestart() {
    restart();
  },
  onClearSelection() {
    selection.clear();
    dolls.setSelected(null);
  },
  onSelectActor(id) {
    selection.select(id);
  },
  onLantern(on) {
    applyCommand(state, { type: 'lantern', on: !!on });
  },
  onLanternSelected() {
    const id = selection.get();
    const actor = id === null ? null : state.actors.find((a) => a.id === id);
    if (actor) applyCommand(state, { type: 'lantern', on: !actor.lantern, id });
  },
  onSneak(player) {
    applyCommand(state, { type: 'sneak', on: !(player && player.sneaking) });
  },
  onAttackSelected() {
    const id = selection.get();
    if (id !== null) applyCommand(state, { type: 'attack', targetId: id, actorId: orderee(id) });
  },
  onAssassinateSelected() {
    const id = selection.get();
    if (id !== null) applyCommand(state, { type: 'assassinate', targetId: id });
  },
  onPickupSelected() {
    const id = selection.get();
    if (id !== null) applyCommand(state, { type: 'pickup', targetId: id, actorId: orderee(id) });
  },
  onTreatSelected() {
    const id = selection.get();
    if (id !== null) applyCommand(state, { type: 'treat', targetId: id, actorId: orderee(id) });
  },
  onBuyMedkitSelected(tier) {
    const id = selection.get();
    if (id !== null) applyCommand(state, { type: 'buyKit', tier: tier || 'basic', targetId: id, actorId: orderee(id) });
  },
  onBedrollSelected(type) {
    // 寝袋の命令は選んでいる仲間が受ける
    const id = selection.get();
    if (id !== null) applyCommand(state, { type, actorId: id });
  },
  onFreeSelected() {
    const id = selection.get();
    if (id !== null) applyCommand(state, { type: 'free', targetId: id, actorId: orderee(id) });
  },
});

createSaveUi({
  getState() {
    return state;
  },
  setState(next) {
    applyState(next);
  },
});

const input = createInput({
  canvas,
  camera: sceneCtx.camera,
  rig,
  getPickables: () => dolls.getPickables(),
  groundMesh: terrain.ground,
  onActorTap(id) {
    const result = selection.onTapActor(state, id);
    if (result.action === 'attack') {
      applyCommand(state, { type: 'attack', targetId: id, actorId: orderee(id) });
    }
  },
  onGroundTap() {
    selection.onTapGround();
  },
  onLook() {
    enterLook();
  },
  onReturnFollow() {
    returnFollow();
  },
  panFactor() {
    if (freeCam) return 1;
    const t = rig.target;
    return dragResistance(t.x, t.z, squadCentreNow(), LOOK_RADIUS);
  },
  edgeScroll: edgeParam,
  onMove(x, z) {
    applyCommand(state, { type: 'move', x, z, actorId: orderee(null) });
    marker.position.set(x, heightAt(x, z) + 0.07, z);
    marker.visible = true;
    markerUntil = performance.now() + 1000;
  },
});

const gameApi = {
  state,
  setSpeed,
  command,
  fps: 0,
  perf: {
    fps: 0,
    frameMsAvg: 0,
    frameMsMax: 0,
    pixelRatio: sceneCtx.renderer.getPixelRatio(),
    drawCalls: 0,
    triangles: 0,
  },
};
// 検証用: 描画上のプレイヤー位置（補間後）
gameApi.view = () => dolls.playerPos;
gameApi.lantern = (on, id) => applyCommand(state, { type: 'lantern', on: !!on, id });
gameApi.lights = lights.stats;
// 素材の読み込み結果とテクスチャのおおよその GPU メモリ
gameApi.assets = (() => {
  let groundBytes = 0;
  if (groundTex) {
    for (const t of Object.values(groundTex)) {
      const img = t.image;
      if (img) groundBytes += textureBytes(img.width, img.height);
    }
  }
  return {
    ground: !!groundTex,
    groundSets: GROUND_SETS.length,
    groundBytes,
    models: modelInfo.names,
    missingModels: Object.keys(modelInfo.loaded).filter((k) => !modelInfo.loaded[k]),
    dollTex: lookImages ? texDir : null,
    female: female ? { tex: female.lookImages ? 'assets/tex_f/' : null, hair: female.hairTemplates ? Object.keys(female.hairTemplates) : [] } : null,
    shacks: terrain.shacks ? terrain.shacks.length : 0,
  };
})();
gameApi.crossbows = crossbows.stats;
gameApi.combatFx = combatFx.stats;
// 検証用: 近接武器の持ち方（調整用）
gameApi.grip = GRIP;
gameApi.melees = crossbows.melees;
gameApi.dolls = dolls;
// 検証・撮影用: カメラを置く（注視点 x,z・距離・yaw(度)・pitch(度)）
gameApi.cam = (x, z, dist, yawDeg, pitchDeg, lift) => {
  rig.setFollow(false);
  freeCam = true;
  if (hud) hud.setFollow(false);
  rig.setTarget(x, z, lift ? heightAt(x, z) + lift : undefined);
  if (dist) rig.setDistance(dist);
  if (yawDeg !== undefined) rig.setYaw((yawDeg * Math.PI) / 180);
  if (pitchDeg !== undefined) rig.setPitch(pitchDeg);
  rig.apply();
};
// 検証用: いまの見下ろし角（度）
// 検証用: 追従・見回し
gameApi.follow = () => rig.getFollow();
gameApi.followId = () => followId;
gameApi.returnFollow = () => returnFollow();
gameApi.green = () => (green ? { ...green.stats, visible: green.visibleChunks(), visTris: green.visibleTris() } : null);
gameApi.camTarget = () => ({ x: rig.target.x, z: rig.target.z, fx: rig.focus.x, fz: rig.focus.z });
gameApi.squadCentre = () => squadCentreNow();
gameApi.portraits = () => portraits.count();
// 検証用: 人物の胴の画面座標（CSS px）
gameApi.screenOf = (id) => {
  const p = dollPosition(id);
  if (!p) return null;
  const v = p.clone();
  v.y += 1.0;
  v.project(sceneCtx.camera);
  const r = canvas.getBoundingClientRect();
  return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
};
gameApi.pitch = () => (rig.getPitch() * 180) / Math.PI;
gameApi.sheath = SHEATH;
// 検証・撮影用: 画角を狭めて寄る（カメラの最短距離 8m より近くで見たい時）。引数なしで元へ。
const baseFov = sceneCtx.camera.fov;
gameApi.zoom = (fov) => {
  sceneCtx.camera.fov = fov || baseFov;
  sceneCtx.camera.updateProjectionMatrix();
};
gameApi.select = (id) => selection.select(id);
gameApi.clearSelection = () => selection.clear();
gameApi.selectedId = () => selection.get();
gameApi.showNames = (on) => options.setShowNames(on);
// 検証用: NPC をタップしたのと同じ扱い（選んで情報を出す）
gameApi.tapActor = (id) => selection.onTapActor(state, id);
gameApi.sneak = (on) => applyCommand(state, { type: 'sneak', on: !!on });
gameApi.assassinate = (id) => applyCommand(state, { type: 'assassinate', targetId: id });
gameApi.setHour = (h) => {
  const hour = Number(h);
  if (!Number.isFinite(hour)) return false;
  const clamped = Math.max(0, Math.min(24, hour));
  const dayStart = Math.floor(state.timeSec / 86400) * 86400;
  state.timeSec = dayStart + clamped * 3600;
  return true;
};
// ランダム出現の確認・撮影用
gameApi.spawn = () => spawnSummary(state);
gameApi.forceSquad = (kind, x, z) => {
  const sq = forceSquad(state, kind, x, z);
  dolls.sync(state);
  return sq ? sq.id : null;
};
gameApi.forceSite = (type, x, z) => {
  const site = forceSite(state, type, x, z);
  dolls.sync(state);
  return site ? site.id : null;
};
gameApi.payDemand = (pay) => applyCommand(state, { type: 'demand', pay: !!pay });
gameApi.spawnSites = spawnSites.stats;
window.__game = gameApi;

// 交易の窓（trade1）。ルールは js/sim/trade.js。
const tradeUi = createTradeUI({ getState: () => state, onAfterAct: () => { if (hud) hud.refreshMoney(state); } });
gameApi.trade = tradeUi;

// 野盗の通行料（払う／断る）。画面の上の方に出す。
const demandBox = document.createElement('div');
demandBox.style.cssText =
  'position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:12;display:none;padding:10px 14px;' +
  'background:rgba(30,16,12,0.9);border:1px solid #a04a2a;border-radius:10px;color:#f4e6d0;' +
  'font:14px/1.4 system-ui,sans-serif;text-align:center;max-width:86vw';
const demandText = document.createElement('div');
const demandRow = document.createElement('div');
demandRow.style.cssText = 'margin-top:8px;display:flex;gap:10px;justify-content:center';
function demandButton(label, pay) {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText =
    'font:15px system-ui,sans-serif;padding:8px 18px;border-radius:8px;border:1px solid #c08a5a;' +
    (pay ? 'background:#5a4020;color:#fff' : 'background:#2a1a14;color:#f4c0a0');
  b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    applyCommand(state, { type: 'demand', pay });
  });
  return b;
}
demandRow.append(demandButton('払う', true), demandButton('断る', false));
demandBox.append(demandText, demandRow);
document.body.appendChild(demandBox);
let demandShown = '';
function updateDemandUi() {
  const d = state.spawn && state.spawn.demand;
  const key = d ? d.squadId + ':' + d.amount : '';
  if (key === demandShown) return;
  demandShown = key;
  if (!d) {
    demandBox.style.display = 'none';
    return;
  }
  const boss = state.actors.find((a) => a.id === d.bossId);
  demandText.textContent = (boss ? boss.name : '野盗') + '「通行料だ。錆貨 ' + d.amount + ' 置いていけ」';
  demandBox.style.display = 'block';
}

// ?spawn=debug のとき、出現の数を小さく出す。
let spawnLabel = null;
if (spawnDebug) {
  spawnLabel = document.createElement('div');
  spawnLabel.style.cssText =
    'position:fixed;left:10px;top:120px;z-index:11;pointer-events:none;font:10px/1.35 ui-monospace,monospace;' +
    'color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.9);white-space:pre';
  document.body.appendChild(spawnLabel);
}
const KIND_NAMES = { caravan: '隊商', thieves: '盗賊', raiders: '野盗', beasts: '獣', machines: '古代の遺跡' };
function spawnDebugText() {
  const sum = spawnSummary(state);
  if (!sum) return '出現: なし';
  const c = Object.keys(KIND_NAMES).map((k) => KIND_NAMES[k] + sum.counts[k]).join(' ');
  return (
    '出現 x' + sum.rate + (state.spawn.on ? '' : '（停止）') + '\n' + c + '\n家なし' + sum.homeless + ' 野営地' + sum.camps + ' 巣' + sum.nests +
    '\n出現中' + sum.spawnedAlive + '人 / 全' + sum.alive + '人\n累計 部隊' + sum.stats.squads + ' 消' + sum.stats.despawned + ' 場所' + sum.stats.sites + ' 片付' + sum.stats.cleared
  );
}

window.addEventListener('resize', () => {
  sceneCtx.resize();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    last = performance.now();
    accumulator = 0;
    prevMap.clear();
  }
});

// ?perf=1 のとき、fps の近くに小さな計測表示を出す（hud.js は触らない）。
let perfLabel = null;
if (params.get('perf') === '1') {
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  perfLabel = document.createElement('div');
  perfLabel.style.position = 'fixed';
  perfLabel.style.zIndex = '11';
  perfLabel.style.pointerEvents = 'none';
  perfLabel.style.font = '10px/1.3 ui-monospace, monospace';
  perfLabel.style.color = '#ffffff';
  perfLabel.style.textShadow = '0 1px 2px rgba(0,0,0,0.85)';
  perfLabel.style.whiteSpace = 'nowrap';
  if (portrait) {
    perfLabel.style.right = '12px';
    perfLabel.style.bottom = '72px';
  } else {
    perfLabel.style.left = '14px';
    perfLabel.style.bottom = '24px';
  }
  document.body.appendChild(perfLabel);
}

let last = performance.now();
let fpsFrames = 0;
let fpsElapsed = 0;
let fpsValue = 0;
let firstFrame = true;

let frameMsSum = 0;
let frameMsCount = 0;
let frameMsMax = 0;
let secAvgMs = 0;
let prevSecAvgMs = -1;
let lowMsSeconds = 0;
const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
let pixelRatio = sceneCtx.renderer.getPixelRatio();

function applyPixelRatio(value) {
  const next = Math.max(1, Math.min(maxPixelRatio, value));
  if (Math.abs(next - pixelRatio) < 0.001) return;
  pixelRatio = next;
  sceneCtx.setPixelRatio(next);
}

// 直近2秒の平均が 22ms 超で 0.25 下げ、12ms 未満が5秒続いたら 0.25 上げる。
function tunePixelRatio(avgMs) {
  const avg2 = prevSecAvgMs >= 0 ? (prevSecAvgMs + avgMs) / 2 : avgMs;
  prevSecAvgMs = avgMs;
  if (avg2 > 22) {
    lowMsSeconds = 0;
    if (pixelRatio - 0.25 >= 1) applyPixelRatio(pixelRatio - 0.25);
  } else if (avg2 < 12) {
    lowMsSeconds += 1;
    if (lowMsSeconds >= 5) {
      lowMsSeconds = 0;
      applyPixelRatio(pixelRatio + 0.25);
    }
  } else {
    lowMsSeconds = 0;
  }
}

function frame(now) {
  const raw = (now - last) / 1000;
  last = now;
  const dt = Math.min(0.25, Math.max(0, raw));
  const frameMs = dt * 1000;

  if (!document.hidden && speed > 0 && !state.gameOver) {
    accumulator += (dt * speed) / 0.1;
    let count = 0;
    while (accumulator >= 1 && count < 30 && !state.gameOver) {
      capturePrev();
      step(state);
      accumulator -= 1;
      count += 1;
    }
    // 処理落ちで追いつけない分は捨てる（スパイラル防止）
    if (accumulator >= 1) accumulator = 0.999;
  }

  // 速度0のときは alpha=1 扱いで止める。止まっている間は prev を現在位置に合わせ、
  // 再開した瞬間に前のtickへ戻らないようにする。
  if (speed === 0) capturePrev();
  const alpha = speed > 0 ? Math.min(1, Math.max(0, accumulator)) : 1;
  dolls.sync(state);
  selection.validate(state);
  if (isSquadAlive(selection.get())) orderId = selection.get();
  dolls.setSelected(selection.get());
  dolls.update(dt, speed, state, alpha, prevMap, sceneCtx.camera);
  combatFx.update(state, dolls, dt, speed);
  crossbows.update(state, dolls, alpha, dt);
  spawnSites.update(state, now / 1000);
  bedrolls.update(state);
  updateDemandUi();

  input.update(dt);
  const nextFollow = pickFollowId(state, selection.get());
  if (nextFollow !== followId) {
    // 追従中に相手が替わったら、注視点をなめらかに移す
    if (followId !== null && rig.getFollow()) rig.startGlide();
    followId = nextFollow;
  }
  if (rig.getFollow()) {
    const fp = dollPosition(followId);
    if (fp) rig.setTarget(fp.x, fp.z, fp.y);
    else if (dolls.playerPos.has) rig.setTarget(dolls.playerPos.x, dolls.playerPos.z, dolls.playerPos.y);
  } else if (!freeCam) {
    // 見回しの綱: 部隊の中心から LOOK_RADIUS を超えたら柔らかく押し戻す
    const c = squadCentreNow();
    const t = rig.target;
    const n = leash(t.x, t.z, c, dt, input.isPanning(), LOOK_RADIUS);
    if (n.x !== t.x || n.z !== t.z) rig.setTarget(n.x, n.z);
  }
  rig.apply(dt);
  if (green) green.update(rig.target.x, rig.target.z, sceneCtx.camera.position.y - rig.target.y);
  // カメラを動かした後に置く（1フレーム遅れの揺れを出さない）。
  sceneCtx.camera.updateMatrixWorld();
  nameLabels.update(state, sceneCtx.camera, selection.get(), options.getShowNames());
  sceneCtx.updateDayNight(state.timeSec, rig.getTarget(), dt);
  lights.update(state, dolls, rig.getTarget(), sceneCtx.camera, dt);
  terrain.setNight(Math.min(1, Math.max(0, (darknessOf(ambientLight(state)) - 0.15) / 0.6)));

  if (marker.visible && performance.now() > markerUntil) marker.visible = false;

  sceneCtx.renderer.render(sceneCtx.scene, sceneCtx.camera);

  fpsFrames += 1;
  fpsElapsed += Math.max(0, raw);
  frameMsSum += frameMs;
  frameMsCount += 1;
  if (frameMs > frameMsMax) frameMsMax = frameMs;
  if (fpsElapsed >= 1) {
    fpsValue = fpsFrames / fpsElapsed;
    fpsFrames = 0;
    fpsElapsed = 0;
    gameApi.fps = fpsValue;

    secAvgMs = frameMsCount > 0 ? frameMsSum / frameMsCount : 0;
    tunePixelRatio(secAvgMs);
    const maxMs = frameMsMax;
    const info = sceneCtx.renderer.info.render;
    gameApi.perf.fps = fpsValue;
    gameApi.perf.frameMsAvg = secAvgMs;
    gameApi.perf.frameMsMax = maxMs;
    gameApi.perf.pixelRatio = sceneCtx.renderer.getPixelRatio();
    gameApi.perf.drawCalls = info.calls;
    gameApi.perf.triangles = info.triangles;
    frameMsSum = 0;
    frameMsCount = 0;
    frameMsMax = 0;
    if (spawnLabel) spawnLabel.textContent = spawnDebugText();
    if (perfLabel) {
      perfLabel.textContent =
        secAvgMs.toFixed(1) +
        '/' +
        maxMs.toFixed(1) +
        ' ms  ' +
        gameApi.perf.pixelRatio.toFixed(2) +
        'x  dc ' +
        info.calls;
    }
  }

  portraits.ensure(squadMembers(), (id) => dolls.getDoll(id));
  hud.update(state, {
    speed,
    follow: rig.getFollow(),
    followId,
    fps: fpsValue,
    selectionId: selection.get(),
  });
  tradeUi.update();
  const hudPlayer = findPlayer();
  hud.setSneak(hudPlayer ? !!hudPlayer.sneaking : false);

  if (firstFrame) {
    firstFrame = false;
    window.__ready = true;
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

export { input };
