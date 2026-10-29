// スマホゲーム工房のハブから起動するための入口。
// 試作本体は単独ページ（index.html と importmap）なので、そのページへ移動する。
export default {
  init() {
    window.location.assign(new URL('../index.html', import.meta.url).href);
  },
};
