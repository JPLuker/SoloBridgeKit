import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { BOOK_FORMAT, BOOK_FORMAT_VERSION, validateBookPack, hasPreparedCorebook,
  pdfSha256, verifyPreparedBook, searchBookPack } from '../book-data.mjs';
globalThis.crypto ??= webcrypto;

const sample = () => {
  const pages = Array.from({ length: 210 }, (_, i) => ({ page: i + 1, text: 'Example user-supplied page content for a tabletop game. '.repeat(4) }));
  pages[1].text += ' lifepath mission starship momentum threat focus ';
  return { format: BOOK_FORMAT, version: BOOK_FORMAT_VERSION, sourceSha256: 'a'.repeat(64),
    pageCount: pages.length, pages };
};
test('a file assigned Core rulebook is not a prepared corebook', () => {
  const pdf = new Blob(['%PDF-1.7']);
  assert.equal(hasPreparedCorebook([{ role: 'corebook', blob: pdf }]), false);
  assert.equal(hasPreparedCorebook([{ role: 'corebook', blob: pdf, bookPack: sample() }]), true);
  assert.equal(hasPreparedCorebook([{ role: 'forms', blob: pdf, bookPack: sample() }]), false);
});
test('prepared book requires a substantial readable index and section evidence', () => {
  assert.equal(validateBookPack(sample()).pageCount, 210);
  assert.throws(() => validateBookPack({ ...sample(), pageCount: 209 }));
  const broken = sample(); broken.pages[1].text = '';
  assert.throws(() => validateBookPack(broken));
  const missing = sample(); missing.pages[3].page = 10;
  assert.throws(() => validateBookPack(missing));
});
test('PDF fingerprint is checked against the selected source PDF', async () => {
  const pdf = new Blob(['%PDF-1.7', ' privately owned document']);
  const fingerprint = await pdfSha256(pdf);
  const pack = sample(); pack.sourceSha256 = fingerprint;
  assert.equal(await verifyPreparedBook(pdf, pack), pack);
  await assert.rejects(() => verifyPreparedBook(new Blob(['%PDF-different']), pack), /different PDF/);
});
test('prepared data powers local reference searches', () => {
  const results = searchBookPack(sample(), 'starship');
  assert.equal(results.length, 1);
  assert.equal(results[0].page, 2);
  assert.equal(searchBookPack(sample(), 'nonexistent').length, 0);
});
