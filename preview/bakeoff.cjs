// Entrants are explicitly supplied local commands. No model provider integration.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {request}=require('./workspace-cli.cjs');
function validateCommand(command,timeoutMs=600000){
 if(!Array.isArray(command)||!command.length||command.length>40||command.some(arg=>typeof arg!=='string'||arg.length>4000))throw Error('Entrant command must be an executable/argument array');
 if(!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>600000)throw Error('Entrant timeout must be 1–600 seconds');
}
function runEntrant(command,brief,{timeoutMs=600000}={}){
 validateCommand(command,timeoutMs);
 return new Promise((resolve,reject)=>{
  const child=spawn(command[0],command.slice(1),{stdio:['pipe','pipe','pipe'],shell:false,detached:process.platform!=='win32'});
  let output=[],bytes=0,failed=null;
  const stop=message=>{if(failed)return;failed=Error(message);try{if(process.platform==='win32')child.kill('SIGKILL');else process.kill(-child.pid,'SIGKILL');}catch{child.kill('SIGKILL');}};
  const timer=setTimeout(()=>stop('Entrant timed out'),timeoutMs);
  const cancel=()=>{stop('Comparison interrupted; pending entrants remain in the ledger');if(failed)failed.cancelled=true;};
  process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
  const cleanup=()=>{clearTimeout(timer);process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);};
  child.stdout.on('data',part=>{bytes+=part.length;if(bytes>1048576)stop('Entrant output exceeds 1 MiB');else output.push(part);});
  // Stderr may contain provider credentials or private prompts; do not persist it.
  child.stderr.resume();child.stdin.on('error',()=>{});
  child.once('error',error=>{cleanup();reject(error);});
  child.once('close',code=>{cleanup();if(failed)return reject(failed);if(code!==0)return reject(Error('Entrant command failed'));try{const plan=JSON.parse(Buffer.concat(output).toString('utf8'));if(!plan||typeof plan!=='object'||Array.isArray(plan))throw Error('Expected a plan object');resolve(plan);}catch{reject(Error('Entrant stdout must contain one plan JSON object'));}});
  child.stdin.end(JSON.stringify(brief)+'\n');
 });
}
async function main(){
 const [file]=process.argv.slice(2);if(!file)throw Error('Usage: node preview/bakeoff.cjs brief.json');
 const source=fs.readFileSync(path.resolve(file));if(source.length>1048576)throw Error('Brief exceeds 1 MiB');
 const input=JSON.parse(source);if(!Array.isArray(input.entrants))throw Error('Brief needs an entrants array');
 // Validate every command before creating the durable record.
 for(const entrant of input.entrants)validateCommand(entrant.command,entrant.timeoutMs??600000);
 const entrants=[...input.entrants];for(let i=entrants.length-1;i>0;i--){const j=require('node:crypto').randomInt(i+1);[entrants[i],entrants[j]]=[entrants[j],entrants[i]];}
 let record=await request('bakeoffs',JSON.stringify({name:input.name,brief:input.brief||{text:input.text,siteId:input.siteId,transform:input.transform,references:input.references},entrants:entrants.map(({agent,model,effort})=>({agent,model,effort}))}));
 console.error('Comparison '+record.id+' created. Entrants stay lettered until you reveal them in the Design library.');
 for(let i=0;i<entrants.length;i++){
  const label=String.fromCharCode(65+i);let result;
  try{result={plan:await runEntrant(entrants[i].command,record.brief,{timeoutMs:entrants[i].timeoutMs||600000})};}
  catch(error){if(error.cancelled)throw error;console.error('Entrant '+label+': '+error.message);result={failure:true};}
  record=await request(`bakeoffs/${record.id}/entry`,JSON.stringify({expectedVersion:record.version,label,...result}));
  console.error('Entrant '+label+': '+record.entrants[i].state);
 }
 console.log(JSON.stringify(record,null,2));
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={runEntrant,validateCommand};
