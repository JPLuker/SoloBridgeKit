import test from 'node:test';
import assert from 'node:assert/strict';
import { DOCUMENT_ROLES, normalizeDocumentRole, hasCorebook, requiresCorebook, shouldIncludeDocuments } from '../content-policy.mjs';

test('corebook is never assumed from a file name alone', () => {
  const pdf = { name: 'Captain Log.pdf', blob: new Blob(['%PDF-1.7']) };
  assert.equal(hasCorebook([pdf]), false);
  assert.equal(hasCorebook([{ ...pdf, role: 'forms' }]), false);
  assert.equal(hasCorebook([{ ...pdf, role: 'corebook' }]), true);
  assert.equal(hasCorebook([{ role: 'corebook', name: 'missing.pdf' }]), false);
});
test('legacy imports are references until explicitly designated', () => {
  assert.equal(normalizeDocumentRole(undefined), 'reference');
  assert.equal(normalizeDocumentRole(null), 'reference');
  assert.equal(normalizeDocumentRole('corebook'), 'corebook');
  assert.deepEqual(DOCUMENT_ROLES, ['corebook', 'supplement', 'forms', 'reference']);
  assert.throws(() => normalizeDocumentRole('invalid'));
});
test('book-dependent pages have a consistent gate', () => {
  for (const page of ['character','lifepath','starship','shipbuilder','crew','log','dice'])
    assert.equal(requiresCorebook(page), true, page);
  for (const page of ['home','library','settings','more'])
    assert.equal(requiresCorebook(page), false, page);
});
test('PDF-inclusive backups require a real opt-in', () => {
  assert.equal(shouldIncludeDocuments(), false);
  assert.equal(shouldIncludeDocuments({ includeDocuments: false }), false);
  assert.equal(shouldIncludeDocuments({ includeDocuments: true }), true);
  assert.equal(shouldIncludeDocuments({ includeDocuments: 'true' }), false);
});
