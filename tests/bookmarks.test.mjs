import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBookmarks, createBookmark, addBookmark, removeBookmark } from '../bookmarks.mjs';
import { validateBundle, DATA_VERSION } from '../model.mjs';

test('legacy documents have an empty bookmark list', () => {
  assert.deepEqual(normalizeBookmarks(), []);
  assert.deepEqual(normalizeBookmarks(null), []);
});
test('bookmark labels and PDF page numbers are validated', () => {
  const saved = createBookmark('  Ship creation  ', '147', 'book1');
  assert.equal(saved.label, 'Ship creation');
  assert.equal(saved.page, 147);
  assert.equal(saved.id, 'book1');
  for (const invalid of ['', '0', '-1', '1.5', '100000', 'not a page']) {
    assert.throws(() => createBookmark('Reference', invalid, 'test'));
  }
  assert.throws(() => createBookmark(' ', 5, 'test'));
  assert.throws(() => createBookmark('x'.repeat(121), 5, 'test'));
});
test('bookmarks can be added and removed without mutating existing records', () => {
  const a = createBookmark('Mission', 191, 'a');
  const b = createBookmark('Lifepath', 97, 'b');
  const one = addBookmark(undefined, a);
  const two = addBookmark(one, b);
  assert.equal(one.length, 1);
  assert.deepEqual(two.map(x=>x.page), [191,97]);
  assert.deepEqual(removeBookmark(two,'a').map(x=>x.id), ['b']);
  assert.equal(two.length,2);
  assert.throws(() => addBookmark(one, a));
  assert.throws(() => removeBookmark(one,'missing'));
});
test('corrupted imported bookmark metadata is rejected', () => {
  const good = createBookmark('Reference', 20, 'same');
  assert.throws(() => normalizeBookmarks([good, good]));
  assert.throws(() => normalizeBookmarks([{...good, page: 0}]));
  assert.throws(() => normalizeBookmarks({}));
});
test('old PDF backup is accepted and new bookmark metadata is validated', () => {
  const base64 = 'JVBERi0='; // %PDF- (5 bytes)
  const base = {format:'solobridgekit',version:DATA_VERSION,campaigns:[],documents:[{
    id:'book',name:'Private.pdf',size:5,base64
  }]};
  assert.equal(validateBundle(base),base);
  assert.equal(validateBundle({...base,documents:[{...base.documents[0],bookmarks:[createBookmark('Test', 20,'one')]}]}).version,DATA_VERSION);
  assert.throws(()=>validateBundle({...base,documents:[{...base.documents[0],bookmarks:[{id:'',label:'No ID',page:2}]}]}));
});