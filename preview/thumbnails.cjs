const fs=require('node:fs');
const path=require('node:path');

// Bump when the camera, lighting, resolution or renderer changes. Artifact hashes
// identify geometry; the style version also keeps cached presentation current.
const STYLE_VERSION='v1';
function thumbnailPath(project,revision,hash){
  return path.join(__dirname,'generated','thumbnails',`${STYLE_VERSION}-${project}-${revision}-${hash}.png`);
}
function readThumbnail(project,revision,hash){
  let bytes;
  try{bytes=fs.readFileSync(thumbnailPath(project,revision,hash));}
  catch(error){if(error.code==='ENOENT')return null;throw error;}
  if(bytes.length<24||bytes.length>2*1024*1024||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'
    ||bytes.readUInt32BE(16)!==640||bytes.readUInt32BE(20)!==400)throw Error('Invalid generated thumbnail');
  return bytes;
}
module.exports={STYLE_VERSION,thumbnailPath,readThumbnail};
