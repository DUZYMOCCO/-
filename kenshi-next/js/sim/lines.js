// 気絶・瀕死・食われる時・助けられた時のセリフ。気絶と起きた時は data/lines_gm1/lines.json（v3）の
// knocked_out / wake_up を写したもの（tools で作り直せる）。乱数は使わず id と刻みのハッシュで選ぶ。
import { makeEvent } from './data.js';
import { emitBark } from './narrative_text.js';

export const KO_LINES = {
 "drifter": [
  "…水筒を…奪うな…",
  "懐の…僅かな金を…",
  "岩陰で…野垂れ死にか…",
  "誰も…通りかからん…",
  "…血が…砂を吸っていく…",
  "寒い…風が…染みる…",
  "目が…もう開かない…",
  "息が…途切れ…そう…"
 ],
 "bandit": [
  "腹が…減って…",
  "奪ったパンを…よこせ…",
  "俺の…小銭袋が…",
  "誰か…何か…食わせて…",
  "…骨が…軋む…",
  "胃が…引きちぎれる…",
  "死にたく…ねえよ…",
  "目が…霞んで…"
 ],
 "dust_bandit": [
  "砂が…口に…",
  "掠め取った金を…離すか…",
  "この金袋は…俺のもんだ…",
  "喉が…焼ける…",
  "…仲間は…見捨てたか…",
  "砂漠に…埋もれる…",
  "腹の穴から…血が…",
  "意識が…遠く…"
 ],
 "cannibal": [
  "ニク…噛め…ない…",
  "オレの…ニク…渡さん…",
  "ホネ…離す…な…",
  "ア…アタマ…痛い…",
  "…腹が…裂けた…",
  "暗い…寒い…",
  "喰われる…オレが…",
  "チ…止まらん…"
 ],
 "ghoul": [
  "ギ…グ…ア…",
  "ニク…オレ…ノ…",
  "カネ…ハナサ…ヌ…",
  "ノド…カワク…",
  "…シヌ…ヤダ…",
  "チ…ナガレ…ル…",
  "メ…ミエ…ナイ…",
  "ウグ…ズブ…ズ…"
 ],
 "trader": [
  "…誰か…荷を…",
  "俺の…金袋を…離すな…",
  "積荷だけは…奪うな…",
  "用心棒…どこだ…",
  "助けてくれ…死ぬ…",
  "傷口を…塞いでくれ…",
  "砂利に…血が…滲む…",
  "意識が…途切れる…"
 ],
 "slave": [
  "…置いて…いかないで…",
  "隠した銀貨…取らないで…",
  "パンの欠片を…離さない…",
  "首輪が…喉に…食い込む…",
  "誰か…助けて…",
  "もう…叩かないで…",
  "足が…動かないよ…",
  "寒い…冷たい泥が…"
 ],
 "mercenary": [
  "懐の…前金を…渡すか…",
  "この愛剣だけは…離さん…",
  "血が…抜けていく…",
  "…割に合わん…死地だ…",
  "誰か…止血帯を…",
  "視界が…赤く染まる…",
  "俺の…首を…売るな…",
  "息が…喉で詰まる…"
 ],
 "guard_lantern_council": [
  "…まだ…持ち場が…",
  "ぐ…血が…止まらん…",
  "持ち場を…離れるな…",
  "隊長…助けて…",
  "手当の…銀貨を…渡すな…",
  "昇進が…消える…",
  "暗い…灯火が…消える…",
  "息が…もう…続かん…"
 ]
};

export const WAKE_LINES = {
 "drifter": [
  "うう…頭がズキズキする。まだ息があるのか…。",
  "生きてる…よかった。荷物は…やっぱり盗られたか。",
  "立ち上がれ…ここで倒れっぱなしだと灰狼の餌だ。",
  "添え木を当てなきゃ歩けん…木の枝を探すか。",
  "ひどい目に遭ったぜ…だが命があれば何とでもなる。",
  "水筒に少しだけ水が残ってる…喉を湿らせよう。",
  "服がボロボロだ。次の宿駅まで耐えられるかねえ。",
  "痛む足を引きずってでも、前へ進むしかない。"
 ],
 "bandit": [
  "う…生きてる…腹の虫はまだ鳴いてやがるな。",
  "頭が割れそうに痛え…荷物はどうなった？",
  "起き上がれ…泥を舐めてでも生き残るんだ。",
  "奴らは去ったか…パンの屑くらい落ちてないか？",
  "骨が痛むが、まだ歩ける…砦へ戻らなきゃ。",
  "死んだふりをしてやり過ごせたのか…助かった。",
  "手当ての布もねえ…服を破いて縛るしかねえな。",
  "腹が減りすぎて、起き上がるだけで目眩がする。"
 ],
 "dust_bandit": [
  "うう…頭をカチ割られたかと思ったぜ。",
  "生きてるな…財布の中身は無事か！？",
  "くそっ、カモにしてやられた…屈辱だぜ！",
  "起き上がれ。野盗が地べたを舐めてたら商売あがったりだ。",
  "傷口がズキズキ痛む…添え木を縛り直せ。",
  "あの野郎、手配書を回して必ず探し出してやる。",
  "武器を拾え！ まだ追いつけるかもしれん！",
  "立ち上がれ！ 借りは倍にして返してやるのが掟だ！"
 ],
 "cannibal": [
  "ウウ…獲物はどこだ？ 逃げられたか！？",
  "まだ生きてる…腹が減って狂いそうだ。",
  "起き上がれ！ 肉を追わねば飢え死にする！",
  "傷口から血が…舐めて塞ぐしかない。",
  "棍棒を拾え！ 逃げた獲物の足跡を追うぞ！",
  "頭が割れそうだが、肉への執念で立つ！",
  "あの肉め…次は必ず生け捕りにして吊るす！",
  "仲間を呼べ！ 狩りをやり直すぞ！"
 ],
 "ghoul": [
  "ウ…ウ…イキテル…ニク…",
  "メ…アケタ…マダ…ハイズレル…",
  "キズ…ナメテ…オキアガル…",
  "アタマ…ユレル…デモ…タツ…",
  "ニオイ…マダ…チカクニ…アル…",
  "ツメ…トイデ…ツギノ…エモノ…",
  "ハイズリ…ダセ…シニタクナイ…",
  "グルル…マダ…オワラナイ…"
 ],
 "trader": [
  "うう…頭が痛い…荷物は無事か！？",
  "生きてる…よかった。財布の中身はどうなった？",
  "痛む身体を起こせ…店を開け直さなきゃ破産だ。",
  "ひどい目に遭った…だが命があれば再起できる。",
  "添え木を当ててくれ…歩けなきゃ行商に出られん。",
  "あいつらめ、いつか必ず衛兵に突き出してやる。",
  "商品は奪われたが、隠し財産までは気づかれまい。",
  "立ち上がれ。荒野の商人はこれくらいで挫けんよ。"
 ],
 "slave": [
  "う…生きてる…またあの過酷な採掘の朝が来るのか…。",
  "身体中が痛くて起き上がれない…でも立たなきゃ打たれる…。",
  "首輪はまだついている…悪夢は終わらないんだな…。",
  "血を拭え…看守に見つかったらサボリとみなされる…。",
  "石を拾え…作業を続けなきゃ飯を抜かれちまう…。",
  "倒れてる間に誰も助けてくれなかった…当たり前か…。",
  "足の痛みをこらえて立ち上がれ…生き延びるんだ…。",
  "いつか…いつか必ず自由を掴み取ってやるんだ…"
 ],
 "mercenary": [
  "うう…生きてるな。雇い主はどうなった？",
  "頭が割れそうに痛え…だが骨は折れてなさそうだ。",
  "起き上がれ。傭兵がいつまでも転がってられるか。",
  "傷口の手当てを急げ。止血帯をしっかり巻け。",
  "あの敵、タダ者じゃなかったぜ…次は油断せん。",
  "添え木を当てて立ち上がれ。まだ戦いは終わってない。",
  "武器の無事を確認しろ。商売道具を失くしたら終わりだ。",
  "身体中が軋むが、契約期間中は倒れてられんぜ。"
 ],
 "guard_lantern_council": [
  "うう…頭が割れそうだ。当直はどうなった？",
  "生きてるな…まだ巡回報告書を書いてないぞ。",
  "装備の無事を確認しろ。官給品を失くしたら減給だ。",
  "立ち上がれ。衛兵が倒れていては示しがつかん。",
  "添え木を当てろ…まだ勤務時間は残っている。",
  "あの不届き者め、指名手配書を回してやる。",
  "応急手当を済ませたら追撃部隊を編成しろ。",
  "身体中が軋むが、サボるわけにはいかん。"
 ]
};

// 生きたまま食われている時の短いうめき（research/abduction_recruit.md §6。乾いた冗談は使わない）。
export const EATEN_LINES = ['…脚が…', 'やめ…', 'やめてくれ…', '俺の…腕…', '見るな…見ないで…', '…まだ…生きて…る…'];
export const RESCUE_LINES = ['…まだ…生きてる…のか', '…助かった…のか', 'あんた…なんで…'];

const SPEAKER_BY_ROLE = {
  merchant: 'trader',
  caravan_guard: 'mercenary',
  thief: 'bandit',
  raider: 'dust_bandit',
  raider_boss: 'dust_bandit',
  cannibal: 'cannibal',
  cannibal_chief: 'cannibal',
  ghoul: 'ghoul',
  slave: 'slave',
};

export function speakerOf(actor) {
  if (!actor || actor.faction === 'beast') return null;
  if (actor.role && SPEAKER_BY_ROLE[actor.role]) return SPEAKER_BY_ROLE[actor.role];
  if (actor.faction === 'player') return 'drifter';
  if (actor.faction === 'guard') return 'guard_lantern_council';
  if (actor.faction === 'bandit') return 'bandit';
  return 'drifter';
}

export function hashPick(list, a, b) {
  let h = (Math.imul((a | 0) + 0x9e37, 0x85ebca6b) ^ Math.imul((b | 0) + 0x7f4a, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f) >>> 0;
  return list[(h ^ (h >>> 16)) % list.length];
}

function nearSquad(state, actor) {
  if (actor.faction === 'player') return true;
  const p = state.actors.find((e) => e.id === state.playerId);
  if (!p) return true;
  return (actor.x - p.x) ** 2 + (actor.z - p.z) ** 2 <= 1600;
}

// kind: 'ko' | 'dying' | 'wake' | 'eaten' | 'rescue'
export function lineFor(actor, kind, tick) {
  if (kind === 'eaten') return hashPick(EATEN_LINES, actor.id, tick);
  if (kind === 'rescue') return hashPick(RESCUE_LINES, actor.id, tick);
  const sp = speakerOf(actor);
  if (!sp) return null;
  const table = kind === 'wake' ? WAKE_LINES : KO_LINES;
  const list = table[sp] || table.drifter;
  return hashPick(list, actor.id, tick + (kind === 'dying' ? 7 : 0));
}

export function koLine(state, actor, events, kind) {
  if (!events || !nearSquad(state, actor)) return null;
  const lineKind = kind || 'ko';
  const bark = lineKind === 'ko' ? emitBark(state, actor, 'ko') : null;
  const text = bark || lineFor(actor, lineKind, state.tick);
  if (!text) return null;
  actor.lastLine = { text, tick: state.tick };
  events.push(makeEvent(state, 'line', actor.name + '「' + text + '」'));
  return text;
}
