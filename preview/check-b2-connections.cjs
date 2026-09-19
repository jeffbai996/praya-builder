const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {projects,createPlan}=require('./catalog.cjs');
const {compilePlan}=require('./design-service.cjs');
const {generate}=require('./generate-block-face-table.cjs');
const {resolveConnections}=require('./thin-block-connections.cjs');
const {stateBlock}=require('./mesh.cjs');

const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
(async()=>{
 const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'..','tests','fixtures','b2-catalogue-baseline.json')));
 const fixtures=projects.flatMap(project=>project.revisions.map(({id:revision})=>({project,revision})));
 assert.equal(fixtures.length,19,'the current catalogue has nineteen immutable revisions');
 assert.equal(baseline.fixtureCount,fixtures.length);
 for(const {project,revision}of fixtures){
  const stem=project.id==='courtyard'?revision:`${project.id}-${revision}`,expected=baseline.fixtures.find(item=>item.stem===stem);
  assert.ok(expected,`baseline missing ${stem}`);
  const plan=createPlan(project.id,revision),planBytes=JSON.stringify(plan,null,2),artifact=await compilePlan(plan),artifactBytes=JSON.stringify(artifact)+'\n';
  assert.equal(sha(planBytes),expected.planSha256,`${stem} plan drifted`);
  assert.equal(artifact.hash,expected.candidateHash,`${stem} candidate hash drifted`);
  assert.equal(sha(artifactBytes),expected.artifactSha256,`${stem} artifact bytes drifted`);
  assert.equal(artifact.blocks.length,expected.blocks,`${stem} block count drifted`);
 }
 const tableFile=path.join(__dirname,'..','src','main','resources','block-face-connections-1.21.4.json');
 assert.equal(JSON.stringify(generate())+'\n',fs.readFileSync(tableFile,'utf8'),'face table must be reproducible from registry data');
 const r1=JSON.parse(fs.readFileSync(path.join(__dirname,'designs','point-tower-2026-09-18','point-tower-r1.plan.json'))),r1Artifact=await compilePlan(r1);
 assert.equal(r1Artifact.hash,'4ab0a0e77c844e899898d8dd874d465a0f42ed291460d30b6d305dcac23b9c7d','Point Tower R1 remains immutable');
 const r2=JSON.parse(fs.readFileSync(path.join(__dirname,'designs','point-tower-2026-09-18','point-tower-r2.plan.json'))),r2Artifact=await compilePlan(r2);
 assert.equal(r2Artifact.hash,'94590e608ccf7882b924b601d97dfde98dfb6f7e0c958a409f8c1411dd241b8c');
 const key=block=>`${block.x},${block.y},${block.z}`,r1Blocks=new Map(r1Artifact.blocks.map(block=>[key(block),block]));let connectionBlocks=0,connectionArms=0;
 assert.equal(r2Artifact.blocks.length,r1Artifact.blocks.length);
 for(const after of r2Artifact.blocks){
  const before=r1Blocks.get(key(after));assert.ok(before,`R2 added ${key(after)}`);r1Blocks.delete(key(after));
  assert.equal(after.component,before.component,`owner changed at ${key(after)}`);
  assert.equal(after.block.split('[')[0],before.block.split('[')[0],`material changed at ${key(after)}`);
  if(after.block!==before.block){
   connectionBlocks++;const oldProperties=stateBlock(before.block).getProperties(),newProperties=stateBlock(after.block).getProperties();
   for(const direction of ['north','east','south','west'])if(oldProperties[direction]!==newProperties[direction])connectionArms++;
  }
 }
 assert.equal(r1Blocks.size,0,'R2 removed coordinates');assert.equal(connectionBlocks,326,'R2 changes only audited connection states');
 assert.equal(connectionArms,386,'R2 repairs the audited individual connection arms');
 assert.equal(resolveConnections(r1Artifact.blocks).changed,326);assert.equal(resolveConnections(r2Artifact.blocks).changed,0);
 assert.deepEqual(r2Artifact.signs,r1Artifact.signs);
 console.log(`B2_CONNECTIONS_PASS catalogue=${fixtures.length} pointR1=${r1Artifact.hash} pointR2=${r2Artifact.hash} repairedBlocks=${connectionBlocks} repairedArms=${connectionArms}`);
})().catch(error=>{console.error(error);process.exitCode=1});
