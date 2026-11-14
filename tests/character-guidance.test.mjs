import test from 'node:test';
import assert from 'node:assert/strict';
import { createLifepath, normalizeLifepath, lifepathReview, LIFEPATH_STEPS } from '../lifepath.mjs';
import { createCharacter } from '../model.mjs';
import { makePrivateOption } from '../private-options.mjs';
import { chooseVerifiedLifepathOption, stageSourceStatus, auditGuidedLifepath, applyGuidedLifepathToCharacter } from '../character-guidance.mjs';

const sha='a'.repeat(64);
function fixture(stepId='species') {
  const attrs={control:1,daring:1,fitness:1};
  const disciplines={};
  const record={attributes:attrs,disciplines,value:'',focuses:'',notes:'Private source note'};
  return makePrivateOption({id:'fictional-1',stepId,label:'Fictional specimen',
    page:100,sourceSha256:sha,record});
}
test('guided source selection pins verified stage and preserves user notes',()=>{
  const path=createLifepath();path.stages.species.notes='Personal notes survive';
  const chosen=chooseVerifiedLifepathOption(path,'species',fixture(),sha,336);
  assert.equal(chosen.stages.species.sourceRef.page,100);
  assert.equal(chosen.stages.species.notes,'Personal notes survive');
  assert.equal(stageSourceStatus(chosen.stages.species,'species',[fixture()],sha),'verified');
  assert.equal(path.stages.species.choice,'');
  assert.equal(normalizeLifepath(chosen).stages.species.sourceRef.recordId,'fictional-1');
});
test('source selection rejects other PDF and invalid stage mechanics',()=>{
  const opt=fixture();
  assert.throws(()=>chooseVerifiedLifepathOption(createLifepath(),'species',opt,'b'.repeat(64),336),/not confirmed/);
  assert.throws(()=>chooseVerifiedLifepathOption(createLifepath(),'career',opt,sha,336),/not confirmed/);
  const bad=makePrivateOption({id:'bad',stepId:'species',label:'Bad sample',page:100,
    sourceSha256:sha,record:{attributes:{control:3},disciplines:{},value:'',focuses:'',notes:''}});
  assert.throws(()=>chooseVerifiedLifepathOption(createLifepath(),'species',bad,sha,336),/three different/);
});
test('edited mechanical bonuses never retain verified status',()=>{
  const opt=fixture();
  const path=chooseVerifiedLifepathOption(createLifepath(),'species',opt,sha,336);
  path.stages.species.attributes.control=2;
  assert.equal(stageSourceStatus(path.stages.species,'species',[opt],sha),'modified');
  assert.equal(stageSourceStatus(path.stages.species,'species',[],sha),'missing-choice');
  assert.equal(stageSourceStatus(path.stages.species,'species',[opt],'b'.repeat(64)),'different-source');
  const audit=auditGuidedLifepath(path,[opt],sha);
  assert.equal(audit.count,0);
  assert.equal(audit.ready,false);
  assert.equal(audit.total,7);
});
test('legacy incomplete lifepath drafts remain manually editable',()=>{
  const legacy=createLifepath();
  legacy.stages.species.choice='Player-written';
  assert.equal(stageSourceStatus(normalizeLifepath(legacy).stages.species,'species',[],sha),'manual');
});

test('full guided creation uses seven confirmed private source records and finishing caps',()=>{
  const example=createLifepath();
  const at=example.stages;
  const set=(stage,kind,...keys)=>keys.forEach(key=>stage[kind][key]++);
  set(at.species,'attributes','control','fitness','reason');
  set(at.environment,'attributes','insight');set(at.environment,'disciplines','science');at.environment.value='First value';
  set(at.outlook,'attributes','daring','daring','presence');set(at.outlook,'disciplines','security');at.outlook.focuses='First focus';
  set(at.education,'attributes','control','control','reason');
  set(at.education,'disciplines','science','science','engineering','command');
  at.education.value='Second value';at.education.focuses='Second focus\nThird focus\nFourth focus';
  at.career.value='Third value';
  set(at.event1,'attributes','fitness');set(at.event1,'disciplines','medicine');at.event1.focuses='Fifth focus';
  set(at.event2,'attributes','insight');set(at.event2,'disciplines','conn');at.event2.focuses='Sixth focus';
  set(at.finishing,'attributes','presence','reason');set(at.finishing,'disciplines','command','engineering');
  at.finishing.value='Fourth value';
  const verified=[];
  let path={...createLifepath(),mode:'guided'};
  for(const [i,step] of LIFEPATH_STEPS.filter(s=>s.id!=='finishing').entries()){
    const option=makePrivateOption({id:'synthetic-source-'+i,stepId:step.id,
      label:'Fictional '+step.id,sourceSha256:sha,page:97+i,record:at[step.id]});
    verified.push(option);
    path=chooseVerifiedLifepathOption(path,step.id,option,sha,336);
  }
  path.stages.finishing=at.finishing;
  assert.equal(lifepathReview(path).ready,true);
  assert.equal(auditGuidedLifepath(path,verified,sha).count,7);
  const character=applyGuidedLifepathToCharacter(createCharacter(),path,verified,sha);
  assert.equal(character.attributes.reason,'10');
  assert.equal(character.values.split('\n').length,4);
  assert.ok(character.lifepath.appliedAt);
  assert.equal(character.lifepath.stages.event2.sourceRef.page,103);
  assert.throws(()=>applyGuidedLifepathToCharacter(createCharacter(),path,verified.slice(1),sha),/not verified/);
  const edited=structuredClone(path);
  edited.stages.species.attributes.control=2;
  assert.throws(()=>applyGuidedLifepathToCharacter(createCharacter(),edited,verified,sha),/not verified/);
});
