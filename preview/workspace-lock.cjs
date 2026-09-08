const fs=require('node:fs');const path=require('node:path');const {randomUUID}=require('node:crypto');
function claimWorkspace(root){
 const file=path.join(root,'service.lock'),nonce=randomUUID();
 if(fs.existsSync(file)){
  const lock=JSON.parse(fs.readFileSync(file,'utf8'));let alive=true;
  try{process.kill(lock.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;else throw error;}
  if(alive)throw Error('This workspace already has a running writer');fs.unlinkSync(file);
 }
 fs.writeFileSync(file,JSON.stringify({pid:process.pid,nonce}),{flag:'wx',mode:0o600});
 process.once('exit',()=>{try{if(JSON.parse(fs.readFileSync(file,'utf8')).nonce===nonce)fs.unlinkSync(file);}catch{}});
 // Any in-flight world batch already has durable intent; startup requires reconciliation.
 process.once('SIGTERM',()=>process.exit(0));process.once('SIGINT',()=>process.exit(0));
}
module.exports={claimWorkspace};
