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
  assert.equal(compiledCatalog(stale,'b'.repeat(64),210,'talent').length,0);
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

test('revalidation preserves invalidated user data and never silently accepts stale rules',()=>{
  const original=reviewCompiledRecord(make(),{payload:{description:'Player verified',prerequisites:''}},sha,210);
  const malformed={ ...original, payload:{}, status:'confirmed' };
  const checked=revalidateCompiledRecords([malformed],'a'.repeat(64),210);
  assert.equal(checked.length,1);
  assert.equal(checked[0].status,'needs-review');
  assert.equal(checked[0].label,'Synthetic Choice');
  assert.equal(compiledCatalog(checked,sha,210,'talent').length,0);
  const stale=revalidateCompiledRecords([original],'b'.repeat(64),210);
  assert.equal(stale[0].status,'needs-review');
  assert.equal(compiledCatalog(stale,'b'.repeat(64),210,'talent').length,0);
  assert.equal(removeCompiledRecord(stale,'sample','b'.repeat(64),210).length,0);
});
test('older private compiler schema can be preserved without automatically confirming it',()=>{
  const raw={...make(),schemaVersion:0,payload:{ description:'Player data' }};
  const migrated=revalidateCompiledRecords([raw],sha,210);
  assert.equal(migrated[0].schemaVersion,COMPILER_SCHEMA);
  assert.equal(migrated[0].status,'needs-review');
  assert.equal(migrated[0].payload.description,'Player data');
  assert.throws(()=>revalidateCompiledRecords([{...raw,schemaVersion:500}],sha,210),/newer compiler schema/);
});
test('ambiguous two-column table text remains unconfirmed until user fixes its ranges',()=>{
  const p=pack();
  p.pages[4].text+='1 - Name A     2 - Name B\n';
  const found=scanBookPage(p,5,'random-table');
  assert.ok(found.every(x=>x.status==='draft'));
  const incomplete=draftCandidate({id:'ranges',kind:'random-table',label:'Two columns',page:5,sourceSha256:sha,pageCount:210,
    payload:{rows:'1 | A\n3 | B'}});
  assert.throws(()=>reviewCompiledRecord(incomplete,{},sha,210),/no gaps or overlaps/);
});

test('unreviewed, rejected, and newer-schema private data never reaches consumers',()=>{
  const original=make();
  const rejected=reviewCompiledRecord(original,{status:'rejected'},sha,210);
  assert.equal(compiledCatalog([rejected],sha,210,'talent').length,0);
  const future={...original,schemaVersion:999,status:'confirmed',reviewedAt:new Date().toISOString()};
  assert.equal(compiledCatalog([future],sha,210,'talent').length,0);
  assert.throws(()=>revalidateCompiledRecords([future],sha,210),/newer compiler schema/);
});
