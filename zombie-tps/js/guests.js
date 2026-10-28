// Rare visitors from Gun Kick Heroes. Each is rolled independently once per run.
import * as THREE from '../vendor/three.module.min.js';
import { ROBOT, pickRobotSpot, robotTouched, groundHeight, damageAlly, edgeArrow } from './rules.js?v=27';
import { makeGuestFighter } from './models.js?v=27';

export const GUEST_CHANCE = 0.08;
export const GUESTS = {
  ao: { ...ROBOT, hp: 90, dmgMul: 0.5, dmg: 10, fireRate: 0.52, side: 2.6, back: 1.4, color: 0x6fa8e8, name: 'アオ' },
  momo: { ...ROBOT, hp: 80, dmgMul: 0.5, dmg: 7, fireRate: 0.32, side: -2.6, back: 1.4, color: 0xe88cb4, name: 'モモ' },
};
export function guestAppears(roll) { return roll >= 0 && roll < GUEST_CHANCE; }
const point = new THREE.Vector3(), effect = new THREE.Vector3();

export const GuestMixin = {
  initGuests() { this.guests = { ao: null, momo: null }; this.guestModels = {}; },
  endGuests() {
    for (const id of Object.keys(GUESTS)) {
      this.guests[id] = null;
      if (this.guestModels[id]) this.guestModels[id].root.visible = false;
      this.hud.guest?.(id, null);
    }
  },
  spawnGuests(rolls = [Math.random(), Math.random()]) {
    this.endGuests();
    const s = this.gk && this.map.gk ? this.gkSpotFrom() : this.map.playerStart, sy = s.y || 0;
    this.nav.update(s.x, sy, s.z);
    let cells = this.nav.openCells(this.half - 3);
    const same = cells.filter(c => Math.abs((c[2] || 0) - sy) < 0.5);
    if (same.length) cells = same;
    if (this.gk && this.map.gk) cells = this.gkSpotFilter(cells);
    for (const [index,id] of Object.keys(GUESTS).entries()) {
      if (!guestAppears(rolls[index]) || !cells.length) continue;
      const S = GUESTS[id];
      const others = [this.robot,this.army,...Object.values(this.guests)].filter(Boolean);
      const separated = cells.filter(c => others.every(o => Math.hypot(c[0]-o.x,c[1]-o.z) >= 7));
      const available = separated.length ? separated : cells;
      const [x,z,cy] = pickRobotSpot(available,s.x,s.z,Math.random(),S.spot);
      const y = groundHeight(x,z,0.3,(cy || 0)+0.6,this.pCol);
      const m = this.guestModels[id] || (this.guestModels[id] = makeGuestFighter(id,this.fxTex?.glow));
      if (!m.root.parent) this.scene.add(m.root);
      m.root.visible = true; m.root.scale.setScalar(S.scale); m.inner.position.set(0,0,0); m.inner.rotation.set(0,0,0); m.marker.visible = true;
      const yaw = Math.atan2(-(s.x-x),-(s.z-z));
      const a = this.guests[id] = { id,x,y,z,yaw,vy:0,hp:S.hp,maxHp:S.hp,state:'idle',t:0,fireT:0.6,aimT:0,target:-1,
        stuckT:0,hurtT:0,phase:0,moving:0,onScreen:false,shots:0,kills:0,warpColor:S.color };
      m.root.position.set(x,y,z); m.root.rotation.y = yaw;
    }
  },
  activateGuest(a) {
    if (!a || a.state !== 'idle') return;
    const S=GUESTS[a.id], m=this.guestModels[a.id]; a.state='on'; a.t=0; a.fireT=0.5; m.marker.visible=false;
    this.fx.burst(effect.set(a.x,a.y+1,a.z),20,{color:S.color,color2:0xffffff,speed:2,up:2,size:0.08,life:0.7,gravity:2});
    this.hud.banner(`${S.name}が なかまに なった！`, a.id === 'ao' ? 'ライフルで たすけてくれるよ' : 'サブマシンガンで たすけてくれるよ');
    this.sfx.robotOn?.();
  },
  hurtGuest(a,d) {
    if (!a || a.state !== 'on') return;
    a.hurtT=0.2;
    if (damageAlly(a,d,GUESTS[a.id])) { a.t=0; a.target=-1; this.hud.kill(`${GUESTS[a.id].name}「いったん さがるね！」`,true); }
  },
  updateGuests(dt) {
    for (const id of Object.keys(GUESTS)) {
      const a=this.guests[id]; if (!a) continue;
      const S=GUESTS[id], m=this.guestModels[id]; a.t+=dt; a.hurtT=Math.max(0,a.hurtT-dt); m.inner.position.set(0,0,0);
      if (a.state === 'idle') {
        const pulse=0.5+0.5*Math.sin(a.t*4); m.ring.scale.setScalar(1+pulse*0.2); m.ring.material.opacity=0.45+pulse*0.35;
        if (this.state === 'play' && robotTouched(this.pos.x-a.x,this.pos.z-a.z,this.pos.y-a.y)) this.activateGuest(a);
        m.root.position.set(a.x,a.y,a.z); m.root.rotation.y=a.yaw;
        if (this.cullOn) m.root.visible=this.levelVisible(a.x,a.y,a.z);
      } else if (a.state === 'on') {
        const mv=this.allyFollow(a,S,dt);
        this.allyAimFire(a,m,S,dt,mv,S.fireRate,z => { if (this.allyShoot(a,m,z,S.dmg,S,{who:id,vol:0.8})) a.kills++; });
        this.allyAnim(a,m,dt,-0.42);
      } else if (a.state === 'down') {
        m.inner.rotation.x=Math.min(0.8,a.t*1.5);
        if (a.t>=1.2) { m.inner.rotation.x=0; m.root.visible=false; this.guests[id]=null; this.hud.guest?.(id,null); }
      }
    }
  },
  updateGuestHud() {
    for (const id of Object.keys(GUESTS)) {
      const a=this.guests[id]; if (!a || this.state !== 'play' || a.state === 'down') { this.hud.guest?.(id,null); continue; }
      const v=point.set(a.x,a.y+2,a.z).project(this.camera), edge=edgeArrow(v.x,v.y,v.z>1);
      a.onScreen=edge.onScreen;
      this.hud.guest?.(id,{mode:a.state,onScreen:edge.onScreen,x:edge.x,y:edge.y,ang:edge.ang,hp:a.hp/a.maxHp});
    }
  },
};
