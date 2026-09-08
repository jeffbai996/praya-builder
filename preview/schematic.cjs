const {createHash} = require('node:crypto');
const {gzipSync} = require('node:zlib');
const nbt = require('prismarine-nbt');
const {stateBlock, VERSION} = require('./mesh.cjs');
const DATA_VERSION = require('minecraft-data')(VERSION).version.dataVersion;
const tag = (type,value) => ({type,value});

function validateArtifact(artifact) {
  const {hash,...content} = artifact;
  if(createHash('sha256').update(JSON.stringify(content)).digest('hex')!==hash) throw Error('Artifact hash mismatch');
  const {x,y,z} = artifact.dimensions;
  if(![x,y,z].every(n=>Number.isInteger(n)&&n>0)||x>48||y>64||z>48||!Array.isArray(artifact.blocks)||artifact.blocks.length>10000)
    throw Error('Artifact bounds invalid');
  if(artifact.signs&&(!Array.isArray(artifact.signs)||artifact.signs.length>128))throw Error('Invalid signs');
  const signPositions=new Set();
  for(const sign of artifact.signs||[]) {
    if(!Array.isArray(sign.at)||sign.at.length!==3||!sign.at.every(Number.isInteger)||!Array.isArray(sign.lines)||sign.lines.length!==4||sign.lines.some(t=>typeof t!=='string'||t.length>24||/[\x00-\x1f\x7f]/.test(t)))throw Error('Invalid sign metadata');
    const position=sign.at.join(',');if(signPositions.has(position))throw Error('Duplicate sign metadata');signPositions.add(position);
    const cell=artifact.blocks.find(c=>c.x===sign.at[0]&&c.y===sign.at[1]&&c.z===sign.at[2]);
    if(!cell||!cell.block.includes('_wall_sign['))throw Error('Sign block missing');
  }
  const occupied = new Set(), states = new Set();
  for(const cell of artifact.blocks) {
    if(![cell.x,cell.y,cell.z].every(Number.isInteger)||cell.x<0||cell.x>=x||cell.y<0||cell.y>=y||cell.z<0||cell.z>=z)
      throw Error('Cell outside artifact');
    const key = `${cell.x},${cell.y},${cell.z}`;
    if(occupied.has(key)) throw Error('Duplicate cell');
    occupied.add(key);
    if(!states.has(cell.block)) {
      // Reject ambiguous property syntax before consulting the installed game registry.
      if(!/^minecraft:[a-z0-9_]+(?:\[[a-z0-9_]+=[a-z0-9_]+(?:,[a-z0-9_]+=[a-z0-9_]+)*\])?$/.test(cell.block))
        throw Error('Invalid block state syntax');
      const keys=(cell.block.split('[')[1]?.slice(0,-1)||'').split(',').filter(Boolean).map(p=>p.split('=')[0]);
      if(new Set(keys).size!==keys.length) throw Error('Duplicate block property');
      stateBlock(cell.block);states.add(cell.block);
    }
  }
}

function encodeVarints(values) {
  const bytes=[];
  for(let value of values) {
    if(!Number.isInteger(value)||value<0||value>0x7fffffff) throw Error('Invalid palette index');
    do {let byte=value&127;value>>>=7;if(value)byte|=128;bytes.push(byte);} while(value);
  }
  return Buffer.from(bytes);
}

function exportSchematic(artifact) {
  validateArtifact(artifact);
  const {x:width,y:height,z:length}=artifact.dimensions;
  const palette=new Map([['minecraft:air',0]]), cells=new Uint32Array(width*height*length);
  for(const cell of artifact.blocks) {
    if(!palette.has(cell.block))palette.set(cell.block,palette.size);
    cells[cell.x+cell.z*width+cell.y*width*length]=palette.get(cell.block);
  }
  const schematic={
    Version:tag('int',3),DataVersion:tag('int',DATA_VERSION),
    Metadata:tag('compound',{
      Name:tag('string',artifact.name),BuilderArtifactHash:tag('string',artifact.hash),
      BuilderPlanId:tag('string',artifact.plan_id),BuilderRevision:tag('string',artifact.revision),
    }),
    Width:tag('short',width),Height:tag('short',height),Length:tag('short',length),Offset:tag('intArray',[0,0,0]),
    Blocks:tag('compound',{
      Palette:tag('compound',Object.fromEntries([...palette].map(([state,index])=>[state,tag('int',index)]))),
      Data:tag('byteArray',encodeVarints(cells)),BlockEntities:tag('list',{type:'compound',value:(artifact.signs||[]).map(sign=>({
        Id:tag('string','minecraft:sign'),Pos:tag('intArray',sign.at),Data:tag('compound',{
          front_text:tag('compound',{messages:tag('list',{type:'string',value:sign.lines.map(text=>JSON.stringify({text}))}),color:tag('string','black'),has_glowing_text:tag('byte',0)}),
          back_text:tag('compound',{messages:tag('list',{type:'string',value:['""','""','""','""']}),color:tag('string','black'),has_glowing_text:tag('byte',0)}),
          is_waxed:tag('byte',1)
        })
      }))}),
    }),
  };
  // Sponge v3 wraps Schematic inside an unnamed root, unlike the older v2 root.
  return gzipSync(nbt.writeUncompressed({name:'',type:'compound',value:{Schematic:tag('compound',schematic)}}));
}

function exportManifest(artifact) {
  validateArtifact(artifact);
  return {
    schemaVersion:1,format:'Sponge schematic v3',minecraftVersion:VERSION,dataVersion:DATA_VERSION,
    artifactHash:artifact.hash,offset:[0,0,0],scope:'Full proposal including authored site',
    airPolicy:'Unspecified cells in the rectangular volume become air. A normal paste can clear or replace the entire volume.',
    placement:'Origin is the minimum X/Y/Z corner; positive X and Z extend into the site. No rotation or world coordinates are applied.',
    limitations:['No entities, container inventories or biomes. Authored wall-sign text is included.','The schematic is not an ownership mask; retain the source artifact.'],
    artifact,
  };
}

module.exports={exportSchematic,exportManifest,encodeVarints};
