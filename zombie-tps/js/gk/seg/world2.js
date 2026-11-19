// ワールド2の 一本道。出口・部屋の壁は既存ステージと同じセグメント規約。
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=46';
const data = {
 hospital: { names:['うけつけ','びょうしつ ろうか','しゅじゅつしつ','おくじょう'], ground:'tile', far:'hospital', backdrop:'hospital', wall:'wall', color:0xaab8bd, floor:0x9daeb0 },
 base: { names:['ゲート','へいしゃ','かくのうこ','かっそうろ'], ground:'concrete', far:'base', backdrop:'base', wall:'hesco', color:0x777e62, floor:0x6c7462 },
 forest: { names:['もりの こみち','ぬまへの みち','ぬま','もりの ひろば'], ground:'dirt', far:'forest', backdrop:'camp', wall:'log', color:0x526548, floor:0x586f50 },
 factory: { names:['せいぞう ライン','そうこ','ようせつば','ろ'], ground:'concrete', far:'base', backdrop:'base', wall:'metal', color:0x6d7472, floor:0x656d69 },
 ship: { names:['かんぱん','せんしつ','きかんしつ','せんしゅ'], ground:'metal', far:'harbor', backdrop:'harbor', wall:'metal', color:0x627982, floor:0x657578 },
 snow: { names:['ゆきみち','きち いりぐち','けんきゅうとう','ヘリポート'], ground:'concrete', far:'base', backdrop:'base', wall:'wall', color:0xc5d1d4, floor:0xc4d0d1 },
 hive: { names:['どうくつ','たまごの へや','むしの す','じょおうの ま'], ground:'dirt', far:'forest', backdrop:'camp', wall:'dirt', color:0x5f6746, floor:0x697250 },
 airfield: { names:['かんせいとう','かくのうこ','かっそうろ','そらの ひろば'], ground:'asphalt', far:'base', backdrop:'base', wall:'metal', color:0x707d84, floor:0x596568 },
 ruins: { names:['いせきの いりぐち','いしの ろうか','たいまつの へや','グールの ま'], ground:'dirt', far:'base', backdrop:'camp', wall:'brick', color:0x807057, floor:0x796c54 },
 bridge: { names:['はしの いりぐち','はしの まえ','はしの なか','はしの おわり'], ground:'asphalt', far:'city', backdrop:'city', wall:'concrete', color:0x70777b, floor:0x646b6e },
};
export function buildWorld2(builder, id, part) {
 const C=data[id], a=part===0, B=builder(36, 6000+Object.keys(data).indexOf(id)*10+part), width=id==='bridge'||id==='ship'?10:16;
 const edge={h:4.2,tint:C.color,mat:C.wall}, doors=[{x:0,z:0,axis:'x'}];
 const entry=a?null:{x:0,z:34,axis:'x'}, exit=a?{x:0,z:-34,axis:'x'}:null;
 const rooms=[{name:C.names[part*2],b:[-width,0,width,34]},{name:C.names[part*2+1],b:[-width,-34,width,0]}];
 segOuter(B,[-width,-34,width,34],a?['s','w','e']:['n','w','e'],edge);
 const W={h:3.8,dw:4.4,tint:C.color,mat:C.wall,trim:null};
 segWall(B,'x',0,-width,width,[0],W); segDoor(B,doors[0],0);
 if(entry){segWall(B,'x',34,-width,width,[0],{...W,edge:'in'});segDoor(B,entry,'in',{edge:'in'});}
 if(exit){segWall(B,'x',-34,-width,width,[0],W);segDoor(B,exit,'out');}
 if(a) B.reserve(-4,25,4,34);
 for(let room=0;room<2;room++) {
  const zc=room===0?17:-17, n=part*2+room;
  B.deco(C.ground,0,0.005,zc,width*2-1,0.025,32,{tint:C.floor});
  if(id==='hospital') {
   for(const z of [zc-9,zc,zc+9]) for(const x of [-width+3,width-3]) {
    B.add('metal',x,0,z,2.7,0.65,1.2,{tint:0xc9d5d4}); B.deco('tile',x,0.65,z,2.3,0.25,0.9,{tint:0xd9e1d8});
   }
   if(n===0) B.add('metal',-7,0,zc,3.4,1.1,1.2,{tint:0x8eaaa8});
   if(n===2) for(const x of [-9,9]) B.deco('light',x,2.7,zc,2,0.2,1);
   if(n===3) for(const x of [-11,11]) B.add('metal',x,0,zc,3,1.8,3,{tint:0x8b9a9b});
  } else if(id==='forest') {
   for(const z of [zc-11,zc-3,zc+6,zc+12]) for(const x of [-width+3,width-3]) B.tree(x,z,3.5,0x8ca77e,0.8);
   if(n>=1) for(const z of [zc-8,zc+4]) B.deco('water',0,0.04,z,8,0.05,4,{tint:0x527c67});
  } else if(id==='base') {
   B.deco('metal',-width+1.5,2,zc,1,0.8,1,{tint:0x777d67}); B.deco('dark',-width+2.1,2.25,zc,1.3,0.3,0.3);
   for(const z of [zc-10,zc,zc+10]) { B.crate(-width+3,z,1,0x8b886b); B.bags(width-3,z,'z',3); }
   if(n===3) for(const z of [zc-12,zc-4,zc+4,zc+12]) B.deco('paint',0,0.04,z,0.3,0.02,3,{tint:0xf0ce76});
  } else if(id==='factory') {
   for(const x of [-9,9]) for(const z of [zc-10,zc,zc+10]) { B.add('metal',x,0,z,2,1.2,2,{tint:0x858c80}); B.deco(n===3?'ember':'stripe',x,1.2,z,1.5,0.15,1.5); }
   for(const x of [-5,5]) B.deco('dark',x,0.03,zc,2.8,0.08,24);
  } else if(id==='ship') {
   for(const z of [zc-10,zc,zc+10]) for(const x of [-width+2,width-2]) { B.add('metal',x,0,z,1,2,2,{tint:0x5b7578}); B.deco('light',x,2,z,0.4,0.2,0.4); }
   if(n===2) for(const z of [zc-8,zc+5]) B.add('metal',0,0,z,3,1.4,2,{tint:0x8e8270});
  } else if(id==='snow') {
   for(const z of [zc-10,zc,zc+10]) for(const x of [-width+3,width-3]) { B.add('concrete',x,0,z,2,1,2,{tint:0xc6d6d6}); B.deco('tile',x,1,z,2.2,0.1,2.2,{tint:0xe5eeee}); }
   if(n===3) B.deco('paint',0,0.04,zc,7,0.02,7,{tint:0xc4d3c4});
  } else if(id==='hive') {
   for(const z of [zc-10,zc,zc+10]) for(const x of [-width+3,width-3]) { B.add('dirt',x,0,z,2,2,2,{tint:0x67704b}); B.deco('leaves',x,2,z,1.5,1,1.5,{tint:0x9aac72,foliage:'round'}); }
   for(const z of [zc-6,zc+6]) B.deco('water',0,0.04,z,5,0.03,3,{tint:0x809b5e});
  } else if(id==='airfield') {
   for(const z of [zc-10,zc,zc+10]) for(const x of [-width+3,width-3]) B.crate(x,z,1,0x7b8074);
   for(const z of [zc-12,zc-4,zc+4,zc+12]) B.deco('paint',0,0.04,z,0.3,0.02,3,{tint:0xc6cbb9});
  } else if(id==='ruins') {
   for(const z of [zc-10,zc,zc+10]) for(const x of [-width+3,width-3]) { B.add('brick',x,0,z,1.5,2.7,1.5,{tint:0x948164}); B.deco('ember',x,2.7,z,0.4,0.4,0.4); }
  } else {
   for(const z of [zc-10,zc,zc+10]) for(const x of [-width+1,width-1]) B.add('metal',x,0,z,0.4,1.2,6,{tint:0x7c8183});
   for(const z of [zc-12,zc-4,zc+4,zc+12]) B.deco('paint',0,0.04,z,0.25,0.02,3,{tint:0xb0aaa0});
  }
 }
 roomSpawns(B,rooms);
 return B.done({ground:C.ground,tint:C.floor,k:0.25,far:C.far},{backdrop:C.backdrop,playerStart:a?{x:0,z:28,yaw:0}:null,seg:{rooms,doors,entry,exit,doorW:4.4,doorH:3.8}});
}
