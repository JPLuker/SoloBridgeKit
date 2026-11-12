import test from 'node:test';
import assert from 'node:assert/strict';
import { makePrivateOption, normalizePrivateOptions, addPrivateOption,
  removePrivateOption, optionsForStep, applyPrivateOption } from '../private-options.mjs';
const sha = 'c'.repeat(64);
const bonuses = { control: 1, daring: 1, fitness: 1 };
const disciplines = { command: 0, conn: 0, security: 0, engineering: 0, science: 0, medicine: 0 };
const sample = (stage = 'species') => makePrivateOption({
  id: 'example', stepId: stage, label: 'Verified sample choice', page: 97,
  sourceSha256: sha,
  record: { attributes: bonuses, disciplines, value: '', focuses: '', notes: 'Player-created note' }
});
test('private options are saved with a page and source fingerprint', () => {
  const o = sample();
  assert.equal(o.stage, 'species');
  assert.equal(o.record.attributes.reason, 0);
  assert.equal(normalizePrivateOptions([o], sha)[0].id, 'example');
  assert.throws(() => normalizePrivateOptions([o], 'b'.repeat(64)), /different rulebook/);
});
test('career events share a private option category for two event steps', () => {
  const o = sample('event1');
  assert.equal(o.stage, 'careerEvent');
  assert.equal(optionsForStep([o], 'event2', sha).length, 1);
  assert.equal(applyPrivateOption(o, 'event2').choice, o.label);
  assert.throws(() => applyPrivateOption(o, 'species'));
});
test('adding, removing and applying choices does not mutate source objects', () => {
  const option = sample();
  assert.equal(addPrivateOption([], option, sha).length, 1);
  const applied = applyPrivateOption(option, 'species');
  applied.attributes.control = 4;
  assert.equal(option.record.attributes.control, 1);
  assert.equal(removePrivateOption([option], option.id, sha).length, 0);
  assert.throws(() => addPrivateOption([option], option, sha), /already exists/);
});
test('invalid private presets are rejected before storage', () => {
  assert.throws(() => makePrivateOption({ ...sample(), stepId: 'invalid' }), /Unsupported/);
  const altered = sample();
  altered.record.disciplines.command = 99;
  assert.throws(() => normalizePrivateOptions([altered], sha), /invalid/);
});
