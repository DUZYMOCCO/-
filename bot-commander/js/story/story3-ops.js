// 第 3 章（?storych=3）の画面の文字: 上の帯（いまやること）と結果の画面の文字。DOM なしで決める（テスト用）。シムは読むだけ。
import { story3Status } from '../sim/story3-sim.js?v=1';

/** 上の帯（目的の文字と棒）。{ text, frac, warn } */
export function story3Hud(sim) {
  const st = story3Status(sim); if (!st) return null;
  if (st.gate) {
    const pct = Math.floor(st.gate.progress * 100);
    if (st.gate.done) return { text: '門の はりがみを みつけた！', frac: 1, warn: false };
    if (st.gate.blocked) return { text: `門の はりがみを しらべる ${pct}%（敵が近い。のこり${st.enemies}体）`, frac: st.gate.progress, warn: true };
    return { text: `門の はりがみを しらべる ${pct}%`, frac: st.gate.progress, warn: false };
  }
  const m = st.mint;
  if (m.phase === 'guard') return { text: 'ビルの入口の センシャヤドカリを たおす', frac: m.guardAlive ? 0.1 : 0.2, warn: false };
  if (m.captured === 'nest') return { text: 'ミントが 巣に つれていかれた！ ロボで巣へ', frac: 0.3, warn: true };
  if (m.captured != null) return { text: 'ミントが はこばれている！ はこぶ敵を たおせ', frac: 0.35, warn: true };
  if (m.phase === 'found') return { text: 'ミントを まもれ！ ハサミアリが くる', frac: 0.3, warn: true };
  if (m.phase === 'escort') {
    const ex = sim.mission.extraction, mint = sim.units.find(u => u.id === sim.story3.mint.id);
    const d = mint ? Math.hypot(mint.x - (ex.tx + 0.5) * 32, mint.y - (ex.ty + 0.5) * 32) / 32 : 0;
    return { text: m.riding ? 'ミントを 門まで おくる（PONCO02に乗っている）' : 'ミントを PONCO02に のせて 門まで おくる', frac: 0.5 + 0.5 * Math.max(0, 1 - d / 22), warn: false };
  }
  return { text: 'ミントを たすけた！', frac: 1, warn: false };
}

/** 結果の画面の題と理由 */
export function story3ResultText(sim) {
  const win = sim.result === 'win', st = story3Status(sim);
  const title = win ? (st.stage === '3-1' ? '門の はりがみを みつけた' : 'ミントを たすけた') : '作戦失敗';
  const why = {
    gate: '門の はりがみを しらべ おえた！', mintHome: 'ミントが 門に ついた。なかまに なった！',
    nejiDown: 'ネジが 壊された…', boyDown: '少年が やられた…', boyCaptured: '少年が 連れていかれた…',
    mintDown: 'ミントが やられた…', mintLost: 'ミントが 巣に 連れていかれた…',
  }[sim.resultReason] || (win ? '作戦成功' : '作戦失敗');
  return { title, why, killed: st.killed };
}
