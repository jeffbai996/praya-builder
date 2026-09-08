const {meshArtifact,stateBlock} = require('./mesh.cjs');

function materialIcon(name) {
  if(!/^[a-z0-9_]+$/.test(name)) throw Error('Invalid material name');
  const state=`minecraft:${name}`;
  const properties=stateBlock(state).getProperties();
  const blocks=[{x:0,y:0,z:0,block:state}];
  // Show both halves of doors and tall plants as one recognizable material.
  if(properties.half==='lower') blocks.push({x:0,y:1,z:0,block:`${state}[half=upper]`});
  return meshArtifact({dimensions:{x:1,y:3,z:1},blocks});
}

module.exports={materialIcon};
