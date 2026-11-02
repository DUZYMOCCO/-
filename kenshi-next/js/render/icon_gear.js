import * as THREE from 'three';

// The game's family meshes are shared by several IDs. These lightweight,
// item-specific models are used only by the offline icon studio.
const GROUPS = {
  head: ['bandana','bucket_helm','cloth_hood','conical_hat','face_mask','iron_helmet','kabuto_helm','leather_cap','straw_hat'],
  axe: ['hand_axe','war_axe','scrap_axe','broad_axe'],
  cleaver: ['machete','short_cleaver','broad_cleaver','scrap_cleaver','hook_cleaver'],
  sabre: ['sabre','light_sabre','guard_sabre','broad_sabre','curved_sabre'],
  katana: ['sword','short_katana','field_katana','long_katana','war_katana'],
  polearm: ['short_spear','long_spear','naginata','glaive'],
  club: ['club','wood_club','iron_club','pipe_club','scrap_mace'],
  hammer: ['hammer','iron_maul','spiked_hammer','stone_maul','war_hammer'],
  torso: ['chain_coat','chain_shirt','guard_cuirass','lamellar_body','plate_body','scrap_vest','cloth_robe','cloth_shirt','cloth_tunic','rag_poncho','rag_top','traveler_cape','leather_coat','leather_vest','padded_coat','padded_shirt'],
  legs: ['cloth_pants','cloth_wraps','guard_greaves','heavy_greaves','plate_legs','scrap_greaves','padded_legs','rag_pants'],
  feet: ['guard_boots','heavy_boots','iron_boots','leather_shoes','padded_boots','sandals','scrap_boots'],
};
const LOOKS = new Map(Object.entries(GROUPS).flatMap(([group, ids]) => ids.map((id, i) => [id, {group, i}])));
export const ICON_GEAR_IDS = Object.freeze([...LOOKS.keys()]);

export function makeIconGear(id) {
  const look = LOOKS.get(id); if (!look) return null;
  const { group: kind, i } = look;
  const root = new THREE.Group();
  const material = (color, metalness=0) => new THREE.MeshStandardMaterial({color, metalness, roughness:.8});
  const iron=material([0x929ca0,0x747e83,0xb0b3ad,0x887c70,0x9b9e9e][i%5],.52);
  const wood=material([0x715038,0x806044,0x624536,0x9a7451,0x513c30][i%5]);
  const cloth=material([0x968369,0x9a8068,0x6f7773,0x88735e,0xb19c78,0x6e6257,0x8d786a,0x9b8c72][i%8]);
  const trim=material([0x60463b,0x9c744f,0x504b47,0x765b42,0x574c3e][i%5]);
  const ink=material(0x443930);
  function box(w,h,d,x,y,z,m,r=0) { const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); mesh.position.set(x,y,z);mesh.rotation.z=r;root.add(mesh);return mesh; }
  function poly(points, depth, material, z=0) { const shape=new THREE.Shape(); points.forEach(([x,y],j)=>j?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:1}),material);mesh.position.z=z;root.add(mesh);return mesh; }
  function disk(radius,depth,x,y,z,m) { const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,depth,16),m); mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);root.add(mesh);return mesh; }
  const metal=id.includes('iron')||id.includes('plate')||id.includes('guard')||id.includes('heavy')||id.includes('scrap')||id.includes('chain')||id.includes('lamellar')||id==='bucket_helm'||id==='kabuto_helm';
  if (kind === 'head') {
    if (id==='straw_hat'||id==='conical_hat') {
      poly([[-.49,-.16],[-.28,-.06],[0,.42],[.28,-.06],[.49,-.16],[.43,-.22],[-.43,-.22]],.11,cloth);
      box(.62,.055,.05,0,-.14,.14,trim);
    } else if (id==='bandana'||id==='face_mask') {
      poly([[-.43,.23],[.43,.23],[.37,-.2],[.12,-.34],[-.35,-.2]],.1,cloth);
      box(.65,.06,.04,0,.09,.13,trim);
      if(id==='bandana') poly([[.3,.16],[.54,.03],[.45,-.17],[.28,-.04]],.06,trim,.02);
      else for(let x=-.18;x<=.18;x+=.12)box(.05,.025,.03,x,-.12,.13,ink);
    } else {
      const width=id==='bucket_helm'?.37:.32;
      poly([[-width,-.24],[-width,.13],[-width*.75,.34],[0,.43],[width*.75,.34],[width,.13],[width,-.24],[.13,-.3],[-.13,-.3]],.17,metal?iron:cloth);
      if(id==='cloth_hood'||id==='leather_cap') poly([[-.19,-.11],[-.17,.17],[0,.26],[.17,.17],[.19,-.11]],.03,ink,.18);
      else {box(.49,.07,.04,0,.02,.2,ink);box(.06,.27,.05,0,-.08,.22,trim);}
      if(id==='kabuto_helm'){ box(.9,.07,.12,0,-.25,.06,iron);poly([[-.32,.3],[-.48,.48],[-.2,.38]],.06,trim);poly([[.32,.3],[.48,.48],[.2,.38]],.06,trim); }
    }
  } else if (['sabre','katana','cleaver','polearm','axe','club','hammer'].includes(kind)) {
    const pole=kind==='polearm', heavy=['axe','club','hammer'].includes(kind);
    box(.075,pole?1.35:heavy?.95:.32,.09,0,pole?-.05:heavy?-.05:-.49,0,wood);
    if(kind==='sabre'||kind==='katana'||kind==='cleaver') {
      const broad=kind==='cleaver'||id==='broad_sabre'; const w=(broad?.19:.105)+(i%3)*.015;
      const len=id==='short_katana'||id==='short_cleaver'?.72: id==='long_katana'||id==='war_katana'?.99:.88;
      const curve=kind==='sabre'?.10+i*.012:kind==='cleaver'?.035:0;
      poly([[-w,-.29],[w,-.29],[w+curve,len-.42],[curve,len-.29],[-w+curve,len-.36]],.055,iron);
      box(kind==='sabre'?.4:.31,.065,.1,0,-.31,.01,trim);
      if(id==='guard_sabre')box(.07,.23,.08,.18,-.4,.01,iron,.3);
      if(id==='hook_cleaver')poly([[.12,.38],[.3,.4],[.25,.22],[.14,.25]],.06,iron);
      box(.08,.085,.1,0,-.65,.01,iron);
    } else if (pole) {
      const blade=id==='naginata'||id==='glaive';
      poly([[-(blade?.16:.09),.39],[blade?.12:.09,.39],[blade?.19:.05,.71],[0,.85],[-.08,.7]],.06,iron);
      if(blade) box(.3,.06,.08,0,.37,.01,trim);
    } else if (kind==='axe') {
      const w=id==='broad_axe'?.41:id==='war_axe'?.34:.27;
      poly([[-.02,.37],[w,.5],[w+.06,.27],[w,.08],[-.02,.18]],.11,iron);
      if(id==='scrap_axe')box(.18,.05,.03,.16,.24,.13,trim,.3);
      if(id==='war_axe')poly([[.02,.35],[-.24,.45],[-.28,.27],[-.22,.12],[.02,.2]],.1,iron);
    } else if (kind==='hammer') {
      const w=id==='war_hammer'?.39:.3;
      box(w*2,.24,.22,0,.34,0,id==='stone_maul'?cloth:iron);
      if(id==='spiked_hammer')for(const x of [-.22,0,.22])poly([[x-.06,.46],[x,.58],[x+.06,.46]],.08,iron);
      if(id==='war_hammer')poly([[.28,.45],[.5,.34],[.28,.25]],.1,iron);
    } else {
      const head=id==='club'||id==='wood_club'?wood:iron;
      box(id==='pipe_club'?.14:.24,.48,.18,0,.28,0,head);
      if(id==='scrap_mace') for(const y of [.12,.27,.42])box(.4,.045,.1,0,y,.01,iron);
      else box(.25,.055,.19,0,.08,.02,trim);
    }
    root.rotation.z=-.2;
  } else if (kind==='torso') {
    const long=/robe|coat|cape|poncho/.test(id), vest=/vest|cuirass|plate_body|lamellar/.test(id);
    const main=metal?iron:cloth, hem=long?-.52:-.34;
    poly([[-.21,.42],[.21,.42],[.31,.32],[vest?.32:.49,.2],[vest?.28:.39,-.04],[.27,.01],[.3,hem],[-.3,hem],[-.27,.01],[vest?-.28:-.39,-.04],[vest?-.32:-.49,.2],[-.31,.32]],.12,main);
    poly([[-.15,.42],[0,.24],[.15,.42]],.025,ink,.14);
    if(id.includes('chain')||id==='lamellar_body') for(let y=-.23;y<.2;y+=.105)box(.5,.025,.025,0,y,.15,trim);
    else if(metal) {box(.45,.3,.04,0,.02,.14,iron);box(.075,.5,.04,0,-.04,.18,trim);}
    else {box(.06,.57,.035,0,-.04,.14,trim);box(.54,.055,.04,0,hem+.16,.15,trim);}
    if(id==='traveler_cape'||id==='rag_poncho')box(.72,.06,.04,0,.19,.16,trim);
    if(id==='scrap_vest') {box(.16,.13,.03,-.14,.11,.2,cloth,.1);box(.12,.18,.03,.14,-.1,.2,trim,-.1);}
    for(let j=0;j<(i%4)+1;j++)disk(.025,.02,-.2+j*.12,-.19,.19,trim);
  } else if (kind==='legs') {
    const main=metal?iron:cloth, width=id==='heavy_greaves'?.23:.19;
    for(const side of [-1,1]) {
      const x=side*.21;
      poly([[x-width,.37],[x+width,.37],[x+width*.8,-.4],[x-width*.8,-.4]],.12,main);
      if(metal) {box(width*1.5,.28,.04,x,-.04,.14,iron);for(const y of [-.28,.18])box(width*1.7,.045,.035,x,y,.17,trim);}
      else if(id==='cloth_wraps') for(let y=-.3;y<.3;y+=.14)box(width*1.8,.045,.03,x,y,.14,trim,side*.15);
      else box(width*1.6,.045,.03,x,-.28,.14,trim);
    }
    box(.75,.09,.16,0,.37,.02,trim);
  } else {
    const main=metal?iron:cloth;
    for(const side of [-1,1]) {
      const x=side*.23, h=id==='sandals'?.12:id==='leather_shoes'?.27:.45;
      poly([[x-.15,-.32],[x+.16,-.32],[x+.19,-.2],[x+.13,-.15],[x+.12,-.15+h],[x-.12,-.15+h],[x-.12,-.18],[x-.2,-.23]],.14,main);
      box(.32,.055,.04,x,-.28,.16,trim);
      if (id === 'heavy_boots') box(.25,.17,.04,x,-.17,.18,iron);
      if (id === 'scrap_boots') box(.13,.11,.04,x+side*.04,-.19,.18,wood,side*.2);
      if(id==='sandals')box(.28,.06,.04,x,-.18,.17,trim,side*.3);
      else {box(.22,.055,.04,x,-.07,.17,trim);if(metal)disk(.035,.02,x,.04,.19,trim);}
    }
  }
  root.rotation.y = -.12;
  return root;
}
