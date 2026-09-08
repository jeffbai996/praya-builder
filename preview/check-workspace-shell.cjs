const {setTheme}=require('./check-theme-control.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
async function main(){
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,
    args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091');
    await page.waitForFunction(()=>window.previewStatus?.().ready);
    assert.equal(await page.locator('#theme-toggle svg').count(),1,'Theme control uses an SVG icon');
    await setTheme(page,'oled');await page.reload();
    await page.waitForFunction(()=>window.previewStatus?.().ready);
    assert.equal(await page.getAttribute('html','data-theme'),'oled');
    assert.equal(await page.getAttribute('#theme-toggle','data-theme'),'oled');
    for(const selector of ['body','.navigation','.masthead','.drawing-panel','.inspector'])
      assert.equal(await page.locator(selector).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 0, 0)',selector);
    assert.equal(await page.locator('.department-brand .department-seal').count(),1);
    assert.equal(await page.locator('.department-seal').getAttribute('fill'),'none');
    const output=path.join(__dirname,'test-output');fs.mkdirSync(output,{recursive:true});
    await page.screenshot({path:path.join(output,'workspace-oled.png'),fullPage:true});
    // The WebGL background must go black too, not remain the dark theme's grey.
    const black=await page.locator('#model').evaluate(canvas=>{
      const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;
      const ctx=copy.getContext('2d');ctx.drawImage(canvas,0,0);return [...ctx.getImageData(4,4,1,1).data];
    });assert.deepEqual(black,[0,0,0,255]);
    await page.click('[data-panel="register"]');
    await page.selectOption('#register-use',{index:1});
    const filtered=await page.locator('.project-card:visible').count();assert(filtered>0&&filtered<9);
    await page.selectOption('#register-use','');await page.click('[data-layout="records"]');
    assert.equal(await page.getAttribute('#project-cards','data-layout'),'records');
    await page.selectOption('#register-sort','name');
    const names=await page.locator('.project-card h3').allTextContents();
    assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b)));
    await page.screenshot({path:path.join(output,'workspace-records-oled.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(output,'workspace-mobile-oled.png')});
    await setTheme(page,'light');assert.equal(await page.getAttribute('html','data-theme'),'light');
    await setTheme(page,'dark');assert.equal(await page.getAttribute('html','data-theme'),'dark');
    assert.deepEqual(errors,[]);console.log('WORKSPACE_SHELL_PASS');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
