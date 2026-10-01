// Full browser workflow against an empty, disposable workspace, never the live library.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'roadwork-browser-'));
const env={...process.env,PREVIEW_PORT:'18092',BUILDER_WORKSPACE_DIR:root,PREVIEW_PUBLIC_ORIGIN:'',BUILDER_TEST_BRIDGE_URL:'',BUILDER_SURVEY_URL:'',PREVIEW_URL:'http://127.0.0.1:18092/transport'};
const server=spawn(process.execPath,[path.join(__dirname,'server.cjs')],{env,stdio:['ignore','pipe','pipe']});
let output='';server.stdout.on('data',b=>output+=b);server.stderr.on('data',b=>output+=b);
(async()=>{try{
 let ready=false;for(let n=0;n<30;n++){if(server.exitCode!==null)throw Error(output);try{ready=(await fetch(env.PREVIEW_URL,{signal:AbortSignal.timeout(1000)})).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,250));}if(!ready)throw Error('Isolated server did not start: '+output);
 const check=spawn(process.execPath,[path.join(__dirname,'check-transport-studio.cjs')],{env,stdio:'inherit'});
 process.exitCode=await new Promise(resolve=>check.on('exit',code=>resolve(code??1)));
}finally{if(server.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}fs.rmSync(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
