// Preview geometry for vanilla block-entity models absent from the pinned atlas.
// Authored bed/sign block states remain unchanged in the compiled artifact/export.
function install(models){
 const cube=(name,from,to)=>{
  const model=Object.values(models[name].variants)[0].model;
  const faces=structuredClone(model.elements[0].faces);
  for(const f of Object.values(faces))delete f.cullface;
  return {from,to,faces};
 };
 for(const name of Object.keys(models).filter(n=>n.endsWith('_bed'))){
  const color=name.slice(0,-4),variants={};
  for(const facing of ['north','south','east','west'])for(const part of ['head','foot']){
   // Local north-facing bed: head is north, foot is south.
   const elements=[cube('oak_planks',[0,3,0],[16,6,16]),cube(color+'_wool',[0,6,0],[16,9,16])];
   if(part==='head')elements.push(cube('white_wool',[1,9,1],[15,10,6]));
   for(const x of [0,13])elements.push(cube('oak_planks',[x,0,part==='head'?0:13],[x+3,3,part==='head'?3:16]));
   variants['facing='+facing+',part='+part]={y:{north:0,east:90,south:180,west:270}[facing],model:{ao:true,elements}};
  }
  models[name]={variants};
 }
 for(const name of Object.keys(models).filter(n=>n.endsWith('_wall_sign'))){
  const wood=name.slice(0,-10)+'_planks';if(!models[wood])continue;
  const variants={};
  for(const facing of ['north','south','east','west'])variants['facing='+facing]={y:{north:0,east:90,south:180,west:270}[facing],model:{ao:true,elements:[cube(wood,[0,4,14],[16,12,16])]}};
  models[name]={variants};
 }
}
module.exports={install};
