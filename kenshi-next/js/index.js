// スマホゲーム工房のハブから起動するための入口。
// 本体は単独ページ（index.html と importmap）なので、そのページへ移動する。
// kenshi-proto と同じ形（ハブのコンテナには載らず、ページを移る）。
export default {
  init() {
    window.location.assign(new URL('../index.html', import.meta.url).href);
  },
};
