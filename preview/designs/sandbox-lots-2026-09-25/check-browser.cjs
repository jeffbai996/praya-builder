const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1500,height:1250}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const out='/tmp/sandbox-visual-0925';fs.mkdirSync(out,{recursive:true});
 try{
  for(const [name,id,site] of [['parcel-c','a354d91d-caa6-40af-b31e-c2ef02323c88','5764a59a-8e68-482a-98de-1758524de196'],['alder','a98cc0ea-361d-4278-a192-6be60249a307','34dc1bab-e949-45b8-94df-28b81d1cf38d']]){
   await page.goto(`http://127.0.0.1:8091/studio?site=${site}&draft=${id}`);
   await page.waitForFunction(()=>window.studioStatus?.().ready&&document.body.dataset.busy==='false',null,{timeout:60000});
   assert.equal(await page.locator('#site-select').inputValue(),site);
   assert.match(await page.locator('#draft-author').innerText(),/GPT-6 Astra/);
   const d=await(await fetch(`http://127.0.0.1:8091/api/workspace/drafts/${id}`)).json(),s=await(await fetch(`http://127.0.0.1:8091/api/workspace/sites/${site}`)).json();
   const corners=[];const points=d.candidate.blocks.map(c=>{let x=c.x,z=c.z,w=d.candidate.dimensions.x,depth=d.candidate.dimensions.z;for(let t=0;t<d.transform.turns;t++){[x,z]=[depth-1-z,x];[w,depth]=[depth,w];}return [x+d.transform.origin[0]-s.origin[0],c.y+d.transform.origin[1]-s.origin[1],z+d.transform.origin[2]-s.origin[2]];});
   const low=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),high=[0,1,2].map(i=>Math.max(...points.map(p=>p[i]+1)));for(const x of [low[0],high[0]])for(const y of [low[1],high[1]])for(const z of [low[2],high[2]])corners.push([x,y,z]);
   await page.locator('#studio-expand').click();
   for(const view of ['perspective','front','side','rear','roof']){
    await page.locator(`[data-studio-view=${view}]`).click();await page.waitForTimeout(200);
    const projection=await page.evaluate(async corners=>{const THREE=await import('/vendor/three/build/three.module.js');const c=studioStatus().camera,rect=document.querySelector('#studio-model').getBoundingClientRect(),camera=new THREE.PerspectiveCamera(40,rect.width/rect.height,.1,300);camera.position.set(...c.slice(0,3));camera.lookAt(...c.slice(3));camera.updateMatrixWorld();return corners.map(p=>new THREE.Vector3(...p).project(camera).toArray());},corners);
    assert(projection.every(p=>Math.abs(p[0])<1&&Math.abs(p[1])<1&&p[2]<1),name+' '+view+' must frame the complete building');
    await page.locator('#studio-model').screenshot({path:`${out}/${name}-${view}.png`});
   }
   const cutaways=await page.locator('#studio-ceiling option').evaluateAll(options=>options.map(o=>({value:o.value,label:o.textContent})));
   console.log(name,JSON.stringify(cutaways));
   await page.locator('#studio-ceiling').selectOption(cutaways.find(x=>x.value!=='64').value);
   await page.waitForFunction(()=>document.body.dataset.busy==='false');await page.locator('[data-studio-view=roof]').click();await page.locator('#studio-model').screenshot({path:`${out}/${name}-ground.png`});
   await page.locator('#studio-ceiling').selectOption('64');await page.waitForFunction(()=>document.body.dataset.busy==='false');
   await page.locator('#studio-navigation').selectOption('walk');assert.equal(await page.locator('#movement-mode-label').textContent(),'Walk');assert(await page.locator('#reset-walk').isVisible());
   await page.locator('#reset-walk').click();const camera=await page.evaluate(()=>window.studioStatus().camera);assert(Math.abs(camera[1]-(s.frontage[1]-s.origin[1]+1.62))<1,'Walk starts at street height');console.log(name,'walk camera',JSON.stringify(camera));
   await page.locator('#exit-free-camera').click();await page.locator('#studio-expand').click();
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${out}/${name}-mobile.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.setViewportSize({width:1500,height:1250});
  }
  assert.deepEqual(errors,[]);console.log('SANDBOX_VISUAL_PASS site selection, exact author label, five exterior views, floor cutaway, walk entry controls and mobile width; no JS errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
