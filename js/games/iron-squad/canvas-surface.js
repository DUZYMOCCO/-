/** Canvas lifecycle. No per-frame pixel readback or extra full-screen buffer. */
export function releaseCanvas(canvas) {
  if (!canvas) return;
  canvas.width = 1; canvas.height = 1;
}

export function releaseSceneCaches(game) {
  game.worldTerrain?.clear?.();
  game.worldTerrain = null;
  releaseCanvas(game.vigCache);
  game.vigCache = null;
  game.vigW = game.vigH = 0;
}

export function frameSurfaceReady(game) {
  if (!game.ctx || game._surfaceLost || game.ctx.isContextLost?.() === true) return false;
  if (!(Number.isFinite(game.width) && game.width > 0 && Number.isFinite(game.height) && game.height > 0)) return false;
  const ratioX = game.canvas ? game.canvas.width / game.width : 1;
  const ratioY = game.canvas ? game.canvas.height / game.height : 1;
  game.ctx.setTransform(Number.isFinite(ratioX) && ratioX > 0 ? ratioX : 1, 0, 0,
    Number.isFinite(ratioY) && ratioY > 0 ? ratioY : 1, 0, 0);
  game.ctx.globalAlpha = 1;
  game.ctx.globalCompositeOperation = 'source-over';
  game.ctx.beginPath();
  return true;
}

export function attachSurfaceEvents(game) {
  game.contextLostHandler = event => {
    event.preventDefault();
    game._surfaceResumeBattle = game.inBattle;
    game._surfaceLost = true;
    game.inBattle = false;
    game.stopGameLoop();
    game.resetMovementInput();
    releaseSceneCaches(game);
    game.showRenderProblem('context', new Error('Canvas context lost'));
  };
  game.contextRestoredHandler = () => {
    game.ctx = game.canvas.getContext('2d');
    if (!game.ctx || game.ctx.isContextLost?.()) return;
    game._surfaceLost = false;
    game.resizeCanvas();
    game.inBattle = surfaceCanResume(game);
    game.clearRenderProblem();
    game.startGameLoop();
  };
  game.canvas.addEventListener('contextlost', game.contextLostHandler);
  game.canvas.addEventListener('contextrestored', game.contextRestoredHandler);
}

export function surfaceCanResume(game) {
  return game.container ? !game.container.classList.contains('dialog-open') && !!game.player && game.player.hp > 0 : !!game._surfaceResumeBattle;
}

export function detachSurfaceEvents(game) {
  game.canvas?.removeEventListener('contextlost', game.contextLostHandler);
  game.canvas?.removeEventListener('contextrestored', game.contextRestoredHandler);
  game._surfaceLost = false;
}
