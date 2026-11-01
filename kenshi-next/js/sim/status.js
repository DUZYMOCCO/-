export function actorStatusText(actor, normalText = '') {
  if (actor?.resting && !['dead', 'down', 'getup'].includes(actor.state)) return '寝ている';
  return actor?.crawling && !['dead', 'down', 'getup'].includes(actor.state) ? '這っている' : normalText;
}
