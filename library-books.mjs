// Local-only multi-document library tools. Never serialise extracted source text
// into campaign records or any public distribution.
import { normalizeDocumentRole } from './content-policy.mjs';
import { BOOK_FORMAT, REFERENCE_FORMAT, validatePreparedDocumentPack, searchBookPack } from './book-data.mjs';

export function libraryBookStatus(document){
  const role=normalizeDocumentRole(document?.role);
  const pack=document?.bookPack;
  if(!pack)return {role,status:'unprepared',searchable:false,gameplay:false};
  try{
    validatePreparedDocumentPack(pack);
    return {role,status:'prepared',searchable:true,
      gameplay:role==='corebook' && pack.format===BOOK_FORMAT,
      sourceSha256:pack.sourceSha256,pageCount:pack.pageCount,
      indexType:pack.format===REFERENCE_FORMAT?'reference':'corebook'};
  }catch{
    return {role,status:'repair-needed',searchable:false,gameplay:false};
  }
}

export function libraryDiagnostics(documents){
  const books=Array.isArray(documents)?documents:[];
  const statuses=books.map(document=>({id:document?.id,name:document?.name,
    ...libraryBookStatus(document)}));
  const corebooks=statuses.filter(book=>book.gameplay);
  const duplicateSources=new Map();
  for(const book of statuses.filter(book=>book.searchable)){
    const key=book.sourceSha256;duplicateSources.set(key,(duplicateSources.get(key)??0)+1);
  }
  return {books:statuses,readyCorebooks:corebooks.length,
    warnings:[
      ...(corebooks.length===0?['No prepared corebook; game-dependent screens stay locked.']:[]),
      ...(corebooks.length>1?['Multiple prepared corebooks are present. Confirm which edition to use for source-dependent rules.']:[]),
      ...([...duplicateSources.values()].some(count=>count>1)?['The same PDF has been indexed more than once.']:[])
    ]};
}

export function searchPreparedLibrary(documents,query,limit=30){
  if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw new Error('Invalid library search limit.');
  const term=String(query??'').trim();
  if(term.length<2)return [];
  const results=[];
  for(const doc of documents??[]){
    const status=libraryBookStatus(doc);
    if(!status.searchable||typeof doc.id!=='string')continue;
    for(const hit of searchBookPack(doc.bookPack,term,Math.min(100,limit-results.length))){
      results.push({documentId:doc.id,documentName:doc.name??'Imported PDF',
        role:status.role,sourceSha256:status.sourceSha256,page:hit.page,excerpt:hit.excerpt});
      if(results.length>=limit)return results;
    }
  }
  return results;
}

function referencesSource(value,sha,seen=new WeakSet(),depth=0){
  if(!value||typeof value!=='object'||depth>12||seen.has(value))return false;
  seen.add(value);
  if(value.sourceSha256===sha||value.sourcePdfSha256===sha)return true;
  return Object.values(value).some(item=>referencesSource(item,sha,seen,depth+1));
}
export function summarizeDocumentRemoval(document,documents,campaigns=[]){
  if(!document||typeof document.id!=='string'||!document.id)
    throw new Error('Select a saved document.');
  const remaining=(documents??[]).filter(item=>item.id!==document.id);
  const sourceSha=document.bookPack?.sourceSha256??null;
  const campaignsWithSource=sourceSha?(campaigns??[]).filter(c=>referencesSource(c,sourceSha)).length:0;
  const matchingSources=sourceSha?remaining.filter(doc=>doc.bookPack?.sourceSha256===sourceSha).length:0;
  const lastPreparedCorebook=libraryBookStatus(document).gameplay &&
    !remaining.some(doc=>libraryBookStatus(doc).gameplay);
  return {campaignsWithSource,matchingSources,lastPreparedCorebook,
    warning:[
      'Removing this PDF also removes its locally compiled private options, tables and page index.',
      ...(campaignsWithSource?[`${campaignsWithSource} campaign(s) reference this source. Their saved data remains, but links may need reattachment.`]:[]),
      ...(lastPreparedCorebook?['This is the last prepared corebook; game screens will lock until another corebook is prepared.']:[]),
      'Other books and campaigns are not deleted.'
    ].join(' ')};
}
