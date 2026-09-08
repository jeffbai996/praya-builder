const {setTheme}=require('./check-theme-control.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
async function main(){
 const base=process.env.PREVIEW_BASE_URL||'http://127.0.0.1:8091',id=process.env.BUILDER_SITE_ID,out=process.env.BUILDER_EVIDENCE_DIR;assert.ok(id&&out,'Set site ID and evidence directory');
 const get=async route=>(await(await fetch(base+'/api/workspace/'+route)).json());
 const site=await get('sites/'+id),before=await get('context');assert.equal(site.complete,true);assert.equal(site.source,'paper-survey');assert.equal(site.plot.max[0]-site.plot.min[0],27);assert.equal(site.plot.max[2]-site.plot.min[2],15);
 const capture=await get('capture/status'),construction=await get('construction/status');assert.equal(capture.world,site.world);assert.equal(capture.worldId,site.worldId);assert.equal(capture.capabilities.placement,0);assert.notEqual(construction.worldId,capture.worldId);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/studio?site='+id);await page.waitForFunction(id=>document.querySelector('#site-select').value===id&&document.body.dataset.busy==='false',id,{timeout:90000});
  assert.equal(await page.locator('#drawing-empty').isVisible(),false);assert.equal(await page.locator('#new-proposals').isDisabled(),true);assert.equal(await page.locator('#draft-select').inputValue(),'');assert.match(await page.locator('#site-summary').textContent(),/27 × 15 plot/);
  const surface=await get('sites/'+id+'/mesh?depth=surface'),full=await get('sites/'+id+'/mesh?depth=full');assert.ok(surface.floor>0);assert.equal(full.floor,0);assert.equal((await get('sites/'+id)).hash,site.hash);
  await page.locator('#context-depth').check();await page.waitForFunction(()=>document.body.dataset.busy==='false');await page.locator('#context-depth').uncheck();await page.waitForFunction(()=>document.body.dataset.busy==='false');
  await setTheme(page,'oled');await page.screenshot({path:path.join(out,'praya-site-desktop.png'),fullPage:true});
  await page.reload();await page.waitForFunction(id=>document.querySelector('#site-select').value===id&&document.body.dataset.busy==='false',id,{timeout:90000});assert.equal(await page.locator('#draft-select').inputValue(),'');
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(out,'praya-site-mobile.png'),fullPage:true});assert.deepEqual(errors,[]);
  const response=await fetch(base+'/api/workspace/proposals',{method:'POST',headers:{'X-Builder-Write':'1','Content-Type':'application/json'},body:JSON.stringify({siteId:id})});assert.equal(response.status,400);assert.match((await response.json()).error,/bespoke plan/);assert.equal((await get('context')).drafts.length,before.drafts.length);
  console.log('PRAYA_SURVEY_PASS exact plot, surrounding context, read-only connection, preserved construction adapter, reloadable site link, template fit guard, OLED/mobile; no world writes');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
