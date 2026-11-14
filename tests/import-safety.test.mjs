import test from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { prepareImportBatch, storageMessage, checkStorageCapacity, relinkDocument } from '../import-safety.mjs';

const valid = (name = 'example.pdf') => new File(['%PDF-1.7\nexample'], name, { type: 'application/pdf' });
const make = () => 'new-private-id';
test('all selected PDFs validate before a single record is prepared', async () => {
  let calls = 0;
  const broken = new File(['wrong'], 'broken.pdf', { type: 'application/pdf' });
  await assert.rejects(() => prepareImportBatch([valid(), broken], {
    makeId: make, checkCapacity: async () => { calls++; }
  }), /not a valid PDF/);
  assert.equal(calls, 0);
});
test('multiple valid reference PDFs return a staged all-or-nothing batch', async () => {
  const batch = await prepareImportBatch([valid('one.pdf'), valid('two.pdf')], {
    makeId: make, checkCapacity: async () => {}
  });
  assert.equal(batch.length, 2);
  assert.equal(batch[0].blob.name, 'one.pdf');
  assert.equal(batch[1].blob.name, 'two.pdf');
  assert.ok(batch.every(x => x.role === 'reference' && !x.bookPack));
});
test('corebook selection is limited to a single input PDF', async () => {
  await assert.rejects(() => prepareImportBatch([valid(), valid()], {
    role: 'corebook', makeId: make, checkCapacity: async () => {}
  }), /one core rulebook/);
});
test('abort before validation or commit stages no records', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => prepareImportBatch([valid()], {
    signal: controller.signal, makeId: make, checkCapacity: async () => {}
  }), /cancelled/);
});
test('unavailable storage estimates do not prevent valid inputs', async () => {
  assert.deepEqual(await checkStorageCapacity([valid()], { storage: {} }),
    { estimated: false, bytes: valid().size });
});
test('low estimated space fails before writing', async () => {
  await assert.rejects(() => checkStorageCapacity([valid()], {
    storage: { estimate: async () => ({ usage: 100, quota: 101 }) }
  }), /Not enough browser storage/);
});
test('storage failures produce actionable messages', () => {
  assert.match(storageMessage({ name: 'QuotaExceededError' }), /out of site storage/);
  assert.match(storageMessage({ name: 'SecurityError' }), /Local storage is unavailable/);
  assert.match(storageMessage({ name: 'AbortError' }), /cancelled/);
});

test('relink with identical book fingerprint preserves private source options and bookmarks', async () => {
  const sha = 'a'.repeat(64);
  const old = { id: 'doc1', name: 'old.pdf', blob: valid('old.pdf'), bookPack: { sourceSha256: sha },
    bookmarks: [{ label: 'My note', page: 3 }], options: [{ label: 'Private user data' }] };
  const file = valid('restored.pdf');
  const updated = await relinkDocument(old, file, { fingerprint: async () => sha });
  assert.equal(updated.id, old.id);
  assert.equal(updated.blob, file);
  assert.equal(updated.bookPack, old.bookPack);
  assert.deepEqual(updated.bookmarks, old.bookmarks);
  assert.deepEqual(updated.options, old.options);
  assert.equal(old.blob.name, 'old.pdf');
});
test('different edition cannot replace existing private data', async () => {
  const sha = 'a'.repeat(64);
  const old = { id: 'doc1', blob: valid('old.pdf'), bookPack: { sourceSha256: sha },
    bookmarks: [{ label: 'Preserve', page: 10 }] };
  await assert.rejects(() => relinkDocument(old, valid('different.pdf'), {
    fingerprint: async () => 'b'.repeat(64)
  }), /does not match/);
  assert.equal(old.bookmarks[0].page, 10);
});
test('relink a lost blob from its existing private index fingerprint', async () => {
  const sha = 'a'.repeat(64);
  const old = { id: 'doc1', name: 'lost.pdf', bookPack: { sourceSha256: sha } };
  const result = await relinkDocument(old, valid('restored.pdf'), { fingerprint: async () => sha });
  assert.equal(result.name, 'restored.pdf');
});
