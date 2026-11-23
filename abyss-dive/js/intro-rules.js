/**
 * ABYSS DIVE — 冒頭ストーリー（導入）のルール（純粋ロジック / DOM 非依存）
 *
 * ねらい:
 *  - 初回だけ、潜航の前に短い導入を出す。会話は短く、タップで進む／スキップできる。
 *  - 完了またはスキップでフラグを立て、以降は通常（タイトル）から始める。
 *    タイトルからは任意で再視聴できる（フラグは立てたまま）。
 *  - 資源・装備・既存セーブには一切触れない（独自キー INTRO_KEY のみ）。
 *
 * 原文（海底4万マイル）の順守:
 *  - ブラックホール・火星・4万マイルの種明かしは**入れない**。
 *  - 熱や異常進化を冒頭独白で**すべて説明しない**（地上が住めない、程度に留める）。
 *  - 父の生存を**断定しない**（信号は「父ごと消えた艇」から来る、まで）。
 *
 * 表示は描画側 intro.js。ここは状態機械と文言データだけを持つ。
 */

/** 視聴済みフラグの保存キー（localStorage: game_studio_abyss_intro）。 */
export const INTRO_KEY = 'abyss_intro';

/** 台本の版。文言を変えたら上げる（保存の互換に使える）。 */
export const INTRO_VERSION = 1;

/** 進んだ直後の入力ロック秒。連打・touch/mouse の二重発火で 2 コマ飛ばない。 */
export const INTRO_LOCK = 0.16;

/** 完了/スキップ後、通常（タイトル）へ戻るまでの待ち。次のタップが潜航開始に漏れない。 */
export const INTRO_CLOSE_T = 0.45;

/**
 * 台本。1 要素 = 1 コマ（1 タップ）。
 *   scene : 'base'（基地の生活）| 'signal'（受信）| 'depart'（出港）
 *   speaker: '' はナレーション。それ以外は話者名。
 *   text  : 表示文。
 */
export const INTRO_STEPS = Object.freeze([
  { scene: 'base',   speaker: '',           portrait: null,             text: '地上は、もう人が住める場所じゃない。' },
  { scene: 'base',   speaker: '',           portrait: null,             text: '人々は海の底へ降りて、基地で暮らしている。' },
  { scene: 'base',   speaker: '',           portrait: null,             text: 'エリーは、この基地で生まれた。ロボットたちに囲まれて、ひとり。' },
  { scene: 'base',   speaker: '',           portrait: null,             text: '今日も、資源さがしに出る。' },
  { scene: 'base',   speaker: 'エリー',     portrait: 'girl:neutral',   text: '今日も、はたらくか。' },
  { scene: 'base',   speaker: 'ponco MarkII', portrait: 'ponco:neutral', text: 'エリー。資源はまだ足りない。無茶はしないで。' },
  { scene: 'base',   speaker: 'エリー',     portrait: 'girl:smug',      text: 'わかってるって、ポンコ。' },
  { scene: 'signal', speaker: '',           portrait: null,             text: 'そのとき、端末が小さく鳴った。' },
  { scene: 'signal', speaker: 'エリー',     portrait: 'girl:surprised', text: '……受信？ こんなところで？' },
  { scene: 'signal', speaker: 'ponco MarkII', portrait: 'ponco:alert',  text: '規則正しい信号だ。それに、ずっと下から来ている。' },
  { scene: 'signal', speaker: 'ponco MarkII', portrait: 'ponco:alert',  text: 'この形……ずっと前に、事故で消えた艇のものだ。' },
  { scene: 'signal', speaker: 'エリー',     portrait: 'girl:sad',       text: '……お父さんの。' },
  { scene: 'signal', speaker: '',           portrait: null,             text: '見つかった、とはまだ言えない。それでもエリーは、操縦席へ向かう。' },
  { scene: 'depart', speaker: 'ponco MarkII', portrait: 'ponco:neutral', text: 'どこまで潜るつもりだ。' },
  { scene: 'depart', speaker: 'エリー',     portrait: 'girl:smug',      text: 'どこまでも。' },
  { scene: 'depart', speaker: '',           portrait: null,             text: '潜水艇は、はるか下の暗がりへ——。' },
]);

/**
 * 会話用の立ち絵（倉庫 bot-commander/assets/portraits の既存素材をコピー。
 * 発話者を立ち絵＋話者名で明示する。歩行/風景に置くスプライトとは別レイヤ）。
 * ナレーション（speaker ''）は portrait null。
 */
export const INTRO_PORTRAITS = Object.freeze({
  'girl:neutral':   'girl_neutral.webp',     // エリー（倉庫 portraits/GIRL、耳付きフードの胸上）
  'girl:smug':      'girl_smug.webp',
  'girl:surprised': 'girl_surprised.webp',
  'girl:sad':       'girl_sad.webp',
  'ponco:neutral':  'ponco_neutral.webp',    // ponco MarkII（倉庫 portraits/PONCO02、白青の全身）
  'ponco:alert':    'ponco_alert.webp',
});

/** 立ち絵キー → 実ファイル名（未知は null）。 */
export function portraitFile(key){
  if (key == null) return null;
  return INTRO_PORTRAITS[key] || null;
}

/** 台本のコマ数。 */
export function introTotal(){
  return INTRO_STEPS.length;
}

/**
 * 視聴済みフラグの保存ラッパ。load/save を注入する（node テストでは no-op にできる）。
 * 壊れた保存・欠けた保存は安全に「未視聴」として扱う。
 */
export function createIntroStore(opts){
  const load = (opts && opts.load) || (() => null);
  const save = (opts && opts.save) || (() => {});
  let data = load();
  if (data === null || data === undefined || typeof data !== 'object') data = null;
  return {
    seen(){
      return !!(data && data.seen === true);
    },
    markSeen(){
      data = { seen: true, v: INTRO_VERSION };
      save(data);
    },
    reset(){
      data = null;
      save(null);
    },
    version(){
      return (data && Number(data.v)) || 0;
    },
  };
}

/** 導入の状態機械。 */
export function createIntroState(){
  return {
    step: 0,
    t: 0,          // 現在のコマの経過秒（登場演出に使う）
    lock: 0,       // 入力ロック残り秒
    done: false,   // 最後まで見た / スキップした
    skipped: false,
    closeT: 0,     // done 後、通常へ戻るまでの残り秒
  };
}

/** 表示用の現在のコマ。step は範囲内へ丸める。 */
export function introStep(state){
  const i = Math.max(0, Math.min(INTRO_STEPS.length - 1, state.step | 0));
  return INTRO_STEPS[i];
}

/** 表示（描画側）へ渡すビュー。appear は 0..1 の登場度。 */
export function introView(state){
  const i = Math.max(0, Math.min(INTRO_STEPS.length - 1, state.step | 0));
  const s = INTRO_STEPS[i];
  const appear = Math.max(0, Math.min(1, state.t / 0.28));
  return {
    step: i,
    total: INTRO_STEPS.length,
    scene: s.scene,
    speaker: s.speaker,
    portrait: s.portrait || null,
    text: s.text,
    done: !!state.done,
    skipped: !!state.skipped,
    appear,
  };
}

/**
 * 1 コマ進める。ロック中／完了後は進まない（連打でスキップし過ぎない）。
 * 戻り: { advanced, done }
 */
export function advanceIntro(state){
  if (state.done) return { advanced: false, done: true };
  if (state.lock > 0) return { advanced: false, done: false };
  const last = INTRO_STEPS.length - 1;
  if (state.step >= last){
    /* 最後のコマでタップ → 完了 */
    state.done = true;
    state.closeT = INTRO_CLOSE_T;
    state.lock = INTRO_LOCK;
    return { advanced: true, done: true };
  }
  state.step += 1;
  state.t = 0;
  state.lock = INTRO_LOCK;
  return { advanced: true, done: false };
}

/** スキップ（既存プレイヤーも含め、いつでも飛ばせる）。 */
export function skipIntro(state){
  state.done = true;
  state.skipped = true;
  state.closeT = INTRO_CLOSE_T;
  state.lock = INTRO_LOCK;
  return { done: true };
}

/** 時間を進め、ロックと終了待ちを減らす。 */
export function tickIntro(state, dt){
  const d = Math.max(0, Number(dt) || 0);
  state.t += d;
  if (state.lock > 0) state.lock = Math.max(0, state.lock - d);
  if (state.done) state.closeT = Math.max(0, state.closeT - d);
  return state;
}

/** 通常画面（タイトル）へ引き渡してよいか。done 後、短い待ちが明けたら true。 */
export function introFinished(state){
  return !!state.done && state.closeT <= 0;
}
