// 牢に関する描画・UI共通の小さなヘルパー。
export function jailStatusText(jail, timeSec = 0) {
  if (!jail) return '';
  const left = Math.max(0, jail.untilSec - timeSec);
  return left >= 86400
    ? '投獄中（残り' + Math.ceil(left / 86400) + '日）'
    : '投獄中（残り' + Math.ceil(left / 3600) + '時間）';
}

// 顔カード用の短い形（1行に収める）。
export function jailCardText(jail, timeSec = 0) {
  if (!jail) return '';
  const left = Math.max(0, jail.untilSec - timeSec);
  return left >= 86400 ? '投獄 ' + Math.ceil(left / 86400) + '日' : '投獄 ' + Math.ceil(left / 3600) + '時間';
}

// ★仮の保釈金: 残り1時間ごとに 100、今の賞金の 2倍を足す。最低 200。
export const BAIL_PER_HOUR = 100;
export const BAIL_BOUNTY_MULT = 2;
export const BAIL_MIN = 200;
export function jailBailCost(jail, timeSec = 0, bounty = 0) {
  if (!jail) return 0;
  const hours = Math.ceil(Math.max(0, jail.untilSec - timeSec) / 3600);
  return Math.max(BAIL_MIN, hours * BAIL_PER_HOUR + Math.max(0, bounty) * BAIL_BOUNTY_MULT);
}

// ★牢の錠は詰所の扉と同じ強さ。
export const JAIL_LOCK = 40;
export const JAIL_HALF = 0.8; // ★牢は 1.6m 四方（奥の部屋に収まる大きさ）
export const JAIL_DOOR_HALF = 0.5;
const WALL_T = 0.52;

// 古い保存に牢扉が無い場合は閉まった錠として扱う。
export function ensureJailDoor(house) {
  if (!house.jailDoor || typeof house.jailDoor !== 'object') house.jailDoor = { open: false, locked: true };
  return house.jailDoor;
}

// 奥の部屋の、仕切り壁と奥の木箱の間。牢の扉は仕切りの通り口に向く。
export function jailCellLocal(house) {
  const dv = house.depth - WALL_T * 2;
  const wallV = house.partitionNav?.v ?? Math.max(1.7, Math.min(house.depth - 1.25, house.depth * 0.52));
  const front = wallV + 0.17 + JAIL_HALF;
  const back = dv - 0.85 - JAIL_HALF;
  const z = front <= back ? (front + back) / 2 : Math.min(front, dv - 0.1 - JAIL_HALF);
  const side = Math.max(0, house.len / 2 - WALL_T - 1.85); // 奥の隅の寝床に重ならない
  const x = Math.max(-side, Math.min(side, house.a || 0));
  return { x, z };
}

export function jailDoorLocal(house) {
  const cell = jailCellLocal(house);
  return { x: cell.x, z: cell.z - JAIL_HALF };
}
