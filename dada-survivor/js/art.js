/**
 * ダダサバイバーもどき トゥーン調SVGアート
 * 太い輪郭・2段セル塗り・大きな目。SVG文字列は起動時に一度だけ data URI 化し、
 * 以降は <div> の background-image として再利用する（毎フレームSVGを解釈させない）。
 */

const O = '#2a1a3a'; // 輪郭色
const S = `stroke="${O}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const S2 = `stroke="${O}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
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
    <ellipse cx="${cx - r * 0.42}" cy="${cy - r * 0.5}" rx="${r * 0.28}" ry="${r * 0.16}" fill="#fff" opacity=".45" transform="rotate(-30 ${cx - r * 0.42} ${cy - r * 0.5})"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" ${S}/>`;
}

const animeEye = (x, y, iris = O) => `
  <ellipse cx="${x}" cy="${y}" rx="4.2" ry="5.6" fill="${iris}"/>
  <ellipse cx="${x}" cy="${y + 2.2}" rx="3" ry="2.6" fill="#fff" opacity=".18"/>
  <circle cx="${x + 1.3}" cy="${y - 2.2}" r="1.9" fill="#fff"/>
  <circle cx="${x - 1.4}" cy="${y + 2}" r=".9" fill="#fff"/>`;

const blush = `<ellipse cx="19.5" cy="35" rx="3.6" ry="2" fill="#fb7185" opacity=".55"/><ellipse cx="44.5" cy="35" rx="3.6" ry="2" fill="#fb7185" opacity=".55"/>`;
const catMouth = `<path d="M28.5 36.5 Q30.3 38.6 32 36.5 Q33.7 38.6 35.5 36.5" fill="none" ${S2}/>`;

/* ---------- プレイヤー（ちびアニマル） ---------- */
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
  if (ear === 'dog') front = `<ellipse cx="13.5" cy="27" rx="6" ry="11.5" fill="${inner}" ${S} transform="rotate(18 13.5 27)"/>
    <ellipse cx="50.5" cy="27" rx="6" ry="11.5" fill="${inner}" ${S} transform="rotate(-18 50.5 27)"/>`;
  const patch = patches ? `<ellipse cx="24" cy="30" rx="6.5" ry="7.5" fill="${O}" transform="rotate(20 24 30)"/><ellipse cx="40" cy="30" rx="6.5" ry="7.5" fill="${O}" transform="rotate(-20 40 30)"/>` : '';
  const muz = mouth !== undefined ? mouth : muzzle ? `<ellipse cx="32" cy="37" rx="7.5" ry="5" fill="${muzzle}"/><path d="M30 33.5 L34 33.5 L32 35.8Z" fill="${O}" ${S2}/>` : `<path d="M30.6 33.6 L33.4 33.6 L32 35.2Z" fill="#f472b6" ${S2}/>`;
  const eyes = patches
    ? `${animeEye(24.5, 30.5, '#111')}${animeEye(39.5, 30.5, '#111')}`
    : `${animeEye(24.5, 30)}${animeEye(39.5, 30)}`;
  return `${back}
    <ellipse cx="22" cy="60" rx="5" ry="3.2" fill="${shade}" ${S}/><ellipse cx="42" cy="60" rx="5" ry="3.2" fill="${shade}" ${S}/>
    <ellipse cx="32" cy="52" rx="13" ry="10" fill="${fur}" ${S}/>
    <ellipse cx="32" cy="54" rx="7" ry="5.5" fill="${belly || muzzle || inner}" opacity=".9"/>
    <path d="M19 43 Q32 50 45 43 L45.5 47.5 Q32 54 18.5 47.5Z" fill="#ef4444" ${S2}/>
    <path d="M40 47 L47 56 L42 55.5Z" fill="#dc2626" ${S2}/>
    ${shadedCircle('hh', 32, 27, 19, fur, shade)}
    ${face}${front}${patch}${eyes}${blush}${muz}${mouth !== undefined ? '' : catMouth}${extra}`;
}

const whiskers = `<path d="M10 33 L18 34 M10 38 L18 37 M54 33 L46 34 M54 38 L46 37" ${S2} fill="none"/>`;

/* ---------- てき ---------- */
const zombie = `
  <path d="M42 44 L58 40 M42 50 L58 47" stroke="${O}" stroke-width="7.5" stroke-linecap="round"/>
  <path d="M42 44 L58 40 M42 50 L58 47" stroke="#7bc96f" stroke-width="4" stroke-linecap="round"/>
  <path d="M20 42 Q32 38 44 42 L46 60 L38 57 L33 61 L27 57 L18 60Z" fill="#8b5cf6" ${S}/>
  <path d="M30 46 L34 52 L31 56" fill="none" stroke="#6d28d9" stroke-width="2"/>
  ${shadedCircle('zh', 31, 25, 17, '#86d47a', '#5a9e50')}
  <path d="M18 18 Q24 10 31 13 Q38 9 44 16" fill="none" ${S2}/>
  <path d="M38 14 L46 22" stroke="#fde68a" stroke-width="4"/><path d="M40 13 L42 20 M43 15 L45 22" stroke="#d6a548" stroke-width="1.2"/>
  <circle cx="24" cy="25" r="5.5" fill="#fff" ${S2}/><circle cx="25.5" cy="26" r="2.2" fill="${O}"/>
  <path d="M34 22 L40 28 M40 22 L34 28" ${S} fill="none"/>
  <path d="M22 34 L25 32 L28 35 L31 32 L34 35 L37 33" fill="none" ${S2}/>
  <path d="M15 28 L19 30 M16 31 L19 33" stroke="#5a9e50" stroke-width="1.5"/>`;

const bat = `
  <path d="M22 30 Q12 16 2 24 Q8 28 6 34 Q12 30 14 38 Q18 32 24 38Z" fill="#6d28d9" ${S}/>
  <path d="M42 30 Q52 16 62 24 Q56 28 58 34 Q52 30 50 38 Q46 32 40 38Z" fill="#6d28d9" ${S}/>
  <path d="M22 20 L20 8 L28 16Z M42 20 L44 8 L36 16Z" fill="#7c3aed" ${S}/>
  ${shadedCircle('bh', 32, 31, 14, '#8b5cf6', '#6d28d9')}
  <path d="M23 27 L30 29 M41 27 L34 29" ${S2}/>
  <ellipse cx="27" cy="31" rx="3" ry="3.4" fill="#fde047" ${S2}/><ellipse cx="37" cy="31" rx="3" ry="3.4" fill="#fde047" ${S2}/>
  <circle cx="27" cy="31.5" r="1.3" fill="${O}"/><circle cx="37" cy="31.5" r="1.3" fill="${O}"/>
  <path d="M27 37 Q32 40 37 37" fill="none" ${S2}/><path d="M28.5 37.8 L29.5 41 L30.5 38.4 M33.5 38.4 L34.5 41 L35.5 37.8" fill="#fff" stroke="${O}" stroke-width="1"/>`;

const ghost = `
  <clipPath id="gc"><path d="M14 32 A18 18 0 0 1 50 32 L50 54 Q46 50 42 55 Q38 60 34 55 Q30 50 26 55 Q22 60 18 55 Q16 52 14 54Z"/></clipPath>
  <path d="M14 32 A18 18 0 0 1 50 32 L50 54 Q46 50 42 55 Q38 60 34 55 Q30 50 26 55 Q22 60 18 55 Q16 52 14 54Z" fill="#c7d2fe"/>
  <ellipse cx="29" cy="30" rx="18" ry="22" fill="#f8fafc" clip-path="url(#gc)"/>
  <path d="M14 32 A18 18 0 0 1 50 32 L50 54 Q46 50 42 55 Q38 60 34 55 Q30 50 26 55 Q22 60 18 55 Q16 52 14 54Z" fill="none" ${S}/>
  <ellipse cx="21" cy="22" rx="4" ry="2.4" fill="#fff" transform="rotate(-30 21 22)"/>
  <ellipse cx="25" cy="32" rx="3.6" ry="5" fill="${O}"/><circle cx="26.2" cy="30" r="1.5" fill="#fff"/>
  <ellipse cx="39" cy="32" rx="3.6" ry="5" fill="${O}"/><circle cx="40.2" cy="30" r="1.5" fill="#fff"/>
  <path d="M28 40 Q32 44 36 40" fill="#fb7185" ${S2}/>
  <ellipse cx="19" cy="38" rx="3" ry="1.8" fill="#a5b4fc" opacity=".7"/><ellipse cx="45" cy="38" rx="3" ry="1.8" fill="#a5b4fc" opacity=".7"/>`;

const skull = `
  <path d="M26 44 L26 58 M38 44 L38 58 M22 50 L42 50 M22 55 L42 55" ${SW(5)}/>
  <path d="M26 44 L26 58 M38 44 L38 58 M22 50 L42 50 M22 55 L42 55" stroke="#e2e8f0" stroke-width="2.5" stroke-linecap="round"/>
  ${shadedCircle('sh', 32, 24, 17, '#f1f5f9', '#cbd5e1')}
  <path d="M23 36 L41 36 L40 43 L24 43Z" fill="#e2e8f0" ${S}/>
  <path d="M28 36 L28 43 M32 36 L32 43 M36 36 L36 43" stroke="${O}" stroke-width="1.6"/>
  <path d="M19 24 Q24 18 30 24 Q26 31 19 24Z M45 24 Q40 18 34 24 Q38 31 45 24Z" fill="${O}"/>
  <circle cx="25" cy="25" r="2.4" fill="#f87171"/><circle cx="39" cy="25" r="2.4" fill="#f87171"/>
  <circle cx="25.6" cy="24.4" r=".9" fill="#fff"/><circle cx="39.6" cy="24.4" r=".9" fill="#fff"/>
  <path d="M30 31 L32 28 L34 31Z" fill="${O}"/>`;

const ogre = `
  <path d="M50 18 L60 4 Q63 6 61 9 L54 24Z" fill="#a16207" ${S}/>
  <circle cx="57" cy="9" r="1.5" fill="#fde68a"/><circle cx="55" cy="14" r="1.5" fill="#fde68a"/>
  <path d="M51 30 Q56 26 58 20" stroke="${O}" stroke-width="7" stroke-linecap="round" fill="none"/>
  <path d="M51 30 Q56 26 58 20" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <path d="M16 44 Q32 38 48 44 L50 60 L14 60Z" fill="#ef4444" ${S}/>
  <path d="M16 52 L48 52 L50 61 L14 61Z" fill="#facc15" ${S}/>
  <path d="M20 52 L22 61 M28 52 L27 61 M36 52 L37 61 M44 52 L42 61" stroke="${O}" stroke-width="2.5"/>
  <path d="M18 14 L13 1 L25 10Z M46 14 L51 1 L39 10Z" fill="#fde68a" ${S}/>
  ${shadedCircle('oh', 32, 26, 18, '#f87171', '#dc2626')}
  <path d="M15 20 Q20 6 32 9 Q44 6 49 20 Q42 14 32 15 Q22 14 15 20Z" fill="#1f2937" ${S2}/>
  <path d="M20 22 L29 26 M44 22 L35 26" ${SW(3.5)}/>
  <ellipse cx="25.5" cy="28.5" rx="3.6" ry="3.4" fill="#fff" ${S2}/><circle cx="26.5" cy="29" r="1.8" fill="${O}"/>
  <ellipse cx="38.5" cy="28.5" rx="3.6" ry="3.4" fill="#fff" ${S2}/><circle cx="37.5" cy="29" r="1.8" fill="${O}"/>
  <path d="M23 38 Q32 33 41 38 Q32 42 23 38Z" fill="#7f1d1d" ${S2}/>
  <path d="M25 37.5 L26 33.5 L28 37 M39 37.5 L38 33.5 L36 37" fill="#fff" stroke="${O}" stroke-width="1.2"/>`;

const dragon = `
  <path d="M18 30 Q2 10 4 34 Q9 30 10 40 Q14 34 20 40Z" fill="#a855f7" ${S}/>
  <path d="M46 30 Q62 10 60 34 Q55 30 54 40 Q50 34 44 40Z" fill="#a855f7" ${S}/>
  <path d="M44 54 Q58 58 60 48 Q62 44 58 44" fill="none" stroke="${O}" stroke-width="7" stroke-linecap="round"/>
  <path d="M44 54 Q58 58 60 48 Q62 44 58 44" fill="none" stroke="#34d399" stroke-width="3.5" stroke-linecap="round"/>
  <ellipse cx="32" cy="50" rx="15" ry="11" fill="#34d399" ${S}/>
  <ellipse cx="32" cy="52" rx="8.5" ry="7.5" fill="#fef3c7" ${S2}/>
  <path d="M26 50 L38 50 M27 54 L37 54" stroke="#f59e0b" stroke-width="1.5"/>
  <path d="M20 14 L16 0 L27 10Z M44 14 L48 0 L37 10Z" fill="#fde68a" ${S}/>
  ${shadedCircle('dh', 32, 25, 17, '#4ade80', '#059669')}
  <path d="M28 8 L32 3 L36 8" fill="#a855f7" ${S2}/>
  <ellipse cx="32" cy="34" rx="10" ry="6.5" fill="#86efac" ${S2}/>
  <circle cx="28.5" cy="33.5" r="1.2" fill="${O}"/><circle cx="35.5" cy="33.5" r="1.2" fill="${O}"/>
  <path d="M19 21 L28 24 M45 21 L36 24" ${S}/>
  <ellipse cx="24.5" cy="26" rx="4" ry="4.4" fill="#fde047" ${S2}/><ellipse cx="24.5" cy="26" rx="1.2" ry="3.4" fill="${O}"/>
  <ellipse cx="39.5" cy="26" rx="4" ry="4.4" fill="#fde047" ${S2}/><ellipse cx="39.5" cy="26" rx="1.2" ry="3.4" fill="${O}"/>
  <path d="M27 38.5 L28 41 L29.5 38.8 M34.5 38.8 L36 41 L37 38.5" fill="#fff" stroke="${O}" stroke-width="1.1"/>`;

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
  <rect x="14" y="28" width="20" height="8" rx="2" fill="#7c3aed" ${S2}/>
  <circle cx="10" cy="32" r="5" fill="none" ${S}/>`);

const star = `
  <path d="M32 4 L39.5 22 L59 23 L44 35.5 L49 55 L32 44.5 L15 55 L20 35.5 L5 23 L24.5 22Z" fill="#facc15" ${S}/>
  <path d="M32 10 L37 23 L32 38 L22 26Z" fill="#fef08a"/>
  <ellipse cx="27" cy="30" rx="2" ry="3" fill="${O}"/><ellipse cx="37" cy="30" rx="2" ry="3" fill="${O}"/>
  <path d="M29 36 Q32 39 35 36" fill="none" ${S2}/>`;

const bolt = wrap(`<path d="M22 0 L42 0 L30 34 L46 34 L14 100 L22 50 L8 50Z" fill="#fde047" ${S}/><path d="M24 4 L36 4 L26 30 L20 30Z" fill="#fff" opacity=".7"/>`, '0 0 54 100');

/* ---------- あたらしい てき（みぎむき） ---------- */
const scorpion = `
  <path d="M16 44 Q4 32 10 20 Q16 10 27 13" fill="none" stroke="${O}" stroke-width="9" stroke-linecap="round"/>
  <path d="M16 44 Q4 32 10 20 Q16 10 27 13" fill="none" stroke="#f59e0b" stroke-width="5" stroke-linecap="round"/>
  <path d="M25 8 L35 13 L25 18Z" fill="#7c2d12" ${S2}/>
  <path d="M22 52 L16 58 M28 54 L24 60 M36 54 L38 60 M42 52 L46 58" ${S}/>
  <path d="M44 38 Q56 26 61 35 Q56 33 54 38 Q60 42 52 45Z" fill="#fbbf24" ${S2}/>
  <path d="M44 48 Q58 50 60 58 Q55 55 52 56 Q52 60 46 56Z" fill="#fbbf24" ${S2}/>
  <ellipse cx="32" cy="46" rx="16" ry="11" fill="#d97706" ${S}/>
  <ellipse cx="30" cy="43" rx="12" ry="7" fill="#f59e0b"/>
  <path d="M24 40 Q26 50 24 54 M32 38 Q34 50 32 56" fill="none" stroke="#b45309" stroke-width="1.6"/>
  <ellipse cx="25" cy="40" rx="4" ry="2" fill="#fff" opacity=".45"/>
  <circle cx="40" cy="41" r="3.2" fill="#fff" ${S2}/><circle cx="41" cy="41.5" r="1.4" fill="${O}"/>
  <circle cx="46" cy="42" r="2.8" fill="#fff" ${S2}/><circle cx="46.8" cy="42.5" r="1.2" fill="${O}"/>`;

const mummy = `
  <path d="M42 44 L58 41 M42 50 L58 48" stroke="${O}" stroke-width="7.5" stroke-linecap="round"/>
  <path d="M42 44 L58 41 M42 50 L58 48" stroke="#f5e6c8" stroke-width="4" stroke-linecap="round"/>
  <path d="M20 42 Q32 38 44 42 L45 60 L19 60Z" fill="#f5e6c8" ${S}/>
  <path d="M20 47 L44 51 M20 54 L45 50 M21 58 L44 56" stroke="#c9b38a" stroke-width="2"/>
  ${shadedCircle('mu', 32, 25, 17, '#f5e6c8', '#d6c29a')}
  <path d="M16 18 L48 22 M15 27 L49 24 M17 34 L47 37" stroke="#c9b38a" stroke-width="2.2"/>
  <path d="M33 25 Q38 21 44 25 Q38 29 33 25Z" fill="${O}"/>
  <circle cx="39" cy="25" r="2.2" fill="#fde047"/><circle cx="39.6" cy="24.4" r=".8" fill="#fff"/>
  <path d="M46 34 L54 40" stroke="#f5e6c8" stroke-width="3" stroke-linecap="round"/>`;

const snake = `
  <ellipse cx="30" cy="52" rx="26" ry="10" fill="#65a30d" ${S}/>
  <ellipse cx="28" cy="49" rx="20" ry="5" fill="#a3e635"/>
  <ellipse cx="30" cy="42" rx="19" ry="8.5" fill="#65a30d" ${S}/>
  <ellipse cx="28" cy="40" rx="14" ry="4" fill="#a3e635"/>
  <circle cx="14" cy="51" r="2.5" fill="#7c3aed"/><circle cx="40" cy="54" r="2.5" fill="#7c3aed"/><circle cx="22" cy="42" r="2.2" fill="#7c3aed"/><circle cx="40" cy="41" r="2.2" fill="#7c3aed"/>
  <path d="M28 38 Q20 26 30 18" fill="none" stroke="${O}" stroke-width="14" stroke-linecap="round"/>
  <path d="M28 38 Q20 26 30 18" fill="none" stroke="#84cc16" stroke-width="9" stroke-linecap="round"/>
  <path d="M27 36 Q23 28 28 22" fill="none" stroke="#fef9c3" stroke-width="3.5" stroke-linecap="round"/>
  ${shadedCircle('sn', 38, 17, 13, '#a3e635', '#65a30d')}
  <path d="M50 21 L60 21 M56 21 L62 18 M56 21 L62 24" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M32 9 L41 13 M47 11 L41 14" ${S}/>
  <ellipse cx="37" cy="15" rx="3" ry="3.6" fill="#fde047" ${S2}/><ellipse cx="37" cy="15" rx="1" ry="2.8" fill="${O}"/>
  <ellipse cx="45" cy="15" rx="2.6" ry="3.2" fill="#fde047" ${S2}/><ellipse cx="45" cy="15" rx=".9" ry="2.4" fill="${O}"/>
  <path d="M40 22 Q46 26 51 21" fill="none" ${S2}/>
  <path d="M43 23 L44 27 L45.5 23.5 M47.5 23 L48.5 26.5 L49.5 22.5" fill="#fff" stroke="${O}" stroke-width="1"/>`;

const snowman = `
  <path d="M18 38 L4 30 M8 33 L4 36 M46 38 L60 30 M56 33 L60 28" stroke="#78350f" stroke-width="3" stroke-linecap="round"/>
  ${shadedCircle('s1', 32, 47, 14, '#ffffff', '#bfdbfe')}
  <circle cx="32" cy="43" r="1.8" fill="${O}"/><circle cx="32" cy="50" r="1.8" fill="${O}"/>
  ${shadedCircle('s2', 32, 23, 12, '#ffffff', '#bfdbfe')}
  <path d="M21 32 Q32 37 43 32 L43 36 Q32 41 21 36Z" fill="#ef4444" ${S2}/><path d="M38 36 L42 46 L37 45Z" fill="#dc2626" ${S2}/>
  <path d="M22 13 L42 13 L40 2 L24 2Z" fill="#2563eb" ${S2}/><path d="M19 13 L45 13" ${SW(3.5)}/>
  <circle cx="28" cy="21" r="2.2" fill="${O}"/><circle cx="37" cy="21" r="2.2" fill="${O}"/>
  <circle cx="28.7" cy="20.3" r=".8" fill="#fff"/><circle cx="37.7" cy="20.3" r=".8" fill="#fff"/>
  <path d="M33 25 L46 27 L33 28.5Z" fill="#fb923c" ${S2}/>
  <path d="M27 30 Q32 32 37 30" fill="none" ${S2}/>`;

const wolf = `
  <path d="M14 48 Q2 46 4 36 Q10 42 18 42" fill="#94a3b8" ${S}/>
  <ellipse cx="28" cy="50" rx="14" ry="9" fill="#94a3b8" ${S}/>
  <ellipse cx="30" cy="53" rx="7" ry="4.5" fill="#e2e8f0"/>
  <path d="M20 58 L20 61 M36 58 L36 61" ${SW(4)}/>
  <path d="M22 16 L20 2 L32 11Z M40 14 L46 1 L48 16Z" fill="#94a3b8" ${S}/>
  <path d="M23 13 L22 6 L28 11Z M42 12 L45 5 L46 13Z" fill="#fda4af"/>
  ${shadedCircle('wf', 34, 27, 15, '#cbd5e1', '#64748b')}
  <path d="M38 30 Q52 28 56 34 Q52 40 40 39Z" fill="#f1f5f9" ${S}/>
  <ellipse cx="55" cy="33" rx="3" ry="2.4" fill="${O}"/>
  <path d="M26 21 L33 24 M38 21 L44 23" ${S}/>
  <ellipse cx="30" cy="27" rx="3" ry="3.4" fill="#fde047" ${S2}/><circle cx="31" cy="27.4" r="1.4" fill="${O}"/>
  <ellipse cx="41" cy="26.5" rx="2.6" ry="3" fill="#fde047" ${S2}/><circle cx="42" cy="27" r="1.2" fill="${O}"/>
  <path d="M42 39 Q47 41 52 38" fill="none" ${S2}/><path d="M45 39.5 L46 42 L47 39.8" fill="#fff" stroke="${O}" stroke-width="1"/>`;

const icegiant = `
  <path d="M10 40 Q2 50 8 58 L18 56 Z M54 40 Q62 50 56 58 L46 56Z" fill="#7dd3fc" ${S}/>
  <path d="M14 38 Q32 30 50 38 L52 60 L12 60Z" fill="#38bdf8" ${S}/>
  <path d="M24 42 L32 50 L40 42" fill="none" stroke="#e0f2fe" stroke-width="3" stroke-linecap="round"/>
  ${shadedCircle('ig', 32, 24, 17, '#7dd3fc', '#0284c7')}
  <path d="M18 14 L16 0 L24 10 L28 -2 L32 9 L36 -2 L40 10 L48 0 L46 14Z" fill="#e0f2fe" ${S2}/>
  <path d="M20 20 L29 24 M44 20 L35 24" ${SW(3.5)}/>
  <ellipse cx="26" cy="27" rx="3.6" ry="3" fill="#fff" ${S2}/><ellipse cx="38" cy="27" rx="3.6" ry="3" fill="#fff" ${S2}/>
  <circle cx="26.8" cy="27.2" r="1.3" fill="#0ea5e9"/><circle cx="37.2" cy="27.2" r="1.3" fill="#0ea5e9"/>
  <path d="M24 36 L27 33 L30 36 L33 33 L36 36 L39 33 L41 36" fill="none" ${S2}/>
  <circle cx="14" cy="22" r="1.5" fill="#fff"/><circle cx="50" cy="30" r="1.5" fill="#fff"/>`;

const pumpkin = `
  <path d="M32 14 Q31 6 36 3" fill="none" stroke="${O}" stroke-width="6" stroke-linecap="round"/>
  <path d="M32 14 Q31 6 36 3" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round"/>
  <path d="M35 8 Q44 2 48 10 Q40 12 35 8Z" fill="#4ade80" ${S2}/>
  <ellipse cx="32" cy="38" rx="25" ry="21" fill="#ea580c" ${S}/>
  <ellipse cx="32" cy="38" rx="15" ry="21" fill="#f97316" ${S2}/>
  <ellipse cx="32" cy="38" rx="6" ry="21" fill="#fb923c" ${S2}/>
  <ellipse cx="20" cy="26" rx="4" ry="2.2" fill="#fff" opacity=".45" transform="rotate(-30 20 26)"/>
  <path d="M19 34 L26 28 L28 36Z M45 34 L38 28 L36 36Z" fill="#fde047" ${S2}/>
  <path d="M18 43 L22 47 L26 44 L30 48 L34 44 L38 48 L42 44 L46 43 Q40 54 32 54 Q24 54 18 43Z" fill="#fde047" ${S2}/>`;

const witch = `
  <path d="M4 52 L54 46" stroke="${O}" stroke-width="6" stroke-linecap="round"/>
  <path d="M4 52 L54 46" stroke="#a16207" stroke-width="3" stroke-linecap="round"/>
  <path d="M2 48 L-4 58 L10 56Z" fill="#fde047" ${S2}/>
  <path d="M18 60 Q20 40 32 38 Q44 40 46 60Z" fill="#7c3aed" ${S}/>
  <path d="M30 40 L32 58 M36 40 L37 58" stroke="#5b21b6" stroke-width="1.6"/>
  <path d="M14 30 Q12 46 20 48 Q18 36 22 30Z M50 30 Q52 46 44 48 Q46 36 42 30Z" fill="#a855f7" ${S2}/>
  ${shadedCircle('wh', 32, 30, 14, '#fde2c8', '#f5b98a')}
  <path d="M18 24 Q32 18 46 24 L46 28 Q32 22 18 28Z" fill="#a855f7"/>
  <path d="M8 22 Q32 26 56 22 Q50 18 44 18 L36 -2 Q32 2 30 10 L22 18 Q14 18 8 22Z" fill="#6d28d9" ${S}/>
  <path d="M22 18 Q32 21 44 18 L45 14 Q32 17 23 14Z" fill="#facc15" ${S2}/>
  ${animeEye(27, 31, '#7c3aed')}${animeEye(38, 31, '#7c3aed')}
  <ellipse cx="22.5" cy="36" rx="2.6" ry="1.5" fill="#fb7185" opacity=".6"/><ellipse cx="42.5" cy="36" rx="2.6" ry="1.5" fill="#fb7185" opacity=".6"/>
  <path d="M29 38 Q33 41 37 37" fill="none" ${S2}/>
  <path d="M54 30 L60 24 M57 22 L60 24 L62 27" stroke="#facc15" stroke-width="2.5" stroke-linecap="round" fill="none"/>`;

const maou = `
  <path d="M8 26 Q2 48 6 62 L58 62 Q62 48 56 26 Q44 34 32 34 Q20 34 8 26Z" fill="#b91c1c" ${S}/>
  <path d="M10 30 Q6 46 9 60 L14 60 Q12 46 16 34Z" fill="#7f1d1d"/>
  <path d="M18 42 Q32 36 46 42 L48 62 L16 62Z" fill="#1e1b4b" ${S}/>
  <path d="M26 44 L32 54 L38 44" fill="#facc15" ${S2}/>
  <path d="M18 18 Q4 10 6 -2 Q12 8 22 10Z M46 18 Q60 10 58 -2 Q52 8 42 10Z" fill="#fef3c7" ${S}/>
  ${shadedCircle('mh', 32, 25, 16, '#7c3aed', '#4c1d95')}
  <path d="M22 12 L24 4 L28 9 L32 2 L36 9 L40 4 L42 12Z" fill="#facc15" ${S2}/>
  <circle cx="32" cy="8" r="1.8" fill="#ef4444"/>
  <path d="M20 21 L29 25 M44 21 L35 25" ${SW(3.5)}/>
  <path d="M22 27 L30 26 L28 30Z M42 27 L34 26 L36 30Z" fill="#ef4444" ${S2}/>
  <path d="M24 35 Q32 31 40 35 Q32 39 24 35Z" fill="#1e1b4b" ${S2}/>
  <path d="M27 34 L28 37.5 L29.5 34.3 M34.5 34.3 L36 37.5 L37 34" fill="#fff" stroke="${O}" stroke-width="1"/>`;

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
const cactus = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-3 0 L-3 -18 Q0 -22 3 -18 L3 0Z M3 -10 L8 -10 L8 -15 M-3 -7 L-8 -7 L-8 -13" fill="#4ade80" stroke="#166534" stroke-width="2" stroke-linejoin="round"/></g>`;
const pine = (x, y) => `<g transform="translate(${x} ${y})"><path d="M0 -20 L9 -4 L-9 -4Z M0 -13 L11 2 L-11 2Z" fill="#15803d" stroke="#14532d" stroke-width="1.6" stroke-linejoin="round"/><path d="M0 -20 L4 -12 L-4 -12Z" fill="#fff"/><rect x="-2" y="2" width="4" height="4" fill="#78350f"/></g>`;
const shroom = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-2" y="-4" width="4" height="7" rx="1.5" fill="#fef3c7" stroke="#3b2a1a" stroke-width="1.2"/><path d="M-7 -4 Q0 -14 7 -4Z" fill="#dc2626" stroke="#3b2a1a" stroke-width="1.2"/><circle cx="-2" cy="-7" r="1.2" fill="#fff"/><circle cx="2.5" cy="-6" r="1" fill="#fff"/></g>`;

const GROUNDS = {
  grass: tile(`<rect width="160" height="160" fill="#7fd05e"/>${blobs('#8edc6b', '#72c352')}
    ${tuft(20, 80)}${tuft(96, 60)}${tuft(140, 150)}${tuft(70, 140)}${tuft(150, 76)}
    ${flower(60, 24, '#fff')}${flower(108, 96, '#fda4af')}${flower(24, 104, '#fff')}${flower(146, 46, '#c4b5fd')}${pebble(86, 22)}`),
  desert: tile(`<rect width="160" height="160" fill="#f3d68c"/>${blobs('#f8e3a9', '#e6c06e')}
    <path d="M0 96 Q40 86 80 96 T160 96" fill="none" stroke="#e2b85f" stroke-width="2.5"/>
    ${cactus(30, 70)}${cactus(130, 150)}${pebble(100, 40, '#d6b27a', '#92643a')}${pebble(60, 132, '#d6b27a', '#92643a')}
    <path d="M118 66 l6 -2 l2 4 l-5 2z" fill="#fff" opacity=".8"/>`),
  snow: tile(`<rect width="160" height="160" fill="#e8f3ff"/>${blobs('#ffffff', '#d4e6f8')}
    ${pine(36, 80)}${pine(130, 146)}${pine(118, 50)}
    <circle cx="70" cy="30" r="2" fill="#fff"/><circle cx="20" cy="140" r="2.5" fill="#fff"/><circle cx="96" cy="110" r="1.8" fill="#fff"/>
    <path d="M60 120 l4 0 M62 118 l0 4" stroke="#93c5fd" stroke-width="1.5"/>`),
  forest: tile(`<rect width="160" height="160" fill="#40593c"/>${blobs('#4a6845', '#344a31')}
    ${tuft(20, 80, '#2b3d28')}${tuft(96, 60, '#2b3d28')}${tuft(140, 150, '#2b3d28')}
    ${shroom(60, 30)}${shroom(120, 104)}${shroom(28, 120)}
    ${flower(146, 46, '#a78bfa')}${flower(86, 140, '#a78bfa')}
    <circle cx="100" cy="24" r="1.6" fill="#fde047" opacity=".8"/><circle cx="40" cy="60" r="1.4" fill="#fde047" opacity=".7"/>`),
  castle: tile(`<rect width="160" height="160" fill="#5b5566"/>
    <path d="M0 0 H80 V80 H0Z M80 80 H160 V160 H80Z" fill="#665f72"/>
    <path d="M0 40 H160 M0 80 H160 M0 120 H160 M40 0 V40 M120 0 V40 M0 40 M80 40 V80 M40 80 V120 M120 80 V120 M80 120 V160" stroke="#3f3a48" stroke-width="3"/>
    <path d="M18 100 L30 108 L26 116 L36 124" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M110 20 L120 28 L116 34" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="140" cy="140" r="2" fill="#fbbf24" opacity=".8"/>`),
};

const hero2 = {
  rabbit:  hero({ fur: '#ffffff', shade: '#e9d5ff', inner: '#fda4af', ear: 'rabbit' }),
  penguin: hero({ fur: '#334155', shade: '#1e293b', inner: '#ffffff', ear: 'none', belly: '#ffffff',
    face: `<ellipse cx="32" cy="31" rx="14" ry="12.5" fill="#fff"/>`, mouth: `<path d="M27.5 34.5 L36.5 34.5 L32 39.5Z" fill="#fb923c" ${S2}/>` }),
  bear:    hero({ fur: '#a16207', shade: '#713f12', inner: '#d6a26a', ear: 'bear', muzzle: '#f5deb3' }),
  dino:    hero({ fur: '#4ade80', shade: '#16a34a', inner: '#bbf7d0', ear: 'none', belly: '#fef9c3',
    behind: `<path d="M18 14 L20 3 L26 10 L32 0 L38 10 L44 3 L46 14Z" fill="#f97316" ${S}/>`,
    mouth: `<path d="M26 36 Q32 42 38 36Z" fill="#fff" ${S2}/>` }),
  unicorn: hero({ fur: '#fdf4ff', shade: '#e9d5ff', inner: '#f9a8d4', ear: 'cat',
    behind: `<path d="M50 18 Q60 30 54 44 Q50 34 46 30Z" fill="#a78bfa" ${S2}/>`,
    extra: `<path d="M16 24 Q12 10 26 8 Q22 14 25 19 Q19 18 16 24Z" fill="#f472b6" ${S2}/><path d="M28.5 11 L32 0 L35.5 11Z" fill="#fde047" ${S2}/><path d="M30 8 L34 6 M29.5 5 L33 3.5" stroke="#f59e0b" stroke-width="1.2"/>` }),
};

const SOURCES = {
  cat:   wrap(hero({ fur: '#fdba74', shade: '#f97316', inner: '#fda4af', ear: 'cat', extra: whiskers })),
  dog:   wrap(hero({ fur: '#d6a26a', shade: '#a16207', inner: '#92400e', ear: 'dog', muzzle: '#fff7ed' })),
  fox:   wrap(hero({ fur: '#fb923c', shade: '#c2410c', inner: '#fff7ed', ear: 'fox', muzzle: '#fff7ed', extra: whiskers })),
  panda: wrap(hero({ fur: '#ffffff', shade: '#cbd5e1', inner: '#f1f5f9', ear: 'panda', muzzle: '#ffffff', patches: true })),
  ...Object.fromEntries(Object.entries(hero2).map(([k, v]) => [k, wrap(v)])),
  zombie: wrap(zombie), bat: wrap(bat), ghost: wrap(ghost), skull: wrap(skull), ogre: wrap(ogre), dragon: wrap(dragon),
  scorpion: wrap(scorpion), mummy: wrap(mummy), snake: wrap(snake), snowman: wrap(snowman), wolf: wrap(wolf),
  icegiant: wrap(icegiant, '0 -4 64 68'), pumpkin: wrap(pumpkin), witch: wrap(witch, '-6 -4 72 68'), maou: wrap(maou, '0 -4 64 68'),
  gem1: wrap(gem('#60a5fa', '#2563eb')), gem2: wrap(gem('#4ade80', '#16a34a')), gem3: wrap(gem('#f472b6', '#db2777')),
  coin: wrap(coin), meat: wrap(meat), magnet: wrap(magnet), nuke: wrap(bomb), bomb: wrap(bomb),
  kunai, star: wrap(star), bolt,
  sword: wrap(sword), armor: wrap(armor), shoes: wrap(shoes), charm: wrap(charm), chest: wrap(chest), chestOpen: wrap(chestOpen, '0 -4 64 68'),
  ...Object.fromEntries(Object.entries(GROUNDS).map(([k, v]) => [`ground-${k}`, v])),
};
const FLASHABLE = ['zombie', 'bat', 'ghost', 'skull', 'ogre', 'dragon', 'scorpion', 'mummy', 'snake', 'snowman', 'wolf', 'icegiant', 'pumpkin', 'witch', 'maou'];

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
