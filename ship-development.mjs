// Player-authorized vessel milestones. Captain's Log 2026 source PDF p.181.
// No official vessel data, automatic award, or invented narrative content.
const FINGERPRINT=/^[a-f0-9]{64}$/;
const SYSTEMS=['comms','computers','engines','sensors','structure','weapons'];
const DEPARTMENTS=['command','conn','security','engineering','science','medicine'];
const MODES=new Set(['transfer-system','transfer-department','improve-system','improve-department']);
const makeId=()=>globalThis.crypto?.randomUUID?.() ?? 'ship-event-'+Date.now()+'-'+Math.random().toString(36).slice(2);
function requireSource(sha) {
  if(!FINGERPRINT.test(sha??''))throw new Error('Choose the prepared private source PDF.');
}
export function normalizeShipDevelopment(raw) {
  if(raw==null)return {history:[],conditions:[]};
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||
    !Array.isArray(raw.history)||!Array.isArray(raw.conditions)||
    raw.history.length>1000||raw.conditions.length>100)
    throw new Error('Invalid ship development data.');
  const ids=new Set();
  for(const record of [...raw.history,...raw.conditions]){
    if(!record||typeof record.id!=='string'||!record.id||ids.has(record.id)||
      !FINGERPRINT.test(record.sourcePdfSha256??'')||
      !Number.isSafeInteger(record.sourcePage)||record.sourcePage<1||record.sourcePage>2000)
      throw new Error('Malformed or duplicate ship history record.');
    ids.add(record.id);
  }
  return {history:raw.history.map(x=>({...x})),conditions:raw.conditions.map(x=>({...x}))};
}
function number(ship,field,key,minimum,maximum){
  const raw=String(ship?.[field]?.[key]??'').trim();
  if(!/^\d+$/.test(raw)||Number(raw)<minimum||Number(raw)>maximum)
    throw new Error('Enter verified '+field+' ratings before a vessel milestone ('+key+').');
  return Number(raw);
}
export function applyShipMilestone(ship,action,context={}) {
  const type=action?.type;
  if(!MODES.has(type))throw new Error('Unsupported vessel milestone.');
  requireSource(context.sourcePdfSha256);
  if(context.missionComplete!==true||typeof context.missionId!=='string'||!context.missionId)
    throw new Error('Vessel milestones require a completed mission.');
  const reason=String(context.reason??'').trim();
  if(!reason||reason.length>160)throw new Error('Describe the event that earned this ship milestone.');
  const note=String(context.note??'').trim();
  if(note.length>1200)throw new Error('Milestone note is too long.');
  const dev=normalizeShipDevelopment(ship?.development);
  if(dev.history.some(item=>item.missionId===context.missionId))
    throw new Error('This mission already has a recorded vessel milestone.');
  const field=type.endsWith('system')?'systems':'departments';
  const allowed=field==='systems'?SYSTEMS:DEPARTMENTS;
  const min=field==='systems'?6:1, max=field==='systems'?12:5;
  // Check the entire current rating group to avoid editing incomplete/illegal sheets.
  for(const key of allowed)number(ship,field,key,min,max);
  const to=String(action?.to??'');
  if(!allowed.includes(to))throw new Error('Select a valid destination '+field+' rating.');
  const before={...ship[field]};
  const destination=number(ship,field,to,min,max);
  if(destination>=max)throw new Error('Cannot raise '+to+' above '+max+'.');
  let result;
  if(type.startsWith('transfer-')){
    const from=String(action?.from??'');
    if(from===to||!allowed.includes(from))
      throw new Error('Choose two different '+field+' ratings to transfer a point.');
    const origin=number(ship,field,from,min,max);
    if(origin<=min)throw new Error('Cannot lower '+from+' below '+min+'.');
    result={...before,[from]:String(origin-1),[to]:String(destination+1)};
  } else {
    result={...before,[to]:String(destination+1)};
  }
  const entry={id:makeId(),type,category:'vessel-milestone',
    missionId:context.missionId,sourcePdfSha256:context.sourcePdfSha256,sourcePage:181,
    at:new Date().toISOString(),reason,note,from:action?.from??null,to,before,after:result};
  return {...ship,[field]:result,
    development:{...dev,history:[...dev.history,entry]}};
}
export function addShipCondition(ship,change,options={}) {
  requireSource(options.sourcePdfSha256);
  const label=String(change?.label??'').trim(),note=String(change?.note??'').trim();
  if(!label||label.length>120||note.length>1600)throw new Error('Invalid vessel condition.');
  const dev=normalizeShipDevelopment(ship?.development);
  const condition={id:makeId(),label,note,state:'active',sourcePdfSha256:options.sourcePdfSha256,
    sourcePage:181,at:new Date().toISOString()};
  return {...ship,development:{...dev,conditions:[...dev.conditions,condition]}};
}
export function updateShipCondition(ship,id,state) {
  if(!['active','recovering','resolved'].includes(state))
    throw new Error('Invalid vessel condition status.');
  const dev=normalizeShipDevelopment(ship?.development);
  if(!dev.conditions.some(entry=>entry.id===id))throw new Error('The vessel condition was not found.');
  return {...ship,development:{...dev,conditions:dev.conditions.map(c=>c.id===id?
    {...c,state,updatedAt:new Date().toISOString()}:c)}};
}