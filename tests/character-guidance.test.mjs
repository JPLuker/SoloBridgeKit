import test from 'node:test';
import assert from 'node:assert/strict';
import { createLifepath, normalizeLifepath } from '../lifepath.mjs';
import { makePrivateOption } from '../private-options.mjs';
import { chooseVerifiedLifepathOption, stageSourceStatus, auditGuidedLifepath } from '../character-guidance.mjs';

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
