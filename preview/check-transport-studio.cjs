const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const url=process.env.PREVIEW_URL||'http://127.0.0.1:8091/transport';

const waitForArtifact=async page=>{
  try {
    await page.waitForFunction(()=>{
      const cards=[...document.querySelectorAll('#alternative-list .alternative-card')];
      return cards.length===4 && !document.querySelector('#compile-study')?.disabled && cards.every(card=>/BLOCK ARTIFACT|REVIEW ISSUES/.test(card.textContent));
    },null,{timeout:10000});
  } catch (cause) {
    const detail=await page.evaluate(()=>({state:document.querySelector('#compile-state')?.textContent,error:document.querySelector('#app-error')?.textContent,cards:[...document.querySelectorAll('#alternative-list .alternative-card')].map(card=>card.textContent)}));
    throw new Error(cause.message+'\\nRoadwork state: '+JSON.stringify(detail));
  }
};

let browser;
(async()=>{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.stack||error.message));
  await page.goto(url);
  await page.waitForTimeout(500);
  assert.deepEqual(errors,[]);
  await page.waitForFunction(()=>[...document.querySelector('#survey-select')?.options||[]].some(option=>option.value));

  assert.equal(await page.title(),'Roadwork · Transport Department');
  assert.equal((await page.locator('.roadwork-home h1').innerText()).trim(),'roadwork');

  await page.locator('[data-workflow="locate"]').click();
  await page.locator('#survey-select').selectOption('fixture');
  await page.locator('#load-survey').click();
  await page.waitForFunction(()=>document.querySelector('#source-badge')?.textContent==='TEST FIXTURE');
  await waitForArtifact(page);
  assert.match(await page.locator('#source-description').innerText(),/Synthetic example/i);
  assert.equal(await page.locator('#source-boundary').innerText(),'NO WORLD CHANGES');
  assert.equal(await page.locator('#point-list input[data-point][data-axis]').count()>=6,true);
  assert.equal(await page.locator('#alternative-list .alternative-card').count(),4);

  const firstPoint=page.locator('#point-list input[data-point="0"][data-axis="x"]');
  const originalPoint=await firstPoint.inputValue();
  await firstPoint.fill('12.5');
  await firstPoint.press('Tab');
  await page.waitForSelector('#app-error:not([hidden])');
  assert.match(await page.locator('#app-error').innerText(),/whole blocks/i);
  assert.equal(await firstPoint.inputValue(),originalPoint);

  await page.locator('#alternative-list [data-alternative="direct"]').click();
  assert.equal(await page.locator('#alternative-list [data-alternative="direct"]').getAttribute('aria-checked'),'true');
  assert.match(await page.locator('#review-summary').innerText(),/Assembly [a-f0-9]{8}/i);
  const width=page.locator('#road-width');
  const priorWidth=Number(await width.inputValue());
  await width.fill(String(Math.min(15,priorWidth+2)));
  await width.press('Tab');
  await page.waitForTimeout(700);
  await waitForArtifact(page);
  await page.locator('[data-workflow="review"]').click();
  assert.equal(await page.locator('#review-table tr').count(),4);
  assert.equal(await page.locator('#segment-list article').count(),2);
  assert.equal(await page.locator('#change-list .change-rows > div').count()>0,true);
  assert.match(await page.locator('#review-caution').innerText(),/Generated artifact|review issue/i);

  await page.locator('[data-workflow="design"]').click();
  const previousStudyIds=new Set(await page.locator('#study-list .saved-study').evaluateAll(nodes=>nodes.map(node=>node.dataset.study)));
  await page.locator('#save-study').click();
  await page.waitForFunction(()=>!document.querySelector('#compile-study')?.disabled);
  await page.locator('[data-workflow="locate"]').click();
  await page.waitForSelector('#study-list .saved-study');
  assert.match(await page.locator('#save-state').innerText(),/Saved revision/i);
  const savedId=await page.locator('#study-list .saved-study').evaluateAll((nodes,existing)=>nodes.map(node=>node.dataset.study).find(id=>!existing.includes(id)),[...previousStudyIds]);
  assert.ok(savedId,'saving must create a new immutable study');
  const savedButton=page.locator('#study-list [data-study="'+savedId+'"]');
  await savedButton.click();
  await page.waitForSelector('[data-panel="review"]:not([hidden])');
  assert.match(await page.locator('#review-summary').innerText(),/Assembly [a-f0-9]{8}/i);
  const savedHash=await page.evaluate(async id=>{
    const response=await fetch('/api/roadwork/studies/'+encodeURIComponent(id));
    const study=await response.json();
    return study.assembly?.hash;
  },savedId);
  assert.match(savedHash,/^[a-f0-9]{64}$/);

  await page.locator('[data-workflow="design"]').click();
  await page.locator('#alternative-list [data-alternative="preserve"]').click();
  await page.locator('[data-workflow="review"]').click();
  assert.equal(await page.locator('#export-manifest').isDisabled(),true);
  await page.locator('[data-workflow="design"]').click();
  await page.locator('#alternative-list [data-alternative="direct"]').click();
  await page.locator('[data-workflow="review"]').click();
  assert.equal(await page.locator('#export-manifest').isDisabled(),true);
  await page.locator('[data-workflow="locate"]').click();
  await page.locator('#study-list [data-study="'+savedId+'"]').click();
  await page.waitForSelector('[data-panel="review"]:not([hidden])');
  assert.equal(await page.locator('#export-manifest').isDisabled(),false);

  const manifestDownload=page.waitForEvent('download');
  await page.locator('#export-manifest').click();
  const manifest=await manifestDownload;
  assert.match(manifest.suggestedFilename(),/\.json$/i);
  const manifestJson=JSON.parse(await fs.readFile(await manifest.path(),'utf8'));
  assert.equal(manifestJson.assemblyHash,savedHash);
  const segmentDownloads=[];
  page.on('download',download=>segmentDownloads.push(download));
  await page.locator('#download-segments').click();
  await page.waitForFunction(()=>document.querySelector('#toast')?.textContent.includes('schematic download'));
  await page.waitForTimeout(650);
  assert.equal(segmentDownloads.filter(download=>/\.schem$/i.test(download.suggestedFilename())).length,2);

  await page.locator('[data-workflow="design"]').click();
  await page.locator('[data-view="model"]').click();
  await page.waitForSelector('#model-view canvas');
  assert.equal(await page.locator('#model-view canvas').isVisible(),true);
  assert.match(await page.locator('#model-view').getAttribute('aria-label'),/Minecraft block/i);
  if(process.env.ROADWORK_EVIDENCE_DIR){await fs.mkdir(process.env.ROADWORK_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.ROADWORK_EVIDENCE_DIR,'roadwork-desktop-model.png'),fullPage:true});}
  const narrow=await browser.newPage({viewport:{width:320,height:800}});
  const narrowErrors=[];
  narrow.on('pageerror',error=>narrowErrors.push(error.message));
  const mobileUrl=new URL(url);mobileUrl.searchParams.set('study',savedId);
  await narrow.goto(mobileUrl.href);
  await narrow.waitForFunction(()=>[...document.querySelector('#survey-select')?.options||[]].some(option=>option.value));
  await narrow.waitForFunction(()=>document.querySelector('#source-badge')?.textContent==='TEST FIXTURE');
  await narrow.waitForFunction(()=>document.querySelector('#save-state')?.textContent.includes('Saved revision'));
  assert.equal(await narrow.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,JSON.stringify(await narrow.evaluate(()=>[...document.querySelectorAll('body *')].filter(n=>n.getBoundingClientRect().right>innerWidth).map(n=>({tag:n.tagName,id:n.id,class:n.className,width:n.getBoundingClientRect().width})).slice(0,18))));
  assert.deepEqual(await narrow.locator('[data-workflow]').evaluateAll(nodes=>nodes.map(node=>node.textContent.trim().replace(/\s+/g,' '))),['01 Survey','02 Design','03 Review']);
  if(process.env.ROADWORK_EVIDENCE_DIR)await narrow.screenshot({path:path.join(process.env.ROADWORK_EVIDENCE_DIR,'roadwork-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  assert.deepEqual(narrowErrors,[]);
  await browser.close();
  console.log('roadwork browser checks passed');
})().catch(async error=>{console.error(error);await browser?.close();process.exitCode=1;});
