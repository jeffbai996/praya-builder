const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 if(process.env.BUILDER_ISOLATED_WRITE_TEST!=='1')throw Error('Explicit isolated write-test flag required');
 const base=process.env.PREVIEW_BASE_URL||'http://127.0.0.1:8092',root=process.env.BUILDER_WORKSPACE_DIR;
 const request=async route=>{const r=await fetch(base+'/api/workspace/'+route);const result=await r.json();if(!r.ok)throw Error(result.error);return result;};
 const index=await request('context'),chosen=index.drafts.find(d=>d.name==='Paired garden apartments');assert.ok(chosen);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/studio?draft='+chosen.id);await page.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy==='false');
  await page.locator('#prepare-placement').click();await page.waitForFunction(()=>!document.querySelector('#apply-placement').disabled&&document.body.dataset.busy==='false',null,{timeout:60000});
  await page.locator('#apply-placement').click();await page.waitForFunction(()=>{const j=document.querySelector('#placement-summary').dataset;return j.applied>0&&j.state==='applying';},null,{timeout:60000});
  await page.locator('#cancel-placement').click();await page.waitForFunction(()=>{const j=document.querySelector('#placement-summary').dataset;return j.state==='paused'&&document.body.dataset.busy==='false';});
  await page.waitForTimeout(500);await page.locator('#reconcile-placement').click();await page.waitForFunction(()=>!document.querySelector('#apply-placement').disabled&&document.body.dataset.busy==='false');
  await page.locator('#apply-placement').click();await page.waitForFunction(()=>document.querySelector('#placement-summary').dataset.state==='completed',null,{timeout:90000});
  const placed=await page.locator('#placement-summary').evaluate(e=>({...e.dataset}));assert.equal(placed.applied,placed.cells);
  await page.screenshot({path:path.join(root,'studio-placement.png'),fullPage:true});
  await page.locator('#rollback-placement').click();await page.waitForFunction(()=>!document.querySelector('#apply-placement').disabled&&document.body.dataset.busy==='false');
  await page.locator('#apply-placement').click();await page.waitForFunction(()=>document.querySelector('#placement-summary').dataset.state==='completed',null,{timeout:90000});
  const rolled=await page.locator('#placement-summary').evaluate(e=>({...e.dataset}));assert.equal(rolled.kind,'rollback');assert.equal(rolled.applied,placed.cells);assert.deepEqual(errors,[]);
  console.log('STUDIO_PLACEMENT_PASS preview, apply, pause, reconcile, resume, observed completion, rollback; cells='+placed.cells);
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
