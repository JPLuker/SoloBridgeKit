import {validateLifepathStep} from './lifepath.mjs';
import {shipTalents,shipTalentLimit} from './shipbuilder.mjs';
// R2: format verified, locally sourced option bonuses for accessible previews.
// This module deliberately includes no publisher option names or stat blocks.
const attributeOrder=['control','daring','fitness','insight','presence','reason'];
const disciplineOrder=['command','conn','security','engineering','science','medicine'];
const readable=key=>key.charAt(0).toUpperCase()+key.slice(1);

export function verifiedChoicePreview(option){
  if(!option||typeof option!=='object')return [];
  const effect=option.record||{};
  const parts=[];
  for(const [key,field] of [['attributes',attributeOrder],['disciplines',disciplineOrder]]){
    const bonuses=effect[key];
    if(!bonuses||typeof bonuses!=='object')continue;
    for(const property of field){
      const number=Number(bonuses[property]);
      if(Number.isSafeInteger(number)&&number>0&&number<=5)
        parts.push('+'+number+' '+readable(property));
    }
  }
  return parts;
}

export function nextIncompleteCreationStep(path,steps){
  const stages=path?.stages||{};
  for(let i=0;i<steps.length;i++){
    const step=steps[i];
    if(step.id==='finishing')continue;
    const stage=stages[step.id];
    if(!stage?.choice?.trim() || (path.mode==='guided'&&!stage.sourceRef))
      return i;
    try{if(validateLifepathStep(step.id,stage).length)return i;}
    catch{return i;}
  }
  return Math.max(0,steps.length-1);
}

export function verifiedShipPreview(selection){
  if(!selection||typeof selection!=='object')return [];
  const result=[];
  if(['starship','station'].includes(selection.kind))result.push(selection.kind==='station'?'Station':'Starship');
  if(Number.isFinite(Number(selection.scale))&&Number(selection.scale)>0)
    result.push('Scale '+selection.scale);
  for(const [label,key] of [['Systems','systems'],['Departments','departments']]){
    const ratings=selection[key];
    if(!ratings||typeof ratings!=='object')continue;
    const entries=Object.entries(ratings).filter(([,value])=>String(value).trim()!=='');
    if(entries.length)result.push(label+' ratings: '+entries.length+' recorded');
  }
  return result;
}

export function nextIncompleteShipStep(ship){
  if(!ship||!String(ship.era??'').trim())return 0;
  if(!String(ship.scale??'').trim()||
     (ship.kind!=='station'&&!String(ship.className??'').trim())||
     (ship.mode==='guided'&&!ship.sourceRef))return 1;
  if(!String(ship.polityTrait??'').trim())return 2;
  // Additional traits are optional. Never invent a talent; check count only.
  const talents=shipTalents(ship.talents);
  const limit=shipTalentLimit(ship.kind,Number(ship.scale));
  if(ship.kind==='starship'&&talents.length!==limit)return 4;
  if(ship.kind==='station'&&talents.length>limit)return 4;
  if(!String(ship.name??'').trim()||
     (ship.kind!=='station'&&!String(ship.registry??'').trim()))return 5;
  return 5;
}
