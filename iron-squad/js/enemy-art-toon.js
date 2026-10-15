// Rounded silhouettes, a dark contour and restrained upper-left light, like the
// established field soldiers. Paint only: no RNG, unit mutation or game timers.
const TAU=Math.PI*2,INK='#283337';
const line=(c,points,color,width=2)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
const oval=(c,x,y,rx,ry,color,edge=INK)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=1.2;c.stroke();}};
const path=(c,color,draw,edge=INK)=>{c.beginPath();draw(c);c.closePath();c.fillStyle=color;c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=1.2;c.stroke();}};
const shade=(c,light,mid,dark,x=-15,y=-40,w=30,h=40)=>{const g=c.createLinearGradient(x,y,x+w,y+h);if(!g?.addColorStop)return mid;g.addColorStop(0,light);g.addColorStop(.45,mid);g.addColorStop(1,dark);return g;};
const eyes=(c,x,y,color='#edcf80')=>{oval(c,x,y,1.7,1.7,color,null);oval(c,x+5,y-.3,1.5,1.6,color,null);};
const horn=(c,x,y,dir=1,length=22)=>{c.strokeStyle=INK;c.lineWidth=5;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+dir*15*length/22,y-length*.82,x+dir*6*length/22,y-length);c.stroke();c.strokeStyle='#d9ceab';c.lineWidth=3;c.stroke();};
const spear=(c,x=16,top=-52)=>{line(c,[[x,2],[x,top+7]],'#9a8154',2.5);path(c,'#c4d0c8',b=>{b.moveTo(x,top);b.quadraticCurveTo(x-5,top+9,x-3,top+12);b.lineTo(x+3,top+12);b.quadraticCurveTo(x+5,top+9,x,top);});};
const shield=(c,x,y,color)=>{path(c,shade(c,'#b3b79a',color,'#344844'),b=>{b.moveTo(x-8,y-10);b.quadraticCurveTo(x,y-14,x+8,y-10);b.lineTo(x+7,y+3);b.quadraticCurveTo(x,y+12,x-7,y+3);});oval(c,x,y,2,2,'#c2b48b');};
function person(c,p,step,{cloak='#74644e',skin='#b9a077',hood=false,armor=false}={}){
 line(c,[[-5,-12],[-6+step,0]],'#343a39',5);line(c,[[5,-12],[6-step,0]],'#343a39',5);
 oval(c,-6+step,1,4,2.3,'#4d4c41');oval(c,6-step,1,4,2.3,'#4d4c41');
 path(c,shade(c,p.flash?'#f3eddb':'#b8ad8a',p.flash?'#d6d4c6':cloak,'#3b4441'),b=>{b.moveTo(-8,-30);b.quadraticCurveTo(0,-35,8,-30);b.quadraticCurveTo(12,-19,10,-9);b.quadraticCurveTo(0,-5,-10,-9);b.quadraticCurveTo(-12,-19,-8,-30);});
 line(c,[[-8,-27],[-12,-17],[-9,-12]],cloak,5);line(c,[[8,-27],[12,-19],[14,-14]],cloak,5);
 line(c,[[-9,-10],[9,-10]],'#403c32',3);oval(c,0,-10,1.8,1.5,'#c5aa6c');
 if(armor){line(c,[[-6,-26],[-5,-14]],'#bbc3b480',2);line(c,[[3,-27],[7,-24],[6,-16]],'#202f3980',3);}
 oval(c,0,-38,7.5,8,p.flash?'#efe3c5':skin);
 if(hood){path(c,shade(c,'#b4a68b',cloak,'#41463e'),b=>{b.moveTo(-8,-34);b.quadraticCurveTo(-12,-51,0,-50);b.quadraticCurveTo(13,-49,9,-33);b.quadraticCurveTo(5,-44,0,-44);b.quadraticCurveTo(-5,-44,-8,-34);});}
 oval(c,4,-36,3.6,2.4,p.flash?'#f3ead6':skin,null);line(c,[[2,-39],[5,-39]],'#253339',1.8);line(c,[[3,-33],[6,-33]],'#6f5e4e',1);
}
function archer(c,p){
 line(c,[[-9,-25],[-13,-40]],'#634b35',5);for(let i=0;i<3;i++)line(c,[[-12+i*2,-35],[-15+i*2,-46]],'#c5b58e',1);
 person(c,p,p.step,{cloak:'#887657',hood:true});
 c.strokeStyle='#b39663';c.lineWidth=3;c.beginPath();c.moveTo(14,-36);c.quadraticCurveTo(32,-23,15,-9);c.stroke();line(c,[[14,-36],[15,-9]],'#d3c7a3',1);line(c,[[5,-24],[23,-24]],'#bca36f',1.4);oval(c,15,-24,2.5,2.5,'#ba9f76');
}
function dog(c,p,color='#a58c64',snow=false,hell=false){
 const dark=hell?'#292e38':snow?'#7d949a':'#635746',light=hell?'#676a71':snow?'#ecedde':'#cfb78a';
 for(const [x,dy] of [[-12,0],[-6,1],[10,1],[16,0]])line(c,[[x,-12],[x+(dy?p.step:-p.step),1]],dark,4);
 c.strokeStyle=dark;c.lineWidth=5;c.beginPath();c.moveTo(-16,-16);c.quadraticCurveTo(-29,-16,-30,-27);c.stroke();
 oval(c,-1,-16,20,11,shade(c,light,p.flash?'#e3e0d4':color,dark,-20,-27,42,22));
 oval(c,14,-21,10,10,shade(c,light,color,dark));oval(c,23,-17,7,4.5,light);oval(c,28,-18,2.3,2,'#2a3336');
 path(c,dark,b=>{b.moveTo(8,-27);b.quadraticCurveTo(6,-41,15,-29);b.lineTo(17,-25);});
 oval(c,18,-24,2,1.6,hell?'#f2b66b':'#e5c980',null);line(c,[[21,-13],[27,-14]],dark,1.4);line(c,[[-12,-20],[-4,-23],[3,-22]],light,1.7);
 if(snow){oval(c,33,-18,7,3,'#c8e7df55',null);oval(c,40,-20,4,2,'#c8e7df33',null);}
 if(hell)for(let i=0;i<4;i++)flame(c,-12+i*8,-22-i%2*3,7,15,'#b9643e','#e4af60');
}
function rider(c,p){
 for(const [x,s] of [[-15,1],[-8,-1],[12,-1],[20,1]])line(c,[[x,-15],[x+p.step*s*1.4,2]],'#4b4038',4.5);
 c.strokeStyle='#393b36';c.lineWidth=5;c.beginPath();c.moveTo(-18,-18);c.quadraticCurveTo(-32,-13,-28,1);c.stroke();
 oval(c,0,-19,23,12,shade(c,'#b49d72','#887254','#4f4940',-24,-34,48,34));
 path(c,'#998360',b=>{b.moveTo(13,-24);b.quadraticCurveTo(16,-43,24,-43);b.quadraticCurveTo(35,-40,33,-31);b.quadraticCurveTo(22,-34,23,-17);});
 oval(c,30,-36,10,6,'#baa37a');oval(c,37,-35,3,3,'#625746');line(c,[[22,-43],[21,-49],[25,-44]],'#51473d',2.5);oval(c,27,-39,1.4,1.4,'#202c30',null);
 line(c,[[18,-39],[14,-26],[8,-29]],'#3c4039',2);oval(c,-1,-25,10,4,'#54493c');
 c.save();c.translate(-3,-25);c.scale(.67,.67);person(c,p,p.step*.2,{cloak:'#687976',hood:true});c.restore();
 spear(c,21,-64);line(c,[[2,-39],[21,-36]],'#b39b75',3);line(c,[[-9,-22],[-11,-8]],'#414c4b',4);
}
function bull(c,p){
 for(const [x,s] of [[-16,1],[-8,-1],[13,-1],[20,1]])line(c,[[x,-16],[x+p.step*s,1]],'#49483e',6);
 oval(c,-3,-20,27,17,shade(c,'#ab9775',p.flash?'#e4dec9':'#817359','#4f5045',-30,-40,58,40));
 oval(c,18,-23,14,14,'#716650');oval(c,26,-17,11,7,'#b3a085');oval(c,31,-18,2,1.4,'#4e4b40',null);oval(c,21,-27,2,1.8,'#e0c08a',null);
 for(const [x,d] of [[12,-1],[23,1]])horn(c,x,-31,d);
 line(c,[[-26,-21],[-33,-28],[-37,-23]],'#4b4a3f',3);line(c,[[-19,-29],[-9,-32],[1,-30]],'#c5b28a',2);
}
function scorpion(c,p){
 for(const side of [-1,1])for(let i=0;i<3;i++)line(c,[[side*7,-12+i*5],[side*18,-17+i*8],[side*23,-9+i*8]],'#536065',2.7);
 c.strokeStyle=INK;c.lineWidth=10;c.beginPath();c.moveTo(-10,-15);c.bezierCurveTo(-27,-21,-23,-43,-9,-39);c.stroke();c.strokeStyle='#bec4b0';c.lineWidth=6;c.stroke();
 for(const [x,y] of [[-17,-22],[-22,-30],[-19,-38]])oval(c,x,y,4.5,4,'#9aaba7');
 path(c,'#705e5a',b=>{b.moveTo(-12,-43);b.quadraticCurveTo(0,-43,-5,-33);b.quadraticCurveTo(-5,-39,-12,-38);});
 oval(c,0,-10,13,10,shade(c,'#e0debd',p.flash?'#eeead8':'#a8b7ac','#536a71'));
 for(let i=0;i<3;i++)line(c,[[-5+i*5,-17],[-4+i*5,-6]],'#71868a',1);
 for(const side of [-1,1]){line(c,[[side*9,-8],[side*19,-3]],'#7f9895',4);oval(c,side*23,-2,6.5,6,'#b9c5b5');line(c,[[side*28,-5],[side*22,-1],[side*28,3]],'#465a61',2);}
 eyes(c,0,-14,'#493c35');
}
function worm(c,p){
 oval(c,-3,0,24,8,'#5c584880');
 const segments=[[-6,-9,18,12],[-8,-21,16,13],[-4,-33,15,14],[7,-42,15,13]];
 for(const [x,y,rx,ry] of segments){oval(c,x,y,rx,ry,shade(c,'#c6b18b',p.flash?'#eee0bd':'#a48c68','#68654f',x-rx,y-ry,rx*2,ry*2));c.strokeStyle='#ddd0a4';c.lineWidth=1.5;c.beginPath();c.ellipse(x-2,y-2,rx-5,ry-4,0,Math.PI*.8,Math.PI*1.8);c.stroke();}
 oval(c,13,-43,10,9,'#474b45');oval(c,14,-43,6.5,6,'#382d2b',null);
 for(let i=0;i<5;i++){const a=i/5*TAU;line(c,[[14+Math.cos(a)*8,-43+Math.sin(a)*7],[14+Math.cos(a)*4,-43+Math.sin(a)*3]],'#e2d6ad',2);}
}
function mummy(c,p){person(c,p,p.step*.55,{cloak:'#b6b097',skin:'#b6b097'});for(let y=-29;y<-10;y+=5)line(c,[[-8,y],[8,y-2]],'#ece2bd',2);for(let y=-44;y<-32;y+=4)line(c,[[-5,y],[6,y-1]],'#dcd4b4',2);line(c,[[-5,-38],[5,-38]],'#3f4946',3);eyes(c,-3,-38,'#d7aa71');for(const [x,y] of [[-9,-24],[8,-12],[-3,-46]]){path(c,'#e9e7cf',b=>{b.moveTo(x-3,y+2);b.lineTo(x,y-7);b.lineTo(x+5,y+2);});}}
function dust(c,p){
 path(c,shade(c,'#dbc79b',p.flash?'#f2e5c5':'#ab9470','#726b59'),b=>{b.moveTo(-3,0);b.bezierCurveTo(22,-10,-26,-17,-14,-30);b.bezierCurveTo(-30,-41,-7,-54,10,-46);b.bezierCurveTo(32,-38,12,-22,2,-20);b.bezierCurveTo(-5,-13,17,-9,-3,0);});
 for(const [x,y,rx,ry] of [[0,-37,20,9],[-4,-24,16,6],[0,-11,10,4]]){c.strokeStyle='#e1cf9e';c.lineWidth=2.6;c.beginPath();c.ellipse(x,y,rx,ry,-.15,Math.PI*.15,Math.PI*1.85);c.stroke();}
 eyes(c,-2,-38,'#27373a');for(let i=0;i<5;i++)oval(c,Math.sin(i*2+p.phase)*22,-10-i*8,1.4,1,'#c9b788',null);
}
function goat(c,p){c.save();c.scale(1.17,1.17);person(c,p,p.step*.7,{cloak:'#7a7461',skin:'#99917b'});horn(c,-4,-44,-1);horn(c,5,-44,1);oval(c,2,-30,5,7,'#c3b798');line(c,[[12,-15],[25,-42]],'#675740',4);oval(c,25,-43,7,10,'#6d6e60');line(c,[[-8,-27],[-3,-24],[0,-29],[4,-25],[8,-28]],'#c7bd9e',3);c.restore();}
function troll(c,p){c.save();c.scale(1.34,1.2);person(c,p,p.step*.5,{cloak:'#657c72',skin:'#8b9a84',armor:true});oval(c,-10,-28,9,8,'#738b7c');oval(c,11,-27,9,9,'#5a736c');oval(c,0,-18,11,10,shade(c,'#a1ae91','#7b907b','#536d62'));line(c,[[-6,-21],[-1,-17],[-4,-11]],'#4a655b',2);for(const [x,y] of [[-12,-32],[6,-24],[-3,-43]])oval(c,x,y,4,2.5,'#9ba577',null);line(c,[[12,-19],[19,-3]],'#566b61',7);c.restore();}
function wings(c,p,color,wide=28){const flap=Math.sin(p.phase)*5;for(const side of [-1,1])path(c,shade(c,'#a4aaa0',color,'#424f59'),b=>{b.moveTo(side*5,-23);b.bezierCurveTo(side*13,-27,side*(wide-4),-44-flap,side*wide,-39-flap);b.quadraticCurveTo(side*(wide+3),-26,side*(wide-2),-15);b.quadraticCurveTo(side*20,-24,side*16,-14);b.quadraticCurveTo(side*10,-21,side*5,-13);});}
function harpy(c,p){wings(c,p,'#8396a2',34);oval(c,0,-25,10,14,shade(c,'#c3bd9c',p.flash?'#e9e5d5':'#939b8b','#4c6a70'));oval(c,1,-43,7.5,8,'#c7b492');path(c,'#797f86',b=>{b.moveTo(-7,-44);b.quadraticCurveTo(-8,-56,5,-52);b.lineTo(10,-43);b.quadraticCurveTo(2,-48,-7,-44);});eyes(c,1,-44,'#3a4448');for(const x of [-5,6]){line(c,[[x,-12],[x+p.step,-3],[x+4+p.step,-1]],'#b9a77b',2.5);line(c,[[x+p.step,-3],[x-3+p.step,0]],'#d7c69b',1.5);}}
function slime(c,p){const wob=Math.sin(p.phase)*1.4;path(c,shade(c,'#b8c996',p.flash?'#e7e9cb':'#6d9471','#345d55'),b=>{b.moveTo(-18,0);b.bezierCurveTo(-24,-6,-13,-24-wob,0,-24-wob);b.bezierCurveTo(14,-25-wob,26,-2,17,1);b.quadraticCurveTo(0,7,-18,0);});oval(c,-7,-16,5,2.5,'#d5ddb4',null);eyes(c,2,-12,'#dec794');for(const [x,y] of [[-12,-4],[12,-3],[-1,-20]])oval(c,x,y,2.7,2.4,'#a9c68f');}
function frog(c,p){line(c,[[-11,-10],[-23,-5],[-24,2],[-12,1]],'#697d58',5);line(c,[[12,-9],[22,-4],[24,2],[13,1]],'#778a61',5);oval(c,0,-12,20,15,shade(c,'#bec28a',p.flash?'#e3e4ca':'#899d65','#4e7157'));oval(c,-9,-25,7,7,'#b9bd86');oval(c,9,-25,7,7,'#c5c38b');for(const x of [-9,9]){oval(c,x+1,-26,3.4,3.8,'#d9c784');oval(c,x+2,-26,1.5,2.8,'#2f413d',null);}c.strokeStyle='#455f4e';c.lineWidth=2;c.beginPath();c.moveTo(-13,-11);c.quadraticCurveTo(0,-6,15,-12);c.stroke();line(c,[[9,-10],[20,-7],[26,-9]],'#b58979',2.6);oval(c,-7,-13,4,2,'#bac78b',null);}
function lizard(c,p){c.strokeStyle='#526e5d';c.lineWidth=7;c.beginPath();c.moveTo(-6,-10);c.bezierCurveTo(-25,-6,-30,1,-35,-6);c.stroke();person(c,p,p.step,{cloak:'#6d8f72',skin:'#9eae79',armor:true});oval(c,9,-36,10,4,'#b4bd86');oval(c,14,-38,1.8,1.4,'#324c44',null);line(c,[[-4,-43],[-1,-49],[3,-44]],'#b8c392',2.5);spear(c,20,-56);shield(c,-12,-20,'#59786b');}
function flame(c,x,y,w,h,outer,inner){path(c,outer,b=>{b.moveTo(x-w,y);b.bezierCurveTo(x-w*1.2,y-h*.5,x+w*.4,y-h*.6,x,y-h);b.bezierCurveTo(x+w*1.5,y-h*.4,x+w,y,x-w,y);});path(c,inner,b=>{b.moveTo(x-w*.4,y-2);b.quadraticCurveTo(x+w*.5,y-h*.5,x,y-h*.7);b.quadraticCurveTo(x+w*.7,y-4,x-w*.4,y-2);},null);}
function wisp(c,p){for(let i=0;i<3;i++)oval(c,Math.sin(p.phase+i)*9,-11-i*10,5-i,3-i*.5,'#9fcfba66',null);flame(c,0,-19,13,32,p.flash?'#e2edcf':'#6ca9aa','#c3e0bd');oval(c,0,-31,6,7,'#e0e7c5',null);eyes(c,-3,-32,'#42676b');}
function wraith(c,p){c.globalAlpha=.88;path(c,shade(c,'#b9cac1',p.flash?'#e2e9d9':'#849e9d','#435e69'),b=>{b.moveTo(-17,1);b.quadraticCurveTo(-10,-12,-12,-30);b.bezierCurveTo(-14,-55,13,-55,13,-31);b.quadraticCurveTo(10,-15,20,-3);b.quadraticCurveTo(8,-9,8,4);b.quadraticCurveTo(1,-8,-3,3);b.quadraticCurveTo(-8,-5,-17,1);});oval(c,0,-36,8,10,'#344f59');eyes(c,-3,-38,'#c5e1d0');line(c,[[-6,-24],[-8,-10]],'#d0ddd155',2);c.globalAlpha=1;}
function bat(c,p){wings(c,p,'#7b748b',27);oval(c,0,-19,7,11,shade(c,'#aea49d',p.flash?'#e2d9d5':'#6f687d','#434357'));oval(c,0,-32,8,7,'#9c919c');for(const side of [-1,1])path(c,'#8e8296',b=>{b.moveTo(side*3,-36);b.quadraticCurveTo(side*9,-51,side*9,-35);b.lineTo(side*6,-30);});eyes(c,-3,-33,'#e5a391');line(c,[[-3,-27],[-2,-24],[0,-27],[2,-24],[3,-27]],'#e4d9b7',1.4);}
function imp(c,p){wings(c,p,'#7a677b',23);c.save();c.scale(.88,.88);person(c,p,p.step,{cloak:'#a56e62',skin:'#bd8f77'});horn(c,-4,-43,-1,11);horn(c,5,-43,1,11);c.restore();spear(c,22,-48);line(c,[[18,-42],[18,-49],[26,-49],[26,-42]],'#c9b68b',1.8);c.strokeStyle='#9c6e64';c.lineWidth=3;c.beginPath();c.moveTo(-7,-9);c.quadraticCurveTo(-27,0,-25,-15);c.stroke();}
function demon(c,p,mage=false){person(c,p,p.step*.7,{cloak:mage?'#756880':'#6e7480',skin:'#b8a084',hood:mage,armor:!mage});horn(c,-4,-44,-1,13);horn(c,5,-44,1,13);if(!mage){oval(c,-9,-27,5,4,'#8f9698');oval(c,9,-27,5,4,'#656b7c');path(c,'#5b6471',b=>{b.moveTo(-8,-40);b.quadraticCurveTo(-8,-51,1,-49);b.quadraticCurveTo(9,-48,8,-39);b.quadraticCurveTo(0,-44,-8,-40);});}if(mage){line(c,[[17,1],[18,-50]],'#96866b',3);oval(c,18,-52,5,6,shade(c,'#d6baca','#ac8aa9','#6e6082'));oval(c,16,-54,1.5,2,'#ead7d9',null);}else{spear(c,20,-58);shield(c,-13,-20,'#665e72');}eyes(c,0,-39,'#e4b287');}
const PAINTERS={road_archer:archer,bandit_rider:rider,wild_dog:(c,p)=>dog(c,p),plains_bull:bull,salt_scorpion:scorpion,sand_worm:worm,salt_mummy:mummy,dust_spirit:dust,goat_ogre:goat,snow_wolf:(c,p)=>dog(c,p,'#b6c4be',true),rock_troll:troll,harpy,bog_slime:slime,giant_frog:frog,lizard_spearman:lizard,marsh_wisp:wisp,wraith,vampire_bat:bat,imp,demon_lancer:demon,demon_mage:(c,p)=>demon(c,p,true),hellhound:(c,p)=>dog(c,p,'#484851',false,true)};
export const ENEMY_HEAD_HEIGHT=Object.freeze({road_archer:57,bandit_rider:71,wild_dog:43,plains_bull:62,salt_scorpion:53,sand_worm:63,salt_mummy:59,dust_spirit:61,goat_ogre:86,snow_wolf:43,rock_troll:68,harpy:65,bog_slime:35,giant_frog:42,lizard_spearman:66,marsh_wisp:63,wraith:68,vampire_bat:61,imp:70,demon_lancer:79,demon_mage:79,hellhound:58});
export const TOON_ENEMY_ART=Object.freeze(Object.fromEntries(Object.entries(PAINTERS).map(([id,paint])=>[id,(c,m,now=0,facingApplied=false)=>{
 const phase=now*.014+(m.x||0),p={phase,step:Math.sin(phase)*1.7,flash:(m.hitPulse||0)>0};
 c.save();c.lineCap='round';c.lineJoin='round';if(!facingApplied&&Math.cos(m.facingAngle||0)<0)c.scale(-1,1);c.translate(0,Math.sin(phase*.65)*.75-(['harpy','vampire_bat','wraith','dust_spirit','marsh_wisp'].includes(id)?4:0));paint(c,p);c.restore();
}])));
