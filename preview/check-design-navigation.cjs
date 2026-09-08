const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {setTheme}=require('./check-theme-control.cjs');
const assert=require('node:assert/strict'),path=require('node:path');
async function main(){
 const base=process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091',out=process.env.BUILDER_EVIDENCE_DIR||'/tmp';
 const index=await(await fetch(base+'/api/workspace/context')).json(),court=index.drafts.find(d=>/corner court/i.test(d.name));assert.ok(court);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/studio?draft='+court.id);await page.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy==='false');
  await setTheme(page,'dark');
  assert.match(await page.locator('#draft-title').innerText(),/Corner court apartments/i);
  assert.ok(await page.locator('#draft-title').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=28));
  assert.ok(await page.locator('#build-number').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)===8));
  assert.equal(await page.locator('#build-number').innerText(),'b20260906.07');
  for(const id of ['context-visible','context-depth','diff-visible','impact-visible']){
   const input=page.locator('#'+id),initial=await input.isChecked();
   await input.focus();await page.keyboard.press('Space');assert.equal(await input.isChecked(),!initial);await page.waitForFunction(()=>document.body.dataset.busy==='false');
   await input.setChecked(initial);await page.waitForFunction(()=>document.body.dataset.busy==='false');
  }
  for(const view of ['front','side','rear','roof','perspective']){
   await page.locator('[data-studio-view="'+view+'"]').click();assert.equal(await page.locator('[data-studio-view][aria-pressed=true]').count(),1);
  }
  const meshResponse=page.waitForResponse(r=>r.url().includes('/mesh?ceiling=6')&&r.status()===200);
  await page.selectOption('#studio-ceiling','6');await meshResponse;await page.waitForFunction(()=>document.body.dataset.busy==='false');
  await page.selectOption('#studio-ceiling','64');await page.waitForFunction(()=>document.body.dataset.busy==='false');
  for(const section of ['site','revise','place','design']){
   await page.locator('.studio-steps a[href="#'+section+'-workspace"]').click();
   const bounds=await page.locator('#'+section+'-workspace').boundingBox();assert.ok(bounds.y>=55&&bounds.y<200,section+' is reachable below sticky navigation');
  }
  await page.screenshot({path:path.join(out,'design-studio-mobile.png')});
  for(const width of [320,768,1440]){
   await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'studio width '+width);
  }
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'design-studio-desktop.png')});
  await page.getByRole('link',{name:'Project register',exact:true}).click();await page.waitForFunction(()=>window.previewStatus?.().ready);
  assert.equal(await page.locator('#register-panel').isVisible(),true);assert.equal(await page.locator('#review-panel').isVisible(),false);
  await page.reload();await page.waitForFunction(()=>window.previewStatus?.().ready);assert.equal(await page.locator('#register-panel').isVisible(),true);
  await page.locator('.project-card-body>button').first().click();await page.waitForFunction(()=>window.previewStatus?.().ready);assert.equal(await page.locator('#review-panel').isVisible(),true);
  await page.locator('[data-view=rear]').click();assert.equal(await page.locator('[data-view=rear]').getAttribute('aria-pressed'),'true');
  await page.locator('#fit-model').click();assert.equal(await page.locator('[data-view][aria-pressed=true]').count(),0);
  await page.locator('#show-grid').uncheck();assert.equal((await page.evaluate(()=>previewStatus().presentation)).grid,false);await page.locator('#show-grid').check();
  await page.locator('[data-view=perspective]').click();
  await page.screenshot({path:path.join(out,'design-review-desktop.png')});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'design-review-mobile.png')});
  for(const width of [320,390,768]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'review width '+width);}
  assert.deepEqual(errors,[]);console.log('DESIGN_NAVIGATION_PASS headings, accessible layer toggles, cutaways, five cameras, workflow anchors, direct register link, grid, and 320/390/768/1440 layouts');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
