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

test('mission resume location survives normalization and a harmless scene-plan update',()=>{
  const ep=createEpisode('Retained scene');
  ep.activeSceneId='2:3';
  const recovered=normalizeEpisode(ep);
  assert.equal(recovered.activeSceneId,'2:3');
  const expanded=updateScenePlan(recovered,[5,6,5]);
  const normalized=normalizeEpisode({...expanded,...recovered,scenePlan:expanded.scenePlan,scenes:expanded.scenes});
  assert.equal(normalized.activeSceneId,'2:3');
  const removed=normalizeEpisode({...ep,activeSceneId:'3:10'});
  assert.equal(removed.activeSceneId,'1:1');
});


test('scene values and linked story threads survive resizing without data loss',()=>{
  const ep=createEpisode('Scenes and Values');
  ep.scenes[4].valuesUsed='A player-written challenged Value';
  assert.throws(()=>updateScenePlan(ep,[4,5,5]),/progress, notes or linked threads/);
  const safe=updateScenePlan(ep,[5,6,5]);
  assert.equal(safe.scenes[4].valuesUsed,'A player-written challenged Value');
  const thread={id:'thread-ref',title:'Player mystery',notes:'',status:'open',
    createdSceneId:'3:5',resolvedSceneId:null,createdAt:'2026-11-14T12:00:00Z'};
  const linked={...ep,threads:[thread]};
  assert.throws(()=>updateScenePlan(linked,[5,5,4]),/linked threads/);
});

test('cannot silently orphan task rolls, player journal entries or undo history',()=>{
  const original=createEpisode('Preserved scene history');
  for(const [key,value] of [
    ['taskHistory',[{id:'roll-1',sceneId:'3:5'}]],
    ['entries',[{id:'entry-1',sceneId:'3:5',text:'Player journal'}]],
    ['sceneCorrections',[{sceneId:'3:5',before:{title:'Draft',notes:'',valuesUsed:''},at:'2026-11-14T12:00:00Z'}]]
  ]){
    const mission={...original,[key]:value};
    assert.throws(()=>updateScenePlan(mission,[5,5,4]),/linked threads\/history/);
    assert.equal(mission.scenes.length,15);
    assert.equal(mission[key].length,1);
  }
  const safe=updateScenePlan(original,[5,5,4]);
  assert.equal(safe.scenes.length,14);
});
