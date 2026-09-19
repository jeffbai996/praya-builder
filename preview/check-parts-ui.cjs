const assert=require('node:assert/strict');
const fs=require('node:fs');

async function main(){
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  const source=fs.readFileSync(__dirname+'/parts-ui.js','utf8');await page.route('**/parts-ui-test.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:source}));
  await page.goto((process.env.PREVIEW_BASE_URL||'http://127.0.0.1:8092')+'/thumbnail-render.html');
  await page.setContent('<main><div id="parts"></div><div id="broken"></div></main>');
  await page.evaluate(async()=>{
   const {createPartsUI}=await import('/parts-ui-test.js');
   const part={id:'stair.switchback',description:'Bounded stair',parameters:{width:{type:'integer',min:2,max:5,default:3},facing:{type:'enum',values:['north','east','south','west'],default:'north'},material:{type:'material',default:'wall'}}};
   const state={apiCalls:0,onChange:0,applied:[],fail:false};
   const ui=createPartsUI({container:document.querySelector('#parts'),api:async route=>{if(route!=='parts')throw Error('unexpected route');state.apiCalls++;return {parts:[part]};},apply:async value=>{state.applied.push(value);if(state.fail)throw Error('fixture compile failed');},onChange:()=>state.onChange++});
   const draft=(id,dimensions,palette,operations=[])=>({id,candidate:{dimensions},plan:{palette,components:[{id:'existing',operations}]}});
   const existing=[{op:'call',part:'stair.switchback',at:[0,0,0],params:{facing:'south'}}];
   ui.setDraft(draft('draft-1',{x:10,y:8,z:9},{wall:'minecraft:stone',trim:'minecraft:quartz_block'},existing));
   window.partsFixture={ui,state,draft,existing};
   const broken=createPartsUI({container:document.querySelector('#broken'),api:async()=>{throw Error('registry fixture failed');},apply:async()=>{}});broken.setDraft(draft('broken',{x:2,y:2,z:2},{wall:'minecraft:stone'}));window.brokenParts=broken;
  });
  await page.waitForFunction(()=>document.querySelector('#part-select')?.options.length===1);
  await page.locator('#parts details').evaluate(node=>node.open=true);
  const initial=await page.evaluate(()=>({apiCalls:partsFixture.state.apiCalls,onChange:partsFixture.state.onChange,roles:[...partsFixture.ui.roles(partsFixture.existing)],max:['x','y','z'].map(axis=>document.querySelector('#part-'+axis).max),materials:[...document.querySelector('[data-parameter="material"]').options].map(option=>option.value)}));
  assert.deepEqual(initial,{apiCalls:1,onChange:1,roles:['wall'],max:['9','7','8'],materials:['wall','trim']});
  await page.evaluate(()=>partsFixture.ui.selectCell({x:5,y:2,z:7}));await page.selectOption('[data-parameter="facing"]','east');await page.selectOption('[data-parameter="material"]','trim');await page.fill('[data-parameter="width"]','4');await page.click('#insert-part');
  await page.waitForFunction(()=>partsFixture.state.applied.length===1);assert.deepEqual(await page.evaluate(()=>partsFixture.state.applied[0]),{id:'stair.switchback',at:[5,2,7],params:{width:4,facing:'east',material:'trim'}});
  await page.fill('#part-x','10');await page.click('#insert-part');await page.waitForFunction(()=>document.querySelector('#parts [role="status"]').textContent.includes('allowed bounds'));assert.equal(await page.evaluate(()=>partsFixture.state.applied.length),1);assert.equal(await page.inputValue('#part-x'),'10');
  await page.fill('#part-x','5');await page.evaluate(()=>partsFixture.state.fail=true);await page.click('#insert-part');await page.waitForFunction(()=>document.querySelector('#parts [role="status"]').textContent==='fixture compile failed');assert(!(await page.locator('#parts [role="status"]').innerText()).includes('updated'));
  const changed=await page.evaluate(()=>{partsFixture.state.fail=false;partsFixture.ui.setDraft(partsFixture.draft('draft-2',{x:4,y:4,z:4},{stone:'minecraft:stone'}));return {coords:['x','y','z'].map(axis=>document.querySelector('#part-'+axis).value),max:['x','y','z'].map(axis=>document.querySelector('#part-'+axis).max),materials:[...document.querySelector('[data-parameter="material"]').options].map(option=>option.value),onChange:partsFixture.state.onChange};});
  assert.deepEqual(changed,{coords:['0','0','0'],max:['3','3','3'],materials:['stone'],onChange:1});
  const missing=await page.evaluate(()=>{partsFixture.ui.setDraft(partsFixture.draft('draft-3',{x:3,y:3,z:3},{}));return {disabled:document.querySelector('#insert-part').disabled,status:document.querySelector('#parts [role="status"]').textContent};});assert.equal(missing.disabled,true);assert.match(missing.status,/palette material/);
  await page.locator('#broken details').evaluate(node=>node.open=true);await page.locator('#broken details').dispatchEvent('toggle');await page.waitForFunction(()=>document.querySelector('#broken [role="status"]').textContent==='registry fixture failed');
  assert.deepEqual(errors,[]);console.log('PARTS_UI_PASS preload=1 roles=1 bounds=1 selection=1 error=1 reset=1');
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
