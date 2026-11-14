import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,createEpisode} from '../model.mjs';
import {resolveActiveEpisodeId,selectActiveEpisode,resolveActiveSceneId,selectActiveScene,
  sceneTag,makePrivateTableReference,appendSceneTableReference} from '../mission-workspace.mjs';
const sha='c'.repeat(64);
const table={id:'private-fake-table',sourceSha256:sha,page:210,sides:3,
  title:'Private book text must never enter journal',entries:[
    {min:1,max:1,text:'Licensed example A'},{min:2,max:2,text:'Licensed example B'},
    {min:3,max:3,text:'Licensed example C'}]};
test('mission choice survives a later episode and rejects deleted episodes',()=>{
  const campaign=createCampaign('My stories');
  const a=createEpisode('First'),b=createEpisode('Second');
  campaign.episodes=[b,a];
  assert.equal(resolveActiveEpisodeId(campaign),b.id);
  const selected=selectActiveEpisode(campaign,a.id);
  assert.equal(resolveActiveEpisodeId(selected),a.id);
  assert.equal(campaign.activeEpisodeId,undefined);
  assert.equal(resolveActiveEpisodeId({...selected,episodes:[b]}),b.id);
  assert.throws(()=>selectActiveEpisode(campaign,'missing'),/saved mission/);
});
test('scene resumes exact chosen scene and falls back after safe plan reduction',()=>{
  const ep=createEpisode('My three-act mission');
  assert.equal(resolveActiveSceneId(ep),'1:1');
  const chosen=selectActiveScene(ep,'3:5');
  assert.equal(resolveActiveSceneId(chosen),'3:5');
  assert.equal(sceneTag(chosen.activeSceneId),'Act 3, Scene 5');
  assert.equal(resolveActiveSceneId({...chosen,activeSceneId:'9:9'}),'1:1');
  assert.throws(()=>selectActiveScene(ep,'4:99'),/not part/);
});
test('source-linked private table record contains no table title or source prose',()=>{
  const entry=makePrivateTableReference(table,{value:2},sha,'2:1','synthetic-entry','2026-11-14T12:00:00Z');
  assert.equal(entry.tableId,table.id);assert.equal(entry.rollValue,2);
  assert.equal(entry.sceneId,'2:1');assert.equal(entry.page,210);
  assert.equal(entry.sourceSha256,sha);
  assert.equal(JSON.stringify(entry).includes('Licensed example'),false);
  assert.equal(JSON.stringify(entry).includes(table.title),false);
  const ep=createEpisode('Quiet visit');const withRecord=appendSceneTableReference(ep,entry);
  assert.equal(ep.entries.length,0);assert.equal(withRecord.entries.length,1);
});
test('invalid table sources, rolls and unknown mission scenes are rejected',()=>{
  assert.throws(()=>makePrivateTableReference(table,{value:2},'b'.repeat(64)),/another PDF/);
  assert.throws(()=>makePrivateTableReference(table,{value:10},sha),/invalid/);
  assert.throws(()=>makePrivateTableReference(table,{value:1},sha,'bad'),/Invalid source scene/);
  const ep=createEpisode('No external scenes');
  const entry=makePrivateTableReference(table,{value:1},sha,'1:1');
  assert.throws(()=>appendSceneTableReference({...ep,scenes:[]},entry),/no longer exists/);
});
