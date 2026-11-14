// Local-only multi-document library tools. Never serialise extracted source text
// into campaign records or any public distribution.
import { normalizeDocumentRole } from './content-policy.mjs';
import { BOOK_FORMAT, REFERENCE_FORMAT, validatePreparedDocumentPack, searchBookPack } from './book-data.mjs';

export function normalizeSourceEdition(value){
  if(value==null)return '';
  if(typeof value!=='string'||value.length>100)
    throw new Error('Source edition must be at most 100 characters.');
  return value.trim();
}

export function libraryBookStatus(document){
  const role=normalizeDocumentRole(document?.role);
  const edition=normalizeSourceEdition(document?.sourceEdition);
  const pack=document?.bookPack;
  if(!pack)return {role,edition,status:'unprepared',searchable:false,gameplay:false};
  try{
    validatePreparedDocumentPack(pack);
    return {role,edition,status:'prepared',searchable:true,
      gameplay:role==='corebook' && pack.format===BOOK_FORMAT,
      sourceSha256:pack.sourceSha256,pageCount:pack.pageCount,
      indexType:pack.format===REFERENCE_FORMAT?'reference':'corebook'};
  }catch{
    return {role,edition,status:'repair-needed',searchable:false,gameplay:false};
  }
}

export function libraryDiagnostics(documents,campaigns=[]){
  const books=Array.isArray(documents)?documents:[];
  const statuses=books.map(document=>({id:document?.id,name:document?.name,
    ...libraryBookStatus(document)}));
  const corebooks=statuses.filter(book=>book.gameplay);
  const availableShas=new Set(statuses.filter(book=>book.searchable).map(book=>book.sourceSha256));
  const referenced=new Set();
  const seen=new WeakSet();
  function collect(node,depth=0){
    if(!node||typeof node!=='object'||seen.has(node)||depth>12)return;
    seen.add(node);
    for(const key of ['sourceSha256','sourcePdfSha256']){
      if(typeof node[key]==='string'&&/^[a-f0-9]{64}$/.test(node[key]))
        referenced.add(node[key]);
    }
    for(const value of Object.values(node))collect(value,depth+1);
  }
  for(const campaign of campaigns??[])collect(campaign);
  const missingSources=[...referenced].filter(sha=>!availableShas.has(sha));
  const duplicateSources=new Map();
  for(const book of statuses.filter(book=>book.searchable)){
    const key=book.sourceSha256;duplicateSources.set(key,(duplicateSources.get(key)??0)+1);
  }
  return {books:statuses,readyCorebooks:corebooks.length,missingSources,
    warnings:[
      ...(corebooks.length===0?['No prepared corebook; game-dependent screens stay locked.']:[]),
      ...(corebooks.length>1?['Multiple prepared corebooks are present. Confirm which edition to use for source-dependent rules.']:[]),
      ...([...duplicateSources.values()].some(count=>count>1)?['The same PDF has been indexed more than once.']:[]),
      ...(missingSources.length?[`${missingSources.length} source fingerprint(s) referenced by your saved campaigns are missing from the prepared library. Reimport the corresponding PDF; campaign data is preserved.`]:[])
    ]};
}

export function searchPreparedLibrary(documents,query,limit=30){
  if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw new Error('Invalid library search limit.');
  const term=String(query??'').trim();
  if(term.length<2)return [];
  const perBook=[];
  for(const doc of documents??[]){
    const status=libraryBookStatus(doc);
    if(!status.searchable||typeof doc.id!=='string')continue;
    const hits=searchBookPack(doc.bookPack,term,limit).map(hit=>({
      documentId:doc.id,documentName:doc.name??'Imported PDF',
      edition:status.edition,role:status.role,sourceSha256:status.sourceSha256,
      page:hit.page,excerpt:hit.excerpt}));
    if(hits.length)perBook.push(hits);
  }
  // Interleave results: the corebook cannot crowd every supplement off page one.
  const results=[];
  for(let offset=0;results.length<limit;offset++){
    let advanced=false;
    for(const hits of perBook){
      if(offset<hits.length){results.push(hits[offset]);advanced=true;}
      if(results.length>=limit)break;
    }
    if(!advanced)break;
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

export function selectPrimaryCorebookRoles(documents,selectedId){
  if(!Array.isArray(documents))throw new Error('The document library is invalid.');
  const selected=documents.find(document=>document.id===selectedId);
  if(!selected||selected.bookPack?.format!==BOOK_FORMAT ||
    !libraryBookStatus({...selected,role:'corebook'}).gameplay)
    throw new Error('Prepare a valid corebook before activating it.');
  return documents.map(document=>({...document,
    role:document.id===selectedId?'corebook':
      document.role==='corebook'?'reference':normalizeDocumentRole(document.role)}));
}
