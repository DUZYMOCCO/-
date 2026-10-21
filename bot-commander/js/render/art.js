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


/* ===== v0.2.0 ミッション用 ===== */

/** ツギハギ号（スカベンジャー）: 大きな暗いリベット打ちの丸い頭（全高の約6割）・青く光る大きな丸い目2つ・細いアンテナ・ケーブル・小さな体。
 *  ユーザーの設定画 ref/scavenger/scavenger_concept_01.jpg が基準。commander は頭の上に小さな黄色い灯り。 */
function scav(commander) {
  const metal = '#4a5059', metalShade = '#2a2e35', glow = '#5fd4ff';
  const rivets = [14, 19.5, 25, 32, 39, 44.5, 50].map((x, i) => `<circle cx="${x}" cy="${i === 0 || i === 6 ? 29.5 : i === 1 || i === 5 ? 31.2 : 32}" r="1.15" fill="#8b929c" ${SW(0.7)}/>`).join('');
  const eye = (x) => `<circle cx="${x}" cy="23" r="7.2" fill="#0d1118" ${S2}/>
    <circle cx="${x}" cy="23" r="5.4" fill="${glow}" opacity=".35"/>
    <circle cx="${x}" cy="23" r="4.2" fill="${glow}"/>
    <circle cx="${x}" cy="23" r="2.2" fill="#d9f6ff"/>
    <circle cx="${x - 1.8}" cy="21" r="1.1" fill="#fff"/>`;
  const lamp = commander ? `<circle cx="32" cy="3.6" r="3" fill="#ffd166" ${S2}/>` : '';
  return `
  <ellipse cx="32" cy="61.5" rx="15" ry="2.6" fill="#000" opacity=".28"/>
  <path d="M22 56 V60 H28 M42 56 V60 H36" ${SW(3.2)} fill="none"/><path d="M22 56 V60 H28 M42 56 V60 H36" stroke="#6b7280" stroke-width="1.6" fill="none"/>
  <path d="M15 44 Q9 49 12 54" ${SW(3.4)} fill="none"/><path d="M15 44 Q9 49 12 54" stroke="#6b7280" stroke-width="1.6" fill="none"/>
  <path d="M49 44 L56 47 L58 52" ${SW(3.4)} fill="none"/><path d="M49 44 L56 47 L58 52" stroke="#6b7280" stroke-width="1.6" fill="none"/>
  <path d="M56 51 L60 54 M58 50 L61 51" stroke="#ffd166" stroke-width="1.6" stroke-linecap="round"/>
  ${shadedBox('sb', 19, 41, 26, 16, 5, '#6b5a45', '#433829')}
  <rect x="24" y="45" width="9" height="6" rx="1.4" fill="#2b2f38" ${S2}/><circle cx="37.5" cy="48" r="2.2" fill="#ffb347" ${S2}/>
  <path d="M21 39 Q14 42 18 47" stroke="#c0392b" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M43 39 Q51 41 47 46" stroke="#2f6fb0" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M25 8 Q22 3 18 1.5" ${SW(1.6)} fill="none"/><circle cx="18" cy="1.8" r="1.8" fill="${glow}" ${SW(0.9)}/>
  <path d="M39 8 Q43 4 47 3.5" ${SW(1.6)} fill="none"/><circle cx="47" cy="3.5" r="1.8" fill="#ffb347" ${SW(0.9)}/>
  ${lamp}
  ${shadedCircle('sh', 32, 23, 19.5, metal, metalShade)}
  <path d="M12.8 29 Q32 35 51.2 29" fill="none" stroke="${O}" stroke-width="1.6"/>
  ${rivets}
  <path d="M20 9.5 Q32 4.8 44 9.5" fill="none" stroke="#6b7280" stroke-width="1.2" stroke-dasharray="1.5 2.2"/>
  ${eye(24.5)}${eye(39.5)}`;
}

/** PONCO02（戦闘用）: 丸いフォルムの白・青・赤の三色、暗いバイザーの目、腕の短い銃 */
function ponco(commander) {
  const crest = commander ? `<path d="M27 9.5 L32 1 L37 9.5 Q32 7.5 27 9.5Z" fill="#ffd166" ${S2}/>` : `<path d="M41 9 L45 3.5" ${SW(2)}/><circle cx="45.4" cy="3.2" r="2" fill="#e74c3c" ${S2}/>`;
  return `
  <ellipse cx="32" cy="61.5" rx="16" ry="2.8" fill="#000" opacity=".26"/>
  <rect x="21" y="50" width="9" height="9" rx="3.5" fill="#2f6fb0" ${S2}/><rect x="34" y="50" width="9" height="9" rx="3.5" fill="#2f6fb0" ${S2}/>
  <path d="M19 60.5 Q19 56 25 56 Q31 56 31 60.5Z" fill="#e5e7eb" ${S2}/><path d="M33 60.5 Q33 56 39 56 Q45 56 45 60.5Z" fill="#e5e7eb" ${S2}/>
  ${shadedBox('pb', 18, 36, 28, 17, 8, '#f4f6f8', '#c3cad3')}
  <path d="M24 44 H40" stroke="#e74c3c" stroke-width="3" stroke-linecap="round"/>
  <circle cx="32" cy="44" r="2.6" fill="#2f6fb0" ${S2}/>
  <circle cx="15.5" cy="43" r="4.6" fill="#2f6fb0" ${S2}/>
  <path d="M45 40 H57 Q60 40 60 43.5 Q60 47 57 47 H45Z" fill="#3b4250" ${S2}/><circle cx="59.5" cy="43.5" r="1.4" fill="#7df9ff"/>
  ${crest}
  ${shadedCircle('ph', 32, 23, 15, '#f4f6f8', '#c3cad3')}
  <path d="M19 21 Q32 14.5 45 21 L44.4 29 Q32 25 19.6 29Z" fill="#1b2230" ${S2}/>
  <circle cx="26.5" cy="23.6" r="2.3" fill="#7df9ff"/><circle cx="37.5" cy="23.6" r="2.3" fill="#7df9ff"/>
  <path d="M17 18 Q20 11 26 9" stroke="#2f6fb0" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M47 18 Q44 11 38 9" stroke="#e74c3c" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
}

/** 異星生物（巡回）: 動物と機械の融合。肉の膨らみ＋埋め込まれた金属板、不揃いに光る目、虫やカニのようなとげの脚、光る口 */
function alien(commander) {
  const flesh = '#8a3c55', fleshShade = '#552236', metal = '#3b3f46', glow = '#ffb347';
  const leg = (x1, y1, x2, y2, x3, y3) => `<path d="M${x1} ${y1} Q${x2} ${y2} ${x3} ${y3}" ${SW(3.6)} fill="none"/><path d="M${x1} ${y1} Q${x2} ${y2} ${x3} ${y3}" stroke="#4a2433" stroke-width="2" fill="none"/><path d="M${x3} ${y3} l${x3 > 32 ? 2 : -2} 3" ${SW(1.6)}/>`;
  const spikes = [[18, 26, 14, 17], [25, 21, 23, 12], [33, 20, 34, 10], [41, 22, 45, 13], [47, 28, 53, 21]].map(([a, b, c, d]) => `<path d="M${a - 2} ${b + 1} L${c} ${d} L${a + 2.5} ${b}Z" fill="#2e3036" ${S2}/>`).join('');
  const crown = commander ? `<path d="M28 13 Q32 6 36 13" stroke="${glow}" stroke-width="2" fill="none"/>` : '';
  return `
  <ellipse cx="32" cy="61" rx="24" ry="3" fill="#000" opacity=".3"/>
  ${leg(20, 44, 8, 46, 5, 59)}${leg(24, 46, 16, 53, 14, 61)}${leg(44, 44, 56, 46, 59, 59)}${leg(40, 46, 48, 53, 50, 61)}
  ${spikes}${crown}
  <path d="M10 38 Q9 22 24 20 Q32 16 41 20 Q56 22 54 38 Q55 50 40 50 Q32 54 24 50 Q9 50 10 38Z" fill="${fleshShade}" ${S}/>
  <path d="M13 36 Q12 24 25 22.5 Q32 19.5 40 22.5 Q51 24 51 34 Q46 44 32 44 Q17 44 13 36Z" fill="${flesh}"/>
  <path d="M19 27 Q24 24 29 27 L27 33 Q22 34 19 31Z" fill="${metal}" ${S2}/><circle cx="21.5" cy="29" r=".9" fill="#9aa1ab"/><circle cx="26" cy="28" r=".9" fill="#9aa1ab"/>
  <path d="M39 24 L47 27 L45 33 L38 31Z" fill="${metal}" ${S2}/>
  <path d="M15 41 Q20 39 22 43" stroke="#c76a86" stroke-width="1.4" fill="none" opacity=".8"/><path d="M44 42 Q48 40 50 43" stroke="#c76a86" stroke-width="1.4" fill="none" opacity=".8"/>
  <circle cx="31" cy="30" r="4.6" fill="#1a0f14" ${S2}/><circle cx="31" cy="30" r="3.2" fill="${glow}"/><circle cx="32" cy="29" r="1.1" fill="#fff6d6"/>
  <circle cx="37.5" cy="34.5" r="2.4" fill="#1a0f14" ${SW(1.2)}/><circle cx="37.5" cy="34.5" r="1.5" fill="${glow}"/>
  <circle cx="24.5" cy="36" r="1.9" fill="#1a0f14" ${SW(1.1)}/><circle cx="24.5" cy="36" r="1.1" fill="#ffd166"/>
  <circle cx="42" cy="29.5" r="1.4" fill="#ffd166" ${SW(0.8)}/>
  <path d="M22 44 Q32 51 42 44 Q38 48.5 32 48.8 Q26 48.5 22 44Z" fill="#ff7a1a" ${S2}/>
  <path d="M25 45.5 L26.5 48 M29 46.6 L29.8 49 M34 46.6 L33.4 49 M38.5 45.6 L37.2 48" stroke="#fff3c4" stroke-width="1.2" stroke-linecap="round"/>`;
}

/** 回収ポイント（ガラクタの山）。v=0/1 で形を変える。empty は掘りつくした跡 */
function salvagePile(v, empty) {
  if (empty) return wrap(`<ellipse cx="32" cy="50" rx="24" ry="7" fill="#3a3326" ${S2}/><path d="M18 49 L24 46 M36 51 L44 47" stroke="#6b6250" stroke-width="2" stroke-linecap="round"/>`);
  const tire = `<circle cx="${v ? 44 : 20}" cy="44" r="8" fill="#22252b" ${S2}/><circle cx="${v ? 44 : 20}" cy="44" r="3.4" fill="#4b5160" ${SW(1)}/>`;
  return wrap(`
  <ellipse cx="32" cy="54" rx="27" ry="6" fill="#000" opacity=".25"/>
  <path d="M6 54 Q10 34 24 30 Q34 22 44 30 Q58 36 58 54Z" fill="#5d5547" ${S}/>
  <path d="M10 52 Q14 38 25 34 Q34 28 42 34 Q52 38 54 50Z" fill="#7a705e"/>
  ${tire}
  <rect x="${v ? 14 : 34}" y="34" width="14" height="11" rx="1.5" fill="#a0723c" ${S2} transform="rotate(${v ? -12 : 10} ${v ? 21 : 41} 40)"/>
  <path d="M${v ? 30 : 26} 22 L${v ? 40 : 18} 46" ${SW(3.4)}/><path d="M${v ? 30 : 26} 22 L${v ? 40 : 18} 46" stroke="#9aa1ab" stroke-width="1.8"/>
  <path d="M28 38 L34 31 L39 37Z" fill="#5f7d8c" ${S2}/>
  <circle cx="${v ? 26 : 46}" cy="47" r="2" fill="#ffd166" ${SW(0.9)}/>`);
}

/** 脱出口（黄色と黒の縞の丸いハッチ＋信号弾の柱） */
function hatch() {
  const stripes = Array.from({ length: 12 }, (_, i) => { const a0 = i * 30 * Math.PI / 180, a1 = (i * 30 + 15) * Math.PI / 180; const p = (a, r) => `${48 + Math.cos(a) * r} ${62 + Math.sin(a) * r * 0.55}`; return `<path d="M${p(a0, 30)} L${p(a1, 30)} L${p(a1, 22)} L${p(a0, 22)}Z" fill="#121418"/>`; }).join('');
  return wrap(`
  <ellipse cx="48" cy="64" rx="34" ry="19" fill="#000" opacity=".3"/>
  <ellipse cx="48" cy="62" rx="30" ry="16.5" fill="#f5c400" ${S}/>
  ${stripes}
  <ellipse cx="48" cy="62" rx="21" ry="11.5" fill="#3b4250" ${S}/>
  <ellipse cx="48" cy="61" rx="15" ry="8" fill="#2a2f38" ${S2}/>
  <path d="M38 61 H58 M48 55 V67" stroke="#5b6472" stroke-width="2.4"/>
  <path d="M70 58 V14" ${SW(3.2)}/><path d="M70 58 V14" stroke="#d1d5db" stroke-width="1.4"/>
  <circle cx="70" cy="12" r="6" fill="#ff5a36" ${S2}/><circle cx="70" cy="12" r="3" fill="#ffe0a3"/>`, '0 0 96 96');
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
  return out;
}
