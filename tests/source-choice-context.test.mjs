import test from 'node:test';
import assert from 'node:assert/strict';
import {localChoiceContext} from '../source-choice-context.mjs';
const sha='f'.repeat(64);
const pack={sourceSha256:sha,pageCount:2,pages:[
  {page:1,text:'Synthetic narrative before\nOPTION ALPHA\nSynthetic, non-licensed source values follow.'},
  {page:2,text:'Another fictional test page'}
]};
test('private context shows only bounded locally imported text from matching source',()=>{
 const excerpt=localChoiceContext(pack,{sourceSha256:sha,page:1,label:'Option Alpha'});
 assert.match(excerpt,/OPTION ALPHA/);
 assert.match(excerpt,/Synthetic narrative before/);
});
test('missing/mismatched source never exposes an excerpt',()=>{
 assert.equal(localChoiceContext(pack,{sourceSha256:'a'.repeat(64),page:1,label:'OPTION ALPHA'}),'');
 assert.equal(localChoiceContext(pack,{sourceSha256:sha,page:3,label:'OPTION ALPHA'}),'');
 assert.equal(localChoiceContext(pack,{sourceSha256:sha,page:2,label:'OPTION ALPHA'}),'');
 assert.throws(()=>localChoiceContext(pack,{sourceSha256:sha,page:1,label:'OPTION ALPHA'},{radius:10000}),/size/);
});
