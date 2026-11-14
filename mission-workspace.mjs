// Player-authored, resumable solo mission workspace. No proprietary source text.
const SHA=/^[a-f0-9]{64}$/;
const sceneKey = scene => scene?.id ?? (scene ? scene.act+':'+scene.number : '');
export function resolveActiveEpisodeId(campaign) {
  const episodes=Array.isArray(campaign?.episodes)?campaign.episodes:[];
  const selected=episodes.find(item=>item.id===campaign?.activeEpisodeId);
  return selected?.id ?? episodes.find(item=>item.status==='active')?.id ?? episodes[0]?.id ?? null;
}
export function selectActiveEpisode(campaign,id) {
  if (!Array.isArray(campaign?.episodes)||!campaign.episodes.some(x=>x.id===id))
    throw new Error('Choose a saved mission before continuing.');
  return {...campaign,activeEpisodeId:id};
}
export function resolveActiveSceneId(episode,scenes=episode?.scenes) {
  if(!Array.isArray(scenes)||!scenes.length)return null;
  if (scenes.some(s=>sceneKey(s)===episode?.activeSceneId))return episode.activeSceneId;
  return sceneKey(scenes.find(s=>!s.completed)??scenes[0]);
}
export function selectActiveScene(episode,id){
  if (!Array.isArray(episode?.scenes)||!episode.scenes.some(scene=>sceneKey(scene)===id))
    throw new Error('That scene is not part of the saved mission.');
  return {...episode,activeSceneId:id};
}
export function sceneTag(id) {
  const match=typeof id==='string'?/^([1-3]):([1-9]\d*)$/.exec(id):null;
  return match?'Act '+match[1]+', Scene '+match[2]:null;
}
export function makePrivateTableReference(table,roll,sourceSha256,sceneId=null,
  id=globalThis.crypto?.randomUUID?.(),at=new Date().toISOString()){
  if(!SHA.test(sourceSha256??'')||table?.sourceSha256!==sourceSha256)
    throw new Error('The private table belongs to another PDF.');
  const page=Number(table.page),result=Number(roll?.value);
  if(!Number.isSafeInteger(page)||page<1||page>2000||
    !Number.isSafeInteger(result)||result<1||result>table.sides||
    !table?.entries?.some(row=>result>=row.min&&result<=row.max)||
    typeof table.id!=='string'||!table.id)
    throw new Error('The private table result is invalid.');
  if(sceneId!=null&&!sceneTag(sceneId))throw new Error('Invalid source scene.');
  // The title, extracted random-table row and publisher prose NEVER enter
  // the player's default campaign journal. Only mechanical provenance.
  return {id,at,kind:'table-reference',tableId:table.id,
    sourceSha256,page,rollValue:result,sceneId,
    text:'Private table reference · PDF page '+page+' · roll '+result};
}
export function appendSceneTableReference(episode,entry) {
  if(!episode||!Array.isArray(episode.entries))throw new Error('Mission log is missing.');
  if(entry?.sceneId&&!episode.scenes?.some(s=>sceneKey(s)===entry.sceneId))
    throw new Error('The referenced scene no longer exists.');
  return {...episode,entries:[...episode.entries,entry]};
}


// Bounded, player-only scene editing history. Keep snapshots separate from
// licensed reference records and preserve them in ordinary campaign backups.
const SCENE_HISTORY_LIMIT=10;
export function saveSceneCorrection(episode,sceneId,changes,at=new Date().toISOString()){
  const scene=episode?.scenes?.find(s=>sceneKey(s)===sceneId);
  if(!scene)throw new Error('Cannot correct a missing scene.');
  if(!changes||['title','notes','valuesUsed'].some(k=>typeof changes[k]!=='string'))
    throw new Error('Scene changes must be player-written text.');
  const before={title:scene.title??'',notes:scene.notes??'',valuesUsed:scene.valuesUsed??''};
  const after={title:changes.title,notes:changes.notes,valuesUsed:changes.valuesUsed};
  if(Object.keys(before).every(k=>before[k]===after[k]))return episode;
  const existing=Array.isArray(episode.sceneCorrections)?episode.sceneCorrections:[];
  const correction={sceneId,at,before};
  return {...episode,scenes:episode.scenes.map(s=>sceneKey(s)===sceneId?{...s,...after}:s),
    sceneCorrections:[...existing,correction].slice(-SCENE_HISTORY_LIMIT)};
}
export function undoSceneCorrection(episode,sceneId){
  const history=Array.isArray(episode?.sceneCorrections)?episode.sceneCorrections:[];
  const position=history.findLastIndex(entry=>entry.sceneId===sceneId);
  if(position<0)throw new Error('No previous edit for this scene.');
  const scene=episode?.scenes?.find(s=>sceneKey(s)===sceneId);
  if(!scene)throw new Error('Cannot undo an edit to a missing scene.');
  const before=history[position].before;
  if(!before||['title','notes','valuesUsed'].some(k=>typeof before[k]!=='string'))
    throw new Error('Damaged scene edit history.');
  return {...episode,scenes:episode.scenes.map(s=>sceneKey(s)===sceneId?{...s,...before}:s),
    sceneCorrections:history.filter((_,i)=>i!==position)};
}
