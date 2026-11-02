import * as THREE from 'three';
import { mergeVertexGeometries } from './geometry_merge.js';
import { SETTLEMENTS, SETTLEMENT_PLANS, planSettlementDecorLayout, settlementGateParts } from '../world/settlement_plan.js';
import { heightAt } from '../sim/terrain.js';

export function createSettlements(scene, stateSource = null) {
  const active=new Map();
  const materials=[0,1,2].map(()=>new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
  function build(p,plan) {
    const buckets=[[],[],[]], y=heightAt(p.x,p.z);
    function box(bucket,x,z,w,d,h,cy,color,rotY=0) {
      const g=new THREE.BoxGeometry(w,h,d); if(rotY) g.rotateY(rotY); g.translate(x,cy,z);
      const c=new THREE.Color(color), values=[];
      for(let i=0;i<g.attributes.position.count;i++) values.push(c.r,c.g,c.b);
      g.setAttribute('color',new THREE.Float32BufferAttribute(values,3)); buckets[bucket].push(g);
    }
    function cylinder(bucket,x,z,top,bottom,h,cy,color,segments=8,open=false) {
      const g=new THREE.CylinderGeometry(top,bottom,h,segments,1,open); g.translate(x,cy,z);
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
      if(!wall && !['tent','tower'].includes(b.kind)) {
        const dx=p.x-b.x,dz=p.z-b.z;
        if(Math.abs(dx)>Math.abs(dz)) {
          const side=Math.sign(dx)||1;
          box(0,b.x+side*(b.w/2+.04),b.z,.12,1.12,2.15,y+1.08,'#62452f');
          box(1,b.x+side*(b.w/2+.11),b.z,1.3,.08,.13,y+2.18,'#94734d');
        } else {
          const side=Math.sign(dz)||1;
          box(0,b.x,b.z+side*(b.d/2+.04),1.12,.12,2.15,y+1.08,'#62452f');
          box(1,b.x,b.z+side*(b.d/2+.11),1.3,.08,.13,y+2.18,'#94734d');
        }
      }
    }
    const state=typeof stateSource==='function'?stateSource():stateSource;
    const layout=planSettlementDecorLayout(p,plan,state), edge=p.radius*.64, gx=p.x+plan.gate.x*edge, gz=p.z+plan.gate.z*edge;
    // 通りを門から広場までつなぎ、踏み固めた土と石の広場を同じ結合メッシュに焼く。
    const center=layout.center, plazaY=heightAt(center.x,center.z);
    const roadDx=center.x-gx, roadDz=center.z-gz, roadLength=Math.hypot(roadDx,roadDz);
    const roadRot=Math.atan2(-roadDz,roadDx);
    box(0,center.x,center.z,7.2,7.2,.06,plazaY+.035,'#b5a17d');
    box(0,(center.x+gx)/2,(center.z+gz)/2,roadLength,4.2,.04,(plazaY+y)/2+.045,'#897557',roadRot);
    const decor=layout.decor;
    const shift=(q,axis,d)=>({x:q.x+axis.x*d,z:q.z+axis.z*d});
    for(const item of decor) {
      const itemY=heightAt(item.x,item.z), right=item.right, across=item.forward;
      if(item.kind==='stall') {
        const tangent=right;
        box(0,item.x,item.z,2.7,1.05,.16,itemY+.94,'#72563a',item.rot);
        for(const a of [-1,1]) for(const b of [-1,1]) {
          const leg=shift(shift(item,tangent,a*1.18),across,b*.38);
          box(0,leg.x,leg.z,.12,.12,.78,itemY+.39,'#60472f',item.rot);
        }
        for(const a of [-1,1]) for(const b of [-1,1]) {
          const post=shift(shift(item,tangent,a*1.34),across,b*.86);
          box(0,post.x,post.z,.13,.13,2.45,itemY+1.22,'#63472f',item.rot);
        }
        const awningY=itemY+2.52;
        box(1,item.x,item.z,3.18,2.0,.14,awningY,'#9f4934',item.rot);
        for(const a of [-1,0,1]) {
          const stripe=shift(item,tangent,a*1.05);
          box(1,stripe.x,stripe.z,1.02,2.02,.15,awningY,a===0?'#e0c99c':'#557149',item.rot);
        }
        const tag=shift(item,across,1.18);
        box(1,tag.x,tag.z,.78,.12,.32,itemY+1.85,'#c9ab74',item.rot);
        const barrel=shift(item,tangent,1.9);
        cylinder(0,barrel.x,barrel.z,.28,.34,.72,itemY+.36,'#765338',8,false);
        const crate=shift(item,across,-1.75);
        box(0,crate.x,crate.z,.72,.66,.62,itemY+.31,'#76573a',item.rot);
      } else if(item.kind==='well') {
        cylinder(2,item.x,item.z,.64,.78,.72,itemY+.36,'#756c5d',10,true);
        cylinder(2,item.x,item.z,.5,.52,.08,itemY+.58,'#342f2b',10,false);
        for(const side of [-1,1]) {
          const post=shift(item,right,side*.64);
          box(0,post.x,post.z,.14,.14,1.5,itemY+.75,'#624a33');
        }
        box(0,item.x,item.z,1.55,.16,.14,itemY+1.45,'#493a2a',item.rot);
        const bucket=shift(item,across,.36);
        cylinder(0,bucket.x,bucket.z,.16,.2,.3,itemY+.95,'#826441',7,false);
      } else if(item.kind==='hearth') {
        cylinder(2,item.x,item.z,.62,.72,.18,itemY+.09,'#685c4c',10,false);
        cylinder(1,item.x,item.z,.34,.4,.1,itemY+.2,'#a6552d',9,false);
        box(0,item.x,item.z,.84,.12,.12,itemY+.23,'#49372a',item.rot+.5);
        box(0,item.x,item.z,.84,.12,.12,itemY+.23,'#49372a',item.rot-.5);
      } else if(item.kind==='laundry') {
        for(const side of [-1,1]) {
          const post=shift(item,right,side*1.18);
          box(0,post.x,post.z,.12,.12,1.95,itemY+.98,'#624a33');
        }
        box(0,item.x,item.z,2.48,.05,.05,itemY+1.72,'#49372a',item.rot);
        for(let i=0;i<4;i++) {
          const cloth=shift(item,right,-.84+i*.56);
          const c=['#b7a28a','#687c56','#9a6148','#c1b78f'][i];
          box(1,cloth.x,cloth.z,.43,.07,.64,itemY+1.34,c,item.rot);
        }
      }
    }
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
    const wallColor=wallType==='stone'?'#85827d':'#795c40';
    for(const part of settlementGateParts(p,plan,y)) {
      box(2,part.x,part.z,part.w,part.d,part.h,part.cy,wallColor);
    }
    const hall=plan.buildings.find(b=>b.kind==='hall') || plan.buildings.find(b=>b.kind==='tower');
    if(hall) flag(hall.x,hall.z,y+hall.h);
    const group=new THREE.Group();
    for(let i=0;i<3;i++) if(buckets[i].length) {
      const parts=buckets[i];
      const g=mergeVertexGeometries(parts,['normal','color']);
      if(g) {
        for(const part of parts) part.dispose();
        group.add(new THREE.Mesh(g,materials[i]));
      } else {
        // 結合に失敗しても、その集落の残りの描画とゲーム起動は続ける。
        for(const part of parts) group.add(new THREE.Mesh(part,materials[i]));
      }
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
      .filter(a=>a.distance<3500 && !active.has(a.p.id)).sort((a,b)=>a.distance-b.distance)[0];
    if(next) active.set(next.p.id,{place:next.p,group:build(next.p,next.plan)});
  }
  return {update,info:()=>({loaded:active.size})};
}
