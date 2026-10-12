// Preserve the caller of field interactions, including a paused strategy window.
export function fieldDialogReturn(game) {
  const modal=game.container.querySelector('#strategy-modal');
  const fromMenu=modal&&!modal.classList.contains('hidden'),wasBattle=game.inBattle;
  if(!fromMenu)game.openStrategyModal(true);
  return ()=>{
    game.renderStrategyUI?.();game.updateStatsUI?.(true);
    if(!fromMenu)game.closeStrategyModal(wasBattle);
  };
}
