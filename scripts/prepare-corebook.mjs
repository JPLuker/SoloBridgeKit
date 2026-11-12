#!/usr/bin/env node
// The local owner prepares this from their legally obtained book.
// Never commit or distribute the generated output.
import { createReadStream, writeFileSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { BOOK_FORMAT, BOOK_FORMAT_VERSION, validateBookPack } from '../book-data.mjs';

const input = process.argv[2];
if (!input || ['--help', '-h'].includes(input)) {
  console.log('Usage: node scripts/prepare-corebook.mjs "/path/to/corebook.pdf" [output.json]');
  console.log('Requires Poppler command-line tools: pdfinfo and pdftotext.');
  process.exit(input ? 0 : 1);
}
const pdfPath = resolve(input);
const outPath = resolve(process.argv[3] || join(dirname(pdfPath), basename(pdfPath).replace(/\.pdf$/i, '') + '.solobridge-book.json'));
if (pdfPath === outPath) throw new Error('Output must be different from the source PDF.');
function tool(command, args, cap = 30000000) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: cap, windowsHide: true });
  if (result.error?.code === 'ENOENT') throw new Error(`Missing ${command}. Install Poppler utilities and retry.`);
  if (result.error || result.status !== 0) throw new Error(`${command} failed: ${String(result.stderr || result.error || result.status).slice(0, 400)}`);
  return result.stdout;
}
const info = tool('pdfinfo', [pdfPath]);
const count = Number(info.match(/^Pages:\s*(\d+)/m)?.[1]);
if (!Number.isSafeInteger(count)) throw new Error('Could not read PDF page count.');
const extracted = tool('pdftotext', ['-layout', pdfPath, '-'], 80000000).split('\f');
if (extracted.length === count + 1 && !extracted[count].trim()) extracted.pop();
if (extracted.length !== count) throw new Error(`Extracted ${extracted.length} pages, expected ${count}.`);
const sha = createHash('sha256');
for await (const chunk of createReadStream(pdfPath)) sha.update(chunk);
const pack = validateBookPack({
  format: BOOK_FORMAT,
  version: BOOK_FORMAT_VERSION,
  sourceSha256: sha.digest('hex'),
  pageCount: count,
  pages: extracted.map((text, index) => ({ page: index + 1, text: text.trim() }))
});
writeFileSync(outPath, JSON.stringify(pack), { encoding: 'utf8', flag: 'wx' });
console.log(`Prepared ${pack.pageCount} pages at ${outPath}. PRIVATE FILE: do not share or commit.`);
