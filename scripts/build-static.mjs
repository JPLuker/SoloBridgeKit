// Create a self-contained offline site using the open-source PDF.js parser.
// Never add user-supplied books or prepared book data to this output.
import { cpSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const pdfjs = join(root, 'node_modules', 'pdfjs-dist');
if (!existsSync(join(pdfjs, 'build', 'pdf.min.mjs')))
  throw new Error('Missing PDF.js. Install npm dependencies before building.');
const output = join(root, 'dist');
rmSync(output, { recursive: true, force: true });
mkdirSync(join(output, 'vendor'), { recursive: true });
const application = [
  'index.html', 'styles.css', 'app.mjs', 'storage.mjs', 'model.mjs',
  'lifepath.mjs', 'missions.mjs', 'resources.mjs', 'shipbuilder.mjs',
  'bookmarks.mjs', 'rollhistory.mjs', 'content-policy.mjs',
  'book-data.mjs', 'browser-compiler.mjs', 'private-tables.mjs', 'private-options.mjs', 'private-ships.mjs', 'compiler-data.mjs', 'mission-actions.mjs', 'campaign-export.mjs', 'import-safety.mjs', 'recovery.mjs', 'manifest.webmanifest', 'sw.js'
];
for (const name of application) copyFileSync(join(root, name), join(output, name));
copyFileSync(join(pdfjs, 'build', 'pdf.min.mjs'), join(output, 'vendor', 'pdf.mjs'));
copyFileSync(join(pdfjs, 'build', 'pdf.worker.min.mjs'), join(output, 'vendor', 'pdf.worker.mjs'));
copyFileSync(join(pdfjs, 'LICENSE'), join(output, 'vendor', 'PDFJS-LICENSE.txt'));
cpSync(join(pdfjs, 'cmaps'), join(output, 'vendor', 'cmaps'), { recursive: true });
cpSync(join(pdfjs, 'standard_fonts'), join(output, 'vendor', 'standard_fonts'), { recursive: true });
const assets = [];
function collect(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, item.name);
    if (item.isDirectory()) collect(file);
    else if (item.isFile()) assets.push(relative(output, file).replaceAll('\\', '/'));
  }
}
collect(join(output, 'vendor'));
writeFileSync(join(output, 'vendor', 'asset-manifest.json'), JSON.stringify(assets.sort()), { flag: 'wx' });
console.log(`Built SoloBridgeKit with ${assets.length} locally served PDF.js files and no game books.`);
