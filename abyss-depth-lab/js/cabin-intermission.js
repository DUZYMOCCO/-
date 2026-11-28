/**
 * ABYSS DIVE — アニメ調・船内インターミッション画面（v5.1.0）
 *
 * 3D 深海探査から一息つく「移動する家・秘密基地」の温かみを、
 * アニメ調背景（cabin-workshop.webp）＋ 3 人の 4 コマ動きアニメ
 * （エリー・Gem・ponco MarkII）＋ 強化連動リアクション演出で表現する。
 */

const ASSET_BASE = new URL('../assets/', import.meta.url).href;

// 2x2 スプライトシートのフレーム座標（background-position）
const GRID_POS = ['0% 0%', '100% 0%', '0% 100%', '100% 100%'];

const UPG_SPEC = [
  { key: 'speed',   icon: '⚡', name: '機動ノズル',         desc: '巡航・旋回・上昇速度を強化' },
  { key: 'power',   icon: '🔥', name: '武装エミッター',     desc: '魚雷の連射速度と威力を強化' },
  { key: 'barrier', icon: '🛡', name: 'メビウス断熱コイル', desc: '熱水帯の耐熱性能と冷却を強化' },
  { key: 'hull',    icon: '🔧', name: '耐圧船体・補強装甲', desc: '最大HP +25 ＆ 船体を全回復' },
];

const CHAR_LINES = {
  ellie: [
    { speaker: 'エリー', face: 'girl_smug', text: 'ふぅ〜、やっぱり船の中は落ち着くね。次はもっと深くまで行こう！' },
    { speaker: 'エリー', face: 'girl_neutral', text: '父さんのスティングレー号も、こんなふうに整備しながら潜ってたのかな。' },
    { speaker: 'エリー', face: 'girl_smug', text: 'Gem の淹れてくれたあったかい飲み物、最高！よし、元気出た！' },
  ],
  gem: [
    { speaker: 'Gem', face: 'gem_neutral', text: '船体ノ溶接ハ 任セテ。傷ガアッタラ イツデモ無料デ直スヨ。' },
    { speaker: 'Gem', face: 'gem_neutral', text: 'エリー、無理ハ禁物ダヨ。熱イ場所デハ バリアヲ張ルンダヨ。' },
    { speaker: 'Gem', face: 'gem_neutral', text: '胸ノ太陽ト星ノ絵、マダ綺麗ニ残ッテルヨ。一緒ニ進モウネ。' },
  ],
  ponco: [
    { speaker: 'ponco MarkII', face: 'ponco_neutral', text: 'メビウス機関の循環効率を解析中です。資源が集まればさらに強化できますよ。' },
    { speaker: 'ponco MarkII', face: 'ponco_neutral', text: '3,960 マイル地点の重力異常……まだ理論と合いませんが、必ず安全に導きます。' },
    { speaker: 'ponco MarkII', face: 'ponco_neutral', text: '3 モード変形は状況に応じて使い分けてください。機動・パワー・バリア、すべて連動しています。' },
  ],
};

const UPG_REACTIONS = {
  speed:   { speaker: 'エリー', face: 'girl_smug', text: 'ノズル出力アップ！これで海流の中もスイスイ進めるね！' },
  power:   { speaker: 'ponco MarkII', face: 'ponco_neutral', text: '武装エミッターの出力調整が完了しました。パワーモードの斉射がさらに鋭くなります。' },
  barrier: { speaker: 'ponco MarkII', face: 'ponco_neutral', text: 'メビウス断熱コイルを最適化しました。熱水・火山帯でも安定して冷却できます。' },
  hull:    { speaker: 'Gem', face: 'gem_neutral', text: '補強装甲ノ溶接、完了！船体モピッカピカニ直シテオイタヨ！' },
  repair:  { speaker: 'Gem', face: 'gem_neutral', text: '応急溶接 完了！コレデ安心シテ出航デキルヨ、エリー。' },
};

/**
 * アニメ調・船内インターミッションオーバーレイを生成する。
 * @param {object} opts { parentEl, ledger, upgrades, getPlayer, onUpgrade, onRepair, onClose, playPing }
 */
export function createCabinIntermission(opts) {
  const { parentEl, ledger, upgrades, getPlayer, onUpgrade, onRepair, onClose, playPing } = opts;

  const overlay = document.createElement('div');
  overlay.className = 'cab-overlay hidden';
  overlay.innerHTML = `
    <div class="cab-shell">
      <div class="cab-stage" style="background-image:url('${ASSET_BASE}cabin-workshop.webp')">
        <div class="cab-vignette"></div>
        <div class="cab-lamp-glow"></div>
        <div class="cab-stage-head">
          <div class="cab-room-tag">WORKSHOP · 船内ワークショップ</div>
          <div class="cab-zone-pill" id="cab-zone-pill">現在地: 表層・サンゴ礁</div>
        </div>
        <div class="cab-cast">
          <button type="button" class="cab-actor ellie" id="cab-actor-ellie" title="エリーに話しかける"
            style="background-image:url('${ASSET_BASE}cabin_ellie_anim.webp')"></button>
          <button type="button" class="cab-actor gem" id="cab-actor-gem" title="Gem に話しかける"
            style="background-image:url('${ASSET_BASE}cabin_gem_anim.webp')"></button>
          <button type="button" class="cab-actor ponco" id="cab-actor-ponco" title="ponco MarkII に話しかける"
            style="background-image:url('${ASSET_BASE}cabin_ponco_anim.webp')"></button>
        </div>
        <div class="cab-dialogue" id="cab-dialogue">
          <img class="cab-dial-face" id="cab-dial-face" alt="" src="${ASSET_BASE}girl_neutral.webp" />
          <div class="cab-dial-body">
            <div class="cab-dial-name" id="cab-dial-name">エリー</div>
            <div class="cab-dial-text" id="cab-dial-text">船内へ戻ったよ。整備が済んだら、また潜ろう！</div>
          </div>
        </div>
      </div>

      <aside class="cab-panel">
        <div class="cab-panel-head">
          <div>
            <div class="cab-panel-title">🔧 整備・強化ドック</div>
            <div class="cab-panel-res" id="cab-res">保有資源 0</div>
          </div>
          <button type="button" class="cab-depart-btn" id="cab-depart">🌊 出航する</button>
        </div>
        <div class="cab-hp-bar">
          <span class="cab-hp-lbl">船体 HP</span>
          <div class="cab-hp-track"><div class="cab-hp-fill" id="cab-hp-fill"></div></div>
          <span class="cab-hp-val" id="cab-hp-val">100 / 100</span>
        </div>
        <div class="cab-upg-list" id="cab-upg-list"></div>
      </aside>
    </div>
  `;
  parentEl.appendChild(overlay);

  const zonePillEl = overlay.querySelector('#cab-zone-pill');
  const resEl = overlay.querySelector('#cab-res');
  const hpFillEl = overlay.querySelector('#cab-hp-fill');
  const hpValEl = overlay.querySelector('#cab-hp-val');
  const listEl = overlay.querySelector('#cab-upg-list');
  const dialFaceEl = overlay.querySelector('#cab-dial-face');
  const dialNameEl = overlay.querySelector('#cab-dial-name');
  const dialTextEl = overlay.querySelector('#cab-dial-text');
  const actorEllie = overlay.querySelector('#cab-actor-ellie');
  const actorGem = overlay.querySelector('#cab-actor-gem');
  const actorPonco = overlay.querySelector('#cab-actor-ponco');

  let open = false;
  let animTimer = null;
  let tick = 0;
  let gemBoostTicks = 0;
  let poncoBoostTicks = 0;
  const lineCursor = { ellie: 0, gem: 0, ponco: 0 };

  function setDialogue(speaker, face, text) {
    dialNameEl.textContent = speaker;
    dialFaceEl.src = `${ASSET_BASE}${face}.webp`;
    dialTextEl.textContent = text;
  }

  function applyFrames() {
    // ゆるやかで心地よい 4 コマ生活アニメ（強化時は Gem 溶接火花 / ponco 笑顔へ即時反応）
    const ellieOrder = [0, 0, 1, 2, 3, 0];
    const eFrame = ellieOrder[tick % ellieOrder.length];
    actorEllie.style.backgroundPosition = GRID_POS[eFrame];

    let gFrame;
    if (gemBoostTicks > 0) {
      gFrame = gemBoostTicks > 2 ? 1 : 2; // 溶接火花 → ニッコリ！
      gemBoostTicks--;
    } else {
      const gemOrder = [0, 1, 3, 2, 0];
      gFrame = gemOrder[Math.floor(tick / 1) % gemOrder.length];
    }
    actorGem.style.backgroundPosition = GRID_POS[gFrame];

    let pFrame;
    if (poncoBoostTicks > 0) {
      pFrame = poncoBoostTicks > 2 ? 1 : 3; // 解析操作 → ニッコリ！
      poncoBoostTicks--;
    } else {
      const poncoOrder = [0, 1, 1, 2, 3];
      pFrame = poncoOrder[Math.floor((tick + 2) / 1) % poncoOrder.length];
    }
    actorPonco.style.backgroundPosition = GRID_POS[pFrame];
    tick++;
  }

  function startAnim() {
    if (animTimer) return;
    applyFrames();
    animTimer = window.setInterval(applyFrames, 720);
  }
  function stopAnim() {
    if (animTimer) {
      window.clearInterval(animTimer);
      animTimer = null;
    }
  }

  function triggerReaction(kind) {
    const r = UPG_REACTIONS[kind];
    if (r) setDialogue(r.speaker, r.face, r.text);
    if (kind === 'hull' || kind === 'repair' || kind === 'speed') gemBoostTicks = 4;
    if (kind === 'power' || kind === 'barrier') poncoBoostTicks = 4;
    applyFrames();
  }

  function renderPanel(zoneLabel) {
    if (zoneLabel) zonePillEl.textContent = `現在地: ${zoneLabel}`;
    const p = getPlayer();
    resEl.textContent = `保有資源 ${ledger.total().toLocaleString()}`;
    const hpPct = Math.max(0, Math.min(100, Math.round((p.hp / Math.max(1, p.maxHp)) * 100)));
    hpFillEl.style.width = `${hpPct}%`;
    hpValEl.textContent = `${Math.round(p.hp)} / ${p.maxHp}`;

    listEl.innerHTML = '';
    for (const item of UPG_SPEC) {
      const lv = upgrades[item.key];
      const maxed = lv >= 5;
      const cost = lv * 50;
      const canBuy = !maxed && ledger.total() >= cost;
      const pips = Array.from({ length: 5 }, (_, idx) =>
        `<span class="cab-pip${idx < lv ? ' on' : ''}"></span>`
      ).join('');
      const row = document.createElement('div');
      row.className = 'cab-upg-row';
      row.innerHTML = `
        <div class="cab-upg-info">
          <div class="cab-upg-head">
            <span class="cab-upg-name">${item.icon} ${item.name}</span>
            <span class="cab-pips">${pips}</span>
          </div>
          <div class="cab-upg-desc">${item.desc}</div>
        </div>
        <button type="button" class="cab-buy-btn" ${canBuy ? '' : 'disabled'}>${maxed ? 'MAX' : `資源 ${cost}`}</button>
      `;
      row.querySelector('.cab-buy-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (maxed || !ledger.spend(cost)) return;
        onUpgrade(item.key);
        if (playPing) playPing();
        triggerReaction(item.key);
        renderPanel();
      });
      listEl.appendChild(row);
    }

    if (p.hp < p.maxHp || p.heat > 0) {
      const rep = document.createElement('button');
      rep.type = 'button';
      rep.className = 'cab-repair-btn';
      rep.textContent = `🔧 Gem の無料応急溶接（HP ${Math.round(p.hp)} → ${p.maxHp}）`;
      rep.addEventListener('click', (e) => {
        e.stopPropagation();
        onRepair();
        if (playPing) playPing();
        triggerReaction('repair');
        renderPanel();
      });
      listEl.appendChild(rep);
    }
  }

  // キャラクタータップで掛け合い
  for (const [key, el] of [['ellie', actorEllie], ['gem', actorGem], ['ponco', actorPonco]]) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const arr = CHAR_LINES[key];
      const line = arr[lineCursor[key] % arr.length];
      lineCursor[key]++;
      setDialogue(line.speaker, line.face, line.text);
      if (key === 'gem') gemBoostTicks = 2;
      if (key === 'ponco') poncoBoostTicks = 2;
      if (playPing) playPing();
      applyFrames();
    });
  }

  overlay.querySelector('#cab-depart').addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(false);
    if (onClose) onClose();
  });

  function setOpen(next, zoneLabel) {
    open = !!next;
    overlay.classList.toggle('hidden', !open);
    if (open) {
      const z = zoneLabel || '';
      if (z.includes('マントル')) {
        setDialogue('ponco MarkII', 'ponco_neutral', 'マントル上層の楽園ですね。水圧も温度も驚くほど安定しています。');
      } else if (z.includes('熱水')) {
        setDialogue('Gem', 'gem_neutral', '外ハ熱イネ！装甲ノ点検ト バリアコイルノ強化ヲシテオコウ。');
      } else {
        setDialogue('エリー', 'girl_smug', '船内へ戻ったよ！Gem、ponco、次の潜航の準備しよっか！');
      }
      renderPanel(zoneLabel);
      startAnim();
    } else {
      stopAnim();
    }
  }

  function destroy() {
    stopAnim();
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  return {
    isOpen: () => open,
    setOpen,
    destroy,
  };
}
