import { panels } from './panels.js';
import { shopState, shopAccepts } from '../sim/shops.js';
import { SHOP_TYPES } from '../data/shop_types.js';
import { ITEMS } from '../sim/items.js';
import { GOODS } from '../sim/trade.js';
import { DISHES } from '../sim/cooking.js';
import { activeStolenMark, sameStolenFaction, stolenTownName } from '../sim/stolen_goods.js';

const CSS = `
#shop-panel-root{position:fixed;left:8px;right:8px;bottom:calc(env(safe-area-inset-bottom,0px) + 104px);z-index:45;max-width:520px;margin:auto;color:#f4e6cd;font:14px/1.35 system-ui,sans-serif}
#shop-panel-root[hidden]{display:none}
.shop-panel{background:linear-gradient(145deg,rgba(66,52,37,.97),rgba(37,34,29,.98));border:1px solid var(--ui-border,#907754);border-radius:var(--ui-radius-m,12px);padding:10px;box-shadow:var(--ui-shadow,0 4px 20px #0009),inset 0 1px rgba(255,237,197,.1);max-height:32vh;overflow:auto}
.shop-panel header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}.shop-panel header strong{font-size:16px}.shop-panel button{min-height:38px;padding:5px 9px;border-radius:var(--ui-radius-s,8px);border:1px solid var(--ui-border,#9c8158);background:var(--ui-button,linear-gradient(#756247,#392d22));color:#ffedcf;font-size:14px;font-weight:650}.shop-panel .shop-summary{margin:2px 0 7px;color:#dfd0b6}.shop-panel .shop-stock,.shop-panel .shop-item{display:flex;justify-content:space-between;align-items:center;gap:8px;border-top:1px solid #ffffff20;padding:5px 0}.shop-panel .shop-stock span,.shop-panel .shop-item span{min-width:0;overflow-wrap:anywhere}.shop-panel h3{font-size:14px;margin:9px 0 2px}.shop-panel .shop-muted{opacity:.7}
@media(max-width:600px){.shop-panel{max-height:32vh;padding:8px}.shop-panel .shop-summary{font-size:13px}}
`;

export function createShopUI(options = {}) {
  const getState = options.getState || (() => null);
  const getActor = options.getActor || (() => null);
  const onCommand = options.onCommand || (() => {});
  const style = document.createElement('style'); style.textContent = CSS; document.head.append(style);
  const root = document.createElement('div'); root.id = 'shop-panel-root'; root.hidden = true;
  const panel = document.createElement('section'); panel.className = 'shop-panel'; root.append(panel); document.body.append(root);
  let houseId = null;
  let notice = '';

  function render() {
    panel.replaceChildren();
    const state = getState(), actor = getActor(), status = shopState(state, houseId);
    if (!status) { panel.textContent = '店の状態を確認できません'; return; }
    const type = SHOP_TYPES[status.type] || SHOP_TYPES.general;
    const header = document.createElement('header'), title = document.createElement('strong'), close = document.createElement('button');
    title.textContent = type.name + '　評判 ' + status.rep.toFixed(1);
    close.type = 'button'; close.textContent = '閉じる'; close.onclick = hide;
    header.append(title, close); panel.append(header);
    const summary = document.createElement('p'); summary.className = 'shop-summary';
    const today = status.today || {}, yesterday = status.yesterday;
    summary.textContent = `${status.reason}　今日 ${today.customers || 0}人 / 売上 ${(today.revenue || 0).toLocaleString('ja-JP')}　昨日 ${yesterday ? `${yesterday.customers || 0}人 / ${(yesterday.revenue || 0).toLocaleString('ja-JP')}` : '記録なし'}`;
    panel.append(summary);
    if (notice) { const note = document.createElement('p'); note.className = 'shop-summary'; note.textContent = notice; panel.append(note); }
    const staff = document.createElement('p'); staff.className = 'shop-summary';
    staff.textContent = `係　店番 ${status.staff.keeper ? 'あり' : 'なし'}・料理番 ${status.staff.cook ? 'あり' : 'なし'}・用心棒 ${status.staff.guard ? 'あり' : 'なし'}`;
    panel.append(staff);
    const stockTitle = document.createElement('h3'); stockTitle.textContent = `店の品 (${status.stock.length})`; panel.append(stockTitle);
    if (status.stock.length) for (const item of status.stock) {
      const row = document.createElement('div'); row.className = 'shop-stock';
      const text = document.createElement('span'); text.textContent = `${item.name}　${item.count}個${item.rank > 1 ? `・品質 ${item.rank}` : ''}`;
      const price = document.createElement('span'); price.textContent = `${item.price} キャッシュ`;
      row.append(text, price); panel.append(row);
    } else { const empty = document.createElement('p'); empty.className = 'shop-muted'; empty.textContent = '品切れ'; panel.append(empty); }
    const soldOut = Object.entries(status.soldOut || {});
    if (soldOut.length) { const note = document.createElement('p'); note.className = 'shop-muted'; note.textContent = '品切れ記録: ' + soldOut.map(([id,n]) => `${DISHES[id]?.name || ITEMS[id]?.name || GOODS[id]?.name || id} ${n}回`).join('、'); panel.append(note); }
    const titleList = document.createElement('h3'); titleList.textContent = '持ち物から品を並べる'; panel.append(titleList);
    const inventory = (actor?.inv || []).map((item, index) => ({ item, index })).filter(({ item }) => shopAccepts(status.type, item.id));
    if (!inventory.length) { const none = document.createElement('p'); none.className = 'shop-muted'; none.textContent = 'この店に並べられる品がありません'; panel.append(none); }
    for (const { item, index } of inventory) {
      const row = document.createElement('div'); row.className = 'shop-item';
      const mark = activeStolenMark(item.stolen, state.timeSec);
      const house = state.town?.houses?.find((entry) => entry.id === houseId);
      const refused = !!mark && sameStolenFaction(state, mark, house?.town);
      const label = document.createElement('span'); label.textContent = `${ITEMS[item.id]?.name || GOODS[item.id]?.name || DISHES[item.id]?.name || item.id}　${Math.max(1,item.n||1)}個${mark ? `　盗品（${stolenTownName(state, mark)}）` : ''}`;
      const button = document.createElement('button'); button.type = 'button'; button.textContent = refused ? '預けられない' : mark ? '店に並べる（6割）' : '1個';
      button.onclick = () => {
        if (refused) { notice = '同じ勢力の店は盗品を買い取りません'; render(); return; }
        onCommand({ type:'stockShopItem', houseId, actorId:actor.id, invIndex:index });
        notice = mark ? '盗品を割引価格で店に並べました' : '';
        render();
      };
      row.append(label, button); panel.append(row);
    }
  }
  function open(id) { houseId = id; notice = ''; render(); root.hidden = false; panels.open('shop'); }
  function closePanel() { root.hidden = true; }
  function hide() { root.hidden = true; panels.close('shop'); }
  panels.register('shop', { keepOnNonModal: true, contains: target => panel.contains(target), close: closePanel });
  return { open, close: hide, render, dispose() { root.remove(); style.remove(); } };
}
