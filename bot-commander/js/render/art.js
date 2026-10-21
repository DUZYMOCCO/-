/**
 * 新作RTS 試作アート（手書きSVG）。
 * 作風は ダダサバイバー js/art.js（rep 版）にそろえる: 暗い輪郭 #121418・セル塗り（影色の上に本体色をずらして重ねる）・細い目。
 * ロボットはすべてオリジナルのデフォルメ（既存アニメのデザインは使わない）。
 * shadedCircle / 輪郭の定数は dada-survivor/js/art.js からの流用（色だけ変えられるよう引数化）。
 */
const O = '#121418';
const S = `stroke="${O}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const S2 = `stroke="${O}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"`;
const SW = w => `stroke="${O}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const wrap = (body, vb = '0 0 64 64') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;

function shadedCircle(id, cx, cy, r, fill, shade) {
  return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${shade}"/>
    <circle cx="${cx - r * 0.14}" cy="${cy - r * 0.16}" r="${r * 0.94}" fill="${fill}" clip-path="url(#${id})"/>
    <ellipse cx="${cx - r * 0.38}" cy="${cy - r * 0.46}" rx="${r * 0.22}" ry="${r * 0.1}" fill="#fff" opacity=".2" transform="rotate(-30 ${cx - r * 0.38} ${cy - r * 0.46})"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" ${S}/>`;
}
// 角丸の箱にセル影
function shadedBox(id, x, y, w, h, r, fill, shade) {
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${shade}"/>
    <rect x="${x - 2}" y="${y - 2}" width="${w * 0.86}" height="${h * 0.8}" rx="${r}" fill="${fill}" clip-path="url(#${id})"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" ${S}/>`;
}
// 細いつり目（バイザー内に光る）
const slitEye = (x, y, glow, flip = 1) => `<path d="M${x - 3.6 * flip} ${y + 0.9} Q${x} ${y - 2.2} ${x + 3.6 * flip} ${y - 0.7} Q${x} ${y + 0.4} ${x - 3.6 * flip} ${y + 0.9}Z" fill="${glow}"/><circle cx="${x + 1.2 * flip}" cy="${y - 0.6}" r=".6" fill="#fff"/>`;

export const PALETTES = Object.freeze({
  ally: { main: '#5b93e6', shade: '#2f5aa8', dark: '#22324f', accent: '#ffd166', glow: '#7df9ff', joint: '#2b2f38' },
  enemy: { main: '#e0574a', shade: '#9e2f27', dark: '#4a1f1c', accent: '#2b2d33', glow: '#ffe066', joint: '#2b2f38' },
});

/** 射撃型「ポッド」: まるい頭とひさし型バイザー、右腕が筒の銃、短いアンテナ */
function gunner(p, commander) {
  const crest = commander ? `<path d="M26 10 L32 -1 L38 10 Q32 7.5 26 10Z" fill="${p.accent}" ${S2}/><path d="M29.5 6 L32 1.5 L34.5 6Z" fill="#fff" opacity=".45"/>` :
    `<path d="M40 9 L45 2" ${SW(2.4)}/><circle cx="45.5" cy="1.8" r="2.4" fill="${p.accent}" ${S2}/>`;
  return `
  <ellipse cx="32" cy="61" rx="17" ry="3" fill="#000" opacity=".25"/>
  <rect x="20" y="49" width="9" height="10" rx="3" fill="${p.joint}" ${S2}/><rect x="35" y="49" width="9" height="10" rx="3" fill="${p.joint}" ${S2}/>
  <path d="M17.5 60.5 Q17.5 55 24.5 55 Q31 55 31 60.5Z" fill="${p.shade}" ${S2}/><path d="M33 60.5 Q33 55 39.5 55 Q46.5 55 46.5 60.5Z" fill="${p.shade}" ${S2}/>
  ${shadedBox('bd', 19, 37, 26, 16, 6, p.main, p.shade)}
  <rect x="27" y="42" width="10" height="6" rx="1.6" fill="${p.dark}" ${S2}/><circle cx="32" cy="45" r="1.6" fill="${p.glow}"/>
  <circle cx="16.5" cy="44" r="4.4" fill="${p.shade}" ${S2}/>
  <path d="M44 41 H58 Q61 41 61 44.5 Q61 48 58 48 H44Z" fill="${p.joint}" ${S2}/>
  <rect x="50" y="40" width="6" height="9" rx="1.5" fill="${p.main}" ${S2}/>
  <circle cx="60.6" cy="44.5" r="1.5" fill="${p.glow}"/>
  ${crest}
  ${shadedCircle('hd', 32, 24, 15.5, p.main, p.shade)}
  <path d="M17.5 23 Q32 15.5 46.5 23 L46 31 Q32 26 18 31Z" fill="${p.dark}" ${S2}/>
  ${slitEye(26, 25.6, p.glow, -1)}${slitEye(38, 25.6, p.glow)}
  <path d="M24 35 H40" stroke="${p.shade}" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="17" cy="24" r="3" fill="${p.accent}" ${S2}/><circle cx="47" cy="24" r="3" fill="${p.accent}" ${S2}/>`;
}

/** 重装型「ブロック」: 頭と胴が一体の箱、肩に2連の砲、太い足（キャタピラ風） */
function heavy(p, commander) {
  const crest = commander ? `<path d="M24 12 L32 2 L40 12Z" fill="${p.accent}" ${S2}/><path d="M28.5 10 L32 5.5 L35.5 10Z" fill="#fff" opacity=".4"/>` : '';
  return `
  <ellipse cx="32" cy="61" rx="21" ry="3" fill="#000" opacity=".25"/>
  <rect x="11" y="51" width="16" height="10" rx="4" fill="${p.joint}" ${S2}/><rect x="37" y="51" width="16" height="10" rx="4" fill="${p.joint}" ${S2}/>
  <path d="M13 56 H25 M39 56 H51" stroke="#4b5160" stroke-width="1.6" stroke-dasharray="2.2 1.6"/>
  <rect x="5" y="17" width="12" height="12" rx="3" fill="${p.shade}" ${S2}/>
  <rect x="1" y="19" width="7" height="3.4" rx="1.2" fill="${p.joint}" ${S2}/><rect x="1" y="24" width="7" height="3.4" rx="1.2" fill="${p.joint}" ${S2}/>
  <rect x="47" y="17" width="12" height="12" rx="3" fill="${p.shade}" ${S2}/>
  <rect x="56" y="19" width="7" height="3.4" rx="1.2" fill="${p.joint}" ${S2}/><rect x="56" y="24" width="7" height="3.4" rx="1.2" fill="${p.joint}" ${S2}/>
  ${crest}
  ${shadedBox('hv', 13, 11, 38, 42, 9, p.main, p.shade)}
  <rect x="18" y="20" width="28" height="10" rx="4" fill="${p.dark}" ${S2}/>
  ${slitEye(25.5, 25, p.glow, -1)}${slitEye(38.5, 25, p.glow)}
  <path d="M20 37 H44" stroke="${p.shade}" stroke-width="2" stroke-linecap="round"/>
  <rect x="26" y="40" width="12" height="7" rx="2" fill="${p.accent}" ${S2}/>
  <path d="M29 43.5 H35" stroke="${O}" stroke-width="1.4"/>`;
}

/** 隊長マーカー（頭の上に出す旗つきの星） */
const commanderMarker = (p) => wrap(`
  <path d="M10 30 V4" ${SW(2.6)}/><path d="M10 30 V4" stroke="#d1d5db" stroke-width="1.2"/>
  <path d="M11 5 H28 L23.5 10.5 L28 16 H11Z" fill="${p.main}" ${S2}/>
  <path d="M16.5 7.4 L17.6 9.6 L20 9.8 L18.2 11.4 L18.8 13.8 L16.5 12.5 L14.2 13.8 L14.8 11.4 L13 9.8 L15.4 9.6Z" fill="${p.accent === '#2b2d33' ? '#ffe066' : p.accent}" ${SW(0.8)}/>`, '0 0 32 32');

/** 本陣（ドームの格納庫＋旗） */
function hq(p) {
  return wrap(`
  <ellipse cx="48" cy="86" rx="42" ry="7" fill="#000" opacity=".28"/>
  <rect x="8" y="50" width="80" height="34" rx="6" fill="${p.joint}" ${S}/>
  <path d="M12 56 H84" stroke="#4b5160" stroke-width="2"/>
  ${shadedCircle('dm', 48, 52, 26, p.main, p.shade)}
  <rect x="20" y="52" width="56" height="32" fill="${p.joint}"/>
  <path d="M22 52 H74" fill="none" ${S}/>
  <path d="M36 84 V66 Q48 58 60 66 V84Z" fill="${p.dark}" ${S}/>
  <path d="M40 72 H56 M40 78 H56" stroke="#4b5160" stroke-width="1.8"/>
  <rect x="14" y="62" width="10" height="7" rx="1.5" fill="${p.glow}" opacity=".85" ${S2}/>
  <rect x="72" y="62" width="10" height="7" rx="1.5" fill="${p.glow}" opacity=".85" ${S2}/>
  <path d="M48 26 V6" ${SW(3)}/><path d="M48 26 V6" stroke="#d1d5db" stroke-width="1.4"/>
  <path d="M49 7 H70 L64 13 L70 19 H49Z" fill="${p.accent === '#2b2d33' ? p.main : p.accent}" ${S2}/>
  <circle cx="48" cy="40" r="5" fill="${p.accent === '#2b2d33' ? '#ffe066' : p.accent}" ${S2}/>`, '0 0 96 96');
}

/** 地形タイル（64x64 → 1タイル）。variant で少し変える */
const grassMarks = (v) => [[12, 18], [44, 12], [30, 40], [52, 46], [16, 52]].filter((_, i) => (i + v) % 2 === 0)
  .map(([x, y]) => `<path d="M${x} ${y} l2 -5 M${x + 4} ${y} l-1 -6 M${x + 7} ${y} l2 -4" stroke="#3c6e2f" stroke-width="1.6" stroke-linecap="round" fill="none"/>`).join('');
const plainBase = v => `<rect width="64" height="64" fill="${v ? '#69a352' : '#6aa857'}"/>${grassMarks(v)}`;
const tree = (id, x, y, r) => `<ellipse cx="${x}" cy="${y + r * 0.95}" rx="${r * 0.9}" ry="${r * 0.3}" fill="#000" opacity=".22"/>
  <rect x="${x - 2}" y="${y + r * 0.4}" width="4" height="${r * 0.6}" fill="#6b4226" ${S2}/>
  ${shadedCircle(id, x, y, r, '#3f8a3a', '#255c27')}`;
export function terrainSvg(kind, v = 0) {
  if (kind === 'plain') return wrap(plainBase(v));
  if (kind === 'forest') return wrap(`<rect width="64" height="64" fill="#4e8a40"/>
    ${v ? tree('t1', 20, 22, 13) + tree('t2', 44, 36, 14) + tree('t3', 18, 48, 10) : tree('t1', 42, 20, 12) + tree('t2', 20, 34, 14) + tree('t3', 46, 48, 11)}`);
  if (kind === 'mountain') return wrap(`<rect width="64" height="64" fill="#7d8a6a"/>
    <path d="M4 58 L${v ? 28 : 34} 8 L60 58Z" fill="#6b6f78" ${S}/>
    <path d="M${v ? 28 : 34} 8 L60 58 H${v ? 36 : 40}Z" fill="#4f535b"/>
    <path d="M${v ? 21 : 27} 21 L${v ? 28 : 34} 8 L${v ? 35 : 41} 21 L${v ? 31 : 37} 18 L${v ? 28 : 34} 23 L${v ? 25 : 31} 18Z" fill="#eef2f6" ${S2}/>
    <path d="M4 58 L${v ? 28 : 34} 8 L60 58Z" fill="none" ${S}/>`);
  if (kind === 'water') return wrap(`<rect width="64" height="64" fill="${v ? '#2f72b8' : '#3277bd'}"/>
    <path d="M6 ${v ? 18 : 14} q6 -4 12 0 t12 0 M34 ${v ? 40 : 44} q6 -4 12 0 t12 0 M10 ${v ? 54 : 50} q5 -3 10 0" stroke="#9fd3ff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>`);
  throw new Error('unknown terrain ' + kind);
}

/** 描画に使う SVG の一覧。キー → SVG 文字列 と、表示の大きさ（px, 元の viewBox との比） */
export function artSources() {
  const out = {};
  for (const side of ['ally', 'enemy']) {
    const p = PALETTES[side];
    out[`gunner_${side}`] = wrap(gunner(p, false));
    out[`gunner_${side}_cmd`] = wrap(gunner(p, true));
    out[`heavy_${side}`] = wrap(heavy(p, false));
    out[`heavy_${side}_cmd`] = wrap(heavy(p, true));
    out[`marker_${side}`] = commanderMarker(p);
    out[`hq_${side}`] = hq(p);
  }
  for (const k of ['plain', 'forest', 'mountain', 'water']) for (const v of [0, 1]) out[`tile_${k}_${v}`] = terrainSvg(k, v);
  return out;
}
