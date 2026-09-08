const {World} = require('prismarine-viewer/viewer/lib/world');
const {getSectionGeometry} = require('prismarine-viewer/viewer/lib/models');
const {Vec3} = require('vec3');
const VERSION = '1.21.4';
const Chunk = require('prismarine-chunk')(VERSION);
const Block = require('prismarine-block')(VERSION);
const data = require('minecraft-data')(VERSION);
const models = require(`prismarine-viewer/public/blocksStates/${VERSION}.json`);
const atlasHeader = require('node:fs').readFileSync(require.resolve(`prismarine-viewer/public/textures/${VERSION}.png`));
const texel = [1/atlasHeader.readUInt32BE(16),1/atlasHeader.readUInt32BE(20)];

function insetAtlasUVs(uvs) {
  // Upstream quads sample exactly on atlas tile borders, leaking adjacent textures into block seams.
  // Keep each quad within its own texels without changing geometry or authored block states.
  for(let face=0;face<uvs.length;face+=8)for(let axis=0;axis<2;axis++) {
    const offsets=[0,2,4,6].map(n=>face+n+axis),values=offsets.map(n=>uvs[n]);
    const min=Math.min(...values),max=Math.max(...values),inset=Math.min(texel[axis]/2,(max-min)/2);
    for(const n of offsets)uvs[n]=Math.max(min+inset,Math.min(max-inset,uvs[n]));
  }
}

function stateBlock(state) {
  const match = /^minecraft:([a-z0-9_]+)(?:\[([^\]]+)\])?$/.exec(state);
  if(!match || !data.blocksByName[match[1]] || !models[match[1]]) throw Error(`Unsupported block: ${state}`);
  const definition = data.blocksByName[match[1]];
  const defaults = Block.fromStateId(definition.defaultState,0).getProperties();
  const props = {...defaults};
  if(match[2]) for(const pair of match[2].split(',')) {
    const [key,value] = pair.split('=');
    if(!(key in props)) throw Error(`Unknown property: ${state}`);
    const spec = definition.states.find(s=>s.name===key);
    if(spec.type==='bool') {
      if(!['true','false'].includes(value)) throw Error(`Invalid boolean: ${state}`);
      props[key] = value==='true';
    } else if(spec.type==='int') {
      const number = Number(value);
      if(!Number.isInteger(number) || (spec.values ? !spec.values.map(Number).includes(number) : number<0 || number>=spec.num_values))
        throw Error(`Invalid numeric property: ${state}`);
      props[key] = number;
    } else {
      if(!spec.values.includes(value)) throw Error(`Invalid property value: ${state}`);
      props[key] = value;
    }
  }
  return Block.fromProperties(definition.id,props,0);
}

function matches(props, condition) {
  if(!condition || condition==='') return true;
  if(typeof condition==='string') condition=Object.fromEntries(condition.split(',').map(p=>p.split('=')));
  if(condition.OR) return condition.OR.some(c=>matches(props,c));
  if(condition.AND) return condition.AND.every(c=>matches(props,c));
  return Object.entries(condition).every(([key,value])=>String(value).split('|').includes(String(props[key])));
}

function variants(block) {
  // Upstream 1.33.0 uses name.includes('air'), which accidentally hides stairs.
  // Seed its public block cache with correctly selected variants; meshing remains upstream.
  if(['air','cave_air','void_air'].includes(block.name)) return [];
  const model = models[block.name];
  const props = block.getProperties();
  if(model.variants) {
    const found = Object.entries(model.variants).find(([condition])=>matches(props,condition));
    return found ? [Array.isArray(found[1])?found[1][0]:found[1]] : [];
  }
  return (model.multipart||[]).filter(part=>matches(props,part.when)).flatMap(part=>Array.isArray(part.apply)?[part.apply[0]]:[part.apply]);
}

function meshArtifact(artifact, ceiling=64) {
  const {x:width,y:height,z:depth}=artifact.dimensions;
  if(![width,height,depth].every(n=>Number.isInteger(n)&&n>0) || width>48 || height>64 || depth>48 || artifact.blocks.length>10000)
    throw Error('Artifact bounds invalid');
  if(!Number.isInteger(ceiling)||ceiling<0||ceiling>64) throw Error('Cutaway outside limits');
  const world = new World(VERSION);
  for(let x=-16;x<=width+16;x+=16) for(let z=-16;z<=depth+16;z+=16) world.addColumn(x,z,new Chunk().toJson());
  const stateCache = new Map();
  for(const cell of artifact.blocks) {
    if(![cell.x,cell.y,cell.z].every(Number.isInteger) || cell.x<0||cell.x>=width||cell.y<0||cell.y>=height||cell.z<0||cell.z>=depth)
      throw Error('Cell outside artifact');
    if(!stateCache.has(cell.block)) stateCache.set(cell.block,stateBlock(cell.block));
    if(cell.y>=ceiling) continue;
    const block = stateCache.get(cell.block);
    const pos = new Vec3(cell.x,cell.y,cell.z);
    world.setBlockStateId(pos,block.stateId);
    world.getColumn(Math.floor(cell.x/16)*16,Math.floor(cell.z/16)*16)
      .setBiome(new Vec3(cell.x&15,cell.y,cell.z&15),data.biomesByName.plains.id);
    const cached = world.getBlock(pos);
    cached.variant = variants(cached);
    if(block.name!=='air' && cached.variant.length===0) throw Error(`No model for ${cell.block}`);
  }
  const sections=[];
  for(let y=0;y<Math.min(height,ceiling);y+=16) for(let z=0;z<depth;z+=16) for(let x=0;x<width;x+=16) {
    const geometry=getSectionGeometry(x,y,z,world,models);
    if(!geometry.positions.length) continue;
    insetAtlasUVs(geometry.uvs);
    sections.push(Object.fromEntries(Object.entries(geometry).map(([key,value])=>[key,ArrayBuffer.isView(value)?Array.from(value):value])));
  }
  return {rendererVersion:VERSION,hash:artifact.hash,ceiling,sections,warnings:[]};
}
module.exports={meshArtifact,stateBlock,VERSION};
