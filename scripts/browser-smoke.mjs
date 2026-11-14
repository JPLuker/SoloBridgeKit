// CI browser smoke: uses synthetic, not copyrighted, PDF book content.
// GitHub's Ubuntu runner has Google Chrome installed at /usr/bin/google-chrome.
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { syntheticPdf } from './synthetic-book.mjs';

const origin = 'http://127.0.0.1:4173';
const output = 'test-output';
const downloads = join(process.cwd(), output, 'downloads');
mkdirSync(output, { recursive: true });
mkdirSync(downloads, { recursive: true });
const chrome = process.env.CHROME_BIN || '/usr/bin/google-chrome';
if (!existsSync(chrome)) throw new Error('Chrome is required for browser smoke tests: ' + chrome);
const server = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1', '--directory', 'dist'], { stdio: 'ignore' });
let browser;
let page;
const errors = [];
const check = (condition, message) => { if (!condition) throw new Error(message); };
async function navigate(label) {
  await page.evaluate(text => {
    const button = [...document.querySelectorAll('#mobile-nav button, #desktop-nav button')]
      .find(node => node.textContent.trim() === text);
    if (!button) throw new Error('Missing navigation: ' + text);
    button.click();
  }, label);
}
async function clickText(text) {
  await page.evaluate(label => {
    const button = [...document.querySelectorAll('#content button')].find(node => node.textContent.trim() === label);
    if (!button) throw new Error('Missing action: ' + label);
    button.click();
  }, text);
}
async function heading(text) {
  await page.waitForFunction(label => document.querySelector('#content h1')?.textContent.trim() === label, {}, text);
}
async function waitForSave(message) {
  await page.waitForFunction(label => document.querySelector('#toast')?.textContent?.includes(label), { timeout: 20000 }, message);
}
async function waitForDownload(filename, limit = 12000) {
  const start = Date.now();
  while (Date.now() - start < limit) {
    const matches = readdirSync(downloads).filter(name => name === filename && !name.endsWith('.crdownload'));
    if (matches.length) return readFileSync(join(downloads, filename), 'utf8');
    await sleep(100);
  }
  throw new Error('Expected browser download was not received: ' + filename);
}
try {
  await sleep(500);
  browser = await puppeteer.launch({
    executablePath: chrome, headless: true, pipe: true,
    timeout: 90000, dumpio: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
      '--no-first-run', '--no-default-browser-check', '--disable-background-networking']
  });
  page = await browser.newPage();
  const devtools = await page.createCDPSession();
  await devtools.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(origin, { waitUntil: 'networkidle0', timeout: 30000 });
  check((await page.$eval('#content', node => node.textContent)).includes('Prepare your corebook'),
    'The empty-profile setup gate did not appear.');
  await navigate('Library');
  await heading('Library');
  await page.select('select[aria-label="Document type"]', 'corebook');
  const input = await page.$('input[aria-label="Choose PDF files"]');
  check(input, 'PDF picker missing.');
  const pdfPath = join(process.cwd(), output, 'temporary-synthetic.pdf');
  writeFileSync(pdfPath, syntheticPdf(336));
  await input.uploadFile(pdfPath);
  await page.waitForFunction(() =>
    document.querySelector('#content')?.textContent?.includes('Prepared corebook'), { timeout: 180000 });
  await page.screenshot({ path: join(output, 'phone-library.png'), fullPage: true });
  // A malformed second file must abort the WHOLE batch, preserving the prepared corebook.
  const libraryCount = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('solobridgekit');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return await new Promise((resolve, reject) => {
      const req = db.transaction('documents').objectStore('documents').count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
  const badPath = join(process.cwd(), output, 'invalid-synthetic.pdf');
  writeFileSync(badPath, 'not a PDF');
  await page.select('select[aria-label="Document type"]', 'reference');
  const multiplePicker = await page.$('input[aria-label="Choose PDF files"]');
  await multiplePicker.uploadFile(pdfPath, badPath);
  await waitForSave('not a valid PDF');
  const afterBad = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('solobridgekit');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return await new Promise((resolve, reject) => {
      const req = db.transaction('documents').objectStore('documents').getAll();
      req.onsuccess = () => resolve(req.result.map(doc => ({ role: doc.role, prepared: Boolean(doc.bookPack) })));
      req.onerror = () => reject(req.error);
    });
  });
  check(afterBad.length === libraryCount && afterBad.some(doc => doc.role === 'corebook' && doc.prepared),
    'Failed import changed previously prepared documents or partially committed a batch.');
  rmSync(badPath, { force: true });

  await page.type('input[name=query]', 'starship');
  await clickText('Search');
  await page.waitForFunction(() =>
    document.querySelector('#content')?.textContent?.includes('PDF page 1'), { timeout: 10000 });
  await navigate('Home');
  await heading('Home');
  await page.type('input[placeholder="New campaign name"]', 'Synthetic test campaign');
  await clickText('Create campaign');
  await waitForSave('Campaign created.');
  await page.waitForFunction(() => document.querySelector('#content')?.textContent?.includes('Synthetic test campaign'));
  await navigate('Character');
  await heading('Character');
  await page.type('input[name=name]', 'Synthetic Officer');
  await page.type('input[name=attribute_control]', '10');
  await page.type('input[name=discipline_command]', '3');
  await clickText('Save character');
  await waitForSave('Character saved.');
  await navigate("Captain's log");
  await heading("Captain's log");
  await page.type('input[placeholder="New mission title"]', 'Synthetic test mission');
  check(await page.$eval('input[placeholder="New mission title"]', x => x.value) === 'Synthetic test mission', 'Mission input was unexpectedly cleared.');
  await clickText('Start mission');
  await waitForSave('Mission started.');
  await page.waitForFunction(() => document.querySelector('#content')?.textContent?.includes('Scene actions'), { timeout: 10000 });
  await clickText('Roll task');
  await page.waitForFunction(() => document.querySelector('#content')?.textContent?.includes('2d20:'), { timeout: 20000 });
  await page.screenshot({ path: join(output, 'phone-mission.png'), fullPage: true });
  const phoneGeometry = await page.evaluate(() => ({
    viewport: window.innerWidth, document: document.documentElement.scrollWidth
  }));
  check(phoneGeometry.document <= phoneGeometry.viewport + 4,
    `Phone layout overflow: ${JSON.stringify(phoneGeometry)}`);
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.screenshot({ path: join(output, 'desktop-mission.png'), fullPage: true });
  const geometry = await page.evaluate(() => ({
    viewport: window.innerWidth, document: document.documentElement.scrollWidth
  }));
  check(geometry.document <= geometry.viewport + 4,
    `Desktop layout overflow: ${JSON.stringify(geometry)}`);
  await clickText('Export episode');
  const episodeMarkdown = await waitForDownload('synthetic-test-mission-episode.md');
  check(episodeMarkdown.includes('Synthetic test mission') && episodeMarkdown.includes('Task rolls') && episodeMarkdown.includes('control + command'),
    'Episode export omitted player-created mission or dice data.');
  check(!episodeMarkdown.includes('Synthetic sample page lifepath mission'),
    'Episode export leaked private indexed book content.');
  await navigate('Home');
  await heading('Home');
  await clickText('Export journal');
  const campaignMarkdown = await waitForDownload('synthetic-test-campaign-journal.md');
  check(campaignMarkdown.includes('Synthetic Officer') && campaignMarkdown.includes('Synthetic test mission'),
    'Campaign journal omitted saved character or mission content.');
  check(!campaignMarkdown.includes('Synthetic sample page lifepath mission'),
    'Campaign journal leaked private indexed book content.');
  await navigate('Settings');
  await heading('Settings');
  await clickText('Export backup');
  const backupName = 'solobridgekit-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  const backup = JSON.parse(await waitForDownload(backupName));
  check(backup.includesDocuments === false && backup.documents.length === 0,
    'Default campaign backup must exclude imported books and private compiled data.');
  check(backup.campaigns.some(c => c.title === 'Synthetic test campaign'),
    'Backup did not contain the campaign.');
  // Verify a mid-batch IndexedDB add error rolls back the entire transaction.
  const rollback = await page.evaluate(async () => {
    const storage = await import('./storage.mjs');
    const before = await storage.all('documents');
    const attempted = {
      id: crypto.randomUUID(), name: 'should-not-exist.pdf',
      blob: new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
      size: 8, role: 'reference', bookmarks: [], importedAt: new Date().toISOString()
    };
    let failed = false;
    try {
      await storage.addDocumentsAtomically([attempted, { ...attempted, id: before[0].id }]);
    } catch { failed = true; }
    const after = await storage.all('documents');
    return { failed, before: before.length, after: after.length,
      leaked: after.some(d => d.id === attempted.id) };
  });
  check(rollback.failed && rollback.before === rollback.after && !rollback.leaked,
    'IndexedDB did not roll back the attempted mixed-validity transaction.');

  // A full private backup contains the locally imported book; standard backups never do.
  rmSync(join(downloads, backupName), { force: true });
  await page.$eval('input[aria-label="Include imported PDFs in private backup"]', el => el.click());
  await clickText('Export backup');
  const privateBundle = JSON.parse(await waitForDownload(backupName, 30000));
  check(privateBundle.includesDocuments === true && privateBundle.documents.length === libraryCount,
    'Private backup omitted its explicit PDF-inclusive setting.');
  check(privateBundle.documents.some(d => d.role === 'corebook' && d.bookPack?.pages?.length === 336),
    'Private backup lost its compiled source book.');
  const privatePath = join(process.cwd(), output, 'synthetic-private-backup.json');
  const corruptPath = join(process.cwd(), output, 'synthetic-corrupt-backup.json');
  const campaignPath = join(process.cwd(), output, 'synthetic-campaign-backup.json');
  writeFileSync(privatePath, JSON.stringify(privateBundle));
  writeFileSync(campaignPath, JSON.stringify(backup));
  const corrupt = structuredClone(privateBundle);
  const corebookRecord = corrupt.documents.find(d => d.bookPack);
  corebookRecord.bookPack.sourceSha256 = 'f'.repeat(64);
  writeFileSync(corruptPath, JSON.stringify(corrupt));

  // A data-only restore must leave already imported private PDFs untouched.
  page.once('dialog', dialog => dialog.accept());
  await (await page.$('input[aria-label="Restore from backup"]')).uploadFile(campaignPath);
  await waitForSave('Backup restored.');
  const countAfterDataRestore = await page.evaluate(async () => {
    const { all } = await import('./storage.mjs');
    return (await all('documents')).length;
  });
  check(countAfterDataRestore === libraryCount,
    'Restoring a campaign-only backup unexpectedly deleted private PDFs.');

  // Corrupt PDF/index pair must fail before touching campaigns or documents.
  page.once('dialog', dialog => dialog.accept());
  await (await page.$('input[aria-label="Restore from backup"]')).uploadFile(corruptPath);
  await waitForSave('different PDF');
  const afterCorrupt = await page.evaluate(async () => {
    const { all } = await import('./storage.mjs');
    const documents = await all('documents');
    const campaigns = await all('campaigns');
    return { docs: documents.length, campaigns: campaigns.length,
      corebookPrepared: documents.some(d => d.role === 'corebook' && d.bookPack?.pages?.length === 336) };
  });
  check(afterCorrupt.docs === libraryCount && afterCorrupt.corebookPrepared && afterCorrupt.campaigns === backup.campaigns.length,
    'A corrupt private-backup restore changed existing local data.');

  // Valid private PDF-inclusive restore must reconstruct the book/index and campaign.
  page.once('dialog', dialog => dialog.accept());
  await (await page.$('input[aria-label="Restore from backup"]')).uploadFile(privatePath);
  await waitForSave('Backup restored.');
  const restored = await page.evaluate(async () => {
    const { all } = await import('./storage.mjs');
    const docs = await all('documents'), campaigns = await all('campaigns');
    return { docs: docs.length, campaigns: campaigns.map(c => c.title),
      pages: docs.find(d => d.role === 'corebook')?.bookPack?.pages?.length };
  });
  check(restored.docs === libraryCount && restored.pages === 336 &&
    restored.campaigns.includes('Synthetic test campaign'),
    'A valid private backup failed to restore its campaign and book index.');
  // Exact-file reattachment preserves source-derived data and refuses a different PDF.
  await navigate('Library');
  await heading('Library');
  const sameFileInput = await page.$('input[aria-label="Reattach PDF file"]');
  check(sameFileInput, 'The PDF reattachment control was missing.');
  await sameFileInput.uploadFile(pdfPath);
  await waitForSave('Matching PDF reattached.');
  const differentPdfPath = join(process.cwd(), output, 'different-edition.pdf');
  writeFileSync(differentPdfPath, '%PDF-1.4\nThis is deliberately not the original synthetic book.');
  await (await page.$('input[aria-label="Reattach PDF file"]')).uploadFile(differentPdfPath);
  await waitForSave('does not match the original book');
  const afterRelink = await page.evaluate(async () => {
    const { all } = await import('./storage.mjs');
    const docs = await all('documents');
    return { count: docs.length, pages: docs.find(d => d.role === 'corebook')?.bookPack?.pages?.length };
  });
  check(afterRelink.count === libraryCount && afterRelink.pages === 336,
    'A different edition replaced the original local book or invalidated the index.');
  rmSync(differentPdfPath, { force: true });


  // Abort after a known number of pages; no incomplete index may be committed.
  const cancelled = await page.evaluate(async () => {
    const { preparePdfInBrowser } = await import('./browser-compiler.mjs');
    const { all } = await import('./storage.mjs');
    const previous = await all('documents');
    const source = previous.find(d => d.role === 'corebook');
    const controller = new AbortController();
    let reached = 0, wasCancelled = false;
    try {
      await preparePdfInBrowser(source.blob, {
        signal: controller.signal,
        onProgress: ({ page }) => { reached = page; if (page === 16) controller.abort(); }
      });
    } catch (error) { wasCancelled = String(error.message).includes('cancelled'); }
    const after = await all('documents');
    return { reached, wasCancelled, countBefore: previous.length, countAfter: after.length,
      preserved: after.some(d => d.id === source.id && d.bookPack?.pages?.length === 336) };
  });
  check(cancelled.wasCancelled && cancelled.reached === 16 &&
      cancelled.countBefore === cancelled.countAfter && cancelled.preserved,
    'Interrupted 336-page preparation damaged a saved source or was not cancelled.');
  const retryPageCount = await page.evaluate(async () => {
    const { preparePdfInBrowser } = await import('./browser-compiler.mjs');
    const { all } = await import('./storage.mjs');
    return (await preparePdfInBrowser((await all('documents')).find(d => d.role === 'corebook').blob)).pageCount;
  });
  check(retryPageCount === 336, 'Retry after cancelled preparation failed.');
  // Simulate two tabs holding different revisions. A stale writer must never overwrite newer data.
  const conflict = await page.evaluate(async () => {
    const { all, saveCampaign, database } = await import('./storage.mjs');
    const original = (await all('campaigns'))[0];
    const first = structuredClone(original), stale = structuredClone(original);
    first.character.notes = 'Latest authenticated save';
    await saveCampaign(first);
    stale.character.notes = 'Stale overwrite attempt';
    let refused = false;
    try { await saveCampaign(stale); }
    catch (error) { refused = error.message.includes('another tab'); }
    const current = (await all('campaigns'))[0];
    const originalRevision = current.revision;
    current.character.notes = 'first in-tab edit';
    const p1 = saveCampaign(current);
    current.character.notes = 'second in-tab edit';
    const p2 = saveCampaign(current);
    await Promise.all([p1, p2]);
    const after = (await all('campaigns'))[0];
    // Simulate a future database schema upgrade closing this tab's old connection.
    const db = await database();
    db.onversionchange(new Event('versionchange'));
    const reopened = await database();
    const newDbWorked = (await all('campaigns')).length > 0;
    return { refused, saved: after.character.notes,
      revisionRaised: after.revision === originalRevision + 2,
      newerWasProtected: current.character.notes !== 'Stale overwrite attempt',
      newDbWorked, open: reopened.objectStoreNames.contains('campaigns') };
  });
  check(conflict.refused && conflict.revisionRaised && conflict.newerWasProtected &&
      conflict.saved === 'second in-tab edit' && conflict.newDbWorked && conflict.open,
    'Revisioned campaign saves permitted stale overwrites or failed concurrent-save recovery.');
  // Restore must drain already queued saves and refuse fresh writes until it is complete.
  const restoreRace = await page.evaluate(async bundle => {
    const { all, saveCampaign, restoreBackup } = await import('./storage.mjs');
    const draft = structuredClone((await all('campaigns'))[0]);
    draft.title = 'a pending write that must not win after restore';
    const queuedSave = saveCampaign(draft);
    const restoring = restoreBackup(bundle);
    let blocked = false;
    try { await saveCampaign(draft); }
    catch (error) { blocked = error.message.includes('restore or reset'); }
    await Promise.all([queuedSave, restoring]);
    const after = (await all('campaigns'))[0];
    return { blocked, title: after.title };
  }, backup);
  check(restoreRace.blocked && restoreRace.title === 'Synthetic test campaign',
    'An overlapping save overwrote restored campaign data.');
  // An import or source reattachment prepared before a reset/restore cannot commit afterward.
  const previousGeneration = await page.evaluate(async () =>
    (await import('./storage.mjs')).currentDataGeneration());
  await page.evaluate(async bundle => {
    const { restoreBackup } = await import('./storage.mjs');
    await restoreBackup(bundle);
  }, backup);
  const staleImport = await page.evaluate(async expectedGeneration => {
    const { all, addDocumentsAtomically, patchDocumentIfCurrent } = await import('./storage.mjs');
    const before = await all('documents');
    const fake = { id: crypto.randomUUID(), name: 'stale.pdf', role: 'reference',
      blob: new Blob(['%PDF-1.7'], { type: 'application/pdf' }), size: 8,
      importedAt: new Date().toISOString(), bookmarks: [] };
    let importRejected = false, patchRejected = false;
    try { await addDocumentsAtomically([fake], expectedGeneration); }
    catch (error) { importRejected = error.message.includes('database changed'); }
    try { await patchDocumentIfCurrent(before[0].id, { name: 'should-not-replace.pdf' }, expectedGeneration); }
    catch (error) { patchRejected = error.message.includes('library changed'); }
    const after = await all('documents');
    return { importRejected, patchRejected, unchanged:
      after.length === before.length && after[0].name === before[0].name };
  }, previousGeneration);
  check(staleImport.importRejected && staleImport.patchRejected && staleImport.unchanged,
    'An obsolete import or reattachment wrote data after a restore.');




  await navigate('Home');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle0' });
  // Re-register the app shell with an obsolete cache present, simulating upgrade cleanup.
  await page.evaluate(async () => {
    const stale = await caches.open('solobridgekit-shell-legacy-test');
    await stale.put('./obsolete', new Response('obsolete'));
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(async () => !(await caches.keys()).includes('solobridgekit-shell-legacy-test'),
    { timeout: 15000 });
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#content')?.textContent?.includes('Synthetic test campaign'), { timeout: 15000 });
  const offlinePageCount = await page.evaluate(async () => {
    const { preparePdfInBrowser } = await import('./browser-compiler.mjs');
    const { all } = await import('./storage.mjs');
    const source = (await all('documents')).find(d => d.role === 'corebook');
    return (await preparePdfInBrowser(source.blob)).pageCount;
  });
  check(offlinePageCount === 336, 'The offline parser could not prepare a new 336-page index.');
  check(errors.length === 0, 'Browser runtime errors: ' + errors.join(' | '));
  console.log('Browser smoke passed: 336-page source, cancelled retry, atomic import/restore, source reattachment, stale-cache upgrade, offline preparation, journals and backups.');
} catch (error) {
  console.error('Browser smoke failed:', error);
  if (page) {
    await page.screenshot({ path: join(output, 'failure.png'), fullPage: true }).catch(() => {});
    writeFileSync(join(output, 'browser-errors.txt'), errors.join('\n') + '\n' + String(error));
  }
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  rmSync(join(output, 'temporary-synthetic.pdf'), { force: true });
  rmSync(join(output, 'invalid-synthetic.pdf'), { force: true });
  rmSync(join(output, 'different-edition.pdf'), { force: true });
  for (const name of ['synthetic-private-backup.json', 'synthetic-corrupt-backup.json', 'synthetic-campaign-backup.json'])
    rmSync(join(output, name), { force: true });
  server.kill();
}
