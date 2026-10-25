// v0.4.7-dev 高さのお試し（テストと ?altdemo=1 だけ。本編のミッション MISSION_1 には入れない）
// 本陣の少し前に池（まん中が深い水・まわりが浅瀬）を掘り、空テスト機と水中テスト機（水陸両用）を置く。
import { ALT_TEST_UNITS, carveDemoPond } from './altitude.js?v=1';
import { T } from './map.js?v=6';

export const ALT_DEMO_POND = Object.freeze({ tx: 20, ty: 43 });
export const altDemoMapEdit = map => carveDemoPond(map, T, ALT_DEMO_POND.tx, ALT_DEMO_POND.ty);
// 10/24 13:53: 機体の種類は本編（MISSION_1）と同じ今の絵のもの（ツギハギ号 scav・PONCO・敵は alien）。
//   前は古い種類（gunner / heavy）で、それには art.js の SVG の絵しか無く、丸い古いロボで出ていた。
//   空テスト機・水中テスト機は専用の絵がまだないので PONCO の絵（兵種はガンナー）。
export const ALT_DEMO_SETUP = Object.freeze({
  ally: [
    { kind: 'ponco', tx: 13, ty: 47, count: 3, cls: 'gunner' },
    { kind: 'scav', tx: 26, ty: 48, count: 2, cls: 'scavenger' },
    { kind: 'ponco', cls: 'gunner', name: '空テスト機', tx: 23, ty: 42, ...ALT_TEST_UNITS.air },
    { kind: 'ponco', cls: 'gunner', name: '水中テスト機', tx: 19, ty: 43, ...ALT_TEST_UNITS.underwater },
  ],
  enemy: [
    { name: '赤1', kind: 'alien', tx: 16, ty: 36, role: 'guard', count: 1 },
    { name: '赤2', kind: 'alien', tx: 25, ty: 36, role: 'guard', count: 1 },
  ],
});
