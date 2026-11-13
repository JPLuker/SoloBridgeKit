// Import safety helpers. No commercial PDF data is bundled with the application.
import { normalizeDocumentRole } from './content-policy.mjs';
import { validateBookPack } from './book-data.mjs';

export function storageMessage(error) {
  const name = error?.name || error?.cause?.name || '';
  if (name === 'QuotaExceededError')
    return 'This device is out of site storage. Export a backup, free storage, and retry. Your previous books and campaigns were not replaced.';
  if (name === 'SecurityError' || name === 'NotAllowedError' || name === 'InvalidStateError')
    return 'Local storage is unavailable. Allow site storage or leave private browsing, then retry.';
  if (name === 'AbortError') return 'Import cancelled. No files from this attempt were saved.';
  return error?.message || 'The import failed. Your previous local data was preserved.';
}

export function assertNotCancelled(signal) {
  if (signal?.aborted) {
    const error = new Error('Import cancelled. No files from this attempt were saved.');
    error.name = 'AbortError';
    throw error;
  }
}

export async function checkStorageCapacity(files, { storage = globalThis.navigator?.storage, extraBytes = 0 } = {}) {
  const bytes = [...files].reduce((sum, file) => sum + file.size, 0) + extraBytes;
  if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error('Invalid import size.');
  // Storage estimates are approximate; unavailable estimates should not block a valid import.
  if (typeof storage?.estimate !== 'function') return { estimated: false, bytes };
  let estimate;
  try { estimate = await storage.estimate(); } catch { return { estimated: false, bytes }; }
  if (!Number.isFinite(estimate?.quota) || !Number.isFinite(estimate?.usage)) return { estimated: false, bytes };
  const available = Math.max(0, estimate.quota - estimate.usage);
  // Allow room for both the PDF and its extracted index/IndexedDB transaction overhead.
  const required = Math.ceil(bytes * 1.5);
  if (available < required) {
    const error = new Error(`Not enough browser storage for this import (about ${Math.ceil(required / 1048576)} MB needed, ${Math.floor(available / 1048576)} MB estimated free). Free storage or import a smaller PDF; existing books were not changed.`);
    error.name = 'QuotaExceededError';
    throw error;
  }
  return { estimated: true, bytes, available };
}

export async function prepareImportBatch(files, {
  role = 'reference', signal, preparePdf, makeId, onProgress = () => {},
  checkCapacity = checkStorageCapacity
} = {}) {
  const selected = [...files];
  const documentRole = normalizeDocumentRole(role);
  if (!selected.length) throw new Error('Choose at least one PDF.');
  if (documentRole === 'corebook' && selected.length !== 1)
    throw new Error('Select one core rulebook at a time.');
  // Prevalidate the WHOLE batch before extracting/committing any data.
  for (const file of selected) {
    if (!file || typeof file.name !== 'string' || typeof file.slice !== 'function' ||
        typeof file.size !== 'number' || file.size < 5 ||
        !(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      throw new Error('Select valid PDF files only.');
    }
    const header = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
    if (header !== '%PDF-') throw new Error(`${file.name} is not a valid PDF.`);
    assertNotCancelled(signal);
  }
  await checkCapacity(selected);
  assertNotCancelled(signal);
  const records = [];
  for (const file of selected) {
    assertNotCancelled(signal);
    let bookPack;
    if (documentRole === 'corebook') {
      if (typeof preparePdf !== 'function') throw new Error('The corebook parser is unavailable.');
      bookPack = validateBookPack(await preparePdf(file, {
        signal,
        onProgress: progress => onProgress({ file: file.name, ...progress })
      }));
      assertNotCancelled(signal);
    }
    records.push({
      id: makeId(), name: file.name, size: file.size, importedAt: new Date().toISOString(),
      blob: file, role: documentRole, bookmarks: [], ...(bookPack ? { bookPack } : {})
    });
  }
  assertNotCancelled(signal);
  return records; // Caller commits ALL records in one transaction.
}
