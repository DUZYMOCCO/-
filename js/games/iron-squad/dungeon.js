/**
 * IRON SQUAD: ダンジョン・宿場・廃墟のインスタンス
 * 入口は石門。内部は敷石・土間・崩れ壁。霓虹の魔法陣は使わない。
 * 脱出は常に x=180, y=height/2。至宝はボスか番兵を倒したあと、x=width-240。
 */

import { WORLD_SIZE, SETTLEMENTS } from './world.js';

const CENTER = WORLD_SIZE / 2;

function settlementToDef(s) {
  const town = s.kind === 'town';
  return {
    id: s.id,
    kind: s.kind,
    name: s.name,
    subtitle: s.subtitle,
    icon: s.icon,
    color: town ? '#c4b48a' : '#8d7b68',
    accentColor: '#d7b56a',
    theme: s.kind,
    reqDef: s.reqDef,
    reqLv: s.reqLv,
    desc: s.desc,
    entrance: { x: CENTER + s.entranceOx, y: CENTER + s.entranceOy, radius: 68 },
    width: s.width,
    height: s.height,
    ambientColor: town ? '#241e16' : '#161310',
    floorColor: town ? '#3a3428' : '#241f1a',
    wallColor: '#14110e',
    torchColor: '#c47a3a',
    distance: Math.hypot(s.ox, s.oy),
    boss: null,
    guardian: s.guardian || null,
    mobTypes: s.mobTypes || [],
    mobCount: s.mobCount || 0,
    eliteCount: s.eliteCount || 0,
    reward: s.reward || null,
    street: s.street
  };
}

export const DUNGEON_DEFS = [
  {id:'royal_castle_town',kind:'town',name:'本陣城下町',subtitle:'国家とともに育つ町',icon:'🏘',color:'#c4b48a',accentColor:'#d7b56a',theme:'town',reqDef:0,reqLv:1,desc:'鍛冶工房・冒険者組合・大城下町のカジノ。施設は国家タブから利用。',entrance:{x:CENTER+320,y:CENTER+260,radius:68},width:1600,height:1000,ambientColor:'#241e16',floorColor:'#3a3428',wallColor:'#14110e',torchColor:'#c47a3a',distance:412,boss:null,guardian:null,mobTypes:[],mobCount:0,eliteCount:0},
  {
    id: 'dungeon_goblin_mines',
    kind: 'dungeon',
    name: 'ゴブリンの地下廃坑',
    subtitle: '【採掘王の封鎖坑道】',
    icon: '⛏️',
    color: '#d97706',
    accentColor: '#f59e0b',
    theme: 'mines',
    reqDef: 60,
    reqLv: 6,
    desc: 'かつて栄えた鉱脈を凶暴なゴブリン一味が占拠。最奥には黄金を蓄えた採掘王が潜む。',
    entrance: { x: CENTER - 2600, y: CENTER - 2400, radius: 48 },
    width: 2000,
    height: 1200,
    ambientColor: '#1c150c',
    floorColor: '#2b2216',
    wallColor: '#15110b',
    torchColor: '#c47a3a',
    distance: Math.hypot(2600, 2400),
    boss: {
      type: 'goblin_king',
      name: '採掘暴君・ゴブリンキング',
      title: '【黄金狂いの鉱山主】',
      icon: '👑⛏️',
      color: '#f59e0b',
      radius: 34,
      hp: 5200,
      atk: 75,
      speed: 56,
      skillCooldown: 4.2,
      skillName: '採掘ダイナマイト落石',
      desc: '巨大ツルハシで落石を誘発する坑道の支配者！'
    },
    mobTypes: ['goblin', 'wolf'],
    mobCount: 14,
    eliteCount: 2,
    reward: { gold: 1400, exp: 400, itemCount: 3, lootKind: 'dungeon_vault' }
  },
  {
    id: 'dungeon_catacombs',
    kind: 'dungeon',
    name: '古代死霊カタコンベ',
    subtitle: '【呪縛されし地下霊廟】',
    icon: '⚰️',
    color: '#a855f7',
    accentColor: '#c084fc',
    theme: 'catacombs',
    reqDef: 180,
    reqLv: 16,
    desc: '滅びた王国の地下石室。青白い霊炎が揺らめき、不死の魔術王が侵入者の魂を狙う。',
    entrance: { x: CENTER + 4600, y: CENTER + 4400, radius: 48 },
    width: 2200,
    height: 1400,
    ambientColor: '#120f1c',
    floorColor: '#1e1a2b',
    wallColor: '#0f0c18',
    torchColor: '#c4b48a',
    distance: Math.hypot(4600, 4400),
    boss: {
      type: 'lich_elder',
      name: '冥府の支配者・リッチエルダー',
      title: '【死を統べる大魔術師】',
      icon: '💀🔮',
      color: '#c084fc',
      radius: 38,
      hp: 13500,
      atk: 160,
      speed: 52,
      skillCooldown: 3.6,
      skillName: '怨嗟の魂喰らい弾',
      desc: '広範囲に誘導怨念球を放つ不死の霊王！'
    },
    mobTypes: ['orc', 'wyvern'],
    mobCount: 18,
    eliteCount: 3,
    reward: { gold: 4200, exp: 1000, itemCount: 4, lootKind: 'dungeon_vault' }
  },
  {
    id: 'dungeon_dragon_cavern',
    kind: 'dungeon',
    name: '紅蓮の竜巌窟',
    subtitle: '【太古の業火眠る竜の巣】',
    icon: '🌋',
    color: '#ef4444',
    accentColor: '#dc2626',
    theme: 'dragon',
    reqDef: 380,
    reqLv: 28,
    desc: '煮えたぎるマグマの熱気渦巻く最果ての禁足地。神話の原初竜が神聖武具の宝庫を守護する。',
    entrance: { x: CENTER + 7200, y: CENTER - 7000, radius: 52 },
    width: 2600,
    height: 1600,
    ambientColor: '#1e0c0c',
    floorColor: '#2d1414',
    wallColor: '#140606',
    torchColor: '#c47a3a',
    distance: Math.hypot(7200, 7000),
    boss: {
      type: 'hellflame_drake',
      name: '紅蓮の真祖竜ヘルフレイム',
      title: '【滅亡の業火竜】',
      icon: '🐉🔥',
      color: '#ef4444',
      radius: 58,
      hp: 36000,
      atk: 360,
      speed: 48,
      skillCooldown: 3.8,
      skillName: 'ヘルフレイム・インフェルノ',
      desc: '全画面を覆う獄炎放射で部隊を焼き払う真祖の竜！'
    },
    mobTypes: ['wyvern', 'colossal_dragon'],
    mobCount: 22,
    eliteCount: 4,
    reward: { gold: 13500, exp: 3000, itemCount: 5, lootKind: 'dungeon_vault' }
  },

  {
    id: 'dungeon_demon_castle',
    kind: 'dungeon',
    name: '魔王城・深淵黒曜殿',
    subtitle: '【終焉を統べる魔王の居城】',
    icon: '🏰😈',
    color: '#7f1d1d',
    accentColor: '#fbbf24',
    theme: 'demon',
    reqDef: 800,
    reqLv: 40,
    desc: '最果ての外縁にそびえる魔王の居城。城主『深淵魔王ヴァルドール』の力は約1000万規模。伝説職級の挑戦者のみが挑め。',
    entrance: { x: CENTER + 42000, y: CENTER + 42000, radius: 64 },
    width: 3200,
    height: 2000,
    ambientColor: '#120808',
    floorColor: '#1a0e0e',
    wallColor: '#0a0505',
    torchColor: '#a855f7',
    distance: Math.hypot(42000, 42000),
    boss: {
      type: 'demon_king',
      name: '深淵魔王ヴァルドール',
      title: '【終焉の魔王】',
      icon: '😈👑',
      color: '#7f1d1d',
      radius: 72,
      // v1.25.8: fixed ~10,000,000 scale (createDungeonBoss respects fixedStats)
      fixedStats: true,
      hp: 10000000,
      atk: 85000,
      speed: 54,
      skillCooldown: 3.2,
      skillName: '深淵滅殺・黒炎天墜',
      desc: '約1000万規模のHPと破格の攻撃力。黒炎の天墜で部隊を一掃する魔王！'
    },
    mobTypes: ['wyvern', 'colossal_dragon', 'orc'],
    mobCount: 28,
    eliteCount: 6,
    reward: { gold: 250000, exp: 80000, itemCount: 7, lootKind: 'dungeon_vault', bonusOrbs: 3, bonusGems: 1 }
  },
  ...SETTLEMENTS.map(settlementToDef)
];

function stoneHash(ix, iy) {
  let n = Math.imul(ix + 13, 73856093) ^ Math.imul(iy + 29, 19349663);
  n = Math.imul(n ^ (n >>> 16), 2246822519);
  return ((n ^ (n >>> 13)) >>> 0) / 4294967296;
}

function plate(ctx, text, x, y, color, size = 12) {
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const w = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(16,14,12,0.78)';
  ctx.fillRect(x - w / 2 - 5, y - size - 3, w + 10, size + 6);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function jamb(ctx, x, y, w, h, fill) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 4, w * 0.7, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.fillRect(x, y - h, w, h);
  ctx.fillStyle = '#6e6a60';
  ctx.fillRect(x, y - h, w, 3);
}

function drawExitArch(ctx, x, y, caption) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 34, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  jamb(ctx, x - 28, y + 16, 12, 48, '#3a342c');
  jamb(ctx, x + 16, y + 16, 12, 48, '#3a342c');
  ctx.fillStyle = '#4a4036';
  ctx.fillRect(x - 32, y - 36, 64, 8);
  ctx.fillStyle = '#1a1612';
  ctx.beginPath();
  ctx.moveTo(x - 16, y + 16);
  ctx.lineTo(x - 16, y - 18);
  ctx.quadraticCurveTo(x, y - 34, x + 16, y - 18);
  ctx.lineTo(x + 16, y + 16);
  ctx.closePath();
  ctx.fill();
  plate(ctx, caption, x, y - 48, '#e1cf9d', 11);
}

function drawWalls(ctx, w, h) {
  const t = 52;
  ctx.fillStyle = '#14110e';
  ctx.fillRect(-t, -t, w + t * 2, t);
  ctx.fillRect(-t, h, w + t * 2, t);
  ctx.fillRect(-t, 0, t, h);
  ctx.fillRect(w, 0, t, h);
  ctx.fillStyle = '#5a5348';
  ctx.fillRect(0, 0, w, 3);
  ctx.fillRect(0, 0, 3, h);
  ctx.fillStyle = '#0c0b09';
  ctx.fillRect(0, h - 8, w, 8);
  ctx.fillRect(w - 8, 0, 8, h);
}

function flame(ctx, x, y, time, hot) {
  const fl = 0.75 + 0.25 * Math.sin(time * 7 + x);
  ctx.fillStyle = '#3a342c';
  ctx.fillRect(x - 2, y - 16, 4, 16);
  ctx.fillStyle = '#5a4632';
  ctx.fillRect(x - 5, y - 18, 10, 3);
  ctx.fillStyle = hot;
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 18);
  ctx.quadraticCurveTo(x, y - 18 - 14 * fl, x + 4, y - 18);
  ctx.fill();
  ctx.fillStyle = '#e7d7a8';
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 18);
  ctx.quadraticCurveTo(x, y - 18 - 8 * fl, x + 2, y - 18);
  ctx.fill();
}

export function drawDungeonEntrance(ctx, def, time) {
  const { entrance, name, cleared, kind, icon } = def;
  const x = entrance.x;
  const y = entrance.y;
  const t = time || 0;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 10, kind === 'town' ? 46 : 38, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  if (kind === 'town') {
    jamb(ctx, x - 34, y + 8, 12, 52, '#5a4632');
    jamb(ctx, x + 22, y + 8, 12, 52, '#4a3828');
    ctx.fillStyle = '#6a5038';
    ctx.beginPath();
    ctx.moveTo(x - 40, y - 40);
    ctx.lineTo(x, y - 62);
    ctx.lineTo(x + 40, y - 40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3a342c';
    ctx.fillRect(x - 38, y - 44, 76, 8);
    ctx.fillStyle = '#1a1612';
    ctx.fillRect(x - 12, y - 28, 24, 36);
  } else if (kind === 'ruin') {
    ctx.fillStyle = '#3a3832';
    ctx.beginPath();
    ctx.moveTo(x - 36, y + 8);
    ctx.lineTo(x - 30, y - 46);
    ctx.lineTo(x - 8, y - 38);
    ctx.lineTo(x + 6, y - 22);
    ctx.lineTo(x + 28, y - 40);
    ctx.lineTo(x + 34, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6e6a60';
    ctx.fillRect(x - 30, y - 46, 22, 3);
    ctx.fillStyle = '#141210';
    ctx.beginPath();
    ctx.moveTo(x - 12, y + 8);
    ctx.lineTo(x - 10, y - 24);
    ctx.quadraticCurveTo(x, y - 30, x + 14, y - 16);
    ctx.lineTo(x + 12, y + 8);
    ctx.closePath();
    ctx.fill();
  } else {
    jamb(ctx, x - 30, y + 6, 14, 44, '#3e403c');
    jamb(ctx, x + 16, y + 6, 14, 44, '#343632');
    ctx.fillStyle = '#4a4c48';
    ctx.fillRect(x - 36, y - 42, 72, 10);
    ctx.fillStyle = '#121614';
    ctx.fillRect(x - 14, y - 30, 28, 36);
    flame(ctx, x, y - 46, t, cleared ? '#c4b48a' : '#e0b15a');
  }

  plate(ctx, `${icon || ''} ${name}`.trim(), x, y - (kind === 'town' ? 70 : 58), '#e1cf9d');
  plate(ctx, cleared ? '踏破済' : (kind === 'town' ? '入れる' : (kind === 'ruin' ? '廃墟' : `推奨DEF ${def.reqDef}+`)), x, y - (kind === 'town' ? 52 : 40), '#d7c4a2', 10);
  ctx.restore();
}

function drawTownInterior(ctx, dungeon) {
  const w = dungeon.width, h = dungeon.height;
  ctx.fillStyle = '#2c261e';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#6a5b45';
  ctx.fillRect(0, h / 2 - 36, w, 72);
  ctx.fillStyle = '#5a4c38';
  ctx.fillRect(w * 0.62, 90, 48, h - 180);
  const houses = [
    [70, 60, 130, 86], [240, 48, 150, 96], [430, 70, 140, 78],
    [64, h - 190, 160, 96], [270, h - 176, 130, 84], [450, h - 200, 170, 108],
    [w - 460, 56, 160, 92], [w - 250, 78, 140, 74],
    [w - 430, h - 210, 170, 104], [w - 220, h - 186, 120, 82]
  ];
  for (const [x, y, hw, hh] of houses) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x + 8, y + hh, hw, 8);
    ctx.fillStyle = '#4a4036';
    ctx.fillRect(x, y, hw, hh);
    ctx.fillStyle = '#2e2924';
    ctx.fillRect(x + hw * 0.72, y, hw * 0.28, hh);
    ctx.fillStyle = '#5c4632';
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 6);
    ctx.lineTo(x + hw / 2, y - 20);
    ctx.lineTo(x + hw + 8, y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1612';
    ctx.fillRect(x + hw / 2 - 9, y + hh - 24, 18, 24);
    ctx.fillStyle = '#8a8170';
    ctx.fillRect(x + 14, y + 16, 12, 8);
  }
  ctx.fillStyle = '#5a564c';
  ctx.beginPath();
  ctx.ellipse(w * 0.42, h / 2 + 70, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a2426';
  ctx.beginPath();
  ctx.ellipse(w * 0.42, h / 2 + 70, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  drawWalls(ctx, w, h);
  drawExitArch(ctx, 52, h / 2, '西門・外へ');
}

function drawRuinInterior(ctx, dungeon, time) {
  const w = dungeon.width, h = dungeon.height;
  const t = time || 0;
  ctx.fillStyle = '#241f1a';
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 36) {
    for (let x = 0; x < w; x += 44) {
      const n = stoneHash(x, y);
      if (n > 0.86) continue;
      ctx.fillStyle = n > 0.55 ? '#3a3832' : '#2a261f';
      ctx.fillRect(x + 2, y + 2, 40, 30);
    }
  }
  ctx.fillStyle = 'rgba(196,180,138,0.07)';
  ctx.fillRect(w * 0.55, 0, 70, h);
  const chunks = [[260, 80, 90, 36], [520, h - 160, 120, 28], [900, 100, 70, 48], [w - 520, h - 220, 140, 30]];
  for (const [x, y, hw, hh] of chunks) {
    ctx.fillStyle = '#3a3832';
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x + 6, y);
    ctx.lineTo(x + hw * 0.4, y + 8);
    ctx.lineTo(x + hw * 0.7, y + hh * 0.45);
    ctx.lineTo(x + hw, y + hh);
    ctx.fill();
    ctx.fillStyle = '#6e6a60';
    ctx.fillRect(x + 6, y, hw * 0.28, 3);
  }
  ctx.save();
  ctx.translate(640, h / 2 + 40);
  ctx.rotate(-0.5);
  ctx.fillStyle = '#5a564e';
  ctx.fillRect(0, 0, 70, 12);
  ctx.restore();
  ctx.fillStyle = '#6a655c';
  ctx.fillRect(w - 480, h / 2 - 80, 16, 70);
  ctx.fillRect(w - 488, h / 2 - 88, 32, 8);
  ctx.fillStyle = '#3a342c';
  ctx.beginPath();
  ctx.ellipse(w - 350, h / 2, 70, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a241c';
  ctx.beginPath();
  ctx.ellipse(w - 350, h / 2, 46, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  flame(ctx, 300, h - 80, t, '#c47a3a');
  flame(ctx, w - 560, 120, t, '#e0b15a');
  drawWalls(ctx, w, h);
  drawExitArch(ctx, 180, h / 2, '外へ');
}

function drawStoneDungeon(ctx, dungeon, time) {
  const w = dungeon.width, h = dungeon.height;
  const t = time || 0;
  ctx.fillStyle = dungeon.floorColor || '#1e1a2b';
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 48) {
    for (let x = 0; x < w; x += 48) {
      const n = stoneHash((x / 48) | 0, (y / 48) | 0);
      const slip = (n - 0.5) * 6;
      ctx.fillStyle = n > 0.72 ? '#2a2824' : '#34322c';
      ctx.fillRect(x + 2 + slip, y + 2, 42, 42);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(x + 2 + slip, y + 40, 42, 4);
    }
  }
  const brackets = [
    [360, 70], [360, h - 70], [780, 70], [780, h - 70],
    [1200, 80], [1200, h - 80], [w - 420, 76], [w - 420, h - 76]
  ];
  for (const [x, y] of brackets) {
    if (x > w - 40) continue;
    ctx.fillStyle = '#3a3834';
    ctx.fillRect(x - 8, y - 28, 16, 36);
    flame(ctx, x, y - 10, t, dungeon.torchColor || '#c47a3a');
  }
  ctx.fillStyle = '#3a342c';
  ctx.beginPath();
  ctx.ellipse(w - 350, h / 2, 120, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a241c';
  ctx.beginPath();
  ctx.ellipse(w - 350, h / 2, 78, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a5348';
  ctx.beginPath();
  ctx.ellipse(w - 350, h / 2 - 8, 78, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  drawWalls(ctx, w, h);
  drawExitArch(ctx, 180, h / 2, '外界への門');
}

export function drawDungeonEnvironment(ctx, dungeon, camera, viewW, viewH, zoom, time) {
  ctx.save();
  if (dungeon.kind === 'town') drawTownInterior(ctx, dungeon);
  else if (dungeon.kind === 'ruin') drawRuinInterior(ctx, dungeon, time);
  else drawStoneDungeon(ctx, dungeon, time);
  ctx.restore();
}

export function drawDungeonVault(ctx, vault) {
  if (!vault) return;
  const { x, y, opened, unlocked, name } = vault;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 12, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  const body = opened ? '#4a3828' : (unlocked ? '#6a5034' : '#3a342c');
  ctx.fillStyle = body;
  ctx.fillRect(x - 20, y - 12, 40, 24);
  ctx.fillStyle = opened ? '#5a4636' : '#7a5a3c';
  ctx.beginPath();
  ctx.moveTo(x - 20, y - 12);
  ctx.quadraticCurveTo(x, y - 26, x + 20, y - 12);
  ctx.fill();
  ctx.fillStyle = '#2a241c';
  ctx.fillRect(x - 20, y - 2, 40, 3);
  ctx.fillRect(x - 2, y - 16, 4, 26);
  ctx.fillStyle = unlocked && !opened ? '#d7b56a' : '#5a564c';
  ctx.beginPath();
  ctx.arc(x, y + 2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  plate(ctx, opened ? '開いた' : (unlocked ? (name || '箱') : 'まだ開かない'), x, y - 30, '#e1cf9d', 11);
  ctx.restore();
}
