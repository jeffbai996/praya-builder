// Authoring utility: resolve pane/bar arms before compiling a successor plan.
// Export and preview then consume the same explicit block states.
const {stateBlock}=require('./mesh.cjs');
const directions={north:[0,0,-1],east:[1,0,0],south:[0,0,1],west:[-1,0,0]};
const family=s=>s.split('[')[0].endsWith('_pane')?'pane':s.split('[')[0]==='minecraft:iron_bars'?'bars':null;
function solidFace(state,direction){
 if(/leaves|_door|_trapdoor/.test(state))return false;
 const shapes=stateBlock(state).shapes,axis=['east','west'].includes(direction)?0:2,edge=['east','south'].includes(direction)?0:1,other=axis===0?2:0;
 const faces=shapes.filter(b=>Math.abs(b[axis+(edge?3:0)]-edge)<1e-6);
 // Side face coverage, including unions of stair-shaped collision boxes.
 for(let a=0;a<16;a++)for(let y=0;y<16;y++)if(!faces.some(b=>(a+.5)/16>=b[other]&&(a+.5)/16<=b[other+3]&&(y+.5)/16>=b[1]&&(y+.5)/16<=b[4]))return false;
 return true;
}
function resolveConnections(blocks){
 const map=new Map(blocks.map(b=>[[b.x,b.y,b.z].join(','),b])),cache=new Map();let changed=0,corners=0;
 const result=blocks.map(b=>{
  const kind=family(b.block);if(!kind)return {...b};
  const props=stateBlock(b.block).getProperties();
  for(const [direction,offset]of Object.entries(directions)){
   const neighbor=map.get([b.x+offset[0],b.y,b.z+offset[2]].join(','));let connected=false;
   if(neighbor){if(family(neighbor.block)===kind)connected=true;else if(!family(neighbor.block)){const key=neighbor.block+':'+direction;if(!cache.has(key))cache.set(key,solidFace(neighbor.block,direction));connected=cache.get(key);}}
   props[direction]=connected;
  }
  if((props.north||props.south)&&(props.east||props.west))corners++;
  const state=b.block.split('[')[0]+'['+Object.keys(props).sort().map(k=>k+'='+props[k]).join(',')+']';
  if(stateBlock(state).stateId!==stateBlock(b.block).stateId)changed++;
  return {...b,block:state};
 });return {blocks:result,changed,corners};
}
module.exports={resolveConnections};
