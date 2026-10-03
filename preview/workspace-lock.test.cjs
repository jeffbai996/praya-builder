const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');

const modulePath=path.join(__dirname,'workspace-lock.cjs');
const worker=`
 const fs=require('node:fs'),path=require('node:path');
 const root=process.argv[1],file=path.join(root,'service.lock');
 const {claimWorkspace}=require(process.argv[2]);
 if(process.argv[3]==='unreadable'){
  const read=fs.readFileSync;
  fs.readFileSync=function(name,...args){
   if(name===file){fs.readFileSync=read;throw Object.assign(Error('Unreadable lock'),{code:'EACCES'});}
   return read.call(this,name,...args);
  };
 }
 if(process.argv[3]==='inspect-publication'){
  const link=fs.linkSync;
  fs.linkSync=function(temp,target){
   if(target===file){
    if(fs.existsSync(file))throw Error('Lock published before link');
    const record=JSON.parse(fs.readFileSync(temp,'utf8'));
    if(record.pid!==process.pid||!record.startTime||!record.nonce)throw Error('Incomplete temporary lock');
   }
   return link.call(this,temp,target);
  };
 }
 process.send({ready:true});
 process.on('message',message=>{
  if(message==='claim'){
   try{claimWorkspace(root);process.send({claimed:true,pid:process.pid});}
   catch(error){process.send({claimed:false,error:error.message,code:error.code});}
  }else if(message==='exit')process.exit(0);
 });
`;

function setup(t,contents){
 const root=fs.mkdtempSync(path.join(__dirname,'.workspace-lock-test-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const file=path.join(root,'service.lock');
 if(contents!==undefined)fs.writeFileSync(file,contents);
 return {root,file};
}

function nextMessage(child){
 return new Promise((resolve,reject)=>{
  function message(value){cleanup();resolve(value);}
  function exit(code,signal){cleanup();reject(Error(`Worker exited: ${code} ${signal}`));}
  function cleanup(){child.off('message',message);child.off('exit',exit);child.off('error',error);}
  function error(value){cleanup();reject(value);}
  child.once('message',message);child.once('exit',exit);child.once('error',error);
 });
}

async function contender(t,root,mode=''){
 const child=spawn(process.execPath,['-e',worker,root,modulePath,mode,'server.cjs'],{cwd:__dirname,stdio:['ignore','ignore','pipe','ipc']});
 let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk;});
 t.after(async()=>{
  if(child.exitCode!==null||child.signalCode!==null)return;
  const ended=new Promise(resolve=>child.once('exit',resolve));
  child.send('exit');await ended;
  assert.equal(stderr,'');
 });
 assert.deepEqual(await nextMessage(child),{ready:true});
 return child;
}

async function claim(child){const result=nextMessage(child);child.send('claim');return result;}

for(const [name,contents,mode] of [
 ['an empty lock',''],
 ['a malformed lock','{"pid":'],
 ['an invalid ownership record','null'],
 ['a valid stale lock',JSON.stringify({pid:process.pid,startTime:'stale-process-instance',nonce:'old'})],
 ['a lock owned by a dead process',JSON.stringify({pid:2147483647,startTime:'old',nonce:'old'})],
 ['an unreadable lock','{}','unreadable'],
])test(`recovers ${name}`,{timeout:10000},async t=>{
 const {root,file}=setup(t,contents),child=await contender(t,root,mode);
 const result=await claim(child);assert.equal(result.claimed,true,result.error);
 const lock=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.equal(lock.pid,child.pid);assert.ok(lock.startTime);assert.ok(lock.nonce);
 assert.equal(fs.statSync(file).mode&0o777,0o600);
 assert.deepEqual(fs.readdirSync(root),['service.lock']);
});

test('exit cleanup preserves a replacement lock',{timeout:10000},async t=>{
 const {root,file}=setup(t),child=await contender(t,root);
 assert.equal((await claim(child)).claimed,true);
 const replacement=JSON.stringify({pid:process.pid,nonce:'replacement'});
 fs.writeFileSync(file,replacement);
 const ended=new Promise(resolve=>child.once('exit',resolve));child.send('exit');await ended;
 assert.equal(fs.readFileSync(file,'utf8'),replacement);
});

test('preserves a valid live lock',{timeout:10000},async t=>{
 const {root,file}=setup(t),owner=await contender(t,root);
 assert.equal((await claim(owner)).claimed,true);
 const original=fs.readFileSync(file,'utf8'),other=await contender(t,root);
 const result=await claim(other);
 assert.equal(result.claimed,false);assert.match(result.error,/already has a running writer/);
 assert.equal(fs.readFileSync(file,'utf8'),original);
});

test('preserves a legacy lock owned by a live writer',{timeout:10000},async t=>{
 const {root,file}=setup(t),owner=await contender(t,root);
 const original=JSON.stringify({pid:owner.pid,nonce:'legacy'});
 fs.writeFileSync(file,original);
 const other=await contender(t,root),result=await claim(other);
 assert.equal(result.claimed,false);assert.match(result.error,/already has a running writer/);
 assert.equal(fs.readFileSync(file,'utf8'),original);
});

test('publishes complete JSON and removes its own lock on exit',{timeout:10000},async t=>{
 const {root,file}=setup(t),child=await contender(t,root,'inspect-publication');
 assert.equal((await claim(child)).claimed,true);
 assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).pid,child.pid);
 const ended=new Promise(resolve=>child.once('exit',resolve));child.send('exit');await ended;
 assert.deepEqual(fs.readdirSync(root),[]);
});

for(const contents of [undefined,''])test(`two racing claimants have one winner (${contents===undefined?'absent':'empty'} lock)`,{timeout:10000},async t=>{
 const {root,file}=setup(t,contents);
 const first=await contender(t,root),second=await contender(t,root);
 const results=await Promise.all([claim(first),claim(second)]);
 assert.equal(results.filter(result=>result.claimed).length,1,JSON.stringify(results));
 const winner=results.find(result=>result.claimed);
 assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).pid,winner.pid);
 assert.deepEqual(fs.readdirSync(root),['service.lock']);
});
