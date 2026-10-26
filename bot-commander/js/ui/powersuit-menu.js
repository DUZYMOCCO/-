// パワードスーツ（?powersuit=1 の試作）の ☰ メニューの中の項目。地図の上にはボタンを増やさない（決定）。
//   「スーツを着る／スーツを脱ぐ」（選んでいる人間で。選んでいなければスーツを持っている人）・「ロボに乗る／おりる」（着たままでは出さない＝決定 6）・状態の文字。
// 命令はすべて sim.commands に入れる（リプレイに残る）。一時停止中（☰ は開くと一時停止）に押したら applyNow ですぐ効かせる。
// 決まりは js/sim/powersuit.js。ここは画面（DOM）と、出来事（sim.fx）を短い知らせにするところだけ。sim.powersuit がある時だけ index.js が付ける。
import { SUIT_MESSAGES, canDon, canDoff, issueDon, issueDoff, suitStatus, blocksBoarding, POWERSUIT } from '../sim/powersuit.js?v=1';
import { RIDE_MODE, RIDE_MESSAGES, isHostKind, canBoard, canAlight, issueBoard, issueAlight } from '../sim/ride.js?v=3';
import { unitById } from '../sim/sim.js?v=27';

export const SUIT_MENU_LABELS = Object.freeze({ don: 'スーツを着る', doff: 'スーツを脱ぐ', board: 'ロボに乗る', alight: 'ロボからおりる' });
const PHASE_TEXT = { off: '', donning: '着ている途中…', on: '着ている', doffing: '脱いでいる途中…' };
const REPAIR_BY = { base: '拠点', repairer: 'リペアラー' };

/** 操作する人間: 選んでいる人間（先頭）→ スーツを持っている人 → 最初の人間 */
export function suitActor(sim, selectedIds = []) {
  for (const id of selectedIds) { const u = unitById(sim, id); if (u && u.human && u.side === 'ally') return u; }
  const st = suitStatus(sim), owner = st?.ownerId != null ? unitById(sim, st.ownerId) : null;
  return owner || sim.units.find(u => u.side === 'ally' && u.human && !u.aiAlly) || null;
}

/** そばのロボで、背中に乗れる最初の 1 機（近い順）。なければ最も近いロボに乗れない理由 */
export function nearestBoardable(sim, h) {
  const hosts = sim.units.filter(isHostKind).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y));
  let reason = 'noHost';
  for (const host of hosts) { const c = canBoard(sim, h, host, RIDE_MODE.BACK); if (c.ok) return { host, reason: null }; if (host === hosts[0]) reason = c.reason; }
  return { host: null, reason };
}

/** ☰ の項目の表示（文字・押せるか・出すか）を決める。DOM なし（テスト用）。h＝操作する人間 */
export function suitMenuState(sim, h) {
  const st = suitStatus(sim), out = { status: '', don: { text: SUIT_MENU_LABELS.don, on: false, show: true, why: null }, ride: { text: SUIT_MENU_LABELS.board, on: false, show: true, why: null } };
  if (!st) return out;
  const worn = !!h?.suitOn;
  const pieces = [`${st.name}　HP ${Math.ceil(st.hp)}／${st.maxHp}`];
  if (st.lost) pieces.push('なくした');
  else if (st.phase !== 'off') pieces.push(`${PHASE_TEXT[st.phase]}（${st.ownerLabel ?? '？'}）`);
  else pieces.push(st.broken ? `こわれている（${st.ownerLabel ?? '？'}が持っている）` : `${st.ownerLabel ?? '？'}が持っている`);
  if (st.repairing) pieces.push(`直している（${REPAIR_BY[st.repairing]}）`);
  else if (st.broken || st.hp < st.maxHp) pieces.push('直すには拠点かリペアラーのそばへ');
  out.status = pieces.join('・');
  // 着る／脱ぐ（1 つのボタン）
  if (worn) { const c = canDoff(sim, h); out.don = { text: SUIT_MENU_LABELS.doff, on: c.ok, show: true, why: c.ok ? null : SUIT_MESSAGES[c.reason] }; }
  else { const c = canDon(sim, h); out.don = { text: SUIT_MENU_LABELS.don, on: c.ok, show: true, why: c.ok ? null : SUIT_MESSAGES[c.reason] }; }
  // ロボに乗る／おりる: スーツを着ている間（着る・脱ぐ途中も）は出さない（決定 6）
  if (!h || blocksBoarding(h)) out.ride = { text: SUIT_MENU_LABELS.board, on: false, show: false, why: RIDE_MESSAGES.suited };
  else if (h.ride) { const c = canAlight(sim, h); out.ride = { text: SUIT_MENU_LABELS.alight, on: c.ok, show: true, why: c.ok ? null : RIDE_MESSAGES[c.reason] }; }
  else { const n = nearestBoardable(sim, h); out.ride = { text: SUIT_MENU_LABELS.board, on: !!n.host, show: true, why: n.host ? null : RIDE_MESSAGES[n.reason] }; }
  return out;
}

/** 押した時の動き。ok なら sim.commands に命令を入れる。{ ok, text } */
export function suitToggleWear(sim, h) {
  if (!h) return { ok: false, text: SUIT_MESSAGES.noHuman };
  if (h.suitOn) { const r = issueDoff(sim, h.id); return { ok: r.ok, text: r.ok ? `${h.label}がスーツを脱ぐ…（${POWERSUIT.doffSec}秒）` : SUIT_MESSAGES[r.reason] }; }
  const r = issueDon(sim, h.id); return { ok: r.ok, text: r.ok ? `${h.label}がスーツを着る…（${POWERSUIT.donSec}秒そのまま）` : SUIT_MESSAGES[r.reason] };
}
export function suitToggleRide(sim, h) {
  if (!h) return { ok: false, text: SUIT_MESSAGES.noHuman };
  if (blocksBoarding(h)) return { ok: false, text: RIDE_MESSAGES.suited };
  if (h.ride) { const r = canAlight(sim, h); if (!r.ok) return { ok: false, text: RIDE_MESSAGES[r.reason] }; return { ok: issueAlight(sim, [h.id]) > 0, text: `${h.label}がロボからおりる` }; }
  const n = nearestBoardable(sim, h); if (!n.host) return { ok: false, text: RIDE_MESSAGES[n.reason] };
  const r = issueBoard(sim, h.id, n.host.id, RIDE_MODE.BACK); return { ok: r.ok, text: r.ok ? `${h.label}がロボの背中に乗る` : RIDE_MESSAGES[r.reason] };
}

/**
 * ☰ の項目を付ける。host: { menuBox, sim, r（r.ui.selected を読む）, isPaused(), applyNow(), toast(text, tone), onChange() }
 * 返り値: { update() 0.2秒ごと, scan() 毎フレーム（出来事の知らせ）, destroy() }
 */
export function mountPowersuitMenu(host) {
  const { menuBox, sim, r } = host;
  const box = document.createElement('div');
  box.className = 'bc-menu-suit';
  box.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:8px;border:1px solid #6b7280;border-radius:10px;background:rgba(40,46,56,.55)';
  box.innerHTML = `<div style="font:800 13px system-ui,sans-serif;color:#ffe6c7">パワードスーツ（試作）</div>
    <div data-ps="status" style="font:600 12px/1.45 system-ui,sans-serif;color:#d1d5db;min-height:2.9em"></div>
    <div data-ps="who" style="font:600 12px system-ui,sans-serif;color:#9ca3af"></div>
    <button data-ps="don" style="height:44px;font-weight:800"></button>
    <button data-ps="ride" style="height:40px;font-weight:700"></button>
    <div data-ps="why" style="font:600 12px system-ui,sans-serif;color:#fca5a5;min-height:1.2em"></div>`;
  menuBox.insertBefore(box, menuBox.querySelector('.bc-menu-close')?.nextSibling || null);
  const q = k => box.querySelector(`[data-ps="${k}"]`);
  const actor = () => suitActor(sim, r.ui.selected || []);
  const after = res => { host.toast(res.text, res.ok ? '' : 'warn'); if (res.ok && host.isPaused()) host.applyNow(); host.onChange?.(); update(); };
  q('don').addEventListener('click', () => after(suitToggleWear(sim, actor())));
  q('ride').addEventListener('click', () => after(suitToggleRide(sim, actor())));
  const seen = new WeakSet();

  function update() {
    const h = actor(), m = suitMenuState(sim, h);
    const set = (el, t) => { if (el.textContent !== t) el.textContent = t; };
    set(q('status'), m.status); set(q('who'), h ? `操作する人: ${h.label}` : '人間がいない');
    const d = q('don'); set(d, m.don.text); d.disabled = !m.don.on; d.style.opacity = m.don.on ? '' : '0.5';
    const rd = q('ride'); rd.hidden = !m.ride.show; set(rd, m.ride.text); rd.disabled = !m.ride.on; rd.style.opacity = m.ride.on ? '' : '0.5';
    set(q('why'), !m.don.on && m.don.why ? m.don.why : !m.ride.on && m.ride.show && m.ride.why ? m.ride.why : '');
  }

  const WHO = f => f.label || '人';
  /** sim.fx の出来事 → 短い知らせ（1つの出来事は1回だけ） */
  function scan() {
    for (const f of sim.fx) {
      if (seen.has(f) || !String(f.type).startsWith('suit')) continue;
      seen.add(f);
      if (f.type === 'suitOn') host.toast(`${WHO(f)}がスーツを着た`);
      else if (f.type === 'suitOff') host.toast(`${WHO(f)}がスーツを脱いだ`);
      else if (f.type === 'suitBreak') host.toast(`スーツがこわれた！ ${WHO(f)}は脱げた（${POWERSUIT.graceSec}秒は捕まらない）`, 'warn');
      else if (f.type === 'suitFixed') host.toast(`スーツが直った（${REPAIR_BY[f.by] || ''}）。また着られる`);
      else if (f.type === 'suitRepaired') host.toast('スーツが満タンに直った');
      else if (f.type === 'suitLost') host.toast('スーツをなくした', 'warn');
      else if (f.type === 'suitFail') host.toast(SUIT_MESSAGES[f.reason] || SUIT_MESSAGES.busy, 'warn');
    }
  }
  update();
  return { update, scan, destroy() { box.remove(); }, state: () => suitMenuState(sim, actor()) };
}
