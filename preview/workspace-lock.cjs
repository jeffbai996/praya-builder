const fs=require('node:fs');const path=require('node:path');const {randomUUID}=require('node:crypto');

function startTime(pid){
 // Linux PIDs are recycled. Field 22 of /proc/<pid>/stat identifies the process instance.
 const stat=fs.readFileSync(`/proc/${pid}/stat`,'utf8');
 return stat.slice(stat.lastIndexOf(')')+2).trim().split(/\s+/)[19];
}

function isWriter(lock){
 if(!lock||!Number.isInteger(lock.pid)||lock.pid<=0)return false;
 try{
  process.kill(lock.pid,0);
  if(lock.startTime)return startTime(lock.pid)===lock.startTime;
  // Locks created before startTime was recorded still need a safe ownership check.
  const command=fs.readFileSync(`/proc/${lock.pid}/cmdline`,'utf8').split('\0').filter(Boolean);
  return command.some(arg=>path.basename(arg)==='server.cjs')&&
   fs.realpathSync(`/proc/${lock.pid}/cwd`)===__dirname;
 }catch(error){
  if(error.code==='ESRCH'||error.code==='ENOENT')return false;
  throw error;
 }
}

function claimWorkspace(root){
 const file=path.join(root,'service.lock'),nonce=randomUUID();
 let existing;
 try{existing=fs.statSync(file);}catch(error){if(error.code!=='ENOENT')throw error;}
 if(existing){
  let lock;
  // Interrupted writes and unreadable records cannot establish ownership.
  try{lock=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
  if(isWriter(lock))throw Error('This workspace already has a running writer');
  try{
   const current=fs.statSync(file);
   if(current.dev!==existing.dev||current.ino!==existing.ino)throw Error('This workspace lock changed during claim');
   fs.unlinkSync(file);
  }catch(error){if(error.code!=='ENOENT')throw error;}
 }
 const temp=path.join(root,`.service.lock.${nonce}.tmp`);
 try{
  fs.writeFileSync(temp,JSON.stringify({pid:process.pid,startTime:startTime(process.pid),nonce}),{flag:'wx',mode:0o600});
  // A hard link publishes complete contents and fails if another claimant won.
  fs.linkSync(temp,file);
 }finally{try{fs.unlinkSync(temp);}catch(error){if(error.code!=='ENOENT')throw error;}}
 process.once('exit',()=>{try{if(JSON.parse(fs.readFileSync(file,'utf8')).nonce===nonce)fs.unlinkSync(file);}catch{}});
 // Any in-flight world batch already has durable intent; startup requires reconciliation.
 process.once('SIGTERM',()=>process.exit(0));process.once('SIGINT',()=>process.exit(0));
}
module.exports={claimWorkspace};
