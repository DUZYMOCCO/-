// 第2章の乗り降りは☰だけ。戦わないロウは選ばせない。
import { canBoard, canAlight, RIDE_MODE } from '../sim/ride.js?v=3';
export function toggleStory2Ride(sim) {
  const boy = sim.units.find(u => u.kind === 'boy' && u.side === 'ally');
  const neji = sim.units.find(u => u.id === sim.story2.nejiId);
  const r = boy?.ride ? canAlight(sim, boy) : canBoard(sim, boy, neji, RIDE_MODE.BACK);
  if (!r.ok) return { ok: false, text: '少年をネジのそばへ。いまは乗り降りできない。' };
  sim.commands.push(boy.ride ? { type: 'alight', humanIds: [boy.id] } : { type: 'board', humanId: boy.id, hostId: neji.id, mode: RIDE_MODE.BACK });
  return { ok: true, text: boy.ride ? '少年が おりる' : '少年が 乗る' };
}
export function mountStory2Ops(host) {
  const b = document.createElement('button'); b.dataset.story2op = 'ride';
  b.style.cssText = 'height:44px;min-height:44px;font-weight:700';
  host.menuBox.insertBefore(b, host.menuBox.querySelector('.bc-menu-close')?.nextSibling || null);
  function refresh() { const boy = host.sim.units.find(u => u.kind === 'boy'); b.textContent = boy?.ride ? '少年をおろす' : '少年を乗せる'; b.disabled = !boy || boy.captured != null || !!host.sim.result; }
  b.onclick = () => { const r = toggleStory2Ride(host.sim); host.toast(r.text, r.ok ? '' : 'warn'); if (r.ok) host.applyNow(); refresh(); };
  refresh(); return { refresh, destroy: () => b.remove() };
}
