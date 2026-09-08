const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
async function main(){
 const map=process.env.BUILDER_MAP_URL;if(!map)throw Error('Set BUILDER_MAP_URL');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(map,{waitUntil:'domcontentloaded'});const link=page.locator('#builder-studio-link');await link.waitFor({timeout:60000});await page.waitForFunction(()=>location.hash.split(':').length>=4);
  await page.locator('#builder-select-plot').click();await page.mouse.click(490,390);await page.waitForFunction(()=>document.querySelector('#builder-selection-note').textContent==='Click the opposite corner.');await page.mouse.click(510,410);
  await page.waitForFunction(()=>document.querySelector('#builder-selection-note').textContent.includes('blocks selected.'));assert.equal(await link.getAttribute('aria-disabled'),'false');
  assert.ok(await page.locator('#builder-plot-outline polygon').getAttribute('points'));
  const target=new URL(await link.getAttribute('href')),popupPromise=page.waitForEvent('popup');await link.click();const studio=await popupPromise;await studio.waitForLoadState('domcontentloaded');studio.on('pageerror',e=>errors.push(e.message));
  await studio.waitForFunction(()=>Boolean(document.querySelector('#plot-x')?.value)&&Boolean(document.querySelector('#plot-z')?.value),{timeout:60000});
  assert.equal(Number(await studio.locator('#plot-width').inputValue()),Number(target.searchParams.get('maxX'))-Number(target.searchParams.get('minX')));assert.equal(Number(await studio.locator('#plot-depth').inputValue()),Number(target.searchParams.get('maxZ'))-Number(target.searchParams.get('minZ')));
  assert.equal(await studio.locator('#plot-base').inputValue(),'');assert.equal(await studio.locator('#build-number').textContent(),'b20260906.07');
  const out=process.env.BUILDER_EVIDENCE_DIR||path.join(__dirname,'test-output');await page.screenshot({path:path.join(out,'bluemap-studio-link.png')});await studio.screenshot({path:path.join(out,'bluemap-studio-handoff.png')});assert.deepEqual(errors,[]);
  console.log('BLUEMAP_HANDOFF_PASS live two-corner map selection, visible outline, exact plot dimensions in studio; no game writes');
 }
 finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
