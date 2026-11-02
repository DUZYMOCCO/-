import * as THREE from 'three';

// 撮影専用の低ポリ小物。ゲーム起動時には読み込まれない。
export function makeIconProp(id, def = {}) {
  const group = new THREE.Group();
  let hash = 0; for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const mat = (color, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness: .78, metalness });
  const palette = [0x947351,0x9a7860,0x788c83,0x967e5e,0x8b6b66,0x82919b,0xaa946c,0x776d82];
  const main = mat(palette[hash % palette.length]);
  const metal = mat(0x929da1,.48), dark = mat(0x554438), paper = mat(0xd6c29a), accent = mat(0xffffff);
  accent.color.setHSL((hash % 360) / 360, .25 + ((hash >>> 9) % 20) / 100, .36 + ((hash >>> 15) % 15) / 100);
  metal.color.setHSL((hash % 360) / 360, .06 + ((hash >>> 9) % 10) / 100, .48 + ((hash >>> 15) % 15) / 100);
  function add(geo, material, x=0,y=0,z=0, rot=0) { const m = new THREE.Mesh(geo,material); m.position.set(x,y,z); m.rotation.z=rot; group.add(m); return m; }
  const box=(w,h,d,m,x=0,y=0,z=0,r=0)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,r);
  const ball=(r,m,x=0,y=0,z=0)=>add(new THREE.IcosahedronGeometry(r,1),m,x,y,z);
  const cylinder=(r1,r2,h,m,x=0,y=0,z=0,r=0)=>add(new THREE.CylinderGeometry(r1,r2,h,10),m,x,y,z,r);
  const ring=(r,t,m,x=0,y=0,z=0)=>add(new THREE.TorusGeometry(r,t,6,20),m,x,y,z);
  if (def.slot === 'artifact' && id !== 'welding_robot_control_chip') {
    box(.74,.94,.12,paper,0,0,0,-.08); box(.08,.94,.14,accent,-.34,.03,.02,-.08);
    for(let i=0;i<3+(hash%3);i++) box(.43-(i%2)*.12,.025,.015,dark,.05,.23-i*.12,.07,-.08);
    box(.16,.1,.02,accent,.12,-.28,.08,-.08);
  } else if (id.includes('pack') || id === 'grain') {
    box(.72,.84,.32,main); box(.76,.18,.35,dark,0,.25,.02); box(.12,.84,.36,accent,0,0,.03); box(.3,.12,.38,metal,0,.03,.03);
  } else if (id === 'water' || id === 'cactus_rum') {
    cylinder(.25,.32,.65,main,0,-.1); cylinder(.12,.14,.24,accent,0,.33); cylinder(.13,.13,.07,dark,0,.48); box(.36,.19,.03,paper,0,-.08,.3);
  } else if (id === 'net_trap') {
    for(let i=-2;i<=2;i++){ box(.035,.9,.035,main,i*.17,0,0,.22); box(.9,.035,.035,main,0,i*.17,.02,.22); }
  } else if (id === 'shovel') {
    box(.09,.95,.1,main,0,.16,0,-.35); box(.34,.35,.09,metal,-.2,-.39,0,-.35); box(.32,.08,.1,dark,.19,.6,0,-.35);
  } else if (id.includes('ring') || id.includes('necklace') || id.includes('spring') || id.includes('wheel') || id.includes('gear')) {
    ring(.32,.08,metal); if(!id.includes('ring')&&!id.includes('necklace')) { box(.1,.65,.1,accent); box(.65,.1,.1,accent); } else if(id.includes('necklace')) ball(.12,accent,0,-.32,.02);
  } else if (id.includes('sunglasses')) {
    ring(.19,.045,dark,-.22,0); ring(.19,.045,dark,.22,0); box(.14,.05,.05,metal,0,0);
  } else if (id.includes('prosthetic')) {
    box(.2,.65,.22,id.startsWith('iron')?metal:main,0,.1,0,.12); ball(.13,accent,0,-.23); box(.3,.27,.2,id.startsWith('iron')?metal:main,.06,-.38,0,.12);
  } else if (def.slot === 'throwable' || id.includes('sword') || id.includes('blade') || id.includes('tusk') || id === 'bolts' || id === 'quiver') {
    if (id === 'quiver') { cylinder(.23,.18,.8,main); for(let i=-1;i<=1;i++)box(.035,.45,.04,metal,i*.11,.48,0,.1); }
    else { box(.08+(hash%5)*.025,.78+((hash>>>5)%5)*.035,.09,metal,0,.05,0,-.45); box(.28,.12,.12,dark,-.2,-.36,0,-.45); if(id.startsWith('shuriken')) box(.65,.1,.08,metal,0,.03,0,.45); }
  } else if (def.slot === 'food') {
    if(id === 'porridge'||id === 'stew') { cylinder(.42,.24,.25,main,0,-.2); cylinder(.35,.35,.04,accent,0,-.055); for(let i=-1;i<=1;i++)ball(.09,paper,i*.18,0,.03); }
    else { for(let i=-1;i<=1;i++) { const b=ball(.21,id.includes('meat')||id==='salted_rice'?accent:paper,i*.23,0); b.scale.set(1, .65, .65); } box(.8,.045,.05,dark,0,-.22); if(id==='sweet_dumpling') for(let i=-1;i<=1;i++) ball(.045,accent,i*.23,.06,.13); }
  } else if (id === 'cloth' || id.includes('mask') || id.includes('guard') || id.includes('fiber')) {
    box(.72,.56,.18,main,0,0,0,.12); box(.09,.58,.2,accent,0,0,.04,.12); box(.62,.06,.2,paper,0,-.18,.04,.12);
  } else if (id.includes('crystal') || id.includes('shard') || id === 'salt' || id === 'stone' || id.includes('sunstone')) {
    const m=add(new THREE.OctahedronGeometry(.46,0),accent); m.scale.set(.7,1.2,.55); ball(.17,main,-.25,-.25);
  } else if (id.includes('plate') || id === 'iron' || id === 'metal' || id.includes('bar') || id === 'wood') {
    box(.75,.36,.22,id==='wood'?main:metal,0,0,0,.12); box(.63,.055,.04,accent,0,.04,.13,.12);
  } else if (id === 'trinket_charm') {
    box(.35,.65,.12,main); ring(.07,.025,metal,0,.25,.08); box(.05,.32,.03,accent,0,-.08,.08);
  } else {
    const m=add(new THREE.DodecahedronGeometry(.4,0),main); m.rotation.z=.3; box(.48,.1,.15,accent,0,0,.3,.25); ball(.12,metal,.12,.16,.3);
  }
  group.rotation.y = -.18;
  return group;
}
