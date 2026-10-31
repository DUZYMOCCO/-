import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SETTLEMENTS, SETTLEMENT_PLANS } from '../world/settlement_plan.js';
import { heightAt } from '../sim/terrain.js';

export function createSettlements(scene) {
  const active=new Map();
  const materials=[0,1,2].map(()=>new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
  function build(p,plan) {
    const buckets=[[],[],[]], y=heightAt(p.x,p.z);
    function box(bucket,x,z,w,d,h,cy,color) {
      const g=new THREE.BoxGeometry(w,h,d); g.translate(x,cy,z);
      const c=new THREE.Color(color), values=[];
      for(let i=0;i<g.attributes.position.count;i++) values.push(c.r,c.g,c.b);
      g.setAttribute('color',new THREE.Float32BufferAttribute(values,3)); buckets[bucket].push(g);
    }
    for(const b of plan.buildings) {
      const wall=b.kind==='wall';
      if(wall && (p.walls==='palisade' || p.size==='fort')) {
        const alongX=b.w>b.d, length=alongX?b.w:b.d, n=Math.max(1,Math.ceil(length/.8));
        for(let i=0;i<n;i++) {const offset=(i+.5)*length/n-length/2; box(2,b.x+(alongX?offset:0),b.z+(alongX?0:offset),.68,.68,b.h,y+b.h/2,b.color);}
      } else box(wall?2:0,b.x,b.z,b.w,b.d,b.h,y+b.h/2,b.color);
      if(!wall) box(1,b.x,b.z,b.w+.35,b.d+.35,.5,y+b.h+.25,p.palette?.[1]||p.color);
    }
    const edge=p.radius*.64, gx=p.x+plan.gate.x*edge, gz=p.z+plan.gate.z*edge;
    function flag(x,z,base) {
      box(1,x,z,.25,.25,5,base+2.5,'#604a32');
      for(const [offset,height,color] of [[0,1.2,p.palette?.[0]||p.color],[.48,.24,p.palette?.[1]||'#eee']]) {
        const g=new THREE.PlaneGeometry(2,height); g.translate(x+1,base+4+offset,z+(height<1?.01:0));
        const c=new THREE.Color(color), colors=[]; for(let i=0;i<g.attributes.position.count;i++) colors.push(c.r,c.g,c.b);
        g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3)); buckets[1].push(g);
      }
    }
    flag(gx,gz,y);
    const wallType=p.size==='fort'?'palisade':p.walls;
    if(wallType && wallType!=='none') {
      const h=wallType==='stone'?5:wallType==='palisade'?3:2, thickness=wallType==='stone'?1.4:.65;
      const color=wallType==='stone'?'#85827d':'#795c40', gap=edge*.25;
      for(const side of [-1,1]) box(2,gx+plan.gate.z*gap*side,gz-plan.gate.x*gap*side,thickness,thickness,h,y+h/2,color);
      box(2,gx,gz,plan.gate.x?thickness:gap*2,plan.gate.z?thickness:gap*2,thickness,y+h,color);
    }
    const hall=plan.buildings.find(b=>b.kind==='hall') || plan.buildings.find(b=>b.kind==='tower');
    if(hall) flag(hall.x,hall.z,y+hall.h);
    const group=new THREE.Group();
    for(let i=0;i<3;i++) if(buckets[i].length) {
      const g=mergeGeometries(buckets[i]); for(const part of buckets[i]) part.dispose();
      group.add(new THREE.Mesh(g,materials[i]));
    }
    const canvas=document.createElement('canvas'); canvas.width=1024; canvas.height=384;
    const ctx=canvas.getContext('2d'); ctx.fillStyle='#50351f'; ctx.fillRect(0,0,1024,384);
    ctx.strokeStyle='#a8824f'; ctx.lineWidth=12; ctx.strokeRect(12,12,1000,360);
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#fff0d0';
    ctx.font='bold 105px sans-serif'; ctx.fillText(p.name,512,125,940);
    ctx.font='54px sans-serif'; ctx.fillText(p.sign || p.label || '',512,265,940);
    const texture=new THREE.CanvasTexture(canvas), signMat=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(6,2.25),signMat);
    sign.position.set(gx-plan.gate.z*(edge*.25+4),y+2.4,gz+plan.gate.x*(edge*.25+4));
    sign.rotation.y=plan.gate.x?Math.PI/2:0; group.add(sign);
    scene.add(group); return group;
  }
  function update(x,z) {
    for(const [id,item] of active) if(Math.hypot(x-item.place.x,z-item.place.z)>4500) {
      scene.remove(item.group); item.group.traverse(o=>{o.geometry?.dispose(); if(o.material?.map){o.material.map.dispose();o.material.dispose();}}); active.delete(id);
    }
    const next=SETTLEMENTS.map((p,i)=>({p,plan:SETTLEMENT_PLANS[i],distance:Math.hypot(x-p.x,z-p.z)}))
      .filter(a=>!a.plan.skipped && a.distance<3500 && !active.has(a.p.id)).sort((a,b)=>a.distance-b.distance)[0];
    if(next) active.set(next.p.id,{place:next.p,group:build(next.p,next.plan)});
  }
  return {update,info:()=>({loaded:active.size})};
}
