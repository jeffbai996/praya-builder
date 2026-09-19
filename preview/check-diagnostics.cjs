const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {diagnose,RULES,DIAGNOSTICS_VERSION}=require('./diagnostics.cjs');

const block=(x,y,z,state='minecraft:stone',component='fixture')=>({x,y,z,block:state,component});
const artifact=(blocks,{dimensions={x:20,y:20,z:20},spaces=[],signs=[]}={})=>({
 schema_version:1,compiler_version:'fixture',plan_id:'diagnostics-fixture',revision:'r0',name:'Diagnostics fixture',description:'',dimensions,components:[],spaces,references:[],blocks,signs,hash:'fixture'
});
const site=({dimensions={x:20,y:12,z:20},plot,protected=[],blocks=[]}={})=>({
 schemaVersion:1,name:'Fixture site',world:'fixture',origin:[0,0,0],dimensions,capturedAt:'2026-09-18T00:00:00.000Z',plot:plot||{min:[0,0,0],max:[dimensions.x,dimensions.y,dimensions.z]},frontage:[1,1,1],protected,complete:true,dataVersion:4189,sourceHash:'fixture',hash:'fixture-site',blocks,warnings:[]
});
const transform={origin:[0,0,0],turns:0};
const rules=entries=>new Set(entries.map(entry=>entry.rule));

test('diagnostic registry and entries are versioned',()=>{
 assert.equal(DIAGNOSTICS_VERSION,1);
 assert.deepEqual(RULES['compile.invalid-plan'],{version:1,severity:'error'});
 const entries=diagnose(artifact([block(3,3,3)]),null,null);
 assert.ok(entries.length);
 for(const entry of entries){
  assert.deepEqual(Object.keys(entry),['rule','version','severity','component','at','message','hint']);
  assert.equal(entry.version,RULES[entry.rule].version);
  assert.equal(entry.severity,RULES[entry.rule].severity);
 }
});

test('bounds rules distinguish survey cap, survey sides, plot and protection',()=>{
 const cap=diagnose(artifact([block(2,12,2)],{dimensions:{x:20,y:13,z:20}}),site(),transform).find(e=>e.rule==='bounds.survey-cap');
 assert.ok(cap);assert.match(cap.message,/world Y12/);assert.match(cap.hint,/Y12 is the first unknown layer/);assert.deepEqual(cap.at,[2,12,2]);
 assert.ok(rules(diagnose(artifact([block(20,2,2)],{dimensions:{x:21,y:20,z:20}}),site(),transform)).has('bounds.survey'));
 assert.ok(rules(diagnose(artifact([block(12,2,2)]),site({plot:{min:[0,0,0],max:[10,12,20]}}),transform)).has('bounds.plot'));
 assert.ok(rules(diagnose(artifact([block(4,2,4)]),site({protected:[{min:[4,0,4],max:[5,4,5]}]}),transform)).has('site.protected'));
});

test('walk diagnostics locate a route blocker and insufficient headroom',()=>{
 const ground=[...Array.from({length:6},(_,i)=>block(i+1,0,1)),block(1,0,2)];
 const candidate=artifact([
  block(1,2,2,'minecraft:polished_deepslate','unrelated-stair'),
  block(3,2,1,'minecraft:polished_deepslate','switchback-stair'),
  block(6,1,1,'minecraft:spruce_door[facing=east,half=lower,hinge=left,open=false,powered=false]','flat-door'),
  block(6,2,1,'minecraft:spruce_door[facing=east,half=upper,hinge=left,open=false,powered=false]','flat-door'),
 ]);
 const entries=diagnose(candidate,site({blocks:ground}),transform),door=entries.find(e=>e.rule==='walk.door-unreachable');
 assert.ok(door);assert.deepEqual(door.at,[6,1,1]);assert.match(door.hint,/Blocked at \[3,2,1\] by minecraft:polished_deepslate \(switchback-stair\)/);
 assert.doesNotMatch(door.hint,/\[1,2,2\]/,'an unrelated lower stair obstruction is not blamed');
 const headroom=entries.find(e=>e.rule==='walk.headroom'&&e.component==='switchback-stair');assert.ok(headroom);assert.deepEqual(headroom.at,[3,1,1]);
});

test('floating, uncovered roof and dark corridor rules expose useful cells',()=>{
 const floating=diagnose(artifact([block(3,3,3)]),null,null).find(e=>e.rule==='support.floating');assert.deepEqual(floating.at,[3,3,3]);
 const roofCandidate=artifact([block(1,0,1,'minecraft:birch_planks','floor')],{spaces:[{id:'room',min:[1,1,1],max:[2,3,2]}]});
 const roof=diagnose(roofCandidate,null,null).find(e=>e.rule==='roof.uncovered');assert.ok(roof);assert.match(roof.hint,/Space room/);
 const ground=Array.from({length:15},(_,i)=>block(i+1,0,1));
 const dark=diagnose(artifact([]),site({blocks:ground}),transform).find(e=>e.rule==='light.dark-corridor');assert.ok(dark);assert.match(dark.hint,/No known light-emitting block/);
 const unlit=artifact([block(8,1,2,'minecraft:redstone_torch[lit=false]','unlit')]);
 assert.ok(diagnose(unlit,site({blocks:ground}),transform).some(e=>e.rule==='light.dark-corridor'),'an unlit redstone torch is not a light source');
 const surveyedLight=block(8,1,2,'minecraft:lantern[hanging=false,waterlogged=false]','context');
 assert.equal(diagnose(artifact([]),site({blocks:[...ground,surveyedLight]}),transform).some(e=>e.rule==='light.dark-corridor'),false,'nearby surveyed lights count');
});

test('sign and pane rules validate support and semantic connection state',()=>{
 const orphan=artifact([block(2,2,2,'minecraft:oak_wall_sign[facing=north,waterlogged=false]','sign')],{signs:[{at:[2,2,2],lines:['A','','','']}]});
 assert.ok(rules(diagnose(orphan,null,null)).has('sign.orphan'));
 const unresolved=artifact([
  block(2,2,2,'minecraft:glass_pane[north=false,east=false,south=false,west=false,waterlogged=false]','pane'),
  block(3,2,2),
 ]);
 const pane=diagnose(unresolved,null,null).find(e=>e.rule==='pane.unresolved');assert.ok(pane);assert.deepEqual(pane.at,[2,2,2]);assert.match(pane.hint,/east=true/);
 const lone=artifact([block(2,2,2,'minecraft:glass_pane','pane')]);
 assert.equal(diagnose(lone,null,null).some(e=>e.rule==='pane.unresolved'),false,'default properties compare by state id, not text');
});

test('rotated diagnostics remain in plan-local coordinates',()=>{
 const candidate=artifact([block(2,12,3)],{dimensions:{x:6,y:13,z:8}}),fixture=site({dimensions:{x:20,y:12,z:20}});
 for(let turns=0;turns<4;turns++){
  const entry=diagnose(candidate,fixture,{origin:[4,0,4],turns}).find(e=>e.rule==='bounds.survey-cap');
  assert.deepEqual(entry.at,[2,12,3]);
 }
});

test('recovered Point Tower R0 failures retain their exact findings',{skip:process.env.A1_RUNTIME_FIXTURES!=='1'},async()=>{
 const root=path.resolve(__dirname,'..'),tallId='a2e63b70-7b84-4026-a547-7796969c08fd',stairId='f44f9853-d030-4241-9cda-e10fde1c5937';
 const draftFile=id=>path.join(root,'preview','.workspace','drafts',`${id}.json`);
 assert.ok(fs.existsSync(draftFile(tallId)),`missing opted-in runtime fixture ${tallId}`);
 assert.ok(fs.existsSync(draftFile(stairId)),`missing opted-in runtime fixture ${stairId}`);
 const {compilePlan}=require('./design-service.cjs');
 for(const [id,expected]of [[tallId,'cap'],[stairId,'stair']]){
  const draft=JSON.parse(fs.readFileSync(draftFile(id))),siteRecord=JSON.parse(fs.readFileSync(path.join(root,'preview','.workspace','sites',`${draft.siteId}.json`)));
  const candidate=await compilePlan(draft.plan);assert.equal(candidate.hash,draft.candidate.hash,'historical plan compiles byte-identically');
  const entries=diagnose(candidate,siteRecord,draft.transform);
  if(expected==='cap'){const cap=entries.find(e=>e.rule==='bounds.survey-cap');assert.ok(cap);assert.match(cap.hint,/Y112 is the first unknown layer/);}
  else {const door=entries.find(e=>e.rule==='walk.door-unreachable'&&e.hint.includes('Blocked at [13,5,10]'));assert.ok(door);assert.match(door.hint,/minecraft:polished_deepslate \(switchback-stair\)/);}
 }
});
