import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverStageCandidates} from '../source-candidates.mjs';
import {BOOK_FORMAT,BOOK_FORMAT_VERSION} from '../book-data.mjs';

const source='b'.repeat(64);
function mock(){
  const pages=Array.from({length:210},(_,i)=>({page:i+1,
    text:'lifepath mission starship momentum threat focus. Entirely synthetic content, not a game source. '.repeat(2)}));
  pages[96].text='Possible Synthetic Species\nSome unrelated prose in this test PDF.\nAnother Synthetic Choice';
  pages[97].text='Another Synthetic Choice\nSynthetic Heading Three';
  return {format:BOOK_FORMAT,version:BOOK_FORMAT_VERSION,sourceSha256:source,pageCount:210,pages};
}
test('guided discovery scans the relevant local source pages and does not verify automatically',()=>{
  const candidates=discoverStageCandidates(mock(),'species');
  assert.ok(candidates.some(item=>item.label==='Possible Synthetic Species'&&item.page===97));
  assert.ok(candidates.some(item=>item.label==='Synthetic Heading Three'&&item.page===98));
  assert.equal(candidates.find(item=>item.label==='Another Synthetic Choice').page,97);
  assert.ok(candidates.every(item=>item.status==='draft'&&item.payload.stepId==='species'));
  assert.ok(candidates.every(item=>item.sourceSha256===source));
});
test('guided discovery bounds scan work and refuses invalid stages',()=>{
  const data=mock();
  assert.throws(()=>discoverStageCandidates(data,'not-a-stage'),/section/);
  assert.throws(()=>discoverStageCandidates(data,'species',{limit:31}),/limit/);
  assert.throws(()=>discoverStageCandidates(data,'species',{maxPages:100}),/limit/);
  assert.ok(discoverStageCandidates(data,'species',{limit:1}).length<=1);
});

test('a locally searched PDF page can override an edition-specific default page offset',()=>{
  const data=mock();
  data.pages[150].text='Synthetic Offset Choice\nUnrelated local text from test book';
  const found=discoverStageCandidates(data,'species',{startPage:151,maxPages:1});
  assert.ok(found.some(x=>x.label==='Synthetic Offset Choice'&&x.page===151));
  assert.ok(found.every(x=>x.status==='draft'));
  assert.throws(()=>discoverStageCandidates(data,'species',{startPage:999}),/outside/);
  assert.throws(()=>discoverStageCandidates(data,'species',{startPage:0}),/outside/);
});
