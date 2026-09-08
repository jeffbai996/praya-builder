const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
async function main(){
  const base=process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091';
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,
    args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1050},acceptDownloads:true}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const output=path.join(__dirname,'test-output');fs.mkdirSync(output,{recursive:true});
    for(const [project,revision,layers] of [['postmodern','r2',['4','20','24']],['mansion','r1',['5','10','17']]]){
      await page.goto(base+`/?project=${project}&revision=${revision}`);
      const ready=()=>page.waitForFunction(()=>window.previewStatus?.().ready);await ready();
      assert.equal((await page.evaluate(()=>previewStatus())).revision,revision);
      for(const view of ['front','side','rear']){
        await page.click(`[data-view="${view}"]`);await page.click('#fit-model');
        await page.screenshot({path:path.join(output,`${project}-${revision}-${view}.png`)});
      }
      await page.click('[data-view="side"]');await page.locator('#model').focus();
      for(let i=0;i<26;i++)await page.keyboard.press('ArrowRight');
      await page.click('#fit-model');await page.screenshot({path:path.join(output,`${project}-${revision}-west.png`)});
      await page.click('[data-view="roof"]');
      for(const layer of layers){
        await page.selectOption('#ceiling',layer);await ready();await page.click('#fit-model');
        await page.screenshot({path:path.join(output,`${project}-${revision}-floor-${layer}.png`)});
      }
      const current=await page.evaluate(()=>previewStatus());
      const response=await page.request.get(base+`/api/schematic/${project}/${revision}?hash=${current.hash}`);
      assert.equal(response.status(),200);assert.equal(response.headers()['x-artifact-hash'],current.hash);
      fs.writeFileSync(path.join(output,`${project}-${revision}.schem`),await response.body());
      const parent=project==='postmodern'?'r1':'r0';
      await page.selectOption('#revision',parent);await ready();
      assert.deepEqual((await page.evaluate(()=>previewStatus())).camera,current.camera);
      await page.selectOption('#revision',revision);await ready();assert.equal((await page.evaluate(()=>previewStatus())).hash,current.hash);
    }
    assert.deepEqual(errors,[]);console.log('COMPLETE_ELEVATIONS_BROWSER_PASS');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
