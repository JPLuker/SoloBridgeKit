import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverStageCandidates} from '../source-candidates.mjs';
import {BOOK_FORMAT,BOOK_FORMAT_VERSION} from '../book-data.mjs';

const source='b'.repeat(64);
function mock(){
  const pages=Array.from({length:210},(_,i)=>({page:i+1,
    text:'lifepath mission starship momentum threat focus. Entirely synthetic content, not a game source. '.repeat(2)}));
  pages[99].text='Some prose about a made-up game setting.\nPOSSIBLE SYNTHETIC SPECIES\nANOTHER SYNTHETIC CHOICE';
  pages[100].text='ANOTHER SYNTHETIC CHOICE\nSYNTHETIC HEADING THREE';
  return {format:BOOK_FORMAT,version:BOOK_FORMAT_VERSION,sourceSha256:source,pageCount:210,pages};
}
test('guided discovery scans the relevant local source pages and does not verify automatically',()=>{
  const candidates=discoverStageCandidates(mock(),'species');
  assert.ok(candidates.some(item=>item.label==='POSSIBLE SYNTHETIC SPECIES'&&item.page===100));
  assert.ok(candidates.some(item=>item.label==='SYNTHETIC HEADING THREE'&&item.page===101));
  assert.equal(candidates.find(item=>item.label==='ANOTHER SYNTHETIC CHOICE').page,100);
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
  data.pages[150].text='SYNTHETIC OFFSET CHOICE\nUnrelated local text from test book';
  const found=discoverStageCandidates(data,'species',{startPage:151,maxPages:1});
  assert.ok(found.some(x=>x.label==='SYNTHETIC OFFSET CHOICE'&&x.page===151));
  assert.ok(found.every(x=>x.status==='draft'));
  assert.throws(()=>discoverStageCandidates(data,'species',{startPage:999}),/outside/);
  assert.throws(()=>discoverStageCandidates(data,'species',{startPage:0}),/outside/);
});

test('uppercase real-world-style headings outrank prose and never claim verification',()=>{
  const data=mock();
  data.pages[99].text=[
    'This is a long paragraph introducing a wholly fictional option',
    'and more ordinary lowercase prose without a heading.',
    'CHAPTER 03.20',
    'R E P O R T I N G F O R D U T Y',
    'SYNTHETIC SPECIES ONE',
    'SYNTHETIC SPECIES TWO',
    'Attributes +1 Control'
  ].join('\n');
  const candidates=discoverStageCandidates(data,'species',{maxPages:1});
  assert.deepEqual(candidates.map(x=>x.label),['SYNTHETIC SPECIES ONE','SYNTHETIC SPECIES TWO']);
  assert.ok(candidates.every(x=>x.status==='draft'));
});
test('numbered event headings and title-case vessel classes receive category-specific ranking',()=>{
  const data=mock();
  data.pages[129].text='This is a narrative sentence.\n1. FICTIONAL EVENT\n2. ANOTHER EVENT';
  data.pages[148].text='RANDOM STARSHIP\nSynthetic Vessel Class\nOther Example Ship';
  assert.equal(discoverStageCandidates(data,'event1',{maxPages:1})[0].label,'1. FICTIONAL EVENT');
  assert.equal(discoverStageCandidates(data,'ship-class',{maxPages:1})[0].label,'Synthetic Vessel Class');
});
