// 表示専用の名前。sim / unit / fx は書き換えず、戦没後も試合が終わるまで予約を残す。
// 名簿は設計 2-4 の順序。既存項目の削除・並べ替えは禁止（末尾追加だけ）。
export const ROBOT_NAMES = Object.freeze([
  'スピードスター', 'ガッツナックル', 'トッシンボーイ', 'ドカンマル', 'ガムシャラン', 'イチバンヤリ', 'ブレイズハート',
  'クールヘッド', 'ミマモリン', 'ジックリーノ', 'タテマモル', 'アンゼンダイイチ', 'ヨミスギ', 'シンチョウマル',
  'ピンホール', 'ワンショット', 'ネライウチ', 'ホシヨミ', 'サイレントアイ', 'トオメガネ', 'ヒトハリ',
  'ハイヨロコンデ', 'オトモスター', 'ミギウデ', 'リョウカイ', 'マッスグ', 'シタガイマル', 'チュウケンボルト',
  'ナンデモミナライ', 'ノビシロ', 'ハテナボット', 'マナビヤ', 'スクスク', 'メモメモ', 'キョウカラハジメ',
  'テッパン', 'ガンコイッテツ', 'ムカシカタギ', 'イツモドオリ', 'ネジマキ', 'ゼンマイジイ', 'コツコツ',
]);
export const NAME_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const matches = new WeakMap();
const hash = text => { let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
function matchOf(sim) {
  let m = matches.get(sim);
  if (!m) {
    let state = hash(`robot-names-v1:${sim.seed}:${sim.mission?.id || ''}`);
    // 名前専用 LCG。sim.rng は参照も呼び出しもしない。
    const next = n => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return Math.floor(state / 4294967296 * n); };
    const order = ROBOT_NAMES.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = next(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    m = { next, order, names: new Map(), used: new Set(), count: 0 };
    matches.set(sim, m);
  }
  return m;
}
/** deployUnit で明示 label の情報が残っている時に登録。識別情報はシムの外だけに保存。 */
export function registerRobotName(sim, u, explicitLabel = null) {
  if (!u || u.side !== 'ally' || u.human || u.object || u.launch || explicitLabel) return;
  const m = matchOf(sim);
  if (m.names.has(u.id)) return;
  const common = ROBOT_NAMES[m.order[m.count % ROBOT_NAMES.length]];
  const slots = NAME_LETTERS.length ** 2 * 99;
  let serial = m.next(slots), name;
  // 衝突時は有限の名前空間を順に調べる。ランダム再試行による無限ループを避ける。
  for (let i = 0; i < slots; i++, serial = (serial + 1) % slots) {
    const code = `${NAME_LETTERS[Math.floor(serial / (24 * 99))]}${NAME_LETTERS[Math.floor(serial / 99) % 24]}-${serial % 99 + 1}`;
    name = `${common}${code}`;
    if (!m.used.has(name)) { m.names.set(u.id, name); m.used.add(name); m.count++; return; }
  }
  throw new Error('ロボットの名前を使い切りました');
}
export const robotNameOf = (sim, u) => u ? matches.get(sim)?.names.get(u.id) || u.label || u.kind || '味方' : '味方';
/** 戦没済みでも fx の unit / by から名前を引ける。fx 自体は変更しない。 */
export const robotEventName = (sim, id, fallback = '味方') => matches.get(sim)?.names.get(id) || fallback;

export function splitRobotName(name) {
  const m = /^(.+?)([A-HJ-NP-Z]{2}-[1-9][0-9]?)$/.exec(String(name));
  return m && ROBOT_NAMES.includes(m[1]) ? { common: m[1], code: m[2], long: m[1].length > 6 } : null;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
/** 一般名称と型番を別要素にし、型番は省略しない。外部文字列は必ずエスケープ。 */
export function robotNameHtml(name) {
  const p = splitRobotName(name);
  return p ? `<span class="bc-robot-name${p.long ? ' long' : ''}"><span class="bc-robot-common">${esc(p.common)}</span> <span class="bc-robot-code">${p.code}</span></span>` : esc(name);
}
/** ヒント・トースト内の名前にも同じ分割を適用。 */
export function robotTextHtml(text) {
  return String(text).split(/([ァ-ヶー]+[A-HJ-NP-Z]{2}-[1-9][0-9]?)/g).map(robotNameHtml).join('');
}
