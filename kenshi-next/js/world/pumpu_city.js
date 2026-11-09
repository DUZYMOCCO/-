// パンプアップ・シティの作者配置（筋肉探偵の環境担当ゾーン）。
// 出典: D:\MuscleDetective\設定\コンセプトムービー台本_v1.md /
//       D:\MuscleDetective\viz\town-block\DIMENSIONS_ja.md /
//       リファレンス倉庫\パンプアップシティ外観.mp4
// ここは地盤（通り・建物・港・公園・ランドマーク）の入口で、リグや
// モーションには触らない。座標は中心 (280, 30) からの相対値で、
// +z は南（港の水辺）。寸法は town-block の実測に合わせる。
export const PUMPU_CENTER = { x: 280, z: 30 };

// 通りの横断寸法。北側の店先歩道 4.7m / 車道 9.0m / 南側の歩道 3.45m。
export const PUMPU_STREET = { z: 3.35, width: 9.0, northSidewalk: -3.65, southSidewalk: 9.725 };

// 作者配置の追加建物群。kind は既存の town に寄せ、terrain が既存の箱で描く。
// name は将来の看板・ミニマップ表示用。color は建物の色分け用。
export const PUMPU_EXTRA_BUILDINGS = [
  // 通りの南側（店先側を北へ向けた低層商業帯）
  { name: '質屋・リサイクル', role: 'pawn', zone: 'downtown',     x: -17, z: 14.5, w: 5.4, d: 6, h: 5,  color: '#454b52' },
  { name: '日用雑貨店',       role: 'general', zone: 'downtown',  x: -11, z: 14.5, w: 5.6, d: 6, h: 5,  color: '#8a9299' },
  { name: 'カラオケ館',       role: 'karaoke', zone: 'downtown',  x: -5,  z: 14.5, w: 5.6, d: 6, h: 6,  color: '#2f3f46' },
  { name: 'ゲームセンター',   role: 'arcade',  zone: 'downtown',  x: 1,   z: 14.5, w: 5.6, d: 6, h: 5,  color: '#394a63' },
  { name: 'コインランドリー', role: 'laundry', zone: 'downtown',  x: 7,   z: 14.5, w: 5.6, d: 6, h: 4,  color: '#b9c4c4' },
  { name: 'アップ・バー',     role: 'bar',     zone: 'downtown',  x: 13,  z: 14.5, w: 5.4, d: 6, h: 5,  color: '#6d4a43' },
  { name: '東マート',         role: 'mart',    zone: 'downtown',  x: 19,  z: 14.5, w: 5.4, d: 6, h: 6,  color: '#d5d7d2' },

  // 中心のランドマーク（カット1: 奥に市庁舎とコブラ会ビル）
  { name: '市庁舎',       role: 'civic',  zone: 'civic',  x: -20, z: -19, w: 9, d: 8, h: 18, color: '#b8b9b4' },
  { name: 'コブラ会ビル', role: 'cobra',  zone: 'civic',  x: 25,  z: -19, w: 7, d: 7, h: 32, color: '#232b34' },

  // 港の荷役帯（倉庫・事務所）
  { name: '第1貨物倉庫', role: 'warehouse', zone: 'harbor', x: -10, z: 19.5, w: 14, d: 7, h: 6, color: '#7a5f4a' },
  { name: '第2貨物倉庫', role: 'warehouse', zone: 'harbor', x: 8,   z: 19.5, w: 14, d: 7, h: 6, color: '#4d5d66' },
  { name: '荷捌き場',     role: 'cargo',     zone: 'harbor', x: 21,  z: 19.5, w: 8,  d: 7, h: 5, color: '#66635c' },
  { name: '港湾事務所',   role: 'office',    zone: 'harbor', x: 26,  z: 15,   w: 6,  d: 6, h: 8, color: '#9aa5aa' },
];

// 公園・港・通りのゾーン（衝突ではなく見た目と案案内の境界）。
export const PUMPU_ZONES = {
  park:    { name: '西公園',     x: -21, z: 3,   w: 12, d: 10 },
  harbor:  { name: '港',         x: 0,   z: 25,  w: 58, d: 8,  water: true },
  downtown:{ name: '店先広場',   x: 0.8, z: -2.5, w: 8, d: 6.5 },
  street:  { name: '表通り',     x: 0,   z: 3.35, w: 58, d: 9 },
};

// 床の硬さ（落下・投げの着地・車との接触で使う係数。1.0 が通常）。
// hardness が高いほどダメージが増える。座標は中心 (280, 30) からの相対値。
export const PUMPU_FLOOR_ZONES = [
  { name: '公園の園路', kind: 'path',     hardness: 1.00, x: -21,  z: 3,    w: 12, d: 1.4 },
  { name: '公園の芝',  kind: 'grass',    hardness: 0.55, x: -21,  z: 3,    w: 12, d: 10 },
  { name: '店先広場',  kind: 'concrete', hardness: 1.35, x: 0.8,  z: -2.5,  w: 8,  d: 6.5 },
  { name: '路地',      kind: 'concrete', hardness: 1.20, x: -4.3, z: -12,  w: 3.2, d: 11 },
  { name: '荷役ヤード', kind: 'concrete', hardness: 1.15, x: 5,    z: 19.5, w: 34, d: 8 },
  { name: '岸壁',      kind: 'concrete', hardness: 1.05, x: 0,    z: 23.2, w: 56, d: 1.6 },
  { name: '北歩道',    kind: 'sidewalk', hardness: 1.20, x: 0,    z: -3.65, w: 56, d: 4.7 },
  { name: '表通り',    kind: 'asphalt',  hardness: 1.15, x: 0,    z: 3.35,  w: 56, d: 9 },
  { name: '南歩道',    kind: 'sidewalk', hardness: 1.20, x: 0,    z: 9.725, w: 56, d: 3.45 },
];

export function floorAt(x, z) {
  const rx = x - PUMPU_CENTER.x;
  const rz = z - PUMPU_CENTER.z;
  for (const zone of PUMPU_FLOOR_ZONES) {
    if (Math.abs(rx - zone.x) <= zone.w / 2 && Math.abs(rz - zone.z) <= zone.d / 2) return zone;
  }
  return null;
}

export function floorHardnessAt(x, z, fallback = 1) {
  return floorAt(x, z)?.hardness ?? fallback;
}

// 看板（表示用）。rect は [x, z, w, h]、rotY は看板の向き。
export const PUMPU_SIGNS = [
  { text: 'パンプアップ・シティ', sub: 'PUMP-UP CITY', rect: [-28, 7.5, 7.2, 2.4], rotY: Math.PI / 2, color: '#f0c986' },
  { text: '青果',                  rect: [-9.2, -10.6, 3.4, 1.0], rotY: 0, color: '#ffe9b0' },
  { text: '私立探偵 タンク',       rect: [0.8, -10.7, 4.2, 1.1], rotY: 0, color: '#d7eef5' },
  { text: 'パンプ・ダイナー',     rect: [-3.0, -10.5, 4.0, 1.1], rotY: 0, color: '#ffd28a' },
  { text: '質屋',                  rect: [-17, 12.2, 3.4, 1.0], rotY: 0, color: '#ffe9b0' },
  { text: 'カラオケ館',           rect: [-5, 12.2, 3.8, 1.0], rotY: 0, color: '#ffd7e6' },
  { text: 'ゲームセンター',       rect: [1, 12.2, 4.2, 1.0], rotY: 0, color: '#d8d2ff' },
  { text: '港',                    rect: [-4, 22.6, 4.0, 1.1], rotY: 0, color: '#bfe3ff' },
  { text: '貨物倉庫',             rect: [-10, 16.9, 6.0, 1.2], rotY: 0, color: '#ffe0a0' },
  { text: '市庁舎',               rect: [-20, -23.3, 5.0, 1.2], rotY: 0, color: '#ffffff' },
  { text: 'コブラ会',             rect: [25, -23.5, 5.0, 1.2], rotY: 0, color: '#ff9d9d' },
];
