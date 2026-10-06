/**
 * IRON SQUAD: ダンジョン・インスタンスシステム (dungeon.js)
 * 
 * - 広大な外界に点在する固有ダンジョンのロケーション
 * - 専用インスタンスフロア（閉鎖迷宮・石壁・トーチ照明・固有エネミー）
 * - 最奥に君臨する巨大ダンジョンボス
 * - ボス撃破で解錠される【豪華至宝箱 (Dungeon Vault)】と神話級レア武具・莫大な財宝
 * - 外界とのシームレス脱出・帰還ポータル
 */

import { WORLD_SIZE } from './world.js';
import { chooseLootTier } from './equipment-rules.js';

const CENTER = WORLD_SIZE / 2;

export const DUNGEON_DEFS = [
  {
    id: 'dungeon_goblin_mines',
    name: 'ゴブリンの地下廃坑',
    subtitle: '【採掘王の封鎖坑道】',
    icon: '⛏️',
    color: '#d97706',
    accentColor: '#f59e0b',
    theme: 'mines',
    reqDef: 30,
    reqLv: 6,
    desc: 'かつて栄えた鉱脈を凶暴なゴブリン一味が占拠。最奥には黄金を蓄えた採掘王が潜む。',
    entrance: { x: CENTER - 2600, y: CENTER - 2400, radius: 48 },
    width: 2000,
    height: 1200,
    ambientColor: '#1c150c',
    floorColor: '#2b2216',
    wallColor: '#15110b',
    torchColor: '#f59e0b',
    distance: Math.hypot(2600, 2400),
    boss: {
      type: 'goblin_king',
      name: '採掘暴君・ゴブリンキング',
      title: '【黄金狂いの鉱山主】',
      icon: '👑⛏️',
      color: '#f59e0b',
      radius: 34,
      hp: 4200,
      atk: 48,
      speed: 56,
      skillCooldown: 4.2,
      skillName: '採掘ダイナマイト落石',
      desc: '巨大ツルハシで落石を誘発する坑道の支配者！'
    },
    mobTypes: ['goblin', 'wolf'],
    mobCount: 14,
    eliteCount: 2,
    reward: {
      gold: 1400,
      exp: 400,
      itemCount: 3,
      lootKind: 'dungeon_vault'
    }
  },
  {
    id: 'dungeon_catacombs',
    name: '古代死霊カタコンベ',
    subtitle: '【呪縛されし地下霊廟】',
    icon: '⚰️',
    color: '#a855f7',
    accentColor: '#c084fc',
    theme: 'catacombs',
    reqDef: 85,
    reqLv: 16,
    desc: '滅びた王国の地下石室。青白い霊炎が揺らめき、不死の魔術王が侵入者の魂を狙う。',
    entrance: { x: CENTER + 4600, y: CENTER + 4400, radius: 48 },
    width: 2200,
    height: 1400,
    ambientColor: '#120f1c',
    floorColor: '#1e1a2b',
    wallColor: '#0f0c18',
    torchColor: '#a855f7',
    distance: Math.hypot(4600, 4400),
    boss: {
      type: 'lich_elder',
      name: '冥府の支配者・リッチエルダー',
      title: '【死を統べる大魔術師】',
      icon: '💀🔮',
      color: '#c084fc',
      radius: 38,
      hp: 10500,
      atk: 92,
      speed: 52,
      skillCooldown: 3.6,
      skillName: '怨嗟の魂喰らい弾',
      desc: '広範囲に誘導怨念球を放つ不死の霊王！'
    },
    mobTypes: ['orc', 'wyvern'],
    mobCount: 18,
    eliteCount: 3,
    reward: {
      gold: 4200,
      exp: 1000,
      itemCount: 4,
      lootKind: 'dungeon_vault'
    }
  },
  {
    id: 'dungeon_dragon_cavern',
    name: '紅蓮の竜巌窟',
    subtitle: '【太古の業火眠る竜の巣】',
    icon: '🌋',
    color: '#ef4444',
    accentColor: '#dc2626',
    theme: 'dragon',
    reqDef: 160,
    reqLv: 28,
    desc: '煮えたぎるマグマの熱気渦巻く最果ての禁足地。神話の原初竜が神聖武具の宝庫を守護する。',
    entrance: { x: CENTER + 7200, y: CENTER - 7000, radius: 52 },
    width: 2600,
    height: 1600,
    ambientColor: '#1e0c0c',
    floorColor: '#2d1414',
    wallColor: '#140606',
    torchColor: '#ef4444',
    distance: Math.hypot(7200, 7000),
    boss: {
      type: 'hellflame_drake',
      name: '紅蓮の真祖竜ヘルフレイム',
      title: '【滅亡の業火竜】',
      icon: '🐉🔥',
      color: '#ef4444',
      radius: 58,
      hp: 28000,
      atk: 175,
      speed: 48,
      skillCooldown: 3.8,
      skillName: 'ヘルフレイム・インフェルノ',
      desc: '全画面を覆う獄炎放射で部隊を焼き払う真祖の竜！'
    },
    mobTypes: ['wyvern', 'colossal_dragon'],
    mobCount: 22,
    eliteCount: 4,
    reward: {
      gold: 13500,
      exp: 3000,
      itemCount: 5,
      lootKind: 'dungeon_vault'
    }
  }
];

/**
 * フィールド上のダンジョン入口ポータルを描画
 */
export function drawDungeonEntrance(ctx, def, time, isNear = false) {
  const { entrance, color, icon, name, reqDef, cleared } = def;
  const x = entrance.x;
  const y = entrance.y;
  const t = time || performance.now() * 0.001;

  ctx.save();

  // 地面の魔法陣
  const pulse = Math.sin(t * 2.5) * 4;
  const r = entrance.radius + pulse;

  // 外枠リング
  ctx.strokeStyle = cleared ? '#10b981' : color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();

  // 内側光彩
  const g = ctx.createRadialGradient(x, y, 5, x, y, r);
  g.addColorStop(0, cleared ? 'rgba(16, 185, 129, 0.45)' : `${color}55`);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // 門柱（巨石柱4本）
  const posts = [
    { dx: -r * 0.8, dy: -r * 0.5 },
    { dx: r * 0.8, dy: -r * 0.5 },
    { dx: -r * 0.8, dy: r * 0.5 },
    { dx: r * 0.8, dy: r * 0.5 }
  ];
  ctx.fillStyle = '#475569';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  posts.forEach(p => {
    ctx.beginPath();
    ctx.roundRect(x + p.dx - 6, y + p.dy - 12, 12, 24, 3);
    ctx.fill();
    ctx.stroke();

    // 柱の上のオーブ光
    ctx.fillStyle = cleared ? '#34d399' : color;
    ctx.beginPath();
    ctx.arc(x + p.dx, y + p.dy - 12, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 中央の回転ルーン文字
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.8);
  ctx.strokeStyle = cleared ? '#34d39988' : `${color}88`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.moveTo(Math.cos(a) * (r * 0.6), Math.sin(a) * (r * 0.6));
    ctx.lineTo(Math.cos(a + 0.8) * (r * 0.3), Math.sin(a + 0.8) * (r * 0.3));
  }
  ctx.stroke();
  ctx.restore();

  // 頭上ラベル
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 4;
  ctx.fillText(`${icon} ${name}`, x, y - r - 12);
  ctx.font = '10px sans-serif';
  ctx.fillStyle = cleared ? '#34d399' : '#f59e0b';
  ctx.fillText(cleared ? '【踏破制圧済】' : `推奨DEF ${reqDef}+`, x, y - r);
  ctx.shadowBlur = 0;

  ctx.restore();
}

/**
 * ダンジョン内の環境・石壁・トーチ・装飾を描画
 */
export function drawDungeonEnvironment(ctx, dungeon, camera, viewW, viewH, zoom, time) {
  const w = dungeon.width;
  const h = dungeon.height;
  const t = time || performance.now() * 0.001;

  ctx.save();

  // 1. ダンジョン床（市松の敷石または粗い岩盤）
  ctx.fillStyle = dungeon.floorColor || '#1e1a2b';
  ctx.fillRect(0, 0, w, h);

  // 石畳の目地
  ctx.strokeStyle = dungeon.wallColor || '#0f0c18';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.35;
  for (let x = 0; x <= w; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  // 2. 外周の重厚な壁（進入不可エリア）
  const wallThick = 60;
  ctx.fillStyle = dungeon.wallColor || '#0a0812';
  // 上下左右の壁
  ctx.fillRect(-wallThick, -wallThick, w + wallThick * 2, wallThick);
  ctx.fillRect(-wallThick, h, w + wallThick * 2, wallThick);
  ctx.fillRect(-wallThick, 0, wallThick, h);
  ctx.fillRect(w, 0, wallThick, h);

  // 壁境界のハイライト線
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, w, h);

  // 3. 部屋をつなぐ柱列とトーチ
  const pillars = [
    { x: 450, y: 300 }, { x: 450, y: h - 300 },
    { x: 950, y: 350 }, { x: 950, y: h - 350 },
    { x: 1500, y: 250 }, { x: 1500, y: h - 250 },
    { x: w - 500, y: 300 }, { x: w - 500, y: h - 300 }
  ];

  pillars.forEach(p => {
    // 柱本体
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(p.x - 16, p.y - 16, 32, 32, 4);
    ctx.fill();
    ctx.stroke();

    // 松明/霊炎の光球
    const flicker = Math.sin(t * 6 + p.x) * 3;
    const flameR = 14 + flicker;
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, flameR * 2.5);
    g.addColorStop(0, dungeon.torchColor || '#f59e0b');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, flameR * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 芯の火
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // 4. 入口/帰還ポータル (x: 180, y: h / 2)
  const exitX = 180;
  const exitY = h / 2;
  const exitPulse = Math.sin(t * 3) * 3;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(exitX, exitY, 36 + exitPulse, 0, Math.PI * 2);
  ctx.stroke();

  const exitG = ctx.createRadialGradient(exitX, exitY, 4, exitX, exitY, 36 + exitPulse);
  exitG.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
  exitG.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = exitG;
  ctx.beginPath();
  ctx.arc(exitX, exitY, 36 + exitPulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#bae6fd';
  ctx.fillText('🌀 外界への帰還門', exitX, exitY - 45);

  // 5. 最奥の祭壇 (Boss Room: x: w - 350, y: h / 2)
  const altarX = w - 350;
  const altarY = h / 2;
  ctx.strokeStyle = dungeon.accentColor || '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(altarX, altarY, 180, 0, Math.PI * 2);
  ctx.stroke();

  // 祭壇の魔法陣
  ctx.save();
  ctx.translate(altarX, altarY);
  ctx.rotate(-t * 0.5);
  ctx.strokeStyle = `${dungeon.accentColor || '#ef4444'}55`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 160, Math.sin(a) * 160);
    ctx.lineTo(Math.cos(a + 2) * 160, Math.sin(a + 2) * 160);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

/**
 * 最奥の豪華至宝箱 (Dungeon Vault) を描画
 */
export function drawDungeonVault(ctx, vault, time) {
  if (!vault) return;
  const { x, y, opened, name } = vault;
  const t = time || performance.now() * 0.001;

  ctx.save();

  // 開封前の黄金発光パルス
  if (!opened) {
    const pulse = Math.sin(t * 3.5) * 6;
    const g = ctx.createRadialGradient(x, y, 5, x, y, 40 + pulse);
    g.addColorStop(0, 'rgba(251, 191, 36, 0.75)');
    g.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 40 + pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // 宝箱本体 (ゴージャスな金枠宝箱)
  const w = 42;
  const h = 30;
  ctx.fillStyle = opened ? '#78350f' : '#b45309';
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // 金色の装飾帯と鍵穴
  ctx.fillStyle = '#facc15';
  ctx.fillRect(x - 4, y - h / 2, 8, h);
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();

  // ラベル
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = opened ? '#94a3b8' : '#fde047';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 4;
  ctx.fillText(opened ? '✨【開封済】' : `👑 ${name}`, x, y - h / 2 - 8);
  ctx.shadowBlur = 0;

  ctx.restore();
}
