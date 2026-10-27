import { Container, Sprite, Texture } from '../../vendor/pixi-8.22.0.min.mjs?v=7';
import { tileCenter } from '../sim/map.js?v=6';
import { missilePos } from './strike-view.js?v=3';
import { POWERSUIT } from '../sim/powersuit.js?v=1';

// launcher_fire: 384px画像内のミサイル中心を (190, 75)、足元を (192, 338) とする。
export function launchFlightPose(from, target, elapsed, path, ang) {
  const face = target.x < from.x ? -1 : 1, blend = Math.max(0, Math.min(1, (elapsed - .4) / .4));
  const t = blend * blend * (3 - 2 * blend), x0 = from.x + face * (190 - 192) * 54 / 384, y0 = from.y + (75 - 338) * 54 / 384;
  const start = face > 0 ? -0.98 : -Math.PI + 0.98, delta = Math.atan2(Math.sin(ang - start), Math.cos(ang - start));
  return { x: x0 + (path.x - x0) * t, y: y0 + (path.y - y0) * t, ang: start + delta * t + .18 };
}
export function createGfx6(world, sim, views) {
  const root = new Container(); root.sortableChildren = true; world.addChild(root);
  const textures = {}, sprites = new Map(); let dead = false, coreAt = null;
  function load(key, path) {
    const im = new Image(); im.src = new URL('../../assets/' + path + '.webp', import.meta.url).href;
    im.decode().then(() => { if (!dead) { const t = Texture.from(im, true); t.source.scaleMode = 'linear'; textures[key] = t; } }).catch(() => {});
  }
  if (sim.strike || sim.launcher) for (const n of ['launcher','launcher_build','launcher_tow','launcher_armed','launcher_fire','missile_flight','missile_impact_0','missile_impact_1','missile_impact_2','missile_impact_3','missile_scorch','missile_buried','missile_dug']) load(n,'launcher/'+n);
  if (sim.strike) load('blueprint','landmarks/icons/pickup-blueprint-ponco02');
  if (sim.powersuit) for (const n of ['suit_idle','suit_walk_0','suit_walk_1','suit_shoot','suit_break','suit-debris']) load(n,'suit/'+n);
  if (sim.ne) for (const n of ['G12_dig_0','G12_dig_1','G12_emerge_0','G12_emerge_1','G12_mound']) load(n,'enemies/'+n);
  if (sim.story2) for (const n of ['radio-tower-remains_v1','radio-tower-remains_v1_damaged','core','pickup-core']) load(n,n.startsWith('radio')?'landmarks/'+n:'landmarks/icons/'+n);
  let used = new Set();
  function put(id,key,x,y,width,ax=.5,ay=.5,alpha=1,rotation=0,flip=1) {
    const t=textures[key]; if (!t) return false;
    used.add(id); let s=sprites.get(id); if(!s){s=new Sprite(t); root.addChild(s); sprites.set(id,s);}
    s.texture=t; s.anchor.set(ax,ay); s.position.set(x,y); s.scale.set(flip*width/t.orig.width,width/t.orig.width); s.alpha=alpha; s.rotation=rotation; s.zIndex=y; s.visible=true; return true;
  }
  function sync(now) {
    used=new Set(); const S=sim.strike;
    if(S){
      const p=sim.mission?.salvage?.[S.pile]; if(p && sim.fog.isSeen(p.tx,p.ty)) put('buried',S.phase==='buried'?'missile_buried':'missile_dug',tileCenter(p.tx),tileCenter(p.ty),60,.5,450/512);
      const sv=S.survey; if(sv && !sv.done && sim.fog.isSeen(sv.tx,sv.ty)) put('blueprint','blueprint',tileCenter(sv.tx),tileCenter(sv.ty)-20,22);
      const u=sim.units.find(u=>u.id===S.launcherId),v=u && views.get(u.id),fire=S.firedAt!=null && sim.time-S.firedAt<.4;
      if(u && v){const k=fire?'launcher_fire':S.phase==='arming'?'launcher_armed':S.towBy!=null?'launcher_tow':'launcher'; v.body.visible=!put('story-launcher',k,u.x,u.y,54,.5,676/768,1,0,u.facing||1);}
      if (S.firedAt != null && S.from && sim.time-S.firedAt >= 0 && sim.time-S.firedAt < .4) put('story-launch-fire','launcher_fire',S.from.x,S.from.y,54,.5,676/768,1,0,S.target?.x < S.from.x ? -1 : 1);
      if(S.phase==='flying' && S.from && S.target && !(S.firedAt!=null && sim.time-S.firedAt<.4 && textures['launcher_fire'])){const p=missilePos(S,Math.min(1,S.flightT/3)), age=S.firedAt==null?S.flightT:sim.time-S.firedAt, q=textures['launcher_fire']?launchFlightPose(S.from,S.target,age,p,p.ang):{...p,ang:p.ang+.18}; put('story-flight','missile_flight',q.x,q.y,36,165/256,120/256,1,q.ang);}
      if(S.impactAt!=null && S.target){const age=sim.time-S.impactAt; if(age>=0 && age<25)put('story-scorch','missile_scorch',S.target.x,S.target.y,120,.5,.56,1-age/25); if(age>=0 && age<.5)put('story-impact','missile_impact_'+Math.min(3,Math.floor(age/.125)),S.target.x,S.target.y,80);}
    }
    if(sim.story2){
      const sv=sim.story2.survey; if(sv && sim.fog.isSeen(sv.tx,sv.ty))put('tower',sv.amount<=sv.max/2?'radio-tower-remains_v1_damaged':'radio-tower-remains_v1',tileCenter(sv.tx),tileCenter(sv.ty),88,.5,.93);
      const p=sim.mission?.salvage?.[sim.story2.corePile]; if(p && sim.story2.coreSeen && sim.fog.isSeen(p.tx,p.ty)){if(coreAt==null)coreAt=sim.time; put('core-pick','pickup-core',tileCenter(p.tx)+14,tileCenter(p.ty)-10,22); if(sim.time-coreAt<2)put('core','core',tileCenter(p.tx),tileCenter(p.ty)-35-(sim.time-coreAt)*8,45,.5,.5,1-(sim.time-coreAt)/2);}
    }
    for(const u of sim.units){
      const v=views.get(u.id); if(!v || !v.c.visible)continue;
      if(sim.powersuit && u.human){
        const suit=sim.powersuit.suit,mine=suit?.ownerId===u.id && !suit.lost;
        const broken=sim.fx.find(f=>f.type==='suitBreak' && f.id===u.id && sim.time-f.t>=0 && sim.time-f.t<.6);
        const shot=sim.fx.some(f=>f.type==='shot' && f.side===u.side && f.kind===u.kind && Math.hypot(f.x1-u.x,f.y1-(u.y-10))<12 && sim.time-f.t<.18);
        const transition=mine && (suit.phase==='donning' || suit.phase==='doffing');
        const active=mine && suit.phase==='on' && !u.ride;
        let step=v.gfx6Step;
        if(active && !step) step=v.gfx6Step={x:u.x,y:u.y,distance:0,walking:false};
        if(step){
          if(active && u.moving){
            if(!step.walking) step.distance=0;
            else step.distance+=Math.hypot(u.x-step.x,u.y-step.y);
            step.walking=true;
          }else step.walking=false;
          step.x=u.x; step.y=u.y;
        }
        const walking=active && u.moving, phase=walking?step.distance/8:0;
        const k=broken?'suit_break':shot?'suit_shoot':walking?'suit_walk_'+(Math.floor(phase)%2):'suit_idle';
        const animated=active && !broken && !shot;
        const face=u.facing||1, bob=animated?(walking?Math.abs(Math.sin(phase*Math.PI))*2.2:Math.sin(now*Math.PI)*.6):0;
        const tilt=animated && walking?Math.cos(phase*Math.PI)*.04*face:0;
        const offset=animated && walking?-(12*47/384)*face:0;
        const a=transition ? Math.max(0,Math.min(1,suit.phase==='donning'?suit.t/POWERSUIT.donSec:1-suit.t/POWERSUIT.doffSec)) : 1;
        const shown=!u.ride && (broken || (mine && (suit.phase==='on' || transition))) && put('suit-'+u.id,transition&&!broken?'suit_idle':k,u.x+offset,u.y-bob,47*(transition&&!broken?.85+.15*a:1),.5,962/1024,transition&&!broken?a:1,tilt,face);
        if(shown){v.body.visible=!!(transition&&!broken); if(transition&&!broken){v.body.alpha=1-a;v.gfx6SuitFade=true;}else if(v.gfx6SuitFade){v.body.alpha=1;v.gfx6SuitFade=false;} if(v.suitG)v.suitG.visible=false;}
        else {v.body.visible=true;if(v.gfx6SuitFade){v.body.alpha=1;v.gfx6SuitFade=false;}}
        if(mine && suit.broken && suit.phase==='off' && put('debris-'+u.id,'suit-debris',u.x+10,u.y,15,.5,.94)){if(v.suitD)v.suitD.visible=false;}else if(v.suitD)v.suitD.visible=true;
      }
      if(u.kind==='G12' && u.neBur){const under=u.neBur==='under',t=u.neBurT||0,k=under?'G12_mound':(t<.4?'G12_emerge_'+Math.min(1,Math.floor(t/.2)):t>=9.6?'G12_dig_'+Math.min(1,Math.floor((t-9.6)/.2)):null); if(k && put('g12-'+u.id,k,u.x,u.y,60,.5,k==='G12_mound'?.6:759/768,1,0,u.facing||1)){v.body.visible=false;if(v.mound)v.mound.visible=false;}else v.body.visible=true;}
    }
    for(const [id,s] of sprites)if(!used.has(id))s.visible=false;
  }
  function destroy(){dead=true;try { if (!root.destroyed) root.destroy({children:true}); } catch {} for(const t of Object.values(textures)) { try { t.destroy(true); } catch {} }}
  return {sync,destroy,put,has(key){return !!textures[key];},begin(){used=new Set();},end(){for(const [id,s] of sprites)if(!used.has(id))s.visible=false;}};
}
