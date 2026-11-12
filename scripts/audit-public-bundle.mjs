// Structural safety gate: a human must still review source and release artifacts.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const blockedExtensions = /\.(?:pdf|epub|mobi|azw|azw3|cbz|cbr|zip|rar|7z|docx|odt)$/i;
const forbiddenFolders = new Set(['private', 'licensed-books', 'rulebook-pdfs', 'book-pdfs']);
const ignored = new Set(['.git', 'node_modules', '.cache', 'coverage', '.DS_Store']);
const errors = [];
function scan(folder) {
  for (const name of readdirSync(folder)) {
    if (ignored.has(name)) continue;
    const path = join(folder, name);
    const rel = relative(root, path).split(sep).join('/');
    const info = statSync(path);
    if (info.isDirectory()) {
      if (forbiddenFolders.has(name.toLowerCase())) {
        errors.push(rel + ': private book-material folder');
      } else scan(path);
      continue;
    }
    if (!info.isFile()) continue;
    if (blockedExtensions.test(name)) errors.push(rel + ': licensed document/archive in public source');
    if (/\.solobridge-book\.json$/i.test(name)) errors.push(rel + ': privately prepared book data in public source');
    if (/\.(?:txt|md|json|html|js|mjs|css)$/i.test(name) && info.size > 250000)
      errors.push(rel + ': unusually large text file; requires manual review');
    const bytes = readFileSync(path);
    if (bytes.subarray(0, 5).toString('ascii') === '%PDF-')
      errors.push(rel + ': PDF bytes in public source');
  }
}
scan(root);
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
if (/['"][^'"]*\.(?:pdf|epub|zip)['"]/i.test(sw))
  errors.push('sw.js: book/archive reference in offline shell');
if (errors.length) {
  console.error('Public source content audit failed:\n' + errors.map(x => ' - ' + x).join('\n'));
  process.exitCode = 1;
} else console.log('Public source audit passed (manual copyright review still required).');
