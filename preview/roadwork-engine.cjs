// Deterministic, read-only corridor compilation over a bounded Minecraft survey.
// The returned change mask is the proposal. Segment artifacts additionally contain
// the complete surveyed export envelope because Sponge pastes clear unspecified air.
const {createHash}=require('node:crypto');
const {stateBlock}=require('./mesh.cjs');

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const AIR='minecraft:air';
const TILE=32;
const MAX_ROUTE=192;
const MAX_CHANGES=50000;
const ROAD_STATES=new Set(['minecraft:gray_concrete','minecraft:light_gray_concrete','minecraft:black_concrete','minecraft:gray_terracotta','minecraft:black_terracotta','minecraft:stone_bricks']);
const fluid=s=>/^minecraft:(?:water|lava)(?:\[|$)/.test(s);
const supportMaterial=s=>/^minecraft:(?:stone|dirt|grass_block|coarse_dirt|podzol|deepslate|cobbled_deepslate|granite|diorite|andesite|tuff|sandstone|red_sandstone|cobblestone|gravel|sand|clay|mud|packed_mud|[a-z_]+_concrete|[a-z_]+_terracotta|stone_bricks|[a-z_]+_bricks)(?:\[|$)/.test(s);
const coord=p=>Array.isArray(p)&&p.length===3&&p.every(n=>Number.isInteger(n)&&Math.abs(n)<=30000000);
const key=(x,y,z)=>x+','+y+','+z;
const xykey=(x,z)=>x+','+z;
const isAir=s=>s===AIR||s==='minecraft:cave_air'||s==='minecraft:void_air';
const inside=(x,y,z,box)=>x>=box.min[0]&&x<box.max[0]&&y>=box.min[1]&&y<box.max[1]&&z>=box.min[2]&&z<box.max[2];
const round=n=>Math.round(n*1000)/1000;
const cellOrder=(a,b)=>a.y-b.y||a.z-b.z||a.x-b.x;

function validateSurvey(survey){
 if(!survey||typeof survey!=='object'||typeof survey.world!=='string'||!survey.world||!coord(survey.origin))throw Error('Invalid survey identity or origin');
 const d=survey.dimensions;
 if(!d||![d.x,d.y,d.z].every(n=>Number.isInteger(n)&&n>0&&n<=128)||d.x*d.y*d.z>262144)throw Error('Survey volume limit exceeded');
 if(!Array.isArray(survey.blocks)||survey.blocks.length>d.x*d.y*d.z||!Array.isArray(survey.protected||[]))throw Error('Invalid survey blocks or protection');
 const raw={...survey};
 for(const field of ['hash','id','version','createdAt'])delete raw[field];
 const canonicalHash=hash(raw);
 if(survey.hash&&survey.hash!==canonicalHash)throw Error('Survey content hash mismatch');
 const states=new Set(),blocks=new Map();
 for(const c of survey.blocks){
  if(!c||![c.x,c.y,c.z].every(Number.isInteger)||c.x<0||c.x>=d.x||c.y<0||c.y>=d.y||c.z<0||c.z>=d.z||typeof c.block!=='string')throw Error('Survey cell outside bounds');
  if(!states.has(c.block)){stateBlock(c.block);states.add(c.block);}
  const worldKey=key(survey.origin[0]+c.x,survey.origin[1]+c.y,survey.origin[2]+c.z);
  if(blocks.has(worldKey))throw Error('Duplicate survey cell');
  blocks.set(worldKey,c.block);
 }
 const bounds={min:survey.origin,max:[survey.origin[0]+d.x,survey.origin[1]+d.y,survey.origin[2]+d.z]};
 const protectedBoxes=survey.protected||[];
 if(protectedBoxes.length>256)throw Error('Too many protected bounds');
 for(const b of protectedBoxes){
  if(!b||!coord(b.min)||!coord(b.max)||b.min.some((n,i)=>n>=b.max[i]||n<bounds.min[i]||b.max[i]>bounds.max[i]))throw Error('Invalid protected bounds');
 }
 return {hash:canonicalHash,blocks,bounds,protected:protectedBoxes};
}

function validatePoints(points){
 if(!Array.isArray(points)||points.length<2||points.length>32)throw Error('Road needs 2 to 32 world points');
 for(const p of points)if(!p||![p.x,p.y,p.z].every(n=>Number.isInteger(n)&&Math.abs(n)<=30000000))throw Error('Invalid world point');
 let length=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],horizontal=Math.hypot(b.x-a.x,b.z-a.z);
  if(horizontal<2)throw Error('Road points must be at least two blocks apart in X/Z');
  if(Math.abs(b.y-a.y)>horizontal/2)throw Error('Road grade exceeds the supported half-block-per-block limit');
  length+=horizontal;
 }
 if(length>MAX_ROUTE)throw Error('Road length exceeds bounded compiler limit');
 return length;
}

function interpolate(points,alternative){
 if(!['preserve','balanced','direct'].includes(alternative))throw Error('Unknown road alternative');
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z));
 const total=lengths.reduce((a,b)=>a+b,0),samples=[],seen=new Set();
 let travelled=0;
 for(let i=0;i<lengths.length;i++){
  const a=points[i],b=points[i+1],distance=lengths[i],count=Math.ceil(distance*3);
  const dx=(b.x-a.x)/distance,dz=(b.z-a.z)/distance;
  const adjacent=index=>index<0||index>=lengths.length?[dx,dz]:[(points[index+1].x-points[index].x)/lengths[index],(points[index+1].z-points[index].z)/lengths[index]];
  const normalized=(u,v)=>{const length=Math.hypot(u,v);return length?[u/length,v/length]:[dx,dz];};
  const [previousX,previousZ]=adjacent(i-1),[nextX,nextZ]=adjacent(i+1);
  const start=normalized(previousX+dx,previousZ+dz),end=normalized(dx+nextX,dz+nextZ);
  for(let j=0;j<=count;j++){
   if(i&&j===0)continue;
   const t=j/count,along=(travelled+t*distance)/total;
   const shift=(alternative==='balanced'?1.5:0)*Math.sin(Math.PI*along)**2;
   const [tangentX,tangentZ]=normalized(start[0]*(1-t)+end[0]*t,start[1]*(1-t)+end[1]*t);
   const straighten=alternative==='direct'&&points.length>2?0.7*Math.sin(Math.PI*along)**2:0;
   const h00=2*t*t*t-3*t*t+1,h10=t*t*t-2*t*t+t,h01=-2*t*t*t+3*t*t,h11=t*t*t-t*t;
   const baseX=h00*a.x+h10*start[0]*distance+h01*b.x+h11*end[0]*distance;
   const baseZ=h00*a.z+h10*start[1]*distance+h01*b.z+h11*end[1]*distance;
   const chordX=points[0].x+(points.at(-1).x-points[0].x)*along;
   const chordZ=points[0].z+(points.at(-1).z-points[0].z)*along;
   const x=Math.round(baseX*(1-straighten)+chordX*straighten-tangentZ*shift);
   const z=Math.round(baseZ*(1-straighten)+chordZ*straighten+tangentX*shift);
   const y=Math.round(a.y+(b.y-a.y)*t),k=xykey(x,z);
   if(seen.has(k))continue;
   seen.add(k);samples.push({x,y,z,station:round(travelled+t*distance),heading:[round(tangentX),round(tangentZ)]});
  }
  travelled+=distance;
 }
 if(samples.length<3)throw Error('Road collapsed after voxel sampling');
 let actualStation=0;
 for(let i=0;i<samples.length;i++){
  if(i)actualStation+=Math.hypot(samples[i].x-samples[i-1].x,samples[i].z-samples[i-1].z);
  samples[i].station=round(actualStation);
  const a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)];
  const distance=Math.hypot(b.x-a.x,b.z-a.z);
  if(distance)samples[i].heading=[round((b.x-a.x)/distance),round((b.z-a.z)/distance)];
 }
 return samples;
}

function detectRoad(survey){
 const {blocks,bounds,hash:surveyHash}=validateSurvey(survey),surfaces=[];
 for(const [k,block] of blocks){
  if(!ROAD_STATES.has(block)&&!/^minecraft:(?:stone|smooth_stone)_slab\[/.test(block))continue;
  const [x,y,z]=k.split(',').map(Number);
  if(!isAir(blocks.get(key(x,y+1,z))||AIR))continue;
  surfaces.push({x,y,z,block});
 }
 surfaces.sort(cellOrder);
 const rowsFor=axis=>{
  const rows=new Map();
  for(const c of surfaces){const k=(axis==='x'?c.x:c.z)+','+c.y;if(!rows.has(k))rows.set(k,[]);rows.get(k).push(c);}
  return [...rows.values()].filter(row=>row.length>=2&&row.length<=15).map(row=>({
   x:Math.round(row.reduce((sum,c)=>sum+c.x,0)/row.length),y:row[0].y,
   z:Math.round(row.reduce((sum,c)=>sum+c.z,0)/row.length),width:row.length
  })).sort((a,b)=>axis==='x'?a.x-b.x||a.z-b.z:a.z-b.z||a.x-b.x);
 };
 const xRows=rowsFor('x'),zRows=rowsFor('z'),orientation=xRows.length>=zRows.length?'x':'z';
 const allCandidates=orientation==='x'?xRows:zRows,chains=[];
 for(const c of allCandidates){
  const axis=orientation==='x'?'x':'z',lateral=orientation==='x'?'z':'x';
  const eligible=chains.filter(chain=>{
   const last=chain.at(-1),step=c[axis]-last[axis];
   return step>0&&step<=2&&Math.abs(c[lateral]-last[lateral])<=2&&Math.abs(c.y-last.y)<=1;
  }).sort((a,b)=>Math.abs(c[lateral]-a.at(-1)[lateral])-Math.abs(c[lateral]-b.at(-1)[lateral]));
  if(eligible.length)eligible[0].push(c);
  else chains.push([c]);
 }
 chains.sort((a,b)=>b.length-a.length||a[0].x-b[0].x||a[0].z-b[0].z);
 const candidates=chains[0]||[];
 const suggestedPoints=candidates.length>=2?[candidates[0],candidates[candidates.length-1]].map(({x,y,z})=>({x,y,z})):[];
 return {surveyHash,world:survey.world,worldId:survey.worldId||null,bounds,surfaceCells:surfaces,candidates,suggestedPoints,points:suggestedPoints,orientation,method:'longest contiguous exposed road-like palette; review against the world before use'};
}

function makeFixtureSurvey(){
 const origin=[0,60,0],dimensions={x:64,y:16,z:30},blocks=[];
 for(let x=0;x<64;x++)for(let z=0;z<30;z++){
  const top=64+(x>=30?1:0)+(z>=23?1:0);
  for(let y=60;y<=top;y++){
   const road=x>=10&&x<=54&&Math.abs(z-(12+Math.round((x-10)/44*3)))<=3;
   blocks.push({x,y:y-origin[1],z,block:y===top?(road?'minecraft:gray_concrete':'minecraft:grass_block[snowy=false]'):(y>=top-2?'minecraft:dirt':'minecraft:stone'),component:'context'});
  }
 }
 const content={schemaVersion:1,name:'Roadwork test fixture — two tile bend and rise',source:'test-fixture',world:'roadwork-isolated-fixture',worldId:'roadwork-fixture-world',origin,dimensions,complete:true,protected:[],capturedAt:'2026-09-23T00:00:00Z',blocks,warnings:[]};
 return {...content,hash:hash(content)};
}

function compileRoad({survey,points,width=7,alternative='balanced',section='provisional'}={}){
 if(!['provisional','compact-slab'].includes(section))throw Error('Unknown road section');
 if(section==='compact-slab')width=4;
 if(alternative==='terrain'){
  const source=validateSurvey(survey);validatePoints(points);
  // Bounded search: seven lateral routes, ground-following intermediate heights.
  // End tie-ins are fixed. This is a local comparison, not global pathfinding.
  const a=points[0],b=points.at(-1),distance=Math.hypot(b.x-a.x,b.z-a.z),nx=-(b.z-a.z)/distance,nz=(b.x-a.x)/distance;
  const top=new Map();for(const [k,s] of source.blocks){if(!supportMaterial(s))continue;const [x,y,z]=k.split(',').map(Number);const key=x+','+z;if(!top.has(key)||y>top.get(key))top.set(key,y);}
  const candidates=[];
  for(const offset of [0,-2,2,-4,4,-6,6]){
   const route=points.length===2?[a,{x:Math.round((a.x+b.x)/2+nx*offset),y:Math.round((a.y+b.y)/2),z:Math.round((a.z+b.z)/2+nz*offset)},b]:points.map((p,i)=>i===0||i===points.length-1?p:{...p,x:Math.round(p.x+nx*offset),z:Math.round(p.z+nz*offset)});
   for(let i=1;i<route.length-1;i++){const ground=top.get(route[i].x+','+route[i].z);if(ground!==undefined)route[i]={...route[i],y:ground};}
   try{candidates.push(compileRoad({survey,points:route,width,section,alternative:'preserve'}));}catch{}
  }
  if(!candidates.length)throw Error('No terrain candidate meets route limits; adjust the tie-ins or add points');
  candidates.sort((a,b)=>a.metrics.terrainCost-b.metrics.terrainCost||a.hash.localeCompare(b.hash));
  const {hash:old,...best}=candidates[0];best.alternative='terrain';best.generatedPoints=best.points;best.points=points.map(p=>({...p}));best.search={candidates:candidates.length,method:'seven bounded lateral offsets; surveyed ground heights; fixed endpoint tie-ins',costs:candidates.map(c=>({hash:c.hash,cost:c.metrics.terrainCost,ready:c.ready}))};return {...best,hash:hash(best)};
 }

 const source=validateSurvey(survey),routeLength=validatePoints(points);
 if(!Number.isInteger(width)||width<3||width>15||(section==='provisional'&&width%2!==1))throw Error('Road width must be odd and between 3 and 15');
 const samples=interpolate(points,alternative),issues=[];
 if(!survey.complete)issues.push({code:'incomplete_survey',message:'Unknown survey cells cannot be treated as air.'});
 if((survey.warnings||[]).some(s=>/contents? (?:are )?excluded|contents? are not imported/i.test(s))&&!survey.source?.includes('paper-survey'))
  issues.push({code:'unlocated_block_entities',message:'Imported block entities have no cell locations; a schematic paste cannot safely preserve them.'});
 const {blocks:existing,bounds,protected:protectedBoxes}=source,proposal=new Map(),footprint=new Map();
 for(let i=1;i<samples.length;i++){
  const a=samples[i-1],b=samples[i],dx=Math.abs(b.x-a.x),dy=Math.abs(b.y-a.y),dz=Math.abs(b.z-a.z);
  if(dx>1||dz>1||dy>1||(!dx&&!dz))issues.push({code:'disconnected_centerline',at:[b.x,b.y,b.z],message:'Voxelized centreline has a gap or vertical-only step.'});
 }
 const half=(width-1)/2;
 for(const sample of samples){
  const [dx,dz]=sample.heading;
  const radius=half+0.55;
  for(let x=Math.floor(sample.x-radius-1);x<=Math.ceil(sample.x+radius+1);x++)
   for(let z=Math.floor(sample.z-radius-1);z<=Math.ceil(sample.z+radius+1);z++){
    const cross=Math.abs((x-sample.x)*(-dz)+(z-sample.z)*dx-(width%2===0?0.5:0));
    const along=Math.abs((x-sample.x)*dx+(z-sample.z)*dz);
    if(cross>radius||along>0.95)continue;
    const k=xykey(x,z),old=footprint.get(k);
    if(!old||cross<old.cross||(cross===old.cross&&sample.station<old.station))footprint.set(k,{x,z,y:sample.y,cross,station:sample.station});
   }
 }
 if(footprint.size>12000)throw Error('Road footprint exceeds bounded compiler limit');
 const desired=(x,y,z,block,component)=>{
  const k=key(x,y,z),old=proposal.get(k);
  if(old&&old.after!==block){issues.push({code:'conflicting_write',at:[x,y,z],message:'Road layers propose different block states for one cell.'});return;}
  proposal.set(k,{x,y,z,after:block,component});
 };
 for(const c of [...footprint.values()].sort((a,b)=>a.x-b.x||a.z-b.z)){
  const x=c.x,z=c.z,y=c.y,edge=c.cross>=half-0.35;
  const marker=!edge&&c.cross<0.45&&Math.floor(c.station)%6<3;
  desired(x,y,z,section==='compact-slab'?(edge?'minecraft:stone_brick_slab[type=top,waterlogged=false]':'minecraft:stone_slab[type=top,waterlogged=false]'):edge?'minecraft:stone_bricks':marker?'minecraft:white_concrete':'minecraft:gray_concrete',edge?'edge':'surface');
  desired(x,y-1,z,'minecraft:stone','subgrade');
  let supported=false;
  for(let depth=2;depth<=5;depth++){
   const supportY=y-depth,existingBlock=existing.get(key(x,supportY,z));
   if(!inside(x,supportY,z,bounds)||(!survey.complete&&existingBlock===undefined))break;
   if(existingBlock&&!isAir(existingBlock)){
    if(supportMaterial(existingBlock))supported=true;
    else issues.push({code:'unsafe_support_material',at:[x,supportY,z],message:'Road foundation meets a fluid or unverified load-bearing block.'});
    break;
   }
   desired(x,supportY,z,'minecraft:stone','support');
  }
  if(!supported){
   const below=existing.get(key(x,y-6,z));
   if(below&&!isAir(below)){
    if(supportMaterial(below))supported=true;
    else issues.push({code:'unsafe_support_material',at:[x,y-6,z],message:'Road foundation meets a fluid or unverified load-bearing block.'});
   }
   if(!supported)issues.push({code:'unsupported_fill',at:[x,y,z],message:'Road support does not meet surveyed solid ground within five blocks.'});
  }
  for(let dy=1;dy<=3;dy++)desired(x,y+dy,z,AIR,'clearance');
 }
 const changes=[];
 for(const proposed of [...proposal.values()].sort(cellOrder)){
  const {x,y,z,after,component}=proposed;
  if(!inside(x,y,z,bounds)){issues.push({code:'unknown_survey',at:[x,y,z],message:'Road reaches outside the surveyed volume.'});continue;}
  const before=existing.get(key(x,y,z))||(survey.complete?AIR:null);
  if(before===null){issues.push({code:'unknown_survey',at:[x,y,z],message:'Road cell has no known before state.'});continue;}
  if(fluid(before))issues.push({code:'fluid_conflict',at:[x,y,z],message:'Road proposal intersects water or lava; drainage and block updates require separate review.'});
  if(before===after||(isAir(before)&&isAir(after)))continue;
  if(protectedBoxes.some(box=>inside(x,y,z,box))){issues.push({code:'protected_cell',at:[x,y,z],message:'Road proposal intersects a protected cell.'});continue;}
  changes.push({x,y,z,before,after,component,classification:ROAD_STATES.has(before)?'adapt':'replace'});
 }
 if(changes.length>MAX_CHANGES)throw Error('Road changes exceed bounded compiler limit');
 const tileOf=(x,z)=>Math.floor((x-survey.origin[0])/TILE)+','+Math.floor((z-survey.origin[2])/TILE);
 const groups=new Map();
 for(const c of changes){const tile=tileOf(c.x,c.z);if(!groups.has(tile))groups.set(tile,[]);groups.get(tile).push(c);}
 const centerTiles=[],centerSeen=new Set();
 for(const s of samples){const tile=tileOf(s.x,s.z);if(!centerSeen.has(tile)){centerSeen.add(tile);centerTiles.push(tile);}}
 const segmentRecords=[];
 for(const [tile,tileChanges] of groups){
  const min=[Math.min(...tileChanges.map(c=>c.x)),Math.min(...tileChanges.map(c=>c.y)),Math.min(...tileChanges.map(c=>c.z))];
  const max=[Math.max(...tileChanges.map(c=>c.x))+1,Math.max(...tileChanges.map(c=>c.y))+1,Math.max(...tileChanges.map(c=>c.z))+1];
  const dimensions={x:max[0]-min[0],y:max[1]-min[1],z:max[2]-min[2]},volume=dimensions.x*dimensions.y*dimensions.z;
  if(dimensions.x>48||dimensions.y>64||dimensions.z>48||volume>10000){issues.push({code:'segment_budget',tile,message:'Segment export envelope exceeds 48×64×48 or 10,000 cells.'});continue;}
  let protectedEnvelope=false;
  for(const b of protectedBoxes){
   if(min.every((v,i)=>v<b.max[i]&&max[i]>b.min[i])){protectedEnvelope=true;break;}
  }
  if(protectedEnvelope)issues.push({code:'protected_export_envelope',tile,message:'Schematic envelope intersects protected cells, including unchanged cells.'});
  const proposalMap=new Map(tileChanges.map(c=>[key(c.x,c.y,c.z),c.after])),artifactBlocks=[];
  for(let y=min[1];y<max[1];y++)for(let z=min[2];z<max[2];z++)for(let x=min[0];x<max[0];x++){
   if(!inside(x,y,z,bounds)){issues.push({code:'unknown_export_envelope',tile,message:'Schematic envelope leaves the survey.'});continue;}
   const state=proposalMap.get(key(x,y,z))||existing.get(key(x,y,z))||(survey.complete?AIR:null);
   if(state===null){issues.push({code:'unknown_export_envelope',tile,message:'Schematic envelope contains unsurveyed cells.'});continue;}
   artifactBlocks.push({x:x-min[0],y:y-min[1],z:z-min[2],block:state,component:proposalMap.has(key(x,y,z))?'roadwork':'survey'});
  }
  const core={schema_version:1,compiler_version:'roadwork-0.1',plan_id:'roadwork-'+tile.replace(',','-'),revision:'r1',name:'Roadwork segment '+tile,description:'Full surveyed export envelope plus proposed road changes. Paste only after a fresh world readback.',dimensions,components:[],spaces:[],references:[],blocks:artifactBlocks};
  const artifact={...core,hash:hash(core)};
  segmentRecords.push({tile,origin:min,artifact,changes:tileChanges,ports:{entry:null,exit:null}});
 }
 segmentRecords.sort((a,b)=>centerTiles.indexOf(a.tile)-centerTiles.indexOf(b.tile)||a.tile.localeCompare(b.tile));
 for(const segment of segmentRecords)if(!centerSeen.has(segment.tile))issues.push({code:'fringe_tile',tile:segment.tile,message:'Road touches a tile without a centreline sample; route port requires review.'});
 for(let i=0;i<samples.length-1;i++){
  const a=samples[i],b=samples[i+1],left=tileOf(a.x,a.z),right=tileOf(b.x,b.z);
  if(left===right)continue;
  const entry=segmentRecords.find(s=>s.tile===left),exit=segmentRecords.find(s=>s.tile===right);
  const port={at:[round((a.x+b.x)/2),round((a.y+b.y)/2),round((a.z+b.z)/2)],heading:[round((b.x-a.x)||a.heading[0]),round((b.z-a.z)||a.heading[1])],width,from:left,to:right};
  if(!entry||!exit)issues.push({code:'missing_seam_segment',at:port.at,message:'Centreline crosses a tile without a compiled segment.'});
  else if(entry.ports.exit||exit.ports.entry)issues.push({code:'revisited_segment',at:port.at,message:'Route revisits a tile; unique entry/exit ports are unresolved.'});
  else{entry.ports.exit=port;exit.ports.entry=port;}
 }
 const first=segmentRecords.find(s=>s.tile===tileOf(samples[0].x,samples[0].z));
 const last=segmentRecords.find(s=>s.tile===tileOf(samples.at(-1).x,samples.at(-1).z));
 if(first)first.ports.entry={at:[points[0].x,points[0].y,points[0].z],heading:samples[0].heading,width,endpoint:true};
 if(last)last.ports.exit={at:[points.at(-1).x,points.at(-1).y,points.at(-1).z],heading:samples.at(-1).heading,width,endpoint:true};
 const segments=segmentRecords.map(({tile,origin,artifact,ports})=>({id:'tile-'+tile.replace(',','-'),tile,origin,artifact,ports}));
 const unique=new Set();
 for(const s of segments)for(const c of s.artifact.blocks){
  const k=key(c.x+s.origin[0],c.y+s.origin[1],c.z+s.origin[2]);
  if(unique.has(k))issues.push({code:'overlapping_export_envelope',at:k.split(',').map(Number),message:'Segment schematic envelopes overlap.'});
  unique.add(k);
 }
 if(!segments.length)issues.push({code:'no_changes',message:'Road proposal does not change any surveyed blocks.'});
 let generatedLength=0,maxStepGrade=0,maxHeadingChange=0,previousHeading=null;
 for(let i=1;i<samples.length;i++){
  const a=samples[i-1],b=samples[i],dx=b.x-a.x,dz=b.z-a.z,horizontal=Math.hypot(dx,dz);
  generatedLength+=horizontal;
  if(horizontal){maxStepGrade=Math.max(maxStepGrade,Math.abs(b.y-a.y)/horizontal);
   const heading=Math.atan2(dz,dx);
   if(previousHeading!==null)maxHeadingChange=Math.max(maxHeadingChange,Math.abs(Math.atan2(Math.sin(heading-previousHeading),Math.cos(heading-previousHeading)))*180/Math.PI);
   previousHeading=heading;
  }
 }
 const metrics={routeLength:round(generatedLength),inputLength:round(routeLength),maxStepGrade:round(maxStepGrade),maxHeadingChangeDegrees:round(maxHeadingChange),sampleCount:samples.length,width,footprintCells:footprint.size,changedBlocks:changes.length,excavatedBlocks:changes.filter(c=>isAir(c.after)&&!isAir(c.before)).length,filledBlocks:changes.filter(c=>isAir(c.before)&&!isAir(c.after)).length,replacedBlocks:changes.filter(c=>!isAir(c.before)&&!isAir(c.after)).length,segmentCount:segments.length,exportCells:segments.reduce((sum,s)=>sum+s.artifact.blocks.length,0),surveyVolume:survey.dimensions.x*survey.dimensions.y*survey.dimensions.z};
 // Review issues dominate the score; then disturbance and earthwork, then length.
 metrics.terrainCost=issues.length*1000000+metrics.excavatedBlocks*4+metrics.filledBlocks*3+metrics.replacedBlocks+metrics.routeLength;
 metrics.costBasis='issues × 1000000 + excavation × 4 + fill × 3 + replacement + length';
 const core={section,sectionNote:section==='compact-slab'?'Two-wide roadway + one sidewalk each side. Top stone / stone-brick slabs are provisional material states; verify local reference.':'Provisional concrete section',schema:'praya.roadwork.assembly.v1',surveyHash:source.hash,world:survey.world,worldId:survey.worldId||null,alternative,width,points:points.map(p=>({x:p.x,y:p.y,z:p.z})),samples,segments,changes,metrics,issues,ready:issues.length===0};
 return {...core,hash:hash(core)};
}

module.exports={compileRoad,detectRoad,makeFixtureSurvey};
