const assert=require('node:assert/strict');
const fs=require('node:fs');

async function main(){
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
  try{
    const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    const source=fs.readFileSync(__dirname+'/review-sheet-ui.js','utf8');
    await page.route('**/review-sheet-ui-test.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:source}));
    await page.goto((process.env.PREVIEW_BASE_URL||'http://127.0.0.1:8092')+'/thumbnail-render.html');
    await page.setContent(`<div id="sheet-tabs" role="tablist"><button id="summary-tab" data-sheet-tab="summary" role="tab" aria-selected="true">Summary</button><button id="review-tab" data-sheet-tab="review" role="tab" aria-selected="false" tabindex="-1">Review</button></div><div id="sheet-summary" role="tabpanel"></div><div id="sheet-review" role="tabpanel" hidden><p id="sheet-status"></p><button id="sheet-retry" hidden>Retry</button><div id="sheet-gallery"></div></div>`);
    const result=await page.evaluate(async()=>{
      const module=await import('/review-sheet-ui-test.js');
      const calls=[],opened=[],attempts=new Map(),hash=n=>String(n).repeat(64),review=n=>String.fromCharCode(96+n).repeat(64);
      const manifest=(n,source,views)=>({artifactHash:hash(n),reviewHash:review(n),diagnosticsSource:source,views:views.map(view=>({...view,url:`/api/workspace/artifacts/${hash(n)}/sheet/${view.id}.png?review=${review(n)}`}))});
      const manifests={
        one:manifest(1,'saved-snapshot',[{id:'front',label:'Front',diagnosticCount:0},{id:'plan',label:'Ground plan',diagnosticCount:2}]),
        three:manifest(3,'current-rules',[{id:'street',label:'Street',diagnosticCount:0}]),
        four:manifest(4,'current-rules',[{id:'roof',label:'Roof',diagnosticCount:0}]),
        revision:manifest(5,'saved-snapshot',[{id:'rear',label:'Rear',diagnosticCount:1}]),
      };
      manifests.bad=manifest(6,'current-rules',[{id:'bad',label:'Bad',diagnosticCount:0}]);manifests.bad.views[0].url='https://example.invalid/stolen.png';
      let releaseTwo;const two=new Promise(resolve=>{releaseTwo=resolve;});
      const api=async route=>{
        calls.push(route);attempts.set(route,(attempts.get(route)||0)+1);
        if(route==='drafts/d1/context')return {sheet:{index:`/api/workspace/artifacts/${hash(1)}/sheet/index.json?review=${review(1)}`}};
        if(route===`artifacts/${hash(1)}/sheet/index.json?review=${review(1)}`)return manifests.one;
        if(route==='drafts/d2/context')return two;
        if(route==='drafts/d3/context')return {sheet:{index:`/api/workspace/artifacts/${hash(3)}/sheet/index.json?review=${review(3)}`}};
        if(route===`artifacts/${hash(3)}/sheet/index.json?review=${review(3)}`)return manifests.three;
        if(route==='drafts/d4/context'&&attempts.get(route)===1)throw Error('fixture unavailable');
        if(route==='drafts/d4/context')return {sheet:{index:`/api/workspace/artifacts/${hash(4)}/sheet/index.json?review=${review(4)}`}};
        if(route===`artifacts/${hash(4)}/sheet/index.json?review=${review(4)}`)return manifests.four;
        if(route==='drafts/d6/context')return {sheet:{index:`/api/workspace/artifacts/${hash(6)}/sheet/index.json?review=${review(6)}`}};
        if(route===`artifacts/${hash(6)}/sheet/index.json?review=${review(6)}`)return manifests.bad;
        if(route==='revisions/r1/sheet')return manifests.revision;
        throw Error('Unexpected '+route);
      };
      const ui=module.createReviewSheetUI({api,openImage:(url,label)=>opened.push({url,label})});
      const draft=(id,n,version=1)=>({id,version,candidate:{hash:hash(n)}});
      const waitFor=async(test,label)=>{for(let index=0;index<200;index++){if(test())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Timed out waiting for '+label);};
      ui.setDraft(draft('d1',1));await new Promise(resolve=>setTimeout(resolve));
      const lazy=[...calls];document.querySelector('#review-tab').click();
      await waitFor(()=>document.querySelectorAll('#sheet-gallery figure').length===2,'first gallery');
      document.querySelector('#sheet-gallery a').click();
      const first={calls:[...calls],count:document.querySelectorAll('#sheet-gallery figure').length,lazy:document.querySelector('#sheet-gallery img').loading,caption:document.querySelectorAll('figcaption')[1].textContent,opened:[...opened]};
      ui.setDraft(draft('d1',1,2));await waitFor(()=>calls.filter(call=>call==='drafts/d1/context').length===2,'same-hash new-version refresh');
      const refreshed=calls.filter(call=>call==='drafts/d1/context').length;
      document.querySelector('#review-tab').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
      const keyboard={summary:document.querySelector('#summary-tab').getAttribute('aria-selected'),hidden:document.querySelector('#sheet-review').hidden,focus:document.activeElement.id};
      document.querySelector('#review-tab').click();ui.setDraft(draft('d2',2));ui.setDraft(draft('d3',3));releaseTwo({sheet:{index:`/api/workspace/artifacts/${hash(2)}/sheet/index.json?review=${review(2)}`}});
      await waitFor(()=>document.querySelector('#sheet-gallery img[src*="street.png"]'),'stale replacement');
      const stale={manifestTwo:calls.includes('manifest-two'),src:document.querySelector('#sheet-gallery img').getAttribute('src')};
      ui.setDraft(draft('d4',4));await waitFor(()=>!document.querySelector('#sheet-retry').hidden,'retry state');
      const failed=document.querySelector('#sheet-status').textContent;document.querySelector('#sheet-retry').click();
      await waitFor(()=>document.querySelector('#sheet-gallery img[src*="roof.png"]'),'retry result');
      const retried=document.querySelector('#sheet-gallery img').getAttribute('src');
      ui.setDraft(draft('d6',6));await waitFor(()=>!document.querySelector('#sheet-retry').hidden,'invalid manifest rejection');
      const invalid={status:document.querySelector('#sheet-status').textContent,count:document.querySelectorAll('#sheet-gallery img').length};
      await ui.showRevision('r1');
      return {lazy,first,refreshed,keyboard,stale,failed,retried,invalid,revision:{selected:document.querySelector('#review-tab').getAttribute('aria-selected'),src:document.querySelector('#sheet-gallery img').getAttribute('src')}};
    });
    assert.deepEqual(result.lazy,[]);assert.equal(result.first.count,2);assert.equal(result.first.lazy,'lazy');assert.equal(result.first.caption,'Ground plan · 2 diagnostics');assert.equal(result.first.opened[0].label,'Front');assert.match(result.first.opened[0].url,/\/front\.png\?review=a{64}$/);
    assert.equal(result.first.calls[0],'drafts/d1/context');assert.match(result.first.calls[1],/^artifacts\/1{64}\/sheet\/index\.json\?review=a{64}$/);assert.equal(result.refreshed,2);assert.deepEqual(result.keyboard,{summary:'true',hidden:true,focus:'summary-tab'});
    assert.equal(result.stale.manifestTwo,false);assert.match(result.stale.src,/street\.png/);assert.equal(result.failed,'fixture unavailable');assert.match(result.retried,/roof\.png/);assert.deepEqual(result.invalid,{status:'Review sheet contains an invalid image',count:0});assert.equal(result.revision.selected,'true');assert.match(result.revision.src,/rear\.png/);assert.deepEqual(errors,[]);
    console.log('REVIEW_SHEET_UI_PASS lazy=1 stale=1 retry=1 keyboard=1');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
