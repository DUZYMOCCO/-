export const AUTO_SAVE_INTERVAL_MS=10000;
const clocks=new WeakMap();
// Independent of simulation time: command, shop and meeting screens keep this clock.
export function startAutoSave(game,clock=globalThis){
  if(clocks.has(game))return;
  const timer=clock.setInterval(()=>game.saveGame({auto:true,background:true}),AUTO_SAVE_INTERVAL_MS);
  timer?.unref?.();clocks.set(game,{timer,clock});
}
export function stopAutoSave(game){
  const state=clocks.get(game);if(!state)return;
  state.clock.clearInterval(state.timer);clocks.delete(game);
}
