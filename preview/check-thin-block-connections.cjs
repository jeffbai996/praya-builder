const assert=require('node:assert/strict'),fs=require('node:fs');
const {resolveConnections,RESOLVER_VERSION}=require('./thin-block-connections.cjs');
const {stateBlock,meshArtifact}=require('./mesh.cjs');
const {compilePlan}=require('./design-service.cjs');
const {exportSchematic}=require('./schematic.cjs');
const {readSchematic}=require('./site-nbt.cjs');
const at=(x,y,z,block)=>({x,y,z,component:'fixture',block});
(async()=>{
 assert.equal(RESOLVER_VERSION,2);
 for(const name of ['gray_stained_glass_pane','iron_bars']){
  const blocks=[[0,0],[1,0],[0,1]].map(([x,z])=>at(x,0,z,`minecraft:${name}[north=false,east=true,south=false,west=true,waterlogged=true]`));
  const out=resolveConnections(blocks),props=stateBlock(out.blocks[0].block).getProperties();
  assert.equal(props.east,true);assert.equal(props.south,true);assert.equal(props.north,false);assert.equal(props.west,false);assert.equal(props.waterlogged,true);
  assert.equal(resolveConnections(out.blocks).changed,0,'idempotent semantic states');
  const shapes=stateBlock(out.blocks[0].block).shapes;assert.ok(shapes.some(box=>box[3]===1));assert.ok(shapes.some(box=>box[5]===1),'corner has both arms');
  assert.ok(meshArtifact({hash:'corner',dimensions:{x:2,y:1,z:2},blocks:out.blocks}).sections.some(section=>section.positions.length));
 }
 const mixed=resolveConnections([
  at(1,0,1,'minecraft:glass_pane'),at(2,0,1,'minecraft:iron_bars'),at(0,0,1,'minecraft:stone'),
  at(1,0,0,'minecraft:cobblestone_wall'),
 ]).blocks;
 assert.deepEqual(stateBlock(mixed[0].block).getProperties(),{north:true,east:true,south:false,west:true,waterlogged:false});
 assert.equal(stateBlock(mixed[1].block).getProperties().west,true,'bars connect to panes');
 const wall=stateBlock(mixed[3].block).getProperties();assert.equal(wall.south,'low');assert.equal(wall.up,true);
 const fence=stateBlock(resolveConnections([
  at(1,0,1,'minecraft:oak_fence'),at(2,0,1,'minecraft:stone'),at(0,0,1,'minecraft:glass_pane'),at(1,0,0,'minecraft:spruce_fence'),
 ]).blocks[0].block).getProperties();
 assert.equal(fence.east,true);assert.equal(fence.north,true);assert.equal(fence.west,false,'fences do not connect to panes');
 const stairs=resolveConnections([
  at(1,0,1,'minecraft:stone_brick_stairs[facing=north,half=bottom,waterlogged=false]'),
  at(1,0,0,'minecraft:stone_brick_stairs[facing=west,half=bottom,waterlogged=false]'),
 ]).blocks;
 assert.equal(stateBlock(stairs[0].block).getProperties().shape,'outer_left');

 const compilerPlan={schema_version:1,plan_id:'connections',revision:'r0',dimensions:{x:5,y:2,z:5},palette:{
  pane:'minecraft:glass_pane[waterlogged=true]',bars:'minecraft:iron_bars',stone:'minecraft:stone'},components:[{
  id:'fixture',role:'fixture',origin:[0,0,0],operations:[
   {op:'block',at:[1,0,1],material:'pane'},{op:'block',at:[2,0,1],material:'bars'},{op:'block',at:[0,0,1],material:'stone'}]}]};
 const compiled=await compilePlan(compilerPlan);assert.equal(resolveConnections(compiled.blocks).changed,0,'Java output agrees with the JS semantic oracle');
 assert.equal(stateBlock(compiled.blocks.find(block=>block.x===1).block).getProperties().waterlogged,true);

 const plan=JSON.parse(fs.readFileSync(__dirname+'/terraced-brick-residences-r3.plan.json')),artifact=await compilePlan(plan);
 assert.equal(resolveConnections(artifact.blocks).changed,4,'semantic oracle reports four legacy authored mismatches without rewriting them in Java');
 const nbt=readSchematic(exportSchematic(artifact)),palette=Object.fromEntries(Object.entries(nbt.Blocks.Palette).map(([state,id])=>[id,state])),data=nbt.Blocks.Data,decoded=[];
 for(let offset=0;offset<data.length;){let value=0,shift=0,byte;do{byte=data[offset++];value|=(byte&127)<<shift;shift+=7;}while(byte&128);decoded.push(palette[value]);}
 let thin=0;
 for(const block of artifact.blocks)if(/_pane|iron_bars/.test(block.block)){const state=decoded[block.x+nbt.Width*(block.z+nbt.Length*block.y)];assert.equal(stateBlock(state).stateId,stateBlock(block.block).stateId,'exported state matches at '+[block.x,block.y,block.z]);thin++;}
 assert.equal(nbt.Blocks.BlockEntities.length,artifact.signs.length);
 for(const sign of artifact.signs){assert.ok(sign.lines[0].trim()&&sign.lines[3].trim());const entity=nbt.Blocks.BlockEntities.find(value=>value.Pos.join(',')===sign.at.join(','));assert.deepEqual(entity.Data.front_text.messages.map(message=>JSON.parse(message).text),sign.lines);}
 console.log(`PASS resolver v${RESOLVER_VERSION}; Java parity; panes, bars, walls, fences, stairs; ${thin} exported thin states; ${artifact.signs.length} signs`);
})().catch(error=>{console.error(error);process.exitCode=1});
