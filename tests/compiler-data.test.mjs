import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOK_FORMAT, BOOK_FORMAT_VERSION } from '../book-data.mjs';
import { draftCandidate, scanBookPage, reviewCompiledRecord, compiledCatalog,
  upsertCompiledRecord, normalizeCompiledRecords, revalidateCompiledRecords,
  removeCompiledRecord, COMPILER_SCHEMA } from '../compiler-data.mjs';

const sha = 'a'.repeat(64);
const pack = () => {
  const pages = Array.from({length:210},(_,i)=>({page:i+1,text:('Synthetic human-readable page with mission lifepath starship momentum threat focus. ').repeat(3)}));
  pages[4].text = 'Bridge Survey\nStarship class\nControl focus\n\n1  | First generated table row\n2  | Second generated table row\n3  | Third generated table row\n';
  return {format:BOOK_FORMAT,version:BOOK_FORMAT_VERSION,sourceSha256:sha,pageCount:210,pages};
};
const make = (kind='talent') => draftCandidate({id:'sample',kind,label:'Synthetic Choice',
  page:5,sourceSha256:sha,pageCount:210,payload:{},excerpt:'Generated sample'});
test('schema, provenance and review state are explicit',()=>{
  const d=make();
  assert.equal(d.schemaVersion,COMPILER_SCHEMA);
  assert.equal(d.status,'draft');
  assert.equal(d.sourceSha256,sha);
  assert.throws(()=>draftCandidate({...d,page:211,pageCount:210}),/outside/);
});
test('local scanning proposes headings and numbered rows without confirmation',()=>{
  const talent=scanBookPage(pack(),5,'talent');
  assert.ok(talent.some(x=>x.label==='Bridge Survey'));
  assert.ok(talent.every(x=>x.status==='draft' && !x.reviewedAt));
  const table=scanBookPage(pack(),5,'random-table');
  assert.equal(table.length,1);
  assert.equal(table[0].payload.rows.split('\n').length,3);
  assert.equal(scanBookPage(pack(),6,'random-table').length,0);
});
test('confirmation refuses incomplete rules; talent confirmation requires description',()=>{
  assert.throws(()=>reviewCompiledRecord(make(),{},sha,210),/description/);
  const valid=reviewCompiledRecord(make(),{payload:{description:'Privately verified synthetic description',prerequisites:'none'}},sha,210);
  assert.equal(valid.status,'confirmed');
  assert.equal(compiledCatalog([valid],sha,210,'talent')[0].name,'Synthetic Choice');
  assert.equal(normalizeCompiledRecords([valid],sha,210).length,1);
});
test('table and lifepath choices use real validators, never guessed bonuses',()=>{
  const table=draftCandidate({id:'tab',kind:'random-table',label:'Synthetic Table',
    page:5,sourceSha256:sha,pageCount:210,payload:{rows:'1 | A\n2 | B\n3 | C'}});
  const confirmed=reviewCompiledRecord(table,{},sha,210);
  assert.equal(compiledCatalog([confirmed],sha,210,'random-table')[0].sides,3);
  const lifepath=draftCandidate({id:'life',kind:'lifepath',label:'Synthetic Person',
    page:5,sourceSha256:sha,pageCount:210});
  assert.throws(()=>reviewCompiledRecord(lifepath,{},sha,210),/lifepath stage/);
  const reviewed=reviewCompiledRecord(lifepath,{payload:{stepId:'species',record:{attributes:{control:2},disciplines:{command:1},value:'',focuses:'',notes:''}}},sha,210);
  assert.equal(compiledCatalog([reviewed],sha,210,'lifepath')[0].stage,'species');
});
test('recompilation does not delete or silently trust old source records',()=>{
  const confirmed=reviewCompiledRecord(make(),{payload:{description:'Verified',prerequisites:''}},sha,210);
  assert.throws(()=>normalizeCompiledRecords([confirmed],'b'.repeat(64),210),/missing or changed/);
  const stale=revalidateCompiledRecords([confirmed],'b'.repeat(64),210);
  assert.equal(stale[0].status,'needs-review');
  assert.equal(stale[0].payload.description,'Verified');
  assert.throws(()=>compiledCatalog(stale,'b'.repeat(64),210,'talent'),/missing or changed/);
});
test('upsert, rejection, duplicate detection, and removal retain source truth',()=>{
  const d=make(), r=reviewCompiledRecord(d,{status:'rejected'},sha,210);
  const up=upsertCompiledRecord([d],r,sha,210);
  assert.equal(up.length,1);
  assert.equal(up[0].status,'rejected');
  assert.equal(compiledCatalog(up,sha,210,'talent').length,0);
  assert.deepEqual(removeCompiledRecord(up,'sample',sha,210),[]);
  assert.throws(()=>normalizeCompiledRecords([d,d],sha,210),/Duplicate/);
});
