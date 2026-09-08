// Studio polish: drawing-first modes, version compare, selection readout, expand, catalogue hand-off and idle rendering.
// Read-only against a running preview unless BUILDER_POLISH_WRITE=1, which also renames a draft and renames it back.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {setTheme}=require('./check-theme-control.cjs');
const assert=require('node:assert/strict'),path=require('node:path');
// Orbit damping settles over a few frames, so compare cameras to a millimetre rather than bit for bit.
const close=(a,b)=>a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<1e-3);
async function main(){
 const base=process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091',out=process.env.BUILDER_EVIDENCE_DIR||'/tmp';
 const index=await(await fetch(base+'/api/workspace/context')).json();
 const withVersions=index.drafts.find(d=>index.revisions.filter(r=>r.project===d.project).length>=2)||index.drafts[0];assert.ok(withVersions,'a draft exists');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const settled=()=>page.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy==='false');
  await page.goto(base+'/studio?draft='+withVersions.id);await settled();
  // Default is design mode with the model, one design selector and a saved/unsaved indicator; the process lives in explicit modes.
  assert.equal(await page.getAttribute('#studio-main','data-mode'),'design');
  assert.equal(await page.locator('#site-workspace').isVisible(),false);assert.equal(await page.locator('#place-workspace').isVisible(),false);
  assert.match(await page.locator('#candidate-state').textContent(),/Ready to review|Needs changes/);
  assert.equal(await page.locator('.create-proposal-link').count(),0);
  assert.match(await page.locator('#save-state').textContent(),/Saved as version|Unsaved changes|Not saved yet/);
  // Technical readout is behind Details, not a headline.
  assert.equal(await page.locator('#candidate-summary').isVisible(),false);await page.locator('.outcome-details summary').click();assert.match(await page.locator('#candidate-summary').textContent(),/draft version \d+/);
  // Version history and compare baseline: choosing a version swaps the diff without moving the camera.
  const versions=index.revisions.filter(r=>r.project===withVersions.project);
  assert.equal(await page.locator('#version-list li').count(),versions.length);
  if(versions.length>=2){
   const camera=await page.evaluate(()=>studioStatus().camera);
   const options=await page.locator('#compare-select option').evaluateAll(o=>o.map(x=>x.value).filter(Boolean));assert.ok(options.length>=1);
   await page.selectOption('#compare-select',options[0]);await page.waitForFunction(()=>document.body.dataset.busy==='false');
   assert.match(await page.locator('#compare-summary').textContent(),/Versus Version \d+|No differences/);
   assert.ok(close(await page.evaluate(()=>studioStatus().camera),camera),'camera retained across compare');
   const compare=page.locator('#version-list button:has-text("Compare"):not([disabled])').first();await compare.click();await page.waitForFunction(()=>document.body.dataset.busy==='false');
   assert.equal(await page.locator('#diff-visible').isChecked(),true);
  }
  // Floor cutaways come from the building itself, and a revisited floor is served from the browser cache.
  const floors=await page.locator('#studio-ceiling option').evaluateAll(o=>o.map(x=>x.value));assert.ok(floors.length>=2,'derived floors: '+floors);
  await page.selectOption('#studio-ceiling',floors[1]);await settled();await page.selectOption('#studio-ceiling','64');await settled();
  let meshRequests=0;const counter=r=>{if(r.url().includes('/mesh?'))meshRequests++;};page.on('request',counter);
  await page.selectOption('#studio-ceiling',floors[1]);await settled();page.off('request',counter);assert.equal(meshRequests,0,'cached floor mesh');
  await page.selectOption('#studio-ceiling','64');await settled();
  // Rename changes the name only; versions, parent and compare baselines survive. Opt-in: it edits the draft's history.
  if(process.env.BUILDER_POLISH_WRITE==='1'){const versionsBefore=await page.locator('#version-list li').count();await page.locator('#rename-design').click();await page.fill('#rename-input',(await page.locator('#rename-input').inputValue())+' ✓');await page.locator('#rename-form button[type=submit]').click();await settled();
  assert.match(await page.locator('#draft-title').textContent(),/✓$/);assert.equal(await page.locator('#version-list li').count(),versionsBefore);
  await page.locator('#rename-design').click();await page.fill('#rename-input',(await page.locator('#rename-input').inputValue()).replace(/ ✓$/,''));await page.locator('#rename-form button[type=submit]').click();await settled();assert.doesNotMatch(await page.locator('#draft-title').textContent(),/✓$/);}
  // Camera parity and keyboard: six cameras, lighting, grid, shortcuts.
  assert.equal(await page.locator('[data-studio-view]').count(),6);await page.locator('#studio-model').focus();await page.keyboard.press('6');assert.equal(await page.locator('[data-studio-view=street]').getAttribute('aria-pressed'),'true');
  await page.selectOption('#studio-lighting','warm');await page.locator('#studio-grid').uncheck();await page.locator('#studio-grid').check();await page.selectOption('#studio-lighting','studio');
  // Selection readout: human label first, raw state under Details.
  await page.selectOption('#studio-component',{index:1});
  assert.equal(await page.locator('#studio-selection b').count(),1);
  const box=await page.locator('#studio-model').boundingBox();
  let picked=false;
  for(const [fx,fy] of [[.5,.55],[.5,.5],[.45,.6],[.55,.45],[.5,.65]]){await page.mouse.click(box.x+box.width*fx,box.y+box.height*fy);if(await page.locator('#studio-selection details').count()){picked=true;break;}}
  if(picked){assert.match(await page.locator('#studio-selection code').textContent(),/minecraft:.*\(-?\d+, -?\d+, -?\d+\)/);assert.equal(await page.locator('#studio-selection details').evaluate(d=>d.open),false);}
  // Expand gives the model the screen and Escape returns.
  await page.locator('#studio-expand').click();assert.equal(await page.evaluate(()=>document.body.classList.contains('model-expanded')),true);
  const expanded=await page.locator('#studio-model').boundingBox();assert.ok(expanded.height>box.height);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.body.classList.contains('model-expanded')),false);
  // Switching designs keeps the camera when the site and footprint are unchanged.
  const sibling=index.drafts.find(d=>d.id!==withVersions.id&&d.siteId===withVersions.siteId);
  if(sibling){const before=await page.evaluate(()=>studioStatus().camera);await page.selectOption('#draft-select',sibling.id);await settled();const after=await page.evaluate(()=>studioStatus().camera);const a=await(await fetch(base+'/api/workspace/drafts/'+withVersions.id)).json(),b=await(await fetch(base+'/api/workspace/drafts/'+sibling.id)).json();if(a.candidate.dimensions.x===b.candidate.dimensions.x&&a.candidate.dimensions.z===b.candidate.dimensions.z)assert.ok(close(after,before),'camera retained across designs');}
  // Idle rendering: with nothing moving, the loop should draw almost nothing.
  await page.waitForTimeout(800);const first=await page.evaluate(()=>studioStatus().metrics.frames);await page.waitForTimeout(2000);const idle=await page.evaluate(()=>studioStatus().metrics.frames)-first;
  assert.ok(idle<=6,'idle frames in 2s: '+idle);
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+120,box.y+box.height/2+30,{steps:12});await page.mouse.up();await page.waitForTimeout(300);
  assert.ok(await page.evaluate(()=>studioStatus().metrics.frames)-first-idle>=6,'orbit renders frames');
  // Modes on a phone stay within the viewport; the layer row scrolls locally.
  await setTheme(page,'oled');await page.setViewportSize({width:320,height:700});
  for(const mode of ['site','construction','design']){await page.locator('.studio-steps a[data-mode='+mode+']').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,mode+' at 320');}
  assert.ok(await page.locator('.layer-controls').evaluate(e=>e.scrollWidth>e.clientWidth&&getComputedStyle(e).overflowX==='auto'));
  await page.screenshot({path:path.join(out,'studio-polish-320-oled.png'),fullPage:true});
  // Catalogue: Edit in Studio carries the selected design; Studio reuses the draft it already made from it.
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/');await page.waitForFunction(()=>window.previewStatus?.().ready);
  const link=page.locator('#edit-in-studio');assert.equal(await link.isVisible(),true);assert.match(await link.getAttribute('href'),/^\/studio\?catalogue=[a-z0-9-]+\/r\d+$/);
  const projects=await(await fetch(base+'/api/projects')).json();const derived=index.drafts.find(d=>projects.some(p=>p.revisions.some(r=>r.hash===d.parentHash)));
  if(derived){const source=projects.flatMap(p=>p.revisions.map(r=>({p,r}))).find(x=>x.r.hash===derived.parentHash);await page.goto(`${base}/studio?catalogue=${source.p.id}/${source.r.id}`);await settled();assert.equal(await page.getAttribute('body','data-draft'),derived.id,'existing draft reused');assert.equal(new URL(page.url()).searchParams.has('catalogue'),false);assert.match(await page.locator('#back-link').getAttribute('href'),/^\/\?project=/);}
  assert.deepEqual(errors,[]);console.log('STUDIO_POLISH_PASS design-first modes, version compare with retained camera, selection details, expand, idle rendering, 320 modes, catalogue hand-off');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
