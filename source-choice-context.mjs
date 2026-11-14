// A bounded excerpt from a player-imported, source-fingerprint-matched PDF.
// Used only at runtime. Never include returned text in public bundles, logs,
// telemetry, exports or synthetic test artifacts from commercial books.
export function localChoiceContext(pack,record,{radius=320}={}){
  if(!pack||!record||pack.sourceSha256!==record.sourceSha256)return '';
  if(!Number.isSafeInteger(record.page)||record.page<1||record.page>pack.pageCount)return '';
  if(!Number.isSafeInteger(radius)||radius<80||radius>600)throw new Error('Invalid context size.');
  const text=String(pack.pages?.[record.page-1]?.text??'');
  if(!text||typeof record.label!=='string'||!record.label.trim())return '';
  const needle=record.label.trim().toLowerCase();
  const index=text.toLowerCase().indexOf(needle);
  if(index<0)return '';
  const begin=Math.max(0,index-radius);
  const end=Math.min(text.length,index+record.label.length+radius);
  const snippet=text.slice(begin,end).replace(/[\t ]+/g,' ').trim();
  return (begin?'…':'')+snippet+(end<text.length?'…':'');
}
