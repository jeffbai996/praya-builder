const {setTheme}=require('./check-theme-control.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const path=require('node:path');const assert=require('node:assert/strict');const fs=require('node:fs');const {execFileSync}=require('node:child_process');
const base=process.env.PREVIEW_BASE_URL||'http://127.0.0.1:8092',workspace=process.env.BUILDER_WORKSPACE_DIR;
async function main(){
 const ready=await fetch(base+'/api/workspace/context');assert.equal(ready.status,200);
 const removed=await fetch(base+'/api/workspace/session',{method:'POST',headers:{'X-Builder-Write':'1','Content-Type':'application/json'},body:'{}'});assert.equal(removed.status,404);
 const simple=await fetch(base+'/api/workspace/fixtures',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(simple.status,403);
 const cross=await fetch(base+'/api/workspace/fixtures',{method:'POST',headers:{'X-Builder-Write':'1',Origin:'https://untrusted.example','Content-Type':'application/json'},body:JSON.stringify({kind:'flat'})});assert.equal(cross.status,403);
 assert.equal(fs.existsSync(path.join(workspace,'operator.token')),false);
 const cliEnv={...process.env,BUILDER_WORKSPACE_URL:base};delete cliEnv.BUILDER_WORKSPACE_TOKEN;
 const cli=(...args)=>JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'workspace-cli.cjs'),...args],{env:cliEnv,encoding:'utf8'}));
 assert.ok(Array.isArray(cli('context').drafts));
 const requestFile=path.join(workspace,'cli-fixture-request.json');fs.writeFileSync(requestFile,JSON.stringify({kind:'flat'}));
 try{assert.ok(cli('fixtures',requestFile).id);}finally{fs.unlinkSync(requestFile);}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1080}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/studio');await page.locator('#studio-main').waitFor({state:'visible'});
  const initialDrafts=await page.locator('#draft-select option').count();
  await page.locator('#fixture-slope').click();await page.waitForFunction(()=>document.querySelector('#site-select').value&&document.body.dataset.busy==='false');
  await page.locator('#new-proposals').click();await page.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy==='false',null,{timeout:90000});
  assert.equal(await page.locator('#draft-select option').count(),initialDrafts+3);assert.match(await page.locator('#candidate-state').textContent(),/Valid/);
  const draftId=await page.getAttribute('body','data-draft');
  await page.locator('#studio-component').selectOption('home-1-1-envelope');await page.locator('#material-role').selectOption('brick');await page.locator('#material-choice').selectOption('minecraft:gray_terracotta');
  const before=await(await fetch(`${base}/api/workspace/drafts/${draftId}`)).json();
  await page.locator('#apply-material').click();await page.waitForFunction(v=>document.querySelector('#candidate-summary').textContent.includes('draft version '+v)&&document.body.dataset.busy==='false',before.version+1,{timeout:60000});
  const after=await(await fetch(`${base}/api/workspace/drafts/${draftId}`)).json();
  assert.notEqual(after.candidate.hash,before.candidate.hash);const unchanged=after.candidate.blocks.filter(c=>c.component!=='home-1-1-envelope');assert.deepEqual(unchanged,before.candidate.blocks.filter(c=>c.component!=='home-1-1-envelope'));
  await page.locator('#undo-draft').click();await page.waitForFunction(()=>document.body.dataset.busy==='false');
  await page.locator('#redo-draft').click();await page.waitForFunction(()=>document.body.dataset.busy==='false');
  await page.locator('#studio-component').selectOption('wing-0-roof');await page.locator('#roof-variant').selectOption('open');await page.locator('#apply-variant').click();await page.waitForFunction(()=>document.body.dataset.busy==='false');
  assert.match(await page.locator('#candidate-state').textContent(),/Valid/);
  await page.locator('#undo-draft').click();await page.waitForFunction(()=>document.body.dataset.busy==='false');
  await page.locator('#save-revision').click();await page.waitForFunction(()=>document.querySelector('#studio-status').textContent.startsWith('Saved revision of'));
  const handoffPromise=page.waitForEvent('download');await page.locator('#download-handoff').click();const handoff=await handoffPromise;const packageFile=path.join(workspace,'placement-package.json');await handoff.saveAs(packageFile);const bundle=JSON.parse(fs.readFileSync(packageFile));assert.equal(bundle.kind,'builder-placement-handoff');assert.equal(bundle.execution,'review-required');assert.equal(bundle.artifactHash,bundle.artifact.hash);assert.ok(bundle.surveyHash);assert.equal(bundle.world,'builder-isolated');
  await page.reload();await page.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy==='false');assert.equal(await page.getAttribute('body','data-draft'),draftId);
  for(const theme of ['light','dark','oled']){await setTheme(page,theme);await page.screenshot({path:path.join(workspace,'studio-'+theme+'.png'),fullPage:true});}
  for(const view of ['front','side','rear','roof']){await page.locator(`[data-studio-view=${view}]`).click();await page.waitForTimeout(250);await page.screenshot({path:path.join(workspace,'study-'+view+'.png')});}
  await page.locator('#studio-ceiling').selectOption('6');await page.waitForFunction(()=>document.body.dataset.busy==='false');await page.screenshot({path:path.join(workspace,'study-ground.png')});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(workspace,'studio-mobile.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);console.log('STUDIO_PASS site import, three proposals, scoped edit, undo/redo, save/reload, themes, mobile; draft='+draftId);
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
