/**
 * ABYSS DIVE — 控えめな環境 BGM（v1.12.0）
 *
 * kenshi-next から借用した 1 曲（忘却の遺構 track05_ruins）を、既存の WebAudio のマスターへ
 * 薄く混ぜてループさせるだけの小さなモジュール。役割は「自己主張しない環境音」。
 *   - 音量は環境音・着弾より十分下（volume 既定 0.07）。
 *   - M のミュートは既存のマスター（AU.mute）が担うので、ここでは何もしない（一緒に切れる）。
 *   - 初回タッチのブラウザ制限: AU.resume()（＝ユーザー操作）のあとの ensure() でだけ開始する。
 *   - 読み込み・再生の失敗はゲームをブロックしない（blocked=true にするだけ）。
 *   - ハブ帰還（destroy）で停止。ページ非表示で減衰、復帰で戻す。
 *   - モード別の曲や新規作曲はしない。1 曲だけ。
 *
 * DOM が無い環境（node --test）では何もしない no-op として安全に読み込める。
 */

export const MUSIC_URL = (() => {
  try { return new URL('../assets/track05_ruins.m4a', import.meta.url).href; }
  catch (e) { return '../assets/track05_ruins.m4a'; }
})();

export function createMusic(opts){
  const o = opts || {};
  const getCtx = o.getCtx || (() => null);
  const getMaster = o.getMaster || (() => null);
  const volume = (o.volume === undefined) ? 0.07 : o.volume;
  const url = o.url || MUSIC_URL;

  let buf = null, src = null, gain = null;
  let loading = false, blocked = false, ducked = false;

  function startSrc(){
    if (src) return;
    const ctx = getCtx(), master = getMaster();
    if (!ctx || !master || !buf) return;
    try {
      src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      gain = ctx.createGain();
      gain.gain.value = ducked ? 0 : volume;
      src.connect(gain); gain.connect(master);
      src.start(0);
    } catch (e) {
      src = null; gain = null; blocked = true;   // 再生できなくてもゲームは続ける
    }
  }

  /** AU.resume()（＝ユーザー操作）のあとに呼ぶ。初回だけ読み込んでループ再生する。 */
  function ensure(){
    const ctx = getCtx(), master = getMaster();
    if (!ctx || !master || src) return;
    if (buf){ startSrc(); return; }
    if (loading || blocked) return;
    loading = true;
    if (typeof fetch !== 'function'){ loading = false; blocked = true; return; }
    try {
      fetch(url)
        .then(r => (r && r.ok) ? r.arrayBuffer() : Promise.reject(new Error('HTTP ' + (r && r.status))))
        .then(ab => new Promise((res, rej) => { ctx.decodeAudioData(ab, res, rej); }))
        .then(data => { buf = data; loading = false; startSrc(); })
        .catch(() => { loading = false; blocked = true; });   // 非ブロッキング
    } catch (e) {
      loading = false; blocked = true;
    }
  }

  function stop(){
    try { if (src){ src.stop(0); src.disconnect(); } } catch (e) { /* noop */ }
    try { if (gain) gain.disconnect(); } catch (e) { /* noop */ }
    src = null; gain = null;
  }

  /** ページ非表示などの減衰（復帰で戻す）。 */
  function setDuck(on){
    ducked = !!on;
    const ctx = getCtx();
    if (gain && ctx) { try { gain.gain.setTargetAtTime(on ? 0 : volume, ctx.currentTime, 0.3); } catch (e) {} }
  }

  /* ページ非表示で減衰、復帰で戻す。 */
  let onVisible = null;
  if (typeof document !== 'undefined' && document.addEventListener){
    onVisible = () => { if (document.hidden) setDuck(true); else if (src) setDuck(false); };
    document.addEventListener('visibilitychange', onVisible);
  }

  /** ハブ帰還・破棄で必ず呼ぶ（鳴り続けない・リスナーを残さない）。 */
  function destroy(){
    stop();
    if (onVisible && typeof document !== 'undefined' && document.removeEventListener){
      document.removeEventListener('visibilitychange', onVisible);
      onVisible = null;
    }
  }

  function state(){
    return { loaded: !!buf, playing: !!src, loading, blocked, volume, ducked };
  }

  return { ensure, stop, destroy, setDuck, state };
}
