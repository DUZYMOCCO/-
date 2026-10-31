import * as THREE from 'three';
import { BUILDINGS } from '../data/buildings.js';
import { BUILD_LOOKS } from './build_looks.js';
import { heightAt } from '../sim/terrain.js';
import { saleLots } from '../world/settlement_plan.js';
import { WORLD_LAYOUT } from '../data/world_layout.js';

function color(value) { return new THREE.Color(value); }

export function createBuildBoxes(scene) {
  const root = new THREE.Group(); root.name='build-boxes'; scene.add(root);
  const geometry = new THREE.BoxGeometry(1,1,1);
  const meshes = new Map();
  let signature = '';
  let ghost = null;
  const stats = { calls:0, tris:0 };
  // 売り区画の計算は重い（町の格子 × 道 × 建物）ので、所有や町の変化があったときだけやり直す
  const lotCache = new Map();
  function lotsOf(town, state) {
    const key = `${(state.ownedLots||[]).join(',')}|${state.town?.v||0}|${(state.buildings||[]).length}`;
    const hit = lotCache.get(town.id);
    if (hit && hit.key === key) return hit.lots;
    const lots = saleLots(town, state); lotCache.set(town.id, { key, lots }); return lots;
  }
  // 建築係が運んでいる木箱（毎フレーム、人形の補間位置に合わせる）
  const CARRY_MAX = 24;
  const carryMesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color: 0x9a6b3a, roughness: 0.85 }), CARRY_MAX);
  carryMesh.name = 'build-carry'; carryMesh.count = 0; carryMesh.frustumCulled = false; root.add(carryMesh);
  const carryMatrix = new THREE.Matrix4(), carryPos = new THREE.Vector3(), carryScale = new THREE.Vector3(0.55, 0.4, 0.45), carryQuat = new THREE.Quaternion(), carryEuler = new THREE.Euler();
  function updateCarry(state, posOf) {
    let n = 0;
    for (const a of state.actors || []) {
      if (n >= CARRY_MAX) break;
      const t = a.buildTask;
      if (!t || t.stage !== 'carry' || !t.carry || a.state === 'dead' || a.state === 'down') continue;
      const p = posOf ? posOf(a.id) : null;
      const x = p ? p.x : a.x, z = p ? p.z : a.z, y = p && Number.isFinite(p.y) ? p.y : heightAt(x, z);
      const r = a.rot || 0;
      carryPos.set(x + Math.sin(r) * 0.35, y + 1.05, z + Math.cos(r) * 0.35);
      carryEuler.set(0, r, 0); carryQuat.setFromEuler(carryEuler);
      carryMatrix.compose(carryPos, carryQuat, carryScale); carryMesh.setMatrixAt(n++, carryMatrix);
    }
    carryMesh.count = n; carryMesh.instanceMatrix.needsUpdate = true; carryMesh.visible = n > 0;
    return n;
  }

  function clearMeshes() {
    for (const mesh of meshes.values()) { root.remove(mesh); mesh.material?.dispose?.(); mesh.dispose?.(); }
    meshes.clear();
  }
  function pointDistance(a,b) { return Math.hypot(a.x-b.x,a.z-b.z); }

  function update(state, focus = {x:0,z:0}, posOf = null) {
    stats.carry = updateCarry(state, posOf);
    const detail=[];
    for (const base of state.outposts?.items || []) {
      const distance=pointDistance(base,focus);
      if (distance>900) continue;
      if (distance>300) {
        detail.push({type:'remote_outpost',x:base.x,z:base.z,rot:0,state:'done'});
        continue;
      }
      for (const p of state.outposts?.pieces || []) if (p.outpostId===base.id && p.state!=='removed') detail.push(p);
    }
    // 買った家: 屋根なしの壁（town.js の walls と同じ箱。扉の所は空ける）と床。中のカウンター・客が見える
    for (const h of state.town?.houses || []) {
      if (h.owner!=='player' || pointDistance(h,focus)>900) continue;
      detail.push({type:'owned_house_floor',id:`${h.id}:floor`,x:h.x,z:h.z,w:h.w,d:h.d,rot:0,state:'done'});
      for (const [i,w] of (h.walls||[]).entries()) detail.push({type:'owned_house_wall',id:`${h.id}:w${i}`,x:w.x,z:w.z,w:w.hw*2,d:w.hd*2,rot:0,state:'done'});
      for (const p of state.outposts?.pieces || []) if (p.houseId===h.id && p.state!=='removed') detail.push(p);
      if (h.door && !h.door.open) detail.push({type:'owned_house_door',id:`${h.id}:door`,x:h.door.x,z:h.door.z,w:Math.abs(h.door.ux)>0.5?h.door.half*2:0.12,d:Math.abs(h.door.ux)>0.5?0.12:h.door.half*2,rot:0,state:'done'});
    }
    const lotMarks=[];
    for (const town of WORLD_LAYOUT.towns) {
      const d=pointDistance(town,focus); if(d>900) continue;
      for(const lot of lotsOf(town,state)) if(!state.ownedLots?.includes(lot.id)) lotMarks.push(lot);
    }
    const nextSignature=JSON.stringify([detail.map(p=>[p.id,p.type,p.x,p.z,p.rot,p.state,p.length,p.w,p.d]),lotMarks.map(p=>[p.id,p.x,p.z]),state.outposts?.rev||0]);
    if(nextSignature===signature) return stats;
    signature=nextSignature; clearMeshes();
    const groups=new Map();
    for(const p of detail) { if(!groups.has(p.type))groups.set(p.type,[]);groups.get(p.type).push(p); }
    for(const [type,list] of groups) {
      const look=BUILD_LOOKS[type]||BUILD_LOOKS.storage_box;
      const mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.82,transparent:true,opacity:0.92,depthWrite:true});
      const mesh=new THREE.InstancedMesh(geometry,mat,list.length); mesh.name=`build-${type}`; mesh.userData.pieceType=type;
      const matrix=new THREE.Matrix4(), position=new THREE.Vector3(), scale=new THREE.Vector3(), quat=new THREE.Quaternion(), euler=new THREE.Euler();
      list.forEach((p,i)=>{
        const source=BUILD_LOOKS[p.type]||look;
        let w=source.size[0], h=source.size[1], d=source.size[2];
        if(['wood_fence','stone_wall','wood_gate'].includes(p.type)){w=p.length||p.w||w;d=0.5;}
        else {w=p.w||w;d=p.d||d;}
        position.set(p.x,heightAt(p.x,p.z)+h/2,p.z); scale.set(w,h,d); euler.set(0,p.rot||0,0); quat.setFromEuler(euler);
        matrix.compose(position,quat,scale); mesh.setMatrixAt(i,matrix);
        const baseColor=color(source.color), tint=p.state==='site'?color('#b4d49b'):baseColor;
        mesh.setColorAt(i,tint);
      });
      mesh.instanceMatrix.needsUpdate=true; if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      root.add(mesh); meshes.set(type,mesh);
    }
    if(lotMarks.length) {
      const mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.8,transparent:true,opacity:0.78});
      const mesh=new THREE.InstancedMesh(geometry,mat,lotMarks.length*2); mesh.name='build-sale-lots';
      const matrix=new THREE.Matrix4(),pos=new THREE.Vector3(),scale=new THREE.Vector3(),quat=new THREE.Quaternion();
      lotMarks.forEach((lot,i)=>{
        pos.set(lot.x,heightAt(lot.x,lot.z)+0.05,lot.z);scale.set(lot.w,0.1,lot.d);matrix.compose(pos,quat,scale);mesh.setMatrixAt(i*2,matrix);mesh.setColorAt(i*2,color('#6f9bb1'));
        pos.set(lot.x+lot.w*0.38,heightAt(lot.x,lot.z)+1.15,lot.z);scale.set(0.18,2.2,0.18);matrix.compose(pos,quat,scale);mesh.setMatrixAt(i*2+1,matrix);mesh.setColorAt(i*2+1,color('#d0b25d'));
      });
      mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;root.add(mesh);meshes.set('sale_lots',mesh);
    }
    stats.calls=meshes.size; stats.tris=Array.from(meshes.values()).reduce((n,m)=>n+m.count*12,0);
    if(ghost) root.add(ghost);
    return stats;
  }

  function setGhost(type, x, z, rot, result, length = undefined) {
    if(ghost){root.remove(ghost);ghost.geometry.dispose();ghost.material.dispose();ghost=null;}
    const look=BUILD_LOOKS[type]||BUILD_LOOKS.storage_box;
    const wall=['wood_fence','stone_wall','wood_gate'].includes(type), vertical=(Math.round((rot||0)/(Math.PI/2))%2)!==0;
    const geom=wall?new THREE.BoxGeometry(vertical?0.5:(length||look.size[0]),look.size[1],vertical?(length||look.size[0]):0.5):new THREE.BoxGeometry(...look.size);
    const colorCode=result?.color==='green'?0x46d17a:result?.color==='blue'?0x4d8dff:0xe45151;
    ghost=new THREE.Mesh(geom,new THREE.MeshBasicMaterial({color:colorCode,transparent:true,opacity:0.38,depthWrite:false}));
    ghost.position.set(x,heightAt(x,z)+look.size[1]/2,z);ghost.rotation.y=rot||0;ghost.name='build-ghost';root.add(ghost);
  }
  function hideGhost(){if(ghost){root.remove(ghost);ghost.geometry.dispose();ghost.material.dispose();ghost=null;}}
  function getStats(){return {...stats,calls:meshes.size+(carryMesh.count?1:0),tris:stats.tris+carryMesh.count*12};}
  function dispose(){clearMeshes();hideGhost();carryMesh.material.dispose();carryMesh.dispose();scene.remove(root);geometry.dispose();}
  return { update, setGhost, hideGhost, stats:getStats, dispose };
}
