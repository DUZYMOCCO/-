// アクション・文脈メニューの判定と隊形計算（DOM・Three.js に依存しない純粋関数）。
// availableActions(world, actorIds, target) は選ばれている仲間が対象に対して行える有効な行動一覧を返す。

import { isHostile } from './data.js';

export const ACTION_LABELS = {
  open: '開ける',
  close: '閉める',
  lockpick: 'ピッキング',
  break: '壊す',
  steal: '盗む',
  talk: '話す',
  attack: '攻撃',
  preemptive_attack: '先制攻撃',
  preemptive: '先制攻撃',
  follow: '追従',
  bodyguard: '護衛',
  assassinate: '暗殺',
  treat: '手当て',
  carry: '担ぐ',
  drop: '下ろす',
  loot: 'あさる',
  man: '砲台につく',
  leave: '砲台を離れる',
  use: '使う',
  pickup: '拾う',
};

export function actionLabel(actionId) {
  return ACTION_LABELS[actionId] || actionId;
}

function normalizeActorIds(actorIds) {
  if (actorIds === null || actorIds === undefined) return [];
  if (Array.isArray(actorIds)) return actorIds.map(Number).filter(Number.isFinite);
  const n = Number(actorIds);
  return Number.isFinite(n) ? [n] : [];
}

function findActorInWorld(world, id) {
  if (!world || !Array.isArray(world.actors) || id === null || id === undefined) return null;
  for (const a of world.actors) {
    if (a.id === id) return a;
  }
  return null;
}

function isPlayerSquad(world, actor) {
  if (!actor) return false;
  if (Array.isArray(world?.squadIds)) return world.squadIds.includes(actor.id);
  return actor.faction === 'player';
}

function isAlly(world, actor) {
  if (!actor) return false;
  if (isPlayerSquad(world, actor)) return true;
  if (actor.faction === 'player') return true;
  const rel = world && world.relations ? world.relations : null;
  if (rel) {
    const pf = 'player';
    const af = actor.faction;
    const a = pf < af ? pf : af;
    const b = pf < af ? af : pf;
    if (
      rel[a + '_' + b] === 'friendly' ||
      rel[af + '_' + pf] === 'friendly' ||
      rel[a + '_' + b] === 'ally' ||
      rel[af + '_' + pf] === 'ally'
    ) {
      return true;
    }
  }
  return false;
}

// 隊形移動の座標計算: 重なりを防ぐため、目標地点を中心に隊形に応じて散開した座標を返す
export function formationPositions(members, targetX, targetZ, spacing = 1.4, formation = 'line') {
  const list = Array.isArray(members) ? members : [members];
  const n = list.length;
  if (n <= 1) {
    const id = list[0] && typeof list[0] === 'object' ? list[0].id : list[0];
    return [{ id, x: Math.round(targetX * 100) / 100, z: Math.round(targetZ * 100) / 100 }];
  }

  return list.map((member, i) => {
    const id = member && typeof member === 'object' ? member.id : member;
    let ox = 0;
    let oz = 0;

    if (formation === 'column') {
      // 縦列: 目標地点から後方へ1列に並ぶ
      ox = 0;
      oz = i * spacing;
    } else if (formation === 'wedge') {
      // くさび形 (V字): 先頭が (0, 0)、左右交互に後方へ展開
      if (i === 0) {
        ox = 0;
        oz = 0;
      } else {
        const rank = Math.ceil(i / 2);
        const side = i % 2 === 1 ? -1 : 1;
        ox = side * rank * spacing;
        oz = rank * spacing;
      }
    } else if (formation === 'random') {
      // 散開・ランダム: 黄金角による均等散開（決定性・重なりなし）
      if (i === 0) {
        ox = 0;
        oz = 0;
      } else {
        const angle = i * 2.39996;
        const radius = spacing * (0.8 + 0.6 * Math.sqrt(i));
        ox = Math.cos(angle) * radius;
        oz = Math.sin(angle) * radius;
      }
    } else {
      // line (既定): 横列（幅が広がりすぎないよう最大3列の隊列グリッド）
      const cols = Math.min(n, 3);
      const col = (i % cols) - (cols - 1) / 2;
      const row = Math.floor(i / cols);
      ox = col * spacing;
      oz = row * spacing;
    }

    return {
      id,
      x: Math.round((targetX + ox) * 100) / 100,
      z: Math.round((targetZ + oz) * 100) / 100,
    };
  });
}

// 文脈に応じた有効な行動の配列（文字列）を返す
export function availableActions(world, actorIds, target, opts = {}) {
  const actions = [];
  if (!world || !target) return actions;

  const aids = normalizeActorIds(actorIds);
  const actors = aids.map((id) => findActorInWorld(world, id)).filter(Boolean);
  const anySneaking = actors.some(
    (a) => a.sneaking && a.state !== 'dead' && a.state !== 'down' && a.state !== 'getup'
  );

  // 1. 扉・建物 (door / building / house)
  const isActor =
    typeof target === 'number' ||
    (target && typeof target === 'object' && (
      target.type === 'person' ||
      target.type === 'actor' ||
      !!target.parts ||
      !!target.faction
    ));

  const isDoor =
    !isActor &&
    (target.type === 'door' ||
      target.type === 'building' ||
      target.type === 'house' ||
      target.houseId !== undefined ||
      (target.door && typeof target.door.open === 'boolean'));

  if (isDoor) {
    const houseId = target.houseId || target.id;
    const house =
      (world.town && Array.isArray(world.town.houses)
        ? world.town.houses.find((h) => h.id === houseId)
        : null) || (target.door ? target : null);

    const door = house ? house.door : target.door || target;
    const isLocked = door ? !!door.locked : !!target.locked;

    actions.push('open', 'break');
    if (isLocked) {
      actions.push('lockpick');
    }
    return actions;
  }

  // 2. 箱・収納 (chest / container / box)
  const isBox =
    !isActor &&
    (target.type === 'chest' ||
      target.type === 'container' ||
      target.type === 'box' ||
      target.boxId !== undefined ||
      target.goods !== undefined);

  if (isBox) {
    const boxId = target.boxId || target.id;
    const box =
      (world.town && Array.isArray(world.town.boxes)
        ? world.town.boxes.find((b) => b.id === boxId)
        : null) || (target.goods !== undefined ? target : null);

    const isLocked = box ? !!box.locked : !!target.locked;
    const isOwnedByOthers = target.owner !== 'player' && (!box || box.owner !== 'player');
    actions.push('open');
    if (isOwnedByOthers) {
      actions.push('steal');
    }
    if (isLocked) {
      actions.push('lockpick', 'break');
    }
    return actions;
  }

  // 3. 砲台 (turret)
  const isTurret =
    !isActor &&
    (target.type === 'turret' ||
      target.turretId !== undefined ||
      (target.operatorId !== undefined && target.x !== undefined));

  if (isTurret) {
    const turretId = target.turretId || target.id;
    const turret =
      (Array.isArray(world.turrets) ? world.turrets.find((t) => t.id === turretId) : null) ||
      target;

    const isOperating = actors.some(
      (a) => a.turretId === turret.id || (turret.operatorId != null && a.id === turret.operatorId)
    );
    if (isOperating) {
      actions.push('leave');
    } else {
      actions.push('man');
    }
    return actions;
  }

  // 4. 作業台・鍛冶台 (bench / forge)
  const isBench =
    target.type === 'bench' ||
    target.type === 'forge' ||
    target.benchId !== undefined ||
    (target.tier !== undefined && target.name);

  if (isBench) {
    actions.push('use');
    return actions;
  }

  // 5. 落ちている品・アイテム (item)
  const isItem = target.type === 'item' || target.item !== undefined;
  if (isItem) {
    actions.push('pickup');
    return actions;
  }

  // 6. 人物・キャラ・死体 (person / actor)
  let targetActor = null;
  if (typeof target === 'number') {
    targetActor = findActorInWorld(world, target);
  } else if (target && typeof target === 'object') {
    if (target.type === 'person' || target.type === 'actor') {
      const aid = target.actorId !== undefined ? target.actorId : target.id;
      targetActor = findActorInWorld(world, aid) || target;
    } else if (target.parts || target.faction) {
      targetActor = target;
    }
  }

  if (targetActor) {
    const isSquad = isPlayerSquad(world, targetActor);
    const isDownOrDead =
      targetActor.state === 'down' || targetActor.state === 'getup' || targetActor.state === 'dead';

    if (isDownOrDead) {
      // 倒れている・死んでいる場合: あさる・担ぐ・手当て
      actions.push('loot');
      if (targetActor.carriedBy == null && targetActor.state !== 'getup') {
        actions.push('carry');
      }
      if (targetActor.state !== 'dead') {
        actions.push('treat');
      }
      if (!isAlly(world, targetActor) && targetActor.state !== 'dead') {
        actions.push('steal', 'attack');
      }
    } else {
      // 起きて生きている人物
      if (targetActor.faction === 'beast') {
        actions.push('attack');
      } else if (isSquad) {
        // 味方部隊員
        const isSelf = actors.length > 0 && actors.every((a) => a.id === targetActor.id);
        if (!isSelf) {
          actions.push('follow', 'bodyguard');
        }
        actions.push('treat');
      } else {
        // 部隊外の人物（neutral / hostile non-allies）
        actions.push('talk');
        const isHostileTarget =
          actors.some((a) => isHostile(world, a.faction, targetActor.faction)) ||
          isHostile(world, 'player', targetActor.faction);

        if (isHostileTarget) {
          actions.push('attack');
          if (!isAlly(world, targetActor)) {
            actions.push('preemptive_attack');
          }
        } else {
          actions.push('follow', 'bodyguard');
          if (!isAlly(world, targetActor)) {
            actions.push('preemptive_attack');
          }
        }
        actions.push('steal'); // スリ
        if (anySneaking) {
          actions.push('assassinate'); // 隠密中のみ暗殺可能
        }
        // 手当て（負傷中）
        if (
          (typeof targetActor.bleed === 'number' && targetActor.bleed > 0) ||
          (typeof targetActor.blood === 'number' && targetActor.blood < 100)
        ) {
          actions.push('treat');
        }
      }
    }

    if (targetActor.carryingId != null && isSquad) actions.push('drop');

    // 周囲に砲台がある、または砲台についている場合は末尾に「砲台につく」を追加
    const nearbyTurret =
      target.nearbyTurret ||
      (target.turretId && Array.isArray(world.turrets)
        ? world.turrets.find((t) => t.id === target.turretId)
        : null) ||
      (Array.isArray(world.turrets)
        ? world.turrets.find((t) => Math.hypot(t.x - targetActor.x, t.z - targetActor.z) <= 2.5)
        : null);

    if (nearbyTurret) {
      const isOperating = actors.some(
        (a) => a.turretId === nearbyTurret.id || (nearbyTurret.operatorId != null && a.id === nearbyTurret.operatorId)
      );
      const turretAct = isOperating ? 'leave' : 'man';
      if (!actions.includes(turretAct)) {
        actions.push(turretAct);
      }
    }

    return actions;
  }

  return actions;
}

export {
  pickNearestActorScreen,
  pickNearestProjected,
  pickScreenActor,
  pickNearestScreenPoint,
} from '../ui/screen_picker.js';

