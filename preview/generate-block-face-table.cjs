// Generate the pure Java compiler's horizontal full-face lookup from the same
// Minecraft registry and collision shapes used by the preview renderer.
const fs=require('node:fs');
const path=require('node:path');
const {VERSION}=require('./mesh.cjs');
const data=require('minecraft-data')(VERSION);
const Block=require('prismarine-block')(VERSION);
const directions={north:[0,0,-1],east:[1,0,0],south:[0,0,1],west:[-1,0,0]};

function canonical(block){
 const properties=block.getProperties(),suffix=Object.keys(properties).sort().map(key=>`${key}=${properties[key]}`).join(',');
 return `minecraft:${block.name}${suffix?`[${suffix}]`:''}`;
}
function solidFace(state,block,direction){
 // Preserve the authoring resolver's explicit Minecraft exceptions.
 if(/leaves|_door|_trapdoor/.test(state))return false;
 const shapes=block.shapes,axis=['east','west'].includes(direction)?0:2,edge=['east','south'].includes(direction)?0:1,other=axis===0?2:0;
 const faces=shapes.filter(box=>Math.abs(box[axis+(edge?3:0)]-edge)<1e-6);
 for(let a=0;a<16;a++)for(let y=0;y<16;y++)if(!faces.some(box=>(a+.5)/16>=box[other]&&(a+.5)/16<=box[other+3]&&(y+.5)/16>=box[1]&&(y+.5)/16<=box[4]))return false;
 return true;
}

function generate(){
 const defaultEntries=[],faceEntries=[];
 for(const definition of [...data.blocksArray].sort((a,b)=>a.name.localeCompare(b.name))){
  const fallback=Block.fromStateId(definition.defaultState,0);
  defaultEntries.push([`minecraft:${definition.name}`,Object.fromEntries(Object.entries(fallback.getProperties()).sort(([a],[b])=>a.localeCompare(b)))]);
  for(let stateId=definition.minStateId;stateId<=definition.maxStateId;stateId++){
   const block=Block.fromStateId(stateId,0);if(block.name!==definition.name)throw Error(`State range crossed block at ${definition.name}/${stateId}`);
   const state=canonical(block),mask=Object.keys(directions).filter(direction=>solidFace(state,block,direction)).map(direction=>direction[0]).join('');
   if(mask)faceEntries.push([state,mask]);
  }
 }
 faceEntries.sort(([a],[b])=>a.localeCompare(b));
 return {schemaVersion:1,minecraftVersion:VERSION,defaults:Object.fromEntries(defaultEntries),faces:Object.fromEntries(faceEntries)};
}

if(require.main===module){
 const output=path.resolve(process.argv[2]||path.join(__dirname,'..','src','main','resources','block-face-connections-1.21.4.json'));
 fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,JSON.stringify(generate())+'\n');
 console.log(`WROTE ${output}`);
}

module.exports={generate,solidFace};
