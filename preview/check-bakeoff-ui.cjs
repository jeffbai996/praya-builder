const assert=require('node:assert/strict');
const fs=require('node:fs');

const hash=character=>character.repeat(64);
const descriptor=(artifact,review)=>({artifactHash:artifact,reviewHash:review,index:`/api/workspace/artifacts/${artifact}/sheet/index.json?review=${review}`});
const view=(artifact,review,id)=>({id,label:id==='front'?'Front':'Ground plan',file:id+'.png',url:`/api/workspace/artifacts/${artifact}/sheet/${id}.png?review=${review}`,diagnosticCount:0});

async function main(){
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
 try{
  const page=await browser.newPage({viewport:{width:320,height:900}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  const source=fs.readFileSync(__dirname+'/bakeoff-ui.js','utf8');
  await page.route('**/bakeoff-ui-test.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:source}));
  let listCalls=0,revealCalls=0;
  const a=hash('1'),b=hash('2'),c=hash('3'),ra=hash('a'),rb=hash('b'),rc=hash('c');
  const blind={id:'comparison-1',version:1,name:'<img id="injected"> Long comparison name '.repeat(5),brief:{text:'A long shared brief '.repeat(40)},revealed:false,entrants:[
   {label:'A',state:'ready',cells:1200,components:14,diagnostics:{error:0,warning:1,info:2},sheet:descriptor(a,ra),author:{agent:'secret-agent-a',model:'secret-model-a'}},
   {label:'B',state:'ready',cells:1250,components:15,diagnostics:{error:0,warning:0,info:1},sheet:descriptor(b,rb),author:{agent:'secret-agent-b',model:'secret-model-b'}},
   {label:'C',state:'needs-changes',cells:1100,components:12,diagnostics:{error:1,warning:0,info:0},sheet:descriptor(c,rc),author:{agent:'secret-agent-c',model:'secret-model-c'}},
  ]};
  const latest={...blind,version:2,entrants:blind.entrants.map(entry=>({...entry,cells:entry.cells+1}))};
  const revealed={...latest,version:3,revealed:true,entrants:latest.entrants.map((entry,index)=>({...entry,author:{agent:'agent-'+index,model:'model-'+index,effort:'high'}}))};
  await page.route('**/api/workspace/**',async route=>{
   const request=route.request(),url=new URL(request.url()),path=url.pathname.slice('/api/workspace/'.length),method=request.method();
   const json=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
   if(path==='bakeoffs'&&method==='GET'){listCalls++;return listCalls===1?json({error:'temporary fixture outage'},503):json([blind]);}
   if(path==='bakeoffs/comparison-1/reveal'&&method==='POST'){revealCalls++;return revealCalls===1?json({error:'Comparison changed; reload before submitting'},409):json(revealed);}
   if(path==='bakeoffs/comparison-1'&&method==='GET')return json(latest);
   if(path===`artifacts/${a}/sheet/index.json`){await new Promise(resolve=>setTimeout(resolve,180));return json({artifactHash:a,reviewHash:ra,views:[view(a,ra,'front')]});}
   if(path===`artifacts/${b}/sheet/index.json`)return json({artifactHash:b,reviewHash:rb,views:[view(b,rb,'plan-0')]});
   if(path===`artifacts/${c}/sheet/index.json`)return json({artifactHash:hash('4'),reviewHash:rc,views:[view(hash('4'),rc,'front')]});
   return json({error:'unexpected '+method+' '+path},404);
  });
  const base=process.env.PREVIEW_BASE_URL||'http://127.0.0.1:8092';await page.goto(base+'/thumbnail-render.html');
  await page.setContent('<!doctype html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/style.css"><main><section id="fixture" class="bakeoff-list"></section></main>');
  await page.evaluate(async()=>{const {mountBakeoffs}=await import('/bakeoff-ui-test.js');await mountBakeoffs(document.querySelector('#fixture'));});
  await page.getByRole('button',{name:'Retry comparisons'}).click();
  await page.waitForSelector('.bakeoff-entrant[data-label="C"]');
  const blindText=await page.locator('#fixture').innerText();assert(!blindText.includes('secret-model'));assert(!blindText.includes('secret-agent'));assert.equal(await page.locator('#injected').count(),0);
  const buttons=page.locator('.bakeoff-entrant button');await buttons.nth(0).click();await buttons.nth(1).click();
  await page.waitForSelector('.bakeoff-gallery img[src*="plan-0.png"]');await page.waitForTimeout(240);
  assert.equal(await page.locator('.bakeoff-gallery img').count(),1);assert.match(await page.locator('.bakeoff-gallery img').getAttribute('src'),/plan-0\.png/);assert.equal(await page.locator('.bakeoff-gallery img').getAttribute('loading'),'lazy');
  await buttons.nth(2).click();await page.waitForFunction(()=>document.querySelector('.bakeoff-card [role="status"]')?.textContent==='Review identity changed while loading');assert.equal(await page.locator('.bakeoff-gallery img').count(),0);
  const reveal=page.getByRole('button',{name:'Reveal authors'});await reveal.click();await page.waitForFunction(()=>document.querySelector('.bakeoff-card [role="status"]')?.textContent.includes('was reloaded'));
  assert(!(await page.locator('#fixture').innerText()).includes('model-0'));assert.equal(await reveal.isEnabled(),true);assert.equal(await reveal.textContent(),'Reveal authors');
  await reveal.click();await page.waitForFunction(()=>document.querySelector('.bakeoff-card [role="status"]')?.textContent.includes('no automatic winner'));
  const revealedText=await page.locator('#fixture').innerText();assert(revealedText.includes('model-0'));assert(revealedText.includes('model-1'));assert.equal(await page.locator('[class*="winner"],[id*="winner"],[data-winner]').count(),0);
  const metrics=await page.evaluate(()=>({innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth}));assert(metrics.documentWidth<=metrics.innerWidth,JSON.stringify(metrics));assert(metrics.bodyWidth<=metrics.innerWidth,JSON.stringify(metrics));
  assert.deepEqual(errors,[]);console.log(`BAKEOFF_UI_PASS blind=1 stale=1 strictSheet=1 revealConflict=1 width=${metrics.documentWidth}`);
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
