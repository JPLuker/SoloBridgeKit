// Check distributed output, not only the source checkout.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..', 'dist');
const allowed = new Set([
  'index.html', 'styles.css', 'app.mjs', 'storage.mjs', 'model.mjs',
  'lifepath.mjs', 'missions.mjs', 'resources.mjs', 'shipbuilder.mjs',
  'bookmarks.mjs', 'rollhistory.mjs', 'content-policy.mjs',
  'book-data.mjs', 'library-books.mjs', 'source-readiness.mjs', 'guided-explanations.mjs', 'onboarding.mjs', 'browser-compiler.mjs', 'private-tables.mjs', 'private-options.mjs', 'private-ships.mjs', 'compiler-data.mjs', 'character-guidance.mjs', 'ship-guidance.mjs', 'crew-management.mjs', 'ship-development.mjs', 'mission-workspace.mjs', 'mission-threads.mjs', 'character-development.mjs', 'mission-actions.mjs', 'campaign-export.mjs', 'import-safety.mjs', 'recovery.mjs', 'manifest.webmanifest', 'sw.js'
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
const index = readFileSync(join(root, 'index.html'), 'utf8');
// The PWA must never load scripts, styles, icons or other assets from an
// unrelated origin. User-imported PDFs are deliberately local Blob URLs.
if(/<(?:script|link|iframe|img)\b[^>]*(?:src|href)\s*=\s*["']https?:[/][/]/i.test(index))
  errors.push('Remote runtime asset referenced by index.html.');
const applicationSources = [
  'app.mjs','model.mjs','storage.mjs','browser-compiler.mjs','book-data.mjs',
  'library-books.mjs','mission-workspace.mjs','mission-actions.mjs'
];
for(const file of applicationSources){
  const source=readFileSync(join(root,file),'utf8');
  if(/\bfetch\(\s*['"]https?:[/][/]/i.test(source) ||
    /\bimport\(\s*['"]https?:[/][/]/i.test(source))
    errors.push('Hardcoded external runtime request in '+file+'.');
}
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
if (!sw.includes('asset-manifest.json')) errors.push('Offline asset manifest is not referenced.');
const manifest = JSON.parse(readFileSync(join(root, 'vendor/asset-manifest.json'), 'utf8'));
for (const required of ['vendor/pdf.mjs', 'vendor/pdf.worker.mjs', 'vendor/PDFJS-LICENSE.txt'])
  if (!manifest.includes(required)) errors.push('Missing bundled PDF.js asset: ' + required);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Distribution audit passed; manual book-content review remains required.');
