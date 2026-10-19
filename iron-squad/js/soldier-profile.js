// 個人記録の人物プロフィール（性格・趣味・家族構成・仲の良い同僚）。
// 兵士の id だけから決定的に作る純粋関数。セーブには何も足さない。
import {genderOfSoldier} from './soldier-names.js?v=334';

/** FNV-1a (32bit)。文字列 → 符号なし整数 */
export function hashString(text) {
  let h = 0x811c9dc5;
  const s = String(text);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
/** 種を変えながら 0..1 を返す小さな乱数（mulberry32） */
export function seededUnit(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const PERSONALITIES = [
  'おだやかで、怒ったところを見た者がいない', 'まじめ一筋。約束の時間に必ず十分前に来る', '声が大きく、笑い声は陣の端まで届く',
  '心配性で、出発前に荷物を三回数える', 'のんびり屋。急げと言われても歩幅が変わらない', 'こわがりだが、仲間が危ないと真っ先に走る',
  '負けず嫌い。訓練の的当てで引き分けても悔しがる', '世話焼きで、新入りの靴ひもまで直してやる', '口数は少ないが、頼まれ事は断らない',
  'おしゃべり好き。話が長くて、いつも夕飯が冷める', '楽天家。雨でも「虹が出るぞ」と言う', '几帳面で、武器の手入れ帳をつけている',
  '義理がたく、借りた銅貨も忘れずに返す', 'あわてん坊。よく左右の靴をはき違える', '食いしん坊。配給の日だけ目が冴える',
  '照れ屋で、ほめられると兜を目深にかぶる', 'さっぱりした性格。昨日の失敗はもう忘れている', '好奇心旺盛で、知らない道を見ると曲がりたがる',
  '慎重派。橋はたたいてから渡る', '人なつっこく、野良猫にまで挨拶する', '頑固者。一度決めた作戦はなかなか曲げない',
  '涙もろい。出征の歌で毎回泣く', '冗談好きで、場をなごませる名人', '朝に強く、起床の鐘より早く目を覚ます',
  '寝ぼすけ。点呼の直前まで夢の中', '礼儀正しく、鍛冶屋にも深々と頭を下げる', '勘が鋭く、天気の変わり目を言い当てる',
  '見栄っぱり。新品の盾をいつも磨いている', 'やさしい。傷ついた小鳥を懐に入れて歩いた', '努力家。みんなが寝たあとも素振りをしている',
  '強がりだが、暗い夜道は少し苦手', '陽気な歌い手。行軍中はだいたい鼻歌', '倹約家。財布のひもが岩のように固い',
  '落ち着いた聞き上手。相談役にされがち'
];

export const HOBBIES = [
  '野の花を集めて押し花にすること', '焚き火で焼きりんごを作ること', '星座を覚えて夜番で数えること',
  '小さな木彫りの動物を作ること', '釣り。ただし釣れた試しは少ない', '笛を吹くこと。まだ二曲しか吹けない',
  '保存食の味くらべ', '旅先の地図を自分で描き写すこと', '手紙を書くこと。故郷に月に一通', '詩を作ること。たまに隊長にも読ませたがる',
  'ボードゲーム。酒場では連戦連敗', '朝の散歩で珍しい石を拾うこと', '料理。スープの味には自信がある', '草笛と口笛の練習',
  '剣の型を一人で磨くこと', '愛用の盾にこっそり絵を描くこと', '洗濯。日なたの匂いが好き', '砂時計や歯車など小さな道具集め',
  '薬草の名前を覚えること', '雲の形から動物を見つけること', '旅芸人の真似。手品は五割成功', '日記をつけること。毎日三行だけ',
  'コインを指で弾いて遊ぶこと', 'パン焼き。野営のかまどで試行錯誤', '馬や荷車の車輪をなでて点検すること', '釣り糸と毛針を自作すること',
  '木の実拾い。ポケットはいつも満杯', '子ども向けの昔話を語ること', '古い軍歌を集めること', '陣の隅で畑を耕すこと',
  '朝焼けを眺めながらのお茶', '編み物。仲間の手袋を編んでやる', '竹とんぼのような手作りおもちゃ', '星の見える丘を探して歩くこと'
];

/** {sp}=配偶者（妻/夫）。only:'beast' は獣人だけ、省略は全員 */
export const FAMILIES = [
  {t: '両親と妹が故郷の村で暮らしている'}, {t: '一人っ子。祖母に育てられた'}, {t: '{sp}と幼い息子が故郷で待っている'},
  {t: '{sp}と幼い娘が故郷で待っている'}, {t: '兄が三人。末っ子で、いつも使いっ走り'}, {t: '姉が二人。頭が上がらない'},
  {t: '祖父の営む粉ひき小屋を継ぐはずだった'}, {t: '両親は宿屋を営み、弟が手伝っている'}, {t: '兄弟が多く、にぎやかな大家族'},
  {t: '年の離れた弟が一人。毎月仕送りをしている'}, {t: '父は元兵士。昔話をよく聞かされた'}, {t: '母ひとり子ひとり。手紙は欠かさない'},
  {t: '双子の妹がいて、別の隊で働いている'}, {t: '叔父夫婦の牧場で育った'}, {t: '家族は猫が一匹だけ（家の留守番）'},
  {t: '祖母と二人暮らし。毎年薬草茶が届く'}, {t: '{sp}は村の薬草師。子どもは三人'}, {t: '父は鍛冶屋、母は織物屋の家に生まれた'},
  {t: '孤児院育ち。そこの子たちが家族'}, {t: '従兄弟が何人も同じ軍に入っている'}, {t: '{sp}との間に、まもなく子が生まれる'},
  {t: '妹の結婚式に出るため、休暇を貯めている'}, {t: '実家は漁村。兄が舟を継いだ'}, {t: '祖父母と両親、兄と暮らす七人家族'},
  {t: '父の形見の短い剣を持ち歩いている'}, {t: '旅の一座で育ち、座長が親代わり'}, {t: '山の麓の村に両親と羊が十二頭'},
  {t: 'おおかみの群れで育った。兄弟姉妹は十匹', only: 'beast'}, {t: '一族の長老に育てられ、山奥の里が故郷', only: 'beast'},
  {t: '里には{sp}と子どもたちが待っている', only: 'beast'}
];

export const RELATIONS = [
  '同じ村の出身', '訓練の相棒', '酒場の飲み仲間', '同じ日に入隊した', '野営でいつも隣の天幕', '食事の当番がいつも同じ',
  '互いに命を助けた仲', '釣りに誘い合う仲', '休憩ではいつも一緒にいる', '故郷の話で盛り上がる', '歌をいっしょに歌う', '賭けごとの勝敗でもめる好敵手',
  '先輩にあたる', '後輩にあたる', 'ひとつの毛布を分け合った', '朝の素振りを競う仲'
];

const SPECIES_ID = {wolf: 'wolf', bear: 'bear', cat: 'cat', fox: 'fox', bird: 'bird'};
function isBeast(soldier) {
  if (soldier?.species && SPECIES_ID[soldier.species]) return true;
  return /^BEAST_/.test(String(soldier?.soldierClass || ''));
}

/** その兵士だけの固定の語り。同じ id なら必ず同じ結果。 */
export function soldierProfileBase(soldier) {
  const id = String(soldier?.id ?? '');
  const rnd = seededUnit(hashString(`profile|${id}`));
  const pick = list => list[Math.floor(rnd() * list.length) % list.length];
  const sp = genderOfSoldier(soldier) === 'female' ? '夫' : '妻';
  const beast = isBeast(soldier);
  const families = FAMILIES.filter(f => !f.only || (f.only === 'beast' && beast));
  return {
    personality: pick(PERSONALITIES),
    hobby: pick(HOBBIES),
    family: pick(families).t.replaceAll('{sp}', sp)
  };
}

/** 自分と相手の組み合わせで決まる「相性」。順序に依らない（A→B と B→A は同じ値）。 */
export function pairAffinity(idA, idB) {
  const [a, b] = [String(idA), String(idB)].sort();
  return hashString(`pair|${a}|${b}`);
}

/** 仲間の中でいちばん相性の値が高い者を同僚にする。生存者の変動で変わりうる。 */
export function pickColleague(soldier, mates) {
  const candidates = (mates || []).filter(m => m && !m.dead && String(m.id) !== String(soldier?.id));
  if (!candidates.length) return null;
  let best = null, bestScore = -1;
  for (const m of candidates) {
    const score = pairAffinity(soldier.id, m.id);
    if (score > bestScore || (score === bestScore && String(m.id) < String(best.id))) { best = m; bestScore = score; }
  }
  const relation = RELATIONS[Math.floor(seededUnit(bestScore)() * RELATIONS.length) % RELATIONS.length];
  return {soldier: best, name: best.name, relation};
}

export const NO_COLLEAGUE_TEXT = 'まだ打ち解けた同僚はいない';

/** 表示用: {personality, hobby, family, colleague(文字列) , colleagueInfo} */
export function buildSoldierProfile(soldier, mates, {withColleague = true} = {}) {
  const base = soldierProfileBase(soldier);
  let colleagueInfo = null, colleague = '';
  if (withColleague) {
    colleagueInfo = pickColleague(soldier, mates);
    colleague = colleagueInfo ? `${colleagueInfo.name}（${colleagueInfo.relation}）` : NO_COLLEAGUE_TEXT;
  }
  return {...base, colleague, colleagueInfo};
}

/** 死線覚醒スキルの効果文。コードが実際に適用する数値項目（recalcSoldierStats）だけから作る。 */
export function describeDeathlineEffect(sk) {
  if (!sk) return '';
  const pct = v => `${Math.round(v * 100)}%`;
  const bits = [];
  const all = sk.allStatsMultBonus || 0;
  if (sk.hpMultBonus || all) bits.push(`最大HP +${pct((sk.hpMultBonus || 0) + all)}`);
  if (sk.atkMultBonus || all) bits.push(`ATK +${pct((sk.atkMultBonus || 0) + all)}`);
  if (sk.defMultBonus || all) bits.push(`DEF +${pct((sk.defMultBonus || 0) + all)}`);
  if (sk.speedMultBonus) bits.push(`移動速度 +${pct(sk.speedMultBonus)}`);
  if (sk.rangeMultBonus) bits.push(`射程 +${pct(sk.rangeMultBonus)}`);
  if (sk.healMultBonus) bits.push(`回復力 +${pct(sk.healMultBonus)}`);
  if (sk.bonusCrit) bits.push(`クリティカル率 +${sk.bonusCrit}%`);
  if (sk.dodgeBonus) bits.push(`回避 +${sk.dodgeBonus}%`);
  if (sk.atkSpeedBonus) bits.push(`攻撃速度 +${sk.atkSpeedBonus}%`);
  if (sk.rescueSpeedMult) bits.push(`蘇生の再使用時間 ${sk.rescueSpeedMult}倍速`);
  if (sk.regenPct) bits.push(`毎秒最大HPの${sk.regenPct}%回復`);
  const reduce = (sk.dmgReduction || 0) + Math.floor((sk.bonusBlock || 0) * 0.3);
  if (reduce) bits.push(`被ダメージ -${reduce}%`);
  if (sk.lowHpGuard) bits.push(`HP35%以下で被ダメージ半減・移動速度 +${sk.lowHpSpeedPct || 0}%`);
  return bits.join('、');
}
