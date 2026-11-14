import test from 'node:test';
import assert from 'node:assert/strict';
import {createEpisode,normalizeEpisode} from '../model.mjs';
import {createMissionThread,setMissionThreadStatus,deleteMissionThread,
  normalizeMissionThreads,summarizeSceneWorkspace} from '../mission-threads.mjs';
test('player-authored story threads preserve creation scene, exact words and status',()=>{
  const ep=createEpisode('Player mission');
  const entered=createMissionThread(ep,{title:'Find missing scientist',
    notes:'My own cliffhanger note',sceneId:'2:3'},'thread-a','2026-11-14T12:00:00Z');
  assert.equal(ep.threads.length,0);
  assert.equal(entered.threads[0].createdSceneId,'2:3');
  const complete=setMissionThreadStatus(entered,'thread-a','resolved','3:1','2026-11-14T14:00:00Z');
  assert.equal(complete.threads[0].resolvedSceneId,'3:1');
  assert.equal(complete.threads[0].notes,'My own cliffhanger note');
  const reloaded=normalizeEpisode(complete);
  assert.equal(reloaded.threads[0].status,'resolved');
  const reopened=setMissionThreadStatus(reloaded,'thread-a','open');
  assert.equal(reopened.threads[0].resolvedAt,null);
  assert.equal(reopened.threads[0].resolvedSceneId,null);
});
test('invalid, duplicate or orphaned thread entries do not overwrite saved data',()=>{
  const ep=createEpisode('Integrity');
  assert.throws(()=>createMissionThread(ep,{title:'Bad scene',sceneId:'4:1'}),/missing scene/);
  const entered=createMissionThread(ep,{title:'Good',sceneId:'1:1'},'a');
  assert.throws(()=>normalizeMissionThreads([...entered.threads,...entered.threads],ep.scenes),/duplicate/);
  assert.throws(()=>normalizeMissionThreads([{...entered.threads[0],createdSceneId:'9:9'}],ep.scenes),/no longer available/);
  assert.throws(()=>setMissionThreadStatus(entered,'missing','resolved'),/not found/);
  assert.throws(()=>setMissionThreadStatus(entered,'a','resolved','5:2'),/resolution scene/);
  assert.equal(deleteMissionThread(entered,'a').threads.length,0);
  assert.equal(entered.threads.length,1);
});
test('scene summary counts only player events linked to the selected scene',()=>{
  const ep=createEpisode('Context');
  const selected=createMissionThread(ep,{title:'A',sceneId:'2:2'},'open');
  selected.entries.push({id:'j1',sceneId:'2:2',text:'Player journal'},
    {id:'j2',sceneId:'2:2',kind:'table-reference',text:'Source ref'});
  selected.taskHistory.push({sceneId:'2:2',id:'roll-id'});
  const summary=summarizeSceneWorkspace(selected,'2:2');
  assert.deepEqual(summary,{sceneId:'2:2',taskRolls:1,journalEntries:2,
    tableRefs:1,openThreads:1,resolvedThreads:0});
  assert.throws(()=>summarizeSceneWorkspace(selected,'missing'),/not available/);
});
