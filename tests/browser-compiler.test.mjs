import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePdfInBrowser } from '../browser-compiler.mjs';

test('browser compilation requires a supplied PDF', async () => {
  await assert.rejects(() => preparePdfInBrowser(), /Select a PDF/);
});
test('browser compilation respects cancellation before reading input', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => preparePdfInBrowser(new Blob(['%PDF-1.7']), { signal: controller.signal }), /cancelled/);
});
test('browser compilation rejects excessively large input before loading PDF.js', async () => {
  const huge = { size: 301 * 1024 * 1024, arrayBuffer: () => { throw new Error('Do not read'); } };
  await assert.rejects(() => preparePdfInBrowser(huge), /300 MB/);
});
