import { DATA_VERSION, validateBundle } from './model.mjs';
import { normalizeBookmarks } from './bookmarks.mjs';
import { normalizeDocumentRole, shouldIncludeDocuments, shouldReplaceDocumentsInRestore } from './content-policy.mjs';
import { validateBookPack, verifyPreparedBook } from './book-data.mjs';
import { normalizePrivateTables } from './private-tables.mjs';
import { normalizePrivateOptions } from './private-options.mjs';
import { normalizePrivateShips } from './private-ships.mjs';
import { normalizeCompiledRecords, upsertCompiledRecord, removeCompiledRecord } from './compiler-data.mjs';

const DB_NAME = 'solobridgekit';
const STORE_NAMES = ['campaigns', 'documents', 'settings'];
let dbPromise;
const campaignWriteQueues = new Map();
let destructiveMutation = false;
let dataGeneration = 0;
const EPOCH_KEY = 'data-generation-epoch';
const legacyEpoch = 'legacy';
const nextEpoch = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const epochValue = record => record?.value ?? legacyEpoch;
export async function currentDataGeneration() {
  // Persisted token detects a reset/restore performed in ANOTHER browser tab.
  return `${dataGeneration}:${epochValue(await get('settings', EPOCH_KEY))}`;
}
export async function stampNewCampaign(campaign) {
  if (!campaign || typeof campaign.id !== 'string' || !campaign.id)
    throw new Error('A new campaign needs a valid ID.');
  if (Number.isSafeInteger(campaign.revision) && campaign.revision > 0)
    throw new Error('Cannot re-stamp an existing campaign as new.');
  // Capture the token while this new record is being created. A future restore
  // cannot silently promote an old draft into the new database generation.
  campaign.storageEpoch = epochValue(await get('settings', EPOCH_KEY));
  return campaign;
}
function matchesGeneration(expected, record) {
  return expected === `${dataGeneration}:${epochValue(record)}`;
}

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
export async function addDocumentsAtomically(records, expectedGeneration = undefined) {
  if (!Array.isArray(records) || !records.length) throw new Error('No documents to import.');
  const generation = expectedGeneration ?? await currentDataGeneration();
  const ids = new Set();
  for (const doc of records) {
    if (!doc || typeof doc.id !== 'string' || !doc.id || ids.has(doc.id) ||
        !doc.blob || typeof doc.blob.size !== 'number') {
      throw new Error('Document import contains an invalid or duplicate record.');
    }
    ids.add(doc.id);
  }
  const db = await database();
  if (destructiveMutation)
    throw new Error('A restore/reset is in progress. Retry the PDF import.');
  return new Promise((resolve, reject) => {
    // Read the persistent epoch AND commit files within one transaction,
    // preventing a reset/restore in any tab from racing the final import write.
    const tx = db.transaction(['documents', 'settings'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not save the PDF batch.'));
    tx.onabort = () => reject(tx.error ?? new Error('PDF import was rolled back.'));
    const check = tx.objectStore('settings').get(EPOCH_KEY);
    check.onsuccess = () => {
      if (!matchesGeneration(generation, check.result) || destructiveMutation) {
        reject(new Error('The local database changed during PDF preparation. Re-import the file; no partial records were saved.'));
        tx.abort();
        return;
      }
      try {
        const store = tx.objectStore('documents');
        for (const doc of records) store.add(doc); // add, never overwrite IDs
      } catch (error) {
        reject(error);
        tx.abort();
      }
    };
  });
}

function campaignRevision(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

async function commitCampaignSnapshot(campaign) {
  // Capture AFTER any earlier queued save of the same campaign finishes.
  const snapshot = structuredClone(campaign);
  const expected = campaignRevision(snapshot.revision);
  const db = await database();
  return new Promise((resolve, reject) => {
    // The epoch and campaign must be read in the SAME transaction as the write.
    // Otherwise a restore in another tab could sneak between validation/write.
    const tx = db.transaction(['campaigns', 'settings'], 'readwrite');
    let committed;
    tx.oncomplete = () => {
      if (!committed) return reject(new Error('Campaign save did not complete.'));
      campaign.revision = committed.revision;
      campaign.updatedAt = committed.updatedAt;
      campaign.storageEpoch = committed.storageEpoch;
      resolve(committed);
    };
    tx.onerror = () => reject(tx.error ?? new Error('Campaign save failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('Campaign save was cancelled.'));
    const epochReq = tx.objectStore('settings').get(EPOCH_KEY);
    epochReq.onsuccess = () => {
      const currentEpoch = epochValue(epochReq.result);
      const store = tx.objectStore('campaigns');
      const request = store.get(snapshot.id);
      request.onsuccess = () => {
        const previous = request.result;
        const submittedEpoch = epochValue({ value: snapshot.storageEpoch });
        const previousEpoch = epochValue({ value: previous?.storageEpoch });
        const staleRevision = previous
          ? campaignRevision(previous.revision) !== expected
          : expected !== 0;
        const staleEpoch = submittedEpoch !== currentEpoch ||
          (previous && previousEpoch !== submittedEpoch);
        if (staleRevision || staleEpoch) {
          reject(new Error('This campaign was updated, deleted, or restored in another tab. Your stale edit was not saved. Download your recovery draft before reloading.'));
          tx.abort();
          return;
        }
        committed = { ...snapshot, revision: expected + 1,
          storageEpoch: currentEpoch, updatedAt: new Date().toISOString() };
        store.put(committed);
      };
    };
  });
}

// Patch the latest stored document without resurrecting a removed source or
// overwriting unrelated user metadata after long-running PDF preparation.
export async function patchDocumentIfCurrent(id, changes, expectedGeneration) {
  if (!id || !changes || typeof changes !== 'object' || Array.isArray(changes))
    throw new Error('Invalid document update.');
  const db = await database();
  if (destructiveMutation)
    throw new Error('The library changed during preparation. Retry; existing data was preserved.');
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['documents', 'settings'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not save document changes.'));
    tx.onabort = () => reject(tx.error ?? new Error('Document update was rolled back.'));
    const check = tx.objectStore('settings').get(EPOCH_KEY);
    check.onsuccess = () => {
      if (!matchesGeneration(expectedGeneration, check.result) || destructiveMutation) {
        reject(new Error('The library changed during preparation. Retry; existing data was preserved.'));
        tx.abort();
        return;
      }
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
    };
  });
}

// Compiler writes use the latest local document record in the same transaction.
// Confirmed entries cannot overwrite unrelated private tables/options/bookmarks.
export async function mutateCompiledRecords(documentId, operation, expectedGeneration = undefined) {
  if (!documentId || !operation || !['upsert','remove'].includes(operation.type))
    throw new Error('Invalid private compiler operation.');
  const generation = expectedGeneration ?? await currentDataGeneration();
  const db = await database();
  if (destructiveMutation) throw new Error('A restore or reset is in progress.');
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['documents','settings'], 'readwrite');
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? new Error('Private rules write failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('Private rules write rolled back.'));
    const epoch = tx.objectStore('settings').get(EPOCH_KEY);
    epoch.onsuccess = () => {
      if (!matchesGeneration(generation, epoch.result) || destructiveMutation) {
        reject(new Error('The library changed during compilation. No private rules were saved.'));
        tx.abort();
        return;
      }
      const store = tx.objectStore('documents');
      const request = store.get(documentId);
      request.onsuccess = () => {
        const doc = request.result;
        if (!doc?.bookPack) {
          reject(new Error('The prepared source PDF is missing.'));
          tx.abort();
          return;
        }
        try {
          const sha = doc.bookPack.sourceSha256, count = doc.bookPack.pageCount;
          const records = operation.type === 'upsert'
            ? upsertCompiledRecord(doc.compiledRecords, operation.record, sha, count)
            : removeCompiledRecord(doc.compiledRecords, operation.id, sha, count);
          store.put({ ...doc, compiledRecords: records });
          result = records;
        } catch (error) {
          reject(error);
          tx.abort();
        }
      };
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
      tx.objectStore('settings').put({ key: EPOCH_KEY, value: nextEpoch() });
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
        ships: normalizePrivateShips(doc.ships, doc.bookPack.sourceSha256),
        compiledRecords: normalizeCompiledRecords(doc.compiledRecords, doc.bookPack.sourceSha256, doc.bookPack.pageCount, { allowStale: true }) } : {}), base64: bytesToBase64(bytes) });
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
      ships: normalizePrivateShips(d.ships, d.bookPack.sourceSha256),
      compiledRecords: normalizeCompiledRecords(d.compiledRecords, d.bookPack.sourceSha256, d.bookPack.pageCount, { allowStale: true }) } : {}),
    blob: new Blob([base64ToBytes(d.base64)], { type: 'application/pdf' }) }));
  // Validate every private index against its restored PDF before replacing any local records.
  for (const doc of docs) {
    if (doc.bookPack) await verifyPreparedBook(doc.blob, doc.bookPack);
  }
  return withExclusiveMutation(async () => {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAMES, 'readwrite');
      const restoredEpoch = nextEpoch();
      for (const name of STORE_NAMES) {
        if (name !== 'documents' || shouldReplaceDocumentsInRestore(bundle)) tx.objectStore(name).clear();
      }
      tx.objectStore('settings').put({ key: EPOCH_KEY, value: restoredEpoch });
      for (const c of bundle.campaigns) {
        tx.objectStore('campaigns').put({ ...c, storageEpoch: restoredEpoch });
      }
      if (shouldReplaceDocumentsInRestore(bundle)) {
        for (const d of docs) tx.objectStore('documents').put(d);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Restore failed.'));
      tx.onabort = () => reject(tx.error ?? new Error('Restore failed.'));
    });
  });
}