// Uses an existing Playwright installation; no browser is downloaded by this script.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
async function main(){
  const output=path.join(__dirname,'test-output');fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,
    args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  try {
    const context=await browser.newContext({viewport:{width:1600,height:1000},acceptDownloads:true});
    const page=await context.newPage();const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091');
    await page.waitForFunction(()=>window.previewStatus?.().ready,{timeout:30000});
    assert.equal(await page.getAttribute('body','data-revision'),'r2');
    assert((await page.evaluate(()=>window.previewStatus().metrics.triangles))>0);
    await page.screenshot({path:path.join(output,'revision-02.png')});
    const camera=await page.evaluate(()=>window.previewStatus().camera);
    await page.selectOption('#revision','r1');
    await page.waitForFunction(()=>window.previewStatus?.().ready&&window.previewStatus().revision==='r1');
    assert.deepEqual(await page.evaluate(()=>window.previewStatus().camera),camera);
    await page.screenshot({path:path.join(output,'revision-01.png')});
    await page.selectOption('#revision','r0');
    await page.waitForFunction(()=>window.previewStatus?.().ready&&window.previewStatus().revision==='r0');
    assert.deepEqual(await page.evaluate(()=>window.previewStatus().camera),camera);
    await page.screenshot({path:path.join(output,'initial-study.png')});
    await page.selectOption('#revision','r2');
    await page.waitForFunction(()=>window.previewStatus?.().ready&&window.previewStatus().revision==='r2');
    assert.match(await page.textContent('#diff'),/Versus R1:/);
    await page.check('#changes');assert((await page.evaluate(()=>window.previewStatus().changes))>0);
    await page.screenshot({path:path.join(output,'revision-diff.png')});
    await page.uncheck('#changes');
    await page.selectOption('#ceiling','9');await page.waitForFunction(()=>window.previewStatus?.().ready);
    await page.click('[data-view="roof"]');await page.waitForTimeout(250);
    await page.screenshot({path:path.join(output,'floor-cutaway.png')});
    await page.selectOption('#component','stairs');assert.match(await page.textContent('#selection'),/stair/i);
    await page.selectOption('#component','');
    const viewport=await page.locator('#model').boundingBox();
    await page.mouse.click(viewport.x+viewport.width*.5,viewport.y+viewport.height*.5);
    assert.match(await page.textContent('#selection'),/minecraft:/);
    await page.selectOption('#ceiling','24');await page.waitForFunction(()=>window.previewStatus?.().ready);
    await page.click('[data-view="perspective"]');await page.waitForTimeout(200);
    for(const button of ['left','right']) {
      const previousCamera=await page.evaluate(()=>window.previewStatus().camera);
      await page.mouse.move(viewport.x+viewport.width*.65,viewport.y+viewport.height*.5);
      await page.mouse.down({button});await page.mouse.move(viewport.x+viewport.width*.65+80,viewport.y+viewport.height*.5+30,{steps:8});
      await page.mouse.up({button});await page.waitForTimeout(250);
      assert.notDeepEqual(await page.evaluate(()=>window.previewStatus().camera),previousCamera);
    }
    const beforeZoom=await page.evaluate(()=>window.previewStatus().camera);
    await page.mouse.wheel(0,-300);await page.waitForTimeout(250);
    assert.notDeepEqual(await page.evaluate(()=>window.previewStatus().camera),beforeZoom);
    await page.click('[data-view="perspective"]');await page.waitForTimeout(200);
    const before=await page.evaluate(()=>window.previewStatus().camera);
    await page.focus('#model');await page.keyboard.press('ArrowLeft');await page.waitForTimeout(100);
    assert.notDeepEqual(await page.evaluate(()=>window.previewStatus().camera),before);
    await page.click('[data-view="perspective"]');
    const downloadPromise=page.waitForEvent('download');await page.click('#download');const download=await downloadPromise;
    const png=path.join(output,'export.png');await download.saveAs(png);
    assert.equal(fs.readFileSync(png).subarray(1,4).toString(),'PNG');
    await page.setViewportSize({width:640,height:900});await page.waitForTimeout(200);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(output,'narrow.png')});
    // A failed revision load must not display the old geometry as current.
    await page.route('**/api/mesh/courtyard/r0**',route=>route.fulfill({status:500,body:'test failure'}));
    await page.selectOption('#revision','r0');await page.waitForSelector('#loading.error');
    assert(await page.isDisabled('#download'));
    assert.equal(await page.getAttribute('body','data-ready'),'false');
    await page.unroute('**/api/mesh/courtyard/r0**');
    await page.selectOption('#revision','r2');await page.waitForFunction(()=>window.previewStatus?.().ready);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'BROWSER_PASS',errors,screenshots:output,status:await page.evaluate(()=>window.previewStatus())}));
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
