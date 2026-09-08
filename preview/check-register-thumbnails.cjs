const {setTheme}=require('./check-theme-control.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

async function main(){
  const base=process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091';
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,
    args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[],meshRequests=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(request.url().includes('/api/mesh/'))meshRequests.push(request.url());});
    await page.goto(base);await page.waitForFunction(()=>window.previewStatus?.().ready);
    const projects=await (await page.request.get(base+'/api/projects')).json();
    const before=meshRequests.length;
    await page.click('[data-panel="register"]');
    assert.equal(await page.locator('.project-thumbnail').count(),projects.length,'one real image per project');
    const urls=[],bytes=[];
    for(const project of projects){
      const latest=project.revisions.find(revision=>revision.id===project.latest);
      const card=page.locator(`.project-card[data-id="${project.id}"]`);
      await card.scrollIntoViewIfNeeded();
      await card.locator('.project-thumbnail[data-status="ready"]').waitFor();
      const image=card.locator('.project-thumbnail img');
      const src=await image.getAttribute('src');urls.push(src);
      assert(src.includes(`/${project.id}/${latest.id}?hash=${latest.hash}`));
      assert(await image.evaluate(img=>img.complete&&img.naturalWidth===640&&img.naturalHeight===400));
      assert.equal(await image.getAttribute('alt'),`${project.name}, ${latest.id.toUpperCase()} exterior`);
      assert.match(await card.locator('.thumbnail-revision').innerText(),new RegExp(latest.id.toUpperCase()));
      const response=await page.request.get(base+src);
      assert.equal(response.status(),200);assert.equal(response.headers()['content-type'],'image/png');
      assert.equal(response.headers()['x-artifact-hash'],latest.hash);
      assert.match(response.headers()['cache-control'],/private.*immutable/);
      const conditional=await page.request.get(base+src,{headers:{'If-None-Match':response.headers().etag}});
      assert.equal(conditional.status(),304);
      bytes.push((await response.body()).toString('base64'));
      const coverage=await image.evaluate(img=>{
        const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
        const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,640,400).data;
        let filled=0,edge=0;
        for(let y=0;y<400;y++)for(let x=0;x<640;x++)if(pixels[(y*640+x)*4+3]>128){filled++;if(x<4||x>635||y<4||y>395)edge++;}
        return {filled,edge};
      });
      assert(coverage.filled>10000&&coverage.filled<230000,project.id+' has a visible model and margin');
      assert.equal(coverage.edge,0,project.id+' is not clipped');
    }
    assert.equal(new Set(bytes).size,projects.length,'distinct buildings, no shared placeholder');
    assert.equal(meshRequests.length,before,'register loads PNGs without extra 3D meshes');
    const target=urls[0],plain=target.split('?')[0];
    for(const [suffix,status] of [['',400],['?hash=bad',400],['?hash='+'0'.repeat(64),409],
      [target.slice(target.indexOf('?'))+'&extra=1',400],[target.slice(target.indexOf('?'))+'&hash='+'0'.repeat(64),400]]){
      const response=await page.request.get(base+plain+suffix);assert.equal(response.status(),status);
      assert.equal(response.headers()['cache-control'],'no-store');
    }
    assert.equal((await page.request.get(base+'/api/thumbnail/v1/unknown/r0?hash='+'0'.repeat(64))).status(),404);
    assert.equal((await page.request.get(base+target.replace('/v1/','/v99/'))).status(),404);
    const rendererPage=await browser.newPage();await rendererPage.goto(base+'/thumbnail-render.html');
    const mismatch=await rendererPage.evaluate(async input=>{
      const {renderThumbnail}=await import('/thumbnail-render.js');
      try{await renderThumbnail(input);return 'accepted';}catch(error){return error.message;}
    },{project:projects[0].id,revision:projects[0].latest,hash:'0'.repeat(64),ceiling:projects[0].layers[0].value});
    assert.equal(mismatch,'Thumbnail artifact identity mismatch');await rendererPage.close();
    const output=path.join(__dirname,'test-output');fs.mkdirSync(output,{recursive:true});
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'register-thumbnails-light.png'),fullPage:true});
    await setTheme(page,'dark');await page.screenshot({path:path.join(output,'register-thumbnails-dark.png'),fullPage:true});
    await page.fill('#search','library');assert.equal(await page.locator('.project-card:visible').count(),1);
    await page.click('[data-open-project="library"]');await page.waitForFunction(()=>window.previewStatus?.().ready&&previewStatus().project==='library');
    assert.equal((await page.evaluate(()=>previewStatus())).revision,'r0');
    await page.fill('#search','');await page.setViewportSize({width:390,height:844});
    await page.locator('.project-card').first().scrollIntoViewIfNeeded();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(output,'register-thumbnails-mobile.png'),fullPage:true});
    await page.setViewportSize({width:900,height:1000});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(output,'register-thumbnails-tablet.png'),fullPage:true});
    // A missing image must leave the project usable and offer an explicit retry.
    await page.route('**/api/thumbnail/**',route=>route.fulfill({status:503,body:'Unavailable'}));
    await page.reload();await page.waitForFunction(()=>window.previewStatus?.().ready);
    await page.click('[data-panel="register"]');
    const first=page.locator('.project-card').first();await first.scrollIntoViewIfNeeded();
    await first.locator('.project-thumbnail[data-status="unavailable"]').waitFor();
    assert(await first.locator('[data-open-project]').isEnabled());
    await page.unroute('**/api/thumbnail/**');await first.getByRole('button',{name:'Retry preview'}).click();
    await first.locator('.project-thumbnail[data-status="ready"]').waitFor();
    assert.deepEqual(errors,[]);
    console.log(`REGISTER_THUMBNAILS_PASS count=${projects.length} bytes=${bytes.reduce((sum,b)=>sum+Buffer.from(b,'base64').length,0)}`);
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
