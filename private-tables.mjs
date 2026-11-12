// User-created and source-page-linked private lookup tables.
// No table entries or published rulebook prose are embedded in this module.
import { validateBookPack } from './book-data.mjs';
const HASH = /^[a-f0-9]{64}$/;

export function suggestRowsFromPage(pack, pageNumber) {
  validateBookPack(pack);
  const number = Number(pageNumber);
  if (!Number.isSafeInteger(number) || number < 1 || number > pack.pageCount)
    throw new Error('Choose a valid PDF page.');
  const source = pack.pages[number - 1].text;
  const candidates = [];
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\s*(?:[).:]\s*|\|\s*|\s{2,})(\S.{1,499})$/u);
    if (!match) continue;
    const first = Number(match[1]);
    const last = match[2] ? Number(match[2]) : first;
    if (first < 1 || last < first || last > 1000) continue;
    candidates.push({ min: first, max: last, text: match[3].trim().replace(/\|/g, '／') });
    if (candidates.length >= 120) break;
  }
  return candidates;
}

export function formatCandidateRows(rows) {
  return rows.map(row => `${row.min}${row.max === row.min ? '' : '-' + row.max} | ${row.text}`).join('\n');
}

export function parsePrivateTableRows(raw) {
  const lines = String(raw ?? '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (lines.length < 2 || lines.length > 120)
    throw new Error('Enter 2–120 table rows.');
  const entries = lines.map((line, index) => {
    const match = line.match(/^(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\s*\|\s*(\S.{0,499})$/u);
    if (!match) throw new Error(`Row ${index + 1}: expected "1 | result" or "1-2 | result".`);
    return { min: Number(match[1]), max: match[2] ? Number(match[2]) : Number(match[1]), text: match[3].trim() };
  });
  let expected = 1;
  for (const entry of entries) {
    if (entry.min !== expected || entry.max < entry.min || entry.max > 1000)
      throw new Error(`Table ranges must start at 1 and have no gaps or overlaps (expected ${expected}).`);
    expected = entry.max + 1;
  }
  if (expected <= 3) throw new Error('Tables need at least three possible results.');
  return entries;
}

export function makePrivateTable({ title, page, rows, sourceSha256, id = globalThis.crypto?.randomUUID?.() }) {
  const label = String(title ?? '').trim();
  const nPage = Number(page);
  if (!label || label.length > 120) throw new Error('Enter a title up to 120 characters.');
  if (!Number.isSafeInteger(nPage) || nPage < 1 || nPage > 2000) throw new Error('Enter a valid PDF page.');
  if (!HASH.test(sourceSha256 ?? '')) throw new Error('Source PDF fingerprint is missing.');
  if (typeof id !== 'string' || !id || id.length > 120) throw new Error('Invalid table ID.');
  const entries = parsePrivateTableRows(rows);
  return { id, title: label, page: nPage, sourceSha256, entries, sides: entries.at(-1).max };
}

export function normalizePrivateTables(tables, sourceSha256) {
  if (tables == null) return [];
  if (!Array.isArray(tables) || !HASH.test(sourceSha256 ?? ''))
    throw new Error('Invalid private table collection.');
  const ids = new Set();
  return tables.map(table => {
    if (!table || typeof table.id !== 'string' || ids.has(table.id))
      throw new Error('Duplicate or missing private table ID.');
    const rows = (table.entries ?? []).map(row =>
      `${row.min}${row.max !== row.min ? '-' + row.max : ''} | ${row.text}`).join('\n');
    const valid = makePrivateTable({ title: table.title, page: table.page,
      rows, sourceSha256: table.sourceSha256, id: table.id });
    if (valid.sourceSha256 !== sourceSha256 || valid.sides !== table.sides)
      throw new Error('Table data does not match the imported corebook.');
    ids.add(table.id);
    return valid;
  });
}

export function addPrivateTable(tables, table, sourceSha256) {
  const old = normalizePrivateTables(tables, sourceSha256);
  if (old.some(item => item.id === table.id)) throw new Error('Duplicate table ID.');
  return normalizePrivateTables([...old, table], sourceSha256);
}
export function removePrivateTable(tables, id, sourceSha256) {
  const old = normalizePrivateTables(tables, sourceSha256);
  if (!old.some(item => item.id === id)) throw new Error('Table not found.');
  return old.filter(item => item.id !== id);
}
function draw(sides) {
  const max = 0x100000000;
  const limit = max - (max % sides);
  const buffer = new Uint32Array(1);
  do { crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
  return (buffer[0] % sides) + 1;
}
export function rollPrivateTable(table, random = draw) {
  const entries = parsePrivateTableRows(table.entries.map(item =>
    `${item.min}${item.max !== item.min ? '-' + item.max : ''} | ${item.text}`).join('\n'));
  if (entries.at(-1).max !== table.sides) throw new Error('Table sides do not match its entries.');
  const value = random(table.sides);
  if (!Number.isSafeInteger(value) || value < 1 || value > table.sides)
    throw new Error('Invalid random-table roll.');
  const entry = entries.find(row => row.min <= value && value <= row.max);
  if (!entry) throw new Error('Result has no matching table row.');
  return { value, entry };
}
