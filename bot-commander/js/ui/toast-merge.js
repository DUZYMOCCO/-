// 注意の知らせ（リペアキット切れ・シールドが壊れた）を、続いた分だけ 1 つにまとめる決まり。DOM を使わない（Node のテストで確かめる）。
// 状態は { t: 最初の知らせの時間, names: 名前の並び, n: 件数 }。時間はゲーム内の秒。

/**
 * 新しい知らせ f（{ t, label }）を、前のまとめ prev に足すか、新しいまとめにするかを決めて、次のまとめを返す（prev は書きかえない）。
 * windowSec 以内に続いたら足す。時間が戻った（f.t が prev.t より前＝「もう一度」で 0 に戻った）ときは、新しいまとめにする。
 */
export function mergeWarn(prev, f, windowSec) {
  if (prev && f.t >= prev.t && f.t - prev.t < windowSec) {
    return { t: prev.t, names: prev.names.includes(f.label) ? prev.names : [...prev.names, f.label], n: prev.n + 1 };
  }
  return { t: f.t, names: [f.label], n: 1 };
}

/** まとめの名前の言い方: 1 件ならその名前、同じ名前の続きなら「名前×回数」、ちがう名前なら「名前 ほか○機」 */
export function warnWho(k) {
  return k.n === 1 ? k.names[0] : k.names.length === 1 ? `${k.names[0]}×${k.n}` : `${k.names[0]} ほか${k.n - 1}機`;
}
