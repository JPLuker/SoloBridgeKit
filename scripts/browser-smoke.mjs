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
  writeFileSync(pdfPath, syntheticPdf());
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
  await navigate('Home');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#content')?.textContent?.includes('Synthetic test campaign'), { timeout: 15000 });
  check(errors.length === 0, 'Browser runtime errors: ' + errors.join(' | '));
  console.log('Browser smoke passed: import, prepared search, campaign, character, mission, task roll, Markdown downloads, data-only backup and offline reload.');
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
  server.kill();
}
