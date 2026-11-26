/**
 * ABYSS DIVE — ノンストップ無線会話（時間停止なし・操作中断なし / 純粋ロジック）
 *
 * 回廊の高速滑走中や新海域への初到達時に、ゲームの時間を一切止めずシームレスに
 * エリー・ponco MarkII・Gem の掛け合いを流す。
 *
 * ルール:
 *   - 発言中も時間を止めない（自動進行で次セリフへ移り、最後まで流れたら自然に閉じる）。
 *   - 1 度再生した会話 ID は専用キー（RADIO_KEY）へ既読保存し、再訪時に繰り返さない。
 *   - 序盤〜マントル上層の会話では物語後半のネタバレ語句を含めない（自動テストで担保）。
 */

export const RADIO_KEY = 'abyss_radio_seen_v1';

export const SPEAKERS = Object.freeze({
  ellie: Object.freeze({ id: 'ellie', name: 'エリー',       accent: '#ffd89a' }),
  ponco: Object.freeze({ id: 'ponco', name: 'ponco MarkII', accent: '#8fe6ff' }),
  gem:   Object.freeze({ id: 'gem',   name: 'Gem',          accent: '#b8f0a8' }),
});

/** シームレス無線会話スクリプト集（id → 行配列）。 */
export const RADIO_SCRIPTS = Object.freeze({
  trench_enter: Object.freeze([
    Object.freeze({ speaker: 'ellie', face: 'girl_surprised', text: 'うわっ、海底がパックリ割れてる！父さんの信号、この真下から強くなってるよ！', sec: 4.2 }),
    Object.freeze({ speaker: 'ponco', face: 'ponco_alert',    text: '海溝へ進入します。水圧が急上昇しています、慎重に降下してください。', sec: 3.8 }),
    Object.freeze({ speaker: 'gem',   face: 'gem_neutral',    text: 'あんた、無茶して船体を岩壁にぶつけんじゃないよ！危なかったらすぐ戻りな！', sec: 4.0 }),
  ]),
  confluence_enter: Object.freeze([
    Object.freeze({ speaker: 'ellie', face: 'girl_surprised', text: 'すごい……暗い穴を抜けたら、こんなに明るくて広い海が広がってる！', sec: 4.0 }),
    Object.freeze({ speaker: 'ponco', face: 'ponco_neutral',  text: '深海の植物群が自ら光って酸素を生み出しています。……信号はさらに下、床の裂け目の先です。', sec: 4.6 }),
  ]),
  abyss_corridor_down: Object.freeze([
    Object.freeze({ speaker: 'ponco', face: 'ponco_alert',    text: '警告。強力な下降海流を検知——このまま一気に大深度へ押し流されます！', sec: 3.8 }),
    Object.freeze({ speaker: 'ellie', face: 'girl_smug',      text: 'うわああっ、速っ！！でも止まらないで行こう、信号がどんどん近づいてる！', sec: 4.0 }),
    Object.freeze({ speaker: 'gem',   face: 'gem_neutral',    text: 'ちょっ、エリー！船がバラバラになるってば！……もう、しっかり捕まってなよ！', sec: 4.0 }),
    Object.freeze({ speaker: 'ponco', face: 'ponco_alert',    text: '深度計が通常の海溝領域を突破。単位をキロメートルへ切り替えます——地殻のさらに奥へ降下中。', sec: 4.6 }),
    Object.freeze({ speaker: 'ellie', face: 'girl_neutral',   text: '地球の下って、まだこんなに深い海が続いてるんだ……。', sec: 3.6 }),
    Object.freeze({ speaker: 'ponco', face: 'ponco_neutral',  text: '外気温と水圧が異常上昇しています。ですが……下方から、未知の青い光と多数の生体反応を検知しました。', sec: 4.8 }),
  ]),
  mantle_upper_enter: Object.freeze([
    Object.freeze({ speaker: 'ellie', face: 'girl_surprised', text: 'うそ……ここ、真っ暗じゃない！青と金色に光る海草の森みたい……！', sec: 4.2 }),
    Object.freeze({ speaker: 'ponco', face: 'ponco_neutral',  text: '信じられません。超高温の地殻深部で、熱や光をエネルギーに変えて生きる生態系が広がっています。', sec: 4.8 }),
    Object.freeze({ speaker: 'gem',   face: 'gem_neutral',    text: 'こんな底の底に生き物の楽園があるなんてね……。右に上昇海流もあるから、無理せず様子を見なよ。', sec: 4.6 }),
  ]),
});

export const RADIO_IDS = Object.freeze(Object.keys(RADIO_SCRIPTS));

/**
 * ノンストップ無線会話の状態機械。
 * io: { load(), save(obj) }（省略可・既読保存用）
 */
export function createRadioChat(io) {
  const load = (io && io.load) || (() => null);
  const save = (io && io.save) || (() => {});

  const seen = new Set();
  try {
    const raw = load();
    const arr = raw && Array.isArray(raw.ids) ? raw.ids : (Array.isArray(raw) ? raw : []);
    for (const id of arr) if (RADIO_SCRIPTS[id]) seen.add(id);
  } catch (e) { /* ignore broken save */ }

  let queue = [];
  let current = null;
  let elapsed = 0;

  function persist() {
    try { save({ v: 1, ids: RADIO_IDS.filter(id => seen.has(id)) }); } catch (e) { /* ignore */ }
  }

  function trigger(id, opts) {
    const lines = RADIO_SCRIPTS[id];
    if (!lines || !lines.length) return false;
    const force = !!(opts && opts.force);
    if (!force && seen.has(id)) return false;
    seen.add(id);
    persist();
    for (const ln of lines) queue.push({ ...ln, scriptId: id });
    if (!current) {
      current = queue.shift();
      elapsed = 0;
    }
    return true;
  }

  function tick(dt) {
    const d = Math.max(0, Number(dt) || 0);
    if (!current) return null;
    elapsed += d;
    if (elapsed >= (current.sec || 4.0)) {
      current = queue.length ? queue.shift() : null;
      elapsed = 0;
    }
    return view();
  }

  function view() {
    if (!current) return null;
    const dur = current.sec || 4.0;
    const fadeIn = Math.min(1, elapsed / 0.28);
    const fadeOut = Math.min(1, Math.max(0, (dur - elapsed) / 0.35));
    const alpha = Math.min(fadeIn, fadeOut);
    const sp = SPEAKERS[current.speaker] || SPEAKERS.ponco;
    return {
      scriptId: current.scriptId,
      speaker: sp.id,
      name: sp.name,
      accent: sp.accent,
      face: current.face,
      text: current.text,
      alpha,
      progress: Math.min(1, elapsed / dur),
    };
  }

  function clearQueue() {
    queue = [];
    current = null;
    elapsed = 0;
  }

  return {
    trigger,
    tick,
    view,
    clearQueue,
    isActive: () => !!current,
    hasSeen: (id) => seen.has(id),
    seenCount: () => seen.size,
  };
}
