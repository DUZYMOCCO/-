// v7.0.25: 勇者誕生の短い演出（約3秒・タップでスキップ）。画面中央に星が降り、「勇者が啓示を受けた」と勇者の名前を出す。
// 軽さ優先：DOMとCSSアニメーションだけ（キャンバス・音・画像なし）。ゲームは止めず、3秒後かタップで消える。
export const REVELATION_SCENE_MS=3000;
const STAR_COUNT=14;
export function showHeroRevelationScene(game,name,options={}) {
  const doc=options.document||globalThis.document;
  if(!doc||typeof doc.createElement!=='function'||!game?.container||typeof game.container.append!=='function')return null;
  game._heroRevelationScene?.close();
  const host=doc.createElement('div');host.className='hero-revelation';host.setAttribute('role','status');host.setAttribute('aria-live','polite');
  for(let i=0;i<STAR_COUNT;i++){
    const star=doc.createElement('span');star.className='hero-star';star.setAttribute('aria-hidden','true');
    star.style.setProperty('--x',`${(i*37+11)%92+4}%`);star.style.setProperty('--y',`${(i*23)%78+4}%`);
    star.style.setProperty('--delay',`${((i%7)*0.17).toFixed(2)}s`);star.style.setProperty('--dur',`${(1.4+(i%4)*0.25).toFixed(2)}s`);star.style.setProperty('--size',`${8+(i*5)%13}px`);
    host.append(star);
  }
  const text=doc.createElement('div');text.className='hero-revelation-text';
  const kicker=doc.createElement('p');kicker.className='rev-kicker';kicker.textContent='天啓';
  const title=doc.createElement('h2');title.textContent='勇者が啓示を受けた';
  const who=doc.createElement('p');who.className='rev-name';who.textContent=String(name||'');
  const skip=doc.createElement('p');skip.className='rev-skip';skip.textContent='タップでスキップ';
  text.append(kicker,title,who,skip);host.append(text);
  let fade=null,end=null,closed=false;
  const scene={host,close(){
    if(closed)return;closed=true;clearTimeout(fade);clearTimeout(end);host.remove();
    if(game._heroRevelationScene===scene)game._heroRevelationScene=null;
  }};
  // click (not pointerdown) so the tap that skips the scene cannot fall through to the game underneath.
  host.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();scene.close();});
  fade=setTimeout(()=>host.classList.add('closing'),Math.max(0,(options.ms||REVELATION_SCENE_MS)-300));
  end=setTimeout(()=>scene.close(),options.ms||REVELATION_SCENE_MS);
  game._heroRevelationScene=scene;game.container.append(host);
  return scene;
}
