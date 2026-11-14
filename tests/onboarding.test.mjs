import test from 'node:test';
import assert from 'node:assert/strict';
import {explainRulebookImportFailure,BEGINNER_STEPS} from '../onboarding.mjs';

test('beginner path has three nontechnical steps in play order',()=>{
 assert.deepEqual(BEGINNER_STEPS.map(x=>x.title),[
  'Add your rulebook','Create your character','Start your first mission']);
 assert.ok(BEGINNER_STEPS.every(x=>x.description.length>20));
});
test('new players receive actionable feedback for wrong PDFs',()=>{
 assert.match(explainRulebookImportFailure(new Error('Incomplete corebook page index.')),/too short|incomplete/i);
 assert.match(explainRulebookImportFailure(new Error("The PDF does not contain a readable Captain's Log corebook.")),/rules text/);
 assert.match(explainRulebookImportFailure(new Error('archive.zip is not a valid PDF.')),/ZIP archive/);
 assert.match(explainRulebookImportFailure(new Error('Import cancelled. No files from this attempt were saved.')),/earlier books/);
 assert.match(explainRulebookImportFailure(new Error('Custom error'),'supplement'),/Custom error/);
});
