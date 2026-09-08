const {test}=require('node:test'),assert=require('node:assert/strict');
const {readiness}=require('./next-run-readiness.cjs');
const integration={mapUrl:'https://map.example/',mapId:'world',world:'world',capture:'worldedit-schematic'};
test('an isolated connection never reports Praya placement ready',()=>{
 const report=readiness({integration,bridge:{connected:true,world:'isolated',worldId:'a'},selection:null});
 assert.equal(report.placementReady,false);assert.ok(report.blockers.some(b=>b.code==='world-mismatch'));
});
test('a selected plot must fit all three reserved dimensions',()=>{
 const bridge={connected:true,world:'world',worldId:'a',minimum:[0,60,0],maximum:[32,96,32]};
 const selection={world:'world',plot:{min:[0,60,0],max:[32,96,32]}};
 assert.equal(readiness({integration,bridge,selection}).placementReady,false);
 assert.equal(readiness({integration,bridge,selection}).plotEligible,true);
 selection.plot.max[1]=97;
 assert.equal(readiness({integration,bridge,selection}).plotEligible,false);
});
test('missing identity or malformed bounds cannot establish readiness',()=>{
 const selection={world:'world',plot:{min:[0,60,0],max:[32,96,32]}};
 const bridge={connected:true,world:'world',minimum:[0,60,0],maximum:[32,96,32]};
 assert.equal(readiness({integration,bridge,selection}).plotEligible,false);
 bridge.worldId='a';selection.plot.max[0]=NaN;
 assert.equal(readiness({integration,bridge,selection}).plotEligible,false);
});
test('a prepared job is eligible only for its exact world and selected volume',()=>{
 const bridge={connected:true,world:'world',worldId:'a',minimum:[0,60,0],maximum:[32,96,32]};
 const selection={world:'world',plot:{min:[0,60,0],max:[32,96,32]}};
 const job={state:'prepared',world:'world',worldId:'a',artifactHash:'a'.repeat(64),surveyHash:'b'.repeat(64),changeHash:'c'.repeat(64),changes:[{x:0,y:60,z:0}]};
 assert.equal(readiness({integration,bridge,selection,job}).placementReady,true);
 job.worldId='another-world';assert.equal(readiness({integration,bridge,selection,job}).placementReady,false);
 job.worldId='a';job.changes[0].x=32;assert.equal(readiness({integration,bridge,selection,job}).placementReady,false);
});
