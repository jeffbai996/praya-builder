const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const collections=new Set(['sites','briefs','drafts','revisions','jobs','requests','selections','captures','capture-chunks']);
class FileStore{
 constructor(root,{maxBytes=512*1024*1024}={}){this.root=path.resolve(root);this.maxBytes=maxBytes;fs.mkdirSync(this.root,{recursive:true,mode:0o700});}
 file(kind,id){if(!collections.has(kind)&&kind!=='artifacts')throw Error('Unknown collection');if(!/^[a-z0-9-]{1,80}$/.test(id))throw Error('Invalid record id');return path.join(this.root,kind,id+'.json');}
 write(file,data,exclusive=false){
  const bytes=Buffer.from(JSON.stringify(data));if(bytes.length>64*1024*1024)throw Error('Record storage limit exceeded');
  let used=0;for(const entry of fs.readdirSync(this.root,{withFileTypes:true}))if(entry.isDirectory()&&(collections.has(entry.name)||entry.name==='artifacts'))for(const item of fs.readdirSync(path.join(this.root,entry.name),{withFileTypes:true}))if(item.isFile())used+=fs.statSync(path.join(this.root,entry.name,item.name)).size;
  if(used-(fs.existsSync(file)?fs.statSync(file).size:0)+bytes.length>this.maxBytes)throw Error('Workspace storage quota exceeded; existing records are retained');
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  const temp=file+'.'+randomUUID()+'.tmp',fd=fs.openSync(temp,'wx',0o600);
  try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  try{if(exclusive){fs.linkSync(temp,file);fs.unlinkSync(temp);}else fs.renameSync(temp,file);
   const dir=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
  }catch(error){if(fs.existsSync(temp))fs.unlinkSync(temp);throw error;}
 }
 create(kind,value){const id=randomUUID(),record={...value,id,version:1,createdAt:new Date().toISOString()};this.write(this.file(kind,id),record,true);return record;}
 get(kind,id){try{return JSON.parse(fs.readFileSync(this.file(kind,id),'utf8'));}catch(error){if(error.code==='ENOENT'){const missing=Error('Record not found');missing.status=404;throw missing;}throw error;}}
 list(kind){const dir=path.dirname(this.file(kind,'index'));if(!fs.existsSync(dir))return [];return fs.readdirSync(dir).filter(f=>/^[a-z0-9-]+\.json$/.test(f)).sort().map(f=>this.get(kind,f.slice(0,-5)));}
 update(kind,id,expectedVersion,value){const old=this.get(kind,id);if(old.version!==expectedVersion){const e=Error('Revision conflict: reload the current draft');e.status=409;throw e;}const record={...value,id,createdAt:old.createdAt,version:old.version+1};this.write(this.file(kind,id),record);return record;}
 putArtifact(artifact){const file=this.file('artifacts',artifact.hash);if(!fs.existsSync(file))this.write(file,artifact,true);return artifact.hash;}
 getArtifact(hash){return this.get('artifacts',hash);}
}
module.exports={FileStore};
