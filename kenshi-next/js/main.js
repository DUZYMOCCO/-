import { teleportSquad } from './sim/teleport.js';
import { applyDebug } from './sim/commands.js';
import { installTouchGuards } from './ui/touch_guards.js';
import { talkProfile, lineFor } from './sim/dialogue_hooks.js';
import { getDialogueRuntime, dialogueDebugState, dialogueDebugStart, simulationMayAdvance } from './sim/dialogue_system.js';
import { buildDialogueWorld, dialogueWorldForUi, dialogueActorCanTalk } from './sim/dialogue_world.js';
import { factionName } from './sim/faction_relations.js';
import { createBubbleLayer, createChoiceWindow } from './ui/bubbles.js';
import { settlementPeopleInfo } from './sim/settlement_people.js';
import { GIANTS } from './render/giants_plan.js';
import { blockedAt } from './sim/collide.js';
import { createGiants } from './render/giants.js';
import { issuePersonContextAction, contextActorHeight } from './ui/person_context.js';
import { paletteIdFor } from './data/faction_map.js';
import { ITEMS } from './sim/items.js';
import { WEAPONS, VISION } from './sim/data.js';
import { emitBark, emitBaseReaction, townRumour, shopGreeting, pushNarrativeBubbles, registerTextItems, getBounties } from './sim/narrative_text.js';
import { createTurrets } from './render/turrets.js';
// 起動、ループ、URL引数、window.__game。ルール層と描画層をつなぐ。

import * as THREE from 'three';
import { createWorld, step, applyCommand, heightAt, deserialize, darknessOf, ambientLight, initSpawn, forceSquad, forceSite, spawnSummary, ensureTown, doorNear, houseAt, updateBuild, insertGate } from './sim/index.js';
import { createInteriors, townBuildingSet } from './render/interiors.js';
import { createTownUI } from './ui/town_ui.js';
import { createSpawnSites } from './render/spawn_sites.js';
import { createScene } from './render/scene.js';
import { createTerrain } from './render/terrain.js';
import { createTerrainChunks } from './render/terrain_chunks.js';
import { createSettlements } from './render/settlements.js';
import { createBuildBoxes } from './render/build_boxes.js';
import { nearestSettlement, SETTLEMENTS, saleLots } from './world/settlement_plan.js';
import { WORLD_LAYOUT } from './data/world_layout.js';
import { WORLD_BOUNDS, clampToWorld } from './sim/world_bounds.js';
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
import { createMapPanel } from './ui/map_panel.js';
import { createTradeUI } from './ui/trade_ui.js';
import { createSmithUI } from './ui/smith_ui.js';
import { createForgeBenches } from './render/forge_benches.js';
import { createSelection, pickNearestActorScreen } from './ui/selection.js';
import { createContextMenu } from './ui/context_menu.js';
import { createSquadPanel } from './ui/squad_panel.js';
import { createPlayerSquad, renamePlayerSquad, moveMemberToSquad, getSquadOfMember } from './sim/squads.js';
import { formationPositions } from './sim/actions.js';
import { outpostAt } from './sim/outposts.js';
import { lotPrice, lotsForTown } from './sim/house_buy.js';
import { createSaveUi, AUTO_KEY } from './ui/save_ui.js';
import { createNameLabels } from './render/name_labels.js';
import { createDmgNumbers } from './render/dmg_numbers.js';
import { createOptions } from './ui/options.js';
import { createBuildMode } from './ui/build_mode.js';
import { createOutpostList } from './ui/outpost_list.js';
import { createStorageTransfer } from './ui/storage_transfer.js';
import { createCrossbows, GRIP, SHEATH } from './render/crossbows.js';
import { createBlood } from './render/blood.js';
import { createCombatFx } from './render/combat_fx.js';
import { createLights } from './render/lights.js';
import { loadModels, softenMetal } from './render/models.js';
import { groundFiles, GROUND_SETS, loadEach, allOrNull, dollTexDir, textureBytes, modelRoles, firstChoices, fallbackChoices, resolveRoles } from './render/asset_plan.js';

const canvas = document.getElementById('game');
installTouchGuards(document);
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

state.settlementPeopleEnabled = true;
const sceneCtx = createScene(canvas);
const giants = createGiants(sceneCtx.scene);

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
const terrainChunks = createTerrainChunks(sceneCtx.scene);
const settlements = createSettlements(sceneCtx.scene);
const buildBoxes = createBuildBoxes(sceneCtx.scene);
const settlementBanner = document.createElement('div');
settlementBanner.className = 'event-toasts';
settlementBanner.style.pointerEvents = 'none';
document.body.appendChild(settlementBanner);
let settlementEntry = null, settlementBannerUntil = 0;
function updateSettlementBanner(now) {
  const a=state.actors.find(a=>a.id===state.playerId);
  if(!a) return;
  const nearest=nearestSettlement(a.x,a.z), place=SETTLEMENTS.find(p=>p.id===nearest.id);
  const inside=nearest.dist<=place.radius+80;
  if(inside && settlementEntry!==place.id) {
    settlementEntry=place.id; settlementBannerUntil=now+5000;
    const line=document.createElement('div'); line.className='event-toast';
    line.textContent=`${nearest.name}・${nearest.sizeJa} / ${nearest.ownerName}${place.sign || place.label ? ' — '+(place.sign || place.label) : ''}`;
    settlementBanner.replaceChildren(line);
  } else if(!inside) settlementEntry=null;
  if(now>settlementBannerUntil && settlementBanner.childNodes.length) settlementBanner.replaceChildren();
}
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
  state.settlementPeopleEnabled = true;
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
  if (action === 'renameOutpost') {
    const outpost = state.outposts?.items.find((item) => item.id === target.outpostId);
    if (!outpost) return;
    openRename(outpost.id);
  } else if (action === 'manageJobs') {
    openBuildJobs();
  } else if (action === 'outpostList') {
    outpostList.open();
  } else if (action === 'cancelPiece' || action === 'dismantlePiece') {
    command({ type: action === 'cancelPiece' ? 'cancelPiece' : 'dismantle', pieceId: target.pieceId, actorId: aid });
  } else if (action === 'repairPiece') {
    command({ type: 'repair', pieceId: target.pieceId, actorId: aid });
  } else if (action === 'manageStorage') {
    storageTransfer.open(target.pieceId, aid);
  } else if (action === 'craftFlagKit') {
    command({ type: 'craftAt', benchId: target.pieceId, itemId: 'flag_kit', actorId: aid });
  } else if (action === 'useForge') {
    smithUi.open({ id: target.pieceId, name: '鍛冶炉', tier: 1 });
  } else if (action === 'insertGate') {
    command({ type: 'placePiece', pieceType: 'wood_gate', wallId: target.pieceId });
  } else if (action === 'buyLot') {
    const lot = saleLots(WORLD_LAYOUT.towns.find((town) => town.id === target.townId), state).find((item) => item.id === target.lotId);
    const town = WORLD_LAYOUT.towns.find((item) => item.id === target.townId);
    const price = lot ? lotPrice(lot, town) : 0;
    if (lot) askConfirm(`${town.name}の家を ${price.toLocaleString('ja-JP')} キャッシュで買いますか？`, '買う', () => command({ type: 'buyLot', lotId: lot.id }));
  } else if (action === 'housePublic' || action === 'housePrivate') {
    command({ type: 'setHousePublic', houseId: target.houseId, public: action === 'housePublic' });
  } else if (action === 'open' || action === 'close') {
    if (target.type === 'buildPiece' && target.pieceType === 'wood_gate') {
      command({ type: 'gate', pieceId: target.pieceId, open: action === 'open' });
    } else if (target.type === 'door' || target.houseId !== undefined) {
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
      gameApi.trade.open('trade');
    } else {
      const targetActor = state.actors.find((a) => a.id === tid);
      if (targetActor) {
        const rt = getDialogueRuntime(state);
        const world = buildDialogueWorld(state, { keepIds: rt.activeIds() });
        const speaker = world.npcs.find(n => n.actorId === tid);
        const bubble = speaker && rt.bubbles().find(b => b.speakerId === speaker.id && b.interactive);
        const me = state.actors.find((a) => a.id === aid) || state.actors.find((a) => a.id === state.playerId);
        const near = me && Math.hypot(me.x - targetActor.x, me.z - targetActor.z) <= 6;
        if (bubble) gameApi.dialogue.open(bubble.id);
        else if (speaker && near && !speaker.busy) {
          // 自分から話しかける: その人に合う会話（誘い/独り言）を始める
          const started = rt.talkTo(speaker.id, world);
          if (started?.interactive) gameApi.dialogue.open(started.id);
          const rumourTown = WORLD_LAYOUT.towns.filter(t => Math.hypot(t.x - targetActor.x, t.z - targetActor.z) <= t.radius + 25).sort((a,b) => Math.hypot(a.x-targetActor.x,a.z-targetActor.z)-Math.hypot(b.x-targetActor.x,b.z-targetActor.z))[0];
          if (rumourTown) townRumour(state, rumourTown.id, targetActor);
          if (!started) applyCommand(state, { type: 'move', x: targetActor.x, z: targetActor.z, actorId: aid });
        } else if (dialogueActorCanTalk(state, targetActor)) applyCommand(state, { type: 'move', x: targetActor.x, z: targetActor.z, actorId: aid });
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

// 時間を止めて聞く確認（家の購入など）。開いている間は sim を進めない
let confirmOpen = false;
function askConfirm(text, yesLabel, onYes) {
  let root = document.getElementById('game-confirm');
  if (!root) {
    root = document.createElement('div'); root.id = 'game-confirm'; root.className = 'game-confirm-overlay';
    const panel = document.createElement('section'); panel.className = 'game-confirm-panel';
    const chip = document.createElement('div'); chip.className = 'game-confirm-chip'; chip.textContent = '時間停止中 ⏸';
    const body = document.createElement('p'); const row = document.createElement('div'); row.className = 'game-confirm-row';
    const no = document.createElement('button'); no.type = 'button'; no.textContent = 'やめる';
    const yes = document.createElement('button'); yes.type = 'button'; yes.className = 'game-confirm-yes';
    row.append(no, yes); panel.append(chip, body, row); root.append(panel); document.body.append(root);
    root._body = body; root._yes = yes; root._no = no;
    panels.register('gameConfirm', { contains: (target) => panel.contains(target), close: () => { root.hidden = true; confirmOpen = false; } });
  }
  root._body.textContent = text; root._yes.textContent = yesLabel || 'はい';
  root._yes.onclick = () => { panels.close('gameConfirm'); onYes(); };
  root._no.onclick = () => panels.close('gameConfirm');
  root.hidden = false; confirmOpen = true; panels.open('gameConfirm');
}

function openRename(outpostId) {
  const outpost=state.outposts?.items.find((item)=>item.id===outpostId); if(!outpost)return false;
  let root=document.getElementById('outpost-rename');
  if(!root){
    root=document.createElement('div');root.id='outpost-rename';root.className='game-confirm-overlay';
    const panel=document.createElement('section');panel.className='game-confirm-panel';
    const title=document.createElement('label');title.className='game-confirm-chip';title.textContent='拠点名（24文字まで）';title.htmlFor='outpost-rename-input';
    const input=document.createElement('input');input.id='outpost-rename-input';input.className='outpost-rename-input';input.maxLength=24;input.autocomplete='off';
    const error=document.createElement('div');error.className='outpost-rename-error';error.hidden=true;
    const row=document.createElement('div');row.className='game-confirm-row';const cancel=document.createElement('button');cancel.type='button';cancel.textContent='やめる';
    const save=document.createElement('button');save.type='button';save.className='game-confirm-yes';save.textContent='決定';row.append(cancel,save);panel.append(title,input,error,row);root.append(panel);document.body.append(root);
    root._input=input;root._error=error;root._save=save;root._cancel=cancel;
    const close=()=>{root.hidden=true;confirmOpen=false;};
    cancel.onclick=()=>panels.close('outpostRename');save.onclick=()=>{const value=input.value.trim();if(!value){error.textContent='名前を入力してください';error.hidden=false;input.focus();return;}command({type:'renameOutpost',outpostId:root.dataset.outpostId,name:value});panels.close('outpostRename');};
    input.addEventListener('keydown',(event)=>{if(event.key==='Enter'){event.preventDefault();save.click();}if(event.key==='Escape'){event.preventDefault();panels.close('outpostRename');}event.stopPropagation();});
    panels.register('outpostRename',{contains:(target)=>panel.contains(target),close});
  }
  root.dataset.outpostId=outpostId;root._input.value=outpost.name;root._error.hidden=true;root.hidden=false;confirmOpen=true;panels.open('outpostRename');
  requestAnimationFrame(()=>{root._input.focus();root._input.select();}); return true;
}

function openBuildJobs() {
  let root = document.getElementById('build-jobs-panel');
  if (!root) {
    root = document.createElement('div');
    root.id = 'build-jobs-panel';
    root.className = 'build-jobs-overlay';
    const panel = document.createElement('section'); panel.className = 'build-jobs-panel';
    const header = document.createElement('header'), title = document.createElement('strong'), close = document.createElement('button');
    title.textContent = '係の割り当て'; close.type = 'button'; close.textContent = '閉じる';
    close.addEventListener('click', () => panels.close('buildJobs')); header.append(title, close);
    const rows = document.createElement('div'); rows.className = 'build-jobs-rows'; panel.append(header, rows); root.append(panel); document.body.append(root);
    root._rows = rows;
    panels.register('buildJobs', { contains: (target) => panel.contains(target), close: () => { root.hidden = true; } });
  }
  const rows = root._rows; rows.replaceChildren();
  const actors = state.actors.filter((actor) => actor.faction === 'player' && actor.state !== 'dead');
  const jobs = [['', 'なし'], ['builder', '大工'], ['hauler', '運び'], ['farmer', '畑'], ['shopkeeper', '店番']];
  for (const actor of actors) {
    const row = document.createElement('div'); row.className = 'build-job-row';
    const name = document.createElement('strong'); name.textContent = actor.name || `仲間 ${actor.id}`; row.append(name);
    for (const slot of ['primary', 'secondary']) {
      const select = document.createElement('select'); select.setAttribute('aria-label', `${name.textContent} ${slot === 'primary' ? '主な係' : '予備の係'}`);
      const label = document.createElement('option'); label.value = ''; label.textContent = slot === 'primary' ? '主な係' : '手が空いたら'; select.append(label);
      for (const [value, text] of jobs.slice(1)) { const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option); }
      select.value = actor.jobs?.[slot] || '';
      select.addEventListener('change', () => command({ type: 'setJob', actorId: actor.id, job: select.value || null, slot }));
      row.append(select);
    }
    rows.append(row);
  }
  if (!actors.length) { const empty = document.createElement('p'); empty.textContent = '割り当てられる仲間がいません'; rows.append(empty); }
  root.hidden = false; panels.open('buildJobs');
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
      const buildPiece = (state.outposts?.pieces || [])
        .filter((piece) => piece.state !== 'removed' && Math.hypot(piece.x - gx, piece.z - gz) <= 3)
        .sort((a, b) => Math.hypot(a.x - gx, a.z - gz) - Math.hypot(b.x - gx, b.z - gz))[0];
      if (buildPiece) {
        if (buildPiece.type === 'outpost_flag') return { type: 'buildOutpost', outpostId: buildPiece.outpostId, pieceId: buildPiece.id };
        return { type: 'buildPiece', pieceId: buildPiece.id, pieceType: buildPiece.type, state: buildPiece.state, open: !!buildPiece.door?.open, x: buildPiece.x, z: buildPiece.z };
      }
      const ownedHouse = (state.town?.houses || []).find((house) => house.owner === 'player' && Math.abs(house.x - gx) < house.w / 2 && Math.abs(house.z - gz) < house.d / 2);
      if (ownedHouse) return { type: 'ownedHouse', houseId: ownedHouse.id, public: !!ownedHouse.public };
      for (const town of WORLD_LAYOUT.towns) {
        const lot = saleLots(town, state).find((item) => !state.ownedLots?.includes(item.id) && Math.abs(item.x - gx) <= item.w / 2 && Math.abs(item.z - gz) <= item.d / 2);
        if (lot) return { type: 'saleLot', lotId: lot.id, townId: town.id, x: lot.x, z: lot.z };
      }
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
registerTextItems(ITEMS);
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

let buildCameraRestore = null;
const buildMode = createBuildMode({
  getState: () => state,
  onCommand: command,
  getMetrics: () => buildBoxes.stats(),
  onGhost: (type, x, z, rot, result, length) => buildBoxes.setGhost(type, x, z, rot, result, length),
  onHideGhost: () => buildBoxes.hideGhost(),
  onEnter() {
    buildCameraRestore = { distance: rig.getDistance(), pitch: rig.getPitch(), follow: rig.getFollow(), freeCam };
    rig.setFollow(false);
    freeCam = true;
    rig.setDistance(Math.max(24, rig.getDistance()));
    rig.setPitch(60);
    rig.startGlide();
  },
  onExit() {
    if (!buildCameraRestore) return;
    rig.setDistance(buildCameraRestore.distance);
    rig.setPitch(buildCameraRestore.pitch * 180 / Math.PI);
    rig.setFollow(buildCameraRestore.follow);
    freeCam = buildCameraRestore.freeCam;
    if (buildCameraRestore.follow) rig.startGlide();
    buildCameraRestore = null;
  },
  onAlert(point) {
    rig.setFollow(false);
    freeCam = true;
    rig.setTarget(point.x, point.z);
    rig.startGlide();
  },
});
const outpostList = createOutpostList({
  getState: () => state,
  onFocus(item) {
    rig.setFollow(false);
    freeCam = true;
    rig.setTarget(item.x, item.z);
    rig.startGlide();
  },
  onTravel(item) {
    const ids = selection.getSelectedSquadIds();
    const members = ids.length ? ids : [orderee(null)].filter((id) => id !== null && id !== undefined);
    for (const actorId of members) command({ type: 'move', x: item.x, z: item.z, actorId });
  },
});
const storageTransfer = createStorageTransfer({ getState: () => state, onCommand: command });

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
  isBuildMode: () => buildMode.isActive(),
  onBuildHover(x, z) {
    buildMode.setGhostAt(x, z);
  },
  onBuildWallPreview(start, end) {
    buildMode.setWallPreview(start, end);
  },
  onBuildDrag(start, end) {
    buildMode.enterWallDrag(start, end);
  },
  onGroundTap(_event, point) {
    if (buildMode.isActive()) {
      if (point) buildMode.groundTap(point.x, point.z);
      return;
    }
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
gameApi.openInventoryItem = (itemId) => { const actor = state.actors.find(a => a.id === state.playerId); if (!actor || !ITEMS[itemId]) return false; actor.inv ||= []; if (!actor.inv.some(item => item.id === itemId)) actor.inv.push({ id: itemId, rank: 1, n: 1 }); inventoryUi.open(actor.id); return inventoryUi.selectItem(itemId); };
gameApi.openShopAt = (townId) => { const town = WORLD_LAYOUT.towns.find(t => t.id === townId); tradeUi.open('trade'); const greeting = shopGreeting(townId, town?.owner); tradeUi.setGreeting(greeting); return { townId, greeting }; };
gameApi.selectTradeItem = (itemId) => { const selected = tradeUi.selectGood(itemId); return { id: selected, item: ITEMS[selected] || null }; };
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
gameApi.camInfo = () => rig.camInfo();
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
gameApi.giantView = (id, mode = 'edge') => {
  const p = GIANTS.find(g => g.id === id), actor = findPlayer();
  if (!p || !actor || !['edge', 'spawn'].includes(mode)) return null;
  let x, z;
  if (mode === 'edge') {
    x = Math.max(-195, Math.min(195, p.x)); z = Math.max(-195, Math.min(195, p.z));
    // Search inward for the nearest point not occupied by a static obstacle.
    if (blockedAt(state, x, z, 1)) {
      let best = null;
      for (let dx=-20; dx<=20; dx+=2) for (let dz=-20; dz<=20; dz+=2) {
        const nx=Math.max(-195,Math.min(195,x+dx)), nz=Math.max(-195,Math.min(195,z+dz));
        if (!blockedAt(state,nx,nz,1) && (!best || Math.hypot(nx-p.x,nz-p.z)<best.d)) best={x:nx,z:nz,d:Math.hypot(nx-p.x,nz-p.z)};
      }
      if (!best) return null; x=best.x; z=best.z;
    }
  } else if (id === 'skeleton') { x=-53; z=28; }
  else if (id === 'tower') { x=-58; z=87; }
  else { x=-80; z=55; }
  const yaw=Math.atan2(x-p.x,z-p.z)*180/Math.PI;
  teleportSquad(state, x, z, selection.getSelectedSquadIds());
  actor.rot=Math.atan2(p.x-x,p.z-z);
  setSpeed(0); capturePrev(); dolls.sync(state);
  const doll=dolls.getDoll(actor.id); if (doll?.group) doll.group.position.set(x,heightAt(x,z),z);
  gameApi.cam(x,z,mode==='edge'?4:14,yaw,mode==='edge'?-15:5,0);
  rig.apply();
  return {id,mode,x,z,yawDeg:yaw,...rig.camInfo()};
};
gameApi.giants = () => giants.info();
gameApi.tp = (x,z) => {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const actor=state.actors.find(a=>a.id===state.playerId); if (!actor) return null;
  const p=clampToWorld(x,z); teleportSquad(state, p.x, p.z, selection.getSelectedSquadIds());
  capturePrev(); dolls.sync(state); const doll=dolls.getDoll(actor.id); if(doll?.group) doll.group.position.set(p.x,heightAt(p.x,p.z),p.z);
  selection.selectSquad([actor.id]); followId=actor.id; freeCam=false; rig.setFollow(true); rig.setTarget(p.x,p.z); rig.setYaw(actor.rot + Math.PI); rig.apply(); return p;
};
gameApi.tpTown = id => {
  const place=[...WORLD_LAYOUT.towns,...WORLD_LAYOUT.banditBases].find(p=>p.id===id); if(!place)return null;
  const p=gameApi.tp(place.x,place.z+(place.radius||60)+15); if(!p)return null;
  const actor=state.actors.find(a=>a.id===state.playerId); actor.rot=Math.atan2(place.x-p.x,place.z-p.z);
  capturePrev(); rig.setYaw(actor.rot+Math.PI); rig.apply(); return p;
};
gameApi.askConfirm = askConfirm;
gameApi.confirmOpen = () => confirmOpen;
gameApi.buildInfo = () => {
  const outposts = state.outposts?.items || [], pieces = state.outposts?.pieces || [];
  const lots = WORLD_LAYOUT.towns.flatMap((town) => lotsForTown(state, town.id));
  const metrics = buildBoxes.stats();
  return {
    outposts: outposts.map((o) => ({ ...o })),
    pieces: pieces.map((p) => ({ ...p })),
    sites: pieces.filter((p) => p.state === 'site').map((p) => ({ ...p })),
    lots,
    owned: (state.town?.houses || []).filter((h) => h.owner === 'player').map((h) => ({ id: h.id, lot: h.lot, town: h.town, x: h.x, z: h.z, public: !!h.public })),
    mode: buildMode.isActive(),
    ghost: buildMode.ghost(),
    calls: metrics.calls,
    tris: metrics.tris,
  };
};
gameApi.plantFlagAt = (x, z) => {const actor=state.actors.filter((a)=>a.faction==='player'&&a.state!=='dead'&&Math.hypot(a.x-x,a.z-z)<=6).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];return command({ type: 'plantFlag', x, z, actorId:actor?.id });};
gameApi.placePiece = (type, x, z, rot = 0) => command({ type: 'placePiece', pieceType: type, x, z, rot, outpostId: outpostAt(state, x, z)?.id });
gameApi.drawWall = (points) => {
  const first = points?.[0];
  const x = Array.isArray(first) ? first[0] : first?.x, z = Array.isArray(first) ? first[1] : first?.z;
  return command({ type: 'drawWall', pieceType: buildMode.getSelected(), points, outpostId: outpostAt(state, x, z)?.id });
};
gameApi.finishAll = () => applyDebug(state,{ type: 'finishAllBuilds' });
gameApi.enterBuild = (type) => buildMode.enter(type);
gameApi.leaveBuild = () => buildMode.leave();
gameApi.panels = () => panels.list();
gameApi.contextAction = (action, target) => executeContextAction(action, target, [state.playerId]);
gameApi.ghostAt = (x, z) => buildMode.setGhostAt(x, z);
gameApi.buyLot = (lotId) => command({ type: 'buyLot', lotId });
gameApi.lots = (townId) => townId ? lotsForTown(state, townId) : WORLD_LAYOUT.towns.flatMap((town) => lotsForTown(state, town.id));
gameApi.giveMoney = (amount) => applyDebug(state,{ type: 'giveDebugMoney', amount: Math.floor(Number(amount)||0) });
gameApi.giveBuildItem = (itemId, amount = 1) => applyDebug(state,{ type: 'giveDebugBuildItem', itemId, amount: Math.max(1,Math.floor(Number(amount)||1)) });
gameApi.stockShop = (houseId, good, amount = 5) => {
  const house = state.town?.houses.find((item) => item.id === houseId && item.owner === 'player');
  const boxId = house?.boxes?.[0];
  return boxId ? applyDebug(state,{ type: 'debugShopStock', boxId, good, amount: Math.max(1,Math.floor(Number(amount)||1)) }) : false;
};
gameApi.openOutposts = () => outpostList.open();
gameApi.openRename = (outpostId) => openRename(outpostId);
gameApi.buildPanelState = () => ({ open: buildMode.isActive(), categoriesCollapsed: buildMode.isCategoriesCollapsed() });
gameApi.advanceBuildTime = (ticks=1) => { const count=Math.max(0,Math.min(100000,Math.floor(Number(ticks)||0)));for(let i=0;i<count;i++){updateBuild(state);state.tick+=1;}return state.tick; };
gameApi.advanceGameTime = (ticks=1) => { const count=Math.max(0,Math.min(100000,Math.floor(Number(ticks)||0)));for(let i=0;i<count;i++)step(state);return state.tick; };
gameApi.storageContents = (pieceId) => { const box=state.outposts?.pieces.find((p)=>p.id===pieceId&&p.type==='storage_box');return box?{...(box.contents||{})}:null; };
gameApi.showHaulerCarry = () => {
  // 撮影用: 拠点の収納箱から 8m 離れた地面に木材を置き、運び係が歩いて拾い、木箱を抱えて歩いている途中で止める
  const actor=state.actors.find((a)=>a.id===state.playerId&&a.faction==='player'),base=actor&&state.outposts?.items.find((o)=>Math.hypot(actor.x-o.x,actor.z-o.z)<=o.radius+2);
  const box=base&&state.outposts.pieces.find((p)=>p.outpostId===base.id&&p.type==='storage_box'&&p.state==='done');if(!actor||!box)return false;
  actor.jobs ||= {};actor.jobs.primary='hauler';actor.moveTo=null;actor.x=box.x-9;actor.z=box.z+1;
  state.groundItems ||= [];state.groundItems.push({id:`mvp2-hauler-${state.tick}`,x:box.x-8,z:box.z+2,contents:{wood:2}});
  let carrying=0;for(let i=0;i<600;i++){step(state);if(actor.buildTask?.kind==='haul'&&actor.buildTask.stage==='carry'&&++carrying>=25)break;}
  return actor.buildTask?{kind:actor.buildTask.kind,stage:actor.buildTask.stage,carry:{...actor.buildTask.carry},boxWood:box.contents?.wood||0}:false;
};
gameApi.wallWithGate = (wallId) => { const wall=state.outposts?.pieces.find((p)=>p.id===wallId&&['wood_fence','stone_wall'].includes(p.type));return wall?insertGate(state,wall.id):false; };
gameApi.prepareRipeFarm = (farmId) => { const farm=state.outposts?.pieces.find((p)=>p.id===farmId&&p.type==='small_farm');if(!farm)return false;const actor=state.actors.find((a)=>a.id===state.playerId);if(actor){actor.jobs ||= {};actor.jobs.primary='farmer';actor.moveTo=null;actor.x=farm.x+4;actor.z=farm.z+3;}farm.plantedTick=(state.tick||0)-864000;farm.growth=1;farm.harvestClaim=null;return {id:farm.id,growth:farm.growth}; };
gameApi.tpLot = (lotId) => {
  let lot = null;
  for (const town of WORLD_LAYOUT.towns) {
    lot = saleLots(town, state).find((item) => item.id === lotId) || null;
    if (lot) break;
  }
  if (!lot) return null;
  const p = gameApi.tp(lot.x, lot.z + (lot.d || 6) / 2 + 9);
  if (!p) return null;
  const actor = state.actors.find((a) => a.id === state.playerId);
  if (actor) actor.rot = Math.atan2(lot.x - p.x, lot.z - p.z);
  rig.setYaw((actor?.rot || 0) + Math.PI);
  rig.setTarget(lot.x, lot.z);
  rig.apply();
  return { ...lot, price: lotPrice(lot, WORLD_LAYOUT.towns.find((town) => town.id === lot.townId)) };
};
gameApi.world = () => {
  const actor=state.actors.find(a=>a.id===state.playerId); if(!actor)return null;
  const ix=Math.max(0,Math.min(63,Math.floor(actor.x/WORLD_LAYOUT.cellM+WORLD_LAYOUT.originCell[0]))), iz=Math.max(0,Math.min(63,Math.floor(actor.z/WORLD_LAYOUT.cellM+WORLD_LAYOUT.originCell[1])));
  const r=WORLD_LAYOUT.regions[WORLD_LAYOUT.regionGrid[iz].charCodeAt(ix)-65]; const info=sceneCtx.renderer.info.render;
  return {bounds:WORLD_BOUNDS,playerPos:{x:actor.x,y:heightAt(actor.x,actor.z),z:actor.z},region:r&&{id:r.id,name:r.name,biome:r.biome},chunks:terrainChunks.info(),settlements:{...settlements.info(),...settlementPeopleInfo(state)},renderInfo:{calls:info.calls,triangles:info.triangles}};
};
gameApi.renderInfo = () => ({ ...sceneCtx.renderer.info.render, fps: gameApi.fps });
gameApi.nearestSettlement = () => { const a=state.actors.find(a=>a.id===state.playerId); return a ? nearestSettlement(a.x,a.z) : null; };
gameApi.talkProfileNearest = () => {
  const player = state.actors.find(a => a.id === state.playerId);
  if (!player) return null;
  let nearest = null, distance = 30;
  for (const actor of state.actors) {
    const profile = talkProfile(actor);
    if (!profile) continue;
    const d = Math.hypot(actor.x - player.x, actor.z - player.z);
    if (d <= distance) { nearest = profile; distance = d; }
  }
  return nearest ? { ...nearest, line: lineFor(nearest, 'greet') } : null;
};
gameApi.giveThrown = (id, n = 1) => {
  const player = state.actors.find(a => a.id === state.playerId);
  const def = ITEMS[id];
  if (!player || !def?.throwable) return false;
  let left = Math.max(1, Math.floor(Number(n) || 1));
  while (left > 0) {
    const add = Math.min(left, def.maxStack);
    player.inv.push({ id, rank: 3, n: add });
    left -= add;
  }
  return player.inv.filter(x => x.id === id).reduce((s, x) => s + x.n, 0);
};
gameApi.giveWeapon = id => {
  const player = state.actors.find(a => a.id === state.playerId);
  if (!player || !WEAPONS[id] || ITEMS[id]?.slot !== 'weapon') return false;
  player.equip.weapon[0] = { id, rank: 3, n: 1 };
  player.weapon = id;
  player.crossbow = null;
  return id;
};
gameApi.throwDemo = kind => {
  const player = state.actors.find(a => a.id === state.playerId);
  if (!player) return false;
  const itemId = kind === 'knife' ? 'tknife_wolf_fang' : kind === 'shuriken' ? 'shuriken_needle_star' : null;
  if (!itemId) return false;
  const squad = forceSquad(state, 'thieves', player.x + 7, player.z + 3);
  const enemy = state.actors.find(a => squad?.memberIds?.includes(a.id));
  if (!enemy) return false;
  enemy.x = player.x + 4; enemy.z = player.z + 2;
  enemy.inv = [{ id: itemId, rank: 3, n: 3 }];
  enemy.skills.throwing = Math.max(70, enemy.skills.throwing || 0);
  enemy.targetId = player.id; enemy.state = 'fight'; enemy.movedThisTick = false;
  enemy.lastThrowTick = state.tick - 1000;
  enemy.rot = Math.atan2(player.x - enemy.x, player.z - enemy.z);
  player.targetId = enemy.id; player.state = 'fight';
  player.rot = Math.atan2(enemy.x - player.x, enemy.z - player.z);
  return { kind, enemyId: enemy.id, itemId, distance: Math.hypot(enemy.x - player.x, enemy.z - player.z) };
};
gameApi.reflectDemo = () => {
  const setup = gameApi.throwDemo('shuriken');
  if (!setup) return false;
  const player = state.actors.find(a => a.id === state.playerId);
  player.skills.defense = 100; player.skills.perception = 100;
  gameApi.giveWeapon('sword');
  return setup;
};
gameApi.panDemo = () => {
  const player = state.actors.find(a => a.id === state.playerId);
  if (!player) return false;
  const squad = forceSquad(state, 'thieves', player.x + 1, player.z + 1);
  const enemy = state.actors.find(a => squad?.memberIds?.includes(a.id));
  if (!enemy) return false;
  gameApi.giveWeapon('frying_pan');
  enemy.x = player.x + .9; enemy.z = player.z + .5;
  enemy.faction = 'bandit'; enemy.targetId = player.id; enemy.state = 'fight'; enemy.weapon = 'fists';
  enemy.equip.weapon = [null, null]; enemy.inv = []; enemy.forceDaze = true; enemy.forceDazeHead = true;
  enemy.parts.head.hp = Math.max(enemy.parts.head.hp, 80);
  player.targetId = enemy.id; player.state = 'fight';
  player.rot = Math.atan2(enemy.x - player.x, enemy.z - player.z);
  player.swing = null; player.attackCd = 0;
  return { enemyId: enemy.id, weapon: 'frying_pan', forcedHeadHit: true };
};
gameApi.helmetStats = () => {
  const player = state.actors.find(a => a.id === state.playerId);
  if (!player) return null;
  const head = player.equip?.head?.id;
  const currentVision = ITEMS[head]?.vision || 0;
  const base = VISION[player.faction] || 14;
  const light = ambientLight(state);
  return {
    helmets: Object.entries(ITEMS).filter(([, item]) => item.slot === 'head').map(([id, item]) => ({ id, name: item.name, vision: item.vision || 0 })),
    equipped: head || null, vision: currentVision,
    range: base * (.55 + .45 * light) * (1 - currentVision), light,
  };
};
gameApi.talkRumour = (townId) => { const town = WORLD_LAYOUT.towns.find(t => t.id === townId); const actor = town && state.actors.filter(a => a.id !== state.playerId && a.state !== 'dead' && Math.hypot(a.x-town.x,a.z-town.z) <= town.radius+25).sort((a,b)=>Math.hypot(a.x-town.x,a.z-town.z)-Math.hypot(b.x-town.x,b.z-town.z))[0] || state.actors.find(a => a.id === state.playerId); return townRumour(state, townId, actor); };
gameApi.forceBark = (actorId, trigger) => { const actor = state.actors.find(a => a.id === actorId); const player = state.actors.find(a => a.id === state.playerId); if (actor && player && Math.hypot(actor.x-player.x,actor.z-player.z) > 40) { actor.x = player.x + 3; actor.z = player.z + 2; } return emitBark(state, actor, trigger); };
gameApi.forceBaseReaction = (event) => emitBaseReaction(state, event);
gameApi.bounties = getBounties;
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
const tradeUi = createTradeUI({ getState: () => state, onAfterAct: () => { if (hud) hud.refreshMoney(state); }, onOpen: (st, townId) => { const town = WORLD_LAYOUT.towns.find(t => t.id === townId); tradeUi?.setGreeting(shopGreeting(townId, town?.owner)); } });
gameApi.trade = tradeUi;

// Dialogue overlay. Simulation time pauses only while a choice sheet is open.
function uiWorld() { return dialogueWorldForUi(state, getDialogueRuntime(state).activeIds()); }
const dlgContainer = document.body;
const dlgChip = document.createElement('div');
dlgChip.textContent = '会話中 ⏸';
dlgChip.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 8px);left:50%;transform:translateX(-50%);z-index:45;display:none;padding:6px 11px;border-radius:999px;background:#242a27eF;color:#fff2cc;border:1px solid #b8a078;font:12px system-ui;pointer-events:none';
dlgContainer.appendChild(dlgChip);
let dialoguePanelClosing = false;
let choiceWindow;
function showDialogueChoice(view) { if (!view) return; const npc = uiWorld().npcs.find(x => x.id === view.speakerId); view.tradeAvailable = !!npc && tradeUi.canTradeWith(npc.actorId); if (view.faction) { const shown = factionName(view.faction); view.faction = shown === view.faction ? (view.faction === 'bandit' ? '野盗' : '') : shown; } choiceWindow.show(view); }
function openDialogueTrade(speakerId) { const npc = uiWorld().npcs.find(x => x.id === speakerId); if (!npc || !tradeUi.canTradeWith(npc.actorId)) return; applyCommand(state,{type:'dialogueTrade'}); dialoguePanelClosing=true; panels.close('dialogue'); dialoguePanelClosing=false; tradeUi.open('trade'); }
choiceWindow = createChoiceWindow({ container: dlgContainer, onTrade: openDialogueTrade, onChoose(optionId) {
  const view = applyCommand(state, { type: 'dialogueChoose', optionId });
  if (view && typeof view === 'object' && view.options) showDialogueChoice(view);
  else { dialoguePanelClosing = true; panels.close('dialogue'); dialoguePanelClosing = false; }
} });
panels.register('dialogue', { contains: target => choiceWindow.contains?.(target) || !!target.closest?.('.dlg-sheet'), close() {
  choiceWindow.show(null); dlgChip.style.display = 'none';
  if (!dialoguePanelClosing && getDialogueRuntime(state).isPaused()) applyCommand(state, { type: 'dialogueCancel' });
} });
const dialogueLayer = createBubbleLayer({ container: dlgContainer, camera: sceneCtx.camera,
  getSpeakerWorldPos(id) { const n = uiWorld().npcs.find(x => x.id === id); const actor = n?.actor || state.actors.find(a => String(a.id) === String(id)); if (!actor) return null; const p = dollPosition(actor.id) || { x: actor.x, y: 0, z: actor.z }; return { ...p, y: (p.y || 0) + 1.7, name: n?.name || actor.title || actor.name }; },
  getPlayerWorldPos() { const p = dolls.playerPos; return p?.has ? { x:p.x, y:p.y, z:p.z } : findPlayer(); },
  onTap(bubbleId) { const view = applyCommand(state, { type: 'dialogueOpen', bubbleId }); if (view && typeof view === 'object' && view.options) { showDialogueChoice(view); panels.open('dialogue'); dlgChip.style.display = 'block'; } }
});
const pursuitRingGeometry = new THREE.RingGeometry(0.72, 0.9, 28);
const pursuitRingMaterial = new THREE.MeshBasicMaterial({ color: 0xff4938, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false });
const pursuitRings = new Map();
function updateDialogueRings() {
  const world = uiWorld(); const visible = new Set();
  for (const npc of world.npcs) {
    if (getDialogueRuntime(state).npcIntent(npc.id).mode !== 'pursue') continue;
    visible.add(npc.actorId); let ring = pursuitRings.get(npc.actorId);
    if (!ring) { ring = new THREE.Mesh(pursuitRingGeometry, pursuitRingMaterial); ring.rotation.x = -Math.PI / 2; ring.renderOrder = 3; sceneCtx.scene.add(ring); pursuitRings.set(npc.actorId, ring); }
    ring.position.set(npc.actor.x, heightAt(npc.actor.x,npc.actor.z)+0.06, npc.actor.z);
  }
  for (const [id, ring] of pursuitRings) if (!visible.has(id)) { sceneCtx.scene.remove(ring); pursuitRings.delete(id); }
}
gameApi.dialogue = {
  state: () => dialogueDebugState(state),
  bubbles: () => getDialogueRuntime(state).bubbles(),
  isPaused: () => getDialogueRuntime(state).isPaused(),
  open(id) { const rt = getDialogueRuntime(state); const bubble = rt.bubbles().find(b => b.id === id || b.speakerId === id); const view = bubble && applyCommand(state, { type: 'dialogueOpen', bubbleId: bubble.id }); if (view?.options) { showDialogueChoice(view); panels.open('dialogue'); dlgChip.style.display = 'block'; } return view || null; },
  choose(optionId) { const view = applyCommand(state, { type: 'dialogueChoose', optionId }); if (view?.options) showDialogueChoice(view); else { dialoguePanelClosing = true; panels.close('dialogue'); dialoguePanelClosing = false; } return view; },
  cancel() { applyCommand(state, { type: 'dialogueCancel' }); dialoguePanelClosing = true; panels.close('dialogue'); dialoguePanelClosing = false; },
  demo(kind) {
    // 検証用: 近くの「その役」の人を優先し（いなければ最寄りの人に役を貸す）、画面内の 4m 先に置いて会話を始める
    const ids = { ambient:'shop', invite:'beggar', pursue:'checkpoint', declare:'bandit_hostile' }; const definitionId = ids[kind]; if (!definitionId) return false;
    const want = { ambient:['shopkeeper'], invite:['beggar'], pursue:['guard','leader'], declare:['bandit','leader'] }[kind];
    const rt = getDialogueRuntime(state); const world = buildDialogueWorld(state, { keepIds: rt.activeIds() });
    const near = world.npcs.filter(n => !n.busy && Math.hypot(n.pos.x - world.player.pos.x, n.pos.z - world.player.pos.z) <= 40).sort((a,b) => Math.hypot(a.pos.x-world.player.pos.x,a.pos.z-world.player.pos.z) - Math.hypot(b.pos.x-world.player.pos.x,b.pos.z-world.player.pos.z));
    const far = buildDialogueWorld(state, { keepIds: rt.activeIds(), radius: 1e9 }).npcs.filter(n => !n.busy && want.every(t => n.tags.includes(t))).sort((a,b) => Math.hypot(a.pos.x-world.player.pos.x,a.pos.z-world.player.pos.z) - Math.hypot(b.pos.x-world.player.pos.x,b.pos.z-world.player.pos.z));
    const npc = near.find(n => want.every(t => n.tags.includes(t))) || far[0] || near[0]; if (!npc) return { ok:false, reason:'近くに会話できるNPCがいません' };
    const actor = npc.actor; actor.x = world.player.pos.x + 4; actor.z = world.player.pos.z + 1.5; actor.targetId = null; actor.waitTargetId = null; actor.state = 'idle'; actor.moveTo = null;
    if (!want.every(t => npc.tags.includes(t))) actor.dialogueTags = want;
    const w2 = buildDialogueWorld(state, { keepIds: rt.activeIds() }); const n2 = w2.npcs.find(n => n.id === npc.id); if (n2) n2.role = 'leader';
    const bubble = dialogueDebugStart(state, definitionId, npc.id, w2); if (kind === 'invite' && bubble) gameApi.dialogue.open(bubble.id); capturePrev();
    return { ok:!!bubble, kind, speakerId:npc.id, name:npc.name, bubble };
  }
};
if (params.has('dlgdemo')) setTimeout(() => gameApi.dialogue.demo(params.get('dlgdemo')), 1800);
const squadMenuBtn = document.createElement('button');
squadMenuBtn.type = 'button';
squadMenuBtn.className = 'opt-toggle';
squadMenuBtn.textContent = '部隊';
squadMenuBtn.title = '部隊管理とAI設定';
squadMenuBtn.addEventListener('click', () => {
  squadPanel.open();
});
const mapPanel = createMapPanel(() => state, params.get('map') === 'all');
gameApi.openMap = () => mapPanel.open();
gameApi.closeMap = () => mapPanel.close();
gameApi.revealMap = () => mapPanel.revealAll();
hudMenu = createHudMenu({
  map: mapPanel.button,
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
    if (!simulationMayAdvance(getDialogueRuntime(state))) return 0;
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

  if (!document.hidden && speed > 0 && !state.gameOver && !confirmOpen && simulationMayAdvance(getDialogueRuntime(state))) {
    accumulator += (dt * speed) / 0.1;
    let count = 0;
    while (accumulator >= 1 && count < 30 && !state.gameOver) {
      capturePrev();
      step(state);
      mapPanel.updateFog();
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
  dolls.update(dt, speed, state, alpha, prevMap, sceneCtx.camera, rig.getDistance() < 6 && rig.getPitch() < 25 * Math.PI / 180 ? [pickFollowId(state, selection.get()), selection.get()] : []);
  combatFx.update(state, dolls, dt, speed);
  bloodFx.update(state, dt);
  crossbows.update(state, dolls, alpha, dt);
  turrets.update(state);
  spawnSites.update(state, now / 1000);
  bedrolls.update(state);
  updateDemandUi();

  input.update(dt);
  buildMode.updateAlerts(state);
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
  terrainChunks.update(rig.focus.x, rig.focus.z);
  settlements.update(rig.focus.x, rig.focus.z);
  buildBoxes.update(state, rig.focus, dollPosition);
  updateSettlementBanner(now);
  if (green) green.update(rig.target.x, rig.target.z, sceneCtx.camera.position.y - rig.target.y);
  // カメラを動かした後に置く（1フレーム遅れの揺れを出さない）。
  sceneCtx.camera.updateMatrixWorld();
dialogueLayer.update(pushNarrativeBubbles(state, getDialogueRuntime(state).bubbles()));
  updateDialogueRings();
  if (!getDialogueRuntime(state).isPaused()) dlgChip.style.display = 'none';
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
    selectionRevision: selection.getRevision(),
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
