/**
 * ダダサバイバーもどき SVGアート
 * 暗めの輪郭・セル塗り・細い目。絵本調のほほ紅や笑顔は使わない。
 * SVG文字列は起動時に一度だけ data URI 化し、以降は background-image として再利用する。
 */

const O = '#121418'; // 輪郭色
const S = `stroke="${O}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const S2 = `stroke="${O}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"`;
// 太さ指定つきの輪郭（S に stroke-width を足すと属性が重複して SVG が読めなくなる）
const SW = w => `stroke="${O}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

const wrap = (body, vb = '0 0 64 64') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;

// 白シルエット（ヒット時の点滅用）
const whiteOf = (body) => `<defs><filter id="wf"><feFlood flood-color="#fff"/><feComposite in2="SourceAlpha" operator="in"/></filter></defs><g filter="url(#wf)">${body}</g>`;

// 丸い部品にセル影をつける：外側を影色で塗り、左上にずらした本体色で覆う
function shadedCircle(id, cx, cy, r, fill, shade) {
  return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${shade}"/>
    <circle cx="${cx - r * 0.14}" cy="${cy - r * 0.16}" r="${r * 0.94}" fill="${fill}" clip-path="url(#${id})"/>
    <ellipse cx="${cx - r * 0.38}" cy="${cy - r * 0.46}" rx="${r * 0.22}" ry="${r * 0.1}" fill="#fff" opacity=".16" transform="rotate(-30 ${cx - r * 0.38} ${cy - r * 0.46})"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" ${S}/>`;
}

const animeEye = (x, y, iris = '#d6d3d1') => `
  <ellipse cx="${x}" cy="${y}" rx="3.6" ry="2.15" fill="#0c0e12"/>
  <ellipse cx="${x}" cy="${y}" rx="1.35" ry="2.05" fill="${iris}"/>
  <circle cx="${x + 0.45}" cy="${y - 0.55}" r=".65" fill="#fff"/>`;

/* ---------- プレイヤー（ちびアニマル。にんげんの ソルジャー は下の soldier） ---------- */
function hero({ fur, shade, inner, ear, muzzle, patches, belly, face = '', mouth, behind = '', extra = '' }) {
  let back = behind, front = '';
  if (ear === 'cat') back += `<path d="M15 20 L17 4 L29 13Z" fill="${fur}" ${S}/><path d="M18.5 16 L19.5 8.5 L25 13Z" fill="${inner}"/>
    <path d="M49 20 L47 4 L35 13Z" fill="${fur}" ${S}/><path d="M45.5 16 L44.5 8.5 L39 13Z" fill="${inner}"/>`;
  if (ear === 'fox') back += `<path d="M14 22 L12 0 L29 12Z" fill="${fur}" ${S}/><path d="M17 16 L16 6 L24 12Z" fill="${inner}"/>
    <path d="M50 22 L52 0 L35 12Z" fill="${fur}" ${S}/><path d="M47 16 L48 6 L40 12Z" fill="${inner}"/>`;
  if (ear === 'rabbit') back += `<ellipse cx="23" cy="7" rx="5.5" ry="14" fill="${fur}" ${S} transform="rotate(-10 23 7)"/><ellipse cx="23" cy="8" rx="2.6" ry="10" fill="${inner}" transform="rotate(-10 23 8)"/>
    <ellipse cx="41" cy="7" rx="5.5" ry="14" fill="${fur}" ${S} transform="rotate(10 41 7)"/><ellipse cx="41" cy="8" rx="2.6" ry="10" fill="${inner}" transform="rotate(10 41 8)"/>`;
  if (ear === 'bear') back += `<circle cx="16" cy="12" r="7" fill="${fur}" ${S}/><circle cx="16" cy="12" r="3.5" fill="${inner}"/><circle cx="48" cy="12" r="7" fill="${fur}" ${S}/><circle cx="48" cy="12" r="3.5" fill="${inner}"/>`;
  if (ear === 'panda') back += `<circle cx="16" cy="13" r="6.5" fill="${O}"/><circle cx="48" cy="13" r="6.5" fill="${O}"/>`;
  const patch = patches ? `<ellipse cx="24" cy="30" rx="6.5" ry="7.5" fill="${O}" transform="rotate(20 24 30)"/><ellipse cx="40" cy="30" rx="6.5" ry="7.5" fill="${O}" transform="rotate(-20 40 30)"/>` : '';
  const muz = mouth !== undefined ? mouth : muzzle
    ? `<ellipse cx="32" cy="36.2" rx="6.2" ry="3.8" fill="${muzzle}"/><path d="M30.4 35.2 H33.6 L32 37.1Z" fill="${O}"/><path d="M27.2 39.2 H36.8" fill="none" ${S2}/>`
    : `<ellipse cx="32" cy="36.2" rx="2.1" ry="1.4" fill="#1c1917"/><path d="M27.2 39.2 H36.8" fill="none" ${S2}/>`;
  const eyes = patches
    ? `${animeEye(24.5, 30.2, '#f5f5f4')}${animeEye(39.5, 30.2, '#f5f5f4')}`
    : `${animeEye(24.5, 29.6)}${animeEye(39.5, 29.6)}`;
  return `${back}
    <ellipse cx="22" cy="60" rx="5" ry="3.2" fill="${shade}" ${S}/><ellipse cx="42" cy="60" rx="5" ry="3.2" fill="${shade}" ${S}/>
    <ellipse cx="32" cy="52" rx="13" ry="10" fill="${fur}" ${S}/>
    <ellipse cx="32" cy="54" rx="7" ry="5.5" fill="${belly || muzzle || inner}" opacity=".9"/>
    <path d="M19 43 Q32 49 45 43 L45.2 47.2 Q32 52 18.8 47.2Z" fill="#1c1917" ${S2}/>
    <path d="M40 46.5 L46 55 L41 54Z" fill="#7f1d1d" ${S2}/>
    ${shadedCircle('hh', 32, 27, 19, fur, shade)}
    ${face}${front}${patch}${eyes}${muz}${extra}`;
}

/* ---------- ソルジャー（とくしゅぶたいの にんげん。いぬの わくを ひきつぐ） ---------- */
const soldier = `
  <ellipse cx="22" cy="60" rx="5" ry="3.2" fill="#18181b" ${S}/><ellipse cx="42" cy="60" rx="5" ry="3.2" fill="#18181b" ${S}/>
  <ellipse cx="32" cy="52" rx="13" ry="10" fill="#2a2d33" ${S}/>
  <path d="M22 45 Q32 48.5 42 45 L42.5 58 Q32 61 21.5 58Z" fill="#1b1d21" ${S2}/>
  <rect x="25" y="52" width="4.6" height="5" rx=".8" fill="#2f3238" ${S2}/><rect x="30" y="52" width="4.6" height="5" rx=".8" fill="#2f3238" ${S2}/><rect x="35" y="52" width="4.6" height="5" rx=".8" fill="#2f3238" ${S2}/>
  <rect x="17.6" y="43.6" width="7.6" height="5.2" rx=".6" fill="#f5f5f4" ${SW(1.4)}/><circle cx="21.4" cy="46.2" r="1.55" fill="#dc2626"/>
  <path d="M6 59 L56 43" ${SW(6.5)}/><path d="M6 59 L56 43" stroke="#26282d" stroke-width="3.6" stroke-linecap="round"/>
  <path d="M4 60 L13 57 L15 62.5 L6 64Z" fill="#26282d" ${S2}/>
  <path d="M27 52 L33 50 L35.5 55.5 L29.5 57.5Z" fill="#1b1d21" ${S2}/>
  <path d="M30 47.5 L40 44.3 L41 46.6 L31 49.8Z" fill="#3f4249" ${S2}/><circle cx="40.6" cy="44.8" r="1.1" fill="#ef4444"/>
  <path d="M55 42 L61.5 40" ${SW(3.6)}/><path d="M55 42 L61.5 40" stroke="#3f4249" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="21" cy="55" r="3.3" fill="#27272a" ${S2}/><circle cx="45" cy="47.5" r="3.3" fill="#27272a" ${S2}/>
  ${shadedCircle('hu', 32, 29, 16, '#f0c7a0', '#c48a5e')}
  <clipPath id="mk"><circle cx="32" cy="29" r="16"/></clipPath>
  <path d="M10 36 Q32 31 54 36 L54 48 L10 48Z" fill="#2a2d33" clip-path="url(#mk)"/>
  <path d="M16.5 36.6 Q32 31.6 47.5 36.6" fill="none" ${S2}/>
  <path d="M21 40 H43" fill="none" stroke="#1b1d21" stroke-width="1.3"/>
  <circle cx="32" cy="29" r="16" fill="none" ${S}/>
  <path d="M11 26 Q11 6 32 6 Q53 6 53 26 Q32 21 11 26Z" fill="#3a3d44" ${S}/>
  <path d="M17 13 Q20 10 25 9" fill="none" stroke="#5b5f68" stroke-width="2" stroke-linecap="round"/>
  <path d="M15 16 Q32 12 49 16" fill="none" stroke="#2a2d33" stroke-width="1.6"/>
  <rect x="27" y="6" width="10" height="5" rx="1.2" fill="#26282d" ${S2}/>
  <rect x="21" y="9.5" width="22" height="7" rx="3.2" fill="#1b1d21" ${S2}/>
  <circle cx="27" cy="13" r="2.3" fill="#3b82f6" opacity=".55"/><circle cx="37" cy="13" r="2.3" fill="#3b82f6" opacity=".55"/>
  <path d="M10 26.5 Q32 21 54 26.5 L53.5 29 Q32 24 10.5 29Z" fill="#26282d" ${S2}/>
  <rect x="9" y="25" width="6" height="10" rx="2.6" fill="#26282d" ${S2}/><rect x="49" y="25" width="6" height="10" rx="2.6" fill="#26282d" ${S2}/>
  <path d="M51.5 34 Q49 40 42 40" fill="none" stroke="#3f4249" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M21 30 L28.5 31.2 M43 30 L35.5 31.2" fill="none" ${SW(2)}/>
  ${animeEye(24.5, 33.2, '#93c5fd')}${animeEye(39.5, 33.2, '#93c5fd')}`;

// ぶたいの なかま（じぶんと おなじ とくしゅぶたい。ヘルメットと ラインが あおい）
const allySoldier = soldier
  .replace('<path d="M11 26 Q11 6 32 6 Q53 6 53 26 Q32 21 11 26Z" fill="#3a3d44"', '<path d="M11 26 Q11 6 32 6 Q53 6 53 26 Q32 21 11 26Z" fill="#2f4a73"')
  .replace('<path d="M15 16 Q32 12 49 16" fill="none" stroke="#2a2d33" stroke-width="1.6"/>', '<path d="M15 16 Q32 12 49 16" fill="none" stroke="#60a5fa" stroke-width="2.4"/>')
  + `<path d="M37 47 L43 45 L43.6 47.4 L37.6 49.4Z" fill="#3b82f6" ${SW(1)}/>`;
// ちりょうたい（しろい ヘルメットと ベスト、みどりの じゅうじ ＋ ハート。ほんものの あかじゅうじ は つかわない）
const greenPlus = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-2 -5.5 H2 V-2 H5.5 V2 H2 V5.5 H-2 V2 H-5.5 V-2 H-2Z" fill="#22c55e" stroke="#14532d" stroke-width="1" stroke-linejoin="round"/></g>`;
const medic = soldier.split('\n').filter(l => !/M6 59 L56 43|M4 60 L13 57|M27 52 L33 50|M30 47\.5 L40 44\.3|M55 42 L61\.5 40/.test(l)).join('\n')
  .replace('<path d="M22 45 Q32 48.5 42 45 L42.5 58 Q32 61 21.5 58Z" fill="#1b1d21"', '<path d="M22 45 Q32 48.5 42 45 L42.5 58 Q32 61 21.5 58Z" fill="#e8eef3"')
  .replace('<path d="M11 26 Q11 6 32 6 Q53 6 53 26 Q32 21 11 26Z" fill="#3a3d44"', '<path d="M11 26 Q11 6 32 6 Q53 6 53 26 Q32 21 11 26Z" fill="#e8eef3"')
  + `${greenPlus(32, 52, 0.9)}${greenPlus(32, 15, 0.7)}
  <rect x="43" y="47" width="14" height="11" rx="2" fill="#f8fafc" ${SW(1.6)}/><path d="M47 47 V45 H53 V47" fill="none" ${SW(1.4)}/>
  <path d="M50 49.5 Q48 48 47 49.6 Q46 51.6 50 54.6 Q54 51.6 53 49.6 Q52 48 50 49.5Z" fill="#22c55e" stroke="#14532d" stroke-width=".9"/>`;
// コンテナ（みかたの はたの マーク。しまって いる／ひらいた）
const crate = open => wrap(`
  <ellipse cx="60" cy="86" rx="56" ry="6" fill="#000" opacity=".2"/>
  <rect x="6" y="14" width="108" height="70" rx="4" fill="#4f6f94" ${SW(2.6)}/>
  ${Array.from({ length: 12 }, (_, i) => `<path d="M${14 + i * 8.6} 20 V78" stroke="#3f5c7d" stroke-width="2.6"/>`).join('')}
  <rect x="6" y="14" width="108" height="8" rx="3" fill="#6b8bb0" ${SW(2)}/><rect x="6" y="76" width="108" height="8" rx="3" fill="#3f5c7d" ${SW(2)}/>
  ${open ? `<rect x="30" y="24" width="60" height="52" fill="#141a22" ${SW(2)}/>
    <path d="M30 24 L12 18 V82 L30 76Z" fill="#6b8bb0" ${SW(2)}/><path d="M90 24 L108 18 V82 L90 76Z" fill="#6b8bb0" ${SW(2)}/>
    <path d="M36 70 H84" stroke="#2a3442" stroke-width="3"/>` : `
    <rect x="30" y="24" width="60" height="52" fill="#58799e" ${SW(2)}/><path d="M60 24 V76" ${SW(2)}/>
    <path d="M44 34 V66 M76 34 V66" stroke="#2d4157" stroke-width="3" stroke-linecap="round"/>
    <rect x="55" y="45" width="10" height="10" rx="2" fill="#facc15" ${SW(1.4)}/>
    <g transform="translate(60 33) scale(.42)">${heroEmblem}</g>`}
  <circle cx="16" cy="18" r="2.4" fill="${open ? '#22c55e' : '#f59e0b'}" ${SW(1)}/>`, '0 0 120 92');
// ふえ（HUD の ボタン）と、ちりょうの みどりの ＋
const whistle = wrap(`<path d="M14 18 Q8 30 18 36" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/>
  <path d="M16 26 H44 Q56 26 56 38 Q56 50 44 50 Q32 50 32 40 V36 H16Z" fill="#facc15" ${S}/><rect x="10" y="22" width="12" height="10" rx="2" fill="#e5e7eb" ${S}/>
  <circle cx="44" cy="38" r="5" fill="#a16207" ${SW(1.6)}/><path d="M24 30 H30" stroke="#a16207" stroke-width="2" stroke-linecap="round"/>
  <path d="M50 14 L54 8 M57 20 L63 17 M42 12 L42 5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`);
const healPlus = wrap(`<circle cx="32" cy="32" r="22" fill="#fff" ${S}/>${greenPlus(32, 32, 2.6)}`);

const whiskers = `<path d="M10 33 L18 34 M10 38 L18 37 M54 33 L46 34 M54 38 L46 37" ${S2} fill="none"/>`;

/* ---------- わるものぐんだんの ワッペン（オリジナル：ドクロ＋クロスした ナイフ。ちは なし） ---------- */
const villainPatch = (x, y, k = 1) => `<g data-emblem="warumono" transform="translate(${x} ${y}) scale(${k})">
  <rect x="-5.2" y="-4.2" width="10.4" height="8.4" rx="1.2" fill="#2a0a0e" ${SW(1.3)}/>
  <path d="M-4 3.3 L-1.6 1.2 L3.9 -3.4 L1.2 -.8 Z M4 3.3 L1.6 1.2 L-3.9 -3.4 L-1.2 -.8 Z" fill="#e2e8f0" stroke="#e2e8f0" stroke-width=".5" stroke-linejoin="round"/>
  <path d="M-4.1 3.4 L-2.6 2.1 M4.1 3.4 L2.6 2.1" stroke="#b91c1c" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="0" cy="-.3" r="1.85" fill="#f5f5f4" stroke="#2a0a0e" stroke-width=".5"/><rect x="-1.05" y="1" width="2.1" height="1.3" rx=".35" fill="#f5f5f4" stroke="#2a0a0e" stroke-width=".4"/>
  <circle cx="-.7" cy="-.4" r=".55" fill="#2a0a0e"/><circle cx=".7" cy="-.4" r=".55" fill="#2a0a0e"/></g>`;
// てきごとの ワッペンの いち（むねの かた より。プレイヤーの にほんの はたと おなじ がわ）
const PATCH_AT = {
  zombie: [21, 46], bat: [21, 46], ghost: [21, 46], skull: [16, 47], scorpion: [21, 46], mummy: [21, 46],
  snowman: [21, 46], wolf: [26, 47], pumpkin: [21, 45.5], thrower: [21, 46],
  ogre: [24, 48], dragon: [32, 31, 1.1], snake: [24, 45], icegiant: [21, 50], witch: [26, 47], maou: [22, 50],
};
const withPatch = (k, body) => body + villainPatch(...PATCH_AT[k]);

/* ---------- わるものぐんだん（てき。ぜんいん にんげんの わるものへいたい／ぐんようけん。みぎむき） ---------- */
// ザコ: zombie=ライフルへい bat=ていさつへい ghost=スナイパー skull=じゅうそうこうへい scorpion=ナイフへい
//       mummy=ばくはへい snowman=ゆきのへい wolf=ぐんようけん pumpkin=かえんほうしゃへい
// ボス: ogre=おおぐんそう dragon=せんしゃたいちょう snake=メカアーマー icegiant=ゆきやまたいちょう
//       witch=かげの たいちょう maou=だいそうすい（わるものぐんだんの いちばん えらい ひと）
// id・すうちは むかしの モンスターの まま（セーブと バランスを かえない）。プレイヤー（くろい そうび）と まちがえないよう、
// ちゃいろ・あか・はいいろ の せいふくと あかい め。
const VE = '#f87171'; // わるものの め
const VSKIN = '#e3b48c', VSKIN2 = '#a9744f';
const vglove = (x, y, c = '#2b2420') => `<circle cx="${x}" cy="${y}" r="3.3" fill="${c}" ${S2}/>`;
const vRifle = ({ end = [56, 43], metal = '#3a3a3f', stock = '#5c3d24', glove = '#2b2420', scope = false }) => `
  <path d="M6 59 L${end[0]} ${end[1]}" ${SW(6.5)}/><path d="M6 59 L${end[0]} ${end[1]}" stroke="${metal}" stroke-width="3.6" stroke-linecap="round"/>
  <path d="M4 60 L13 57 L15 62.5 L6 64Z" fill="${stock}" ${S2}/>
  <path d="M27 52 L33 50 L35.5 55.5 L29.5 57.5Z" fill="${metal}" ${S2}/>
  ${scope ? `<path d="M28 47.6 L42 43.2 L43 46 L29 50.4Z" fill="#27272a" ${S2}/><circle cx="43" cy="44.6" r="1.7" fill="${VE}" ${SW(1)}/>` : ''}
  ${vglove(21, 55, glove)}${vglove(45, 47.5, glove)}`;
const vHelmet = (c, band = '#991b1b', hi = '#7a6a4c') => `
  <path d="M11 26 Q11 6 32 6 Q53 6 53 26 Q32 21 11 26Z" fill="${c}" ${S}/>
  <path d="M12 21.5 Q32 16 52 21.5 L52.4 24.6 Q32 19.4 11.6 24.6Z" fill="${band}"/>
  <path d="M17 13 Q20 10 25 9" fill="none" stroke="${hi}" stroke-width="2" stroke-linecap="round"/>
  <path d="M10 26.5 Q32 21 54 26.5 L53.5 29 Q32 24 10.5 29Z" fill="${c}" ${S2}/>`;
const vVest = (c) => `<path d="M22 45 Q32 48.5 42 45 L42.5 58 Q32 61 21.5 58Z" fill="${c}" ${S2}/>`;
// したの かおを かくす マスク（clip で あたまの まるに あわせる）
const vMask = (id, c, top = 37.5) => `<clipPath id="${id}"><circle cx="32" cy="29" r="15.5"/></clipPath>
  <path d="M10 ${top} Q32 ${top - 3.7} 54 ${top} V48 H10Z" fill="${c}" clip-path="url(#${id})"/>
  <path d="M17 ${top + 0.4} Q32 ${top - 3.3} 47 ${top + 0.4}" fill="none" ${S2}/><circle cx="32" cy="29" r="15.5" fill="none" ${S}/>`;

function trooper({ uni, dark, back = '', vest = '', gun = '', hat = '', face, brows = true, eyes = true, extra = '', feet = '#1c1917', bodyR = 13 }) {
  const mouth = face ?? `<path d="M28.6 40.6 Q32 38.9 35.4 40.6" fill="none" ${S2}/>`;
  return `${back}
  <ellipse cx="22" cy="60" rx="5" ry="3.2" fill="${feet}" ${S}/><ellipse cx="42" cy="60" rx="5" ry="3.2" fill="${feet}" ${S}/>
  <ellipse cx="32" cy="52" rx="${bodyR}" ry="10" fill="${uni}" ${S}/>
  <path d="M${33.5 - bodyR} 55.5 Q32 60.5 ${30.5 + bodyR} 55.5" fill="none" stroke="${dark}" stroke-width="2.4"/>
  ${vest}${gun}
  ${shadedCircle('vh', 32, 29, 15.5, VSKIN, VSKIN2)}
  ${hat}
  ${brows ? `<path d="M20.5 28.4 L28.6 31.6 M43.5 28.4 L35.4 31.6" fill="none" ${SW(2.2)}/>` : ''}
  ${eyes ? animeEye(24.6, 33.6, VE) + animeEye(39.4, 33.6, VE) : ''}
  ${mouth}${extra}`;
}

// ライフルへい（くさはら・まおうじょうの ふつうの へいたい）
const zombie = trooper({ uni: '#5b4a32', dark: '#3b2f20', vest: vVest('#3f3524'),
  gun: vRifle({ glove: '#3b2f25' }), hat: vHelmet('#5a4c34') });

// ていさつへい（はやい・ちいさい）
const bat = trooper({ uni: '#6b5d45', dark: '#463b2a',
  back: `<path d="M2 40 H9 M0 46 H7 M3 52 H9" stroke="#e7e5e4" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
    <path d="M17 23 L8 18 L10 24Z M17 24.5 L8 28 L13 29.5Z" fill="#b91c1c" ${S2}/>`,
  vest: `<path d="M22 43 Q32 47 42 43 L41 46.5 Q32 50.5 23 46.5Z" fill="#b91c1c" ${S2}/>`,
  gun: `<path d="M30 53 L47 47.5" ${SW(6)}/><path d="M30 53 L47 47.5" stroke="#3a3a3f" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M35.5 51.5 L37.5 57.5 L40.5 56.5 L39 50.5Z" fill="#27272a" ${S2}/>${vglove(31, 53.5)}${vglove(44, 48.5)}`,
  hat: `<path d="M16.5 26 Q15 10 32 10 Q49 10 47.5 26 L44 20 L40 24 L36 18 L32 23 L28 18 L24 24 L20 20Z" fill="#2a1d14" ${S}/>
    <path d="M16.6 22 Q32 16 47.4 22 L47.6 26 Q32 20 16.4 26Z" fill="#b91c1c" ${S2}/>
    <rect x="21" y="16.5" width="22" height="6" rx="3" fill="#27272a" ${S2}/>
    <circle cx="27" cy="19.5" r="1.9" fill="#fbbf24" opacity=".85"/><circle cx="37" cy="19.5" r="1.9" fill="#fbbf24" opacity=".85"/>` });

// スナイパー（ギリースーツ。もりに かくれる）
const ghillie = '#4a5a3a';
const ghost = trooper({ uni: '#3d4a35', dark: '#27301f',
  back: `<path d="M12 30 Q8 50 14 60 L18 56 L21 61 L25 57 L29 62 L33 57 L37 62 L41 57 L45 61 L48 56 L52 60 Q58 50 52 30Z" fill="${ghillie}" ${S}/>`,
  gun: vRifle({ end: [63, 40.8], metal: '#2f3a25', stock: '#3d4a35', glove: '#27301f', scope: true }),
  hat: `<path d="M16 14 L12 10 M24 9 L22 4 M34 8 L35 3 M44 11 L48 7 M50 20 L55 18 M14 24 L9 23" ${SW(4.6)}/>
    <path d="M16 14 L12 10 M24 9 L22 4 M34 8 L35 3 M44 11 L48 7 M50 20 L55 18 M14 24 L9 23" stroke="${ghillie}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M14 34 Q10 8 32 8 Q54 8 50 34 L47 28 L46 22 Q32 17 18 22 L17 28Z" fill="${ghillie}" ${S}/>
    <ellipse cx="24" cy="13" rx="3" ry="1.6" fill="#5f7046"/><ellipse cx="40" cy="12" rx="3.4" ry="1.6" fill="#2f3a25"/><ellipse cx="46" cy="19" rx="2.2" ry="1.3" fill="#5f7046"/>`,
  extra: `<path d="M19 37.5 L25.5 36.5 M38.5 36.5 L45 37.5" stroke="#2f3a25" stroke-width="2.2" stroke-linecap="round"/>` });

// じゅうそうこうへい（かたい。かおは バイザーで かくれる）
const skull = trooper({ uni: '#4b4f57', dark: '#2c2f35', bodyR: 15, brows: false, eyes: false, face: '',
  vest: `<path d="M19 45 Q32 49 45 45 L46 58 Q32 62 18 58Z" fill="#5f646d" ${S}/><path d="M22 51 H42 M22 55 H42" stroke="#3a3d44" stroke-width="1.6"/>
    <ellipse cx="16" cy="47" rx="6" ry="5" fill="#5f646d" ${S}/><ellipse cx="48" cy="47" rx="6" ry="5" fill="#5f646d" ${S}/>`,
  gun: `${vRifle({ metal: '#2c2c30', stock: '#3a3d44', glove: '#1f2125' })}<rect x="30" y="53" width="8" height="7" rx="1" fill="#3f3524" ${S2}/>`,
  hat: `<path d="M15 33 Q13 9 32 9 Q51 9 49 33 Q49 44.5 32 45 Q15 44.5 15 33Z" fill="#5f646d" ${S}/>
    <path d="M19 15 Q22 12 27 11" fill="none" stroke="#8a8f99" stroke-width="2" stroke-linecap="round"/>
    <path d="M18 27 Q32 23 46 27 L45.5 35 Q32 32 18.5 35Z" fill="#111317" ${S2}/>
    <path d="M21.5 30.4 Q32 27.6 42.5 30.4" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <path d="M27 39 H37 M28 41.6 H36" stroke="#2c2f35" stroke-width="1.5" stroke-linecap="round"/>` });

// ナイフへい（さばく。すなよけの フードと あかい マスク）
const scorpion = trooper({ uni: '#a8865a', dark: '#7a5f3c', face: vMask('km', '#7f1d1d'),
  vest: `<path d="M24 44.5 L40 58 M40 44.5 L24 58" stroke="#6b5233" stroke-width="2.4"/>`,
  gun: `<path d="M45 48.5 L58 40.5 L56.5 45 Z" fill="#e2e8f0" ${S2}/>${vglove(45, 49.5, '#4a3826')}
    <path d="M20 57 L13 63 L17.5 62.5Z" fill="#e2e8f0" ${S2}/>${vglove(21, 55.5, '#4a3826')}`,
  hat: `<path d="M14 32 Q11 9 32 9 Q53 9 50 32 L47 26 Q32 19 17 26Z" fill="#c9a874" ${S}/>
    <path d="M16.5 21.5 Q32 15 47.5 21.5" fill="none" stroke="#a8865a" stroke-width="1.7"/>
    <path d="M14 30 Q9 40 13 46 L16 38Z" fill="#c9a874" ${S2}/>` });

// ばくはへい（ばくだん もち。ゆっくり）
const mummy = trooper({ uni: '#6b6a4a', dark: '#45442f',
  vest: `<path d="M42 44 L24 59" ${SW(5.5)}/><path d="M42 44 L24 59" stroke="#5c3d24" stroke-width="3" stroke-linecap="round"/>
    <rect x="27" y="53" width="3" height="6" rx=".8" fill="#dc2626" ${SW(1)}/><rect x="31" y="53.5" width="3" height="6" rx=".8" fill="#dc2626" ${SW(1)}/><rect x="35" y="53" width="3" height="6" rx=".8" fill="#dc2626" ${SW(1)}/>`,
  gun: `<rect x="40" y="44" width="9" height="7" rx="1.2" fill="#3a3a3f" ${S2}/><path d="M47 44 L49 38.5" fill="none" ${S2}/><circle cx="49.2" cy="38.2" r="1.4" fill="#ef4444"/>${vglove(41, 50.5)}
    <circle cx="16" cy="55" r="4.8" fill="#27272a" ${S}/><rect x="14.6" y="48.4" width="2.8" height="2.4" fill="#57534e" ${SW(1)}/><circle cx="14.6" cy="53.4" r="1" fill="#fff" opacity=".35"/>`,
  hat: `<path d="M15 26 Q14 9 32 9 Q50 9 49 26 Z" fill="#7f1d1d" ${S}/>
    <path d="M14.5 22.5 Q32 18.5 49.5 22.5 L49.6 26.5 Q32 22.5 14.4 26.5Z" fill="#991b1b" ${S2}/>
    <rect x="10.5" y="25" width="6" height="10" rx="2.6" fill="#ca8a04" ${S2}/><rect x="47.5" y="25" width="6" height="10" rx="2.6" fill="#ca8a04" ${S2}/>` });

// ばくだんなげへい（けんきゅうじょ。あたまの うえに ばくだんを かかげて なげる。はいいろの せいふくと あかい ヘルメット）
const thrower = trooper({ uni: '#5b5560', dark: '#3d3842',
  vest: `${vVest('#45404a')}<rect x="26" y="52" width="3" height="6" rx=".8" fill="#dc2626" ${SW(1)}/><rect x="30.5" y="52.5" width="3" height="6" rx=".8" fill="#dc2626" ${SW(1)}/>`,
  gun: `${vglove(21, 55.5)}
    <path d="M45 46 L49 30" ${SW(5.4)}/><path d="M45 46 L49 30" stroke="#5b5560" stroke-width="3" stroke-linecap="round"/>
    <circle cx="51" cy="21" r="7.4" fill="#27272a" ${S}/><circle cx="48.6" cy="18.6" r="2" fill="#fff" opacity=".35"/>
    <rect x="49" y="11.6" width="4.2" height="3.4" rx=".8" fill="#78716c" ${SW(1.1)}/>
    <path d="M51 11.6 Q53 7 57 6.5" fill="none" stroke="#a16207" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M57 6.5 L59.5 3.2 L58.6 6.8 L62 6 L58.2 8.4Z" fill="#fde047" stroke="#ea580c" stroke-width=".8" stroke-linejoin="round"/>
    ${vglove(49, 29)}`,
  hat: vHelmet('#7f1d1d', '#450a0a', '#b45353') });

// ボトルから でた うちゅうじん（てき。かわいいけど ちょっと ぶきみ。みどりの しずくを たらす。ワッペンなし）
const alienFoe = `
  <ellipse cx="32" cy="61" rx="13" ry="2.6" fill="#000" opacity=".22"/>
  <path d="M25 50 Q22 57 19 61 M39 50 Q42 57 45 61" fill="none" ${SW(5)}/><path d="M25 50 Q22 57 19 61 M39 50 Q42 57 45 61" fill="none" stroke="#7fae96" stroke-width="2.8" stroke-linecap="round"/>
  <path d="M22 44 Q12 40 8 30 M42 44 Q52 40 56 30" fill="none" ${SW(5)}/><path d="M22 44 Q12 40 8 30 M42 44 Q52 40 56 30" fill="none" stroke="#7fae96" stroke-width="2.8" stroke-linecap="round"/>
  <path d="M6 28 L4 24 M8 27.5 L8.5 23 M10 29 L12 25.5 M58 28 L60 24 M56 27.5 L55.5 23 M54 29 L52 25.5" stroke="#5b8a73" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M22 44 Q32 58 42 44 Q41 37 32 37 Q23 37 22 44Z" fill="#a7c4b5" ${S}/>
  <path d="M32 3 Q53 3 54 21 Q54 36 32 41 Q10 36 10 21 Q11 3 32 3Z" fill="#b8d6c6" ${S}/>
  <path d="M17 15 Q22 7 32 6" fill="none" stroke="#e7f5ee" stroke-width="2.2" stroke-linecap="round" opacity=".75"/>
  <path d="M13 21 Q22 16 28 24 Q25 31 17 29 Q12 27 13 21Z" fill="#0b1210"/>
  <path d="M51 21 Q42 16 36 24 Q39 31 47 29 Q52 27 51 21Z" fill="#0b1210"/>
  <circle cx="18" cy="22" r="1.7" fill="#bbf7d0"/><circle cx="46" cy="22" r="1.7" fill="#bbf7d0"/>
  <path d="M28 35 Q32 37 36 35" fill="none" stroke="#3d5a4b" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M20 36 Q19 40 20.5 42 Q22 40 20 36Z M44 37 Q43 41 44.5 43 Q46 41 44 37Z" fill="#4ade80" stroke="#166534" stroke-width=".9"/>`;

// てきの ばくだん（なげられて とぶ。あかい しるし つき）／ひ（ゆかで もえる まんがの ほのお）／ガラスの はへん
const ebomb = wrap(`<circle cx="32" cy="36" r="16" fill="#27272a" ${S}/><circle cx="26" cy="30" r="4.5" fill="#fff" opacity=".3"/>
  <path d="M24 36 H40 M32 28 V44" stroke="#dc2626" stroke-width="3.4" stroke-linecap="round"/>
  <rect x="28" y="16" width="8" height="6" rx="1.4" fill="#78716c" ${SW(1.6)}/>
  <path d="M32 16 Q34 9 40 8" fill="none" stroke="#a16207" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M40 8 L44 2 L43 8 L49 7 L43 11Z" fill="#fde047" stroke="#ea580c" stroke-width="1.2" stroke-linejoin="round"/>`);
const flame = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="M0 0 Q-11 -2 -9 -14 Q-7 -22 -1 -30 Q0 -22 5 -19 Q4 -26 9 -30 Q14 -18 10 -6 Q8 0 0 0Z" fill="#f97316" stroke="#9a3412" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M0 -2 Q-6 -3 -5 -11 Q-3 -16 0 -20 Q2 -14 5 -12 Q7 -6 4 -3 Q2 -1 0 -2Z" fill="#fde047"/></g>`;
const fire = wrap(`<ellipse cx="50" cy="56" rx="46" ry="40" fill="#7c2d12" opacity=".22"/><ellipse cx="50" cy="56" rx="34" ry="28" fill="#ea580c" opacity=".22"/>
  ${flame(30, 52, 0.9)}${flame(68, 50, 0.95)}${flame(48, 40, 1.1)}${flame(22, 74, 0.75)}${flame(76, 76, 0.8)}${flame(50, 82, 0.9)}${flame(50, 62, 1.15)}`, '0 0 100 100');
const glassShards = wrap(`<g fill="#dbeafe" stroke="#60a5fa" stroke-width="1.6" stroke-linejoin="round">
  <path d="M50 8 L56 20 L46 22Z"/><path d="M84 30 L92 38 L80 42Z"/><path d="M86 70 L78 84 L74 72Z"/><path d="M50 92 L42 80 L54 80Z"/>
  <path d="M14 72 L24 76 L16 86Z"/><path d="M10 30 L22 34 L12 42Z"/><path d="M30 14 L36 24 L26 22Z"/><path d="M70 14 L74 26 L64 22Z"/></g>
  <g fill="#86efac" opacity=".75"><circle cx="34" cy="56" r="5"/><circle cx="64" cy="60" r="6"/><circle cx="50" cy="44" r="4"/><circle cx="60" cy="38" r="3"/></g>`, '0 0 100 100');

// ゆきのへい（ゆきやま。しろい パーカーと ゴーグル）
const snowman = trooper({ uni: '#d4d4d8', dark: '#9ca3af', feet: '#3f3f46', bodyR: 14, brows: false, eyes: false,
  back: `<circle cx="32" cy="28" r="19.5" fill="#d4d4d8" ${S}/>`,
  vest: `${vVest('#a1a1aa')}<ellipse cx="27" cy="52" rx="2.6" ry="1.5" fill="#d4d4d8"/><ellipse cx="37" cy="56" rx="2.4" ry="1.4" fill="#71717a"/>`,
  gun: vRifle({ metal: '#52525b', stock: '#71717a', glove: '#3f3f46' }),
  hat: `<circle cx="32" cy="29" r="15.6" fill="none" stroke="#a8a29e" stroke-width="4.4"/><circle cx="32" cy="29" r="18" fill="none" ${S2}/>
    <rect x="19" y="28.5" width="26" height="9" rx="4.5" fill="#1f2937" ${S2}/>
    <ellipse cx="25.5" cy="33" rx="4" ry="2.7" fill="#ef4444"/><ellipse cx="38.5" cy="33" rx="4" ry="2.7" fill="#ef4444"/>
    <path d="M23.5 31.8 L25.5 31 M36.5 31.8 L38.5 31" stroke="#fff" stroke-width="1" stroke-linecap="round"/>` });

// ぐんようけん（はやい。ベストを きた いぬ）
const wolf = `
  <path d="M14 44 Q2 40 4 31 Q8 38 15 40" fill="#5b4632" ${S}/>
  <path d="M18 54 L17 61 M26 55 L26 61 M38 55 L38 61 M46 54 L47 61" ${SW(5.4)}/>
  <path d="M18 54 L17 61 M26 55 L26 61 M38 55 L38 61 M46 54 L47 61" stroke="#4a3a28" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="32" cy="48" rx="17" ry="9.5" fill="#6b5338" ${S}/>
  <ellipse cx="32" cy="53" rx="10" ry="3.6" fill="#a08566" opacity=".8"/>
  <path d="M19 41 Q31 37 42 41 L43 55 Q31 58 19 55Z" fill="#7f1d1d" ${S2}/>
  <path d="M27 40 Q30 34.5 33 39.5" fill="none" ${SW(2)}/>
  <path d="M39 24 L38 11 L46.5 20.5Z M47 20 L52 9 L54.5 22.5Z" fill="#5b4632" ${S}/>
  <path d="M40.5 21.5 L40 15 L44 19.5Z M48.5 19.5 L51.5 13.5 L52.5 20.5Z" fill="#3a2c1e"/>
  ${shadedCircle('dh', 46, 31, 11, '#7a5f40', '#4a3a28')}
  <path d="M50 29 Q60 29 62.5 34.5 Q60.5 40 51 39Z" fill="#a08566" ${S}/>
  <ellipse cx="61.3" cy="33.6" rx="2" ry="1.6" fill="${O}"/>
  <path d="M53 37.6 H58.5" fill="none" ${S2}/><path d="M55 37.6 L55.8 39.4 L56.6 37.6" fill="#fff" stroke="${O}" stroke-width=".8"/>
  <path d="M41.5 25.6 L49.5 28.4" fill="none" ${SW(2.2)}/>
  <ellipse cx="46.4" cy="30.6" rx="2.9" ry="1.8" fill="#0c0e12"/><ellipse cx="46.9" cy="30.6" rx="1.05" ry="1.6" fill="${VE}"/>
  <path d="M37.5 36 Q43 42.5 50.5 39.5" fill="none" stroke="#111" stroke-width="3"/>
  <circle cx="44" cy="41" r="1.4" fill="#d6a548" ${SW(.8)}/>`;

// かえんほうしゃへい（ガスマスク。さきっぽに ちいさな ほのお）
const pumpkin = trooper({ uni: '#4a3f35', dark: '#2f2822', brows: false, eyes: false,
  back: `<rect x="11" y="34" width="8" height="19" rx="4" fill="#9a3412" ${S}/><rect x="45" y="34" width="8" height="19" rx="4" fill="#9a3412" ${S}/>
    <path d="M13 37 V50" stroke="#c2410c" stroke-width="1.6" stroke-linecap="round"/>`,
  vest: vVest('#352d26'),
  gun: `<path d="M15 52 Q14 61 24 58.5" fill="none" ${SW(2.4)}/>
    <path d="M22 57.5 L52 46.5" ${SW(5.6)}/><path d="M22 57.5 L52 46.5" stroke="#57534e" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M51.5 44.4 L55 43.2 L56 46.6 L52.5 47.8Z" fill="#27272a" ${S2}/>
    <path d="M56.5 44.6 Q60 40.8 63 43.6 Q60 44.8 63 46.8 Q59.5 49 56.8 46.8Z" fill="#fb923c"/><path d="M57.2 45.2 Q59.5 43.8 61 45.4 Q59.5 46.5 57.2 46.4Z" fill="#fde68a"/>
    ${vglove(25, 56.5)}${vglove(44, 49.5)}`,
  hat: `${vHelmet('#3a332c', '#7f1d1d', '#5a5048')}
    <path d="M19 30.5 Q32 26.5 45 30.5 L44 40 Q38 46.2 32 46.2 Q26 46.2 20 40Z" fill="#2a2724" ${S}/>
    <circle cx="25.6" cy="34" r="3.7" fill="#fb923c" ${S2}/><circle cx="38.4" cy="34" r="3.7" fill="#fb923c" ${S2}/>
    <path d="M24 32.6 L25.8 31.8 M36.8 32.6 L38.6 31.8" stroke="#fff" stroke-width="1" stroke-linecap="round"/>
    <circle cx="32" cy="42.4" r="3.6" fill="#57534e" ${S2}/><path d="M30 42.4 H34 M32 40.4 V44.4" stroke="#2a2724" stroke-width=".9"/>`,
  face: '' });

/* ---------- わるものぐんだんの ボス ---------- */
// おおぐんそう（ちからもち）
const ogre = `
  <ellipse cx="20" cy="60.5" rx="7" ry="3.6" fill="#1c1917" ${S}/><ellipse cx="44" cy="60.5" rx="7" ry="3.6" fill="#1c1917" ${S}/>
  <path d="M15 42 Q5 50 9 58 M49 42 Q59 50 55 58" fill="none" ${SW(10.5)}/>
  <path d="M15 42 Q5 50 9 58 M49 42 Q59 50 55 58" fill="none" stroke="#c98d63" stroke-width="7.4" stroke-linecap="round"/>
  <path d="M12 44 Q32 34 52 44 L50 62 L14 62Z" fill="#5b4a32" ${S}/>
  <path d="M18 44 Q32 39 46 44 L45 61 L19 61Z" fill="#7f1d1d" ${S2}/>
  <path d="M19 55 H45" stroke="#3b2f20" stroke-width="3"/><rect x="29" y="53" width="6" height="4.4" rx="1" fill="#d6a548" ${S2}/>
  <path d="M28 40.5 L32 46.4 L36 40.5" fill="none" stroke="#a1a1aa" stroke-width="1"/><rect x="30.6" y="46.2" width="2.8" height="3.6" rx=".6" fill="#d4d4d8" ${SW(.8)}/>
  <circle cx="9" cy="58.5" r="5" fill="#3b2f25" ${S}/><circle cx="55" cy="58.5" r="5" fill="#3b2f25" ${S}/>
  ${shadedCircle('og', 32, 25, 15, '#d9a27a', '#a06b45')}
  <path d="M20.5 32 Q32 42 43.5 32 Q42 38.6 32 40 Q22 38.6 20.5 32Z" fill="#7a5a40" opacity=".4"/>
  <path d="M15 19.5 Q14 7 30 7 Q48 6 50.5 15 Q48.5 19 46 20.5 Q32 14.5 15 19.5Z" fill="#991b1b" ${S}/>
  <circle cx="22" cy="14.4" r="2.1" fill="#d6a548" ${S2}/>
  <path d="M18.5 21.6 L29 25.4 M45.5 21.6 L35 25.4" fill="none" ${SW(3.4)}/>
  ${animeEye(24.5, 27.8, VE)}${animeEye(39.5, 27.8, VE)}
  <path d="M26 33.4 H38 L37 36.8 H27Z" fill="#f5f5f4" ${S2}/><path d="M30 33.4 V36.8 M34 33.4 V36.8" stroke="${O}" stroke-width=".9"/>`;

// せんしゃたいちょう（せんしゃに のった たいちょう）
const dragon = `
  <rect x="4" y="46" width="56" height="14" rx="7" fill="#27272a" ${S}/>
  ${[11, 21.5, 32, 42.5, 53].map(x => `<circle cx="${x}" cy="53" r="4" fill="#52525b" ${S2}/><circle cx="${x}" cy="53" r="1.3" fill="#27272a"/>`).join('')}
  <path d="M6 46 L12 35.5 L54 35.5 L60 46Z" fill="#6b3a2e" ${S}/>
  <path d="M8.5 43.5 H57.5" stroke="#4a261d" stroke-width="2.5"/>
  <path d="M40 25 L44 6" stroke="${O}" stroke-width="1.4"/><circle cx="44" cy="6" r="1.4" fill="#ef4444"/>
  <path d="M44 30 L62 26.8" ${SW(6.4)}/><path d="M44 30 L62 26.8" stroke="#52525b" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M18 36 Q18 24 32 24 Q46 24 46 36Z" fill="#7c4436" ${S}/>
  <path d="M21 31 Q24 27 29 26" fill="none" stroke="#9a5a48" stroke-width="1.8" stroke-linecap="round"/>
  ${shadedCircle('tk', 29, 16, 9, VSKIN, VSKIN2)}
  <path d="M20 12.5 Q20.5 3 29.5 3 Q38.5 3 38.5 10.5Z" fill="#7f1d1d" ${S}/>
  <path d="M19 12.6 L39.5 10.4 L40.4 13 L19.2 15Z" fill="#1c1917" ${S2}/>
  <path d="M24 16.2 L28.6 17.6 M37.6 15.6 L33.4 17.4" fill="none" ${SW(1.8)}/>
  <ellipse cx="27" cy="19.6" rx="2.4" ry="1.6" fill="#0c0e12"/><ellipse cx="27.3" cy="19.6" rx=".9" ry="1.5" fill="${VE}"/>
  <ellipse cx="35" cy="19.4" rx="2.4" ry="1.6" fill="#0c0e12"/><ellipse cx="35.3" cy="19.4" rx=".9" ry="1.5" fill="${VE}"/>
  <ellipse cx="29" cy="24.4" rx="10" ry="2.8" fill="#3f3f46" ${S2}/>`;

// メカアーマー（さばくの ロボットスーツ。なかに パイロット）
const snake = `
  <path d="M22 50 L18 60 M42 50 L46 60" ${SW(8)}/><path d="M22 50 L18 60 M42 50 L46 60" stroke="#8a7350" stroke-width="5" stroke-linecap="round"/>
  <rect x="10" y="58" width="14" height="5" rx="1.5" fill="#57534e" ${S2}/><rect x="40" y="58" width="14" height="5" rx="1.5" fill="#57534e" ${S2}/>
  <rect x="17" y="12" width="6" height="10" rx="1" fill="#57534e" ${S2}/><rect x="41" y="12" width="6" height="10" rx="1" fill="#57534e" ${S2}/>
  <path d="M10 27 L2 33 L4 46 L12 44Z" fill="#8a7350" ${S}/>
  <path d="M14 21 L50 21 L54 34 L48 52 L16 52 L10 34Z" fill="#a08356" ${S}/>
  <path d="M12 39 L52 39" stroke="#7f1d1d" stroke-width="3.2"/>
  <clipPath id="mc"><path d="M21 25 L43 25 L45 36 L19 36Z"/></clipPath>
  <path d="M21 25 L43 25 L45 36 L19 36Z" fill="#1e293b"/>
  <g clip-path="url(#mc)"><circle cx="32" cy="33" r="6" fill="${VSKIN}"/><path d="M25.6 31 Q32 22 38.4 31Z" fill="#7f1d1d"/>
    <circle cx="29.6" cy="32.6" r="1.1" fill="${VE}"/><circle cx="34.6" cy="32.6" r="1.1" fill="${VE}"/>
    <path d="M21 25 L28 25 L22 36 L19 36Z" fill="#fff" opacity=".18"/></g>
  <path d="M21 25 L43 25 L45 36 L19 36Z" fill="none" ${S2}/>
  <circle cx="18" cy="45.5" r="1.4" fill="#ef4444"/><circle cx="46" cy="45.5" r="1.4" fill="#ef4444"/>
  <rect x="47" y="29" width="15" height="9.5" rx="2" fill="#57534e" ${S}/>
  <path d="M59.5 31 H64 M59.5 33.8 H64 M59.5 36.6 H64" stroke="${O}" stroke-width="1.7" stroke-linecap="round"/>`;

// ゆきやまたいちょう（しろい コートの おおきな たいちょう。かたに ロケットランチャー）
const icegiant = `
  <circle cx="32" cy="26" r="20" fill="#e5e7eb" ${S}/>
  <path d="M30 20 L60 9" ${SW(10)}/><path d="M30 20 L60 9" stroke="#4b5563" stroke-width="7" stroke-linecap="round"/>
  <path d="M57 6.5 L62.5 4.5 L65 11.5 L59.5 13.5Z" fill="#374151" ${S2}/>
  <ellipse cx="20" cy="61.5" rx="7" ry="3.5" fill="#374151" ${S}/><ellipse cx="44" cy="61.5" rx="7" ry="3.5" fill="#374151" ${S}/>
  <ellipse cx="10.5" cy="52" rx="5.5" ry="8" fill="#e5e7eb" ${S}/><ellipse cx="53.5" cy="52" rx="5.5" ry="8" fill="#e5e7eb" ${S}/>
  <path d="M10 44 Q32 34 54 44 L52 63 L12 63Z" fill="#e5e7eb" ${S}/>
  <ellipse cx="40" cy="53" rx="3.4" ry="2" fill="#9ca3af"/><ellipse cx="24" cy="58" rx="3" ry="1.7" fill="#9ca3af"/>
  <path d="M32 46 V63" stroke="#9ca3af" stroke-width="1.6"/><path d="M13 56 H51" stroke="#374151" stroke-width="3"/>
  <path d="M16 42 Q32 50 48 42 Q46 47.5 32 51 Q18 47.5 16 42Z" fill="#a8a29e" ${S2}/>
  <circle cx="10.5" cy="59" r="4" fill="#374151" ${S2}/><circle cx="53.5" cy="59" r="4" fill="#374151" ${S2}/>
  ${shadedCircle('ig', 32, 26.5, 15, VSKIN, VSKIN2)}
  <circle cx="32" cy="26.5" r="15.2" fill="none" stroke="#a8a29e" stroke-width="4.6"/><circle cx="32" cy="26.5" r="17.8" fill="none" ${S2}/>
  <rect x="18" y="20.5" width="28" height="9.5" rx="4.7" fill="#1f2937" ${S2}/>
  <ellipse cx="25" cy="25.2" rx="4.6" ry="3" fill="#ef4444"/><ellipse cx="39" cy="25.2" rx="4.6" ry="3" fill="#ef4444"/>
  <path d="M22.6 24 L25 23 M36.6 24 L39 23" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/>
  <path d="M23.5 34 Q27.5 31 32 33.4 Q36.5 31 40.5 34 Q36.5 36.2 32 35.2 Q27.5 36.2 23.5 34Z" fill="#6b7280" ${S2}/>`;

// かげの たいちょう（はやい。フードと マントと けん）
const witch = `
  <path d="M16 30 Q-2 40 -5 63 Q10 58 20 62 L34 40Z" fill="#4c1d95" ${S}/>
  <path d="M14 36 Q2 46 0 60 Q8 56 14 58Z" fill="#2e1065"/>
  <ellipse cx="22" cy="60.5" rx="5" ry="3.2" fill="#1c1917" ${S}/><ellipse cx="42" cy="60.5" rx="5" ry="3.2" fill="#1c1917" ${S}/>
  <path d="M18 61 Q18 42 32 40 Q46 42 46 61Z" fill="#3b1d4a" ${S}/>
  <path d="M19 52 Q32 56 45 52 L45 55 Q32 59 19 55Z" fill="#991b1b" ${S2}/>
  <path d="M48.5 45.5 Q61 35 66 21 Q58.5 33.5 46.5 43.5Z" fill="#cbd5e1" ${S2}/>
  <path d="M43.5 49.5 L50 43.6" ${SW(3.6)}/><path d="M43 44.5 L49.5 49" ${SW(2.4)}/>
  ${vglove(46.5, 47, '#1c1917')}
  <path d="M24 12 L32 1 L40 12Z" fill="#3b1d4a" ${S2}/>
  ${shadedCircle('wh', 32, 27, 16, '#3b1d4a', '#2a1238')}
  <ellipse cx="33" cy="30" rx="11" ry="10" fill="${VSKIN}" ${S2}/>
  <path d="M22.2 33 Q33 30 43.8 33 Q43.6 40.4 33 40.6 Q22.4 40.4 22.2 33Z" fill="#1c1917" ${S2}/>
  <path d="M23 24.6 L30 27.4 M43 24.6 L36 27.4" fill="none" ${SW(2)}/>
  ${animeEye(27.6, 29.4, '#c084fc')}${animeEye(38.4, 29.4, '#c084fc')}`;

// だいそうすい（わるものぐんだんの いちばん えらい ひと。ぼうしにも ワッペン）
const maou = `
  <path d="M8 26 Q2 48 6 64 L58 64 Q62 48 56 26 Q44 34 32 34 Q20 34 8 26Z" fill="#1c1917" ${S}/>
  <path d="M10 30 Q6 46 9 62 L14 62 Q12 46 16 34Z" fill="#991b1b"/>
  <path d="M16 42 Q32 35 48 42 L49 64 L15 64Z" fill="#7f1d1d" ${S}/>
  <path d="M32 39 V64" stroke="#5c1414" stroke-width="1.6"/>
  <circle cx="35" cy="47" r="1.3" fill="#facc15"/><circle cx="35" cy="52.5" r="1.3" fill="#facc15"/><circle cx="35" cy="58" r="1.3" fill="#facc15"/>
  <path d="M46 42.5 L18 63" stroke="#facc15" stroke-width="2.4"/>
  <path d="M40 45 H45 V48 H40Z" fill="#facc15" ${SW(.8)}/><path d="M40 49.5 H45 V52.5 H40Z" fill="#a1a1aa" ${SW(.8)}/>
  <path d="M11 42 Q15 36.5 22 39.5 L21 44 Q16 43 11 46.5Z M53 42 Q49 36.5 42 39.5 L43 44 Q48 43 53 46.5Z" fill="#facc15" ${S2}/>
  ${shadedCircle('mh', 32, 24, 14, '#d9b08c', '#9f7350')}
  <path d="M11 14 Q13 0 32 -1 Q51 0 53 14 Q32 9 11 14Z" fill="#7f1d1d" ${S}/>
  <path d="M14 12.6 Q32 8.6 50 12.6 L50 16.2 Q32 12.2 14 16.2Z" fill="#1c1917" ${S2}/>
  <path d="M14.5 16.2 Q32 12 49.5 16.2 Q46.5 21.4 32 19.8 Q17.5 21.4 14.5 16.2Z" fill="#111" ${S2}/>
  <path d="M16.5 15.6 Q32 12.2 47.5 15.6" stroke="#facc15" stroke-width="1.2" fill="none"/>
  ${villainPatch(32, 5.5, 0.85)}
  <path d="M20.5 21.8 L29 24.8 M43.5 21.8 L35 24.8" fill="none" ${SW(2.8)}/>
  ${animeEye(25.5, 27, VE)}${animeEye(38.5, 27, VE)}
  <circle cx="38.6" cy="27" r="4.5" fill="none" stroke="#facc15" stroke-width="1.2"/><path d="M42.6 29 Q45 33 43 37" fill="none" stroke="#facc15" stroke-width=".8"/>
  <path d="M23 32.4 Q27 29.4 32 31.9 Q37 29.4 41 32.4 Q38 34.4 32 33.4 Q26 34.4 23 32.4Z" fill="#292524" ${S2}/>
  <path d="M29 35.6 Q32 36.6 35 35.2" fill="none" ${S2}/>`;

/* ---------- けんきゅうしゃ（みかたの NPC。しろい はくい・めがね・クリップボード） ---------- */
const researcher = `
  <ellipse cx="23" cy="60.5" rx="4.6" ry="3" fill="#44403c" ${S}/><ellipse cx="41" cy="60.5" rx="4.6" ry="3" fill="#44403c" ${S}/>
  <path d="M18 61 Q17 44 32 41 Q47 44 46 61Z" fill="#f1f5f9" ${S}/>
  <path d="M39 43.6 Q46 47 46 61 L40.5 61 Q41 50 39 43.6Z" fill="#cbd5e1"/>
  <path d="M32 50 V61" stroke="#94a3b8" stroke-width="1.4"/>
  <path d="M27.4 42 L32 50 L36.6 42Z" fill="#60a5fa" ${S2}/>
  <rect x="37" y="48" width="5.4" height="4.4" rx=".6" fill="#e2e8f0" ${S2}/>
  <path d="M38.6 48 V45.2 M40.8 48 V45.6" stroke-width="1.3" stroke-linecap="round" stroke="#ef4444"/>
  <rect x="15.5" y="46" width="10" height="12.5" rx="1.2" fill="#a16207" ${S2}/><rect x="17" y="48.4" width="7" height="8.6" fill="#f8fafc"/>
  <path d="M18.2 50.6 H22.8 M18.2 52.8 H22.8 M18.2 55 H21.4" stroke="#64748b" stroke-width=".9"/>
  <rect x="18.6" y="45" width="3.8" height="2.2" rx=".6" fill="#71717a" ${SW(.8)}/>
  <circle cx="24" cy="56.5" r="3" fill="#f0c7a0" ${S2}/>
  ${shadedCircle('rs', 32, 27, 15, '#f0c7a0', '#c48a5e')}
  <path d="M16.8 26 Q14 9 31 9.5 Q30 6.5 34 7.5 Q49 9 47.4 26 Q46 20 43 17.5 L41 21 L38 15.5 L34 19.5 L30 14.5 L26 19.5 L22.5 15.5 L20 21 Q18 22 16.8 26Z" fill="#78716c" ${S}/>
  <path d="M21 13.5 Q25 11 30 11" fill="none" stroke="#a8a29e" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M20.6 25.2 Q24.4 23.4 28 25 M43.4 25.2 Q39.6 23.4 36 25" fill="none" ${SW(1.8)}/>
  <circle cx="25" cy="30.4" r="4.6" fill="#e0f2fe" opacity=".55"/><circle cx="39" cy="30.4" r="4.6" fill="#e0f2fe" opacity=".55"/>
  <ellipse cx="25" cy="30.6" rx="1.7" ry="2.1" fill="#0c0e12"/><ellipse cx="39" cy="30.6" rx="1.7" ry="2.1" fill="#0c0e12"/>
  <circle cx="25.6" cy="29.8" r=".6" fill="#fff"/><circle cx="39.6" cy="29.8" r=".6" fill="#fff"/>
  <circle cx="25" cy="30.4" r="4.6" fill="none" ${SW(1.5)}/><circle cx="39" cy="30.4" r="4.6" fill="none" ${SW(1.5)}/>
  <path d="M29.6 30 Q32 28.8 34.4 30 M20.4 29.6 L17 28.4 M43.6 29.6 L47 28.4" fill="none" ${SW(1.3)}/>
  <ellipse cx="32" cy="37.6" rx="1.8" ry="1.3" fill="#3f1d1d"/>`;

/* ---------- ぶき・アイテム ---------- */
const gem = (fill, shade) => `
  <path d="M32 8 L50 30 L32 56 L14 30Z" fill="${shade}"/>
  <path d="M32 8 L44 30 L32 50 L20 30Z" fill="${fill}"/>
  <path d="M32 8 L38 26 L26 26Z" fill="#fff" opacity=".6"/>
  <path d="M32 8 L50 30 L32 56 L14 30Z" fill="none" ${S}/>`;

const coin = `${shadedCircle('ch', 32, 32, 22, '#fde047', '#eab308')}
  <circle cx="32" cy="32" r="14" fill="none" stroke="#ca8a04" stroke-width="2.5"/>
  <path d="M32 21 L35 29 L43 29 L36.5 34 L39 42 L32 37 L25 42 L27.5 34 L21 29 L29 29Z" fill="#fef9c3" ${S2}/>`;

const meat = `
  <path d="M40 40 L54 54" stroke="${O}" stroke-width="9" stroke-linecap="round"/>
  <path d="M40 40 L54 54" stroke="#fff7ed" stroke-width="5" stroke-linecap="round"/>
  <circle cx="54" cy="50" r="5" fill="#fff7ed" ${S}/><circle cx="50" cy="56" r="5" fill="#fff7ed" ${S}/>
  <ellipse cx="28" cy="28" rx="20" ry="17" fill="#9a3412" ${S} transform="rotate(-35 28 28)"/>
  <ellipse cx="25" cy="25" rx="15" ry="11" fill="#c2410c" transform="rotate(-35 25 25)"/>
  <ellipse cx="20" cy="20" rx="5" ry="2.5" fill="#fff" opacity=".5" transform="rotate(-35 20 20)"/>`;

const magnet = `
  <path d="M14 14 L14 34 A18 18 0 0 0 50 34 L50 14 L38 14 L38 34 A6 6 0 0 1 26 34 L26 14Z" fill="#ef4444" ${S}/>
  <path d="M14 14 L26 14 L26 24 L14 24Z M38 14 L50 14 L50 24 L38 24Z" fill="#e2e8f0" ${S}/>
  <path d="M18 36 A14 14 0 0 0 24 46" fill="none" stroke="#fff" stroke-width="2.5" opacity=".6" stroke-linecap="round"/>`;

const bomb = `
  <path d="M40 18 Q46 8 54 10" fill="none" ${S}/>
  <path d="M54 4 L56 10 L62 10 L57 13 L59 19 L54 15 L49 19 L51 13 L46 10 L52 10Z" fill="#fde047" stroke="#f97316" stroke-width="1.5"/>
  <rect x="33" y="16" width="10" height="8" rx="2" fill="#64748b" ${S2} transform="rotate(35 38 20)"/>
  ${shadedCircle('mh', 30, 38, 19, '#475569', '#1e293b')}`;

const kunai = wrap(`
  <path d="M60 32 L34 23 L34 41Z" fill="#e2e8f0" ${S}/>
  <path d="M60 32 L34 27 L34 32Z" fill="#fff"/>
  <rect x="14" y="28" width="20" height="8" rx="2" fill="#3f3f46" ${S2}/>
  <circle cx="10" cy="32" r="5" fill="none" ${S}/>`);

const star = `
  <path d="M32 4 L38 24 L60 26 L42 38 L50 58 L32 46 L14 58 L22 38 L4 26 L26 24Z" fill="#a8a29e" ${S}/>
  <path d="M32 12 L36 26 L32 42 L22 28Z" fill="#e7e5e4"/>
  <path d="M32 4 L38 24 L32 20Z" fill="#f5f5f4"/>`;

const bolt = wrap(`<path d="M22 0 L42 0 L30 34 L46 34 L14 100 L22 50 L8 50Z" fill="#fde047" ${S}/><path d="M24 4 L36 4 L26 30 L20 30Z" fill="#fff" opacity=".7"/>`, '0 0 54 100');

/* ---------- じゅう・ショットガン・バズーカ（右向き。金属） ---------- */
const bullet = wrap(`
  <path d="M6 32 H16" stroke="#a8a29e" stroke-width="2" stroke-linecap="round"/>
  <rect x="16" y="27" width="22" height="10" rx="1" fill="#d6a84a" ${S}/>
  <rect x="18" y="29" width="14" height="3" fill="#f5e6b8"/>
  <path d="M38 26 H52 L56 32 L52 38 H38Z" fill="#9ca3af" ${S}/>
  <path d="M40 29 H48 L50 32 L48 35 H40Z" fill="#e5e7eb"/>`);

const pellet = wrap(`
  <ellipse cx="36" cy="32" rx="11" ry="6" fill="#6b7280" ${S}/>
  <ellipse cx="34" cy="30.5" rx="6" ry="2.2" fill="#d1d5db" opacity=".7"/>
  <path d="M46 32 L54 32" stroke="#4b5563" stroke-width="2" stroke-linecap="round"/>`);

const gun = wrap(`
  <path d="M20 36 L26 34 L30 56 L16 58Z" fill="#3f2a1d" ${S}/>
  <path d="M21 42 H27 L29 52 H20Z" fill="#6b4423"/>
  <path d="M10 24 H40 Q46 24 46 30 V34 Q46 40 40 40 H14 Q10 40 10 34Z" fill="#3f3f46" ${S}/>
  <path d="M14 27 H32 V31 H14Z" fill="#6b7280"/>
  <rect x="28" y="26" width="10" height="12" rx="1" fill="#27272a" ${S2}/>
  <circle cx="31" cy="32" r="1.3" fill="#a1a1aa"/><circle cx="35" cy="32" r="1.3" fill="#a1a1aa"/>
  <rect x="44" y="28" width="14" height="6" fill="#52525b" ${S2}/>
  <rect x="56" y="29" width="4" height="4" fill="#18181b"/>`);

const shotgun = wrap(`
  <path d="M8 34 L18 30 L24 54 L10 56Z" fill="#3f2a1d" ${S}/>
  <path d="M16 32 H36 V44 H18Z" fill="#44403c" ${S}/>
  <rect x="20" y="35" width="12" height="3" fill="#78716c"/>
  <rect x="34" y="26" width="22" height="5" fill="#27272a" ${S2}/>
  <rect x="34" y="35" width="22" height="5" fill="#27272a" ${S2}/>
  <path d="M34 31 H54" stroke="#a1a1aa" stroke-width="1"/>
  <rect x="54" y="25" width="4" height="7" fill="#18181b"/>
  <rect x="54" y="34" width="4" height="7" fill="#18181b"/>`);

const bazooka = wrap(`
  <path d="M22 44 H30 L32 56 H20Z" fill="#3f3f46" ${S2}/>
  <rect x="6" y="26" width="42" height="14" rx="2" fill="#3f4a32" ${S}/>
  <rect x="10" y="29" width="28" height="4" fill="#6b7a52"/>
  <rect x="30" y="26" width="6" height="14" fill="#7f1d1d"/>
  <path d="M46 22 H58 V44 H46Z" fill="#27272a" ${S}/>
  <rect x="50" y="30" width="5" height="8" fill="#18181b"/>
  <path d="M18 22 H28 V26 H18Z" fill="#1c1917" ${S2}/>`);

const rocket = wrap(`
  <path d="M14 32 L4 25 L9 32 L4 39Z" fill="#f97316" ${S2}/>
  <path d="M16 32 L9 28 L13 32 L9 36Z" fill="#fde68a"/>
  <rect x="14" y="26" width="24" height="12" fill="#4b5563" ${S}/>
  <rect x="26" y="26" width="5" height="12" fill="#991b1b"/>
  <path d="M38 24 L58 32 L38 40Z" fill="#d6d3d1" ${S}/>
  <path d="M16 26 L8 16 L24 26Z" fill="#27272a" ${S2}/>
  <path d="M16 38 L8 48 L24 38Z" fill="#27272a" ${S2}/>`);

const mega = wrap(`
  <path d="M16 32 L3 22 L10 32 L3 42Z" fill="#ea580c" ${S2}/>
  <path d="M18 32 L8 26 L14 32 L8 38Z" fill="#fde68a"/>
  <rect x="14" y="22" width="22" height="20" fill="#3f3f46" ${S}/>
  <rect x="24" y="22" width="6" height="20" fill="#b45309"/>
  <path d="M36 16 L60 32 L36 48Z" fill="#a8a29e" ${S}/>
  <path d="M18 22 L6 6 L30 22Z" fill="#18181b" ${S2}/>
  <path d="M18 42 L6 58 L30 42Z" fill="#18181b" ${S2}/>
  <path d="M20 30 H30" stroke="#e5e7eb" stroke-width="1.4"/>`);

// スーパーミサイル（けんきゅうしゃの とっておき。しろ＋あおの からだ、きんいろの さき、あおい ほのお）
const smissile = wrap(`
  <path d="M13 32 L0 21 L6 32 L0 43Z" fill="#38bdf8" ${S2}/>
  <path d="M15 32 L5 26.5 L10 32 L5 37.5Z" fill="#e0f2fe"/>
  <path d="M15 23 L4 7 L27 23Z" fill="#1d4ed8" ${S2}/><path d="M15 41 L4 57 L27 41Z" fill="#1d4ed8" ${S2}/>
  <rect x="12" y="22.5" width="31" height="19" rx="3" fill="#e5e7eb" ${S}/>
  <path d="M14 37 H41" stroke="#a1a1aa" stroke-width="2"/>
  <rect x="20" y="22.5" width="4.4" height="19" fill="#0ea5e9"/><rect x="27" y="22.5" width="2.2" height="19" fill="#0ea5e9"/>
  <path d="M43 22.5 Q59 25 63.5 32 Q59 39 43 41.5Z" fill="#facc15" ${S}/>
  <path d="M46 26 Q55 27.5 59 31" fill="none" stroke="#fef9c3" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="36" cy="30" r="2.7" fill="#38bdf8" ${S2}/>`);

const miniGun = (x, y) => `
  <g transform="translate(${x} ${y})">
    <path d="M6 12 L10 11 L12 24 L4 25Z" fill="#3f2a1d" ${S}/>
    <path d="M4 5 H22 Q26 5 26 9 V12 Q26 16 22 16 H6 Q4 16 4 13Z" fill="#3f3f46" ${S}/>
    <rect x="24" y="7" width="8" height="5" fill="#27272a" ${S2}/>
  </g>`;
const dual = wrap(`${miniGun(2, 4)}${miniGun(18, 30)}`);

const gatling = wrap(`
  <path d="M8 24 H34 V42 H12 Q8 42 8 38Z" fill="#3f3f46" ${S}/>
  <rect x="14" y="28" width="12" height="8" fill="#27272a"/>
  <rect x="32" y="20" width="26" height="4" fill="#18181b" ${S2}/>
  <rect x="32" y="28" width="28" height="4" fill="#18181b" ${S2}/>
  <rect x="32" y="36" width="26" height="4" fill="#18181b" ${S2}/>
  <rect x="32" y="44" width="24" height="4" fill="#18181b" ${S2}/>
  <circle cx="18" cy="33" r="5" fill="#52525b" ${S2}/>
  <circle cx="18" cy="33" r="1.6" fill="#a1a1aa"/>`);

const blast = wrap(`
  <path d="M32 2 L37 20 L56 12 L42 28 L62 32 L42 38 L54 52 L36 42 L32 62 L26 42 L8 54 L22 36 L2 32 L22 26 L10 12 L28 20Z" fill="#c2410c" ${S}/>
  <path d="M32 12 L35 24 L46 20 L38 30 L48 34 L36 36 L42 46 L32 40 L24 48 L28 36 L16 34 L26 28 L18 18 L30 24Z" fill="#f59e0b"/>
  <circle cx="32" cy="32" r="6" fill="#fef3c7"/>`);

/* ---------- そうび・たからばこ ---------- */
const sword = `
  <path d="M46 6 L58 6 L58 18 L28 46 L18 36Z" fill="#e2e8f0" ${S}/>
  <path d="M50 10 L54 10 L26 40 L24 38Z" fill="#fff"/>
  <path d="M12 32 L32 52" ${SW(9)}/><path d="M12 32 L32 52" stroke="#facc15" stroke-width="5" stroke-linecap="round"/>
  <path d="M18 46 L8 56" ${SW(9)}/><path d="M18 46 L8 56" stroke="#7c3aed" stroke-width="5" stroke-linecap="round"/>
  <circle cx="7" cy="57" r="4" fill="#facc15" ${S2}/>`;
const armor = `
  <path d="M14 14 Q22 8 26 12 Q32 16 38 12 Q42 8 50 14 L56 24 L48 28 L48 54 Q32 60 16 54 L16 28 L8 24Z" fill="#94a3b8" ${S}/>
  <path d="M20 26 Q32 32 44 26 L44 50 Q32 55 20 50Z" fill="#cbd5e1"/>
  <path d="M32 18 L32 54" stroke="#64748b" stroke-width="2"/>
  <path d="M26 30 L38 30 L32 40Z" fill="#facc15" ${S2}/>
  <ellipse cx="22" cy="20" rx="4" ry="2" fill="#fff" opacity=".6" transform="rotate(-20 22 20)"/>`;
const shoes = `
  <path d="M10 22 L28 22 L30 34 Q44 34 54 42 Q58 48 52 52 L12 52 Q8 50 8 44Z" fill="#ef4444" ${S}/>
  <path d="M8 46 L56 46 Q58 50 52 54 L12 54 Q8 52 8 46Z" fill="#fff" ${S2}/>
  <path d="M18 30 L28 28 M18 36 L30 34" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M38 38 L46 44" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="16" cy="26" rx="4" ry="2" fill="#fff" opacity=".5"/>`;
const charm = `
  <path d="M26 10 Q32 2 38 10" fill="none" ${S}/><path d="M26 10 Q32 2 38 10" fill="none" stroke="#facc15" stroke-width="1.6"/>
  <path d="M16 18 Q32 10 48 18 L46 54 Q32 60 18 54Z" fill="#ef4444" ${S}/>
  <path d="M18 22 Q32 16 46 22" fill="none" stroke="#facc15" stroke-width="3"/>
  <rect x="25" y="28" width="14" height="20" rx="2" fill="#fef3c7" ${S2}/>
  <path d="M29 33 L35 33 M29 38 L35 38 M29 43 L35 43" stroke="#b91c1c" stroke-width="1.8"/>
  <ellipse cx="22" cy="26" rx="2.4" ry="4" fill="#fff" opacity=".4"/>`;
const chestBody = `
  <path d="M8 30 L56 30 L54 56 L10 56Z" fill="#b45309" ${S}/>
  <path d="M12 34 L52 34 L50 52 L14 52Z" fill="#d97706"/>
  <path d="M8 30 L56 30 L56 36 L8 36Z" fill="#facc15" ${S2}/>
  <path d="M30 26 L34 26 L34 56 L30 56Z" fill="#facc15" ${S2}/>`;
const chest = `${chestBody}
  <path d="M8 30 Q8 12 32 12 Q56 12 56 30Z" fill="#d97706" ${S}/>
  <path d="M30 12 L34 12 L34 30 L30 30Z" fill="#facc15" ${S2}/>
  <rect x="27" y="26" width="10" height="10" rx="2" fill="#fde047" ${S2}/><circle cx="32" cy="31" r="1.6" fill="${O}"/>
  <ellipse cx="18" cy="20" rx="5" ry="2.4" fill="#fff" opacity=".45" transform="rotate(-20 18 20)"/>`;
const chestOpen = `
  <path d="M14 30 L32 2 L50 30" fill="#fef08a" opacity=".55"/>
  <path d="M8 30 Q6 10 20 6 L56 22 Q58 26 56 30Z" fill="#d97706" ${S}/>
  ${chestBody}
  <circle cx="22" cy="24" r="3" fill="#fde047"/><circle cx="40" cy="20" r="2.4" fill="#fff"/><circle cx="32" cy="14" r="2" fill="#fde047"/>`;

/* ---------- じめん ---------- */
const flower = (x, y, c) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-4" rx="2.6" ry="3.6" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="2.2" fill="#facc15"/></g>`;
const tuft = (x, y, c = '#4d9a3a') => `<path d="M${x - 5} ${y} Q${x - 4} ${y - 7} ${x - 1} ${y - 9} M${x} ${y} Q${x} ${y - 8} ${x + 1} ${y - 12} M${x + 5} ${y} Q${x + 4} ${y - 6} ${x + 2} ${y - 9}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`;
const pebble = (x, y, fill = '#cbd5e1', line = '#64748b') => `<ellipse cx="${x}" cy="${y}" rx="6" ry="4" fill="${fill}" stroke="${line}" stroke-width="1.5"/><ellipse cx="${x - 1.5}" cy="${y - 1.5}" rx="2.4" ry="1.2" fill="#fff" opacity=".7"/>`;
const blobs = (light, dark) => `
  <ellipse cx="40" cy="44" rx="34" ry="22" fill="${light}"/><ellipse cx="124" cy="118" rx="40" ry="24" fill="${light}"/>
  <ellipse cx="128" cy="30" rx="18" ry="10" fill="${dark}"/><ellipse cx="34" cy="128" rx="22" ry="12" fill="${dark}"/>`;
const tile = body => wrap(body, '0 0 160 160');
const cactus = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-3 0 L-3 -18 Q0 -22 3 -18 L3 0Z M3 -10 L8 -10 L8 -15 M-3 -7 L-8 -7 L-8 -13" fill="#3f6212" stroke="#1a2e05" stroke-width="2" stroke-linejoin="round"/></g>`;
const pine = (x, y) => `<g transform="translate(${x} ${y})"><path d="M0 -20 L9 -4 L-9 -4Z M0 -13 L11 2 L-11 2Z" fill="#15803d" stroke="#14532d" stroke-width="1.6" stroke-linejoin="round"/><path d="M0 -20 L4 -12 L-4 -12Z" fill="#fff"/><rect x="-2" y="2" width="4" height="4" fill="#78350f"/></g>`;
const shroom = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-2" y="-4" width="4" height="7" rx="1.5" fill="#fef3c7" stroke="#3b2a1a" stroke-width="1.2"/><path d="M-7 -4 Q0 -14 7 -4Z" fill="#dc2626" stroke="#3b2a1a" stroke-width="1.2"/><circle cx="-2" cy="-7" r="1.2" fill="#fff"/><circle cx="2.5" cy="-6" r="1" fill="#fff"/></g>`;

// くさはら：わるものぐんだんに あらされた あと（クレーター・こげた くさ・こわれた さく・こわれた いえ・たおれた はた）。
// 320px タイル（ほかの じめんは 160px）。てきや ほうせきが めだつよう、くらく ひくい コントラストに おさえる。
const crater = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <ellipse cx="0" cy="0" rx="26" ry="15" fill="#4a3f30"/><ellipse cx="0" cy="1.5" rx="19" ry="10" fill="#2a241c"/>
  <ellipse cx="2" cy="3" rx="11" ry="5.5" fill="#1f1b15"/><path d="M-22 -6 Q-10 -15 8 -14" fill="none" stroke="#6b5a42" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="24" cy="6" r="2.4" fill="#5a4c3a"/><circle cx="-25" cy="7" r="1.8" fill="#5a4c3a"/><circle cx="16" cy="-14" r="1.6" fill="#5a4c3a"/></g>`;
const scorch = (x, y, s = 1, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">
  <path d="M-30 0 Q-28 -14 -10 -16 Q4 -24 18 -14 Q34 -10 30 4 Q32 16 12 16 Q-2 22 -16 14 Q-34 12 -30 0Z" fill="#2b2a22" opacity=".85"/>
  <path d="M-18 0 Q-14 -8 0 -8 Q14 -10 18 0 Q16 8 0 8 Q-16 8 -18 0Z" fill="#1d1c17" opacity=".8"/>
  <circle cx="-6" cy="-2" r="1.3" fill="#9ca3af" opacity=".35"/><circle cx="8" cy="3" r="1" fill="#9ca3af" opacity=".35"/></g>`;
const fence = (x, y, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r})" stroke="#1a140e" stroke-width="1.6" stroke-linejoin="round">
  <rect x="-1.8" y="-14" width="5" height="18" fill="#5c4127"/><rect x="26" y="-8" width="5" height="12" fill="#5c4127"/>
  <path d="M2 -10 L27 -7 L27 -3.6 L2 -6.6Z M2 -2 L18 0 L16 3.4 L2 1.4Z" fill="#6b4a2a"/>
  <path d="M34 2 L48 6 L47 9 L33 5Z" fill="#4a3420"/><rect x="50" y="-4" width="5" height="9" fill="#4a3420" transform="rotate(28 52 0)"/></g>`;
const ruin = (x, y) => `<g transform="translate(${x} ${y})" stroke="#1a1716" stroke-width="1.8" stroke-linejoin="round">
  <path d="M0 0 V-30 L8 -36 L14 -28 L22 -40 L30 -31 L38 -34 L44 -22 V0Z" fill="#57514b"/>
  <path d="M0 -8 H44 M0 -16 H44 M0 -24 H40 M10 0 V-8 M24 0 V-8 M36 0 V-8 M16 -8 V-16 M30 -8 V-16 M6 -16 V-24 M22 -16 V-24 M34 -16 V-24" stroke="#45403b" stroke-width="1.1" fill="none"/>
  <path d="M14 -6 V-20 Q20 -26 26 -20 V-6Z" fill="#1c1917"/>
  <path d="M2 -30 Q16 -38 30 -31 L30 -22 Q14 -26 2 -20Z" fill="#1c1917" stroke="none" opacity=".55"/>
  <path d="M44 0 L58 -10 L64 0Z" fill="#3a2a1c"/><path d="M48 -2 L60 -12 M52 0 L62 -6" stroke="#2b1f14" stroke-width="2.4"/></g>`;
const smoke = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#9ca3af" opacity=".16">
  <circle cx="0" cy="0" r="7"/><circle cx="6" cy="-9" r="8"/><circle cx="1" cy="-20" r="9"/><circle cx="9" cy="-31" r="7"/></g>`;
const debris = (x, y) => `<g transform="translate(${x} ${y})" stroke="#1a1716" stroke-width="1.1">
  <path d="M0 0 L9 -2 L10 1 L1 3Z" fill="#5c4127"/><path d="M12 6 L16 3 L19 7 L14 9Z" fill="#6b6560"/><path d="M-6 6 L-2 4 L0 8 L-5 9Z" fill="#6b6560"/></g>`;
const fallenFlag = (x, y) => `<g transform="translate(${x} ${y}) rotate(-18)">
  <path d="M0 0 H46" stroke="#1a1716" stroke-width="4" stroke-linecap="round"/><path d="M0 0 H46" stroke="#6b7280" stroke-width="2" stroke-linecap="round"/>
  <path d="M44 -2 Q52 -10 64 -4 Q72 0 80 -4 L78 14 Q70 18 62 14 Q52 10 44 16Z" fill="#5a1414" stroke="#1a1716" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M50 2 L58 9 M58 2 L50 9" stroke="#a8a29e" stroke-width="1.4" stroke-linecap="round"/>
  <circle cx="54" cy="4.6" r="2.6" fill="#a8a29e"/><circle cx="53" cy="4.4" r=".7" fill="#5a1414"/><circle cx="55" cy="4.4" r=".7" fill="#5a1414"/></g>`;
const ruinedGrass = wrap(`<rect width="320" height="320" fill="#36472f"/>
  <ellipse cx="60" cy="50" rx="50" ry="26" fill="#3d5034"/><ellipse cx="250" cy="230" rx="60" ry="30" fill="#3d5034"/>
  <ellipse cx="240" cy="60" rx="40" ry="20" fill="#2e3d28"/><ellipse cx="70" cy="270" rx="46" ry="22" fill="#2e3d28"/>
  ${scorch(210, 120, 1.3, 15)}${scorch(60, 190, 1, -20)}${scorch(290, 300, 0.8, 40)}
  ${crater(110, 120)}${crater(250, 270, 0.8)}${crater(40, 40, 0.6)}
  ${tuft(20, 80, '#24321e')}${tuft(150, 30, '#24321e')}${tuft(300, 160, '#1c2818')}${tuft(180, 300, '#24321e')}${tuft(90, 230, '#1c2818')}${tuft(280, 20, '#24321e')}
  ${ruin(150, 220)}${fence(220, 180, -6)}${fence(10, 150, 12)}
  ${fallenFlag(30, 300)}
  ${debris(200, 60)}${debris(70, 100)}${debris(260, 200)}${debris(120, 290)}${debris(300, 110)}
  ${pebble(170, 160, '#6b6458', '#3f3a34')}${pebble(40, 240, '#6b6458', '#3f3a34')}
  ${smoke(176, 196, 1.2)}${smoke(118, 108, 0.8)}${smoke(232, 112, 0.9)}`, '0 0 320 320');

// けんきゅうじょ：みかたの きれいな じっけんしつ（しろい ゆかパネル・うすい みずいろの ライン）。
// わるものぐんだんに おそわれた あとは すこしだけ（ひび・はへん・うすい こげ 1つ）。たって いるのは みかたの はた。
// 320px タイル。まぶしく ないよう まっしろ では なく #e8eef3。てき・ほうせきは くろい りんかくで めだつ。
const labPanels = () => {
  let s = '';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const x = i * 80, y = j * 80, alt = (i + j) % 2;
    s += `<rect x="${x + 1}" y="${y + 1}" width="78" height="78" rx="3" fill="${alt ? '#e2e9ef' : '#e8eef3'}"/>`;
    s += `<circle cx="${x + 7}" cy="${y + 7}" r="1.4" fill="#c3cfd9"/><circle cx="${x + 73}" cy="${y + 7}" r="1.4" fill="#c3cfd9"/><circle cx="${x + 7}" cy="${y + 73}" r="1.4" fill="#c3cfd9"/><circle cx="${x + 73}" cy="${y + 73}" r="1.4" fill="#c3cfd9"/>`;
  }
  return s;
};
const hazard = (x, y, w, h, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r})"><clipPath id="hz${x}${y}"><rect width="${w}" height="${h}"/></clipPath>
  <rect width="${w}" height="${h}" fill="#f2d675"/><g clip-path="url(#hz${x}${y})" stroke="#9aa6b2" stroke-width="4">
  ${Array.from({ length: Math.ceil((w + h) / 12) }, (_, k) => `<path d="M${k * 12 - h} ${h + 2} L${k * 12 + 2} -2"/>`).join('')}</g></g>`;
const grate = (x, y) => `<g transform="translate(${x} ${y})"><rect width="44" height="30" rx="2" fill="#c9d4dd" stroke="#aebcc8" stroke-width="2"/>
  <path d="M6 5 V25 M13 5 V25 M20 5 V25 M27 5 V25 M34 5 V25" stroke="#a3b2bf" stroke-width="2.4"/></g>`;
const cable = (d, c = '#aab8c4', hi = '#d6e6f3') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${hi}" stroke-width="1.6" stroke-linecap="round"/>`;
const paper = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-6" y="-8" width="12" height="16" fill="#fbfdff" stroke="#c3cfd9" stroke-width="1"/><path d="M-3.5 -4 H3.5 M-3.5 -1 H3.5 M-3.5 2 H1.5" stroke="#8fb3d6" stroke-width="1"/></g>`;
const desk = (x, y, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r})" stroke="#9fb0bf" stroke-width="1.6" stroke-linejoin="round">
  <path d="M0 0 H52 L56 22 H-4Z" fill="#f4f7fa"/><path d="M-4 22 H56 V27 H-4Z" fill="#cdd8e1"/>
  <path d="M30 0 L40 22" stroke="#b6c3ce" stroke-width="1.2" fill="none"/>
  <rect x="6" y="5" width="16" height="11" rx="1.5" fill="#cfe3f4"/><path d="M9 13 L13 9 L16 12 L19 7" stroke="#3b82c4" stroke-width="1.3" fill="none"/>
  <rect x="40" y="5" width="9" height="11" rx="1" fill="#fff" stroke="#c3cfd9" stroke-width="1"/></g>`;
const consoleBroken = (x, y) => `<g transform="translate(${x} ${y})" stroke="#9fb0bf" stroke-width="1.6" stroke-linejoin="round">
  <path d="M0 0 H40 V26 H0Z" fill="#f1f5f8"/><rect x="5" y="4" width="30" height="13" rx="1.5" fill="#9fb6c9"/>
  <path d="M10 6 L17 12 L14 15 M22 5 L19 11 L26 15" stroke="#eef4f9" stroke-width="1.1" fill="none"/>
  <circle cx="9" cy="21.5" r="2" fill="#7cb4e4"/><circle cx="16" cy="21.5" r="2" fill="#86d4a8"/><rect x="22" y="20" width="12" height="3" rx="1" fill="#cdd8e1"/></g>`;
const crack = (x, y, r = 0) => `<path transform="translate(${x} ${y}) rotate(${r})" d="M0 0 L10 4 L16 -2 L26 3 L32 0 M16 -2 L20 -10" fill="none" stroke="#9aa8b4" stroke-width="1.8" stroke-linecap="round"/>`;
const shards = (x, y) => `<g transform="translate(${x} ${y})" fill="#cfd9e2" stroke="#9fb0bf" stroke-width="1"><path d="M0 0 L8 -2 L9 1 L1 3Z"/><path d="M12 6 L16 3 L19 7 L14 9Z"/><path d="M-6 6 L-2 4 L0 8 L-5 9Z"/></g>`;
const lightScorch = (x, y, s = 1, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">
  <path d="M-30 0 Q-28 -14 -10 -16 Q4 -24 18 -14 Q34 -10 30 4 Q32 16 12 16 Q-2 22 -16 14 Q-34 12 -30 0Z" fill="#b9c0c6" opacity=".45"/>
  <path d="M-16 0 Q-12 -7 0 -7 Q12 -9 16 0 Q14 7 0 7 Q-14 7 -16 0Z" fill="#9ea6ad" opacity=".35"/></g>`;
// みかたの はた：あおい たてに アトム（げんしの わ）と ほし、しろい つばさ（オリジナル。じっさいの そしき・くに では ない）
const heroEmblem = `
  <g><path d="M12 -7 Q20 -19 35 -19 Q33 -15 30 -13.5 Q35 -13 34 -9.5 Q30 -8.5 27 -8 Q30 -6 28 -3 Q23 -3 20 -2.5 Q20 1 17 2 Q14 1 12 2Z" fill="#fff" stroke="#1e3a8a" stroke-width="1.4" stroke-linejoin="round"/><path d="M15 -6 Q22 -13 31 -15 M16 -3 Q23 -8 30 -10 M16 0 Q20 -3 25 -5" fill="none" stroke="#93c5fd" stroke-width="1"/></g>
  <g transform="scale(-1 1)"><g><path d="M12 -7 Q20 -19 35 -19 Q33 -15 30 -13.5 Q35 -13 34 -9.5 Q30 -8.5 27 -8 Q30 -6 28 -3 Q23 -3 20 -2.5 Q20 1 17 2 Q14 1 12 2Z" fill="#fff" stroke="#1e3a8a" stroke-width="1.4" stroke-linejoin="round"/><path d="M15 -6 Q22 -13 31 -15 M16 -3 Q23 -8 30 -10 M16 0 Q20 -3 25 -5" fill="none" stroke="#93c5fd" stroke-width="1"/></g></g>
  <path d="M0 -16 L14 -11 V1 Q14 11 0 17 Q-14 11 -14 1 V-11Z" fill="#2563eb" stroke="#0f1f4d" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M0 -13 L11 -9 V1 Q11 9 0 14 Q-11 9 -11 1 V-9Z" fill="none" stroke="#93c5fd" stroke-width="1"/>
  <ellipse cx="0" cy="0" rx="9" ry="3.4" fill="none" stroke="#e0f2fe" stroke-width="1.3"/>
  <ellipse cx="0" cy="0" rx="9" ry="3.4" fill="none" stroke="#e0f2fe" stroke-width="1.3" transform="rotate(60)"/>
  <ellipse cx="0" cy="0" rx="9" ry="3.4" fill="none" stroke="#e0f2fe" stroke-width="1.3" transform="rotate(-60)"/>
  <path d="M0 -3.4 L1 -1 L3.4 -1 L1.5 0.6 L2.2 3 L0 1.6 L-2.2 3 L-1.5 0.6 L-3.4 -1 L-1 -1Z" fill="#facc15" stroke="#854d0e" stroke-width=".6"/>`;
const heroFlag = (x, y) => `<g transform="translate(${x} ${y})">
  <ellipse cx="2" cy="2" rx="12" ry="4" fill="#9fb0bf" opacity=".45"/>
  <rect x="-5" y="-4" width="12" height="6" rx="1.5" fill="#cbd5df" stroke="#64748b" stroke-width="1.4"/>
  <path d="M1 -2 V-86" stroke="#334155" stroke-width="4.4" stroke-linecap="round"/><path d="M1 -2 V-86" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
  <circle cx="1" cy="-89" r="3.6" fill="#facc15" stroke="#854d0e" stroke-width="1.2"/>
  <path d="M3 -84 Q22 -88 40 -82 Q54 -78 66 -84 L66 -44 Q54 -38 40 -42 Q22 -48 3 -44Z" fill="#1d4ed8" stroke="#0f1f4d" stroke-width="2" stroke-linejoin="round"/>
  <path d="M3 -80 Q22 -84 40 -78 Q54 -74 62 -79" fill="none" stroke="#60a5fa" stroke-width="1.6" opacity=".9"/>
  <path d="M3 -49 Q22 -53 40 -47 Q54 -43 62 -48" fill="none" stroke="#e0f2fe" stroke-width="2.2"/>
  <g transform="translate(35 -64) scale(.82)">${heroEmblem}</g></g>`;
const labFloor = wrap(`<rect width="320" height="320" fill="#cfd9e2"/>${labPanels()}
  <path d="M0 158 H320" stroke="#a9cbe6" stroke-width="5"/><path d="M0 158 H320" stroke="#d7e9f7" stroke-width="1.4"/>
  <path d="M158 0 V60 M158 256 V320" stroke="#a9cbe6" stroke-width="4"/>
  ${hazard(0, 228, 60, 12)}
  ${grate(206, 20)}${grate(28, 250)}
  ${cable('M-4 104 Q40 96 70 116 T150 112 Q190 96 230 116 T324 104')}
  ${lightScorch(246, 92, 0.9, 10)}
  ${desk(150, 190, 6)}${consoleBroken(250, 250)}
  ${paper(130, 236, 20)}${paper(210, 232, -35)}${paper(290, 212, -10)}${paper(36, 58, 15)}
  ${crack(30, 40, 20)}${crack(260, 300, -15)}
  ${shards(60, 140)}${shards(280, 60)}`, '0 0 320 320');
// みかたの はた（ゆかの かざり。decor.js が スタートの そばと ときどき おく）
const labFlag = wrap(heroFlag(18, 104), '0 0 100 112');

// とうめいな ボトル（ゆかの かざり）。みどりの えきたいと あわ。broken は わられて からっぽ
const capsule = (broken = false) => wrap(`
  <ellipse cx="28" cy="94" rx="22" ry="5" fill="#000" opacity=".3"/>
  <path d="M6 84 H50 L47 94 H9Z" fill="#3a434d" ${SW(2)}/><rect x="8" y="78" width="40" height="8" rx="2" fill="#56616d" ${SW(2)}/>
  <circle cx="16" cy="88.5" r="1.6" fill="${broken ? '#7f1d1d' : '#4ade80'}"/><circle cx="22" cy="88.5" r="1.6" fill="#64748b"/>
  ${broken ? `
  <path d="M11 78 V44 L15 36 L19 46 L24 30 L29 42 L35 28 L39 40 L45 34 V78Z" fill="#9fb3c2" opacity=".18"/>
  <path d="M11 78 V44 L15 36 L19 46 L24 30 L29 42 L35 28 L39 40 L45 34 V78" fill="none" stroke="#b9c8d3" stroke-width="2" stroke-linejoin="round" opacity=".8"/>
  <path d="M11 78 V44 L15 36 L19 46 L24 30 L29 42 L35 28 L39 40 L45 34 V78" fill="none" ${SW(1.2)} opacity=".6"/>
  <ellipse cx="28" cy="77" rx="16" ry="2.5" fill="#22c55e" opacity=".5"/>
  <path d="M50 92 L56 88 L58 93 Z M2 90 L7 86 L6 92Z" fill="#b9c8d3" opacity=".7"/>
  <ellipse cx="60" cy="95" rx="9" ry="2.6" fill="#22c55e" opacity=".35"/>` : `
  <rect x="11" y="14" width="34" height="64" rx="5" fill="#14532d" opacity=".55"/>
  <rect x="11" y="24" width="34" height="54" rx="4" fill="#22c55e" opacity=".42"/>
  <path d="M11 26 Q28 22 45 26" fill="none" stroke="#86efac" stroke-width="1.6" opacity=".7"/>
  <circle cx="18" cy="66" r="2" fill="#bbf7d0" opacity=".7"/><circle cx="21" cy="52" r="1.4" fill="#bbf7d0" opacity=".7"/><circle cx="37" cy="60" r="2.4" fill="#bbf7d0" opacity=".6"/>
  <circle cx="34" cy="40" r="1.6" fill="#bbf7d0" opacity=".7"/><circle cx="19" cy="34" r="1.2" fill="#bbf7d0" opacity=".7"/>
  <rect x="11" y="14" width="34" height="64" rx="5" fill="none" stroke="#c7d6e0" stroke-width="2.4" opacity=".85"/>
  <rect x="11" y="14" width="34" height="64" rx="5" fill="none" ${SW(1.2)} opacity=".55"/>
  <path d="M15 20 V70" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".35"/>`}
  <rect x="8" y="${broken ? 16 : 6}" width="40" height="9" rx="2" fill="#56616d" ${SW(2)} ${broken ? 'transform="rotate(28 28 20) translate(18 52)" opacity=".9"' : ''}/>
  <path d="M28 ${broken ? 16 : 6} V0" stroke="#1b2027" stroke-width="4" stroke-linecap="round" ${broken ? 'opacity="0"' : ''}/>`, '0 0 64 100');

// ボトルの なかの うちゅうじん（かわいいけど ちょっと ぶきみ。みどりの えきの なかで ゆらゆら）
const alienFloat = wrap(`
  <path d="M20 40 Q16 50 12 54 M28 40 Q32 50 36 54" fill="none" stroke="#5b8a73" stroke-width="3" stroke-linecap="round"/>
  <path d="M17 38 Q24 50 31 38 Q30 32 24 32 Q18 32 17 38Z" fill="#a7c4b5" ${SW(1.6)}/>
  <path d="M14 36 Q8 38 6 44 M34 36 Q40 38 42 44" fill="none" stroke="#5b8a73" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M24 4 Q40 4 41 18 Q41 30 24 34 Q7 30 7 18 Q8 4 24 4Z" fill="#b8d6c6" ${SW(1.8)}/>
  <path d="M12 16 Q16 9 24 8" fill="none" stroke="#e7f5ee" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>
  <path d="M10 19 Q17 15 21 21 Q19 27 13 25 Q9 23 10 19Z" fill="#0b1210"/>
  <path d="M38 19 Q31 15 27 21 Q29 27 35 25 Q39 23 38 19Z" fill="#0b1210"/>
  <circle cx="14" cy="20" r="1.3" fill="#e7f5ee"/><circle cx="34" cy="20" r="1.3" fill="#e7f5ee"/>
  <path d="M21 29 Q24 30.5 27 29" fill="none" stroke="#3d5a4b" stroke-width="1.2" stroke-linecap="round"/>`, '0 0 48 58');

const GROUNDS = {
  lab: labFloor,
  grass: ruinedGrass, // むかしの くさはら（いまは つかって いない。もどしたい とき用）
  desert: tile(`<rect width="160" height="160" fill="#b08958"/>${blobs('#c4a06a', '#8d6a3e')}
    <path d="M0 96 Q40 86 80 96 T160 96" fill="none" stroke="#7a5a32" stroke-width="2.5"/>
    ${cactus(30, 70)}${cactus(130, 150)}${pebble(100, 40, '#a48458', '#5c4128')}${pebble(60, 132, '#a48458', '#5c4128')}
    <path d="M118 66 l6 -2 l2 4 l-5 2z" fill="#e7d3a8" opacity=".45"/>`),
  snow: tile(`<rect width="160" height="160" fill="#c5d0da"/>${blobs('#d5dee6', '#a9b8c6')}
    ${pine(36, 80)}${pine(130, 146)}${pine(118, 50)}
    <circle cx="70" cy="30" r="1.6" fill="#f8fafc"/><circle cx="20" cy="140" r="2" fill="#f8fafc"/><circle cx="96" cy="110" r="1.4" fill="#f8fafc"/>
    <path d="M60 120 l4 0 M62 118 l0 4" stroke="#7d92a8" stroke-width="1.5"/>`),
  forest: tile(`<rect width="160" height="160" fill="#243028"/>${blobs('#2c3b30', '#182018')}
    ${tuft(20, 80, '#121a14')}${tuft(96, 60, '#121a14')}${tuft(140, 150, '#121a14')}
    ${shroom(60, 30)}${shroom(120, 104)}${shroom(28, 120)}
    <circle cx="100" cy="24" r="1.2" fill="#d6d3d1" opacity=".35"/><circle cx="40" cy="60" r="1" fill="#d6d3d1" opacity=".3"/>`),
  castle: tile(`<rect width="160" height="160" fill="#3a3842"/>
    <path d="M0 0 H80 V80 H0Z M80 80 H160 V160 H80Z" fill="#2e2c36"/>
    <path d="M0 40 H160 M0 80 H160 M0 120 H160 M40 0 V40 M120 0 V40 M0 40 M80 40 V80 M40 80 V120 M120 80 V120 M80 120 V160" stroke="#1c1a22" stroke-width="3"/>
    <path d="M18 100 L30 108 L26 116 L36 124" fill="none" stroke="#9a3412" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M110 20 L120 28 L116 34" fill="none" stroke="#9a3412" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="140" cy="140" r="1.4" fill="#a8a29e" opacity=".5"/>`),
};

const hero2 = {
  rabbit:  hero({ fur: '#e7e5e4', shade: '#a8a29e', inner: '#78716c', ear: 'rabbit' }),
  penguin: hero({ fur: '#1e293b', shade: '#0f172a', inner: '#e7e5e4', ear: 'none', belly: '#d6d3d1',
    face: `<ellipse cx="32" cy="31" rx="13" ry="11" fill="#d6d3d1"/>`, mouth: `<path d="M28 35 H36 L32 39Z" fill="#c2410c" ${S2}/>` }),
  bear:    hero({ fur: '#7c4a12', shade: '#4a2c0a', inner: '#a16207', ear: 'bear', muzzle: '#d6d3d1' }),
  dino:    hero({ fur: '#3f7d46', shade: '#1f4d28', inner: '#14532d', ear: 'none', belly: '#d6d3d1',
    behind: `<path d="M18 14 L20 3 L26 10 L32 0 L38 10 L44 3 L46 14Z" fill="#9a3412" ${S}/>`,
    mouth: `<path d="M26 37 H38" fill="none" ${S2}/>` }),
  unicorn: hero({ fur: '#e7e5e4', shade: '#a8a29e', inner: '#78716c', ear: 'cat',
    behind: `<path d="M50 18 Q60 30 54 44 Q50 34 46 30Z" fill="#57534e" ${S2}/>`,
    extra: `<path d="M16 24 Q12 12 26 10 Q22 16 25 20 Q19 19 16 24Z" fill="#44403c" ${S2}/><path d="M28.5 12 L32 1 L35.5 12Z" fill="#d6d3d1" ${S2}/>` }),
};

const SOURCES = {
  cat:   wrap(hero({ fur: '#c4844a', shade: '#7c3f12', inner: '#a16207', ear: 'cat', extra: whiskers })),
  dog:   wrap(soldier), // id は セーブ互換のため dog のまま（絵と名前は にんげんの ソルジャー）
  fox:   wrap(hero({ fur: '#c2410c', shade: '#7c2d12', inner: '#e7e5e4', ear: 'fox', muzzle: '#e7e5e4', extra: whiskers })),
  panda: wrap(hero({ fur: '#e7e5e4', shade: '#57534e', inner: '#a8a29e', ear: 'panda', muzzle: '#d6d3d1', patches: true })),
  ...Object.fromEntries(Object.entries(hero2).map(([k, v]) => [k, wrap(v)])),
  zombie: wrap(withPatch('zombie', zombie)), bat: wrap(withPatch('bat', bat)), ghost: wrap(withPatch('ghost', ghost)),
  skull: wrap(withPatch('skull', skull)), ogre: wrap(withPatch('ogre', ogre)), dragon: wrap(withPatch('dragon', dragon)),
  scorpion: wrap(withPatch('scorpion', scorpion)), mummy: wrap(withPatch('mummy', mummy)), snake: wrap(withPatch('snake', snake)),
  snowman: wrap(withPatch('snowman', snowman)), wolf: wrap(withPatch('wolf', wolf)),
  icegiant: wrap(withPatch('icegiant', icegiant), '0 -4 64 68'), pumpkin: wrap(withPatch('pumpkin', pumpkin)),
  witch: wrap(withPatch('witch', witch), '-6 -4 72 68'), maou: wrap(withPatch('maou', maou), '0 -4 64 68'),
  gem1: wrap(gem('#60a5fa', '#2563eb')), gem2: wrap(gem('#4ade80', '#16a34a')), gem3: wrap(gem('#f472b6', '#db2777')),
  coin: wrap(coin), meat: wrap(meat), magnet: wrap(magnet), nuke: wrap(bomb), bomb: wrap(bomb),
  kunai, star: wrap(star), bolt, smissile, researcher: wrap(researcher),
  capsule: capsule(false), capsuleBroken: capsule(true), alienFloat, labFlag, ebomb, fire, glassShards,
  thrower: wrap(withPatch('thrower', thrower)), alien: wrap(alienFoe),
  ally: wrap(allySoldier), medic: wrap(medic), container: crate(false), containerOpen: crate(true), whistle, healPlus,
  gun, shotgun, bazooka, dual, gatling, rocket, mega, bullet, pellet, blast,
  sword: wrap(sword), armor: wrap(armor), shoes: wrap(shoes), charm: wrap(charm), chest: wrap(chest), chestOpen: wrap(chestOpen, '0 -4 64 68'),
  ...Object.fromEntries(Object.entries(GROUNDS).map(([k, v]) => [`ground-${k}`, v])),
};
const FLASHABLE = ['zombie', 'bat', 'ghost', 'skull', 'ogre', 'dragon', 'scorpion', 'mummy', 'snake', 'snowman', 'wolf', 'icegiant', 'pumpkin', 'witch', 'maou', 'thrower', 'alien'];

const toUrl = svg => `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;

let cache = null;
/** name → CSS の url(...)。flash=true で白シルエット版 */
export function art(name, flash = false) {
  if (!cache) {
    cache = new Map();
    for (const [k, v] of Object.entries(SOURCES)) cache.set(k, toUrl(v));
    for (const k of FLASHABLE) {
      const inner = SOURCES[k].replace(/^<svg[^>]*>|<\/svg>$/g, '');
      cache.set(`${k}!`, toUrl(wrap(whiteOf(inner))));
    }
  }
  return cache.get(flash ? `${name}!` : name) || cache.get(name);
}

/** 画像デコードを先に済ませておく（最初の登場でカクつかないように） */
export function preloadArt() {
  art('cat');
  return Promise.all([...cache.values()].map(u => new Promise(res => {
    const img = new Image();
    img.onload = img.onerror = res;
    img.src = u.slice(5, -2);
  })));
}

export const ART_NAMES = Object.keys(SOURCES);

/** じめんの タイルの おおきさ（px）。けんきゅうじょ（と むかしの くさはら）だけ 320（くりかえしが めだたないように） */
export const groundTile = kind => (kind === 'lab' || kind === 'grass' ? 320 : 160);
