// R1 — player-facing source readiness, entirely derived from privately held
// verified records. A searchable PDF is NOT a playable option catalog.
// No licensed source text, labels or mechanical bonuses are bundled here.
import {LIFEPATH_STEPS} from './lifepath.mjs';
import {compiledCatalog} from './compiler-data.mjs';
import {optionsForStep} from './private-options.mjs';
import {normalizePrivateShips} from './private-ships.mjs';
import {validateBookPack} from './book-data.mjs';

export const SOURCE_PREPARATION_STEPS=Object.freeze([
  ...LIFEPATH_STEPS.filter(step=>step.id!=='finishing').map(step=>Object.freeze({
    id:step.id,title:step.title.replace(/^\d+\. /,''),
    kind:'lifepath',page:step.page,
    explanation:step.id==='species'
      ? 'Choose the species you want to play. You can read choices from your private book before confirming their bonuses.'
      : 'Review a choice from this part of your rulebook before using it in the character builder.'
  })),
  Object.freeze({id:'ship-class',title:'Ship or station class',kind:'ship-class',page:149,
    explanation:'Choose a class from your own rulebook, then verify its published systems and departments.'})
]);

function safeCatalog(book,kind){
  try{return compiledCatalog(book.compiledRecords??[],
    book.bookPack.sourceSha256,book.bookPack.pageCount,kind);}
  catch{return [];} // damaged private records never become verified options
}
export function sourceReadiness(book){
  if(!book?.bookPack)return {indexed:false,steps:[],confirmedChoices:0,missing:[],complete:false};
  try{validateBookPack(book.bookPack);}
  catch{return {indexed:false,steps:[],confirmedChoices:0,missing:[],complete:false};}
  const compiledLifepath=safeCatalog(book,'lifepath');
  const compiledShips=safeCatalog(book,'ship-class');
  let manualShips=[];
  try{manualShips=normalizePrivateShips(book.ships,book.bookPack.sourceSha256);}catch{}
  const steps=SOURCE_PREPARATION_STEPS.map(step=>{
    let options=[];
    if(step.kind==='ship-class')options=[...compiledShips,...manualShips];
    else{
      let manual=[];
      try{manual=optionsForStep(book.options,step.id,book.bookPack.sourceSha256);}catch{}
      options=[...compiledLifepath.filter(option=>option.stage===
        (step.id==='event1'||step.id==='event2'?'careerEvent':step.id)),...manual];
    }
    const identifiers=new Set(options.map(option=>option.id));
    return {...step,count:identifiers.size,hasChoice:identifiers.size>0,
      page:Math.min(step.page,book.bookPack.pageCount)};
  });
  const missing=steps.filter(step=>!step.hasChoice).map(step=>step.id);
  return {indexed:true,steps,
    confirmedChoices:steps.reduce((sum,step)=>sum+step.count,0),
    missing,complete:missing.length===0};
}
