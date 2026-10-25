// v0.4.12-dev 飛ぶ機体と水陸両用機のお試し（?altunits=1 とテストだけ。本編のミッション MISSION_1 には入れない）
// altitude-demo.js と同じ池（まん中が深い水・まわりが浅瀬）に、飛ぶ機体・水陸両用機・ふつうの味方（PONCO02・ツギハギ号）・異星生物を置く。
import { ALT_KINDS } from './alt-units.js?v=3';
import { altDemoMapEdit, ALT_DEMO_POND } from './altitude-demo.js?v=2';

export { ALT_DEMO_POND };
export const altUnitsMapEdit = altDemoMapEdit;
const mv = kind => ({ z: ALT_KINDS[kind].z, moves: ALT_KINDS[kind].moves });
export const ALT_UNITS_SETUP = Object.freeze({
  ally: [
    { kind: 'ponco', tx: 13, ty: 47, count: 3, cls: 'gunner' },
    { kind: 'scav', tx: 26, ty: 48, count: 2, cls: 'scavenger' },
    { kind: 'flyer', cls: 'gunner', name: 'スカイポンコ（仮）', tx: 23, ty: 42, ...mv('flyer') },
    { kind: 'amph', cls: 'gunner', name: 'アビスポンコ（仮）', tx: 19, ty: 43, ...mv('amph') },
  ],
  enemy: [
    { name: '赤1', kind: 'alien', tx: 16, ty: 36, role: 'guard', count: 1 },
    { name: '赤2', kind: 'alien', tx: 25, ty: 36, role: 'guard', count: 1 },
  ],
});
