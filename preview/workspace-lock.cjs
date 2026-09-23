const fs=require('node:fs');const path=require('node:path');const {randomUUID}=require('node:crypto');

function startTime(pid){
 // Linux PIDs are recycled. Field 22 of /proc/<pid>/stat identifies the process instance.
 const stat=fs.readFileSync(`/proc/${pid}/stat`,'utf8');
 return stat.slice(stat.lastIndexOf(')')+2).trim().split(/\s+/)[19];
}

function isWriter(lock){
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
 if(fs.existsSync(file)){
  const lock=JSON.parse(fs.readFileSync(file,'utf8'));
  if(isWriter(lock))throw Error('This workspace already has a running writer');
  fs.unlinkSync(file);
 }
 fs.writeFileSync(file,JSON.stringify({pid:process.pid,startTime:startTime(process.pid),nonce}),{flag:'wx',mode:0o600});
 process.once('exit',()=>{try{if(JSON.parse(fs.readFileSync(file,'utf8')).nonce===nonce)fs.unlinkSync(file);}catch{}});
 // Any in-flight world batch already has durable intent; startup requires reconciliation.
 process.once('SIGTERM',()=>process.exit(0));process.once('SIGINT',()=>process.exit(0));
}
module.exports={claimWorkspace};
