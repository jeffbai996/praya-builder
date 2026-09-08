const {createHash}=require('node:crypto');
const {readSchematic}=require('./site-nbt.cjs');
const {stateBlock}=require('./mesh.cjs');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const point=p=>Array.isArray(p)&&p.length===3&&p.every(n=>Number.isInteger(n)&&Math.abs(n)<=30000000);
const inside=(p,b)=>p.every((n,i)=>n>=b.min[i]&&n<b.max[i]);
const air=s=>['minecraft:air','minecraft:cave_air','minecraft:void_air'].includes(s);
function box(b){if(!b||!point(b.min)||!point(b.max)||b.min.some((n,i)=>n>=b.max[i]))throw Error('Invalid plot or protected bounds');return b;}
function surveyFrontage(metadata,blocks,dimensions){
 const frontage=[...metadata.frontage];if(metadata.frontageHeight!=='terrain')return frontage;
 const [ox,oy,oz]=metadata.origin;let top=-1;
 for(const c of blocks)if(c.x===frontage[0]-ox&&c.z===frontage[2]-oz&&!air(c.block))top=Math.max(top,c.y);
 if(top<0||top+2>=dimensions.y)throw Error('Street entrance needs ground and two clear blocks within the capture height');
 frontage[1]=oy+top+1;return frontage;
}
function importSite(bytes,metadata){
 const n=readSchematic(bytes);
 if(n.Version!==3||!Number.isInteger(n.DataVersion)||n.DataVersion<4189)throw Error('Import requires Sponge v3 with Minecraft 1.21.4 or newer block data');
 const dimensions={x:n.Width,y:n.Height,z:n.Length},dims=Object.values(dimensions),volume=dims.reduce((a,b)=>a*b,1);
 if(!dims.every(x=>Number.isInteger(x)&&x>0&&x<=128)||volume>262144)throw Error('Survey volume limit exceeded');
 if(!metadata||typeof metadata.name!=='string'||!metadata.name.trim()||metadata.name.length>120||typeof metadata.world!=='string'||!metadata.world||metadata.world.length>120||!point(metadata.origin)||!Number.isFinite(Date.parse(metadata.capturedAt)))throw Error('Invalid survey metadata');
 const origin=metadata.origin,bounds={min:origin,max:origin.map((n,i)=>n+dims[i])},plot=box(metadata.plot);
 if(!inside(plot.min,bounds)||!inside(plot.max.map(n=>n-1),bounds))throw Error('Plot outside survey');
 if(!point(metadata.frontage)||!inside(metadata.frontage,bounds))throw Error('Frontage outside survey');
 if(!Array.isArray(metadata.protected)||metadata.protected.length>64)throw Error('Protected area limit exceeded');
 for(const b of metadata.protected){box(b);if(!inside(b.min,bounds)||!inside(b.max.map(n=>n-1),bounds))throw Error('Protected area outside survey');}
 const palette=n.Blocks?.Palette,data=n.Blocks?.Data;
 if(!palette||!Buffer.isBuffer(data)||Object.keys(palette).length>4096)throw Error('Invalid schematic palette');
 const states=new Map();
 for(const [state,id] of Object.entries(palette)){if(!Number.isInteger(id)||id<0||states.has(id))throw Error('Invalid palette index');stateBlock(state);states.set(id,state);}
 let offset=0;const blocks=[];
 for(let index=0;index<volume;index++){
  let id=0,shift=0,b;
  do{if(offset>=data.length||shift>28)throw Error('Invalid schematic varint');b=data[offset++];if(shift===28&&(b&248))throw Error('Palette integer overflow');id|=(b&127)<<shift;shift+=7;}while(b&128);
  if(!states.has(id))throw Error('Unknown palette index');const state=states.get(id);
  if(!air(state))blocks.push({x:index%dimensions.x,y:Math.floor(index/(dimensions.x*dimensions.z)),z:Math.floor(index/dimensions.x)%dimensions.z,block:state,component:'context'});
 }
 if(offset!==data.length)throw Error('Trailing block data');
 const site={schemaVersion:1,name:metadata.name,world:metadata.world,origin,dimensions,capturedAt:metadata.capturedAt,plot,frontage:metadata.frontage,protected:metadata.protected,complete:true,dataVersion:n.DataVersion,sourceHash:createHash('sha256').update(bytes).digest('hex'),blocks,warnings:[]};
 if(n.Entities?.length||n.Blocks.BlockEntities?.length)site.warnings.push('Survey records block states only; entity and block-entity contents are excluded.');
 if(n.DataVersion!==4189)site.warnings.push('Source data version differs from the preview. Every palette state was checked against the pinned 1.21.4 registry; no data migration was performed.');
 site.frontage=surveyFrontage(metadata,blocks,dimensions);
 return {...site,hash:hash(site)};
}
const directions=['north','east','south','west'];
function rotateState(state,turns){
 if(!Number.isInteger(turns)||turns<0||turns>3)throw Error('Invalid quarter turn');
 stateBlock(state);if(!turns)return state;
 const [name,raw]=state.split('[');if(!raw)return state;
 const props=Object.fromEntries(raw.slice(0,-1).split(',').map(p=>p.split('='))),out={};
 const rotate=d=>directions[(directions.indexOf(d)+turns)%4];
 for(let [key,value] of Object.entries(props)){
  if(directions.includes(key))key=rotate(key);
  if(key==='facing'&&directions.includes(value))value=rotate(value);
  if(key==='axis'&&turns%2&&['x','z'].includes(value))value=value==='x'?'z':'x';
  if(key==='rotation')value=String((Number(value)+turns*4)%16);
  if(key==='orientation')value=value.split('_').map(v=>directions.includes(v)?rotate(v):v).join('_');
  if(key==='shape'){
   if(value.startsWith('ascending_'))value='ascending_'+rotate(value.slice(10));
   else if(['north_south','east_west'].includes(value))value=turns%2?(value==='north_south'?'east_west':'north_south'):value;
   else if(['north_east','north_west','south_east','south_west'].includes(value)){const sides=value.split('_').map(rotate);value=['north','south'].find(v=>sides.includes(v))+'_'+['east','west'].find(v=>sides.includes(v));}
  }
  out[key]=value;
 }
 const result=name+'['+Object.keys(out).sort().map(k=>k+'='+out[k]).join(',')+']';stateBlock(result);return result;
}
function transformCells(artifact,transform){
 if(!transform||!point(transform.origin)||!Number.isInteger(transform.turns)||transform.turns<0||transform.turns>3)throw Error('Invalid placement transform');
 const states=new Map();return artifact.blocks.map(cell=>{
  let {x,z}=cell,w=artifact.dimensions.x,d=artifact.dimensions.z;
  for(let i=0;i<transform.turns;i++){[x,z]=[d-1-z,x];[w,d]=[d,w];}
  if(!states.has(cell.block))states.set(cell.block,rotateState(cell.block,transform.turns));
  return {...cell,x:x+transform.origin[0],y:cell.y+transform.origin[1],z:z+transform.origin[2],block:states.get(cell.block)};
 });
}
function assessSite(site,artifact,transform){
 const cells=transformCells(artifact,transform),existing=new Map(site.blocks.map(c=>[`${c.x+site.origin[0]},${c.y+site.origin[1]},${c.z+site.origin[2]}`,c.block]));
 const errors=[],collisions=[],excavations=[],changes=[];
 const bounds={min:site.origin,max:site.origin.map((v,i)=>v+Object.values(site.dimensions)[i])};
 for(const c of cells){const p=[c.x,c.y,c.z];
  if(!inside(p,bounds)){errors.push({...c,reason:'Unknown context'});continue;}
  if(!inside(p,site.plot)){errors.push({...c,reason:'Outside plot'});continue;}
  const before=existing.get(p.join(','))||'minecraft:air';
  if(stateBlock(before).stateId===stateBlock(c.block).stateId)continue;
  if(site.protected.some(b=>inside(p,b))){errors.push({...c,reason:'Protected area'});continue;}
  const change={...c,before};changes.push(change);
  if(air(c.block)&&!air(before))excavations.push(change);
  else if(!air(before))collisions.push(change);
 }
 return {valid:!errors.length,surveyHash:site.hash,artifactHash:artifact.hash,transform,errors,collisions,excavations,changes,changeHash:hash({surveyHash:site.hash,artifactHash:artifact.hash,transform,changes})};
}
module.exports={importSite,rotateState,transformCells,assessSite,air,hash,surveyFrontage};
