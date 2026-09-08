const assert=require('node:assert/strict'),fs=require('node:fs'),nbt=require('prismarine-nbt');
const {meshArtifact}=require('./mesh.cjs'),{exportSchematic}=require('./schematic.cjs'),{hash}=require('./sites.cjs');
const {diff,compilePlan}=require('./design-service.cjs');
(async()=>{
 for(const facing of ['north','east','south','west'])for(const part of ['head','foot']){
  const m=meshArtifact({hash:'probe',dimensions:{x:1,y:1,z:1},blocks:[{x:0,y:0,z:0,block:`minecraft:blue_bed[facing=${facing},occupied=false,part=${part}]`}]});
  assert.ok(m.sections.some(s=>s.positions.length>0));
 }
 const plan=JSON.parse(fs.readFileSync(__dirname+'/old-town-corner-stores-r2.plan.json')),a=await compilePlan(plan);
 const badPlan=structuredClone(plan);badPlan.signs[0].lines=['too few'];await assert.rejects(()=>compilePlan(badPlan),/four lines/);
 const misplaced=structuredClone(plan);misplaced.signs[0].at=[0,0,0];await assert.rejects(()=>compilePlan(misplaced),/unique wall sign/);
 const mesh=meshArtifact(a);assert.equal(mesh.signs.length,12);assert.equal(meshArtifact(a,6).signs.length,5);
 const parsed=nbt.simplify((await nbt.parse(exportSchematic(a))).parsed).Schematic;
 assert.equal(parsed.Blocks.BlockEntities.length,12);
 for(const [i,s]of a.signs.entries()){
  const entity=parsed.Blocks.BlockEntities[i];assert.equal(entity.Id,'minecraft:sign');assert.deepEqual(entity.Pos,s.at);
  assert.deepEqual(entity.Data.front_text.messages.map(x=>JSON.parse(x).text),s.lines);
 }
 const change=structuredClone(a);change.signs[0].lines[0]='UPDATED';delete change.hash;change.hash=hash(change);
 assert.ok(diff(change,a).some(c=>c.kind==='change'));
 const invalid=structuredClone(a);invalid.signs[0].at=[0,0,0];delete invalid.hash;invalid.hash=hash(invalid);
 assert.throws(()=>exportSchematic(invalid),/Sign block missing/);
 console.log('PASS bed geometry in 8 states; sign cutaways; all 12 NBT texts/positions; sign text diff; invalid metadata rejected');
})().catch(e=>{console.error(e);process.exitCode=1});
