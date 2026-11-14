// Synthetic, book-free M7 browser checks. Real screen-reader/device acceptance
// remains separate. This test never imports or distributes publisher material.
import puppeteer from 'puppeteer-core';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';

const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
if(!existsSync(chrome))throw new Error('Chrome is required for accessibility smoke.');
const server=spawn('python3',['-m','http.server','4187','--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});
let browser;
const check=(value,message)=>{if(!value)throw new Error(message);};
try{
  browser=await puppeteer.launch({executablePath:chrome,headless:true,pipe:true,
    args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  let loaded=false;
  for(let attempt=0;attempt<30&&!loaded;attempt++){
    try{await page.goto('http://127.0.0.1:4187/',{waitUntil:'networkidle0',timeout:10000});loaded=true;}
    catch{await new Promise(resolve=>setTimeout(resolve,200));}
  }
  check(loaded,'The packaged offline app did not load.');
  for(const [width,height] of [[360,740],[390,844],[768,1024],[1280,800],[640,800]]){
    await page.setViewport({width,height,deviceScaleFactor:1});
    await page.waitForFunction(()=>document.querySelector('#content h1'));
    const result=await page.evaluate(()=>({
      width:document.documentElement.scrollWidth,viewport:innerWidth,
      content:!!document.querySelector('#content h1'),
      navigation:!![...document.querySelectorAll('nav button')].find(button=>{
        const rect=button.getBoundingClientRect();
        return rect.width>0&&rect.height>0;
      })
    }));
    check(result.content && result.navigation,'Navigation or main content was missing at '+width+'px.');
    check(result.width<=result.viewport+4,
      'Horizontal overflow at '+width+'px: '+result.width+'/'+result.viewport);
  }
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  // Keyboard focus should be visibly outlined. Activate a page without a mouse.
  await page.keyboard.press('Tab');
  const focus=await page.evaluate(()=>{
    const element=document.activeElement,style=getComputedStyle(element);
    return {tag:element?.tagName,name:element?.textContent?.trim(),
      outline:style.outlineStyle,width:parseFloat(style.outlineWidth)};
  });
  check(focus.tag==='BUTTON'&&focus.outline!=='none'&&focus.width>0,
    'Keyboard navigation does not show a visible focus indicator.');
  await page.evaluate(()=>{
    const library=[...document.querySelectorAll('#mobile-nav button')].find(b=>b.textContent.trim()==='Library');
    if(!library)throw new Error('Library navigation is missing.');
    library.focus();
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#content h1')?.textContent.trim()==='Library');
  const accessibility=await page.evaluate(()=>{
    const visible=element=>{const rect=element.getBoundingClientRect();
      const css=getComputedStyle(element);
      return css.visibility!=='hidden'&&css.display!=='none'&&rect.width>0&&rect.height>0;};
    const unnamedButtons=[...document.querySelectorAll('button')].filter(visible).filter(button=>
      !(button.textContent.trim()||button.getAttribute('aria-label')||button.title));
    const unnamedInputs=[...document.querySelectorAll('input,select,textarea')].filter(visible).filter(input=>
      !(input.getAttribute('aria-label')||input.closest('label')||
        (input.id&&document.querySelector('label[for="'+CSS.escape(input.id)+'"]'))));
    const smallNav=[...document.querySelectorAll('#mobile-nav button')].filter(visible)
      .filter(button=>button.getBoundingClientRect().height<44);
    return {unnamedButtons:unnamedButtons.length,unnamedInputs:unnamedInputs.length,
      smallNav:smallNav.length,landmarks:document.querySelectorAll('main').length,
      pageTitle:!!document.querySelector('title')?.textContent};
  });
  check(accessibility.unnamedButtons===0,'Visible unnamed buttons were found.');
  check(accessibility.unnamedInputs===0,'Visible form inputs lack programmatic labels.');
  check(accessibility.smallNav===0,'Mobile navigation has tap targets shorter than 44px.');
  check(accessibility.landmarks===1&&accessibility.pageTitle,'The main landmark or title is missing.');
  // Approximate a desktop browser at 200% zoom using its corresponding
  // narrower CSS viewport; actual browser zoom remains M7 device acceptance.
  await page.setViewport({width:640,height:800,deviceScaleFactor:2});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+4),
    'The two-times responsive viewport has horizontal overflow.');
  console.log('M7 packaged accessibility/layout smoke passed: 360, 390, 640, 768, 1280px; focus, labels and navigation.');
}finally{await browser?.close();server.kill();}
