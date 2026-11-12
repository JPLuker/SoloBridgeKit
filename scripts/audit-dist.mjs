// Check distributed output, not only the source checkout.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..', 'dist');
const allowed = new Set([
  'index.html', 'styles.css', 'app.mjs', 'storage.mjs', 'model.mjs',
  'lifepath.mjs', 'missions.mjs', 'resources.mjs', 'shipbuilder.mjs',
  'bookmarks.mjs', 'rollhistory.mjs', 'content-policy.mjs',
  'book-data.mjs', 'browser-compiler.mjs', 'manifest.webmanifest', 'sw.js'
]);
const errors = [];
function walk(folder) {
  for (const name of readdirSync(folder)) {
    const full = join(folder, name), rel = relative(root, full).replaceAll('\\', '/');
    const info = statSync(full);
    if (info.isDirectory()) { walk(full); continue; }
    if (!info.isFile()) continue;
    if (/\.(?:pdf|epub|zip|solobridge-book\.json)$/i.test(rel))
      errors.push('Book/source archive present: ' + rel);
    if (!rel.startsWith('vendor/') && !allowed.has(rel))
      errors.push('Unexpected distributed file: ' + rel);
    const data = readFileSync(full);
    if (data.subarray(0, 5).toString('ascii') === '%PDF-')
      errors.push('PDF bytes in ' + rel);
  }
}
walk(root);
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
if (!sw.includes('asset-manifest.json')) errors.push('Offline asset manifest is not referenced.');
const manifest = JSON.parse(readFileSync(join(root, 'vendor/asset-manifest.json'), 'utf8'));
for (const required of ['vendor/pdf.mjs', 'vendor/pdf.worker.mjs', 'vendor/PDFJS-LICENSE.txt'])
  if (!manifest.includes(required)) errors.push('Missing bundled PDF.js asset: ' + required);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Distribution audit passed; manual book-content review remains required.');
