import { rasterArtSources } from './raster-art.js?v=7';

/**
 * 琥珀の廃墟 / SD メカ。手書きSVG・暗い輪郭・2段のセル影と暖色の縁光。
 * 32pxでは「暗い丸頭と青い丸目」「白い装甲と青い胸」「棘脚と琥珀の目」で読む。
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
  const shell = p === PALETTES.ally ? '#aaa48a' : '#a16f5a';
  const shade = p === PALETTES.ally ? '#686c63' : '#674c43';
  return wrap(`
  <ellipse cx="48" cy="81" rx="43" ry="8" fill="#101815" opacity=".35"/>
  <path d="M8 70 L16 60 H80 L89 70 V79 H8Z" fill="#404b48" ${S}/>
  <path d="M14 50 Q16 20 46 20 Q75 20 79 50Z" fill="${shade}" ${S}/>
  <path d="M18 47 Q20 24 46 23 Q65 23 72 43 L59 49Z" fill="${shell}"/>
  <path d="M24 35 Q35 23 52 26" fill="none" stroke="#e3c994" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M47 22 Q58 32 59 48 M27 26 Q23 36 24 48" fill="none" stroke="#555f58" stroke-width="2"/>
  ${shadedBox('hqFront', 12, 47, 72, 30, 5, shell, shade)}
  <path d="M16 49 H77" stroke="#d8c49b" stroke-width="2"/>
  <path d="M34 78 V57 Q48 49 62 57 V78Z" fill="#202f32" ${S}/>
  <path d="M38 77 V59 Q48 54 58 59 V77 M48 57 V77" fill="none" stroke="#526768" stroke-width="2"/>
  <path d="M40 64 H45 M51 64 H56 M40 70 H45 M51 70 H56" stroke="${p.glow}" stroke-width="1.8" opacity=".8"/>
  <rect x="19" y="56" width="9" height="7" rx="2" fill="#263b40" ${S2}/><path d="M21 59 H26" stroke="${p.glow}" stroke-width="2.4"/>
  <rect x="68" y="56" width="9" height="7" rx="2" fill="#263b40" ${S2}/><path d="M70 59 H75" stroke="${p.glow}" stroke-width="2.4"/>
  <path d="M18 71 H28 M68 71 H78" stroke="#303b37" stroke-width="3"/>
  <path d="M6 50 V37 L10 32 M86 67 V42 L81 37" fill="none" stroke="#323f3b" stroke-width="3"/>
  <circle cx="6" cy="36" r="3" fill="${p.glow}" ${S2}/>
  <path d="M48 26 V6" ${SW(3)}/><path d="M48 26 V6" stroke="#d1d5db" stroke-width="1.4"/>
  <path d="M49 7 H70 L64 13 L70 19 H49Z" fill="${p.accent === '#2b2d33' ? p.main : p.accent}" ${S2}/>
  <path d="M52 10 H62" stroke="#fff2c2" stroke-width="1.6" opacity=".7"/>
  <circle cx="48" cy="40" r="5" fill="${p.accent === '#2b2d33' ? '#ffe066' : p.accent}" ${S2}/>`, '0 0 96 96');
}

/** 地形タイル（64x64 → 1タイル）。variant で少し変える */
// All variants share their edge pixels. Marks stay inset: no tile border/grid outline.
const ground = (color, v) => `<rect width="64" height="64" fill="${color}"/>
  <path d="${v ? 'M8 18 Q25 8 44 19 L52 33 Q34 26 19 36 L8 31Z' : 'M9 31 Q27 19 49 29 L55 45 Q32 39 13 51Z'}" fill="#e5bc78" opacity=".065"/>
  <path d="M10 54 l7 -2 M46 11 l6 2 M35 48 l3 -1" stroke="#272e28" stroke-width="1.8" stroke-linecap="round" opacity=".24"/>`;
const jellyPlant = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <ellipse cy="15" rx="13" ry="4" fill="#122a25" opacity=".35"/>
  <path d="M-7 0 Q-10 8 -6 13 M-2 1 Q1 9 -2 17 M4 0 Q2 9 7 13 M8 -1 Q11 6 9 10" fill="none" stroke="#afad6b" stroke-width="1.6" opacity=".68"/>
  <ellipse cy="-3" rx="16" ry="10" fill="#ecc171" opacity=".08"/>
  <path d="M-13 -2 Q-11 -15 0 -16 Q11 -14 13 -2 Q0 3 -13 -2Z" fill="#8d8951" stroke="#2e4735" stroke-width="1.8"/>
  <path d="M-11 -5 Q-4 -15 4 -12 Q10 -10 11 -5 Q0 -9 -11 -5Z" fill="#c2ae68"/>
  <path d="M-10 -2 Q0 2 10 -2 M0 -13 L-2 -4" fill="none" stroke="#edcf87" stroke-width="1.6" opacity=".8"/>
  <circle cx="-5" cy="-8" r="1.4" fill="#ffe1a1" opacity=".8"/></g>`;
export function terrainSvg(kind, v = 0) {
  if (kind === 'plain') return wrap(`${ground('#858363', v)}
    ${v ? '<path d="M14 20 L28 16 L34 24 L22 29Z" fill="#979171" opacity=".5"/><path d="M14 20 L22 22 L28 16 M22 22 V29" fill="none" stroke="#615f4e" stroke-width="1.5" opacity=".5"/>' : '<path d="M20 37 L30 33 L42 37 M30 33 L32 26" fill="none" stroke="#5c6351" stroke-width="1.4" opacity=".6"/>'}
    <path d="M46 47 l1 -5 M49 48 l3 -4 M12 13 l2 -3" fill="none" stroke="#535f43" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="${v ? 41 : 16}" cy="${v ? 20 : 44}" r="1.4" fill="#b7a475" opacity=".6"/>`);
  if (kind === 'forest') return wrap(`${ground('#485d45', v)}
    <path d="M7 42 Q7 33 20 35 Q24 25 35 34 Q54 30 56 44 Q45 54 28 51 Q12 57 7 42Z" fill="#344c38"/>
    <path d="M8 43 l5 -8 l3 8 M48 49 l2 -9 l5 7 M30 54 l-1 -8 l5 4" fill="none" stroke="#657346" stroke-width="2" stroke-linecap="round"/>
    ${v ? jellyPlant(22, 27, .95) + jellyPlant(46, 45, .62) : jellyPlant(40, 30, 1.05) + jellyPlant(16, 45, .65)}`);
  if (kind === 'mountain') return wrap(`${ground('#6f7264', v)}
    <ellipse cx="32" cy="49" rx="25" ry="9" fill="#3b4540" opacity=".4"/>
    <g transform="${v ? 'translate(64 0) scale(-1 1)' : 'translate(0 0)'}">
    <path d="M8 44 L14 26 L33 16 L46 22 L51 43 L35 52 L14 51Z" fill="#505b55" stroke="#3f4a44" stroke-width="1.8"/>
    <path d="M14 26 L33 16 L46 22 L34 30 L22 40 L8 44Z" fill="#96927c"/>
    <path d="M34 30 L46 22 L51 43 L35 52Z" fill="#626b60"/>
    <path d="M17 26 L32 20 L39 23 M12 43 L21 40" fill="none" stroke="#b4a581" stroke-width="1.8"/>
    <path d="M25 43 L34 30 L35 39" fill="none" stroke="#3f4a44" stroke-width="1.7"/>
    <path d="M40 49 L44 39 L55 36 L58 48 L50 54Z" fill="#5d665d" stroke="#404b44" stroke-width="1.5"/>
    <path d="M44 39 L55 36 L52 44 L40 49Z" fill="#a09678"/>
    <path d="M12 49 L23 46 L27 51 L16 56Z" fill="#aaa082"/>
    <path d="M21 19 L23 12 L27 10 M42 19 L46 12" fill="none" stroke="#545e53" stroke-width="2.5"/></g>`);
  if (kind === 'water') return wrap(`<rect width="64" height="64" fill="#29464d"/>
    <path d="${v ? 'M8 20 Q21 14 43 21 L54 33 Q35 26 18 34Z' : 'M9 37 Q28 28 52 37 L49 46 Q31 38 14 46Z'}" fill="#39575a" opacity=".55"/>
    <path d="M8 ${v ? 17 : 23} q7 -3 14 0 m14 21 q8 -3 17 0 M14 53 h10" stroke="#78938b" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".55"/>
    <path d="M${v ? 41 : 18} 29 h7 m-3 4 h4" stroke="#bea66a" stroke-width="1.7" stroke-linecap="round" opacity=".48"/>`);
  throw new Error('unknown terrain ' + kind);
}


/* ===== v0.2.0 ミッション用 ===== */

/** ツギハギ号（スカベンジャー）: 大きな暗いリベット打ちの丸い頭（全高の約6割）・青く光る大きな丸い目2つ・細いアンテナ・ケーブル・小さな体。
 *  ユーザーの設定画 ref/scavenger/scavenger_concept_01.jpg が基準。commander は頭の上に小さな黄色い灯り。 */
// Parts are local art options; no sim fields, randomness, or extra texture keys.
function scav(commander, { glow = '#59daff', antenna = 'twin', armTool = 'claw', legs = 'boots', addon = 'pack' } = {}) {
  const eye = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r + 1.3}" fill="#142831" ${S2}/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="${glow}"/>
    <circle cx="${x + .5}" cy="${y + .7}" r="${r * .62}" fill="#c5f5ff"/>
    <path d="M${x - r * .48} ${y + r * .1} Q${x - r * .65} ${y - r * .6} ${x + r * .2} ${y - r * .65}" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="${x}" cy="${y}" r="${r + 2.4}" fill="${glow}" opacity=".09"/>`;
  const feet = legs === 'boots' ? `<path d="M23 48 L22 54 L29 54 M36 48 L36 54 L45 54" fill="none" stroke="#151e20" stroke-width="5"/>
    <path d="M19 52 L28 51 L30 56 H18Z" fill="#6e776d" ${S2}/><path d="M35 52 L43 51 L47 56 H34Z" fill="#8e8c74" ${S2}/>
    <path d="M20 53 H26 M36 53 H42" stroke="#bdad87" stroke-width="1.4"/>` : '';
  const pack = addon === 'pack' ? `<path d="M16 31 L10 34 L9 45 L17 48 L23 41Z" fill="#726e51" ${S2}/>
    <path d="M12 35 L10 43 M15 34 L13 45" stroke="#b2a078" stroke-width="1.6"/>
    <path d="M11 36 Q4 40 8 47 Q11 51 16 47" fill="none" stroke="#263331" stroke-width="2.6"/>` : '';
  const antennas = antenna === 'twin' ? `<path d="M22 9 L18 2 M42 10 L48 3" fill="none" stroke="#1d2929" stroke-width="2"/>
    <circle cx="18" cy="2" r="1.8" fill="#b4ad8c" ${SW(.9)}/><circle cx="48" cy="3" r="1.8" fill="#c1b08a" ${SW(.9)}/>` : '';
  const claw = armTool === 'claw' ? `<path d="M47 38 L53 43 L51 48" fill="none" stroke="#1b2526" stroke-width="6" stroke-linecap="round"/>
    <path d="M47 38 L53 43 L51 48" fill="none" stroke="#888d7c" stroke-width="3" stroke-linecap="round"/>
    <path d="M51 47 L56 49 L54 52 M51 47 L49 51 L51 53" fill="none" stroke="#c3b281" stroke-width="2.2" stroke-linecap="round"/>` : '';
  const lamp = commander ? `<path d="M32 8 V3" stroke="#202a28" stroke-width="3"/>
    <circle cx="32" cy="3.5" r="3.4" fill="#ffe4a1" opacity=".2"/><rect x="29.5" y="1" width="5" height="5" rx="2" fill="#ffcf62" ${SW(1.2)}/>` : '';
  return `
  <ellipse cx="32" cy="56.4" rx="18" ry="3.2" fill="#0c191c" opacity=".3"/>
  ${pack}${feet}
  ${shadedBox('scBody', 20, 35, 24, 15, 5, '#85816a', '#454f49')}
  <path d="M23 37 L29 36 L29 44 L23 45Z" fill="#b4aa82" ${SW(1.1)}/>
  <path d="M32 38 H40 V44 H32Z" fill="#263538" ${SW(1.2)}/><path d="M34 40 H38" stroke="${glow}" stroke-width="1.7"/>
  <path d="M23 47 H39" stroke="#b2a47f" stroke-width="1.5"/>
  <path d="M18 36 Q11 39 14 47 L17 49" fill="none" stroke="#202b2b" stroke-width="5" stroke-linecap="round"/>
  <path d="M17 37 L14 42 L16 45" fill="none" stroke="#788278" stroke-width="2.5" stroke-linecap="round"/>
  ${claw}
  <path d="M20 32 Q14 34 17 40 M42 32 Q50 34 45 41" fill="none" stroke="#c08758" stroke-width="2.1"/>
  ${antennas}
  ${shadedCircle('scHead', 32, 23, 19.5, '#59665f', '#273a3e')}
  <path d="M14 18 Q19 5 33 5 Q43 5 49 15 Q32 8 21 17Z" fill="#818674"/>
  <path d="M19 11 Q28 4 40 9" fill="none" stroke="#cfb382" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M35 5 L35 14 M16 29 Q33 37 50 28" fill="none" stroke="#293c3d" stroke-width="1.5"/>
  <path d="M14 29 Q15 36 22 39 M39 40 Q46 38 50 31" fill="none" stroke="#6d9b97" stroke-width="1.6" opacity=".8"/>
  <path d="M16 13 L22 11 L24 17 L17 19Z" fill="#a79a72" ${SW(1.1)}/>
  <path d="M18 14 l3 -1 M19 17 l3 -1" stroke="#d1ba87" stroke-width="1.2"/>
  <path d="M40 33 L46 31 L46 36 L41 38Z" fill="#9e6d50" ${SW(1)}/>
  <circle cx="16" cy="25" r="3.5" fill="#475c59" ${S2}/>
  ${[[22, 8], [43, 11], [18, 34], [29, 39], [39, 38], [48, 24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="#bcad87" stroke="#2a3735" stroke-width=".7"/>`).join('')}
  <path d="M27 35 Q32 37 36 34" fill="none" stroke="#a8a58a" stroke-width="1.7" stroke-linecap="round"/>
  ${eye(27, 24, 5.2)}${eye(42, 23, 5.8)}${lamp}`;
}

/** PONCO02（戦闘用）: 丸いフォルムの白・青・赤の三色、暗いバイザーの目、腕の短い銃 */
function ponco(commander) {
  const crest = commander ? `<path d="M27 11 L32 2 L37 11Z" fill="#ffd166" ${S2}/><path d="M31 8 L32 4 L34 8Z" fill="#fff1ba"/>` : `<path d="M42 13 L47 4" ${SW(1.9)}/><circle cx="47" cy="4" r="1.8" fill="#d8674b" ${SW(.9)}/>`;
  return `
  <ellipse cx="32" cy="56.3" rx="20" ry="3.4" fill="#102226" opacity=".3"/>
  <rect x="15" y="25" width="12" height="18" rx="3" fill="#405d68" ${S2}/><path d="M18 28 V36" stroke="#899f98" stroke-width="2"/>
  <path d="M24 43 L23 51 M38 43 L39 51" fill="none" stroke="#1a2e36" stroke-width="7"/>
  ${shadedBox('pcLegA', 19, 46, 10, 8, 3, '#eee6cd', '#849ba0')}
  ${shadedBox('pcLegB', 34, 46, 11, 8, 3, '#eee6cd', '#849ba0')}
  <path d="M19 52 H28 L30 56 H16Z M35 52 H44 L48 56 H33Z" fill="#396c8b" ${S2}/>
  <path d="M19 53 H26 M36 53 H43" stroke="#9fc6ca" stroke-width="1.6"/>
  ${shadedBox('pcBody', 18, 29, 28, 18, 7, '#e7e1ca', '#879b99')}
  <path d="M22 31 L37 31 L38 42 L23 42Z" fill="#36749b" ${SW(1.2)}/>
  <path d="M24 32 H35" stroke="#93bdc7" stroke-width="1.6"/>
  <path d="M39 33 L44 34 V40 H39Z" fill="#b95442"/>
  <path d="M26 35 H34 V37 H29 V38 H33 V40 H29 V43 H26Z" fill="#fff1d6"/>
  <path d="M21 44 H40" stroke="#404d4b" stroke-width="1.8"/>
  <circle cx="16" cy="35" r="5" fill="#233d48" ${S2}/>
  <path d="M12 35 Q10 41 14 45 L19 43 L18 37Z" fill="#aeb8ad" ${S2}/>
  <path d="M12 35 L12 30 Q16 27 21 31 L21 36Z" fill="#ede5cc" ${S2}/><path d="M14 31 l5 1" stroke="#c65c47" stroke-width="2.3"/>
  <path d="M44 35 L49 40 L47 45" stroke="#243c45" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M43 33 Q49 30 51 35 L49 40 L43 39Z" fill="#ece4cb" ${S2}/>
  <path d="M46 40 H58 L61 42 V46 H46Z" fill="#284452" ${S2}/>
  <path d="M48 40 H55 V44 H48Z" fill="#4d839a"/>
  <path d="M60 42 V45" stroke="#9aecf1" stroke-width="2"/>
  ${shadedCircle('pcHead', 32, 21, 15.5, '#eee8d3', '#829b9c')}
  <path d="M19 15 Q26 5 39 9" fill="none" stroke="#fff5d9" stroke-width="2" stroke-linecap="round"/>
  <path d="M20 10 L23 8 L28 14 L25 17Z" fill="#337293"/>
  <path d="M39 9 L42 11 L43 16 L40 15Z" fill="#c35b45"/>
  <path d="M22 19 Q35 14 47 19 L46 26 Q34 31 22 27 Q18 23 22 19Z" fill="#172d36" ${S2}/>
  <path d="M25 19 Q35 17 43 19" stroke="#658e96" stroke-width="1.2" fill="none"/>
  <rect x="27" y="20" width="3.8" height="6" rx="1.9" fill="#75edff"/>
  <rect x="39" y="19.7" width="4" height="6.5" rx="2" fill="#a6f7ff"/>
  <path d="M28 31 Q35 33 41 30" stroke="#c2c6ad" stroke-width="1.6" fill="none"/>
  <circle cx="17.5" cy="23" r="4.2" fill="#28566d" ${S2}/><circle cx="17.5" cy="23" r="2.1" fill="#88b9bd"/>
  <path d="M25 10 l2 1 M38 29 l3 -1" stroke="#a16c4a" stroke-width="1.3" stroke-linecap="round"/>${crest}`;
}

/** 異星生物（巡回）: 動物と機械の融合。肉の膨らみ＋埋め込まれた金属板、不揃いに光る目、虫やカニのようなとげの脚、光る口 */
function alien(commander) {
  const glow = '#ffc268';
  const leg = (x, y, kneeX, kneeY, footX) => `<path d="M${x} ${y} L${kneeX} ${kneeY} L${footX} 55 L${footX + 3} 56 L${kneeX + 4} ${kneeY - 4} L${x + 3} ${y - 4}Z" fill="#433d3a" ${S2}/>
    <path d="M${x + 1} ${y - 2} L${kneeX + 2} ${kneeY - 2} L${footX + 1} 52" fill="none" stroke="#a39068" stroke-width="1.4"/>
    <circle cx="${kneeX + 1}" cy="${kneeY - 1}" r="2.2" fill="#866549" stroke="#342c2a" stroke-width="1"/>`;
  const eye = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r + 1.4}" fill="#211f21"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="${glow}"/><circle cx="${x - .4}" cy="${y - .7}" r="${r * .44}" fill="#fff4c9"/>
    <circle cx="${x}" cy="${y}" r="${r + 2}" fill="#ffa74a" opacity=".1"/>`;
  return `
  <ellipse cx="32" cy="56.4" rx="27" ry="4" fill="#161e20" opacity=".32"/>
  ${leg(17, 33, 6, 37, 3)}${leg(30, 37, 20, 43, 15)}${leg(41, 35, 54, 37, 57)}
  <path d="M12 29 L8 16 L19 22 L23 11 L31 18 L39 9 L42 20 L52 15 L50 29Z" fill="#46483f" ${S2}/>
  <path d="M23 20 L23 11 L28 18 M39 10 L38 21 M51 16 L46 26" stroke="#9e8d65" stroke-width="1.4" fill="none"/>
  <path d="M9 31 Q8 19 23 20 Q31 14 43 23 Q56 22 57 32 Q61 44 49 46 L24 47 Q10 45 9 31Z" fill="#493c42" ${S}/>
  <path d="M12 29 Q14 19 26 23 Q33 19 42 26 Q53 24 55 32 L46 38 L25 39 Q14 38 12 29Z" fill="#7e6261"/>
  <path d="M13 27 Q18 20 26 24 M31 22 Q36 21 41 26" fill="none" stroke="#b59a7a" stroke-width="1.6"/>
  <path d="M12 32 L17 25 L29 23 L33 29 L24 35 L14 37Z" fill="#586058" ${S2}/>
  <path d="M17 26 L27 25 L25 28 L16 32Z" fill="#87907a"/>
  <path d="M20 28 L22 24" stroke="#b5aa7b" stroke-width="1.2"/>
  <path d="M17 39 Q13 42 17 46 Q23 51 29 43" fill="none" stroke="#263132" stroke-width="3.5"/>
  <path d="M18 40 Q15 43 19 45 L24 45" fill="none" stroke="#a28660" stroke-width="1.3"/>
  <path d="M31 32 Q36 27 44 30 L56 29 L60 34 L56 40 Q43 45 34 39Z" fill="#333b38" ${S2}/>
  <path d="M44 30 L55 30 L58 33 L47 35Z" fill="#7f8065"/>
  <path d="M36 40 Q45 46 56 39 L53 45 Q43 49 36 44Z" fill="#c38245" stroke="#332d29" stroke-width="1.3"/>
  <path d="M39 42 l2 3 l2 -2 M47 43 l2 2 l2 -3" fill="none" stroke="#ffe0a1" stroke-width="1.3"/>
  ${eye(41, 29, 3.7)}${eye(51, 27, 2.2)}${eye(32, 33, 1.7)}
  <path d="M24 35 L28 38 L25 42 M27 38 L32 39" fill="none" stroke="#e5ac5f" stroke-width="1.5" stroke-linecap="round"/>
  ${leg(27, 43, 10, 45, 8)}${leg(43, 43, 49, 48, 47)}
  ${commander ? '<path d="M32 19 L35 13 L39 17" fill="none" stroke="#ffcc76" stroke-width="2.1" stroke-linecap="round"/>' : ''}`;
}

/** 回収ポイント（ガラクタの山）。v=0/1 で形を変える。empty は掘りつくした跡 */
function salvagePile(v, empty) {
  // Keep the original 64px viewBox and place the pile base at anchor y ~= 51.
  if (empty) return wrap(`<ellipse cx="32" cy="51" rx="27" ry="7" fill="#303d33" opacity=".6"/>
    <path d="M7 51 L17 46 L29 48 L41 44 L56 50 L49 54 L22 55Z" fill="#535849"/>
    <path d="M14 49 L22 47 L27 51 L17 53Z M39 48 L46 46 L51 50 L42 52Z" fill="#73715a" stroke="#424a40" stroke-width="1.2"/>
    <path d="M30 50 l4 -4 l4 1 M9 53 l5 1" stroke="#333f38" stroke-width="1.7" fill="none"/>`);
  const wheelX = v ? 45 : 17;
  return wrap(`
  <ellipse cx="32" cy="51" rx="28" ry="7" fill="#1d2b28" opacity=".4"/>
  <path d="M6 49 L10 34 L23 25 L35 23 L53 33 L59 49 L45 53 L18 53Z" fill="#50594e" ${S2}/>
  <path d="M9 45 L20 31 L34 27 L45 32 L42 45 L26 49Z" fill="#8c8262"/>
  <path d="M${v ? 13 : 35} 35 V18 L${v ? 23 : 45} 13 V31" fill="none" stroke="#2f3e3d" stroke-width="7" stroke-linejoin="round"/>
  <path d="M${v ? 13 : 35} 33 V18 L${v ? 23 : 45} 13" fill="none" stroke="#a3a28a" stroke-width="3" stroke-linejoin="round"/>
  <path d="M23 29 L29 18 L40 22 L43 36Z" fill="#677e7b" ${S2}/><path d="M29 20 L38 23 L32 28 L25 28Z" fill="#a0ada0"/>
  <path d="M12 34 L25 30 L30 43 L16 47Z" fill="#ab8660" ${S2}/><path d="M15 35 L23 33" stroke="#d3b17d" stroke-width="1.8"/>
  <rect x="33" y="32" width="20" height="15" rx="3" fill="${v ? '#a6a28a' : '#858f7b'}" ${S2} transform="rotate(9 43 40)"/>
  <path d="M37 36 H48 V42 H37Z" fill="#344743" ${SW(1)}/><path d="M39 38 H45" stroke="#d3b56e" stroke-width="1.5"/>
  <circle cx="${wheelX}" cy="44" r="8.5" fill="#293431" ${S2}/><circle cx="${wheelX}" cy="44" r="5.3" fill="#626e61" ${SW(1.1)}/>
  <circle cx="${wheelX}" cy="44" r="2" fill="#aaa078"/>
  <path d="M25 47 L31 42 L37 46 L33 52 H25Z" fill="#a3956e" ${SW(1.3)}/>
  <circle cx="31" cy="47" r="2" fill="#3f5146"/>
  <path d="M44 48 L52 45 L56 50 L47 54Z" fill="#586b61" ${SW(1.2)}/>
  <circle cx="${v ? 22 : 46}" cy="${v ? 27 : 41}" r="6" fill="#ffe19a" opacity=".13"/>
  <circle cx="${v ? 22 : 46}" cy="${v ? 27 : 41}" r="3" fill="#ffd77b" ${SW(1.1)}/>
  <path d="M${v ? '21 25 h2 M21 27 h2' : '45 39 h2 M45 41 h2'}" stroke="#fff3cb" stroke-width="1.2"/>`);
}

/** 脱出口（黄色と黒の縞の丸いハッチ＋信号弾の柱） */
function hatch() {
  const stripes = Array.from({ length: 12 }, (_, i) => { const a0 = i * 30 * Math.PI / 180, a1 = (i * 30 + 15) * Math.PI / 180; const p = (a, r) => `${48 + Math.cos(a) * r} ${62 + Math.sin(a) * r * 0.55}`; return `<path d="M${p(a0, 30)} L${p(a1, 30)} L${p(a1, 22)} L${p(a0, 22)}Z" fill="#121418"/>`; }).join('');
  return wrap(`
  <ellipse cx="48" cy="67" rx="35" ry="19" fill="#122421" opacity=".35"/>
  <path d="M18 63 Q48 44 78 63 V68 Q48 87 18 68Z" fill="#404d46" ${S}/>
  <ellipse cx="48" cy="62" rx="30" ry="16.5" fill="#f5c400" ${S}/>
  ${stripes}
  <path d="M23 55 Q47 41 71 54" stroke="#ffe1a2" stroke-width="2" fill="none" opacity=".8"/>
  <ellipse cx="48" cy="62" rx="21" ry="11.5" fill="#87958a" ${S}/>
  <ellipse cx="48" cy="63" rx="17" ry="8.5" fill="#435d57" ${S2}/>
  <path d="M32 61 Q48 53 64 61 M48 55 V71" stroke="#a5b4a1" stroke-width="1.6" fill="none"/>
  <path d="M41 59 L48 56 L55 59 V63 L48 66 L41 63Z" fill="#213f3d" ${S2}/>
  <path d="M44 59 L48 58 L52 59" stroke="#bdebd3" stroke-width="1.6" fill="none"/>
  <circle cx="30" cy="64" r="1.5" fill="#e8d198"/><circle cx="65" cy="64" r="1.5" fill="#e8d198"/>
  <path d="M70 58 V17" ${SW(4)}/><path d="M70 58 V17" stroke="#a3b6a9" stroke-width="2"/>
  <path d="M67 39 H73 M67 47 H73" stroke="#475e55" stroke-width="2.4"/>
  <circle cx="70" cy="14" r="11" fill="#ff8657" opacity=".08"/>
  <rect x="65" y="8" width="10" height="13" rx="4" fill="#b6533e" ${S2}/>
  <path d="M67 10 H72 V17 H67Z" fill="#ffb577"/><path d="M68 10 V14" stroke="#fff1c4" stroke-width="2"/>
  <rect x="62" y="20" width="16" height="4" rx="2" fill="#3b4e48" ${S2}/>`, '0 0 96 96');
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
  // v0.2.0 ミッション用
  out.scav_ally = wrap(scav(false)); out.scav_ally_cmd = wrap(scav(true));
  out.ponco_ally = wrap(ponco(false)); out.ponco_ally_cmd = wrap(ponco(true));
  out.alien_enemy = wrap(alien(false)); out.alien_enemy_cmd = wrap(alien(true));
  out.salvage_0 = salvagePile(0); out.salvage_1 = salvagePile(1); out.salvage_empty = salvagePile(0, true);
  out.hatch = hatch();
  // Final mission art uses reference-based raster miniatures. Legacy SVGs stay available above.
  Object.assign(out, rasterArtSources());
  return out;
}
