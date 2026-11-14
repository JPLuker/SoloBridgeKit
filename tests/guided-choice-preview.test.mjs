import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedChoicePreview,verifiedShipPreview,nextIncompleteCreationStep,nextIncompleteShipStep} from '../guided-choice-preview.mjs';
import {LIFEPATH_STEPS,createLifepath} from '../lifepath.mjs';
test('only verified record effects are displayed; never invent bonuses',()=>{
  const rows=verifiedChoicePreview({record:{attributes:{control:1,daring:2,reason:0},disciplines:{science:1,medicine:0}}});
  assert.deepEqual(rows,['+1 Control','+2 Daring','+1 Science']);
  assert.deepEqual(verifiedChoicePreview({record:{attributes:{control:99}}}),[]);
  assert.deepEqual(verifiedChoicePreview(null),[]);
});
test('resume points to next unresolved sourced decision',()=>{
  const path=createLifepath();
  assert.equal(nextIncompleteCreationStep(path,LIFEPATH_STEPS),0);
  path.stages.species.choice='Private choice';
  path.stages.species.sourceRef={recordId:'id'};
  assert.equal(nextIncompleteCreationStep(path,LIFEPATH_STEPS),1);
  for(const step of LIFEPATH_STEPS.filter(x=>x.id!=='finishing')){
    path.stages[step.id].choice='Private choice';
    path.stages[step.id].sourceRef={recordId:'id'};
  }
  assert.equal(nextIncompleteCreationStep(path,LIFEPATH_STEPS),LIFEPATH_STEPS.length-1);
});

test('player-owned ship class preview does not bundle publisher statistics',()=>{
  assert.deepEqual(verifiedShipPreview({kind:'starship',scale:'4',
    systems:{engines:'6',sensors:'9'},departments:{science:'3'}}),
    ['Starship','Scale 4','Systems ratings: 2 recorded','Departments ratings: 1 recorded']);
  assert.deepEqual(verifiedShipPreview(null),[]);
});

test('ship draft resumes at the next meaningful missing decision',()=>{
  assert.equal(nextIncompleteShipStep(null),0);
  const draft={kind:'starship',mode:'guided',era:'Player selected',className:'Private class',
    scale:'4',sourceRef:{recordId:'private'}};
  assert.equal(nextIncompleteShipStep(draft),2);
  draft.polityTrait='Private polity';
  assert.equal(nextIncompleteShipStep(draft),4);
  draft.talents='Private talent';
  assert.equal(nextIncompleteShipStep(draft),5);
  draft.name='Player ship';
  draft.registry='OWN-002';
  assert.equal(nextIncompleteShipStep(draft),5);
});
