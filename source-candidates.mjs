// Bounded, source-local choice heading discovery, not game-rule extraction.
// Candidate names and source pages come exclusively from the player's PDF.
// No candidate is verified, saved or allowed to supply numeric game effects.
import {draftCandidate} from './compiler-data.mjs';
import {SOURCE_PREPARATION_STEPS} from './source-readiness.mjs';

const PAGE_WINDOWS=Object.freeze({
  species:10,environment:3,outlook:7,education:7,career:2,
  event1:5,event2:5,'ship-class':12
});
const GENERIC=/^(?:chapter\s|step\s|attributes?\b|disciplines?\b|focus(?:es)?\b|values?\b|systems?\b|departments?\b|d20\b|table\b|scale\b|comms\b|computers\b|engines\b|sensors\b|structure\b|weapons\b|command\b|conn\b|security\b|engineering\b|science\b|medicine\b|your\s|the\s|creating\s|starting\s|finishing\s|roll\s|random\s|generating\s|career\sevents?\b|lifepath\b|reporting\sfor\s|upbringing\b)/i;
const NOISE=/^(?:[\d\s|.]+|[\p{L}\s]{1,3}|.*[.!?,;:]$)/u;

export function scorePrivateHeading(raw,stepId){
  const label=String(raw??'').trim().replace(/^\|\s*/, '').replace(/\s+/g,' ');
  if(!label||label.length<4||label.length>90||NOISE.test(label)||GENERIC.test(label))
    return 0;
  const tokens=label.split(/\s+/);
  if(tokens.length>8 || tokens.filter(token=>token.length===1).length>tokens.length/2)
    return 0;
  const numbered=/^\d{1,2}[.)]\s+/.test(label);
  if(/^\d/.test(label)&&!numbered)return 0;
  const clean=numbered?label.replace(/^\d{1,2}[.)]\s+/,''):label;
  const letters=clean.match(/\p{L}/gu)||[];
  const upper=clean.match(/\p{Lu}/gu)||[];
  if(letters.length<3)return 0;
  const uppercase=upper.length/letters.length>=0.85;
  const startsUpper=clean.split(/\s+/).filter(word=>/^\p{Lu}/u.test(word)).length/
    clean.split(/\s+/).length;
  const titlecase=startsUpper>=0.7&&tokens.length<=6;
  if(!uppercase&&!titlecase)return 0;
  // Numbered event headings and starship-class names are distinct table formats.
  if(stepId==='event1'||stepId==='event2')return numbered?10:uppercase?4:2;
  if(stepId==='ship-class')return !uppercase&&titlecase?9:uppercase?2:1;
  return uppercase?8:titlecase?4:0;
}

export function discoverStageCandidates(pack,stepId,{maxPages=null,limit=18,startPage=null}={}){
  const step=SOURCE_PREPARATION_STEPS.find(item=>item.id===stepId);
  if(!step)throw new Error('Select a character or ship choice section.');
  const window=maxPages===null?PAGE_WINDOWS[stepId]??4:maxPages;
  if(!Number.isSafeInteger(window)||window<1||window>16||
    !Number.isSafeInteger(limit)||limit<1||limit>30)
    throw new Error('Invalid private suggestion limit.');
  const start=startPage===null?step.page:Number(startPage);
  if(!Number.isSafeInteger(start)||start<1||start>pack?.pageCount)
    throw new Error('The selected source page is outside this PDF.');
  if(!/^[a-f0-9]{64}$/.test(pack?.sourceSha256??'')||
    !Array.isArray(pack?.pages)||pack.pages.length!==pack.pageCount)
    throw new Error('Prepared private PDF index is invalid.');
  const found=new Map();
  for(let page=start;page<=Math.min(pack.pageCount,start+window-1);page++){
    const text=String(pack.pages[page-1]?.text??'');
    for(const line of text.split(/\r?\n/)){
      const label=line.trim().replace(/^\|\s*/, '').replace(/\s+/g,' ');
      const score=scorePrivateHeading(label,stepId);
      if(!score)continue;
      const key=label.toLocaleLowerCase();
      if(!found.has(key))found.set(key,{label,page,score});
    }
  }
  return [...found.values()].sort((a,b)=>b.score-a.score||a.page-b.page)
    .slice(0,limit).map(({label,page})=>draftCandidate({
      kind:step.kind,label,page,sourceSha256:pack.sourceSha256,
      pageCount:pack.pageCount,payload:step.kind==='lifepath'?{stepId}:{} ,
      excerpt:label
    }));
}
