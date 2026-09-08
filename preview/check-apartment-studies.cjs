const {test}=require('node:test');
const assert=require('node:assert/strict');
const {apartmentStudy}=require('./apartment-studies.cjs');
const {compilePlan}=require('./design-service.cjs');
const {fixture}=require('./site-fixtures.cjs');
const {assessSite}=require('./sites.cjs');
const {checkAccess}=require('./accessibility.cjs');
const {applyVariant}=require('./component-variants.cjs');
for(const kind of ['bar','staggered','court'])for(const terrain of ['flat','slope'])test(kind+' fits '+terrain+' and preserves the street',async()=>{
 const site=fixture(terrain),plan=apartmentStudy(kind,terrain==='slope'?3:1),artifact=await compilePlan(plan);
 assert.ok(artifact.blocks.length<=10000);assert.equal(artifact.components.filter(c=>c.id.endsWith('-bathroom')).length,6);
 const assessment=assessSite(site,artifact,{origin:site.origin,turns:0});assert.equal(assessment.valid,true,JSON.stringify(assessment.errors.slice(0,5)));
 assert.ok(artifact.spaces.length>=6);const second=await compilePlan(plan);assert.equal(second.hash,artifact.hash);
 const access=checkAccess(site,artifact,{origin:site.origin,turns:0});assert.equal(access.openableDoors,12);assert.deepEqual(access.issues,[]);
});
test('opening a roof canopy preserves every other component',async()=>{
 const source=apartmentStudy('bar',1),plan=JSON.parse(JSON.stringify(source));
 applyVariant(plan,source,'wing-0-roof',{name:'roof-canopy',value:'open'});
 const before=await compilePlan(source),after=await compilePlan(plan);assert.ok(after.blocks.length<before.blocks.length);
 assert.deepEqual(after.blocks.filter(c=>c.component!=='wing-0-roof'),before.blocks.filter(c=>c.component!=='wing-0-roof'));
 applyVariant(plan,source,'wing-0-roof',{name:'roof-canopy',value:'sheltered'});assert.equal((await compilePlan(plan)).hash,before.hash);
});
