const {hash,importSite}=require('./sites.cjs');
const {exportSchematic}=require('./schematic.cjs');
function fixture(kind){
 if(!['flat','slope'].includes(kind))throw Error('Unknown test fixture');
 const a={schema_version:1,plan_id:'survey-fixture',revision:'r0',name:'Synthetic test terrain',dimensions:{x:32,y:32,z:32},components:[{id:'terrain'}],spaces:[],blocks:[]};
 for(let x=0;x<32;x++)for(let z=0;z<32;z++){const top=kind==='slope'?Math.floor(z/12):0;for(let y=0;y<=top;y++)a.blocks.push({x,y,z,block:z<2?'minecraft:stone_bricks':y===top?'minecraft:grass_block[snowy=false]':'minecraft:dirt',component:'terrain'});}
 a.hash=hash(a);
 return importSite(exportSchematic(a),{name:kind==='slope'?'Sloping test plot':'Flat test plot',world:'builder-isolated',origin:[0,60,0],capturedAt:'2026-09-06T00:00:00Z',plot:{min:[0,60,0],max:[32,92,32]},frontage:[16,61,1],protected:[{min:[0,60,0],max:[32,61,2]}]});
}
module.exports={fixture};
