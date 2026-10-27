// チュートリアルの「段」と、練習の場面（データと、その場面を作る関数だけ。画面は触らない）。
// 今の MISSION_1 や sim の数値は変えない。練習の場面は createSim({ mission }) に別のミッションを渡して作る。数値はすべて（仮）。
import { createSim, unitById } from '../sim/sim.js?v=30';
import { nearestPassable, tileCenter } from '../sim/map.js?v=6';

/**
 * 練習のミッション（仮）。資材 20 を脱出口へ届けるだけの小さな地図。MISSION_1 と同じ地図（seed 7）の、本陣に近い所を使う。
 * ツギハギ号 2・PONCO 3（ガンナー2・リペアラー1）・少年 1。敵は弱くした異星生物 1 体（createTutorialSim で HP を下げる）。
 */
export const TUTORIAL_MISSION = Object.freeze({
  id: 'tutorial',
  title: 'れんしゅう',
  target: 20,
  salvage: [{ tx: 27, ty: 51, amount: 30 }],
  extraction: { tx: 15, ty: 46 },
  nest: { tx: 6, ty: 40 },
  ally: [
    { kind: 'scav', tx: 20, ty: 54, count: 2, cls: 'scavenger' },
    { kind: 'ponco', tx: 17, ty: 53, count: 3, cls: ['gunner', 'gunner', 'repairer'] },
    { kind: 'boy', tx: 21, ty: 57 },
  ],
  aliens: [
    { name: 'れんしゅう', kind: 'alien', count: 1, route: [{ tx: 23, ty: 48 }] },
  ],
});
/** 練習の敵の HP（仮）。ふつうの異星生物（360）より、ずっと弱い */
export const TUTORIAL_ALIEN_HP = 60;

/** 練習の場面の sim を作る。MISSION_1 とは別の物（seed だけ引き継ぐ）。敵を弱くするのは、始める前の1回だけ */
export function createTutorialSim({ seed = 1, mapSeed = 7 } = {}) {
  const sim = createSim({ seed, mapSeed, mission: TUTORIAL_MISSION });
  for (const u of sim.units) if (u.side === 'enemy') { u.hp = Math.min(u.hp, TUTORIAL_ALIEN_HP); u.maxHp = Math.min(u.maxHp, TUTORIAL_ALIEN_HP); }
  return sim;
}

/** 「光っている所の地面をタップ」の場所。味方の真ん中から敵のほうへ少し進んだ所（歩ける所へ寄せる）。ワールド座標 */
export function aheadPoint(sim) {
  const al = sim.units.filter(u => u.side === 'ally' && !u.human);
  const en = sim.units.find(u => u.side === 'enemy' && u.hp > 0);
  const cx = al.reduce((a, u) => a + u.x, 0) / Math.max(1, al.length), cy = al.reduce((a, u) => a + u.y, 0) / Math.max(1, al.length);
  const tx = en ? en.x : cx, ty = en ? en.y : cy - 160;
  const k = 0.8, px = cx + (tx - cx) * k, py = cy + (ty - cy) * k; // 敵まで 8 割（敵が近くまで見える所）
  const t = nearestPassable(sim.map, Math.floor(px / 32), Math.floor(py / 32));
  return t ? { x: tileCenter(t.tx), y: tileCenter(t.ty) } : { x: px, y: py };
}

/** 始めのカメラの中心（ワールド座標）。味方と敵のあいだ（敵寄り。敵と、光らせる地面が画面のはしに寄らないように）。上の帯・下のボタンぶん少し上へ */
export function startView(sim) {
  const al = sim.units.filter(u => u.side === 'ally' && !u.human), en = sim.units.filter(u => u.side === 'enemy');
  const mean = (us, k) => us.reduce((a, u) => a + u[k], 0) / Math.max(1, us.length);
  const cx = mean(al, 'x'), cy = mean(al, 'y'), ex = en.length ? mean(en, 'x') : cx, ey = en.length ? mean(en, 'y') : cy - 160;
  return { x: cx * 0.35 + ex * 0.65, y: cy * 0.35 + ey * 0.65 - 40 };
}

/** 「最初の1体」など、段が指す機体 */
export const ponco = sim => sim.units.filter(u => u.side === 'ally' && u.kind === 'ponco' && u.hp > 0);
export const firstOf = (sim, id) => unitById(sim, id);

/**
 * 段。text は1〜2行。target は光らせる所:
 *   { css } 画面の部品（.bc-root の中の selector）／ { units: 'ponco'|'enemy' } 地図の中の機体 ／ { point: 'ahead' } 地面の1か所 ／ null（光らせない）
 * prep: 段に入った時にやっておくこと（'clearSel' 選択を外す・'selectPonco' PONCO を全部選ぶ・'selectOne' PONCO を1機だけ選ぶ・'view' カメラを始めの位置へ・'fight' 戦闘移動にもどす・'speed1' 速さを 1x にもどす）
 * until: この操作が起きたら次へ（なければ「つぎへ」だけ）。test は操作の中身の条件
 * skipIf: 段に入った時にこれが true なら、その段はとばす（敵がもういない・メニューが閉じている、など。ctx は { sim, state, menuOpen }）
 */
export const STEPS = Object.freeze([
  { id: 'select', text: 'ロボをタップして選ぼう。もう一度タップすると外せる。', target: { units: 'ponco' }, prep: ['clearSel'], until: { type: 'select', test: ev => ev.ids.length >= 1 } },
  { id: 'group', text: '上のボタンか長押しで同じ種類を選べる。「囲む」を押さえて地図をなぞると、囲んだロボも選べる。', target: { css: '.bc-picks' }, prep: ['clearSel'], until: { type: 'select', test: ev => ev.ids.length >= 2 } },
  { id: 'move', text: '光っている所の地面をタップすると、選んだロボがそこへ動く。', target: { point: 'ahead' }, prep: ['view', 'selectPonco'], until: { type: 'order' } },
  { id: 'mode', text: '下のボタンで、戦闘移動（敵がいたら撃つ）と急行（撃たずに走る）を切り替える。', target: { css: '.bc-act [data-act="mode"]' }, prep: ['selectPonco'], until: { type: 'mode' } },
  { id: 'attack', text: '見えている敵をタップすると狙う。見えないときは、ロボを前へ進めよう。', target: { units: 'enemy' }, prep: ['selectPonco', 'fight'], until: { type: 'attack' }, skipIf: ctx => !ctx.sim.units.some(u => u.side === 'enemy' && u.hp > 0) },
  { id: 'pan', text: 'ドラッグで画面を動かせる。', target: null, until: { type: 'pan' } },
  { id: 'zoom', text: '2本の指を広げたり縮めたりすると、ズームできる。', target: null, until: { type: 'zoom' } },
  { id: 'pause', text: '⏸ で一時停止。止まっている間も、命令は出せる。', target: { css: '.bc-pause' }, until: { type: 'pause', test: ev => ev.paused } },
  { id: 'resume', text: 'もう一度押すと、再開する。', target: { css: '.bc-pause' }, until: { type: 'pause', test: ev => !ev.paused }, skipIf: ctx => !ctx.state.paused },
  { id: 'menu', text: '☰ メニューを開こう。', target: { css: '.bc-menu-btn' }, until: { type: 'menu', test: ev => ev.open } },
  { id: 'speed', text: '速さを 2x にしてみよう。0.5x でゆっくりにもできる。', target: { css: '[data-speed="2"]' }, until: { type: 'speed', test: ev => ev.speed === 2 }, skipIf: ctx => !ctx.menuOpen },
  { id: 'menuClose', text: '「ゲームにもどる」でメニューを閉じる。', target: { css: '.bc-menu-close' }, until: { type: 'menu', test: ev => !ev.open }, skipIf: ctx => !ctx.menuOpen },
  { id: 'shield', text: 'シールドは攻撃を受け止める。残りは下の文字に出て、壊れると赤い知らせが出る。', target: { css: '.bc-hint' }, prep: ['speed1', 'selectOne'] },
  { id: 'kit', text: 'リペアキットは、HP が減ると自動で使う。数は下の文字に出て、なくなると知らせる。', target: { css: '.bc-hint' }, prep: ['selectOne'] },
  { id: 'goal', text: '資材を集めて、脱出口へ届けよう。少年が捕まると負け。', target: { css: '.bc-mat' }, last: true },
]);
