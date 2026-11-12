import { DATA_VERSION, validateBundle } from './model.mjs';
import { normalizeBookmarks } from './bookmarks.mjs';

const DB_NAME = 'solobridgekit';
const STORE_NAMES = ['campaigns', 'documents', 'settings'];
let dbPromise;


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
      req.onsuccess = () => resolve(req.result);
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

export async function saveCampaign(campaign) {
  campaign.updatedAt = new Date().toISOString();
  await put('campaigns', campaign);
}

export async function resetData() {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAMES, 'readwrite');
    STORE_NAMES.forEach(name => tx.objectStore(name).clear());
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not erase data.'));
    tx.onabort = () => reject(tx.error ?? new Error('Could not erase data.'));
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

export async function createBackup() {
  const campaigns = await all('campaigns');
  const docs = await all('documents');
  const documents = [];
  for (const doc of docs) {
    const bytes = new Uint8Array(await doc.blob.arrayBuffer());
    documents.push({ id: doc.id, name: doc.name, size: doc.size, importedAt: doc.importedAt,
      bookmarks: normalizeBookmarks(doc.bookmarks), base64: bytesToBase64(bytes) });
  }
  return { format: 'solobridgekit', version: DATA_VERSION, createdAt: new Date().toISOString(),
    campaigns, documents };
}

export async function restoreBackup(raw) {
  const bundle = validateBundle(raw);
  const docs = bundle.documents.map(d => ({ id: d.id, name: d.name, size: d.size,
    importedAt: d.importedAt, bookmarks: normalizeBookmarks(d.bookmarks), blob: new Blob([base64ToBytes(d.base64)], { type: 'application/pdf' }) }));
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAMES, 'readwrite');
    for (const name of STORE_NAMES) tx.objectStore(name).clear();
    for (const c of bundle.campaigns) tx.objectStore('campaigns').put(c);
    for (const d of docs) tx.objectStore('documents').put(d);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Restore failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('Restore failed.'));
  });
}