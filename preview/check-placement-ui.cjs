// Read-only smoke by default. Copy/save/preview checks require a separate scratch workspace.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {setTheme}=require('./check-theme-control.cjs');
const base=process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091',write=process.env.PLACEMENT_UI_WRITE==='1';
const id='cf455af5-1f3b-4109-a6e5-ea98e8d28284';
async function main(){
 if(write)assert.equal(new URL(base).port,'8092','Writes only against the scratch instance');
 const original=await(await fetch(base+'/api/workspace/drafts/'+id)).json();
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],worldWrites=[];
  const connected=await(await fetch(base+'/api/workspace/construction/status')).json();
  page.on('pageerror',e=>errors.push(e.message));
  // Preview may read the world; this test must never apply, undo or reconcile world changes.
  await page.route('**/construction/jobs/*/*',route=>{worldWrites.push(route.request().url());return route.abort();});
  const settled=()=>page.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy==='false',null,{timeout:120000});
  await page.goto(base+'/studio?draft='+id);await settled();
  assert.equal(await page.locator('#open-construction').isVisible(),true);
  assert.match(await page.locator('#placement-teaser').textContent(),/Uses world.*praya-test/);
  await page.locator('#open-construction').click();
  await page.waitForFunction(()=>document.querySelector('#placement-readiness').dataset.state==='world-mismatch');
  assert.equal(await page.locator('#prepare-placement').isDisabled(),true);
  assert.equal(await page.locator('#placement-copy-form').isVisible(),true);
  assert.equal(await page.locator('#placement-site option').count(),1);
  assert.deepEqual(await page.locator('.coordinate-fields input').evaluateAll(inputs=>inputs.filter(i=>i.id.startsWith('placement-')).map(i=>Number(i.value))),[-272,79,-477]);
  assert.equal(await page.locator('#create-placement-copy').isEnabled(),true);
  await page.locator('#placement-x').fill('-273');
  assert.equal(await page.locator('#create-placement-copy').isDisabled(),true);
  assert.match(await page.locator('#placement-fit').textContent(),/Outside this plot/);
  await page.locator('#placement-x').fill('-272');
  await page.locator('#placement-turns').selectOption('1');
  assert.equal(await page.locator('#create-placement-copy').isDisabled(),true);
  await page.locator('#placement-turns').selectOption('0');
  await page.screenshot({path:'/tmp/placement-desktop.png',fullPage:true});
  for(const width of [390,320]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no overflow at '+width);
   await page.locator('#place-workspace').scrollIntoViewIfNeeded();
   await page.screenshot({path:'/tmp/placement-mobile-'+width+'.png',fullPage:false});
  }
  await page.setViewportSize({width:1440,height:1000});
  if(write){
   await page.locator('#create-placement-copy').click();await settled();
   assert.notEqual(await page.getAttribute('body','data-draft'),id);
   const copyId=await page.getAttribute('body','data-draft'),copy=await(await fetch(base+'/api/workspace/drafts/'+copyId)).json();
   console.log('COPY',JSON.stringify({id:copyId,valid:copy.valid,diagnostics:copy.diagnostics,siteId:copy.siteId,transform:copy.transform}));
   assert.deepEqual(copy.candidate.blocks,original.candidate.blocks,'all geometry preserved');
   assert.deepEqual(await(await fetch(base+'/api/workspace/drafts/'+id)).json(),original,'original unchanged');
   assert.equal(copy.valid,true,'copy compiles and fits target survey');
   assert.equal(await page.locator('#placement-readiness').getAttribute('data-state'),'unsaved');
   await page.locator('#placement-save').click();await settled();
   assert.equal(await page.locator('#placement-readiness').getAttribute('data-state'),'ready');
   await page.reload();await settled();
   assert.equal(await page.locator('#placement-readiness').getAttribute('data-state'),'ready','saved version survives reload');
   await page.locator('#prepare-placement').click();await settled();
   console.log('PREVIEW',await page.locator('#placement-outcome').textContent(),await page.locator('#studio-alert-message').textContent());
   // Force a representative preparation rejection to exercise the persistent warning, without any writes.
   await page.route('**/construction/prepare',route=>route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'Survey world differs from the isolated bridge world'})}));
   await page.locator('#prepare-placement').click();await settled();
   assert.equal(await page.locator('#studio-alert').isVisible(),true);
   assert.match(await page.locator('#studio-alert-message').textContent(),/Open Build/);
   await page.locator('#refresh-placement').click();await settled();
   assert.equal(await page.locator('#studio-alert').isVisible(),true,'unrelated success does not clear error');
   await setTheme(page,'oled');
   await page.setViewportSize({width:390,height:844});
   const banner=await page.locator('#studio-alert').boundingBox();assert.ok(banner.y>=0&&banner.y+banner.height<=844,'error stays within view');
   await page.screenshot({path:'/tmp/placement-alert-mobile.png',fullPage:false});
   await page.locator('#dismiss-alert').click();assert.equal(await page.locator('#studio-alert').isVisible(),false);
  }
  await page.route('**/construction/status',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({connected:false})}));
  await page.locator('#refresh-placement').click();await settled();
  assert.equal(await page.locator('#placement-readiness').getAttribute('data-state'),'offline');
  assert.equal(await page.locator('#prepare-placement').isDisabled(),true);
  await page.unroute('**/construction/status');
  await page.route('**/construction/status',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({...connected,capabilities:{...connected.capabilities,placement:0}})}));
  await page.locator('#refresh-placement').click();await settled();
  assert.equal(await page.locator('#placement-readiness').getAttribute('data-state'),'read-only');
  assert.equal(await page.locator('#prepare-placement').isDisabled(),true);
  assert.deepEqual(worldWrites,[]);assert.deepEqual(errors,[]);
  console.log('PLACEMENT_UI_PASS '+(write?'copy compilation, original preserved, save/reload, preview and persistent errors; ':'')+'visible mismatch, bounds, rotation, 390/320 layout; no world writes');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
