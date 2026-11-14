// Player-authored ongoing story threads. No generated narratives or source-book prose.
const tag = scene => scene?.id ?? (scene ? scene.act+':'+scene.number : null);
const makeId=()=>globalThis.crypto?.randomUUID?.() ?? 'thread-'+Date.now()+'-'+Math.random().toString(36).slice(2);
function member(scenes,id) {
  return typeof id==='string' && Array.isArray(scenes) && scenes.some(x=>tag(x)===id);
}
function text(value,max,label,required=false) {
  if(typeof value!=='string'||value.length>max||(required&&!value.trim()))
    throw new Error('Invalid story thread '+label+'.');
  return value.trim();
}
export function normalizeMissionThreads(raw,scenes) {
  if(raw==null)return [];
  if(!Array.isArray(raw)||raw.length>200)throw new Error('Invalid story thread collection.');
  const ids=new Set();
  return raw.map(entry=>{
    if(!entry||typeof entry.id!=='string'||!entry.id||ids.has(entry.id)||
      !['open','resolved'].includes(entry.status))
      throw new Error('Damaged or duplicate story thread.');
    ids.add(entry.id);
    const createdSceneId=entry.createdSceneId??null;
    const resolvedSceneId=entry.resolvedSceneId??null;
    if((createdSceneId!=null&&!member(scenes,createdSceneId))||
      (resolvedSceneId!=null&&!member(scenes,resolvedSceneId)))
      throw new Error('A story thread refers to a scene no longer available.');
    return {...entry,title:text(entry.title,140,'title',true),
      notes:text(entry.notes??'',2000,'notes'),
      status:entry.status,createdSceneId,resolvedSceneId,
      createdAt:text(entry.createdAt,80,'creation date',true),
      resolvedAt:entry.status==='resolved'?entry.resolvedAt??null:null};
  });
}
export function createMissionThread(episode,{title,notes='',sceneId=null},
  id=makeId(),time=new Date().toISOString()){
  if(!episode||!Array.isArray(episode.scenes))throw new Error('Mission scenes are missing.');
  if(sceneId!=null&&!member(episode.scenes,sceneId))
    throw new Error('Cannot link a thread to a missing scene.');
  const threads=normalizeMissionThreads(episode.threads,episode.scenes);
  const created={id,title:text(title,140,'title',true),notes:text(notes,2000,'notes'),
    createdSceneId:sceneId,status:'open',createdAt:time,resolvedSceneId:null,resolvedAt:null};
  return {...episode,threads:normalizeMissionThreads([...threads,created],episode.scenes)};
}
export function setMissionThreadStatus(episode,id,status,sceneId=null,time=new Date().toISOString()){
  if(!['open','resolved'].includes(status))throw new Error('Unsupported story thread status.');
  const threads=normalizeMissionThreads(episode?.threads,episode?.scenes);
  if(!threads.some(x=>x.id===id))throw new Error('The story thread was not found.');
  if(status==='resolved'&&sceneId!=null&&!member(episode.scenes,sceneId))
    throw new Error('The resolution scene is missing.');
  const changed=threads.map(x=>x.id===id?{...x,status,
    resolvedSceneId:status==='resolved'?sceneId:null,
    resolvedAt:status==='resolved'?time:null}:x);
  return {...episode,threads:normalizeMissionThreads(changed,episode.scenes)};
}
export function deleteMissionThread(episode,id) {
  const threads=normalizeMissionThreads(episode?.threads,episode?.scenes);
  if(!threads.some(x=>x.id===id))throw new Error('The story thread was not found.');
  return {...episode,threads:threads.filter(x=>x.id!==id)};
}
export function summarizeSceneWorkspace(episode,sceneId) {
  if(!member(episode?.scenes,sceneId))throw new Error('Selected scene is not available.');
  const threads=normalizeMissionThreads(episode.threads,episode.scenes);
  return {
    sceneId,
    taskRolls:(episode.taskHistory??[]).filter(x=>x.sceneId===sceneId).length,
    journalEntries:(episode.entries??[]).filter(x=>x.sceneId===sceneId).length,
    tableRefs:(episode.entries??[]).filter(x=>x.kind==='table-reference'&&x.sceneId===sceneId).length,
    openThreads:threads.filter(x=>x.status==='open'&&x.createdSceneId===sceneId).length,
    resolvedThreads:threads.filter(x=>x.status==='resolved'&&x.resolvedSceneId===sceneId).length
  };
}
