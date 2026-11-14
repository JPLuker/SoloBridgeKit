import test from 'node:test';
import assert from 'node:assert/strict';
import { createShip } from '../model.mjs';
import { applyShipMilestone,normalizeShipDevelopment,addShipCondition,updateShipCondition } from '../ship-development.mjs';
const sha='a'.repeat(64);
const completed={sourcePdfSha256:sha,missionId:'synthetic-mission-1',missionComplete:true,reason:'Player-authored mission outcome'};
function fixture(){
  const s=createShip();s.name='Private vessel';
  s.systems={comms:'8',computers:'8',engines:'8',sensors:'8',structure:'8',weapons:'8'};
  s.departments={command:'3',conn:'3',security:'3',engineering:'3',science:'3',medicine:'3'};
  return s;
}
test('source-logged ship milestone transfers one System rating without mutating input',()=>{
  const original=fixture();
  const next=applyShipMilestone(original,{type:'transfer-system',from:'comms',to:'engines'},completed);
  assert.equal(next.systems.comms,'7');assert.equal(next.systems.engines,'9');
  assert.equal(original.systems.comms,'8');assert.equal(next.name,'Private vessel');
  assert.equal(next.development.history[0].sourcePage,181);
  assert.equal(next.development.history[0].sourcePdfSha256,sha);
  assert.throws(()=>applyShipMilestone(next,{type:'improve-department',to:'science'},completed),/already/);
});
test('Department milestone can transfer or improve with floor and ceiling',()=>{
  const s=fixture();
  const shifted=applyShipMilestone(s,{type:'transfer-department',from:'command',to:'science'},completed);
  assert.equal(shifted.departments.command,'2');assert.equal(shifted.departments.science,'4');
  const improved=applyShipMilestone(s,{type:'improve-department',to:'science'},completed);
  assert.equal(improved.departments.science,'4');assert.equal(improved.departments.command,'3');
  s.departments.science='5';
  assert.throws(()=>applyShipMilestone(s,{type:'improve-department',to:'science'},completed),/above 5/);
});
test('no unearned, unverified or incomplete ship development is allowed',()=>{
  const s=fixture();
  assert.throws(()=>applyShipMilestone(s,{type:'improve-system',to:'weapons'},
    {...completed,missionComplete:false}),/completed mission/);
  assert.throws(()=>applyShipMilestone(s,{type:'improve-system',to:'weapons'},
    {...completed,sourcePdfSha256:'invalid'}),/private source/);
  s.systems.weapons='';
  assert.throws(()=>applyShipMilestone(s,{type:'improve-system',to:'weapons'},completed),/verified/);
  assert.throws(()=>applyShipMilestone(fixture(),{type:'transfer-system',from:'engines',to:'engines'},completed),/different/);
});
test('vessel conditions remain descriptive, preserved and nonmechanical',()=>{
  const s=fixture();
  const damaged=addShipCondition(s,{label:'Player-created reactor damage',note:'Repairs underway'},
    {sourcePdfSha256:sha});
  assert.equal(damaged.systems.engines,s.systems.engines);
  assert.equal(damaged.development.conditions[0].state,'active');
  const repaired=updateShipCondition(damaged,damaged.development.conditions[0].id,'resolved');
  assert.equal(repaired.development.conditions[0].state,'resolved');
  assert.equal(normalizeShipDevelopment(repaired.development).conditions.length,1);
  assert.throws(()=>updateShipCondition(repaired,'unknown','active'),/not found/);
});
