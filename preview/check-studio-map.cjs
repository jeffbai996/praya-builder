const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {fixture}=require('./site-fixtures.cjs'),{exportSchematic}=require('./schematic.cjs'),{hash}=require('./sites.cjs');
async function main(){
 const base=process.env.PREVIEW_BASE_URL||'http://127.0.0.1:8092',root=process.env.BUILDER_WORKSPACE_DIR;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const map='https://map.example.test/#world:16:80:16:100:0:0:0:0:flat';
  await page.goto(base+'/studio?map='+encodeURIComponent(map));await page.waitForFunction(()=>document.querySelector('#plot-x').value==='16');
  assert.equal(await page.locator('#plot-z').inputValue(),'16');assert.equal(await page.locator('#plot-base').inputValue(),'');
  await page.locator('#plot-name').fill('Map capture trial');await page.locator('#plot-base').fill('60');await page.locator('#plot-height').fill('32');
  const mark=async(x,y)=>{await page.locator('#plot-editor').scrollIntoViewIfNeeded();const p=await page.locator('#plot-editor').evaluate((e,{x,y})=>{const p=e.createSVGPoint();p.x=x;p.y=y;const s=p.matrixTransform(e.getScreenCTM());return {x:s.x,y:s.y};},{x,y});await page.mouse.click(p.x,p.y);};
  await mark(4.5,.5);await page.locator('#plot-tool').selectOption('protect');await mark(1.5,1.5);await mark(2.5,2.5);
  await page.locator('#map-selection button.primary-button').click();await page.locator('#capture-guide').waitFor({state:'visible'});
  const selection=await page.locator('#capture-select').inputValue();const saved=await(await fetch(base+'/api/workspace/selections/'+selection)).json();assert.deepEqual(saved.frontage,[4,61,0]);assert.deepEqual(saved.protected,[{min:[1,60,1],max:[3,92,3]}]);
  await page.reload();await page.waitForFunction(()=>document.body.dataset.busy==='false');await page.locator('#capture-select').selectOption(selection);await page.locator('#capture-guide').waitFor({state:'visible'});
  await page.locator('#capture-guide details summary').click();
  await page.locator('#capture-guide details summary').click();
  await page.locator('#capture-guide details summary').click();
  assert.equal(await page.locator('#capture-steps button').count(),4);
  const survey=fixture('flat'),content={schema_version:1,plan_id:'capture-trial',revision:'r0',name:'Capture trial',dimensions:survey.dimensions,components:[{id:'context'}],spaces:[],blocks:survey.blocks};const artifact={...content,hash:hash(content)};
  const file=path.join(root,'capture-trial.schem');fs.writeFileSync(file,exportSchematic(artifact));
  await page.locator('#capture-file').setInputFiles(file);await page.locator('#import-capture').click();await page.waitForFunction(()=>document.querySelector('#studio-status').textContent.startsWith('Survey imported.'));
  const siteId=await page.locator('#site-select').inputValue();const site=await(await fetch(base+'/api/workspace/sites/'+siteId)).json();assert.equal(site.selectionId,selection);assert.deepEqual(site.origin,[0,60,0]);
  const result=await fetch(base+'/api/workspace/selections/'+selection+'/import',{method:'POST',headers:{'X-Builder-Write':'1','Content-Type':'application/json'},body:JSON.stringify({schematic:Buffer.from('bad').toString('base64'),capturedAt:new Date().toISOString()})});assert.equal(result.status,400);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(root,'map-capture-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log('STUDIO_MAP_PASS map handoff, durable selection, guided capture, bound import, malformed input, mobile');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
