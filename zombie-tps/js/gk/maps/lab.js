// v0.16.0: ガンキック ステージ1「ほろびた けんきゅうじょ」の 3D マップ（あとから よむ・かくうの しせつ）
// v0.17.0: なかみは セグメント（seg/lab_a.js・seg/lab_b.js）に わけた。ここは 2つを つないで 1まいの マップに する（テスト・ふるい よみかた よう）
//   へや0 いりぐち → へや1 サーバーしつ →（A|B）→ へや2 タンクの ホール → へや3 ちかの じっけんしつ（ボス）
import { chainSegs, joinSegs } from '../seg.js?v=34';
import * as A from '../seg/lab_a.js?v=34';
import * as Bm from '../seg/lab_b.js?v=34';

export function build(builder) {
  return joinSegs(chainSegs([A.build(builder), Bm.build(builder)]));
}
