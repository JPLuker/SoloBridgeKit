import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOK_FORMAT, BOOK_FORMAT_VERSION } from '../book-data.mjs';
import { suggestRowsFromPage, formatCandidateRows, parsePrivateTableRows,
  makePrivateTable, normalizePrivateTables, addPrivateTable, removePrivateTable, rollPrivateTable
} from '../private-tables.mjs';
const sha = 'c'.repeat(64);
const pack = () => {
  const pages = Array.from({ length: 210 }, (_, index) => ({
    page: index + 1, text: 'Example private index data from a sample book. '.repeat(4)
  }));
  pages[0].text += '\nlifepath mission starship momentum threat focus';
  pages[5].text = 'A sample table\n1 | First sample outcome\n2 | Second sample outcome\n3 | Third sample outcome';
  return { format: BOOK_FORMAT, version: BOOK_FORMAT_VERSION, sourceSha256: sha, pageCount: 210, pages };
};
test('candidate rows are extracted only from the locally supplied index', () => {
  const rows = suggestRowsFromPage(pack(), 6);
  assert.deepEqual(rows.map(row => row.min), [1,2,3]);
  assert.match(formatCandidateRows(rows), /3 \| Third sample/);
  assert.throws(() => suggestRowsFromPage(pack(), 900));
});
test('table rows require explicit contiguous ranges', () => {
  assert.equal(parsePrivateTableRows('1-2 | A\n3 | B').length, 2);
  assert.throws(() => parsePrivateTableRows('1 | A\n3 | B'), /gaps/);
  assert.throws(() => parsePrivateTableRows('1 | A\n1 | B'), /overlaps/);
  assert.throws(() => parsePrivateTableRows('2 | A\n3 | B'), /start at 1/);
  assert.throws(() => parsePrivateTableRows('1 | A'), /2–120/);
});
test('private tables are tied to the source fingerprint and remain immutable', () => {
  const table = makePrivateTable({ title: 'Test table', page: 6, rows: '1-2 | A\n3 | B', sourceSha256: sha, id: 'table-1' });
  assert.equal(table.sides, 3);
  assert.equal(addPrivateTable([], table, sha).length, 1);
  assert.throws(() => normalizePrivateTables([table], 'b'.repeat(64)), /match/);
  assert.equal(removePrivateTable([table], table.id, sha).length, 0);
  assert.throws(() => addPrivateTable([table], table, sha), /Duplicate/);
});
test('rolls respect private value ranges and report source entry', () => {
  const table = makePrivateTable({ title: 'Random', page: 10, rows: '1-2 | A\n3 | B', sourceSha256: sha, id: 'test' });
  assert.equal(rollPrivateTable(table, () => 2).entry.text, 'A');
  assert.equal(rollPrivateTable(table, () => 3).entry.text, 'B');
  assert.throws(() => rollPrivateTable(table, () => 0));
});
