// 床の影で予告してから落下。見た目のみで人にも味方にも当たらない。
import * as THREE from '../../../vendor/three.module.min.js';
export function create(game) {
 const group=new THREE.Group(), shadow=new THREE.Mesh(new THREE.CircleGeometry(1,16).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:0.4,depthWrite:false})), rock=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.4,1.4),new THREE.MeshLambertMaterial({color:0x766f65}));
 group.add(shadow,rock);game.scene.add(group);group.visible=false;let t=0,x=0,z=0;
 return {tick(dt){t+=dt;const phase=t%9;if(phase<5){group.visible=false;return;}if(phase-dt<5){x=game.pos.x+3;z=game.pos.z-3;}group.visible=true;group.position.set(x,0,z);shadow.position.y=0.04;shadow.scale.setScalar(phase<7?0.5+(phase-5)*0.45:1.4);rock.visible=phase>=7&&phase<8;rock.position.y=phase<8?Math.max(0.7,9-(phase-7)*12):0.7;},remap(){},dispose(){game.scene.remove(group);shadow.geometry.dispose();shadow.material.dispose();rock.geometry.dispose();rock.material.dispose();}};
}
