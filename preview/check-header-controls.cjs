const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {setTheme}=require('./check-theme-control.cjs');
const assert=require('node:assert/strict'),path=require('node:path');
async function main(){
 const base=process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091',out=process.env.BUILDER_EVIDENCE_DIR||'/tmp';
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/','/studio']){
   await page.goto(base+route);await page.waitForFunction(()=>document.querySelector('#theme-toggle')?.dataset.theme);
   assert.equal(await page.locator('select[aria-label="Workspace theme"]').count(),0);
   assert.doesNotMatch(await page.locator('body').innerText(),/Ã|Â|â[–˜Œ€]|\uFFFD/);
   const toggle=page.locator('#theme-toggle');assert.ok((await toggle.boundingBox()).width>=44);
   await setTheme(page,'light');await toggle.focus();await page.keyboard.press('Enter');assert.equal(await page.getAttribute('html','data-theme'),'dark');
   await page.keyboard.press('Space');assert.equal(await page.getAttribute('html','data-theme'),'oled');assert.match(await toggle.getAttribute('aria-label'),/OLED black.*Light/);
   await page.reload();await page.waitForFunction(()=>document.querySelector('#theme-toggle')?.dataset.theme==='oled');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(route==='/')assert.equal(await page.locator('.navigation nav .nav-icon').count(),4);
   else{const link=page.getByRole('link',{name:'Project register',exact:true});assert.equal(await link.locator('svg').count(),1);assert.equal(await link.evaluate(e=>getComputedStyle(e).textDecorationLine),'none');assert.equal(await link.getAttribute('href'),'/?panel=register');}
   await page.screenshot({path:path.join(out,route==='/'?'review-header-mobile.png':'studio-header-mobile.png')});
  }
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(out,'studio-header-desktop.png')});
  assert.deepEqual(errors,[]);console.log('HEADER_CONTROLS_PASS clean SVG navigation, icon theme cycle, keyboard, persistence, shared pages, mobile header and register link');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
