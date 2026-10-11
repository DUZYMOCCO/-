/**
 * ダダサバイバーもどき トゥーン調SVGアート
 * 太い輪郭・2段セル塗り・大きな目。SVG文字列は起動時に一度だけ data URI 化し、
 * 以降は <div> の background-image として再利用する（毎フレームSVGを解釈させない）。
 */

const O = '#2a1a3a'; // 輪郭色
const S = `stroke="${O}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const S2 = `stroke="${O}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;

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
function hero({ fur, shade, inner, ear, muzzle, patches, extra = '' }) {
  let back = '', front = '';
  if (ear === 'cat') back = `<path d="M15 20 L17 4 L29 13Z" fill="${fur}" ${S}/><path d="M18.5 16 L19.5 8.5 L25 13Z" fill="${inner}"/>
    <path d="M49 20 L47 4 L35 13Z" fill="${fur}" ${S}/><path d="M45.5 16 L44.5 8.5 L39 13Z" fill="${inner}"/>`;
  if (ear === 'fox') back = `<path d="M14 22 L12 0 L29 12Z" fill="${fur}" ${S}/><path d="M17 16 L16 6 L24 12Z" fill="${inner}"/>
    <path d="M50 22 L52 0 L35 12Z" fill="${fur}" ${S}/><path d="M47 16 L48 6 L40 12Z" fill="${inner}"/>`;
  if (ear === 'panda') back = `<circle cx="16" cy="13" r="6.5" fill="${O}"/><circle cx="48" cy="13" r="6.5" fill="${O}"/>`;
  if (ear === 'dog') front = `<ellipse cx="13.5" cy="27" rx="6" ry="11.5" fill="${inner}" ${S} transform="rotate(18 13.5 27)"/>
    <ellipse cx="50.5" cy="27" rx="6" ry="11.5" fill="${inner}" ${S} transform="rotate(-18 50.5 27)"/>`;
  const patch = patches ? `<ellipse cx="24" cy="30" rx="6.5" ry="7.5" fill="${O}" transform="rotate(20 24 30)"/><ellipse cx="40" cy="30" rx="6.5" ry="7.5" fill="${O}" transform="rotate(-20 40 30)"/>` : '';
  const muz = muzzle ? `<ellipse cx="32" cy="37" rx="7.5" ry="5" fill="${muzzle}"/><path d="M30 33.5 L34 33.5 L32 35.8Z" fill="${O}" ${S2}/>` : `<path d="M30.6 33.6 L33.4 33.6 L32 35.2Z" fill="#f472b6" ${S2}/>`;
  const eyes = patches
    ? `${animeEye(24.5, 30.5, '#111')}${animeEye(39.5, 30.5, '#111')}`
    : `${animeEye(24.5, 30)}${animeEye(39.5, 30)}`;
  return `${back}
    <ellipse cx="22" cy="60" rx="5" ry="3.2" fill="${shade}" ${S}/><ellipse cx="42" cy="60" rx="5" ry="3.2" fill="${shade}" ${S}/>
    <ellipse cx="32" cy="52" rx="13" ry="10" fill="${fur}" ${S}/>
    <ellipse cx="32" cy="54" rx="7" ry="5.5" fill="${muzzle || inner}" opacity=".9"/>
    <path d="M19 43 Q32 50 45 43 L45.5 47.5 Q32 54 18.5 47.5Z" fill="#ef4444" ${S2}/>
    <path d="M40 47 L47 56 L42 55.5Z" fill="#dc2626" ${S2}/>
    ${shadedCircle('hh', 32, 27, 19, fur, shade)}
    ${front}${patch}${eyes}${blush}${muz}${catMouth}${extra}`;
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
  <path d="M26 44 L26 58 M38 44 L38 58 M22 50 L42 50 M22 55 L42 55" ${S} stroke-width="5"/>
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
  <path d="M20 22 L29 26 M44 22 L35 26" ${S} stroke-width="3.5"/>
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

/* ---------- じめん（トゥーンのくさはら） ---------- */
const flower = (x, y, c) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-4" rx="2.6" ry="3.6" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="2.2" fill="#facc15"/></g>`;
const tuft = (x, y) => `<path d="M${x - 5} ${y} Q${x - 4} ${y - 7} ${x - 1} ${y - 9} M${x} ${y} Q${x} ${y - 8} ${x + 1} ${y - 12} M${x + 5} ${y} Q${x + 4} ${y - 6} ${x + 2} ${y - 9}" fill="none" stroke="#4d9a3a" stroke-width="2.2" stroke-linecap="round"/>`;
const ground = wrap(`
  <rect width="160" height="160" fill="#7fd05e"/>
  <ellipse cx="40" cy="44" rx="34" ry="22" fill="#8edc6b"/>
  <ellipse cx="124" cy="118" rx="40" ry="24" fill="#8edc6b"/>
  <ellipse cx="128" cy="30" rx="18" ry="10" fill="#72c352"/>
  <ellipse cx="34" cy="128" rx="22" ry="12" fill="#72c352"/>
  ${tuft(20, 80)}${tuft(96, 60)}${tuft(140, 150)}${tuft(70, 140)}${tuft(150, 76)}
  ${flower(60, 24, '#fff')}${flower(108, 96, '#fda4af')}${flower(24, 104, '#fff')}${flower(146, 46, '#c4b5fd')}
  <ellipse cx="86" cy="22" rx="6" ry="4" fill="#cbd5e1" stroke="#64748b" stroke-width="1.5"/>
  <ellipse cx="84.5" cy="20.5" rx="2.4" ry="1.2" fill="#fff" opacity=".7"/>`, '0 0 160 160');

const SOURCES = {
  cat:   wrap(hero({ fur: '#fdba74', shade: '#f97316', inner: '#fda4af', ear: 'cat', extra: whiskers })),
  dog:   wrap(hero({ fur: '#d6a26a', shade: '#a16207', inner: '#92400e', ear: 'dog', muzzle: '#fff7ed' })),
  fox:   wrap(hero({ fur: '#fb923c', shade: '#c2410c', inner: '#fff7ed', ear: 'fox', muzzle: '#fff7ed', extra: whiskers })),
  panda: wrap(hero({ fur: '#ffffff', shade: '#cbd5e1', inner: '#f1f5f9', ear: 'panda', muzzle: '#ffffff', patches: true })),
  zombie: wrap(zombie), bat: wrap(bat), ghost: wrap(ghost), skull: wrap(skull), ogre: wrap(ogre), dragon: wrap(dragon),
  gem1: wrap(gem('#60a5fa', '#2563eb')), gem2: wrap(gem('#4ade80', '#16a34a')), gem3: wrap(gem('#f472b6', '#db2777')),
  coin: wrap(coin), meat: wrap(meat), magnet: wrap(magnet), nuke: wrap(bomb), bomb: wrap(bomb),
  kunai, star: wrap(star), bolt, ground,
};
const FLASHABLE = ['zombie', 'bat', 'ghost', 'skull', 'ogre', 'dragon', 'cat', 'dog', 'fox', 'panda'];

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
