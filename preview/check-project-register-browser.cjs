const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {FileStore}=require('./workspace-store.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'register-browser-')),store=new FileStore(root);
const port=18093,base='http://127.0.0.1:'+port;
const site=store.create('sites',{name:'Test fixture waterfront',world:'browser-test',worldId:'browser-only',origin:[20,64,40],blocks:[]});
for(let i=0;i<16;i++){
 const d=store.create('drafts',{project:'fixture-design-'+i+':'+(i===0?site.id:'unassigned'),siteId:i===0?site.id:null,plan:{name:'Fixture design '+String(i).padStart(2,'0'),revision:'r1'},candidate:{hash:'hash'+i},valid:true});
 store.create('revisions',{project:d.project,draftId:d.id,siteId:d.siteId,plan:d.plan,artifactHash:d.candidate.hash});
}
const originalDrafts=JSON.stringify(store.list('drafts')),originalVersions=JSON.stringify(store.list('revisions'));
const env={...process.env,PREVIEW_PORT:String(port),PREVIEW_PUBLIC_ORIGIN:'',BUILDER_WORKSPACE_DIR:root,BUILDER_TEST_BRIDGE_URL:'',BUILDER_SURVEY_URL:''};
const server=spawn(process.execPath,[path.join(__dirname,'server.cjs')],{env,stdio:['ignore','pipe','pipe']});let output='';server.stdout.on('data',b=>output+=b);server.stderr.on('data',b=>output+=b);
let browser;
(async()=>{try{
 for(let i=0;i<30;i++){if(server.exitCode!==null)throw Error(output);try{if((await fetch(base+'/api/health',{signal:AbortSignal.timeout(1000)})).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:390,height:1000}}),errors=[],requests=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
 await p.goto(base+'/?panel=register');await p.waitForSelector('.library-design');
 assert.equal(await p.locator('.library-design').count(),6);assert.equal(requests.some(u=>u.endsWith('/api/workspace/context')),false);
 await p.selectOption('#working-sort','name');await p.waitForFunction(()=>document.querySelector('.working-card-text strong')?.textContent==='Fixture design 00');
 await p.click('#working-next');await p.waitForFunction(()=>document.querySelector('.working-card-text strong')?.textContent==='Fixture design 06');
 await p.fill('#working-search','Fixture design 00');await p.waitForFunction(()=>document.querySelectorAll('.library-design').length===1);
 await p.click('.location-edit');await p.waitForSelector('#location-dialog[open]');
 await p.fill('#location-number','18');await p.fill('#location-street','Fixture Avenue');await p.fill('#location-municipality','Fixture City');await p.fill('#location-neighbourhood','Fixture Quarter');
 await p.selectOption('#location-status','verified');await p.click('#location-save');await p.waitForFunction(()=>document.querySelector('#location-error').textContent.includes('source'));
 await p.fill('#location-source','Browser test fixture, not Praya canon');await p.click('#location-save');await p.waitForSelector('#location-dialog',{state:'hidden'});
 await p.waitForFunction(()=>document.querySelector('.location-address')?.textContent.includes('18 Fixture Avenue'));
 await p.reload();await p.waitForSelector('.library-design');await p.fill('#working-search','18 Fixture Avenue');await p.waitForFunction(()=>document.querySelectorAll('.library-design').length===1);
 assert.match(await p.locator('.location-address').innerText(),/Fixture City/);assert.equal(await p.locator('.address-status').innerText(),'Verified');
 const href=await p.locator('.working-design-link').getAttribute('href');assert.match(href,/draft=/);
 await p.click('.library-editions > summary');await p.waitForSelector('.edition-link');assert.match(await p.locator('.edition-link').first().getAttribute('href'),/review=/);
 await p.fill('#working-search','');await p.selectOption('#working-municipality','Fixture City');await p.waitForFunction(()=>document.querySelectorAll('.library-design').length===1);
 await p.selectOption('#working-assignment','unassigned');await p.waitForFunction(()=>document.querySelector('#working-design-status').textContent.includes('No designs match'));
 await p.selectOption('#working-municipality','');await p.waitForFunction(()=>document.querySelectorAll('.library-design').length===6);
 await p.selectOption('#working-assignment','addressed');await p.waitForFunction(()=>document.querySelectorAll('.library-design').length===1);
 for(const width of [320,390,768,1440]){await p.setViewportSize({width,height:1000});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow at '+width);await p.click('.location-edit');assert.equal(await p.evaluate(()=>{const r=document.querySelector('#location-dialog').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}),true);await p.click('#location-cancel');}
 // Two editors: stale metadata must never overwrite the newer value.
 await p.click('.location-edit');const second=await browser.newPage();await second.goto(base+'/?panel=register');await second.fill('#working-search','18 Fixture Avenue');await second.waitForSelector('.location-edit');await second.click('.location-edit');await second.fill('#location-unit','A');await second.click('#location-save');await second.waitForSelector('#location-dialog',{state:'hidden'});
 await p.fill('#location-unit','B');await p.click('#location-save');await p.waitForFunction(()=>document.querySelector('#location-error').textContent.includes('changed'));await p.click('#location-cancel');
 assert.equal(JSON.stringify(store.list('drafts')),originalDrafts);assert.equal(JSON.stringify(store.list('revisions')),originalVersions);
 const rejected=await p.request.post(base+'/api/workspace/library/locations/'+store.list('project-locations')[0].id,{data:{}});assert.equal(rejected.status(),403);
 assert.deepEqual(errors,[]);console.log('PASS register HTTP and browser: pagination, lazy editions, address persistence, provenance, filters, mobile/dialog fit, stale edit conflicts, unchanged designs, write guard');
 }finally{await browser?.close();if(server.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}fs.rmSync(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
