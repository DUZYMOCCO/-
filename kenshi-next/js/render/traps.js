import * as THREE from 'three';
import { heightAt } from '../sim/terrain.js';

export function createTrapRenderer(scene) {
  const groups = new Map();
  const preview = new THREE.Mesh(new THREE.RingGeometry(.52,.72,24), new THREE.MeshBasicMaterial({ color:0x47df70, transparent:true, opacity:.9, side:THREE.DoubleSide }));
  preview.rotation.x = -Math.PI/2; preview.visible = false; scene.add(preview);
  const mat = (color, opacity = 1) => new THREE.MeshStandardMaterial({ color, roughness: .9, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  function makeTrap(trap) {
    const group = new THREE.Group();
    const visibleMat = mat(trap.type === 'bear_trap' ? 0x383c3b : trap.type === 'net_trap' ? 0x75644d : 0x655d4b, .75);
    if (trap.type === 'pit') {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(.78, 16), mat(0x11100d, trap.state === 'armed' || trap.state === 'digging' ? .45 : .95));
      hole.rotation.x = -Math.PI / 2; hole.position.y = .015; group.add(hole);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(.84, .07, 5, 20), mat(0x594a37, .9)); rim.rotation.x = Math.PI / 2; rim.position.y = .04; group.add(rim);
      if (trap.state === 'armed') for (let i=0;i<4;i++) { const branch = new THREE.Mesh(new THREE.BoxGeometry(1.35,.025,.035), visibleMat); branch.position.y=.08; branch.rotation.y=i*Math.PI/4; group.add(branch); }
    } else if (trap.type === 'net_trap') {
      const lines = [];
      for(let i=-2;i<=2;i++){ lines.push(new THREE.Vector3(-.48,.05,i*.22),new THREE.Vector3(.48,.05,i*.22),new THREE.Vector3(i*.22,.05,-.48),new THREE.Vector3(i*.22,.05,.48)); }
      const geo = new THREE.BufferGeometry().setFromPoints(lines);
      group.add(new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0x9a815c,transparent:true,opacity:.7})));
    } else {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.42,.065,6,20), visibleMat); ring.rotation.x = Math.PI / 2; ring.position.y=.08; group.add(ring);
      for(let i=0;i<8;i++){ const tooth=new THREE.Mesh(new THREE.ConeGeometry(.09,.23,4),mat(0x222423,.9)); const a=i*Math.PI/4; tooth.position.set(Math.cos(a)*.39,.12,Math.sin(a)*.39); if(trap.state==='sprung') tooth.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), new THREE.Vector3(-Math.cos(a)*.85,.5,-Math.sin(a)*.85).normalize()); group.add(tooth); } // はじけたら歯が内側へ閉じる
    }
    scene.add(group); return group;
  }
  // かかった相手を覆う網（作動中だけ）と、足止め中の頭上の印
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.62, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color:0xb89a6a, wireframe:true, transparent:true, opacity:.75 }));
  dome.scale.y = 2.7;
  const badgeMats = new Map();
  function badgeMat(type) {
    if (badgeMats.has(type)) return badgeMats.get(type);
    const c = document.createElement('canvas'); c.width = 96; c.height = 48; const g = c.getContext('2d');
    g.fillStyle = type === 'pit' ? 'rgba(70,45,25,.88)' : type === 'net_trap' ? 'rgba(80,70,40,.88)' : 'rgba(40,44,46,.88)';
    g.beginPath(); g.roundRect ? g.roundRect(2,2,92,44,12) : g.rect(2,2,92,44); g.fill();
    g.strokeStyle = '#e8c66a'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#ffe9a8'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(type === 'pit' ? '穴' : type === 'net_trap' ? '網' : '挟', 48, 26);
    const m = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest:false, transparent:true });
    badgeMats.set(type, m); return m;
  }
  const badges = new Map();
  function update(state, dolls) {
    const live = new Set();
    for (const trap of state.traps || []) {
      if (trap.state === 'removed') continue;
      live.add(trap.id);
      let group = groups.get(trap.id);
      const look = trap.type === 'net_trap' ? '' : trap.state;
      if (!group || group.userData.type !== trap.type || group.userData.look !== look) { if(group) scene.remove(group); group=makeTrap(trap);group.userData.type=trap.type;group.userData.look=look;groups.set(trap.id,group); }
      group.position.set(trap.x,heightAt(trap.x,trap.z),trap.z);
      group.rotation.y = trap.state === 'sprung' ? Math.PI/2 : 0;
      group.visible = true;
      if (trap.victimId != null && trap.type !== 'pit') {
        const victim=state.actors.find(a=>a.id===trap.victimId), doll=victim&&dolls?.getDoll(victim.id);
        if(doll?.group){const c=doll.group.position;group.position.set(c.x,heightAt(c.x,c.z)+.06,c.z);
          if(trap.type==='net_trap' && !group.userData.dome){ group.userData.dome = dome.clone(); group.add(group.userData.dome); }}
      }
    }
    for(const [id,group] of groups) if(!live.has(id)){scene.remove(group);groups.delete(id);}
    const tick = state.tick || 0, held = new Set();
    for (const actor of state.actors || []) {
      if (!((actor.trapRootUntil || 0) > tick) || !actor.trapStatus || actor.state === 'dead') continue;
      const doll = dolls?.getDoll(actor.id); if (!doll?.group) continue;
      let b = badges.get(actor.id);
      if (!b || b.userData.type !== actor.trapStatus) { if (b) scene.remove(b); b = new THREE.Sprite(badgeMat(actor.trapStatus)); b.scale.set(.5,.25,1); b.renderOrder = 20; b.userData.type = actor.trapStatus; scene.add(b); badges.set(actor.id, b); }
      const c = doll.group.position; b.position.set(c.x, c.y + 2.0, c.z); held.add(actor.id);
    }
    for (const [id,b] of badges) if (!held.has(id)) { scene.remove(b); badges.delete(id); }
    // 穴の中の者は見た目だけ腰〜胸まで沈める（全身を沈めると地形に隠れて見えない）
    for(const actor of state.actors||[]) if(actor.pitDepth>0){const doll=dolls?.getDoll(actor.id);if(doll?.group)doll.group.position.y=heightAt(actor.x,actor.z)-Math.min(actor.pitDepth*.5,1.0);}
  }
  function setPlacement(point, valid = false) {
    preview.visible = !!point;
    if (!point) return;
    preview.position.set(point.x, heightAt(point.x,point.z)+.12, point.z);
    preview.material.color.set(valid ? 0x47df70 : 0xe34d42);
  }
  function dispose(){for(const group of groups.values())scene.remove(group);groups.clear();for(const b of badges.values())scene.remove(b);badges.clear();scene.remove(preview);preview.geometry.dispose();preview.material.dispose();}
  return { update, setPlacement, dispose };
}
