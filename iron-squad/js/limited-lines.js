/** v7.2.0 忍者・獣人の系列（基本職＋クラス1〜3）。依存なしの純データ。表示名は class-up-rules の番号付けで「系列名 クラスN」になり、subName を詳細とお知らせに添える。 */
const line=(lineId,family,species,defs)=>defs.map((d,i)=>[d.id,Object.freeze({...d,lineId,baseClassId:family,combatClass:family,...(species?{species}:{}),...(i?{classTier:i,isAdvanced:true,...(i>=2?{isMaster:true}:{}),...(i>=3?{isLegendary:true}:{})}:{}),...(defs[i+1]?{advancedClassId:defs[i+1].id}:{})})]);
const NINJA=line('NINJA','LIGHT',null,[
 {id:'NINJA',name:'忍者',icon:'🥷',color:'#8e97ac',range:250,speed:136,atkCooldown:.75,bonusHp:5,bonusAtk:12,shurikenCooldown:1.7,shurikenDamage:.7,desc:'刀と手裏剣を間合いに応じて使い分ける。'},
 {id:'NINJA_CHUNIN',subName:'中忍',icon:'🥷🍃',color:'#8e97ac',glowColor:'#b7c6d8',range:250,speed:160,atkCooldown:.5,bonusHp:120,bonusAtk:36,bonusCrit:50,hpMultBonus:.28,atkMultBonus:.52,speedMultBonus:.32,shurikenCooldown:1.4,shurikenDamage:.5,shurikenCount:2,desc:'影から影へ渡り、手裏剣を重ねて放つ。'},
 {id:'NINJA_JONIN',subName:'上忍',icon:'🥷⚡',color:'#7f88a3',glowColor:'#c3cde0',range:250,speed:175,atkCooldown:.4,bonusHp:200,bonusAtk:68,bonusCrit:60,hpMultBonus:.46,atkMultBonus:.92,speedMultBonus:.48,shurikenCooldown:1.2,shurikenDamage:.5,shurikenCount:2,desc:'気配を断ち、音もなく敵の背を取る。'},
 {id:'NINJA_KASHIRA',subName:'影頭領',icon:'🌌🥷',color:'#6f7896',glowColor:'#dfe6f3',range:270,speed:190,atkCooldown:.32,bonusHp:330,bonusAtk:115,bonusCrit:75,hpMultBonus:.75,atkMultBonus:1.45,speedMultBonus:.68,shurikenCooldown:1.0,shurikenDamage:.42,shurikenCount:3,desc:'影の里を束ねる者。闇そのものが刃となる。'}]);
const WOLF=line('BEAST_WOLF','LIGHT','wolf',[
 {id:'BEAST_WOLF',name:'狼獣人',icon:'🐺',color:'#9cabb0',range:65,speed:122,atkCooldown:.85,bonusHp:15,bonusAtk:15,desc:'近接戦と追跡に長けた獣人。'},
 {id:'BEAST_WOLF_GARO',subName:'牙狼',icon:'🐺🌙',color:'#9cabb0',glowColor:'#c9d6da',range:70,speed:145,atkCooldown:.57,bonusHp:170,bonusAtk:34,bonusCrit:35,hpMultBonus:.4,atkMultBonus:.5,speedMultBonus:.25,desc:'遠吠えが仲間の牙を研ぐ。'},
 {id:'BEAST_WOLF_GINRO',subName:'銀狼',icon:'🐺❄️',color:'#a9b8be',glowColor:'#e2edf1',range:72,speed:160,atkCooldown:.46,bonusHp:290,bonusAtk:66,bonusCrit:45,hpMultBonus:.65,atkMultBonus:.88,speedMultBonus:.4,desc:'群れで追い、決して獲物を逃さない。'},
 {id:'BEAST_WOLF_TENRO',subName:'天狼',icon:'🌌🐺',color:'#b8c6cc',glowColor:'#f1f7fa',range:75,speed:175,atkCooldown:.36,bonusHp:470,bonusAtk:110,bonusCrit:58,hpMultBonus:1,atkMultBonus:1.4,speedMultBonus:.58,desc:'星を背負う狼。咆哮が戦場を震わせる。'}]);
const BEAR=line('BEAST_BEAR','HEAVY','bear',[
 {id:'BEAST_BEAR',name:'熊獣人',icon:'🐻',color:'#a88e70',range:65,speed:88,atkCooldown:1.2,bonusHp:65,bonusAtk:15,bonusDef:20,desc:'盾で仲間を守る頑強な獣人。'},
 {id:'BEAST_BEAR_IWA',subName:'岩熊',icon:'🐻🪨',color:'#a88e70',glowColor:'#d2bb98',range:70,speed:84,atkCooldown:1.05,bonusHp:280,bonusAtk:30,bonusDef:45,hpMultBonus:.65,atkMultBonus:.4,defMultBonus:.5,desc:'立ちはだかり、敵の怒りを一身に受ける。'},
 {id:'BEAST_BEAR_TETSU',subName:'鉄熊',icon:'🐻🛡️',color:'#9a8064',glowColor:'#d9c7a8',range:72,speed:90,atkCooldown:.95,bonusHp:480,bonusAtk:58,bonusDef:75,hpMultBonus:1.05,atkMultBonus:.65,defMultBonus:.88,desc:'どんな衝撃にも足を退かない。'},
 {id:'BEAST_BEAR_SANNO',subName:'山王',icon:'🌌🐻',color:'#8c7358',glowColor:'#efe2c8',range:75,speed:96,atkCooldown:.88,bonusHp:820,bonusAtk:95,bonusDef:125,hpMultBonus:1.65,atkMultBonus:1,defMultBonus:1.4,desc:'山の主。倒れても一度は立ち上がる。'}]);
const CAT=line('BEAST_CAT','LIGHT','cat',[
 {id:'BEAST_CAT',name:'猫獣人',icon:'🐱',color:'#baa088',range:65,speed:145,atkCooldown:.6,bonusHp:-5,bonusAtk:10,desc:'速さと身のこなしに長けた獣人。'},
 {id:'BEAST_CAT_SUZU',subName:'鈴猫',icon:'🐱🔔',color:'#baa088',glowColor:'#e6d2b8',range:65,speed:172,atkCooldown:.4,bonusHp:100,bonusAtk:36,bonusCrit:55,hpMultBonus:.22,atkMultBonus:.55,speedMultBonus:.38,bonusDodge:8,desc:'鈴の音だけを残して刃をかわす。'},
 {id:'BEAST_CAT_KAGE',subName:'影猫',icon:'🐱🌙',color:'#a08a76',glowColor:'#dccab4',range:68,speed:188,atkCooldown:.32,bonusHp:180,bonusAtk:70,bonusCrit:65,hpMultBonus:.4,atkMultBonus:.95,speedMultBonus:.55,bonusDodge:10,desc:'夜を駆け、急所を逃さない。'},
 {id:'BEAST_CAT_NEKOMATA',subName:'猫又',icon:'🌌🐱',color:'#8e7a68',glowColor:'#f3e6d4',range:70,speed:205,atkCooldown:.25,bonusHp:300,bonusAtk:118,bonusCrit:82,hpMultBonus:.65,atkMultBonus:1.5,speedMultBonus:.78,bonusDodge:12,desc:'二股の尾が、死の淵から身を返す。'}]);
const FOX=line('BEAST_FOX','MAGE','fox',[
 {id:'BEAST_FOX',name:'狐獣人',icon:'🦊',color:'#bb926b',range:275,speed:100,atkCooldown:2.1,bonusHp:-20,bonusAtk:22,desc:'魔法を扱う狐の一族。'},
 {id:'BEAST_FOX_KIKO',subName:'気狐',icon:'🦊🔥',color:'#bb926b',glowColor:'#ecc496',range:300,speed:106,atkCooldown:1.9,bonusHp:35,bonusAtk:36,hpMultBonus:.1,atkMultBonus:.32,desc:'狐火を操り、敵を追い焼く。'},
 {id:'BEAST_FOX_TENKO',subName:'天狐',icon:'🦊✨',color:'#c79e72',glowColor:'#f3d7ae',range:330,speed:110,atkCooldown:1.8,bonusHp:80,bonusAtk:60,hpMultBonus:.15,atkMultBonus:.55,desc:'天に通じ、炎はいよいよ白く澄む。'},
 {id:'BEAST_FOX_KYUBI',subName:'九尾',icon:'🌌🦊',color:'#d4ad80',glowColor:'#fbead0',range:360,speed:116,atkCooldown:1.6,bonusHp:130,bonusAtk:92,hpMultBonus:.2,atkMultBonus:.82,desc:'九つの尾が、九つの炎を宿す。'}]);
const BIRD=line('BEAST_BIRD','ARCHER','bird',[
 {id:'BEAST_BIRD',name:'鳥獣人',icon:'🦅',color:'#9baba2',range:260,speed:125,atkCooldown:1.1,bonusHp:5,bonusAtk:14,desc:'弓を扱う鳥の一族。'},
 {id:'BEAST_BIRD_TAKABA',subName:'鷹羽',icon:'🦅🪶',color:'#9baba2',glowColor:'#cfdcd4',range:370,speed:140,atkCooldown:.95,bonusHp:120,bonusAtk:40,bonusCrit:40,hpMultBonus:.25,atkMultBonus:.52,rangeMultBonus:.45,desc:'鷹の目は遠くの獲物を逃さない。'},
 {id:'BEAST_BIRD_KAZAKIRI',subName:'風切',icon:'🦅🌪️',color:'#8fa196',glowColor:'#d7e5dc',range:410,speed:155,atkCooldown:.84,bonusHp:200,bonusAtk:72,bonusCrit:50,hpMultBonus:.4,atkMultBonus:.9,rangeMultBonus:.6,desc:'風に乗って間合いを外し、射返す。'},
 {id:'BEAST_BIRD_KARURA',subName:'迦楼羅',icon:'🌌🦅',color:'#c2a86a',glowColor:'#f5e7bd',range:475,speed:170,atkCooldown:.74,bonusHp:320,bonusAtk:118,bonusCrit:65,hpMultBonus:.65,atkMultBonus:1.4,rangeMultBonus:.85,desc:'天を翔ける神鳥。矢は雨となって降る。'}]);
const ALL=[NINJA,WOLF,BEAR,CAT,FOX,BIRD];
/** 基本職（村・ケージで出会う6種）。 */
export const LIMITED_CLASSES=Object.freeze(Object.fromEntries(ALL.map(l=>l[0])));
/** クラス1〜3（18職）。 */
export const LIMITED_ADVANCED_CLASSES=Object.freeze(Object.fromEntries(ALL.flatMap(l=>l.slice(1))));
export const LIMITED_LINE_CLASSES=Object.freeze({...LIMITED_CLASSES,...LIMITED_ADVANCED_CLASSES});
export const LIMITED_LINE_NAMES=Object.freeze(Object.fromEntries(ALL.map(l=>[l[0][0],l[0][1].name])));
/** 兵種idから系列（NINJA / BEAST_WOLF …）。人間の兵種は null。 */
export const limitedLineOf=unit=>LIMITED_LINE_CLASSES[typeof unit==='string'?unit:unit?.soldierClass]?.lineId||null;
export const limitedTierOf=unit=>LIMITED_LINE_CLASSES[typeof unit==='string'?unit:unit?.soldierClass]?.classTier||0;
export const limitedFamilyOf=unit=>LIMITED_LINE_CLASSES[typeof unit==='string'?unit:unit?.soldierClass]?.baseClassId||null;
export const limitedClassOf=unit=>LIMITED_LINE_CLASSES[typeof unit==='string'?unit:unit?.soldierClass]||null;
