import test from 'node:test';
import assert from 'node:assert/strict';
import { createMissionScenes, normalizeMissionScenes, updateScenePlan, toggleMissionScene, validateScenePlan } from '../missions.mjs';
import {createEpisode, normalizeEpisode} from '../model.mjs';

test('three-act default has fifteen separately tracked scenes',()=>{
  const ep=createEpisode('First contact');
  assert.deepEqual(ep.scenePlan,[5,5,5]);
  assert.equal(ep.scenes.length,15);
  assert.equal(ep.tracker,0);
  assert.equal(ep.scenes[5].act,2);
});
test('short mission customizes each act independently',()=>{
  const ep=createEpisode('Short mission');
  const updated=updateScenePlan(ep,[3,2,1]);
  assert.deepEqual(updated.scenePlan,[3,2,1]);
  assert.equal(updated.scenes.length,6);
  assert.equal(updated.scenes.filter(s=>s.act===3).length,1);
});
test('mark scene complete and reopen it without losing other scenes',()=>{
  const ep=createEpisode('Explore');
  Object.assign(ep,toggleMissionScene(ep,1,1,true));
  assert.equal(ep.tracker,1);
  assert.equal(ep.scenes[0].completed,true);
  assert.ok(ep.scenes[0].completedAt);
  Object.assign(ep,toggleMissionScene(ep,1,1,false));
  assert.equal(ep.tracker,0);
  assert.equal(ep.scenes[0].completedAt,null);
});
test('mission resizes without losing notes or completion',()=>{
  const ep=createEpisode('Rendezvous');
  ep.scenes[0].title='Our scene'; ep.scenes[0].notes='Player notes';
  Object.assign(ep,toggleMissionScene(ep,1,1,true));
  const updated=updateScenePlan(ep,[3,5,4]);
  assert.equal(updated.scenes[0].notes,'Player notes');
  assert.equal(updated.scenes[0].completed,true);
  assert.equal(updated.tracker,1);
});
test('cannot remove a completed or written scene by reducing act length',()=>{
  const ep=createEpisode('Survey');
  ep.scenes[4].notes='Important';
  assert.throws(()=>updateScenePlan(ep,[4,5,5]),/notes/);
  ep.scenes[4].notes='';
  Object.assign(ep,toggleMissionScene(ep,1,5,true));
  assert.throws(()=>updateScenePlan(ep,[4,5,5]),/progress/);
});
test('old 0–15 tracker migrates to numbered scenes',()=>{
  const legacy={...createEpisode('Legacy'), scenes:undefined, tracker:7};
  const next=normalizeEpisode(legacy);
  assert.equal(next.tracker,7);
  assert.equal(next.scenes.filter(s=>s.completed).length,7);
  assert.equal(next.scenes[6].act,2);
});
test('scene counts validate bounds and membership',()=>{
  assert.throws(()=>validateScenePlan([0,5,5]));
  assert.throws(()=>validateScenePlan([5,5]));
  assert.throws(()=>validateScenePlan([5,5,100]));
  assert.throws(()=>toggleMissionScene(createEpisode('Test'),9,1,true));
  assert.equal(createMissionScenes([1,1,1]).length,3);
});