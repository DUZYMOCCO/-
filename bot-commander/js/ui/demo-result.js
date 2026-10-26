// v1.0.3+ ミッションのないお試し（?altunits=1・?altdemo=1・?ridedemo=1 など）の結果の画面の文字。
// ミッションがない sim は missionStatus() が null を返すので、showResult はここの文字を使う（資材・脱出口の話は出さない）。DOM に触らない。
const fmt = s => { const t = Math.ceil(s); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

/** { win, title, html }。win は sim.result が 'win' の時 true */
export function demoResultView(sim) {
  const win = sim.result === 'win';
  const left = sim.units.filter(u => u.side === 'ally' && !u.human).length;
  const humans = sim.units.filter(u => u.side === 'ally' && u.human && u.captured == null).length;
  const why = win ? '敵をぜんぶ倒した！' : '味方がぜんぶやられた…';
  return { win, title: win ? 'お試し 成功' : 'お試し 失敗', html: `${why}<br>残ったロボ ${left}機・人 ${humans}人　かかった時間 ${fmt(sim.time || 0)}` };
}
