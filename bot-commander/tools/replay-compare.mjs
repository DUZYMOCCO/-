// 記録（リプレイ）の JSON を Node で再生して、記録のハッシュ（marks・end）と同じか確かめる。2 つ渡すと、2 つの記録のハッシュも比べる。
// 端末の Math のちがい（R-12 の注意2）を調べる道具: iPhone で書き出した記録を PC で再生する／PC と iPhone の「ハッシュの書き出し」を比べる。
//
//   node tools/replay-compare.mjs <記録.json>                  … Node で再生して、記録の marks・end と比べる
//   node tools/replay-compare.mjs <A.json> <B.json>            … それぞれ再生して比べたうえで、A と B の marks・end も比べる（最初にずれた tick を出す）
//   node tools/replay-compare.mjs <記録.json> --out <出力.json> … この Node で出たハッシュを、記録の形で書き出す（ほかの端末の物と比べる用）
// 終了コード: 0＝全部同じ / 1＝ずれあり / 2＝読めない・使い方のまちがい。最後の行は REPLAY_COMPARE_RESULT: 0 OK か NG（英数字だけ）
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openReplay, parseReplay, compareRecords, deviceRecord, stringifyReplay } from '../js/sim/replay.js?v=9';

const args = process.argv.slice(2);
const oi = args.indexOf('--out');
const out = oi >= 0 ? args.splice(oi, 2)[1] : null;
if (!args.length || args.length > 2 || args.some(a => a.startsWith('--')) || (oi >= 0 && !out)) {
  console.log('使い方: node tools/replay-compare.mjs <記録.json> [<もう1つの記録.json>] [--out <出力.json>]');
  console.log('REPLAY_COMPARE_RESULT: 2 USAGE'); process.exit(2);
}
const env = `node ${process.version} ${process.platform}-${process.arch}`;
let bad = 0; const devs = [], recs = [];
const where = f => (f.where === 'end' ? `終わり（tick ${f.tick}）` : `途中（tick ${f.tick}）`);
for (const file of args) {
  let text; try { text = readFileSync(file, 'utf8'); } catch (e) { console.log(`${file}: 読めません（${e.message}）`); console.log('REPLAY_COMPARE_RESULT: 2 UNREADABLE'); process.exit(2); }
  const o = openReplay(text);
  if (!o.ok) { console.log(`${file}: 断りました: ${o.reason}`); console.log('REPLAY_COMPARE_RESULT: 2 REJECTED'); process.exit(2); }
  for (const n of o.notes) console.log(`${file}: 注意: ${n}`);
  const rep = o.player.runAll();
  recs.push(o.rec); devs.push(deviceRecord(o.rec, rep, env));
  if (rep.match) console.log(`${file}: 同じ（${rep.ticks} tick・途中のハッシュ ${rep.marksChecked} 個と終わりが、記録と全部同じ）`);
  else { bad++; const f = rep.first; console.log(`${file}: ちがう！ 最初にずれたのは ${where(f)} の ${f.field}（記録 ${f.want} ／ この Node ${f.got}）。tick ${f.since} までは同じ`); }
}
if (args.length === 2) {
  // 記録に入っているハッシュどうし（取った端末の値）と、Node で再生した値どうし
  for (const [label, a, b] of [['記録に入っていたハッシュどうし', recs[0], recs[1]], ['この Node で再生したハッシュどうし', devs[0], devs[1]]]) {
    const c = compareRecords(a, b);
    if (!c.startSame) { bad++; console.log(`${label}: 始まりの条件（start）が違うので、比べられません`); }
    else if (c.same) console.log(`${label}: 同じ（${c.compared} 個を比べた）`);
    else { bad++; console.log(`${label}: ちがう！ tick ${c.first.tick} の ${c.first.field}（A ${c.first.a} ／ B ${c.first.b}）。tick ${c.first.since} までは同じ`); }
  }
}
if (out) { writeFileSync(out, stringifyReplay(devs[0]), { encoding: 'utf8' }); console.log(`書き出しました: ${out}（${args[0]} を、この Node で再生して出たハッシュ）`); }
console.log(bad ? `ちがう: ${bad} 件` : '全部同じ');
console.log(`REPLAY_COMPARE_RESULT: ${bad} ${bad ? 'NG' : 'OK'}`);
process.exit(bad ? 1 : 0);
