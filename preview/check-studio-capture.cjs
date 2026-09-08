const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
async function main(){
 const base=process.env.PREVIEW_BASE_URL||'http://127.0.0.1:8092',out=process.env.BUILDER_WORKSPACE_DIR;assert.ok(out);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/studio');await page.waitForFunction(()=>document.body.dataset.busy==='false');await page.locator('#map-panel summary').first().click();await page.locator('#connected-selection').click();
  await page.waitForFunction(()=>!document.querySelector('#capture-start').disabled);
  const selection=await page.locator('#capture-select').inputValue();assert.ok(selection);
  await page.locator('#capture-start').click();await page.waitForFunction(()=>document.querySelector('#capture-result').dataset.state==='reading');await page.locator('#capture-cancel').click();await page.waitForFunction(()=>document.querySelector('#capture-result').dataset.state==='cancelled');
  assert.equal((await(await fetch(base+'/api/workspace/context')).json()).sites.length,0);
  await page.locator('#capture-start').click();const start=Date.now();
  await page.waitForFunction(()=>['completed','failed'].includes(document.querySelector('#capture-result').dataset.state),{},{timeout:180000});
  assert.equal(await page.locator('#capture-result').getAttribute('data-state'),'completed',await page.locator('#capture-result').textContent());const elapsed=Date.now()-start;
  await page.reload();await page.waitForFunction(()=>document.body.dataset.busy==='false');await page.locator('#map-panel summary').first().click();await page.locator('#capture-select').selectOption(selection);await page.locator('#capture-open').waitFor({state:'visible'});
  assert.equal(await page.locator('#capture-history option').count(),3);await page.locator('#capture-open').click();await page.waitForFunction(()=>document.querySelector('#studio-status').textContent.startsWith('Verified survey opened'));
  const siteId=await page.locator('#site-select').inputValue(),site=await(await fetch(base+'/api/workspace/sites/'+siteId)).json();assert.equal(site.world,'builder-isolated');assert.equal(site.complete,true);assert.ok(site.blocks.length>0);assert.equal(site.selectionId,selection);
  await page.locator('#new-proposals').click();await page.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy==='false',null,{timeout:90000});
  const drafts=(await(await fetch(base+'/api/workspace/context')).json()).drafts.filter(d=>d.siteId===siteId);assert.equal(drafts.length,3);assert.ok(drafts.every(d=>d.valid));
  await page.screenshot({path:path.join(out,'capture-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(out,'capture-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'STUDIO_CAPTURE_PASS',elapsedMs:elapsed,blocks:site.blocks.length,siteId,frontage:site.frontage,checks:['live Paper capture','cancel','second-pass verification','reload history','open survey','mobile']}));
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
