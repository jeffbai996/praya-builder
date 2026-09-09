const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const base=process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091',browser=await chromium.launch({channel:process.env.CHROMIUM_PATH?undefined:'msedge',executablePath:process.env.CHROMIUM_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const p=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(base+'/?panel=register');await p.waitForFunction(()=>window.previewStatus?.().ready&&document.querySelector('#working-design-list a'));
const index=await(await fetch(base+'/api/workspace/context')).json(),latest=[...index.revisions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
assert.match(await p.locator('#continue-design-link').getAttribute('href'),new RegExp(latest.draftId));
assert.equal(await p.locator('#page-title').textContent(),'Design library');
assert.ok(await p.locator('.workspace-start').count()>0);
const href=await p.locator('.workspace-start').first().getAttribute('href');assert.match(href,/studio\?catalogue=/);
await p.locator('#search').fill('Terraced');assert.ok(await p.locator('.working-design-link:visible').count()>0);await p.locator('#search').fill('');
await p.locator('#continue-design-link').click();await p.waitForFunction(()=>window.studioStatus?.().ready&&document.body.dataset.busy==='false');
assert.ok((await p.locator('.studio-heading').textContent()).includes('ARCHITECTURAL SERVICES'));
assert.equal(await p.locator('#back-link').getAttribute('aria-label'),'Design library');
assert.equal(await p.locator('#back-link').getAttribute('href'),'/?panel=register');
const luminance=rgb=>{const c=rgb.match(/[\d.]+/g).slice(0,3).map(n=>{const v=Number(n)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*c[0]+.7152*c[1]+.0722*c[2];};
for(const theme of ['light','dark','oled']){await p.evaluate(t=>document.documentElement.dataset.theme=t,theme);const colors=await p.locator('#save-revision').evaluate(e=>({bg:getComputedStyle(e).backgroundColor,fg:getComputedStyle(e).color}));const a=luminance(colors.bg),b=luminance(colors.fg);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,theme+' action contrast');}
await p.locator('#theme-toggle').click();for(let i=0;i<3&&(await p.locator('html').getAttribute('data-theme'))!=='dark';i++)await p.locator('#theme-toggle').click();
const out=process.env.BUILDER_EVIDENCE_DIR;if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,'workspace-orange-desktop.png')});}
for(const width of [1440,1024,768,703,600,390,320]){await p.setViewportSize({width,height:1000});await p.evaluate(()=>scrollTo(0,0));const brand=await p.locator('.department-brand').boundingBox(),heading=await p.locator('.studio-heading').boundingBox();assert.equal(await p.locator('.studio-heading h1').textContent(),'studio');assert.ok(heading&&heading.x>=brand.x+brand.width,'studio right of builder at '+width);assert.ok(heading.y<brand.y+brand.height&&heading.y+heading.height>brand.y,'same header row at '+width);assert.equal(await p.locator('#back-link').evaluate(e=>getComputedStyle(e).borderRadius),'6px');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(out&&width===390)await p.screenshot({path:path.join(out,'workspace-orange-phone.png')});}
await p.locator('#back-link').click();await p.waitForFunction(()=>window.previewStatus?.().ready);assert.equal(await p.locator('#register-panel').isVisible(),true);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await p.setViewportSize({width:1440,height:1100});if(out)await p.screenshot({path:path.join(out,'design-library.png')});assert.deepEqual(errors,[]);console.log('PASS library/workspace flow, latest saved design, search, catalogue links, header, three-theme action contrast, 390/320 layouts');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
