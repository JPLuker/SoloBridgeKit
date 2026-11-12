import test from 'node:test';
import assert from 'node:assert/strict';
import { taskDifficulty, applyTaskOutcome, spendMomentum, spendThreat } from '../resources.mjs';
import {createEpisode} from '../model.mjs';

const result = (momentumEarned = false, threatGenerated = false) => ({momentumEarned,threatGenerated});

test('standard task is difficulty 1, increased task is 2',()=>{
  assert.equal(taskDifficulty(createEpisode('Survey')),1);
  assert.equal(taskDifficulty({nextTaskHard:false},true),2);
});
test('earned resources are single flags even on repeated success',()=>{
  const ep=createEpisode('Survey');
  Object.assign(ep,applyTaskOutcome(ep,result(true,true)));
  Object.assign(ep,applyTaskOutcome(ep,result(true,true)));
  assert.equal(ep.momentum,true);
  assert.equal(ep.threat,true);
});
test('Threat spent on next task stays until that task happens',()=>{
  const ep={momentum:false,threat:true,nextTaskHard:false};
  Object.assign(ep,spendThreat(ep,'increase-difficulty'));
  assert.equal(taskDifficulty(ep),2);
  assert.equal(ep.threat,true);
  Object.assign(ep,applyTaskOutcome(ep,result(false,false)));
  assert.equal(ep.threat,false);
  assert.equal(ep.nextTaskHard,false);
});
test('a fresh 20 on the difficult task creates new Threat',()=>{
  const ep={momentum:false,threat:true,nextTaskHard:true};
  Object.assign(ep,applyTaskOutcome(ep,result(false,true)));
  assert.equal(ep.threat,true);
  assert.equal(ep.nextTaskHard,false);
});
test('Momentum can cancel Threat, including a pending increased difficulty',()=>{
  const ep={momentum:true,threat:true,nextTaskHard:true};
  Object.assign(ep,spendMomentum(ep,'remove-threat'));
  assert.deepEqual(ep,{momentum:false,threat:false,nextTaskHard:false});
});
test('narrative advantage and complication consume correct tokens',()=>{
  const ep={momentum:true,threat:true,nextTaskHard:false};
  Object.assign(ep,spendMomentum(ep,'advantage'));
  assert.equal(ep.momentum,false);
  assert.equal(ep.threat,true);
  Object.assign(ep,spendThreat(ep,'complication'));
  assert.equal(ep.threat,false);
});
test('cannot spend unavailable tokens or unknown options',()=>{
  assert.throws(()=>spendMomentum({momentum:false},'reroll'),/No Momentum/);
  assert.throws(()=>spendThreat({threat:false},'complication'),/No Threat/);
  assert.throws(()=>spendMomentum({momentum:true},'unknown'),/Unsupported/);
});