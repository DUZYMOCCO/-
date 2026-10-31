import { issuePersonContextAction, contextActorHeight } from './ui/person_context.js';
import { paletteIdFor } from './data/faction_map.js';
import { ITEMS } from './sim/items.js';
import { createTurrets } from './render/turrets.js';
// 起動、ループ、URL引数、window.__game。ルール層と描画層をつなぐ。

import * as THREE from 'three';
import { createWorld, step, applyCommand, heightAt, deserialize, darknessOf, ambientLight, initSpawn, forceSquad, forceSite, spawnSummary, ensureTown, doorNear, houseAt } from './sim/index.js';
import { createInteriors, townBuildingSet } from './render/interiors.js';
import { createTownUI } from './ui/town_ui.js';
import { createSpawnSites } from './render/spawn_sites.js';
import { createScene } from './render/scene.js';
import { createTerrain } from './render/terrain.js';
import { createCameraRig } from './render/camera.js';
import { loadDollTemplate, createDollManager } from './render/dolls.js';
import { loadDollTextures, femaleEnabled, BEAUTY_LOOKS, MOB_TEX_DIR, MOB_TEX_NAMES, setMobLooksReady, dollKindFor } from './render/doll_textures.js';
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
import { createInventoryUI } from './ui/inventory.js';
import { panels } from './ui/panels.js';
import { createHudMenu } from './ui/hud_menu.js';
import { createTradeUI } from './ui/trade_ui.js';
import { createSmithUI } from './ui/smith_ui.js';
import { createForgeBenches } from './render/forge_benches.js';
import { createSelection, pickNearestActorScreen } from './ui/selection.js';
import { createContextMenu } from './ui/context_menu.js';
import { createSquadPanel } from './ui/squad_panel.js';
import { createPlayerSquad, renamePlayerSquad, moveMemberToSquad, getSquadOfMember } from './sim/squads.js';
import { formationPositions } from './sim/actions.js';
import { createSaveUi, AUTO_KEY } from './ui/save_ui.js';
import { createNameLabels } from './render/name_labels.js';
import { createDmgNumbers } from './render/dmg_numbers.js';
import { createOptions } from './ui/options.js';
import { createCrossbows, GRIP, SHEATH } from './render/crossbows.js';
import { createBlood } from './render/blood.js';
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
// 入れる小屋・鍵・盗み（bldg1）。?town=0 で無し（従来の外から見るだけの小屋）。
const townOn = params.get('town') !== '0';
function ensureTownOpt(st) {
  if (townOn && !st.town) ensureTown(st);
  return st;
}
function startOpts() {
  const female = femaleOn;
  const spawn = spawnOn;
  const town = townOn;
  if (xbowParam === '0') return { companionCrossbow: false, female, spawn, spawnRate, town };
  if (xbowParam === '1') return { companionCrossbow: true, female, spawn, spawnRate, town };
  let on = true;
  try {
    on = window.localStorage.getItem('sunahate_opt_xbow') !== '0';
  } catch (err) {
    on = true;
  }
  return { companionCrossbow: on, female, spawn, spawnRate, town };
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
ensureTownOpt(state);
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
const terrain = createTerrain(sceneCtx.scene, state, { ground: groundTex, models, renderer: sceneCtx.renderer, fenceGlb: !!propModels.fence, skipBuildings: townOn ? townBuildingSet(state) : null });
// 入れる小屋（壁・屋根・扉の板・家具）。中にいる小屋は屋根と手前の壁を隠す
const interiors = createInteriors(sceneCtx.scene, state, { models, props: propModels });
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
const dmgNumbers = createDmgNumbers(dolls); // 浮かぶダメージ数字（ui/dmgpop.js）
const lights = createLights(sceneCtx.scene, state, models);
const crossbows = createCrossbows(sceneCtx.scene, models);
const turrets = createTurrets(sceneCtx.scene);
const bloodFx = createBlood(sceneCtx.scene, heightAt);
const combatFx = createCombatFx(sceneCtx.scene); // 20:13 チャンバラの火花・受けの構え
const spawnSites = createSpawnSites(sceneCtx.scene, { debug: spawnDebug, props: propModels, nest: nestModels });
// 敷いた寝袋
const bedrolls = createBedrolls(sceneCtx.scene, { noModels: params.get('models') === '0' || params.get('props') === '0' });
// 鍛冶台（smith1）
const forgeBenches = createForgeBenches(sceneCtx.scene, state);
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
  state = ensureTownOpt(ensureSpawn(next));
  spawnSites.reset();
  bedrolls.reset();
  dolls.reset(state);
  nameLabels.clear();
  dmgNumbers.reset();
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

function executeContextAction(action, target, actorIds) {
  if (!action || !target) return;
  const aid = (actorIds && actorIds.length > 0) ? actorIds[0] : orderee(null);
  if (action === 'open' || action === 'close') {
    if (target.type === 'door' || target.houseId !== undefined) {
      applyCommand(state, { type: 'door', houseId: target.houseId || target.id, actorId: aid });
    } else if (target.type === 'chest' || target.boxId !== undefined) {
      applyCommand(state, { type: 'steal', boxId: String(target.boxId || target.id), actorId: aid });
    }
  } else if (action === 'lockpick') {
    const isDoor = target.type === 'door' || target.houseId !== undefined;
    applyCommand(state, {
      type: 'pick',
      kind: isDoor ? 'door' : 'box',
      id: String(target.houseId || target.boxId || target.id),
      actorId: aid,
    });
  } else if (action === 'break') {
    const isDoor = target.type === 'door' || target.houseId !== undefined;
    applyCommand(state, {
      type: 'break',
      kind: isDoor ? 'door' : 'box',
      id: String(target.houseId || target.boxId || target.id),
      actorId: aid,
    });
  } else if (action === 'steal') {
    if (target.type === 'chest' || target.boxId !== undefined) {
      applyCommand(state, { type: 'steal', boxId: String(target.boxId || target.id), all: true, actorId: aid });
    } else {
      const tid = target.actorId !== undefined ? target.actorId : target.id;
      applyCommand(state, { type: 'pickpocket', targetId: tid, actorId: aid });
    }
  } else if (action === 'attack' || action === 'preemptive_attack') {
    const tid = target.actorId !== undefined ? target.actorId : target.id;
    const aids = (actorIds && actorIds.length > 0) ? actorIds : [aid];
    for (const a of aids) {
      applyCommand(state, { type: 'attack', targetId: tid, actorId: a });
    }
  } else if (action === 'follow') {
    const tid = target.actorId !== undefined ? target.actorId : target.id;
    const aids = (actorIds && actorIds.length > 0) ? actorIds : [aid];
    for (const a of aids) {
      applyCommand(state, { type: 'order', order: 'follow', targetId: tid, actorId: a });
    }
  } else if (action === 'bodyguard') {
    const tid = target.actorId !== undefined ? target.actorId : target.id;
    const aids = (actorIds && actorIds.length > 0) ? actorIds : [aid];
    for (const a of aids) {
      applyCommand(state, { type: 'order', order: 'bodyguard', targetId: tid, actorId: a });
    }
  } else if (action === 'talk') {
    const tid = target.actorId !== undefined ? target.actorId : target.id;
    if (gameApi.trade && gameApi.trade.canTradeWith && gameApi.trade.canTradeWith(tid)) {
      gameApi.trade.open(tid);
    } else {
      const targetActor = state.actors.find((a) => a.id === tid);
      if (targetActor) {
        applyCommand(state, { type: 'move', x: targetActor.x, z: targetActor.z, actorId: aid });
      }
    }
  } else if (action === 'assassinate') {
    const tid = target.actorId !== undefined ? target.actorId : target.id;
    applyCommand(state, { type: 'assassinate', targetId: tid, actorId: aid });
  } else if (action === 'treat' || action === 'carry' || action === 'drop') {
    issuePersonContextAction(state, action, target, (actorIds && actorIds.length) ? actorIds : [aid], applyCommand);
  } else if (action === 'loot') {
    const tid = target.actorId !== undefined ? target.actorId : target.id;
    inventoryUi.open(tid);
  } else if (action === 'man') {
    const turretId =
      target.nearbyTurret?.id ||
      target.turret?.id ||
      (target.turretId !== undefined && !target.parts && !target.faction ? target.turretId : null) ||
      (target.nearbyTurretId || (target.turretId ? target.turretId : target.id));
    applyCommand(state, { type: 'mountTurret', turretId, actorId: aid });
  } else if (action === 'leave') {
    applyCommand(state, { type: 'leaveTurret', actorId: aid });
  } else if (action === 'use') {
    smithUi.open(target.bench || target);
  } else if (action === 'pickup') {
    const tid = target.actorId !== undefined ? target.actorId : target.id;
    applyCommand(state, { type: 'pickup', targetId: tid, actorId: aid });
  }
}

const contextMenu = createContextMenu({
  onAction(action, target, actorIds) {
    executeContextAction(action, target, actorIds);
  },
});

function findContextTarget(screenX, screenY) {
  const rect = (typeof canvas !== 'undefined' && canvas.getBoundingClientRect) ? canvas.getBoundingClientRect() : null;
  const width = Math.max(1, (rect && rect.width > 0) ? rect.width : (canvas?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800)));
  const height = Math.max(1, (rect && rect.height > 0) ? rect.height : (canvas?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600)));
  const cam = sceneCtx.camera;
  if (cam) {
    const aspect = width / height;
    if (Math.abs(cam.aspect - aspect) > 0.001) {
      cam.aspect = aspect;
      cam.updateProjectionMatrix();
    }
    cam.updateMatrixWorld();
  }
  const ndc = new THREE.Vector2(
    (screenX / width) * 2 - 1,
    -(screenY / height) * 2 + 1
  );
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, cam);

  function attachNearbyTurret(actor) {
    if (!actor) return;
    const turret = (state.turrets || []).find(
      (t) => (actor.turretId && t.id === actor.turretId) || Math.hypot(t.x - actor.x, t.z - actor.z) <= 2.5
    );
    if (turret) actor.nearbyTurret = turret;
  }

  // 1. Raycast on actors (dolls pickables: squad & non-squad NPCs)
  const pickables = dolls.getPickables();
  if (pickables.length > 0) {
    const hits = ray.intersectObjects(pickables, true);
    for (const hit of hits) {
      let obj = hit.object;
      while (obj) {
        if (obj.userData && obj.userData.actorId !== undefined) {
          const actor = state.actors.find((a) => a.id === obj.userData.actorId);
          if (actor) {
            attachNearbyTurret(actor);
            return actor;
          }
        }
        obj = obj.parent;
      }
    }
  }

  // 1b. Screen-space fallback: project each visible living actor's torso (ground height + 1.0)
  // to screen and pick the nearest within ~36 CSS px of the press point BEFORE doors/boxes/turrets.
  // Actors always win over objects when both are in range.
  if (Array.isArray(state.actors) && cam) {
    const candidates = [];
    for (const a of state.actors) {
      if (a.state === 'dead') continue;
      const ay = heightAt(a.x, a.z) + contextActorHeight(a);
      const v = new THREE.Vector3(a.x, ay, a.z);
      v.project(cam);
      if (v.z < -1 || v.z > 1) continue;
      if (v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1) continue;
      const sx = Math.round(((v.x + 1) * 0.5) * width);
      const sy = Math.round(((-v.y + 1) * 0.5) * height);
      candidates.push({ actor: a, screen: [sx, sy] });

      const dp = dollPosition(a.id);
      if (dp && (Math.abs(dp.x - a.x) > 0.05 || Math.abs(dp.z - a.z) > 0.05)) {
        const dpy = heightAt(dp.x, dp.z) + contextActorHeight(a);
        const dv = new THREE.Vector3(dp.x, dpy, dp.z);
        dv.project(cam);
        if (dv.z >= -1 && dv.z <= 1 && dv.x >= -1.1 && dv.x <= 1.1 && dv.y >= -1.1 && dv.y <= 1.1) {
          const dsx = Math.round(((dv.x + 1) * 0.5) * width);
          const dsy = Math.round(((-dv.y + 1) * 0.5) * height);
          candidates.push({ actor: a, screen: [dsx, dsy] });
        }
      }
    }
    const hitActor = pickNearestActorScreen(candidates, screenX, screenY, 36);
    if (hitActor) {
      const act = hitActor.actor || hitActor;
      attachNearbyTurret(act);
      return act;
    }
  }

  // 2. 3D distance from ray to doors in town
  if (state.town && Array.isArray(state.town.houses)) {
    let bestDoor = null;
    let bestDoorDist = 1.8;
    for (const h of state.town.houses) {
      if (!h.door) continue;
      const dy = heightAt(h.door.x, h.door.z) + 1.0;
      const p = new THREE.Vector3(h.door.x, dy, h.door.z);
      const d = ray.ray.distanceToPoint(p);
      if (d < bestDoorDist) {
        bestDoorDist = d;
        bestDoor = h;
      }
    }
    if (bestDoor) {
      return { type: 'door', houseId: bestDoor.id, door: bestDoor.door };
    }
  }

  // 3. 3D distance from ray to boxes in town
  if (state.town && Array.isArray(state.town.boxes)) {
    let bestBox = null;
    let bestBoxDist = 1.5;
    for (const b of state.town.boxes) {
      const by = heightAt(b.x, b.z) + 0.4;
      const p = new THREE.Vector3(b.x, by, b.z);
      const d = ray.ray.distanceToPoint(p);
      if (d < bestBoxDist) {
        bestBoxDist = d;
        bestBox = b;
      }
    }
    if (bestBox) {
      return { type: 'chest', boxId: bestBox.id, box: bestBox, locked: bestBox.locked };
    }
  }

  // 4. Ground raycast fallback
  if (terrain.ground) {
    const hits = ray.intersectObject(terrain.ground, false);
    if (hits.length > 0) {
      const gx = hits[0].point.x;
      const gz = hits[0].point.z;
      // Actor picks must be checked before turrets/ground objects
      const nearbyActor = (state.actors || []).find(
        (a) => a.state !== 'dead' && Math.hypot(a.x - gx, a.z - gz) <= 2.0
      );
      if (nearbyActor) {
        attachNearbyTurret(nearbyActor);
        return nearbyActor;
      }
      const dh = doorNear(state, gx, gz, 2.5);
      if (dh) return { type: 'door', houseId: dh.id, door: dh.door };
      const box = (state.town?.boxes || []).find((b) => Math.hypot(b.x - gx, b.z - gz) <= 2.5);
      if (box) return { type: 'chest', boxId: box.id, box, locked: box.locked };
      const turret = (state.turrets || []).find((t) => Math.hypot(t.x - gx, t.z - gz) <= 2.5);
      if (turret) return { type: 'turret', turretId: turret.id, turret };
      const bench = (state.forgeBenches || []).find((b) => Math.hypot(b.x - gx, b.z - gz) <= 2.5);
      if (bench) return { type: 'bench', benchId: bench.id, bench };
    }
  }
  return null;
}

let hudMenu = null;
const inventoryUi = createInventoryUI(() => state, (cmd) => applyCommand(state, cmd));
const squadPanel = createSquadPanel({
  getState: () => state,
  onUpdate: () => {
    // 部隊更新時の処理
  },
});
hud = createHud({
  onInventory() { inventoryUi.open(focusActor()?.id || selection.get()); },
  onSelectSquadTab(squadId) {
    const sq = (state.playerSquads || []).find((s) => s.id === squadId);
    if (sq && sq.memberIds && sq.memberIds.length > 0) {
      const living = sq.memberIds.filter((id) => {
        const a = state.actors.find((act) => act.id === id);
        return a && a.state !== 'dead';
      });
      selection.selectSquad(living.length > 0 ? living : sq.memberIds);
      returnFollow();
    }
  },
  onCreateSquad(name) {
    createPlayerSquad(state, name);
  },
  onRenameSquad(squadId, newName) {
    renamePlayerSquad(state, squadId, newName);
  },
  onToggleBehavior(toggle) {
    const sel = selection.getSelectedSquadIds();
    const targetIds = sel.length > 0 ? sel : (focusActor() ? [focusActor().id] : []);
    for (const id of targetIds) {
      applyCommand(state, { type: 'toggle', toggle, actorId: id });
    }
  },
  onOpenSquadPanel() {
    if (hudMenu && hudMenu.close) hudMenu.close();
    squadPanel.open();
  },
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
  onSelectAll() {
    selection.selectAllSquad(state);
  },
  onToggleOrder() {
    const sel = selection.getSelectedSquadIds();
    const targetIds = sel.length > 0 ? sel : (focusActor() ? [focusActor().id] : []);
    const first = state.actors.find((a) => targetIds.includes(a.id));
    const nextOrder = first && first.order === 'hold' ? 'follow' : 'hold';
    for (const id of targetIds) {
      applyCommand(state, { type: 'order', order: nextOrder, actorId: id });
    }
  },
  onCycleStance() {
    const sel = selection.getSelectedSquadIds();
    const targetIds = sel.length > 0 ? sel : (focusActor() ? [focusActor().id] : []);
    const first = state.actors.find((a) => targetIds.includes(a.id));
    const cur = first ? first.stance : 'defensive';
    const nextStance = cur === 'defensive' ? 'aggressive' : cur === 'aggressive' ? 'passive' : 'defensive';
    for (const id of targetIds) {
      applyCommand(state, { type: 'stance', stance: nextStance, actorId: id });
    }
  },
  onLantern(on) {
    const ids = selection.getSelectedSquadIds();
    if (ids.length > 0) {
      for (const id of ids) applyCommand(state, { type: 'lantern', on: !!on, id });
    } else {
      applyCommand(state, { type: 'lantern', on: !!on });
    }
  },
  onTurretSelected() {
    const sel = selection.getSelectedSquadIds();
    const id = sel.length > 0 ? sel[0] : selection.get();
    const actor = state.actors.find((a) => a.id === id);
    if (!actor) return;
    if (actor.turretId) applyCommand(state, { type: 'leaveTurret', actorId: id });
    else {
      const t = (state.turrets || []).filter((t) => t.operatorId == null && Math.hypot(t.x - actor.x, t.z - actor.z) <= 8).sort((a, b) => Math.hypot(a.x - actor.x, a.z - actor.z) - Math.hypot(b.x - actor.x, b.z - actor.z))[0];
      if (t) applyCommand(state, { type: 'mountTurret', turretId: t.id, actorId: id });
    }
  },
  onLanternSelected() {
    const ids = selection.getSelectedSquadIds();
    const targetIds = ids.length > 0 ? ids : [selection.get()].filter(Boolean);
    for (const id of targetIds) {
      const actor = state.actors.find((a) => a.id === id);
      if (actor) applyCommand(state, { type: 'lantern', on: !actor.lantern, id });
    }
  },
  onSneak(player) {
    const sel = selection.getSelectedSquadIds();
    const targetIds = sel.length > 0 ? sel : (focusActor() ? [focusActor().id] : []);
    const actors = targetIds.map((id) => state.actors.find((a) => a.id === id)).filter(Boolean);
    const anySneak = actors.some((a) => a.sneaking);
    for (const a of actors) {
      applyCommand(state, { type: 'sneak', on: !anySneak, actorId: a.id });
    }
  },
  onAttackSelected() {
    const id = selection.get();
    if (id !== null) {
      const selectedSquad = selection.getSelectedSquadIds();
      if (selectedSquad.length > 1) {
        for (const aid of selectedSquad) applyCommand(state, { type: 'attack', targetId: id, actorId: aid });
      } else {
        applyCommand(state, { type: 'attack', targetId: id, actorId: orderee(id) });
      }
    }
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
  onBuyGearSelected() {
    const id = selection.get();
    if (id !== null) applyCommand(state, { type: 'buyGear', targetId: id, actorId: orderee(id) });
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

const saveUi = createSaveUi({
  getState() {
    return state;
  },
  setState(next) {
    applyState(next);
  },
});

const input = createInput({
  onInventoryToggle: () => inventoryUi.toggle(focusActor()?.id || selection.get()),
  onInventoryClose: () => inventoryUi.close(),
  canvas,
  camera: sceneCtx.camera,
  rig,
  getPickables: () => dolls.getPickables(),
  groundMesh: terrain.ground,
  onActorTap(id, event) {
    const shiftKey = !!event?.shiftKey;
    const result = selection.onTapActor(state, id, { shiftKey });
    if (result.action === 'attack') {
      const selectedSquad = selection.getSelectedSquadIds();
      if (selectedSquad.length > 1) {
        for (const actorId of selectedSquad) {
          applyCommand(state, { type: 'attack', targetId: id, actorId });
        }
      } else {
        applyCommand(state, { type: 'attack', targetId: id, actorId: orderee(id) });
      }
    }
  },
  onGroundTap() {
    selection.onTapGround();
  },
  onContextMenu(x, y, clientX, clientY) {
    const target = findContextTarget(x, y);
    if (target) {
      const selSquad = selection.getSelectedSquadIds();
      const actorIds = selSquad.length > 0 ? selSquad : (focusActor() ? [focusActor().id] : []);
      contextMenu.open(state, actorIds, target, clientX, clientY);
    }
  },
  onBoxSelect(x0, y0, x1, y1, isShift) {
    const squadMembers = state.actors.filter((a) => a.faction === 'player' && a.state !== 'dead');
    const inside = [];
    for (const m of squadMembers) {
      const screen = gameApi.screenOf(m.id);
      if (screen) {
        if (screen[0] >= x0 && screen[0] <= x1 && screen[1] >= y0 && screen[1] <= y1) {
          inside.push(m.id);
        }
      }
    }
    if (inside.length > 0) {
      if (isShift) {
        for (const id of inside) selection.toggleSquadMember(id);
      } else {
        selection.selectSquad(inside);
      }
    }
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
    const members = selection.getSelectedSquadIds();
    if (members.length > 1) {
      const sq = getSquadOfMember(state, members[0]);
      const formation = sq && sq.ai && sq.ai.formation ? sq.ai.formation : 'line';
      const poses = formationPositions(members, x, z, 1.4, formation);
      for (const pos of poses) {
        applyCommand(state, { type: 'move', x: pos.x, z: pos.z, actorId: pos.id });
      }
      marker.position.set(x, heightAt(x, z) + 0.07, z);
      marker.visible = true;
      markerUntil = performance.now() + 1000;
      return;
    }
    // 扉のそば（0.9m）を押したら、そこへ歩いて開け閉め
    const dh = doorNear(state, x, z, 0.9);
    if (dh) {
      applyCommand(state, { type: 'door', houseId: dh.id, actorId: orderee(null) });
      return;
    }
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
  toasts: () => hud.toasts(),
  history: () => hud.history(),
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
gameApi.openInventory = (id) => inventoryUi.open(id);
gameApi.closeInventory = () => inventoryUi.close();
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
// 撮影用: シミュレーションを進めず防御姿勢の立ち上がりを評価する。
gameApi.previewBlock = () => { for (let i = 0; i < 10; i += 1) combatFx.update(state, dolls, 0.1, 1); };
gameApi.resetPreviewBlock = () => combatFx.reset();
gameApi.dmgPops = dmgNumbers;
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
// Explicitly invoked screenshot setup; this mutates only the debug session.
gameApi.debugCarry = (options = {}) => {
  const carrier = state.actors.find(a => a.id === state.playerId);
  const target = state.actors.find(a => a.id !== carrier?.id && a.faction !== 'player' && a.faction !== 'beast' && a.carriedBy == null && a.carryingId == null && (!options.female || (dolls.femaleReady && dollKindFor(a, true, state) === 'f')) && (() => { const d = dolls.getDoll(a.id); return d && !d.fallback && !d.beast && !d.machine; })());
  if (!carrier || !target) return null;
  if (carrier.carryingId != null) return null;
  Object.assign(carrier, { rot: 0, moveTo: null, targetId: null, carryingId: target.id });
  Object.assign(target, { x: carrier.x, z: carrier.z, state: 'down', anim: 'Fall', carriedBy: carrier.id, moveTo: null, targetId: null });
  setSpeed(0);
  dolls.sync(state);
  gameApi.cam(carrier.x, carrier.z, null, carrier.rot * 180 / Math.PI + 90, 10, 1.1);
  rig.setDebugDistance(3.3);
  rig.apply();
  return { carrierId: carrier.id, targetId: target.id };
};
// Explicit debug session mutation, framed from the target's side.
gameApi.debugKO = (mode) => {
  if (mode != null && mode !== 'ragdoll' && mode !== 'anim') return null;
  const player = state.actors.find(a => a.id === state.playerId);
  if (!player) return null;
  const candidates = state.actors.filter(a => a.faction !== 'player' && a.faction !== 'beast' && a.state !== 'down' && a.state !== 'dead' && a.carriedBy == null && a.carryingId == null);
  candidates.sort((a,b) => Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z));
  const target = candidates.find(a => { const d=dolls.getDoll(a.id); return d && !d.machine && !d.beast && !d.fallback; });
  if (!target) return null;
  const doll = dolls.getDoll(target.id);
  doll.debugKOMode = mode || null; doll.wasDown = false;
  Object.assign(target, { state:'down', anim:'Fall', animTick:state.tick, downTicks:10000, moveTo:null, targetId:null });
  setSpeed(1); dolls.sync(state);
  gameApi.cam(target.x, target.z, 5, (target.rot * 180 / Math.PI) + 90, 12, 0.7);
  return { targetId:target.id, mode:mode || 'auto' };
};
gameApi.debugBleed = () => {
  const result = gameApi.debugKO('anim');
  if (!result) return null;
  const actor = state.actors.find(a => a.id === result.targetId);
  actor.bleed = 2; actor.gush = 0; actor.blood = 65;
  if (actor.parts?.chest) actor.parts.chest.hp = Math.min(actor.parts.chest.hp, 35);
  return result;
};
// Screenshot setup: pause and select a damaged, bleeding squad member.
gameApi.debugStatus = () => {
  const actor = state.actors.find(a => a.id === state.playerId);
  if (!actor?.parts?.chest || !actor.parts.head) return null;
  actor.parts.chest.hp = actor.parts.chest.max * 0.68;
  actor.parts.head.hp = -8;
  actor.parts.head.wound = Math.max(0, actor.parts.head.max - 44);
  actor.bleed = 1; actor.gush = 0; actor.blood = 71;
  setSpeed(0); selection.select(actor.id);
  return { actorId: actor.id };
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
gameApi.selectSquad = (ids) => selection.selectSquad(ids);
gameApi.selectedSquad = () => selection.getSelectedSquadIds();
gameApi.selectAll = () => selection.selectAllSquad(state);
gameApi.clearSelection = () => selection.clear();
gameApi.selectedId = () => selection.get();
gameApi.showNames = (on) => options.setShowNames(on);
// 検証用: NPC をタップしたのと同じ扱い（選んで情報を出す）
gameApi.tapActor = (id) => selection.onTapActor(state, id);
gameApi.setOrder = (order, actorId) => applyCommand(state, { type: 'order', order, actorId });
gameApi.setStance = (stance, actorId) => applyCommand(state, { type: 'stance', stance, actorId });
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

// デバッグ・撮影用ターゲット検出と長押しシミュレート
gameApi.debugTargets = () => {
  const rect = (typeof canvas !== 'undefined' && canvas.getBoundingClientRect) ? canvas.getBoundingClientRect() : null;
  const width = Math.max(1, (rect && rect.width > 0) ? rect.width : (canvas?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800)));
  const height = Math.max(1, (rect && rect.height > 0) ? rect.height : (canvas?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600)));
  const cam = sceneCtx.camera;
  if (cam) {
    const aspect = width / height;
    if (Math.abs(cam.aspect - aspect) > 0.001) {
      cam.aspect = aspect;
      cam.updateProjectionMatrix();
    }
    cam.updateMatrixWorld();
  }

  function toScreen(wx, wy, wz) {
    if (!cam) return null;
    const v = new THREE.Vector3(wx, wy, wz);
    v.project(cam);
    if (v.z < -1 || v.z > 1) return null;
    if (v.x < -1 || v.x > 1 || v.y < -1 || v.y > 1) return null;
    const sx = Math.round(((v.x + 1) * 0.5) * width);
    const sy = Math.round(((-v.y + 1) * 0.5) * height);
    if (sx < 0 || sx > width || sy < 0 || sy > height) return null;
    return { screen: [sx, sy], distFromCenter: Math.hypot(v.x, v.y) };
  }

  function collectVisible() {
    const list = [];

    // 1. カメラ近くの部隊外NPC（画面中央に近いものを優先）
    const nonSquad = (state.actors || []).filter(
      (a) => a.state !== 'dead' && (a.faction !== 'player' || a.state === 'down' || a.carryingId != null)
    );
    const npcHits = [];
    for (const a of nonSquad) {
      const ay = heightAt(a.x, a.z) + contextActorHeight(a);
      const res = toScreen(a.x, ay, a.z);
      if (res) {
        npcHits.push({ kind: a.state === 'down' ? 'downed' : a.carryingId != null ? 'carrier' : 'npc', id: a.id, screen: res.screen, dist: res.distFromCenter });
      }
    }
    npcHits.sort((a, b) => a.dist - b.dist);
    for (const hit of npcHits) {
      list.push({ kind: hit.kind, id: hit.id, screen: hit.screen });
    }

    // 2. カメラ近くの街の扉
    if (state.town && Array.isArray(state.town.houses)) {
      const doorHits = [];
      for (const h of state.town.houses) {
        if (!h.door) continue;
        const dy = heightAt(h.door.x, h.door.z) + 1.0;
        const res = toScreen(h.door.x, dy, h.door.z);
        if (res) {
          doorHits.push({ kind: 'door', id: h.id, screen: res.screen, dist: res.distFromCenter });
        }
      }
      doorHits.sort((a, b) => a.dist - b.dist);
      for (const hit of doorHits.slice(0, 3)) {
        list.push({ kind: hit.kind, id: hit.id, screen: hit.screen });
      }
    }

    // 3. カメラ近くの街の箱
    if (state.town && Array.isArray(state.town.boxes)) {
      const boxHits = [];
      for (const b of state.town.boxes) {
        const by = heightAt(b.x, b.z) + 0.4;
        const res = toScreen(b.x, by, b.z);
        if (res) {
          boxHits.push({ kind: 'box', id: b.id, screen: res.screen, dist: res.distFromCenter });
        }
      }
      boxHits.sort((a, b) => a.dist - b.dist);
      for (const hit of boxHits.slice(0, 3)) {
        list.push({ kind: hit.kind, id: hit.id, screen: hit.screen });
      }
    }

    return list;
  }

  let out = collectVisible();
  if (out.length === 0 && rig && cam) {
    const focusPos = rig.getTarget ? rig.getTarget() : rig.target;
    const fx = focusPos ? focusPos.x : 0;
    const fz = focusPos ? focusPos.z : 0;

    let nearest = null;
    let minDist = Infinity;

    const nonSquad = (state.actors || []).filter(
      (a) => a.faction !== 'player' && a.state !== 'dead'
    );
    for (const a of nonSquad) {
      const d = Math.hypot(a.x - fx, a.z - fz);
      if (d < minDist) {
        minDist = d;
        nearest = { x: a.x, z: a.z };
      }
    }

    if (state.town && Array.isArray(state.town.houses)) {
      for (const h of state.town.houses) {
        if (!h.door) continue;
        const d = Math.hypot(h.door.x - fx, h.door.z - fz);
        if (d < minDist) {
          minDist = d;
          nearest = { x: h.door.x, z: h.door.z };
        }
      }
    }

    if (state.town && Array.isArray(state.town.boxes)) {
      for (const b of state.town.boxes) {
        const d = Math.hypot(b.x - fx, b.z - fz);
        if (d < minDist) {
          minDist = d;
          nearest = { x: b.x, z: b.z };
        }
      }
    }

    if (nearest) {
      rig.setFollow(false);
      freeCam = true;
      if (hud) hud.setFollow(false);

      let targetX = nearest.x;
      let targetZ = nearest.z;
      if (state.town && Array.isArray(state.town.houses)) {
        const nearbyDoor = state.town.houses
          .map((h) => h.door)
          .filter(Boolean)
          .find((d) => Math.hypot(d.x - nearest.x, d.z - nearest.z) <= 15);
        if (nearbyDoor) {
          targetX = (nearest.x + nearbyDoor.x) / 2;
          targetZ = (nearest.z + nearbyDoor.z) / 2;
        }
      }
      rig.setTarget(targetX, targetZ);
      rig.apply();
      cam.updateMatrixWorld();
      out = collectVisible();
      if (out.length === 0) {
        rig.setTarget(nearest.x, nearest.z);
        rig.apply();
        cam.updateMatrixWorld();
        out = collectVisible();
      }
    }
  }

  return out;
};

gameApi.longPressAt = (x, y) => {
  const rect = (typeof canvas !== 'undefined' && canvas.getBoundingClientRect) ? canvas.getBoundingClientRect() : null;
  const clientX = (rect && typeof rect.left === 'number' ? rect.left : 0) + x;
  const clientY = (rect && typeof rect.top === 'number' ? rect.top : 0) + y;
  const target = findContextTarget(x, y);
  if (target) {
    const selSquad = selection.getSelectedSquadIds();
    const actorIds = selSquad.length > 0 ? selSquad : (focusActor() ? [focusActor().id] : []);
    contextMenu.open(state, actorIds, target, clientX, clientY);
  }
  return target;
};

gameApi.panels = () => panels.list();
window.__game = gameApi;
// In-play spawn inspection. The caravan uses the real squad spawning path.
if (params.get('gearcheck') === '1') {
  const pl = state.actors.find(a => a.id === state.playerId) || state.actors[0];
  const caravan = forceSquad(state, 'caravan', pl.x + 5, pl.z + 5);
  const noble = forceSquad(state, 'noble_patrol', pl.x + 8, pl.z + 5);
  const rich = forceSquad(state, 'rich_caravan', pl.x + 11, pl.z + 5);
  const caravanIds = new Set([...(caravan?.memberIds || []), ...(noble?.memberIds || []), ...(rich?.memberIds || [])]);
  const panel = document.createElement('details');
  panel.style.cssText = 'position:fixed;z-index:90;left:8px;bottom:65px;max-height:35vh;max-width:90vw;overflow:auto;background:#151a1eeb;color:#fff;padding:6px;font:12px/1.4 sans-serif;pointer-events:auto;touch-action:pan-y';
  const summary = document.createElement('summary'); summary.textContent = 'NPC 防具一覧'; panel.appendChild(summary);
  const content = document.createElement('div'); content.style.whiteSpace = 'pre-wrap'; panel.appendChild(content);
  document.body.appendChild(panel);
  const updateGearCheck = () => {
    const people = state.actors.filter(a => a.faction !== 'player' && (caravanIds.has(a.id) || a.job === 'post_guard' || a.squadId?.startsWith('guard'))).sort((a,b) => Number(caravanIds.has(b.id)) - Number(caravanIds.has(a.id)));
    content.textContent = '出現した NPC の防具（胴）\n' + people.slice(0,30).map(a => {
      const item = ITEMS[a.equip?.upperOut?.id];
      return paletteIdFor(a) + ' / ' + (a.role || a.job || 'guard') + ' / ' + (a.name || a.id) + '：' + (item ? item.name + ' ' + item.weight + 'kg' : 'なし');
    }).join('\n');
  };
  updateGearCheck(); setInterval(updateGearCheck, 2000);
}
// Explicit visual QA fixtures; normal games are unaffected.
if (params.get('logdemo') === '1') {
  const demo = setInterval(() => {
    if (!window.__ready) return;
    clearInterval(demo);
    state.log.push({ tick: state.tick, type: 'dead', text: '旅の仲間が倒れた' });
  }, 200);
}
if (params.get('crowd') === '1') {
  const guards = state.actors.filter(a => a.job === 'post_guard').concat(state.actors.filter(a => a.faction === 'guard' && !a.job)).slice(0, 6);
  const player = state.actors.find(a => a.id === state.playerId);
  if (player) guards.forEach((a, i) => { a.x = player.x + (i % 3 - 1) * 2; a.z = player.z + 3 + Math.floor(i / 3) * 2; });
}



// 交易の窓（trade1）。ルールは js/sim/trade.js。
const tradeUi = createTradeUI({ getState: () => state, onAfterAct: () => { if (hud) hud.refreshMoney(state); } });
gameApi.trade = tradeUi;
const squadMenuBtn = document.createElement('button');
squadMenuBtn.type = 'button';
squadMenuBtn.className = 'opt-toggle';
squadMenuBtn.textContent = '部隊';
squadMenuBtn.title = '部隊管理とAI設定';
squadMenuBtn.addEventListener('click', () => {
  squadPanel.open();
});
hudMenu = createHudMenu({
  trade: tradeUi.button,
  save: saveUi.toggle,
  options: options.toggle,
  lantern: hud.lanternButton,
  history: hud.historyButton,
  squad: squadMenuBtn,
});

// 鍛冶（smith1）: リズムミニゲーム・品質計算・武器強化
const smithUi = createSmithUI({ getState: () => state, command: (cmd) => applyCommand(state, cmd) });
gameApi.openForge = (bench) => smithUi.open(bench);
gameApi.closeForge = () => smithUi.close();
gameApi.smith = smithUi;

// 町（bldg1）: 手元の行動ボタン・賞金・捕まえに来た時の答え
function focusActor() {
  const selSquad = selection.getSelectedSquadIds();
  if (selSquad.length > 0) {
    const a = state.actors.find((e) => e.id === selSquad[0] && e.state !== 'dead');
    if (a) return a;
  }
  const id = orderee(null);
  const a = id !== null ? state.actors.find((e) => e.id === id) : null;
  return a || findPlayer();
}
const townUi = createTownUI({
  getState: () => state,
  getActor: focusActor,
  command: (cmd) => applyCommand(state, cmd),
  onForge: (bench) => smithUi.open(bench),
});
gameApi.town = {
  ui: townUi.stats,
  interiors: interiors.stats,
  // 撮影用: 描画を待たずに n tick 進める（止まった時点で返す）
  step: (n, until) => {
    for (let i = 0; i < n; i++) {
      capturePrev();
      step(state);
      if (until && until(state)) return i + 1;
    }
    return n;
  },
  focus: () => {
    const a = focusActor();
    return a ? { id: a.id, x: a.x, z: a.z, inside: houseAt(state, a.x, a.z, 0.15) ? houseAt(state, a.x, a.z, 0.15).id : null } : null;
  },
};

// ?smithdemo=1 で開始地点近くに鍛冶台を置き、直接鍛冶パネルを開く（撮影・動作確認用）
if (params.get('smithdemo') === '1') {
  const pl = state.actors.find((a) => a.id === state.playerId) || state.actors.find((a) => a.faction === 'player');
  if (pl) {
    if (!Array.isArray(state.forgeBenches)) state.forgeBenches = [];
    let demoBench = state.forgeBenches.find((b) => b.id === 'demo_forge_bench');
    if (!demoBench) {
      demoBench = {
        id: 'demo_forge_bench',
        name: '鍛冶台',
        x: Math.round((pl.x + 2.0) * 100) / 100,
        z: Math.round(pl.z * 100) / 100,
        rot: 0,
        tier: 2,
      };
      state.forgeBenches.push(demoBench);
    }
    if (!Array.isArray(pl.inv)) pl.inv = [];
    if (!pl.inv.some((it) => ITEMS[it.id]?.slot === 'weapon')) {
      pl.inv.push({ id: 'sword', rank: 1, n: 1 });
      pl.inv.push({ id: 'club', rank: 2, n: 1 });
    }
    const sampleMatIds = ['scrap_iron', 'magma_glazed_pottery', 'ancient_alloy_plate', 'desert_wyrm_scale'];
    for (const mId of sampleMatIds) {
      if (!pl.inv.some((it) => it.id === mId)) {
        pl.inv.push({ id: mId, rank: 1, n: 3 });
      }
    }
    forgeBenches.sync();
    smithUi.open(demoBench);
  }
}

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
  demandText.textContent = (boss ? boss.name : '野盗') + '「通行料だ。キャッシュ ' + d.amount + ' 置いていけ」';
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
  const selSquad = selection.getSelectedSquadIds();
  dolls.setSelected(selSquad.length > 0 ? selSquad : (selection.get() !== null ? [selection.get()] : []));
  dolls.update(dt, speed, state, alpha, prevMap, sceneCtx.camera);
  combatFx.update(state, dolls, dt, speed);
  bloodFx.update(state, dt);
  crossbows.update(state, dolls, alpha, dt);
  turrets.update(state);
  spawnSites.update(state, now / 1000);
  bedrolls.update(state);
  updateDemandUi();

  input.update(dt);
  inventoryUi.update();
  const nextFollow = pickFollowId(state, selection.get());
  if (nextFollow !== followId) {
    // 追従中に相手が替わったら、注視点をなめらかに移す
    if (followId !== null && rig.getFollow()) rig.startGlide();
    followId = nextFollow;
  }
  if (rig.getFollow()) {
    const selSquad = selection.getSelectedSquadIds();
    if (selSquad.length > 1) {
      const pts = selSquad.map((id) => dollPosition(id)).filter(Boolean);
      if (pts.length > 0) {
        const sc = squadCentre(pts);
        if (sc) rig.setTarget(sc.x, sc.z, sc.y);
      }
    } else {
      const fp = dollPosition(followId);
      if (fp) rig.setTarget(fp.x, fp.z, fp.y);
      else if (dolls.playerPos.has) rig.setTarget(dolls.playerPos.x, dolls.playerPos.z, dolls.playerPos.y);
    }
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
  dmgNumbers.update(state, sceneCtx.camera, dt);
  sceneCtx.updateDayNight(state.timeSec, rig.getTarget(), dt);
  lights.update(state, dolls, rig.getTarget(), sceneCtx.camera, dt);
  const nightK = Math.min(1, Math.max(0, (darknessOf(ambientLight(state)) - 0.15) / 0.6));
  terrain.setNight(nightK);
  interiors.setNight(nightK);
  {
    const fa = focusActor();
    const fp = fa ? dollPosition(fa.id) : null;
    interiors.update(state, fp ? { x: fp.x, z: fp.z } : fa, sceneCtx.camera.position, dt);
  }

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
    selectedSquadIds: selection.getSelectedSquadIds(),
  });
  tradeUi.update();
  townUi.update();
  const hudFocus = focusActor();
  hud.setSneak(hudFocus ? !!hudFocus.sneaking : false);

  if (firstFrame) {
    firstFrame = false;
    window.__ready = true;
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

export { input };
