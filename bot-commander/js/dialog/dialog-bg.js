// 会話の背景の名前 → 絵のファイルの道のり（ここが唯一の表）。DOM なし（テストから呼ぶ）。
// 台本の bg に書ける名前はここにある 13 こ（v1.0.0 で Codex gfx3 の 6 枚を足した）。画面に出すのは dialog-view.js。書き方は assets/dialog/README.md。
// 道のりは「ゲームフォルダ（bot-commander/）からの相対」。絵は WebP（幅 1080・縦長 1080×2340）。

export const BG_FILES = Object.freeze({
  hideout: 'assets/dialog/bg/hideout.webp',             // 隠れ家
  ruins_town: 'assets/dialog/bg/ruins_town.webp',       // 廃墟の町
  wasteland: 'assets/dialog/bg/wasteland.webp',         // 荒れ地
  junk_market: 'assets/dialog/bg/junk_market.webp',     // ガラクタ市
  factory_ruins: 'assets/dialog/bg/factory_ruins.webp', // 工場跡
  night_camp: 'assets/dialog/bg/night_camp.webp',       // 夜の野営
  alien_nest: 'assets/dialog/bg/alien_nest.webp',       // 異星生物の巣
  // v1.0.0（Codex gfx3 B_DIALOG_BG2）。いつも読み込む一覧には入れない（見た時にブラウザが覚える。前の 6 枚と同じ）
  battlefield_day: 'assets/dialog/bg/battlefield_day.webp', // 昼の戦場
  hangar: 'assets/dialog/bg/hangar.webp',               // 格納庫
  briefing: 'assets/dialog/bg/briefing.webp',           // 作戦会議
  coast: 'assets/dialog/bg/coast.webp',                 // 海岸
  sky: 'assets/dialog/bg/sky.webp',                     // 雲海（空）
  deepsea: 'assets/dialog/bg/deepsea.webp',             // 深海
});

export const BG_NAMES = Object.freeze(Object.keys(BG_FILES));

/** 知っている背景の名前か */
export const isBgName = name => typeof name === 'string' && Object.prototype.hasOwnProperty.call(BG_FILES, name);

/** 名前 → 絵の URL。知らない名前・null は null（背景なし） */
export function bgUrl(name) {
  return isBgName(name) ? new URL('../../' + BG_FILES[name], import.meta.url).href : null;
}
