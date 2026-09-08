const {setTheme}=require('./check-theme-control.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const nbt=require('prismarine-nbt');

async function main(){
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,
    args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1050},acceptDownloads:true}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const base=process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091';
    const output=path.join(__dirname,'test-output');fs.mkdirSync(output,{recursive:true});
    await page.goto(base+'/?project=mansion&revision=r0');
    const ready=()=>page.waitForFunction(()=>window.previewStatus?.().ready);
    await ready();
    assert(await page.isDisabled('#focus-component'));
    await page.selectOption('#ceiling','5');await ready();
    await page.selectOption('#component','living-room');
    const before=(await page.evaluate(()=>previewStatus())).camera;
    await page.click('#focus-component');await page.waitForTimeout(300);
    const focused=(await page.evaluate(()=>previewStatus())).camera;
    assert.notDeepEqual(focused,before);
    const artifact=await (await page.request.get(base+'/api/artifact/mansion/r0')).json();
    const selected=artifact.blocks.filter(b=>b.component==='living-room'&&b.y<5&&b.block!=='minecraft:air');
    for(const [axis,index] of [['x',3],['y',4],['z',5]]) {
      assert(focused[index]>=Math.min(...selected.map(b=>b[axis])));
      assert(focused[index]<=Math.max(...selected.map(b=>b[axis]+1)));
    }
    await page.click('#fit-model');
    await page.selectOption('#lighting','warm');await page.uncheck('#show-grid');
    assert.deepEqual((await page.evaluate(()=>previewStatus())).presentation,{lighting:'warm',grid:false});
    await page.click('#expand-view');assert(await page.locator('body').evaluate(el=>el.classList.contains('model-expanded')));
    await page.waitForTimeout(500);await page.screenshot({path:path.join(output,'inspection-expanded.png')});
    await page.keyboard.press('Escape');assert.equal(await page.getAttribute('#expand-view','aria-pressed'),'false');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'expand-view');
    await page.click('#export-schematic');
    assert(await page.locator('#export-dialog').isVisible());
    assert.match(await page.textContent('#export-identity'),new RegExp(artifact.hash.slice(0,12)));
    await page.click('.export-instructions summary');
    assert.equal(await page.textContent('#export-load-command'),`//schem load mansion-r0-${artifact.hash.slice(0,12)}.schem`);
    const takeDownload=async(button)=>{
      const pending=page.waitForEvent('download');await page.click(button);const download=await pending;
      const file=path.join(output,download.suggestedFilename());await download.saveAs(file);return file;
    };
    const file=await takeDownload('#download-schematic');
    assert.match(file,/mansion-r0-[a-f0-9]{12}\.schem$/);
    const decoded=nbt.simplify((await nbt.parse(fs.readFileSync(file))).parsed).Schematic;
    assert.equal(decoded.Height,artifact.dimensions.y);
    assert.equal(decoded.Metadata.BuilderArtifactHash,artifact.hash);
    const manifest=JSON.parse(fs.readFileSync(await takeDownload('#download-manifest')));
    assert.equal(manifest.artifactHash,artifact.hash);assert.deepEqual(manifest.artifact,artifact);
    for(const [suffix,status] of [['',400],['?hash=old',409],[`?hash=${artifact.hash}&ceiling=5`,400]])
      assert.equal((await page.request.get(base+'/api/schematic/mansion/r0'+suffix)).status(),status);
    assert.equal((await page.request.get(base+'/api/schematic/unknown/r0?hash=old')).status(),404);
    await page.route('**/api/schematic/**',route=>route.fulfill({status:503,body:'Unavailable'}));
    await page.click('#download-schematic');await page.waitForFunction(()=>document.getElementById('export-message').textContent.includes('failed'));
    assert(!(await page.isDisabled('#download-schematic')));await page.unroute('**/api/schematic/**');
    await page.screenshot({path:path.join(output,'export-dialog.png')});
    await page.keyboard.press('Escape');
    await page.selectOption('#ceiling',String(artifact.dimensions.y));await ready();
    await page.click('#fit-model');await page.selectOption('#lighting','studio');await page.check('#show-grid');
    await page.screenshot({path:path.join(output,'export-workspace-light.png')});
    await setTheme(page,'dark');await page.screenshot({path:path.join(output,'export-workspace-dark.png')});
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.click('#export-schematic');
    assert(await page.evaluate(()=>document.getElementById('export-dialog').getBoundingClientRect().width<=innerWidth));
    await page.screenshot({path:path.join(output,'export-mobile.png'),fullPage:true});
    assert.deepEqual(errors,[]);console.log('EXPORT_TOOLS_BROWSER_PASS');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
