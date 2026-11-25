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
export const INTRO_VERSION = 4;

/** 進んだ直後の入力ロック秒。連打・touch/mouse の二重発火で 2 コマ飛ばない。 */
export const INTRO_LOCK = 0.16;

/** 完了/スキップ後、通常（タイトル）へ戻るまでの待ち。次のタップが潜航開始に漏れない。 */
export const INTRO_CLOSE_T = 0.45;

/**
 * 台本。1 要素 = 1 コマ（デモは自動進行＋タップ送り、会話はタップ送り）。
 *   scene  : 'demo_evo'|'demo_sun'|'demo_abyss'|'demo_base'（開始前デモ）
 *          | 'base'（基地の日常）| 'signal'（受信）| 'depart'（出港）
 *   speaker: '' はナレーション／デモ字幕。それ以外は話者名。
 *   text   : 表示文（\n で明示改行可）。
 *   auto   : >0 のとき指定秒で自動的に次のコマへ進む（開始前デモ用）。
 */
export const INTRO_STEPS = Object.freeze([
  /* --- ゲーム開始前デモ（世界観プロローグ） --- */
  { scene: 'demo_evo',   speaker: '',             portrait: null,             auto: 4.4, text: '2xxx年——人間以外のすべての生物が、\n原因不明のまま異常な進化を始め、海へと適応していった。' },
  { scene: 'demo_sun',   speaker: '',             portrait: null,             auto: 4.4, text: 'それから数十年。太陽が異常膨張を起こし、\n地球の表面は灼熱の星へと姿を変えた。' },
  { scene: 'demo_abyss', speaker: '',             portrait: null,             auto: 4.4, text: '太陽から離れて遠い宇宙へ逃れた人々。\nそして、海の底に築かれた基地へと降りた人々——。' },
  { scene: 'demo_base',  speaker: '',             portrait: null,             auto: 4.0, text: '生き残ったのは、深海の基地と、新しく生まれた海の生態系だけ。\nそこで育った少女・エリーの朝が、今日も始まる。' },
  /* --- 冒頭会話（エリー・ponco MarkII・Gem の日常 → 受信 → 出港） --- */
  { scene: 'base',       speaker: 'Gem',          portrait: 'gem:neutral',    text: 'ほらエリー、また溶接が乾く前に乗り込もうとして！ あと3分だけ待ちなさい。' },
  { scene: 'base',       speaker: 'エリー',       portrait: 'girl:smug',      text: 'えーっ、もう冷えてるってばジェム！ ほら、コンコンって叩いても平気だし！' },
  { scene: 'base',       speaker: 'Gem',          portrait: 'gem:neutral',    text: 'こら、叩かないの！ 昨日だって岩にこすって帰ってきたでしょ。ごはんもまだ半分残ってるんだから。' },
  { scene: 'base',       speaker: 'ponco MarkII', portrait: 'ponco:neutral',  text: '外圧シールの数値は正常。……もっとも、ジェムの言う通り食事は済ませた方がいい。' },
  { scene: 'base',       speaker: 'エリー',       portrait: 'girl:neutral',   text: 'むー、ポンコまでジェムの味方するんだもん。浅いとこでパーツ拾ったらすぐ戻るってば！' },
  { scene: 'base',       speaker: 'Gem',          portrait: 'gem:neutral',    text: 'まったく、誰に似たんだか……。ほら、携帯食、ポケットに入れときなさい。' },
  { scene: 'signal',     speaker: '',             portrait: null,             text: '——そのとき、作業台の通信端末が低く鳴った。' },
  { scene: 'signal',     speaker: 'エリー',       portrait: 'girl:surprised', text: 'ん？ なんだろ、この音。基地の定期連絡じゃないよね？' },
  { scene: 'signal',     speaker: 'ponco MarkII', portrait: 'ponco:alert',    text: '……待って。ノイズじゃない。ずっと下の方から、同じ間隔で信号が届いてる。' },
  { scene: 'signal',     speaker: 'Gem',          portrait: 'gem:neutral',    text: '下から？ ……やだ、ちょっと見せてポンコ。この識別コード……' },
  { scene: 'signal',     speaker: 'ponco MarkII', portrait: 'ponco:alert',    text: '一致した。……あのとき沈んだ艇の、緊急ビーコンだ。' },
  { scene: 'signal',     speaker: 'エリー',       portrait: 'girl:sad',       text: '……うそ。お父さんの……？' },
  { scene: 'signal',     speaker: 'Gem',          portrait: 'gem:neutral',    text: 'エリー、落ち着いて。……古い機械が勝手に鳴り出すことだってあるのよ。' },
  { scene: 'signal',     speaker: 'エリー',       portrait: 'girl:sad',       text: 'わかってる。……わかってるけど、行かなきゃ。行かないままなんて、いやだ！' },
  { scene: 'signal',     speaker: 'Gem',          portrait: 'gem:neutral',    text: '……はぁ。そういう顔をしたときのあんたは、もう止まらないのよね。' },
  { scene: 'depart',     speaker: 'Gem',          portrait: 'gem:neutral',    text: 'ポンコ。あの子、絶対に無茶するから……しっかり見ててあげてね。' },
  { scene: 'depart',     speaker: 'ponco MarkII', portrait: 'ponco:neutral',  text: '了解した、ジェム。……ハッチ開放。エリー、本当に行くんだね。' },
  { scene: 'depart',     speaker: 'エリー',       portrait: 'girl:smug',      text: 'うん！ 絶対、あの信号のところまで行くから。いってきます、ジェム！' },
  { scene: 'depart',     speaker: '',             portrait: null,             text: '潜水艇のライトが点り、二人ははるか下の暗がりへ滑り出した。' },
]);

/**
 * 会話用の立ち絵（発話者を立ち絵＋話者名で明示する。歩行/風景に置くスプライトとは別レイヤ）。
 * ナレーション（speaker ''）は portrait null。
 */
export const INTRO_PORTRAITS = Object.freeze({
  'girl:neutral':   'girl_neutral.webp',     // エリー（倉庫 portraits/GIRL、耳付きフードの胸上）
  'girl:smug':      'girl_smug.webp',
  'girl:surprised': 'girl_surprised.webp',
  'girl:sad':       'girl_sad.webp',
  'ponco:neutral':  'ponco_neutral.webp',    // ponco MarkII（倉庫 portraits/PONCO02、白青の全身）
  'ponco:alert':    'ponco_alert.webp',
  'gem:neutral':    'gem_neutral.webp',      // Gem（母親役の整備・工作ロボ、全身）
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
  const isDemo = /^demo_/.test(s.scene);
  const auto = s.auto > 0 ? s.auto : 0;
  const appearDur = isDemo ? 0.65 : 0.28;
  const appear = Math.max(0, Math.min(1, state.t / appearDur));
  const progress = auto > 0 ? Math.max(0, Math.min(1, state.t / auto)) : 0;
  return {
    step: i,
    total: INTRO_STEPS.length,
    scene: s.scene,
    isDemo,
    auto,
    progress,
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

/** 時間を進め、ロックと終了待ちを減らす。デモコマは auto 秒で自動的に次へ進む。 */
export function tickIntro(state, dt){
  const d = Math.max(0, Number(dt) || 0);
  state.t += d;
  if (state.lock > 0) state.lock = Math.max(0, state.lock - d);
  if (state.done) {
    state.closeT = Math.max(0, state.closeT - d);
  } else {
    const i = Math.max(0, Math.min(INTRO_STEPS.length - 1, state.step | 0));
    const s = INTRO_STEPS[i];
    if (s.auto > 0 && state.t >= s.auto) {
      if (i >= INTRO_STEPS.length - 1) {
        state.done = true;
        state.closeT = INTRO_CLOSE_T;
      } else {
        state.step = i + 1;
        state.t = 0;
      }
    }
  }
  return state;
}

/** 通常画面（タイトル）へ引き渡してよいか。done 後、短い待ちが明けたら true。 */
export function introFinished(state){
  return !!state.done && state.closeT <= 0;
}
