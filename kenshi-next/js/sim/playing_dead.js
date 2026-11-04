// 意識のある死んだフリは、静止中だけ倒れた者として敵をやり過ごす。
export function isFeignStill(actor) {
  return !!actor?.playingDead && actor.carriedBy == null && !actor.moveTo &&
    !actor.movedThisTick && !actor.targetId && !(actor.task && !actor.task.selfFeign);
}

export function beginFeignCrawl(actor, tick) {
  if (!actor?.playingDead || actor.bound || actor.carriedBy != null) return false;
  if (!actor.feignForcedCrawl) {
    actor.feignWasCrawling = !!actor.crawling;
    actor.feignForcedCrawl = true;
  }
  actor.crawling = true;
  actor.crawlStartedTick = Math.max(0, tick - 10);
  if (actor.state === 'down') actor.state = 'idle';
  actor.anim = 'Crawl';
  return true;
}

export function clearFeignCrawl(actor) {
  if (actor?.feignForcedCrawl) actor.crawling = !!actor.feignWasCrawling;
  if (actor) { actor.feignForcedCrawl = false; actor.feignWasCrawling = false; }
}
