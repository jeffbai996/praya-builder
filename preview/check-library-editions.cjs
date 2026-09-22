const {chromium}=require(process.env.PLAYWRIGHT_MODULE);const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
const p=await b.newPage({viewport:{width:390,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:8091/?panel=register');await p.waitForSelector('.library-design');
await p.selectOption('#working-type','Healthcare');assert.equal(await p.locator('.library-design').count(),2);
await p.selectOption('#working-type','');await p.fill('#working-search','Point Tower');assert.equal(await p.locator('.library-design').count(),1);
await p.locator('.library-editions > summary').click();const saved=p.locator('.edition-list .edition-link');assert.ok(await saved.count()>3);
assert.match(await saved.first().innerText(),/R4/);const href=await saved.first().getAttribute('href');assert.match(href,/review=/);
for(const width of [320,390,768,1440]){await p.setViewportSize({width,height:1000});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
await p.setViewportSize({width:390,height:1000});await p.screenshot({path:'/tmp/library-editions-phone.png'});
const before=await (await p.request.get('http://127.0.0.1:8091/api/workspace/context')).json();
await p.goto('http://127.0.0.1:8091'+href);await p.waitForFunction(()=>document.body.dataset.ready==='true');await p.waitForFunction(()=>document.querySelector('#studio-status')?.textContent.includes('Reviewing saved version'),{},{timeout:60000});
const after=await (await p.request.get('http://127.0.0.1:8091/api/workspace/context')).json();assert.equal(after.drafts.length,before.drafts.length);assert.ok(p.url().includes('review='));assert.deepEqual(errors,[]);
console.log('PASS type filters, cross-site grouping, saved edition links, responsive expansion, exact review without draft creation');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
