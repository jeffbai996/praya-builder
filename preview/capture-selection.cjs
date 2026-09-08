// Provider-independent CLI counterpart to the guided survey upload in studio.
const fs=require('node:fs');
async function main(){
 const [id,file]=process.argv.slice(2);
 if(!/^[a-z0-9-]{1,80}$/.test(id||'')||!file)throw Error('Usage: node capture-selection.cjs <selection-id> <survey.schem>');
 if(fs.statSync(file).size>8*1024*1024)throw Error('Survey exceeds 8 MiB');
 const response=await fetch(new URL('/api/workspace/selections/'+id+'/import',process.env.BUILDER_WORKSPACE_URL||'http://127.0.0.1:8091'),{method:'POST',headers:{'Content-Type':'application/json','X-Builder-Write':'1'},body:JSON.stringify({schematic:fs.readFileSync(file).toString('base64'),capturedAt:new Date().toISOString()}),signal:AbortSignal.timeout(120000)});
 const data=await response.json();if(!response.ok)throw Error(data.error);console.log(JSON.stringify({siteId:data.id,name:data.name}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
