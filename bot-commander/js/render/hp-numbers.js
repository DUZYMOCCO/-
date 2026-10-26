// v1.0.6 戦闘中の数字: 当たった所に浮かぶダメージの数（味方が受けた＝赤・敵が受けた＝白、約 0.8 秒で消える）と、
//   HP バーの横の小さな「今の HP/最大 HP」（撃った・撃たれた後の約 3 秒と、選んでいる味方はいつも）。
//   描くだけ: sim の数は読むだけで書き換えない（ハッシュは変わらない）。HP の減りを 1 フレームごとに比べるので、
//   ふつうの弾・発射台・新しい敵の範囲攻撃・スーツ（殻の HP）のどれでも同じように出る。
export const DMG_LIFE = 0.8;      // 浮かぶ数が消えるまで（秒）
export const HP_SHOW_SEC = 3;     // 撃った・撃たれた後に HP の数を出しておく秒数
export const DMG_MAX = 28;        // 同時に出す浮かぶ数の上限（画面が数字だらけにならないように）
export const NEAR_PX = 18;        // この距離（世界の px）に新しい数があれば少しずらす
export const DMG_COLOR = Object.freeze({ ally: 0xff5a5a, enemy: 0xffffff });

/** ずらし方: k 個目（0 は元の位置）を左右交互に少しずつ・上へ */
export function stackOffset(k) {
  if (k <= 0) return { dx: 0, dy: 0 };
  return { dx: (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 9, dy: -k * 7 };
}

/** 浮かぶ数の今の位置と濃さ（age 秒）。life を過ぎたら null */
export function popPose(p, age) {
  if (age < 0 || age > DMG_LIFE) return null;
  const f = age / DMG_LIFE;
  return { x: p.x + p.dx, y: p.y + p.dy - 22 * f, alpha: f < 0.55 ? 1 : 1 - (f - 0.55) / 0.45, scale: age < 0.08 ? 0.75 + age / 0.08 * 0.35 : 1.1 - Math.min(0.1, age) };
}

const hpText = u => `${Math.max(0, Math.ceil(u.hp))}/${Math.ceil(u.maxHp)}`;
export { hpText };

/**
 * 見るだけの記録係。update(sim, now, { selected, visible }) が呼ばれるたびに、前のフレームとの HP の差から新しい数を作る。
 * selected: 選んでいる機体の id の集合。visible(u): 霧で見えているか。戻り値 { pops: 今出ている数, labels: HP を出す機体 }
 */
export function createHpNumbers() {
  const prev = new Map(), until = new Map(), seenFx = new WeakSet();
  let pops = [];
  function spawn(u, amount, now) {
    if (!(amount >= 0.5)) return;
    const x = u.x, y = u.y - 18;
    let k = 0;
    for (const p of pops) if (now - p.born < DMG_LIFE && Math.hypot(p.x - x, p.y - y) < NEAR_PX) k++;
    const o = stackOffset(Math.min(k, 6));
    pops.push({ x, y, dx: o.dx, dy: o.dy, text: String(Math.round(amount)), side: u.side, born: now, id: u.id });
    if (pops.length > DMG_MAX) pops = pops.slice(pops.length - DMG_MAX);
  }
  return {
    update(sim, now, { selected = new Set(), visible = () => true } = {}) {
      const over = !!sim.result;
      // 撃った機体も「戦っている」に数える（弾の記録 shot の from）
      for (const f of sim.fx || []) {
        if (seenFx.has(f)) continue; seenFx.add(f);
        if (f.type === 'shot' && f.from != null) until.set(f.from, now + HP_SHOW_SEC);
      }
      const alive = new Set();
      for (const u of sim.units) {
        if (u.object && !u.launch) continue; // 通常発射台を除き「物」は数を出さない
        alive.add(u.id);
        const p = prev.get(u.id), hp = u.hp, max = u.maxHp;
        if (p && p.max === max && hp < p.hp - 1e-6 && visible(u)) { spawn(u, p.hp - Math.max(0, hp), now); until.set(u.id, now + HP_SHOW_SEC); }
        prev.set(u.id, { hp, max, x: u.x, y: u.y, side: u.side });
      }
      for (const [id, p] of prev) if (!alive.has(id)) { // 倒れて消えた: 残っていた HP の分をとどめとして出す
        if (p.hp > 0 && (sim.fx || []).some(f => f.type === 'boom' && Math.hypot(f.x - p.x, f.y - p.y) < 2)) spawn({ x: p.x, y: p.y, side: p.side, id }, p.hp, now);
        prev.delete(id); until.delete(id);
      }
      pops = pops.filter(p => now - p.born <= DMG_LIFE);
      const labels = [];
      if (!over) for (const u of sim.units) {
        if ((u.object && !u.launch) || !(u.hp > 0) || !(u.maxHp > 0) || !visible(u)) continue;
        const sel = u.side === 'ally' && selected.has(u.id);
        if (sel || (until.get(u.id) || 0) > now) labels.push({ u, text: hpText(u), selected: sel });
      }
      return { pops, labels };
    },
    reset() { prev.clear(); until.clear(); pops = []; },
  };
}
