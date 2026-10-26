// 物語の最初のミッション（v1.0.2）の操作: ☰ メニューの中のボタン（少年の乗り降り・発射台をつなぐ／はずす・ミサイルを撃つ）と、
// 撃つ場所を決める画面（地図をタップ → 「ここに撃つ」）、上の目的の文字。sim.strike がある時だけ index.js が付ける。
// 命令はすべて sim.commands に入れる（リプレイに残る）。一時停止中に押したら applyNow ですぐ効かせる。
import { STRIKE, STRIKE_MESSAGES, canHitch, canStrike, issueHitch, issueUnhitch, issueStrike, nejiOf, launcherOf, strikeStatus } from '../sim/strike.js?v=1';
import { canBoard, canAlight, RIDE_MODE } from '../sim/ride.js?v=3';

export const STORY_OPS_LABELS = Object.freeze({
  alight: '少年をおろす', board: '少年を乗せる', hitch: '発射台をつなぐ', unhitch: '発射台をはずす', strike: 'ミサイルを撃つ',
  buried: 'ミサイル（まだ埋まっている）', fired: 'ミサイル（撃った・1発だけ）', lost: 'ミサイル（発射台が壊れた）',
});
const RIDE_MSG = { far: '少年をネジのそばへ動かしてから', busy: 'いまは乗れない', notRiding: '乗っていない', noHuman: '少年がいない', noHost: 'ネジがいない', cannot: '乗れない', full: '乗れない', water: '水の中では乗れない', air: 'いまは降りられない', sealedWater: 'いまは降りられない' };

const boyOf = sim => sim.units.find(u => u.side === 'ally' && u.kind === 'boy') || null;

/** 少年の乗り降り。ok なら sim.commands に命令を入れる。{ ok, text } */
export function toggleRide(sim) {
  const boy = boyOf(sim), neji = nejiOf(sim);
  if (boy?.ride) {
    const r = canAlight(sim, boy); if (!r.ok) return { ok: false, text: RIDE_MSG[r.reason] || 'いまは降りられない' };
    sim.commands.push({ type: 'alight', humanIds: [boy.id] }); return { ok: true, text: '少年がネジの背中からおりる' };
  }
  const r = canBoard(sim, boy, neji, RIDE_MODE.BACK); if (!r.ok) return { ok: false, text: RIDE_MSG[r.reason] || 'いまは乗れない' };
  sim.commands.push({ type: 'board', humanId: boy.id, hostId: neji.id, mode: RIDE_MODE.BACK }); return { ok: true, text: '少年がネジの背中に乗る' };
}
/** 発射台をつなぐ／はずす。{ ok, text } */
export function toggleTow(sim) {
  const S = sim.strike;
  if (S.towBy != null || S.hitch) { const r = issueUnhitch(sim); return { ok: r.ok, text: r.ok ? '発射台をはずした' : STRIKE_MESSAGES[r.reason] }; }
  const r = issueHitch(sim); return { ok: r.ok, text: r.ok ? '発射台をつなぐ…（1秒そのまま）' : STRIKE_MESSAGES[r.reason] };
}

/** ☰ のボタンの表示（文字と、押せるか）。DOM なしで決める（テスト用） */
export function storyMenuState(sim) {
  const S = sim.strike, boy = boyOf(sim), out = {};
  out.ride = { text: boy?.ride ? STORY_OPS_LABELS.alight : STORY_OPS_LABELS.board, on: !!boy && !boy.captured };
  out.tow = { text: S.towBy != null || S.hitch ? STORY_OPS_LABELS.unhitch : STORY_OPS_LABELS.hitch, on: S.phase === 'ready' };
  out.strike = { text: S.phase === 'buried' ? STORY_OPS_LABELS.buried : S.phase === 'ready' ? STORY_OPS_LABELS.strike : S.phase === 'lost' ? STORY_OPS_LABELS.lost : STORY_OPS_LABELS.fired, on: S.phase === 'ready' };
  return out;
}

/** 上の帯（目的の文字と棒）。{ text, frac, warn } */
export function storyHud(sim) {
  const st = strikeStatus(sim); if (!st) return null;
  const pile = sim.mission.salvage[sim.strike.pile];
  const sv = st.survey, pct = Math.floor(sv.progress * 100);
  const survey = { text: `設計図のありかを調べる ${pct}%${sv.blocked ? '（敵が近くて調べられない）' : ''}`, frac: sv.progress, warn: sv.blocked };
  switch (st.phase) {
    case 'buried': return { text: `ミサイルを掘り出す ${Math.floor(pile.max - pile.amount)}／${pile.max}`, frac: 1 - pile.amount / pile.max, warn: false };
    case 'ready': return st.towing ? { text: '発射台をひっぱって、届く所へ（☰→ミサイルを撃つ）', frac: 1, warn: false }
      : st.hitching ? { text: '発射台をつないでいる…', frac: 1, warn: false } : { text: '発射台をネジでつなぐ（☰）', frac: 1, warn: false };
    case 'arming': return { text: `発射準備… ${st.armLeft.toFixed(1)}秒（発射台を守って）`, frac: 1 - st.armLeft / STRIKE.setupSec, warn: true };
    case 'flying': return { text: `着弾まで ${st.flightLeft.toFixed(1)}秒`, frac: 1, warn: true };
    case 'lost': return { ...survey, text: `発射台が壊れた。${survey.text}` };
    default: return sv.done ? { text: '設計図を見つけた！', frac: 1, warn: false } : survey;
  }
}

/** 結果の画面の題と理由 */
export function storyResultText(sim) {
  const win = sim.result === 'win';
  const why = { blueprint: '設計図のありかを調べ終えた！', nejiDown: 'ネジが壊された…', boyDown: '少年がやられた…', boyCaptured: '少年が連れていかれた…' }[sim.resultReason] || (win ? '作戦成功' : '作戦失敗');
  return { title: win ? '設計図を見つけた' : '作戦失敗', why, kills: sim.strike?.kills || 0 };
}

/**
 * ☰ の中のボタンと、撃つ場所を決める画面を付ける。
 * host: { root, menuBox, sim, r, closeMenu(), isPaused(), setPaused(v), applyNow(), toast(text, tone) }
 */
export function mountStoryOps(host) {
  const { root, menuBox, sim, r } = host;
  const box = document.createElement('div');
  box.className = 'bc-menu-storyops';
  box.style.cssText = 'display:flex;flex-direction:column;gap:8px';
  box.innerHTML = `<div class="bc-menu-pair"><button data-sop="ride"></button><button data-sop="tow"></button></div>
    <button data-sop="strike" style="height:44px;font-weight:800;background:#7f1d1d;color:#fff;border-color:#ef4444"></button>`;
  menuBox.insertBefore(box, menuBox.querySelector('.bc-menu-close')?.nextSibling || null);
  const btn = k => box.querySelector(`[data-sop="${k}"]`);
  const after = res => { host.toast(res.text, res.ok ? '' : 'warn'); if (res.ok && host.isPaused()) host.applyNow(); refresh(); };
  btn('ride').addEventListener('click', () => after(toggleRide(sim)));
  btn('tow').addEventListener('click', () => after(toggleTow(sim)));
  btn('strike').addEventListener('click', () => { if (sim.strike.phase !== 'ready') { host.toast(STRIKE_MESSAGES.notReady, 'warn'); return; } host.closeMenu(); startAim(); });
  function refresh() {
    const m = storyMenuState(sim);
    for (const k of ['ride', 'tow', 'strike']) { const b = btn(k); b.textContent = m[k].text; b.disabled = !m[k].on; b.style.opacity = m[k].on ? '' : '0.5'; }
  }
  refresh();

  // 撃つ場所を決める画面: 地図をタップで狙い、ドラッグで地図を動かす。「ここに撃つ」で決める。出ている間は一時停止
  let aim = null;
  function startAim() {
    const l = launcherOf(sim); if (!l || aim) return;
    const prev = host.isPaused(); host.setPaused(true);
    const el = document.createElement('div');
    el.className = 'bc-aim';
    el.style.cssText = 'position:absolute;inset:0;z-index:30;touch-action:none';
    el.innerHTML = `<div style="position:absolute;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 64px);padding:8px 12px;border-radius:10px;background:rgba(18,20,24,.88);color:#ffe6c7;font:700 14px system-ui,sans-serif;text-align:center;pointer-events:none" class="bc-aim-msg">狙う場所をタップ（黄色い円の中に届く・敵だけに当たる）</div>
      <div style="position:absolute;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 70px);display:flex;gap:10px">
        <button class="bc-aim-cancel" style="flex:1;height:48px;border-radius:12px;font:800 15px system-ui,sans-serif;background:#2a2f36;color:#e5e7eb;border:2px solid #4b5563">やめる</button>
        <button class="bc-aim-fire" disabled style="flex:1.4;height:48px;border-radius:12px;font:800 15px system-ui,sans-serif;background:#b91c1c;color:#fff;border:2px solid #fca5a5;opacity:.5">ここに撃つ</button>
      </div>`;
    root.appendChild(el);
    const msg = el.querySelector('.bc-aim-msg'), fire = el.querySelector('.bc-aim-fire');
    r.ui.aim = { x: null, y: null };
    r.cam.x = l.x; r.cam.y = l.y - 60; r.cam.zoom = Math.min(r.cam.zoom, 0.9); // 射程が見えるように少し引く
    aim = { el, prev };
    let down = null;
    const canvasRect = () => r.app.canvas.getBoundingClientRect();
    el.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; down = { x: e.clientX, y: e.clientY, cx: r.cam.x, cy: r.cam.y, moved: false }; el.setPointerCapture?.(e.pointerId); });
    el.addEventListener('pointermove', e => {
      if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.hypot(dx, dy) > 8) down.moved = true;
      if (down.moved) { r.cam.x = down.cx - dx / r.cam.zoom; r.cam.y = down.cy - dy / r.cam.zoom; }
    });
    el.addEventListener('pointerup', e => {
      if (!down) return; const d = down; down = null; if (d.moved) return;
      const rc = canvasRect(), w = r.screenToWorld(e.clientX - rc.left, e.clientY - rc.top);
      setTarget(w.x, w.y);
    });
    const setTarget = (x, y) => {
      r.ui.aim = { x, y };
      const ok = canStrike(sim, x, y).ok;
      fire.disabled = !ok; fire.style.opacity = ok ? '' : '.5';
      msg.textContent = ok ? '赤い輪の中の敵に当たる。よければ「ここに撃つ」' : `射程の外（発射台から${STRIKE.rangeTiles}マスまで）`;
    };
    el.querySelector('.bc-aim-cancel').addEventListener('click', () => endAim());
    fire.addEventListener('click', () => {
      const a = r.ui.aim; if (!a || a.x == null) return;
      const res = issueStrike(sim, a.x, a.y);
      if (!res.ok) { host.toast(STRIKE_MESSAGES[res.reason], 'warn'); return; }
      host.applyNow(); // 一時停止中なので、すぐ効かせる（記録にも残る）
      host.toast(`発射準備！ ${STRIKE.setupSec}秒、発射台を守って`);
      endAim();
    });
    // テスト・スクショ用
    aim.setTarget = setTarget;
  }
  function endAim() {
    if (!aim) return; const a = aim; aim = null;
    r.ui.aim = null; a.el.remove(); host.setPaused(a.prev);
  }
  return {
    refresh, startAim, endAim,
    aimTo: (x, y) => aim?.setTarget(x, y), fireAim: () => aim?.el.querySelector('.bc-aim-fire').click(),
    get aiming() { return !!aim; },
    destroy() { endAim(); box.remove(); },
  };
}
