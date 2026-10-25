// char-demo.js — ?chardemo=1（お試し）: 少年・少女・獣人の紙芝居の絵を、全部の状態で見る画面。
// 本編の sim・ミッションは使わない。人は「にせのユニット」で、本編と同じ stepAnim / hitReact / reactStep を動かす
// （ゲームの中の速さ）。knockdown → getup だけは「絵の本当の速さ」（frames.json の fps そのまま）にも切り替えられる。
// &human=oblique で斜めの絵（少年 BOY_OBL・少女 GIRL_OBL・獣人 WOLF_OBL（gfx3 清書））。
import { Application, Container, Graphics, Sprite } from '../../vendor/pixi-8.22.0.min.mjs?v=7';
import { loadCharSheets, disposeChars } from './textures.js?v=11';
import { CHAR_FRAMES, CHAR_FRAMES_OBLIQUE, SIT_AFTER, WAVE_SEC, heightOf, newAnim, pickSize, stepAnim, frameAt, finished } from './char-anim.js?v=8';
import { hitReact, reactStep } from '../fx/react.js?v=2';
import { TICK } from '../sim/sim.js?v=23';

/** 見られる状態。auto は「順に流す」ときの長さ（秒） */
export const DEMO_STATES = Object.freeze([
  { key: 'idle', label: '待機', auto: 2.5 },
  { key: 'run', label: '走る', auto: 2 },
  { key: 'walk', label: '歩く（予備）', auto: 2 },
  { key: 'hurt', label: 'のけぞる', auto: 2 },
  { key: 'down', label: '倒れる→起きる', auto: 9.5 },
  { key: 'dead', label: 'やられ', auto: 2.5 },
  { key: 'wave', label: '手を振る', auto: 2.6 },
  { key: 'sit', label: '座る', auto: 2.5 },
  { key: 'carried', label: '運ばれる', auto: 2 },
]);
const KINDS = ['boy', 'girl', 'wolf'];
const ZOOM = 2.7;                        // 画面の倍率（本編の通常は 1 前後、寄ると 3 くらい）
const COLS = [-46, 0, 46];               // 3 人の横の位置（画面の中央が 0）
const ROWS = [-1, 1];                    // 上の段＝右向き、下の段＝左向き（左は左右反転）
const ROW_DY = 62;                       // 上の段と下の段の、中心からの縦のはなれ（ワールド px）
const BG = [0x7b7d76, 0x84867f];

const css = `
.bc-chardemo .bc-mission,.bc-chardemo .bc-picks,.bc-chardemo .bc-groups,.bc-chardemo .bc-act,.bc-chardemo .bc-alert,.bc-chardemo .bc-pause,.bc-chardemo .bc-fps,.bc-chardemo .bc-hint,.bc-chardemo .bc-bottom{display:none!important}
.cd-info{position:absolute;left:8px;top:calc(env(safe-area-inset-top) + 58px);z-index:6;margin:0;padding:4px 6px;border-radius:6px;background:#0009;color:#e8f2ff;font:10px/1.35 ui-monospace,Menlo,Consolas,monospace;white-space:pre;pointer-events:none}
.cd-panel{position:absolute;left:0;right:0;bottom:0;z-index:7;padding:8px 8px calc(env(safe-area-inset-bottom) + 8px);background:#0d121bee;border-top:2px solid #121418;display:flex;flex-direction:column;gap:6px;touch-action:manipulation}
.cd-panel[hidden]{display:none}
.cd-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.cd-panel button{height:36px;padding:0 4px;font-size:12px;font-weight:700;line-height:1.1}
.cd-panel button.on{background:#1d4f6b;border-color:#7df9ff;color:#fff}
.cd-row{display:flex;gap:5px}.cd-row button{flex:1}
`;

/** 画面のいちばん下の「どの状態か」を決める（ここは DOM も Pixi も使わない部分: テストできる） */
export function makeFigure(kind, flip) {
  return { kind, flip, u: null, a: newAnim(), state: 'idle', t: 0, ctx: {}, nat: null, last: null };
}
/** 状態を切り替える。人をにせのユニットに作り直し、絵の動きの状態も最初から */
export function enterState(f, state, { native = false } = {}) {
  f.state = state; f.t = 0; f.a = newAnim(); f.a.face = f.flip; f.ctx = {}; f.nat = null;   // やられ・運ばれるは、それまでの向きのまま
  f.u = { kind: f.kind, human: true, x: 0, y: 0, facing: f.flip, moving: false, order: null, captured: null };
  if (state === 'run') f.u.moving = true;
  else if (state === 'hurt') hitReact(f.u, { w: 0.55, dir: f.flip > 0 ? Math.PI : 0, human: true });          // 撃った方（向いている方）から
  else if (state === 'down') {
    if (native) f.nat = { motion: 'knockdown', t: 0 };                                                       // 絵の本当の速さ
    else hitReact(f.u, { w: 1, dir: f.flip > 0 ? Math.PI : 0, human: true, kind: 'explosion' });           // ゲームの中の速さ
  } else if (state === 'dead') f.ctx.dead = true;
  else if (state === 'carried') f.u.captured = 1;
  else if (state === 'sit') { f.ctx.atExit = true; f.a.still = SIT_AFTER; }
  else if (state === 'wave') f.ctx.wave = WAVE_SEC;
  return f;
}
/** 1 tick すすめる。返り値 { motion, frame, flip, dx, dy, sx, sy }（dx〜sy は被弾のゆれ。無ければ 0・1） */
export function stepFigure(def, f) {
  const M = def.motions, u = f.u;
  f.t += TICK;
  let st;
  if (f.state === 'walk') {                        // 本編では使わない予備の絵。時間で流して止まらずくり返す
    st = { motion: 'walk', frame: frameAt(M.walk, f.t), flip: f.flip };
  } else if (f.nat) {                              // 絵の本当の速さ: knockdown を流し終えたら getup、終わったら idle
    const n = f.nat; n.t += TICK;
    if (n.motion === 'knockdown' && finished(M.knockdown, n.t) && M.getup) { n.motion = 'getup'; n.t = 0; }
    st = n.motion === 'getup' && finished(M.getup, n.t) ? { motion: 'idle', frame: frameAt(M.idle, n.t), flip: f.flip } : { motion: n.motion, frame: frameAt(M[n.motion], n.t), flip: f.flip };
  } else {
    if (u._hr) reactStep(u, TICK);
    if (f.state === 'run') { u.x += 0.5; f.a.lx = u.x - 0.5; }   // その場で走る（動いたことにする）
    if (f.state === 'wave') f.ctx.wave = Math.max(f.ctx.wave, 0.5);  // 選んでいる間は振り続ける
    if (f.state === 'sit') f.a.still = Math.max(f.a.still, SIT_AFTER);
    st = { ...stepAnim(def, f.a, u, TICK, f.ctx) };
  }
  const hr = f.nat || f.state === 'dead' ? null : u?._hr?.out;
  return Object.assign(st, { dx: hr ? hr.dx : 0, dy: hr ? hr.dy : 0, sx: hr ? hr.sx : 1, sy: hr ? hr.sy : 1, hrDown: !!hr?.down });
}

export async function createCharDemo({ host, root, menuBtn, human, onBack }) {
  const oblique = human === 'oblique';
  const frames = oblique ? CHAR_FRAMES_OBLIQUE : CHAR_FRAMES;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  root.classList.add('bc-chardemo');
  const app = new Application();
  await app.init({ resizeTo: host, background: '#0b0d10', antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl' });
  host.appendChild(app.canvas);
  const sheets = await loadCharSheets(Object.fromEntries(KINDS.map(k => [k, frames[k]])));

  // 地面と、足もとの目印（十字）。動きが替わっても十字から足がずれなければ OK
  const world = new Container(), ground = new Graphics(), marks = new Graphics(), figs = new Container();
  world.addChild(marks, figs); app.stage.addChild(ground, world);   // 地面は画面の大きさのまま（拡大しない）
  const figures = [];
  for (const row of ROWS) for (const kind of KINDS) {
    const f = makeFigure(kind, row > 0 ? -1 : 1);       // 上の段（row=-1）は右向き
    f.row = row; f.col = COLS[KINDS.indexOf(kind)];
    if (!sheets[kind]) continue;                         // 読めない絵は出さない
    f.sheet = sheets[kind];
    f.c = new Container(); f.sprite = new Sprite();
    f.shadow = oblique ? new Graphics().ellipse(0, 0, 8, 4).fill({ color: 0x000000, alpha: 0.38 }) : new Graphics().ellipse(0, 0, 7, 2.4).fill({ color: 0x000000, alpha: 0.28 });
    f.c.addChild(f.shadow, f.sprite); figs.addChild(f.c);
    f.ring = new Graphics(); f.ring.ellipse(0, 0, 17, 7).stroke({ width: 1.2, color: 0x7df9ff, alpha: 0.95 }); f.ring.visible = false; f.c.addChildAt(f.ring, 0);
    enterState(f, 'idle'); figures.push(f);
  }

  const S = { state: 'idle', native: false, auto: false, autoI: 0, autoT: 0, picked: null };
  const info = document.createElement('pre'); info.className = 'cd-info'; root.appendChild(info);
  const panel = document.createElement('div'); panel.className = 'cd-panel'; panel.hidden = false;
  panel.innerHTML = `<div class="cd-grid">${DEMO_STATES.map(s => `<button data-st="${s.key}">${s.label}</button>`).join('')}</div>
    <div class="cd-row"><button data-nat>ゲームの速さ</button><button data-auto>順に流す</button><button data-back>工房へ戻る</button></div>`;
  root.appendChild(panel);
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'wheel']) panel.addEventListener(ev, e => e.stopPropagation());
  const $ = s => panel.querySelector(s);

  const apply = (key, only) => {
    for (const f of figures) if (!only || f.kind === only) enterState(f, key, { native: S.native });
  };
  const refreshUi = () => {
    panel.querySelectorAll('[data-st]').forEach(b => b.classList.toggle('on', b.dataset.st === S.state));
    $('[data-nat]').textContent = S.native ? '絵の速さ' : 'ゲームの速さ'; $('[data-nat]').classList.toggle('on', S.native);
    $('[data-auto]').classList.toggle('on', S.auto);
    for (const f of figures) f.ring.visible = S.picked === f.kind;
  };
  const setState = key => { S.state = key; apply(key, S.picked); refreshUi(); };
  panel.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.st) { S.auto = false; setState(b.dataset.st); }
    else if ('nat' in b.dataset) { S.native = !S.native; refreshUi(); if (S.state === 'down') apply('down', S.picked); }
    else if ('auto' in b.dataset) { S.auto = !S.auto; S.autoI = 0; S.autoT = 0; if (S.auto) setState(DEMO_STATES[0].key); refreshUi(); }
    else if ('back' in b.dataset) onBack?.();
  });
  // ☰ はこのパネルを出し入れする（本編のミッション用メニューは使わない）
  const toggle = () => { panel.hidden = !panel.hidden; };
  menuBtn.addEventListener('click', toggle);
  // 人をタップで選ぶ（その人だけ状態を変える）。もう一度タップで全員に戻る
  const pick = e => {
    if (e.target !== app.canvas) return;
    const r = app.canvas.getBoundingClientRect(), x = (e.clientX - r.left - app.screen.width / 2) / ZOOM, y = (e.clientY - r.top - layoutY()) / ZOOM;
    let best = null, bd = 1e9;
    for (const f of figures) { const d = Math.hypot(x - f.col, y - f.row * ROW_DY + 12); if (d < bd) { bd = d; best = f; } }
    if (!best || bd > 90) return;
    S.picked = S.picked === best.kind ? null : best.kind; refreshUi();
  };
  const layoutY = () => app.screen.height * 0.5;
  app.canvas.addEventListener('click', pick);

  function drawGround() {
    const W = app.screen.width, H = app.screen.height, cy = layoutY();
    ground.clear(); marks.clear();
    const step = 16 * ZOOM;                       // 16px ごとのしま（足もとのずれが見えやすいように）
    for (let i = 0, y = (cy % step) - step; y < H; i++, y += step) ground.rect(0, y, W, step).fill(BG[i % 2]);
  }
  const sizeOf = ch => {
    const dev = heightOf(ch.def) * ZOOM * app.renderer.resolution, size = pickSize(ch.def, dev);
    const mode = dev / ch.def.motions.idle.sizes[size].standing_height > 1.5 ? 'nearest' : 'linear';
    for (const src of ch.sources[size] || []) if (src.scaleMode !== mode) { src.scaleMode = mode; src.style?.update?.(); }
    return size;
  };

  let acc = 0;
  const tick = t => {
    const dt = Math.min(t.deltaMS / 1000, 0.25);
    acc += dt; let n = 0;
    drawGround();
    if (S.auto) {
      S.autoT += dt;
      const cur = DEMO_STATES[S.autoI], len = cur.key === 'down' && !S.native ? 6 : cur.auto;
      if (S.autoT >= len) { S.autoT = 0; S.autoI = (S.autoI + 1) % DEMO_STATES.length; setState(DEMO_STATES[S.autoI].key); }
    }
    world.position.set(app.screen.width / 2, layoutY()); world.scale.set(ZOOM);
    const lines = [];
    while (acc >= TICK && n < 10) { for (const f of figures) f.last = stepFigure(f.sheet.def, f); acc -= TICK; n++; }
    if (n === 10) acc = 0;
    for (const f of figures) {
      const st = f.last || stepFigure(f.sheet.def, f), def = f.sheet.def, size = sizeOf(f.sheet);
      const z = def.motions[st.motion].sizes[size], tex = f.sheet.tex[`${st.motion}_${size}`];
      f.sprite.texture = tex[st.frame] || tex[0];
      f.sprite.anchor.set(z.anchor[0] / z.frame_w, z.anchor[1] / z.frame_h);
      const k = heightOf(def) / z.standing_height;
      f.c.position.set(f.col, f.row * ROW_DY);
      f.sprite.x = st.dx; f.sprite.y = st.dy;
      f.sprite.scale.set(k * st.flip * st.sx, k * st.sy);
      f.shadow.scale.set((st.motion === 'knockdown' || st.motion === 'getup' ? 2 : 1) * heightOf(def) / 24, 1);
      f.sprite.alpha = f.state === 'dead' && f.t > 6 ? Math.max(0, 1 - (f.t - 6) / 1.5) : 1;
      marks.moveTo(f.col - 3, f.row * ROW_DY).lineTo(f.col + 3, f.row * ROW_DY).moveTo(f.col, f.row * ROW_DY - 3).lineTo(f.col, f.row * ROW_DY + 3).stroke({ width: 0.6, color: 0xff3b6b, alpha: 0.9 });
      f.info = `${frames[f.kind]} ${st.motion} ${st.frame + 1}/${def.motions[st.motion].frames}${f.row < 0 ? ' →' : ' ←'}`;
    }
    for (const row of ROWS) lines.push(...figures.filter(f => f.row === row).map(f => f.info));
    info.textContent = `${S.native && S.state === 'down' ? '絵の速さ' : 'ゲームの速さ'}${S.picked ? ' ・選択 ' + frames[S.picked] : ''}\n` + lines.join('\n');
  };
  app.ticker.add(tick);
  refreshUi();
  return {
    figures, state: S, setState, setNative: v => { S.native = v; refreshUi(); if (S.state === 'down') apply('down', S.picked); }, togglePanel: toggle, panel,
    destroy() {
      app.ticker.remove(tick); menuBtn.removeEventListener('click', toggle);
      root.classList.remove('bc-chardemo'); info.remove(); panel.remove(); style.remove();
      app.destroy({ removeView: true }, { children: true });
      disposeChars(sheets); // 立ち絵の絵も捨てる（app.destroy は貼られた絵を捨てないので）
    },
  };
}
