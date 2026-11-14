// Versioned private game-data compiler. All source content comes from user PDFs.
// Never distribute derived records, extracted prose, table entries, or publisher assets.
import { validateBookPack } from './book-data.mjs';
import { suggestRowsFromPage, formatCandidateRows, makePrivateTable } from './private-tables.mjs';
import { makePrivateOption } from './private-options.mjs';
import { makePrivateShip } from './private-ships.mjs';

export const COMPILER_SCHEMA = 1;
export const COMPILER_KINDS = Object.freeze(['lifepath', 'talent', 'ship-class', 'random-table']);
export const COMPILER_STATUSES = Object.freeze(['draft', 'confirmed', 'needs-review', 'rejected']);
const HASH = /^[a-f0-9]{64}$/;
const ALLOWED = new Set(COMPILER_KINDS);
const STATES = new Set(COMPILER_STATUSES);
const MAX_RECORDS = 1000;
const MAX_TEXT = 4000;

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(label + ' must be an object.');
  return value;
}
function clean(value, max, label, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
    throw new Error('Invalid ' + label + '.');
  return value.trim();
}
function pageNumber(value, total) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > total)
    throw new Error('Source page is outside the imported PDF.');
  return number;
}
export function draftCandidate({ id = globalThis.crypto?.randomUUID?.(), kind,
  label, page, sourceSha256, pageCount, payload = {}, excerpt = '' }) {
  if (!ALLOWED.has(kind)) throw new Error('Unsupported private record kind.');
  if (!HASH.test(sourceSha256 ?? '')) throw new Error('Missing source PDF fingerprint.');
  if (typeof id !== 'string' || !id || id.length > 120) throw new Error('Invalid record ID.');
  const name = clean(label, 120, 'record label');
  const p = pageNumber(page, pageCount);
  return { id, schemaVersion: COMPILER_SCHEMA, kind, label: name, page: p,
    sourceSha256, status: 'draft', payload: structuredClone(object(payload, 'Draft payload')),
    excerpt: clean(excerpt, MAX_TEXT, 'source excerpt', false), reviewedAt: null };
}
function normalizeOne(raw, sourceSha256, pageCount, { allowStale = false } = {}) {
  object(raw, 'Compiler record');
  if (raw.schemaVersion !== COMPILER_SCHEMA) throw new Error('Unsupported compiler schema.');
  if (!ALLOWED.has(raw.kind) || !STATES.has(raw.status)) throw new Error('Unsupported private record type/status.');
  if (typeof raw.id !== 'string' || !raw.id || raw.id.length > 120)
    throw new Error('Invalid record ID.');
  if (!HASH.test(raw.sourceSha256 ?? '')) throw new Error('Invalid source fingerprint.');
  const page = Number(raw.page);
  if (!Number.isSafeInteger(page) || page < 1 || page > 2000)
    throw new Error('Invalid original source page.');
  if (raw.sourceSha256 !== sourceSha256 || page > pageCount) {
    if (!allowStale) throw new Error('Compiled record belongs to a missing or changed PDF.');
    return { ...raw, status: 'needs-review', reviewedAt: null };
  }
  const candidate = draftCandidate({ id: raw.id, kind: raw.kind, label: raw.label,
    page, sourceSha256, pageCount, payload: raw.payload, excerpt: raw.excerpt ?? '' });
  const status = raw.status;
  if (status === 'confirmed') confirmedPayload(candidate, candidate.payload);
  if (status === 'confirmed' && (typeof raw.reviewedAt !== 'string' || !raw.reviewedAt))
    throw new Error('Confirmed source record requires a review timestamp.');
  return { ...candidate, status, reviewedAt: raw.reviewedAt ?? null };
}
export function normalizeCompiledRecords(records, sourceSha256, pageCount, options = {}) {
  if (records == null) return [];
  if (!HASH.test(sourceSha256 ?? '') || !Number.isSafeInteger(pageCount) || pageCount < 1)
    throw new Error('Compiled data needs a valid prepared PDF.');
  if (!Array.isArray(records) || records.length > MAX_RECORDS)
    throw new Error('Invalid private compiler record list.');
  const seen = new Set();
  return records.map(record => {
    const valid = normalizeOne(record, sourceSha256, pageCount, options);
    if (seen.has(valid.id)) throw new Error('Duplicate private compiler record ID.');
    seen.add(valid.id);
    return valid;
  });
}
// Heuristic candidates are NOT automatically usable as game rules.
export function scanBookPage(pack, page, kind, limit = 12) {
  validateBookPack(pack);
  if (!ALLOWED.has(kind)) throw new Error('Unsupported private record kind.');
  const sourcePage = pageNumber(page, pack.pageCount);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 30)
    throw new Error('Invalid candidate limit.');
  const text = pack.pages[sourcePage - 1].text;
  if (kind === 'random-table') {
    const rows = suggestRowsFromPage(pack, sourcePage);
    if (rows.length < 2) return [];
    const name = text.split(/\r?\n/).map(line => line.trim())
      .find(line => /^[\p{L}][\p{L}\p{N}\s,:'()/-]{3,99}$/u.test(line)) || 'Table on page ' + sourcePage;
    return [draftCandidate({ kind, label: name, page: sourcePage,
      sourceSha256: pack.sourceSha256, pageCount: pack.pageCount,
      payload: { rows: formatCandidateRows(rows) },
      excerpt: rows.slice(0, 3).map(row => row.min + ' ' + row.text).join('\n').slice(0, MAX_TEXT) })];
  }
  const unique = new Set(), candidates = [];
  for (const line of text.split(/\r?\n/)) {
    // Short headings only: exclude numbered table entries, long paragraphs, and
    // tiny section markers. We do NOT infer mechanical bonuses from prose.
    const name = line.trim().replace(/\s+/g, ' ');
    if (!/^[\p{L}][\p{L}\p{N}\s,'()/:–-]{3,99}$/u.test(name) ||
      name.split(/\s+/).length > 11 || unique.has(name.toLowerCase())) continue;
    unique.add(name.toLowerCase());
    candidates.push(draftCandidate({ kind, label: name, page: sourcePage,
      sourceSha256: pack.sourceSha256, pageCount: pack.pageCount, excerpt: line.slice(0, MAX_TEXT) }));
    if (candidates.length === limit) break;
  }
  return candidates;
}
export function confirmedPayload(candidate, payload) {
  object(payload, 'Compiled record payload');
  if (candidate.kind === 'lifepath') {
    const stage = clean(payload.stepId, 30, 'lifepath stage');
    return makePrivateOption({ id: candidate.id, stepId: stage, label: candidate.label,
      page: candidate.page, sourceSha256: candidate.sourceSha256,
      record: object(payload.record, 'Lifepath bonuses') });
  }
  if (candidate.kind === 'ship-class') {
    return makePrivateShip({ id: candidate.id, sourceSha256: candidate.sourceSha256,
      page: candidate.page, className: candidate.label,
      kind: payload.kind, era: payload.era, scale: payload.scale,
      systems: payload.systems, departments: payload.departments });
  }
  if (candidate.kind === 'random-table') {
    return makePrivateTable({ id: candidate.id, sourceSha256: candidate.sourceSha256,
      page: candidate.page, title: candidate.label, rows: payload.rows });
  }
  return {
    id: candidate.id, sourceSha256: candidate.sourceSha256, page: candidate.page,
    name: candidate.label,
    description: clean(payload.description, MAX_TEXT, 'talent description'),
    prerequisites: clean(payload.prerequisites ?? '', 1000, 'talent prerequisites', false)
  };
}
export function reviewCompiledRecord(record, { label = record.label, payload = record.payload,
  status = 'confirmed' } = {}, sourceSha256, pageCount) {
  if (!['confirmed','rejected','draft'].includes(status))
    throw new Error('Invalid review decision.');
  const original = normalizeOne(record, sourceSha256, pageCount);
  const next = draftCandidate({ id: original.id, kind: original.kind, label,
    page: original.page, sourceSha256, pageCount, payload, excerpt: original.excerpt });
  if (status === 'confirmed') confirmedPayload(next, payload);
  return { ...next, status, reviewedAt: status === 'confirmed' ? new Date().toISOString() : null };
}
export function compiledCatalog(records, sourceSha256, pageCount, kind) {
  if (!ALLOWED.has(kind)) throw new Error('Unsupported compiled record kind.');
  // Stale records remain visible for review but cannot be used as game rules.
  return normalizeCompiledRecords(records, sourceSha256, pageCount, { allowStale: true })
    .filter(record => record.status === 'confirmed' && record.kind === kind &&
      record.sourceSha256 === sourceSha256 && record.page <= pageCount)
    .map(record => confirmedPayload(record, record.payload));
}
export function upsertCompiledRecord(records, record, sourceSha256, pageCount) {
  const existing = normalizeCompiledRecords(records, sourceSha256, pageCount, { allowStale: true });
  const validated = normalizeOne(record, sourceSha256, pageCount);
  const at = existing.findIndex(item => item.id === validated.id);
  if (at >= 0) existing[at] = validated;
  else existing.push(validated);
  return normalizeCompiledRecords(existing, sourceSha256, pageCount);
}
export function removeCompiledRecord(records, id, sourceSha256, pageCount) {
  const existing = normalizeCompiledRecords(records, sourceSha256, pageCount, { allowStale: true });
  return existing.filter(item => item.id !== id);
}
export function revalidateCompiledRecords(records, newSourceSha256, newPageCount) {
  // Preserve player corrections across parser/schema updates; revalidation
  // never discards content or silently promotes stale source records.
  if (!HASH.test(newSourceSha256 ?? '') || !Number.isSafeInteger(newPageCount) ||
      newPageCount < 1 || !Array.isArray(records) || records.length > MAX_RECORDS)
    throw new Error('Cannot revalidate invalid private compiler data.');
  const seen = new Set();
  return records.map(raw => {
    object(raw, 'Compiler record');
    if (typeof raw.id !== 'string' || !raw.id || seen.has(raw.id))
      throw new Error('Duplicate or invalid compiler ID during revalidation.');
    seen.add(raw.id);
    if (raw.schemaVersion > COMPILER_SCHEMA)
      throw new Error('A newer compiler schema is required; original private data was preserved.');
    const updated = { ...raw, schemaVersion: COMPILER_SCHEMA };
    if (raw.schemaVersion !== COMPILER_SCHEMA) {
      return { ...updated, status: 'needs-review', reviewedAt: null };
    }
    try {
      return normalizeOne(updated, newSourceSha256, newPageCount, { allowStale: true });
    } catch (error) {
      // Strict validators can become stricter after app updates; preserve the
      // original payload while preventing outdated rules from being consumed.
      return { ...updated, status: 'needs-review', reviewedAt: null };
    }
  });
}
