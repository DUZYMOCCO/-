// v1.0.6 ロボごとの成績とランキング（Iron Squad の「武勲ランキング」の考え方: 項目ごとに 1 位＝MVP、上位 3 つに 🥇🥈🥉、総合の順位）。
//   数えるのは見るだけ: sim.fx の記録と、1 step ごとの HP・荷物の差を読むだけで、sim には何も書かない（ハッシュは変わらない・フラグなしで動く）。
//   数えるもの（本当に数えられるものだけ）:
//     与えたダメージ … 自分が撃った弾（shot の from）が敵に当てた量
//     撃破           … その弾で倒した敵の数（shot の kill）
//     受けたダメージ … 自分の HP の減り（弾・範囲攻撃・スーツの殻、どれでも）
//     運んだ資材     … 脱出口で降ろした荷物（荷物が 0 になった step に deliver があった時）
//     守った・助けた … 応急キットを使った・盾を渡した・連れていかれる人を運んでいた敵を倒して取り返した、の回数
//   ミサイルの着弾は発射台を引いていた機体（物語はネジ）の手柄にする。
export const STAT_CATEGORIES = Object.freeze([
  { id: 'dealt',   icon: '⚔️', label: '与えたダメージ', short: '与ダメ', unit: '' },
  { id: 'kills',   icon: '💥', label: '撃破',           short: '撃破',   unit: '体' },
  { id: 'taken',   icon: '🛡️', label: '受けたダメージ', short: '被ダメ', unit: '' },
  { id: 'carried', icon: '📦', label: '運んだ資材',     short: '運搬',   unit: '' },
  { id: 'saves',   icon: '💖', label: '守った・助けた', short: '救助',   unit: '回' },
]);
// 総合点: 与ダメ 1 点・撃破 25 点・受けたダメージ（盾になった分）0.3 点・資材 1 つ 15 点・守った／助けた 1 回 40 点
export const SCORE_WEIGHTS = Object.freeze({ dealt: 1, kills: 25, taken: 0.3, carried: 15, saves: 40 });
export const MEDALS = Object.freeze(['🥇', '🥈', '🥉']);

export const scoreOf = r => Math.round(STAT_CATEGORIES.reduce((a, c) => a + (r[c.id] || 0) * SCORE_WEIGHTS[c.id], 0));

export function createUnitStats({ nameOf = u => u.label || u.kind || '味方' } = {}) {
  const rows = new Map(), prevHp = new Map(), prevCargo = new Map(), prevCaptured = new Map(), killedBy = new Map(), seen = new WeakSet();
  const isMember = u => u && u.side === 'ally' && !u.object;
  function rec(u) {
    let r = rows.get(u.id);
    if (!r) {
      r = { id: u.id, kind: u.kind, human: !!u.human, name: nameOf(u), order: rows.size, dealt: 0, kills: 0, taken: 0, carried: 0, saves: 0, down: false, suit: false };
      rows.set(u.id, r);
    }
    return r;
  }
  return {
    /** 1 step 進めた後に呼ぶ。sim を読むだけ */
    observe(sim) {
      const byId = new Set();
      for (const u of sim.units) { byId.add(u.id); if (isMember(u)) rec(u); } // 初めて見た機体の行を先に作る（最初の step の弾も数える）
      const fresh = (sim.fx || []).filter(f => !seen.has(f));
      for (const f of fresh) seen.add(f);
      let delivered = false;
      for (const f of fresh) {
        if ((f.type === 'missileHit' || (f.type === 'shot' && f.toSide === 'enemy')) && f.to != null && rows.has(f.from)) {
          const r = rows.get(f.from); r.dealt += f.dmg || 0;
          if (f.kill) { r.kills++; killedBy.set(f.to, f.from); }
        } else if (f.type === 'kitUse' && rows.has(f.by)) rows.get(f.by).saves++;
        else if (f.type === 'shieldGive' && rows.has(f.by)) rows.get(f.by).saves++;
        else if (f.type === 'deliver') delivered = true;
      }
      for (const f of fresh) if (f.type === 'rescue') { // 運んでいた敵を倒した機体の手柄
        const by = killedBy.get(prevCaptured.get(f.id));
        if (by != null && rows.has(by)) rows.get(by).saves++;
      }
      for (const u of sim.units) {
        if (!isMember(u)) continue;
        const r = rec(u), p = prevHp.get(u.id);
        if (p && p.max === u.maxHp && u.hp < p.hp) r.taken += p.hp - Math.max(0, u.hp);
        prevHp.set(u.id, { hp: u.hp, max: u.maxHp });
        const c0 = prevCargo.get(u.id) || 0;
        if (delivered && c0 > 0 && !(u.cargo > 0)) r.carried += c0;
        prevCargo.set(u.id, u.cargo || 0);
        if (u.suitOn) r.suit = true;
      }
      for (const [id, r] of rows) if (!byId.has(id) && !r.down) { // 倒れた: 残っていた HP も受けたダメージ
        const p = prevHp.get(id); if (p && p.hp > 0) r.taken += p.hp;
        r.down = true; prevHp.delete(id); prevCargo.delete(id);
      }
      prevCaptured.clear();
      for (const u of sim.units) if (typeof u.captured === 'number') prevCaptured.set(u.id, u.captured);
    },
    /** 今の成績: rows（総合の順）・項目ごとの MVP */
    summary() {
      const list = [...rows.values()].map(r => ({ ...r, dealt: Math.round(r.dealt), taken: Math.round(r.taken), carried: Math.floor(r.carried + 1e-6), score: 0 }));
      for (const r of list) r.score = scoreOf(r);
      list.sort((a, b) => b.score - a.score || a.order - b.order);
      list.forEach((r, i) => { r.rank = i + 1; });
      const mvp = {};
      for (const c of STAT_CATEGORIES) {
        let best = null;
        for (const r of list) if ((r[c.id] || 0) > 0 && (!best || r[c.id] > best[c.id] || (r[c.id] === best[c.id] && r.order < best.order))) best = r;
        mvp[c.id] = best ? { id: best.id, name: best.name, value: best[c.id] } : null;
      }
      return { rows: list, mvp };
    },
  };
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const who = r => `${r.human ? '🧑' : '🤖'}${esc(r.name)}${r.suit ? '<small>（スーツ）</small>' : ''}`;

/** 結果の画面と ☰ の「今の成績」で使う HTML（縦長のスマホで読めるよう、MVP の札と順位の行だけ） */
export function statsHtml(sum, { title = 'ロボごとの成績' } = {}) {
  if (!sum.rows.length) return '';
  const chips = STAT_CATEGORIES.map(c => {
    const m = sum.mvp[c.id];
    return `<li class="bc-st-chip${m ? '' : ' none'}"><span class="bc-st-ic">${c.icon}</span><span class="bc-st-lab">${c.short}MVP</span><span class="bc-st-n"><b>${m ? esc(m.name) : '—'}</b><span class="bc-st-val">${m ? `${m.value}${c.unit}` : ''}</span></span></li>`;
  }).join('');
  const rows = sum.rows.map(r => {
    const medal = MEDALS[r.rank - 1] || `${r.rank}位`;
    const parts = STAT_CATEGORIES.map(c => `${c.icon}${r[c.id]}`).join(' ');
    return `<li class="bc-st-row${r.down ? ' down' : ''}"><span class="bc-st-rank">${medal}</span><span class="bc-st-who">${who(r)}${r.down ? '<small>（倒れた）</small>' : ''}</span><span class="bc-st-score">${r.score}点</span><span class="bc-st-parts">${parts}</span></li>`;
  }).join('');
  return `<section class="bc-st" aria-label="${esc(title)}"><h3 class="bc-st-title">${esc(title)}</h3><ul class="bc-st-mvp">${chips}</ul><h4 class="bc-st-sub">総合ランキング</h4><ol class="bc-st-list">${rows}</ol></section>`;
}
