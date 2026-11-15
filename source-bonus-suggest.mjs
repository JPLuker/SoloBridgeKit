// Optional, strictly unverified modifier suggestions from a player-owned PDF.
// Only explicit visible "+N <attribute>" or "<attribute> +N" strings count.
// Never infer an unstated bonus, never confirm, and never store source text in
// the public bundle. The player must compare the suggestion with their PDF.
import {localChoiceContext} from './source-choice-context.mjs';
const attributes=new Set(['control','daring','fitness','insight','presence','reason']);
const disciplines=new Set(['command','conn','security','engineering','science','medicine']);
const terms=[...attributes,...disciplines];
const names=terms.join('|');

export function suggestExplicitBonuses(pack,record){
  const excerpt=localChoiceContext(pack,record,{radius:550});
  const attributesFound={},disciplinesFound={},ambiguous=new Set();
  if(!excerpt)return {attributes:attributesFound,disciplines:disciplinesFound,ambiguous:[],found:0};
  const patterns=[
    new RegExp('\\b('+names+')\\s*\\+\\s*([1-5])\\b','gi'),
    new RegExp('\\+\\s*([1-5])\\s*('+names+')\\b','gi')
  ];
  const seen=new Map();
  for(let patternIndex=0;patternIndex<patterns.length;patternIndex++){
    for(const match of excerpt.matchAll(patterns[patternIndex])){
      const key=String(patternIndex===0?match[1]:match[2]).toLowerCase();
      const value=Number(patternIndex===0?match[2]:match[1]);
      if(!terms.includes(key))continue;
      if(seen.has(key)&&seen.get(key)!==value)ambiguous.add(key);
      else seen.set(key,value);
    }
  }
  for(const [key,value] of seen){
    if(ambiguous.has(key))continue;
    const group=attributes.has(key)?attributesFound:disciplinesFound;
    group[key]=value;
  }
  return {attributes:attributesFound,disciplines:disciplinesFound,
    ambiguous:[...ambiguous],found:Object.keys(attributesFound).length+Object.keys(disciplinesFound).length};
}
