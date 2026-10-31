import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heightAt } from '../sim/terrain.js';
import { GIANTS, LAKE } from './giants_plan.js';

// A separate haze retains silhouettes; the uniform is the live day/night sky.
function haze(material, sky, hole = false) {
  material.fog = false;
  material.onBeforeCompile = shader => {
    shader.uniforms.giantSky = { value: sky };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float giantDistance;\nvarying vec3 giantWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\ngiantDistance = length(mvPosition.xyz);\ngiantWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 giantSky;\nvarying float giantDistance;\nvarying vec3 giantWorld;')
      .replace('#include <fog_fragment>', `${hole ? `if (distance(giantWorld.xz, vec2(${LAKE.x.toFixed(1)}, ${LAKE.z.toFixed(1)})) < ${LAKE.radius.toFixed(1)}) discard;` : ''}\n gl_FragColor.rgb = mix(gl_FragColor.rgb, giantSky, clamp(giantDistance / 3000.0, 0.08, 0.48));`);
  };
  material.customProgramCacheKey = () => `giant-haze-${hole}`;
  return material;
}
function farGround(scene, sky) {
  // The inner square follows every terrain-edge vertex exactly, avoiding cracks.
  const points=[];
  for(let i=0;i<160;i++) points.push([-200+i*2.5,-200]);
  for(let i=0;i<160;i++) points.push([200,-200+i*2.5]);
  for(let i=0;i<160;i++) points.push([200-i*2.5,200]);
  for(let i=0;i<160;i++) points.push([-200,200-i*2.5]);
  const pos=[], colors=[], indices=[], sand=new THREE.Color('#cdb07a');
  for(let ring=0;ring<6;ring++) for(const [x,z] of points) {
    const factor=[1,1.15,1.5,2.5,4,15][ring], xx=x*factor, zz=z*factor;
    const dune = Math.sin(xx*.003)*1.5+Math.cos(zz*.004)*1.5;
    const blend = Math.max(0, 1-(factor-1)/0.5);
    const y=heightAt(x,z)*blend + dune*(1-blend);
    pos.push(xx,y,zz); colors.push(sand.r,sand.g,sand.b);
  }
  const n=points.length;
  for(let k=0;k<5;k++) for(let i=0;i<n;i++) {const a=k*n+i,b=k*n+(i+1)%n,c=a+n,d=b+n; indices.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3)); g.setIndex(indices); g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,haze(new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}),sky,true)); scene.add(mesh);
  const disc=(radius,y,color,opacity)=>{const geo=new THREE.CircleGeometry(radius,64); geo.rotateX(-Math.PI/2); const mat=haze(new THREE.MeshLambertMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1,side:THREE.DoubleSide}),sky); const m=new THREE.Mesh(geo,mat); m.position.set(LAKE.x,y,LAKE.z); scene.add(m);};
  disc(LAKE.radius,LAKE.bottom-0.2,0x8c9273,1); disc(LAKE.radius,LAKE.surface,0x609a9b,0.42);
  return {drawCalls:3,tris:indices.length/3+128};
}
function bake(root, sky) {
  root.position.set(0,0,0); root.updateMatrixWorld(true);
  const buckets=[[],[]];
  root.traverse(o=>{if(!o.isMesh)return; const mat=o.material; if(Array.isArray(mat)) return;
    let g=o.geometry.clone(); g.applyMatrix4(o.matrixWorld); if(g.index) g=g.toNonIndexed();
    for(const key of Object.keys(g.attributes)) if(key!=='position' && key!=='normal') g.deleteAttribute(key);
    if(!g.attributes.normal) g.computeVertexNormals();
    const c=mat.color || new THREE.Color(1,1,1), cols=[]; for(let i=0;i<g.attributes.position.count;i++) cols.push(c.r,c.g,c.b);
    g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3)); buckets[mat.transparent?1:0].push(g);
  });
  const group=new THREE.Group(); let tris=0,calls=0;
  buckets.forEach((parts,i)=>{if(!parts.length)return; const geo=parts.length===1?parts[0]:mergeGeometries(parts); if(!geo) throw new Error('Could not merge landmark geometry');
    tris+=geo.attributes.position.count/3; calls++; const mat=haze(new THREE.MeshLambertMaterial({vertexColors:true,transparent:!!i,opacity:i?0.5:1,depthWrite:!i,side:i?THREE.DoubleSide:THREE.FrontSide}),sky);
    group.add(new THREE.Mesh(geo,mat)); if(parts.length>1) parts.forEach(g=>g.dispose());
  }); return {group,tris,calls};
}
export function createGiants(scene) {
  const ground=farGround(scene,scene.fog.color), stats=new Map(), loader=new GLTFLoader();
  const files=[...new Set(GIANTS.map(p=>p.file))];
  for(const file of files) loader.load(`assets/giants/${file}`, gltf=>{
    for(const p of GIANTS.filter(p=>p.file===file)) try {
      const root=gltf.scene.getObjectByName(p.node); if(!root) throw new Error(`Missing node ${p.node}`);
      const b=bake(root,scene.fog.color); b.group.position.set(p.x,p.y,p.z); b.group.rotation.y=p.rotationY; b.group.scale.setScalar(p.scale); scene.add(b.group); stats.set(p.id,b);
    } catch(e) { console.warn('Landmark failed:',p.id,e); }
  },undefined,e=>console.warn('Landmark GLB failed:',file,e));
  return { info:()=>{const list=GIANTS.map(p=>{const s=stats.get(p.id);return {id:p.id,x:p.x,z:p.z,dist:Math.hypot(p.x+80,p.z-55),drawCalls:s?.calls||0,tris:s?.tris||0};});return {loaded:stats.size===GIANTS.length,list,extraDrawCalls:ground.drawCalls+list.reduce((a,p)=>a+p.drawCalls,0),extraTris:ground.tris+list.reduce((a,p)=>a+p.tris,0)};} };
}
