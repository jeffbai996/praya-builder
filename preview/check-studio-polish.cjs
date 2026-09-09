// Studio polish: drawing-first modes, version compare, selection readout, expand, catalogue hand-off and idle rendering.
// Read-only against a running preview unless BUILDER_POLISH_WRITE=1, which also renames a draft and renames it back.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {setTheme}=require('./check-theme-control.cjs');
const assert=require('node:assert/strict'),path=require('node:path');
// Orbit damping settles over a few frames, so compare cameras to a millimetre rather than bit for bit.
const close=(a,b)=>a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<1e-3);
async function main(){
 const base=process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091',out=process.env.BUILDER_EVIDENCE_DIR||'/tmp';
 let index=await(await fetch(base+'/api/workspace/context')).json();
 // Sign presets need a signed draft; on a scratch workspace with the write flag, compile one from the corner-stores plan.
 if(process.env.BUILDER_POLISH_WRITE==='1'&&!index.drafts.some(d=>/Corner Stores · R2/.test(d.name))){const plan=JSON.parse(require('node:fs').readFileSync(path.join(__dirname,'old-town-corner-stores-r2.plan.json'),'utf8'));const made=await fetch(base+'/api/workspace/drafts',{method:'POST',headers:{'Content-Type':'application/json','X-Builder-Write':'1'},body:JSON.stringify({plan,transform:{origin:[0,0,0],turns:0},brief:''})});assert.equal(made.status,201);index=await(await fetch(base+'/api/workspace/context')).json();}
 const withVersions=index.drafts.find(d=>index.revisions.filter(r=>r.project===d.project).length>=2)||index.drafts[0];assert.ok(withVersions,'a draft exists');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const chooseDraft=async id=>{if(!(await page.locator('#draft-select option').evaluateAll((opts,id)=>opts.some(o=>o.value===id),id)))await page.locator('#draft-history').click();await page.selectOption('#draft-select',id);};
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
  // Every saved version gets a picture: served from the workspace, or rendered once here and stored for other devices.
  if(versions.length){await page.waitForFunction(()=>{const imgs=[...document.querySelectorAll('#version-list img.version-thumb')];return imgs.length===document.querySelectorAll('#version-list li').length&&imgs.every(i=>i.complete&&i.naturalWidth>0);},null,{timeout:120000});
   const stored=await fetch(`${base}/api/workspace/revisions/${versions[0].id}/thumbnail`);assert.equal(stored.status,200);assert.equal(stored.headers.get('content-type'),'image/jpeg');}
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
  // Asset support states and sign presets on a signed draft: honest stage badges, layouts that never invent words.
  const signed=index.drafts.find(d=>/Corner Stores · R2/.test(d.name));
  if(signed){
   await chooseDraft(signed.id);await settled();
   const support=await page.locator('#asset-support li').allTextContents();assert.ok(support.some(t=>/wall signs with text/.test(t)&&/✓?\s*Preview/.test(t)),'support rows: '+support);
   assert.ok(!support.some(t=>/custom heads/.test(t)&&/Bridge placement(?! ·)/.test(t)&&!/✗/.test(t)));
   assert.equal(await page.locator('#sign-tools').isVisible(),true);
   const signCount=await page.locator('#sign-select option').count();assert.ok(signCount>=1);
   await page.selectOption('#sign-preset','centered');assert.equal(await page.locator('#apply-sign').isDisabled(),true,'blank preset cannot compile placeholder text');
   assert.match(await page.locator('#sign-preview').textContent(),/^\s*$/);
   if(process.env.BUILDER_POLISH_WRITE==='1'){
    const versionBefore=(await(await fetch(base+'/api/workspace/drafts/'+signed.id)).json()).version;
    await page.fill('#sign-field-a','Please wait');await page.fill('#sign-field-b','to be seated');assert.equal(await page.locator('#apply-sign').isDisabled(),false);
    assert.deepEqual((await page.locator('#sign-preview').textContent()).split('\n'),['------------','Please wait','to be seated','------------']);
    await page.locator('#apply-sign').click();await settled();
    const after=await(await fetch(base+'/api/workspace/drafts/'+signed.id)).json();assert.equal(after.version,versionBefore+1);
    const at=after.plan.signs[Number(await page.locator('#sign-select').inputValue())];assert.deepEqual(at.lines,['','Please wait','to be seated','']);
    assert.deepEqual(after.candidate.signs.find(s=>s.at.join()===at.at.join()).lines,at.lines,'compiled artifact carries the text');
    await page.locator('#undo-draft').click();await settled();assert.equal((await(await fetch(base+'/api/workspace/drafts/'+signed.id)).json()).version,versionBefore+2);
   }
   await chooseDraft(withVersions.id);await settled();
  }
  // References: bounded images with notes, listed by hash in the revision request. Opt-in: it writes files.
  if(process.env.BUILDER_POLISH_WRITE==='1'){
   const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
   await page.locator('#reference-files').setInputFiles([{name:'north elevation.png',mimeType:'image/png',buffer:png}]);await page.fill('#reference-note','Keep the cornice line');await page.locator('#add-references').click();await settled();
   assert.equal(await page.locator('#reference-list figure').count(),1);
   const bad=await fetch(`${base}/api/workspace/drafts/${withVersions.id}/references`,{method:'POST',headers:{'Content-Type':'application/json','X-Builder-Write':'1'},body:JSON.stringify({name:'x.gif',type:'image/gif',data:png.toString('base64')})});assert.equal(bad.status,400);
   const forged=await fetch(`${base}/api/workspace/drafts/${withVersions.id}/references`,{method:'POST',headers:{'Content-Type':'application/json','X-Builder-Write':'1'},body:JSON.stringify({name:'x.png',type:'image/png',data:Buffer.from('not a png at all').toString('base64')})});assert.equal(forged.status,400);
   await page.fill('#revision-instruction','Test request');const requestDownload=page.waitForEvent('download');await page.locator('#prepare-request').click();const file=await requestDownload;const request=JSON.parse(require('node:fs').readFileSync(await file.path(),'utf8'));
   assert.equal(request.references.length,1);assert.match(request.references[0].sha256,/^[a-f0-9]{64}$/);assert.equal(request.references[0].note,'Keep the cornice line');
   await page.locator('#reference-list .reference-open').first().click();assert.equal(await page.locator('#reference-dialog').evaluate(d=>d.open),true);await page.locator('#reference-close').click();
   await page.locator('#reference-list .reference-remove').first().click();await settled();assert.equal(await page.locator('#reference-list figure').count(),0);
  }
  // Site mode reads as three steps and the test plots stay behind a disclosure once a site exists.
  await page.locator('.studio-steps a[data-mode=site]').click();assert.equal(await page.locator('#site-workspace .step-title').count(),2);assert.equal(await page.locator('#proposal-workspace .step-title').count(),1);
  if(index.sites.length)assert.equal(await page.locator('#fixture-panel').evaluate(e=>e.open),false);
  await page.locator('.studio-steps a[data-mode=design]').click();
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
  if(sibling){const before=await page.evaluate(()=>studioStatus().camera);await chooseDraft(sibling.id);await settled();const after=await page.evaluate(()=>studioStatus().camera);const a=await(await fetch(base+'/api/workspace/drafts/'+withVersions.id)).json(),b=await(await fetch(base+'/api/workspace/drafts/'+sibling.id)).json();if(a.candidate.dimensions.x===b.candidate.dimensions.x&&a.candidate.dimensions.z===b.candidate.dimensions.z)assert.ok(close(after,before),'camera retained across designs');}
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
  if(derived){const source=projects.flatMap(p=>p.revisions.map(r=>({p,r}))).find(x=>x.r.hash===derived.parentHash);await page.goto(`${base}/studio?catalogue=${source.p.id}/${source.r.id}`);await settled();assert.equal(await page.getAttribute('body','data-draft'),derived.id,'existing draft reused');assert.equal(new URL(page.url()).searchParams.has('catalogue'),false);assert.match(await page.locator('#back-link').getAttribute('href'),/^\/\?panel=register$/);}
  assert.deepEqual(errors,[]);console.log('STUDIO_POLISH_PASS design-first modes, version compare with retained camera, selection details, expand, idle rendering, 320 modes, catalogue hand-off');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
