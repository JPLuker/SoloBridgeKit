// CI browser smoke: uses synthetic, not copyrighted, PDF book content.
// GitHub's Ubuntu runner has Google Chrome installed at /usr/bin/google-chrome.
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { syntheticPdf } from './synthetic-book.mjs';

const origin = 'http://127.0.0.1:4173';
const output = 'test-output';
mkdirSync(output, { recursive: true });
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
try {
  await sleep(500);
  browser = await puppeteer.launch({
    executablePath: chrome, headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  page = await browser.newPage();
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
  await page.type('input[name=query]', 'starship');
  await clickText('Search');
  await page.waitForFunction(() =>
    document.querySelector('#content')?.textContent?.includes('PDF page 1'), { timeout: 10000 });
  await navigate('Home');
  await heading('Home');
  await page.type('input[placeholder="New campaign name"]', 'Synthetic test campaign');
  await clickText('Create campaign');
  await page.waitForFunction(() => document.querySelector('#content')?.textContent?.includes('Synthetic test campaign'));
  await navigate('Character');
  await heading('Character');
  await page.type('input[name=name]', 'Synthetic Officer');
  await page.type('input[name=attribute_control]', '10');
  await page.type('input[name=discipline_command]', '3');
  await clickText('Save character');
  await navigate("Captain's log");
  await heading("Captain's log");
  await page.type('input[placeholder="New mission title"]', 'Synthetic test mission');
  await clickText('Start mission');
  await page.waitForFunction(() => document.querySelector('#content')?.textContent?.includes('Scene actions'), { timeout: 10000 });
  await clickText('Roll task');
  await page.waitForFunction(() => document.querySelector('#content')?.textContent?.includes('2d20:'), { timeout: 20000 });
  await page.screenshot({ path: join(output, 'phone-mission.png'), fullPage: true });
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.screenshot({ path: join(output, 'desktop-mission.png'), fullPage: true });
  const geometry = await page.evaluate(() => ({
    viewport: window.innerWidth, document: document.documentElement.scrollWidth
  }));
  check(geometry.document <= geometry.viewport + 4,
    `Desktop layout overflow: ${JSON.stringify(geometry)}`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#content')?.textContent?.includes('Synthetic test campaign'), { timeout: 15000 });
  check(errors.length === 0, 'Browser runtime errors: ' + errors.join(' | '));
  console.log('Browser smoke passed: import, prepared search, campaign, character, mission, task roll, offline reload.');
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
  server.kill();
}
