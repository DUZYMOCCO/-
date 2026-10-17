import {atFacility} from './hq-facilities.js?v=295';
import {guildView} from './guild-contracts.js?v=295';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KINDS=Object.freeze([['all','すべて'],['band','距離帯'],['species','魔物別'],['boss','ボス・強敵']]);
const G=n=>`${Math.max(0,n||0).toLocaleString()}G`;
function status(q) {
  if(q.state==='ready')return `${q.progress} / ${q.target} · 報告できます`;
  if(q.claimed)return q.unique?'達成済み':'今期は報告済み · 次の期に再受付';
  if(q.unavailable)return '魔王は討伐済み';
  return `${q.progress} / ${q.target}`;
}
// The guild board has no accept step: a fixed header (levels, gold, total, batch report, filters) over one inner-scrolling list of standing jobs.
export const guildUiMethods={
  renderGuild(panel) {
    const v=guildView(this),open=atFacility(this,'guild',0),expanded=this.guildExpanded||(this.guildExpanded=new Set());
    const chip=(attr,key,label,on)=>`<button type="button" class="guild-chip" ${attr}="${key}" aria-pressed="${on}">${label}</button>`;
    const row=q=>{
      const pct=Math.round(q.ratio*100),isOpen=expanded.has(q.id);
      return `<article class="guild-row guild-${q.state}${q.claimed||q.unavailable?' guild-dim':''}" data-guild-row="${q.id}" role="listitem"><button type="button" class="guild-row-main" id="guild-toggle-${q.id}" data-guild-toggle="${q.id}" aria-expanded="${isOpen}"><span class="guild-row-title"><strong>${esc(q.title)}</strong><b>${G(q.reward)}</b></span><span class="guild-row-bar"><span class="guild-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${q.target}" aria-valuenow="${q.progress}"><i style="width:${pct}%"></i></span><em>${status(q)}</em></span></button>${q.ready?`<button type="button" class="guild-claim" id="guild-claim-${q.id}" data-guild-claim="${q.id}" ${open?'':'disabled'}>報告</button>`:''}${isOpen?`<p class="guild-hint">${esc(q.hint)}</p>`:''}</article>`;
    };
    const lockedNote=v.locked.length?`<p class="guild-locked">発展Lv${v.nextUnlock}で解放（あと${v.locked.length}件）</p>`:'';
    panel.insertAdjacentHTML('beforeend',`<section class="guild-board"><div class="guild-head"><p class="guild-stats"><span>発展Lv${v.level}</span><span>主人公Lv${v.heroLevel}</span><span>所持金 ${G(v.gold)}</span><span>累計達成 ${v.totalCompleted.toLocaleString()}件</span></p>${v.readyCount?`<button type="button" class="guild-claim-all" id="guild-claim-all" data-guild-claim-all ${open?'':'disabled'}>まとめて報告 ${v.readyCount}件 +${G(v.readyReward)}</button>`:''}<nav class="guild-filters" aria-label="依頼の種類">${KINDS.map(([key,label])=>chip('data-guild-filter',key,label,v.filter===key)).join('')}</nav>${v.zones.length?`<nav class="guild-zones" aria-label="条件">${chip('data-guild-zone','all','すべて',v.zone==='all')}${v.zones.map(([key,label])=>chip('data-guild-zone',key,label,v.zone===key)).join('')}</nav>`:''}</div><div class="guild-list" role="list">${v.rows.map(row).join('')||'<p class="guild-empty">この条件の依頼はありません。</p>'}${lockedNote}<p class="guild-note">依頼は常設です。受ける操作は要りません。倒した数は自動で数えられ、目標に届いたら報告します。報告すると数え直しになり、同じ依頼は次の期にまた報告できます。報酬は発展Lvと主人公Lvで増えます。</p></div></section>`);
    const refresh=reset=>{if(reset)this.guildScrollReset=true;this.refreshHeadquartersFacility();};
    for(const b of panel.querySelectorAll('[data-guild-claim]'))b.onclick=()=>this.claimGuildContract(b.dataset.guildClaim);
    for(const b of panel.querySelectorAll('[data-guild-claim-all]'))b.onclick=()=>this.claimAllGuildContracts();
    for(const b of panel.querySelectorAll('[data-guild-toggle]'))b.onclick=()=>{const id=b.dataset.guildToggle;if(expanded.has(id))expanded.delete(id);else expanded.add(id);refresh(false);};
    for(const b of panel.querySelectorAll('[data-guild-filter]'))b.onclick=()=>{this.guildFilter=b.dataset.guildFilter;this.guildZone='all';refresh(true);};
    for(const b of panel.querySelectorAll('[data-guild-zone]'))b.onclick=()=>{this.guildZone=b.dataset.guildZone;refresh(true);};
  }
};