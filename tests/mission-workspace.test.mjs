import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,createEpisode,normalizeEpisode} from '../model.mjs';
import {resolveActiveEpisodeId,selectActiveEpisode,resolveActiveSceneId,selectActiveScene,
  sceneTag,makePrivateTableReference,appendSceneTableReference,saveSceneCorrection,undoSceneCorrection,normalizeSceneCorrections} from '../mission-workspace.mjs';
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

test('scene corrections restore player writing without affecting rolls or threads',()=>{
  const original=createEpisode('Three acts');
  original.taskHistory=[{id:'roll-kept'}];
  const first=saveSceneCorrection(original,'2:1',{title:'Encounter',notes:'Initial observation',valuesUsed:'Duty'},'2026-11-14T12:01:00Z');
  assert.equal(original.scenes.find(s=>s.id==='2:1').title,'');
  assert.equal(first.scenes.find(s=>s.id==='2:1').notes,'Initial observation');
  const second=saveSceneCorrection(first,'2:1',{title:'Revised',notes:'Correction',valuesUsed:'Honor'},'2026-11-14T12:02:00Z');
  const reverted=undoSceneCorrection(second,'2:1');
  assert.equal(reverted.scenes.find(s=>s.id==='2:1').title,'Encounter');
  assert.equal(reverted.scenes.find(s=>s.id==='2:1').valuesUsed,'Duty');
  assert.equal(reverted.taskHistory[0].id,'roll-kept');
  assert.equal(reverted.sceneCorrections.length,1);
  assert.equal(undoSceneCorrection(reverted,'2:1').scenes.find(s=>s.id==='2:1').title,'');
  assert.throws(()=>undoSceneCorrection(original,'2:1'),/No previous edit/);
  assert.throws(()=>saveSceneCorrection(original,'9:9',{title:'a',notes:'b',valuesUsed:'c'}),/missing scene/);
});
test('scene undo history stays bounded and does not store private book data',()=>{
  let ep=createEpisode('Long episode');
  for(let i=0;i<15;i++)ep=saveSceneCorrection(ep,'1:1',{title:'Edited '+i,notes:'',valuesUsed:''});
  assert.equal(ep.sceneCorrections.length,10);
  assert.equal(ep.sceneCorrections[0].before.title,'Edited 4');
  assert.equal(JSON.stringify(ep.sceneCorrections).includes('sourceSha256'),false);
  assert.equal(saveSceneCorrection(ep,'1:1',{title:'Edited 14',notes:'',valuesUsed:''}),ep);
});

test('malformed or dangling undo history is rejected before restoring campaign',()=>{
 const ep=createEpisode('Restore guard');
 const corrected=saveSceneCorrection(ep,'1:3',{title:'Kept',notes:'My notes',valuesUsed:''});
 assert.equal(normalizeSceneCorrections(corrected.sceneCorrections,corrected.scenes).length,1);
 assert.equal(normalizeEpisode(corrected).sceneCorrections.length,1);
 assert.throws(()=>normalizeEpisode({...corrected,sceneCorrections:[{sceneId:'9:9',at:'now',before:{title:'x',notes:'',valuesUsed:''}}]}),/missing or damaged/);
 assert.throws(()=>normalizeEpisode({...corrected,sceneCorrections:[{sceneId:'1:3',at:'now',before:{title:42,notes:'',valuesUsed:''}}]}),/missing or damaged/);
});
