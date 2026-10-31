import * as THREE from 'three';
import { mergeGeometries } from '../vendor/three/examples/jsm/utils/BufferGeometryUtils.js';
import { WORLD_LAYOUT } from '../data/world_layout.js';
import { heightAt } from '../sim/terrain.js';
import { GIANTS } from './giants_plan.js';
import { planChunks, CHUNK_SIZE, isLocalCell } from './terrain_chunks_plan.js';

const palette = WORLD_LAYOUT.regions.map(({biome:b}) => new THREE.Color(
  /salt/.test(b) ? '#d9d1b5' : /dune|red_sand/.test(b) ? '#bd8055' :
  /swamp|mangrove|delta/.test(b) ? '#746f49' : /fertile|valley/.test(b) ? '#8b9665' :
  /impact|acid|volcan/.test(b) ? '#625650' : /machine|graveyard/.test(b) ? '#88766b' :
  /mountain|canyon|crags|rock/.test(b) ? '#948475' : '#cdb07a'));
const sand = new THREE.Color('#cdb07a');
const sm = t => t*t*(3-2*t);
function regionColor(x,z,out) {
  const gx=x/WORLD_LAYOUT.cellM+WORLD_LAYOUT.originCell[0]-.5, gz=z/WORLD_LAYOUT.cellM+WORLD_LAYOUT.originCell[1]-.5;
  const ix=Math.floor(gx), iz=Math.floor(gz), tx=sm(gx-ix), tz=sm(gz-iz);
  const at=(a,b)=>palette[WORLD_LAYOUT.regionGrid[Math.max(0,Math.min(63,b))].charCodeAt(Math.max(0,Math.min(63,a)))-65] || sand;
  const a=at(ix,iz), b=at(ix+1,iz), c=at(ix,iz+1), d=at(ix+1,iz+1);
  out.setRGB((a.r*(1-tx)+b.r*tx)*(1-tz)+(c.r*(1-tx)+d.r*tx)*tz,
    (a.g*(1-tx)+b.g*tx)*(1-tz)+(c.g*(1-tx)+d.g*tx)*tz,
    (a.b*(1-tx)+b.b*tx)*(1-tz)+(c.b*(1-tx)+d.b*tx)*tz);
  out.lerp(sand,1-Math.min(1,Math.max(0,(Math.max(Math.abs(x),Math.abs(z))-200)/500)));
}
export function buildChunkGeometry(chunk) {
  const segments={near:60,mid:16,far:4}[chunk.lod], step=CHUNK_SIZE/segments;
  const coords=(start)=>{const a=[];for(let i=0;i<=segments;i++)a.push(start+i*step); for(const edge of [-200,200]) if(edge>start && edge<start+CHUNK_SIZE) a.push(edge); return [...new Set(a)].sort((a,b)=>a-b);};
  const xs=coords(chunk.x), zs=coords(chunk.z), w=xs.length, h=zs.length;
  const pos=[], col=[], idx=[], skirts=[], color=new THREE.Color();
  for (const z of zs) for (const x of xs) {
    const y=heightAt(x,z), slope=Math.hypot(heightAt(x+2,z)-heightAt(x-2,z),heightAt(x,z+2)-heightAt(x,z-2))/4;
    regionColor(x,z,color); color.multiplyScalar(1-Math.min(.3,slope*.55));
    pos.push(x,y,z); col.push(color.r,color.g,color.b);
  }
  const isHole=(i,j)=>isLocalCell(xs[i],zs[j],xs[i+1],zs[j+1]);
  function skirt(a,b) { skirts.push([a,b]); }
  for(let j=0;j<h-1;j++) for(let i=0;i<w-1;i++) {
    if(isHole(i,j)) continue;
    const a=j*w+i,b=a+1,c=a+w,d=c+1; idx.push(a,c,b,b,c,d);
    if(j===0 || isHole(i,j-1)) skirt(b,a);
    if(j===h-2 || isHole(i,j+1)) skirt(c,d);
    if(i===0 || isHole(i-1,j)) skirt(a,c);
    if(i===w-2 || isHole(i+1,j)) skirt(d,b);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setIndex(idx); g.computeVertexNormals();
  const normals=Array.from(g.getAttribute('normal').array);
  for(const [a,b] of skirts) {
    const start=pos.length/3;
    for(const [i,drop] of [[a,0],[b,0],[a,12],[b,12]]) {
      pos.push(pos[i*3],pos[i*3+1]-drop,pos[i*3+2]);
      col.push(col[i*3],col[i*3+1],col[i*3+2]);
      normals.push(normals[i*3],normals[i*3+1],normals[i*3+2]);
    }
    idx.push(start,start+2,start+1,start+1,start+2,start+3);
  }
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  g.setIndex(idx); return g;
}
export function createTerrainChunks(scene) {
  const material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  // Eight fixed buckets per LOD cap draw calls even without multi-draw support.
  const groups=new Map(), dirty=new Set();
  const bucket=p=>p.lod+':'+(((p.ix%4)+4)%4)+':'+(((p.iz%2)+2)%2);
  function rebuildDirty() {
    function rebuild(key) {
      const parts=[];for(const r of records.values())if(r.bucket===key)parts.push(r.geometry);
      const old=groups.get(key);
      if(parts.length){const merged=mergeGeometries(parts);const mesh=new THREE.Mesh(merged,material);mesh.receiveShadow=key.startsWith('near:');scene.add(mesh);groups.set(key,mesh);}
      else groups.delete(key);
      if(old){scene.remove(old);old.geometry.dispose();}
      dirty.delete(key);
    }
    for(const key of dirty) if(key.startsWith('near:')) rebuild(key);
    const queuedBuckets=new Set(queue.map(bucket)), deadline=performance.now()+3;
    let rebuilt=0;
    for(const lod of ['mid:', 'far:']) for(const key of dirty) {
      if(!key.startsWith(lod) || queuedBuckets.has(key)) continue;
      if(rebuilt && performance.now()>=deadline) return;
      rebuild(key); rebuilt++;
    }
  }
  const records=new Map(); let queue=[], lastX=Infinity,lastZ=Infinity;
  const rockGeometry=new THREE.IcosahedronGeometry(1,0), rockMaterial=new THREE.MeshLambertMaterial({color:0x887767});
  const rocks=new THREE.InstancedMesh(rockGeometry,rockMaterial,128); rocks.count=0; rocks.frustumCulled=false; scene.add(rocks);
  const object=new THREE.Object3D(), places=[...WORLD_LAYOUT.towns,...WORLD_LAYOUT.landmarks,...GIANTS];
  const hash=(x,z,k)=>{const v=Math.sin(x*127.1+z*311.7+k*74.7)*43758.5453;return v-Math.floor(v);};
  function refreshRocks() {
    let count=0;
    for(const r of records.values()) {
      if(r.lod!=='near')continue;
      const x=r.x+hash(r.ix,r.iz,1)*CHUNK_SIZE,z=r.z+hash(r.ix,r.iz,2)*CHUNK_SIZE;
      if(Math.abs(x)<200&&Math.abs(z)<200)continue;
      const close=places.some(p=>Math.hypot(x-p.x,z-p.z)<150);
      if(hash(r.ix,r.iz,3)>(close?.6:.24) || count>=128)continue;
      object.position.set(x,heightAt(x,z)+.45,z);object.rotation.set(0,hash(r.ix,r.iz,4)*6.28,0);
      const scale=.6+hash(r.ix,r.iz,5)*1.6;object.scale.set(scale,scale*.6,scale*.8);object.updateMatrix();rocks.setMatrixAt(count++,object.matrix);
    }
    rocks.count=count;rocks.instanceMatrix.needsUpdate=true;
  }
  function update(x,z) {
    // Replan only on movement large enough to affect the visible working set.
    if(Math.abs(x-lastX)>64 || Math.abs(z-lastZ)>64) {
      lastX=x;lastZ=z;const plan=planChunks(x,z), desired=new Map(plan.map(p=>[p.key,p]));
      for(const [key,r] of records) {const p=desired.get(key); if(!p || p.lod!==r.lod) {dirty.add(r.bucket);r.geometry.dispose();records.delete(key);} }
      queue=plan.filter(p=>!records.has(p.key));
    }
    const deadline=performance.now()+3;
    let built=0;
    while(queue.length && (built===0 || performance.now()<deadline)) {
      const p=queue.shift(),g=buildChunkGeometry(p),key=bucket(p);
      records.set(p.key,{...p,geometry:g,bucket:key});dirty.add(key); built++;
    }
    rebuildDirty();
    refreshRocks();
  }
  function info(){const counts={near:0,mid:0,far:0,buildsPending:queue.length+dirty.size,queued:queue.length,dirtyBuckets:dirty.size};for(const r of records.values())counts[r.lod]++;return counts;}
  return {update,info,meshes:groups};
}

