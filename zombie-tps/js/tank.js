import * as THREE from '../vendor/three.module.min.js';
import { TANK, SUIT, powerupAppears, pickSuitSpot, groundHeight, collideCircle, edgeArrow, castShot, tankRamHit, tickGrace, punchLaunch } from './rules.js?v=37';

const A=new THREE.Vector3(), B=new THREE.Vector3(), C=new THREE.Vector3();
function makeTank(glowTex) {
  const root=new THREE.Group(), hull=new THREE.Group(), turret=new THREE.Group(), barrel=new THREE.Group(); root.add(hull); hull.add(turret); turret.add(barrel);
  const geo=new THREE.BoxGeometry(1,1,1);
  const mat={ body:new THREE.MeshLambertMaterial({color:0x657449}), dark:new THREE.MeshLambertMaterial({color:0x29312a}), detail:new THREE.MeshLambertMaterial({color:0x98a16a}), light:new THREE.MeshBasicMaterial({color:0xffe0a0}) };
  const box=(parent,m,x,y,z,w,h,d)=>{const o=new THREE.Mesh(geo,mat[m]);o.position.set(x,y,z);o.scale.set(w,h,d);parent.add(o);return o;};
  box(hull,'body',0,0.55,0,2.7,0.9,3.5); box(hull,'body',0,1.08,0.35,2.35,0.25,2.6);
  for(const x of [-1.42,1.42]) {box(hull,'dark',x,0.42,0,0.48,0.75,3.7);for(const z of [-1.2,-0.4,0.4,1.2]) box(hull,'detail',x*1.01,0.4,z,0.49,0.38,0.38);}
  for(const x of [-0.8,0.8]) box(hull,'light',x,0.9,-1.77,0.34,0.17,0.07);
  turret.position.set(0,1.1,0.15); box(turret,'body',0,0.35,0,1.8,0.65,1.9); box(turret,'detail',0,0.72,0.1,1.25,0.15,1.15);
  barrel.position.set(0,0.38,-0.7); box(barrel,'dark',0,0,-1.05,0.25,0.25,2.2); box(barrel,'dark',0.53,0.16,-0.85,0.12,0.13,1.5);
  const cannonMuzzle=new THREE.Object3D(); cannonMuzzle.position.set(0,0,-2.2);barrel.add(cannonMuzzle);
  const mgMuzzle=new THREE.Object3D();mgMuzzle.position.set(0.53,0.16,-1.65);barrel.add(mgMuzzle);
  const marker=new THREE.Group();root.add(marker);
  const ring=new THREE.Mesh(new THREE.RingGeometry(2,2.3,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xaada6a,transparent:true,opacity:0.7,depthWrite:false,blending:THREE.AdditiveBlending}));ring.position.y=0.05;marker.add(ring);
  const beam=new THREE.Mesh(new THREE.BoxGeometry(0.2,5,0.2),new THREE.MeshBasicMaterial({color:0xbce877,transparent:true,opacity:0.23,depthWrite:false,blending:THREE.AdditiveBlending}));beam.position.y=2.5;marker.add(beam);
  if(glowTex){const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xbce877,transparent:true,opacity:0.8,depthWrite:false}));glow.position.y=2.4;glow.scale.set(1.4,1.4,1);marker.add(glow);}
  root.visible=false;return {root,hull,turret,barrel,marker,ring,beam,cannonMuzzle,mgMuzzle};
}
export const TankMixin={
  initTank(){this.tankM=makeTank(this.fxTex?.glow);this.scene.add(this.tankM.root);this.endTank();},
  endTank(){this.tank=null;this.tankPick=null;this.tankNext=1;this.tankGraceT=0;if(this.tankM)this.tankM.root.visible=false;this.hud.tank?.(null);},
  trySpawnTank(roll=Math.random()) {
    if(this.map.ride||this.map.specialStage||this.tank||this.tankPick)return false;
    if(!powerupAppears(roll)||!this.placeTank()){this.tankNext=Math.max(0,this.wave)+TANK.every;return false;}
    return true;
  },
  placeTank(){
    if(this.map.ride||this.map.specialStage)return null;
    const s=this.gk&&this.map.gk?this.gkSpotFrom():this.map.playerStart,sy=s.y||0;
    this.nav.update(s.x,sy,s.z);let cells=this.nav.openCells(this.half-3);
    cells=cells.filter(c=>Math.abs((c[2]||0)-sy)<0.5);
    if(this.gk&&this.map.gk)cells=this.gkSpotFilter(cells);
    cells=cells.filter(([x,z,y])=>{const c=collideCircle(x,z,TANK.radius,(y||0)+0.05,this.pCol);return Math.hypot(c.x-x,c.z-z)<0.02;});
    const others=[this.robot,this.army,this.suitPick].filter(Boolean), separated=cells.filter(c=>others.every(o=>Math.hypot(c[0]-o.x,c[1]-o.z)>5));
    if(separated.length)cells=separated;if(!cells.length)return null;
    const [x,z,cy]=pickSuitSpot(cells,s.x,s.z,Math.random(),this.robot), y=groundHeight(x,z,TANK.radius,(cy||0)+0.6,this.pCol);
    const yaw=Math.atan2(-(s.x-x),-(s.z-z));this.tankPick={x,y,z,yaw,t:0};
    const m=this.tankM;m.root.visible=true;m.marker.visible=true;m.root.position.set(x,y,z);m.hull.rotation.y=yaw;m.turret.rotation.y=0;m.barrel.rotation.x=0;
    if(this.state==='play')this.nav.update(this.pos.x,this.pFloor??this.pos.y,this.pos.z);
    return this.tankPick;
  },
  enterTank(){
    const p=this.tankPick;if(!p||this.suit)return;
    this.tank={t:TANK.time,armor:TANK.armor,weapon:'mg',cd:0,hullYaw:p.yaw};this.tankPick=null;this.tankWave=Math.max(1,this.wave);this.tankM.marker.visible=false;
    this.resetMelee();this.burnT=0;this.zapT=0;this.pk.set(0,0,0);
    this.fx.burst(A.set(p.x,p.y+1,p.z),20,{color:0xaada6a,color2:0xffffff,speed:2,up:2,size:0.1,life:0.6,gravity:2});
    this.hud.banner('せんしゃに のった！','いどうで ひける！ 1・2で ぶき きりかえ');this.sfx.robotOn?.();this.pushHud(true);
  },
  exitTank(){
    if(!this.tank)return;this.tank=null;this.tankGraceT=TANK.grace;this.tankNext=(this.tankWave||this.wave)+TANK.every;
    this.tankM.root.visible=false;this.fx.poof(A.set(this.pos.x,this.pos.y+1,this.pos.z),1.5);
    this.hud.banner('せんしゃの じかん おわり！','また しばらくすると あらわれるよ');this.pushHud(true);
  },
  tankBlocksDamage(d){
    if(this.tank){this.tank.armor=Math.max(0,this.tank.armor-d*TANK.armorMul);if(this.tank.armor<=0)this.exitTank();return true;}
    return this.tankGraceT>0;
  },
  tankEvent(ev){
    if(!this.tank)return false;
    if(ev==='jump'||ev==='reload')return true;
    let k=null;if(ev.startsWith('ws:'))k=['mg','cannon'][+ev.slice(3)];
    else if(ev==='w:tankmg')k='mg';else if(ev==='w:tankcannon')k='cannon';
    else if(ev==='next'||ev==='prev'||ev==='swap')k=this.tank.weapon==='mg'?'cannon':'mg';
    if(k&&k!==this.tank.weapon){this.tank.weapon=k;this.tank.cd=Math.max(0,this.tank.cd||0.12);this.sfx.swap();this.pushHud(true);return true;}
    return !!k||ev.startsWith('ws:')||ev.startsWith('w:');
  },
  updateTankFire(held){
    const t=this.tank;if(!t||!held||t.cd>0)return;const W=TANK.weapons[t.weapon];t.cd=W.interval;
    if(t.weapon==='cannon'){this.suitCannon(W,this.tankM.cannonMuzzle);return;}
    const {o,d}=this.suitAimRay(),dir=this.suitAssist(o,d,W.range),hit=castShot(o.x,o.y,o.z,dir.x,dir.y,dir.z,this.zombies,this.sCol,W.range);
    const muzzle=this.tankM.mgMuzzle.getWorldPosition(A),hp=new THREE.Vector3(hit.x,hit.y,hit.z);this.fx.tracer(muzzle,hp);this.fx.muzzle(this.tankM.mgMuzzle,1.1);this.sfx.shot('minigun');
    if(hit.kind==='zombie'){const z=this.zombies[hit.index];this.fx.greenHit(hp,dir,hit.head);this.fx.bulletImpact(hp,hit.head);this.sfx.bulletHit(hit.head);this.hitZombie(z,W.dmg*(hit.head?1.6:1),hit.head,hp,dir,{knock:0.8});this.hud.hitmarker(hit.head);}
    else if(hit.kind==='wall'){this.sfx.bulletSurface();const box=this.sCol[hit.index];if(box?.veh!=null)this.hitVehicle(box.veh,W.dmg,hp);}
    else if(hit.kind==='ground')this.sfx.bulletSurface();
  },
  tankRam(x0,z0,dt){
    if(!this.tank||dt<=0)return;const dx=this.pos.x-x0,dz=this.pos.z-z0,dist=Math.hypot(dx,dz);if(dist/dt<0.8)return;
    const ux=dx/dist,uz=dz/dist;
    for(const z of this.zombies){
      if(!z.alive||z.demo||z.fly||Math.abs(z.y-this.pos.y)>1.6||(z.tankHitT||0)>0||!tankRamHit(x0,z0,this.pos.x,this.pos.z,z.x,z.z,TANK.ramRadius+0.3*z.scale))continue;
      z.tankHitT=TANK.ramCooldown;const hit=A.set(z.x,z.y+0.8,z.z),dir=B.set(ux,0.2,uz);const dmg=z.kind==='boss'?TANK.ramBossDamage:TANK.ramDamage;
      const at={x:z.x,y:z.y,z:z.z}, velocity=z.kind==='boss'?null:punchLaunch(ux,uz,Math.random());
      this.hitZombie(z,dmg,false,hit,dir,{knock:2,dropAt:at,...(velocity?{punch:velocity}: {})});
      if(z.alive && velocity && this.punchFly(z,velocity)) {
        z.fly.tankLive=true; z.ramDropAt=at; z.climb=null; z.slam=null; z.charge=null; z.leap=null;
      } else if(z.alive && !z.fly) { z.kvx+=ux*7;z.kvz+=uz*7;z.stagger=Math.max(z.stagger,0.5); }

      this.fx.burst(hit,6,{color:0xc4d99a,color2:0xffffff,speed:2,up:1,size:0.08,life:0.3,gravity:4});this.sfx.hit?.();
    }
  },
  updateTankLiveFly(z,dt) {
    const f=z.fly, m=z.model; f.t+=dt; f.vy-=SUIT.flyG*dt;
    z.x+=f.vx*dt; z.y+=f.vy*dt; z.z+=f.vz*dt;
    m.inner.rotation.x+=f.sx*1.6*dt; m.inner.rotation.z+=f.sz*dt; z.yaw+=f.sy*dt;
    const fl=Math.sin(f.t*22)*0.9; m.legs[0].rotation.x=fl; m.legs[1].rotation.x=-fl;
    m.arms[0].rotation.x=-1.6+fl*0.6; m.arms[1].rotation.x=-1.6-fl*0.6;
    m.root.position.set(z.x,z.y,z.z); m.root.rotation.y=z.yaw;
    if(f.t<SUIT.flyTime)return;
    const margin=this.half-1; let x=Math.max(-margin,Math.min(margin,z.x)), zz=Math.max(-margin,Math.min(margin,z.z));
    // Keep a surviving enemy reachable, including in multi-floor and streamed maps.
    let cells=this.nav.openCells(this.half-2);
    if(this.gk&&this.map.gk)cells=this.gkSpotFilter(cells);
    if(cells.length){let best=cells[0],bd=Infinity;for(const c of cells){const d=(c[0]-x)**2+(c[1]-zz)**2+((c[2]||0)-(z.ramDropAt?.y||0))**2;if(d<bd){bd=d;best=c;}}x=best[0];zz=best[1];z.y=(best[2]||0)+Math.min(5,Math.max(0,z.y-(best[2]||0)));}
    else { const c=collideCircle(x,zz,0.3,0,this.zCol); x=c.x;zz=c.z;z.y=Math.min(5,Math.max(0,z.y)); }
    z.x=x;z.z=zz;z.vy=-1;z.kvx=z.kvz=0;z.fly=null;z.flown=false;z.ramDropAt=null;z.stuck=0;z.thinkT=0;
    m.inner.rotation.set(0,0,0);m.inner.position.set(0,0,0);m.root.position.set(z.x,z.y,z.z);
  },
  updateTank(dt){
    const frozen=this.interT>0;this.tankGraceT=tickGrace(this.tankGraceT,dt,frozen);
    for(const z of this.zombies)if(z.tankHitT>0)z.tankHitT=Math.max(0,z.tankHitT-dt);
    if(!this.map.ride&&!this.map.specialStage&&!this.tank&&!this.tankPick&&this.state==='play'&&this.wave>=this.tankNext&&this.wave>0){if(this.trySpawnTank())this.hud.kill('せんしゃが どこかに あらわれた！',true);}
    const m=this.tankM;
    if(this.tankPick){const p=this.tankPick;p.t+=dt;const k=0.5+0.5*Math.sin(p.t*4);m.ring.material.opacity=0.45+k*0.3;
      if(this.state==='play'&&!this.suit&&Math.hypot(this.pos.x-p.x,this.pos.z-p.z)<TANK.touchR&&Math.abs(this.pos.y-p.y)<1.6)this.enterTank();}
    if(this.tank){const t=this.tank;if(!frozen)t.t=Math.max(0,t.t-dt);t.cd=Math.max(0,t.cd-dt);
      if(t.t<=0){this.exitTank();return;}
      if(Math.hypot(this.vel.x,this.vel.z)>0.5){const want=Math.atan2(-this.vel.x,-this.vel.z);let delta=want-t.hullYaw;while(delta>Math.PI)delta-=2*Math.PI;while(delta< -Math.PI)delta+=2*Math.PI;t.hullYaw+=delta*Math.min(1,dt*5);}
      m.root.visible=true;m.root.position.copy(this.pos);m.hull.rotation.y=t.hullYaw;m.turret.rotation.y=this.yaw-t.hullYaw;m.barrel.rotation.x=this.pitch;
    }
  },
  updateTankHud(){
    if(this.state!=='play'||(!this.tank&&!this.tankPick)){this.hud.tank?.(null);return;}
    if(this.tank){this.hud.tank?.({mode:'ride',time:this.tank.t,frac:this.tank.t/TANK.time,weapon:this.tank.weapon,frozen:this.interT>0});return;}
    const p=this.tankPick,v=C.set(p.x,p.y+2.8,p.z).project(this.camera),e=edgeArrow(v.x,v.y,v.z>1);this.hud.tank?.({mode:'pick',onScreen:e.onScreen,x:e.x,y:e.y,ang:e.ang});
  },
};
