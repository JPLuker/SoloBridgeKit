// Captain's Log (2026) character development: source mechanics only, no book prose.
// PDF pp. 141–142 (milestones), 202–203 (values/focuses), 214 (injury recovery).
import { CHARACTER_ATTRIBUTES, CHARACTER_DISCIPLINES, makeId } from './model.mjs';

const HASH=/^[a-f0-9]{64}$/;
const attributes=CHARACTER_ATTRIBUTES.map(x=>x.toLowerCase());
const disciplines=CHARACTER_DISCIPLINES.map(x=>x.toLowerCase());
const allEvents=new Set(['attribute-shift','discipline-shift','focus-swap','value-change']);
const conditionStates=new Set(['active','recovering','resolved']);

export function normalizeCharacterDevelopment(raw) {
  const history=raw?.history ?? [], conditions=raw?.conditions ?? [];
  if (!Array.isArray(history) || history.length>1000 ||
      !Array.isArray(conditions) || conditions.length>200)
    throw new Error('Invalid character development history.');
  const seen=new Set();
  for(const item of [...history,...conditions]) {
    if(!item || typeof item.id!=='string' || !item.id || seen.has(item.id))
      throw new Error('Duplicate or malformed character development record.');
    seen.add(item.id);
    if(typeof item.sourcePdfSha256!=='string' || !HASH.test(item.sourcePdfSha256) ||
       !Number.isSafeInteger(item.sourcePage) || item.sourcePage<1 || item.sourcePage>2000)
      throw new Error('Development entry needs its original source book and page.');
  }
  return {history:history.map(item=>({...item})),conditions:conditions.map(item=>({...item}))};
}
function lines(value){return String(value??'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}
function ratingMap(source, keys,min,max) {
  const values={};
  for(const key of keys){
    const value=source?.[key];
    if(value==null || !/^\d+$/.test(String(value)) ||
      Number(value)<min || Number(value)>max)
      throw new Error('Complete your character ratings before using milestones ('+key+').');
    values[key]=Number(value);
  }
  if(Object.values(values).filter(x=>x===max).length>1)
    throw new Error('Only one rating may be at the maximum ('+max+').');
  return values;
}
function readyCharacter(character){
  const a=ratingMap(character?.attributes,attributes,7,12);
  const d=ratingMap(character?.disciplines,disciplines,1,5);
  if(Object.values(a).reduce((x,y)=>x+y,0)!==56 ||
     Object.values(d).reduce((x,y)=>x+y,0)!==16)
    throw new Error('Character must have complete 56/16 ratings before a milestone.');
  const focuses=lines(character.focuses), values=lines(character.values);
  if(focuses.length!==6 || values.length!==4)
    throw new Error('A milestone requires a completed character with six focuses and four values.');
  return {a,d,focuses,values};
}
function context(options,page){
  const sourcePdfSha256=options?.sourcePdfSha256;
  const missionId=options?.missionId;
  if (!HASH.test(sourcePdfSha256??'')) throw new Error('Choose the prepared source rulebook.');
  if(typeof missionId!=='string' || !missionId || options?.missionComplete!==true)
    throw new Error('Character development changes must be recorded after a completed mission.');
  return {missionId,sourcePdfSha256,sourcePage:page};
}
function text(value,label,max=200) {
  const v=String(value??'').trim();
  if(!v || v.length>max) throw new Error('Enter a valid '+label+'.');
  return v;
}
function swapLine(entries,oldValue,newValue,label){
  const from=text(oldValue,'existing '+label),to=text(newValue,'replacement '+label);
  const where=entries.indexOf(from);
  if(where<0)throw new Error('The original '+label+' was not found.');
  if(from===to || entries.includes(to))
    throw new Error('Choose a different, unused '+label+'.');
  const revised=[...entries];revised[where]=to;
  return revised.join('\n');
}
function numericShift(map,keys,from,to,min,max,label){
  if(!keys.includes(from)||!keys.includes(to)||from===to)
    throw new Error('Choose two different '+label+'.');
  if(map[from]<=min)throw new Error('Cannot lower '+from+' below '+min+'.');
  if(map[to]>=max)throw new Error('Cannot raise '+to+' above '+max+'.');
  const updated={...map,[from]:map[from]-1,[to]:map[to]+1};
  if(Object.values(updated).filter(x=>x===max).length>1)
    throw new Error('Only one '+label+' may reach '+max+'.');
  return Object.fromEntries(Object.entries(updated).map(([k,v])=>[k,String(v)]));
}
export function applyCharacterMilestone(character,action,options={}) {
  const source=context(options,142), kind=action?.type;
  if(!['attribute-shift','discipline-shift','focus-swap'].includes(kind))
    throw new Error('Unsupported milestone choice.');
  const dev=normalizeCharacterDevelopment(character?.development);
  if(dev.history.some(e=>e.missionId===source.missionId && e.category==='milestone'))
    throw new Error('This mission already has a recorded character milestone.');
  const ready=readyCharacter(character);
  const note=String(options.note??'').trim();
  if(note.length>1000)throw new Error('Milestone note is too long.');
  let next={...character},before,after;
  if(kind==='attribute-shift'){
    const changed=numericShift(ready.a,attributes,action.from,action.to,7,12,'attribute');
    before={...character.attributes};after={...changed};next.attributes=changed;
  } else if(kind==='discipline-shift'){
    const changed=numericShift(ready.d,disciplines,action.from,action.to,1,5,'discipline');
    before={...character.disciplines};after={...changed};next.disciplines=changed;
  } else {
    before=character.focuses;
    after=swapLine(ready.focuses,action.from,action.to,'focus');
    next.focuses=after;
  }
  const entry={id:makeId(),category:'milestone',type:kind,...source,at:new Date().toISOString(),
    reason:text(options.reason,'milestone reason',100),note,before,after};
  next.development={...dev,history:[...dev.history,entry]};
  return next;
}
export function replaceChallengedValue(character,change,options={}) {
  const source=context(options,202);
  if(options.challenged!==true)throw new Error('Confirm that this value was challenged during the mission.');
  const dev=normalizeCharacterDevelopment(character?.development);
  if(dev.history.some(e=>e.missionId===source.missionId && e.type==='value-change' && e.before===change.from))
    throw new Error('This value was already replaced after this mission.');
  const before=character?.values,values=lines(before);
  if(values.length!==4)throw new Error('Set four values on the character before replacing one.');
  const after=swapLine(values,change?.from,change?.to,'value');
  const entry={id:makeId(),category:'value',type:'value-change',...source,
    at:new Date().toISOString(),before:change.from,after:change.to,note:String(options.note??'').slice(0,1000)};
  return {...character,values:after,development:{...dev,history:[...dev.history,entry]}};
}
export function addCharacterCondition(character,change,options={}) {
  if(!HASH.test(options.sourcePdfSha256??''))
    throw new Error('Choose the prepared source rulebook.');
  const dev=normalizeCharacterDevelopment(character?.development);
  const label=text(change?.label,'condition label',120);
  const notes=String(change?.notes??'').trim();
  if(notes.length>2000)throw new Error('Condition notes are too long.');
  const entry={id:makeId(),label,notes,kind:'injury-or-condition',state:'active',
    sourcePdfSha256:options.sourcePdfSha256,sourcePage:214,at:new Date().toISOString()};
  return {...character,development:{...dev,conditions:[...dev.conditions,entry]}};
}
export function updateCharacterCondition(character,id,state){
  if(!conditionStates.has(state))throw new Error('Unsupported condition state.');
  const dev=normalizeCharacterDevelopment(character?.development);
  const found=dev.conditions.find(e=>e.id===id);
  if(!found)throw new Error('The saved condition no longer exists.');
  const conditions=dev.conditions.map(c=>c.id===id?
    {...c,state,updatedAt:new Date().toISOString()}:c);
  return {...character,development:{...dev,conditions}};
}
