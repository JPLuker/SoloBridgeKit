import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReferencePack, validatePreparedDocumentPack, REFERENCE_FORMAT,
  BOOK_FORMAT, BOOK_FORMAT_VERSION, hasPreparedCorebook } from '../book-data.mjs';
import { libraryBookStatus, libraryDiagnostics, searchPreparedLibrary, summarizeDocumentRemoval, normalizeSourceEdition, selectPrimaryCorebookRoles } from '../library-books.mjs';

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

test('large corebook cannot starve another prepared source from the first search page',()=>{
 const docs=[
  {id:'long',name:'Long.pdf',role:'corebook',bookPack:core()},
  {id:'short',name:'Short.pdf',role:'supplement',bookPack:small()}
 ];
 const results=searchPreparedLibrary(docs,'private',2);
 // The core has no private results; the short source is still available.
 assert.equal(results[0].documentId,'short');
 const term='page';
 const mixed={
  ...small(),pages:[{page:1,text:'Private page in supplement'},
                    {page:2,text:'Another private page'}]
 };
 const both=searchPreparedLibrary([docs[0],{...docs[1],bookPack:mixed}],term,4);
 assert.equal(both[0].documentId,'long');
 assert.equal(both[1].documentId,'short');
});

test('edition labels are player-owned metadata and are validated',()=>{
 assert.equal(normalizeSourceEdition(' 2026 printing '),'2026 printing');
 assert.equal(normalizeSourceEdition(undefined),'');
 assert.throws(()=>normalizeSourceEdition('x'.repeat(101)),/100 characters/);
 assert.throws(()=>normalizeSourceEdition(2026),/100 characters/);
 const editionDoc={id:'ref',name:'Book.pdf',role:'forms',bookPack:small(),sourceEdition:'Second edition'};
 assert.equal(libraryBookStatus(editionDoc).edition,'Second edition');
 assert.equal(searchPreparedLibrary([editionDoc],'alternate')[0].edition,'Second edition');
});

test('switching prepared corebook is non-destructive and retains other editions',()=>{
 const docs=[{id:'a',name:'Edition A',role:'corebook',bookPack:core(),compiledRecords:[{id:'keep-me'}]},
  {id:'b',name:'Edition B',role:'reference',bookPack:core(),sourceEdition:'Revised'},
  {id:'c',name:'Supplement',role:'supplement',bookPack:small()}];
 const switched=selectPrimaryCorebookRoles(docs,'b');
 assert.equal(switched.find(x=>x.id==='a').role,'reference');
 assert.equal(switched.find(x=>x.id==='b').role,'corebook');
 assert.equal(switched.find(x=>x.id==='c').role,'supplement');
 assert.equal(switched.find(x=>x.id==='a').compiledRecords[0].id,'keep-me');
 assert.equal(docs[0].role,'corebook');
 assert.throws(()=>selectPrimaryCorebookRoles(docs,'c'),/valid corebook/);
 assert.throws(()=>selectPrimaryCorebookRoles(docs,'missing'),/valid corebook/);
});

test('orphaned source references surface without erasing user campaigns',()=>{
 const docs=[{id:'core',name:'Core',role:'corebook',bookPack:core()}];
 const campaigns=[{id:'one',ship:{builder:{sourceRef:{sourcePdfSha256:'f'.repeat(64)}}}},
                  {id:'two',episodes:[{entries:[{sourceSha256:'e'.repeat(64)}]}]}];
 const report=libraryDiagnostics(docs,campaigns);
 assert.deepEqual(report.missingSources,['f'.repeat(64)]);
 assert.ok(report.warnings.some(w=>w.includes('missing')));
 assert.equal(campaigns[0].ship.builder.sourceRef.sourcePdfSha256,'f'.repeat(64));
});
