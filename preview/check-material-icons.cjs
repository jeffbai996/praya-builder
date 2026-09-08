const {setTheme}=require('./check-theme-control.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

async function main(){
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,
    args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[],requests=new Map();
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(request.url().includes('/api/material-icon/'))requests.set(request.url(),(requests.get(request.url())||0)+1);});
    const output=path.join(__dirname,'test-output');fs.mkdirSync(output,{recursive:true});
    await page.goto(process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091');
    const ready=()=>page.waitForFunction(()=>window.previewStatus?.().ready);
    const iconsReady=()=>page.waitForFunction(()=>document.querySelectorAll('.material-icon').length>0&&!document.querySelector('.material-icon[data-status="pending"]'));
    await ready();await page.click('[data-tab="materials"]');await iconsReady();
    const original=await page.locator('#materials').innerText();
    for(const project of ['courtyard','terrace','library','clinic','market','school','postmodern','braemar','mansion']){
      await page.selectOption('#project',project);await ready();await iconsReady();
      assert.equal(await page.locator('.material-icon[data-status="unavailable"]').count(),0,project);
      assert(await page.locator('.material-icon img').count()>0);
      assert(await page.locator('.material-icon img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth===80&&image.alt==='')));
    }
    assert([...requests.values()].every(count=>count===1),'thumbnails cached across projects');
    await page.selectOption('#project','courtyard');await ready();await iconsReady();
    assert.equal(await page.locator('#materials').innerText(),original);
    assert.equal(await page.locator('[data-material="air"]').getAttribute('data-status'),'empty');
    await page.screenshot({path:path.join(output,'materials-light.png')});
    await setTheme(page,'dark');await page.screenshot({path:path.join(output,'materials-dark.png')});
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#materials').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(output,'materials-mobile.png')});
    await page.route('**/api/material-icon/*',route=>route.fulfill({status:503,body:'Unavailable'}));
    await page.reload();await ready();await page.click('[data-tab="materials"]');await iconsReady();
    assert(await page.locator('.material-icon[data-status="unavailable"]').count()>0);
    const rows=await page.locator('#materials li').evaluateAll(rows=>rows.map(row=>({name:row.querySelector('.material-name').textContent,count:row.querySelector('strong').textContent})));
    assert(rows.every(row=>row.name.length>0&&Number(row.count.replaceAll(',',''))>0));
    assert.deepEqual(errors,[]);console.log('MATERIAL_ICONS_BROWSER_PASS');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
