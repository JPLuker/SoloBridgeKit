// The player generates this data from their private PDF. No source-book text ships here.
import { normalizeDocumentRole } from './content-policy.mjs';

export const BOOK_FORMAT = 'solobridgekit-prepared-corebook';
export const BOOK_FORMAT_VERSION = 1;
const MIN_PAGES = 200;
const MAX_PAGES = 2000;
const REQUIRED_TOPICS = Object.freeze(['lifepath', 'mission', 'starship', 'momentum', 'threat', 'focus']);
const PDF_SHA = /^[a-f0-9]{64}$/;

export function validateBookPack(pack) {
  if (!pack || pack.format !== BOOK_FORMAT || pack.version !== BOOK_FORMAT_VERSION)
    throw new Error('Unsupported prepared corebook format.');
  if (!PDF_SHA.test(pack.sourceSha256 ?? ''))
    throw new Error('The prepared corebook is missing its PDF fingerprint.');
  if (!Number.isSafeInteger(pack.pageCount) || pack.pageCount < MIN_PAGES || pack.pageCount > MAX_PAGES ||
      !Array.isArray(pack.pages) || pack.pages.length !== pack.pageCount)
    throw new Error('Incomplete corebook page index.');
  let readable = 0;
  const found = new Set();
  for (let i = 0; i < pack.pages.length; i++) {
    const page = pack.pages[i];
    if (!page || page.page !== i + 1 || typeof page.text !== 'string' || page.text.length > 100000)
      throw new Error('Invalid corebook page index.');
    if (page.text.trim().length > 40) readable++;
    const lower = page.text.toLowerCase();
    for (const word of REQUIRED_TOPICS) {
      if (lower.includes(word)) found.add(word);
    }
  }
  if (readable < Math.floor(pack.pageCount * 0.7) ||
      REQUIRED_TOPICS.some(word => !found.has(word)))
    throw new Error('The PDF does not contain a readable Captain\'s Log corebook.');
  return pack;
}

export function hasPreparedCorebook(documents) {
  return Array.isArray(documents) && documents.some(doc =>
    doc && normalizeDocumentRole(doc.role) === 'corebook' &&
    doc.blob && typeof doc.blob.size === 'number' && doc.blob.size > 5 &&
    doc.bookPack?.format === BOOK_FORMAT &&
    doc.bookPack?.version === BOOK_FORMAT_VERSION &&
    PDF_SHA.test(doc.bookPack.sourceSha256 ?? '') &&
    Number.isSafeInteger(doc.bookPack.pageCount) && doc.bookPack.pageCount >= MIN_PAGES &&
    doc.bookPack.pageCount <= MAX_PAGES &&
    Array.isArray(doc.bookPack.pages) && doc.bookPack.pages.length === doc.bookPack.pageCount
  );
}

export async function pdfSha256(blob) {
  if (!blob || typeof blob.arrayBuffer !== 'function') throw new Error('Select the corebook PDF.');
  if (!globalThis.crypto?.subtle?.digest) throw new Error('SHA-256 is unavailable in this browser.');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPreparedBook(pdf, pack) {
  validateBookPack(pack);
  if ((await pdfSha256(pdf)) !== pack.sourceSha256) {
    throw new Error('This data pack belongs to a different PDF. Prepare the selected corebook again.');
  }
  return pack;
}

export function searchBookPack(pack, query, limit = 12) {
  const term = String(query ?? '').trim().toLowerCase();
  if (!term || term.length < 2) return [];
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid search limit.');
  const results = [];
  for (const page of pack?.pages ?? []) {
    const source = typeof page?.text === 'string' ? page.text : '';
    const index = source.toLowerCase().indexOf(term);
    if (index < 0) continue;
    const start = Math.max(0, index - 55);
    const end = Math.min(source.length, index + term.length + 90);
    const excerpt = source.slice(start, end).replace(/\s+/g, ' ').trim();
    results.push({ page: page.page, excerpt: `${start ? '…' : ''}${excerpt}${end < source.length ? '…' : ''}` });
    if (results.length === limit) break;
  }
  return results;
}
