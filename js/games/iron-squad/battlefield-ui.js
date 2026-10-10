/** Preserve live controls and update IDs while moving information into the menu. */
export function configureBattlefieldUI(game) {
 const root=game.container,get=id=>root.querySelector(`#${id}`),field=get('canvas-container'),overview=get('view-strat-overview');
 const menu=document.createElement('section');menu.id='battlefield-menu';menu.className='battlefield-menu';
 const heading=document.createElement('h4');heading.textContent='戦場の情報';menu.append(heading);
 const status=root.querySelector('.game-stats');status.classList.add('battle-menu-status');for(const n of status.querySelectorAll('.hud-admin'))n.classList.remove('hud-admin');menu.append(status);
 const alerts=root.querySelector('.field-alerts');menu.append(alerts);
 const surrounding=document.createElement('section');surrounding.className='battle-menu-nearby';surrounding.id='battle-menu-nearby';
 const nearbyTitle=document.createElement('h4');nearbyTitle.textContent='周辺の施設・仲間';const hint=document.createElement('p');hint.textContent='商人・施設への入場・仲間への声かけは、そばに来ると戦場の操作の上に出ます。';
 const fieldHost=root.querySelector('.field-interactions');
 const merchantBanner=get('merchant-prompt-banner'),pad=get('virtual-gamepad');
 if(merchantBanner&&pad)pad.prepend(merchantBanner);
 // 施設・集落・ダンジョンへの「入る」も、メニュー内だと気づけないので戦場に出す
 const enterBanner=get('dungeon-prompt-banner');
 if(enterBanner&&pad)pad.prepend(enterBanner);
 // 次ラウンドまでの待機中は戦場が止まるため、カウントダウンはメニュー内ではなく戦場に出す（出さないと固まったように見える）
 const restBanner=get('phase-complete-banner');
 if(restBanner&&pad)pad.prepend(restBanner);
 surrounding.append(nearbyTitle,hint,fieldHost);menu.append(surrounding);
 const current=document.createElement('details');current.className='command-fold';const currentTitle=document.createElement('summary');currentTitle.textContent='現在地・軍令・補給';const info=document.createElement('div');info.className='fold-content battle-menu-info';
 info.append(root.querySelector('.field-status'));
 for(const id of ['quest-banner','base-heal-badge','transport-badge']){const n=get(id);if(n)info.append(n);}
 // Badge IDs added by the shared supply system retain their existing updates.
 for(const n of field.querySelectorAll('.ammo-status-badge,.mana-status-badge,.transport-badge'))info.append(n);
 current.append(currentTitle,info);menu.append(current);
 const tools=document.createElement('div');tools.className='battle-menu-tools';
 for(const id of ['btn-pad-command','btn-world-map','btn-zoom-toggle','btn-field-sound','btn-back']){const n=get(id);if(n)tools.append(n);}
 const back=tools.querySelector('#btn-back');back.textContent='工房へ戻る';back.setAttribute('aria-label','工房へ戻る');menu.append(tools);
 const legend=document.createElement('p');legend.className='navigation-legend';legend.textContent='透過地図：城＝本陣、家＝町・村、十字＝診療所、門＝ダンジョン、檻＝捕虜。淡い筋は崖と壁で、そこは進めません。未探索は出ません。';menu.append(legend);overview.prepend(menu);
 const button=get('btn-strategy');button.innerHTML='<span aria-hidden="true">☰</span><small>メニュー</small><b class="menu-join-count hidden"></b><b class="menu-attention hidden"></b>';button.setAttribute('aria-label','メニューを開く');field.append(button);
 const attention=button.querySelector('.menu-attention');
 const refreshAttention=()=>{
  const waiting=[...menu.querySelectorAll('.phase-banner, #hazard-warning')].filter(node=>!node.classList.contains('hidden')).length;
  attention.classList.toggle('hidden',waiting===0);
  const joins=button.querySelector('.menu-join-count');
  const joinCount=joins&&!joins.classList.contains('hidden')?joins.textContent:'';
  button.setAttribute('aria-label',waiting||joinCount?`メニューを開く（通知${joinCount?`、加入${joinCount}件`:''}${waiting?`、連絡${waiting}件`:''}）`:'メニューを開く');
 };
 const Observer=root.ownerDocument?.defaultView?.MutationObserver;
 if(Observer){const watch=new Observer(refreshAttention);watch.observe(menu,{subtree:true,attributes:true,attributeFilter:['class']});}
 refreshAttention();
 const map=root.querySelector('.minimap-container');map.setAttribute('aria-hidden','true');map.classList.add('navigation-overlay');
 const vitals=document.createElement('div');vitals.id='quiet-vitals';vitals.className='quiet-vitals';
 vitals.innerHTML='<span class="qv-hp">HP 0/0</span><span class="qv-mp">MP —</span><span class="qv-gold">0G</span><span class="qv-stats">攻撃力 0  防御力 0</span>';
 field.append(vitals);
 // Only the main menu button receives pointer events; the navigation overlay is passive.
 menu.addEventListener('click',event=>{if(event.target.closest('#btn-world-map,#btn-enter-dungeon,#dungeon-prompt-banner,#btn-raid-warp'))game.closeStrategyModal?.();},true);
 // Reuse the event handler and all movement/attack controls. The header now has no field controls.
 root.querySelector('.iron-squad').classList.add('quiet-battlefield');
}

/** Soldier and commander nameplates stay off the field. Damage, speech, and place labels keep drawing.
 * The drawers read ctx.showBattleLabels; it is a plain flag on the real context (no Proxy), so canvas
 * methods are always looked up live and the kana-mode prototype patch takes effect immediately. */
export function quietBattlefieldContext(ctx) {
 if(ctx&&ctx.showBattleLabels!==false)ctx.showBattleLabels=false;
 return ctx;
}
