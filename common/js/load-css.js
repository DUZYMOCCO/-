/**
 * ゲームが自分の CSS を起動時に読み込むための共通ヘルパー。
 * 同じ URL は一度だけ <link> を挿入（重複なし）し、全て読み込み完了してから resolve する（初回描画のチラつき防止）。
 * 失敗しても起動は止めない（オフラインでは SW のキャッシュから読まれる）。
 */
const pending = new Map();

export function loadCss(urls) {
  return Promise.all([].concat(urls).map(url => {
    const href = new URL(url, document.baseURI).href;
    if (pending.has(href)) return pending.get(href);
    const p = new Promise(resolve => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.gameCss = '1';
      link.onload = () => resolve(true);
      link.onerror = () => { console.warn('CSS load failed:', href); resolve(false); };
      document.head.appendChild(link);
    });
    pending.set(href, p);
    return p;
  }));
}
