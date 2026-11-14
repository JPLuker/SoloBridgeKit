// Private review helpers: count player-entered modifiers, and recover only
// matching-source drafts. This module contains no proprietary option content.
import {LIFEPATH_STEPS} from './lifepath.mjs';
import {revalidateCompiledRecords} from './compiler-data.mjs';

const ATTRIBUTE_KEYS=['control','daring','fitness','insight','presence','reason'];
const DISCIPLINE_KEYS=['command','conn','security','engineering','science','medicine'];
const TYPES=Object.freeze({attributes:ATTRIBUTE_KEYS,disciplines:DISCIPLINE_KEYS});

export function reviewBudget(stepId){
  const step=LIFEPATH_STEPS.find(item=>item.id===stepId);
  if(!step||step.id==='finishing')return null;
  return {attributes:step.attributes,disciplines:step.disciplines};
}
export function reviewBonusTotals(stepId,record={}){
  const budget=reviewBudget(stepId);
  if(!budget)return null;
  const categories={};
  for(const [category,keys] of Object.entries(TYPES)){
    const raw=record?.[category]??{};
    const values=keys.map(key=>Number(raw[key]??0));
    const valid=values.every(value=>Number.isSafeInteger(value)&&value>=0&&value<=5);
    const assigned=valid?values.reduce((a,b)=>a+b,0):null;
    categories[category]={assigned,expected:budget[category],
      remaining:assigned===null?null:budget[category]-assigned,valid};
  }
  return categories;
}
export function savedStageDrafts(book,stepId){
  const pack=book?.bookPack;
  if(!pack)return [];
  let records;
  try{records=revalidateCompiledRecords(book.compiledRecords??[],pack.sourceSha256,pack.pageCount);}
  catch{return [];}
  const kind=stepId==='ship-class'?'ship-class':'lifepath';
  return records.filter(record=>record.kind===kind &&
    record.sourceSha256===pack.sourceSha256 &&
    record.page<=pack.pageCount &&
    ['draft','needs-review'].includes(record.status) &&
    (kind==='ship-class'||(record.payload?.stepId===stepId ||
      ((stepId==='event1'||stepId==='event2') &&
        ['event1','event2'].includes(record.payload?.stepId))))
  );
}

export function checkSourceBonusBudget(stepId,record={}){
  const totals=reviewBonusTotals(stepId,record);
  if(!totals)return {ready:false,message:'Choose a supported character creation stage.'};
  for(const [name,result] of Object.entries(totals)){
    if(!result.valid)return {ready:false,message:'Enter valid whole-number '+name+' bonuses from your PDF.'};
    if(result.remaining!==0)return {ready:false,
      message:'Check the '+name+' bonuses against your PDF. This stage expects '+
        result.expected+' points, but '+result.assigned+' are assigned.'};
  }
  return {ready:true,message:'Point totals match this stage. Confirm the exact choices against your book.'};
}
