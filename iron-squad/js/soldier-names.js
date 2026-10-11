// 兵士の命名システム（ランダムな名前生成）
// 人間：ファーストネーム・ファミリーネーム
// ニンジャ：ファミリーネームなし和名系統（ハンゾー、コタロウなど）
// 獣人：ファミリーネームなし種族風単一ネーム（ガルム、ゴウ、ミケなど）

/** v5.0.1: 男女は別々の名簿。重複なし。性別が曖昧な名前（ジル=ジルベールと女性名ジルの二重読み、クリス）は片方に寄せた。 */
export const MALE_GIVEN_NAMES = Object.freeze([
  'レオン', 'アルフレッド', 'エドガー', 'ローランド', 'エルンスト', 'キース', 'セドリック', 'アルヴィン',
  'クライヴ', 'ルーカス', 'マティアス', 'フェリックス', 'ダミアン', 'ヴィンセント', 'オスカー', 'ユーリ',
  'ギルバート', 'アーロン', 'サイラス', 'コンラッド', 'ディルク', 'ベルトラン', 'クラウス', 'ミハイル',
  'ヒューゴ', 'トリスタン', 'ヴァルター', 'ロベルト', 'マルク', 'ガブリエル', 'クリストフ', 'ノア'
]);
export const FEMALE_GIVEN_NAMES = Object.freeze([
  'レナ', 'エミリア', 'セシリア', 'クラリス', 'ミレーヌ', 'シルヴィア', 'エレナ', 'カリン',
  'ロザリア', 'アデレード', 'フローラ', 'ベアトリス', 'フィオナ', 'アイリス', 'ユリア', 'テレサ',
  'ソフィア', 'オリヴィア', 'ナディア', 'ヴァレリア', 'セレーネ', 'モニカ', 'リリアナ', 'ヒルダ',
  'アンナ', 'クロエ', 'クララ', 'ミラベル', 'セリーヌ', 'ルチア', 'ブリジット', 'カテリーナ', 'ジル'
]);
/** 互換用（男女の和集合）。 */
export const FIRST_NAMES = Object.freeze([...MALE_GIVEN_NAMES, ...FEMALE_GIVEN_NAMES]);

export const GENDER_IDS = Object.freeze(['male', 'female']);
export const isGenderId = value => value === 'male' || value === 'female';
/** 文字列キーから決定的に性別を決める（Math.random を消費しないので、乱数固定のテストを乱さない）。 */
export function rollGenderByKey(soldierClass = '', key = '') {
  let n = 2166136261;
  for (const ch of String(key)) { n ^= ch.charCodeAt(0); n = Math.imul(n, 16777619); }
  n = Math.imul(n ^ (n >>> 15), 2246822507); n = Math.imul(n ^ (n >>> 13), 3266489917);
  return rollGender(soldierClass, () => ((n ^ (n >>> 16)) >>> 0) / 4294967296);
}
/** 兵士の性別を決める。衛生兵は女性がやや多い。random は 0..1 を返す関数。 */
export function rollGender(soldierClass = '', random = Math.random) {
  const femaleChance = soldierClass === 'MEDIC' ? .65 : .35;
  return random() < femaleChance ? 'female' : 'male';
}

export const FAMILY_NAMES = Object.freeze([
  'アシュフォード', 'ミラー', 'ベルモンド', 'クローデル', 'ハミルトン', 'クロムウェル', 'ファルクナー', 'カーライル',
  'ラングレー', 'ヴァンス', 'ブラッドリー', 'ウェストコット', 'ヘイスティングス', 'ペンデルトン', 'アイアンサイド', 'ブラックウッド',
  'フォレスト', 'シルバーバーグ', 'ウィンターズ', 'オークランド', 'ホフマン', 'マイヤー', 'シュタイン', 'ブラント',
  'ワーグナー', 'ローゼンバーグ', 'フィッシャー', 'ケラー', 'ベッカー', 'リヒター', 'ハートマン', 'ランカスター',
  'バークレー', 'モントゴメリー', 'スターリング', 'ハイタワー', 'レッドメイン', 'ヴァレンティン', 'グレイヴス', 'ノーマン',
  'スタンレー', 'ボーフォート', 'エリオット', 'サマセット', 'クロウリー', 'ウォルシュ', 'ダヴェンポート', 'キングスレー'
]);

export const NINJA_NAMES_BY_GENDER = Object.freeze({
  male: ['ハンゾー', 'サスケ', 'コタロウ', 'サイゾウ', '影丸', 'ハヤテ', 'シデン', 'ゲンアン', 'クロバ', 'レン', 'フウマ', 'シラヌイ', 'ライゾウ', 'ジンジ', 'サク', 'ヤシャ', 'ハヤブサ', 'ムメイ', 'カムイ', 'ゲンジ', 'ジュウベエ', 'タンゾウ', 'ツキカゲ', 'キリガクレ'],
  female: ['オボロ', 'カスミ', 'カエデ', 'サヨ', 'チドリ', 'ホムラ', 'スイレン', 'ヨモギ', 'ユキカゼ', 'ツバキ', 'ヒバナ', 'アサギ', 'ミカヅキ', 'サクヤ', 'ナギ', 'フブキ']
});
export const NINJA_NAMES = Object.freeze([...NINJA_NAMES_BY_GENDER.male, ...NINJA_NAMES_BY_GENDER.female]);

export const BEAST_NAMES_BY_GENDER = Object.freeze({
  wolf: {
    male: ['灰尾', 'ロウ', '銀牙', 'ガルム', 'フェンリル', 'ファング', 'ウル', 'バルク', 'ハウル', 'ヴォルフ', 'シャドウ', 'シロウ', '牙丸'],
    female: ['グレイ', 'ルポ', 'ルーナ', 'シルヴァ', 'ヴェラ', 'ミスト']
  },
  bear: {
    male: ['ゴウ', '岩掌', '熊五郎', 'ベアール', 'バルー', 'ボリス', 'ゴンゾウ', 'タイガ', 'バロウ', 'ガウル', 'ダダン', 'オーソン', 'ゲン', '力丸'],
    female: ['ウルサ', 'ミーシャ', 'ブランカ', 'ベルタ']
  },
  cat: {
    male: ['クロ', 'ニャル', 'レオ', 'タマ', 'シアン', 'シロ', 'ベル'],
    female: ['ミケ', '鈴音', 'フェリス', 'シャノワ', 'ミャオ', 'リン', 'モモ', 'コハル']
  },
  fox: {
    male: ['琥珀', 'コン', 'フォックス', 'ギン', 'ハク', 'シノ', 'ヤコ'],
    female: ['灯', 'キツネビ', 'タマモ', 'ルナ', 'カグラ', 'クズハ', 'レンカ', 'アカネ']
  },
  bird: {
    male: ['鷹丸', 'ファルク', 'ハヤテ', 'ラプター', 'ホーク', 'ガルーダ', 'ソラ', 'シオン', 'ハヤブサ', 'トキ'],
    female: ['羽音', '青羽', 'ツバサ', 'ルリ', 'カナリア']
  },
  common: {
    male: ['バルク', 'ガルド', 'ロダン', 'クルト', 'ジン', 'ザック', 'レックス', 'キバ', 'ナハト', 'テオ', 'ロキ', 'ダスク', 'シグマ', 'ボア', 'クロード'],
    female: ['ラナ', 'ネリ', 'ミア', 'ノエル', 'ユラ', 'セラ']
  }
});
export const BEAST_NAMES = Object.freeze(Object.fromEntries(Object.entries(BEAST_NAMES_BY_GENDER).map(([k, v]) => [k, Object.freeze([...v.male, ...v.female])])));

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
  // 性別は呼び出し側が兵士の gender を渡す。未指定のときだけここで引く（seed があれば決定的）。
  const gender = isGenderId(options.gender) ? options.gender : rollGender(soldierClass, seed !== null ? seededRandom(seed) : Math.random);
  const usedSet = usedNames instanceof Set ? usedNames : (Array.isArray(usedNames) ? new Set(usedNames) : null);

  // ニンジャ：ファミリーネームなしの和名系統（ハンゾー、コタロウなど）
  if (soldierClass === 'NINJA' || soldierClass === 'ninja') {
    return pickUnique(NINJA_NAMES_BY_GENDER[gender], seed, usedSet);
  }

  // 獣人：ファミリーネームなし（種族ごとの単一ネーム）
  const beastSpecies = species || (soldierClass.startsWith('BEAST_') ? soldierClass.replace('BEAST_', '').toLowerCase() : null);
  if (beastSpecies) {
    const pool = (BEAST_NAMES_BY_GENDER[beastSpecies] || BEAST_NAMES_BY_GENDER.common)[gender];
    return pickUnique(pool, seed, usedSet);
  }

  // 人間（通常兵士）：ファーストネーム・ファミリーネーム
  let attempts = 0;
  let name = '';
  do {
    const firstSeed = seed !== null ? ((Number(seed) + attempts * 31) >>> 0) : null;
    const familySeed = seed !== null ? ((Number(seed) * 17 + attempts * 7 + 13) >>> 0) : null;
    const first = pickOne(gender === 'female' ? FEMALE_GIVEN_NAMES : MALE_GIVEN_NAMES, firstSeed);
    const family = pickOne(FAMILY_NAMES, familySeed);
    name = `${first}・${family}`;
    attempts++;
  } while (usedSet && usedSet.has(name) && attempts < 20);

  return name;
}

function seededRandom(seed) {
  let n = (Number(seed) * 2654435761) >>> 0;
  return () => { n = (n + 0x6D2B79F5) | 0; let t = Math.imul(n ^ (n >>> 15), 1 | n); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
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
      gender: soldier.gender,
      usedNames: existingNames
    });
  }
}

/** 隊長の名前づくり（男女の名簿は上の MALE_GIVEN_NAMES / FEMALE_GIVEN_NAMES）。 */
export function randomGivenName(gender = 'male', random = Math.random) {
  const pool = gender === 'female' ? FEMALE_GIVEN_NAMES : MALE_GIVEN_NAMES;
  return pool[Math.floor(random() * pool.length) % pool.length];
}
export function randomFamilyName(random = Math.random) {
  return FAMILY_NAMES[Math.floor(random() * FAMILY_NAMES.length) % FAMILY_NAMES.length];
}
