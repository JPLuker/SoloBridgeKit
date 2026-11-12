// Player-authored references to privately imported books. No licensed text is stored here.
const MAX_PAGE = 99999;
const MAX_LABEL = 120;

export function normalizeBookmarks(bookmarks) {
  if (bookmarks == null) return [];
  if (!Array.isArray(bookmarks)) throw new Error('Book references could not be read.');
  const ids = new Set();
  return bookmarks.map(bookmark => {
    if (!bookmark || typeof bookmark.id !== 'string' || !bookmark.id ||
        typeof bookmark.label !== 'string' || !bookmark.label.trim() || bookmark.label.length > MAX_LABEL ||
        !Number.isSafeInteger(bookmark.page) || bookmark.page < 1 || bookmark.page > MAX_PAGE ||
        ids.has(bookmark.id)) {
      throw new Error('A saved book reference is damaged.');
    }
    ids.add(bookmark.id);
    return { id: bookmark.id, label: bookmark.label.trim(), page: bookmark.page,
      createdAt: typeof bookmark.createdAt === 'string' ? bookmark.createdAt : '' };
  });
}

export function createBookmark(label, page, id = globalThis.crypto?.randomUUID?.()) {
  const name = String(label ?? '').trim();
  const number = Number(page);
  if (!name || name.length > MAX_LABEL) throw new Error('Enter a bookmark name (up to 120 characters).');
  if (!Number.isSafeInteger(number) || number < 1 || number > MAX_PAGE) {
    throw new Error('Enter a valid PDF page number.');
  }
  if (typeof id !== 'string' || !id) throw new Error('Could not create bookmark ID.');
  return { id, label: name, page: number, createdAt: new Date().toISOString() };
}

export function addBookmark(bookmarks, bookmark) {
  const previous = normalizeBookmarks(bookmarks);
  const next = normalizeBookmarks([bookmark])[0];
  if (previous.some(x => x.id === next.id)) throw new Error('This bookmark already exists.');
  return [...previous, next];
}

export function removeBookmark(bookmarks, id) {
  const previous = normalizeBookmarks(bookmarks);
  if (!previous.some(x => x.id === id)) throw new Error('Bookmark not found.');
  return previous.filter(x => x.id !== id);
}