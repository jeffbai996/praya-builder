const assert=require('node:assert/strict'),fs=require('node:fs');
const root=require('node:path').resolve(__dirname,'../../..');const {compilePlan}=require(root+'/preview/design-service.cjs');const {transformCells,assessSite}=require(root+'/preview/sites.cjs');
const read=(kind,id)=>JSON.parse(fs.readFileSync(`${root}/preview/.workspace/${kind}/${id}.json`));
(async()=>{
 const source=read('drafts','2b811046-2da7-42ff-91c4-879ce5d0b7aa'),adapted=read('drafts','a354d91d-caa6-40af-b31e-c2ef02323c88');
 const existing=new Map(transformCells(adapted.candidate,adapted.transform).map(c=>[[c.x,c.y,c.z].join(','),c]));let count=0;
 for(const c of transformCells(source.candidate,source.transform))if(c.y>=68&&c.block!=='minecraft:air'){
  const after=existing.get([c.x,c.y,c.z].join(','));assert(after);assert.equal(after.block,c.block);assert.equal(after.component,c.component);count++;
 }
 for(const id of [source.id,adapted.id,'a98cc0ea-361d-4278-a192-6be60249a307','b6406130-ba8e-49af-8703-7b1a8849d07b']){
  const d=read('drafts',id);const compiled=await compilePlan(d.plan);assert.equal(compiled.hash,d.candidate.hash,'Reproducible plan '+id);
  if(id!==source.id){assert(d.valid);assert.equal(d.access.issues.length,0);assert(assessSite(read('sites',d.siteId),compiled,d.transform).valid);}
 }
 const placed=read('jobs','89141f47-a2ce-4dfd-a3c7-c49133095de1');assert.equal(placed.state,'completed');assert.equal(placed.cursor,4616);assert.equal(placed.verificationConflicts.length,0);assert.equal(placed.observedStates.length,4616);
 console.log(`SANDBOX_DESIGNS_PASS 4 reproducible artifacts; ${count} upper-storey cells preserved in world coordinates; valid site/access checks; 4616 observed placement cells`);
})().catch(e=>{console.error(e);process.exitCode=1;});
