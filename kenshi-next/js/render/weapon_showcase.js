import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { createCrossbows } from './crossbows.js';

const rows = [ ['Katana','short_katana'], ['Sabre','guard_sabre'], ['Cleaver','broad_cleaver'], ['Hammer','war_hammer'], ['Polearm','naginata'], ['Axe','war_axe'], ['Club','scrap_mace'], ['Crossbow','crossbow'] ];
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const scene = new THREE.Scene(); scene.background = new THREE.Color('#e8e8e4');
const studio = new THREE.Scene(); studio.background = new THREE.Color(0x88949e);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(studio).texture;
scene.add(new THREE.HemisphereLight(0xffffff,0x8e8e87,2));
const light = new THREE.DirectionalLight(0xffffff,2); light.position.set(-3,4,8); scene.add(light);
const fill = new THREE.DirectionalLight(0xffffff,1); fill.position.set(4,3,-6); scene.add(fill);
const camera = new THREE.OrthographicCamera(-1,1,1,-1,.1,100); camera.position.set(0,0,30);
const actors=[], dolls=new Map(), mixers=[];
const weapons=createCrossbows(scene, {});
const labels=document.createElement('div'); labels.id='weapon-labels'; document.body.appendChild(labels);
Object.assign(labels.style,{position:'absolute',left:'0',top:'0',width:'100%',pointerEvents:'none',font:'bold 14px sans-serif',color:'#303536'});
const loader = new GLTFLoader();
loader.load('assets/doll.glb', gltf => {
  rows.forEach(([name,id],r) => [0,1,2].forEach(v => {
    const group=new THREE.Group(), root=clone(gltf.scene); group.add(root); scene.add(group);
    const actor={id:r*3+v+1,weapon:id,equip:{weapon:[{id,variant:v}]},crossbow:id==='crossbow'?{bolts:10,loaded:true}:null,aiming:id==='crossbow',state:'fight',targetId:999,carryingId:null,anim:'Idle',animTick:0};
    const doll={root,group,kind:'m'}; actors.push(actor); dolls.set(actor.id,doll);
    const idle=gltf.animations.find(c=>c.name.toLowerCase()==='idle');
    if(idle){const mixer=new THREE.AnimationMixer(root); mixer.clipAction(idle).play(); mixers.push(mixer);}
  }));
  layout();
});
function layout(){
  const phone=innerWidth<600, columns=phone?2:3, rowCount=Math.ceil(actors.length/columns) || 1;
  const cellWidth=innerWidth/columns, cellHeight=Math.round(cellWidth*1.28), height=rowCount*cellHeight;
  document.documentElement.style.overflowY='auto'; document.body.style.overflowY='auto'; document.body.style.height=height+'px'; document.body.style.touchAction='pan-y';
  canvas.style.position='absolute'; canvas.style.top='0'; canvas.style.left='0'; canvas.style.touchAction='pan-y';
  renderer.setSize(innerWidth,height); const unit=3.0; const width=columns*unit, h=height/innerWidth*width;
  camera.left=-width/2;camera.right=width/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();
  labels.innerHTML='';
  actors.forEach((actor,i)=>{const r=Math.floor(i/3),v=i%3,col=i%columns,row=Math.floor(i/columns); const doll=dolls.get(actor.id);
    doll.group.position.set(-width/2+(col+.5)*unit,h/2-(row+.85)*h/rowCount,0);
    doll.group.rotation.y=actor.weapon === 'crossbow' ? 1.0 : -.35;
    const label=document.createElement('div'); label.textContent=rows[r][0]+' — '+(v+1); Object.assign(label.style,{position:'absolute',left:(col*cellWidth)+'px',top:(row*cellHeight+8)+'px',width:cellWidth+'px',textAlign:'center'}); labels.appendChild(label);
  });
}
window.addEventListener('resize',layout); layout();
let last=performance.now();
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now; mixers.forEach(m=>m.update(dt));scene.updateMatrixWorld(true);weapons.update({actors,projectiles:[],tick:100},{getDoll:id=>dolls.get(id)},1,dt);renderer.render(scene,camera);requestAnimationFrame(frame);} requestAnimationFrame(frame);










