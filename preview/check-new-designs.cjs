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
    const output=path.join(__dirname,'test-output');fs.mkdirSync(output,{recursive:true});
    for(const [project,cutaway] of [['clinic','5'],['market','5'],['school','10'],['postmodern','24'],['braemar','16'],['mansion','10']]){
      const revision=['braemar','postmodern'].includes(project)?'r2':'r1';
      await page.goto(`${process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091'}/?project=${project}`);
      await page.waitForFunction(()=>window.previewStatus?.().ready);
      const status=await page.evaluate(()=>previewStatus());assert.equal(status.project,project);
      assert.equal(status.revision,revision);
      if(project==='mansion')assert.deepEqual(status.camera.slice(3),[22,8,20]);
      assert.equal(await page.locator('#project option').count(),9);
      assert.equal(await page.inputValue('#ceiling'),['postmodern','braemar'].includes(project)?'32':'24');
      assert.equal(await page.textContent('#connection-label'),'Live');
      assert.equal(await page.textContent('#site-size'),project==='mansion'?'44 × 40':project==='braemar'?'36 × 36':'32 × 32');
      await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
      await page.screenshot({path:path.join(output,`${project}-exterior.png`)});
      if(['braemar','mansion'].includes(project)){
        await page.click('[data-view="front"]');await page.waitForTimeout(300);
        await page.screenshot({path:path.join(output,`${project}-front.png`)});
      }
      await page.click('[data-view="roof"]');await page.waitForTimeout(300);
      await page.screenshot({path:path.join(output,`${project}-roof.png`)});
      if(revision!=='r0'){
        const before=await page.evaluate(()=>previewStatus().camera);
        await page.selectOption('#revision','r0');await page.waitForFunction(()=>previewStatus().ready);
        assert.equal(await page.textContent('#site-size'),project==='mansion'?'44 × 40':'32 × 32');
        const after=await page.evaluate(()=>previewStatus().camera);
        assert(before.every((v,i)=>Math.abs(v-after[i])<.1));
        await page.selectOption('#revision',revision);await page.waitForFunction(()=>previewStatus().ready);
        await page.check('#changes');assert((await page.evaluate(()=>previewStatus().changes))>0);
        await page.uncheck('#changes');
      }
      await page.selectOption('#ceiling',cutaway);
      await page.waitForFunction(()=>window.previewStatus?.().ready);
      await page.click('[data-view="roof"]');await page.waitForTimeout(500);
      await page.screenshot({path:path.join(output,`${project}-cutaway.png`)});
      if(project==='school'){
        await page.selectOption('#ceiling','5');
        await page.waitForFunction(()=>window.previewStatus?.().ready);
        await page.screenshot({path:path.join(output,'school-ground-floor.png')});
      }
      if(project==='braemar')for(const layer of ['10','4']){
        await page.selectOption('#ceiling',layer);await page.waitForFunction(()=>previewStatus().ready);
        await page.screenshot({path:path.join(output,`braemar-floor-${layer}.png`)});
      }
      if(project==='mansion')for(const layer of ['5','17']){
        await page.selectOption('#ceiling',layer);await page.waitForFunction(()=>previewStatus().ready);
        await page.screenshot({path:path.join(output,`mansion-floor-${layer}.png`)});
      }
      console.log(`${project}: ${status.hash}`);
    }
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(output,'school-mobile.png'),fullPage:true});
    await page.setViewportSize({width:1600,height:1050});await page.click('[data-panel="register"]');
    assert.equal(await page.locator('.project-card').count(),9);
    await page.screenshot({path:path.join(output,'project-register.png'),fullPage:true});
    assert.deepEqual(errors,[]);console.log('NEW_DESIGNS_BROWSER_PASS');
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
