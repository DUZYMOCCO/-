// Guided vehicle routes and their presentation. The train stays in carriage-local
// coordinates while the scenery outside its windows moves past.
import * as THREE from '../vendor/three.module.min.js';

export const RIDE = {
  minecart: { radius: 22, speed: 3.4 },
  roadride: { radius: 22, speed: 4.2 },
  airride: { radius: 17, speed: 2.5 },
};
export function ridePoint(kind, angle) {
  const r = RIDE[kind].radius;
  return { x: Math.sin(angle) * r, z: Math.cos(angle) * r,
    y: kind === 'minecart' ? 1.15 + 0.55 * Math.sin(angle * 2) : kind === 'airride' ? 4 : 0.35 };
}
export function createRideScene(scene, map) {
  const kind = map.ride || map.specialStage;
  if (!kind) return null;
  const group = new THREE.Group(); scene.add(group);
  const geometry = new THREE.BoxGeometry(1,1,1);
  const mats = {
    dark: new THREE.MeshLambertMaterial({color:0x263137}),
    body: new THREE.MeshLambertMaterial({color:kind === 'roadride' ? 0x596b4c : kind === 'airride' ? 0x4c6260 : 0x6d5642}),
    edge: new THREE.MeshLambertMaterial({color:0x9a9a80}),
    light: new THREE.MeshBasicMaterial({color:0xe5d6a5}),
  };
  const part = (parent,mat,w,h,d,x,y,z) => { const m=new THREE.Mesh(geometry,mats[mat]); m.scale.set(w,h,d); m.position.set(x,y,z); parent.add(m); return m; };
  let mount = null, rotor = null, posts = [];
  if (map.ride) {
    mount = new THREE.Group(); group.add(mount);
    if (kind === 'minecart') {
      part(mount,'body',2.0,0.35,2.8,0,-0.35,0);
      for (const x of [-0.94,0.94]) part(mount,'body',0.16,0.75,2.8,x,0,0);
      for (const z of [-1.35,1.35]) part(mount,'edge',1.85,0.4,0.14,0,-0.03,z);
      for (const x of [-0.78,0.78]) for (const z of [-0.9,0.9]) part(mount,'dark',0.35,0.45,0.45,x,-0.7,z);
      // Track pieces share three instanced draws, including the rising sections.
      const track = { edge: [], body: [], dark: [] };
      const addTrack = (mat,x,y,z,w,h,d,rx=0,ry=0) => {
        const matrix = new THREE.Matrix4();
        matrix.compose(new THREE.Vector3(x,y,z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,0)), new THREE.Vector3(w,h,d));
        track[mat].push(matrix);
      };
      for (let i=0;i<96;i++) {
        const a=i*Math.PI*2/96, b=(i+1)*Math.PI*2/96, p=ridePoint(kind,a), q=ridePoint(kind,b);
        const yaw=Math.atan2(q.x-p.x,q.z-p.z), len=Math.hypot(q.x-p.x,q.z-p.z);
        for (const side of [-0.68,0.68])
          addTrack('edge',(p.x+q.x)/2+Math.cos(yaw)*side,(p.y+q.y)/2-0.72,(p.z+q.z)/2-Math.sin(yaw)*side,0.12,0.12,len+0.06,-Math.atan2(q.y-p.y,len),yaw);
        if (i%4===0) {
          addTrack('body',p.x,p.y-0.8,p.z,1.9,0.14,0.22,0,yaw);
          addTrack('dark',p.x,(p.y-0.8)/2,p.z,0.22,Math.max(0.1,p.y-0.8),0.22);
        }
      }
      for (const [name, matrices] of Object.entries(track)) {
        const mesh = new THREE.InstancedMesh(geometry,mats[name],matrices.length);
        matrices.forEach((matrix,i) => mesh.setMatrixAt(i,matrix));
        mesh.instanceMatrix.needsUpdate=true; group.add(mesh);
      }
    } else if (kind === 'roadride') {
      part(mount,'body',2.1,0.5,3.8,0,-0.3,0);
      part(mount,'body',2.1,0.45,1.1,0,0.12,-1.35);
      for (const x of [-1.05,1.05]) for (const z of [-1.1,1.1]) part(mount,'dark',0.35,0.65,0.75,x,-0.5,z);
      for (const x of [-0.7,0.7]) part(mount,'light',0.4,0.18,0.08,x,0.15,-1.92);
    } else {
      part(mount,'body',2.2,0.4,3.0,0,-0.4,0);
      part(mount,'body',1.8,1.0,1.25,0,0.05,-1.7);
      part(mount,'dark',0.38,0.3,4.0,0,-0.25,2.8);
      for (const x of [-1.1,1.1]) part(mount,'edge',0.12,0.12,3.8,x,-0.9,0);
      rotor = new THREE.Group(); rotor.position.set(0,4.2,-0.4); mount.add(rotor);
      part(rotor,'dark',7,0.08,0.2,0,0,0); part(rotor,'dark',0.2,0.08,7,0,0,0);
    }
  } else {
    for (const x of [-7,7]) for (let i=0;i<12;i++) {
      const p=part(group,'dark',0.5,5,0.5,x,2.5,i*8-44);
      part(p,'light',2,0.12,2,0,0.35,0); posts.push({m:p,base:i*8-44});
    }
  }
  return { kind, group, mount, rotor, posts, time:0, angle:0,
    update(dt, pos) {
      this.time += dt;
      if (this.mount) {
        this.mount.position.set(pos.x,pos.y,pos.z);
        this.mount.rotation.y = -this.angle - Math.PI/2;
        if (this.rotor) this.rotor.rotation.y += dt*16;
      }
      for (const p of this.posts) p.m.position.z = pos.z + (((p.base + this.time*12 - pos.z + 48)%96+96)%96)-48;
    },
    dispose() { scene.remove(group); geometry.dispose(); for (const m of Object.values(mats)) m.dispose(); }
  };
}
