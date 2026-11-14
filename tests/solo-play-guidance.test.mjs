import test from 'node:test';
import assert from 'node:assert/strict';
import {soloPlayPrompt} from '../solo-play-guidance.mjs';

test('new mission guides user-authored opening without generating story',()=>{
  const guidance=soloPlayPrompt({entries:[],scenes:[]});
  assert.equal(guidance.title,'Begin your first scene');
  assert.match(guidance.instruction,/own words/);
  assert.doesNotMatch(guidance.instruction,/Captain Kirk|Enterprise/);
});
test('ongoing mission guides actions, dice only when uncertain, and records',()=>{
  const guidance=soloPlayPrompt({entries:[{text:'Player-authored'}],scenes:[{completed:false}]});
  assert.equal(guidance.title,'Continue your scene');
  assert.match(guidance.explanation,/outcome is uncertain/);
});
test('completed scenes show review without automatically ending mission',()=>{
  const guidance=soloPlayPrompt({entries:[{text:'Player-authored'}],scenes:[{completed:true}]});
  assert.equal(guidance.title,'Review what happened');
  assert.match(guidance.instruction,/Nothing ends automatically/);
});
