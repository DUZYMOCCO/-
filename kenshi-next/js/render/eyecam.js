// 目線カメラ（eyecam1）の計算。three を使わない純粋関数（テストから直接読める）。
import { pickFollowId } from './camfollow.js';

const DEG = Math.PI / 180;
// 目線カメラの画角（度）と、頭からの前後オフセット（m）。少し後ろに置き、間合いの相手の腕が目に刺さらないようにする。
export const EYE_FOV = 70;
export const EYE_NEAR = 0.05;
export const EYE_FORWARD = -0.15;
// 少しだけ下を向く（足元の地面をタップしやすく）。
export const EYE_PITCH = -8 * DEG;
// 向きの補間の速さ（1/秒）。急な振り向きを和らげる。
export const EYE_YAW_RATE = 7;
// 位置の補間（水平・高さ）。高さは歩きの上下動を抑えるため遅め。
export const EYE_POS_RATE = 16;
export const EYE_Y_RATE = 7;
// 相手を替えた時の移り（秒）。
export const EYE_GLIDE_SEC = 0.6;
// 見回し（ドラッグ）の範囲と、離した後に体の向きへ戻る速さ（1/秒）。
export const LOOK_YAW_MAX = 150 * DEG;
export const LOOK_PITCH_MIN = -60 * DEG;
export const LOOK_PITCH_MAX = 40 * DEG;
export const LOOK_RETURN_RATE = 1.6;

export function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// 指数平滑で yaw を寄せる（最短回り）。
export function approachAngle(cur, target, dt, rate) {
  const k = 1 - Math.exp(-Math.max(0, dt) * rate);
  return wrapAngle(cur + wrapAngle(target - cur) * k);
}

// 前向き（体の向き rot は +z 方向が 0、(sin rot, cos rot) が前）。
export function lookDir(yaw, pitch) {
  const cp = Math.cos(pitch);
  return { x: Math.sin(yaw) * cp, y: Math.sin(pitch), z: Math.cos(yaw) * cp };
}

// 目線で見る人: 選んだ部隊員（複数なら先頭）、いなければ追従と同じ相手（操作キャラ）。
// 倒れて（気絶）いる・担がれている間は目線をやめて上から追う（mode 'overhead'）。
export function pickEyeTarget(state, selectedSquadIds, selectedId) {
  if (!state || !Array.isArray(state.actors)) return { id: null, mode: 'none' };
  const squad = Array.isArray(state.squadIds) ? state.squadIds : [];
  let actor = null;
  for (const id of selectedSquadIds || []) {
    const a = state.actors.find((e) => e.id === id);
    if (a && squad.includes(a.id) && a.state !== 'dead') { actor = a; break; }
  }
  if (!actor) {
    const id = pickFollowId(state, selectedId);
    actor = id === null ? null : state.actors.find((e) => e.id === id) || null;
  }
  if (!actor || actor.state === 'dead') return { id: actor ? actor.id : null, mode: 'none' };
  const lying = actor.state === 'down' || actor.state === 'getup' || (actor.carriedBy !== null && actor.carriedBy !== undefined);
  return { id: actor.id, mode: lying ? 'overhead' : 'eye' };
}

// 目の位置。head は頭の骨の世界座標（無ければ null）、ground は足元の高さ。
export function eyePose(pos, rot, head, scale, ground) {
  const s = scale || 1;
  const y = head && Number.isFinite(head.y) ? head.y + 0.07 * s : (Number.isFinite(ground) ? ground : pos.y) + 1.62 * s;
  return {
    x: pos.x + Math.sin(rot) * EYE_FORWARD * s,
    y,
    z: pos.z + Math.cos(rot) * EYE_FORWARD * s,
    yaw: rot,
  };
}

// 1フレーム分寄せる。cur を書き換えて返す。glide は相手を替えた直後のゆっくりした移り（0..1 の残り）。
export function stepEye(cur, target, dt, glide = 0) {
  const step = Math.max(0, Number(dt) || 0);
  if (!cur.has) {
    cur.x = target.x; cur.y = target.y; cur.z = target.z; cur.yaw = target.yaw; cur.has = true;
    return cur;
  }
  const slow = glide > 0 ? 0.25 : 1;
  const kp = 1 - Math.exp(-step * EYE_POS_RATE * slow);
  const ky = 1 - Math.exp(-step * EYE_Y_RATE * slow);
  cur.x += (target.x - cur.x) * kp;
  cur.z += (target.z - cur.z) * kp;
  cur.y += (target.y - cur.y) * ky;
  cur.yaw = approachAngle(cur.yaw, target.yaw, step, EYE_YAW_RATE * (glide > 0 ? 0.5 : 1));
  return cur;
}

export function clampLook(yaw, pitch) {
  return {
    yaw: Math.max(-LOOK_YAW_MAX, Math.min(LOOK_YAW_MAX, yaw)),
    pitch: Math.max(LOOK_PITCH_MIN, Math.min(LOOK_PITCH_MAX, pitch)),
  };
}
