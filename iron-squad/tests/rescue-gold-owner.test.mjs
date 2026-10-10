// 救助報奨金の行き先: 隊長が関わった救助だけ隊長の軍資金へ、兵士だけの救助は国庫へ。
import assert from 'node:assert/strict';
import {grantRescueBonus} from '../js/casualty-rules.js';
const makeGame=()=>{const player={id:'p',isPlayer:true,x:0,y:0,hp:100,maxHp:100};return {player,gold:1000,treasury:5000,phaseFiscal:{defenseRewards:0},gainExp(){},squad:[],showToast(){},spawnDamageText(){}};};
const soldier=(id)=>({id,name:id,x:0,y:0,hp:0,maxHp:100,gold:0,isDown:true});
{
  const g=makeGame(),carrier=soldier('carrier'),medic=soldier('medic');
  grantRescueBonus(g,soldier('w1'),{method:'BASE',carrier});
  grantRescueBonus(g,soldier('w2'),{method:'MEDIC',medic});
  assert.equal(g.gold,1000,'soldier-only rescues must not pay the commander');
  assert.equal(g.treasury,5000+200+100,'soldier-only rescue reward goes to the treasury');
  assert.equal(g.phaseFiscal.defenseRewards,300,'and is recorded in the fiscal ledger');
}
{
  const g=makeGame();
  grantRescueBonus(g,soldier('w3'),{method:'BASE',carrier:g.player});
  assert.equal(g.gold,1000+250,'commander carrying to base earns base + carrier bonus');
  assert.equal(g.treasury,5000);
}
console.log('PASS: rescue reward owner (commander vs treasury)');
