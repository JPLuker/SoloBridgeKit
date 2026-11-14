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
  // Both supported color schemes must retain readable text on the surface
  // and background. Measured from actual computed design tokens.
  for(const themeName of ['light','dark']){
    await page.emulateMediaFeatures([
      {name:'prefers-color-scheme',value:themeName},
      {name:'prefers-reduced-motion',value:'reduce'}
    ]);
    const palette=await page.evaluate(()=>{
      const style=getComputedStyle(document.documentElement);
      return {background:style.getPropertyValue('--bg'),surface:style.getPropertyValue('--surface'),
        text:style.getPropertyValue('--text'),secondary:style.getPropertyValue('--sub'),
        motion:matchMedia('(prefers-reduced-motion: reduce)').matches};
    });
    const luminance=value=>{
      const raw=value.trim().replace('#','');
      const hex=/^[0-9a-f]{3}$/i.test(raw)?raw.split('').map(char=>char+char).join(''):raw;
      if(!/^[0-9a-f]{6}$/i.test(hex))throw new Error('Invalid theme color token: '+value);
      const channels=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255)
        .map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
      return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
    };
    const contrast=(a,b)=>{
      const [x,y]=[luminance(a),luminance(b)].sort((a,b)=>b-a);
      return (x+.05)/(y+.05);
    };
    check(palette.motion,'Reduced-motion media setting was not respected.');
    check(contrast(palette.text,palette.background)>=7,
      themeName+' body text/background contrast is insufficient.');
    check(contrast(palette.secondary,palette.surface)>=4.5,
      themeName+' secondary text/surface contrast is insufficient.');
  }
  // Installation prerequisites and a no-network reload of the packaged
  // shell are checked independently of gameplay source import.
  const install=await page.evaluate(async()=>{
    const manifest=await fetch('./manifest.webmanifest').then(response=>response.json());
    await navigator.serviceWorker.ready;
    return {manifestName:manifest.name,display:manifest.display,
      controller:!!navigator.serviceWorker.controller};
  });
  check(!!install.manifestName&&install.display==='standalone'&&install.controller,
    'The PWA manifest or offline service worker is not ready.');
  await page.setOfflineMode(true);
  await page.reload({waitUntil:'domcontentloaded',timeout:15000});
  check(await page.evaluate(()=>!!document.querySelector('#content h1')),
    'The packaged PWA failed to load its shell offline.');
  await page.setOfflineMode(false);
  console.log('M7 packaged accessibility/layout/offline smoke passed: 360, 390, 640, 768, 1280px; focus, labels, contrast and navigation.');
}finally{await browser?.close();server.kill();}
