#!/usr/bin/env node
// Local verification utility. Uses the SAME PDF.js preparation path as the PWA.
// This tool never prints or writes publisher text or generated private data.
import { readFile } from 'node:fs/promises';
import { createHash, webcrypto } from 'node:crypto';

const file = process.argv[2];
const json = process.argv.includes('--json');
if (!file || file.startsWith('--')) {
  console.error('Usage: npm run verify:private-book -- "/path/to/your/corebook.pdf" [--json]');
  process.exit(2);
}
// The shipped modern PDF.js build expects rendering-only browser geometry APIs.
// Text extraction does not use these stubs; the browser itself supplies the real APIs.
globalThis.DOMMatrix ??= class DOMMatrix {
  constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; }
};
globalThis.Path2D ??= class Path2D {};
globalThis.ImageData ??= class ImageData {};
globalThis.crypto ??= webcrypto;

try {
  const bytes = await readFile(file);
  const expectedDigest = createHash('sha256').update(bytes).digest('hex');
  const { preparePdfInBrowser } = await import('../dist/browser-compiler.mjs');
  const beginning = Date.now();
  const pack = await preparePdfInBrowser(new Blob([bytes], { type: 'application/pdf' }));
  const readablePages = pack.pages.filter(page => page.text.trim().length > 40).length;
  if (pack.sourceSha256 !== expectedDigest) throw new Error('The extracted PDF fingerprint does not match its source.');
  const summary = {
    passed: true, pages: pack.pageCount, readablePages,
    fingerprintMatches: true, elapsedSeconds: (Date.now() - beginning) / 1000
  };
  // NEVER print source text, excerpts, paths, or SHA-256 signatures.
  if (json) console.log(JSON.stringify(summary));
  else console.log(`Private book verification passed: ${pack.pageCount} pages (${readablePages} readable). No private data exported.`);
} catch (error) {
  console.error('Private book verification failed:', error?.message || String(error));
  process.exitCode = 1;
}
