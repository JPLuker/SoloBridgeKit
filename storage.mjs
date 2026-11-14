import { DATA_VERSION, validateBundle } from './model.mjs';
import { normalizeBookmarks } from './bookmarks.mjs';
import { normalizeDocumentRole, shouldIncludeDocuments, shouldReplaceDocumentsInRestore } from './content-policy.mjs';
import { validateBookPack, verifyPreparedBook } from './book-data.mjs';
import { normalizePrivateTables } from './private-tables.mjs';
import { normalizePrivateOptions } from './private-options.mjs';
import { normalizePrivateShips } from './private-ships.mjs';

const DB_NAME = 'solobridgekit';
const STORE_NAMES = ['campaigns', 'documents', 'settings'];
let dbPromise;
const campaignWriteQueues = new Map();
let destructiveMutation = false;
let dataGeneration = 0;
export function currentDataGeneration() { return dataGeneration; }

async function withExclusiveMutation(action) {
  if (destructiveMutation) throw new Error('Another restore or reset is already running.');
  destructiveMutation = true;
  dataGeneration++; // Invalidates any import prepared against the old database.
  try {
    await Promise.all([...campaignWriteQueues.values()].map(p => p.catch(() => {})));
    return await action();
  } finally {
    destructiveMutation = false;
  }
}


export function database() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DATA_VERSION);
      req.onupgradeneeded = () => {
        for (const name of STORE_NAMES) {
          if (!req.result.objectStoreNames.contains(name)) {
            req.result.createObjectStore(name, { keyPath: name === 'settings' ? 'key' : 'id' });
          }
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        // Permit a new app version in another tab to upgrade this database.
        db.onversionchange = () => { db.close(); dbPromise = undefined; };
        resolve(db);
      };
      req.onerror = () => reject(req.error ?? new Error('Storage unavailable.'));
      req.onblocked = () => reject(new Error('Close other SoloBridgeKit tabs and retry.'));
    }).catch(error => { dbPromise = undefined; throw error; });
  }
  return dbPromise;
}

async function run(store, mode, action) {
  const db = await database();
  return new Promise((resolve, reject) => {
    let result;
    const transaction = db.transaction(store, mode);
    const request = action(transaction.objectStore(store));
    request.onsuccess = () => { result = request.result; };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error ?? new Error('Storage operation failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Storage operation aborted.'));
  });
}

export const all = store => run(store, 'readonly', objectStore => objectStore.getAll());
export const get = (store, key) => run(store, 'readonly', objectStore => objectStore.get(key));
export const put = (store, record) => run(store, 'readwrite', objectStore => objectStore.put(record));
export const remove = (store, id) => run(store, 'readwrite', objectStore => objectStore.delete(id));

// Add an entire selected import batch in one IndexedDB transaction.
// If ANY add fails (including quota, duplicate ID or serialization), none persist.
export async function addDocumentsAtomically(records, expectedGeneration = dataGeneration) {
  if (!Array.isArray(records) || !records.length) throw new Error('No documents to import.');
  if (expectedGeneration !== dataGeneration)
    throw new Error('The local database changed during PDF preparation. Re-import the file; no partial records were saved.');
  const ids = new Set();
  for (const doc of records) {
    if (!doc || typeof doc.id !== 'string' || !doc.id || ids.has(doc.id) ||
        !doc.blob || typeof doc.blob.size !== 'number') {
      throw new Error('Document import contains an invalid or duplicate record.');
    }
    ids.add(doc.id);
  }
  const db = await database();
  if (expectedGeneration !== dataGeneration || destructiveMutation)
    throw new Error('The local database was reset or restored during PDF preparation. Retry the import.');
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not save the PDF batch.'));
    tx.onabort = () => reject(tx.error ?? new Error('PDF import was rolled back.'));
    try {
      const store = tx.objectStore('documents');
      for (const doc of records) store.add(doc); // add, never overwrite existing IDs
    } catch (error) {
      try { tx.abort(); } catch { /* Transaction may already have aborted. */ }
      reject(error);
    }
  });
}

function campaignRevision(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

async function commitCampaignSnapshot(campaign) {
  // Capture the latest state AFTER any earlier queued save of this campaign finishes.
  const snapshot = structuredClone(campaign);
  const expected = campaignRevision(snapshot.revision);
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('campaigns', 'readwrite');
    let committed;
    tx.oncomplete = () => {
      if (!committed) return reject(new Error('Campaign save did not complete.'));
      campaign.revision = committed.revision;
      campaign.updatedAt = committed.updatedAt;
      resolve(committed);
    };
    tx.onerror = () => reject(tx.error ?? new Error('Campaign save failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('Campaign save was cancelled.'));
    const store = tx.objectStore('campaigns');
    const request = store.get(snapshot.id);
    request.onsuccess = () => {
      const storedRevision = campaignRevision(request.result?.revision);
      if (storedRevision !== expected) {
        reject(new Error('This campaign was updated in another tab. Your stale edit was not saved. Export your data before reloading.'));
        tx.abort();
        return;
      }
      committed = { ...snapshot, revision: expected + 1, updatedAt: new Date().toISOString() };
      store.put(committed);
    };
  });
}

// Patch the latest stored document without resurrecting a removed source or
// overwriting unrelated user metadata after long-running PDF preparation.
export async function patchDocumentIfCurrent(id, changes, expectedGeneration) {
  if (!id || !changes || typeof changes !== 'object' || Array.isArray(changes))
    throw new Error('Invalid document update.');
  const db = await database();
  if (expectedGeneration !== dataGeneration || destructiveMutation)
    throw new Error('The library changed during preparation. Retry; existing data was preserved.');
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not save document changes.'));
    tx.onabort = () => reject(tx.error ?? new Error('Document update was rolled back.'));
    const store = tx.objectStore('documents');
    const request = store.get(id);
    request.onsuccess = () => {
      if (!request.result) {
        reject(new Error('The original PDF was removed. It was not recreated.'));
        tx.abort();
      } else {
        store.put({ ...request.result, ...changes, id });
      }
    };
  });
}

export async function saveCampaign(campaign) {
  if (destructiveMutation) throw new Error('A restore or reset is in progress. Retry the save after it completes.');
  if (!campaign || typeof campaign.id !== 'string' || !campaign.id) {
    throw new Error('Cannot save an invalid campaign.');
  }
  const previous = campaignWriteQueues.get(campaign.id) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(() => commitCampaignSnapshot(campaign));
  campaignWriteQueues.set(campaign.id, next);
  try { await next; }
  finally {
    if (campaignWriteQueues.get(campaign.id) === next) campaignWriteQueues.delete(campaign.id);
  }
}

export async function resetData() {
  return withExclusiveMutation(async () => {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAMES, 'readwrite');
      STORE_NAMES.forEach(name => tx.objectStore(name).clear());
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Could not erase data.'));
      tx.onabort = () => reject(tx.error ?? new Error('Could not erase data.'));
    });
  });
}

function bytesToBase64(bytes) {
  let result = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    result += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(result);
}

function base64ToBytes(base64) {
  const string = atob(base64);
  const bytes = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) bytes[i] = string.charCodeAt(i);
  return bytes;
}

export async function createBackup(options = {}) {
  const campaigns = await all('campaigns');
  const docs = shouldIncludeDocuments(options) ? await all('documents') : [];
  const documents = [];
  for (const doc of docs) {
    const bytes = new Uint8Array(await doc.blob.arrayBuffer());
    documents.push({ id: doc.id, name: doc.name, size: doc.size, importedAt: doc.importedAt,
      role: normalizeDocumentRole(doc.role), bookmarks: normalizeBookmarks(doc.bookmarks),
      ...(doc.bookPack ? { bookPack: validateBookPack(doc.bookPack),
        tables: normalizePrivateTables(doc.tables, doc.bookPack.sourceSha256),
        options: normalizePrivateOptions(doc.options, doc.bookPack.sourceSha256),
        ships: normalizePrivateShips(doc.ships, doc.bookPack.sourceSha256) } : {}), base64: bytesToBase64(bytes) });
  }
  return { format: 'solobridgekit', version: DATA_VERSION, createdAt: new Date().toISOString(),
    includesDocuments: shouldIncludeDocuments(options), campaigns, documents };
}

export async function restoreBackup(raw) {
  const bundle = validateBundle(raw);
  const docs = bundle.documents.map(d => ({ id: d.id, name: d.name, size: d.size,
    importedAt: d.importedAt, role: normalizeDocumentRole(d.role), bookmarks: normalizeBookmarks(d.bookmarks),
    ...(d.bookPack ? { bookPack: validateBookPack(d.bookPack),
      tables: normalizePrivateTables(d.tables, d.bookPack.sourceSha256),
      options: normalizePrivateOptions(d.options, d.bookPack.sourceSha256),
      ships: normalizePrivateShips(d.ships, d.bookPack.sourceSha256) } : {}),
    blob: new Blob([base64ToBytes(d.base64)], { type: 'application/pdf' }) }));
  // Validate every private index against its restored PDF before replacing any local records.
  for (const doc of docs) {
    if (doc.bookPack) await verifyPreparedBook(doc.blob, doc.bookPack);
  }
  return withExclusiveMutation(async () => {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAMES, 'readwrite');
      for (const name of STORE_NAMES) {
        if (name !== 'documents' || shouldReplaceDocumentsInRestore(bundle)) tx.objectStore(name).clear();
      }
      for (const c of bundle.campaigns) tx.objectStore('campaigns').put(c);
      if (shouldReplaceDocumentsInRestore(bundle)) {
        for (const d of docs) tx.objectStore('documents').put(d);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Restore failed.'));
      tx.onabort = () => reject(tx.error ?? new Error('Restore failed.'));
    });
  });
}