import * as THREE from 'three';
// Render-only, fixed-step particle collapse. Coordinates are in doll-local space.
export function chooseCollapse(id, tick, heavy = false, forced = null) {
  if (forced === 'ragdoll' || forced === 'anim') return forced;
  let h = Math.imul((id | 0) ^ Math.imul(tick | 0, 0x9e3779b1), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0xc2b2ae35); h = (h ^ (h >>> 13)) >>> 0;
  return h / 4294967296 < (heavy ? 0.72 : 0.45) ? 'ragdoll' : 'anim';
}
export function createCollapse(points, links) {
  const edges = links.map(([a,b]) => ({ a, b, length: Math.hypot(points[a].x-points[b].x, points[a].y-points[b].y, points[a].z-points[b].z) }));
  // Limit folding at two-segment joints by keeping their endpoints apart.
  const limits = [];
  for (let i=0;i<points.length;i++) {
    const neighbors=edges.filter(e => e.a===i || e.b===i);
    if (neighbors.length!==2) continue;
    const a=neighbors[0].a===i ? neighbors[0].b : neighbors[0].a;
    const b=neighbors[1].a===i ? neighbors[1].b : neighbors[1].a;
    limits.push({a,b,min:(neighbors[0].length+neighbors[1].length)*0.3});
  }
  return { points: points.map(p => ({ ...p, px: p.x, py: p.y, pz: p.z })), links:edges, limits, accumulator: 0, time: 0, settled: false };
}
export function stepCollapse(s, dt) {
  if (s.settled) return;
  s.accumulator += Math.min(Math.max(dt, 0), 0.1);
  const h = 1 / 60;
  while (s.accumulator >= h && !s.settled) {
    s.accumulator -= h; s.time += h;
    for (const p of s.points) {
      const x=p.x, y=p.y, z=p.z;
      p.x += (p.x-p.px)*0.96; p.y += (p.y-p.py)*0.96-9.8*h*h; p.z += (p.z-p.pz)*0.96;
      p.px=x; p.py=y; p.pz=z;
    }
    for (let k=0;k<6;k++) {
      for (const l of s.links) {
        const a=s.points[l.a], b=s.points[l.b], dx=b.x-a.x, dy=b.y-a.y, dz=b.z-a.z;
        const d=Math.hypot(dx,dy,dz) || 1, f=(d-l.length)/d*0.5;
        a.x+=dx*f; a.y+=dy*f; a.z+=dz*f; b.x-=dx*f; b.y-=dy*f; b.z-=dz*f;
      }
      for (const limit of s.limits) {
        const a=s.points[limit.a], b=s.points[limit.b], dx=b.x-a.x, dy=b.y-a.y, dz=b.z-a.z;
        const d=Math.hypot(dx,dy,dz) || 1;
        if (d<limit.min) { const f=(limit.min-d)/d*0.5; a.x-=dx*f; a.y-=dy*f; a.z-=dz*f; b.x+=dx*f; b.y+=dy*f; b.z+=dz*f; }
      }
      for (const p of s.points) if (p.y < 0.04) p.y=0.04;
    }
    if (s.time >= 2.5) s.settled=true;
  }
}

// Particle positions are render-only and use the doll's local ground plane.
const KO_SEGMENTS = [ ['pelvis','spine_01'], ['spine_01','neck_01'], ['neck_01','Head'],
  ['pelvis','thigh_l'], ['thigh_l','calf_l'], ['calf_l','foot_l'],
  ['pelvis','thigh_r'], ['thigh_r','calf_r'], ['calf_r','foot_r'],
  ['spine_01','upperarm_l'], ['upperarm_l','lowerarm_l'], ['lowerarm_l','hand_l'],
  ['spine_01','upperarm_r'], ['upperarm_r','lowerarm_r'], ['lowerarm_r','hand_r'] ];
export function beginCollapse(doll) {
  const bones = doll.carryBones, names = [...new Set(KO_SEGMENTS.flat())].filter(n => bones[n]);
  if (!bones.pelvis || names.length < 6) return null;
  doll.group.updateMatrixWorld(true);
  const points = names.map(n => {
    const p = doll.group.worldToLocal(bones[n].bone.getWorldPosition(new THREE.Vector3()));
    return { x:p.x, y:p.y, z:p.z };
  });
  const links = KO_SEGMENTS.filter(([a,b]) => names.includes(a) && names.includes(b)).map(([a,b]) => [names.indexOf(a),names.indexOf(b)]);
  const sim = createCollapse(points, links);
  for (const p of sim.points) p.pz -= Math.max(0, p.y) * 0.018;
  return { sim, names, phase:'fall' };
}
export function applyCollapse(doll, ko, dt, playAction) {
  if (ko.phase === 'blend') {
    ko.blend = Math.min(1, ko.blend + dt / 0.35);
    for (const [name, pose] of Object.entries(ko.pose)) {
      const bone = doll.carryBones[name].bone;
      bone.quaternion.slerpQuaternions(pose.q, ko.target[name].q, ko.blend);
      bone.position.lerpVectors(pose.p, ko.target[name].p, ko.blend);
    }
    if (ko.blend >= 1) ko.phase = 'done';
    return;
  }
  if (ko.phase !== 'fall') return;
  stepCollapse(ko.sim, dt);
  const bones=doll.carryBones, points=ko.sim.points;
  const hip=bones.pelvis.bone, hp=points[ko.names.indexOf('pelvis')];
  doll.group.updateMatrixWorld(true);
  hip.position.copy(hip.parent.worldToLocal(doll.group.localToWorld(new THREE.Vector3(hp.x,hp.y,hp.z))));
  for (const [a,b] of KO_SEGMENTS) {
    const ai=ko.names.indexOf(a), bi=ko.names.indexOf(b);
    if (ai<0 || bi<0) continue;
    const bone=bones[a].bone, child=bones[b].bone;
    doll.group.updateMatrixWorld(true);
    const from=child.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3())).normalize();
    const pa=points[ai], pb=points[bi];
    const to=new THREE.Vector3(pb.x-pa.x,pb.y-pa.y,pb.z-pa.z).transformDirection(doll.group.matrixWorld);
    const correction=new THREE.Quaternion().setFromUnitVectors(from,to);
    const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.premultiply(parent.clone().invert().multiply(correction).multiply(parent));
  }
  if (ko.sim.settled) {
    ko.pose={};
    for (const name of ko.names) { const bone=bones[name].bone; ko.pose[name]={q:bone.quaternion.clone(),p:bone.position.clone()}; }
    doll.mixer.stopAllAction(); doll.currentAction=null; doll.animName=null;
    for (const item of Object.values(bones)) { item.bone.quaternion.copy(item.rotation); item.bone.position.copy(item.position); }
    playAction(doll, 'Fall');
    if (doll.currentAction) doll.mixer.update(doll.currentAction.getClip().duration + 0.01);
    ko.target={};
    for (const name of ko.names) { const bone=bones[name].bone; ko.target[name]={q:bone.quaternion.clone(),p:bone.position.clone()}; }
    ko.phase='blend'; ko.blend=0;
  }
}

