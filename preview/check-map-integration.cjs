const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseMapLocation,selectionMetadata,captureGuide,placementPackage}=require('./map-integration.cjs');
const config={mapUrl:'https://map.example.test/',mapId:'world',world:'world'};
test('BlueMap handoff is limited to the configured map and finite coordinates',()=>{
 assert.deepEqual(parseMapLocation('https://map.example.test/#world:-10.2:64:120.9:100:0:0:0:0:flat',config),{x:-11,z:120});
 for(const url of ['https://other.example/#world:1:64:2','https://map.example.test/#world_nether:1:64:2','https://map.example.test/#world:NaN:64:2'])assert.throws(()=>parseMapLocation(url,config));
});
test('capture bounds preserve negative world positions and enforce the survey budget',()=>{
 const s=selectionMetadata({name:'Corner plot',x:-11,z:120,base:60,width:32,depth:32,height:36},config);
 assert.deepEqual(s.origin,[-27,60,104]);assert.deepEqual(s.plot.max,[5,96,136]);
 assert.equal(captureGuide({...s,id:'abc-123'}).filename,'builder-survey-abc-123.schem');
 assert.throws(()=>selectionMetadata({name:'Big',x:0,z:0,base:0,width:128,depth:128,height:128},config));
});
test('placement package binds immutable survey and transform and carries the explicit write mask',()=>{
 const revision={id:'r',artifactHash:'a',surveyHash:'s',siteId:'plot',transform:{origin:[-2,64,5],turns:1}};
 const artifact={hash:'a',blocks:[{x:0,y:0,z:0,block:'minecraft:air'}]};
 const p=placementPackage(revision,{id:'plot',hash:'s',world:'world'},artifact);
 assert.equal(p.execution,'review-required');assert.equal(p.artifact.blocks.length,1);assert.equal(p.transform.turns,1);
 assert.throws(()=>placementPackage(revision,{id:'plot',hash:'new',world:'world'},artifact));
 assert.throws(()=>placementPackage(revision,{id:'other',hash:'s'},artifact));
});

test('frontage and protected markings are bounded whole-block geometry',()=>{
 const input={name:'Marked plot',x:0,z:0,base:60,width:32,depth:32,height:36,frontage:[0,61,-16],frontageHeight:'terrain',protected:[{min:[-16,60,-16],max:[-14,96,-14]}]};
 assert.deepEqual(selectionMetadata(input,config).protected,input.protected);
 for(const patch of [{frontage:[0,61,16]},{protected:[{min:[0,60,0],max:[17,96,2]}]},{protected:[{min:[0,60,0],max:[1.5,96,2]}]}])assert.throws(()=>selectionMetadata({...input,...patch},config));
});

test('context surrounds a plot without expanding its buildable area',()=>{
 const s=selectionMetadata({name:'Shallow plot',x:-259,z:-470,base:48,width:27,depth:15,height:64,contextMargin:8},config);
 assert.deepEqual(s.plot,{min:[-272,48,-477],max:[-245,112,-462]});assert.deepEqual(s.origin,[-280,48,-485]);assert.deepEqual(s.dimensions,{x:43,y:64,z:31});
 const guide=captureGuide({...s,id:'trial'});assert.equal(guide.commands[0],'//pos1 -280,48,-485');assert.equal(guide.commands[1],'//pos2 -238,111,-455');
 assert.throws(()=>selectionMetadata({name:'Too much context',x:0,z:0,base:0,width:128,depth:128,height:4,contextMargin:8},config));
});
