import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReferencePack, validatePreparedDocumentPack, REFERENCE_FORMAT,
  BOOK_FORMAT, BOOK_FORMAT_VERSION, hasPreparedCorebook } from '../book-data.mjs';
import { libraryBookStatus, libraryDiagnostics, searchPreparedLibrary, summarizeDocumentRemoval } from '../library-books.mjs';

const sha='d'.repeat(64);
const small=()=>({format:REFERENCE_FORMAT,version:BOOK_FORMAT_VERSION,
  sourceSha256:sha,pageCount:2,pages:[
    {page:1,text:'Private alternate rules on this page'},
    {page:2,text:'Private additional references and notes'}]});
const core=()=>({format:BOOK_FORMAT,version:BOOK_FORMAT_VERSION,
  sourceSha256:'e'.repeat(64),pageCount:210,
  pages:Array.from({length:210},(_,i)=>({page:i+1,
    text:'Synthetic searchable page content for every page '.repeat(4)+
      (i===1?'lifepath mission starship momentum threat focus':'')}))});
test('short supplements are searchable without satisfying corebook gate',()=>{
  const ref=small();assert.equal(validateReferencePack(ref),ref);
  assert.equal(validatePreparedDocumentPack(ref),ref);
  const doc={id:'supp',name:'Synthetic reference.pdf',role:'supplement',
    blob:new Blob(['%PDF-1.7']),bookPack:ref};
  assert.equal(libraryBookStatus(doc).searchable,true);
  assert.equal(libraryBookStatus(doc).gameplay,false);
  assert.equal(hasPreparedCorebook([doc]),false);
  assert.throws(()=>validateReferencePack({...ref,pageCount:3}),/index/);
  assert.throws(()=>validateReferencePack({...ref,pages:[{page:2,text:'Bad page'}]}),/index/);
});
test('cross-book search preserves individual document fingerprint and source page',()=>{
 const docs=[
  {id:'core',name:'Owned main book.pdf',role:'corebook',
    blob:new Blob(['%PDF-1.7']),bookPack:core()},
  {id:'other',name:'Personal supplement.pdf',role:'supplement',
    blob:new Blob(['%PDF-1.7']),bookPack:small()}
 ];
 const hits=searchPreparedLibrary(docs,'page',5);
 assert.ok(hits.length>0);
 assert.equal(hits[0].documentId,'core');
 const referenceHits=searchPreparedLibrary(docs,'alternate');
 assert.equal(referenceHits.length,1);
 assert.deepEqual({id:referenceHits[0].documentId,page:referenceHits[0].page,sha:referenceHits[0].sourceSha256},
   {id:'other',page:1,sha});
 assert.equal(searchPreparedLibrary(docs,'a').length,0);
 assert.throws(()=>searchPreparedLibrary(docs,'page',0),/limit/);
});
test('library warnings describe absent and multiple prepared corebooks',()=>{
 const blank=libraryDiagnostics([]);
 assert.equal(blank.readyCorebooks,0);
 assert.equal(blank.warnings.length,1);
 const docs=[{id:'a',role:'corebook',bookPack:core(),name:'Book A'},
             {id:'b',role:'corebook',bookPack:core(),name:'Book B'}];
 const diagnostic=libraryDiagnostics(docs);
 assert.equal(diagnostic.readyCorebooks,2);
 assert.ok(diagnostic.warnings.some(text=>text.includes('Multiple')));
 assert.ok(diagnostic.warnings.some(text=>text.includes('indexed more than once')));
});

test('removing one document warns about source-linked campaigns without deleting their data',()=>{
  const imported={id:'book-a',role:'corebook',bookPack:core()};
  const other={id:'book-b',role:'supplement',bookPack:small()};
  const campaigns=[{id:'campaign-a',episodes:[{entries:[{sourceSha256:'e'.repeat(64)}]}]},
                   {id:'campaign-b',episodes:[{entries:[{text:'No source linked'}]}]}];
  const result=summarizeDocumentRemoval(imported,[imported,other],campaigns);
  assert.equal(result.campaignsWithSource,1);
  assert.equal(result.lastPreparedCorebook,true);
  assert.ok(result.warning.includes('campaign(s)'));
  assert.ok(result.warning.includes('not deleted'));
  assert.equal(campaigns.length,2);
  assert.equal(summarizeDocumentRemoval(other,[imported,other],campaigns).lastPreparedCorebook,false);
});
