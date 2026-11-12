// Local-only PDF preparation. No game-book text exists in the distributed module.
// pdfjs-dist is copied into the offline app at build time.
import { BOOK_FORMAT, BOOK_FORMAT_VERSION, validateBookPack, pdfSha256 } from './book-data.mjs';

export async function preparePdfInBrowser(blob, { onProgress = () => {}, signal } = {}) {
  if (!blob || typeof blob.arrayBuffer !== 'function') throw new Error('Select a PDF.');
  if (signal?.aborted) throw new Error('Preparation cancelled.');
  if (blob.size > 300 * 1024 * 1024) throw new Error('PDF exceeds 300 MB. Import a smaller edition.');
  let pdfjs;
  try {
    pdfjs = await import('./vendor/pdf.mjs');
  } catch (cause) {
    throw new Error('The offline PDF parser is missing. Reinstall the complete SoloBridgeKit build.', { cause });
  }
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.mjs', import.meta.url).href;
  const data = new Uint8Array(await blob.arrayBuffer());
  if (new TextDecoder().decode(data.subarray(0, 5)) !== '%PDF-')
    throw new Error('The selected file is not a PDF.');
  const fingerprint = await pdfSha256(blob);
  let task;
  let document;
  try {
    task = pdfjs.getDocument({
      data,
      cMapUrl: new URL('./vendor/cmaps/', import.meta.url).href,
      cMapPacked: true,
      standardFontDataUrl: new URL('./vendor/standard_fonts/', import.meta.url).href,
      useSystemFonts: true
    });
    document = await task.promise;
    if (document.numPages > 2000) throw new Error('This PDF is larger than supported.');
    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      if (signal?.aborted) throw new Error('Preparation cancelled.');
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent({ disableNormalization: false });
      const text = textContent.items.map(item =>
        ('str' in item ? String(item.str) : '') + (item.hasEOL ? '\n' : ' ')
      ).join('').trim();
      pages.push({ page: pageNumber, text });
      page.cleanup();
      onProgress({ page: pageNumber, total: document.numPages });
      if (pageNumber % 8 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    return validateBookPack({
      format: BOOK_FORMAT,
      version: BOOK_FORMAT_VERSION,
      sourceSha256: fingerprint,
      pageCount: pages.length,
      pages
    });
  } finally {
    if (document) await document.destroy().catch(() => {});
    else if (task) await task.destroy().catch(() => {});
  }
}
