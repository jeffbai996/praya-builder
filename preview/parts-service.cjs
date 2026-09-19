const fs=require('node:fs'),path=require('node:path'),{promisify}=require('node:util'),{execFile}=require('node:child_process');
const run=promisify(execFile);
async function listParts(directory){
 const root=path.resolve(__dirname,'..'),classpath=fs.readFileSync(path.join(root,'build/regression-classpath.txt'),'utf8').trim();
 const java=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin/java'):'java';
 const {stdout}=await run(java,['-Xmx256m','-cp',classpath,'org.govpraya.builder.plan.PlanCli','--parts',directory],{cwd:root,timeout:10000,maxBuffer:8*1024*1024});
 return JSON.parse(stdout);
}
function insertPart(plan,input,parts){
 const part=parts.find(part=>part.id===input.id);if(!part)throw Error('Unknown architectural part');
 if(!Array.isArray(input.at)||input.at.length!==3||!input.at.every(Number.isInteger))throw Error('Choose an integer part position');
 if(input.at.some((v,i)=>v<0||v>=plan.dimensions[['x','y','z'][i]]))throw Error('Part position is outside the building bounds');
 const params=input.params||{};if(!params||typeof params!=='object'||Array.isArray(params))throw Error('Invalid part parameters');
 for(const key of Object.keys(params))if(!(key in part.parameters))throw Error('Unknown part parameter: '+key);
 const resolved={};for(const [name,definition]of Object.entries(part.parameters)){
  const value=params[name]??definition.default;
  if(definition.type==='material'&&(typeof value!=='string'||!Object.hasOwn(plan.palette,value)))throw Error('Choose a palette material for '+name);
  if(definition.type==='integer'&&(!Number.isInteger(value)||value<definition.min||value>definition.max))throw Error(name+' is outside the part bounds');
  if(definition.type==='enum'&&!definition.values.includes(value))throw Error('Unsupported '+name);
  resolved[name]=value;
 }
 const stem='part-'+part.id.replaceAll('.','-');let i=1;while(plan.components.some(c=>c.id===stem+'-'+i))i++;
 plan.schema_version=2;
 plan.components.push({id:stem+'-'+i,role:part.id,origin:[0,0,0],operations:[{op:'call',part:part.id,at:input.at.slice(),params:resolved}]});
}
function rewriteMaterial(operations,parts,role,replacement){
 for(const op of operations){if(op.material===role)op.material=replacement;if(op.interior===role)op.interior=replacement;if(op.operations)rewriteMaterial(op.operations,parts,role,replacement);if(op.op==='call'){const part=parts.find(p=>p.id===op.part);if(!part)throw Error('Unknown architectural part');for(const [name,definition]of Object.entries(part.parameters))if(definition.type==='material'&&(op.params?.[name]??definition.default)===role){op.params||={};op.params[name]=replacement;}}}
}
module.exports={listParts,insertPart,rewriteMaterial};
