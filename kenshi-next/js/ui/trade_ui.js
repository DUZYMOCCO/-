// 交易の窓（trade1）: 「交易」ボタン → 売り買いの表と相場表。iPhone の縦画面で指で押せる大きさ。
// ルールは js/sim/trade.js。ここは表示と押した時の呼び出しだけ。

import {
  GOODS, GOOD_IDS, MARKETS, CURRENCY_NAME,
  ensureTrade, marketHere, marketName, prices, priceTag, partyMoney, partySkill, marketCash,
  tradeBuy, tradeSell, sellProfitable, activeSpikes, memoAgeText, dayOf, canTradeAt,
} from '../sim/trade.js';

const COLORS = { good: '#5fd17a', bad: '#ff6b5e', even: '#e8e2d0' };
const CSS = `
#trade-btn{position:fixed;left:8px;top:calc(env(safe-area-inset-top,0px) + 76px);z-index:30;min-width:58px;height:40px;border-radius:10px;border:1px solid rgba(255,220,150,.55);background:rgba(40,30,15,.82);color:#ffe2a8;font-size:14px;font-weight:700;pointer-events:auto}
#trade-btn.here{background:rgba(120,80,20,.92);box-shadow:0 0 0 2px rgba(255,200,90,.6)}
#trade-btn .dot{display:inline-block;width:8px;height:8px;border-radius:4px;background:#ff8a3d;margin-left:4px;vertical-align:middle}
#trade-panel{position:fixed;left:6px;right:6px;bottom:calc(env(safe-area-inset-bottom,0px) + 6px);max-height:74vh;z-index:40;display:none;flex-direction:column;background:rgba(14,12,10,.94);border:1px solid rgba(255,220,150,.35);border-radius:12px;color:#eee;font-size:13px;pointer-events:auto;max-width:560px;margin:0 auto}
#trade-panel.open{display:flex}
#trade-panel .th{display:flex;gap:6px;align-items:center;padding:8px 8px 4px}
#trade-panel .tab{flex:1;height:38px;border-radius:8px;border:1px solid #6a5a3a;background:#2a2418;color:#ddd;font-size:14px}
#trade-panel .tab.on{background:#7a5a20;color:#fff;font-weight:700}
#trade-panel .x{width:40px;height:38px;border-radius:8px;border:1px solid #555;background:#222;color:#ddd;font-size:18px}
#trade-panel .info{padding:2px 10px 4px;color:#cfc4a8;font-size:12px;line-height:1.45}
#trade-panel .news{margin:2px 8px 4px;padding:5px 8px;border-radius:8px;background:rgba(160,70,20,.35);color:#ffd2a0;font-size:12px}
#trade-panel .body{overflow:auto;-webkit-overflow-scrolling:touch;padding:0 6px 6px}
#trade-panel table{width:100%;border-collapse:collapse}
#trade-panel td,#trade-panel th{padding:4px 3px;border-bottom:1px solid rgba(255,255,255,.08);text-align:center;white-space:nowrap}
#trade-panel th{font-size:11px;color:#bba;font-weight:400;position:sticky;top:0;background:#16130f}
#trade-panel td.n{text-align:left;white-space:normal}
#trade-panel .own{font-size:11px;color:#aaa}
#trade-panel .p{font-weight:700;font-variant-numeric:tabular-nums}
#trade-panel button.b{min-width:40px;height:36px;border-radius:8px;border:1px solid #5a6a4a;background:#253020;color:#e8ffe0;font-size:13px;margin:1px}
#trade-panel button.s{border-color:#6a5040;background:#33241a;color:#ffe8d8}
#trade-panel button:disabled{opacity:.35}
#trade-panel .foot{padding:6px 8px 8px;display:flex;gap:6px}
#trade-panel .foot button{flex:1;height:44px;border-radius:10px;border:1px solid #c9a050;background:#6a4a14;color:#fff;font-size:15px;font-weight:700}
#trade-panel .fire{color:#ff9a4a}
#trade-panel .legend{font-size:11px;color:#aaa;padding:2px 10px}
`;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

export function createTradeUI(opts) {
  const getState = opts.getState;
  const onEvents = opts.onEvents || (() => {});
  const root = opts.root || document.body;
  const style = el('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const btn = el('button', '', '交易');
  btn.id = 'trade-btn';
  btn.type = 'button';
  const panel = el('div');
  panel.id = 'trade-panel';
  for (const ev of ['pointerdown', 'touchstart', 'wheel']) panel.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
  root.appendChild(btn);
  root.appendChild(panel);

  let open = false;
  let tab = 'trade';
  let lastDraw = 0;
  let seenSpikes = '';
  let unseen = false;

  btn.addEventListener('click', () => {
    open = !open;
    const s = getState();
    if (open) tab = marketHere(s) ? 'trade' : 'memo';
    unseen = false;
    draw(true);
  });

  function act(fn) {
    const s = getState();
    const events = [];
    fn(s, events);
    if (events.length) {
      for (const e of events) s.log.push(e);
      if (s.log.length > 300) s.log.splice(0, s.log.length - 300);
      onEvents(events);
    }
    draw(true);
    if (opts.onAfterAct) opts.onAfterAct();
  }

  function header(s, here) {
    const th = el('div', 'th');
    const t1 = el('button', 'tab' + (tab === 'trade' ? ' on' : ''), here ? marketName(s, here) + 'で売買' : '売買');
    const t2 = el('button', 'tab' + (tab === 'memo' ? ' on' : ''), '相場表');
    const x = el('button', 'x', '×');
    t1.onclick = () => { tab = 'trade'; draw(true); };
    t2.onclick = () => { tab = 'memo'; draw(true); };
    x.onclick = () => { open = false; draw(true); };
    th.append(t1, t2, x);
    return th;
  }

  function news(s) {
    const out = [];
    for (const sp of activeSpikes(s)) {
      const left = Math.max(0, sp.end - dayOf(s));
      out.push('🔥 ' + marketName(s, sp.market) + '：' + GOODS[sp.good].name + 'を高く買い取り中（×' + sp.mult.toFixed(1) + '、あと' + (left < 1 ? Math.max(1, Math.round(left * 24)) + '時間' : Math.round(left) + '日') + '）');
    }
    return out;
  }

  function drawTrade(s, here, body) {
    if (!here) {
      body.appendChild(el('div', 'info', '町の中（灯守の町・錆の宿場）に入ると売り買いできます。値段は「相場表」で見られます。'));
      return;
    }
    const t = ensureTrade(s);
    const money = partyMoney(s);
    const cash = marketCash(s, here);
    const table = el('table');
    const hr = el('tr');
    for (const h of ['品', '買う', '', '売る', '']) hr.appendChild(el('th', '', h));
    table.appendChild(hr);
    const ok = canTradeAt(s, here);
    for (const g of GOOD_IDS) {
      const pr = prices(s, here, g);
      const c = t.cargo[g];
      const tr = el('tr');
      const n = el('td', 'n');
      n.appendChild(el('div', '', GOODS[g].name + (activeSpikes(s).some((x) => x.market === here && x.good === g) ? ' 🔥' : '')));
      n.appendChild(el('div', 'own', c ? '手持ち' + c.n + '・仕入' + Math.round(c.cost) : '手持ち0'));
      const pb = el('td', 'p', String(pr.buy));
      pb.style.color = COLORS[priceTag(s, here, g, 'buy')];
      const bb = el('td');
      const b1 = el('button', 'b', '+1');
      const b5 = el('button', 'b', '+5');
      b1.disabled = !ok || money < pr.buy;
      b5.disabled = !ok || money < pr.buy * 5;
      b1.onclick = () => act((st, ev) => tradeBuy(st, here, g, 1, ev));
      b5.onclick = () => act((st, ev) => tradeBuy(st, here, g, 5, ev));
      bb.append(b1, b5);
      const ps = el('td', 'p', String(pr.sell));
      let tag = priceTag(s, here, g, 'sell');
      if (c) tag = pr.sell > c.cost * 1.05 ? 'good' : pr.sell < c.cost ? 'bad' : 'even';
      ps.style.color = COLORS[tag];
      const sb = el('td');
      const s1 = el('button', 'b s', '−1');
      const sa = el('button', 'b s', '全');
      s1.disabled = !ok || !c || cash < pr.sell;
      sa.disabled = s1.disabled;
      s1.onclick = () => act((st, ev) => tradeSell(st, here, g, 1, ev));
      sa.onclick = () => act((st, ev) => tradeSell(st, here, g, 999, ev));
      sb.append(s1, sa);
      tr.append(n, pb, bb, ps, sb);
      table.appendChild(tr);
    }
    body.appendChild(table);
  }

  function drawMemo(s, body) {
    const t = ensureTrade(s);
    const ids = Object.keys(MARKETS);
    const table = el('table');
    const hr = el('tr');
    hr.appendChild(el('th', '', '品（基準）'));
    for (const m of ids) {
      const th = el('th');
      th.appendChild(el('div', '', marketName(s, m)));
      th.appendChild(el('div', 'own', memoAgeText(s, m) + ' 買/売'));
      hr.appendChild(th);
    }
    table.appendChild(hr);
    const spikes = activeSpikes(s);
    for (const g of GOOD_IDS) {
      const tr = el('tr');
      const c = t.cargo[g];
      const n = el('td', 'n');
      n.appendChild(el('div', '', GOODS[g].name));
      n.appendChild(el('div', 'own', '基準' + GOODS[g].base + (c ? '・手持ち' + c.n : '')));
      tr.appendChild(n);
      // 一番安く買える町・一番高く売れる町を色で
      const known = ids.filter((m) => t.memo[m]);
      const buys = known.map((m) => t.memo[m].prices[g].buy);
      const sells = known.map((m) => t.memo[m].prices[g].sell);
      for (const m of ids) {
        const td = el('td', 'p');
        const memo = t.memo[m];
        if (!memo) { td.textContent = '？'; td.style.color = '#777'; tr.appendChild(td); continue; }
        const p = memo.prices[g];
        const b = el('span', '', String(p.buy));
        const sl = el('span', '', String(p.sell));
        if (known.length > 1 && p.buy === Math.min(...buys)) b.style.color = COLORS.good;
        if (known.length > 1 && p.sell === Math.max(...sells)) sl.style.color = COLORS.good;
        if (c && p.sell > c.cost * 1.05) sl.style.color = COLORS.good;
        td.append(b, el('span', 'own', ' / '), sl);
        if (spikes.some((x) => x.market === m && x.good === g)) td.appendChild(el('span', 'fire', ' 🔥'));
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    body.appendChild(table);
    body.appendChild(el('div', 'legend', '相場表は最後に町にいた時の値段です。緑＝一番安く買える／一番高く売れる町。🔥＝噂の高騰（相場表より高いことがあります）。'));
  }

  function draw(force) {
    const s = getState();
    if (!s) return;
    const here = marketHere(s);
    const spikeKey = activeSpikes(s).map((x) => x.id).join(',');
    if (spikeKey !== seenSpikes) {
      if (spikeKey && !open) unseen = true;
      seenSpikes = spikeKey;
    }
    btn.className = here ? 'here' : '';
    btn.innerHTML = '';
    btn.append(here ? '交易' : '相場');
    if (unseen) btn.appendChild(el('span', 'dot'));
    panel.className = open ? 'open' : '';
    if (!open) return;
    const now = performance.now();
    if (!force && now - lastDraw < 500) return;
    lastDraw = now;
    const scroll = panel.querySelector('.body') ? panel.querySelector('.body').scrollTop : 0;
    panel.innerHTML = '';
    panel.appendChild(header(s, here));
    const t = ensureTrade(s);
    const info = el('div', 'info');
    info.textContent =
      '所持 ' + CURRENCY_NAME + ' ' + partyMoney(s) +
      (here ? '　店の残金 ' + marketCash(s, here) : '') +
      '　交易スキル ' + Math.floor(partySkill(s)) +
      '　これまでの利益 ' + (t.earned >= 0 ? '+' : '') + t.earned;
    panel.appendChild(info);
    for (const line of news(s)) panel.appendChild(el('div', 'news', line));
    const body = el('div', 'body');
    if (tab === 'trade') drawTrade(s, here, body);
    else drawMemo(s, body);
    panel.appendChild(body);
    body.scrollTop = scroll;
    if (tab === 'trade' && here) {
      const foot = el('div', 'foot');
      const sp = el('button', '', '利益の出る物だけ売る');
      sp.disabled = Object.keys(t.cargo).length === 0;
      sp.onclick = () => act((st, ev) => sellProfitable(st, here, ev));
      foot.appendChild(sp);
      panel.appendChild(foot);
    }
  }

  return {
    button: btn,
    update() { draw(false); },
    open(which) { open = true; tab = which || tab; unseen = false; draw(true); },
    close() { open = false; draw(true); },
  };
}
