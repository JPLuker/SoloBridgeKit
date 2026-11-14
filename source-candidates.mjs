// User-local, bounded candidate discovery for a selected creation stage.
// Never confirms candidates automatically or distributes extracted source text.
import {scanBookPage} from './compiler-data.mjs';
import {SOURCE_PREPARATION_STEPS} from './source-readiness.mjs';

export function discoverStageCandidates(pack,stepId,{maxPages=4,limit=18}={}){
  const step=SOURCE_PREPARATION_STEPS.find(item=>item.id===stepId);
  if(!step)throw new Error('Select a character or ship choice section.');
  if(!Number.isSafeInteger(maxPages)||maxPages<1||maxPages>8||
    !Number.isSafeInteger(limit)||limit<1||limit>30)
    throw new Error('Invalid private suggestion limit.');
  const start=step.page;
  if(start>pack?.pageCount)throw new Error('The selected source page is outside this PDF.');
  const results=[],seen=new Set();
  for(let page=start;page<=Math.min(pack.pageCount,start+maxPages-1);page++){
    const candidates=scanBookPage(pack,page,step.kind,Math.min(12,limit));
    for(const candidate of candidates){
      const key=candidate.label.toLowerCase();
      if(seen.has(key))continue;
      seen.add(key);
      results.push(step.kind==='lifepath'?{...candidate,payload:{...candidate.payload,stepId}}:candidate);
      if(results.length===limit)return results;
    }
  }
  return results;
}
