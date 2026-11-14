// CI browser smoke: uses synthetic, not copyrighted, PDF book content.
// GitHub's Ubuntu runner has Google Chrome installed at /usr/bin/google-chrome.
import puppeteer from 'puppeteer-core';
import { spawn, execFileSync } from 'node:child_process';
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
  check((await page.$eval('#content', node => node.textContent)).includes('First, add the game rulebook'),
    'The empty-profile setup gate did not appear.');
  await navigate('Library');
  await heading('Library');
  const onboarding = await page.evaluate(()=>({
    role:document.querySelector('select[aria-label="Document type"]')?.value,
    multiple:document.querySelector('input[aria-label="Choose PDF files"]')?.multiple,
    beginnerCopy:document.querySelector('#content')?.textContent?.includes('You do not need to understand the rules')
  }));
  check(onboarding.role==='corebook' && onboarding.multiple===false && onboarding.beginnerCopy,
    'A first-time player was not shown the one-book novice setup by default.');
  await page.select('select[aria-label="Document type"]', 'corebook');
  const input = await page.$('input[aria-label="Choose PDF files"]');
  check(input, 'PDF picker missing.');
  const pdfPath = join(process.cwd(), output, 'temporary-synthetic.pdf');
  writeFileSync(pdfPath, syntheticPdf(336));
  // Verify the actual shipped PDF.js compiler without a browser as a second
  // independent check. The utility prints a summary, never private book text.
  const cliReport = JSON.parse(execFileSync(process.execPath,
    ['scripts/verify-private-corebook.mjs', pdfPath, '--json'],
    { encoding: 'utf8', timeout: 60000 }).trim());
  check(cliReport.passed && cliReport.pages === 336 &&
    cliReport.fingerprintMatches && cliReport.readablePages > 235,
    'The offline private-book verification utility failed on a synthetic source.');
  await input.uploadFile(pdfPath);
  await page.waitForFunction(() =>
    document.querySelector('#content')?.textContent?.includes('corebook · prepared'), { timeout: 180000 });
  check(await page.$eval('#content',node=>
      node.textContent.includes('Review my book choices') &&
      node.textContent.includes('Your rulebook is searchable')),
    'Import success did not distinguish indexed PDF from verified choices.');
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

  // M6: a short supplement is independently indexed, searchable and never
  // treated as the prepared corebook needed for gameplay.
  const shortPath=join(process.cwd(),output,'temporary-supplement.pdf');
  writeFileSync(shortPath,syntheticPdf(3));
  await page.select('select[aria-label="Document type"]','supplement');
  await (await page.$('input[aria-label="Choose PDF files"]')).uploadFile(shortPath);
  await waitForSave('PDF imported.');
  page.once('dialog',dialog=>dialog.accept());
  await clickText('Prepare for search');
  await waitForSave('Private reference index ready.');
  const supplemental=await page.evaluate(async()=>{
    const {all}=await import('./storage.mjs');
    const docs=await all('documents');
    const ref=docs.find(doc=>doc.name==='temporary-supplement.pdf');
    return {role:ref?.role,format:ref?.bookPack?.format,pages:ref?.bookPack?.pageCount,
      gameReady:docs.some(doc=>doc.role==='corebook' && doc.bookPack?.format==='solobridgekit-prepared-corebook')};
  });
  check(supplemental.role==='supplement' &&
    supplemental.format==='solobridgekit-prepared-reference' &&
    supplemental.pages===3 && supplemental.gameReady,
    'M6 supplemental preparation changed corebook status or failed to index a short PDF.');
  await page.type('input[name=query]','Synthetic sample page');
  await clickText('Search');
  check((await page.$eval('#content',element=>element.textContent)).includes('temporary-supplement.pdf · page 1'),
    'M6 cross-book search hid the prepared supplement behind the long corebook.');
  // M6: importing another prepared edition must atomically demote the old
  // corebook; selecting the original restores exactly one active corebook.
  const switched=await page.evaluate(async()=>{
    const storage=await import('./storage.mjs');
    const original=(await storage.all('documents')).find(doc=>doc.role==='corebook');
    const alternative={...original,id:'synthetic-alternate-core',name:'Synthetic alternate edition.pdf',
      sourceEdition:'alternate',role:'corebook'};
    await storage.addDocumentsAtomically([alternative]);
    const during=await storage.all('documents');
    const activeDuring=during.filter(doc=>doc.role==='corebook').map(doc=>doc.id);
    const retained=during.find(doc=>doc.id===original.id);
    await storage.activatePreparedCorebook(original.id,original.bookPack);
    const after=await storage.all('documents');
    const activeAfter=after.filter(doc=>doc.role==='corebook').map(doc=>doc.id);
    await storage.remove('documents',alternative.id);
    const final=await storage.all('documents');
    return {activeDuring,activeAfter,originalId:original.id,
      retained:retained?.role==='reference' &&
        retained?.bookPack?.sourceSha256===original.bookPack.sourceSha256,
      count:final.length,corePrepared:final.some(doc=>doc.id===original.id&&doc.role==='corebook')};
  });
  check(switched.activeDuring.length===1 &&
    switched.activeDuring[0]==='synthetic-alternate-core' &&
    switched.activeAfter.length===1 && switched.activeAfter[0]===switched.originalId &&
    switched.retained && switched.count===libraryCount+1 && switched.corePrepared,
    'M6 active-corebook switching lost source indexes or left conflicting corebook roles.');
  await page.reload({waitUntil:'networkidle0'});
  await navigate('Library');
  const preparedLibraryCount=libraryCount+1;
  rmSync(shortPath,{force:true});

  // R1: Source preparation must teach that indexed PDFs alone are not
  // source-confirmed character choices, and shortcut to the selected page.
  check(await page.$eval('#content', node=>node.textContent.includes('Prepare choices for your adventure')
    && node.textContent.includes('0 of 8 sections have at least one confirmed choice')),
    'R1 source preparation readiness was missing after importing an unreviewed PDF.');
  const prepareAction=await page.$('#content button');
  check(!!prepareAction,'Guided source actions were not rendered.');
  const quickReview=await page.$eval('#content',node=>[...node.querySelectorAll('button')]
    .filter(item=>item.textContent.trim()==='Find possible choices').length);
  check(quickReview>=7,'New-player source lookup requires manual page-number preparation.');
  await page.$eval('details.source-preparation-tools',element=>element.open=true);
  // M2: a scanned page must produce an UNVERIFIED suggestion. It only becomes
  // usable after the player edits the fields and explicitly confirms the PDF.
  await page.select('select[aria-label="Compiler record type"]', 'talent');
  await clickText('Find candidates');
  await page.waitForFunction(() =>
    document.querySelector('#content')?.textContent?.includes('Review candidate'), { timeout: 10000 });
  const beforeCompiler = await page.evaluate(async () => {
    const { all } = await import('./storage.mjs');
    return (await all('documents')).find(doc => doc.role === 'corebook')?.compiledRecords ?? [];
  });
  check(beforeCompiler.length === 0, 'Scanning the book must not silently save or confirm extracted source.');
  await clickText('Review candidate');
  await page.type('textarea[name=description]', 'Privately confirmed synthetic talent description.');
  const compilerViewport = await page.evaluate(() => ({
    viewport: innerWidth, width: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll('body *')].filter(element=>{
      const rect=element.getBoundingClientRect();
      const style=getComputedStyle(element);
      return style.display!=='none' && style.visibility!=='hidden' &&
        rect.width>0 && (rect.right>innerWidth+4 || rect.left<-4);
    }).slice(0,12).map(element=>{
      const rect=element.getBoundingClientRect();
      return {tag:element.tagName,klass:String(element.className).slice(0,70),
        left:Math.round(rect.left),right:Math.round(rect.right),
        scrollWidth:element.scrollWidth,text:element.textContent?.slice(0,36)};
    })
  }));
  check(compilerViewport.width <= compilerViewport.viewport + 4,
    'The private compiler review form overflows the phone viewport: '+JSON.stringify(compilerViewport));
  await page.screenshot({ path: join(output, 'phone-compiler-review.png'), fullPage: true });
  await clickText('Confirm verified record');
  await waitForSave('Confirm that you checked these values');
  const noSilentPromotion = await page.evaluate(async () => {
    const { all } = await import('./storage.mjs');
    return (await all('documents')).find(doc => doc.role === 'corebook')?.compiledRecords?.length ?? 0;
  });
  check(noSilentPromotion === 0, 'Unchecked private compiler candidate became an active game rule.');
  await page.$eval('input[aria-label="I verified the values against my own PDF"]', input => input.click());
  await clickText('Confirm verified record');
  await waitForSave('Private record confirmed.');
  const confirmedCompiler = await page.evaluate(async () => {
    const { all } = await import('./storage.mjs');
    const doc = (await all('documents')).find(d => d.role === 'corebook');
    return { records: doc.compiledRecords?.length ?? 0,
      status: doc.compiledRecords?.[0]?.status,
      source: doc.compiledRecords?.[0]?.sourceSha256,
      packSource: doc.bookPack?.sourceSha256 };
  });
  check(confirmedCompiler.records === 1 && confirmedCompiler.status === 'confirmed' &&
    confirmedCompiler.source === confirmedCompiler.packSource,
    'The private compiler failed to save a validated source-bound record.');
  await page.$eval('details.source-preparation-tools',element=>element.open=true);
  await clickText('Revalidate saved records');
  await waitForSave('Private records revalidated.');
  await page.$eval('details.source-preparation-tools',element=>element.open=true);
  await page.select('select[aria-label="Compiler record type"]', 'talent');
  await clickText('Find candidates');
  await clickText('Review candidate');
  await clickText('Reject candidate');
  await waitForSave('Candidate rejected.');
  const rejectedHidden = await page.evaluate(async () => {
    const { all } = await import('./storage.mjs');
    const { compiledCatalog } = await import('./compiler-data.mjs');
    const doc = (await all('documents')).find(d => d.role === 'corebook');
    return { count: doc.compiledRecords?.length,
      confirmedTalents: compiledCatalog(doc.compiledRecords, doc.bookPack.sourceSha256, doc.bookPack.pageCount, 'talent').length,
      rejected: doc.compiledRecords?.filter(r => r.status === 'rejected').length };
  });
  check(rejectedHidden.count === 2 && rejectedHidden.confirmedTalents === 1 &&
      rejectedHidden.rejected === 1, 'Rejected source candidates leaked into confirmed gameplay records.');

  // The same confirmed local catalog must feed the lifepath, class and mission
  // consumers. Every fixture below is fictional and generated only in CI.
  const compiledConsumers = await page.evaluate(async () => {
    const { all, mutateCompiledRecords } = await import('./storage.mjs');
    const { draftCandidate, reviewCompiledRecord, compiledCatalog } =
      await import('./compiler-data.mjs');
    const doc = (await all('documents')).find(d => d.role === 'corebook');
    const sha = doc.bookPack.sourceSha256, count = doc.bookPack.pageCount;
    const entries = [
      { id:'synthetic-life',kind:'lifepath',label:'Synthetic lifepath choice',
        payload:{stepId:'species',record:{attributes:{control:1,daring:1,fitness:1},disciplines:{},
          value:'',focuses:'',notes:'Synthetic confirmation'}} },
      { id:'synthetic-ship',kind:'ship-class',label:'Synthetic ship class',
        payload:{kind:'starship',era:'Synthetic testing era',scale:4,
          systems:Object.fromEntries(['comms','computers','engines','sensors','structure','weapons'].map(key=>[key,6])),
          departments:Object.fromEntries(['command','conn','security','engineering','science','medicine'].map(key=>[key,1]))} },
      { id:'synthetic-table',kind:'random-table',label:'Synthetic source table',
        payload:{rows:'1 | Synthetic private result Alpha\n2 | Synthetic private result Beta\n3 | Synthetic private result Gamma'}} 
    ];
    for (const data of entries) {
      const draft = draftCandidate({id:data.id,kind:data.kind,label:data.label,page:1,sourceSha256:sha,pageCount:count});
      const record = reviewCompiledRecord(draft,{payload:data.payload},sha,count);
      await mutateCompiledRecords(doc.id,{type:'upsert',record});
    }
    const current=(await all('documents')).find(d=>d.id===doc.id);
    return { count: current.compiledRecords.length,
      lifepath:compiledCatalog(current.compiledRecords,sha,count,'lifepath').length,
      ship:compiledCatalog(current.compiledRecords,sha,count,'ship-class').length,
      table:compiledCatalog(current.compiledRecords,sha,count,'random-table').length };
  });
  check(compiledConsumers.count === 5 && compiledConsumers.lifepath === 1 &&
    compiledConsumers.ship === 1 && compiledConsumers.table === 1,
    'Confirmed compiled records were not reusable by existing game systems.');
  await page.reload({waitUntil:'networkidle0'});
  await navigate('Library');
  await heading('Library');

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
  await clickText('Guided lifepath');
  await page.waitForFunction(() => document.querySelector('#content')?.textContent?.includes('Character lifepath'), { timeout: 15000 });
  check(await page.$eval('#content', node => node.textContent.includes('Verified choices · 0/7')),
    'New characters should default to verified-guidance mode.');
  await clickText('Choose Synthetic lifepath choice');
  await waitForSave('Verified source choice applied.');
  const linkedStage = await page.evaluate(async () => {
    const { all } = await import('./storage.mjs');
    const campaign = (await all('campaigns'))[0];
    return campaign.character.lifepath?.stages?.species;
  });
  check(linkedStage?.sourceRef?.recordId === 'synthetic-life' &&
    linkedStage?.attributes?.control === 1 && linkedStage?.attributes?.daring === 1,
    'Guided selection did not persist the original source record and its exact verified bonuses.');
  // M4: retain a ship's name and registry while applying a private confirmed class.
  await navigate('Starship');
  await clickText('Guided ship setup');
  await page.waitForFunction(() => document.querySelector('#content h1')?.textContent?.includes('Guided ship setup'), {timeout:15000});
  await clickText('6. Identity');
  await page.waitForSelector('#content form input[name=name]',{timeout:15000});
  await page.type('input[name=name]','Player-owned survey ship');
  await page.type('input[name=registry]','OWN-001');
  await clickText('Save step');
  await waitForSave('Ship setup saved.');
  await clickText('2. Class and ratings');
  await page.waitForFunction(()=>[...document.querySelectorAll('#content button')].some(b=>b.textContent.trim()==='Choose Synthetic ship class'),{timeout:15000});
  await clickText('Choose Synthetic ship class');
  await waitForSave('Source-verified class loaded.');
  const savedClass = await page.evaluate(async () => {
    const { all } = await import('./storage.mjs');
    const ship=(await all('campaigns'))[0].ship.builder;
    return {ref:ship?.sourceRef?.recordId,name:ship?.name,registry:ship?.registry,
      engines:ship?.systems?.engines};
  });
  check(savedClass.ref==='synthetic-ship' && savedClass.name==='Player-owned survey ship' &&
    savedClass.registry==='OWN-001' && savedClass.engines==='6',
    'The source-verified ship class did not preserve identity or use saved source ratings.');
  // Finish a guided vessel using *only* synthetic source class data.
  await clickText('3. Polity');
  await page.waitForSelector('#content input[name=polityTrait]',{timeout:15000});
  await page.type('input[name=polityTrait]','Synthetic polity choice');
  await clickText('Save step');
  await waitForSave('Ship setup saved.');
  await clickText('5. Talents');
  await page.waitForSelector('#content textarea[name=talents]',{timeout:15000});
  await page.type('textarea[name=talents]','Private Talent One\nPrivate Talent Two\nPrivate Talent Three\nPrivate Talent Four');
  await clickText('Save step');
  await waitForSave('Ship setup saved.');
  await page.waitForFunction(()=>
    [...document.querySelectorAll('#content button')].some(x=>x.textContent.trim()==='Apply to ship sheet'&&!x.disabled),{timeout:15000});
  await clickText('Apply to ship sheet');
  await waitForSave('Ship setup applied.');
  const completeShip=await page.evaluate(async()=>{
    const {all}=await import('./storage.mjs');
    const ship=(await all('campaigns'))[0].ship;
    return {name:ship.name,registry:ship.registry,classRef:ship.builder?.sourceRef?.recordId,
      systems:ship.systems,departments:ship.departments,scale:ship.scale};
  });
  check(completeShip.name==='Player-owned survey ship' && completeShip.registry==='OWN-001' &&
    completeShip.classRef==='synthetic-ship' && completeShip.systems.engines==='6' &&
    completeShip.scale==='4',
    'Complete guided ship setup did not preserve private source ratings and identity.');
  // M4: optional fully entered NPC sheets, assignments and relationships.
  await navigate('Crew');
  await heading('Crew');
  await page.type('input[aria-label="Crew member name"]','Synthetic navigator');
  await clickText('Add crew member');
  await waitForSave('Crew member added.');
  await page.select('select[name=sheetMode]','full');
  await page.select('select[name=assignment]','away-team');
  await page.evaluate(() => {
    for (const input of document.querySelectorAll('#content input[name^="attribute_"]')) input.value='8';
    for (const input of document.querySelectorAll('#content input[name^="discipline_"]')) input.value='2';
  });
  await page.type('textarea[name=focuses]','Owner-entered navigational skill');
  await clickText('Save crew member');
  await waitForSave('Crew member saved.');
  await page.select('select[name=representation]','npc');
  await clickText('Calculate crew target');
  await page.waitForFunction(() => document.querySelector('#content')?.textContent?.includes('2d20 target'), {timeout:12000});
  await page.type('input[aria-label="Crew member name"]','Synthetic science officer');
  await clickText('Add crew member');
  await waitForSave('Crew member added.');
  await clickText('Edit');
  await page.type('input[name=description]','Player-written trusted colleague');
  await clickText('Add relationship');
  await waitForSave('Crew relationship saved.');
  const crewResult=await page.evaluate(async () => {
    const { all }=await import('./storage.mjs');
    const roster=(await all('campaigns'))[0].crew;
    return {count:roster.length,assignment:roster[0]?.assignment,
      npcMode:roster[0]?.sheetMode,attribute:roster[0]?.attributes?.reason,
      link:roster[0]?.connections?.[0]?.crewId, otherId:roster[1]?.id};
  });
  check(crewResult.count===2 && crewResult.assignment==='away-team' &&
    crewResult.npcMode==='full' && crewResult.attribute==='8' &&
    crewResult.link===crewResult.otherId,
    'NPC stats, assignments or player-authored relationship were lost during save.');
  await page.screenshot({path:join(output,'phone-crew.png'),fullPage:true});
  const crewWidth=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));
  check(crewWidth.width<=crewWidth.viewport+4,'Crew editor overflows the phone layout.');
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
  check(await page.$eval('#content',node=>node.textContent.includes('A scene is one moment in your adventure')),
    'Mission scenes do not explain their purpose to a first-time RPG player.');
  await page.click('button[aria-label="Act 2 scene 3, pending"]');
  await page.waitForFunction(async () => {
    const {all}=await import('./storage.mjs');
    return (await all('campaigns'))[0]?.episodes?.[0]?.activeSceneId==='2:3';
  },{timeout:15000});
  await page.type('.scene-editor input[name=title]','Synthetic act-two scene');
  await page.type('.scene-editor textarea[name=notes]','Player wrote this scene description.');
  await clickText('Save scene');
  await waitForSave('Scene saved.');
  await page.reload({waitUntil:'networkidle0'});
  await navigate("Captain's log");
  const activeScene=await page.evaluate(async()=>{
    const {all}=await import('./storage.mjs');
    const campaign=(await all('campaigns'))[0];
    return {missionId:campaign.activeEpisodeId,scene:campaign.episodes[0].activeSceneId,
      notes:campaign.episodes[0].scenes.find(x=>x.id==='2:3')?.notes};
  });
  check(activeScene.missionId && activeScene.scene==='2:3' &&
    activeScene.notes==='Player wrote this scene description.',
    'M5 failed to resume the exact saved act/scene and its authored notes after reload.');
  await page.type('.scene-editor textarea[name=valuesUsed]','Player-described challenged Value A');
  await clickText('Save scene');
  await waitForSave('Scene saved.');
  await page.type('.story-thread-create input[name=title]','Where did the anomaly go?');
  await page.type('.story-thread-create textarea[name=notes]','An unresolved player-written plot point');
  await clickText('Add story thread');
  await waitForSave('Story thread saved.');
  await clickText('Resolve thread');
  await waitForSave('Story thread updated.');
  await clickText('Reopen thread');
  await waitForSave('Story thread updated.');
  const story=await page.evaluate(async()=>{
    const {all}=await import('./storage.mjs');
    const ep=(await all('campaigns'))[0].episodes[0];
    return {scene:ep.activeSceneId,values:ep.scenes.find(s=>s.id==='2:3')?.valuesUsed,
      thread:ep.threads?.[0]};
  });
  check(story.scene==='2:3' && story.values==='Player-described challenged Value A' &&
    story.thread?.status==='open' && story.thread?.createdSceneId==='2:3' &&
    story.thread?.notes==='An unresolved player-written plot point',
    'M5 story thread or scene Value was not saved independently of the current scene.');
  // M5: a mistaken scene edit can be undone after persistence without
  // removing the active scene's Value, rolls, or narrative thread.
  await page.type('.scene-editor textarea[name=notes]',' Accidental addition');
  await clickText('Save scene');
  await waitForSave('Scene saved.');
  await clickText('Undo last scene edit');
  await waitForSave('Previous scene writing restored.');
  const corrected=await page.evaluate(async()=>{
    const {all}=await import('./storage.mjs');
    const ep=(await all('campaigns'))[0].episodes[0];
    return {scene:ep.activeSceneId,source:ep.scenes.find(x=>x.id==='2:3'),
      threadCount:ep.threads?.length,undoCount:ep.sceneCorrections?.length};
  });
  check(corrected.scene==='2:3' &&
    corrected.source.notes==='Player wrote this scene description.' &&
    corrected.source.valuesUsed==='Player-described challenged Value A' &&
    corrected.threadCount===1 && corrected.undoCount>=1,
    'M5 scene undo lost unrelated writing, active scene or story thread.');
  await clickText('Roll task');
  await page.waitForFunction(() => document.querySelector('#content')?.textContent?.includes('2d20:'), { timeout: 20000 });
  const compiledTableVisible = await page.$eval('select[aria-label="Private random table"]', select =>
    [...select.options].some(option => option.textContent.includes('Synthetic source table')));
  check(compiledTableVisible, 'A confirmed compiled table was not offered in active mission play.');
  await clickText('Roll table');
  await page.waitForFunction(() => document.querySelector('#content')?.textContent?.includes('Synthetic private result'), { timeout: 10000 });
  await clickText('Record reference');
  await waitForSave('Table reference added to the mission.');
  const sceneRecords=await page.evaluate(async()=>{
    const {all}=await import('./storage.mjs');
    const ep=(await all('campaigns'))[0].episodes[0];
    return {scene:ep.activeSceneId,rollScene:ep.taskHistory[0]?.sceneId,
      reference:ep.entries.find(e=>e.kind==='table-reference')};
  });
  check(sceneRecords.scene==='2:3' && sceneRecords.rollScene==='2:3' &&
    sceneRecords.reference?.sceneId==='2:3' && sceneRecords.reference?.tableId==='synthetic-table' &&
    !JSON.stringify(sceneRecords.reference).includes('Synthetic private result') &&
    !JSON.stringify(sceneRecords.reference).includes('Synthetic source table'),
    'Task or private table reference lost the scene or leaked source table prose.');
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
  check(!episodeMarkdown.includes('Synthetic sample page lifepath mission') &&
    !episodeMarkdown.includes('Synthetic private result') &&
    !episodeMarkdown.includes('Synthetic source table') &&
    episodeMarkdown.includes('Act 2, Scene 3') &&
    episodeMarkdown.includes('Where did the anomaly go?') &&
    episodeMarkdown.includes('Player-described challenged Value A'),
    'M5 journal leaked private table prose or lost the scene, threads or Values.');
  await navigate('Home');
  await heading('Home');
  await clickText('Export journal');
  const campaignMarkdown = await waitForDownload('synthetic-test-campaign-journal.md');
  check(campaignMarkdown.includes('Synthetic Officer') && campaignMarkdown.includes('Synthetic test mission'),
    'Campaign journal omitted saved character or mission content.');
  check(!campaignMarkdown.includes('Synthetic sample page lifepath mission'),
    'Campaign journal leaked private indexed book content.');

  // M5: traverse all three acts and preserve the author's opening,
  // middle, ending and closing entries after an offline-safe reload.
  await navigate("Captain's log");
  await page.type('textarea[name=actOne]','Player authored an opening log.');
  await page.type('textarea[name=actTwo]','Player authored a second-act log.');
  await page.type('textarea[name=actThree]','Player authored a third-act log.');
  await page.type('textarea[name=closing]','Player authored the ending.');
  await clickText('Save mission record');
  await waitForSave('Mission record saved.');
  for(const [act,number] of [[1,1],[2,3],[3,1]]){
    await page.click(`button[aria-label="Act ${act} scene ${number}, pending"]`);
    await page.waitForFunction(([a,n])=>document.querySelector('.scene-editor h3')?.textContent?.includes(`Act ${a} · Scene ${n}`),
      {timeout:15000},[act,number]);
    await clickText('Complete scene');
    await page.waitForFunction(([a,n])=>document.querySelector(`button[aria-label="Act ${a} scene ${n}, complete"]`),
      {timeout:15000},[act,number]);
  }
  await page.reload({waitUntil:'networkidle0'});
  await navigate("Captain's log");
  const threeAct=await page.evaluate(async()=>{
    const {all}=await import('./storage.mjs'); const ep=(await all('campaigns'))[0].episodes[0];
    return {active:ep.activeSceneId,completed:ep.scenes.filter(s=>s.completed).map(s=>s.id),
      logs:ep.actLogs,notes:ep.scenes.find(s=>s.id==='2:3')?.notes,
      threadCount:ep.threads?.length};
  });
  check(threeAct.active==='3:1' && ['1:1','2:3','3:1'].every(id=>threeAct.completed.includes(id)) &&
    threeAct.logs.actOne==='Player authored an opening log.' &&
    threeAct.logs.actTwo==='Player authored a second-act log.' &&
    threeAct.logs.actThree==='Player authored a third-act log.' &&
    threeAct.logs.closing==='Player authored the ending.' &&
    threeAct.notes==='Player wrote this scene description.' && threeAct.threadCount===1,
    'M5 three-act playthrough or author-written closing log failed to resume.');
  // M3: completed-mission character development uses the source-verified
  // 2026 milestone actions, and injury status stays narrative-only.
  await clickText('Complete mission');
  // Ship milestones can only be entered after a completed mission.
  await navigate('Starship');
  await page.select('select[name=type]','improve-system');
  await page.select('select[name=to]','engines');
  await page.type('input[name=reason]','Synthetic player-earned ship improvement');
  await clickText('Record ship milestone');
  await waitForSave('Ship milestone recorded.');
  await page.type('input[name=label]','Synthetic repair task');
  await clickText('Add vessel condition');
  await waitForSave('Vessel condition saved.');
  await clickText('Mark vessel recovering');
  await waitForSave('Vessel condition updated.');
  const vesselProgress=await page.evaluate(async()=>{
    const {all}=await import('./storage.mjs');
    const ship=(await all('campaigns'))[0].ship;
    return {engine:ship.systems.engines,sourcePage:ship.development?.history?.[0]?.sourcePage,
      milestones:ship.development?.history?.length,conditions:ship.development?.conditions?.length,
      conditionState:ship.development?.conditions?.[0]?.state,classId:ship.builder?.sourceRef?.recordId};
  });
  check(vesselProgress.engine==='7' && vesselProgress.sourcePage===181 &&
    vesselProgress.milestones===1 && vesselProgress.conditions===1 &&
    vesselProgress.conditionState==='recovering' && vesselProgress.classId==='synthetic-ship',
    'Ship advancement or source-linked condition history failed to persist.');
  await page.evaluate(async () => {
    const { all, saveCampaign } = await import('./storage.mjs');
    const campaign=(await all('campaigns'))[0];
    const char=campaign.character;
    char.attributes={control:'12',daring:'10',fitness:'9',insight:'9',presence:'8',reason:'8'};
    char.disciplines={command:'5',conn:'3',security:'2',engineering:'2',science:'2',medicine:'2'};
    char.values='Value One\nValue Two\nValue Three\nValue Four';
    char.focuses='Focus One\nFocus Two\nFocus Three\nFocus Four\nFocus Five\nFocus Six';
    if (char.lifepath) char.lifepath.appliedAt = new Date().toISOString();
    await saveCampaign(campaign);
  });
  await page.reload({waitUntil:'networkidle0'});
  await navigate('Character');
  await page.select('select[aria-label="Milestone adjustment"]','attribute-shift');
  await page.select('select[name=from]','control');
  await page.select('select[name=to]','reason');
  await clickText('Record milestone');
  await waitForSave('Character milestone recorded.');
  await page.type('input[name=newValue]','Value One evolved');
  await page.$eval('input[name=challenged]',node=>node.click());
  await clickText('Record changed value');
  await waitForSave('Challenged value replaced.');
  await page.type('input[name=newFocus]','Focus Seven');
  await clickText('Change one Focus');
  await waitForSave('Focus change recorded.');
  await page.type('input[name=newFocus]','Focus Eight');
  await clickText('Change one Focus');
  await waitForSave('One focus has already been changed');
  await page.type('input[name=label]','Synthetic recurring injury');
  await clickText('Add condition');
  await waitForSave('Condition saved.');
  await clickText('Mark recovering');
  await waitForSave('Condition updated.');
  const development = await page.evaluate(async () => {
    const { all } = await import('./storage.mjs');
    const char = (await all('campaigns'))[0].character;
    return { history: char.development?.history?.length, conditions: char.development?.conditions?.length,
      conditionState: char.development?.conditions?.[0]?.state,
      attrs: char.attributes, sourcePage: char.development?.history?.[0]?.sourcePage,
      valueUpdated: char.values.includes('Value One evolved') };
  });
  check(development.history === 3 && development.conditions === 1 &&
    development.conditionState === 'recovering' &&
    development.attrs.control === '11' && development.attrs.reason === '9' &&
    development.sourcePage === 142 && development.valueUpdated,
    'Character development failed to persist source-linked advancement, values, Focus or injury status.');
  await page.$eval('textarea[name=values]', node => {
    node.value = node.value.replace('Value One evolved', 'Value One evolved further');
  });
  await clickText('Save character');
  await waitForSave('Character saved.');
  const originalSourceStillSafe=await page.evaluate(async () => {
    const { all }=await import('./storage.mjs');
    const char=(await all('campaigns'))[0].character;
    return {appliedAt:char.lifepath?.appliedAt??null,
      source:char.lifepath?.stages?.species?.sourceRef?.recordId};
  });
  check(originalSourceStillSafe.appliedAt===null &&
      originalSourceStillSafe.source==='synthetic-life',
    'Manual character-sheet changes failed to invalidate applied ratings or erased original source history.');
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  const characterGeometry = await page.evaluate(() => ({
    viewport:innerWidth, width:document.documentElement.scrollWidth
  }));
  check(characterGeometry.width <= characterGeometry.viewport+4,
    'M3 character development controls exceed the phone viewport.');
  await page.screenshot({path:join(output,'phone-character-development.png'),fullPage:true});
  await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
  await navigate('Settings');
  await heading('Settings');
  await clickText('Export backup');
  const backupName = 'solobridgekit-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  const backup = JSON.parse(await waitForDownload(backupName));
  check(backup.includesDocuments === false && backup.documents.length === 0,
    'Default campaign backup must exclude imported books and private compiled data.');
  check(backup.campaigns.some(c => c.title === 'Synthetic test campaign'),
    'Backup did not contain the campaign.');
  check(backup.campaigns.some(c=>c.ship?.development?.history?.length===1 &&
    c.ship?.development?.conditions?.length===1 && c.ship?.systems?.engines==='7'),
    'Data-only campaign backup lost player-authored vessel history.');
  check(backup.campaigns.some(c =>
    c.character?.development?.history?.length === 3 &&
    c.character?.development?.conditions?.[0]?.state === 'recovering' &&
    c.character?.lifepath?.stages?.species?.sourceRef?.recordId === 'synthetic-life'),
    'Data-only backup omitted progression history or player-owned source references.');
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
  check(privateBundle.includesDocuments === true && privateBundle.documents.length === preparedLibraryCount,
    'Private backup omitted its explicit PDF-inclusive setting.');
  check(privateBundle.documents.some(d => d.role === 'corebook' && d.bookPack?.pages?.length === 336),
    'Private backup lost its compiled source book.');
  check(privateBundle.documents.some(d => d.compiledRecords?.length === 5),
    'Private PDF-inclusive backup lost reviewed compiler records.');
  check(privateBundle.campaigns.some(c=>c.ship?.development?.history?.length===1 &&
    c.ship?.development?.conditions?.length===1 && c.ship?.systems?.engines==='7' &&
    c.ship?.builder?.sourceRef?.recordId==='synthetic-ship'),
    'Full private backup lost ship milestones, conditions or class source ID.');
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
  check(countAfterDataRestore === preparedLibraryCount,
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
      corebookPrepared: documents.some(d => d.role === 'corebook' && d.bookPack?.pages?.length === 336),
      compilerCount: documents.find(d=>d.role==='corebook')?.compiledRecords?.length ?? 0 };
  });
  check(afterCorrupt.docs === preparedLibraryCount && afterCorrupt.corebookPrepared &&
    afterCorrupt.compilerCount === 5 && afterCorrupt.campaigns === backup.campaigns.length,
    'A corrupt private-backup restore changed existing local data or its reviewed compiler records.');

  // Valid private PDF-inclusive restore must reconstruct the book/index and campaign.
  page.once('dialog', dialog => dialog.accept());
  await (await page.$('input[aria-label="Restore from backup"]')).uploadFile(privatePath);
  await waitForSave('Backup restored.');
  const restored = await page.evaluate(async () => {
    const { all } = await import('./storage.mjs');
    const docs = await all('documents'), campaigns = await all('campaigns');
    const book = docs.find(d => d.role === 'corebook');
    const character = campaigns.find(c => c.title === 'Synthetic test campaign')?.character;
    return { docs: docs.length, campaigns: campaigns.map(c => c.title),
      pages: book?.bookPack?.pages?.length, compiled: book?.compiledRecords?.length,
      confirmed: book?.compiledRecords?.filter(r => r.status === 'confirmed').length,
      rejected: book?.compiledRecords?.filter(r => r.status === 'rejected').length,
      history: character?.development?.history?.length,
      conditions: character?.development?.conditions?.length,
      originalStage: character?.lifepath?.stages?.species?.sourceRef?.recordId,
      shipHistory: campaigns.find(c=>c.title==='Synthetic test campaign')?.ship?.development?.history?.length,
      shipConditions: campaigns.find(c=>c.title==='Synthetic test campaign')?.ship?.development?.conditions?.length,
      shipEngine: campaigns.find(c=>c.title==='Synthetic test campaign')?.ship?.systems?.engines,
      shipSource: campaigns.find(c=>c.title==='Synthetic test campaign')?.ship?.builder?.sourceRef?.recordId };
  });
  check(restored.docs === preparedLibraryCount && restored.pages === 336 &&
    restored.compiled === 5 && restored.confirmed === 4 && restored.rejected === 1 &&
    restored.history === 3 && restored.conditions === 1 && restored.originalStage === 'synthetic-life' &&
    restored.shipHistory === 1 && restored.shipConditions === 1 &&
    restored.shipEngine === '7' && restored.shipSource === 'synthetic-ship' &&
    restored.campaigns.includes('Synthetic test campaign'),
    'Private backup failed to restore character provenance, progression, or source-bound catalog.');
  // Exact-file reattachment preserves source-derived data and refuses a different PDF.
  await navigate('Library');
  await heading('Library');
  // Multiple imported PDFs have identical reattachment control labels.
  // Always choose the corebook's picker, not the first PDF in the library.
  const corebookReattachInput = async () => {
    for (const input of await page.$$('input[aria-label="Reattach PDF file"]')) {
      const isCorebook = await input.evaluate(element =>
        element.closest('.document-item')?.querySelector('.list-row strong')?.textContent?.trim()
          === 'temporary-synthetic.pdf');
      if (isCorebook) return input;
    }
    throw new Error('The original synthetic corebook reattachment control was missing.');
  };
  await (await corebookReattachInput()).uploadFile(pdfPath);
  await waitForSave('Matching PDF reattached.');
  const differentPdfPath = join(process.cwd(), output, 'different-edition.pdf');
  writeFileSync(differentPdfPath, '%PDF-1.4\nThis is deliberately not the original synthetic book.');
  await (await corebookReattachInput()).uploadFile(differentPdfPath);
  await waitForSave('does not match the original book');
  const afterRelink = await page.evaluate(async () => {
    const { all } = await import('./storage.mjs');
    const docs = await all('documents');
    return { count: docs.length, pages: docs.find(d => d.role === 'corebook')?.bookPack?.pages?.length };
  });
  check(afterRelink.count === preparedLibraryCount && afterRelink.pages === 336,
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
  // A restore in ANOTHER browser tab must invalidate both outstanding imports
  // and campaigns with the same numeric revision as the restored backup.
  const oldTabSnapshot = await page.evaluate(async () => {
    const storage = await import('./storage.mjs');
    return {
      generation: await storage.currentDataGeneration(),
      campaign: structuredClone((await storage.all('campaigns'))[0])
    };
  });
  const otherTab = await browser.newPage();
  try {
    await otherTab.goto(origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await otherTab.evaluate(async bundle => {
      await (await import('./storage.mjs')).restoreBackup(bundle);
    }, backup);
  } finally { await otherTab.close(); }
  const crossTab = await page.evaluate(async snapshot => {
    const { all, addDocumentsAtomically, patchDocumentIfCurrent, saveCampaign } =
      await import('./storage.mjs');
    const before = await all('documents');
    const fake = { id: crypto.randomUUID(), name: 'cross-tab-stale.pdf',
      role: 'reference', blob: new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
      size: 8, importedAt: new Date().toISOString(), bookmarks: [] };
    let importRejected = false, patchRejected = false, campaignRejected = false;
    try { await addDocumentsAtomically([fake], snapshot.generation); }
    catch (error) { importRejected = error.message.includes('database changed'); }
    try { await patchDocumentIfCurrent(before[0].id,
      { name: 'cross-tab-overwritten.pdf' }, snapshot.generation); }
    catch (error) { patchRejected = error.message.includes('library changed'); }
    try {
      snapshot.campaign.title = 'Cross-tab stale campaign overwrite';
      await saveCampaign(snapshot.campaign);
    } catch (error) { campaignRejected = error.message.includes('another tab'); }
    const after = await all('documents');
    const campaign = (await all('campaigns'))[0];
    return { importRejected, patchRejected, campaignRejected,
      docsPreserved: after.length === before.length && after[0].name === before[0].name,
      campaignPreserved: campaign.title === 'Synthetic test campaign',
      sameRevision: campaign.revision === snapshot.campaign.revision };
  }, oldTabSnapshot);
  check(crossTab.importRejected && crossTab.patchRejected && crossTab.campaignRejected &&
    crossTab.docsPreserved && crossTab.campaignPreserved && crossTab.sameRevision,
    'Cross-tab restore allowed a stale write with an unchanged numeric campaign revision.');





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
  // Force a UI save conflict and prove the unsaved player edits can be recovered.
  await navigate('Character');
  await heading('Character');
  await page.evaluate(async () => {
    const { all, saveCampaign } = await import('./storage.mjs');
    const fresh = (await all('campaigns'))[0];
    fresh.character.notes = 'Newer saved note from another tab';
    await saveCampaign(fresh);
  });
  await page.type('textarea[name="notes"]', 'Unsaved after conflicting save');
  await clickText('Save character');
  await waitForSave('another tab');
  check(await page.$eval('#recovery-banner', x => !x.hidden),
    'A rejected character save did not expose recovery actions.');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  const recoveryWidth = await page.evaluate(() => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth,
    visibleButtons: [...document.querySelectorAll('#recovery-banner button')].every(button => {
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.left >= 0 && rect.right <= innerWidth + 2;
    })
  }));
  check(recoveryWidth.document <= recoveryWidth.viewport + 4 && recoveryWidth.visibleButtons,
    'The recovery warning or its actions overflow the phone viewport.');
  await page.screenshot({ path: join(output, 'phone-recovery.png'), fullPage: true });
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

  await page.click('#download-recovery');
  const recoveryName = 'solobridgekit-unsaved-' + new Date().toISOString().slice(0, 10) + '.json';
  const recoveredText = await waitForDownload(recoveryName);
  const recoveryDraft = JSON.parse(recoveredText);
  check(recoveryDraft.campaign.character.notes.includes('Unsaved after conflicting save') &&
    !Object.hasOwn(recoveryDraft, 'documents') && !recoveredText.includes('Synthetic sample page lifepath mission'),
    'Recovery export omitted the unsaved player edit or leaked private source data.');
  await navigate('Settings');
  await heading('Settings');
  await (await page.$('input[aria-label="Import recovered draft"]')).uploadFile(join(downloads, recoveryName));
  await waitForSave('Recovery draft imported as a separate campaign.');
  const recoveredCampaigns = await page.evaluate(async () => {
    const { all } = await import('./storage.mjs');
    return (await all('campaigns')).map(c => ({ title: c.title, notes: c.character.notes }));
  });
  check(recoveredCampaigns.some(c => c.title.includes('(recovered)') &&
      c.notes.includes('Unsaved after conflicting save')) &&
    recoveredCampaigns.some(c => c.title === 'Synthetic test campaign' &&
      c.notes === 'Newer saved note from another tab'),
    'The recovery flow lost either the newer save or the unsaved player draft.');

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
