import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceReadiness,SOURCE_PREPARATION_STEPS} from '../source-readiness.mjs';
import {BOOK_FORMAT,BOOK_FORMAT_VERSION} from '../book-data.mjs';
import {makePrivateOption} from '../private-options.mjs';

const sha='e'.repeat(64);
function book(){
  return {id:'local-core',role:'corebook',bookPack:{
    format:BOOK_FORMAT,version:BOOK_FORMAT_VERSION,sourceSha256:sha,pageCount:210,
    pages:Array.from({length:210},(_,i)=>({page:i+1,text:
      'lifepath mission starship momentum threat focus. This is entirely synthetic playable test data. '.repeat(2)}))
  }};
}
test('indexed book does not claim options are ready without human review',()=>{
  const result=sourceReadiness(book());
  assert.equal(result.indexed,true);
  assert.equal(result.complete,false);
  assert.equal(result.confirmedChoices,0);
  assert.equal(result.missing.length,SOURCE_PREPARATION_STEPS.length);
  assert.ok(result.steps.every(step=>step.page>0 && step.count===0));
});
test('owner-confirmed legacy choice contributes to only its matching category',()=>{
  const b=book();
  b.options=[makePrivateOption({
    id:'verified-lifepath',stepId:'species',label:'Synthetic species',page:97,sourceSha256:sha,
    record:{attributes:{control:1,daring:1,fitness:1},disciplines:{},
      value:'',focuses:'',notes:''}
  })];
  const result=sourceReadiness(b);
  assert.equal(result.complete,false);
  assert.equal(result.steps.find(step=>step.id==='species').count,1);
  assert.equal(result.steps.find(step=>step.id==='education').count,0);
  assert.equal(result.steps.find(step=>step.id==='ship-class').count,0);
});
test('invalid, absent and tampered indexes cannot unlock readiness',()=>{
  assert.equal(sourceReadiness(null).indexed,false);
  const b=book();b.bookPack.pages[0].page=22;
  assert.equal(sourceReadiness(b).indexed,false);
});
