const test=require('node:test'),assert=require('node:assert/strict');const {assetSupport}=require('./asset-support.cjs');
const artifact={blocks:[{block:'minecraft:oak_wall_sign[facing=north,waterlogged=false]'},{block:'minecraft:blue_bed[facing=north,occupied=false,part=head]'},{block:'minecraft:player_head[rotation=0]'},{block:'minecraft:stone'}],signs:[{at:[0,0,0],lines:['','a','b','']}]};
test('counts each special type and never claims unsupported placement',()=>{
 const rows=assetSupport(artifact,{connected:false});
 assert.deepEqual(rows.map(r=>[r.kind,r.count,r.preview,r.schematic,r.placement]),[['sign',1,true,true,false],['bed',1,true,true,false],['head',1,false,false,false]]);
 assert.equal(rows[0].placementNote,'needs a connected bridge with sign data');
});
test('sign placement is only claimed with a sign-capable bridge',()=>{
 assert.equal(assetSupport(artifact,{connected:true,capabilities:{signData:1}})[0].placement,true);
 assert.equal(assetSupport(artifact,{connected:true,capabilities:{}})[0].placement,false);
});
test('plain buildings report nothing',()=>{assert.deepEqual(assetSupport({blocks:[{block:'minecraft:stone'}]},null),[]);});
