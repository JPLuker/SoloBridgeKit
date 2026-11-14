import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewBudget,reviewBonusTotals,savedStageDrafts} from '../source-review-assist.mjs';
import {draftCandidate,reviewCompiledRecord} from '../compiler-data.mjs';
const sha='d'.repeat(64),pageCount=220;
function book(records=[]){return {bookPack:{sourceSha256:sha,pageCount},compiledRecords:records};}
test('source review shows only stage-specific, expected point budgets',()=>{
  assert.deepEqual(reviewBudget('species'),{attributes:3,disciplines:0});
  assert.deepEqual(reviewBudget('environment'),{attributes:1,disciplines:1});
  assert.deepEqual(reviewBudget('career'),{attributes:0,disciplines:0});
  assert.equal(reviewBudget('finishing'),null);
});
test('live bonus totals never invent source-selected modifiers',()=>{
  const data=reviewBonusTotals('species',{attributes:{control:1,daring:1,fitness:1},disciplines:{}});
  assert.deepEqual(data.attributes,{assigned:3,expected:3,remaining:0,valid:true});
  assert.equal(data.disciplines.remaining,0);
  const invalid=reviewBonusTotals('species',{attributes:{control:7}});
  assert.equal(invalid.attributes.valid,false);
  assert.equal(invalid.attributes.assigned,null);
});
test('saved private drafts resume for matching stage and source only',()=>{
  const candidate=draftCandidate({id:'resume-1',kind:'lifepath',label:'Synthetic example',page:97,
    sourceSha256:sha,pageCount,payload:{stepId:'species'}});
  const other=draftCandidate({id:'resume-2',kind:'lifepath',label:'Another example',page:129,
    sourceSha256:sha,pageCount,payload:{stepId:'event1'}});
  const rejected=reviewCompiledRecord(candidate,{status:'rejected'},sha,pageCount);
  assert.deepEqual(savedStageDrafts(book([candidate,other]),'species').map(r=>r.id),['resume-1']);
  assert.deepEqual(savedStageDrafts(book([candidate,other]),'event2').map(r=>r.id),['resume-2']);
  assert.equal(savedStageDrafts(book([rejected]),'species').length,0);
  assert.equal(savedStageDrafts({bookPack:{sourceSha256:'e'.repeat(64),pageCount},compiledRecords:[candidate]},'species').length,0);
});
