// Authoring and diagnostics oracle for connection states. The Java compiler
// uses the generated face table and resolves only properties an author omitted;
// this utility always computes semantic expected states so diagnostics can flag
// incorrect authored values too.
const faceTable=require('../src/main/resources/block-face-connections-1.21.4.json');
const {stateBlock}=require('./mesh.cjs');
const RESOLVER_VERSION=2;
const directions={north:[0,0,-1],east:[1,0,0],south:[0,0,1],west:[-1,0,0]};
const opposite={north:'south',east:'west',south:'north',west:'east'};
const left={north:'west',west:'south',south:'east',east:'north'};
const base=state=>state.split('[')[0];
const family=state=>base(state).endsWith('_pane')?'pane':base(state)==='minecraft:iron_bars'?'bars':base(state).endsWith('_wall')?'wall':base(state).endsWith('_fence')?'fence':base(state).endsWith('_stairs')?'stairs':null;
function authored(state){
 const match=/^([^\[]+)(?:\[([^\]]+)\])?$/.exec(state),properties={};
 if(match?.[2])for(const pair of match[2].split(',')){const [key,value]=pair.split('=');properties[key]=value;}
 return {block:match?.[1]||state,properties};
}
function properties(state){
 const parsed=authored(state),defaults=faceTable.defaults[parsed.block]||{};
 return {...defaults,...parsed.properties};
}
function format(block,props){const entries=Object.keys(props).sort().map(key=>key+'='+props[key]);return block+(entries.length?'['+entries.join(',')+']':'');}
function solidFace(state,direction){
 const parsed=authored(state),defaults=faceTable.defaults[parsed.block];if(!defaults)return false;
 const canonical=format(parsed.block,{...defaults,...parsed.properties});
 return (faceTable.faces[canonical]||'').includes(direction[0]);
}
function sameHalf(first,second){return String(properties(first).half)===String(properties(second).half);}
function perpendicular(first,second){return ['north','south'].includes(first)!==['north','south'].includes(second);}

function resolveConnections(blocks){
 const map=new Map(blocks.map(block=>[[block.x,block.y,block.z].join(','),block])),stateAt=(block,direction)=>{
  const offset=directions[direction];return map.get([block.x+offset[0],block.y,block.z+offset[2]].join(','));
 },differentStair=(block,own,direction)=>{
  const neighbor=stateAt(block,direction);if(!neighbor||family(neighbor.block)!=='stairs')return true;
  const a=properties(own),b=properties(neighbor.block);return a.facing!==b.facing||a.half!==b.half;
 };
 let changed=0,corners=0;
 const result=blocks.map(block=>{
  const kind=family(block.block);if(!kind)return {...block};
  const parsed=authored(block.block),props=properties(block.block);
  if(['pane','bars','wall','fence'].includes(kind))for(const [direction]of Object.entries(directions)){
   const neighbor=stateAt(block,direction),neighborFamily=neighbor&&family(neighbor.block);
   const connected=Boolean(neighbor&&(kind==='fence'?neighborFamily==='fence'||solidFace(neighbor.block,direction):
    ['pane','bars','wall'].includes(neighborFamily)||solidFace(neighbor.block,direction)));
   props[direction]=kind==='wall'?(connected?'low':'none'):connected;
  }
  if(kind==='wall')props.up=true;
  if(kind==='stairs'){
   const facing=props.facing||'north',half=props.half||'bottom',front=stateAt(block,facing),back=stateAt(block,opposite[facing]);let shape='straight';
   if(front&&family(front.block)==='stairs'&&sameHalf(block.block,front.block)){
    const other=properties(front.block).facing;
    if(perpendicular(facing,other)&&differentStair(block,block.block,opposite[other]))shape=other===left[facing]?'outer_left':'outer_right';
   }
   if(shape==='straight'&&back&&family(back.block)==='stairs'&&sameHalf(block.block,back.block)){
    const other=properties(back.block).facing;
    if(perpendicular(facing,other)&&differentStair(block,block.block,other))shape=other===left[facing]?'inner_left':'inner_right';
   }
   props.shape=shape;
   // Keep the default lookup local; the compiled state may intentionally omit
   // facing/half/waterlogged and let Minecraft defaults carry them.
   for(const key of Object.keys(props))if(!(key in parsed.properties)&&key!=='shape')delete props[key];
  }
  if((kind==='pane'||kind==='bars')&&(props.north||props.south)&&(props.east||props.west))corners++;
  const state=format(parsed.block,props);
  if(stateBlock(state).stateId!==stateBlock(block.block).stateId)changed++;
  return {...block,block:state};
 });
 return {blocks:result,changed,corners};
}
module.exports={resolveConnections,solidFace,RESOLVER_VERSION};
