// Opt-in end-to-end check for the real Studio architectural-part flow.
// Scratch workspace only: creates one disposable draft and never touches construction/world APIs.
const assert=require('node:assert/strict');
const path=require('node:path');

async function json(response){
 const body=await response.json();
 assert.ok(response.ok,response.status+' '+JSON.stringify(body));
 return body;
}
async function main(){
 if(process.env.BUILDER_PARTS_STUDIO_WRITE!=='1')throw Error('Set BUILDER_PARTS_STUDIO_WRITE=1 for the isolated scratch workspace');
 const base=process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8092';
 const output=process.env.BUILDER_EVIDENCE_DIR||'/tmp';
 const id='parts-studio-'+Date.now();
 const plan={
  schema_version:1,plan_id:id,revision:'r0',name:'Parts Studio fixture',
  description:'Disposable scratch-only Studio insertion fixture.',
  dimensions:{x:24,y:16,z:24},
  palette:{base:'minecraft:smooth_stone',seat:'minecraft:spruce_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]',table:'minecraft:spruce_planks'},
  components:[{id:'base-block',role:'base block',origin:[0,0,0],operations:[{op:'box',min:[0,0,0],max:[24,1,24],material:'base'}]}]
 };
 const created=await json(await fetch(base+'/api/workspace/drafts',{method:'POST',headers:{'Content-Type':'application/json','X-Builder-Write':'1'},body:JSON.stringify({
  plan,transform:{origin:[0,0,0],turns:0},brief:'Scratch-only architectural part UI integration check.',
  author:{agent:'codex-fixture',model:'gpt-5.6-terra',effort:'high',note:'scratch Studio parts integration'}
 })}));
 assert.equal(created.plan.components.length,1);
 assert.equal(created.author.agent,'codex-fixture');

 const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/studio?draft='+created.id);
  await page.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy==='false');
  await page.locator('#part-tools details > summary').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('#part-select option')].some(option=>option.value==='seat.pair'));
  await page.selectOption('#part-select','seat.pair');
  await page.fill('#part-x','3');await page.fill('#part-y','1');await page.fill('#part-z','3');
  await page.selectOption('[data-parameter="seat"]','seat');
  await page.selectOption('[data-parameter="table"]','table');
  await page.selectOption('[data-parameter="facing"]','north');
  await page.fill('[data-parameter="width"]','3');
  const version=created.version;
  await page.click('#insert-part');
  await page.waitForFunction(async({draftId,version})=>{
   const response=await fetch('/api/workspace/drafts/'+draftId);
   if(!response.ok)return false;
   const draft=await response.json();
   return draft.version>version&&draft.plan.components.some(component=>component.id==='part-seat-pair-1');
  },{draftId:created.id,version},{timeout:30000});
  await page.waitForFunction(()=>document.body.dataset.busy==='false');

  const after=await json(await fetch(base+'/api/workspace/drafts/'+created.id));
  const component=after.plan.components.find(item=>item.id==='part-seat-pair-1');
  assert.ok(component,'seat.pair component was inserted');
  assert.equal(after.plan.schema_version,2);
  assert.deepEqual(component.operations,[{op:'call',part:'seat.pair',at:[3,1,3],params:{width:3,seat:'seat',table:'table',facing:'north'}}]);
  const cells=after.candidate.blocks.filter(cell=>cell.component===component.id);
  assert.equal(cells.length,7);
  assert.equal(after.author.agent,'studio');
  assert.equal(after.author.model,'operator');
  assert.deepEqual(errors,[]);

  await page.setViewportSize({width:320,height:700});
  await page.locator('#revise-workspace').scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(output,'parts-studio-320.png'),fullPage:false});
  console.log('PARTS_STUDIO_PASS draft='+created.id+' component='+component.id+' cells='+cells.length+' version='+after.version+' screenshot='+path.join(output,'parts-studio-320.png'));
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
