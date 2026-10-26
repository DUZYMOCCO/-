// ロボットコマンダー（仮）— スマホゲーム工房の入口モジュール。
// ハブが動的 import し、prepare()（CSS読み込み）→ init(container, onBackToHub) の順に呼ぶ。
// シミュレーション（js/sim）は DOM・Pixi に依存しない。描画（js/render）は sim の状態を読むだけ。
// v0.2.0: ミッション「資材集め・巡回・脱出」。上に資材のバーと残り時間、終わると結果画面（もう一度）。
// v0.4.0-dev（10/23）: 着弾・爆発の演出と被弾の反応（js/fx）。?fx=low で演出の粒を減らす（設定画面はまだない）。
// v0.4.0-dev: 部隊をやめて1機ずつ。上に種類ボタン（全員・ツギハギ・PONCO・人）、下に選んだ機体への命令バーと組①②③。
// v0.4.0-dev（10/24）: 遮蔽物から落ちた武器を拾うと、短い知らせ（.bc-toast）を出して、持っている武器の一覧に足して保存する（OWNED_KEY）。
// v0.4.9（10/25 お試し）: 武器庫 ?armory=1（出撃前の装備えらび。js/armory）。選んだ装備は createSim の loadout で機体へ。
// v0.4.11（10/25）: コード点検の直し（Claude）。「もう一度」で絵が残る問題・入り直しのリセット・作り直し失敗の画面（startOrShowFailure）・会話の後片づけ・fps の書き方。
// v0.4.12（10/25）: Codex gfx2 の取り込み。獣人の斜めの絵 WOLF_OBL（仮。&human=oblique）、獣人の高さ 34→30（少女の約1.35倍、横向きも）、立ち絵の痛がる顔（少年・少女 hurt、獣人 pain・hurt）、会話の背景7枚（assets/dialog/bg_gfx2 → v0.4.13 で assets/dialog/bg に一本化、まだ使っていない）。
// 記録と再生: ミッションを裏で記録し（js/sim/replay.js）、☰ メニューで書き出し・読み込み、?replay= で再生する（js/replay/replay-view.js）。
// v0.4.12-dev（10/25 お試し）: 人間がロボの背中・中に乗る ?ridedemo=1（js/sim/ride.js・js/ui/ride-panel.js）。
// v0.4.13（10/25）: Claude 12 本の取り込み。地面の角の丸め（ground）・再挑戦のメモリ（perf）・会話の背景 assets/dialog/bg（dialogbg）・武器庫の2つ目以降の装備（slots）・記録（save）・リプレイ（replay）・チュートリアル（tutorial）・物語の試作 ?story=1（story1）・飛ぶ機体と水陸両用機 ?altunits=1（altunits）・人がロボに乗る ?ridedemo=1（ride）・機体ごとの盾の表（shield。ハッシュが変わった）。
// v1.0.0（10/26）: 決定の反映。名前（少女＝ミント・狼＝ロウ）・乗る席・乗っている人は撃てない／捕まらない・飛ぶ機体の燃料・届かない印・リプレイは結果画面の「リプレイを見る」・記録は生き残りの数で比べる・チュートリアルは ☰ からだけ（教える前の操作は止める）・物語の最初のミッションは敵を強く。
// v1.0.1 gfx4（10/26）: Codex の絵の取り込み（飛ぶ機体の明るい絵と足元の影・巣の絵・燃料をためる姿・潜る／浮かぶ・魚雷・結果のカードの絵・ツギハギ号の背中の乗り姿・新しい敵の見本 ?enemydemo=1）。見た目だけ。
// v1.0.2 story1（10/26）: 物語の最初のミッションを置き換え。ネジ（ツギハギ号）と背中の少年だけで、ミサイルを掘り出し（js/sim/strike.js）、発射台をひっぱって撃ち（敵だけに当たる）、設計図のありかを調べる。☰ の中に乗り降り・発射台・撃つボタン（js/story/story-ops.js）、着弾マーカー（js/render/strike-view.js）。ネジが壊れたらすぐ負け、発射台を壊されても負けではない。
// v1.0.3 gfx5（10/26）: Codex の絵の取り込み（味方の機体の傷んだ姿と残骸・異星生物の休眠体・2つ目の地面・斜めの浅瀬・修理の道具とバリアの拾い物の印・武器 4 つの絵・少年とウルフの顔 3 つ。新しい敵 G05〜G12・巨大機ラストタイタン・地図の小物は ?enemydemo=1 の見本だけ）。見た目だけ。
// v1.0.4 claude3b（10/26）: 点検の直し R-01（読み込み中に入り直すと描画が2つ）・R-02（ride の乗り降りもリプレイに記録）・R-04（再生中のチュートリアル）。?launcher=1 の発射台の試作（js/sim/launcher.js ほか。付けない時は今のまま）
// v1.0.5 claude4c（10/26）: Claude の 4 つの結果の取り込み。点検の残り R-05〜R-14（review2_rest）・?powersuit=1 のパワードスーツのお試し（js/sim/powersuit.js ほか。物語は対象外）・?newenemies=1 の新しい敵 14 種（js/sim/new-enemies.js ほか。種類は KINDS に足さず、フラグの時だけ sim.neKinds）。付けない時は今のまま（ハッシュ同じ）。物語 2〜3 章の案は docs/STORY_CH2_3.md。
// v1.0.6 handoff4（10/26）: Codex の 4 つの結果の取り込み（?newenemies=1 の仕上げ・G12 の地中と範囲攻撃／磨き P-01〜P-05／?storych=2 物語2章の試作／?storych=3 物語3章の試作）と、戦闘中のダメージの数字・HP の数字（js/render/hp-numbers.js。見た目だけ）。
// v1.0.7 gem107（10/27）: 下の行動の帯に「発射」（発射台・物語のミサイル。js/ui/fire-button.js）、3倍速、敵の群れを見つけたら「○○：敵を発見！」とカメラを寄せて止める（js/ui/spot-report.js。☰「発見で止める」で入/切）、読んだ会話のスキップボタン（js/dialog/dialog-read.js）。ネジのセリフを普段の話し方にし、操作の案内は会話の後の吹き出しへ。sim は変えない（ハッシュ同じ）。
// v1.0.8 batch5（10/27）: Codex の 4 つの結果の取り込み。発射台を選んで「発射」・発射台の HP と選択の輪・ミサイルの命中を成績に（launcher_unit）／点検 review3（R-09 ヒントのタップで移動しない・初回の会話はスキップ不可・成績の数え方）／物語 1〜3 章を 1 つの表に（js/story/chapters.js。☰の章の一覧・解放・全章のリプレイ記録）／2・3 章の仕上げ（3 章は本物の新しい敵 G01/G02/G08/G09。遊ぶ時もリプレイも newEnemies。「（仮）」を外す）。旗なしの sim は変えない（ハッシュ同じ）。
// v1.0.0 gfx3（10/26）: Codex の絵の取り込み（獣人の斜めの清書・飛ぶ機体と水陸両用機の専用の絵・背中の乗り姿・会話の背景 6 枚・ボタンのアイコン）。タイトル・水の中の絵はしまっただけ（README）。
// v0.4.7（10/24）: 会話（立ち絵＋セリフ）の呼び出し口 playDialog(script) と、?dialogdemo=1 の会話のお試し（js/dialog）。
import { loadCss } from '../../common/js/load-css.js';
import { storage } from '../../common/js/storage.js';
import { createSim, stepSim, TICK, applyCommandsNow, missionStatus, unitById, issueStop, issueRetreat, issueStance, KINDS } from './sim/sim.js?v=28';
import { createUnitStats, statsHtml } from './stats/unit-stats.js?v=2'; // v1.0.6 ロボごとの成績とランキング（見るだけ。sim は変えない）
import { MISSION_1 } from './sim/mission.js?v=10';
import { withAltUnits, ALT_MISSION_ROWS } from './sim/alt-units.js?v=3'; // 本編に出すかのスイッチ（ALT_IN_MISSIONS。今は全部 false）
import { createRecorder, makeStart, openReplay, parseReplay, registerMission } from './sim/replay.js?v=11';
import { STORY_1 } from './story/story-mission.js?v=3';
import { newStoryState, endingKind, storyScriptUrl, midScene, STORY1_HINTS } from './story/story-1.js?v=3';
import { mountPowersuitMenu } from './ui/powersuit-menu.js?v=3'; // ?powersuit=1 の試作: ☰ の中の「スーツを着る／脱ぐ」「ロボに乗る」（sim.powersuit がある時だけ）
import { mountStoryOps, storyHud, storyResultText } from './story/story-ops.js?v=4'; // v1.0.2: 物語の最初のミッションの ☰ の中のボタン（乗り降り・発射台・ミサイル）と撃つ場所えらび
import { CHAPTERS, chapterFlag, stageOf, newChapterStory, nextStage, chaptersRequested, loadUnlocked, unlockAfter, stageForStory } from './story/chapters.js?v=2'; // 第 3 章など（?storych=3 の時だけ使う。章の表）
import { story3Hud, story3ResultText } from './story/story3-ops.js?v=2'; // 第 3 章（?storych=3）の上の帯と結果の文字
import { STORY_2, story2Requested, newStory2State, nextStory2, saveStory2Reward, story2Hud, story2ResultText } from './story/story-2.js?v=2';
import { mountStory2Ops } from './story/story2-ops.js?v=1';
for (const chapter of Object.values(CHAPTERS)) for (const stage of Object.values(chapter.stages)) registerMission(stage.mission); // 章の記録をフラグなしでも読める
import { selectKind, pruneSelection, createGroups } from './sim/select.js?v=12';
import { createRenderer } from './render/renderer.js?v=41';
import { attachInput } from './render/input.js?v=20';
import { addOwned } from './sim/cover.js?v=8';
import { DEFAULT_SPEED, normalizeSpeed, hudSpeedText } from './ui/speed.js?v=2';
import { fireButtonState } from './ui/fire-button.js?v=2';
import { newSpots } from './ui/spot-report.js?v=1';
import { createBackConfirm, requestBack, cancelBack } from './ui/back-confirm.js?v=1';
import { mergeWarn, warnWho } from './ui/toast-merge.js?v=1';
import { demoResultView } from './ui/demo-result.js?v=1'; // ミッションのないお試しの結果の文字
import { recordMissionResult, shouldRecord, tutorialMarkStore, SAVE_FAIL_TEXT } from './save/save.js?v=5';
import { wantsTutorial, loadMark } from './tutorial/tutorial-flow.js?v=2'; // チュートリアルを始めるかの判断だけ（本体は始める時に読み込む）

// 持っている武器の一覧（武器の id → 拾った数。かぶっても数える）。ハブと同じ localStorage（game_studio_ が前につく）
export const OWNED_KEY = 'botcommander_owned_weapons';
const TOAST_MS = 2200;
/** シールドの残り（%・10 刻み。少しでも残っていれば 10 以上） */
const shieldPct = u => (u.shieldMax > 0 && u.shieldHp > 0 ? Math.max(10, Math.round(u.shieldHp / u.shieldMax * 10) * 10) : 0);
/** 機体の盾・体の性格を一言で（機体の表から。ふつうは出さない）: 盾の耐久が最大 HP の半分以上＝厚い・2割以下＝薄い、装甲があれば「体 丈夫」 */
const shieldTrait = u => (u.shieldMax / u.maxHp >= 0.5 ? '（厚い）' : u.shieldMax > 0 && u.shieldMax / u.maxHp <= 0.2 ? '（薄い）' : '');
const bodyTrait = u => (u.armor >= 2 ? '・体 丈夫' : '');
const KIT_WARN_MERGE = 2; // リペアキット切れの知らせ: この秒数（ゲーム内）の間に続いた分は1つにまとめる

const fmtTime = s => { const t = Math.ceil(s); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const HINT_IDLE = 'ロボをタップで選ぶ。長押しで同じ種類、地面を長押しして囲むとまとめて選ぶ';
const RESULT_BANNER_URL = { win: new URL('../assets/result/result-success.webp', import.meta.url).href, lose: new URL('../assets/result/result-fail.webp', import.meta.url).href }; // v1.0.1 gfx4
const GROUP_HOLD_MS = 500; // 組ボタンの長押し＝いまの選択を覚える
const PICKS = [
  { key: 'all', label: '全員' },
  { key: 'scav', label: 'ツギハギ' },
  { key: 'ponco', label: 'PONCO' },
  { key: 'human', label: '人' },
];

const BotCommanderGame = {
  id: 'bot-commander',
  title: 'ロボットコマンダー（仮）',

  prepare() {
    return loadCss([new URL('../css/bot-commander.css?v=19', import.meta.url).href, new URL('../css/replay.css?v=2', import.meta.url).href]);
  },

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;
    this.alive = true;
    this.gen = (this.gen || 0) + 1; // 入り直すたびに増やす。前の回の start() が、あとから新しい画面へ書き込まないための目印（点検 R-01）
    // 入口は 1 つのオブジェクトを使い回す。入り直したときに、前回の状態（新しい画面には合わない物）を持ち越さない
    this.lastPicks = null; this.kitSig = null; this.kitWarn = null; this.shieldWarn = null; this.menuOpen = false; this.menuPrevPaused = false;
    this.seenGroups = new Set(); this.spotPaused = false;
    // 武器庫（?armory=1）: 工房へ戻って入り直したら、出撃前の武器庫からやり直す（前回の「出撃済み」「選んだ装備」を持ち越さない）。「もう一度」では残す
    // 物語の試作（?story=1）: 出撃前の会話 → STORY_1 → 勝ち／負けの会話。URL に何もなければ null（今までどおり・会話は出ない）
    this.story = story2Requested(location.search) ? newStory2State() : new URLSearchParams(location.search).get('story') === '1' ? newStoryState() : null;
    // 物語の章（?storych=N の時だけ。付けなければ null のまま＝今までどおり）。表にある章の最初のミッションの会話から始まる。ミッションはリプレイにも登録
    this.storyCh = chapterFlag(location.search);
    if (this.storyCh === 3 && !this.story) this.story = newChapterStory(3);
    this.loadout = undefined; this.armoryDone = false; this.armory = null; this.demo = null; this.r = null; this.sim = null; this.records = null;
    this.replayRec = null; this.replayNotes = []; this.replayUrlDone = false; this.replayError = null; this.player = null; this.rec = null; this.rview = null; this.replayUi = null; // 記録と再生
    this.tutorial = null; this.tutorialOn = false; // チュートリアルは ☰ メニューからだけ始める（v1.0.0: ?tutorial=1 と自動の始まりはなし）
    container.innerHTML = `
      <div class="bc-root">
        <div class="bc-stage"></div>
        <header class="bc-top">
          <div class="bc-picks"></div>
          <div class="bc-ctrl">
            <button class="bc-pause" aria-label="一時停止">⏸</button>
            <button class="bc-menu-btn" aria-label="メニューを開く"><span aria-hidden="true">☰</span><small>メニュー</small></button>
          </div>
        </header>
        <div class="bc-mission">
          <div class="bc-mat"><i class="bc-mat-del"></i><i class="bc-mat-car"></i><span class="bc-mat-txt"></span></div>
          <div class="bc-count"></div>
          <div class="bc-speed" hidden></div><div class="bc-clock" title="経過時間（制限時間はありません）"></div>
        </div>
        <div class="bc-alert" hidden></div>
        <div class="bc-act" hidden>
          <span class="bc-act-n"></span>
          <button data-act="mode"></button>
          <button data-act="stop">止まる</button>
          <button data-act="stance"></button>
          <button data-act="retreat">撤退</button>
          <button data-act="fire" hidden>発射</button>
          <button data-act="clear" aria-label="選択を外す">✕</button>
        </div>
        <footer class="bc-bottom">
          <div class="bc-groups">${[0, 1, 2].map(i => `<button data-group="${i}">${'①②③'[i]}</button>`).join('')}</div>
          <span class="bc-hint">${HINT_IDLE}</span>
          <span class="bc-fps"></span>
        </footer>
        <div class="bc-result" hidden>
          <div class="bc-result-box">
            <img class="bc-result-banner" alt="" decoding="async" hidden>
            <h2 class="bc-result-title"></h2>
            <p class="bc-result-text"></p>
            <div class="bc-result-stats"></div>
            <div class="bc-result-btns"><button class="bc-retry">もう一度</button><button class="bc-result-back">工房へ</button></div>
            <div class="bc-result-btns bc-result-rec-row"><button class="bc-result-rec">リプレイを見る</button></div>
          </div>
        </div>
        <div class="bc-menu" hidden>
          <div class="bc-menu-box" role="dialog" aria-modal="true" aria-label="メニュー">
            <h2 class="bc-menu-title">メニュー（一時停止中）</h2>
            <div class="bc-menu-row"><span>速さ</span><div class="bc-seg" role="radiogroup" aria-label="ゲームの速さ"><button data-speed="0.5" role="radio">0.5x</button><button data-speed="1" role="radio">1x</button><button data-speed="2" role="radio">2x</button><button data-speed="3" role="radio">3x</button></div></div>
            <div class="bc-menu-row"><span>発見で止める</span><div class="bc-seg" role="radiogroup" aria-label="発見で止める"><button data-spotpause="1" role="radio">入</button><button data-spotpause="0" role="radio">切</button></div></div>
            <button class="bc-menu-close">ゲームにもどる</button>
            <button class="bc-menu-armory" hidden>武器庫（出撃前にもどる）</button>
            
            <button class="bc-menu-story" style="height:40px;font-size:13px;font-weight:700">物語（試作）</button>
            <button class="bc-menu-stats">今の成績（ロボごと）</button>
            <div class="bc-menu-pair"><button class="bc-menu-tutorial">チュートリアル</button><button class="bc-menu-records">記録</button></div>
            <div class="bc-menu-rec"><button class="bc-menu-recsave">リプレイを保存</button><button class="bc-menu-recload">リプレイを開く</button></div>
            <button class="bc-menu-hub">工房へ戻る</button>
          </div>
        </div>
        <div class="bc-confirm" hidden>
          <div class="bc-confirm-box" role="dialog" aria-modal="true" aria-labelledby="bc-confirm-title">
            <h2 id="bc-confirm-title" class="bc-confirm-title">工房へ戻りますか？</h2>
            <p class="bc-confirm-text">このミッションの進み具合は消えます。</p>
            <div class="bc-confirm-btns"><button class="bc-confirm-leave">戻る</button><button class="bc-confirm-stay">続ける</button></div>
          </div>
        </div>
        <div class="bc-stats" hidden>
          <div class="bc-stats-box" role="dialog" aria-modal="true" aria-label="今の成績">
            <div class="bc-stats-body"></div>
            <button class="bc-stats-close">メニューにもどる</button>
          </div>
        </div>
        <div class="bc-paused-tag">一時停止中 ― 命令はできます</div>
        <div class="bc-toast" hidden></div>
        <div class="bc-loading">読み込み中…</div>
      </div>`;
    const $ = s => container.querySelector(s);
    this.el = {
      root: $('.bc-root'), stage: $('.bc-stage'), picks: $('.bc-picks'), pause: $('.bc-pause'), hint: $('.bc-hint'), fps: $('.bc-fps'), loading: $('.bc-loading'),
      toast: $('.bc-toast'), matDel: $('.bc-mat-del'), matCar: $('.bc-mat-car'), matTxt: $('.bc-mat-txt'), clock: $('.bc-clock'), speed: $('.bc-speed'), count: $('.bc-count'), alert: $('.bc-alert'),
      act: $('.bc-act'), actN: $('.bc-act-n'), mode: $('[data-act="mode"]'), stance: $('[data-act="stance"]'), fire: $('[data-act="fire"]'), groups: $('.bc-groups'),
      result: $('.bc-result'), resultBanner: $('.bc-result-banner'), resultTitle: $('.bc-result-title'), resultText: $('.bc-result-text'), resultStats: $('.bc-result-stats'), stats: $('.bc-stats'), statsBody: $('.bc-stats-body'),
    };
    this.groups = createGroups(3);
    // 「◀ 工房」はミッション中なら確認してから戻る（誤タップ対策）
    this.backConfirm = createBackConfirm();
    this.el.confirm = $('.bc-confirm');
    // 画面のボタンは減らす（Iron Squad と同じく ☰ メニュー にまとめる）。開くと一時停止
    this.el.menu = $('.bc-menu');
    $('.bc-menu-btn').addEventListener('click', () => this.openMenu());
    $('.bc-menu-close').addEventListener('click', () => this.closeMenu());
    $('.bc-menu-hub').addEventListener('click', () => this.requestBack());
    $('.bc-menu-records').addEventListener('click', () => this.openRecordsView());
    $('.bc-menu-stats').addEventListener('click', () => this.openStatsView()); // v1.0.6 ☰ の「今の成績」
    $('.bc-stats-close').addEventListener('click', () => { this.el.stats.hidden = true; });
    this.el.stats.addEventListener('click', e => { e.stopPropagation(); if (e.target === this.el.stats) this.el.stats.hidden = true; });
    $('.bc-menu-recsave').addEventListener('click', () => this.exportRecord());
    $('.bc-menu-recload').addEventListener('click', () => this.openLoadReplay());
    $('.bc-result-rec').addEventListener('click', () => this.watchReplay()); // v1.0.0: 結果の画面の 3 つめは「リプレイを見る」（書き出しは ☰ メニュー）
    // ?armory=1 の時だけ「武器庫（出撃前にもどる）」を出す。1回目は確かめの文字、もう一度押すと戻る（進み具合は消える）
    const armoryBtn = $('.bc-menu-armory');
    if (new URLSearchParams(location.search).get('armory') === '1') {
      armoryBtn.hidden = false;
      armoryBtn.addEventListener('click', () => {
        if (armoryBtn.dataset.armed) { delete armoryBtn.dataset.armed; armoryBtn.textContent = '武器庫（出撃前にもどる）'; this.backToArmory(); return; }
        armoryBtn.dataset.armed = '1'; armoryBtn.textContent = '押すと戻る（進み具合は消える）';
        setTimeout(() => { delete armoryBtn.dataset.armed; armoryBtn.textContent = '武器庫（出撃前にもどる）'; }, 4000);
      });
    }
    // ☰ メニューの「チュートリアル」: 1回目は確かめの文字、もう一度押すと練習の場面ではじめから（進み具合は消える）
    $('.bc-menu-tutorial').addEventListener('click', async e => {
      const btn = e.target;
      let m;
      try { m = await import('./tutorial/tutorial.js?v=8'); }
      catch (err) { console.warn('tutorial load failed', err); this.toast('チュートリアルを開けませんでした（この端末では使えないかもしれません）', 'warn'); return; } // R-12: 古い iPhone では読めない。黙って何も起きないのをやめる
      m.pressMenuButton(btn, () => { this.closeMenu(); this.tutorialOn = true; this.story = null; this.replayRec = null; this.restart(); }); // 点検 R-04: 再生中に押した時、replayRec が残ると再生をやり直すだけになり、tutorialOn も残る
    });
    // 「物語（試作）」: 物語の最初（出撃前の会話）から始める。誤タップ対策に2回押し
    const storyBtn = $('.bc-menu-story');
    storyBtn.addEventListener('click', () => {
      if (chaptersRequested(location.search)) { this.showChapterChoices(); return; }
      if (storyBtn.dataset.armed) { delete storyBtn.dataset.armed; storyBtn.textContent = '物語（試作）'; this.startStory(); return; }
      storyBtn.dataset.armed = '1'; storyBtn.textContent = '押すと物語を始める（進み具合は消える）';
      setTimeout(() => { delete storyBtn.dataset.armed; storyBtn.textContent = '物語（試作）'; }, 4000);
    });
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'wheel']) this.el.menu.addEventListener(ev, e => e.stopPropagation());
    this.el.menu.addEventListener('click', e => { e.stopPropagation(); if (e.target === this.el.menu) this.closeMenu(); });
    $('.bc-confirm-stay').addEventListener('click', () => this.cancelBack());
    $('.bc-confirm-leave').addEventListener('click', () => this.exit());
    // ダイアログの外をタップ → 続ける。地図にはタップを通さない
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'wheel']) this.el.confirm.addEventListener(ev, e => e.stopPropagation());
    this.el.confirm.addEventListener('click', e => { e.stopPropagation(); if (e.target === this.el.confirm) this.cancelBack(); });
    // ブラウザの「戻る」（ジェスチャー）も同じ確認を通す
    try { history.pushState({ botCommander: true }, ''); this.pushedHistory = true; } catch { this.pushedHistory = false; }
    this.onPopState = () => {
      if (!this.alive) return;
      if (!this.inMission()) { this.pushedHistory = false; this.exit(); return; }
      try { history.pushState({ botCommander: true }, ''); } catch {}
      this.requestBack();
    };
    window.addEventListener('popstate', this.onPopState);
    $('.bc-result-back').addEventListener('click', () => this.exit());
    $('.bc-retry').addEventListener('click', () => this.restart());
    // 種類ボタン: その種類を全部選んで、カメラを寄せる
    this.el.picks.addEventListener('click', e => {
      const b = e.target.closest('[data-pick]'); if (!b || !this.sim) return;
      this.select(selectKind(this.sim.units, b.dataset.pick), true);
    });
    this.el.act.addEventListener('click', e => this.onAction(e.target.closest('[data-act]')?.dataset.act));
    this.bindGroups();
    this.el.pause.addEventListener('click', () => this.setPaused(!this.state?.paused));
    container.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => this.setSpeed(Number(b.dataset.speed))));
    container.querySelectorAll('[data-spotpause]').forEach(b => b.addEventListener('click', () => this.setSpotPause(b.dataset.spotpause === '1')));
    this.setSpotPause(storage.get('bc-spotpause', true) !== false);
    // iOS の2本指ジェスチャー（ページ拡大）をゲーム内では止める
    this.stopGesture = e => e.preventDefault();
    for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) this.el.root.addEventListener(ev, this.stopGesture, { passive: false });
    // 画面が隠れたら自動で一時停止（復帰時に早送りしない）
    this.onVisibility = () => { if (document.hidden) this.setPaused(true); };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.state = { paused: false, speed: DEFAULT_SPEED, acc: 0 };
    const gen = this.gen;
    this.start().catch(err => {
      console.error('bot-commander start failed', err);
      if (gen !== this.gen) return; // 前の回の失敗は、新しい画面に出さない
      if (this.el.loading) this.el.loading.textContent = '起動できませんでした: ' + err.message;
    });
  },

  /** start() を呼び、失敗したら（メモリ不足など）真っ暗なまま固まらず、理由と「工房へ」「もう一度」を出す。作り直し・武器庫からの出撃で使う */
  async startOrShowFailure() {
    try { await this.start(); }
    catch (err) {
      console.error('bot-commander restart failed', err);
      if (!this.alive) return;
      if (this.r) { try { this.r.app.ticker.remove(this.tick); this.r.destroy(); } catch { /* 作りかけ */ } } // createRenderer のあとで失敗したときは、描画（app・ticker）も捨てる
      this.r = null; this.sim = null;
      this.el.loading?.remove(); this.el.loading = null;
      this.el.resultTitle.textContent = '作り直せませんでした'; this.el.resultTitle.classList.remove('win'); this.el.resultBanner.hidden = true;
      this.el.resultText.textContent = err && err.message ? err.message : String(err);
      if (this.el.resultStats) this.el.resultStats.innerHTML = '';
      this.el.result.hidden = false;
    }
  },

  // 組①②③: タップで呼び出し（空なら今の選択を覚える）、長押しで上書き保存
  bindGroups() {
    let timer = 0, saved = false;
    const el = this.el.groups;
    el.addEventListener('pointerdown', e => {
      const b = e.target.closest('[data-group]'); if (!b) return;
      saved = false; clearTimeout(timer);
      timer = setTimeout(() => { saved = true; this.saveGroup(Number(b.dataset.group)); }, GROUP_HOLD_MS);
    });
    const cancel = () => clearTimeout(timer);
    el.addEventListener('pointerup', cancel); el.addEventListener('pointercancel', cancel); el.addEventListener('pointerleave', cancel);
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-group]'); if (!b || !this.sim) return;
      if (saved) { saved = false; return; }
      const i = Number(b.dataset.group), ids = this.groups.recall(i, this.sim.units);
      if (ids.length) this.select(ids, true);
      else if (this.r.ui.selected.length) this.saveGroup(i);
      else this.el.hint.textContent = `${'①②③'[i]} は空。機体を選んでからタップ（長押しで上書き）`;
    });
  },
  saveGroup(i) {
    const ids = this.groups.save(i, this.r?.ui.selected || []);
    this.el.hint.textContent = ids.length ? `${'①②③'[i]} に ${ids.length}機を覚えた` : `${'①②③'[i]} を空にした`;
    this.renderGroups();
  },

  async start() {
    const gen = this.gen, stale = () => !this.alive || gen !== this.gen; // 読み込み中に工房へ戻って入り直すと alive は true に戻る。gen で前の回を見分ける（点検 R-01）
    const params = new URLSearchParams(location.search);
    this.el.root.querySelector('.bc-story2-next')?.remove();
    this.el.result.querySelector('.bc-result-rec-row').style.display = '';
    this.clearReplayUi(); // 「もう一度」などで作り直す前に、前の再生の帯・結果の枠を外す
    this.tutorial?.destroy(); this.tutorial = null; // 作り直しのとき、前のチュートリアルの重ねを外す
    this.ridePanel?.destroy(); this.ridePanel = null; // ?ridedemo=1 の操作パネル（作り直しのたびに前のを外す）
    this.storyOps?.destroy(); this.storyOps = null; clearTimeout(this.midTimer); // v1.0.2 物語の ☰ のボタン（作り直しのたびに外す）
    this.launcherUi?.destroy(); this.launcherUi = null; // ?launcher=1 の ☰ の項目・描く部品（作り直しのたびに前のを外す）
    this.suitMenu?.destroy(); this.suitMenu = null; // ?powersuit=1 の ☰ の項目（作り直しのたびに外す）
    this.el.nextStage?.remove(); this.el.nextStage = null; if (this.story?.ch) this.story.mid = {}; // 第 3 章: 結果の「つぎへ」を外す・途中の会話をもう一度出せるように
    // ?dialogdemo=1（お試し）: 会話画面だけを見る。ミッションは始めない。=all は全員の立ち絵を全部の表情で
    if (['1', 'all'].includes(params.get('dialogdemo'))) { const { runDialogDemo } = await import('./dialog/dialog-demo.js?v=7'); return runDialogDemo(this, params.get('dialogdemo')); }
    // ?chardemo=1（お試し）: 少年・少女・獣人の紙芝居の絵を全部の状態で見る画面。ミッション・sim は使わない
    if (params.get('chardemo') === '1') return this.startCharDemo(params);
    // ?replay=<URL か名前>（記録の再生。見るだけ）: 取りに行って調べる。読めなければ理由を出して、ふつうの始まりへ（this.replayRec が入れば再生）
    if (params.get('replay') && !this.replayUrlDone) { this.replayUrlDone = true; await this.loadReplayUrl(params.get('replay')); if (!this.alive) return; }
    // ?armory=1（お試し）: 出撃の前に武器庫（装備えらび）を開く。「出撃」を押すと、選んだ装備（this.loadout）でミッションを始める
    if (params.get('armory') === '1' && !this.armoryDone) return this.startArmory(params);
    // ?altdemo=1（お試し）: 高さの確かめ用。池（浅瀬・深い水）と空テスト機・水中テスト機。ミッションなし
    if (this.story) { this.story.ending = false; if (this.story.chapter === 2) { this.story.intro = true; this.story.mid = {}; } } // 「もう一度」で始め直した時、出撃後の会話をまた出せるように
    const altDemo = params.get('altdemo') === '1' ? await import('./sim/altitude-demo.js?v=2') : null;
    const seed = Number(params.get('seed')) || 1, mapSeed = Number(params.get('map')) || 7;
    // ?altunits=1（お試し）: 飛ぶ機体・水陸両用機（js/sim/alt-units.js）。?altdemo=1 と同じ池に置く。ミッションなし
    const altUnits = params.get('altunits') === '1' ? await import('./sim/alt-units-demo.js?v=3') : null;
    // ?ridedemo=1（お試し）: 人間がロボの背中・中に乗る。少年・少女・獣人、乗れるロボ、離れた所に異星生物。ミッションなし
    const rideMod = params.get('ridedemo') === '1' && !altUnits ? await import('./ui/ride-panel.js?v=8') : null;
    const rideDemo = rideMod ? await import('./sim/ride-demo.js?v=8') : null;
    if (rideMod) await rideMod.loadRideCss();
    const demoSetup = rideDemo ? { rideDemo } : altUnits ? { setup: altUnits.ALT_UNITS_SETUP, mapEdit: altUnits.altUnitsMapEdit } : altDemo ? { setup: altDemo.ALT_DEMO_SETUP, mapEdit: altDemo.altDemoMapEdit } : null; // お試しの配置（記録・チュートリアル・再生なし）
    // チュートリアル（☰ メニューから）の時だけ、練習の場面を使う。再生が頼まれている時は再生を先にする
    const tutMod = !this.replayRec && !demoSetup && wantsTutorial({ on: this.tutorialOn, search: location.search, mark: loadMark(tutorialMarkStore) }) ? await import('./tutorial/tutorial.js?v=8') : null;
    if (tutMod || this.replayRec) this.story = null; // チュートリアル・再生の時は物語の会話を出さない
    const newEnemies = params.get('newenemies') === '1' && !this.story && !demoSetup && !tutMod && !this.replayRec; // ?newenemies=1（試作）: ふつうのミッションに新しい敵 G01〜G12・A01・A08（js/sim/new-enemies.js）。付けなければ今までと同じ
    const chapterMission = this.story ? stageForStory(this.story).mission : withAltUnits(MISSION_1, ALT_MISSION_ROWS);
    const chapterNE = !!chapterMission?.story3; // v1.0.8: 第 3 章は実際の新しい敵（G01・G02・G08・G09）を使う。createSim に newEnemies: true を渡す（リプレイ側は replay.js の createSimFromStart が同じ判断をする）
    const rp = this.replayRec && !demoSetup ? openReplay(this.replayRec) : null; // 記録の再生: 記録の始まりの条件で、新しいシムを作る
    if (rp && !rp.ok) { this.replayError = rp.reason; this.replayRec = null; }
    const sim = rp?.ok ? rp.sim : tutMod ? tutMod.createTutorialSim({ seed, mapSeed }) : rideDemo
      ? rideDemo.createRideDemoSim({ seed, mapSeed }) : demoSetup
      ? createSim({ seed, mapSeed, ...demoSetup })
      : createSim({ seed, mapSeed, mission: chapterMission, loadout: this.loadout, launcher: params.get('launcher') === '1' && !this.story, powersuit: params.get('powersuit') === '1' && !this.story, newEnemies: newEnemies || chapterNE }); // ?launcher=1（発射台の試作）・?powersuit=1（スーツのお試し）。どちらも物語は対象外
    // ふつうのミッション（物語も）は、いつも裏で記録する（命令の写しとハッシュだけ。小さい）。再生中・お試し・チュートリアルの画面では取らない
    this.player = rp?.ok ? rp.player : null;
    this.rec = this.player || demoSetup || tutMod ? null : createRecorder(sim, makeStart({ seed, mapSeed, mission: chapterMission, chapter: this.story?.ch || this.story?.chapter || (this.story ? 1 : null), loadout: this.loadout, launcher: !!sim.launcher, powersuit: !!sim.powersuit }));
    if (newEnemies) this.rec = null; // ?newenemies=1（試作）は記録しない（再生は新しい敵のフラグを持たないので、ハッシュが合わなくなる）
    if (this.player) this.rview = await import('./replay/replay-view.js?v=11');
    if (stale()) return; // ここまでの読み込み中に離れた（入り直した）なら、新しい画面へ描画を作らない
    const r = await createRenderer(this.el.stage, sim, { fxQuality: params.get('fx') === 'low' ? 'low' : 'normal', ground: params.get('ground') === 'oblique' ? 'oblique' : undefined, human: params.get('human') === 'oblique' ? 'oblique' : undefined, enemyDemo: params.get('enemydemo') === '1', newEnemies: newEnemies || !!sim.story2 || !!sim.story3 });
    if (stale()) { r.destroy(); return; }
    this.sim = sim; this.r = r;
    this.picks = altUnits ? [...PICKS.filter(p => p.key !== 'human'), { key: 'flyer', label: '飛行' }, { key: 'amph', label: '水陸' }] : PICKS; // ?altunits=1 は 2 つの機体の選ぶボタンを足す
    this.el.root.classList.toggle('replaying', !!this.player);
    if (this.player) this.replayUi = { bar: this.rview.createReplayBar(this.el.root, this.player), card: null };
    this.groups = createGroups(3);
    this.state.acc = 0;
    this.el.loading?.remove(); this.el.loading = null;
    this.el.result.hidden = true;
    // 最初はツギハギ号4機を選んだ状態にして、そこへカメラを合わせる
    this.select(rideDemo ? sim.units.filter(u => u.kind === 'boy').map(u => u.id) : selectKind(sim.units, 'scav'), true, rideDemo ? -40 : -120);
    attachInput(r.app.canvas, sim, r, {
      allow: op => !this.tutorial || this.tutorial.allows(op), // チュートリアル中は、教える段まで使えない操作がある
      onSelect: () => this.refreshSel(),
      onLong: kind => { if (kind === 'box') this.el.hint.textContent = 'なぞって囲む → 指をはなすと選ぶ'; },
      onNothing: () => {
        if (this.spotPaused && this.state?.paused) { this.setPaused(false); this.spotPaused = false; }
        this.el.hint.textContent = HINT_IDLE;
      },
      onOrder: (ids, wps, enemy) => {
        if (this.player) { sim.commands.length = 0; return; } // 再生中は命令を受けない（見るだけ）
        if (this.state.paused) this.applyNow(sim);
        this.el.hint.textContent = enemy ? `${ids.length}機: ${enemy.label || '敵'}を狙う` : `${ids.length}機: ${r.ui.mode === 'rush' ? '急行（撃たずに走る）' : '戦闘移動（敵がいたら撃つ）'}`;
      },
    });
    let uiTimer = 0;
    this.seenFx = new WeakSet();
    this.kitWarn = null; this.shieldWarn = null; this.kitSig = null; // 「もう一度」でゲーム内の時間が 0 に戻る。前の知らせのまとめを捨てる
    let lastFps = '';
    const step0 = this.player ? () => this.player.step() : this.rec ? () => this.rec.step() : () => stepSim(sim); // 記録・再生をつけたまま 1 step 進める
    // v1.0.6 ロボごとの成績: 1 step ごとに見るだけ（sim は変えない）。同じ名前のロボは 2 機目から番号をつける
    const nameCount = {};
    const unitStats = this.unitStats = createUnitStats({ nameOf: u => {
      if (u.label) return u.label;
      const base = KINDS[u.kind]?.name || '味方'; nameCount[base] = (nameCount[base] || 0) + 1;
      return nameCount[base] > 1 ? `${base}${nameCount[base]}` : base;
    } });
    unitStats.observe(sim);
    this.el.stats.hidden = true;
    const step = () => { step0(); unitStats.observe(sim); };
    this.tick = t => {
      const t0 = performance.now(), dt = Math.min(t.deltaMS / 1000, 0.25), st = this.state;
      // 演出を進める。止め（hit-stop）の間は 0 が返り、シミュレーションも止まる
      const ts = r.fx.update(st.paused ? 0 : dt * st.speed);
      if (!st.paused && !sim.result && !this.player?.done) {
        st.acc += dt * st.speed * ts;
        let n = 0; while (st.acc >= TICK && n < 10) { step(); st.acc -= TICK; n++; }
        if (n === 10) st.acc = 0;
      }
      this.scanPickups(sim);
      this.scanSpotReport(sim);
      this.ridePanel?.scan(); this.suitMenu?.scan();
      if (this.story && (sim.strike || sim.story3 || sim.story2)) this.scanStoryMid(sim);
      r.sync(performance.now() / 1000);
      this.launcherUi?.sync(performance.now() / 1000); // ?launcher=1: 発射台の絵・着弾の印・知らせ（r.sync の後）
      st.workMs = performance.now() - t0; // 1フレームの仕事（シミュ＋演出＋描画の準備。GPU は入らない）。計測用
      uiTimer -= dt;
      if (uiTimer <= 0) {
        uiTimer = 0.2;
        const kept = pruneSelection(sim.units, r.ui.selected);
        if (kept.length !== r.ui.selected.length) { r.ui.selected = kept; this.updateHint(); }
        else if (kept.length) { // キットの数が変わった時だけ書き直す（v0.4.2。命令の説明を消さない）
          if (this.kitSigOf(kept) !== this.kitSig) this.updateHint();
        }
        this.renderPicks(); this.renderAct(); this.renderMission(); this.renderGroups(); this.ridePanel?.update(); this.suitMenu?.update();
        const fps = `${r.app.ticker.FPS.toFixed(0)}fps`; // 0.2 秒ごとに、文字が変わったときだけ書く
        if (fps !== lastFps) { lastFps = fps; this.el.fps.textContent = fps; }
      }
      if (this.player) this.updateReplayUi();
      else if (sim.result && this.el.result.hidden) this.finishMission();
    };
    // v1.0.2 物語: ☰ の中に「少年をおろす／乗せる」「発射台をつなぐ／はずす」「ミサイルを撃つ」（再生中は出さない）
    if ((sim.strike || sim.story2) && !this.player) {
      const host = { root: this.el.root, menuBox: this.el.menu.querySelector('.bc-menu-box'), sim, r,
        closeMenu: () => this.closeMenu(), isPaused: () => !!this.state.paused, setPaused: v => this.setPaused(v), applyNow: () => this.applyNow(sim), toast: (t, tone) => this.toast(t, tone) };
      this.storyOps = sim.story2 ? mountStory2Ops(host) : mountStoryOps(host);
    }
    if (sim.launcher) this.launcherUi = await (await import('./ui/launcher-menu.js?v=5')).mountLauncher({ root: this.el.root, sim, r, menu: this.el.menu, toast: (t, tone) => this.toast(t, tone), hooks: { closeMenu: () => this.closeMenu(), setPaused: v => this.setPaused(v), isPaused: () => !!this.state.paused, applyNow: () => this.applyNow(this.sim) } }); // ?launcher=1（発射台の試作）の時だけ
    // ?powersuit=1: ☰ の中に「スーツを着る／脱ぐ」「ロボに乗る」（再生中は出さない）
    if (sim.powersuit && !this.player) this.suitMenu = mountPowersuitMenu({ menuBox: this.el.menu.querySelector('.bc-menu-box'), sim, r, isPaused: () => !!this.state.paused, applyNow: () => this.applyNow(this.sim), toast: (t, tone) => this.toast(t, tone), onChange: () => this.refreshSel() });
    if (rideMod) this.ridePanel = rideMod.mountRidePanel({ root: this.el.root, sim, r, toast: (t, tone) => this.toast(t, tone), onChange: () => this.refreshSel() });
    r.app.ticker.add(this.tick);
    this.setSpeed(this.state.speed); this.setPaused(!!this.story?.intro); this.refreshSel(); this.renderMission();
    // 自動テスト・スクショ用の入口
    window.__botCommander = {
      sim, r, state: this.state, setPaused: v => this.setPaused(v), setSpeed: v => this.setSpeed(v), stepSim, restart: () => this.restart(),
      select: ids => this.select(ids, false), selected: () => [...r.ui.selected], groups: this.groups, owned: () => storage.get(OWNED_KEY, {}),
      playDialog: (script, opts) => this.playDialog(script, opts), ready: true,
      recorder: this.rec, player: this.player, // 記録と再生（確かめ用）
      storyOps: this.storyOps, suitMenu: this.suitMenu, openMenu: () => this.openMenu(), closeMenu: () => this.closeMenu(),
      unitStats: this.unitStats, openStatsView: () => this.openStatsView(), // v1.0.6 ロボごとの成績（確かめ用）
    };
    if (this.replayError) { const reason = this.replayError; this.replayError = null; this.showReplayError(reason); }
    if (tutMod) this.tutorial = tutMod.runTutorial(this);
    if (this.story?.intro) { this.story.intro = false; this.playStoryScene('intro'); } // 物語: 出撃前の会話（終わったら一時停止を解く）
  },

  // ---- 記録と再生（本体は js/sim/replay.js、画面は js/replay/replay-view.js）----
  /** 命令を一時停止中にすぐ使う。記録しているときは、一時停止中の印をつけて記録する（結果が変わるため）。再生中は何もしない */
  applyNow(sim) { if (this.player) return; if (this.rec) this.rec.applyNow(); else applyCommandsNow(sim); },
  /** ?replay= の記録を取りに行く。調べて、読めたら this.replayRec へ。読めなければ理由を this.replayError へ（止まらない） */
  async loadReplayUrl(value) {
    try {
      const view = await import('./replay/replay-view.js?v=11');
      const text = await view.fetchReplayText(value, import.meta.url);
      const p = parseReplay(text);
      if (!p.ok) throw new Error(p.reason);
      this.replayRec = p.rec; this.replayNotes = p.notes;
    } catch (err) { this.replayError = err && err.message ? err.message : String(err); }
  },
  /** 再生中の帯と、終わった時の結果の枠。毎フレーム呼ぶ */
  updateReplayUi() {
    const ui = this.replayUi; if (!ui) return;
    ui.bar.update();
    if (this.player.done && !ui.card) {
      ui.bar.destroy();
      ui.card = this.rview.showReplayResult(this.el.root, {
        report: this.player.report(), rec: this.player.rec, notes: this.replayNotes,
        onNormal: () => { this.replayRec = null; this.restart(); }, onHub: () => this.exit(),
      });
    }
  },
  clearReplayUi() {
    const ui = this.replayUi; this.replayUi = null;
    if (ui) { try { ui.bar.destroy(); ui.card?.destroy(); } catch { /* もう外れている */ } }
    this.el?.root?.classList.remove('replaying');
  },
  /** 読めなかった記録の知らせ（閉じるとふつうの画面。出ている間は一時停止） */
  async showReplayError(reason) {
    const view = await import('./replay/replay-view.js?v=11');
    if (!this.alive) return;
    const prev = !!this.state?.paused; this.setPaused(true);
    view.showReplayError(this.el.root, reason, { onClose: () => { if (this.alive) this.setPaused(prev); } });
  },
  /** 今のミッションの記録を書き出す枠（☰ メニュー・結果の画面から）。途中でも書き出せる */
  async exportRecord() {
    const rec = this.player ? this.player.rec : this.rec?.snapshot();
    if (!rec) { this.toast('この画面ではリプレイを取っていません'); return; }
    const view = await import('./replay/replay-view.js?v=11');
    if (!this.alive) return;
    const withDevice = { ...rec, meta: { ...(rec.meta || {}), recordedOn: view.deviceName() } };
    view.openRecordExport(this.el.root, withDevice);
  },
  /** 結果の画面の「リプレイを見る」: いま終わったミッションの記録（自動でとっている）を、はじめから再生する */
  watchReplay() {
    const rec = this.player ? this.player.rec : this.rec?.snapshot();
    if (!rec) { this.toast('この画面ではリプレイを取っていません'); return; }
    this.startReplay(rec);
  },
  /** 「記録を読み込む」の枠。読めたら、その記録を再生する（作り直す。ふつうの進み具合は消える） */
  async openLoadReplay() {
    const view = await import('./replay/replay-view.js?v=11');
    if (!this.alive) return;
    view.openLoadSheet(this.el.root, { onLoad: (rec, notes) => this.startReplay(rec, notes) });
  },
  async startReplay(rec, notes = []) {
    this.replayRec = rec; this.replayNotes = notes; this.tutorialOn = false; this.story = null;
    if (this.menuOpen) { this.menuOpen = false; this.el.menu.hidden = true; }
    await this.restart();
  },

  /**
   * 会話（立ち絵＋セリフ）を出す呼び出し口。ミッションの前と後に台本を流すのに使う（どこで流すかはまだ決めていない）。
   * script は台本のオブジェクトか JSON の URL（書き方は assets/dialog/README.md）。出ている間は一時停止し、地図のタップ・ドラッグは通らない。
   * 終わると前の一時停止の状態に戻る。返り値は Promise<{ skipped }>（メニューの「会話をとばす」で終えたら skipped: true）
   */
  async playDialog(script, opts = {}) {
    const { playDialog } = await import('./dialog/dialog-view.js?v=5');
    const prev = !!this.state?.paused;
    this.setPaused(true);
    try { return await playDialog(this.el.root, script, opts); }
    finally { if (this.alive) this.setPaused(prev); }
  },

  /** 物語の会話（kind: 'intro' | 'win' | 'lose'）を出す。台本が読めなくても、ゲームは止めずに先へ進む */
  async playStoryScene(kind) {
    try { await this.playDialog(stageForStory(this.story).scriptUrl(kind)); }
    catch (err) { console.error('bot-commander story dialog failed', err); }
    if (kind === 'intro' && this.alive && this.sim && !this.menuOpen) this.setPaused(false);
    if (kind === 'intro' && this.alive && this.sim?.story3 && this.story?.ch) this.toast(stageOf(this.story.ch, this.story.stage).hint); // 第 3 章: 会話のあとに短いしめし（吹き出し）
    if (this.alive && STORY1_HINTS[kind] && !this.story?.ch && !this.sim?.story2) this.toast(STORY1_HINTS[kind]);
    if (this.alive && kind === 'intro' && this.sim?.story2) this.toast(this.story?.step === 2 ? '☰で少年をおろし、少年だけ選んで北の青い印（塔のあと）へ。止まって約15秒しらべる（敵が5マス以内だと進まない）' : '山のそばで止まると掘れる。積んだら南の隠れ家へ運ぶ'); // v1.0.7: セリフから移した案内
  },
  /** v1.0.2 物語: ミッションの途中の会話（ミサイルを掘り出した・ミサイルが落ちた）。シムの合図を見て 1 度だけ出す。会話の間は止まり、終わると前の状態に戻る */
  scanStoryMid(sim) {
    if (this.midBusy || this.menuOpen || this.storyOps?.aiming || sim.result || !this.el.result.hidden) return;
    for (const f of sim.story2 ? sim.story2.cues.map(type => ({ type })) : sim.fx) {
      if (this.seenMidFx?.has(f)) continue;
      (this.seenMidFx ||= new WeakSet()).add(f);
      const kind = stageForStory(this.story).midScene(f, this.story.mid); if (!kind) continue;
      this.midBusy = true;
      const play = async () => { if (this.alive && this.sim === sim && !sim.result) await this.playStoryScene(kind); this.midBusy = false; };
      if (f.type === 'strikeHit') this.midTimer = setTimeout(play, 1400); else play(); // 落ちた時は爆発を見せてから
      return;
    }
  },
  /** ミッションが終わった時: 物語（?story=1）なら出撃後の会話を出してから結果の画面へ。ふつうの始まりは今までどおり結果の画面だけ */
  async finishMission() {
    const kind = this.story ? endingKind(this.sim.result) : null;
    if (!kind) return this.showResult();
    if (this.story.ending) return; // 会話の途中は何度も呼ばれる
    this.story.ending = true;
    const sim = this.sim;
    if (kind === 'win' && this.story.ch) CHAPTERS[this.story.ch].markClear(this.story.stage); // 第 3 章: クリアの印（別のキー。フラグ付きの時だけ）
    if (kind === 'win' && chaptersRequested(location.search)) {
      const ch = this.story.ch || this.story.chapter || 1;
      const last = ch === 1 || (ch === 2 && this.story.step === 2) || (ch === 3 && !nextStage(ch, this.story.stage));
      if (last) unlockAfter(ch);
    }
    await this.playStoryScene(kind);
    if (this.story?.chapter === 2 && sim.result === 'win') {
      saveStory2Reward(this.story.step, localStorage);
      if (this.story.step === 2) await this.playStoryScene('suit');
    }
    if (this.alive && this.sim === sim && this.el.result.hidden) this.showResult();
  },
  /** ☰ の中で章を選ぶ。開いていない章は押せない。 */
  showChapterChoices() {
    let row = this.el.menu.querySelector('.bc-menu-chapters');
    if (row) { row.remove(); return; }
    row = document.createElement('div'); row.className = 'bc-menu-chapters';
    row.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    const menuBox = this.el.menu.querySelector('.bc-menu-box');
    menuBox.style.cssText = 'max-height:calc(100dvh - 40px);overflow-y:auto';
    const unlocked = loadUnlocked();
    for (const c of Object.values(CHAPTERS)) {
      const b = document.createElement('button'); b.dataset.chapter = c.id;
      b.style.cssText = 'min-height:44px;font-size:13px;font-weight:700';
      b.disabled = c.id > unlocked; b.textContent = `${b.disabled ? '🔒 ' : ''}${c.title}`;
      b.addEventListener('click', () => { row.remove(); if (c.id === 3) this.startChapter(3); else this.startStory(c.id); });
      row.appendChild(b);
    }
    this.el.menu.querySelector('.bc-menu-story').insertAdjacentElement('afterend', row);
  },

  /** ☰ メニューの「物語（試作）」: いまのミッションをやめて、物語の最初（出撃前の会話）から始める */
  async startStory(chapter = 1) {
    this.closeMenu();
    if (window.__botCommander) window.__botCommander.ready = false;
    if (this.r) { this.r.app.ticker.remove(this.tick); this.r.destroy(); }
    this.r = null; this.sim = null;
    this.el.result.hidden = true;
    this.clearReplayUi(); this.tutorial?.destroy(); this.tutorial = null; this.tutorialOn = false; this.replayRec = null; // 再生・チュートリアルの後片づけ
    this.loadout = null; // 章は毎回まっさらな編成から始める
    this.story = chapter === 2 ? newStory2State() : newStoryState();
    await this.startOrShowFailure();
  },

  /** ☰ メニューの章のボタン（?storych=N の時だけ）: いまのミッションをやめて、その章のそのミッションの出撃前の会話から始める */
  async startChapter(ch, stage) {
    this.closeMenu();
    if (window.__botCommander) window.__botCommander.ready = false;
    if (this.r) { this.r.app.ticker.remove(this.tick); this.r.destroy(); }
    this.r = null; this.sim = null;
    this.el.result.hidden = true;
    this.clearReplayUi(); this.tutorial?.destroy(); this.tutorial = null; this.tutorialOn = false; this.replayRec = null;
    this.loadout = null; // 章をまたいで装備を持ち越さない
    this.story = newChapterStory(ch, stage);
    await this.startOrShowFailure();
  },

  /** 武器庫（js/armory）を開く。出撃で deployFromArmory へ。ミッション・sim はまだ作らない */
  async startArmory(params) {
    const { openArmory } = await import('./armory/armory-view.js?v=10');
    const view = await openArmory(this, { it01: params.get('it01') === '1' ? 1 : 0, onDeploy: loadout => this.deployFromArmory(loadout) });
    if (!this.alive) { view.destroy(); return; }
    this.armory = view;
    this.el.loading?.remove(); this.el.loading = null;
    window.__botCommander = { armory: view, ready: true };
  },
  /** 武器庫の「出撃」: 選んだ装備を覚えて武器庫を閉じ、ミッションを始める（「もう一度」でも同じ装備） */
  async deployFromArmory(loadout) {
    this.loadout = loadout; this.armoryDone = true;
    if (window.__botCommander) window.__botCommander.ready = false;
    this.armory?.destroy(); this.armory = null;
    await this.startOrShowFailure();
  },
  /** ☰ メニューの「武器庫（出撃前にもどる）」: いまのミッションをやめて武器庫に戻る（?armory=1 の時だけ出るボタン。誤タップ対策に2回押し） */
  async backToArmory() {
    this.closeMenu();
    if (window.__botCommander) window.__botCommander.ready = false;
    if (this.r) { this.r.app.ticker.remove(this.tick); this.r.destroy(); }
    this.r = null; this.sim = null;
    this.el.result.hidden = true;
    this.armoryDone = false;
    await this.startOrShowFailure();
  },

  async startCharDemo(params) {
    const mod = await import('./render/char-demo.js?v=11');
    const menuBtn = this.el.root.querySelector('.bc-menu-btn'), fresh = menuBtn.cloneNode(true);  // ミッション用のメニューの代わりに、お試しのパネルを開閉する
    menuBtn.replaceWith(fresh);
    const demo = await mod.createCharDemo({ host: this.el.stage, root: this.el.root, menuBtn: fresh, human: params.get('human') === 'oblique' ? 'oblique' : undefined, onBack: () => this.exit() });
    if (!this.alive) { demo.destroy(); return; }
    this.demo = demo;
    this.el.loading?.remove(); this.el.loading = null;
    window.__botCommander = { demo, ready: true };
  },

  /** 武器を拾った知らせ: 一覧に足して保存し、短い知らせを出す（修理キットは頭の上の文字だけ） */
  scanPickups(sim) {
    for (const f of sim.fx) {
      if (f.type === 'kitEmpty' && !this.seenFx.has(f)) { this.seenFx.add(f); this.warnToast('kitWarn', f, 'のリペアキットが切れました'); continue; }
      if (f.type === 'shieldBreak' && !this.seenFx.has(f)) { this.seenFx.add(f); this.warnToast('shieldWarn', f, 'のシールドが壊れました'); continue; }
      if (f.type !== 'pickup' || !f.weapon || this.seenFx.has(f)) continue;
      this.seenFx.add(f);
      storage.set(OWNED_KEY, addOwned(storage.get(OWNED_KEY, {}), f.weapon));
      this.toast(f.equipped ? `${f.label || '味方'} が ${f.name} を装備！` : `${f.name} を入手（保管）`);
    }
  },
  /** 注意の知らせ: リペアキットを使い切った（v0.4.2）・シールドが壊れた（v0.4.4）。種類ごとに、2秒以内に続いたら1つの知らせにまとめる */
  warnToast(key, f, text) {
    this[key] = mergeWarn(this[key], f, KIT_WARN_MERGE); // 決まりは js/ui/toast-merge.js（Node のテストあり）
    this.toast(`${warnWho(this[key])}${text}`, 'warn');
  },
  toast(text, tone = '') {
    const el = this.el.toast; if (!el) return;
    el.textContent = text; el.hidden = false; el.classList.toggle('warn', tone === 'warn');
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { el.hidden = true; el.classList.remove('show'); }, TOAST_MS);
  },

  /** 結果画面の「もう一度」: 描画を作り直して最初から */
  async restart() {
    this.seenGroups = new Set(); this.spotPaused = false;
    if (window.__botCommander) window.__botCommander.ready = false;
    if (this.r) { this.r.app.ticker.remove(this.tick); this.r.destroy(); }
    this.r = null; this.sim = null;
    this.el.result.hidden = true;
    await this.startOrShowFailure();
  },

  /** 選択を入れ替える。focus なら選んだ機体の真ん中へカメラを寄せる */
  select(ids, focus = false, dy = 0) {
    const { sim, r } = this; if (!sim) return;
    r.ui.selected = pruneSelection(sim.units, ids);
    if (focus && r.ui.selected.length) {
      const us = r.ui.selected.map(id => unitById(sim, id));
      r.cam.x = us.reduce((a, u) => a + u.x, 0) / us.length; r.cam.y = us.reduce((a, u) => a + u.y, 0) / us.length + dy;
    }
    this.refreshSel();
  },
  refreshSel() { this.renderPicks(); this.renderAct(); this.renderGroups(); this.updateHint(); },

  onAction(act) {
    const { sim, r } = this; if (!sim || !act) return;
    const ids = r.ui.selected;
    if (act === 'mode') { r.ui.mode = r.ui.mode === 'fight' ? 'rush' : 'fight'; this.el.hint.textContent = r.ui.mode === 'rush' ? '急行: 撃たずに走る（逃げる・回り込む用）' : '戦闘移動: 敵がいたら止まって撃つ'; }
    else if (act === 'clear') { r.ui.selected = []; this.refreshSel(); return; }
    else if (!ids.length) return;
    else if (act === 'stop') { issueStop(sim, ids); this.el.hint.textContent = `${ids.length}機: その場で止まる`; }
    else if (act === 'retreat') { issueRetreat(sim, ids); this.el.hint.textContent = `${ids.length}機: 本陣へ撤退（撃たずに走る）`; }
    else if (act === 'fire') {
      const fState = fireButtonState(sim, ids);
      if (fState.kind === 'launcher' && this.launcherUi?.startPick) {
        this.launcherUi.startPick();
      } else if (fState.kind === 'story' && this.storyOps?.startAim) {
        this.storyOps.startAim();
      }
      return;
    }
    else if (act === 'stance') {
      const next = this.selStance() === 'hold' ? 'free' : 'hold';
      issueStance(sim, ids, next);
      this.el.hint.textContent = next === 'free' ? '迎撃: 見えた敵へ少し寄って撃つ（遠くまでは追わない）' : 'その場: 持ち場から動かず、届く敵だけ撃つ';
    }
    if (this.state.paused) this.applyNow(sim);
    this.renderAct();
  },
  /** 選んだ機体の構え。混ざっていれば 'mix' */
  selStance() {
    const us = this.r.ui.selected.map(id => unitById(this.sim, id)).filter(Boolean);
    if (!us.length) return 'hold';
    return us.every(u => u.stance === us[0].stance) ? us[0].stance : 'mix';
  },

  /** 選んでいる機体のキットの数（作成中か）。変わったらヒントを書き直す（v0.4.2） */
  kitSigOf(ids) {
    return ids.map(id => { const u = unitById(this.sim, id); return u ? `${u.kits || 0}${u.kitBuild != null ? '+' : ''}/${shieldPct(u)}${u.shieldBuild != null ? '+' : ''}${u.spareShields || 0}${u.suitOn ? 'S' : ''}` : ''; }).join(',');
  },
  updateHint() {
    this.kitSig = this.sim ? this.kitSigOf(this.r.ui.selected) : null;
    const { sim, r } = this; if (!sim) return;
    if (this.player) { this.el.hint.textContent = '再生中（見るだけ）。地図の移動・拡大はできます'; return; }
    const us = r.ui.selected.map(id => unitById(sim, id)).filter(Boolean);
    if (!us.length) { this.el.hint.textContent = HINT_IDLE; return; }
    if (us.length === 1) {
      const u = us[0];
      if (u.launch) { this.el.hint.textContent = '発射台: 自分では動けません。ロボで引いて運びます'; return; }
      // v0.4.2: 持っているリペアキットの数。v0.4.4: シールドの残り（10% 刻み）・サポーターの盾作り
      const sh = u.shieldMax > 0 ? `・シールド ${u.shieldHp > 0 ? `${shieldPct(u)}%${shieldTrait(u)}` : '壊れ'}${bodyTrait(u)}${u.shieldBuild != null ? '・盾を作成中' : ''}${u.spareShields > 0 ? `・予備の盾${u.spareShields}` : ''}` : '';
      const kit = u.human ? '' : `（キット ${u.kits || 0}${u.kitBuild != null ? '・作成中' : ''}${sh}）`;
      this.el.hint.textContent = u.suitOn ? `${u.label}（スーツ）: 行き先をタップ。見えている敵を撃てる・着ている間は捕まらない・殻が壊れると脱げる` : u.human ? `${u.label}: 行き先をタップ。戦えない・異星生物に近づくと捕まる` : u.kind === 'scav' ? `${u.label}${kit}: 行き先をタップ。山で止まると資材を集める` : `${u.label}${kit}: 地面で移動、見えている敵で狙う`;
      return;
    }
    const kits = us.reduce((a, u) => a + (u.kits || 0), 0), empty = us.filter(u => !u.human && !(u.kits > 0)).length;
    const broken = us.filter(u => u.shieldMax > 0 && !(u.shieldHp > 0)).length;
    this.el.hint.textContent = `${us.length}機を選択中（キット計${kits}${empty ? `・切れ${empty}機` : ''}${broken ? `・シールド壊れ${broken}機` : ''}）: 地面をタップで移動（ばらけて並ぶ）`;
  },

  renderPicks() {
    const { sim, r } = this; if (!sim) return;
    const sel = new Set(r.ui.selected);
    const html = (this.picks || PICKS).map(p => {
      const ids = selectKind(sim.units, p.key);
      const on = ids.length > 0 && ids.length === sel.size && ids.every(id => sel.has(id));
      const hot = ids.some(id => unitById(sim, id)?.engaged);
      return `<button class="bc-pick ${on ? 'on' : ''} ${hot ? 'hot' : ''} ${p.key}" data-pick="${p.key}" ${ids.length ? '' : 'disabled'}><b>${p.label}</b><span>${ids.length}</span></button>`;
    }).join('');
    if (html !== this.lastPicks) { this.el.picks.innerHTML = html; this.lastPicks = html; }
  },
  renderAct() {
    const { sim, r } = this; if (!sim) return;
    const n = r.ui.selected.length;
    this.el.act.hidden = n === 0;
    this.el.root.classList.toggle('has-sel', n > 0);
    const onlyLauncher = n > 0 && r.ui.selected.every(id => !!unitById(sim, id)?.launch);
    for (const act of ['mode', 'stop', 'stance', 'retreat']) this.el.act.querySelector(`[data-act="${act}"]`).hidden = onlyLauncher;
    this.el.actN.textContent = onlyLauncher ? `${n}台` : `${n}機`;
    this.el.mode.textContent = r.ui.mode === 'rush' ? '急行' : '戦闘移動';
    this.el.mode.classList.toggle('rush', r.ui.mode === 'rush');
    const st = this.selStance();
    this.el.stance.textContent = st === 'free' ? '迎撃' : st === 'hold' ? 'その場' : '構え…';
    const fState = fireButtonState(sim, r.ui.selected);
    if (this.el.fire) this.el.fire.hidden = !fState.visible;
  },
  renderGroups() {
    if (!this.sim) return;
    this.el.groups.querySelectorAll('[data-group]').forEach(b => {
      const ids = pruneSelection(this.sim.units, this.groups.slots[Number(b.dataset.group)]);
      b.classList.toggle('full', ids.length > 0);
      b.dataset.n = ids.length || '';
    });
  },

  renderMission() {
    const st = missionStatus(this.sim); if (!st) return;
    if (st.story2) return this.renderStory2Mission(st);
    if (st.strike) return this.renderStoryMission(st);
    if (st.story3) return this.renderStory3Mission(st);
    const pd = Math.min(100, st.delivered / st.target * 100), pc = Math.min(100 - pd, st.carrying / st.target * 100);
    this.el.matDel.style.width = `${pd}%`;
    this.el.matCar.style.left = `${pd}%`; this.el.matCar.style.width = `${pc}%`;
    this.el.matTxt.textContent = `資材 ${Math.floor(st.delivered)}／${st.target}（運搬中 ${Math.floor(st.carrying)}）`;
    this.el.count.textContent = `ロボ${st.robots}/${st.capRobots}・人${st.humans}/${st.capHumans}`;
    this.el.clock.textContent = `${fmtTime(st.elapsed)}${st.finds ? `　★${st.finds}` : ''}`;
    // v0.4.0-dev: 捕まった人間は巣へ運ばれる。運ばれている途中か、もう巣にいるかで言い方を変える
    const caught = this.sim.units.filter(u => u.side === 'ally' && u.captured != null);
    const carried = caught.filter(u => u.captured !== 'nest').map(u => u.label), nested = caught.filter(u => u.captured === 'nest').map(u => u.label);
    this.el.alert.hidden = !caught.length; this.el.root.classList.toggle('alerting', caught.length > 0);
    if (caught.length) {
      const parts = [];
      if (carried.length) parts.push(`${carried.join('・')}が運ばれている！ 運んでいる異星生物を倒すと助けられる`);
      if (nested.length) parts.push(`${nested.join('・')}が巣に連れていかれた！ 巣の敵を倒してロボを近づけると助けられる`);
      this.el.alert.textContent = parts.join('　') + (st.boyCaptured ? '（少年を助けないと脱出できない）' : '');
    }
  },

  /** v1.0.2 物語: 上の帯は「いまやること」（掘る → つなぐ → ひっぱる → 撃つ → 調べる）と、その進み具合 */
  renderStoryMission(st) {
    const hud = storyHud(this.sim), sim = this.sim;
    this.el.matDel.style.width = `${Math.round(Math.min(1, Math.max(0, hud.frac)) * 100)}%`;
    this.el.matCar.style.width = '0%';
    this.el.matTxt.textContent = hud.text;
    this.el.matTxt.parentElement.style.borderColor = hud.warn ? '#dc2626' : ''; // 急ぐ時（発射準備・調べられない）は赤い枠（CSS は変えない）
    const neji = sim.units.find(u => u.id === sim.strike.nejiId), boy = sim.units.find(u => u.side === 'ally' && u.kind === 'boy');
    this.el.count.textContent = `ネジ ${neji ? Math.ceil(neji.hp) : 0}/${neji ? neji.maxHp : 0}・少年 ${!boy ? 'ー' : boy.ride ? '背中' : '歩き'}`;
    this.el.clock.textContent = fmtTime(st.elapsed);
    const caught = boy && boy.captured != null;
    this.el.alert.hidden = !caught; this.el.root.classList.toggle('alerting', !!caught);
    if (caught) this.el.alert.textContent = '少年が連れていかれる！';
    this.storyOps?.refresh();
  },

  renderStory2Mission(st) {
    const h = story2Hud(this.sim), boy = this.sim.units.find(u => u.kind === 'boy');
    this.el.matDel.style.width = `${Math.min(1, h.frac) * 100}%`; this.el.matCar.style.width = '0%';
    this.el.matTxt.textContent = h.text;
    this.el.count.textContent = `ロボ${st.robots}・少年 ${boy?.ride ? '背中' : '歩き'}`;
    this.el.clock.textContent = fmtTime(st.elapsed); this.storyOps?.refresh();
    this.el.alert.hidden = boy?.captured == null;
    if (boy?.captured != null) this.el.alert.textContent = '少年が運ばれている！ ポンコ02で運ぶ敵を倒して！';
  },
  showStory2Result(sim) {
    const t = story2ResultText(sim), win = sim.result === 'win';
    this.el.result.querySelector('.bc-result-rec-row').style.display = 'none';
    this.el.resultTitle.textContent = t.title; this.el.resultTitle.classList.toggle('win', win);
    this.el.resultBanner.src = RESULT_BANNER_URL[win ? 'win' : 'lose']; this.el.resultBanner.hidden = false;
    this.el.resultText.textContent = `${t.why} かかった時間 ${fmtTime(sim.time)}`;
    this.el.result.hidden = false;
    if (win && sim.story2.step === 1 && !this.el.root.querySelector('.bc-story2-next')) {
      const b = document.createElement('button'); b.className = 'bc-story2-next'; b.textContent = '2-2 むせんとうへ';
      b.style.cssText = 'width:100%;height:44px;margin-bottom:10px;font-size:16px;font-weight:700';
      b.onclick = () => { if (nextStory2(this.story)) this.restart(); };
      this.el.result.querySelector('.bc-result-box').insertBefore(b, this.el.result.querySelector('.bc-result-btns'));
    }
  },

  showResult() {
    BotCommanderGame.showResultMain.call(this);
    BotCommanderGame.renderResultStats.call(this); // v1.0.6: どの結果の画面でも、下にロボごとの成績とランキング
  },

  /** v1.0.6 結果の画面の「ロボごとの成績」（数えていない時は何も出さない） */
  renderResultStats() {
    const box = this.el?.resultStats; if (!box) return;
    box.innerHTML = this.unitStats && this.sim ? statsHtml(this.unitStats.summary(), { title: 'ロボごとの成績' }) : '';
  },

  /** v1.0.6 ☰ の「今の成績（ロボごと）」: 遊んでいる途中の成績を開く */
  openStatsView() {
    const sum = this.unitStats?.summary();
    this.el.statsBody.innerHTML = sum && sum.rows.length ? statsHtml(sum, { title: `今の成績（${fmtTime(this.sim?.time || 0)}）` }) : '<p class="bc-st-empty">まだ数えるものがありません</p>';
    this.el.stats.hidden = false;
  },

  showResultMain() {
    const sim = this.sim, st = missionStatus(sim);
    if (!st) return this.showDemoResult(sim); // ミッションのないお試し（?altunits=1 など）は missionStatus が null。資材の話は出さない
    if (st.story2) return this.showStory2Result(sim);
    if (st.strike) return this.showStoryResult(sim, st);
    if (st.story3) return this.showStory3Result(sim, st);
    const win = sim.result === 'win';
    const left = sim.units.filter(u => u.side === 'ally' && !u.human && !u.object).length; // 物（?launcher=1 の撃たずに残った発射台）はロボに数えない
    const humans = sim.units.filter(u => u.side === 'ally' && u.human && u.captured == null).length;
    this.el.resultTitle.textContent = win ? '脱出成功' : '作戦失敗';
    const banner = this.el.resultBanner; // v1.0.1 Codex gfx4 RESULT: カードの上の絵（文字なし）。読めない時は出さない
    banner.onerror = () => { banner.hidden = true; }; banner.src = RESULT_BANNER_URL[win ? 'win' : 'lose']; banner.hidden = false;
    this.el.resultTitle.classList.toggle('win', win);
    const why = win ? '資材を脱出口へ届けた！' : sim.resultReason === 'boyCaptured' ? 'ロボが全滅し、少年が連れていかれた…' : 'ロボも人間も、もう動けない…';
    this.el.resultText.innerHTML = `${why}<br>届けた資材 ${Math.floor(st.delivered)}／${st.target}<br>残ったロボ ${left}機・人 ${humans}人　かかった時間 ${fmtTime(sim.time)}${st.finds ? `<br>掘り出し物 ★${st.finds}（${[...new Set(sim.mission.finds.map(f => f.name))].join('・')}）` : ''}`;
    this.el.result.hidden = false;
    this.recordResult(sim, st, win, left + humans);
  },

  /** ミッションのないお試し（?altunits=1・?altdemo=1・?ridedemo=1）の結果の画面。記録には足さない（recordResult は mission.id がないと何もしない） */
  showDemoResult(sim) {
    const v = demoResultView(sim);
    this.el.resultTitle.textContent = v.title;
    const banner = this.el.resultBanner;
    banner.onerror = () => { banner.hidden = true; }; banner.src = RESULT_BANNER_URL[v.win ? 'win' : 'lose']; banner.hidden = false;
    this.el.resultTitle.classList.toggle('win', v.win);
    this.el.resultText.innerHTML = v.html;
    this.el.result.hidden = false;
  },

  /** 第 3 章（?storych=3）: 上の帯は「いまやること」と進み具合。ネジ・PONCO02 の HP と人間の数を出す */
  renderStory3Mission(st) {
    const hud = story3Hud(this.sim), sim = this.sim;
    this.el.matDel.style.width = `${Math.round(Math.min(1, Math.max(0, hud.frac)) * 100)}%`;
    this.el.matCar.style.width = '0%';
    this.el.matTxt.textContent = hud.text;
    this.el.matTxt.parentElement.style.borderColor = hud.warn ? '#dc2626' : '';
    const hp = k => { const u = sim.units.find(v => v.side === 'ally' && v.kind === k); return u ? Math.ceil(u.hp) : 0; };
    this.el.count.textContent = `ネジ ${hp('scav')}・PONCO02 ${hp('ponco')}・人${st.humans}/${st.capHumans}`;
    this.el.clock.textContent = fmtTime(st.elapsed);
    const caught = sim.units.filter(u => u.side === 'ally' && u.captured != null);
    this.el.alert.hidden = !caught.length; this.el.root.classList.toggle('alerting', caught.length > 0);
    if (caught.length) this.el.alert.textContent = `${caught.map(u => u.label).join('・')}が連れていかれる！ 運んでいる敵を倒すと助けられる`;
  },

  /** 第 3 章の結果の画面。勝って、次のミッションがあるなら「つぎへ」を足す */
  showStory3Result(sim, st) {
    const win = sim.result === 'win', t = story3ResultText(sim);
    this.el.resultTitle.textContent = t.title;
    const banner = this.el.resultBanner;
    banner.onerror = () => { banner.hidden = true; }; banner.src = RESULT_BANNER_URL[win ? 'win' : 'lose']; banner.hidden = false;
    this.el.resultTitle.classList.toggle('win', win);
    this.el.resultText.innerHTML = `${t.why}<br>倒した敵 ${t.killed}体<br>かかった時間 ${fmtTime(sim.time)}`;
    const nx = win && this.story?.ch ? nextStage(this.story.ch, this.story.stage) : null;
    if (nx && !this.el.nextStage) {
      const b = document.createElement('button'); b.className = 'bc-result-next'; b.textContent = `つぎへ（${stageOf(this.story.ch, nx).label}）`;
      b.addEventListener('click', () => this.startChapter(this.story.ch, nx));
      const row = this.el.result.querySelector('.bc-result-btns'); row.style.flexWrap = 'wrap';
      b.style.flex = '1 0 100%'; row.appendChild(b); this.el.nextStage = b;
    }
    this.el.result.hidden = false;
  },

  /** v1.0.2 物語の結果の画面（設計図を見つけた／作戦失敗。負けた理由はネジ・少年） */
  showStoryResult(sim, st) {
    const win = sim.result === 'win', t = storyResultText(sim);
    this.el.resultTitle.textContent = t.title;
    const banner = this.el.resultBanner;
    banner.onerror = () => { banner.hidden = true; }; banner.src = RESULT_BANNER_URL[win ? 'win' : 'lose']; banner.hidden = false;
    this.el.resultTitle.classList.toggle('win', win);
    this.el.resultText.innerHTML = `${t.why}<br>ミサイルで倒した敵 ${t.kills}体<br>かかった時間 ${fmtTime(sim.time)}`;
    this.el.result.hidden = false;
    const alive = sim.units.filter(u => u.side === 'ally' && !u.object && u.captured == null).length;
    this.recordResult(sim, st, win, alive);
  },

  /** 記録（js/save）: 本番の始まり方（URL に何も付かない／見た目だけ）の時だけ、結果が出た時に 1 回だけ足す。失敗しても遊びは止めない */
  recordResult(sim, st, win, survivors) {
    if (this.recordedSim === sim || !sim.mission?.id || this.player || this.tutorial || !shouldRecord(location.search)) return; // 再生・チュートリアルは記録に足さない
    this.recordedSim = sim;
    try { const rec = recordMissionResult({ id: sim.mission.id, win, time: sim.time, delivered: Math.floor(st.delivered), lost: Math.max(0, st.capRobots - (sim.units.filter(u => u.side === 'ally' && !u.human && !u.object).length)), survivors }); this.noteSaveFailure(rec); } // v1.0.0: 一番よい記録は残った数（ロボ＋捕まっていない人間）が多いほう
    catch (e) { console.warn('record failed', e); }
  },
  /** R-07: 保存先がいっぱい・書き込み禁止で記録を残せなかった時、結果のカードに一言足す（遊びは止めない） */
  noteSaveFailure(rec) {
    if (!rec || rec.saved !== false || !this.el?.resultText) return;
    this.el.resultText.innerHTML += `<br>${SAVE_FAIL_TEXT}`;
  },
  /** ☰ メニューの「記録」: 記録の画面を重ねる（閉じるとメニューに戻る） */
  async openRecordsView() {
    if (this.records) return;
    const titles = { [MISSION_1.id]: MISSION_1.title };
    if (this.sim?.mission?.id && this.sim.mission.title) titles[this.sim.mission.id] = this.sim.mission.title;
    this.records = {}; // 開いている間の二重押し止め
    try {
      const { openRecords } = await import('./save/records-view.js?v=5');
      if (!this.alive) { this.records = null; return; }
      this.records = await openRecords(this.el.root, { titles, onClose: () => { this.records = null; }, onReset: () => { this.loadout = undefined; } }); // 消したら、覚えている武器庫の選びも捨てる（次の出撃から標準）
    } catch (e) { console.warn('records failed', e); this.records = null; }
  },

  setSpeed(v) {
    if (!this.state) return; v = normalizeSpeed(v); this.state.speed = v;
    this.container.querySelectorAll('[data-speed]').forEach(b => { const on = Number(b.dataset.speed) === v; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
    const hud = this.el && this.el.speed; if (hud) { const t = hudSpeedText(v); hud.textContent = t; hud.hidden = !t; }
  },
  setPaused(v) {
    if (!this.state) return;
    this.state.paused = v;
    if (!v) this.spotPaused = false;
    this.el.pause.textContent = v ? '▶' : '⏸';
    this.el.pause.classList.toggle('on', v);
    this.el.root.classList.toggle('paused', v);
  },

  setSpotPause(v) {
    this.spotPause = !!v;
    storage.set('bc-spotpause', this.spotPause);
    this.container.querySelectorAll('[data-spotpause]').forEach(b => {
      const on = (b.dataset.spotpause === '1') === this.spotPause;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
  },

  scanSpotReport(sim) {
    if (this.player || !sim || sim.result || !this.el.result.hidden) return;
    const spots = newSpots(sim, this.seenGroups);
    if (!spots.length) return;
    const busy = sim.time <= 1 || this.tutorial || this.tutorialOn || this.menuOpen || this.storyOps?.aiming || this.launcherUi?.picking || this.el.root.classList.contains('bc-dialog-open') || !!this.el.root.querySelector('.dlg');
    if (busy) return; // 始まりの 1 秒（最初から見えている敵）・チュートリアル・会話・メニュー・狙い中は、群れを覚えるだけ
    const { enemy, spotter } = spots[0];
    const who = spotter?.label || '味方';
    this.toast(`${who}：敵を発見！`, 'warn');
    if (this.r?.cam) {
      this.r.cam.x = enemy.x; this.r.cam.y = enemy.y; this.r.clampCam?.();
    }
    if (this.spotPause) {
      if (this.state.speed > 1) this.setSpeed(1);
      this.setPaused(true);
      this.spotPaused = true;
      this.el.hint.textContent = '敵を発見！ ▶で再開（タップで命令できます）';
    }
  },

  inMission() { return !!(this.sim && !this.sim.result && this.el.result.hidden); },
  openMenu() {
    if (!this.inMission() || this.menuOpen) return;
    this.menuOpen = true; this.menuPrevPaused = !!this.state?.paused;
    this.setPaused(true); this.el.menu.hidden = false;
  },
  closeMenu() {
    if (!this.menuOpen) return;
    this.menuOpen = false; this.el.menu.hidden = true; this.setPaused(this.menuPrevPaused);
  },
  requestBack() {
    // メニューから来たときは、メニューを開く前の一時停止状態を覚える
    const fromMenu = this.menuOpen;
    if (fromMenu) { this.menuOpen = false; this.el.menu.hidden = true; }
    const r = requestBack(this.backConfirm, { inMission: this.inMission(), paused: fromMenu ? this.menuPrevPaused : !!this.state?.paused });
    if (r === 'exit') return this.exit();
    if (r === 'open') { this.setPaused(true); this.el.confirm.hidden = false; this.el.confirm.querySelector('.bc-confirm-stay').focus({ preventScroll: true }); }
  },
  cancelBack() {
    const prev = cancelBack(this.backConfirm);
    if (prev === null) return;
    this.el.confirm.hidden = true;
    this.setPaused(prev);
  },

  destroy() {
    this.alive = false;
    try { window.__dialog?.skip(); } catch { /* 会話が出たまま閉じるとき、会話側の keydown リスナーなどを片づける */ }
    this.seenGroups = null; this.spotPaused = false;
    if (this.onPopState) window.removeEventListener('popstate', this.onPopState);
    if (this.pushedHistory && history.state?.botCommander) { this.pushedHistory = false; try { history.back(); } catch {} }
    clearTimeout(this.toastTimer);
    this.clearReplayUi();
    this.tutorial?.destroy(); this.tutorial = null;
    this.ridePanel?.destroy(); this.ridePanel = null; this.storyOps?.destroy(); this.storyOps = null; clearTimeout(this.midTimer);
    this.launcherUi?.destroy(); this.launcherUi = null; this.suitMenu?.destroy(); this.suitMenu = null;
    if (this.onVisibility) document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.r) { this.r.app.ticker.remove(this.tick); this.r.destroy(); }
    this.r = null; this.sim = null;
    this.demo?.destroy(); this.demo = null;
    this.armory?.destroy(); this.armory = null;
    this.records?.close?.(); this.records = null;
    delete window.__botCommander;
  },

  exit() {
    this.destroy();
    this.onBackToHub?.();
  },
};

export default BotCommanderGame;
