const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {projects,createPlan} = require('./catalog.cjs');
const root = path.resolve(__dirname,'..');
execFileSync('bash',['gradlew','--no-daemon','-q','prepareRegressionTests'], {cwd:root,stdio:'inherit'});
const classpath = fs.readFileSync(path.join(root,'build/regression-classpath.txt'),'utf8').trim();
const java = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME,'bin/java') : 'java';
const dir = path.join(__dirname,'generated'); fs.mkdirSync(dir,{recursive:true});
for(const project of projects) for(const {id:revision} of project.revisions) {
  const stem=project.id==='courtyard'?revision:`${project.id}-${revision}`;
  const file = path.join(dir,`${stem}.plan.json`);
  fs.writeFileSync(file,JSON.stringify(createPlan(project.id,revision),null,2));
  const output = execFileSync(java,['-cp',classpath,'org.govpraya.builder.plan.PlanCli',file], {cwd:root,maxBuffer:16*1024*1024});
  const artifact = JSON.parse(output);
  fs.writeFileSync(path.join(dir,`${stem}.json`),output);
  console.log(`${project.id}/${revision}: ${artifact.blocks.length} cells, ${artifact.hash}`);
}
