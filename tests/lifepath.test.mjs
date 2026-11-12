import test from 'node:test';
import assert from 'node:assert/strict';
import { createLifepath, normalizeLifepath, LIFEPATH_STEPS, validateLifepathStep, lifepathReview, applyLifepathToCharacter } from '../lifepath.mjs';
import { createCharacter } from '../model.mjs';

const set = (stage, kind, ...keys) => keys.forEach(k => {stage[kind][k] += 1;});
function complete() {
  const path = createLifepath();
  const s = path.stages;
  for (const stage of LIFEPATH_STEPS) if(stage.id !== 'finishing')s[stage.id].choice = `${stage.id} user choice`;
  set(s.species, 'attributes', 'control', 'fitness', 'reason');
  set(s.environment, 'attributes', 'insight'); set(s.environment, 'disciplines', 'science'); s.environment.value = 'My value';
  set(s.outlook, 'attributes', 'daring','daring','presence'); set(s.outlook, 'disciplines', 'security'); s.outlook.focuses = 'Tactical training';
  set(s.education, 'attributes', 'control','control','reason');
  set(s.education, 'disciplines', 'science','science','engineering','command');
  s.education.value = 'My other value'; s.education.focuses = 'Linguistics\nEngineering\nMedicine';
  s.career.value = 'Career value';
  set(s.event1, 'attributes', 'fitness'); set(s.event1, 'disciplines', 'medicine'); s.event1.focuses = 'Piloting';
  set(s.event2, 'attributes', 'insight'); set(s.event2, 'disciplines', 'conn'); s.event2.focuses = 'Navigation';
  set(s.finishing, 'attributes', 'presence','reason'); set(s.finishing, 'disciplines', 'command','engineering');
  s.finishing.value = 'Final value';
  return path;
}

test('lifepath has seven steps, with two separately editable career events', () => {
  assert.equal(LIFEPATH_STEPS.length, 8);
  assert.equal(LIFEPATH_STEPS.filter(s => s.id.startsWith('event')).length, 2);
  assert.equal(createLifepath().stages.species.attributes.control, 0);
});
test('valid lifepath totals 56 attributes, 16 disciplines, four values and six focuses', () => {
  const review = lifepathReview(complete());
  assert.equal(review.ready, true, review.errors.join('\n'));
  assert.equal(Object.values(review.attributes).reduce((a,b) => a+b), 56);
  assert.equal(Object.values(review.disciplines).reduce((a,b) => a+b), 16);
  assert.equal(review.values.length, 4);
  assert.equal(review.focuses.length, 6);
});
test('unfinished step is saved as a draft but review cannot apply it', () => {
  const review = lifepathReview(createLifepath());
  assert.equal(review.ready, false);
  assert.throws(() => applyLifepathToCharacter(createCharacter(), createLifepath()), /choice|Allocate/);
});
test('species must add one point to three distinct attributes', () => {
  const path=complete(); path.stages.species.attributes.control = 2; path.stages.species.attributes.reason = 0;
  assert.match(validateLifepathStep('species', path.stages.species).join('; '), /three different/);
});
test('education needs 3 attribute points and 2+1+1 discipline allocation', () => {
  const path=complete();
  assert.equal(validateLifepathStep('education', path.stages.education).length, 0);
  path.stages.education.disciplines.command=0;
  path.stages.education.disciplines.engineering=2;
  assert.match(validateLifepathStep('education', path.stages.education).join('; '), /\+2\/\+1\/\+1/);
});
test('final attribute cap rejects any rating over 12', () => {
  const path=complete();
  // Move existing bonuses while preserving totals and per-step shape.
  path.stages.outlook.attributes.daring=0; path.stages.outlook.attributes.control=2;
  path.stages.outlook.attributes.presence=1;
  path.stages.event1.attributes.fitness=0; path.stages.event1.attributes.control=1;
  const review = lifepathReview(path);
  assert.equal(review.ready, false);
  assert.ok(review.errors.some(e=>e.includes('cap')));
});
test('applying valid lifepath preserves unrelated character identity and notes', () => {
  const char=createCharacter(); char.name='Own Character'; char.rank='Ensign'; char.notes='My own text';
  const next=applyLifepathToCharacter(char,complete());
  assert.equal(next.name,char.name);
  assert.equal(next.rank,char.rank);
  assert.equal(next.notes,char.notes);
  assert.equal(next.attributes.reason,'10');
  assert.equal(next.disciplines.science,'4');
  assert.ok(next.lifepath.appliedAt);
});
test('normalizing saved drafts preserves selections without mutating source', () => {
  const raw=complete();const clone=normalizeLifepath(raw);
  clone.stages.species.choice='Edited';
  assert.notEqual(raw.stages.species.choice,clone.stages.species.choice);
  assert.equal(normalizeLifepath(null).stages.species.choice,'');
});
test('invalid allocation is rejected, no NaN silently propagates', () => {
  const path=complete();path.stages.finishing.attributes.control='apple';
  assert.throws(()=>lifepathReview(path),/whole number/);
});