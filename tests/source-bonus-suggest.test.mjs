import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestExplicitBonuses} from '../source-bonus-suggest.mjs';
const sha='c'.repeat(64);
const pack={sourceSha256:sha,pageCount:1,pages:[{page:1,text:
  'Synthetic Choice\nControl +1 and +2 Daring; Science +1. A fictional example, not a publisher rule.'}]};
const record={sourceSha256:sha,page:1,label:'Synthetic Choice'};
test('only explicitly printed local modifier tokens are suggested, never verified',()=>{
 const item=suggestExplicitBonuses(pack,record);
 assert.deepEqual(item.attributes,{control:1,daring:2});
 assert.deepEqual(item.disciplines,{science:1});
 assert.equal(item.found,3);
 assert.equal(Object.hasOwn(item,'verified'),false);
});
test('conflicting nearby bonuses are skipped, not guessed',()=>{
 const altered={...pack,pages:[{page:1,text:pack.pages[0].text+' Control +2'}]};
 const result=suggestExplicitBonuses(altered,record);
 assert.ok(result.ambiguous.includes('control'));
 assert.equal(Object.hasOwn(result.attributes,'control'),false);
});
test('mismatched source yields no suggestions',()=>{
 const result=suggestExplicitBonuses(pack,{...record,sourceSha256:'d'.repeat(64)});
 assert.equal(result.found,0);
});
