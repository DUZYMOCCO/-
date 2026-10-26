// 第2章の台本・進行。保存は任意の専用キーだけ。既存の story/save は変えない。
import { STORY2_MISSIONS } from './story2-missions.js?v=1';
export const story2Requested = search => new URLSearchParams(search).get('storych') === '2';
export const newStory2State = () => ({ chapter: 2, step: 1, intro: true, ending: false, mid: {} });
export const STORY_2 = Object.freeze({
  mission: state => STORY2_MISSIONS[state.step - 1],
  scriptUrl: (kind, state) => new URL(`../../assets/story/story2_${kind === 'intro' ? (state.step === 1 ? 'intro' : 'tower') : kind === 'win' ? (state.step === 1 ? 'make' : 'after') : kind}.json`, import.meta.url).href,
});
export function nextStory2(state) {
  if (state.step !== 1) return false;
  state.step = 2; state.intro = true; state.ending = false; state.mid = {}; return true;
}
export function story2Rewards(step) {
  return step === 1 ? { ponco02: 1, ponco02Blueprint: true } : { ponco02: 1, suitParts: 3, ch2Done: true, wolfCompanion: false };
}
export function saveStory2Reward(step, store) {
  const reward = story2Rewards(step);
  try { store.setItem('bot-commander.story2.proto', JSON.stringify(reward)); } catch { /* 保存できなくても先へ */ }
  return reward;
}
export function story2Hud(sim) {
  const S = sim.story2, sv = S.survey;
  if (!sv) return { text: `2-1 資材をとどける ${Math.floor(sim.mission.delivered)}／60`, frac: sim.mission.delivered / 60, warn: false };
  return { text: `2-2 塔のあとをしらべる ${Math.floor((1 - sv.amount / sv.max) * 100)}%${sv.blocked ? '（敵が近い）' : '（少年がおりて とまる）'}`, frac: 1 - sv.amount / sv.max, warn: sv.blocked };
}
export function story2ResultText(sim) {
  const win = sim.result === 'win';
  return { title: win ? (sim.story2.step === 1 ? 'ポンコ02が できた！' : '2章 町はずれの声 クリア') : '作戦失敗',
    why: win ? (sim.story2.step === 1 ? '資材60をとどけた。PONCO02が なかまになった。' : 'スーツのぶひん 3つと、川のむこうの 手がかりを 見つけた。ロウは 走り去った。') : ({ nejiDown: 'ネジが壊された…', robotsDown: 'ロボが みんな 壊された…', boyDown: '少年が倒れた…', boyCaptured: '少年が巣へ連れていかれた…' }[sim.resultReason] || 'もう一度、森のかげから 進もう。') };
}
