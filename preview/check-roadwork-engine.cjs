const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {compileRoad,detectRoad,makeFixtureSurvey}=require('./roadwork-engine.cjs');
const {exportSchematic}=require('./schematic.cjs');
const {readSchematic}=require('./site-nbt.cjs');

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const points=[{x:17,y:64,z:12},{x:47,y:65,z:15}];
const worldKey=c=>[c.x,c.y,c.z].join(',');
function revise(survey,patch){
 const content={...survey,...patch};
 delete content.hash;
 return {...content,hash:hash(content)};
}
function decodeSchematic(bytes){
 const n=readSchematic(bytes),palette=Object.fromEntries(Object.entries(n.Blocks.Palette).map(([state,id])=>[id,state]));
 const cells=[],data=n.Blocks.Data,volume=n.Width*n.Height*n.Length;
 let offset=0;
 for(let i=0;i<volume;i++){
  let id=0,shift=0,part;
  do{part=data[offset++];id|=(part&127)<<shift;shift+=7;}while(part&128);
  cells.push(palette[id]);
 }
 assert.equal(offset,data.length);
 return {n,cells};
}

const survey=makeFixtureSurvey();
assert.equal(survey.source,'test-fixture');
assert.match(survey.name,/test fixture/i);
const detected=detectRoad(survey);
assert.deepEqual(detected.suggestedPoints,[{x:10,y:64,z:12},{x:54,y:65,z:15}]);
assert.equal(detected.orientation,'x');
const proposal=compileRoad({survey,points});
assert.equal(proposal.ready,true,JSON.stringify(proposal.issues));
assert.equal(proposal.schema,'praya.roadwork.assembly.v1');
assert.equal(proposal.segments.length,2);
assert.ok(proposal.changes.length>100);
assert.ok(proposal.metrics.excavatedBlocks>0);
assert.ok(proposal.metrics.routeLength>0);
assert.equal(proposal.metrics.changedBlocks,proposal.changes.length);
assert.equal(proposal.samples[0].station,0);
for(let i=1;i<proposal.samples.length;i++){
 const a=proposal.samples[i-1],b=proposal.samples[i];
 assert.ok(b.station>a.station,'station must follow actual generated horizontal distance');
 assert.ok(Math.abs(b.station-a.station-Math.hypot(b.x-a.x,b.z-a.z))<0.002);
}
assert.ok(Math.abs(proposal.samples.at(-1).station-proposal.metrics.routeLength)<0.002);
assert.ok(proposal.samples[0].heading[0]>0&&proposal.samples.at(-1).heading[0]>0);
assert.equal(proposal.metrics.exportCells,proposal.segments.reduce((n,s)=>n+s.artifact.blocks.length,0));
assert.deepEqual(compileRoad({survey,points}),proposal);
assert.deepEqual(proposal.segments[0].ports.exit,proposal.segments[1].ports.entry);
assert.deepEqual(proposal.segments[0].ports.entry.at,[17,64,12]);
assert.deepEqual(proposal.segments[1].ports.exit.at,[47,65,15]);
const ownership=new Set(),surveyCells=new Map(survey.blocks.map(c=>[worldKey({x:c.x+survey.origin[0],y:c.y+survey.origin[1],z:c.z+survey.origin[2]}),c.block]));
const exported=new Map();
for(const segment of proposal.segments){
 const {x:width,y:height,z:depth}=segment.artifact.dimensions;
 assert.ok(width<=48&&height<=64&&depth<=48);
 assert.equal(segment.artifact.blocks.length,width*height*depth,'every schematic cell must be explicit');
 assert.ok(segment.artifact.blocks.length<=10000);
 const {n,cells}=decodeSchematic(exportSchematic(segment.artifact));
 assert.equal(n.Width,width);assert.equal(n.Height,height);assert.equal(n.Length,depth);
 for(const cell of segment.artifact.blocks){
  const x=cell.x+segment.origin[0],y=cell.y+segment.origin[1],z=cell.z+segment.origin[2],k=worldKey({x,y,z});
  assert.ok(!ownership.has(k),'two schematic envelopes must not own the same world cell');
  ownership.add(k);
  const encoded=cells[cell.x+cell.z*width+cell.y*width*depth];
  assert.equal(encoded,cell.block,'exported Sponge palette must agree with artifact');
  exported.set(k,cell.block);
 }
}
for(const change of proposal.changes){
 assert.equal(change.before,surveyCells.get(worldKey(change))||'minecraft:air');
 assert.equal(exported.get(worldKey(change)),change.after,'proposed change must appear in exported schematic');
}
for(const [k,after] of exported){
 const changed=proposal.changes.some(c=>worldKey(c)===k);
 if(!changed)assert.equal(after,surveyCells.get(k)||'minecraft:air','unchanged surveyed context must be preserved');
}

const shaped=[{x:17,y:64,z:12},{x:31,y:65,z:20},{x:47,y:65,z:15}];
const preserve=compileRoad({survey,points:shaped,alternative:'preserve'});
const balanced=compileRoad({survey,points:shaped,alternative:'balanced'});
const direct=compileRoad({survey,points:shaped,alternative:'direct'});
assert.ok([preserve,balanced,direct].every(a=>a.ready));
assert.ok(direct.metrics.routeLength<preserve.metrics.routeLength,'direct should straighten the intermediate bend');
assert.notEqual(preserve.hash,balanced.hash);
assert.notEqual(balanced.hash,direct.hash);
assert.notDeepEqual(preserve.samples,balanced.samples);
assert.notDeepEqual(preserve.samples,direct.samples);

const protectedCell=proposal.changes[0],protectedBox={min:[protectedCell.x,protectedCell.y,protectedCell.z],max:[protectedCell.x+1,protectedCell.y+1,protectedCell.z+1]};
const protectedSurvey=revise(survey,{protected:[protectedBox]});
const protectedPlan=compileRoad({survey:protectedSurvey,points});
assert.equal(protectedPlan.ready,false);
assert.ok(protectedPlan.issues.some(i=>i.code==='protected_cell'));
assert.ok(protectedPlan.issues.some(i=>i.code==='protected_export_envelope'));
const denseContext=proposal.segments[0].artifact.blocks.find(c=>!proposal.changes.some(d=>d.x===c.x+proposal.segments[0].origin[0]&&d.y===c.y+proposal.segments[0].origin[1]&&d.z===c.z+proposal.segments[0].origin[2]));
assert.ok(denseContext);
const contextWorld=[denseContext.x+proposal.segments[0].origin[0],denseContext.y+proposal.segments[0].origin[1],denseContext.z+proposal.segments[0].origin[2]];
const contextBox={min:contextWorld,max:contextWorld.map(v=>v+1)};
const contextPlan=compileRoad({survey:revise(survey,{protected:[contextBox]}),points});
assert.equal(contextPlan.ready,false);
assert.ok(contextPlan.issues.some(i=>i.code==='protected_export_envelope'),'full-envelope paste must detect unchanged protected cells');

assert.equal(compileRoad({survey:revise(survey,{complete:false}),points}).ready,false);
const unknown=compileRoad({survey,points:[{x:2,y:64,z:2},{x:31,y:65,z:2}],width:15});
assert.equal(unknown.ready,false);
assert.ok(unknown.issues.some(i=>i.code==='unknown_survey'));
assert.throws(()=>compileRoad({survey:{...survey,blocks:survey.blocks.slice(1)},points}),/hash mismatch/);
assert.throws(()=>compileRoad({survey,points,width:48}),/width/);
assert.throws(()=>compileRoad({survey,points:[points[0],points[0]]}),/two blocks apart/);
assert.throws(()=>compileRoad({survey,points:[{x:17,y:64,z:12},{x:20,y:68,z:12}]}),/grade/);
const elevated=compileRoad({survey,points:[{x:17,y:72,z:12},{x:47,y:72,z:15}]});
assert.equal(elevated.ready,false);
assert.ok(elevated.issues.some(i=>i.code==='unsupported_fill'),'floating road must not become construction-ready');
const loop=compileRoad({survey,points:[points[0],points[1],points[0]]});
assert.equal(loop.ready,false);
assert.ok(loop.issues.some(i=>i.code==='disconnected_centerline'||i.code==='revisited_segment'));
const flooded=revise(survey,{blocks:survey.blocks.map(c=>c.x===17&&c.y===4&&c.z===12?{...c,block:'minecraft:water'}:c)});
const floodedPlan=compileRoad({survey:flooded,points});
assert.equal(floodedPlan.ready,false);
assert.ok(floodedPlan.issues.some(i=>i.code==='fluid_conflict'));
const noProtection=compileRoad({survey:revise(survey,{protected:undefined}),points});
assert.equal(noProtection.ready,true);

// Rotate the fixture's road cells to exercise detection of a north-south street.
const rotatedBlocks=survey.blocks.map(c=>({x:c.z,y:c.y,z:c.x,block:c.block,component:c.component}));
const rotated=revise(survey,{dimensions:{x:30,y:16,z:64},blocks:rotatedBlocks});
assert.equal(detectRoad(rotated).orientation,'z');
assert.equal(detectRoad(rotated).suggestedPoints.length,2);

console.log('ROADWORK_ENGINE_PASS deterministic two-segment corridor, measured alternatives, dense schematic round trip, seam ownership, protected context, unknown survey, hash binding, both road orientations');
