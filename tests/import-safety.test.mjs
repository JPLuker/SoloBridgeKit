import test from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { prepareImportBatch, storageMessage, checkStorageCapacity } from '../import-safety.mjs';

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
