import { robotNameOf, robotTextHtml } from '../names/robot-names.js?v=1';
// 人間がロボに乗るお試し（?ridedemo=1）の操作パネル。選んだ人・ロボに合わせて「背中に乗る」「中に乗る」「降りる」「こわす」を出す。
// 乗る・降りるの決まりは js/sim/ride.js。ここは画面（DOM）と、出来事（sim.fx）を短い知らせにするところだけ。
import { loadCss } from '../../../common/js/load-css.js';
import { RIDE_MODE, RIDE_MESSAGES, isHostKind, canBoard, canAlight, issueBoard, issueAlight, ridersOf, rideCapacity } from '../sim/ride.js?v=3';
import { unitById } from '../sim/sim.js?v=29';

export const loadRideCss = () => loadCss(new URL('../../css/ride.css?v=2', import.meta.url).href);

const MODE_NAME = { back: '背中', inside: '中' };
const nameOf = u => u?.label || '人';

/**
 * 操作パネルを作る。root: .bc-root、sim、r: 描画（r.ui.selected を読む）、toast(text, tone)、onChange(): 選択が変わった時
 * 返り値: { update() 0.2秒ごと, scan() 毎フレーム（出来事の知らせ）, destroy() }
 */
export function mountRidePanel({ root, sim, r, toast, onChange }) {
  const el = document.createElement('div');
  el.className = 'bc-ride';
  el.innerHTML = `<div class="bc-ride-msg"></div><div class="bc-ride-btns">
    <button data-ride="back">背中に乗る</button><button data-ride="inside">中に乗る</button><button data-ride="alight">降りる</button><button data-ride="break" aria-label="選んだロボをこわす（試し）">こわす</button></div>`;
  root.appendChild(el);
  const $ = s => el.querySelector(s);
  const msg = $('.bc-ride-msg'), btn = { back: $('[data-ride="back"]'), inside: $('[data-ride="inside"]'), alight: $('[data-ride="alight"]'), break: $('[data-ride="break"]') };
  // 地図にタップを通さない
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'wheel']) el.addEventListener(ev, e => e.stopPropagation());
  const seen = new WeakSet();

  const selected = () => (r.ui.selected || []).map(id => unitById(sim, id)).filter(Boolean);
  const hosts = () => sim.units.filter(isHostKind);

  /** 選んだ人間それぞれを、そばの乗れるロボに割り当てる。割り当てられなかった人の理由も返す */
  function plan(humans, mode) {
    const pending = new Map(), out = [], why = [];
    for (const h of humans) {
      let pick = null, reason = 'noHost';
      const near = hosts().sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y));
      for (const host of near) {
        const c = canBoard(sim, h, host, mode, { pending: pending.get(host.id) || 0 });
        if (c.ok) { pick = host; break; }
        if (host === near[0] || c.reason === 'full') reason = c.reason; // いちばん近いロボに乗れなかった理由（満員なら満員）
      }
      if (pick) { pending.set(pick.id, (pending.get(pick.id) || 0) + 1); out.push({ h, host: pick }); } else why.push(reason);
    }
    return { out, why };
  }

  function update() {
    const sel = selected(), humans = sel.filter(u => u.human && !u.ride), hs = sel.filter(isHostKind);
    const pb = plan(humans, RIDE_MODE.BACK), pi = plan(humans, RIDE_MODE.INSIDE);
    btn.back.disabled = !pb.out.length; btn.inside.disabled = !pi.out.length;
    // 降りる: 選んだロボに乗っている人（乗り終わっている人）
    const riders = hs.flatMap(h => ridersOf(sim, h.id).filter(u => canAlight(sim, u).ok));
    btn.alight.disabled = !riders.length; btn.alight.textContent = riders.length ? `降りる（${riders.length}）` : '降りる';
    btn.break.disabled = !hs.length;
    let text;
    if (humans.length && (pb.out.length || pi.out.length)) text = `${humans.map(nameOf).join('・')}: ${pb.out.length ? 'そばのロボの背中' : ''}${pb.out.length && pi.out.length ? 'か' : ''}${pi.out.length ? '中' : ''}に乗れる`;
    else if (humans.length) text = `${RIDE_MESSAGES[(pb.why[0] === 'cannot' ? pi.why[0] : pb.why[0]) || 'noHost'] || RIDE_MESSAGES.noHost}`;
    else if (hs.length) {
      const h = hs[0], b = ridersOf(sim, h.id, RIDE_MODE.BACK).length, i = ridersOf(sim, h.id, RIDE_MODE.INSIDE).length;
      text = `${robotNameOf(sim, h)}: 背中 ${b}/${rideCapacity(h, RIDE_MODE.BACK)}${rideCapacity(h, RIDE_MODE.INSIDE) ? `・中 ${i}/${rideCapacity(h, RIDE_MODE.INSIDE)}` : ''}${hs.length > 1 ? `（ほか${hs.length - 1}機）` : ''}`;
    } else text = '人間を選び、ロボのそばで「乗る」。ロボを選ぶと「降りる」';
    const html = robotTextHtml(text); if (msg.innerHTML !== html) msg.innerHTML = html;
  }

  function board(mode) {
    const humans = selected().filter(u => u.human && !u.ride), { out } = plan(humans, mode);
    let n = 0;
    for (const { h, host } of out) if (issueBoard(sim, h.id, host.id, mode).ok) n++;
    if (n) { r.ui.selected = r.ui.selected.filter(id => !out.some(o => o.h.id === id)); onChange?.(); } // 乗った人は選べなくなる
    update();
  }
  function alight() {
    const ids = selected().filter(isHostKind).flatMap(h => ridersOf(sim, h.id).map(u => u.id));
    const n = issueAlight(sim, ids);
    if (!n && ids.length) toast(RIDE_MESSAGES[canAlight(sim, unitById(sim, ids[0])).reason] || RIDE_MESSAGES.air, 'warn'); // 空の上・水中で降りられない
    update();
  }
  function breakHosts() { // 確かめ用: 選んだロボをこわす（乗っている人が降ろされるところを見る）
    for (const h of selected().filter(isHostKind)) h.hp = 0;
    update();
  }
  btn.back.addEventListener('click', () => board(RIDE_MODE.BACK));
  btn.inside.addEventListener('click', () => board(RIDE_MODE.INSIDE));
  btn.alight.addEventListener('click', alight);
  btn.break.addEventListener('click', breakHosts);

  /** sim.fx の出来事 → 短い知らせ（1つの出来事は1回だけ） */
  function scan() {
    for (const f of sim.fx) {
      if (seen.has(f) || !String(f.type).startsWith('ride')) continue;
      seen.add(f);
      const who = f.label || '人';
      if (f.type === 'rideOn') toast(`${who}が${MODE_NAME[f.mode]}に乗った`);
      else if (f.type === 'rideOff') toast(`${who}が降りた`);
      else if (f.type === 'rideEject') toast(f.dmg ? `${who}が放り出された！ -${f.dmg}` : `${who}が降ろされた`, 'warn');
      else if (f.type === 'rideHit') toast(`${who}にも当たった！ -${f.dmg}`, 'warn');
      else if (f.type === 'rideLost') toast(`${who}が捕まった！`, 'warn');
      else if (f.type === 'rideFail') toast(RIDE_MESSAGES[f.reason] || RIDE_MESSAGES.busy, 'warn');
    }
  }

  update();
  return { update, scan, destroy() { el.remove(); } };
}
