// ?dialogdemo=all（お試し）の台本を作る: portraits.json の全員を、全部の表情で順に出す（セリフはすべて仮）。
// DOM なし（テストから呼ぶ）。左に立つ人（ネジ・少年）を先に、それから右に立つ人を portraits.json の順に。
// from に ID を渡すと、その人から始める（確かめたい人まで、とばさずに済むように）。

export const FACE_LABEL = Object.freeze({
  neutral: 'ふつう', smile: '笑顔', happy: 'うれしい', surprised: 'おどろき', worried: '心配', serious: '真剣',
  alert: '警戒', angry: '怒り', sad: 'かなしみ', pain: '痛み', hurt: 'ひるみ', smug: '得意げ', damaged: '損傷', off: '停止',
});

/** 全員・全表情を順に見る台本。portraits は portraits.json の chars */
export function buildAllScript(portraits, { from } = {}) {
  const ids = Object.keys(portraits);
  const left = ids.filter(id => portraits[id].side === 'left'), right = ids.filter(id => portraits[id].side !== 'left');
  let order = [...left, ...right];
  if (from && portraits[from]) order = order.slice(order.indexOf(from));
  const lines = [], on = { left: null, right: null }, cast = {};
  // 始まりは左右に1人ずつ（片方しかいないときは片方）
  for (const side of ['left', 'right']) {
    const id = order.find(i => (portraits[i].side === 'left' ? 'left' : 'right') === side) || (side === 'left' ? left[left.length - 1] : right[0]);
    if (id) { cast[id] = 'neutral'; on[side] = id; }
  }
  const total = order.length;
  order.forEach((id, n) => {
    const p = portraits[id], side = p.side === 'left' ? 'left' : 'right';
    if (on[side] !== id) {
      if (on[side]) lines.push({ exit: on[side] });
      lines.push({ enter: id, face: 'neutral' });
      on[side] = id;
    }
    for (const face of Object.keys(p.faces)) {
      const label = `${FACE_LABEL[face] || face}（${face}）`;
      const head = `${n + 1}/${total} ${id}`;
      lines.push({ who: id, face, text: p.speaks === false ? `……（${head}・${p.name}・${label}）` : `${head}：${label}。全員の表情のお試しです。（仮）` });
    }
  });
  return { id: 'demo-all', title: '全員の立ち絵のお試し（仮）', cast, lines };
}
