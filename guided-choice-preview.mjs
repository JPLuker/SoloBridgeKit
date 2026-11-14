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
    if(!String(stages[step.id]?.choice??'').trim() ||
       !stages[step.id]?.sourceRef)return i;
  }
  return Math.max(0,steps.length-1);
}
