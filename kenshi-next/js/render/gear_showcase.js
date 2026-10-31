import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { armorPlan, buildArmorGeometry, createArmorLooks } from './armor_look.js';
import { buildCrossbowGeometry, CROSSBOW_IDS } from './crossbow_geometry.js';
import { proceduralWeapon } from './procedural_weapon.js';
import { weaponModel } from './weapons_v3.js';

const canvas = document.getElementById('game');
document.getElementById('boot')?.remove();
document.getElementById('hud')?.remove();
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x283038);
const camera = new THREE.PerspectiveCamera(38, 1, .1, 100); camera.position.set(0, 5, 17); camera.lookAt(0, 1, 0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x53535a, 2));
const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(3,8,5); scene.add(sun);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), new THREE.MeshStandardMaterial({ color: 0x54504a })); floor.rotation.x=-Math.PI/2; scene.add(floor);
const bones = ['Head','spine_02','upperarm_l','upperarm_r','lowerarm_l','lowerarm_r','pelvis','calf_l','calf_r','foot_l','foot_r'];
const parts = [ [0,1.65,0,.28,.32,.24], [0,1.19,0,.5,.58,.25], [-.35,1.25,0,.17,.43,.17], [.35,1.25,0,.17,.43,.17], [-.4,.88,0,.14,.35,.14], [.4,.88,0,.14,.35,.14], [0,.86,0,.44,.2,.24], [-.14,.42,0,.18,.72,.19], [.14,.42,0,.18,.72,.19], [-.14,.08,.04,.2,.13,.29], [.14,.08,.04,.2,.13,.29] ];
// Combine simple skinned mannequin parts so the same in-game armour builder is used.
const positions=[], normals=[], indices=[], skin=[], weights=[];
parts.forEach((p, b) => { const g=new THREE.SphereGeometry(.5,12,8).toNonIndexed(); g.scale(p[3],p[4],p[5]); g.translate(p[0],p[1],p[2]); const pos=g.attributes.position, nor=g.attributes.normal; for(let i=0;i<pos.count;i++){positions.push(pos.getX(i),pos.getY(i),pos.getZ(i)); normals.push(nor.getX(i),nor.getY(i),nor.getZ(i)); skin.push(b,0,0,0);weights.push(1,0,0,0);indices.push(indices.length);} g.dispose(); });
const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3)); geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skin,4)); geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4)); geometry.setIndex(indices);
const sets = [ ['straw_hat','rag_poncho','rag_pants'], ['cloth_hood','leather_coat','leather_leggings'], ['kabuto_helm','guard_cuirass','guard_greaves'], ['bucket_helm','box_plate','heavy_greaves'], ['iron_helmet','plate_body','plate_legs'], ['conical_hat','cloth_robe','cloth_wraps'] ];
const mannequins=[];
sets.forEach((set,i)=>{ const group=new THREE.Group(); mannequins.push(group); group.position.x=(i-2.5)*1.7; group.position.z=-1.4; scene.add(group); const body=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x9b806c})); group.add(body); const equip={head:{id:set[0],variant:i%3},upperOut:{id:set[1],variant:i%3},[set[2]==='cloth_wraps'?'lowerIn':'lowerOut']:{id:set[2],variant:i%3}}; const g=buildArmorGeometry(THREE,{geometry,boneNames:bones},armorPlan({id:i+1,faction:i===0?'bandit':'guard',equip})); group.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8}))); });
const ids=['short_katana','field_katana','guard_sabre','broad_cleaver','war_hammer','long_spear','naginata','war_axe','scrap_mace'];
const rack=new THREE.Mesh(new THREE.BoxGeometry(11,.09,.18),new THREE.MeshStandardMaterial({color:0x654c36})); rack.position.set(0,1.1,2); scene.add(rack);
const weapons=[];
ids.forEach((id,i)=>{const w=proceduralWeapon(id,i%3); weapons.push(w); w.position.set((i-4)*1.15,1.0,2); w.rotation.x=-Math.PI/2; scene.add(w);});
function resize(){
  const portrait=innerWidth < innerHeight;
  mannequins.forEach((g,i)=>{g.position.x=portrait?(i%3-1)*1.05:(i-2.5)*1.7; g.position.y=portrait?(i<3?2.2:0):0;});
  rack.position.set(0,portrait?.4:1.1,2); rack.scale.x=portrait?.48:1;
  weapons.forEach((w,i)=>{w.position.set((i-4)*(portrait?.56:1.15),portrait?.3:1,2); w.scale.setScalar(portrait?.75:1);});
  camera.position.set(0,portrait?4.4:5,portrait?9.5:15); camera.lookAt(0,portrait?1.8:1,0);
  renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.render(scene,camera);} window.addEventListener('resize',resize);resize();
const focus = new URLSearchParams(location.search).get('focus');
if (!focus) {
  const looks = createArmorLooks(THREE), updates = [], mixers = []; let last = performance.now();
  new GLTFLoader().load('assets/doll.glb', gltf => {
    mannequins.forEach((group, i) => {
      group.clear(); const root = clone(gltf.scene); group.add(root);
      const set = sets[i];
      const equip = {head:{id:set[0],variant:i%3},upperOut:{id:set[1],variant:i%3},[set[2]==='cloth_wraps'?'lowerIn':'lowerOut']:{id:set[2],variant:i%3}};
      const actor = {id:i+1,faction:i===0?'bandit':'guard',equip}, doll = {root,kind:'m'};
      updates.push(() => looks.apply(doll,actor)); looks.apply(doll,actor);
      const idle = gltf.animations.find(c => c.name.toLowerCase() === 'idle');
      if (idle) { const mixer = new THREE.AnimationMixer(root); mixer.clipAction(idle).play(); mixers.push(mixer); }
    });
  });
  function frame(now) { const dt=Math.min(.1,(now-last)/1000); last=now; updates.forEach(f => f()); mixers.forEach(m => m.update(dt)); renderer.render(scene,camera); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
}

if (focus === 'armour') {
  weapons.forEach(g=>scene.remove(g)); scene.remove(rack, floor); mannequins.forEach(g=>scene.remove(g));
  const real = [];
  const mixers = [];
  let lastFrame = performance.now();
  function animateArmour(now) {
    const dt = Math.min(.1, (now - lastFrame) / 1000); lastFrame = now;
    mixers.forEach(m => m.update(dt)); renderer.render(scene, camera);
    requestAnimationFrame(animateArmour);
  }
  requestAnimationFrame(animateArmour);
  const armourLooks = createArmorLooks(THREE);
  new GLTFLoader().load('assets/doll.glb', gltf => {
    window.__armourCounts = [];
    [0,2,3].forEach((n,i) => {
      const root = clone(gltf.scene); let body = null;
      root.traverse(o => { if (o.isSkinnedMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; });
      const set=sets[n]; const equip={head:{id:set[0]},upperOut:{id:set[1]},lowerOut:{id:set[2]}};
      const actor = {id:1,faction:'guard',equip};
      const doll = {root, kind:'m'};
      armourLooks.apply(doll,actor);
      const refresh = () => armourLooks.apply(doll,actor);
      const mixerUpdate = { update: refresh }; mixers.push(mixerUpdate);
      const idle = gltf.animations.find(c => c.name.toLowerCase() === 'idle');
      if (idle) { const mixer = new THREE.AnimationMixer(root); mixer.clipAction(idle).play(); mixers.push(mixer); }
      scene.add(root); real.push(root);
    }); armourResize();
  });
  function armourResize(){ const portrait=innerWidth<innerHeight; real.forEach((g,i)=>g.position.set(portrait?0:(i-1)*1.1, portrait?(1-i)*1.9:0,0)); camera.position.set(0,portrait?.85:1.1,portrait?9.5:5.5); camera.lookAt(0,portrait?.85:1,0); camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); renderer.render(scene,camera); }
  window.removeEventListener('resize',resize); window.addEventListener('resize',armourResize); armourResize();
}
if (focus === 'weapons') import('./weapon_showcase.js');
if (focus === 'crossbow') {
  mannequins.forEach(g => scene.remove(g)); weapons.forEach(g => scene.remove(g)); scene.remove(rack, floor);
  const wood = new THREE.MeshStandardMaterial({color:0x765037});
  const metal = new THREE.MeshStandardMaterial({color:0xa3adb0,metalness:.4,roughness:.6});
  const focusScene = new THREE.Group(); focusScene.scale.setScalar(.84); scene.add(focusScene);
  const rows = focus === 'crossbow' ? CROSSBOW_IDS : ['short_katana','guard_sabre','broad_cleaver','war_hammer','naginata','war_axe','scrap_mace','crossbow'];
  rows.forEach((id,r) => (focus === 'weapons' ? [0] : [0,1,2]).forEach(v => {
    const obj = focus === 'crossbow' || id === 'crossbow' ? buildCrossbowGeometry(THREE,id,v,{wood,metal}) : proceduralWeapon(id,v);
    if (focus === 'weapons') { let attempts = 0; const refresh = () => { const model = weaponModel(id,v); if (model) { obj.clear(); obj.add(model); renderer.render(scene,camera); } else if (++attempts < 40) setTimeout(refresh, 250); }; refresh(); }
    obj.rotation.x = -Math.PI / 2; obj.rotation.z = focus === 'weapons' ? -.4 : 0;
    const cell = new THREE.Group(); cell.add(obj); cell.position.set((v-1)*1.3, (1.5-r)*1.5, 0); focusScene.add(cell);
  }));
  function focusResize() {
    const portrait=innerWidth<innerHeight; if (focus === 'weapons') { focusScene.children.forEach((obj,i)=>{ obj.position.set(portrait ? 0 : (i%4-1.5)*2.35, portrait ? (3.5-i)*1.9 : (.5-Math.floor(i/4))*2.3, 0); obj.scale.setScalar(i === 4 ? 1.3 : 2.1); }); } if (focus === 'crossbow') { focusScene.children.forEach((obj,i)=>{ obj.rotation.z = 0; obj.position.set(portrait ? (i%2-.5)*1.7 : (i%3-1)*2, portrait ? (2.5-Math.floor(i/2))*2.15 : (1.5-Math.floor(i/3))*2.3, 0); obj.scale.setScalar(1.5); }); } const scroll = portrait && (focus === 'crossbow' || focus === 'weapons'); focusScene.position.y = scroll && focus === 'crossbow' ? 2.5 : 0; const height = scroll ? (focus === 'crossbow' ? 2100 : 2600) : innerHeight; document.documentElement.style.overflowY = scroll ? 'auto' : ''; document.body.style.overflowY = scroll ? 'auto' : ''; document.body.style.height = scroll ? height+'px' : ''; document.body.style.touchAction = scroll ? 'pan-y' : ''; canvas.style.position = scroll ? 'absolute' : ''; canvas.style.touchAction = scroll ? 'pan-y' : ''; camera.position.set(0,0,portrait ? (focus === 'crossbow' ? 25 : 25) : (focus === 'crossbow' ? 14 : 10)); camera.lookAt(0,0,0);
    camera.aspect=innerWidth/height; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,height); renderer.render(scene,camera);
  }
  window.removeEventListener('resize',resize); window.addEventListener('resize',focusResize); focusResize();
}




