// 兵士の命名システム（ランダムな名前生成）
// 人間：ファーストネーム・ファミリーネーム
// ニンジャ：ファミリーネームなし和名系統（ハンゾー、コタロウなど）
// 獣人：ファミリーネームなし種族風単一ネーム（ガルム、ゴウ、ミケなど）

export const FIRST_NAMES = Object.freeze([
  // 男性名・中性名
  'レオン', 'アルフレッド', 'エドガー', 'ローランド', 'ジル', 'キース', 'セドリック', 'アルヴィン',
  'クライヴ', 'ルーカス', 'マティアス', 'フェリックス', 'ダミアン', 'ヴィンセント', 'オスカー', 'ユーリ',
  'ギルバート', 'アーロン', 'サイラス', 'コンラッド', 'ディルク', 'ベルトラン', 'クラウス', 'ミハイル',
  'ヒューゴ', 'トリスタン', 'ヴァルター', 'ロベルト', 'マルク', 'ガブリエル', 'クリス', 'ノア',
  // 女性名・中性名
  'レナ', 'エミリア', 'セシリア', 'クラリス', 'ミレーヌ', 'シルヴィア', 'エレナ', 'カリン',
  'ロザリア', 'アデレード', 'フローラ', 'ベアトリス', 'フィオナ', 'アイリス', 'ユリア', 'テレサ',
  'ソフィア', 'オリヴィア', 'ナディア', 'ヴァレリア', 'セレーネ', 'モニカ', 'リリアナ', 'ヒルダ',
  'アンナ', 'クロエ', 'クララ', 'ミラベル', 'セリーヌ', 'ルチア', 'ブリジット', 'カテリーナ'
]);

export const FAMILY_NAMES = Object.freeze([
  'アシュフォード', 'ミラー', 'ベルモンド', 'クローデル', 'ハミルトン', 'クロムウェル', 'ファルクナー', 'カーライル',
  'ラングレー', 'ヴァンス', 'ブラッドリー', 'ウェストコット', 'ヘイスティングス', 'ペンデルトン', 'アイアンサイド', 'ブラックウッド',
  'フォレスト', 'シルバーバーグ', 'ウィンターズ', 'オークランド', 'ホフマン', 'マイヤー', 'シュタイン', 'ブラント',
  'ワーグナー', 'ローゼンバーグ', 'フィッシャー', 'ケラー', 'ベッカー', 'リヒター', 'ハートマン', 'ランカスター',
  'バークレー', 'モントゴメリー', 'スターリング', 'ハイタワー', 'レッドメイン', 'ヴァレンティン', 'グレイヴス', 'ノーマン',
  'スタンレー', 'ボーフォート', 'エリオット', 'サマセット', 'クロウリー', 'ウォルシュ', 'ダヴェンポート', 'キングスレー'
]);

export const NINJA_NAMES = Object.freeze([
  'ハンゾー', 'サスケ', 'コタロウ', 'サイゾウ', '影丸', 'ハヤテ', 'シデン', 'オボロ',
  'ゲンアン', 'クロバ', 'レン', 'キリガクレ', 'フウマ', 'カスミ', 'カエデ', 'サヨ',
  'シラヌイ', 'チドリ', 'ライゾウ', 'ジンジ', 'サク', 'ホムラ', 'ヤシャ', 'ハヤブサ',
  'ムメイ', 'カムイ', 'スイレン', 'ゲンジ', 'ジュウベエ', 'タンゾウ', 'シノビ', 'ツキカゲ'
]);

export const BEAST_NAMES = Object.freeze({
  wolf: [
    '灰尾', 'ロウ', '銀牙', 'ガルム', 'フェンリル', 'ファング', 'ウル', 'バルク', 'ハウル', 'ヴォルフ',
    'シャドウ', 'グレイ', 'ルポ', 'シロウ', '牙丸'
  ],
  bear: [
    'ゴウ', '岩掌', '熊五郎', 'ベアール', 'ウルサ', 'バルー', 'ボリス', 'ゴンゾウ', 'タイガ', 'バロウ',
    'ガウル', 'ダダン', 'オーソン', 'ゲン', '力丸'
  ],
  cat: [
    'ミケ', '鈴音', 'クロ', 'フェリス', 'シャノワ', 'ニャル', 'レオ', 'タマ', 'ミャオ', 'シアン',
    'リン', 'モモ', 'ベル', 'シロ', 'コハル'
  ],
  fox: [
    '琥珀', '灯', 'コン', 'フォックス', 'キツネビ', 'ギン', 'タマモ', 'ルナ', 'ハク', 'カグラ',
    'シノ', 'ヤコ', 'クズハ', 'レンカ', 'アカネ'
  ],
  bird: [
    '羽音', '鷹丸', '青羽', 'ファルク', 'ハヤテ', 'ラプター', 'ホーク', 'ツバサ', 'カラス', 'ガルーダ',
    'ソラ', 'シオン', 'ルリ', 'ハヤブサ', 'トキ'
  ],
  common: [
    'バルク', 'ガルド', 'ロダン', 'クルト', 'ジン', 'ザック', 'レックス', 'キバ', 'ナハト', 'テオ',
    'ロキ', 'ダスク', 'シグマ', 'ボア', 'クロード'
  ]
});

/**
 * 兵種・種族に応じたランダムな名前を生成
 * @param {Object} options
 * @param {string} [options.soldierClass] 兵種キー ('NINJA', 'HEAVY', etc.)
 * @param {string} [options.species] 獣人種族 ('wolf', 'bear', 'cat', 'fox', 'bird')
 * @param {number|string} [options.seed] 決定的なシード（省略時はランダム）
 * @param {Set<string>|Array<string>} [options.usedNames] 既に使用されている名前一覧
 * @returns {string} 兵士名
 */
export function generateSoldierName(options = {}) {
  const { soldierClass = '', species = null, seed = null, usedNames = null } = options;
  const usedSet = usedNames instanceof Set ? usedNames : (Array.isArray(usedNames) ? new Set(usedNames) : null);

  // ニンジャ：ファミリーネームなしの和名系統（ハンゾー、コタロウなど）
  if (soldierClass === 'NINJA' || soldierClass === 'ninja') {
    return pickUnique(NINJA_NAMES, seed, usedSet);
  }

  // 獣人：ファミリーネームなし（種族ごとの単一ネーム）
  const beastSpecies = species || (soldierClass.startsWith('BEAST_') ? soldierClass.replace('BEAST_', '').toLowerCase() : null);
  if (beastSpecies) {
    const pool = BEAST_NAMES[beastSpecies] || BEAST_NAMES.common;
    return pickUnique(pool, seed, usedSet);
  }

  // 人間（通常兵士）：ファーストネーム・ファミリーネーム
  let attempts = 0;
  let name = '';
  do {
    const firstSeed = seed !== null ? ((Number(seed) + attempts * 31) >>> 0) : null;
    const familySeed = seed !== null ? ((Number(seed) * 17 + attempts * 7 + 13) >>> 0) : null;
    const first = pickOne(FIRST_NAMES, firstSeed);
    const family = pickOne(FAMILY_NAMES, familySeed);
    name = `${first}・${family}`;
    attempts++;
  } while (usedSet && usedSet.has(name) && attempts < 20);

  return name;
}

function pickOne(arr, seed = null) {
  if (!arr || arr.length === 0) return '';
  const idx = seed !== null ? (Math.abs(Math.floor(seed)) % arr.length) : Math.floor(Math.random() * arr.length);
  return arr[idx];
}

function pickUnique(arr, seed = null, usedSet = null) {
  if (!arr || arr.length === 0) return '';
  if (!usedSet) return pickOne(arr, seed);
  
  for (let i = 0; i < arr.length; i++) {
    const candidate = pickOne(arr, seed !== null ? (seed + i) : null);
    if (!usedSet.has(candidate)) return candidate;
  }
  return pickOne(arr, seed);
}

/**
 * 旧セーブデータや未命名の兵士名（例: 兵士#1）を正規の名前に移行
 */
export function migrateSoldierName(soldier, existingNames = null) {
  if (!soldier) return;
  const currentName = soldier.name || '';
  if (/^兵士#\d+$/.test(currentName) || !currentName.trim()) {
    soldier.name = generateSoldierName({
      soldierClass: soldier.soldierClass,
      species: soldier.species,
      usedNames: existingNames
    });
  }
}
