const assert=require('node:assert/strict'),fs=require('node:fs');
const {transformCells}=require('./sites.cjs');
async function main(){
 const {placementReadiness:ready,compatibleSites,placementFit:fit,parcelPosition,placementErrorMessage}=await import('data:text/javascript;base64,'+fs.readFileSync(__dirname+'/placement-readiness.js').toString('base64'));
 const bridge={connected:true,world:'test',worldId:'copy',minimum:[-20,0,-20],maximum:[20,100,20],capabilities:{placement:1}};
 const site={id:'test-site',world:'test',worldId:'copy',plot:{min:[-3,10,-5],max:[0,13,0]}};
 const candidate={hash:'a',dimensions:{x:3,y:3,z:5},blocks:[{x:0,y:0,z:0,block:'minecraft:stone'},{x:2,y:2,z:4,block:'minecraft:air'}]};
 const draft={id:'draft',valid:true,candidate,transform:{origin:[-3,10,-5],turns:0},surveyHash:'survey'};
 const saved={draftId:'draft',artifactHash:'a',surveyHash:'survey'};
 assert.equal(ready(null,null,bridge).kind,'no-design');
 assert.equal(ready(draft,site,null).kind,'checking');
 assert.equal(ready(draft,site,{connected:false}).kind,'offline');
 assert.equal(ready(draft,site,{...bridge,capabilities:{placement:0}}).kind,'read-only');
 assert.equal(ready(draft,null,bridge).kind,'no-site');
 assert.equal(ready(draft,{...site,world:'world'},bridge).kind,'world-mismatch');
 for(const worldId of [undefined,'original'])assert.equal(ready(draft,{...site,worldId},bridge).kind,'identity-mismatch');
 assert.equal(ready({...draft,valid:false,diagnostics:['outside protected area']},site,bridge).kind,'invalid');
 for(const revision of [{...saved,draftId:'other'},{...saved,artifactHash:'old'},{...saved,surveyHash:'stale'}])assert.equal(ready(draft,site,bridge,[revision]).kind,'unsaved');
 assert.equal(ready(draft,site,bridge,[saved]).ready,true);
 assert.deepEqual(compatibleSites([site,{...site,id:'original',worldId:'original'},{...site,id:'outside',plot:{min:[-21,0,0],max:[-20,1,1]}}],bridge),[site]);
 assert.deepEqual(compatibleSites([site],{connected:false}),[]);
 const origin=[-3,10,-5];
 assert.equal(fit(candidate,site,{origin,turns:0}).fits,true);
 assert.equal(fit(candidate,site,{origin,turns:2}).fits,true);
 for(const turns of [1,3])assert.equal(fit(candidate,site,{origin,turns}).fits,false);
 assert.equal(fit(candidate,{...site,plot:{...site.plot,max:[-1,13,0]}},{origin,turns:0}).fits,false,'explicit air must fit too');
 for(const origin of [[-4,10,-5],[-3,11,-5],[-3,10,-4],[NaN,10,-5],[-2.5,10,-5]])assert.equal(fit(candidate,site,{origin,turns:0}).fits,false);
 // Survey context may reach below the permitted construction area; only proposed writes must fit it.
 const deepSite={...site,plot:{min:[-3,-10,-5],max:[0,13,0]}};
 assert.deepEqual(compatibleSites([deepSite],bridge),[deepSite]);
 assert.equal(fit(candidate,deepSite,{origin,turns:0},bridge).fits,true);
 assert.equal(fit(candidate,deepSite,{origin:[-3,-1,-5],turns:0},bridge).fits,false);
 assert.equal(ready({...draft,transform:{origin:[-3,-1,-5],turns:0}},deepSite,bridge,[saved]).kind,'area-mismatch');
 assert.equal(fit(candidate,deepSite,{origin,turns:0},{...bridge,maximum:[-1,100,20]}).fits,false,'explicit air obeys bridge bounds');
 assert.equal(fit(candidate,site,undefined).fits,false);
 // Point Tower has unspecified plan margins; its 25 x 15 write area fits a 24 x 25 parcel when rotated.
 const tower={dimensions:{x:27,y:33,z:15},blocks:[{x:1,y:0,z:0,block:'minecraft:stone'},{x:25,y:32,z:14,block:'minecraft:air'}]};
 const parcel={plot:{min:[-303,48,411],max:[-279,112,436]},frontage:[-291,64,411]};
 for(const turns of [0,2])assert.equal(fit(tower,parcel,parcelPosition(tower,parcel,turns)).fits,false);
 for(const turns of [1,3])assert.equal(fit(tower,parcel,parcelPosition(tower,parcel,turns)).fits,true);
 // Compare each quarter turn against the authoritative server transform at exact bounds, then shrink one face.
 for(let turns=0;turns<4;turns++){
  const cells=transformCells(candidate,{origin,turns});
  const min=['x','y','z'].map(axis=>Math.min(...cells.map(c=>c[axis]))),max=['x','y','z'].map(axis=>Math.max(...cells.map(c=>c[axis]))+1);
  const target={...site,plot:{min,max}};assert.equal(fit(candidate,target,{origin,turns}).fits,true);
  target.plot.max[0]--;assert.equal(fit(candidate,target,{origin,turns}).fits,false);
 }
 assert.match(placementErrorMessage('Block not in tested placement allowlist: SHORT_GRASS'),/short grass.*changing or restoring/);
 assert.match(placementErrorMessage('Survey world differs from the isolated bridge world'),/prepare a copy/);
 assert.equal(placementErrorMessage('Network unavailable'),'Network unavailable');
 console.log('PLACEMENT_READINESS_PASS world and UUID binding, immutable revision match, exact bounds including air, all quarter turns, actionable errors');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
