// The player's local book is not a bundled asset or proof of ownership.
export const DOCUMENT_ROLES = Object.freeze(['corebook', 'supplement', 'forms', 'reference']);
const RULEBOOK_PAGES = new Set(['character', 'lifepath', 'starship', 'shipbuilder', 'crew', 'log', 'dice']);

export function normalizeDocumentRole(role) {
  if (role == null || role === '') return 'reference';
  if (!DOCUMENT_ROLES.includes(role)) throw new Error('Unknown document type.');
  return role;
}
export function hasCorebook(documents) {
  return Array.isArray(documents) && documents.some(doc =>
    doc && normalizeDocumentRole(doc.role) === 'corebook' &&
    doc.blob && typeof doc.blob.size === 'number' && doc.blob.size >= 5
  );
}
export function requiresCorebook(page) { return RULEBOOK_PAGES.has(page); }
export function shouldIncludeDocuments(options = {}) { return options?.includeDocuments === true; }
