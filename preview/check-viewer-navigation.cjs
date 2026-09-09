const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.CHROMIUM_PATH?undefined:'msedge',executablePath:process.env.CHROMIUM_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091';const context=await(await fetch(base+'/api/workspace/context')).json();const draft=process.env.PREVIEW_TEST_DRAFT||context.drafts.find(d=>d.valid)?.id;assert.ok(draft,'a valid draft is required');
 await page.goto(base+'/studio?draft='+draft+'#design-workspace');
 await page.waitForFunction(()=>window.studioStatus?.().ready&&document.body.dataset.busy==='false');
 const camera=()=>page.evaluate(()=>studioStatus().camera),diff=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
 const canvas=page.locator('#studio-model'),nav=page.locator('#studio-navigation');
 assert.equal(await canvas.evaluate(e=>getComputedStyle(e).userSelect),'none');
 await nav.selectOption('pan');const rect=await canvas.boundingBox(),cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;
 let a=await camera();await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+50,cy+90,{steps:12});await page.mouse.up();await page.waitForTimeout(800);let b=await camera();
 assert.ok(diff(a.slice(3),b.slice(3))>1,'pan translates target');
 assert.ok(diff(a.slice(0,3).map((v,i)=>v-a[i+3]),b.slice(0,3).map((v,i)=>v-b[i+3]))<.05,'pan retains viewing direction');
 assert.equal(await page.evaluate(()=>getSelection().toString()),'');
 await nav.selectOption('free');a=await camera();
 await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+70,cy-35,{steps:10});await page.mouse.up();b=await camera();
 assert.ok(diff(a.slice(0,3),b.slice(0,3))<.001,'look does not orbit position');assert.ok(diff(a.slice(3),b.slice(3))>1,'look changes direction');
 await page.keyboard.down('e');await page.waitForTimeout(220);await page.keyboard.up('e');let c=await camera();assert.ok(c[1]>b[1]+.5,'E rises');
 assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('model-expanded')),false,'E must not expand');
 a=await camera();await page.keyboard.down('w');await page.waitForTimeout(220);await page.keyboard.up('w');b=await camera();assert.ok(diff(a.slice(0,3),b.slice(0,3))>.5,'W moves');
 await page.keyboard.down('w');await page.locator('#material-choice').focus();await page.waitForTimeout(150);a=await camera();await page.waitForTimeout(180);b=await camera();await page.keyboard.up('w');assert.ok(diff(a,b)<.001,'blur stops held movement');
 await canvas.focus();await page.keyboard.press('Escape');assert.equal(await nav.inputValue(),'orbit');assert.equal(await page.locator('#free-camera-tools').isVisible(),false);
 await nav.selectOption('free');await page.locator('[data-studio-view="front"]').click();assert.equal(await nav.inputValue(),'orbit','preset exits free camera');
 await nav.selectOption('free');await page.locator('#studio-fit').click();assert.equal(await nav.inputValue(),'orbit','fit recovers orbit');
 await nav.selectOption('free');await page.waitForTimeout(300);let frames=await page.evaluate(()=>studioStatus().metrics.frames);await page.waitForTimeout(350);assert.ok((await page.evaluate(()=>studioStatus().metrics.frames))-frames<=1,'free camera idle rendering');
 for(const width of [390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no page overflow');await page.locator('[data-camera-move="0,1,0"]').scrollIntoViewIfNeeded();a=await camera();await page.locator('[data-camera-move="0,1,0"]').click();b=await camera();assert.ok(b[1]>a[1]+1,'touch-friendly up button');}
 assert.deepEqual(errors,[]);console.log('PASS navigation: pan, free look/movement, focus cleanup, shortcuts, presets/fit, idle rendering, text selection and phone controls');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

