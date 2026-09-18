const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const url=process.env.PREVIEW_URL||'http://127.0.0.1:8091/transport';

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);await page.waitForFunction(()=>window.transportStatus?.().ready);
  assert.equal(await page.title(),'Roadwork · Transport Department');
  assert.equal((await page.locator('.transport-title h1').innerText()).trim(),'ROADWORK');
  assert.equal(await page.locator('.alternative-card').count(),3);
  assert.match(await page.locator('.scope-banner').innerText(),/no world writes/i);
  assert.equal((await page.evaluate(()=>transportStatus())).alternative,'balanced');

  const selected=page.locator('[data-alternative=balanced]');
  await selected.focus();await selected.press('ArrowRight');
  assert.equal((await page.evaluate(()=>transportStatus())).alternative,'direct');
  assert.equal(await page.locator('[data-alternative=direct]').getAttribute('tabindex'),'0');

  const before=await page.locator('#plan-view').innerHTML();
  await page.locator('[data-alternative=preserve]').click();
  assert.notEqual(await page.locator('#plan-view').innerHTML(),before);
  await page.locator('#station').fill('74');
  assert.equal((await page.evaluate(()=>transportStatus())).station,74);
  assert.match(await page.locator('#section-view').getAttribute('aria-label'),/Cross-section at \d+ metres/);

  const width=(await page.evaluate(()=>transportStatus())).measurements.width;
  await page.locator('#lane-width').fill('5');
  assert.equal((await page.evaluate(()=>transportStatus())).measurements.width,width+4);
  await page.locator('#save-study').click();await page.locator('[data-alternative=direct]').click();await page.locator('#reopen-study').click();
  assert.equal((await page.evaluate(()=>transportStatus())).alternative,'preserve');

  await page.locator('[data-view=model]').click();await page.locator('#terrain-mode').selectOption('hidden');
  assert.equal(await page.locator('#model-view .model-ground').count(),0);
  await page.locator('#fit-route').click();
  assert.equal((await page.evaluate(()=>transportStatus())).view,'plan');
  assert.equal((await page.evaluate(()=>transportStatus())).station,50);

  await page.locator('[data-workflow=review]').click();
  assert.equal(await page.locator('#review-table tr').count(),3);
  assert.match(await page.locator('.review-caution').innerText(),/not construction-ready/i);

  const narrow=await browser.newPage({viewport:{width:320,height:800}});
  await narrow.goto(url);await narrow.waitForFunction(()=>transportStatus?.().ready);
  assert.equal(await narrow.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false);
  assert.deepEqual(await narrow.locator('[data-workflow]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label'))),['Brief','Alignment','Assessment']);
  assert.deepEqual(errors,[]);
  await browser.close();console.log('transport studio browser checks passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
