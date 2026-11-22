import test from 'node:test';
import assert from 'node:assert/strict';
import {createAbyssDive} from '../js/game.js';

// Run the real game loop and input handlers; replace only browser drawing and frame scheduling.
function boot(t) {
  const previous = Object.fromEntries(['window', 'document', 'Image', 'requestAnimationFrame'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  t.after(() => {
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const noop = () => {};
  const gradient = {addColorStop:noop};
  const ctx = new Proxy({
    createLinearGradient:()=>gradient, createRadialGradient:()=>gradient, measureText:()=>({width:40}),
    createImageData:(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}),
  }, {
    get(target, key) { return target[key] ?? noop; },
  });
  const makeCanvas = () => Object.assign(new EventTarget(), {getContext:()=>ctx, style:{}});
  globalThis.window = new EventTarget();
  globalThis.document = {createElement:makeCanvas, body:{clientWidth:1280, clientHeight:720}};
  globalThis.Image = class {};
  let next;
  globalThis.requestAnimationFrame = fn => { next = fn; };
  const game = createAbyssDive({canvas:makeCanvas()});
  game.start(); game.startGame();
  t.after(() => game.destroy());
  game.G.rocks = [];
  game.G.spawnT = 30;
  let now = performance.now();
  const step = (count = 1) => { for (let i = 0; i < count; i++) next(now += 1000/60); };
  const press = code => {
    for (const event of ['keydown', 'keyup']) window.dispatchEvent(Object.assign(new Event(event), {code}));
  };
  return {game, step, press};
}

test('回避入力は1回ずつ。クールダウン中の入力は予約されない', t => {
  const {game, step, press} = boot(t);
  let warps = 0;
  game.AU.warp = () => { warps++; };
  press('Space'); step();
  assert.equal(warps, 1);
  step(12); press('Space'); step(210);
  assert.equal(warps, 1);
  press('Space'); step();
  assert.equal(warps, 2);
});

test('撃破された敵は同じフレームで消え、生きている敵は残る', t => {
  const {game, step, press} = boot(t);
  const {G} = game;
  const {x, y} = G.player;
  const mine = {kind:'mine', x:x+425, y, baseY:y, r:26, hp:1, score:20, vx:0, vy:0, t:0, phase:0, hitCd:0, stun:0, flash:0, dir:-1};
  const live = {...mine, x:x+545, hp:100};
  G.enemies = [mine, live];
  press('ShiftLeft'); step();
  assert.equal(G.kills, 1);
  assert.equal(G.enemies.includes(mine), false);
  assert.equal(G.enemies.includes(live), true);
});
