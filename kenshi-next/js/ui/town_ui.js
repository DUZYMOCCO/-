// 町の手元ボタン（bldg1）: 扉・錠前破り・盗む・スリ、賞金の表示、捕まえに来た時の答え（払う／牢へ／逆らう）。
// ルールは js/sim/town.js・locks.js・law.js。ここは表示と命令だけ。
import {
  doorNear, houseAt, houseById, hasKey, isPublic, canPick, lockSkill, pickpocketChance, partyBounty, bail, bountyOf, jailHours, CRIME_NAME,
  benchNear,
} from '../sim/index.js';

const CSS = `
#town-ctx{position:fixed;right:8px;top:calc(env(safe-area-inset-top,0px) + 176px);z-index:30;display:flex;flex-direction:column;align-items:flex-end;gap:6px;pointer-events:none;max-width:52vw}
#town-ctx button{pointer-events:auto;min-height:40px;padding:4px 10px;border-radius:10px;border:1px solid rgba(255,220,150,.55);background:rgba(40,30,15,.86);color:#ffe2a8;font-size:13px;font-weight:700;text-align:left;line-height:1.2}
#town-ctx button.crime{border-color:rgba(255,120,90,.7);background:rgba(70,22,14,.9);color:#ffd0c0}
#town-ctx button small{display:block;font-weight:400;font-size:11px;color:#d8c8a8}
#town-pick{pointer-events:none;padding:6px 8px;border-radius:10px;background:rgba(14,12,10,.86);color:#eee;font-size:12px;border:1px solid rgba(255,220,150,.35)}
#town-pick .bar{height:7px;border-radius:4px;background:#333;margin-top:4px;overflow:hidden}
#town-pick .bar i{display:block;height:100%;background:#e0b050}
#town-bounty{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 34px);z-index:30;display:none;padding:6px 10px;border-radius:10px;background:rgba(90,20,14,.9);border:1px solid #ff7a5a;color:#ffe0d0;font-size:13px;font-weight:700;pointer-events:none}
#town-seen{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 72px);transform:translateX(-50%);z-index:31;display:none;padding:6px 12px;border-radius:10px;background:rgba(160,30,20,.92);color:#fff;font-size:14px;font-weight:700;pointer-events:none}
#town-arrest{position:fixed;left:8px;right:8px;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);z-index:41;display:none;max-width:420px;margin:0 auto;padding:10px 12px;border-radius:12px;background:rgba(18,14,30,.95);border:1px solid #8a7ad0;color:#eee;font-size:14px;line-height:1.45;pointer-events:auto}
#town-arrest .row{display:flex;gap:6px;margin-top:8px}
#town-arrest button{flex:1;min-height:44px;border-radius:10px;border:1px solid #9a8ad0;background:#2a2450;color:#fff;font-size:14px;font-weight:700}
#town-arrest button.r{border-color:#d07a6a;background:#4a1e18}
`;

function el(tag, id, cls) {
  const n = document.createElement(tag);
  if (id) n.id = id;
  if (cls) n.className = cls;
  return n;
}

const KIND = { home: '家', shop: '店', post: '詰所' };

// 今できること（純粋・テスト用）。actor の近く 2.5m 以内
export function townActions(state, actor) {
  const out = [];
  if (!state || !state.town || !actor || actor.state === 'dead' || actor.jail) return out;
  const inside = houseAt(state, actor.x, actor.z, 0.2);
  const h = doorNear(state, actor.x, actor.z, 2.5);
  if (h) {
    const d = h.door;
    if (d.locked && !inside && !hasKey(actor, h)) {
      const c = canPick(actor, d.lock);
      out.push({ kind: 'pick', label: '錠前を破る', sub: KIND[h.type] + '・錠' + d.lock + '・' + Math.round(c.chance * 100) + '%', crime: true, cmd: { type: 'pick', kind: 'door', id: h.id } });
    } else {
      out.push({ kind: 'door', label: d.open ? '扉を閉める' : '扉を開ける', sub: KIND[h.type] + (d.locked ? '（鍵）' : ''), cmd: { type: 'door', houseId: h.id } });
    }
  }
  let box = null;
  let bd = 2.2;
  for (const b of state.town.boxes) {
    // 同じ小屋の中にいる時だけ（壁ごしには取れない）
    if (!inside || inside.id !== b.house) continue;
    const dd = Math.hypot(b.x - actor.x, b.z - actor.z);
    if (dd < bd) {
      bd = dd;
      box = b;
    }
  }
  if (box) {
    const bh = houseById(state, box.house);
    const n = Object.values(box.goods || {}).reduce((s, v) => s + v, 0);
    if (box.locked) {
      const c = canPick(actor, box.lock);
      out.push({ kind: 'pickbox', label: '箱の錠を破る', sub: '錠' + box.lock + '・' + Math.round(c.chance * 100) + '%', crime: true, cmd: { type: 'pick', kind: 'box', id: box.id } });
    } else if (n > 0 || box.cash > 0) {
      out.push({ kind: 'steal', label: '盗む', sub: (box.kind === 'display' ? '店の品' : (bh ? KIND[bh.type] : '') + 'の箱') + '・' + n + '個' + (box.cash ? '・' + box.cash + ' cash' : ''), crime: true, cmd: { type: 'steal', boxId: box.id } });
    }
  }
  let mark = null;
  let md = 2.0;
  for (const o of state.actors) {
    if (o === actor || o.faction === 'player' || o.state === 'dead' || !o.home) continue;
    const dd = Math.hypot(o.x - actor.x, o.z - actor.z);
    if (dd < md) {
      md = dd;
      mark = o;
    }
  }
  if (mark) {
    const p = pickpocketChance(actor, mark);
    out.push({ kind: 'pickpocket', label: 'スリ', sub: (mark.title || mark.name) + (mark.resting ? '（寝ている）' : '') + '・' + Math.round(p * 100) + '%', crime: true, cmd: { type: 'pickpocket', targetId: mark.id } });
  }
  const bench = benchNear(state, actor.x, actor.z, 2.8);
  if (bench) {
    out.push({ kind: 'forge', label: '鍛冶台を使う', sub: `武器の鍛造・強化（Tier ${bench.tier || 1}）`, bench, cmd: { type: 'openForge', benchId: bench.id } });
  }
  return out;
}

export function createTownUI(opts) {
  const getState = opts.getState;
  const getActor = opts.getActor;
  const command = opts.command;
  const root = opts.root || document.body;
  const style = el('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const ctx = el('div', 'town-ctx');
  const pickBox = el('div', 'town-pick');
  const bounty = el('div', 'town-bounty');
  const seen = el('div', 'town-seen');
  const arrest = el('div', 'town-arrest');
  for (const n of [ctx, arrest]) for (const ev of ['pointerdown', 'touchstart', 'wheel']) n.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
  root.append(ctx, bounty, seen, arrest);
  let ctxKey = '';
  let arrestKey = '';
  const stats = { actions: [], arrest: false, bounty: 0, picking: false };

  function renderCtx(st, actor, acts) {
    ctx.textContent = '';
    for (const a of acts) {
      const b = el('button', null, a.crime ? 'crime' : '');
      b.type = 'button';
      b.dataset.kind = a.kind;
      b.textContent = a.label;
      const s = el('small');
      s.textContent = a.sub;
      b.appendChild(s);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (a.kind === 'forge' && opts.onForge) {
          opts.onForge(a.bench);
          return;
        }
        command(Object.assign({ actorId: actor.id }, a.cmd));
      });
      ctx.appendChild(b);
    }
    ctx.appendChild(pickBox);
  }

  function update() {
    const st = getState();
    if (!st || !st.town) {
      ctx.style.display = 'none';
      return;
    }
    ctx.style.display = 'flex';
    const actor = getActor();
    const acts = actor ? townActions(st, actor) : [];
    stats.actions = acts.map((a) => a.kind);
    const key = (actor ? actor.id : '') + '|' + acts.map((a) => a.kind + a.label + a.sub).join('|');
    if (key !== ctxKey) {
      ctxKey = key;
      renderCtx(st, actor, acts);
    }
    // 錠前破りの進み
    const p = actor && actor.pick;
    stats.picking = !!p;
    if (p) {
      pickBox.style.display = 'block';
      const k = Math.max(0, Math.min(1, p.t / Math.max(1, p.cycle)));
      pickBox.innerHTML = '';
      const t = el('div');
      t.textContent = '錠前破り中… ' + (p.tries + 1) + '回目・成功率 ' + Math.round(p.chance * 100) + '%・腕 ' + Math.round(lockSkill(actor));
      const bar = el('div', null, 'bar');
      const i = el('i');
      i.style.width = Math.round(k * 100) + '%';
      bar.appendChild(i);
      pickBox.append(t, bar);
    } else pickBox.style.display = 'none';
    // 賞金
    const pb = partyBounty(st);
    stats.bounty = pb;
    bounty.style.display = pb > 0 ? 'block' : 'none';
    if (pb > 0) bounty.textContent = '賞金首 ' + pb + ' cash';
    // 見られている（罪の最中）
    const sq = st.actors.filter((a) => a.faction === 'player' && a.crime && a.crime.seen);
    seen.style.display = sq.length ? 'block' : 'none';
    if (sq.length) seen.textContent = '見られた！ ' + (CRIME_NAME[sq[0].crime.kind] || '');
    // 捕まえに来た
    const ar = st.law && st.law.arrest;
    const target = ar && ar.stage === 'ask' ? st.actors.find((a) => a.id === ar.targetId) : null;
    stats.arrest = !!target;
    const ak = target ? target.id + ':' + bountyOf(target) : '';
    if (ak !== arrestKey) {
      arrestKey = ak;
      arrest.textContent = '';
      if (target) {
        const g = st.actors.find((a) => a.id === ar.guardId);
        const amt = bountyOf(target);
        const msg = el('div');
        msg.textContent = (g ? g.title || g.name : '番兵') + '「止まれ、' + target.name + '。賞金 ' + amt + ' cash だ。罰金を払うか、牢に入るか」';
        const row = el('div', null, 'row');
        const mk = (label, choice, cls) => {
          const b = el('button', null, cls || '');
          b.type = 'button';
          b.dataset.choice = choice;
          b.textContent = label;
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            command({ type: 'arrest', choice });
          });
          return b;
        };
        row.append(mk('払う ' + bail(target), 'pay'), mk('牢へ ' + Math.round(jailHours(amt)) + '時間', 'jail'), mk('逆らう', 'resist', 'r'));
        arrest.append(msg, row);
      }
      arrest.style.display = target ? 'block' : 'none';
    }
  }

  return { update, stats };
}
