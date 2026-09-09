const assert=require('node:assert/strict'),fs=require('node:fs');
const {resolveConnections}=require('./thin-block-connections.cjs');
const {stateBlock,meshArtifact}=require('./mesh.cjs');
const {compilePlan}=require('./design-service.cjs');
const {exportSchematic}=require('./schematic.cjs');
const {readSchematic}=require('./site-nbt.cjs');
(async()=>{
 for(const name of ['gray_stained_glass_pane','iron_bars']){
  const blocks=[[0,0],[1,0],[0,1]].map(([x,z])=>({x,y:0,z,component:'fixture',block:'minecraft:'+name+'[north=false,east=true,south=false,west=true,waterlogged=true]'}));
  const out=resolveConnections(blocks),props=stateBlock(out.blocks[0].block).getProperties();
  assert.equal(props.east,true);assert.equal(props.south,true);assert.equal(props.north,false);assert.equal(props.west,false);assert.equal(props.waterlogged,true);
  assert.equal(resolveConnections(out.blocks).changed,0,'idempotent states');
  const shapes=stateBlock(out.blocks[0].block).shapes;assert.ok(shapes.some(b=>b[3]===1));assert.ok(shapes.some(b=>b[5]===1),'corner has both arms');
  assert.ok(meshArtifact({hash:'corner',dimensions:{x:2,y:1,z:2},blocks:out.blocks}).sections.some(s=>s.positions.length));
 }
 const plan=JSON.parse(fs.readFileSync(__dirname+'/terraced-brick-residences-r3.plan.json')),a=await compilePlan(plan);
 assert.equal(resolveConnections(a.blocks).changed,0,'authored plan retains resolved connections');
 const n=readSchematic(exportSchematic(a)),palette=Object.fromEntries(Object.entries(n.Blocks.Palette).map(([state,id])=>[id,state])),data=n.Blocks.Data,decoded=[];
 for(let offset=0;offset<data.length;){let v=0,shift=0,b;do{b=data[offset++];v|=(b&127)<<shift;shift+=7;}while(b&128);decoded.push(palette[v]);}
 let thin=0;
 for(const b of a.blocks)if(/_pane|iron_bars/.test(b.block)){const state=decoded[b.x+n.Width*(b.z+n.Length*b.y)];assert.equal(stateBlock(state).stateId,stateBlock(b.block).stateId,'exported state matches at '+[b.x,b.y,b.z]);thin++;}
 assert.equal(n.Blocks.BlockEntities.length,a.signs.length);
 for(const sign of a.signs){assert.ok(sign.lines[0].trim()&&sign.lines[3].trim());const entity=n.Blocks.BlockEntities.find(e=>e.Pos.join(',')===sign.at.join(','));assert.deepEqual(entity.Data.front_text.messages.map(m=>JSON.parse(m).text),sign.lines);}
 console.log('PASS '+thin+' exported pane/bar states; L corners in both families; waterlogging; idempotence; '+a.signs.length+' framed sign texts retained in schematic');
})().catch(e=>{console.error(e);process.exitCode=1});
