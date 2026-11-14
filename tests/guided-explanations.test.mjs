import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_GUIDANCE, SHIP_GUIDANCE, MISSION_GUIDANCE,
  guidanceForCharacterStep,shipGuidanceAt} from '../guided-explanations.mjs';
import {LIFEPATH_STEPS} from '../lifepath.mjs';

test('every character lifepath step has a question, explanation and next action',()=>{
  assert.equal(Object.keys(CHARACTER_GUIDANCE).length,LIFEPATH_STEPS.length);
  for(const step of LIFEPATH_STEPS){
    const guidance=guidanceForCharacterStep(step.id);
    for(const field of ['question','explanation','next'])
      assert.ok(guidance[field].length>10,`Missing guidance for ${step.id} ${field}`);
    assert.ok(!guidance.explanation.includes('Lorem ipsum'));
  }
  assert.throws(()=>guidanceForCharacterStep('unknown'),/Unknown/);
});
test('all ship-builder stages explain the decision',()=>{
  assert.equal(SHIP_GUIDANCE.length,6);
  for(let i=0;i<SHIP_GUIDANCE.length;i++){
    const step=shipGuidanceAt(i);
    assert.ok(step.question && step.explanation && step.next);
  }
  assert.throws(()=>shipGuidanceAt(-1),/Unknown/);
});
test('first mission prompts orient player without authoring story',()=>{
  assert.equal(MISSION_GUIDANCE.prompts.length,3);
  assert.ok(MISSION_GUIDANCE.firstScene.includes('Act One'));
});
